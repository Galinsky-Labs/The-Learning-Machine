import test from 'node:test';import assert from 'node:assert/strict';
import {buildLessonDataset,buildLessonSplit} from '../src/lesson-data.mjs';
import {trainReferenceNetwork,classifyWithNetwork} from '../src/neural.mjs';
import {traceNetworkForward,validateMicroscopeTrace,verifyMicroscopeTrace} from '../src/microscope.mjs';
const dataset=buildLessonDataset(),split=buildLessonSplit(dataset),model=trainReferenceNetwork(dataset,split,{epochs:20}),pixels=dataset.examples[3].pixels;
test('microscope shows the executed forward pass, and its probabilities equal the classifier output',()=>{
 let t=10;const trace=traceNetworkForward(model,pixels,{now:()=>(t+=0.25),clock:'test-clock'});
 validateMicroscopeTrace(trace);assert.equal(verifyMicroscopeTrace(trace,model,pixels),true);
 const probabilities=trace.steps.find(s=>s.id==='softmax').values,result=classifyWithNetwork(model,pixels);
 assert.deepEqual(probabilities,result.classScores.map(s=>s.probability));
 const timing=trace.steps.find(s=>s.id==='timing');assert.equal(timing.kind,'measured');assert.equal(timing.value,0.25);assert.equal(timing.clock,'test-clock');
 assert.ok(trace.steps.filter(s=>s.kind==='illustration').every(s=>s.disclosure.length>10));
});
test('trace provenance validation fails on illustrations without disclosure and on fabricated values',()=>{
 const trace=traceNetworkForward(model,pixels);
 const strip=JSON.parse(JSON.stringify(trace));delete strip.steps.find(s=>s.kind==='illustration').disclosure;
 assert.throws(()=>validateMicroscopeTrace(strip),/missing its disclosure/);
 const synthetic=JSON.parse(JSON.stringify(trace));synthetic.steps.push({id:'gpu-speed',kind:'synthetic',label:'GPU speed'});
 assert.throws(()=>validateMicroscopeTrace(synthetic),/undeclared provenance/);
 const unmeasured=JSON.parse(JSON.stringify(trace));unmeasured.steps.find(s=>s.id==='timing').clock=undefined;
 assert.throws(()=>validateMicroscopeTrace(unmeasured),/value, unit and clock/);
 const invented=JSON.parse(JSON.stringify(trace));invented.steps.push({id:'speed-claim',kind:'computed',label:'Inference time',value:0.01,values:[1]});
 assert.throws(()=>validateMicroscopeTrace(invented),/must be a measurement/);
 const altered=JSON.parse(JSON.stringify(trace));altered.steps.find(s=>s.id==='logits').values[0]+=1;
 assert.equal(verifyMicroscopeTrace(altered,model,pixels),false);
});
