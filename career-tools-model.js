(function(root){
'use strict';
const C=root.CareerCatalog||(typeof require==='function'?require('./catalog.js'):null);
const rubric=['I answered the actual question and stated my assumptions.','I explained my actions, reasoning, and trade-offs.','I connected the answer to real evidence or clearly labeled a hypothetical.','I described the outcome, validation, or lesson learned.'];
const technical=[
['network','A workstation resolves a service name but cannot connect. Walk me through how you would isolate the failure.','Separate name resolution, routing, firewall policy, transport, and service health. Explain which observations would change your hypothesis.','What would you capture before escalating the issue?'],
['security','How would you decide which security control to implement first for a small organization?','Clarify assets, likely threats, impact, existing controls, constraints, ownership, and a measurable validation step.','What evidence would tell you that the control is working?'],
['python','Describe how you would make a security automation script safe to run repeatedly.','Discuss scoped credentials, input validation, idempotence, tests, observable failures, dry runs, and rollback where applicable.','What happens when an API returns a partial result?'],
['detection','How would you decide whether a new detection is useful enough to enable?','Describe the threat hypothesis, required telemetry, test cases, false positives, coverage limits, and investigation workflow.','What do you do if the data source stops arriving?'],
['response','Walk through your first steps after a credible compromise alert.','Explain scope, evidence preservation, triage, communication, proportionate containment, and checks for recovery.','How would you handle conflicting evidence?'],
['offense','How do you handle an interesting finding outside an authorized testing scope?','Explain the agreed scope, why you stop the action, evidence handling, escalation to the engagement owner, and safe alternatives.','How would you report the risk without extending the test?'],
['appsec','How would you threat-model an API that uses an LLM to propose actions?','Identify assets and trust boundaries; enforce authorization in host code; validate inputs and outputs; test abuse and failure paths.','Which controls must hold even if every model instruction is ignored?'],
['cloud','How would you secure a cloud workload that serves an AI model?','Cover workload identity, data access, secrets, artifact provenance, deployment controls, monitoring, and recovery.','How would you test a permission change before production?'],
['identity','Explain how you would design least-privilege access for a service or agent.','Start with the actual task, enumerate required actions, scope identities and resources, test deny cases, and plan revocation and audit.','How would you detect privilege accumulation?'],
['risk','How would you explain an unresolved AI security risk to a business owner?','Connect the system and threat to impact, control evidence, uncertainty, options, ownership, and a reviewable risk decision.','What would make you revisit an accepted risk?'],
['intel','How do you turn a threat report into a useful hunting hypothesis?','Check provenance and confidence; identify relevant behavior and assets; define telemetry, a testable query, and counter-evidence.','What would you do with an untraceable claim in an AI-generated brief?'],
['privacy','How would you investigate cross-customer data leakage in an AI application?','Map data flow and access boundaries; preserve evidence; test retrieval authorization, logs, retention, and containment with synthetic data.','How would you verify deletion and isolation after a fix?'],
['ot','What changes when a security recommendation affects an industrial process?','Address safety, engineering authority, availability, site procedures, isolated validation, change control, and safe fallback.','Who must approve the proposed action?'],
['ai','Explain RAG to a security colleague and describe where it can fail.','Distinguish model, retrieval, data permissions, context, tools, and host code. Discuss grounding limits and evaluation.','Why does retrieval alone not guarantee a correct or authorized answer?'],
['aisec','How would you evaluate prompt-injection risk in a tool-using AI application?','Define authorized scope and trust boundaries; use reproducible test cases; examine tool permissions, data exposure, and host-side controls.','What would you measure beyond whether the model refused a prompt?'],
['judgment','When should a security analyst override an AI agent?','Explain authority limits, uncertainty, source evidence, escalation gates, denied actions, human accountability, and recovery.','How would you distinguish a fast answer from a reliable one?']
].map(([skill,prompt,outline,followup])=>({id:'technical-'+skill,type:'technical',skills:[skill],domain:null,prompt,outline,followup,rubric}));
const coreCases={soc:'Several alerts point to one workstation, but the timestamps disagree. How would you triage and decide whether to escalate?',dfir:'A suspicious endpoint may contain evidence needed for an investigation. How would you preserve evidence and choose containment?',offensive:'A test reveals an unexpected system beyond the engagement scope. How would you handle the discovery and communicate it?',appsec:'A new API allows users to request records by an identifier. How would you evaluate authorization and design a reproducible security test?',cloud:'A cloud workload unexpectedly gains access to another project’s data. How would you investigate and reduce its permissions safely?',iam:'A service account has accumulated permissions nobody can explain. How would you establish what it needs and validate a safer policy?',grc:'A business owner wants to launch a service with an unresolved security finding. How would you structure a risk decision?',intel:'A widely shared threat report has uncertain sourcing. How would you determine relevance and build a testable hunt?',privacy:'A support workflow exposes data belonging to another customer. How would you map the issue and validate isolation?',architecture:'Two teams propose different security designs for a new service. How would you compare trust boundaries, controls, and residual risks?',ot:'An urgent security patch may disrupt an industrial process. How would you coordinate a safe decision and recovery plan?',vulnerability:'A scanner reports hundreds of findings with similar severity. How would you prioritize and verify remediation?',mlsec:'A security automation pipeline produces inconsistent results. How would you test data quality, error handling, and operational safety?'};
const scenarios=C.domains.flatMap(d=>[
 {id:'scenario-'+d.id,type:'scenario',skills:d.core,domain:d.id,coreOnly:true,prompt:coreCases[d.id],outline:`Clarify authority, scope, and assumptions. Explain the evidence you would gather, the trade-offs, escalation ownership, and how you would validate the outcome. Connect your method to ${d.nice}.`,followup:'What would make you stop, seek help, or change your approach?',rubric},
 {id:'scenario-ai-'+d.id,type:'scenario',skills:d.core,domain:d.id,aiOnly:true,prompt:`You are working in ${d.name.toLowerCase()}. ${d.aiwork} Describe a safe, evidence-led approach to this assignment.`,outline:`Clarify the assignment and authorization. Connect your method to ${d.nice}. Define evidence, failure cases, responsible owners, and how you would validate the outcome. A relevant portfolio task is: ${d.project}`,followup:'What would make you stop, seek help, or change your approach?',rubric}
]);
const behavioral=[
['uncertainty','Tell me about a time you did not know how to solve a technical problem.','Use Situation, Task, Action, Result (STAR). Explain what you investigated, how you sought help, and what you learned. A clearly labeled lab example is fine.','What would you do differently next time?'],
['communication','Tell me about a time you explained a technical risk to someone without your background.','Use STAR. Describe the audience, the decision they needed to make, your explanation, and the observable result.','How did you check that they understood the risk?'],
['evidence','Walk me through a project that demonstrates a skill relevant to this role.','Distinguish your own contribution from team work. Explain the setup, choices, evidence, limitations, outcome, and what a reviewer can reproduce.','Which artifact would you show first, and why?'],
['mistake','Tell me about a mistake or failed hypothesis and how you responded.','Use STAR. Take ownership, explain the evidence that changed your view, describe corrective action, and identify a lasting improvement.','How did you communicate uncertainty while investigating?']
].map(([id,prompt,outline,followup])=>({id:'behavioral-'+id,type:'behavioral',skills:[],domain:null,prompt,outline,followup,rubric}));
const questions=[...technical,...scenarios,...behavioral];
const areas=['Assessment & Nova','Career roadmap','Interview Studio','Résumé & job match','Framework mapping','Learning resources','Accessibility','Military-to-Cyber','Other'];
const kinds=['Confusing step','Incorrect mapping','Missing resource','Bug','Suggestion','Positive feedback'];
function blank(){return {version:1,interview:{mode:'practice',type:'all',skill:'all',selected:'',showOutline:false,drafts:{},mock:{role:'',queue:[],index:0,phase:'idle',startedAt:null},attempts:[]},resume:{text:'',job:'',linkedin:{url:'',snapshot:''},requirements:'',reviewed:false,reviewRole:null,bullet:{action:'',work:'',tools:'',result:'',evidenceId:'',confirmed:false}},feedback:{draft:{area:areas[0],kind:kinds[0],summary:'',details:'',expected:'',rating:0},items:[]}};}
function validate(value){
 if(value===undefined)return blank();
 const fail=()=>{throw Error('Invalid career tools workspace.');};
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const str=(s,n)=>typeof s==='string'&&s.length<=n;
 const role=id=>C.roles.some(r=>r.id===id),question=id=>questions.some(q=>q.id===id);
 const activity=id=>id===''||C.activities.some(a=>a.id===id)||C.roles.some(r=>'capstone-'+r.id===id);
 const date=d=>typeof d==='string'&&Number.isFinite(Date.parse(d));
 if(!obj(value)||value.version!==1||!obj(value.interview)||!obj(value.resume)||!obj(value.feedback))fail();
 const out=blank(),i=value.interview,r=value.resume,f=value.feedback;
 if(!['practice','mock'].includes(i.mode)||!['all','technical','scenario','behavioral'].includes(i.type)||!(i.skill==='all'||C.skills.some(s=>s.id===i.skill))||!(i.selected===''||question(i.selected))||typeof i.showOutline!=='boolean'||!obj(i.drafts))fail();
 Object.assign(out.interview,{mode:i.mode,type:i.type,skill:i.skill,selected:i.selected,showOutline:i.showOutline});
 if(Object.keys(i.drafts).length>100)fail();
 for(const [key,d]of Object.entries(i.drafts)){const parts=key.split('::');if(parts.length!==2||!role(parts[0])||!question(parts[1])||!obj(d)||!str(d.text,6000)||!activity(d.evidenceId)||!Array.isArray(d.checks)||d.checks.length!==4||!d.checks.every(n=>typeof n==='boolean'))fail();out.interview.drafts[key]={text:d.text,evidenceId:d.evidenceId,checks:[...d.checks]};}
 const m=i.mock;if(!obj(m)||!['idle','answering','review'].includes(m.phase)||!(m.role===''||role(m.role))||!Array.isArray(m.queue)||m.queue.length>5||new Set(m.queue).size!==m.queue.length||!m.queue.every(question)||!Number.isInteger(m.index)||m.index<0||m.index>=Math.max(1,m.queue.length)||(m.startedAt!==null&&!date(m.startedAt))||(m.phase!=='idle'&&(!m.queue.length||!role(m.role)||!date(m.startedAt))))fail();
 out.interview.mock={role:m.role,queue:[...m.queue],index:m.index,phase:m.phase,startedAt:m.startedAt};
 if(!Array.isArray(i.attempts)||i.attempts.length>30)fail();
 out.interview.attempts=i.attempts.map(a=>{if(!obj(a)||!str(a.id,100)||!date(a.date)||!role(a.role)||!Array.isArray(a.questions)||a.questions.length>5||!a.questions.every(question)||!Number.isInteger(a.answered)||a.answered<0||a.answered>a.questions.length)fail();return {id:a.id,date:a.date,role:a.role,questions:[...a.questions],answered:a.answered};});
 if(!str(r.text,60000)||!str(r.job,40000)||!str(r.requirements,12000)||typeof r.reviewed!=='boolean'||!(r.reviewRole===null||role(r.reviewRole))||!obj(r.bullet))fail();
 const b=r.bullet;if(!['action','work','tools','result'].every(k=>str(b[k],500))||!activity(b.evidenceId)||typeof b.confirmed!=='boolean')fail();
 out.resume={text:r.text,job:r.job,requirements:r.requirements,reviewed:r.reviewed,reviewRole:r.reviewRole,bullet:{action:b.action,work:b.work,tools:b.tools,result:b.result,evidenceId:b.evidenceId,confirmed:b.confirmed}};
 const linkedin=r.linkedin===undefined?{url:'',snapshot:''}:r.linkedin;
 if(!obj(linkedin)||!str(linkedin.url,300)||!str(linkedin.snapshot,60000)||
    (linkedin.url&&!/^https:\/\/www\.linkedin\.com\/in\/[\w%.-]+\/$/i.test(linkedin.url)))fail();
 out.resume.linkedin={url:linkedin.url,snapshot:linkedin.snapshot};
 function feedbackDraft(d){if(!obj(d)||!areas.includes(d.area)||!kinds.includes(d.kind)||!str(d.summary,140)||!str(d.details,2000)||!str(d.expected,1000)||!Number.isInteger(d.rating)||d.rating<0||d.rating>5)fail();return {area:d.area,kind:d.kind,summary:d.summary,details:d.details,expected:d.expected,rating:d.rating};}
 out.feedback.draft=feedbackDraft(f.draft);
 if(value.military!==undefined){
  const military=root.MilitaryJourneyModel||(typeof require==='function'?require('./military-journey-model.js'):null);
  out.military=military.validate(value.military);
 }
 if(!Array.isArray(f.items)||f.items.length>100)fail();
 out.feedback.items=f.items.map(item=>{const d=feedbackDraft(item);if(!str(item.id,100)||!date(item.date)||!role(item.role)||!['open','resolved'].includes(item.status)||!str(item.version,30)||!['overview','assessment','roles','roadmap','frameworks','research','workspace','interview','resume','feedback','military'].includes(item.route))fail();return {...d,id:item.id,date:item.date,role:item.role,status:item.status,version:item.version,route:item.route};});
 if(value.applications!==undefined){
  const tracker=root.CareerTrackerModel||(typeof require==='function'?require('./job-search/model.js'):null);
  out.applications=tracker.validate(value.applications);
 }
 return out;
}
function bank(state,E){const r=C.roles.find(r=>r.id===state.target),gap=new Map(E.gaps(state,r).map(g=>[g.skill.id,g.gap]));return questions.filter(q=>q.domain?q.domain===r.domain&&(!q.coreOnly||r.track==='Core cyber')&&(!q.aiOnly||r.track!=='Core cyber'):q.skills.length?q.skills.some(s=>s in r.requirements):true).sort((a,b)=>Math.max(0,...b.skills.map(s=>gap.get(s)||0))-Math.max(0,...a.skills.map(s=>gap.get(s)||0))||a.id.localeCompare(b.id));}
function mockQueue(state,E){const b=bank(state,E);return [...b.filter(q=>q.type==='technical').slice(0,2),...b.filter(q=>q.type==='scenario').slice(0,1),...b.filter(q=>q.type==='behavioral').slice(0,2)].map(q=>q.id);}
const concepts=[
 ['network','Networking',['networking','tcp/ip','dns','linux','windows']],['security','Security principles',['security principles','security foundations','cybersecurity fundamentals']],
 ['python','Python',['python','python3']],['python','Automation',['automation','scripting']],['detection','Detection',['detection engineering','security monitoring','siem']],['detection','Splunk',['splunk']],['detection','Microsoft Sentinel',['microsoft sentinel','azure sentinel']],['response','Incident response',['incident response','incident handling']],['response','Forensics',['forensics','dfir']],
 ['offense','Penetration testing',['penetration testing','pentesting','pentest']],['appsec','Application security',['application security','appsec','secure coding']],['appsec','API security',['api security']],['cloud','Cloud security',['cloud security']],['cloud','AWS',['aws','amazon web services']],['cloud','Azure',['azure']],['cloud','Kubernetes',['kubernetes','k8s']],['identity','Identity and access',['identity and access','iam','least privilege']],
 ['risk','Risk management',['risk management','risk assessment','risk register']],['risk','Governance',['governance','grc']],['intel','Threat intelligence',['threat intelligence','cti']],['privacy','Data protection',['data protection','data privacy','privacy']],['ot','Industrial security',['industrial security','ot security','ics security']],['ai','AI systems',['artificial intelligence','ai','machine learning','llm','rag']],['aisec','Prompt injection',['prompt injection']],['aisec','AI security',['ai security','adversarial ai','model poisoning']],['judgment','AI oversight',['human oversight','agent oversight','ai oversight']],
 ...C.certs.map(c=>[c.skills[0],c.id,[c.id.toLowerCase()]]),['risk','CISM',['cism']],['security','Security+',['security+']],['offense','OSCP',['oscp']]
].map(([skill,label,aliases],i)=>({id:'term-'+i,skill,label,aliases}));
function has(text,phrase){const escaped=phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(^|[^a-z0-9])'+escaped+'(?=$|[^a-z0-9])','i').test(text);}
function terms(text){return concepts.filter(c=>c.aliases.some(a=>has(text,a)));}
function extractRequirements(job){return [...new Set(job.split(/\n+|[;•]+|(?<=[.!?])\s+/).map(s=>s.replace(/^\s*[-*\d.)]+\s*/,'').trim()).filter(s=>s.length>=14&&s.length<=650&&!/^(about us|our company|benefits|equal opportunity)/i.test(s)))].slice(0,25).join('\n');}
function compare(resume,requirements){return requirements.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,40).map(requirement=>{
 const wanted=terms(requirement),found=wanted.filter(c=>c.aliases.some(a=>has(resume,a))),missing=wanted.filter(c=>!found.includes(c));
 const manual=/\b(years?|degree|bachelor|master|clearance|citizenship|authorized|eligible|eligibility|salary|location|hybrid|relocate|visa)\b/i.test(requirement)||!wanted.length;
 const excerpts=resume.split(/\n+/).filter(line=>found.some(c=>c.aliases.some(a=>has(line,a)))).slice(0,2).map(s=>s.trim().slice(0,300));
 return {requirement,wanted:wanted.map(c=>c.label),found:found.map(c=>c.label),missing:missing.map(c=>c.label),skills:[...new Set(missing.map(c=>c.skill))],status:!wanted.length?'Review manually':!missing.length?'Text overlap found':found.length?'Partial text overlap':'No text overlap',manual,excerpts};
 });}
function formatting(text){return {words:text.trim()?text.trim().split(/\s+/).length:0,sections:['summary','experience','projects','skills','education','certifications'].filter(s=>new RegExp('(^|\\n)\\s*'+s+'\\s*:?\\s*(\\n|$)','i').test(text)),email:/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text),tableLike:text.split('\n').filter(l=>(l.match(/\|/g)||[]).length>=2).length>1};}
function compose(b){return [b.action.trim(),b.work.trim()].filter(Boolean).join(' ')+(b.tools.trim()?' using '+b.tools.trim():'')+(b.result.trim()?'; '+b.result.trim():'')+'.';}
function evidence(state){return Object.entries(state.evidence).filter(([,v])=>v.trim()).map(([id,note])=>{const a=C.activities.find(a=>a.id===id),r=C.roles.find(r=>'capstone-'+r.id===id);return {id,note,title:a?.title||(r?.title+' · capstone'),skill:a?.skill||null,done:state.completed.includes(id)};});}
const api={blank,validate,questions,rubric,areas,kinds,bank,mockQueue,terms,compare,extractRequirements,formatting,compose,evidence,has};root.CareerToolsModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
