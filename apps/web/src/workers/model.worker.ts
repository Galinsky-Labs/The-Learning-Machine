import {trainReferenceNetwork} from '../../../../packages/learning-lab/src/neural.mjs';
import type {NeuralOptions} from '../../../../packages/learning-lab/src/neural.mjs';
import type {ShapeDataset} from '../../../../packages/learning-lab/src/dataset.mjs';
import type {HoldoutSplit} from '../../../../packages/learning-lab/src/split.mjs';
// TLM-040: reference training off the main thread. The controller terminates this worker if it overruns its budget.
type Request={requestId:number;task:{dataset:ShapeDataset;split:HoldoutSplit;options:NeuralOptions}};
const scope=self as unknown as {onmessage:((event:MessageEvent<Request>)=>void)|null;postMessage(message:unknown):void};
scope.onmessage=(event:MessageEvent<Request>)=>{
 const request=event.data;
 try{
  if(!request||!Number.isInteger(request.requestId)||!request.task)throw new TypeError('Invalid training request');
  const model=trainReferenceNetwork(request.task.dataset,request.task.split,request.task.options);
  scope.postMessage({requestId:request.requestId,ok:true,result:JSON.parse(JSON.stringify(model))});
 }catch(error){scope.postMessage({requestId:request?.requestId,ok:false,error:error instanceof Error?error.message:'Training failed'})}
};
