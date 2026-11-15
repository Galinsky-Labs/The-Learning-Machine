import type {Assumption,Propagation} from './assumptions.mjs';
export function creatorEarningsModel(values:Record<string,number>):number;
export const DEFAULT_EARNINGS_ASSUMPTIONS:readonly Assumption[];
export function estimateCreatorEarnings(assumptions?:readonly Assumption[]):Propagation&{readonly sensitivity:{readonly status:string;readonly ranking:readonly {readonly id:string;readonly swing:number;readonly direction:string}[]};readonly kind:'conditional-estimate';readonly conditional:string;readonly disclaimer:string};
