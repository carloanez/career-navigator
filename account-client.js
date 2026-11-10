/* Academy account sync: same-origin cookies, explicit migration, optimistic revisions. */
(function(root){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function create({getState,replaceState,validate,blank,notify,exportState,onStatus}){
 const endpoint=root.CareerAccountConfig?.endpoint;if(!endpoint)return null;
 const turnstile=root.CareerAccountConfig.turnstile;
 let turnstileLoad,widget;
 let user=null,nonce='',revision=0,dirty=false,busy=false,blocked=false,ready=false,timer=null,lastSaved='',submitted=new Map(),reset=null,pendingInitial=false,conflictPending=false,linkedinBusy=false;
 const bar=document.createElement('section');bar.className='account-bar';bar.setAttribute('aria-label','Student account');document.querySelector('.main-wrap').prepend(bar);
 const dialog=document.createElement('dialog');dialog.className='account-dialog';document.body.append(dialog);
 const shield=document.createElement('div');shield.className='account-shield';shield.innerHTML='<p>Opening your learning workspace…</p>';document.body.append(shield);
 function status(message){bar.innerHTML=`<span>${user?`<strong>${esc(user.email)}</strong> · `:''}<span id="cloud-status" role="status">${esc(message)}</span></span><button class="button small ghost" data-account="open">${user?'My account':'Student sign in'}</button>`;document.querySelectorAll('.sidebar-bottom small').forEach(el=>el.textContent=user?'Your workspace saves privately to your Academy account.':'Guest progress stays in this browser. Sign in to save across devices.');document.querySelectorAll('.local-pill').forEach(el=>el.textContent=user?'● STUDENT ACCOUNT':'● LOCAL FIRST');onStatus?.();}
 async function api(action,data){const r=await fetch(endpoint+encodeURIComponent(action),{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:data===undefined?{}:{'Content-Type':'application/json','X-ICN-Nonce':nonce},body:data===undefined?undefined:JSON.stringify(data)});let v;try{v=await r.json();}catch{throw Error('The account service did not respond. Your work has not been sent.');}if(!r.ok){const e=Error(v.error||'Account request failed.');e.status=r.status;e.conflict=v.conflict;throw e;}return v;}
 function show(html){removeChallenge();dialog.innerHTML=`<button class="account-close" data-account="close" aria-label="Close account window">×</button>${html}<p class="account-message" role="status"></p>`;if(!dialog.open)dialog.showModal();}
 function removeChallenge(){
  if(widget!==undefined){root.turnstile?.remove(widget);widget=undefined;}
 }
 function loadChallenge(){
  if(root.turnstile)return Promise.resolve();
  if(!turnstileLoad)turnstileLoad=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
   script.onload=()=>root.turnstile?resolve():reject(Error('Security check unavailable. Reopen this form to retry.'));
   script.onerror=()=>{script.remove();reject(Error('Security check could not load. Reopen this form to retry.'));};
   document.head.append(script);
  }).catch(error=>{turnstileLoad=undefined;throw error;});
  return turnstileLoad;
 }
 async function mountChallenge(action){
  if(!turnstile?.required)return;
  const form=dialog.querySelector('[data-account-form]');
  const button=form.querySelector('button[type="submit"]');
  const container=form.querySelector('[data-turnstile]');
  const token=form.elements.turnstileToken;
  button.disabled=true;
  try{
   if(!turnstile.siteKey)throw Error('Account verification is temporarily unavailable.');
   await loadChallenge();
   if(!container.isConnected||!dialog.open)return;
   const update=value=>{token.value=value;button.disabled=!value;};
   widget=root.turnstile.render(container,{
    sitekey:turnstile.siteKey,action,'response-field':false,
    callback:update,'expired-callback':()=>update(''),
    'error-callback':()=>{update('');message('Security check failed. Reopen this form to retry.');},
   });
  }catch(error){if(container.isConnected&&dialog.open)message(error.message);}
 }
 dialog.addEventListener('close',()=>{if(!dialog.open)removeChallenge();});
 function message(s){const el=dialog.querySelector('.account-message');if(el)el.textContent=s;}
 function notice(){return '<p class="small-text">Account saving stores your assessments, roadmaps, evidence, interview answers, application tracker entries, and résumé/job text privately on IgniteCyber Academy. Authorized site administrators manage this data. Nova chats you choose to save are stored separately in your account. Your Nova messages and public page context go to OpenAI. Submitted beta feedback is shared with the Academy team. You can export your workspace and delete your account. Backup copies may remain until existing backups expire.</p>';}
 function open(){
  if(pendingInitial){chooseInitial();return;}
  if(reset){show(`<h2>Set your student password</h2><form data-account-form="reset-password"><label>New password<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><label>Confirm password<input name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><button class="button light">Save password</button></form>`);return;}
  if(!user){show(`<h2>Your path, on every device.</h2><p>Sign in to save your learning workspace privately.</p><form data-account-form="login"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="128"></label><label class="account-check"><input name="remember" type="checkbox"> Keep me signed in on this personal device</label><button class="button light">Sign in</button></form><div class="career-actions"><button class="button ghost small" data-account="register">Create a student account</button><button class="button ghost small" data-account="recover">Forgot password?</button></div>${notice()}`);return;}
  show(`<h2>Your student workspace</h2><p>${esc(user.email)}</p><p>${dirty?'You have changes waiting to save.':blocked?'Sync needs your attention.':'Your account workspace is up to date.'}</p>${notice()}<section data-linkedin-account></section><div class="career-actions">${blocked?'<button class="button primary" data-account="reauth">Sign in again</button>':'<button class="button primary" data-account="sync">Save now</button>'}<button class="button ghost" data-account="export">Export my workspace</button><button class="button ghost" data-account="logout">Sign out</button></div><details><summary>Delete my student account</summary><p>This removes your account, saved workspace, saved Nova chat and submitted feedback from the active site. Export first if you want a copy.</p><form data-account-form="delete-account"><label>Current password<input name="password" type="password" autocomplete="current-password" required></label><label class="account-check"><input name="confirm" type="checkbox" required> Delete my account and saved records</label><button class="button ghost">Delete my account</button></form></details>`);
  loadLinkedIn();
 }
 async function loadLinkedIn(){
  const section=dialog.querySelector('[data-linkedin-account]');
  if(!section)return;
  try{
   const connection=await api('linkedin-status',{});
   if(!section.isConnected||(!connection.available&&!connection.linked))return;
   section.innerHTML=`<h3>LinkedIn account</h3><p>${connection.linked?'LinkedIn is connected to this student account.':'Connect your LinkedIn account to this student account.'} Direct profile import is disabled.</p><button class="button ghost small" data-account="${connection.linked?'linkedin-disconnect':'linkedin-start'}">${connection.linked?'Disconnect LinkedIn':'Connect LinkedIn'}</button>`;
  }catch{ /* Account controls remain usable when linking is unavailable. */ }
 }
 function showLinkedInResult(){
  if(!location.hash.startsWith('#linkedin='))return;
  const result=location.hash.slice(10);
  history.replaceState(null,'',location.pathname+location.search+'#overview');
  const messages={linked:'LinkedIn account connected.',cancelled:'LinkedIn connection cancelled.',expired:'This LinkedIn request expired or your session changed. Start again from My account.',failed:'LinkedIn could not complete the connection. Please try again.',conflict:'This LinkedIn account could not be linked. Either account may already have a connection.'};
  if(user&&!pendingInitial&&!reset)open();
  notify(Object.hasOwn(messages,result)?messages[result]:messages.failed);
 }
 function chooseInitial(){pendingInitial=true;blocked=true;status('Choose how to start your account workspace');show(`<h2>Start your account workspace</h2><p>Your account has no saved workspace yet. Choose whether to bring this browser’s current work with you.</p>${notice()}<div class="career-actions"><button class="button light" data-account="migrate">Save this device’s workspace</button><button class="button ghost" data-account="fresh">Start with a blank workspace</button></div><p>Only choose this device’s workspace if these assessments and résumé drafts belong to you.</p>`);}
 async function attach(){
  const cloud=await api('workspace-get',{});revision=cloud.revision;
  if(cloud.workspace===null){chooseInitial();return;}
  const value=validate(cloud.workspace);replaceState(value);lastSaved=JSON.stringify(getState());dirty=false;blocked=false;status('Saved to your Academy account');await feedbackStatuses();
 }
 async function feedbackStatuses(){try{const r=await api('feedback-list',{});submitted=new Map(r.items.map(x=>[x.clientId,x]));decorate();}catch{ /* Workspace remains usable if feedback status is temporarily unavailable. */ }}
 function changed(){if(!user)return;dirty=JSON.stringify(getState())!==lastSaved;status(blocked?'Sync paused · review your account':dirty?'Changes waiting to save…':'Saved to your Academy account');clearTimeout(timer);if(dirty&&!blocked)timer=setTimeout(flush,900);}
 async function flush(){
  clearTimeout(timer);if(!user||!ready||blocked||busy||!dirty)return !dirty;
  busy=true;const snapshot=JSON.stringify(getState());status('Saving privately…');
  try{const r=await api('workspace-save',{revision,workspace:JSON.parse(snapshot)});revision=r.revision;lastSaved=snapshot;dirty=JSON.stringify(getState())!==snapshot;status(dirty?'Saving your latest changes…':'Saved to your Academy account');if(dirty)timer=setTimeout(flush,50);return !dirty;}
  catch(e){if(e.conflict){blocked=true;conflict();}else if(e.status===401||e.status===403){blocked=true;status('Session expired · export unsaved work, then sign in again');}else{status('Not saved to your account · retry or export before leaving');}return false;}finally{busy=false;}
 }
 function conflict(){conflictPending=true;status('Another device saved changes · choose a version');show(`<h2>Two devices, two versions.</h2><p>Another device saved a newer workspace. Neither version has been overwritten. Export this device’s work first if you need to preserve both.</p><div class="career-actions"><button class="button ghost" data-account="export">Export this device’s version</button><button class="button primary" data-account="load-cloud">Load the account version</button><button class="button ghost" data-account="keep-device">Keep this device’s version</button></div>`);}
 function decorate(){
  if(!ready)return;
  document.querySelectorAll('[data-career-action="feedback-status"]').forEach(btn=>{
   const parent=btn.parentElement,id=btn.dataset.id,old=parent.querySelector('[data-account-feedback]');if(old)old.remove();
   const send=document.createElement('button');send.type='button';send.className='button small primary';send.dataset.accountFeedback=id;
   const item=submitted.get(id);send.textContent=item?'Sent · '+item.status:'Send to Academy';send.disabled=!!item;parent.append(send);
  });
  document.querySelectorAll('#studio-save-state').forEach(el=>el.textContent=el.textContent.replace('saved locally as you type',user?'saved to your account as you type':'saved in this browser as you type'));
  document.querySelectorAll('.resume-inputs small').forEach(el=>{if(el.textContent.includes('no upload'))el.textContent=user?'Private text review · draft saves to your Academy account':'Local text review · sign in to save across devices';});
 }
 async function submitFeedback(id){
  if(!user){notify('Sign in before sending feedback to the Academy.');open();return;}
  const item=getState().careerTools.feedback.items.find(x=>x.id===id);if(!item)return;
  show(`<h2>Send this feedback to the Academy?</h2><p><strong>${esc(item.summary)}</strong></p><p>${esc(item.details)}</p><p>Only this feedback item and your student account identity will be shared with the Academy team. Your résumé, interview answers and assessment are not included.</p><button class="button light" data-account="confirm-feedback" data-id="${esc(id)}">Send feedback</button>`);
 }
 async function signOut(remove=false){
  if(!remove){if(dirty||busy){await flush();if(dirty||busy){message('Changes have not finished saving. Export a copy, or wait and try signing out again.');return;}}await api('logout',{});}
  user=null;window.dispatchEvent(new CustomEvent('career-account-changed',{detail:{signedOut:true}}));dirty=false;blocked=false;ready=false;pendingInitial=false;conflictPending=false;lastSaved='';submitted.clear();replaceState(blank());try{sessionStorage.removeItem('ignitecyber.guide.v1');localStorage.removeItem('ignitecyber.guide.v1');}catch{}dialog.close();await init();notify(remove?'Student account deleted.':'Signed out. Your account workspace is no longer displayed on this device.');
 }
 async function act(action,el){
  if(action==='open'){if(conflictPending){conflict();return;}open();}
  if(action==='close')dialog.close();
  if(action==='register'||action==='recover'){
   show(`<h2>${action==='register'?'Create your student account':'Recover your account'}</h2><form data-account-form="${action}"><label>Email<input name="email" type="email" autocomplete="email" required></label>${action==='register'?`<label class="account-check"><input name="consent" type="checkbox" required> I agree to an Academy student account and private workspace storage.</label>${notice()}`:''}${turnstile?.required?'<div data-turnstile></div><input type="hidden" name="turnstileToken">':''}<button type="submit" class="button light" ${turnstile?.required?'disabled':''}>Email my private password link</button></form><button class="button small ghost" data-account="open">Back to sign in</button>`);
   await mountChallenge(action);
  }
  if(action==='reauth')show(`<h2>Sign in again</h2><p>Your unsaved workspace stays open while you reconnect to the same account.</p><form data-account-form="reauthenticate"><label>Email<input name="email" type="email" value="${esc(user.email)}" autocomplete="username" readonly required></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="128"></label><button class="button light">Reconnect my workspace</button></form>`);
  if(action==='export')exportState();
  if(action==='sync'){if(blocked){message('Sync is paused. Reload or resolve the saved version before continuing.');return;}await flush();message(dirty?'Changes still need saving.':'Saved to your Academy account.');}
  if(action==='logout')await signOut();
  if(action==='linkedin-start'||action==='linkedin-disconnect'){
   if(linkedinBusy)return;
   linkedinBusy=true;el.disabled=true;
   try{
    if(action==='linkedin-disconnect'){await api(action,{});await loadLinkedIn();message('LinkedIn disconnected.');return;}
    if(!await flush()||dirty||busy||blocked)throw Error('Save or resolve your workspace changes before connecting LinkedIn.');
    const {url}=await api(action,{});
    const target=new URL(url);
    if(target.origin!=='https://www.linkedin.com'||target.pathname!=='/oauth/v2/authorization')throw Error('The LinkedIn connection URL was invalid.');
    if(dirty||busy||blocked)throw Error('Save your latest changes before connecting LinkedIn.');
    location.assign(target.href);
   }finally{linkedinBusy=false;el.disabled=false;}
  }
  if(action==='migrate'||action==='fresh'){if(action==='fresh')replaceState(blank());pendingInitial=false;blocked=false;dirty=true;await flush();if(!dirty){try{localStorage.removeItem('ignitecyber.career.v1');}catch{}dialog.close();await feedbackStatuses();}}
  if(action==='load-cloud'||action==='keep-device'){
   const r=await api('workspace-get',{});revision=r.revision;conflictPending=false;
   if(action==='load-cloud'){replaceState(r.workspace?validate(r.workspace):blank());lastSaved=JSON.stringify(getState());dirty=false;blocked=false;status('Account version loaded');dialog.close();}
   else{if(!confirm('Replace the newer account version with this device’s workspace? Export either version first if you need both.'))return;blocked=false;dirty=true;await flush();if(!dirty)dialog.close();}
  }
  if(action==='confirm-feedback'){const item=getState().careerTools.feedback.items.find(x=>x.id===el.dataset.id);if(!item)return;await api('feedback-submit',{item,consent:true});submitted.set(item.id,{status:'open'});dialog.close();decorate();notify('Feedback sent to IgniteCyber Academy.');}
 }
 document.addEventListener('click',e=>{const send=e.target.closest('[data-account-feedback]');if(send){submitFeedback(send.dataset.accountFeedback);return;}const el=e.target.closest('[data-account]');if(el){act(el.dataset.account,el).catch(e=>message(e.message));}});
 dialog.addEventListener('submit',async e=>{
  const f=e.target.closest('[data-account-form]');if(!f)return;e.preventDefault();const action=f.dataset.accountForm,fields=Object.fromEntries(new FormData(f)),button=f.querySelector('button');if(button.disabled)return;button.disabled=true;message('Working…');
  try{
   if(action==='reset-password'){if(fields.password!==fields.confirm)throw Error('The passwords do not match.');fields.key=reset.key;fields.login=reset.login;}
   const previousUser=user?.id;
   const freshSession=await api('session');nonce=freshSession.nonce;
   const r=await api(action==='reauthenticate'?'login':action,fields);
   if(action==='login'||action==='reauthenticate'){const session=await api('session');if(action==='reauthenticate'&&session.user?.id!==previousUser)throw Error('Reconnect using the same student account.');user=session.user;nonce=session.nonce;if(!user)throw Error('Sign-in cookies could not be established. Allow first-party cookies and try again.');ready=true;window.dispatchEvent(new Event('career-account-changed'));dialog.close();if(action==='reauthenticate'){const remote=await api('workspace-get',{});if(remote.revision!==revision){conflict();return;}blocked=false;await flush();}else await attach();}
   else if(action==='delete-account'){await signOut(true);}
   else if(action==='reset-password'){reset=null;history.replaceState(null,'',location.pathname+location.search+'#overview');open();message(r.message);}
   else message(r.message);
  }catch(e){message(e.message);}finally{fields.password='';f.querySelectorAll('input[type="password"]').forEach(i=>i.value='');if(f.elements.turnstileToken){f.elements.turnstileToken.value='';if(f.isConnected&&widget!==undefined)root.turnstile.reset(widget);}else button.disabled=false;}
 });
 new MutationObserver(()=>decorate()).observe(document.getElementById('content'),{childList:true});
 window.addEventListener('beforeunload',e=>{if(user&&(dirty||busy)){e.preventDefault();e.returnValue='';}});
 async function refresh(){if(!ready||!user||busy||blocked)return;const owner=user.id;try{const session=await api('session');if(user?.id!==owner)return;if(!session.user||session.user.id!==user.id){blocked=true;status('Your sign-in changed · export this workspace before reloading');return;}nonce=session.nonce;if(dirty){await flush();return;}const r=await api('workspace-get',{});if(user?.id!==owner||dirty||busy||blocked)return;if(r.revision>revision){replaceState(r.workspace?validate(r.workspace):blank());revision=r.revision;lastSaved=JSON.stringify(getState());status('Updated from your Academy account');}await feedbackStatuses();}catch{status('Account connection unavailable · unsaved changes will wait');}}
 window.addEventListener('focus',refresh);setInterval(()=>{if(!document.hidden)refresh();},45000);
 function resetFragment(){if(location.hash.startsWith('#account-reset=')){const p=new URLSearchParams(location.hash.slice(1));reset={key:p.get('account-reset'),login:p.get('login')};history.replaceState(null,'',location.pathname+location.search+'#overview');open();}}
 window.addEventListener('hashchange',resetFragment);
 async function init(){
  try{const r=await api('session');nonce=r.nonce;user=r.user;ready=true;if(user)await attach();else status('Guest workspace · sign in to save across devices');}
  catch(e){blocked=true;status('Account service unavailable · guest changes stay on this device');}
  finally{shield.remove();decorate();}
  resetFragment();
  showLinkedInResult();
 }
 init();return {get user(){return user;},get trackerReady(){return Boolean(user&&lastSaved&&!pendingInitial);},changed,refresh,flush};
}
root.CareerAccounts={create};
})(window);
