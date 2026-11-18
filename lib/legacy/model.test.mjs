import test from 'node:test';
import assert from 'node:assert/strict';
import {TODAY,DEFAULTS,BASE_ITEMS,POLICIES,forecast,buildItems,simulate,summary,transition,workOffset,addWorkdays,finishDate,weekday,scoreParts} from './model.mjs';
import {EDC_CONNECTION,safetySummary} from './safety.mjs';

test('14-day forecast conserves fresh and frozen tubes including starting inventory',()=>{
 const f=forecast(DEFAULTS);
 assert.equal(f.calendar.length,14);assert.equal(f.events.filter(e=>e.type==='fresh').length,10);assert.equal(f.events.filter(e=>e.type==='frozen').length,4);
 assert.equal(f.events.filter(e=>e.type==='fresh').reduce((s,e)=>s+e.tubes,0),f.freshCollected);
 assert.equal(f.events.filter(e=>e.type==='frozen').reduce((s,e)=>s+e.tubes,0)+f.frozenWaiting,f.frozenCollected+18);
 assert.ok(f.events.every(e=>![0,6].includes(weekday(e.date))));
});
test('both biweekly meanings are explicit and obey their selected cadence',()=>{
 const twice=forecast(DEFAULTS).events.filter(e=>e.type==='frozen');assert.ok(twice.every(e=>[2,5].includes(weekday(e.date))));
 const fortnight=forecast({...DEFAULTS,cadence:'fortnight'});assert.deepEqual(fortnight.events.filter(e=>e.type==='frozen').map(e=>e.date),['2026-11-20']);
 assert.ok(fortnight.frozenWaiting>0);assert.equal(fortnight.events.filter(e=>e.type==='frozen').reduce((s,e)=>s+e.tubes,0)+fortnight.frozenWaiting,fortnight.frozenCollected+18);
});
test('visit scaling is reproducible, monotone and does not alter per-visit assumptions',()=>{
 const low=forecast({...DEFAULTS,volume:50}),normal=forecast(DEFAULTS),high=forecast({...DEFAULTS,volume:150});
 assert.ok(low.visits<normal.visits&&normal.visits<high.visits);assert.ok(high.freshCollected>normal.freshCollected);assert.deepEqual(forecast(DEFAULTS),normal);
 assert.ok(simulate(buildItems({...DEFAULTS,volume:150}),6).hours>simulate(buildItems(DEFAULTS),6).hours);
});
test('courier delay shifts dispatch by workdays, preserves quantities, exposes carry beyond window',()=>{
 const normal=forecast(DEFAULTS),delayed=forecast({...DEFAULTS,delay:3});
 delayed.events.forEach((e,i)=>{assert.equal(e.tubes,normal.events[i].tubes);assert.equal(e.predictedDate,addWorkdays(e.date,3));});
 assert.ok(delayed.beyond>0);assert.equal(delayed.freshCollected,normal.freshCollected);
 const sum=delayed.days.reduce((s,d)=>s+d.fresh+d.frozen,0),beyond=delayed.events.filter(e=>e.predictedDate>delayed.calendar.at(-1)).reduce((s,e)=>s+e.tubes,0);
 assert.equal(sum+beyond,delayed.events.reduce((s,e)=>s+e.tubes,0));
});
test('site fixtures are unique and cover every requested workstream',()=>{
 const items=buildItems(DEFAULTS);assert.equal(new Set(items.map(t=>t.id)).size,items.length);assert.equal(new Set(items.map(t=>t.category)).size,11);
 assert.equal(items.filter(t=>t.hold).length,3);assert.equal(items.filter(t=>t.complete).length,3);assert.ok(items.every(t=>t.steps.some(s=>s.qc)));
});
test('sequential checks cannot skip review, QC or filing',()=>{
 const item=buildItems(DEFAULTS).find(t=>t.id==='LAB-01');assert.throws(()=>transition(item,'check',2),/preceding/);
 const p=transition(item,'check',0);assert.equal(p.done,1);const next=buildItems(DEFAULTS,{[item.id]:p}).find(t=>t.id===item.id);assert.equal(next.stage,'review');
 assert.equal(next.steps[next.done].role,'Investigator / qualified delegate');
});
test('QC resolution permits a recheck, never auto-passes QC',()=>{
 let item=buildItems(DEFAULTS).find(t=>t.id==='LAB-02');assert.equal(item.stage,'hold');assert.throws(()=>transition(item,'check',2),/QC holds/);
 const p=transition(item,'resolve');assert.equal(p.done,2);assert.equal(p.hold,false);
 item=buildItems(DEFAULTS,{[item.id]:p}).find(t=>t.id===item.id);assert.equal(item.stage,'qc');
 const passed=transition(item,'check',2);assert.equal(passed.done,3);assert.equal(buildItems(DEFAULTS,{[item.id]:passed}).find(t=>t.id===item.id).stage,'file');
});
test('a QC failure blocks a workflow and can only be flagged at a QC step',()=>{
 let item=buildItems(DEFAULTS).find(t=>t.id==='LAB-03');assert.throws(()=>transition(item,'flag'),/current QC/);
 item=buildItems(DEFAULTS,{'MON-02':{done:1,hold:false}}).find(t=>t.id==='MON-02');const p=transition(item,'flag');
 assert.equal(buildItems(DEFAULTS,{[item.id]:p}).find(t=>t.id===item.id).stage,'hold');
});
test('only final filing produces completion and updates dashboard rollups',()=>{
 const beforeItems=buildItems(DEFAULTS),before=summary(beforeItems,simulate(beforeItems,6));let item=beforeItems.find(t=>t.id==='LAB-03');
 const p=transition(item,'check',3),afterItems=buildItems(DEFAULTS,{[item.id]:p}),after=summary(afterItems,simulate(afterItems,6));
 assert.equal(after.completed,before.completed+1);assert.equal(after.open,before.open-1);assert.equal(after.reports.file,before.reports.file-1);assert.equal(after.reports.completed,before.reports.completed+1);
 assert.equal(afterItems.find(t=>t.id===item.id).effort,0);
});
test('reopening an earlier check clears all downstream progress',()=>{
 const item=buildItems(DEFAULTS).find(t=>t.id==='EKG-03');assert.equal(item.complete,true);const p=transition(item,'check',1);
 const reopened=buildItems(DEFAULTS,{[item.id]:p}).find(t=>t.id===item.id);assert.equal(reopened.done,1);assert.equal(reopened.complete,false);assert.equal(reopened.stage,'review');assert.ok(reopened.effort>0);
});
test('future shipments cannot be completed but today’s shipment can progress',()=>{
 const items=buildItems(DEFAULTS),future=items.find(t=>t.category==='shipments'&&t.releaseDate>TODAY),today=items.find(t=>t.category==='shipments'&&t.releaseDate===TODAY);
 assert.throws(()=>transition(future,'check',0),/future/);assert.equal(transition(today,'check',0).done,1);
});
test('policies preserve workload, obey release dates and exclude completed / held records',()=>{
 const items=buildItems(DEFAULTS),hours=[];
 for(const p of POLICIES){const r=simulate(items,6,p.id);hours.push(r.hours);assert.equal(r.rows.length,items.filter(t=>!t.complete&&!t.hold).length);
  r.rows.forEach((t,i)=>{assert.ok(t.start>=t.release);assert.ok(Math.abs((t.teamFinish-t.start)*6-t.effort)<1e-9);if(i)assert.ok(t.start>=r.rows[i-1].teamFinish-1e-9);});
  assert.ok(r.all.filter(t=>t.hold).every(t=>t.finish===null));assert.equal(r.onTime+r.late,r.rows.length);
 }
 assert.equal(new Set(hours).size,1);assert.deepEqual(simulate(items,6,'risk'),simulate(items,6,'risk'));
});
test('higher team capacity never postpones a record under fixed priority',()=>{
 const items=buildItems(DEFAULTS),slow=simulate(items,3),fast=simulate(items,6);
 for(const row of fast.rows)assert.ok(row.finish<=slow.byId[row.id].finish+1e-9);
});
test('courier waiting changes shipment finish without occupying team capacity',()=>{
 const items=buildItems({...DEFAULTS,delay:2}),r=simulate(items,6);const t=r.rows.find(t=>t.category==='shipments'&&t.releaseDate===TODAY);
 assert.ok(t.finish>=3);assert.ok(t.teamFinish<t.finish);assert.ok(t.late);const i=r.rows.indexOf(t);assert.ok(r.rows[i+1].start<t.finish);
});
test('business calendar and inclusive end-of-day boundary agree',()=>{
 assert.equal(addWorkdays('2026-11-20',1),'2026-11-23');assert.equal(workOffset('2026-11-13'),-1);assert.equal(workOffset('2026-11-15'),-1);assert.equal(finishDate(1),'2026-11-16');assert.equal(finishDate(1.01),'2026-11-17');
 const item={...buildItems(DEFAULTS).find(t=>t.id==='DQ-01'),effort:6,release:0,due:0,dueDate:TODAY};assert.equal(simulate([item],6).rows[0].late,false);assert.equal(simulate([item],5).rows[0].late,true);
});
test('assumption edits leave fixtures intact and update remaining work and priority',()=>{
 const t=buildItems(DEFAULTS,{}, {'DQ-01':{dueDate:'2026-11-20',effortFactor:2,impact:1}}).find(t=>t.id==='DQ-01');assert.equal(t.effort,2);assert.equal(t.due,4);assert.equal(BASE_ITEMS.find(t=>t.id==='DQ-01').dueDate,TODAY);
 assert.equal(scoreParts({due:-9,impact:3,age:99}).total,100);assert.throws(()=>simulate([t],0),/positive/);
});


