import test from 'node:test';import assert from 'node:assert/strict';
import {buildLessonDataset,buildLessonSplit} from '../src/lesson-data.mjs';
import {trainReferenceNetwork,classifyWithNetwork} from '../src/neural.mjs';
import {trainLinearClassifier,classifyDrawing} from '../src/classifier.mjs';
import {inspectParameters,weightGrid,parameterChange,serializeModel,deserializeModel,parameterChecksum,fnv1a32} from '../src/inspector.mjs';
const dataset=buildLessonDataset(),split=buildLessonSplit(dataset);
const network=trainReferenceNetwork(dataset,split,{epochs:20,hiddenUnits:6}),linear=trainLinearClassifier(dataset,split,{epochs:10});
test('inspector reports the exact stored parameter counts and statistics',()=>{
 const report=inspectParameters(network);
 assert.equal(report.totalParameters,6*256+6+3*6+3);
 assert.deepEqual(report.layers.map(l=>l.weightShape),[[6,256],[3,6]]);
 const flat=[...network.layers[1].weights.flat(),...network.layers[1].bias];
 assert.equal(report.layers[1].max,Math.max(...flat));assert.equal(report.layers[1].min,Math.min(...flat));
 assert.equal(inspectParameters(linear).totalParameters,3*256+3);
});
test('visual weight grids correspond cell-for-cell to stored numbers',()=>{
 for(const [model,unit] of [[network,4],[linear,2]]){
  const grid=weightGrid(model,unit),stored=model.algorithm==='multiclass-softmax-sgd-v1'?model.weights[unit]:model.layers[0].weights[unit];
  assert.equal(grid.length,16);grid.forEach((row,r)=>row.forEach((v,c)=>assert.equal(v,stored[r*16+c])));
 }
 assert.throws(()=>weightGrid(network,6),/Unknown/);
});
test('parameter change is measured against the stored initial parameters',()=>{
 const change=parameterChange(network);
 assert.equal(change.length,2);assert.ok(change.every(l=>l.changedParameters>0&&l.maxAbsChange>0));
 const untouched=trainReferenceNetwork(dataset,split,{epochs:1,hiddenUnits:6},{signal:AbortSignal.abort()});
 assert.ok(parameterChange(untouched).every(l=>l.changedParameters===0));
 assert.ok(parameterChange(linear)[0].changedParameters>0);
});
test('serialize/deserialize round-trips parameters exactly and predictions are identical',()=>{
 for(const model of [network,linear]){
  const restored=deserializeModel(serializeModel(model));
  assert.deepEqual(JSON.parse(JSON.stringify(restored)),JSON.parse(JSON.stringify(model)));
  assert.equal(parameterChecksum(restored),parameterChecksum(model));assert.ok(Object.isFrozen(restored));
  const classify=model===network?classifyWithNetwork:classifyDrawing;
  for(const e of dataset.examples)assert.deepEqual(classify(restored,e.pixels),classify(model,e.pixels));
 }
});
test('tampered, truncated or unsupported serialized models fail closed',()=>{
 const text=serializeModel(network),envelope=JSON.parse(text);
 envelope.model.layers[0].weights[0][0]+=1;assert.throws(()=>deserializeModel(JSON.stringify(envelope)),/checksum/);
 assert.throws(()=>deserializeModel(text.slice(0,50)),/valid JSON/);
 assert.throws(()=>deserializeModel(JSON.stringify({...JSON.parse(text),format:'other'})),/Unsupported/);
 const bad=JSON.parse(text);bad.model.layers[0].weights.pop();bad.checksum=fnv1a32(JSON.stringify(bad.model));
 assert.throws(()=>deserializeModel(JSON.stringify(bad)),/dimensions/);
});
