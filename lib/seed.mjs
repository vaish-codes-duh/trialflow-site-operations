import {BASE_ITEMS} from './legacy/model.mjs';
import {SAFETY_ITEMS} from './legacy/safety.mjs';
import {DEFAULT_SETTINGS,STEPS,addDays,daysBetween,localDate} from '../public/domain.mjs';
export function seedWorkspace(ownerId,date=localDate()){
 const shift=daysBetween('2026-11-16',date);
 const studies=[['NOVA','NOVA-201','Dermatology study',2,3,'#527baa'],['LUMEN','LUMEN-104','Rheumatology study',1,2,'#8c71a8'],['AXIS','AXIS-302','Cardiovascular study',2,1,'#ac854c']].map(([id,code,name,fresh,frozen,color])=>({id,code,name,fresh,frozen,color,visits:[0,2,3,2,2,1,0],initialFrozen:6,freshDays:[1,2,3,4,5],frozenDays:[2,5],frozenCadence:'twice',anchor:addDays(date,4),windowDays:3,independentQC:false}));
 const records=[...BASE_ITEMS,...SAFETY_ITEMS].map(r=>({id:r.id,externalId:r.sourceRecord?.recordId||null,studyId:r.study,type:r.category,title:r.title,dueDate:addDays(r.dueDate,shift),assignee:ownerId,impact:r.impact,quantity:null,sampleKind:null,plannedVisits:r.category==='visits'?2:null,createdAt:addDays(date,-(r.age||1))+'T12:00:00Z',updatedAt:date+'T12:00:00Z',createdBy:'fixture',steps:Array.from({length:Math.min(r.initialDone||0,STEPS[r.category].length)},(_,i)=>({actorId:'fixture',actorName:'Synthetic fixture · unverified historical example',role:STEPS[r.category][i].role,at:date+'T09:00:00Z',note:'Bundled demo state; not a verified sign-off'})),hold:r.initialHold?{reason:r.issue,by:'fixture',at:date+'T09:00:00Z'}:null,source:r.sourceRecord?{...r.sourceRecord,origin:'Bundled synthetic fixture',updatedAt:date+'T08:00:00Z'}:null,provenance:'Bundled synthetic fixture'}));
 return {schemaVersion:3,settings:{...DEFAULT_SETTINGS},studies,records};
}
