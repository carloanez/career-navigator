const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {createServer} = require('../server/nova-local.cjs');
const engine = require('../engine.js');
const military = require('../military-journey-model.js');

const fixtures = [
 {id:'federal', role:'soc-core', title:'USAJOBS application plan', detail:/2210 \/ GS-9/, source:'Search USAJOBS', nova:/USAJOBS specialized-experience/, interview:/specialized-experience requirement/, resume:/hours per week/},
 {id:'defense', role:'grc-core', title:'DCWF & DoD 8140 preparation', detail:/612.*Intermediate/, source:'DoD 8140 qualification matrices', nova:/DCWF role, DoD 8140 proficiency/, interview:/posted duty using a fictional scenario/, resume:/Separate held credentials/}
];

(async () => {
 const payloads = [];
 const live = process.env.CAREER_TEST_URL;
 const server = live ? null : createServer({apiKey:'test-fixture', request:async (_url, options) => {
  payloads.push(JSON.parse(options.body));
  return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Start with one requirement and describe the evidence you can verify.'}]}]});
 }});
 if(server)await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const base = live || 'http://127.0.0.1:' + server.address().port + '/';
 const browser = await chromium.launch();
 try {
  for (const fixture of fixtures) {
   const context = await browser.newContext({viewport:{width:390,height:844}});
   const page = await context.newPage();
   const errors = [];
   page.on('pageerror', error => errors.push(error.message));
   await page.goto(base + '#military');
   await page.locator('[data-sample="' + fixture.id + '"]').click();
   const next = page.locator('#military-intake button[type="submit"]');
   await next.click();
   await next.click();
   assert.equal(await page.locator('[name="destination"]').inputValue(), fixture.id);
   const requirements = await page.locator('[name="requirements"]').inputValue();
   await next.click();
   await page.getByRole('heading', {name:fixture.title}).waitFor();
   await page.locator('[data-role="' + fixture.role + '"]').click();
   await page.waitForURL('**/#roadmap');
   const panel = page.locator('main > section.military-project').first();
   assert.match(await panel.innerText(), fixture.detail);
   assert(await panel.getByRole('link', {name:new RegExp(fixture.source)}).isVisible());
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   await panel.getByRole('button', {name:'Ask Nova AI about this step'}).click();
   assert.match(await page.locator('#nova-chat-message').inputValue(), fixture.nova);
   const [reply] = await Promise.all([
    page.waitForResponse(r=>/nova_api=chat|\/api\/nova\/chat/.test(r.url()),{timeout:35000}),
    page.locator('#nova-chat-send').click()
   ]);
   assert.equal(reply.status(),200);
   await page.locator('#nova-chat-log p').nth(1).waitFor();
   if(!live){
    assert.match(payloads.at(-1).input[0].content, fixture.nova);
    assert(!JSON.stringify(payloads.at(-1)).includes(requirements.split('\n')[0]));
   }
   await page.getByRole('button', {name:'Close Nova chat'}).click();
   await page.locator('#military-evidence textarea').fill('Fictional exercise evidence and validation steps.');
   await page.locator('#military-evidence button').click();
   await page.locator('[data-military-action="interview"]').click();
   await page.waitForURL('**/#interview');
   await page.locator('#studio-evidence').waitFor({state:'attached'});
   assert.match(await panel.innerText(), fixture.interview);
   assert.equal(await page.locator('#studio-evidence').inputValue(), 'capstone-' + fixture.role);
   await page.goto(base + '#roadmap');
   await page.locator('[data-military-action="resume"]').click();
   await page.waitForURL('**/#resume');
   await page.locator('#bullet-evidence').waitFor({state:'attached'});
   assert.match(await panel.innerText(), fixture.resume);
   assert.equal(await page.locator('#bullet-evidence').inputValue(), 'capstone-' + fixture.role);
   await page.getByRole('button', {name:'Use saved posting requirements'}).click();
   await page.reload();
   const workspace = await page.evaluate(() => JSON.parse(localStorage.getItem('ignitecyber.career.v1')));
   assert.equal(engine.validate(workspace).careerTools.resume.requirements, requirements);
   assert.equal(workspace.careerTools.military.destination, fixture.id);
   assert.deepEqual(errors, []);
   await context.close();
   console.log('PASS', fixture.id, 'sample intake, official resources, roadmap, Nova handoff, interview, résumé, reload');
  }
  const old = military.sample('soc');
  for (const key of ['destination','level','postingTitle','seriesGrade','dcwf','requirements']) delete old[key];
  assert.equal(military.validate(old).destination, 'commercial');
  assert.throws(() => military.validate({...military.sample('defense'),dcwf:'xxx'}));
  console.log('PASS legacy commercial intake migration and malformed DCWF validation');
 } finally {
  await browser.close();
  server?.close();
 }
})().catch(error => {console.error(error);process.exitCode=1;});
