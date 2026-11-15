import test from 'node:test';import assert from 'node:assert/strict';
import {createStakeholderGraph,auditGraph,edgesOfKind} from '../src/graph.mjs';
import {applyBasisPoints,allocate,createLedger,applyTransfer,assertConserved,addMinor,multiplyMinor,formatMinor} from '../src/money.mjs';
import {simulateLicensing,STRUCTURES} from '../src/scenarios.mjs';
import {LESSON_INPUTS} from '../src/lesson.mjs';
const actors=[{id:'author',role:'creator',label:'Author'},{id:'press',role:'publisher',label:'Press'},{id:'lab',role:'developer',label:'Lab'},{id:'student',role:'learner',label:'Student'},{id:'agency',role:'regulator',label:'Agency'}];
test('graph keeps permission, information and money edges distinct and typed',()=>{
 const g=createStakeholderGraph({actors,edges:[{kind:'permission',id:'p1',from:'author',to:'press',right:'distribute-copies'},{kind:'information',id:'i1',from:'press',to:'student',content:'work'},{kind:'money',id:'m1',from:'student',to:'press',amountMinor:1200,currency:'USD'}]});
 assert.equal(edgesOfKind(g,'money').length,1);assert.deepEqual(auditGraph(g).findings,[]);
 assert.throws(()=>createStakeholderGraph({actors,edges:[{kind:'money',id:'m',from:'lab',to:'press',amountMinor:5,currency:'USD',right:'copy-for-learning'}]}),/may carry only/);
 assert.throws(()=>createStakeholderGraph({actors,edges:[{kind:'permission',id:'p',from:'press',to:'lab',right:'copy-for-learning',amountMinor:5}]}),/may carry only/);
 assert.throws(()=>createStakeholderGraph({actors,edges:[{kind:'permission',id:'p',from:'press',to:'lab',right:'regulate'}]}),/regulator/);
 assert.throws(()=>createStakeholderGraph({actors:[...actors,{id:'x',role:'investor',label:'X'}],edges:[]}),/Unknown role/);
 assert.throws(()=>createStakeholderGraph({actors,edges:[{kind:'information',id:'i',from:'lab',to:'ghost',content:'work'}]}),/unknown actor/);
});
test('payment never stands in for permission',()=>{
 const g=createStakeholderGraph({actors,edges:[{kind:'money',id:'m1',from:'lab',to:'press',amountMinor:50000,currency:'USD'},{kind:'information',id:'i1',from:'lab',to:'student',content:'work'}]});
 const audit=auditGraph(g);assert.equal(audit.findings.length,1);assert.match(audit.findings[0].note,/payment alone is not modelled as permission/);
});
test('money: explicit rounding, exact allocation and overflow protection',()=>{
 assert.equal(applyBasisPoints(1005,5000,'floor'),502);assert.equal(applyBasisPoints(1005,5000,'ceil'),503);
 assert.equal(applyBasisPoints(1005,5000,'half-even'),502);assert.equal(applyBasisPoints(1015,5000,'half-even'),508);
 assert.throws(()=>applyBasisPoints(100,500),/rounding/);
 for(const [total,w] of [[100,[1,1,1]],[7,[3,1]],[0,[2,5]],[999999,[7,11,13,17]]]){const parts=allocate(total,w);assert.equal(parts.reduce((a,b)=>a+b,0),total)}
 assert.deepEqual(allocate(100,[1,1,1]),[34,33,33]);
 assert.throws(()=>addMinor(Number.MAX_SAFE_INTEGER,1),/Overflow/);assert.throws(()=>multiplyMinor(2**40,2**20),/Overflow/);
 assert.throws(()=>applyBasisPoints(0.5,100,'floor'),/safe integer/);
 assert.equal(formatMinor(-1234),'-USD 12.34');
});
test('every transfer conserves the ledger and invalid transfers are rejected',()=>{
 let l=createLedger('USD',{a:1000,b:0});l=applyTransfer(l,{id:'t1',from:'a',to:'b',amountMinor:250,memo:'test'});
 assert.deepEqual(l.balances,{a:750,b:250});assert.equal(assertConserved(l),true);
 assert.throws(()=>applyTransfer(l,{id:'t1',from:'a',to:'b',amountMinor:1,memo:'dup'}),/Duplicate/);
 assert.throws(()=>applyTransfer(l,{id:'t2',from:'a',to:'b',amountMinor:-5,memo:'neg'}),/positive/);
 assert.throws(()=>applyTransfer(l,{id:'t3',from:'a',to:'c',amountMinor:5,memo:'x'}),/Unknown account/);
 assert.throws(()=>applyTransfer(l,{id:'t4',from:'a',to:'b',amountMinor:5,memo:''}),/states what/);
 assert.throws(()=>assertConserved({...l,balances:{a:1,b:1}}),/not conserved/);
});
test('licensing scenarios: deterministic golden transactions that follow only declared inputs',()=>{
 const goldens={'per-copy-purchase':[-192000,28800],'subscription':[-36000,10800],'library-access':[0,2700],'collective-license':[0,54000],'learning-permission-with-lawful-copy':[0,1440]};
 for(const input of LESSON_INPUTS){
  const a=simulateLicensing(input),b=simulateLicensing(input);
  assert.deepEqual(a,b);assertConserved(a.ledger);
  assert.deepEqual([a.ledger.balances.learners,a.creatorTotalMinor],goldens[input.structure],input.structure);
  for(const e of a.ledger.events)assert.ok(e.memo.length>0);
 }
 const sub=LESSON_INPUTS.find(i=>i.structure==='subscription');
 assert.throws(()=>simulateLicensing({...sub,discountMinor:10}),/requires exactly/);
 const {rounding,...missing}=sub;assert.throws(()=>simulateLicensing(missing),/requires exactly/);
 assert.equal(Object.keys(STRUCTURES).length,5);
});
