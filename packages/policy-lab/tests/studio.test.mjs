import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compileStudioPolicy,evaluateStudioPolicy,exportStudioPolicy,importStudioPolicy,comparePolicies,attributeDifference,tradeoffMatrix,stressTestPolicy,STUDIO_SCENARIOS,createHistory,commitRevision,forkRevision,replayHistory,exportHistory,importHistory} from "../src/studio.mjs";
const bill=JSON.parse(readFileSync(new URL("../../../content/us-law/proposed-bill.json",import.meta.url),"utf8"));
const eq=(fact,value)=>({operator:"eq",fact,value});
const learning={schemaVersion:"2.0.0",id:"learning-first",title:"Learning first",defaultEffect:"unresolved",rules:[
 {id:"lawful-learning",label:"Lawful temporary learning",annotation:"Learning from lawful access is allowed.",when:{operator:"all",conditions:[eq("access.lawful",true),eq("retention.retained",false)]},effect:"permit",
  exceptions:[{id:"copied-output",label:"Copied output",when:{operator:"all",conditions:[eq("outputs.distributed",true),eq("outputs.containsProtectedExpression",true)]},effect:"restrict"}]},
 {id:"unlawful-source",label:"Unlawful source",annotation:"",when:eq("access.lawful",false),effect:"restrict",exceptions:[]}]};
