(function(root){
'use strict';
const M=root.MilitaryJourneyModel;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,extra='',style='ghost')=>`<button type="button" class="button ${style}" data-military-action="${action}" ${extra}>${label}</button>`;
const yesNo={yes:'Yes',no:'No'};
function select(key,label,choices,value,required=false){
 return `<label class="field">${label}<select name="${key}" ${required?'required':''}>${Object.entries(choices).map(([id,name])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`;
}
function create({catalog,engine,getState,save,refresh,notify,mentor,announce}){
 const current=()=>getState().careerTools.military||M.blank();
 const write=value=>{getState().careerTools.military=M.validate(value);save();};
 const role=id=>catalog.roles.find(r=>r.id===id);
 const selectedPath=()=>Object.values(M.paths).find(p=>[p.core,p.ai].includes(current().selected)&&current().selected===getState().target);
 function redraw(){
  refresh();
  document.getElementById('military-step-title')?.focus({preventScroll:true});
  announce();
 }
 const link=(label,url)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
 function postingForm(a){
  return `<fieldset id="military-posting" ${a.destination==='commercial'?'hidden disabled':''}>
   <legend>Job posting details (optional)</legend>
   <label class="field">Posting title<input name="postingTitle" maxlength="160" value="${esc(a.postingTitle)}"></label>
   <div data-posting="federal" ${a.destination!=='federal'?'hidden':''}>
    <label class="field">Series and grade shown on USAJOBS<input name="seriesGrade" maxlength="60" placeholder="Example: 2210 / GS-9" value="${esc(a.seriesGrade)}"></label>
   </div>
   <div data-posting="defense" ${a.destination!=='defense'?'hidden':''}>
    <label class="field">DCWF work role code from the posting<input name="dcwf" inputmode="numeric" pattern="[0-9]{3}" maxlength="3" placeholder="Example: 511" value="${esc(a.dcwf)}" ${a.destination!=='defense'?'disabled':''}></label>
    ${select('level','DoD 8140 proficiency in the posting',M.levels,a.level)}
   </div>
   <label class="field">Public requirements to practice against<textarea name="requirements" rows="3" maxlength="1800" placeholder="One posting requirement per line">${esc(a.requirements)}</textarea></label>
  </fieldset>`;
 }
 function novaFor(a,view){
  const focus={
   federal:{roadmap:'Help me turn a USAJOBS specialized-experience requirement into a practice task and evidence checklist.',
    interview:'Run a federal cyber mock interview. Ask one behavioral question at a time and give feedback on my evidence.',
    resume:'Help me write a factual federal résumé bullet that supports one specialized-experience requirement. Ask me for a sanitized example first.'},
   defense:{roadmap:'Help me prepare questions for a defense contractor recruiter about the assigned DCWF role, DoD 8140 proficiency, and qualification timing.',
    interview:'Run a defense contractor cyber mock interview. Ask one technical scenario question at a time and help me explain my evidence without sharing sensitive details.',
    resume:'Help me connect a factual résumé bullet to a defense contractor posting. Keep held credentials, training in progress, and role qualifications separate.'}
  };
  return `<button type="button" class="button small primary" data-nova-chat data-nova-prompt="${esc(focus[a.destination][view])}">Ask Nova AI about this step</button>`;
 }
 function destinationPanel(a,p,view){
  if(a.destination==='commercial')return '';
  const federal=a.destination==='federal';
  const [code,title]=M.defenseRoles[p.id];
  const roleCheck=a.dcwf?`Posting code <strong>${esc(a.dcwf)}</strong>`:`Verify the assigned code with the employer`;
  const level=a.level?M.levels[a.level]:'Confirm with the employer';
  const searchTerm=p.id==='soc'?'IT Specialist INFOSEC':p.id==='risk'?'cybersecurity risk':'information technology security';
  const steps=federal?[
   'Check Who may apply, closing date, grade, specialized experience, assessment and required documents in the announcement.',
   'Map each required experience item to work you actually performed. Use the roadmap lab to build practice evidence and identify gaps.',
   'Keep the résumé within two pages and include relevant employment dates and hours per week. Confirm final formatting in your résumé editor.'
  ]:[
   'Confirm the assigned work role code and proficiency with the employer. Check the current 8140 matrix for that exact pairing.',
   'Ask which foundational options the employer accepts, what is required at hire, and which component, contract or on-the-job requirements apply.',
   'Keep security clearance, citizenship and sponsorship requirements separate. Ask the employer or security office what it can verify or initiate.'
  ];
  const links=federal?[
   link('Search USAJOBS',M.sources.usajobs.replace('cybersecurity',encodeURIComponent(searchTerm))),
   link('Federal résumé instructions',M.sources.resume),
   link('Veterans hiring authorities',M.sources.veterans)
  ]:[
   link('DCWF role catalog',M.sources.dcwf),link('DoD 8140 qualification matrices',M.sources.matrix),
   link('Matrix publication notice',M.sources.matrixNotice),link('DoD 8140.03 manual',M.sources.manual),link('DCSA clearance guidance',M.sources.clearance)
  ];
  const prompts=federal?{
   roadmap:'Use your lab to practice one duty from the announcement. Record the requirement, the action you took, the evidence, and the result.',
   interview:'Describe a time you met one specialized-experience requirement. Explain the situation, your individual action, and the result you can verify.',
   resume:'Match each bullet to a requirement. Add employer or organization, role, dates and hours per week for relevant experience. Label lab work as practice.'
  }:{
   roadmap:'Build a sanitized work sample for a posted duty. Record the scope, evidence, decision and outcome, then check which qualification steps remain.',
   interview:'Walk through the posted duty using a fictional scenario. Explain your decision and validation steps, then ask how the employer verifies qualifications.',
   resume:'Use the posting’s language where it accurately describes your work. Separate held credentials from planned training and use employer-approved clearance wording.'
  };
  return `<section class="card military-project" aria-label="${M.destinations[a.destination]}">
   <div class="eyebrow">${M.destinations[a.destination]}</div>
   <h2>${federal?'USAJOBS application plan':'DCWF & DoD 8140 preparation'}</h2>
   ${a.postingTitle?`<p><strong>${esc(a.postingTitle)}</strong></p>`:''}
   ${federal?`<p>Series and grade · ${esc(a.seriesGrade||'Check the announcement')}</p>`:
    `<p>${roleCheck} · Proficiency: ${esc(level)}</p><p>Related DCWF role to explore · ${code} ${title}. Confirm the actual role and level before selecting a qualification option.</p>`}
   <p>${prompts[view]}</p>
   ${view==='roadmap'?`<ol class="plain-list">${steps.map(step=>`<li>${step}</li>`).join('')}</ol>`:''}
   ${a.requirements?`<details><summary>Saved posting requirements</summary><p class="evidence-excerpt" style="white-space:pre-wrap">${esc(a.requirements)}</p></details>`:''}
   <div class="career-actions">${links.join(' · ')}</div>
   <div class="career-actions">${novaFor(a,view)}${view==='resume'&&a.requirements?button('Use saved posting requirements','use-requirements','','small ghost'):''}</div>
  </section>`;
 }
 function stepForm(a){
  if(a.step===0)return `<div class="form-grid">${select('audience','Which describes you?',{'':'Choose your situation',...M.audiences},a.audience,true)}
  ${select('branch','Service branch (optional)',{'':'Choose or leave blank',...Object.fromEntries(M.branches.map(b=>[b,b]))},a.branch)}
  ${select('window','Time until separation',M.windows,a.window)}${select('orders','Duty status for Guard or Reserve',M.orders,a.orders)}
  <label class="field">Military specialty or job code (optional)<input name="code" maxlength="32" value="${esc(a.code)}" placeholder="For example, 17C or 92A"></label></div><p class="small-text">Spouses and learners using civilian experience can leave the service fields blank. A specialty code provides context for exploration.</p>`;
  if(a.step===1)return `<fieldset class="military-tasks"><legend>Choose up to two tasks you have done or want to learn</legend>${Object.entries(M.tasks).map(([id,[label]])=>`<label class="guide-option"><input type="checkbox" name="tasks" value="${id}" ${a.tasks.includes(id)?'checked':''}> ${label}</label>`).join('')}</fieldset>
  ${select('depth','How did you perform these tasks?',{learning:'Exploring or learning',assisted:'With guidance',independent:'Independently'},a.depth)}
  <label class="field">Optional example · What did you do and how did you check the result?<textarea name="example" rows="3" maxlength="700">${esc(a.example)}</textarea></label>
  <p class="small-text">Use a fictional or sanitized example. Leave out operational details, names, identifiers, medical records and clearance documents.</p>`;
  return `<div class="form-grid">${select('destination','Which sector do you want to pursue?',M.destinations,a.destination)}${select('interest','Which work interests you most?',{'':'Help me choose',...Object.fromEntries(Object.entries(M.paths).map(([id,p])=>[id,p.title]))},a.interest)}
  ${select('ai','Include an AI security stretch route?',yesNo,a.ai)}
  ${select('funding','Show training funding and credential options?',yesNo,a.funding)}
  ${select('work','Show apprenticeships and work-based programs?',yesNo,a.work)}
  ${select('support','Show mentoring and career coaching?',yesNo,a.support)}
  ${select('format','What format works for you?',M.formats,a.format)}
  ${select('hours','Study hours per week',Object.fromEntries(Array.from({length:40},(_,i)=>[i+1,i+1])),String(getState().hours))}</div>${postingForm(a)}`;
 }
 function referrals(a){
  const first=a.audience==='spouse'?['SpouseWorks Scholarship (formerly MyCAA)','Military Spouse Employer Partnership','SpouseWorks career coaching']:a.audience==='transition'||a.orders==='active'?['Transition Assistance Program (TAP)','Army Career Skills Program','SkillBridge']:['Onward to Opportunity','VET TEC 2.0','Registered Apprenticeship Finder','American Corporate Partners (ACP)'];
  const priority=p=>first.includes(p.name)?first.indexOf(p.name):first.length;
  const matching=M.programs.filter(p=>p.match(a)).sort((x,y)=>priority(x)-priority(y));
  const other=M.programs.filter(p=>!p.match(a));
  const card=p=>`<li><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.name)} ↗</a> <span class="badge neutral">${p.group}</span><p>${p.reason}</p></li>`;
  return `<section id="program-referrals" class="card margin-top" tabindex="-1"><div class="eyebrow">Program referrals</div><h2>Options to check with the provider</h2><p>These referrals follow your answers. Confirm eligibility, funding, intake dates and delivery format with the provider. Links curated for this pilot on 8 November 2026.</p>
  ${a.format==='remote'?'<p class="inline-note">You prefer remote or self-paced work. Confirm the exact cohort’s delivery format and location restrictions before applying.</p>':a.format==='local'?'<p class="inline-note">You prefer in-person options. Use location filters when searching apprenticeships, American Job Centers, or fellowship hosts.</p>':''}<ul class="military-referrals">${matching.map(card).join('')}</ul><details><summary>Browse the rest of the referral directory (${other.length})</summary><ul class="military-referrals">${other.map(card).join('')}</ul></details></section>`;
 }
 function results(a){
  const {first,options}=M.recommend(a);
  const matched=a.tasks.filter(t=>M.tasks[t][1]===first.id);
  const cards=options.map(({role:id,path,stretch},index)=>`<article class="card"><div class="eyebrow">${stretch?'AI security stretch':index?'Another role to explore':a.destination==='commercial'?'Commercial starting route':M.destinations[a.destination]}</div><h3>${esc(role(id).title)}</h3><p>${esc(role(id).description)}</p><p><strong>Next gap to test</strong> · ${path.gap}</p><p><strong>Search titles</strong> · ${stretch?esc(role(id).title)+', '+path.keywords:path.keywords}</p>${stretch?'<p class="small-text">Build and verify the core security skill first, then practice the AI extension.</p>':''}${button(a.selected===id?'Reopen roadmap':'Choose this roadmap','choose',`data-role="${id}"`,'primary')}</article>`).join('');
  return `<div class="guide-card-body"><div class="eyebrow">Nova / Your shortlist</div><h2 id="military-step-title" tabindex="-1">Your next steps in cyber</h2><p id="mentor-script" class="mentor-script">${matched.length?'Your selected tasks point toward '+first.title+'. We’ll use a work sample to see how those skills transfer.':a.interest?'Your interests point toward '+first.title+'. Start with an exercise to test your fit.':'Start with a SOC exercise to explore the work, then compare another route.'}</p>
  ${matched.length?`<ul>${matched.map(t=>`<li>${esc(M.tasks[t][0])} · ${a.depth==='learning'?'skill to learn':a.depth==='assisted'?'experience with guidance to verify':'self-reported independent experience to verify'}</li>`).join('')}</ul>`:''}
  ${a.example?`<blockquote class="evidence-excerpt">${esc(a.example)}</blockquote>`:''}
  <p class="small-text">Task choices and interests guide this shortlist. Job codes help with exploration. Complete the skills assessment for a more detailed baseline.</p><p class="small-text">Choose a roadmap to see TCM Security Academy and other training options matched to that role. Review the program referrals separately for funding and eligibility.</p>
  <div class="grid two">${cards}</div><div class="career-actions">${button('Edit my answers','back')}<a href="#program-referrals" data-military-action="referrals">See program referrals ↓</a></div></div>`;
 }
 function render(){
  const a=current();
  const titles=['Tell me where you’re starting','What work can you bring with you?','What should your plan account for?'];
  const prompts=['Tell me which situation fits you. We’ll use it to find relevant routes and programs.','Choose tasks from service, civilian work, volunteering, or training. Tell me how independently you did them.','Choose the work you want to explore and the support you need. I’ll suggest roles, a work sample and program referrals.'];
  return `<section class="card military-intro"><div class="eyebrow">Commercial, federal civilian & defense contractor pilot</div><p><strong>Carlo Anez</strong> · Lead mentor and practitioner. Nova guides the intake. Bring your work sample and questions to Carlo for human review during the pilot.</p><div class="career-actions">${Object.entries(M.samples).map(([id,s])=>button(esc(s.name),'sample',`data-sample="${id}"`,'small ghost')).join('')}</div>${a.sample?'<p class="inline-note">Sample answers are fictional. Loading a sample changes the intake only.</p>'+button('Start my own intake','reset-sample','','small ghost'):''}</section>
  <div class="guided-layout margin-top">${mentor()}<section class="guide-conversation" aria-label="Nova military career intake">${a.step===3?results(a):`<div class="guide-card-body"><div class="eyebrow">Nova / Step ${a.step+1} of 3</div><h2 id="military-step-title" tabindex="-1">${titles[a.step]}</h2><p id="mentor-script" class="mentor-script">${prompts[a.step]}</p><form id="military-intake">${stepForm(a)}<p id="military-error" role="alert"></p><div class="career-actions">${a.step?button('Back','back'):''}<button class="button light" type="submit">${a.step===2?'Show my routes':'Continue'}</button></div></form></div>`}</section></div>
  ${a.step===3?destinationPanel(a,M.recommend(a).first,'roadmap')+referrals(a):''}`;
 }
 function companion(view){
  if(!['roadmap','interview','resume'].includes(view))return '';
  const a=current();
  const selected=selectedPath();
  const context=Object.entries(M.paths).find(([,p])=>p===selected);
  const panel=context?destinationPanel(a,{...selected,id:context[0]},view):'';
  return panel+evidenceCompanion(view,selected);
 }
 function evidenceCompanion(view,p){
  if(!p)return '';
  const s=getState(),id='capstone-'+s.target,hasNote=!!s.evidence[id]?.trim();
  if(view==='roadmap')return `<section class="card military-project"><div class="eyebrow">Military-to-Cyber / Evidence assignment</div><h2>${p.project}</h2><p>${p.coreWork}</p>${s.target===p.ai?`<p><strong>AI extension</strong> · ${p.aiWork}</p>`:''}<p><strong>Review with Carlo Anez</strong> · ${p.rubric}</p>
  <form id="military-evidence"><label class="field">Add a sanitized work sample note to your role portfolio<textarea name="note" rows="3" maxlength="1500" required placeholder="What did you build, check, and learn?"></textarea></label><button class="button primary small">Add portfolio note</button></form>
  <div class="career-actions">${button('Practice with Nova','interview')}${button('Open résumé composer','resume')}<a class="button small ghost" href="#military">Intake & program referrals ↗</a></div></section>`;
  if(view==='interview')return `<section class="card military-project"><div class="eyebrow">Military-to-Cyber / Nova practice</div><p>${p.interview}</p><p class="small-text">Use the portfolio note in Interview Studio and label any lab example as practice.</p><a href="#roadmap">Return to your evidence assignment ↗</a></section>`;
  if(view==='resume')return `<section class="card military-project"><div class="eyebrow">Military-to-Cyber / Résumé evidence</div><p>${hasNote?'Use your role portfolio note in the bullet composer. Describe your action, how you verified it, and the result you can support.':'Add a work sample note on your roadmap, then use it in the bullet composer.'}</p><a href="#roadmap">Return to your evidence assignment ↗</a></section>`;
  return '';
 }
 function readStep(a,form){
  if(!form)return a;
  const fields=new FormData(form);
  const next={...a};
  for(const key of ['audience','branch','window','orders','code','format','depth','example','interest','ai','funding','work','support','destination','postingTitle','seriesGrade','dcwf','level','requirements']){
   if(fields.has(key))next[key]=String(fields.get(key)).trim();
  }
  if(a.step===1)next.tasks=fields.getAll('tasks');
  return next;
 }
 document.addEventListener('change',event=>{
  const select=event.target;
  if(select.name!=='destination'||select.form?.id!=='military-intake')return;
  const fields=select.form.querySelector('#military-posting');
  fields.hidden=fields.disabled=select.value==='commercial';
  for(const group of fields.querySelectorAll('[data-posting]')){
   group.hidden=group.dataset.posting!==select.value;
  }
  fields.querySelector('[name="dcwf"]').disabled=select.value!=='defense';
 });
 document.addEventListener('submit',event=>{
  const form=event.target;
  if(form.id==='military-intake'){
   event.preventDefault();
   const a=current(),next=readStep(a,form);
   if(next.tasks.length>2){document.getElementById('military-error').textContent='Choose at most two tasks.';return;}
   if(a.step===2)getState().hours=Number(new FormData(form).get('hours'));
   write({...next,step:a.step+1});redraw();
  }
  if(form.id==='military-evidence'){
   event.preventDefault();
   if(!selectedPath())return;
   const state=getState(),id='capstone-'+state.target,note=String(new FormData(form).get('note')).trim();
   if(!note)return;
   const entry=(current().sample?'Sample pilot work: ':'Military-to-Cyber work sample: ')+note;
   const existing=state.evidence[id]||'';
   if(existing.split('\n\n').includes(entry)){notify('This portfolio note is already saved.');return;}
   const merged=[existing,entry].filter(Boolean).join('\n\n');
   if(merged.length>2000){notify('Your portfolio note is full. Shorten it in the roadmap before adding more.');return;}
   state.evidence[id]=merged;save();refresh();notify('Portfolio note added to your role roadmap.');
  }
 });
 document.addEventListener('click',event=>{
  const el=event.target.closest('[data-military-action]');
  if(!el)return;
  const a=current(),action=el.dataset.militaryAction;
  if(action==='referrals'){
   event.preventDefault();
   const section=document.getElementById('program-referrals');
   section?.focus({preventScroll:true});section?.scrollIntoView({block:'start'});return;
  }
  if(action==='reset-sample'){write(M.blank());redraw();return;}
  if(action==='sample'){
   if(a.audience&&!a.sample&&!confirm('Replace your current pilot intake with fictional sample answers?'))return;
   write(M.sample(el.dataset.sample));redraw();return;
  }
  if(action==='back'){
   const next=readStep(a,document.getElementById('military-intake'));
   if(next.tasks.length>2){document.getElementById('military-error').textContent='Choose at most two tasks.';return;}
   write({...next,step:Math.max(0,a.step-1)});redraw();return;
  }
  if(action==='choose'){
   const id=el.dataset.role;
   if(!M.recommend(a).options.some(o=>o.role===id))return;
   getState().target=id;write({...a,selected:id});location.hash='roadmap';return;
  }
  const p=selectedPath();
  if(!p)return;
  const state=getState(),tools=state.careerTools,id='capstone-'+state.target,hasNote=!!state.evidence[id]?.trim();
  if(action==='use-requirements'){
   if(!a.requirements)return;
   const resume=tools.resume;
   if(resume.requirements&&resume.requirements!==a.requirements&&!confirm('Replace the current job-match requirements with the saved posting requirements?'))return;
   resume.requirements=a.requirements;
   resume.reviewed=false;
   save();refresh();notify('Posting requirements loaded into job match.');
   return;
  }
  if(action==='interview'){
   const studio=tools.interview,bank=root.CareerToolsModel.bank(state,engine);
   const question=bank.find(q=>q.domain===role(state.target).domain)||bank.find(q=>q.skills.includes(p.skill))||bank[0];
   studio.mode='practice';studio.type='all';studio.skill='all';studio.selected=question?.id||'';
   if(question&&hasNote){
    const key=state.target+'::'+question.id;
    if(studio.drafts[key]||Object.keys(studio.drafts).length<100){
     const draft=studio.drafts[key]||{text:'',evidenceId:'',checks:[false,false,false,false]};
     if(!draft.evidenceId)studio.drafts[key]={...draft,evidenceId:id};
    }
   }
   save();location.hash='interview';
  }
  if(action==='resume'){
   const bullet=tools.resume.bullet;
   if(hasNote&&!bullet.evidenceId){bullet.evidenceId=id;bullet.confirmed=false;save();}
   location.hash='resume';
   requestAnimationFrame(()=>document.getElementById('bullet-evidence')?.scrollIntoView({block:'center'}));
  }
 });
 return {render,companion};
}
root.MilitaryJourneyUI={create};
})(window);
