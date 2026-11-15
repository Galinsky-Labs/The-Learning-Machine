import {NEURAL_LIMITS} from './neural.mjs';
import {PIXEL_COUNT} from './dataset.mjs';
// TLM-040: bounded compute planning, capability detection and a terminating worker controller.
export const WORK_LIMITS=Object.freeze({standardMaxMultiplyAdds:120_000_000,lowPowerMaxMultiplyAdds:20_000_000,lowPowerMaxHidden:8,lowPowerMaxEpochs:40,lowPowerTimeBudgetMs:1500,workerGraceMs:500});
export function estimateTrainingWork({examples,hiddenUnits,epochs,classes}){
 for(const [name,v,max] of [['examples',examples,NEURAL_LIMITS.maxExamples],['hiddenUnits',hiddenUnits,NEURAL_LIMITS.maxHidden],['epochs',epochs,NEURAL_LIMITS.maxEpochs],['classes',classes,16]])
  if(!Number.isInteger(v)||v<1||v>max)throw new RangeError(`${name} out of bounds`);
 // forward + backward ≈ 3 × (input→hidden + hidden→output) multiply-adds per example per epoch, plus one evaluation pass.
 const perExample=hiddenUnits*PIXEL_COUNT+classes*hiddenUnits;
 return Object.freeze({multiplyAdds:epochs*examples*perExample*4,perExample,basis:'analytic count of multiply-adds; not a timing measurement'});
}
export function detectCapabilities(scope=globalThis){
 const nav=scope?.navigator??{};
 let webgl=false;
 try{const canvas=scope?.document?.createElement?.('canvas');webgl=Boolean(canvas&&(canvas.getContext('webgl2')||canvas.getContext('webgl')))}catch{webgl=false}
 return Object.freeze({worker:typeof scope?.Worker==='function',webgl,hardwareConcurrency:Number.isInteger(nav.hardwareConcurrency)?nav.hardwareConcurrency:null,
  deviceMemoryGb:typeof nav.deviceMemory==='number'?nav.deviceMemory:null,saveData:nav.connection?.saveData===true,source:'browser-reported capabilities; may be absent or coarse'});
}
export function planTraining(request,capabilities){
 const {examples,hiddenUnits,epochs,classes}=request;
 const reasons=[];
 const lowPower=capabilities.saveData||(capabilities.deviceMemoryGb!==null&&capabilities.deviceMemoryGb<=2)||(capabilities.hardwareConcurrency!==null&&capabilities.hardwareConcurrency<=2);
 if(capabilities.saveData)reasons.push('Data saver is on, so the optional TensorFlow.js download is not offered by default.');
 if(capabilities.deviceMemoryGb!==null&&capabilities.deviceMemoryGb<=2)reasons.push(`The browser reports about ${capabilities.deviceMemoryGb} GB of memory.`);
 if(capabilities.hardwareConcurrency!==null&&capabilities.hardwareConcurrency<=2)reasons.push(`The browser reports ${capabilities.hardwareConcurrency} processor threads.`);
 let h=hiddenUnits,e=epochs;
 if(lowPower){h=Math.min(h,WORK_LIMITS.lowPowerMaxHidden);e=Math.min(e,WORK_LIMITS.lowPowerMaxEpochs)}
 const cap=lowPower?WORK_LIMITS.lowPowerMaxMultiplyAdds:WORK_LIMITS.standardMaxMultiplyAdds;
 while(e>1&&estimateTrainingWork({examples,hiddenUnits:h,epochs:e,classes}).multiplyAdds>cap)e--;
 if(h!==hiddenUnits)reasons.push(`Hidden units reduced from ${hiddenUnits} to ${h}.`);
 if(e!==epochs)reasons.push(`Epochs reduced from ${epochs} to ${e} to stay within the work limit.`);
 const timeBudgetMs=lowPower?WORK_LIMITS.lowPowerTimeBudgetMs:NEURAL_LIMITS.defaultTimeBudgetMs;
 return Object.freeze({mode:lowPower?'low-power':'standard',hiddenUnits:h,epochs:e,timeBudgetMs,offerTensorflow:!capabilities.saveData,offerGpu:capabilities.webgl&&!lowPower,
  runInWorker:capabilities.worker,work:estimateTrainingWork({examples,hiddenUnits:h,epochs:e,classes}),reasons:Object.freeze(reasons),
  alternative:'If training is still slow, the linear classifier and the pre-computed walkthrough text explain the same ideas without a neural network.'});
}
const abortError=message=>{const error=new Error(message);error.name='AbortError';return error};
// Runs one task per worker; the worker is terminated on completion, supersession, cancellation or budget overrun.
export function createTrainingWorkerController(createWorker){
 if(typeof createWorker!=='function')throw new TypeError('createWorker must be a function');
 let active=null,nextRequestId=1;
 const finish=(record,settle,value)=>{if(active!==record)return false;active=null;clearTimeout(record.timer);record.worker.terminate();settle(value);return true};
 const cancel=(reason='Training cancelled')=>{if(!active)return false;return finish(active,active.reject,abortError(reason))};
 const run=(task,{budgetMs})=>{
  if(!Number.isInteger(budgetMs)||budgetMs<1||budgetMs>NEURAL_LIMITS.maxTimeBudgetMs)return Promise.reject(new RangeError('Worker budget out of bounds'));
  cancel('Training superseded');
  const worker=createWorker(),requestId=nextRequestId++;
  return new Promise((resolve,reject)=>{
   const record={worker,reject,timer:null};active=record;
   worker.onmessage=event=>{const m=event?.data;if(active!==record||!m||m.requestId!==requestId)return;if(m.ok===true)finish(record,resolve,m.result);else finish(record,reject,new Error(typeof m.error==='string'?m.error:'Training worker failed'))};
   worker.onerror=()=>finish(record,reject,new Error('Training worker failed'));
   record.timer=setTimeout(()=>finish(record,reject,new Error(`Training worker exceeded ${budgetMs+WORK_LIMITS.workerGraceMs} ms and was stopped`)),budgetMs+WORK_LIMITS.workerGraceMs);
   try{worker.postMessage({requestId,task})}catch(error){finish(record,reject,error instanceof Error?error:new Error('Training dispatch failed'))}
  });
 };
 return Object.freeze({run,cancel,get active(){return active!==null}});
}
