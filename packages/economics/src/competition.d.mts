export const REGIMES:readonly string[];
export interface CompetitionAssumptions {fixedEntryCostMinor:number;worksNeeded:number;perWorkLicenseMinor:number;collectiveFlatFeeMinor:number;lawfulCopyPriceMinor:number;expectedRevenueMinor:number}
export interface EntryCosts {readonly rows:readonly {readonly regime:string;readonly accessCostMinor:number;readonly totalEntryCostMinor:number;readonly marginMinor:number;readonly entryViable:boolean}[];readonly cheapestForEntrant:string;readonly ranking:readonly string[];readonly creatorSideNote:string;readonly evidenceClass:string}
export function validateCompetitionAssumptions(a:unknown):CompetitionAssumptions;
export function entryCosts(a:CompetitionAssumptions):EntryCosts;
export function compareAssumptionSets(a:CompetitionAssumptions,b:CompetitionAssumptions):{readonly first:EntryCosts;readonly second:EntryCosts;readonly reversed:boolean;readonly changedInputs:readonly string[]};
