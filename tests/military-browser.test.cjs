const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.CAREER_TEST_URL||'http://127.0.0.1:8787/';
const samples=[
 {id:'soc',core:'soc-core',ai:'soc-ai',show:'Army Career Skills Program',hide:'SpouseWorks Scholarship'},
 {id:'risk',core:'grc-core',ai:'grc-ai',show:'VET TEC 2.0',hide:'SkillBridge'},
 {id:'identity',core:'iam-core',ai:'iam-ai',show:'SpouseWorks Scholarship',hide:'VET TEC 2.0'},
 {id:'guard',core:'iam-core',ai:'iam-ai',show:'Credentialing Opportunities On-Line',hide:'SkillBridge'}
];
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const sample of samples){
   const context=await browser.newContext({viewport:sample.id==='identity'?{width:390,height:844}:{width:1300,height:900}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'#overview');
   await page.locator('nav a[href="#military"]').click();
   await page.locator('[data-sample="'+sample.id+'"]').click();
   for(let i=0;i<3;i++)await page.locator('#military-intake button[type="submit"]').click();
   assert.equal(await page.locator('[data-role="'+sample.core+'"]').count(),1);
   assert.equal(await page.locator('[data-role="'+sample.ai+'"]').count(),1);
   const links=page.locator('.military-referrals').first();
   assert(await links.getByRole('link',{name:new RegExp(sample.show)}).isVisible());
   assert.equal(await links.getByRole('link',{name:new RegExp(sample.hide)}).count(),0);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('[data-role="'+sample.ai+'"]').click();
   await page.waitForURL('**/#roadmap');
   assert.match(await page.locator('.military-project').innerText(),/AI extension/);
   await page.locator('#military-evidence textarea').fill('Checked fictional evidence and recorded the observed result.');
   await page.locator('#military-evidence button').click();
   await page.locator('[data-military-action="interview"]').click();
   await page.waitForURL('**/#interview');
   assert.equal(await page.locator('#studio-evidence').inputValue(),'capstone-'+sample.ai);
   await page.goto(base+'#roadmap');
   await page.locator('[data-military-action="resume"]').click();
   await page.waitForURL('**/#resume');
   assert.equal(await page.locator('#bullet-evidence').inputValue(),'capstone-'+sample.ai);
   assert.match(await page.locator('.evidence-excerpt').last().innerText(),/Sample pilot work/);
   await page.reload();
   assert.equal(await page.locator('#bullet-evidence').inputValue(),'capstone-'+sample.ai);
   await page.goto(base+'#military');
   assert.match(await page.locator('#military-step-title').innerText(),/Your next steps/);
   assert.deepEqual(errors,[]);
   console.log('PASS',sample.id,'intake, referral targeting, AI roadmap, portfolio, interview, résumé, reload');
   await context.close();
  }
  const page=await browser.newPage();
  await page.goto(base+'#military');
  await page.locator('[name="audience"]').selectOption('guard');
  await page.locator('[name="orders"]').selectOption('active');
  await page.locator('[name="window"]').selectOption('near');
  await page.locator('#military-intake button[type="submit"]').click();
  for(const id of ['access','systems','automate'])await page.locator('[value="'+id+'"]').check();
  await page.locator('#military-intake button[type="submit"]').click();
  assert.match(await page.locator('#military-error').textContent(),/at most two/);
  await page.locator('[value="automate"]').uncheck();
  await page.locator('#military-intake button[type="submit"]').click();
  for(const key of ['ai','funding','work','support'])await page.locator('[name="'+key+'"]').selectOption('no');
  await page.locator('#military-intake button[type="submit"]').click();
  assert.equal(await page.locator('[data-role="iam-ai"]').count(),0);
  assert(await page.locator('.military-referrals').first().getByRole('link',{name:/SkillBridge/}).isVisible());
  assert.equal(await page.locator('.military-referrals').first().getByRole('link',{name:/VET TEC/}).count(),0);
  console.log('PASS manual Guard intake, task limit and preference-based referrals');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
