import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {loadTrainingWorkspace} from '../public/training-loader.mjs';
import {seedWorkspace} from '../lib/seed.mjs';

const fixture = () => ({workspace: seedWorkspace('sandbox', '2026-11-23')});
test('training rejects an HTTP error before attempting to parse JSON', async () => {
  await assert.rejects(loadTrainingWorkspace('/training.json', async () => ({ok:false,status:401,json(){throw new Error('must not parse');}})), /HTTP 401/);
});
test('training rejects HTML, malformed JSON and a successful response without a workspace', async () => {
  for (const response of [new Response('<html>login</html>', {headers:{'content-type':'text/html'}}),new Response('undefined', {headers:{'content-type':'application/json'}}),Response.json({error:'Not signed in'})]) {
    await assert.rejects(loadTrainingWorkspace('/training.json', async () => response), /Training data/);
  }
});
test('training validates the bundled site and retains sandbox assignments', async () => {
  const w = await loadTrainingWorkspace('/training.json', async () => Response.json(fixture()));
  assert.equal(w.schemaVersion,3); assert.equal(w.studies.length,3);
  assert.ok(w.records.length > 0); assert.ok(w.records.every(r=>r.assignee==='sandbox'));
});
test('failed training load leaves actual frontend session state untouched', async () => {
  const source = await readFile(new URL('../public/trialflow.mjs',import.meta.url),'utf8');
  const entry = source.split('\n').find(line=>line.startsWith('async function enterSandbox()'));
  const state={sandbox:false,w:null,session:null};
  const context=vm.createContext({S:state,AUTH:{trainingPath:'/training.json'},loadTrainingWorkspace:()=>loadTrainingWorkspace('/training.json',async()=>Response.json({error:'Unauthorized'},{status:401})),setConnection(){throw new Error('must not update UI');},render(){throw new Error('must not render');}});
  await assert.rejects(vm.runInContext(entry+';enterSandbox()',context),/HTTP 401/);
  assert.deepEqual(state,{sandbox:false,w:null,session:null});
});
test('actual frontend enters a populated sandbox without workspace initialization', async () => {
  const source=await readFile(new URL('../public/trialflow.mjs',import.meta.url),'utf8');
  const entry=source.split('\n').find(line=>line.startsWith('async function enterSandbox()'));
  const state={sandbox:false,w:null,session:null};let rendered=false;
  const context=vm.createContext({S:state,AUTH:{trainingPath:'/training.json'},loadTrainingWorkspace:async path=>{assert.equal(path,'/training.json');return loadTrainingWorkspace(path,async()=>Response.json(fixture()));},setConnection(){},render(){rendered=true;assert.ok(state.w.records.length);}});
  await vm.runInContext(entry+';enterSandbox()',context);
  assert.equal(state.sandbox,true);assert.equal(state.session.member.id,'sandbox');assert.equal(rendered,true);
});
test('Netlify build publishes only fictional training data and its loader alongside frontend assets', async () => {
  execFileSync(process.execPath,['scripts/build-netlify.mjs'],{cwd:new URL('../',import.meta.url)});
  const publish=new URL('../.netlify/trialflow/public/',import.meta.url);
  const names=await readdir(publish);
  assert.deepEqual(names.sort(),['domain.mjs','favicon.svg','fonts.css','hosting.mjs','index.html','training-loader.mjs','training.json','trialflow.css','trialflow.mjs']);
  const auth=await readFile(new URL('hosting.mjs',publish),'utf8');assert.match(auth,/trainingPath.*training.json/);
  const text=await readFile(new URL('training.json',publish),'utf8');
  const w=await loadTrainingWorkspace('/training.json',async()=>new Response(text,{headers:{'content-type':'application/json'}}));
  assert.ok(w.settings.simulationDate);assert.equal(w.studies.length,3);
  assert.ok(w.records.every(r=>r.provenance==='Bundled synthetic fixture'));
});
