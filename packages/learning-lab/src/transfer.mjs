import {GRID_SIZE,PIXEL_COUNT,presetDrawing} from './dataset.mjs';
import {shiftDrawing} from './lesson-data.mjs';
import {classifyDrawing,classifyNearestExample} from './classifier.mjs';
import {classifyWithNetwork} from './neural.mjs';
// TLM-038: novel tasks that separate rule transfer from rote memory. One task is deliberately ambiguous (no ground truth).
function draw(predicate){const p=Array(PIXEL_COUNT).fill(0);for(let r=0;r<GRID_SIZE;r++)for(let c=0;c<GRID_SIZE;c++)if(predicate(r,c))p[r*GRID_SIZE+c]=1;return Object.freeze(p)}
const union=(a,b)=>Object.freeze(a.map((v,i)=>v||b[i]?1:0));
export const TRANSFER_TASKS=Object.freeze([
 {id:'far-shifted-cross',label:'Cross',prompt:'A cross moved further toward a corner than any training cross.',pixels:shiftDrawing(presetDrawing('cross'),5,5)},
 {id:'small-square',label:'Square',prompt:'A much smaller square outline.',pixels:draw((r,c)=>r>=6&&r<=9&&c>=6&&c<=9&&(r===6||r===9||c===6||c===9))},
 {id:'vertical-line',label:'Line',prompt:'A vertical line—an orientation that never appears in training.',pixels:draw((r,c)=>c>=7&&c<=8&&r>=2&&r<=13)},
 {id:'broken-square',label:'Square',prompt:'A square outline with one side missing.',pixels:draw((r,c)=>r>=3&&r<=12&&c>=3&&c<=12&&(r===3||r===12||c===3))},
 {id:'square-cross-hybrid',label:null,prompt:'A square and a cross drawn together. There is no correct answer.',pixels:union(presetDrawing('square'),presetDrawing('cross'))}
].map(t=>Object.freeze(t)));
const MODEL_KEYS=Object.freeze(['memorizer','linear','network']);
function classify(kind,model,pixels){
 if(kind==='memorizer')return classifyNearestExample(model,pixels).predictedLabel;
 if(kind==='linear')return classifyDrawing(model,pixels).predictedLabel;
 return classifyWithNetwork(model,pixels).predictedLabel;
}
// predictions: {taskId: {memorizer:boolean, linear:boolean, network:boolean}} — committed before running.
export function runTransferChallenge(models,predictions){
 if(!models||MODEL_KEYS.some(k=>!models[k]))throw new TypeError('Transfer challenge needs memorizer, linear and network models');
 if(!predictions||typeof predictions!=='object')throw new TypeError('Commit predictions before running the challenge');
 const rows=TRANSFER_TASKS.map(task=>{
  const predicted=predictions[task.id];
  if(task.label!==null&&(!predicted||MODEL_KEYS.some(k=>typeof predicted[k]!=='boolean')))throw new TypeError(`Missing prediction for ${task.id}`);
  const outcomes=Object.freeze(Object.fromEntries(MODEL_KEYS.map(k=>{
   const label=classify(k,models[k],task.pixels),correct=task.label===null?null:label===task.label;
   const surprise=correct===null?false:predicted[k]!==correct;
   return [k,Object.freeze({predictedLabel:label,correct,learnerExpectedCorrect:task.label===null?null:predicted[k],surprise})];
  })));
  return Object.freeze({taskId:task.id,expectedLabel:task.label,ambiguous:task.label===null,outcomes});
 });
 const surprises=rows.flatMap(r=>MODEL_KEYS.filter(k=>r.outcomes[k].surprise).map(k=>Object.freeze({taskId:r.taskId,model:k,correct:r.outcomes[k].correct})));
 const unexpectedFailures=surprises.filter(s=>s.correct===false);
 return Object.freeze({algorithm:'transfer-challenge-v1',rows:Object.freeze(rows),surprises:Object.freeze(surprises),unexpectedFailures:Object.freeze(unexpectedFailures),
  revisionRequired:unexpectedFailures.length>0,origin:'computed on novel drawings excluded from training and held-out sets',
  ambiguityNote:'The hybrid drawing has no ground-truth label; any answer shows how the model breaks ties, not whether it is right.'});
}
export function recordTransferRevision(result,text,{citedTaskId}={}){
 if(!result||result.algorithm!=='transfer-challenge-v1')throw new TypeError('Run the transfer challenge first');
 if(typeof text!=='string'||text.trim().length<10||text.trim().length>600)throw new RangeError('Revision must contain 10–600 characters');
 if(result.revisionRequired&&!result.unexpectedFailures.some(f=>f.taskId===citedTaskId))throw new RangeError('Cite one of the unexpected failures your revision responds to');
 return Object.freeze({revision:text.trim(),citedTaskId:citedTaskId??null,recordedAfterObservation:true,agreementRequired:false});
}
