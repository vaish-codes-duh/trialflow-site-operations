import {SAFETY_ITEMS,safetySummary} from './safety.mjs';
export const VERSION = '2.1.0';
export const TODAY = '2026-11-16';
export const SITE = 'Site 014 · Cedar Research Unit';
export const DEFAULTS = { capacity: 6, volume: 100, delay: 0, cadence: 'twice', policy: 'risk' };
export const STUDIES = {
  NOVA: { code: 'NOVA-201', label: 'NOVA', color: '#5478ab', fresh: 2, frozen: 3 },
  LUMEN: { code: 'LUMEN-104', label: 'LUMEN', color: '#9270ad', fresh: 1, frozen: 2 },
  AXIS: { code: 'AXIS-302', label: 'AXIS', color: '#b68748', fresh: 2, frozen: 1 }
};
export const CATEGORIES = {
  saes: { label: 'Serious adverse events', short: 'SAEs', color: '#aa4d45' },
  aes: { label: 'Adverse events', short: 'AEs', color: '#b77c4b' },
  deviations: { label: 'Protocol deviations', short: 'Deviations', color: '#a18b55' },
  shipments: { label: 'Sample shipments', short: 'Shipments', color: '#2b8b79' },
  regulatory: { label: 'Study submissions', short: 'Submissions', color: '#ae765c' },
  monitoring: { label: 'Monitoring actions', short: 'Monitoring', color: '#be963e' },
  queries: { label: 'Data queries', short: 'Queries', color: '#906bb8' },
  labs: { label: 'Lab reports', short: 'Lab reports', color: '#527fbc' },
  ekg: { label: 'EKG reports', short: 'EKG reports', color: '#7484a4' },
  drug: { label: 'Drug accountability', short: 'Accountability', color: '#6b9660' },
  visits: { label: 'Visit coordination', short: 'Visits', color: '#739b9c' }
};
export const POLICIES = [
  { id: 'risk', name: 'Impact & urgency', description: 'Due date, impact, waiting age' },
  { id: 'deadline', name: 'Deadline-first', description: 'Earliest deadline first' },
  { id: 'short', name: 'Shortest-first', description: 'Least remaining effort first' }
];
const step = (label, role, effort, stage, qc = false) => ({ label, role, effort, stage, qc });
const COORD = 'Study coordinator', PI = 'Investigator / qualified delegate', QC = 'QC reviewer (simulated)';
const reportSteps = type => [step('Check report identity, visit and completeness', COORD, .25, 'review'), step(`Record ${type === 'ekg' ? 'investigator EKG validation' : 'investigator lab review'}`, PI, .5, 'review'), step('QC signature, date and document version', QC, .25, 'qc', true), step('File and index the reviewed report', COORD, .25, 'file')];
const querySteps = [step('Check discrepancy against source', COORD, .5, 'prepare'), step('QC query response and supporting evidence', QC, .25, 'qc', true), step('Record query resolution', COORD, .25, 'close')];
const monitorSteps = [step('Address the monitoring action', COORD, .75, 'prepare'), step('QC corrective-action evidence', QC, .25, 'qc', true), step('File closure evidence', COORD, .25, 'file')];
const submissionSteps = [step('Compile the submission packet', 'Regulatory coordinator', 1.5, 'prepare'), step('QC versions, signatures and completeness', QC, .5, 'qc', true), step('Record simulated submission', 'Regulatory coordinator', .25, 'submit'), step('File simulated acknowledgement', 'Regulatory coordinator', .25, 'file')];
const shipmentSteps = [step('Reconcile samples against the manifest', COORD, .25, 'prepare'), step('Record packing and custody checks', 'Lab coordinator', .5, 'prepare'), step('QC manifest and dispatch documents', QC, .25, 'qc', true), step('Record simulated courier dispatch', 'Lab coordinator', .25, 'dispatch'), step('Reconcile receipt and file the record', COORD, .25, 'file')];