test('flagged safety fixtures stay synthetic and carry independent seriousness and severity',()=>{
 const items=buildItems(DEFAULTS),flags=items.filter(t=>t.safety);assert.equal(flags.length,6);
 assert.deepEqual({ae:safetySummary(items).aeFlags,sae:safetySummary(items).saeFlags,dev:safetySummary(items).deviations},{ae:2,sae:2,dev:2});
 assert.equal(EDC_CONNECTION.connected,false);assert.equal(EDC_CONNECTION.lastSuccessfulSync,null);
 assert.ok(flags.every(t=>t.sourceRecord.origin==='Synthetic fixture'&&t.sourceRecord.flagged));
 const a=flags.find(t=>t.id==='AE-02'),b=flags.find(t=>t.id==='SAE-02');assert.equal(a.sourceRecord.severity,b.sourceRecord.severity);assert.equal(a.sourceRecord.serious,false);assert.equal(b.sourceRecord.serious,true);
 assert.throws(()=>{b.sourceRecord.status='Closed';},TypeError);
});

test('unblocked SAEs precede ordinary work under every policy',()=>{
 const items=buildItems(DEFAULTS);
 for(const p of POLICIES){const r=simulate(items,6,p.id);assert.equal(r.rows[0].id,'SAE-01');assert.equal(r.byId['SAE-02'],undefined);assert.equal(r.all.find(t=>t.id==='SAE-02').status,'hold');}
 const resolved=buildItems(DEFAULTS,{'SAE-02':{done:3,hold:false}});
 for(const p of POLICIES){const rows=simulate(resolved,6,p.id).rows;assert.ok(rows.slice(0,2).every(t=>t.category==='saes'));}
});

