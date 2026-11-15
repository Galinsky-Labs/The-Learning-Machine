import type {History,StressReport,StudioPolicyInput} from './studio.mjs';
export const PREDICTION_SCENARIOS:readonly string[];
export interface WriteLawLesson {readonly stage:'draft'|'predict'|'stress'|'revise'|'defend'|'complete';readonly history:History|null;readonly predictions:Record<string,string>|null;
 readonly observed:readonly {readonly scenarioId:string;readonly predicted:string;readonly observed:string;readonly matched:boolean}[]|null;readonly stress:StressReport|null;
 readonly revisionResponse:{readonly findingCheckId:string|null;readonly revised:boolean;readonly reason:string;readonly newStress:StressReport}|null;readonly defense:{readonly stance:string;readonly statement:string;readonly agreementRequired:false;readonly revisions:number}|null}
export function createWriteLawLesson():WriteLawLesson;
export function submitDraft(s:WriteLawLesson,policyInput:StudioPolicyInput):WriteLawLesson;
export function predictDraftOutcomes(s:WriteLawLesson,predictions:Record<string,string>):WriteLawLesson;
export function runStressTest(s:WriteLawLesson):WriteLawLesson;
export function respondToCounterexample(s:WriteLawLesson,input:{findingCheckId?:string;revisedPolicyInput?:StudioPolicyInput|null;reason:string}):WriteLawLesson;
export function defendPolicy(s:WriteLawLesson,input:{stance:string;statement:string}):WriteLawLesson;
