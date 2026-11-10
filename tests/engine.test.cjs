const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../catalog.js'),E=require('../engine.js');
test('all catalog references are valid, unique, and HTTPS',()=>{
 for(const collection of ['skills','roles','activities','sources','domains','certs','questions','frameworks'])assert.equal(new Set(C[collection].map(x=>x.id)).size,C[collection].length,collection);
 for(const s of C.sources)assert.equal(new URL(s.url).protocol,'https:');
 for(const r of C.roles){assert(C.domains.some(d=>d.id===r.domain));for(const [id,n]of Object.entries(r.requirements)){assert(C.skills.some(s=>s.id===id));assert(n>=1&&n<=4);assert(C.activities.some(a=>a.skill===id&&a.level>=n));}for(const id of r.certs)assert(C.certs.some(c=>c.id===id));for(const id of r.sources)assert(C.sources.some(s=>s.id===id));}
 for(const a of C.activities){assert(C.sources.some(s=>s.id===a.source));for(const pre of a.prereqs)assert(C.activities.some(x=>x.id===pre));}
 for(const o of C.learningOptions){assert(C.sources.some(s=>s.id===o.source));for(const d of o.domains)assert(C.domains.some(x=>x.id===d));for(const sk of o.skills)assert(C.skills.some(x=>x.id===sk));}
});
test('unassessed is distinct from an assessed zero',()=>{
 const s=E.blank();assert.equal(E.skillScore(s,'security').assessed,false);s.ratings.security=0;assert.equal(E.skillScore(s,'security').assessed,true);assert.equal(E.skillScore(s,'security').score,0);
});
test('scenario results are bounded and cannot alone imply mastery',()=>{
 const s=E.blank(),q=C.questions.find(q=>q.skill==='ai');s.answers[q.id]=q.answer;assert.equal(E.skillScore(s,'ai').score,25);s.ratings.ai=4;assert.equal(E.skillScore(s,'ai').score,100);s.answers[q.id]=(q.answer+1)%3;assert.equal(E.skillScore(s,'ai').score,75);
});
test('all roles generate complete, dependency-ordered plans from zero',()=>{
 const s=E.blank();for(const r of C.roles){const p=E.plan(s,r);assert(p.items.length>0);assert.equal(p.total,p.items.length+1);assert.equal(new Set(p.items.map(x=>x.id)).size,p.items.length);for(const a of p.items)for(const pre of a.prereqs)assert(p.items.findIndex(x=>x.id===pre)<p.items.indexOf(a));for(const [skill,n]of Object.entries(r.requirements))assert(p.items.some(a=>a.skill===skill&&a.level>=n),r.title+' '+skill);assert(p.weeks>0);}
});
test('mastered baseline skips learning; capstone still requires evidence',()=>{
 const s=E.blank();for(const sk of C.skills)s.ratings[sk.id]=4;for(const r of C.roles){assert.equal(E.alignment(s,r).score,100);const p=E.plan(s,r);assert.equal(p.items.length,0);assert.equal(p.total,1);assert.equal(p.hours,16);}
});
test('prerequisite mastery routes a learner past foundation work',()=>{
 const s=E.blank();s.ratings.network=4;s.ratings.security=4;s.ratings.ai=4;s.ratings.appsec=4;s.ratings.judgment=4;const p=E.plan(s,C.roles.find(r=>r.id==='soc-ai'));assert(!p.items.some(a=>a.id==='network-1'));assert(p.items.some(a=>a.id==='detection-1'));
});
test('completion reduces hours without inflating competency scores',()=>{
 const s=E.demo(),r=C.roles.find(r=>r.id===s.target),p=E.plan(s,r),score=E.alignment(s,r).score;s.completed.push(p.items[0].id);const next=E.plan(s,r);assert.equal(next.hours,p.hours-p.items[0].hours);assert.equal(E.alignment(s,r).score,score);assert.equal(next.completed,1);
});
test('weekly pace changes schedule without changing learning content',()=>{
 const s=E.blank(),r=C.roles[0],p=E.plan(s,r);s.hours=12;const faster=E.plan(s,r);assert.equal(faster.hours,p.hours);assert(faster.weeks<=p.weeks);
});
test('backups roundtrip and reject malformed content without trusting arbitrary keys',()=>{
 const s=E.demo();assert.deepEqual(E.validate(JSON.parse(JSON.stringify(s))),s);
 for(const change of [{schemaVersion:2},{hours:0},{hours:1.5},{ratings:{ai:10}},{answers:{'q-ai':100}},{target:'unknown'},{completed:['missing']},{evidence:{'constructor':'bad'}},{owned:['not-a-cert']},{history:[{date:'bad'}]}])assert.throws(()=>E.validate({...s,...change}));
 const imported=E.validate({...s,unexpected:'ignored'});assert(!('unexpected'in imported));
});
test('CSV exports have stable structure and all role-skill edges',()=>{
 assert.equal(E.mappingRows().length,C.roles.reduce((n,r)=>n+Object.keys(r.requirements).length,0));assert(E.csv().includes('IgniteCyber proposed mapping'));assert(E.csv().startsWith('"Role"'));
});
