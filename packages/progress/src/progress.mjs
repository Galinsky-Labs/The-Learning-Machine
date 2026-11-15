// TLM-089: optional, browser-local learning progress. Off until the visitor turns it on; explicit clear; portable export.
export const PROGRESS_FORMAT='tlm-progress-v1';
export const PROGRESS_KEY='tlm.progress.v1',CONSENT_KEY='tlm.progress.enabled',TOMBSTONE_KEY='tlm.progress.cleared-at';
export const MODULE_IDS=Object.freeze(['vision','teach-machine','model-internals','music','legal-cases','market','write-the-law','capstone']);
const STAGES=new Set(['started','predicted','observed','explained','revised','transfer','complete']);
function checksum(text){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')}
const assert=(c,m)=>{if(!c)throw new TypeError(m)};
function validateModules(modules){
 assert(modules&&typeof modules==='object'&&!Array.isArray(modules),'Invalid progress modules');
 for(const [id,entry] of Object.entries(modules)){
  assert(MODULE_IDS.includes(id),'Unknown module '+id);
  assert(entry&&STAGES.has(entry.stage)&&typeof entry.updatedAt==='string'&&!Number.isNaN(Date.parse(entry.updatedAt)),'Invalid progress entry for '+id);
  assert(entry.note===undefined||(typeof entry.note==='string'&&entry.note.length<=600),'Progress notes are limited to 600 characters');
 }
 return modules;
}
export function serializeProgress({releaseDigest,modules,savedAt}){
 validateModules(modules);const body=JSON.stringify({format:PROGRESS_FORMAT,releaseDigest,savedAt,modules});
 return JSON.stringify({checksum:checksum(body),body});
}
export function parseProgress(text,{releaseDigest}={}){
 let outer;try{outer=JSON.parse(text)}catch{return {status:'corrupt',reason:'Saved progress is not valid JSON.'}}
 if(!outer||typeof outer.body!=='string'||checksum(outer.body)!==outer.checksum)return {status:'corrupt',reason:'Saved progress failed its integrity check.'};
 let data;try{data=JSON.parse(outer.body)}catch{return {status:'corrupt',reason:'Saved progress body is unreadable.'}}
 if(data.format!==PROGRESS_FORMAT)return {status:'unsupported',reason:'Saved progress is from an unsupported version.'};
 try{validateModules(data.modules)}catch(e){return {status:'corrupt',reason:e.message}}
 return {status:'ok',modules:data.modules,savedAt:data.savedAt,releaseDigest:data.releaseDigest,releaseChanged:Boolean(releaseDigest&&data.releaseDigest!==releaseDigest)};
}
// storage: a Storage-like object (localStorage) — any failure leaves the lesson usable without saving.
export function createProgressStore(storage,{releaseDigest,now=()=>new Date().toISOString()}={}){
 const get=(k)=>{try{return storage?.getItem(k)??null}catch{return null}};
 const set=(k,v)=>{try{storage.setItem(k,v);return true}catch{return false}};
 const del=(k)=>{try{storage.removeItem(k)}catch{}};
 return Object.freeze({
  enabled:()=>get(CONSENT_KEY)==='yes',
  enable(){del(TOMBSTONE_KEY);return set(CONSENT_KEY,'yes')},
  load(){
   if(get(CONSENT_KEY)!=='yes')return {status:'disabled',modules:{}};
   const raw=get(PROGRESS_KEY);if(!raw)return {status:'empty',modules:{}};
   const parsed=parseProgress(raw,{releaseDigest});
   if(parsed.status!=='ok'){del(PROGRESS_KEY);return {...parsed,modules:{},discarded:true}}
   return parsed;
  },
  record(moduleId,stage,note){
   if(get(CONSENT_KEY)!=='yes'||get(TOMBSTONE_KEY))return false;// never silently resurrect cleared state
   assert(MODULE_IDS.includes(moduleId)&&STAGES.has(stage),'Unknown module or stage');
   const current=this.load(),modules={...(current.modules??{}),[moduleId]:{stage,updatedAt:now(),...(note?{note:String(note).slice(0,600)}:{})}};
   return set(PROGRESS_KEY,serializeProgress({releaseDigest,modules,savedAt:now()}));
  },
  clear(){del(PROGRESS_KEY);del(CONSENT_KEY);set(TOMBSTONE_KEY,now());return {cleared:true,note:'Removed from this browser\'s storage for this site. The browser may keep copies elsewhere (backups, other profiles); this cannot guarantee physical erasure.'}},
  exportText(){const r=this.load();return serializeProgress({releaseDigest,modules:r.modules??{},savedAt:now()})},
  importText(text){
   if(get(CONSENT_KEY)!=='yes')throw new TypeError('Turn on local progress before importing');
   const parsed=parseProgress(text,{releaseDigest});
   if(parsed.status!=='ok')throw new TypeError('Import rejected: '+parsed.reason);
   del(TOMBSTONE_KEY);set(PROGRESS_KEY,serializeProgress({releaseDigest,modules:parsed.modules,savedAt:now()}));return parsed;
  }
 });
}
export function reportProgress(moduleId,stage,note){
 try{const store=createProgressStore(globalThis.localStorage,{releaseDigest:globalThis.__TLM_RELEASE__});return store.record(moduleId,stage,note)}catch{return false}
}
