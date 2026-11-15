export const VIEWPOINTS:Readonly<Record<'creator'|'teacher'|'developer',{readonly label:string;readonly metric:string;readonly worseWhen:string;readonly interest:string;readonly premise:string;readonly selfCheck:string}>>;
export function digest(value:unknown):string;
export interface Core {readonly rows:readonly {readonly structure:string;readonly creatorTotalMinor:number;readonly learnerCostMinor:number;readonly developerCostMinor:number}[];readonly inputsDigest:string;readonly coreDigest:string}
export function buildCore(inputs:readonly Record<string,unknown>[]):Core;
export interface ViewpointView {readonly viewpoint:string;readonly label:string;readonly coreDigest:string;readonly emphasis:string;readonly interest:string;readonly ranking:readonly {readonly structure:string;readonly value:number}[];readonly opposition:{readonly target:string|null;readonly argument:string};readonly premiseChallenge:string;readonly selfCheck:string}
export function viewScenario(core:Core,viewpoint:string):ViewpointView;
