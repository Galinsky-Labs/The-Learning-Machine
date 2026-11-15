import {assumption,propagate,sensitivity} from './assumptions.mjs';
// TLM-068: creator earnings under possible market substitution. Always conditional on stated assumptions.
const assert=(c,m)=>{if(!c)throw new TypeError(m)};
export function creatorEarningsModel(v){
 assert(v.substitutionShare>=0&&v.substitutionShare<=1,'Substitution share must be between 0 and 1');
 assert(v.baselineUnitSales>=0&&v.royaltyPerUnitMinor>=0&&v.licensingIncomeMinor>=0,'Earnings inputs must be nonnegative');
 return Math.round(v.baselineUnitSales*(1-v.substitutionShare)*v.royaltyPerUnitMinor+v.licensingIncomeMinor);
}
export const DEFAULT_EARNINGS_ASSUMPTIONS=Object.freeze([
 assumption({id:'baselineUnitSales',label:'yearly unit sales without substitution',low:800,high:1200,unit:'units',evidenceClass:'illustrative'}),
 assumption({id:'substitutionShare',label:'share of sales replaced by substitutive outputs',low:0,high:0.3,unit:'fraction',evidenceClass:'unsupported'}),
 assumption({id:'royaltyPerUnitMinor',label:'creator royalty per unit',low:150,high:250,unit:'minor units',evidenceClass:'illustrative'}),
 assumption({id:'licensingIncomeMinor',label:'yearly learning-license income',low:0,high:40000,unit:'minor units',evidenceClass:'illustrative'})
]);
export function estimateCreatorEarnings(assumptions=DEFAULT_EARNINGS_ASSUMPTIONS){
 const ids=assumptions.map(a=>a.id).sort().join(',');
 assert(ids==='baselineUnitSales,licensingIncomeMinor,royaltyPerUnitMinor,substitutionShare','Earnings needs exactly the four declared assumptions');
 const sub=assumptions.find(a=>a.id==='substitutionShare');
 if(sub.low!==null)assert(sub.low>=0&&sub.high<=1,'Substitution share must be between 0 and 1');
 const range=propagate(assumptions,creatorEarningsModel),sens=sensitivity(assumptions,creatorEarningsModel);
 return Object.freeze({...range,sensitivity:sens,kind:'conditional-estimate',
  conditional:range.status==='unknown'?range.statement:`If yearly sales are ${fmt(assumptions,'baselineUnitSales')} units, substitution replaces ${fmt(assumptions,'substitutionShare')} of them, royalties are ${fmt(assumptions,'royaltyPerUnitMinor')} minor units and license income is ${fmt(assumptions,'licensingIncomeMinor')}, then creator earnings fall between ${range.low} and ${range.high} minor units a year.`,
  disclaimer:'Conditional exploration of stated assumptions. It is not a factual verdict about any real market.'});
}
function fmt(list,id){const a=list.find(x=>x.id===id);return a.low===a.high?String(a.low):`${a.low}–${a.high}`}
