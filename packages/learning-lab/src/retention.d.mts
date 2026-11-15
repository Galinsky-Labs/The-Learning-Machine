import type {ShapeDataset} from './dataset.mjs';
import type {HoldoutSplit} from './split.mjs';
export const RETENTION_DISCLOSURES:readonly string[];
export function findAbsoluteRetentionClaims(text:string):string[];
export interface StoredModel {readonly algorithm:string}
export interface TrainingStore {readonly examples:readonly ShapeDataset['examples'][number][];readonly split:HoldoutSplit|null;readonly models:Readonly<Record<string,StoredModel>>;
 readonly disposal:{readonly removedExampleCount:number;readonly removedSplit:boolean;readonly scope:string;readonly physicalErasureGuaranteed:false;readonly modelsRetained:number}|null}
export function createLocalTrainingStore(dataset:ShapeDataset,split:HoldoutSplit):TrainingStore;
export function storeModel(store:TrainingStore,name:string,model:StoredModel):TrainingStore;
export function disposeTrainingData(store:TrainingStore):TrainingStore;
export function inspectStore(store:TrainingStore):{readonly exampleCount:number;readonly hasSplit:boolean;readonly disposal:TrainingStore['disposal'];
 readonly models:readonly {readonly name:string;readonly algorithm:string;readonly storesExamplesVerbatim:boolean;readonly storedExampleCount:number;readonly parameterCount:number}[];readonly disclosures:readonly string[]};
export interface RetentionAudit {readonly algorithm:string;readonly kind:'verbatim-storage'|'learned-parameters';readonly trainingExampleCount:number;readonly exactCopiesRecoverable:number|null;
 readonly meanTrainingConfidence?:number;readonly meanHeldOutConfidence?:number;readonly confidenceGap?:number;readonly templateSimilarity?:readonly {readonly label:string;readonly closestTrainingDistance:number;readonly pixelsCompared:number}[]|null;readonly summary:string;readonly origin:string}
export function auditRetention(model:StoredModel,dataset:ShapeDataset,split:HoldoutSplit):RetentionAudit;
