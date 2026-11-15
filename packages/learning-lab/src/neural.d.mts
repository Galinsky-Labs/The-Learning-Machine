import type {ShapeDataset,DrawingPixels} from './dataset.mjs';
import type {HoldoutSplit} from './split.mjs';
export const NEURAL_ALGORITHM:'mlp-relu-softmax-v1';
export const NEURAL_LIMITS:{readonly minHidden:number;readonly maxHidden:number;readonly maxEpochs:number;readonly maxExamples:number;readonly maxTimeBudgetMs:number;readonly defaultTimeBudgetMs:number};
export const NEURAL_CAVEATS:readonly string[];
export interface NeuralOptions {hiddenUnits?:number;epochs?:number;learningRate?:number;seed?:number;timeBudgetMs?:number}
export interface NeuralLayer {readonly name:'hidden'|'output';readonly activation:'relu'|'softmax';readonly weights:readonly (readonly number[])[];readonly bias:readonly number[]}
export interface NeuralModel {readonly algorithm:'mlp-relu-softmax-v1';readonly backend:string;readonly labels:readonly string[];readonly hiddenUnits:number;readonly seed:number;readonly learningRate:number;
 readonly requestedEpochs:number;readonly epochs:number;readonly stoppedReason:'completed'|'time-budget'|'cancelled';readonly fallbackReason:string|null;readonly timeBudgetMs:number;
 readonly trainingWallClockMs:number;readonly trainingWallClockKind:'measured';readonly inputShape:readonly number[];readonly layers:readonly NeuralLayer[];readonly initialLayers:readonly NeuralLayer[];
 readonly history:readonly {readonly epoch:number;readonly loss:number;readonly trainingAccuracy:number}[];readonly trainingExampleIds:readonly string[];readonly caveats:readonly string[];readonly source:string}
export interface ForwardResult {preActivation:number[];activation:number[];logits:number[];probabilities:number[]}
export function validateNeuralOptions(options?:NeuralOptions):Required<NeuralOptions>;
export function initialNeuralParameters(inputSize:number,hiddenUnits:number,classCount:number,seed:number):NeuralLayer[];
export function forwardPass(layers:readonly NeuralLayer[],pixels:DrawingPixels):ForwardResult;
export function trainReferenceNetwork(dataset:ShapeDataset,split:HoldoutSplit,options?:NeuralOptions,runtime?:{now?:()=>number;signal?:AbortSignal}):NeuralModel;
export function trainNeuralNetwork(dataset:ShapeDataset,split:HoldoutSplit,options?:NeuralOptions,runtime?:{backend?:'reference'|'tfjs';loadTensorflow?:()=>Promise<unknown>;now?:()=>number;signal?:AbortSignal}):Promise<NeuralModel>;
export function validateNeuralModel(model:unknown):NeuralModel;
export function classifyWithNetwork(model:NeuralModel,pixels:DrawingPixels):{readonly predictedLabel:string;readonly confidence:number;readonly classScores:readonly {readonly label:string;readonly probability:number}[];readonly origin:string};
export function evaluateNetworkHoldout(model:NeuralModel,dataset:ShapeDataset,split:HoldoutSplit):{readonly exampleCount:number;readonly correctCount:number;readonly accuracy:number|null;
 readonly predictions:readonly {readonly id:string;readonly actualLabel:string;readonly predictedLabel:string;readonly confidence:number;readonly correct:boolean}[];readonly source:string};
