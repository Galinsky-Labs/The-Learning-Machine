import test from 'node:test';import assert from 'node:assert/strict';
import {buildLessonDataset,buildLessonSplit} from '../src/lesson-data.mjs';
import {trainReferenceNetwork} from '../src/neural.mjs';
import {trainLinearClassifier,trainNearestExampleMemorizer} from '../src/classifier.mjs';
import {TRANSFER_TASKS,runTransferChallenge,recordTransferRevision} from '../src/transfer.mjs';
const dataset=buildLessonDataset(),split=buildLessonSplit(dataset);
const models={memorizer:trainNearestExampleMemorizer(dataset,split),linear:trainLinearClassifier(dataset,split),network:trainReferenceNetwork(dataset,split)};
const allPass=Object.fromEntries(TRANSFER_TASKS.map(t=>[t.id,{memorizer:true,linear:true,network:true}]));
test('transfer tasks are novel drawings, distinct from every lesson example',()=>{
 const seen=new Set(dataset.examples.map(e=>e.pixels.join('')));
 for(const task of TRANSFER_TASKS)assert.equal(seen.has(task.pixels.join('')),false,task.id);
 assert.equal(TRANSFER_TASKS.filter(t=>t.label===null).length,1);
});
test('optimistic predictions meet real generalization failures and require a cited revision',()=>{
 const result=runTransferChallenge(models,allPass);
 assert.equal(result.revisionRequired,true);assert.ok(result.unexpectedFailures.length>0);
 const failure=result.unexpectedFailures[0];
 assert.throws(()=>recordTransferRevision(result,'I would add more varied shapes.'),/Cite/);
 const revision=recordTransferRevision(result,'Shifted and resized shapes broke all three models, so position-specific pixels were learned.',{citedTaskId:failure.taskId});
 assert.equal(revision.recordedAfterObservation,true);assert.equal(revision.agreementRequired,false);
});
test('ambiguous hybrid has no ground truth and never counts as a failure or surprise',()=>{
 const row=runTransferChallenge(models,allPass).rows.find(r=>r.ambiguous);
 for(const outcome of Object.values(row.outcomes)){assert.equal(outcome.correct,null);assert.equal(outcome.surprise,false)}
});
test('accurate predictions produce no required revision; missing predictions fail closed',()=>{
 const truth=runTransferChallenge(models,allPass),exact=Object.fromEntries(truth.rows.filter(r=>!r.ambiguous).map(r=>[r.taskId,Object.fromEntries(Object.entries(r.outcomes).map(([k,v])=>[k,v.correct]))]));
 const calibrated=runTransferChallenge(models,exact);assert.equal(calibrated.revisionRequired,false);assert.equal(calibrated.surprises.length,0);
 assert.ok(recordTransferRevision(calibrated,'My predictions held; next I would test rotation.'));
 assert.throws(()=>runTransferChallenge(models,{}),/Missing prediction/);
 assert.throws(()=>runTransferChallenge({linear:models.linear},allPass),/needs/);
});
