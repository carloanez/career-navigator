(function(){
'use strict';
const script = document.currentScript;
const academy = script.dataset.novaPage;
const hosted = Boolean(window.CareerNovaConfig || academy);
const endpoint = action => hosted ? '/career-navigator/?nova_api=' + action : '/api/nova/' + action;
const pages = {
  overview: ['Overview', 'Start an assessment, explore a demo, compare cyber and AI careers, or open your roadmap.', 'Where should I start?'],
  assessment: ['My assessment', 'Take the guided baseline with Nova or use the full form. Rate current practice and answer short knowledge checks. The baseline guides learning recommendations.', 'How should I rate my current skills?'],
  military: ['Military-to-Cyber', 'Nova intake translates military experience into commercial cyber, AI security, federal civilian, or defense contractor journeys. Each journey connects to a roadmap, interview, résumé, and referrals.', 'How do the military-to-cyber journeys differ?'],
  roles: ['Explore roles', 'Compare roles by domain and AI track, then choose a target for the roadmap.', 'How do I choose a target role?'],
  roadmap: ['My roadmap', 'Follow learning sprints, review frameworks and optional credentials, and record portfolio evidence.', 'How should I pick my first learning sprint?'],
  interview: ['Interview Studio', 'Practice role-aligned questions, draft answers, and collect evidence for interviews.', 'Help me structure a practice answer.'],
  resume: ['Résumé & job match', 'Compare a job posting against résumé evidence and build a factual draft. The workbench accepts Word résumés. LinkedIn account linking and importing an exported ZIP are separate from direct import.', 'How do I compare my résumé with a job posting?'],
  'job-search': ['Job Search Playbook', 'Use a 90-day plan and track job applications.', 'What should I do in week one of my job search?'],
  feedback: ['Beta feedback', 'Draft feedback privately and choose whether to send an item to the Academy team.', 'What makes beta feedback actionable?'],
  frameworks: ['Framework map', 'Compare workforce roles, threat behaviors, controls, credentials, and learning evidence.', 'How do NICE, NIST, and MITRE fit together?'],
  research: ['Research & sources', 'Review the research, methods, and primary sources behind the career mapping.', 'Where can I find the sources behind a roadmap?'],
  workspace: ['Workspace', 'Manage preferences, assessment history, evidence, backups, and student account saving.', 'How do I save my work across devices?']
};
const academyLinks = {
  '/': 'Academy home', '/training/': 'Training', '/training/blue-vs-red-with-ai/': 'Blue vs. Red with AI',
  '/learning-paths/': 'Learning paths', '/learning-paths/detection-and-hunting/': 'Detection and hunting',
  '/learning-paths/investigation-and-response/': 'Investigation and response',
  '/learning-paths/threat-intelligence/': 'Threat intelligence',
  '/resources/': 'Free resources', '/resources/cti-101/': 'CTI 101',
  '/resources/think-like-a-defender/': 'Think Like a Defender',
  '/events/': 'Events', '/events/defcon-34-2026/': 'DEF CON 34',
  '/about/': 'About', '/for-teams/': 'For teams', '/contact/': 'Contact', '/faq/': 'FAQ',
  '/es/': 'Inicio', '/es/training/': 'Formación', '/es/learning-paths/': 'Rutas de aprendizaje',
  '/es/resources/': 'Recursos gratuitos', '/es/events/': 'Eventos', '/es/about/': 'Acerca de',
  '/es/for-teams/': 'Para equipos', '/es/contact/': 'Contacto',
  '/career-navigator/': 'Career Navigator'
};
const destinations = new Map(Object.entries(academyLinks));
for (const [route, [title]] of Object.entries(pages)) destinations.set('/career-navigator/#' + route, title);
const publicPath = academy ? (location.pathname.replace(/\/$/, '') + '/') : '';
if (academy && /^\/(?:[a-z0-9-]+\/)*$/.test(publicPath)) destinations.set(publicPath, academy);
const directory = Array.from(destinations, ([path, label]) => path + ' — ' + label).join('\n');
const pageLimit = 32000;
let publicContent;
function context(){
  if (academy) {
    const prompt = document.documentElement.lang.startsWith('es') ? '¿Qué puedo hacer en esta página?' : 'What can I do on this page?';
    return [academy, '', prompt];
  }
  const route = location.hash.slice(1).split('?')[0];
  return Object.hasOwn(pages, route) ? pages[route] : pages.overview;
}
async function academyText(){
  // Fetch the anonymous version so signed-in views cannot contribute private text.
  if (!publicPath || !destinations.has(publicPath)) return '';
  const response = await fetch(publicPath, {credentials:'omit', cache:'no-store'});
  if (!response.ok || new URL(response.url).origin !== location.origin) return '';
  const page = document.createElement('template');
  page.innerHTML = await response.text();
  const main = page.content.querySelector('main, [role="main"], article');
  if (!main) return '';
  main.querySelectorAll('form, input, textarea, select, dialog, iframe, template, script, style, noscript, [hidden], [aria-hidden="true"], [data-private], .nova-widget').forEach(node => node.remove());
  main.querySelectorAll('img[alt]').forEach(img => img.replaceWith(document.createTextNode(' ' + img.alt + ' ')));
  main.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,dt,dd,td,th,figcaption,summary,br,section').forEach(block => block.after('\n'));
  return main.textContent.replace(/[^\S\n]+/g, ' ').replace(/ *\n[ \n]*/g, '\n').trim().slice(0, pageLimit);
}
function navigatorText(summary){
  const route = location.hash.slice(1).split('?')[0];
  const catalog = window.CareerCatalog;
  if (!catalog) return summary;
  const entries = {
    roles: () => catalog.roles.map(role => role.title + ' — ' + role.track + '. ' + role.description),
    frameworks: () => catalog.frameworks.map(framework => framework.name + ' — ' + framework.description + ' Topics: ' + framework.topics.join(', ')),
    military: () => (window.MilitaryJourneyModel?.programs || []).map(program => program.name + ' — ' + program.reason),
    research: () => catalog.sources.map(source => source.title + ' — ' + source.finding)
  };
  const details = Object.hasOwn(entries, route) ? entries[route]() : [];
  return [summary, ...details].join('\n').slice(0, pageLimit);
}
function linkTarget(path){
  const academyOrigin = 'https://ignitecyber.academy';
  if (path.startsWith(academyOrigin + '/')) path = path.slice(academyOrigin.length);
  if (!destinations.has(path)) return '';
  if (hosted) return path;
  if (path.startsWith('/career-navigator/')) return path.slice('/career-navigator'.length);
  return academyOrigin + path;
}
function appendReply(entry, message){
  let end = 0;
  for (const match of message.matchAll(/\[([^\]\n]{1,120})\]\(([^()\s]{1,240})\)/g)) {
    entry.append(document.createTextNode(message.slice(end, match.index)));
    const href = linkTarget(match[2]);
    if (href) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = match[1];
      entry.append(link);
    } else {
      entry.append(document.createTextNode(match[1]));
    }
    end = match.index + match[0].length;
  }
  entry.append(document.createTextNode(message.slice(end)));
}
const chatKey = 'ignitecyber.nova.chat.v1';
const transcriptLimit = 40;
const draftKey = 'ignitecyber.nova.student-draft.v1';
const accountEndpoint = action => '/career-navigator/?career_api=' + action;
let history = [], busy = false, available = false, checking = false;
let request;
let student = null, nonce = '', revision = 0, accountReady = !hosted;
let accountCheck = 0, saving = false, conflict = false;
let unsaved = false;
let getRole = () => '';
let opener;
const face = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 8V5M8 11h16a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4Z"/><path d="M11 17v2m10-2v2m-8 3h6"/><circle cx="16" cy="4" r="1"/></svg>';
const widget = document.createElement('div');
widget.className = 'nova-widget';
widget.innerHTML = `<section class="nova-panel" id="nova-panel" role="dialog" aria-labelledby="nova-title" hidden>
<header class="nova-header"><span class="nova-face">${face}</span><div><h2 id="nova-title">Nova AI</h2><span>Your Academy copilot</span></div><button class="nova-close" type="button" aria-label="Close Nova chat">×</button></header>
<div class="nova-content"><p class="nova-context"></p><div class="nova-log" role="log" aria-label="Conversation"></div><button class="nova-suggestion" type="button"></button></div>
<form class="nova-form"><label for="nova-message">Message Nova</label><textarea id="nova-message" rows="2" maxlength="2000" required placeholder="Ask about this page…"></textarea>
<p class="nova-privacy">Messages and public page context go to OpenAI. Guest chats stay in this tab. Students can save one conversation across devices. Keep personal details out of chat.</p>
<div class="nova-actions"><button class="nova-clear" type="button">New chat</button><button class="nova-send" type="submit">Send ↑</button></div><p class="nova-status" role="status"></p><div class="nova-actions"><button class="nova-save" type="button" hidden>Save across devices</button></div><p class="nova-sync nova-status" role="status"></p></form>
</section><button class="nova-launch" type="button" data-nova-chat aria-controls="nova-panel" aria-expanded="false"><span class="nova-face">${face}</span><span>Ask Nova</span><span aria-hidden="true">✦</span></button>`;
document.body.append(widget);
const panel = widget.querySelector('.nova-panel');
const launcher = widget.querySelector('.nova-launch');
const close = widget.querySelector('.nova-close');
const status = widget.querySelector('.nova-status');
const log = widget.querySelector('.nova-log');
const field = widget.querySelector('textarea');
const send = widget.querySelector('.nova-send');
const clear = widget.querySelector('.nova-clear');
const suggestion = widget.querySelector('.nova-suggestion');
const saveChat = widget.querySelector('.nova-save');
const syncStatus = widget.querySelector('.nova-sync');
function refreshPage(){
  const [title, , prompt] = context();
  widget.querySelector('.nova-context').textContent = '✦ Here with you on ' + title;
  suggestion.textContent = prompt;
}
function controls(){
  send.disabled = busy || saving || !available || !accountReady || conflict;
  field.readOnly = busy;
  suggestion.disabled = busy;
  clear.disabled = busy || saving || !accountReady || conflict;
  saveChat.hidden = student === null || (revision > 0 && !conflict && !unsaved);
  saveChat.disabled = busy || saving || !accountReady || (!conflict && history.length === 0 && revision === 0);
  saveChat.textContent = conflict ? 'Load saved chat' : revision > 0 ? 'Retry chat sync' : 'Save across devices';
}
function append(who, message){
  const entry = document.createElement('p');
  entry.className = who === 'You' ? 'nova-user' : 'nova-reply';
  const label = document.createElement('strong');
  label.textContent = who;
  entry.append(label);
  if (who === 'Nova') appendReply(entry, message);
  else entry.append(document.createTextNode(message));
  log.append(entry);
  log.scrollTop = log.scrollHeight;
}
function greet(){ append('Nova', 'Hi! I can explain what’s on this page or help you choose your next step.'); }
function readTab(key){
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}
function writeTab(key, value){
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch { /* Tab storage is optional. */ }
}
function remember(){
  const guest = student === null ? history : readTab(chatKey)?.history || [];
  writeTab(chatKey, {open:!panel.hidden, history:guest});
  if (student !== null && revision === 0) writeTab(draftKey, {student, history});
}
function validHistory(value){
  return Array.isArray(value) && value.length <= transcriptLimit && value.length % 2 === 0 &&
    value.every((message, i) => message?.role === (i % 2 ? 'assistant' : 'user') &&
      typeof message.content === 'string' && message.content.length <= (i % 2 ? 12000 : 2000));
}
function renderHistory(messages){
  history = validHistory(messages) ? messages : [];
  log.replaceChildren();
  greet();
  for (const {role, content} of history) append(role === 'user' ? 'You' : 'Nova', content);
}
function restore(){
  const saved = readTab(chatKey);
  if (student === null) renderHistory(saved?.history);
  setOpen(saved?.open === true);
  if (!panel.hidden) connect();
}
async function accountApi(action, data, sessionNonce = nonce){
  const options = {credentials:'same-origin', cache:'no-store'};
  if (data !== undefined) Object.assign(options, {
    method:'POST', headers:{'Content-Type':'application/json','X-ICN-Nonce':sessionNonce}, body:JSON.stringify(data)
  });
  const response = await fetch(accountEndpoint(action), options);
  const result = await response.json();
  if (!response.ok) throw Object.assign(Error(result.error || 'Nova account sync is unavailable.'), {status:response.status});
  return result;
}
function switchStudent(next){
  request?.abort();
  field.value = '';
  if (student !== null) writeTab(draftKey, null);
  student = next;
  revision = 0;
  conflict = unsaved = false;
  syncStatus.textContent = '';
  const draft = readTab(draftKey);
  renderHistory(next === null ? readTab(chatKey)?.history : draft?.student === next ? draft.history : []);
  if (next !== null && draft && draft.student !== next) writeTab(draftKey, null);
}
async function refreshAccount(loadSaved = false, force = false){
  if (!hosted || (saving && !force)) return;
  const ticket = ++accountCheck;
  accountReady = false;
  controls();
  try {
    const session = await accountApi('session');
    if (ticket !== accountCheck) return;
    const next = Number.isSafeInteger(session.user?.id) ? session.user.id : null;
    const changed = next !== student;
    nonce = session.nonce;
    if (changed) switchStudent(next);
    if (next === null) writeTab(draftKey, null);
    if (student !== null && (changed || loadSaved || (!busy && !unsaved && !conflict))) {
      accountReady = false;
      controls();
      const saved = await accountApi('nova-chat-get', {}, session.nonce);
      if (ticket !== accountCheck) return;
      if (saved.chat !== null && revision === 0 && history.length && !loadSaved) {
        conflict = true;
        syncStatus.textContent = 'Another device has a saved Nova chat. Load it to continue.';
      } else if (saved.chat !== null) {
        revision = saved.revision;
        conflict = unsaved = false;
        renderHistory(saved.chat);
        writeTab(draftKey, null);
        syncStatus.textContent = 'Saved to your Academy account.';
      } else {
        syncStatus.textContent = 'Save this chat to continue on another device.';
      }
    }
    accountReady = true;
  } catch {
    if (ticket !== accountCheck) return;
    accountReady = true;
    syncStatus.textContent = 'Account sync is unavailable. Reopen Nova to retry.';
  } finally {
    if (ticket === accountCheck) controls();
  }
}
async function saveAccount(messages = history){
  if (student === null || saving || conflict) return false;
  saving = true;
  controls();
  const owner = student;
  syncStatus.textContent = 'Saving to your Academy account…';
  try {
    const saved = await accountApi('nova-chat-save', {revision, chat:messages});
    if (student !== owner) return false;
    revision = saved.revision;
    unsaved = false;
    writeTab(draftKey, null);
    syncStatus.textContent = 'Saved to your Academy account.';
    return true;
  } catch (error) {
    if (student !== owner) return false;
    conflict = error.status === 409;
    unsaved = true;
    syncStatus.textContent = conflict ? error.message : 'Chat has not synced. Reopen Nova or retry saving.';
    return false;
  } finally {
    saving = false;
    controls();
  }
}
function setOpen(open){
  panel.hidden = !open;
  launcher.setAttribute('aria-expanded', String(open));
  if (open) log.scrollTop = log.scrollHeight;
}
function hide(){
  setOpen(false);
  remember();
  (opener?.isConnected ? opener : launcher).focus();
}
async function connect(){
  if (checking || available) return;
  checking = true;
  status.textContent = 'Connecting to Nova…';
  try {
    const result = await fetch(endpoint('status'), {cache:'no-store'});
    available = result.ok && (await result.json()).available === true;
  } catch { available = false; }
  finally {
    checking = false;
    status.textContent = available ? '' : hosted ? 'Nova AI is temporarily unavailable.' : 'Start the local Nova server with an OpenAI key to chat.';
    controls();
  }
}
close.addEventListener('click', hide);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.defaultPrevented && !panel.hidden && !document.querySelector('dialog[open]')) {
    event.preventDefault();
    hide();
  }
});
window.addEventListener('hashchange', refreshPage);
window.addEventListener('pagehide', () => request?.abort());
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    refreshPage();
    restore();
    refreshAccount();
  }
});
window.addEventListener('career-account-changed', event => {
  if (event.detail?.signedOut) switchStudent(null);
  accountReady = false;
  controls();
  refreshAccount(false, true);
});
window.addEventListener('focus', () => { if (!panel.hidden) refreshAccount(); });
refreshPage();
controls();
restore();
if (!panel.hidden) refreshAccount();
suggestion.addEventListener('click', () => { field.value = suggestion.textContent; field.focus(); });
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-nova-chat]');
  if (!trigger) return;
  if (trigger === launcher && !panel.hidden) { hide(); return; }
  opener = trigger;
  if (!busy && !field.value.trim() && trigger.dataset.novaPrompt) field.value = trigger.dataset.novaPrompt;
  setOpen(true);
  remember();
  field.focus();
  connect();
  refreshAccount();
});
saveChat.addEventListener('click', () => {
  if (conflict) {
    if (confirm('Load the account chat and discard this tab’s unsaved changes?')) refreshAccount(true);
  } else saveAccount();
});
clear.addEventListener('click', async () => {
  if (revision > 0) {
    if (!confirm('Start a new chat and clear the saved conversation across devices?') || !await saveAccount([])) return;
  }
  renderHistory([]);
  remember();
  field.value = '';
  if (available) status.textContent = '';
  field.focus();
});
widget.querySelector('form').addEventListener('submit', async event => {
  event.preventDefault();
  const content = field.value.trim();
  if (busy || saving || conflict || !accountReady || !available || !content) return;
  busy = true;
  controls();
  status.textContent = 'Nova is thinking…';
  const message = {role:'user', content};
  const currentRequest = request = new AbortController();
  const [title, summary] = context();
  try {
    if (academy && !publicContent) publicContent = academyText().catch(() => '');
    const text = academy ? (await publicContent || script.dataset.novaTopics || title) : navigatorText(summary);
    const response = await fetch(endpoint('chat'), {
      method:'POST', signal:currentRequest.signal, headers:{'Content-Type':'application/json'},
      body:JSON.stringify({role:getRole(), page:{title, text, directory}, messages:[...history.slice(-8), message]})
    });
    const data = await response.json();
    if (currentRequest.signal.aborted) return;
    if (!response.ok || typeof data.reply !== 'string') throw Error(data.error || 'Nova could not reply.');
    history = [...history, message, {role:'assistant',content:data.reply}].slice(-transcriptLimit);
    remember();
    if (revision > 0) await saveAccount();
    if (currentRequest.signal.aborted) return;
    if (log.children.length > transcriptLimit) {
      log.children[1].remove();
      log.children[1].remove();
    }
    append('You', content);
    append('Nova', data.reply);
    field.value = '';
    status.textContent = '';
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? '' : error.message || 'Nova could not reply. Please try again.';
  } finally {
    request = undefined;
    busy = false;
    controls();
    if (!panel.hidden && widget.contains(document.activeElement)) field.focus();
  }
});
window.NovaChat = {setRoleSource(source){ getRole = source; }};
})();
