export const MODEL_OUTPUT_ACTIVITIES:readonly ('training-copies'|'retained-archive'|'model-weights-distribution'|'generated-output')[];
export interface SourceView {readonly id:string;readonly citation:string;readonly issuedOn:string|null;readonly sourceUrl:string;readonly scopeLimitations:string}
export interface ModelOutputAssessment {readonly activity:string;readonly status:string;readonly sources:readonly SourceView[];readonly explanation:string}
export interface ModelOutputResult {readonly schemaVersion:'1.0.0';readonly scenarioId:string;readonly evaluationDate:string;readonly learningPermission:string;readonly learningPermissionScope:string;
 readonly assessments:readonly ModelOutputAssessment[];readonly issueActivities:readonly string[];readonly unresolvedActivities:readonly string[];readonly overall:string;readonly qualification:string;readonly axesIndependent:true}
export function evaluateModelOutputScenario(input:unknown,catalog:unknown):ModelOutputResult;
export function factsFromRetentionAudit(audit:unknown):{readonly modelReproducesProtectedExpressionOnPrompt:boolean|null;readonly basis:string};
