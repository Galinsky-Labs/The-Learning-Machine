import test from 'node:test';import assert from 'node:assert/strict';
import {createModelLesson,recordModelHypothesis,commitRetentionPredictions,recordRetentionObservations,continueToExplanation,submitRetentionExplanation,recordModelLessonTransfer,modelLessonProgress,viewModelLessonExplanation,MODEL_LESSON_EXPLANATION} from '../src/model-lesson.mjs';
import {findAbsoluteRetentionClaims} from '../src/retention.mjs';
const observed={storeExampleCountAfterDisposal:0,networkPredictionUnchanged:true,memorizerExactCopies:12,networkExactCopies:null,confidenceGap:0.52};
function toExplain(){let s=createModelLesson();s=recordModelHypothesis(s,'Deleting data deletes what the model knows.');
 s=commitRetentionPredictions(s,{networkStillWorks:false,memorizerHoldsCopies:false,networkHoldsCopies:false});s=recordRetentionObservations(s,observed);return continueToExplanation(s)}
test('complete route: hypothesis, committed predictions, observed results, qualified explanation and transfer',()=>{
 let s=toExplain();
 assert.deepEqual(s.observations.comparisons.map(c=>c.matched),[false,false,true]);
 s=submitRetentionExplanation(s,'The parameters still encode training effects, so disposal of the store does not undo learning, though I cannot see every memory copy.');
 assert.equal(s.stage,'transfer');assert.deepEqual(s.explanation.absoluteClaims,[]);
 s=recordModelLessonTransfer(s,{recordedAfterObservation:true,revision:'x'});
 assert.equal(s.stage,'complete');assert.ok(modelLessonProgress(s).every(p=>p.complete));
});
test('absolute guarantees are challenged with a question, not graded, and can be kept after acknowledgement',()=>{
 let s=toExplain();
 s=submitRetentionExplanation(s,'Once the dataset is disposed the drawings are permanently erased.');
 assert.equal(s.stage,'explain');assert.equal(s.challenges.length,1);assert.match(s.challenges[0].question,/What evidence/);
 s=submitRetentionExplanation(s,'Once the dataset is disposed the drawings are permanently erased.',{acknowledgeChallenge:true});
 assert.equal(s.stage,'transfer');assert.equal(s.explanation.challengeAcknowledged,true);
});
test('stages cannot be skipped, predictions are required before observations and the direct explanation has no guarantees',()=>{
 const s=createModelLesson();
 assert.throws(()=>recordRetentionObservations(s,observed),/not experiment/);
 assert.throws(()=>commitRetentionPredictions(recordModelHypothesis(s,'abc'),{networkStillWorks:true}),/every prediction/);
 assert.throws(()=>recordRetentionObservations(commitRetentionPredictions(recordModelHypothesis(s,'abc'),{networkStillWorks:true,memorizerHoldsCopies:true,networkHoldsCopies:false}),{...observed,networkExactCopies:3}),/executed/);
 assert.equal(viewModelLessonExplanation(s).directExplanationViewed,true);
 assert.deepEqual(findAbsoluteRetentionClaims(MODEL_LESSON_EXPLANATION),[]);
});
