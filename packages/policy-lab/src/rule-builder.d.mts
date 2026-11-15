import type {StudioPolicy,StudioPolicyInput} from './studio.mjs';
export const TERM_OPERATORS:readonly ('eq'|'neq'|'in')[];
export const FACT_CHOICES:Readonly<Record<string,readonly (string|number|boolean)[]>>;
export interface Term {operator:'eq'|'neq'|'in';fact:string;value:any}
export interface DraftRule {id:string;label:string;annotation:string;group:'all'|'any';terms:Term[];exclusions:Term[];effect:string;carveOuts:{id:string;label:string;term:Term;effect:string}[]}
export interface Draft {id:string;title:string;defaultEffect:string;rules:DraftRule[];nextId:number}
export interface Builder {readonly past:readonly Draft[];readonly present:Draft;readonly future:readonly Draft[]}
export function emptyDraft(id?:string,title?:string):Draft;
export function createBuilder(draft?:Draft):Builder;
export function applyAction(b:Builder,action:Record<string,any>&{type:string}):Builder;
export function draftToPolicyInput(d:Draft):StudioPolicyInput;
export function buildPolicy(b:Builder):StudioPolicy;
export function describeRule(r:DraftRule):string;
