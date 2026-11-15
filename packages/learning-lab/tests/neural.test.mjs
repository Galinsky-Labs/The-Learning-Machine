import test from 'node:test';import assert from 'node:assert/strict';
import {buildLessonDataset,buildLessonSplit} from '../src/lesson-data.mjs';
import {trainReferenceNetwork,trainNeuralNetwork,classifyWithNetwork,evaluateNetworkHoldout,validateNeuralOptions,NEURAL_LIMITS} from '../src/neural.mjs';
import {loadTensorflow} from '../src/tf-loader.mjs';
const dataset=buildLessonDataset(),split=buildLessonSplit(dataset);
test('float64 reference network genuinely learns from training IDs only and is deterministic',()=>{
 const a=trainReferenceNetwork(dataset,split,{epochs:40}),b=trainReferenceNetwork(dataset,split,{epochs:40});
 assert.deepEqual(a.layers,b.layers);assert.equal(a.backend,'reference-float64');assert.equal(a.stoppedReason,'completed');
 assert.ok(a.history.at(-1).loss<a.history[0].loss/4,'loss decreases through real training');
 assert.equal(a.history.at(-1).trainingAccuracy,1);
 assert.deepEqual([...a.trainingExampleIds].sort(),[...split.trainIds].sort());
 assert.notDeepEqual(a.layers,a.initialLayers);
 const held=evaluateNetworkHoldout(a,dataset,split);assert.equal(held.exampleCount,split.testIds.length);assert.ok(held.accuracy>=0&&held.accuracy<=1);
});
test('backend can be disabled: reference mode never calls the TensorFlow.js loader',async()=>{
 let loads=0;const model=await trainNeuralNetwork(dataset,split,{epochs:5},{backend:'reference',loadTensorflow:async()=>{loads++;throw new Error('should not load')}});
 assert.equal(loads,0);assert.equal(model.backend,'reference-float64');assert.equal(model.fallbackReason,null);
});
test('failed optional TensorFlow.js load falls back to the CPU reference with a recorded reason',async()=>{
 const model=await trainNeuralNetwork(dataset,split,{epochs:5},{backend:'tfjs',loadTensorflow:async()=>{throw new Error('offline')}});
 assert.equal(model.backend,'reference-float64');assert.equal(model.fallbackReason,'offline');
 const missing=await trainNeuralNetwork(dataset,split,{epochs:5},{backend:'tfjs'});assert.match(missing.fallbackReason,/not available/);
});
test('TensorFlow.js CPU backend trains the same network within float32 tolerance of the reference',async()=>{
 const tfModel=await trainNeuralNetwork(dataset,split,{epochs:30},{backend:'tfjs',loadTensorflow});
 const reference=trainReferenceNetwork(dataset,split,{epochs:30});
 assert.equal(tfModel.backend,'tfjs-cpu');assert.equal(tfModel.fallbackReason,null);assert.equal(tfModel.epochs,30);
 let max=0;tfModel.layers.forEach((layer,i)=>layer.weights.forEach((row,j)=>row.forEach((v,k)=>{max=Math.max(max,Math.abs(v-reference.layers[i].weights[j][k]))})));
 assert.ok(max<1e-4,'max parameter difference '+max);
 for(const e of dataset.examples)assert.equal(classifyWithNetwork(tfModel,e.pixels).predictedLabel,classifyWithNetwork(reference,e.pixels).predictedLabel);
});
test('time budget and cancellation stop training honestly without corrupting the model',async()=>{
 let t=0;const model=trainReferenceNetwork(dataset,split,{epochs:100,timeBudgetMs:5},{now:()=>(t+=2)});
 assert.equal(model.stoppedReason,'time-budget');assert.ok(model.epochs<100);assert.equal(model.history.length,model.epochs);
 const controller=new AbortController();controller.abort();
 const cancelled=trainReferenceNetwork(dataset,split,{epochs:10},{signal:controller.signal});
 assert.equal(cancelled.stoppedReason,'cancelled');assert.equal(cancelled.epochs,0);assert.deepEqual(cancelled.layers,cancelled.initialLayers);
 let tfTime=0;const tfModel=await trainNeuralNetwork(dataset,split,{epochs:100,timeBudgetMs:5},{backend:'tfjs',loadTensorflow,now:()=>(tfTime+=2)});
 assert.equal(tfModel.stoppedReason,'time-budget');assert.ok(tfModel.epochs<100);
});
test('out-of-bounds options and malformed inputs fail closed',()=>{
 assert.throws(()=>validateNeuralOptions({hiddenUnits:NEURAL_LIMITS.maxHidden+1}),/Hidden units/);
 assert.throws(()=>validateNeuralOptions({epochs:0}),/Epochs/);
 assert.throws(()=>validateNeuralOptions({learningRate:Infinity}),/Learning rate/);
 assert.throws(()=>validateNeuralOptions({timeBudgetMs:NEURAL_LIMITS.maxTimeBudgetMs+1}),/Time budget/);
 const model=trainReferenceNetwork(dataset,split,{epochs:2});
 assert.throws(()=>classifyWithNetwork(model,[1,0]),/16×16/);
 assert.throws(()=>classifyWithNetwork({...model,layers:[model.layers[0]]},dataset.examples[0].pixels),/Invalid neural network/);
 assert.rejects(()=>trainNeuralNetwork(dataset,split,{},{backend:'gpu-only'}),/Backend/);
});
