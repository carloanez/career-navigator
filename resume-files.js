(function(root){
'use strict';

const utf8 = new TextDecoder();
const wordNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const linkedInFiles = ['Profile.csv','Positions.csv','Education.csv','Skills.csv','Certifications.csv'];

async function readArchive(file, wanted) {
 if (file.size > 20_000_000) throw Error('Choose a file under 20 MB.');
 const bytes = new Uint8Array(await file.arrayBuffer());
 const view = new DataView(bytes.buffer);
 const u16 = i => view.getUint16(i, true);
 const u32 = i => view.getUint32(i, true);
 const invalid = () => Error('This file is not a supported Word or LinkedIn ZIP archive.');
 let end = bytes.length - 22;
 while (end >= Math.max(0, bytes.length - 65557)) {
  if (u32(end) === 0x06054b50 && end + 22 + u16(end + 20) === bytes.length) break;
  end--;
 }
 if (end < Math.max(0, bytes.length - 65557) || u16(end+4) || u16(end+6)) throw invalid();
 const count = u16(end+10), limit = end, result = new Map();
 let pos = u32(end+16);
 for (let n = 0; n < count; n++) {
  if (pos+46 > limit || u32(pos) !== 0x02014b50) throw invalid();
  const nameSize = u16(pos+28), next = pos+46+nameSize+u16(pos+30)+u16(pos+32);
  if (next > limit) throw invalid();
  const name = utf8.decode(bytes.subarray(pos+46,pos+46+nameSize));
  const key = wanted(name);
  if (key && !result.has(key)) {
   const method = u16(pos+10), size = u32(pos+20), expanded = u32(pos+24), offset = u32(pos+42);
   if (u16(pos+8)&1 || ![0,8].includes(method) || offset+30 > limit || u32(offset)!==0x04034b50) throw invalid();
   const start = offset+30+u16(offset+26)+u16(offset+28);
   if (start+size > limit || expanded > 2_000_000 || (method===0 && size!==expanded)) throw invalid();
   const content = bytes.subarray(start,start+size);
   if (method === 0) result.set(key,utf8.decode(content));
   else {
    const reader = new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    let length=0, value='';
    const decoder=new TextDecoder();
    try {
     while (true) {
      const chunk=await reader.read();
      if(chunk.done)break;
      length+=chunk.value.length;
      if(length>expanded)throw invalid();
      value+=decoder.decode(chunk.value,{stream:true});
     }
    } finally {await reader.cancel();}
    if(length!==expanded)throw invalid();
    result.set(key,value+decoder.decode());
   }
  }
  pos = next;
 }
 return result;
}

async function readWord(file) {
 const files=await readArchive(file,name=>name==='word/document.xml'?name:'');
 const source=files.get('word/document.xml');
 if(!source || /<!DOCTYPE/i.test(source))throw Error('Choose a valid .docx document.');
 const xml=new DOMParser().parseFromString(source,'application/xml');
 if(xml.querySelector('parsererror'))throw Error('The Word document could not be read.');
 return [...xml.getElementsByTagNameNS(wordNS,'p')].map(paragraph=>[...paragraph.getElementsByTagNameNS(wordNS,'*')].map(node=>{
  if(node.localName==='t')return node.textContent;
  if(node.localName==='tab')return '\t';
  if(node.localName==='br'||node.localName==='cr')return '\n';
  return '';
 }).join('')).join('\n').trim();
}

function profileUrl(value) {
 const trimmed=value.trim();
 if(!trimmed)return '';
 const url=new URL(trimmed);
 if(url.protocol!=='https:'||!['www.linkedin.com','linkedin.com'].includes(url.hostname)||
    url.username||url.password||url.port||!/^\/in\/[\w%.-]+\/?$/i.test(url.pathname))throw Error('Enter an HTTPS LinkedIn profile URL with /in/ in the address.');
 return 'https://www.linkedin.com'+url.pathname.replace(/\/$/,'')+'/';
}

function csvRows(text) {
 const rows=[];
 let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){
   if(quoted&&text[i+1]==='"'){field+='"';i++;}
   else if(quoted||!field)quoted=!quoted;
   else field+=c;
  } else if(!quoted&&c===','){row.push(field);field='';}
  else if(!quoted&&(c==='\n'||c==='\r')){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(field);rows.push(row);row=[];field='';
  } else field+=c;
 }
 if(quoted)throw Error('A LinkedIn CSV file has an incomplete quoted field.');
 if(field||row.length)rows.push([...row,field]);
 const headers=(rows.shift()||[]).map(s=>s.replace(/^\uFEFF/,'').trim().toLowerCase());
 return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((key,i)=>[key,r[i]?.trim()||''])));
}

async function readLinkedIn(file) {
 const files=await readArchive(file,name=>linkedInFiles.find(f=>f.toLowerCase()===name.split('/').pop().toLowerCase()));
 const rows=name=>csvRows(files.get(name)||'');
 const profile=rows('Profile.csv')[0]||{};
 const name=[profile['first name'],profile['last name']].filter(Boolean).join(' ');
 const sections=[[name,profile.headline,profile.summary].filter(Boolean).join('\n')];
 const groups=[
  ['Experience',rows('Positions.csv').map(r=>[r.title,r['company name'],[r['started on'],r['finished on']].filter(Boolean).join(' – '),r.description])],
  ['Education',rows('Education.csv').map(r=>[r['school name'],r['degree name'],r['field of study'],[r['start date'],r['end date']].filter(Boolean).join(' – '),r.notes])],
  ['Certifications',rows('Certifications.csv').map(r=>[r.name,r.authority,r['started on'],r['finished on']])],
  ['Skills',rows('Skills.csv').map(r=>[r.name])]
 ];
 for(const [title,entries] of groups){
  const lines=entries.map(entry=>entry.filter(Boolean).join(' · ')).filter(Boolean);
  if(lines.length)sections.push(title+'\n'+lines.join('\n'));
 }
 const snapshot=sections.filter(Boolean).join('\n\n');
 if(!snapshot)throw Error('The archive contains no supported LinkedIn profile data. Include Profile, Positions, Education, Skills or Certifications in your download.');
 if(snapshot.length>60000)throw Error('The profile exceeds the 60,000-character limit. Request a smaller export.');
 return snapshot;
}

root.ResumeFiles={readWord,readLinkedIn,profileUrl};
})(window);
