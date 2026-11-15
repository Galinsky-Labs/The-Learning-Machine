import test from 'node:test';import assert from 'node:assert/strict';
import {estimateTrainingWork,planTraining,detectCapabilities,createTrainingWorkerController,WORK_LIMITS} from '../src/device-limits.mjs';
const request={examples:12,hiddenUnits:32,epochs:200,classes:3};
test('work estimates are analytic and bounded inputs fail closed',()=>{
 const w=estimateTrainingWork({examples:12,hiddenUnits:8,epochs:60,classes:3});
 assert.equal(w.perExample,8*256+3*8);assert.equal(w.multiplyAdds,60*12*w.perExample*4);assert.match(w.basis,/not a timing/);
 assert.throws(()=>estimateTrainingWork({...request,epochs:10_000}),/epochs/);
});
test('low-power devices get a smaller plan, no GPU and a stated reason',()=>{
 const low=planTraining(request,{worker:true,webgl:true,hardwareConcurrency:2,deviceMemoryGb:1,saveData:false});
 assert.equal(low.mode,'low-power');assert.ok(low.hiddenUnits<=WORK_LIMITS.lowPowerMaxHidden);assert.ok(low.work.multiplyAdds<=WORK_LIMITS.lowPowerMaxMultiplyAdds);
 assert.equal(low.offerGpu,false);assert.ok(low.reasons.length>=2);assert.match(low.alternative,/linear classifier/);
 const save=planTraining({...request,hiddenUnits:8,epochs:40},{worker:false,webgl:false,hardwareConcurrency:8,deviceMemoryGb:8,saveData:true});
 assert.equal(save.offerTensorflow,false);assert.equal(save.runInWorker,false);
 const std=planTraining({...request,hiddenUnits:8,epochs:60},{worker:true,webgl:true,hardwareConcurrency:8,deviceMemoryGb:8,saveData:false});
 assert.equal(std.mode,'standard');assert.equal(std.epochs,60);assert.equal(std.offerGpu,true);
 const huge=planTraining({examples:64,hiddenUnits:32,epochs:200,classes:16},{worker:true,webgl:true,hardwareConcurrency:null,deviceMemoryGb:null,saveData:false});
 assert.ok(huge.work.multiplyAdds<=WORK_LIMITS.standardMaxMultiplyAdds);assert.ok(huge.epochs<200);
});
test('capability detection tolerates missing browser APIs',()=>{
 const caps=detectCapabilities({});assert.deepEqual([caps.worker,caps.webgl,caps.hardwareConcurrency,caps.deviceMemoryGb,caps.saveData],[false,false,null,null,false]);
});
class FakeWorker{constructor(behaviour){this.behaviour=behaviour;this.terminated=false}postMessage(m){this.behaviour(this,m)}terminate(){this.terminated=true}}
test('runaway worker is terminated at its budget and the interface promise settles',async()=>{
 const workers=[];const controller=createTrainingWorkerController(()=>{const w=new FakeWorker(()=>{});workers.push(w);return w});
 await assert.rejects(controller.run({},{budgetMs:20}),/exceeded/);assert.equal(workers[0].terminated,true);assert.equal(controller.active,false);
});
test('worker results, superseding and cancellation',async()=>{
 const ok=createTrainingWorkerController(()=>new FakeWorker((w,m)=>setTimeout(()=>w.onmessage({data:{requestId:m.requestId,ok:true,result:42}}),1)));
 assert.equal(await ok.run({},{budgetMs:100}),42);
 const slow=createTrainingWorkerController(()=>new FakeWorker(()=>{}));
 const first=slow.run({},{budgetMs:1000});const second=slow.run({},{budgetMs:1000});
 await assert.rejects(first,/superseded/);assert.equal(slow.cancel(),true);await assert.rejects(second,/cancelled/);
 await assert.rejects(slow.run({},{budgetMs:0}),/budget/);
});
