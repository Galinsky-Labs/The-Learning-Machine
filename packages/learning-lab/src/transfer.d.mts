import type {DrawingPixels} from './dataset.mjs';
import type {LinearModel,NearestExampleMemorizer} from './classifier.mjs';
import type {NeuralModel} from './neural.mjs';
export type TransferModelKey='memorizer'|'linear'|'network';
export interface TransferTask {readonly id:string;readonly label:string|null;readonly prompt:string;readonly pixels:DrawingPixels}
export const TRANSFER_TASKS:readonly TransferTask[];
export interface TransferOutcome {readonly predictedLabel:string;readonly correct:boolean|null;readonly learnerExpectedCorrect:boolean|null;readonly surprise:boolean}
export interface TransferResult {readonly algorithm:'transfer-challenge-v1';readonly rows:readonly {readonly taskId:string;readonly expectedLabel:string|null;readonly ambiguous:boolean;readonly outcomes:Readonly<Record<TransferModelKey,TransferOutcome>>}[];
 readonly surprises:readonly {readonly taskId:string;readonly model:TransferModelKey;readonly correct:boolean|null}[];readonly unexpectedFailures:readonly {readonly taskId:string;readonly model:TransferModelKey;readonly correct:boolean|null}[];
 readonly revisionRequired:boolean;readonly origin:string;readonly ambiguityNote:string}
export function runTransferChallenge(models:{memorizer:NearestExampleMemorizer;linear:LinearModel;network:NeuralModel},predictions:Record<string,Record<TransferModelKey,boolean>>):TransferResult;
export function recordTransferRevision(result:TransferResult,text:string,options?:{citedTaskId?:string}):{readonly revision:string;readonly citedTaskId:string|null;readonly recordedAfterObservation:true;readonly agreementRequired:false};
