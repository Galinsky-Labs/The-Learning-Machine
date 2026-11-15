import test from 'node:test';import assert from 'node:assert/strict';
import {buildLessonDataset,buildLessonSplit} from '../src/lesson-data.mjs';
import {trainReferenceNetwork,classifyWithNetwork} from '../src/neural.mjs';
import {trainLinearClassifier,trainNearestExampleMemorizer,classifyNearestExample} from '../src/classifier.mjs';
import {createLocalTrainingStore,storeModel,disposeTrainingData,inspectStore,auditRetention,findAbsoluteRetentionClaims,RETENTION_DISCLOSURES} from '../src/retention.mjs';
const dataset=buildLessonDataset(),split=buildLessonSplit(dataset);
const network=trainReferenceNetwork(dataset,split,{epochs:30}),memorizer=trainNearestExampleMemorizer(dataset,split),linear=trainLinearClassifier(dataset,split);
test('disposal empties the application store but the learned models are retained and still work',()=>{
 let store=createLocalTrainingStore(dataset,split);store=storeModel(store,'network',network);store=storeModel(store,'memorizer',memorizer);
 assert.equal(inspectStore(store).exampleCount,18);
 const disposed=disposeTrainingData(store),report=inspectStore(disposed);
 assert.equal(report.exampleCount,0);assert.equal(report.hasSplit,false);assert.equal(report.models.length,2);
 assert.equal(report.disposal.removedExampleCount,18);assert.equal(report.disposal.physicalErasureGuaranteed,false);
 assert.equal(report.models.find(m=>m.name==='memorizer').storesExamplesVerbatim,true);
 assert.equal(report.models.find(m=>m.name==='memorizer').storedExampleCount,split.trainIds.length);
 const probe=dataset.examples[0].pixels;
 assert.equal(classifyWithNetwork(disposed.models.network,probe).predictedLabel,classifyWithNetwork(network,probe).predictedLabel);
 assert.equal(classifyNearestExample(disposed.models.memorizer,dataset.examples.find(e=>split.trainIds.includes(e.id)).pixels).nearestDistance,0);
 assert.throws(()=>disposeTrainingData(disposed),/already disposed/);
});
test('retention audit distinguishes verbatim storage from learned parameters with measured signals',()=>{
 const m=auditRetention(memorizer,dataset,split);assert.equal(m.kind,'verbatim-storage');assert.equal(m.exactCopiesRecoverable,split.trainIds.length);
 for(const model of [network,linear]){
  const a=auditRetention(model,dataset,split);assert.equal(a.kind,'learned-parameters');assert.equal(a.exactCopiesRecoverable,null);
  assert.ok(a.meanTrainingConfidence>a.meanHeldOutConfidence,'training examples remain detectable by confidence');
 }
 assert.equal(auditRetention(linear,dataset,split).templateSimilarity.length,3);
});
test('disclosures never promise guaranteed physical erasure or unlearning',()=>{
 for(const text of RETENTION_DISCLOSURES)assert.deepEqual(findAbsoluteRetentionClaims(text),[],text);
 assert.match(RETENTION_DISCLOSURES.join(' '),/does not guarantee/);assert.match(RETENTION_DISCLOSURES.join(' '),/unlearn/);
 assert.deepEqual(findAbsoluteRetentionClaims('Disposing the dataset means the drawings are permanently erased.'),['permanently erased']);
 assert.deepEqual(findAbsoluteRetentionClaims('The model is fully unlearned after deletion.'),['fully unlearn']);
 assert.deepEqual(findAbsoluteRetentionClaims('Deletion is not permanently erased memory.'),[]);
});
test('invalid stores and names fail closed',()=>{
 assert.throws(()=>storeModel(createLocalTrainingStore(dataset,split),'Bad Name',network),/identifier/);
 assert.throws(()=>inspectStore({}),/Invalid/);assert.throws(()=>createLocalTrainingStore(dataset,{trainIds:[],testIds:[]}),/Split/);
});
