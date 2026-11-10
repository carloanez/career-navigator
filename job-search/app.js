'use strict';

const key = 'job-search-fieldguide-90-v1';
const validated = window.CareerTrackerModel.validate;
const get = (id) => document.getElementById(id);
const form = get('record');
const status = get('tracker-status');
let editing = null;
let rows = [];
let account = null;
let copyTimer;

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function store(next) {
  try {
    next = validated(next);
    if (account) account.save(next);
    else localStorage.setItem(key, JSON.stringify(next));
    rows = next;
    render();
    return true;
  } catch (error) {
    status.textContent = 'Could not save tracker. ' + error.message;
    return false;
  }
}

function reset() {
  form.reset();
  editing = null;
  get('save').textContent = 'Add role';
  get('cancel').hidden = true;
}

function edit(row) {
  editing = row.id;
  for (const [field, value] of Object.entries(row)) {
    if (field !== 'id') form.elements.namedItem(field).value = value;
  }
  get('save').textContent = 'Save changes';
  get('cancel').hidden = false;
  form.elements.namedItem('company').focus();
}

function localToday() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

function render() {
  const today = localToday();
  const active = rows.filter((row) => row.stage !== 'Closed');
  const overdue = active.filter((row) => row.date < today).length;
  const dueToday = active.filter((row) => row.date === today).length;
  get('stats').replaceChildren(...[
    [rows.length, 'tracked'], [active.length, 'active'], [overdue, 'overdue'], [dueToday, 'due today'],
  ].map(([count, label]) => element('span', count + ' ' + label, 'stat')));
  const filter = get('filter').value;
  const visible = rows.filter((row) => !filter || row.stage === filter)
    .sort((a, b) => (a.stage === 'Closed') - (b.stage === 'Closed') || a.date.localeCompare(b.date));
  const list = get('rows');
  list.replaceChildren();
  if (!visible.length) list.append(element('p', rows.length ? 'No roles match this stage.' : 'Add a role to see your next actions here.'));
  for (const row of visible) {
    const card = element('div', '', 'row');
    const info = element('div', '');
    const title = element('h3', row.company + ' · ' + row.role);
    if (row.url) {
      const link = element('a', title.textContent);
      link.href = row.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      title.replaceChildren(link);
    }
    const late = row.stage !== 'Closed' && row.date < today;
    info.append(element('p', row.stage, 'stage'), title, element('p', row.action),
      element('p', (late ? 'Overdue · ' : 'Due · ') + row.date, late ? 'overdue' : ''));
    const actions = element('div', '', 'actions');
    const editButton = element('button', 'Edit');
    editButton.setAttribute('aria-label', 'Edit ' + row.role + ' at ' + row.company);
    editButton.onclick = () => edit(row);
    const remove = element('button', 'Delete');
    remove.setAttribute('aria-label', 'Delete ' + row.role + ' at ' + row.company);
    remove.onclick = () => {
      if (confirm('Delete ' + row.role + ' at ' + row.company + '?') && store(rows.filter((item) => item.id !== row.id))) {
        if (editing === row.id) reset();
        status.textContent = 'Role deleted.';
      }
    };
    actions.append(editButton, remove);
    card.append(info, actions);
    list.append(card);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const row = { id: editing ?? crypto.randomUUID() };
  for (const [field, value] of new FormData(form)) row[field] = value.trim();
  const next = editing ? rows.map((item) => item.id === editing ? row : item) : [...rows, row];
  if (store(next)) {
    status.textContent = editing ? 'Changes recorded.' : 'Role added.';
    get('filter').value = '';
    reset();
    render();
  }
});
get('cancel').onclick = reset;
get('filter').onchange = render;
get('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'job-search-tracker.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = 'Backup exported.';
};
get('import').onclick = () => get('file').click();
get('file').onchange = async (event) => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error('File is too large.');
    const imported = validated(JSON.parse(await file.text()));
    if (rows.length && !confirm('Replace the current tracker with this backup?')) return;
    if (store(imported)) {
      reset();
      get('filter').value = '';
      render();
      status.textContent = imported.length + ' roles imported.';
    }
  } catch (error) {
    status.textContent = 'Import failed. ' + error.message;
  }
};

for (const button of document.querySelectorAll('.copy')) {
  button.onclick = async () => {
    const parts = [...button.closest('.prompt').querySelectorAll('.prompt-text')];
    const message = get('copy-status');
    try {
      await navigator.clipboard.writeText(parts.map((p) => p.textContent).join('\n\n'));
      message.textContent = 'Prompt copied.';
    } catch {
      const range = document.createRange();
      range.setStartBefore(parts[0]);
      range.setEndAfter(parts.at(-1));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      message.textContent = 'Prompt selected. Use your browser’s Copy command.';
    }
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { message.textContent = ''; }, 3500);
  };
}
function loadGuestRows() {
  return validated(JSON.parse(localStorage.getItem(key) ?? '[]'));
}

get('bring-guest-rows').onclick = () => {
  try {
    const existing = new Set(rows.map((row) => row.id));
    const additional = loadGuestRows().filter((row) => !existing.has(row.id));
    if (!additional.length) {
      status.textContent = 'There are no new guest entries to copy.';
      return;
    }
    if (confirm('Copy ' + additional.length + ' guest entries to your student account? Existing account entries will be kept.') &&
        store([...rows, ...additional])) {
      status.textContent = additional.length + ' guest entries copied. Check the account bar above for sync status.';
    }
  } catch (error) {
    status.textContent = 'Could not copy guest entries. ' + error.message;
  }
};

window.connectCareerTracker = (connection) => {
  if (Boolean(account) === Boolean(connection)) return;
  account = connection;
  reset();
  get('filter').value = '';
  get('bring-guest-rows').hidden = !account;
  get('tracker-storage').textContent = account
    ? 'Signed in. Changes save with your private student workspace and are available on other devices. Check the account bar above for sync status.'
    : 'Guest mode. Entries stay in this browser. Sign in to save across devices.';
  status.textContent = '';
  try { rows = account ? validated(account.rows) : loadGuestRows(); }
  catch { rows = []; status.textContent = 'Saved entries could not be read. You can import a backup.'; }
  render();
};
try { rows = loadGuestRows(); }
catch { status.textContent = 'The saved tracker could not be read. You can import a backup.'; }
render();
