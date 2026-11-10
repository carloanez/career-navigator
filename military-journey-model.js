(function(root){
'use strict';
const audiences={transition:'Transitioning or active duty',veteran:'Veteran',guard:'National Guard or Reserve',spouse:'Military spouse'};
const windows={early:'More than six months',near:'Within six months',separated:'Already separated',unknown:'Unsure / does not apply'};
const formats={any:'Any format',remote:'Remote or self-paced',local:'Local or in person'};
const orders={active:'Currently on active-duty orders',part:'Part-time / no active-duty orders',unknown:'Unsure'};
const tasks={
 triage:['Triaged alerts, incidents, or operational issues','soc',3],
 investigate:['Investigated incidents and documented escalation decisions','soc',3],
 brief:['Briefed findings and coordinated handoffs','soc',1],
 inventory:['Reconciled inventories or investigated exceptions','risk',3],
 controls:['Checked procedures, controls, or compliance evidence','risk',3],
 coordinate:['Coordinated vendors, projects, or readiness reviews','risk',1],
 access:['Managed accounts, access requests, or permissions','identity',3],
 systems:['Supported users, systems, networks, or communications','identity',3],
 automate:['Automated administration or validated configuration changes','identity',2]
};
const paths={
 soc:{title:'SOC & incident response',core:'soc-core',ai:'soc-ai',skill:'detection',keywords:'SOC analyst, security operations analyst, incident triage analyst',gap:'Practice querying event logs and justifying escalation.',project:'Triage a fictional alert queue',coreWork:'Use synthetic login and endpoint events. Build a timeline, explain which alert to escalate, and write a handoff.',aiWork:'Compare an AI-generated incident summary with the original events. Flag unsupported claims and document what you verified.',rubric:'Trace each finding to an event, explain severity, and show what evidence would change your decision.',interview:'Walk Nova through an escalation decision. What would you verify before trusting an AI summary?'},
 risk:{title:'Risk & governance',core:'grc-core',ai:'grc-ai',skill:'risk',keywords:'Cybersecurity risk analyst, controls analyst, GRC analyst',gap:'Practice writing a control test and recording its limitations.',project:'Review controls for a fictional organization',coreWork:'Build a small asset register, select one control, and write a test with evidence, an exception, and an owner.',aiWork:'Add an AI use case, review a fictional vendor, and document a risk decision and oversight requirements.',rubric:'Connect the asset to the control, specify the evidence, and give the exception a clear owner and follow-up.',interview:'Explain a control exception to a stakeholder. What evidence would change your AI risk recommendation?'},
 identity:{title:'IT & identity security',core:'iam-core',ai:'iam-ai',skill:'identity',keywords:'IT support technician, IAM analyst, access administration analyst',gap:'Practice access provisioning, least privilege, and audit logging.',project:'Build an access review for a fictional team',coreWork:'Create fictional access tickets, approve or reject each request, and document a repeatable verification step.',aiWork:'Extend the lab to a cloud workload or AI agent. Give it narrow permissions, test a denied action, and capture the audit trail.',rubric:'Explain scope, demonstrate a denied request, and show that access can be removed.',interview:'Describe how you verified least privilege. How would you constrain and audit an AI agent’s access?'}
};
const programs=[];
function add(name,url,group,reason,match=()=>true){programs.push({name,url,group,reason,match});}
const service=a=>a.audience==='transition'||a.audience==='guard'&&a.orders==='active';
const near=a=>service(a)&&['near','unknown'].includes(a.window);
const spouse=a=>a.audience==='spouse';
const funding=a=>a.funding==='yes';
const mentor=a=>a.support==='yes';
const work=a=>a.work==='yes';
add('Transition Assistance Program (TAP)','https://www.dol.gov/agencies/vets/programs/tap','Transition','Ask your installation transition counselor for the right timetable and workshops.',service);
add('SkillBridge','https://skillbridge.mil/','Transition','Check branch rules, commander approval, and approved providers. Ask early about your window.',a=>service(a)&&a.window!=='separated');
add('Army Career Skills Program','https://home.army.mil/imcom/customers/career-skills-program/frequently-asked-questions','Transition','Confirm Army-specific timing and approval with your installation.',a=>service(a)&&a.window!=='separated'&&a.branch==='Army');
add('Credentialing Opportunities On-Line (COOL)','https://www.cool.osd.mil/','Credentials','Find your service’s credentialing options and check whether assistance is available.',a=>!spouse(a)&&a.audience!=='veteran');
add('USMAP','https://www.apprenticeship.gov/help/what-apprenticeship-programs-exist-service-members-andor-veterans','Work experience','Check service, duty status, and trade requirements for an in-service apprenticeship.',service);
add('MilGears','https://milgears.osd.mil/','Career exploration','Explore civilian careers and credentials related to your service experience.',a=>!spouse(a));
add('My Next Move for Veterans','https://www.mynextmove.org/vets/','Career exploration','Look up possible civilian occupations by military specialty.',a=>!spouse(a));
add('GI Bill Comparison Tool','https://www.va.gov/education/gi-bill-comparison-tool/','Funding','Check the exact school or program and confirm your entitlement. Spouses can check transferred benefits if applicable.',funding);
add('GI Bill exam reimbursement','https://www.va.gov/education/about-gi-bill-benefits/how-to-use-benefits/licensing-and-certification-tests/','Funding','Confirm exam approval, reimbursement steps, and entitlement impact before paying.',funding);
add('VET TEC 2.0','https://www.va.gov/education/other-va-education-benefits/vet-tec-2/','Funding','Ask VA about service, separation, age, discharge, and approved provider requirements.',a=>funding(a)&&(a.audience==='veteran'||near(a)));
add('Veteran Readiness and Employment (VR&E)','https://www.va.gov/careers-employment/vocational-rehabilitation/eligibility/','Funding','If relevant to you, discuss eligibility and an employment plan privately with VA.',a=>funding(a)&&(a.audience==='veteran'||service(a)));
add('Onward to Opportunity','https://ivmf.syracuse.edu/programs/o2o','Training','Review no-cost preparation and separately check eligibility for exam coverage.',funding);
add('Skills for Vets','https://skillsforvets.org/','Funding','Search training by audience and funding type, then verify details with the provider.',funding);
add('SpouseWorks Scholarship (formerly MyCAA)','https://www.militaryonesource.mil/benefits/spouseworks-scholarship/','Funding','Check qualifying orders and whether the credential or school is approved.',a=>spouse(a)&&funding(a));
add('SpouseWorks career coaching','https://spouseworks.militaryonesource.mil/','Mentoring','Discuss a portable career plan and education options with a spouse career coach.',spouse);
add('Military Spouse Employer Partnership','https://msepjobs.militaryonesource.mil/','Hiring','Explore employer options and verify remote or relocation policies for each job.',spouse);
add('Hiring Our Heroes fellowships','https://www.hiringourheroes.org/career-services/fellowships/','Work experience','Compare fellowship tracks and confirm audience, timing, and host requirements.',a=>work(a)||spouse(a));
add('Registered Apprenticeship Finder','https://www.apprenticeship.gov/apprenticeship-job-finder','Work experience','Search cybersecurity, IT support, and related paid apprenticeship openings.',work);
add('American Job Centers','https://www.dol.gov/agencies/vets/disabled-veterans/employment-training','Hiring','Ask about local training, career services, and veteran employment support.',a=>work(a)||funding(a));
add('Microsoft military career pathways','https://military.microsoft.com/your-path-to-tech/','Training','Check current MSSA and other employer pathways for your status and intake dates.',work);
add('Hire Heroes USA','https://www.hireheroesusa.org/training-partners/','Hiring','Explore coaching, résumé support, and partner training.',a=>mentor(a)||work(a));
add('American Corporate Partners (ACP)','https://www.acp-usa.org/mentoring-program/program-overview/','Mentoring','Check the veteran or spouse mentoring track for your situation.',mentor);
add('VetSec','https://vetsec.org/our-story/','Community','Explore a veteran cyber peer community and check membership access.',a=>!spouse(a)&&mentor(a));
add('SANS Cyber Academies','https://www.sans.org/cyber-academy','Training','Check the current competitive entry program and intake dates.',funding);
add('SANS.edu veterans admissions','https://www.sans.edu/admissions/veterans','Training','Ask the school and VA about coverage for the exact degree or certificate.',a=>funding(a)&&!spouse(a));
add('SANS AI cybersecurity careers guide','https://www.sans.org/white-papers/sans-ai-cybersecurity-careers-guide','Career exploration','Compare AI responsibilities added to existing roles with dedicated AI security jobs.',a=>a.ai==='yes');
add('SailingCyber RouteFinder','https://sailingcyber.com/routefinder','Career exploration','Compare another cyber route assessment and its suggested projects.');
add('O*NET Military Crosswalk','https://www.onetonline.org/crosswalk/MOC/','Career exploration','Check your military specialty against related civilian occupations.',a=>!spouse(a)&&!!a.code);
add('CyberSeek','https://www.cyberseek.org/pathway.html','Career exploration','Compare civilian roles, skills and common job titles.');
add('TryHackMe learning paths','https://tryhackme.com/paths','Practice','Find a lab for a roadmap gap and document your own evidence.');
add('HTB Academy role paths','https://academy.hackthebox.com/catalogue/paths','Practice','Choose a role or skill module and check its access terms.');
const destinations={commercial:'Commercial cybersecurity & AI security',federal:'Federal civilian cybersecurity',defense:'Defense contractor cybersecurity'};
const levels={'':'Check the posting',basic:'Basic',intermediate:'Intermediate',advanced:'Advanced'};
const defenseRoles={
 soc:['511','Cyber Defense Analyst'],
 risk:['612','Security Control Assessor'],
 identity:['451','System Administrator']
};
const postingFields={postingTitle:160,seriesGrade:60,dcwf:3,requirements:1800};
const sources={
 usajobs:'https://www.usajobs.gov/Search/Results?k=cybersecurity',
 resume:'https://usajobshelp.opm.gov/hc/en-us/articles/52839989720851-How-do-I-write-a-resume-for-a-federal-job',
 veterans:'https://www.opm.gov/fedshirevets/hiring-officials/strategic-recruitment-and-hiring/veterans/',
 dcwf:'https://dodcio.defense.gov/Cyber-Workforce/DCWF.aspx',
 matrix:'https://www.cyberworkforce.mil/DoD-8140/',
 matrixNotice:'https://www.cyber.mil/dod-workforce-innovation-directorate/dod8140/qualification-matrices',
 manual:'https://dodcio.defense.gov/Portals/0/Documents/Library/DoDM-8140-03.pdf',
 clearance:'https://www.dcsa.mil/Trust-Decision-Adjudications/FAQS-Trust-Decision-Adjudications/'
};
const branches=['Army','Navy','Air Force','Marine Corps','Space Force','Coast Guard','Other'];
const choices={destination:Object.keys(destinations),level:Object.keys(levels),format:Object.keys(formats),audience:Object.keys(audiences),window:Object.keys(windows),orders:Object.keys(orders),branch:['',...branches],interest:['','soc','risk','identity'],depth:['learning','assisted','independent'],funding:['yes','no'],work:['yes','no'],support:['yes','no'],ai:['yes','no']};
const blank=()=>({step:0,destination:'commercial',level:'',postingTitle:'',seriesGrade:'',dcwf:'',requirements:'',format:'any',audience:'',window:'unknown',orders:'unknown',branch:'',code:'',interest:'',depth:'learning',funding:'yes',work:'yes',support:'yes',ai:'yes',tasks:[],example:'',sample:'',selected:''});
const samples={
 federal:{name:'Federal civilian · veteran SOC applicant',destination:'federal',audience:'veteran',window:'separated',interest:'soc',tasks:['triage','investigate'],depth:'independent',ai:'no',postingTitle:'Fictional IT Specialist (INFOSEC)',seriesGrade:'2210 / GS-9 (sample)',requirements:'Analyze security alerts and document escalation decisions.\nCommunicate findings in an incident report.'},
 defense:{name:'Defense contractor · Guard controls analyst',destination:'defense',audience:'guard',orders:'part',interest:'risk',tasks:['controls','inventory'],depth:'assisted',ai:'no',postingTitle:'Fictional Security Control Assessor',dcwf:'612',level:'intermediate',requirements:'Assess security controls and document evidence.\nTrack remediation findings and communicate residual risk.'},
 soc:{name:'Army cyber operator preparing to separate',audience:'transition',branch:'Army',code:'17C',window:'near',interest:'soc',tasks:['triage','investigate'],depth:'independent',example:'In a fictional practice example, I reviewed alert evidence, recorded a timeline and escalated an unresolved event.'},
 risk:{name:'Veteran moving from logistics into risk',audience:'veteran',branch:'Army',code:'92A',window:'separated',interest:'risk',tasks:['inventory','controls'],depth:'assisted',example:'In a fictional practice example, I reconciled inventory records and documented exceptions for review.'},
 identity:{name:'Military spouse with support experience',audience:'spouse',format:'remote',interest:'identity',tasks:['systems','access'],depth:'assisted',example:'In a fictional practice example, I documented access requests and verified account changes.'},
 guard:{name:'Part-time Guard member in IT support',audience:'guard',branch:'Air Force',orders:'part',interest:'identity',tasks:['systems','automate'],depth:'independent',example:'In a fictional practice example, I checked configuration changes and documented support handoffs.'}
};
function validate(value){
 if(value===undefined)return undefined;
 const v=blank();
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid military journey.');
 for(const [key,allowed] of Object.entries(choices)){
  const choice=['destination','level'].includes(key)&&value[key]===undefined?v[key]:value[key];
  if(!(key==='audience'&&choice==='')&&!allowed.includes(choice))throw Error('Invalid military journey choice.');
  v[key]=choice;
 }
 for(const [key,max] of [['code',32],['example',700]]){
  if(typeof value[key]!=='string'||value[key].length>max)throw Error('Invalid military journey text.');
  v[key]=value[key];
 }
 for(const [key,max] of Object.entries(postingFields)){
  const text=value[key]===undefined?'':value[key];
  if(typeof text!=='string'||text.length>max||(key==='dcwf'&&text&&!/^\d{3}$/.test(text)))throw Error('Invalid job posting detail.');
  v[key]=text;
 }
 if(!Array.isArray(value.tasks)||value.tasks.length>2||new Set(value.tasks).size!==value.tasks.length||!value.tasks.every(t=>Object.hasOwn(tasks,t)))throw Error('Invalid military journey tasks.');
 if(!Number.isInteger(value.step)||value.step<0||value.step>3||(value.step>0&&!value.audience))throw Error('Invalid military journey step.');
 if(!['',...Object.keys(samples)].includes(value.sample)||!['',...Object.values(paths).flatMap(p=>[p.core,p.ai])].includes(value.selected))throw Error('Invalid military journey selection.');
 return {...v,tasks:[...value.tasks],step:value.step,sample:value.sample,selected:value.selected};
}
function recommend(a){
 const ranked=Object.entries(paths).map(([id,p])=>({id,...p,score:(a.interest===id?4:0)+a.tasks.reduce((n,t)=>n+(tasks[t][1]===id?tasks[t][2]:0),0)})).sort((a,b)=>b.score-a.score);
 const first=ranked[0];
 return {first,options:[{path:first,role:first.core,stretch:false},a.ai==='yes'?{path:first,role:first.ai,stretch:true}:{path:ranked[1],role:ranked[1].core,stretch:false}]};
}
function sample(id){const {name,...values}=samples[id];return {...blank(),...values,tasks:[...values.tasks],sample:id};}
root.MilitaryJourneyModel={audiences,windows,formats,orders,branches,destinations,levels,defenseRoles,sources,tasks,paths,programs,samples,blank,validate,recommend,sample};
if(typeof module!=='undefined')module.exports=root.MilitaryJourneyModel;
})(typeof window!=='undefined'?window:globalThis);
