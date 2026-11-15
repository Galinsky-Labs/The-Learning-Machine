export const MODEL_LESSON_STAGES:readonly ('hypothesize'|'predict'|'experiment'|'observe'|'explain'|'transfer'|'complete')[];
export const MODEL_LESSON_QUESTION:string;
export const MODEL_LESSON_EXPLANATION:string;
export type ModelLessonStage=typeof MODEL_LESSON_STAGES[number];
export interface RetentionPredictions {readonly networkStillWorks:boolean;readonly memorizerHoldsCopies:boolean;readonly networkHoldsCopies:boolean}
export interface ModelLessonState {readonly stage:ModelLessonStage;readonly hypothesis:string|null;readonly predictions:RetentionPredictions|null;
 readonly observations:{readonly storeExampleCountAfterDisposal:number;readonly networkPredictionUnchanged:boolean;readonly memorizerExactCopies:number;readonly confidenceGap:number;readonly comparisons:readonly {readonly question:string;readonly predicted:boolean;readonly observed:boolean;readonly matched:boolean}[];readonly origin:string}|null;
 readonly explanation:{readonly text:string;readonly absoluteClaims:readonly string[];readonly challengeAcknowledged:boolean}|null;readonly challenges:readonly {readonly claim:string;readonly question:string}[];readonly transfer:unknown;readonly directExplanationViewed:boolean}
export function createModelLesson():ModelLessonState;
export function recordModelHypothesis(state:ModelLessonState,hypothesis:string):ModelLessonState;
export function commitRetentionPredictions(state:ModelLessonState,predictions:RetentionPredictions):ModelLessonState;
export function recordRetentionObservations(state:ModelLessonState,observations:{storeExampleCountAfterDisposal:number;networkPredictionUnchanged:boolean;memorizerExactCopies:number;networkExactCopies:null;confidenceGap:number}):ModelLessonState;
export function continueToExplanation(state:ModelLessonState):ModelLessonState;
export function submitRetentionExplanation(state:ModelLessonState,explanation:string,options?:{acknowledgeChallenge?:boolean}):ModelLessonState;
export function viewModelLessonExplanation(state:ModelLessonState):ModelLessonState;
export function recordModelLessonTransfer(state:ModelLessonState,transferRevision:{readonly recordedAfterObservation:true}):ModelLessonState;
export function modelLessonProgress(state:ModelLessonState):readonly {readonly stage:string;readonly complete:boolean;readonly current:boolean}[];
