import test from 'node:test';import assert from 'node:assert/strict';
import {buildLessonDataset,buildLessonSplit} from '../src/lesson-data.mjs';
import {trainReferenceNetwork,trainNeuralNetwork} from '../src/neural.mjs';
import {loadTensorflow} from '../src/tf-loader.mjs';
import {parameterChecksum} from '../src/inspector.mjs';
import {createModelExperimentTrace,replayModelExperiment,datasetDigest,validateModelTrace} from '../src/model-trace.mjs';
import {addShapeExample,presetDrawing} from '../src/dataset.mjs';
const dataset=buildLessonDataset(),split=buildLessonSplit(dataset);
test('CPU golden run: pinned inputs reproduce the recorded parameter checksum',()=>{
 const model=trainReferenceNetwork(dataset,split,{epochs:25,hiddenUnits:8,seed:3});
 assert.equal(datasetDigest(dataset),'56179add');
 assert.equal(parameterChecksum(model),'46cb5413');
 const trace=createModelExperimentTrace(model,dataset,split);
 assert.equal(trace.schema,'tlm-model-trace-v1');assert.equal(trace.options.seed,3);assert.equal(trace.completedEpochs,25);
 assert.deepEqual(trace.split.trainIds,split.trainIds);assert.match(trace.trainingWallClockKind,/not replayed/);
 const replay=replayModelExperiment(trace,model,dataset);assert.equal(replay.status,'exact-match');assert.equal(replay.maxAbsDifference,0);
});
test('TensorFlow.js runs replay within declared tolerance and the trace states the determinism limit',async()=>{
 const model=await trainNeuralNetwork(dataset,split,{epochs:20,hiddenUnits:8},{backend:'tfjs',loadTensorflow});
 const trace=createModelExperimentTrace(model,dataset,split);
 assert.match(trace.determinism.join(' '),/float32/);
 const replay=replayModelExperiment(trace,model,dataset);
 assert.equal(replay.status,'within-tolerance');assert.ok(replay.maxAbsDifference>0&&replay.maxAbsDifference<=1e-4);
 assert.equal(replayModelExperiment(trace,model,dataset,{tolerance:1e-12}).status,'diverged');
});
test('budget-stopped runs record their actual epochs and replay that count',()=>{
 let t=0;const model=trainReferenceNetwork(dataset,split,{epochs:50,timeBudgetMs:9},{now:()=>(t+=2)});
 const trace=createModelExperimentTrace(model,dataset,split);
 assert.equal(trace.stoppedReason,'time-budget');assert.match(trace.determinism.join(' '),/device speed/);
 assert.equal(replayModelExperiment(trace,model,dataset).status,'exact-match');
});
test('changed datasets, changed parameters and unsupported traces fail closed',()=>{
 const model=trainReferenceNetwork(dataset,split,{epochs:5}),trace=createModelExperimentTrace(model,dataset,split);
 const changed=addShapeExample(dataset,'Line',presetDrawing('horizontal'));
 assert.throws(()=>replayModelExperiment(trace,model,changed),/Dataset differs/);
 const other=trainReferenceNetwork(dataset,split,{epochs:6});
 assert.throws(()=>replayModelExperiment(trace,other,dataset),/parameters differ/);
 assert.throws(()=>validateModelTrace({...trace,schema:'v0'}),/Unsupported/);
 assert.throws(()=>validateModelTrace({...trace,completedEpochs:-1}),/epoch/);
});
