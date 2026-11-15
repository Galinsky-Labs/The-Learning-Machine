import type {NeuralModel} from './neural.mjs';
import type {LinearModel} from './classifier.mjs';
export type InspectableModel=NeuralModel|LinearModel;
export const MODEL_FORMAT:'tlm-model-v1';
export function fnv1a32(text:string):string;
export interface LayerReport {readonly name:string;readonly activation:string;readonly weightShape:readonly number[];readonly biasLength:number;readonly parameterCount:number;readonly min:number;readonly max:number;readonly meanAbs:number;readonly l2:number}
export function inspectParameters(model:InspectableModel):{readonly algorithm:string;readonly labels:readonly string[];readonly layers:readonly LayerReport[];readonly totalParameters:number;readonly source:string};
export function weightGrid(model:InspectableModel,unit:number):readonly (readonly number[])[];
export function parameterChange(model:InspectableModel):readonly {readonly name:string;readonly changedParameters:number;readonly parameterCount:number;readonly meanAbsChange:number;readonly maxAbsChange:number}[];
export function serializeModel(model:InspectableModel):string;
export function deserializeModel(text:string):InspectableModel;
export function parameterChecksum(model:InspectableModel):string;
