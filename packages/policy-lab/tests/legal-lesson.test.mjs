import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createLegalLesson,recordLegalHypothesis,commitLegalPrediction,runLegalExperiment,continueLegalExplanation,submitLegalExplanation,transferCandidates,runLegalTransfer,viewLegalExplanation,LEGAL_LESSONS,OUTCOME_OPTIONS} from "../src/legal-lesson.mjs";
import {CASE_LIBRARY} from "../src/case-library.mjs";
const catalog=JSON.parse(readFileSync(new URL("../../../content/us-law/authorities.json",import.meta.url),"utf8"));
const bill=JSON.parse(readFileSync(new URL("../../../content/us-law/proposed-bill.json",import.meta.url),"utf8"));
function toExplain(lesson,caseId,prediction){let s=createLegalLesson(lesson,caseId);s=recordLegalHypothesis(s,"A learning purpose should settle it.");s=commitLegalPrediction(s,prediction);s=runLegalExperiment(s,catalog,bill);return s}
test("education lesson: committed prediction, observed outcome, reasoned disagreement and opposite-intuition transfer",()=>{
 let s=toExplain("education","for-profit-tutoring-display","exempt-on-cited-facts");
 assert.deepEqual([s.observation.predicted,s.observation.observed,s.observation.matched],["exempt-on-cited-facts","outside-section-110-1",false]);
 s=continueLegalExplanation(s);
 s=submitLegalExplanation(s,"I disagree that profit status should matter for teaching, but on these facts §110(1) does not reach it.");
 assert.equal(s.stage,"transfer");assert.equal(s.explanation.disagreesWithFixture,true);
 const candidates=transferCandidates(s);assert.ok(candidates.length>0);
 const target=candidates[0],targetCase=CASE_LIBRARY.find(c=>c.id===target);
 assert.notEqual(targetCase.naive,CASE_LIBRARY.find(c=>c.id==="for-profit-tutoring-display").naive);
 assert.throws(()=>runLegalTransfer(s,"recorded-course-video","outside-section-110-1",catalog,bill),/opposite intuition/);
 s=runLegalTransfer(s,target,OUTCOME_OPTIONS[targetCase.evaluator].options[2],catalog,bill);
 assert.equal(s.stage,"complete");assert.equal(s.transfer.agreementRequired,false);
});
test("acquisition lesson covers every acquisition, limits and model-output case",()=>{
 for(const id of LEGAL_LESSONS.acquisition.caseIds){const c=CASE_LIBRARY.find(x=>x.id===id);assert.ok(["acquisition","independent-limits","model-output"].includes(c.evaluator))}
 let s=toExplain("acquisition","pirated-dataset","lawful");
 assert.equal(s.observation.observed,"unauthorized");
 s=continueLegalExplanation(s);
 s=submitLegalExplanation(s,"Training on it is legal because the purpose is learning.");
 assert.equal(s.stage,"explain");assert.match(s.challenges[0].question,/Which cited facts/);
 s=submitLegalExplanation(s,"Training on it is legal because the purpose is learning.",{acknowledgeChallenge:true});
 assert.equal(s.explanation.challengeAcknowledged,true);
});
test("predictions are bounded, stages cannot be skipped and the direct explanation is always available",()=>{
 const s=createLegalLesson("education","streaming-buffer");
 assert.throws(()=>commitLegalPrediction(s,"not-fixed-on-cited-facts"),/not predict/);
 assert.throws(()=>commitLegalPrediction(recordLegalHypothesis(s,"abc"),"probably fine"),/offered outcomes/);
 assert.throws(()=>createLegalLesson("education","pirated-dataset"),/not part/);
 assert.match(viewLegalExplanation(s,catalog,bill).directExplanation,/not-fixed-on-cited-facts/);
});
