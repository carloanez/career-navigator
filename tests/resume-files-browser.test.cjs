const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const {createServer}=require('../server/nova-local.cjs');
function zip(entries){
 const result=spawnSync('python3',['-c','import io,json,sys,zipfile\nb=io.BytesIO()\nwith zipfile.ZipFile(b,"w",zipfile.ZIP_DEFLATED) as z:\n for k,v in json.load(sys.stdin).items(): z.writestr(k,v)\nsys.stdout.buffer.write(b.getvalue())'],{input:JSON.stringify(entries)});
 assert.equal(result.status,0);
 return result.stdout;
}
(async()=>{
 const live=process.env.CAREER_TEST_URL;
 const server=live?null:createServer();
 if(server)await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=live||'http://127.0.0.1:'+server.address().port+'/';
 let browser;
 try{
  browser=await chromium.launch();
  const p=await browser.newPage({acceptDownloads:true});
  await p.goto(base+'#resume');
  const word=zip({'word/document.xml':'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Fictional Résumé</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Reviewed access logs</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>'});
  await p.locator('#resume-import-file').setInputFiles({name:'resume.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:word});
  await p.waitForFunction(()=>document.querySelector('#resume-text').value==='Fictional Résumé\nReviewed access logs');
  await p.locator('#resume-import-file').setInputFiles({name:'broken.docx',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')});
  await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Import failed'));
  assert.equal(await p.locator('#resume-text').inputValue(),'Fictional Résumé\nReviewed access logs');
  await p.locator('#linkedin-url').fill('https://www.linkedin.com/in/fictional-profile/?tracking=demo');
  await p.getByRole('button',{name:'Save profile link'}).click();
  assert.equal(await p.getByRole('link',{name:'Open saved LinkedIn profile'}).getAttribute('href'),'https://www.linkedin.com/in/fictional-profile/');
  const li=zip({'Profile.csv':'First Name,Last Name,Headline,Summary\r\nFictional,Learner,SOC Candidate,"Uses logs, alerts and tickets."\r\n',
   'Positions.csv':'Company Name,Title,Description,Started On,Finished On\r\nExample Co,Analyst,"Tested access\r\nReviewed ""quoted"" logs",2024,2025\r\n',
   'Connections.csv':'First Name,Last Name,Email Address\r\nDo,NotImport,excluded@example.invalid\r\n'});
  await p.locator('#linkedin-import-file').setInputFiles({name:'LinkedIn.zip',mimeType:'application/zip',buffer:li});
  await p.getByRole('button',{name:'Download profile text'}).waitFor();
  const [download]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Download profile text'}).click()]);
  const output=await require('node:fs/promises').readFile(await download.path(),'utf8');
  assert.match(output,/Fictional Learner/);
  assert.match(output,/Reviewed "quoted" logs/);
  assert(!output.includes('excluded@example.invalid'));
  p.once('dialog',dialog=>dialog.accept());
  await p.getByRole('button',{name:'Use as résumé draft'}).click();
  await p.reload();
  assert.match(await p.locator('#resume-text').inputValue(),/SOC Candidate/);
  assert.equal(await p.getByRole('link',{name:'Open saved LinkedIn profile'}).getAttribute('href'),'https://www.linkedin.com/in/fictional-profile/');
  console.log('PASS Word paragraph/table import, invalid document protection, LinkedIn export import, text download, draft handoff and reload');
 }finally{if(browser)await browser.close();server?.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