const strict={...learning,id:"creator-first",title:"Creator first",rules:[{...learning.rules[0],effect:"conditional"},learning.rules[1]]};
const facts=(id)=>STUDIO_SCENARIOS.find(s=>s.id===id).facts;
test("compound rules with exceptions evaluate three-valued and survive export/import with identical meaning",()=>{
 const p=compileStudioPolicy(learning);
 assert.equal(evaluateStudioPolicy(p,facts("lawful-ephemeral-learning")).outcome,"permit");
 assert.equal(evaluateStudioPolicy(p,facts("regurgitating-output")).outcome,"restrict");
 assert.deepEqual(evaluateStudioPolicy(p,facts("regurgitating-output")).decidedBy,["copied-output"]);
 assert.equal(evaluateStudioPolicy(p,facts("unknown-access")).outcome,"unresolved");
 assert.equal(evaluateStudioPolicy(p,facts("permanent-archive")).outcome,"unresolved");
 const restored=importStudioPolicy(exportStudioPolicy(p));assert.deepEqual(restored,p);
 for(const s of STUDIO_SCENARIOS){
  const edited={...s.facts,"teaching.performed":!s.facts["teaching.performed"]};
  assert.equal(evaluateStudioPolicy(restored,edited).outcome,evaluateStudioPolicy(p,edited).outcome);
 }
});
test("arbitrary code, unknown facts, tampering and boundary violations fail closed",()=>{
 assert.throws(()=>compileStudioPolicy({...learning,rules:[{...learning.rules[0],when:{operator:"js",code:"process.exit()"}}]}),/Unsupported policy operator/);
 assert.throws(()=>compileStudioPolicy({...learning,rules:[{...learning.rules[0],when:eq("visitor.politics","left")}]}),/Unsupported policy fact/);
 assert.throws(()=>compileStudioPolicy({...learning,rules:[learning.rules[0],learning.rules[0]]}),/Duplicate/);
 const env=JSON.parse(exportStudioPolicy(compileStudioPolicy(learning)));env.policy.rules[0].effect="restrict";
 assert.throws(()=>importStudioPolicy(JSON.stringify(env)),/checksum/);
 assert.throws(()=>evaluateStudioPolicy(compileStudioPolicy(learning),{"secret.fact":1}),/Unsupported fact/);
 let deep=eq("access.lawful",true);for(let i=0;i<7;i++)deep={operator:"not",condition:deep};
 assert.throws(()=>compileStudioPolicy({...learning,rules:[{...learning.rules[0],when:deep}]}),/six levels/);
});
test("same-facts comparison exposes exactly which altered rule changed the outcome",()=>{
 const a=compileStudioPolicy(learning),b=compileStudioPolicy(strict);
 const r=comparePolicies({proposal:bill,policies:[a,b]},facts("lawful-ephemeral-learning"));
 assert.equal(r.proposal.outcome,"not-evaluable-incomplete-draft");assert.equal(r.proposal.enactedLaw,false);assert.equal(r.presentLaw.outcome,"unresolved");
 assert.deepEqual(r.visitor.map(v=>v.outcome),["permit","conditional"]);
 assert.deepEqual(r.pairwise[0].responsibleRules,["lawful-learning"]);assert.deepEqual(r.pairwise[0].changedRules,["lawful-learning"]);
 const same=attributeDifference(a,b,facts("pirated-source"));assert.equal(same.outcomeChanged,false);assert.deepEqual(same.responsibleRules,[]);
 assert.deepEqual(comparePolicies({proposal:bill,policies:[a,b]},facts("lawful-ephemeral-learning")),r);
});
test("tradeoff matrix reports outcome counts and actor effects without any score",()=>{
 const m=tradeoffMatrix([compileStudioPolicy(learning),compileStudioPolicy(strict)]);
 assert.equal(m.rows.length,STUDIO_SCENARIOS.length);
 for(const c of m.counts)assert.equal(c.permit+c.restrict+c.conditional+c.unresolved+c.disputed,STUDIO_SCENARIOS.length);
 assert.match(m.note,/not a morality, compliance or quality score/);
 assert.equal(JSON.stringify(m).includes("score\":"),false);
});
test("stress harness is symmetric: permissive and restrictive policies face the same checks",()=>{
 const permitAll=compileStudioPolicy({schemaVersion:"2.0.0",id:"permit-all",title:"Permit everything",defaultEffect:"permit",rules:[{id:"all-copying",label:"Any copying",annotation:"",when:{operator:"exists",fact:"copying.performed",value:true},effect:"permit",exceptions:[]}]});
 const restrictAll=compileStudioPolicy({schemaVersion:"2.0.0",id:"restrict-all",title:"Restrict everything",defaultEffect:"restrict",rules:[{id:"all-copying",label:"Any copying",annotation:"",when:{operator:"exists",fact:"copying.performed",value:true},effect:"restrict",exceptions:[]}]});
 const p=stressTestPolicy(permitAll),r=stressTestPolicy(restrictAll);
 assert.equal(p.checksRun,r.checksRun);assert.deepEqual(p.balance,r.balance);assert.equal(p.balance.underProtect,p.balance.overRestrict);
 assert.ok(p.findings.some(f=>f.direction==="may-under-protect-creators"));assert.ok(r.findings.some(f=>f.direction==="may-over-restrict-learning"));
 assert.ok(p.findings.some(f=>f.checkId==="silent-on-unknown-access"));assert.ok(r.findings.some(f=>f.checkId==="silent-on-unknown-access"));
 const conflicting=compileStudioPolicy({...learning,id:"conflict",rules:[...learning.rules,{id:"teaching-restrict",label:"x",annotation:"",when:eq("access.lawful",true),effect:"restrict",exceptions:[]}]});
 assert.ok(stressTestPolicy(conflicting).findings.some(f=>f.checkId==="contradiction"));
 assert.ok(stressTestPolicy(compileStudioPolicy(learning)).hinges.length>0);
});
test("history keeps older evidence, supports forks and round-trips locally",()=>{
 let h=createHistory(learning,"First draft");
 h=commitRevision(h,{policyInput:strict,note:"Tighten after the stress test"});
 h=forkRevision(h,"r1","alternative",{...learning,id:"alt",title:"Alternative",defaultEffect:"restrict"},"Dissenting fork");
 assert.equal(h.revisions.length,3);assert.deepEqual(h.heads,{main:"r2",alternative:"r3"});assert.equal(h.revisions[2].parent,"r1");
 assert.ok(replayHistory(h).every(r=>r.intact));
 assert.equal(h.revisions[0].evidence.find(e=>e.scenarioId==="lawful-ephemeral-learning").outcome,"permit");
 const back=importHistory(exportHistory(h));assert.deepEqual(back,h);
 const env=JSON.parse(exportHistory(h));env.history.revisions[0].evidence[0].outcome="restrict";
 assert.throws(()=>importHistory(JSON.stringify(env)),/checksum/);
 assert.throws(()=>forkRevision(h,"r1","alternative",learning,"dup"),/already exists/);
});
