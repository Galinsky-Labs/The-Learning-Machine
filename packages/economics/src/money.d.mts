export const ROUNDING_MODES:readonly ('floor'|'ceil'|'half-even')[];
export function addMinor(a:number,b:number):number;export function multiplyMinor(a:number,n:number):number;
export function applyBasisPoints(amountMinor:number,basisPoints:number,mode:'floor'|'ceil'|'half-even'):number;
export function allocate(totalMinor:number,weights:readonly number[]):readonly number[];
export interface Ledger {readonly currency:string;readonly balances:Readonly<Record<string,number>>;readonly events:readonly {readonly id:string;readonly from:string;readonly to:string;readonly amountMinor:number;readonly memo:string}[];readonly openingTotal:number}
export function createLedger(currency:string,openingBalances:Record<string,number>):Ledger;
export function applyTransfer(ledger:Ledger,event:{id:string;from:string;to:string;amountMinor:number;memo:string}):Ledger;
export function assertConserved(ledger:Ledger):true;
export function formatMinor(amountMinor:number,currency?:string):string;
