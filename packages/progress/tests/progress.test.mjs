import test from 'node:test';import assert from 'node:assert/strict';
import {createProgressStore,parseProgress,serializeProgress,PROGRESS_KEY,TOMBSTONE_KEY} from '../src/progress.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m}};
let t=0;const now=()=>new Date(Date.UTC(2026,10,15,0,0,t++)).toISOString();
test('nothing is stored until the visitor opts in; no account involved',()=>{
 const s=memory(),p=createProgressStore(s,{releaseDigest:'abc',now});
 assert.equal(p.record('market','started'),false);assert.equal(s.m.size,0);
 p.enable();assert.equal(p.record('market','started'),true);assert.equal(p.load().modules.market.stage,'started');
});
test('export/import round-trips and rejects tampered or foreign files',()=>{
 const p=createProgressStore(memory(),{releaseDigest:'abc',now});p.enable();p.record('capstone','complete','I chose undecided.');
 const text=p.exportText();
 const q=createProgressStore(memory(),{releaseDigest:'abc',now});q.enable();assert.equal(q.importText(text).modules.capstone.note,'I chose undecided.');
 const tampered=JSON.parse(text);tampered.body=tampered.body.replace('complete','started');
 assert.throws(()=>q.importText(JSON.stringify(tampered)),/integrity/);
 assert.throws(()=>q.importText('not json'),/not valid JSON/);
 assert.throws(()=>q.importText(serializeProgress({modules:{hacking:{stage:'complete',updatedAt:now()}},savedAt:now()})),/Unknown module/);
 assert.equal(parseProgress(text,{releaseDigest:'other'}).releaseChanged,true);
});
test('corrupt saved state is discarded and reported, never half-restored',()=>{
 const s=memory(),p=createProgressStore(s,{now});p.enable();p.record('music','observed');
 s.setItem(PROGRESS_KEY,'{"checksum":"00000000","body":"{}"}');
 const r=p.load();assert.equal(r.status,'corrupt');assert.equal(r.discarded,true);assert.deepEqual(r.modules,{});assert.equal(s.getItem(PROGRESS_KEY),null);
});
test('cleared state is not silently restored by later autosaves; disclosure avoids erasure guarantees',()=>{
 const s=memory(),p=createProgressStore(s,{now});p.enable();p.record('vision','complete');
 const c=p.clear();assert.match(c.note,/cannot guarantee physical erasure/);
 assert.equal(p.record('vision','complete'),false);assert.equal(s.getItem(PROGRESS_KEY),null);assert.ok(s.getItem(TOMBSTONE_KEY));
 assert.equal(p.load().status,'disabled');
 p.enable();assert.equal(p.load().status,'empty');assert.equal(p.record('vision','started'),true);
});
test('storage failures leave lessons usable',()=>{
 const broken={getItem(){throw new Error('denied')},setItem(){throw new Error('quota')},removeItem(){throw new Error('denied')}};
 const p=createProgressStore(broken,{now});assert.equal(p.enable(),false);assert.equal(p.load().status,'disabled');assert.equal(p.record('vision','started'),false);
});
