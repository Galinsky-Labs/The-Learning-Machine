import type {Ledger} from './money.mjs';
export const STRUCTURES:Readonly<Record<string,readonly string[]>>;
export interface LicensingResult {readonly structure:string;readonly currency:string;readonly ledger:Ledger;readonly net:Readonly<Record<string,number>>;readonly creatorTotalMinor:number;readonly perLearnerCostMinor:number|null;readonly declaredInputs:Record<string,unknown>;readonly evidenceClass:'illustrative';readonly note:string}
export function simulateLicensing(input:Record<string,unknown>):LicensingResult;
