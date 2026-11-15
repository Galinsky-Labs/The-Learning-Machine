import type {PolicyCondition,PolicyEffect} from './compiler.mjs';
export const STUDIO_SCHEMA:'2.0.0';export const VISITOR_SOURCE:string;
export function fnv(text:string):string;
export interface StudioRuleInput {id:string;label:string;annotation:string;when:PolicyCondition;effect:PolicyEffect;exceptions:{id:string;label:string;when:PolicyCondition;effect:PolicyEffect}[]}
export interface StudioPolicyInput {schemaVersion:'2.0.0';id:string;title:string;defaultEffect:PolicyEffect;rules:StudioRuleInput[]}
export interface StudioPolicy {readonly schemaVersion:'2.0.0';readonly id:string;readonly title:string;readonly defaultEffect:PolicyEffect;readonly framework:'hypothetical';readonly sourceId:string;
 readonly rules:readonly {readonly id:string;readonly label:string;readonly annotation:string;readonly when:PolicyCondition;readonly effect:PolicyEffect;readonly exceptions:readonly {readonly id:string;readonly label:string;readonly when:PolicyCondition;readonly effect:PolicyEffect}[]}[]}
export type Facts=Record<string,string|number|boolean|null>;
export interface StudioEvaluation {readonly policyId:string;readonly outcome:string;readonly trace:readonly {readonly ruleId:string;readonly status:string;readonly effect:string|null;readonly decidedBy:string|null}[];readonly unknownRules:readonly string[];readonly decidedBy:readonly string[];readonly framework:'hypothetical'}
export function compileStudioPolicy(input:StudioPolicyInput):StudioPolicy;
export function evaluateCondition(c:PolicyCondition,facts:Facts):boolean|null;
export function validateFactSnapshot(facts:Facts):Facts;
export function evaluateStudioPolicy(policy:StudioPolicy,facts:Facts):StudioEvaluation;
export function exportStudioPolicy(policy:StudioPolicy):string;
export function importStudioPolicy(serialized:string):StudioPolicy;
export const STUDIO_SCENARIOS:readonly {readonly id:string;readonly label:string;readonly facts:Facts}[];
export interface Attribution {readonly baseOutcome:string;readonly variantOutcome:string;readonly outcomeChanged:boolean;readonly changedRules:readonly string[];readonly responsibleRules:readonly string[];readonly defaultEffectResponsible:boolean;readonly interaction:string|null}
export function attributeDifference(base:StudioPolicy,variant:StudioPolicy,facts:Facts):Attribution;
export function comparePolicies(input:{proposal:unknown;policies:readonly StudioPolicy[]},facts:Facts):{readonly factsDigest:string;readonly presentLaw:{readonly framework:string;readonly outcome:string;readonly reason:string};readonly proposal:{readonly framework:string;readonly outcome:string;readonly enactedLaw:false};readonly visitor:readonly StudioEvaluation[];readonly pairwise:readonly (Attribution&{readonly base:string;readonly variant:string})[]};
export function tradeoffMatrix(policies:readonly StudioPolicy[],scenarios?:readonly {id:string;label:string;facts:Facts}[]):{readonly rows:readonly {readonly scenarioId:string;readonly label:string;readonly outcomes:readonly {readonly policyId:string;readonly outcome:string;readonly actors:Record<string,string>;readonly decidedBy:readonly string[]}[]}[];readonly counts:readonly Record<string,number|string>[];readonly note:string};
export interface StressFinding {readonly checkId:string;readonly scenarioId:string;readonly outcome:string;readonly decidedBy:readonly string[];readonly question:string;readonly direction:string}
export interface StressReport {readonly policyId:string;readonly checksRun:number;readonly findings:readonly StressFinding[];readonly hinges:readonly {readonly scenarioId:string;readonly fact:string;readonly from:string;readonly to:string}[];readonly balance:{readonly underProtect:number;readonly overRestrict:number};readonly note:string}
export function stressTestPolicy(policy:StudioPolicy,scenarios?:readonly {id:string;label:string;facts:Facts}[]):StressReport;
export interface Revision {readonly id:string;readonly parent:string|null;readonly branch:string;readonly note:string;readonly policy:StudioPolicy;readonly evidence:readonly {readonly scenarioId:string;readonly outcome:string}[]}
export interface History {readonly format:'tlm-studio-history-v1';readonly revisions:readonly Revision[];readonly heads:Readonly<Record<string,string>>}
export function createHistory(policyInput:StudioPolicyInput,note:string):History;
export function commitRevision(history:History,input:{branch?:string;parent?:string;policyInput:StudioPolicyInput;note:string}):History;
export function forkRevision(history:History,fromId:string,branch:string,policyInput:StudioPolicyInput,note:string):History;
export function replayHistory(history:History):readonly {readonly id:string;readonly intact:boolean}[];
export function exportHistory(history:History):string;
export function importHistory(serialized:string):History;
