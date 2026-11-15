import type {LicensingResult} from './scenarios.mjs';
import type {ViewpointView} from './viewpoints.mjs';
import type {EntryCosts,CompetitionAssumptions} from './competition.mjs';
export const LESSON_INPUTS:readonly Record<string,unknown>[];
export const TRANSFER_MARKETS:Readonly<Record<'small-entrant'|'large-entrant',CompetitionAssumptions>>;
export const MARKET_VIEWPOINTS:readonly string[];
export type Role='creators'|'learners'|'developers';export type Sign='gains'|'pays'|'unchanged';
export interface Consequence {readonly id:string;readonly role:Role;readonly netMinor:number;readonly observed:Sign;readonly predicted:Sign;readonly matched:boolean}
export interface MarketLesson {readonly stage:'decide'|'predict'|'run'|'viewpoints'|'revise'|'transfer'|'complete';readonly decision:string|null;readonly predictions:Record<Role,Sign>|null;
 readonly observation:{readonly result:LicensingResult;readonly consequences:readonly Consequence[];readonly earnings:{readonly conditional:string;readonly disclaimer:string;readonly statement:string;readonly status:string;readonly low:number|null;readonly high:number|null}}|null;
 readonly viewpointsSeen:readonly string[];readonly lastView?:ViewpointView;readonly revision:{readonly from:string;readonly to:string;readonly changed:boolean;readonly citedConsequenceId:string;readonly reason:string;readonly agreementRequired:false}|null;
 readonly transfer:{readonly market:string;readonly predictedCheapest:string;readonly result:EntryCosts;readonly matched:boolean}|null}
export function createMarketLesson():MarketLesson;
export function chooseStructure(s:MarketLesson,structure:string):MarketLesson;
export function predictConsequences(s:MarketLesson,predictions:Record<Role,Sign>):MarketLesson;
export function runMarket(s:MarketLesson):MarketLesson;
export function viewMarketViewpoint(s:MarketLesson,viewpoint:string):MarketLesson;
export function reviseDecision(s:MarketLesson,input:{structure:string;citedConsequenceId:string;reason:string}):MarketLesson;
export function consequenceTable():readonly {readonly id:string;readonly structure:string;readonly role:Role;readonly netMinor:number}[];
export function runMarketTransfer(s:MarketLesson,market:string,predictedCheapest:string):MarketLesson;
