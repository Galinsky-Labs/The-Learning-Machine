export const PROGRESS_FORMAT:string;export const PROGRESS_KEY:string;export const CONSENT_KEY:string;export const TOMBSTONE_KEY:string;
export const MODULE_IDS:readonly string[];
export type Stage='started'|'predicted'|'observed'|'explained'|'revised'|'transfer'|'complete';
export type Modules=Record<string,{stage:Stage;updatedAt:string;note?:string}>;
export interface Loaded {status:'ok'|'empty'|'disabled'|'corrupt'|'unsupported';modules:Modules;reason?:string;discarded?:boolean;releaseChanged?:boolean;savedAt?:string}
export function serializeProgress(input:{releaseDigest?:string;modules:Modules;savedAt:string}):string;
export function parseProgress(text:string,options?:{releaseDigest?:string}):Loaded;
export interface ProgressStore {enabled():boolean;enable():boolean;load():Loaded;record(moduleId:string,stage:Stage,note?:string):boolean;clear():{cleared:true;note:string};exportText():string;importText(text:string):Loaded}
export function createProgressStore(storage:unknown,options?:{releaseDigest?:string;now?:()=>string}):ProgressStore;
export function reportProgress(moduleId:string,stage:Stage,note?:string):boolean;
