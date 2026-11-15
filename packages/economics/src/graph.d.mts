export const ROLES:readonly string[];export const EDGE_KINDS:readonly ('permission'|'information'|'money')[];export const RIGHTS:readonly string[];export const CONTENT:readonly string[];
export interface Actor {readonly id:string;readonly role:string;readonly label:string}
export type Edge={readonly kind:'permission';readonly id:string;readonly from:string;readonly to:string;readonly right:string}|{readonly kind:'information';readonly id:string;readonly from:string;readonly to:string;readonly content:string}|{readonly kind:'money';readonly id:string;readonly from:string;readonly to:string;readonly amountMinor:number;readonly currency:string};
export interface StakeholderGraph {readonly actors:readonly Actor[];readonly edges:readonly Edge[]}
export function createStakeholderGraph(input:{actors:Actor[];edges:Edge[]}):StakeholderGraph;
export function edgesOfKind(graph:StakeholderGraph,kind:'permission'|'information'|'money'):readonly Edge[];
export function auditGraph(graph:StakeholderGraph):{readonly findings:readonly {readonly edgeId:string;readonly finding:string;readonly note:string}[];readonly summary:Record<string,number>;readonly note:string};
