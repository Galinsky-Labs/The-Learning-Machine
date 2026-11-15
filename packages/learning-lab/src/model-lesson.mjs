import {findAbsoluteRetentionClaims} from './retention.mjs';
// TLM-039: Module 3 "What Did the Machine Learn?" — a Socratic route over real experiments in the model lab.
export const MODEL_LESSON_STAGES=Object.freeze(['hypothesize','predict','experiment','observe','explain','transfer','complete']);
export const MODEL_LESSON_QUESTION='After training, a model\'s training drawings are disposed of. What, if anything, does the model still hold about them?';
export const MODEL_LESSON_EXPLANATION='A trained model keeps numbers changed by its training data. Some models (like the nearest-example memorizer) keep exact copies; others keep parameters that can still reveal which examples they saw. Deleting the dataset from an application store does not remove what the parameters learned, and no browser can guarantee every in-memory copy is physically erased.';
const freeze=o=>Object.freeze(o);
const text=(value,min,max,name)=>{if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new RangeError(`${name} must contain ${min}–${max} characters`);return value.trim()};
export function createModelLesson(){return freeze({stage:'hypothesize',hypothesis:null,predictions:null,observations:null,explanation:null,challenges:freeze([]),transfer:null,directExplanationViewed:false})}
const require=(state,stage)=>{if(!state||state.stage!==stage)throw new RangeError(`Lesson is at ${state?.stage??'an unknown stage'}, not ${stage}`)};
export function recordModelHypothesis(state,hypothesis){require(state,'hypothesize');return freeze({...state,stage:'predict',hypothesis:text(hypothesis,3,500,'Hypothesis')})}
// Predictions are committed before any experiment output is shown.
export function commitRetentionPredictions(state,{networkStillWorks,memorizerHoldsCopies,networkHoldsCopies}){
 require(state,'predict');
 for(const v of [networkStillWorks,memorizerHoldsCopies,networkHoldsCopies])if(typeof v!=='boolean')throw new TypeError('Answer every prediction');
 return freeze({...state,stage:'experiment',predictions:freeze({networkStillWorks,memorizerHoldsCopies,networkHoldsCopies})});
}
export function recordRetentionObservations(state,{storeExampleCountAfterDisposal,networkPredictionUnchanged,memorizerExactCopies,networkExactCopies,confidenceGap}){
 require(state,'experiment');
 if(!Number.isInteger(storeExampleCountAfterDisposal)||!Number.isInteger(memorizerExactCopies)||typeof networkPredictionUnchanged!=='boolean'||(networkExactCopies!==null)||!Number.isFinite(confidenceGap))throw new TypeError('Observations must come from the executed retention experiment');
 const p=state.predictions,actual={networkStillWorks:networkPredictionUnchanged,memorizerHoldsCopies:memorizerExactCopies>0,networkHoldsCopies:false};
 const comparisons=freeze(Object.keys(actual).map(k=>freeze({question:k,predicted:p[k],observed:actual[k],matched:p[k]===actual[k]})));
 return freeze({...state,stage:'observe',observations:freeze({storeExampleCountAfterDisposal,networkPredictionUnchanged,memorizerExactCopies,confidenceGap,comparisons,origin:'computed in this browser'})});
}
export function continueToExplanation(state){require(state,'observe');return freeze({...state,stage:'explain'})}
// The explanation may disagree with the lesson's framing; it is only challenged when it asserts guarantees the evidence cannot support.
export function submitRetentionExplanation(state,explanation,{acknowledgeChallenge=false}={}){
 require(state,'explain');
 const value=text(explanation,10,800,'Explanation'),claims=findAbsoluteRetentionClaims(value);
 if(claims.length&&!acknowledgeChallenge)return freeze({...state,challenges:freeze(claims.map(c=>freeze({claim:c,question:`You wrote “${c}”. What evidence from the store inspection or the confidence gap shows that, and could a copy survive somewhere the page cannot inspect?`})))});
 return freeze({...state,stage:'transfer',explanation:freeze({text:value,absoluteClaims:freeze(claims),challengeAcknowledged:claims.length>0})});
}
export function viewModelLessonExplanation(state){if(!state)throw new TypeError('Invalid lesson');return freeze({...state,directExplanationViewed:true})}
export function recordModelLessonTransfer(state,transferRevision){
 require(state,'transfer');
 if(!transferRevision?.recordedAfterObservation)throw new TypeError('Record a transfer revision from the transfer challenge');
 return freeze({...state,stage:'complete',transfer:transferRevision});
}
export function modelLessonProgress(state){
 const i=MODEL_LESSON_STAGES.indexOf(state.stage);
 return freeze(MODEL_LESSON_STAGES.slice(0,-1).map((stage,n)=>freeze({stage,complete:n<i,current:n===i})));
}
