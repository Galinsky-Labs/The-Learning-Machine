import type {NeuralModel} from './neural.mjs';
import type {DrawingPixels} from './dataset.mjs';
export const MICROSCOPE_SCHEMA:'tlm-microscope-v1';
export const STEP_KINDS:readonly ('input'|'computed'|'measured'|'illustration')[];
export interface MicroscopeStep {readonly id:string;readonly kind:'input'|'computed'|'measured'|'illustration';readonly label:string;readonly values?:readonly number[];readonly value?:number;readonly unit?:string;readonly clock?:string;
 readonly operation?:string;readonly description?:string;readonly disclosure?:string;readonly multiplyAdds?:number;readonly labels?:readonly string[]}
export interface MicroscopeTrace {readonly schema:'tlm-microscope-v1';readonly algorithm:string;readonly backendForTrace:string;readonly steps:readonly MicroscopeStep[]}
export function traceNetworkForward(model:NeuralModel,pixels:DrawingPixels,options?:{now?:()=>number;clock?:string}):MicroscopeTrace;
export function validateMicroscopeTrace(trace:unknown):MicroscopeTrace;
export function verifyMicroscopeTrace(trace:MicroscopeTrace,model:NeuralModel,pixels:DrawingPixels):boolean;
