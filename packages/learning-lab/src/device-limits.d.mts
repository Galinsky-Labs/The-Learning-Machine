export const WORK_LIMITS:{readonly standardMaxMultiplyAdds:number;readonly lowPowerMaxMultiplyAdds:number;readonly lowPowerMaxHidden:number;readonly lowPowerMaxEpochs:number;readonly lowPowerTimeBudgetMs:number;readonly workerGraceMs:number};
export interface Capabilities {readonly worker:boolean;readonly webgl:boolean;readonly hardwareConcurrency:number|null;readonly deviceMemoryGb:number|null;readonly saveData:boolean;readonly source?:string}
export function estimateTrainingWork(request:{examples:number;hiddenUnits:number;epochs:number;classes:number}):{readonly multiplyAdds:number;readonly perExample:number;readonly basis:string};
export function detectCapabilities(scope?:unknown):Capabilities;
export interface TrainingPlan {readonly mode:'standard'|'low-power';readonly hiddenUnits:number;readonly epochs:number;readonly timeBudgetMs:number;readonly offerTensorflow:boolean;readonly offerGpu:boolean;readonly runInWorker:boolean;
 readonly work:{readonly multiplyAdds:number;readonly perExample:number;readonly basis:string};readonly reasons:readonly string[];readonly alternative:string}
export function planTraining(request:{examples:number;hiddenUnits:number;epochs:number;classes:number},capabilities:Capabilities):TrainingPlan;
export interface WorkerLike {onmessage:((event:{data:unknown})=>void)|null;onerror:((event:unknown)=>void)|null;postMessage(message:unknown):void;terminate():void}
export function createTrainingWorkerController(createWorker:()=>WorkerLike):{run<T=unknown>(task:unknown,options:{budgetMs:number}):Promise<T>;cancel(reason?:string):boolean;readonly active:boolean};
