const fs=require('node:fs'),path=require('node:path');
const C=require('../catalog.js'),E=require('../engine.js'),M=require('../career-tools-model.js');
const directory=path.join(__dirname,'..','data');fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(path.join(directory,'catalog.json'),JSON.stringify(C,null,2)+'\n');
fs.writeFileSync(path.join(directory,'role-framework-mapping.csv'),E.csv()+'\r\n');
const starterRoadmaps={schemaVersion:1,catalogVersion:C.version,reviewed:C.reviewed,baseline:'Unassessed. Plans include all competency gaps and unmet prerequisites.',mappingStatus:'IgniteCyber proposed curriculum; requires expert review.',assumedWeeklyHours:6,roles:C.roles.map(role=>({roleId:role.id,title:role.title,requirements:role.requirements,credentialCandidates:role.certs,...E.plan(E.blank(),role)}))};
fs.writeFileSync(path.join(directory,'starter-roadmaps.json'),JSON.stringify(starterRoadmaps,null,2)+'\n');
console.log('Exported catalog, '+E.mappingRows().length+' mapping edges, and '+C.roles.length+' starter roadmaps.');

fs.writeFileSync(path.join(directory,'interview-questions.json'),JSON.stringify({version:'0.2.0',authorship:'Original IgniteCyber educational questions and self-reflection rubrics; not an employer question bank or verified assessment.',questions:M.questions},null,2)+'\n');
