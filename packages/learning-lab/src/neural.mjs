import {validateHoldout} from './split.mjs';
import {PIXEL_COUNT} from './dataset.mjs';
// TLM-033: a genuine small two-layer neural network (256 → hidden ReLU → softmax).
// The float64 reference trainer always exists; the TensorFlow.js trainer is optional, lazily loaded and bounded.
export const NEURAL_ALGORITHM='mlp-relu-softmax-v1';
export const NEURAL_LIMITS=Object.freeze({minHidden:2,maxHidden:32,maxEpochs:200,maxExamples:64,maxTimeBudgetMs:8000,defaultTimeBudgetMs:3000});
export const NEURAL_CAVEATS=Object.freeze([
 'Parameters were learned only from the selected browser-local training examples.',
 'TensorFlow.js uses float32 arithmetic and backend-specific kernels, so its parameters differ slightly from the float64 reference.',
 'A trained network can still encode information about individual training examples; training is not deletion of the source.'
]);
function seeded(seed){let value=seed>>>0;return ()=>{value=(value+0x6d2b79f5)>>>0;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
function int(value,name,min,max){if(!Number.isInteger(value)||value<min||value>max)throw new RangeError(`${name} must be an integer from ${min} to ${max}`);return value}
export function validateNeuralOptions({hiddenUnits=12,epochs=60,learningRate=0.5,seed=7,timeBudgetMs=NEURAL_LIMITS.defaultTimeBudgetMs}={}){
 int(hiddenUnits,'Hidden units',NEURAL_LIMITS.minHidden,NEURAL_LIMITS.maxHidden);
 int(epochs,'Epochs',1,NEURAL_LIMITS.maxEpochs);
 if(!Number.isFinite(learningRate)||learningRate<0.01||learningRate>2)throw new RangeError('Learning rate must be from 0.01 to 2');
 int(seed,'Seed',0,2147483647);
 int(timeBudgetMs,'Time budget',1,NEURAL_LIMITS.maxTimeBudgetMs);
 return Object.freeze({hiddenUnits,epochs,learningRate,seed,timeBudgetMs});
}
function verifyPixels(pixels){if(!Array.isArray(pixels)||pixels.length!==PIXEL_COUNT||pixels.some(v=>v!==0&&v!==1))throw new TypeError('Expected a binary 16×16 drawing')}
export function prepareTrainingSet(dataset,split){
 validateHoldout(split,dataset);
 if(!split.ready)throw new RangeError('At least two classes with both training and held-out examples are required');
 if(dataset.examples.length>NEURAL_LIMITS.maxExamples)throw new RangeError('Too many examples for the bounded network');
 const labels=split.classes.map(c=>c.label);
 if(labels.length<2||labels.length>16||new Set(labels).size!==labels.length)throw new RangeError('Network supports 2–16 unique classes');
 const byId=new Map(dataset.examples.map(e=>[e.id,e]));
 const training=split.trainIds.map(id=>{const e=byId.get(id);if(!e)throw new TypeError('Split references unknown examples');verifyPixels(e.pixels);return e});
 if(labels.some(label=>!training.some(e=>e.label===label)))throw new RangeError('Every class requires training examples');
 return Object.freeze({labels:Object.freeze(labels),inputs:training.map(e=>e.pixels),targets:training.map(e=>labels.indexOf(e.label)),trainingExampleIds:Object.freeze([...split.trainIds])});
}
export function initialNeuralParameters(inputSize,hiddenUnits,classCount,seed){
 const random=seeded(seed),layer=(rows,cols)=>{const limit=Math.sqrt(6/(rows+cols));return Array.from({length:rows},()=>Array.from({length:cols},()=>(random()*2-1)*limit))};
 return [{name:'hidden',activation:'relu',weights:layer(hiddenUnits,inputSize),bias:Array(hiddenUnits).fill(0)},
  {name:'output',activation:'softmax',weights:layer(classCount,hiddenUnits),bias:Array(classCount).fill(0)}];
}
function softmax(raw){const peak=Math.max(...raw),exps=raw.map(v=>Math.exp(v-peak)),total=exps.reduce((a,b)=>a+b,0);return exps.map(v=>v/total)}
export function forwardPass(layers,pixels){
 const [hidden,output]=layers;
 const preActivation=hidden.weights.map((row,j)=>{let n=hidden.bias[j];for(let i=0;i<row.length;i++)if(pixels[i])n+=row[i];return n});
 const activation=preActivation.map(v=>v>0?v:0);
 const logits=output.weights.map((row,k)=>{let n=output.bias[k];for(let j=0;j<row.length;j++)n+=row[j]*activation[j];return n});
 return {preActivation,activation,logits,probabilities:softmax(logits)};
}
function evaluate(layers,set){
 let loss=0,correct=0;
 set.inputs.forEach((x,n)=>{const p=forwardPass(layers,x).probabilities,t=set.targets[n];loss-=Math.log(Math.max(p[t],1e-12));if(p.indexOf(Math.max(...p))===t)correct++});
 return {loss:loss/set.inputs.length,accuracy:correct/set.inputs.length};
}
const clone=layers=>layers.map(l=>({name:l.name,activation:l.activation,weights:l.weights.map(r=>r.slice()),bias:l.bias.slice()}));
const freezeLayers=layers=>Object.freeze(layers.map(l=>Object.freeze({name:l.name,activation:l.activation,weights:Object.freeze(l.weights.map(r=>Object.freeze([...r]))),bias:Object.freeze([...l.bias])})));
function finalize({set,options,layers,initial,history,backend,stoppedReason,elapsedMs,fallbackReason=null}){
 return Object.freeze({algorithm:NEURAL_ALGORITHM,backend,labels:set.labels,hiddenUnits:options.hiddenUnits,seed:options.seed,learningRate:options.learningRate,
  requestedEpochs:options.epochs,epochs:history.length,stoppedReason,fallbackReason,timeBudgetMs:options.timeBudgetMs,
  trainingWallClockMs:elapsedMs,trainingWallClockKind:'measured',inputShape:Object.freeze([16,16]),
  layers:freezeLayers(layers),initialLayers:freezeLayers(initial),history:Object.freeze(history.map(h=>Object.freeze(h))),
  trainingExampleIds:set.trainingExampleIds,caveats:NEURAL_CAVEATS,
  source:'full-batch gradient descent over browser-local training examples only'});
}
const defaultNow=()=>globalThis.performance?.now?.()??Date.now();
// Deterministic float64 reference: always available, needs no download, used as the CPU fallback.
export function trainReferenceNetwork(dataset,split,rawOptions={},{now=defaultNow,signal}={}){
 const options=validateNeuralOptions(rawOptions),set=prepareTrainingSet(dataset,split);
 const initial=initialNeuralParameters(PIXEL_COUNT,options.hiddenUnits,set.labels.length,options.seed),layers=clone(initial),history=[];
 const started=now(),N=set.inputs.length,[hidden,output]=layers;let stoppedReason='completed';
 for(let epoch=0;epoch<options.epochs;epoch++){
  if(signal?.aborted){stoppedReason='cancelled';break}
  if(now()-started>options.timeBudgetMs){stoppedReason='time-budget';break}
  const gW1=hidden.weights.map(r=>new Float64Array(r.length)),gb1=new Float64Array(hidden.bias.length),gW2=output.weights.map(r=>new Float64Array(r.length)),gb2=new Float64Array(output.bias.length);
  set.inputs.forEach((x,n)=>{
   const f=forwardPass(layers,x),dz2=f.probabilities.map((p,k)=>(p-(k===set.targets[n]?1:0))/N);
   for(let k=0;k<dz2.length;k++){gb2[k]+=dz2[k];for(let j=0;j<f.activation.length;j++)gW2[k][j]+=dz2[k]*f.activation[j]}
   for(let j=0;j<f.activation.length;j++){
    if(f.preActivation[j]<=0)continue;
    let dh=0;for(let k=0;k<dz2.length;k++)dh+=output.weights[k][j]*dz2[k];
    gb1[j]+=dh;for(let i=0;i<PIXEL_COUNT;i++)if(x[i])gW1[j][i]+=dh;
   }
  });
  const lr=options.learningRate;
  hidden.weights.forEach((r,j)=>{for(let i=0;i<r.length;i++)r[i]-=lr*gW1[j][i];hidden.bias[j]-=lr*gb1[j]});
  output.weights.forEach((r,k)=>{for(let j=0;j<r.length;j++)r[j]-=lr*gW2[k][j];output.bias[k]-=lr*gb2[k]});
  const state=evaluate(layers,set);history.push({epoch:epoch+1,loss:state.loss,trainingAccuracy:state.accuracy});
 }
 return finalize({set,options,layers,initial,history,backend:'reference-float64',stoppedReason,elapsedMs:now()-started});
}
// Optional TensorFlow.js trainer with the same architecture, initial parameters and full-batch update rule.
async function trainWithTensorflow(tf,set,options,{now,signal}){
 const initial=initialNeuralParameters(PIXEL_COUNT,options.hiddenUnits,set.labels.length,options.seed);
 const transpose=m=>m[0].map((_,c)=>m.map(r=>r[c]));
 const xs=tf.tensor2d(set.inputs,[set.inputs.length,PIXEL_COUNT]),ys=tf.oneHot(tf.tensor1d(set.targets,'int32'),set.labels.length);
 const w1=tf.variable(tf.tensor2d(transpose(initial[0].weights))),b1=tf.variable(tf.zeros([options.hiddenUnits])),w2=tf.variable(tf.tensor2d(transpose(initial[1].weights))),b2=tf.variable(tf.zeros([set.labels.length]));
 const N=set.inputs.length,params=[w1,b1,w2,b2];
 // Explicit backpropagation with the same equations as the float64 reference (no hidden autodiff registry).
 const forward=()=>{const z1=tf.add(tf.matMul(xs,w1),b1),h=tf.relu(z1),z2=tf.add(tf.matMul(h,w2),b2);return {z1,h,z2}};
 const history=[],started=now();let stoppedReason='completed';
 try{
  for(let epoch=0;epoch<options.epochs;epoch++){
   if(signal?.aborted){stoppedReason='cancelled';break}
   if(now()-started>options.timeBudgetMs){stoppedReason='time-budget';break}
   tf.tidy(()=>{
    const {z1,h,z2}=forward(),dz2=tf.div(tf.sub(tf.softmax(z2),ys),N);
    const gW2=tf.matMul(h,dz2,true,false),gb2=tf.sum(dz2,0),dz1=tf.mul(tf.matMul(dz2,w2,false,true),tf.cast(tf.greater(z1,0),'float32'));
    const gW1=tf.matMul(xs,dz1,true,false),gb1=tf.sum(dz1,0),grads=[gW1,gb1,gW2,gb2];
    params.forEach((v,i)=>v.assign(tf.sub(v,tf.mul(grads[i],options.learningRate))));
   });
   const [loss,accuracy]=tf.tidy(()=>{const {z2}=forward();return [tf.neg(tf.mean(tf.sum(tf.mul(ys,tf.logSoftmax(z2)),1))),tf.mean(tf.cast(tf.equal(tf.argMax(z2,1),tf.argMax(ys,1)),'float32'))]});
   const values=[(await loss.data())[0],(await accuracy.data())[0]];loss.dispose();accuracy.dispose();
   history.push({epoch:epoch+1,loss:values[0],trainingAccuracy:values[1]});
  }
  const [W1,B1,W2,B2]=await Promise.all([w1.array(),b1.array(),w2.array(),b2.array()]);
  const layers=[{name:'hidden',activation:'relu',weights:transpose(W1),bias:B1},{name:'output',activation:'softmax',weights:transpose(W2),bias:B2}];
  return finalize({set,options,layers,initial,history,backend:'tfjs-'+tf.getBackend(),stoppedReason,elapsedMs:now()-started});
 }finally{tf.dispose([xs,ys,w1,b1,w2,b2])}
}
// Entry point. backend:'reference' never loads TensorFlow.js; backend:'tfjs' loads it lazily and falls back to the reference trainer.
export async function trainNeuralNetwork(dataset,split,rawOptions={},{backend='reference',loadTensorflow,now=defaultNow,signal}={}){
 const options=validateNeuralOptions(rawOptions),set=prepareTrainingSet(dataset,split);
 if(backend!=='reference'&&backend!=='tfjs')throw new TypeError('Backend must be reference or tfjs');
 if(backend==='reference')return trainReferenceNetwork(dataset,split,options,{now,signal});
 let tf,fallbackReason=null;
 try{
  if(typeof loadTensorflow!=='function')throw new Error('TensorFlow.js loader is not available');
  tf=await loadTensorflow();
  if(!tf||typeof tf.matMul!=='function'||typeof tf.variable!=='function')throw new Error('TensorFlow.js failed to initialize');
 }catch(error){fallbackReason=error instanceof Error?error.message:'TensorFlow.js unavailable'}
 if(!fallbackReason){
  try{return await trainWithTensorflow(tf,set,options,{now,signal})}
  catch(error){fallbackReason='TensorFlow.js training failed: '+(error instanceof Error?error.message:'unknown error')}
 }
 const fallback=trainReferenceNetwork(dataset,split,options,{now,signal});
 return Object.freeze({...fallback,fallbackReason});
}
export function validateNeuralModel(model){
 if(!model||model.algorithm!==NEURAL_ALGORITHM||!Array.isArray(model.labels)||!Array.isArray(model.layers)||model.layers.length!==2)throw new TypeError('Invalid neural network');
 const [h,o]=model.layers,H=model.hiddenUnits,C=model.labels.length;
 const finiteRows=(rows,r,c)=>Array.isArray(rows)&&rows.length===r&&rows.every(row=>Array.isArray(row)&&row.length===c&&row.every(Number.isFinite));
 const finiteVector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
 if(!Number.isInteger(H)||H<NEURAL_LIMITS.minHidden||H>NEURAL_LIMITS.maxHidden||C<2||C>16||h?.activation!=='relu'||o?.activation!=='softmax'
  ||!finiteRows(h.weights,H,PIXEL_COUNT)||!finiteVector(h.bias,H)||!finiteRows(o.weights,C,H)||!finiteVector(o.bias,C))throw new TypeError('Invalid neural network dimensions');
 return model;
}
export function classifyWithNetwork(model,pixels){
 validateNeuralModel(model);verifyPixels(pixels);
 const p=forwardPass(model.layers,pixels).probabilities,winner=p.indexOf(Math.max(...p));
 return Object.freeze({predictedLabel:model.labels[winner],confidence:p[winner],classScores:Object.freeze(model.labels.map((label,i)=>Object.freeze({label,probability:p[i]}))),origin:'computed-from-learned-parameters'});
}
export function evaluateNetworkHoldout(model,dataset,split){
 validateHoldout(split,dataset);validateNeuralModel(model);
 const byId=new Map(dataset.examples.map(e=>[e.id,e]));let correct=0;
 const predictions=split.testIds.map(id=>{const e=byId.get(id),r=classifyWithNetwork(model,e.pixels),ok=r.predictedLabel===e.label;if(ok)correct++;return Object.freeze({id,actualLabel:e.label,predictedLabel:r.predictedLabel,confidence:r.confidence,correct:ok})});
 return Object.freeze({exampleCount:predictions.length,correctCount:correct,accuracy:predictions.length?correct/predictions.length:null,predictions:Object.freeze(predictions),source:'computed from held-out examples excluded from training'});
}
