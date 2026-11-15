import type {ShapeDataset} from './dataset.mjs';
import type {HoldoutSplit} from './split.mjs';
import type {NeuralModel} from './neural.mjs';
export const MODEL_TRACE_SCHEMA:'tlm-model-trace-v1';
export const DEFAULT_REPLAY_TOLERANCE:number;
export interface ModelTrace {readonly schema:'tlm-model-trace-v1';readonly algorithm:string;readonly backend:string;readonly fallbackReason:string|null;
 readonly options:{readonly hiddenUnits:number;readonly learningRate:number;readonly seed:number;readonly requestedEpochs:number;readonly timeBudgetMs:number};
 readonly completedEpochs:number;readonly stoppedReason:string;readonly split:{readonly algorithm:string;readonly seed:number;readonly testFraction:number;readonly trainIds:readonly string[];readonly testIds:readonly string[]};
 readonly datasetDigest:string;readonly parameterChecksum:string;readonly trainingWallClockMs:number;readonly trainingWallClockKind:string;readonly determinism:readonly string[]}
export interface ReplayResult {readonly status:'exact-match'|'within-tolerance'|'diverged';readonly maxAbsDifference:number;readonly tolerance:number;readonly comparedParameters:number;readonly replayBackend:string;readonly explanation:string}
export function datasetDigest(dataset:ShapeDataset):string;
export function determinismNote(backend:string,stoppedReason:string):readonly string[];
export function createModelExperimentTrace(model:NeuralModel,dataset:ShapeDataset,split:HoldoutSplit):ModelTrace;
export function validateModelTrace(trace:unknown):ModelTrace;
export function replayModelExperiment(trace:ModelTrace,model:NeuralModel,dataset:ShapeDataset,options?:{tolerance?:number}):ReplayResult;
