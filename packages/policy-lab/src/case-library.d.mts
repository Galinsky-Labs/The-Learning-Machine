export type Naive='favors-learning'|'favors-restriction';
export type CaseEvaluator='education'|'fixation'|'acquisition'|'independent-limits'|'model-output';
export interface LegalCase {readonly id:string;readonly context:string;readonly naive:Naive;readonly intuition:string;readonly evaluator:CaseEvaluator;readonly input:{readonly facts?:Record<string,unknown>;readonly learningPermission?:string;[k:string]:unknown};readonly relatedSources?:readonly string[];readonly expected:Record<string,unknown>}
export const CASE_LIBRARY:readonly LegalCase[];
export interface CaseRun {readonly id:string;readonly context:string;readonly naive:Naive;readonly intuition:string;readonly evaluator:CaseEvaluator;readonly relatedSources:readonly string[];readonly observed:Record<string,unknown>;readonly expected:Record<string,unknown>;readonly passed:boolean;readonly result:Record<string,unknown>}
export function runCase(caseId:string,catalog:unknown,bill:unknown):CaseRun;
export function runCaseLibrary(catalog:unknown,bill:unknown):{readonly cases:readonly CaseRun[];readonly passed:number;readonly total:number;readonly contexts:number;readonly balance:Record<Naive,number>;readonly symmetric:boolean};
