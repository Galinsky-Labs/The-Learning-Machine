import type {CaseRun} from './case-library.mjs';
export const TRUTH_LAYERS:Readonly<Record<'current-law'|'proposed-bill'|'interpretation'|'hypothetical'|'unknown',string>>;
export interface InspectedSource {readonly layer:'current-law';readonly id:string;readonly kind:string;readonly citation:string;readonly title:string;readonly forum:string;readonly issuedOn:string|null;readonly sourceUrl:string;
 readonly sourceType:string;readonly researchStatus:string;readonly stance:string|null;readonly relevance:string;readonly scopeLimitations:string;readonly catalogCuratedOn:string|null;readonly caution:string|null}
export interface TruthLayerView {readonly caseId:string;readonly layers:readonly {readonly layer:string;readonly description:string;readonly items:readonly any[]}[]}
export function inspectSource(catalog:unknown,id:string):InspectedSource;
export function buildTruthLayerView(caseRun:CaseRun,caseInput:unknown,catalog:unknown,bill:unknown):TruthLayerView;
export function validateTruthLayerView(view:unknown,catalog:unknown):TruthLayerView;
