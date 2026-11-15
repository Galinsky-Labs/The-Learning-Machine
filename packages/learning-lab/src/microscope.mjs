import {PIXEL_COUNT} from './dataset.mjs';
import {forwardPass,validateNeuralModel} from './neural.mjs';
// TLM-037: instrumented forward pass. Every displayed step is either an executed computation, a measurement with
// its clock, or an illustration that must carry a disclosure. Nothing is fabricated.
export const MICROSCOPE_SCHEMA='tlm-microscope-v1';
export const STEP_KINDS=Object.freeze(['input','computed','measured','illustration']);
export function traceNetworkForward(model,pixels,{now=()=>globalThis.performance?.now?.()??Date.now(),clock='performance.now'}={}){
 validateNeuralModel(model);
 if(!Array.isArray(pixels)||pixels.length!==PIXEL_COUNT||pixels.some(v=>v!==0&&v!==1))throw new TypeError('Expected a binary 16×16 drawing');
 const started=now(),f=forwardPass(model.layers,pixels),elapsed=now()-started;
 const active=f.activation.filter(v=>v>0).length;
 const steps=[
  {id:'input',kind:'input',label:'Input pixels',values:[...pixels],description:`${pixels.filter(Boolean).length} of 256 pixels are filled.`},
  {id:'hidden-sum',kind:'computed',label:'Hidden weighted sums',values:f.preActivation,operation:'bias + Σ weight × pixel for each hidden unit',multiplyAdds:model.hiddenUnits*PIXEL_COUNT},
  {id:'relu',kind:'computed',label:'ReLU activation',values:f.activation,operation:'max(0, sum)',description:`${active} of ${model.hiddenUnits} hidden units are active.`},
  {id:'logits',kind:'computed',label:'Class scores (logits)',values:f.logits,operation:'bias + Σ weight × activation for each class',multiplyAdds:model.labels.length*model.hiddenUnits},
  {id:'softmax',kind:'computed',label:'Probabilities',values:f.probabilities,operation:'exp(score) / Σ exp(score)',labels:[...model.labels]},
  {id:'timing',kind:'measured',label:'Forward-pass time',value:elapsed,unit:'ms',clock,description:'One measurement on this device; timer resolution is coarsened by browsers.'},
  {id:'flow-diagram',kind:'illustration',label:'Arrows between layers',disclosure:'The arrows are a diagram of the connection pattern, not a recording of electrical activity or of every multiplication.'}
 ];
 return Object.freeze({schema:MICROSCOPE_SCHEMA,algorithm:model.algorithm,backendForTrace:'reference-float64 forward pass on stored parameters',steps:Object.freeze(steps.map(s=>Object.freeze(s)))});
}
export function validateMicroscopeTrace(trace){
 if(!trace||trace.schema!==MICROSCOPE_SCHEMA||!Array.isArray(trace.steps)||trace.steps.length===0)throw new TypeError('Unsupported microscope trace');
 const ids=new Set();
 for(const step of trace.steps){
  if(!step||typeof step.id!=='string'||ids.has(step.id))throw new TypeError('Microscope steps need unique IDs');ids.add(step.id);
  if(!STEP_KINDS.includes(step.kind))throw new TypeError(`Step ${step.id} has an undeclared provenance kind`);
  if(step.kind==='illustration'&&(typeof step.disclosure!=='string'||step.disclosure.trim().length<10))throw new TypeError(`Illustration ${step.id} is missing its disclosure`);
  if(step.kind==='measured'&&(!Number.isFinite(step.value)||step.value<0||typeof step.unit!=='string'||typeof step.clock!=='string'))throw new TypeError(`Measurement ${step.id} needs a value, unit and clock`);
  if((step.kind==='computed'||step.kind==='input')&&(!Array.isArray(step.values)||!step.values.every(Number.isFinite)))throw new TypeError(`Computed step ${step.id} must carry its executed values`);
  if(step.kind!=='measured'&&'value' in step&&/time|ms|speed|latency/i.test(step.label))throw new TypeError(`Performance figure ${step.id} must be a measurement`);
 }
 return trace;
}
// Recomputes the forward pass and confirms the displayed values are exactly the executed ones.
export function verifyMicroscopeTrace(trace,model,pixels){
 validateMicroscopeTrace(trace);
 const f=forwardPass(model.layers,pixels),expected={input:pixels,'hidden-sum':f.preActivation,relu:f.activation,logits:f.logits,softmax:f.probabilities};
 for(const [id,values] of Object.entries(expected)){
  const step=trace.steps.find(s=>s.id===id);
  if(!step||step.values.length!==values.length||step.values.some((v,i)=>v!==values[i]))return false;
 }
 return true;
}
