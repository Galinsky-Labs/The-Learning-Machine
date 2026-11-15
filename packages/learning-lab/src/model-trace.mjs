import {validateHoldout} from './split.mjs';
import {NEURAL_ALGORITHM,NEURAL_LIMITS,trainReferenceNetwork,validateNeuralModel,initialNeuralParameters} from './neural.mjs';
import {fnv1a32,parameterChecksum} from './inspector.mjs';
import {PIXEL_COUNT} from './dataset.mjs';
// TLM-036: versioned, replayable model experiment traces with honest determinism limits.
export const MODEL_TRACE_SCHEMA='tlm-model-trace-v1';
export const DEFAULT_REPLAY_TOLERANCE=1e-4;
export function datasetDigest(dataset){
 if(!dataset||!Array.isArray(dataset.examples))throw new TypeError('Invalid local labeled dataset');
 return fnv1a32(JSON.stringify(dataset.examples.map(e=>[e.id,e.label,e.pixels.join('')])));
}
export function determinismNote(backend,stoppedReason){
 const notes=[];
 if(backend==='reference-float64')notes.push('The float64 reference uses a seeded initializer and a fixed example order, so the same inputs reproduce the same parameters in the same JavaScript engine.');
 else notes.push(`${backend} uses float32 kernels whose summation order can differ by device and browser; replays are compared within a stated tolerance, not bit-for-bit.`);
 if(stoppedReason==='time-budget')notes.push('Training stopped at a wall-clock budget, so the number of completed epochs depends on device speed; replay reuses the recorded epoch count.');
 if(stoppedReason==='cancelled')notes.push('Training was cancelled by the visitor; replay reuses the recorded epoch count.');
 return Object.freeze(notes);
}
export function createModelExperimentTrace(model,dataset,split){
 validateNeuralModel(model);validateHoldout(split,dataset);
 const trained=new Set(model.trainingExampleIds);
 if(trained.size!==split.trainIds.length||split.trainIds.some(id=>!trained.has(id)))throw new TypeError('Model was not trained on this split');
 return Object.freeze({schema:MODEL_TRACE_SCHEMA,algorithm:model.algorithm,backend:model.backend,fallbackReason:model.fallbackReason??null,
  options:Object.freeze({hiddenUnits:model.hiddenUnits,learningRate:model.learningRate,seed:model.seed,requestedEpochs:model.requestedEpochs,timeBudgetMs:model.timeBudgetMs}),
  completedEpochs:model.epochs,stoppedReason:model.stoppedReason,split:Object.freeze({algorithm:split.algorithm,seed:split.seed,testFraction:split.testFraction,trainIds:Object.freeze([...split.trainIds]),testIds:Object.freeze([...split.testIds])}),
  datasetDigest:datasetDigest(dataset),parameterChecksum:parameterChecksum(model),
  trainingWallClockMs:model.trainingWallClockMs,trainingWallClockKind:'measured; varies by device and is not replayed',
  determinism:determinismNote(model.backend,model.stoppedReason)});
}
export function validateModelTrace(trace){
 if(!trace||trace.schema!==MODEL_TRACE_SCHEMA||trace.algorithm!==NEURAL_ALGORITHM)throw new TypeError('Unsupported model trace version');
 if(!Number.isInteger(trace.completedEpochs)||trace.completedEpochs<0||trace.completedEpochs>NEURAL_LIMITS.maxEpochs)throw new RangeError('Invalid completed epoch count');
 if(typeof trace.datasetDigest!=='string'||typeof trace.parameterChecksum!=='string'||!Array.isArray(trace.split?.trainIds))throw new TypeError('Incomplete model trace');
 return trace;
}
// Re-runs the float64 reference with the recorded inputs and compares it with the recorded model.
export function replayModelExperiment(trace,model,dataset,{tolerance=DEFAULT_REPLAY_TOLERANCE}={}){
 validateModelTrace(trace);validateNeuralModel(model);
 if(!Number.isFinite(tolerance)||tolerance<0||tolerance>1)throw new RangeError('Tolerance must be from 0 to 1');
 if(datasetDigest(dataset)!==trace.datasetDigest)throw new TypeError('Dataset differs from the recorded experiment');
 if(parameterChecksum(model)!==trace.parameterChecksum)throw new TypeError('Model parameters differ from the recorded trace');
 let layers;
 if(trace.completedEpochs===0)layers=initialNeuralParameters(PIXEL_COUNT,trace.options.hiddenUnits,model.labels.length,trace.options.seed);
 else{
  const split={...trace.split,classes:model.labels.map(label=>({label,total:0,train:1,test:1})),warnings:[],ready:true,source:'replayed trace'};
  layers=trainReferenceNetwork(dataset,split,{hiddenUnits:trace.options.hiddenUnits,learningRate:trace.options.learningRate,seed:trace.options.seed,epochs:trace.completedEpochs,timeBudgetMs:NEURAL_LIMITS.maxTimeBudgetMs},{now:()=>0}).layers;
 }
 let max=0,count=0;
 layers.forEach((layer,i)=>{layer.weights.forEach((row,j)=>row.forEach((v,k)=>{max=Math.max(max,Math.abs(v-model.layers[i].weights[j][k]));count++}));layer.bias.forEach((v,j)=>{max=Math.max(max,Math.abs(v-model.layers[i].bias[j]));count++})});
 const exactExpected=trace.backend==='reference-float64';
 const status=max===0?'exact-match':(!exactExpected&&max<=tolerance)?'within-tolerance':'diverged';
 return Object.freeze({status,maxAbsDifference:max,tolerance:exactExpected?0:tolerance,comparedParameters:count,replayBackend:'reference-float64',
  explanation:status==='exact-match'?'The reference replay reproduced every stored parameter exactly.':status==='within-tolerance'?`Every parameter is within ${tolerance} of the float64 reference; differences come from float32 arithmetic.`:'The replay differs beyond the declared tolerance; the recorded run cannot be treated as reproduced.'});
}
