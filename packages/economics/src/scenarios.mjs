import {createLedger,applyTransfer,multiplyMinor,applyBasisPoints,allocate,addMinor} from './money.mjs';
// TLM-067: hypothetical access, fee and licensing structures. Every amount comes from a declared input; nothing has a default.
export const STRUCTURES=Object.freeze({
 'per-copy-purchase':['structure','currency','creators','learners','copyPriceMinor','creatorRoyaltyBasisPoints','rounding'],
 'subscription':['structure','currency','creators','learners','subscriptionPriceMinor','creatorPoolBasisPoints','rounding'],
 'library-access':['structure','currency','creators','learners','libraryAcquisitionPriceMinor','creatorRoyaltyBasisPoints','rounding'],
 'collective-license':['structure','currency','creators','developers','licenseFeeMinor','administrationBasisPoints','rounding'],
 'learning-permission-with-lawful-copy':['structure','currency','creators','developers','copyPriceMinor','creatorRoyaltyBasisPoints','rounding']
});
const assert=(c,m)=>{if(!c)throw new TypeError(m)};
function validate(input){
 assert(input&&typeof input==='object'&&STRUCTURES[input.structure],'Unknown licensing structure');
 const keys=Object.keys(input).sort(),need=[...STRUCTURES[input.structure]].sort();
 assert(keys.length===need.length&&keys.every((k,i)=>k===need[i]),`Structure ${input.structure} requires exactly: ${need.join(', ')}`);
 assert(Array.isArray(input.creators)&&input.creators.length>=1&&input.creators.length<=12,'1–12 creators required');
 for(const c of input.creators)assert(/^[a-z][a-z0-9-]{0,31}$/.test(c.id)&&Number.isInteger(c.works)&&c.works>=1&&c.works<=1000,'Each creator needs an id and 1–1000 works');
 for(const k of ['learners','developers'])if(k in input)assert(Number.isInteger(input[k])&&input[k]>=0&&input[k]<=1_000_000,k+' must be 0–1,000,000');
 return input;
}
export function simulateLicensing(raw){
 const input=validate(raw),works=input.creators.reduce((n,c)=>n+c.works,0),R=input.rounding;
 const accounts={learners:0,developers:0,publisher:0,library:0,'collecting-body':0};for(const c of input.creators)accounts['creator-'+c.id]=0;
 let ledger=createLedger(input.currency,accounts),n=0;
 const pay=(from,to,amountMinor,memo)=>{if(amountMinor>0)ledger=applyTransfer(ledger,{id:'e'+(++n),from,to,amountMinor,memo})};
 const royaltiesFrom=(payer,grossMinor,bp,memo)=>{const pool=applyBasisPoints(grossMinor,bp,R),parts=allocate(pool,input.creators.map(c=>c.works));input.creators.forEach((c,i)=>pay(payer,'creator-'+c.id,parts[i],memo))};
 switch(input.structure){
  case 'per-copy-purchase':{const gross=multiplyMinor(multiplyMinor(input.copyPriceMinor,works),input.learners);pay('learners','publisher',gross,'learners buy one copy of each work');royaltiesFrom('publisher',gross,input.creatorRoyaltyBasisPoints,'royalty on copy sales');break}
  case 'subscription':{const gross=multiplyMinor(input.subscriptionPriceMinor,input.learners);pay('learners','publisher',gross,'learner subscriptions');royaltiesFrom('publisher',gross,input.creatorPoolBasisPoints,'subscription pool shared by works');break}
  case 'library-access':{const gross=multiplyMinor(input.libraryAcquisitionPriceMinor,works);pay('library','publisher',gross,'library buys one lending copy of each work');royaltiesFrom('publisher',gross,input.creatorRoyaltyBasisPoints,'royalty on library sales');break}
  case 'collective-license':{const gross=multiplyMinor(input.licenseFeeMinor,input.developers);pay('developers','collecting-body',gross,'developers pay a collective learning license');royaltiesFrom('collecting-body',gross,10000-input.administrationBasisPoints,'collective license distribution');break}
  case 'learning-permission-with-lawful-copy':{const gross=multiplyMinor(multiplyMinor(input.copyPriceMinor,works),input.developers);pay('developers','publisher',gross,'developers buy one lawful copy of each work; learning itself is unpriced');royaltiesFrom('publisher',gross,input.creatorRoyaltyBasisPoints,'royalty on copy sales');break}
 }
 const net=Object.freeze(Object.fromEntries(Object.entries(ledger.balances).filter(([,v])=>v!==0)));
 const creatorTotal=input.creators.reduce((s,c)=>addMinor(s,ledger.balances['creator-'+c.id]),0);
 return Object.freeze({structure:input.structure,currency:input.currency,ledger,net,creatorTotalMinor:creatorTotal,perLearnerCostMinor:input.learners?Math.round(-(ledger.balances.learners)/input.learners):null,
  declaredInputs:Object.freeze({...input,creators:Object.freeze(input.creators.map(c=>Object.freeze({...c})))}),evidenceClass:'illustrative',
  note:'Every amount follows from the declared inputs above. They are illustrative lesson values, not market data.'});
}
