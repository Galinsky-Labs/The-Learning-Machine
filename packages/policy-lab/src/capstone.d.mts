export const EVIDENCE:Readonly<Record<'technical'|'legal'|'economic',Readonly<Record<string,string>>>>;
export const CAPSTONE_EXERCISES:readonly {readonly id:string;readonly prompt:string}[];
export const POSITIONS:readonly string[];
export interface CapstoneAssessment {readonly exerciseId:string;readonly position:string;readonly criteria:readonly {readonly id:string;readonly met:boolean;readonly description:string}[];readonly complete:boolean;readonly evidenceByDomain:Record<string,readonly string[]>;readonly positionAffectsAssessment:false;readonly note:string}
export function assessCapstone(exerciseId:string,submission:{position:string;reasoning:string;evidenceIds:string[];counterargument:string;response:string}):CapstoneAssessment;
