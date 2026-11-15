import test from "node:test";
import assert from "node:assert/strict";
import {createWriteLawLesson,submitDraft,predictDraftOutcomes,runStressTest,respondToCounterexample,defendPolicy} from "../src/write-law-lesson.mjs";
import {assessCapstone,POSITIONS,CAPSTONE_EXERCISES} from "../src/capstone.mjs";
import {createBuilder,applyAction,buildPolicy,draftToPolicyInput,describeRule} from "../src/rule-builder.mjs";
import {evaluateStudioPolicy,STUDIO_SCENARIOS} from "../src/studio.mjs";
const run=(b,actions)=>actions.reduce(applyAction,b);
function permissiveDraft(){return run(createBuilder(),[{type:"add-rule",effect:"permit"},{type:"add-term",ruleId:"rule-1",fact:"access.lawful",operator:"eq",value:true},{type:"add-carve-out",ruleId:"rule-1",fact:"outputs.containsProtectedExpression",operator:"eq",value:true,effect:"restrict",label:"Copied output"}])}
function restrictiveDraft(){return run(createBuilder(),[{type:"set-default",effect:"restrict"},{type:"add-rule",effect:"restrict"},{type:"add-term",ruleId:"rule-1",fact:"copying.performed",operator:"eq",value:true},{type:"add-exclusion",ruleId:"rule-1",fact:"work.copyrightStatus",operator:"eq",value:"public-domain"}])}
test("builder authors substantively different legislation with terms, exclusions, carve-outs and undo/redo",()=>{
 const a=buildPolicy(permissiveDraft()),b=buildPolicy(restrictiveDraft());
 const out=(p,id)=>evaluateStudioPolicy(p,STUDIO_SCENARIOS.find(s=>s.id===id).facts).outcome;
 assert.deepEqual(["lawful-ephemeral-learning","public-domain","regurgitating-output"].map(id=>out(a,id)),["permit","permit","restrict"]);
 assert.deepEqual(["lawful-ephemeral-learning","public-domain","regurgitating-output"].map(id=>out(b,id)),["restrict","restrict","restrict"].map((v,i)=>i===1?"restrict":v));
 let u=permissiveDraft();u=applyAction(u,{type:"undo"});assert.equal(u.present.rules[0].carveOuts.length,0);u=applyAction(u,{type:"redo"});assert.equal(u.present.rules[0].carveOuts.length,1);
 assert.equal(describeRule(restrictiveDraft().present.rules[0]),"If copying.performed is true, unless work.copyrightStatus is public-domain, then restrict.");
 assert.throws(()=>applyAction(createBuilder(),{type:"add-term",ruleId:"rule-9",fact:"access.lawful",operator:"eq",value:true}),/Unknown rule/);
 assert.throws(()=>applyAction(applyAction(createBuilder(),{type:"add-rule"}),{type:"add-term",ruleId:"rule-1",fact:"x.y",operator:"eq",value:1}),/Unknown fact/);
 assert.throws(()=>draftToPolicyInput(applyAction(createBuilder(),{type:"add-rule"}).present),/at least one term/);
});
function complete(draft,stance){
 let s=submitDraft(createWriteLawLesson(),draftToPolicyInput(draft.present));
 s=predictDraftOutcomes(s,{"lawful-ephemeral-learning":"permit","pirated-source":"restrict","regurgitating-output":"restrict"});
 s=runStressTest(s);
 const finding=s.stress.findings[0];
 s=respondToCounterexample(s,{findingCheckId:finding?.checkId,reason:"I considered the counterexample and kept or adjusted my rule deliberately."});
 return defendPolicy(s,{stance,statement:"My draft reflects what I think matters most, including where I depart from the proposal."});
}
test("Module 7: opposite, dissenting drafts can both complete after stress-test revision",()=>{
 const a=complete(permissiveDraft(),"supports-proposal-direction"),b=complete(restrictiveDraft(),"opposes-proposal-direction");
 assert.equal(a.stage,"complete");assert.equal(b.stage,"complete");assert.equal(b.defense.agreementRequired,false);
 assert.ok(b.stress.findings.some(f=>f.direction==="may-over-restrict-learning"));
});
test("Module 7: revisions keep older evidence and must answer a real finding",()=>{
 let s=submitDraft(createWriteLawLesson(),draftToPolicyInput(restrictiveDraft().present));
 s=runStressTest(predictDraftOutcomes(s,{"lawful-ephemeral-learning":"restrict","pirated-source":"restrict","regurgitating-output":"restrict"}));
 assert.throws(()=>respondToCounterexample(s,{findingCheckId:"made-up",reason:"no real finding here at all"}),/stress-test findings/);
 const f=s.stress.findings.find(x=>x.checkId==="restricts-lawful-ephemeral-learning");
 s=respondToCounterexample(s,{findingCheckId:f.checkId,revisedPolicyInput:draftToPolicyInput(permissiveDraft().present),reason:"Lawful temporary learning should not be restricted."});
 assert.equal(s.history.revisions.length,2);assert.equal(s.history.revisions[0].evidence.find(e=>e.scenarioId==="lawful-ephemeral-learning").outcome,"restrict");
 assert.ok(s.revisionResponse.newStress.findings.length<=s.stress.findings.length);
});
const strong={reasoning:"The memorizer kept copies after disposal, so a guide model must be tested for regurgitation; acquisition is separate from use, and it depends on whether the museum lawfully holds the scans, which is unknown here.",
 evidenceIds:["memorizer-keeps-copies","pirated-dataset","collective-license:developers"],counterargument:"Creators argue any training on their work without payment substitutes for licensing.",response:"Audio guides may not substitute for the works, but if outputs quoted them the answer would change."};
test("Module 8: rubric depends only on reasoning; every position completes with identical criteria",()=>{
 const results=POSITIONS.map(position=>assessCapstone("museum-audio-guide",{...strong,position}));
 for(const r of results){assert.equal(r.complete,true);assert.equal(r.positionAffectsAssessment,false)}
 assert.equal(new Set(results.map(r=>JSON.stringify(r.criteria))).size,1);
 assert.equal(CAPSTONE_EXERCISES.length,3);
});
test("Module 8: endorsing the sponsor's policy without reasoning does not complete; invented evidence is flagged",()=>{
 const bare=assessCapstone("study-app-flashcards",{position:"permit",reasoning:"The Right to Learn bill is good.",evidenceIds:[],counterargument:"",response:""});
 assert.equal(bare.complete,false);
 const invented=assessCapstone("study-app-flashcards",{...strong,position:"restrict",evidenceIds:[...strong.evidenceIds,"secret-study"]});
 assert.equal(invented.criteria.find(c=>c.id==="only-real-evidence").met,false);
 assert.throws(()=>assessCapstone("study-app-flashcards",{...strong,position:"agree-with-sponsor"}),/position/);
});