test('completing safety follow-up changes tasks without closing or unflagging the source',()=>{
 const beforeItems=buildItems(DEFAULTS),before=safetySummary(beforeItems),t=beforeItems.find(t=>t.id==='AE-02');
 let p=transition(t,'check',2),next=buildItems(DEFAULTS,{[t.id]:p}).find(x=>x.id===t.id);p=transition(next,'check',3);
 const afterItems=buildItems(DEFAULTS,{[t.id]:p}),after=safetySummary(afterItems),done=afterItems.find(x=>x.id===t.id);
 assert.equal(done.complete,true);assert.equal(after.workflowsComplete,before.workflowsComplete+1);assert.equal(after.eventFollowUpsOpen,before.eventFollowUpsOpen-1);
 assert.equal(after.aeFlags,before.aeFlags);assert.equal(done.sourceRecord.status,'Ongoing');assert.equal(done.sourceRecord.flagged,true);assert.deepEqual(done.sourceRecord,t.sourceRecord);
});

test('SAE acknowledgement QC hold needs resolution, recheck and filing',()=>{
 let t=buildItems(DEFAULTS).find(x=>x.id==='SAE-02');assert.throws(()=>transition(t,'check',3),/QC holds/);
 let p=transition(t,'resolve');t=buildItems(DEFAULTS,{'SAE-02':p}).find(x=>x.id==='SAE-02');assert.equal(t.stage,'qc');assert.equal(t.done,3);
 p=transition(t,'check',3);t=buildItems(DEFAULTS,{'SAE-02':p}).find(x=>x.id==='SAE-02');assert.equal(t.complete,false);assert.equal(t.stage,'file');
 p=transition(t,'check',4);t=buildItems(DEFAULTS,{'SAE-02':p}).find(x=>x.id==='SAE-02');assert.equal(t.complete,true);assert.equal(t.sourceRecord.status,'Follow-up open');
});

test('existing workflow progress survives when new flagged records are added',()=>{
 const items=buildItems(DEFAULTS,{'LAB-03':{done:4,hold:false},'MON-02':{done:3,hold:false}});
 assert.equal(items.find(t=>t.id==='LAB-03').complete,true);assert.equal(items.find(t=>t.id==='MON-02').complete,true);
 assert.equal(items.find(t=>t.id==='SAE-01').done,0);assert.equal(safetySummary(items).workflowsOpen,6);
});
