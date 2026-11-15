import type {CaseRun,CaseEvaluator} from './case-library.mjs';
export const OUTCOME_OPTIONS:Readonly<Record<CaseEvaluator,{readonly key:string;readonly options:readonly string[]}>>;
export const LEGAL_LESSONS:Readonly<Record<'education'|'acquisition',{readonly title:string;readonly question:string;readonly caseIds:readonly string[]}>>;
export const LEGAL_LESSON_STAGES:readonly string[];
export interface LegalLessonState {readonly lessonId:'education'|'acquisition';readonly caseId:string;readonly stage:'hypothesize'|'predict'|'experiment'|'observe'|'explain'|'transfer'|'complete';
 readonly hypothesis:string|null;readonly prediction:string|null;readonly run:CaseRun|null;readonly observation?:{readonly predicted:string;readonly observed:string;readonly matched:boolean};
 readonly explanation:{readonly text:string;readonly disagreesWithFixture:boolean;readonly challengeAcknowledged:boolean}|null;readonly challenges:readonly {readonly claim:string;readonly question:string}[];
 readonly transfer:{readonly caseId:string;readonly prediction:string;readonly observed:string;readonly matched:boolean;readonly run:CaseRun;readonly agreementRequired:false}|null;readonly directExplanationViewed:boolean;readonly directExplanation?:string}
export function createLegalLesson(lessonId:'education'|'acquisition',caseId:string):LegalLessonState;
export function recordLegalHypothesis(s:LegalLessonState,hypothesis:string):LegalLessonState;
export function commitLegalPrediction(s:LegalLessonState,outcome:string):LegalLessonState;
export function runLegalExperiment(s:LegalLessonState,catalog:unknown,bill:unknown):LegalLessonState;
export function continueLegalExplanation(s:LegalLessonState):LegalLessonState;
export function submitLegalExplanation(s:LegalLessonState,explanation:string,options?:{acknowledgeChallenge?:boolean}):LegalLessonState;
export function transferCandidates(s:LegalLessonState):readonly string[];
export function runLegalTransfer(s:LegalLessonState,caseId:string,prediction:string,catalog:unknown,bill:unknown):LegalLessonState;
export function viewLegalExplanation(s:LegalLessonState,catalog:unknown,bill:unknown):LegalLessonState;
