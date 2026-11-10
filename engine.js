(function(root){
'use strict';
const C=root.CareerCatalog||(typeof require==='function'?require('./catalog.js'):null);
const M=root.CareerToolsModel||(typeof require==='function'?require('./career-tools-model.js'):null);
const KEY='ignitecyber.career.v1';
const blank=()=>({schemaVersion:1,catalogVersion:C.version,name:'',hours:6,budget:'mixed',domain:'all',target:'soc-ai',ratings:{},answers:{},completed:[],evidence:{},owned:[],history:[],assessedAt:null,demo:false,careerTools:M.blank()});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function skillScore(state,id){
 const rating=state.ratings[id],q=C.questions.find(q=>q.skill===id),answer=q&&state.answers[q.id];
 const hasRating=Number.isInteger(rating),hasAnswer=Number.isInteger(answer);
 const self=hasRating?rating*25:0;
 return {score:Math.round(hasAnswer?.75*self+.25*(answer===q.answer?100:0):self),hasRating,hasAnswer,assessed:hasRating||hasAnswer,correct:hasAnswer&&answer===q.answer};
}
function alignment(state,role){
 let total=0,covered=0,assessed=0;
 for(const [id,level] of Object.entries(role.requirements)){let s=skillScore(state,id);total+=level*25;covered+=Math.min(s.score,level*25);if(s.assessed)assessed++;}
 return {score:total?Math.round(covered/total*100):0,assessed,totalSkills:Object.keys(role.requirements).length,coverage:Math.round(100*assessed/Object.keys(role.requirements).length)};
}
function gaps(state,role){return Object.entries(role.requirements).map(([id,target])=>({skill:C.skills.find(s=>s.id===id),target,current:skillScore(state,id),gap:Math.max(0,target*25-skillScore(state,id).score)})).sort((a,b)=>b.gap-a.gap);}
function recommendations(state){return C.roles.filter(r=>state.domain==='all'||r.domain===state.domain).map(role=>({role,...alignment(state,role)})).sort((a,b)=>b.score-a.score||b.coverage-a.coverage||a.role.title.localeCompare(b.role.title));}
function plan(state,role){
 const needed=new Set();
 function include(id,stack=new Set()){
  if(needed.has(id))return;
  if(stack.has(id))throw Error('Curriculum dependency cycle at '+id);
  const a=C.activities.find(x=>x.id===id);if(!a)throw Error('Unknown curriculum activity '+id);
  const next=new Set(stack);next.add(id);
  for(const pre of a.prereqs){const p=C.activities.find(x=>x.id===pre);if(!p)throw Error('Missing prerequisite '+pre);if(skillScore(state,p.skill).score<p.level*25)include(pre,next);}
  needed.add(id);
 }
 for(const g of gaps(state,role).filter(g=>g.gap>0)){
  const candidate=C.activities.filter(a=>a.skill===g.skill.id&&a.level>=g.target).sort((a,b)=>a.level-b.level)[0];
  if(candidate)include(candidate.id);
 }
 const ordered=[...needed].map(id=>C.activities.find(a=>a.id===id));
 let hours=0;const items=ordered.map(a=>{const done=state.completed.includes(a.id);const start=hours;if(!done)hours+=a.hours;return {...a,done,startWeek:Math.floor(start/state.hours)+1,endWeek:Math.ceil(hours/state.hours),evidence:state.evidence[a.id]||''};});
 const capId='capstone-'+role.id,capDone=state.completed.includes(capId);
 const capstone={id:capId,title:'Role portfolio & human review',hours:16,stage:4,done:capDone,evidence:state.evidence[capId]||'',deliverable:role.track==='Core cyber'?'Complete an independent '+role.title.toLowerCase()+' scenario with scoped methods, reproducible evidence, a clear report, and peer feedback.':C.domains.find(d=>d.id===role.domain).project};
 if(!capDone)hours+=capstone.hours;
 return {items,capstone,hours,weeks:Math.ceil(hours/state.hours),completed:items.filter(a=>a.done).length+Number(capDone),total:items.length+1};
}
function validate(value){
 const fail=msg=>{throw Error(msg);};
 if(!value||Array.isArray(value)||typeof value!=='object'||value.schemaVersion!==1)fail('Unsupported workspace schema.');
 const out=blank();
 if(typeof value.name!=='string'||value.name.length>80)fail('Invalid learner name.');out.name=value.name;
 if(!Number.isInteger(value.hours)||value.hours<1||value.hours>40)fail('Study hours must be 1–40.');out.hours=value.hours;
 if(!['free','mixed','sponsored'].includes(value.budget))fail('Invalid resource preference.');out.budget=value.budget;
 if(value.domain!=='all'&&!C.domains.some(d=>d.id===value.domain))fail('Unknown domain.');out.domain=value.domain;
 if(!C.roles.some(r=>r.id===value.target))fail('Unknown target role.');out.target=value.target;
 for(const key of ['ratings','answers','evidence'])if(!value[key]||Array.isArray(value[key])||typeof value[key]!=='object')fail('Invalid '+key+' object.');
 for(const [id,n] of Object.entries(value.ratings)){if(!C.skills.some(s=>s.id===id)||!Number.isInteger(n)||n<0||n>4)fail('Invalid skill rating.');out.ratings[id]=n;}
 for(const [id,n] of Object.entries(value.answers)){const q=C.questions.find(q=>q.id===id);if(!q||!Number.isInteger(n)||n<0||n>=q.options.length)fail('Invalid scenario answer.');out.answers[id]=n;}
 const validActivity=id=>C.activities.some(a=>a.id===id)||C.roles.some(r=>'capstone-'+r.id===id);
 if(!Array.isArray(value.completed)||value.completed.length>100||!value.completed.every(validActivity))fail('Invalid completion records.');out.completed=[...new Set(value.completed)];
 for(const [id,text] of Object.entries(value.evidence)){if(!validActivity(id)||typeof text!=='string'||text.length>2000)fail('Invalid evidence note.');out.evidence[id]=text;}
 if(!Array.isArray(value.owned)||!value.owned.every(c=>C.certs.some(x=>x.id===c)))fail('Invalid credential records.');out.owned=[...new Set(value.owned)];
 if(value.assessedAt!==null&&(typeof value.assessedAt!=='string'||!Number.isFinite(Date.parse(value.assessedAt))))fail('Invalid assessment date.');out.assessedAt=value.assessedAt;
 if(!Array.isArray(value.history)||value.history.length>50)fail('Invalid assessment history.');
 out.history=value.history.map(h=>{if(!h||typeof h.date!=='string'||!Number.isFinite(Date.parse(h.date))||!C.roles.some(r=>r.id===h.target)||!Number.isInteger(h.score)||h.score<0||h.score>100||!Number.isInteger(h.coverage)||h.coverage<0||h.coverage>100)fail('Invalid assessment snapshot.');return {date:h.date,target:h.target,score:h.score,coverage:h.coverage};});
 if(typeof value.demo!=='boolean')fail('Invalid demo marker.');out.demo=value.demo;
 out.careerTools=M.validate(value.careerTools);
 return out;
}
function demo(){const s=blank();s.name='Alex · demo learner';s.demo=true;s.ratings={network:2,security:2,python:1,detection:2,response:1,offense:1,appsec:1,cloud:1,identity:1,risk:1,intel:1,privacy:1,ot:0,ai:1,aisec:0,judgment:1};s.answers={'q-network':1,'q-security':1,'q-detection':2,'q-ai':0,'q-judgment':1};s.assessedAt=new Date().toISOString();return s;}
function csvCell(x){let v=String(x??'');if(/^[=+@\-\t\r\n]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function mappingRows(){return C.roles.flatMap(role=>Object.entries(role.requirements).map(([id,target])=>{const skill=C.skills.find(s=>s.id===id),d=C.domains.find(d=>d.id===role.domain);return [role.title,d.name,role.track,skill.name,target,d.nice,d.ecsf,skill.frameworks.map(id=>C.frameworks.find(f=>f.id===id).name).join('; '),role.certs.filter(c=>C.certs.find(x=>x.id===c).skills.includes(id)).join('; '),'IgniteCyber proposed mapping',C.reviewed,C.activities.filter(a=>a.skill===id&&a.level>=target).map(a=>a.id).join('; '),C.learningOptions.filter(o=>o.domains.includes(role.domain)&&o.skills.includes(id)&&(!o.aiOnly||role.track!=='Core cyber')).map(o=>o.provider+': '+o.title).join('; ')];}));}
function csv(){return [['Role','Domain','Track','Skill','Target level (0–4)','NICE role anchor','ECSF profile anchor','Framework topic references','Related credential candidates','Mapping status','Reviewed','Candidate study sprint IDs','Provider learning options (proposed relevance)'],...mappingRows()].map(row=>row.map(csvCell).join(',')).join('\r\n');}
const api={KEY,blank,skillScore,alignment,gaps,recommendations,plan,validate,demo,csv,mappingRows,clamp};root.CareerEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