// Invented protocol codes, records, deadlines, roles and durations. No patient data.
export const BASE_ITEMS = [
  { id:'REG-01', study:'NOVA', category:'regulatory', title:'REB continuing-review submission', dueDate:'2026-11-17', age:5, impact:3, initialDone:1, steps:submissionSteps, detail:'Assemble a fictional continuing-review packet. The deadline is an invented site target, not a regulatory time limit.' },
  { id:'REG-02', study:'LUMEN', category:'regulatory', title:'Protocol amendment 03 submission', dueDate:'2026-11-20', age:3, impact:3, initialDone:0, steps:submissionSteps, detail:'Track preparation, document QC, submission and acknowledgement for a fictional amendment.' },
  { id:'REG-03', study:'AXIS', category:'regulatory', title:'Investigator brochure acknowledgement', dueDate:'2026-11-25', age:2, impact:2, initialDone:2, steps:submissionSteps, detail:'Record a fictional study document acknowledgement and retain its filing evidence.' },
  { id:'MON-01', study:'NOVA', category:'monitoring', title:'Correct source-to-EDC visit date discrepancy', dueDate:'2026-11-13', visitDate:'2026-11-10', age:6, impact:3, initialDone:0, steps:monitorSteps, detail:'A fictional monitoring visit identified inconsistent visit dates. Address the finding, QC the evidence and file the closure record.' },
  { id:'MON-02', study:'LUMEN', category:'monitoring', title:'File delegation-log correction evidence', dueDate:'2026-11-17', visitDate:'2026-11-12', age:4, impact:2, initialDone:1, steps:monitorSteps, detail:'A fictional monitor requested corrected delegation documentation and a traceable closure record.' },
  { id:'MON-03', study:'AXIS', category:'monitoring', title:'Close equipment-calibration finding', dueDate:'2026-11-18', visitDate:'2026-11-12', age:4, impact:2, initialDone:1, initialHold:true, issue:'Calibration evidence is missing its verification date.', steps:monitorSteps, detail:'QC of a fictional corrective-action record found incomplete evidence. Resolve the mock issue before recording QC completion.' },
  { id:'DQ-01', study:'NOVA', category:'queries', title:'Resolve baseline lab-unit query', dueDate:'2026-11-16', age:8, impact:3, initialDone:0, steps:querySteps, detail:'Check a synthetic source-to-form unit discrepancy, QC the response and record resolution. No clinical values are evaluated.' },
  { id:'DQ-02', study:'LUMEN', category:'queries', title:'Clarify missing assessment date', dueDate:'2026-11-17', age:5, impact:2, initialDone:1, steps:querySteps, detail:'Reconcile an invented missing field and retain a traceable response.' },
  { id:'DQ-03', study:'AXIS', category:'queries', title:'Reconcile concomitant-medication entry', dueDate:'2026-11-19', age:3, impact:2, initialDone:2, steps:querySteps, detail:'Close a fictional record-entry discrepancy after source review and QC.' },
  { id:'DQ-04', study:'NOVA', category:'queries', title:'Confirm sample collection timestamp', dueDate:'2026-11-13', age:2, impact:1, initialDone:3, steps:querySteps, detail:'An already resolved mock query provides a completed example in the workboard.' },
  { id:'LAB-01', study:'NOVA', category:'labs', title:'Week-8 central lab report · mock visit V018', dueDate:'2026-11-13', age:3, impact:3, initialDone:0, steps:reportSteps('lab'), detail:'Track human review, document QC and filing of a fictional laboratory report. This app contains no results and does not interpret or validate medical findings.' },
  { id:'LAB-02', study:'LUMEN', category:'labs', title:'Baseline lab report · mock visit V026', dueDate:'2026-11-16', age:2, impact:3, initialDone:2, initialHold:true, issue:'The mock investigator review is missing its date.', steps:reportSteps('lab'), detail:'The report has a simulated review recorded, but document QC found an incomplete date. Filing stays blocked until the issue is resolved and QC is passed.' },
  { id:'LAB-03', study:'AXIS', category:'labs', title:'Week-4 lab report · mock visit V009', dueDate:'2026-11-17', age:1, impact:2, initialDone:3, steps:reportSteps('lab'), detail:'Human review and QC are recorded. The remaining step is filing and indexing the mock report.' },
  { id:'LAB-04', study:'NOVA', category:'labs', title:'Screening lab report · mock visit V031', dueDate:'2026-11-18', age:1, impact:2, initialDone:1, steps:reportSteps('lab'), detail:'Completeness has been checked. A qualified human must review the report before document QC and filing are recorded.' },
  { id:'EKG-01', study:'AXIS', category:'ekg', title:'Week-12 EKG report · mock visit V014', dueDate:'2026-11-16', age:2, impact:3, initialDone:1, steps:reportSteps('ekg'), detail:'Track investigator EKG validation, signature/date QC and filing. The software never interprets a waveform or validates a clinical result.' },
  { id:'EKG-02', study:'LUMEN', category:'ekg', title:'Baseline EKG report · mock visit V022', dueDate:'2026-11-17', age:1, impact:2, initialDone:3, steps:reportSteps('ekg'), detail:'The fictional report is reviewed and QC checked; it still needs filing.' },
  { id:'EKG-03', study:'NOVA', category:'ekg', title:'Screening EKG report · mock visit V029', dueDate:'2026-11-13', age:1, impact:2, initialDone:4, steps:reportSteps('ekg'), detail:'A fully completed mock EKG workflow, including review, QC and filing.' },
  { id:'IP-01', study:'NOVA', category:'drug', title:'Reconcile returned kit count', dueDate:'2026-11-16', age:3, impact:3, initialDone:0, steps:[step('Reconcile inventory and return records','Pharmacy delegate',1,'prepare'),step('QC accountability reconciliation',QC,.5,'qc',true),step('File signed accountability record',COORD,.25,'file')], detail:'Check fictional kit counts and retain a signed reconciliation. No dispensing or product release is authorized by the app.' },
  { id:'IP-02', study:'AXIS', category:'drug', title:'File shipment receipt and inventory update', dueDate:'2026-11-17', age:1, impact:2, initialDone:3, steps:[step('Verify fictional receipt','Pharmacy delegate',.5,'prepare'),step('QC inventory update',QC,.25,'qc',true),step('File receipt record',COORD,.25,'file')], detail:'An example completed accountability workflow.' },
  { id:'VIS-01', study:'LUMEN', category:'visits', title:'Confirm upcoming visit-window bookings', dueDate:'2026-11-16', age:2, impact:3, initialDone:0, steps:[step('Check fictional visit windows',COORD,.5,'prepare'),step('QC the appointment checklist',QC,.25,'qc',true),step('Record booking coordination complete',COORD,.25,'close')], detail:'Models visit coordination effort only. No real appointment or participant contact is created.' },
  { id:'VIS-02', study:'AXIS', category:'visits', title:'Prepare next-week visit materials', dueDate:'2026-11-20', age:1, impact:1, initialDone:1, steps:[step('Assemble visit materials',COORD,.75,'prepare'),step('QC versions and packet completeness',QC,.25,'qc',true),step('File preparation checklist',COORD,.25,'file')], detail:'Prepare a fictional visit packet using invented study documents.' }
];

