import {GRID_SIZE,PIXEL_COUNT} from './dataset.mjs';
import {NEURAL_ALGORITHM,validateNeuralModel} from './neural.mjs';
// TLM-034: inspect, serialize and restore the actual stored numerical parameters of local models.
export const MODEL_FORMAT='tlm-model-v1';
export function fnv1a32(text){
 if(typeof text!=='string')throw new TypeError('Checksum input must be text');
 let hash=0x811c9dc5;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0}
 return hash.toString(16).padStart(8,'0');
}
function validateLinearModel(model){
 if(!model||model.algorithm!=='multiclass-softmax-sgd-v1'||!Array.isArray(model.labels)||!Array.isArray(model.weights)||!Array.isArray(model.bias))throw new TypeError('Invalid linear classifier');
 if(model.labels.length<2||model.weights.length!==model.labels.length||model.bias.length!==model.labels.length||model.weights.some(r=>!Array.isArray(r)||r.length!==PIXEL_COUNT||!r.every(Number.isFinite))||!model.bias.every(Number.isFinite))throw new TypeError('Invalid linear classifier dimensions');
 return model;
}
function layersOf(model){
 if(model?.algorithm===NEURAL_ALGORITHM){validateNeuralModel(model);return model.layers}
 validateLinearModel(model);return [{name:'output',activation:'softmax',weights:model.weights,bias:model.bias}];
}
function initialLayersOf(model){
 if(model.algorithm===NEURAL_ALGORITHM)return model.initialLayers;
 return [{name:'output',activation:'softmax',weights:model.weights.map(r=>r.map(()=>0)),bias:model.bias.map(()=>0)}];// linear SGD starts from zeros
}
function stats(values){
 let min=Infinity,max=-Infinity,abs=0,sq=0;for(const v of values){if(v<min)min=v;if(v>max)max=v;abs+=Math.abs(v);sq+=v*v}
 return {min,max,meanAbs:abs/values.length,l2:Math.sqrt(sq)};
}
export function inspectParameters(model){
 const layers=layersOf(model).map(layer=>{
  const values=[...layer.weights.flat(),...layer.bias];
  return Object.freeze({name:layer.name,activation:layer.activation,weightShape:Object.freeze([layer.weights.length,layer.weights[0].length]),biasLength:layer.bias.length,parameterCount:values.length,...stats(values)});
 });
 return Object.freeze({algorithm:model.algorithm,labels:Object.freeze([...model.labels]),layers:Object.freeze(layers),totalParameters:layers.reduce((n,l)=>n+l.parameterCount,0),
  source:'read directly from the stored trained parameters'});
}
// Returns the stored first-layer weights for one unit/class as a 16×16 grid; each cell is the exact stored number.
export function weightGrid(model,unit){
 const first=layersOf(model)[0];
 if(!Number.isInteger(unit)||unit<0||unit>=first.weights.length)throw new RangeError('Unknown first-layer unit');
 const row=first.weights[unit];
 return Object.freeze(Array.from({length:GRID_SIZE},(_,r)=>Object.freeze(row.slice(r*GRID_SIZE,(r+1)*GRID_SIZE))));
}
export function parameterChange(model){
 const after=layersOf(model),before=initialLayersOf(model);
 if(!Array.isArray(before)||before.length!==after.length)throw new TypeError('Initial parameters are unavailable');
 return Object.freeze(after.map((layer,i)=>{
  const a=[...layer.weights.flat(),...layer.bias],b=[...before[i].weights.flat(),...before[i].bias];
  if(a.length!==b.length)throw new TypeError('Initial parameters do not match trained dimensions');
  let changed=0,sum=0,max=0;a.forEach((v,j)=>{const d=Math.abs(v-b[j]);if(d>1e-12)changed++;sum+=d;if(d>max)max=d});
  return Object.freeze({name:layer.name,changedParameters:changed,parameterCount:a.length,meanAbsChange:sum/a.length,maxAbsChange:max});
 }));
}
const deepFreeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const x of Object.values(v))deepFreeze(x)}return v};
export function serializeModel(model){
 layersOf(model);
 const body=JSON.stringify(model);
 return JSON.stringify({format:MODEL_FORMAT,checksum:fnv1a32(body),checksumKind:'fnv1a-32 integrity check, not cryptographic',model:JSON.parse(body)});
}
export function deserializeModel(text){
 if(typeof text!=='string'||text.length>2_000_000)throw new TypeError('Serialized model must be text under 2 MB');
 let envelope;try{envelope=JSON.parse(text)}catch{throw new TypeError('Serialized model is not valid JSON')}
 if(!envelope||envelope.format!==MODEL_FORMAT||typeof envelope.checksum!=='string'||!envelope.model)throw new TypeError('Unsupported serialized model format');
 if(fnv1a32(JSON.stringify(envelope.model))!==envelope.checksum)throw new TypeError('Serialized model checksum mismatch');
 const model=deepFreeze(envelope.model);layersOf(model);return model;
}
export function parameterChecksum(model){return fnv1a32(JSON.stringify(layersOf(model).map(l=>[l.weights,l.bias])))}
