import {PIXEL_COUNT} from './dataset.mjs';
import {validateHoldout} from './split.mjs';
import {NEURAL_ALGORITHM,classifyWithNetwork,validateNeuralModel} from './neural.mjs';
import {classifyDrawing} from './classifier.mjs';
import {inspectParameters} from './inspector.mjs';
// TLM-035: application-store disposal of training data versus the retained learned model.
export const RETENTION_DISCLOSURES=Object.freeze([
 'Disposal removes the training drawings and split from this page\'s application store. It does not guarantee that the browser has physically overwritten every copy in memory.',
 'The trained model is kept. Removing its training data does not undo, or "unlearn", what training changed in its parameters.',
 'A model that stores examples, like the nearest-example memorizer, still contains exact copies after the dataset is disposed.',
 'Retention measurements below describe only this small lesson dataset; they are not a general rule for all models.'
]);
const ABSOLUTE_CLAIMS=[/permanently (erased|deleted|removed)/i,/guarantee[sd]? (that )?(the )?(data|it|everything|deletion|erasure)/i,/completely (erased|forgotten|unlearned)/i,/(fully|totally) unlearn/i,/can ?not (ever )?be recovered/i,/no trace (remains|is left)/i,/wiped from memory/i];
export function findAbsoluteRetentionClaims(text){
 if(typeof text!=='string')throw new TypeError('Text required');
 const negated=/\b(not|never|no|cannot|can't|doesn't|does not|isn't)\b[^.]{0,40}$/i;
 return ABSOLUTE_CLAIMS.flatMap(pattern=>{const m=text.match(pattern);if(!m)return [];const before=text.slice(0,m.index);return negated.test(before)?[]:[m[0]]});
}
const isMemorizer=m=>m?.algorithm==='nearest-example-memorizer-v1';
function modelSummary(name,model){
 if(isMemorizer(model))return Object.freeze({name,algorithm:model.algorithm,storesExamplesVerbatim:true,storedExampleCount:model.trainingExamples.length,parameterCount:model.trainingExamples.length*PIXEL_COUNT});
 return Object.freeze({name,algorithm:model.algorithm,storesExamplesVerbatim:false,storedExampleCount:0,parameterCount:inspectParameters(model).totalParameters});
}
export function createLocalTrainingStore(dataset,split){
 validateHoldout(split,dataset);
 return Object.freeze({examples:Object.freeze([...dataset.examples]),split,models:Object.freeze({}),disposal:null});
}
export function storeModel(store,name,model){
 if(!store||!store.models)throw new TypeError('Invalid training store');
 if(typeof name!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(name))throw new TypeError('Model name must be a short lowercase identifier');
 if(!model||typeof model.algorithm!=='string')throw new TypeError('Invalid model');
 return Object.freeze({...store,models:Object.freeze({...store.models,[name]:model})});
}
export function disposeTrainingData(store){
 if(!store||!Array.isArray(store.examples))throw new TypeError('Invalid training store');
 if(store.disposal)throw new RangeError('Training data was already disposed');
 return Object.freeze({examples:Object.freeze([]),split:null,models:store.models,
  disposal:Object.freeze({removedExampleCount:store.examples.length,removedSplit:Boolean(store.split),scope:'application store references only',physicalErasureGuaranteed:false,modelsRetained:Object.keys(store.models).length})});
}
export function inspectStore(store){
 if(!store||!Array.isArray(store.examples))throw new TypeError('Invalid training store');
 return Object.freeze({exampleCount:store.examples.length,hasSplit:Boolean(store.split),disposal:store.disposal,
  models:Object.freeze(Object.entries(store.models).map(([name,model])=>modelSummary(name,model))),disclosures:RETENTION_DISCLOSURES});
}
function hamming(a,b){let d=0;for(let i=0;i<PIXEL_COUNT;i++)if(a[i]!==b[i])d++;return d}
function predict(model,pixels){return model.algorithm===NEURAL_ALGORITHM?classifyWithNetwork(model,pixels):classifyDrawing(model,pixels)}
// Measures what this specific model still reveals about its training examples. Run while the data is still present.
export function auditRetention(model,dataset,split){
 validateHoldout(split,dataset);
 const byId=new Map(dataset.examples.map(e=>[e.id,e])),train=split.trainIds.map(id=>byId.get(id)),held=split.testIds.map(id=>byId.get(id));
 if(isMemorizer(model)){
  const exact=train.filter(e=>model.trainingExamples.some(s=>hamming(s.pixels,e.pixels)===0)).length;
  return Object.freeze({algorithm:model.algorithm,kind:'verbatim-storage',trainingExampleCount:train.length,exactCopiesRecoverable:exact,
   summary:`${exact} of ${train.length} training drawings can be read back exactly from the stored model.`,origin:'computed'});
 }
 if(model.algorithm===NEURAL_ALGORITHM)validateNeuralModel(model);
 const mean=list=>list.reduce((n,e)=>{const r=predict(model,e.pixels);return n+(r.classScores.find(s=>s.label===e.label)?.probability??0)},0)/list.length;
 const trainConfidence=mean(train),heldOutConfidence=mean(held);
 // Template reconstruction: the pixels whose stored first-layer weights most favour a class (linear models only).
 let templateSimilarity=null;
 if(model.algorithm==='multiclass-softmax-sgd-v1'){
  templateSimilarity=model.labels.map((label,k)=>{
   const examples=train.filter(e=>e.label===label),count=Math.round(examples.reduce((n,e)=>n+e.pixels.reduce((a,b)=>a+b,0),0)/examples.length);
   const order=model.weights[k].map((w,i)=>[w,i]).sort((a,b)=>b[0]-a[0]).slice(0,count).map(x=>x[1]),template=Array(PIXEL_COUNT).fill(0);for(const i of order)template[i]=1;
   const best=Math.min(...examples.map(e=>hamming(template,e.pixels)));
   return Object.freeze({label,closestTrainingDistance:best,pixelsCompared:PIXEL_COUNT});
  });
 }
 return Object.freeze({algorithm:model.algorithm,kind:'learned-parameters',trainingExampleCount:train.length,exactCopiesRecoverable:null,
  meanTrainingConfidence:trainConfidence,meanHeldOutConfidence:heldOutConfidence,confidenceGap:trainConfidence-heldOutConfidence,templateSimilarity:templateSimilarity&&Object.freeze(templateSimilarity),
  summary:`No exact drawing is stored, but the model is on average ${(100*(trainConfidence-heldOutConfidence)).toFixed(1)} percentage points more confident on its training drawings than on unseen ones—a signal that can reveal membership.`,
  origin:'computed'});
}