const iso = d => d.toISOString().slice(0,10);
export function addDays(date,n) { const d=new Date(date+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return iso(d); }
export function weekday(date) { return new Date(date+'T12:00:00Z').getUTCDay(); }
export function isWorkday(date) { return ![0,6].includes(weekday(date)); }
export function addWorkdays(date,n) { let d=date, left=Math.abs(n), direction=n<0?-1:1; while(left){d=addDays(d,direction);if(isWorkday(d))left--;} return d; }
export function workOffset(date) {
  while(!isWorkday(date))date=addDays(date,-1);
  let cursor=TODAY,count=0;
  if(date>=TODAY){while(cursor<date){cursor=addDays(cursor,1);if(isWorkday(cursor))count++;}return count;}
  while(cursor>date){cursor=addDays(cursor,-1);if(isWorkday(cursor))count--;}
  return count;
}
export function dateLabel(date, long=false) { return new Intl.DateTimeFormat('en-CA',{timeZone:'UTC',month:'short',day:'numeric',...(long?{weekday:'short'}:{})}).format(new Date(date+'T12:00:00Z')); }
export function finishDate(finish) { return finish===null ? null : addWorkdays(TODAY,Math.max(0,Math.ceil(finish-1e-9)-1)); }

export function forecast(settings) {
  const calendar=Array.from({length:14},(_,i)=>addDays(TODAY,i));
  const events=[]; let stored=18, visits=0, freshCollected=0, frozenCollected=0, workday=0;
  const patterns=[[2,1,1],[1,2,1],[2,1,2],[1,1,1],[2,2,1]];
  for(const date of calendar){
    if(!isWorkday(date))continue;
    const byStudy=Object.fromEntries(Object.keys(STUDIES).map((key,i)=>[key,Math.round(patterns[workday%5][i]*settings.volume/100)]));
    const fresh=Object.entries(byStudy).reduce((s,[k,n])=>s+n*STUDIES[k].fresh,0);
    const frozen=Object.entries(byStudy).reduce((s,[k,n])=>s+n*STUDIES[k].frozen,0);
    visits+=Object.values(byStudy).reduce((a,b)=>a+b,0); freshCollected+=fresh; frozenCollected+=frozen; stored+=frozen;
    if(fresh) events.push({id:`SHP-FR-${date}`,type:'fresh',title:'Daily lab sample shipment',date,predictedDate:addWorkdays(date,settings.delay),tubes:fresh,study:'SITE',byStudy});
    const frozenDay=settings.cadence==='twice'?[2,5].includes(weekday(date)):date==='2026-11-20';
    if(frozenDay&&stored){events.push({id:`SHP-FZ-${date}`,type:'frozen',title:settings.cadence==='twice'?'Twice-weekly frozen sample batch':'Fortnightly frozen sample batch',date,predictedDate:addWorkdays(date,settings.delay),tubes:stored,study:'SITE'});stored=0;}
    workday++;
  }
  const days=calendar.map(date=>({date,workday:isWorkday(date),fresh:events.filter(e=>e.type==='fresh'&&e.predictedDate===date).reduce((s,e)=>s+e.tubes,0),frozen:events.filter(e=>e.type==='frozen'&&e.predictedDate===date).reduce((s,e)=>s+e.tubes,0)}));
  const beyond=events.filter(e=>e.predictedDate>calendar.at(-1));
  return {calendar,events,days,visits,freshCollected,frozenCollected,startingFrozen:18,frozenWaiting:stored+beyond.filter(e=>e.type==='frozen').reduce((s,e)=>s+e.tubes,0),beyond: beyond.length};
}

export function buildItems(settings, progress={}, overrides={}) {
  const f=forecast(settings);
  const shipments=f.events.map(e=>({id:e.id,study:'SITE',category:'shipments',title:`${e.type==='fresh'?'Daily lab samples':'Frozen sample batch'} · ${dateLabel(e.date)}`,dueDate:e.date,releaseDate:e.date,predictedDate:e.predictedDate,age:0,impact:3,initialDone:0,steps:shipmentSteps.map((s,i)=>({...s,effort:s.effort+(i===0?e.tubes*.01:i===1?e.tubes*.02:0)})),shipment:e,detail:`${e.tubes} expected tubes in a fictional ${e.type} shipment. Volumes are derived from planned visits and invented tubes-per-visit assumptions. Packing requirements and sample viability are not assessed.`}));
  return [...BASE_ITEMS,...SAFETY_ITEMS,...shipments].map(original=>{
    const p=progress[original.id]||{}, o=overrides[original.id]||{};
    const done=Math.max(0,Math.min(original.steps.length,Number.isInteger(p.done)?p.done:original.initialDone));
    const hold=done<original.steps.length&&(p.hold??original.initialHold??false);
    const baseEffort=original.steps.slice(done).reduce((s,x)=>s+x.effort,0);
    const dueDate=o.dueDate||original.dueDate;
    const releaseDate=original.releaseDate||TODAY;
    const stage=done===original.steps.length?'completed':hold?'hold':original.steps[done].stage;
    return {...original,...o,done,hold,stage,complete:done===original.steps.length,dueDate,releaseDate,due:workOffset(dueDate),release:Math.max(0,workOffset(releaseDate)),effort:baseEffort*(o.effortFactor||1),issue:original.issue||'The simulated QC check found incomplete supporting documentation.'};
  });
}
export function scoreParts(item){const urgency=Math.min(50,Math.max(0,40-8*item.due)),impact={1:8,2:20,3:35}[item.impact],age=Math.min(15,item.age*2);return {urgency,impact,age,total:urgency+impact+age};}
function comparator(policy){return (a,b)=>{
  const safetyTier=(a.category==='saes'?0:1)-(b.category==='saes'?0:1);if(safetyTier)return safetyTier;
  const fallback=a.id.localeCompare(b.id);
  if(policy==='deadline')return a.due-b.due||scoreParts(b).total-scoreParts(a).total||fallback;
  if(policy==='short')return a.effort-b.effort||a.due-b.due||fallback;
  return scoreParts(b).total-scoreParts(a).total||a.due-b.due||fallback;
};}
export function simulate(items,capacity,policy='risk'){
  if(!Number.isFinite(capacity)||capacity<=0)throw new Error('Capacity must be positive');
  const pending=items.filter(x=>!x.complete&&!x.hold), rows=[];let cursor=0;
  while(pending.length){
    let ready=pending.filter(t=>t.release<=cursor+1e-9);
    if(!ready.length){cursor=Math.min(...pending.map(t=>t.release));ready=pending.filter(t=>t.release<=cursor+1e-9);}
    ready.sort(comparator(policy));const t=ready[0],start=Math.max(cursor,t.release);cursor=start+t.effort/capacity;
    const finish=t.predictedDate?Math.max(cursor,workOffset(t.predictedDate)+1):cursor;
    const late=finish>t.due+1+1e-9;
    rows.push({...t,start,teamFinish:cursor,finish,rank:rows.length+1,late,status:t.dueDate<TODAY?'overdue':late?'risk':'track'});
    pending.splice(pending.findIndex(x=>x.id===t.id),1);
  }
  const byId=Object.fromEntries(rows.map(t=>[t.id,t]));
  const all=items.map(t=>byId[t.id]||{...t,start:null,finish:null,rank:null,late:false,status:t.complete?'completed':'hold'});
  return {rows,all,byId,onTime:rows.filter(t=>!t.late).length,late:rows.filter(t=>t.late).length,highLate:rows.filter(t=>t.late&&t.impact===3).length,atRisk:rows.filter(t=>t.status==='risk').length,hours:items.filter(t=>!t.complete).reduce((s,t)=>s+t.effort,0),scheduledHours:rows.reduce((s,t)=>s+t.effort,0)};
}
export function summary(items,simulation){
  const open=items.filter(t=>!t.complete), reports=items.filter(t=>['labs','ekg'].includes(t.category));
  return {safety:safetySummary(items),total:items.length,open:open.length,completed:items.filter(t=>t.complete).length,overdue:open.filter(t=>t.dueDate<TODAY).length,dueToday:open.filter(t=>t.dueDate===TODAY).length,qcHolds:open.filter(t=>t.hold).length,qcPending:open.filter(t=>t.stage==='qc').length,atRisk:simulation.atRisk,reports:{review:reports.filter(t=>t.stage==='review').length,qc:reports.filter(t=>['qc','hold'].includes(t.stage)).length,file:reports.filter(t=>t.stage==='file').length,completed:reports.filter(t=>t.complete).length}};
}
export function transition(item,action,index){
  if(item.releaseDate>TODAY)throw new Error('This shipment is planned for a future day.');
  if(action==='check'){
    if(index<item.done)return {done:index,hold:false};
    if(index!==item.done||item.hold||item.complete)throw new Error('Complete preceding checks and resolve QC holds first.');
    return {done:item.done+1,hold:false};
  }
  if(action==='flag'){
    if(item.complete||!item.steps[item.done].qc)throw new Error('QC issues can be flagged at the current QC step.');
    return {done:item.done,hold:true};
  }
  if(action==='resolve'){
    if(!item.hold)throw new Error('There is no QC hold to resolve.');
    return {done:item.done,hold:false};
  }
  throw new Error('Unknown action');
}
export const STAGES={escalate:'Escalation to record',report:'Safety report to record',planned:'Planned',review:'Awaiting review',prepare:'In preparation',qc:'QC pending',hold:'QC hold',file:'Ready to file',close:'Ready to close',submit:'Ready to submit',dispatch:'Ready to dispatch',completed:'Completed'};
