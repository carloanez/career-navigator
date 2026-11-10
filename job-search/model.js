(function(root){
'use strict';
const stages = ['Saved', 'Applied', 'Interview', 'Offer', 'Closed'];
function validURL(value) {
  if (value === '') return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); }
  catch { return false; }
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validated(data) {
  if (!Array.isArray(data) || data.length > 2000) throw new Error('Expected a list of up to 2,000 roles.');
  const ids = new Set();
  return data.map((item) => {
    const limits = { id: 100, company: 150, role: 150, url: 1000, stage: 20, action: 250, date: 10 };
    if (!item || Object.entries(limits).some(([k, n]) => typeof item[k] !== 'string' || item[k].length > n) ||
        !item.id || ids.has(item.id) || !item.company.trim() || !item.role.trim() || !item.action.trim() ||
        !stages.includes(item.stage) || !validURL(item.url) || !validDate(item.date)) {
      throw new Error('An entry has missing, duplicate, or invalid fields.');
    }
    ids.add(item.id);
    return Object.fromEntries(Object.keys(limits).map((k) => [k, item[k]]));
  });
}

const api = { validate: validated };
root.CareerTrackerModel = api;
if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
