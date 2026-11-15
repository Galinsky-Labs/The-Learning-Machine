// TLM-066: integer minor units, explicit rounding and balanced double-entry events.
const assert=(c,m,E=TypeError)=>{if(!c)throw new E(m)};
const safe=(v,l)=>{assert(Number.isSafeInteger(v),l+' must be a safe integer of minor units',RangeError);return v};
export const ROUNDING_MODES=Object.freeze(['floor','ceil','half-even']);
export function addMinor(a,b){const r=safe(a,'Amount')+safe(b,'Amount');assert(Number.isSafeInteger(r),'Overflow beyond safe integer range',RangeError);return r}
export function multiplyMinor(a,n){safe(a,'Amount');safe(n,'Multiplier');const r=a*n;assert(Number.isSafeInteger(r),'Overflow beyond safe integer range',RangeError);return r}
// Applies a rate in basis points (1/100 of a percent) with an explicit rounding rule.
export function applyBasisPoints(amountMinor,basisPoints,mode){
 safe(amountMinor,'Amount');assert(Number.isInteger(basisPoints)&&basisPoints>=0&&basisPoints<=10000,'Basis points must be 0–10000',RangeError);assert(ROUNDING_MODES.includes(mode),'Choose an explicit rounding mode');
 const product=BigInt(amountMinor)*BigInt(basisPoints),q=product/10000n,r=product%10000n;
 let out=q;
 if(r!==0n){const neg=product<0n;if(mode==='ceil'&&!neg)out=q+1n;else if(mode==='floor'&&neg)out=q-1n;else if(mode==='half-even'){const twice=(r<0n?-r:r)*2n;if(twice>10000n||(twice===10000n&&(q%2n!==0n)))out=neg?q-1n:q+1n}}
 const n=Number(out);assert(Number.isSafeInteger(n),'Overflow',RangeError);return n;
}
// Splits a total among shares by largest remainder; the parts always sum exactly to the total.
export function allocate(totalMinor,weights){
 safe(totalMinor,'Total');assert(totalMinor>=0,'Total must be nonnegative',RangeError);
 assert(Array.isArray(weights)&&weights.length>0&&weights.every(w=>Number.isSafeInteger(w)&&w>=0)&&weights.some(w=>w>0),'Weights must be nonnegative integers with a positive sum',RangeError);
 const sum=weights.reduce((a,b)=>a+b,0),T=BigInt(totalMinor),S=BigInt(sum);
 const base=weights.map(w=>(T*BigInt(w))/S),rem=weights.map((w,i)=>({i,r:(T*BigInt(w))%S}));
 let left=T-base.reduce((a,b)=>a+b,0n);
 rem.sort((a,b)=>a.r===b.r?a.i-b.i:(b.r>a.r?1:-1));
 for(const {i} of rem){if(left===0n)break;base[i]+=1n;left-=1n}
 return Object.freeze(base.map(Number));
}
export function createLedger(currency,openingBalances){
 assert(/^[A-Z]{3}$/.test(currency),'Currency code required');
 assert(openingBalances&&typeof openingBalances==='object','Opening balances required');
 const balances={};for(const [k,v] of Object.entries(openingBalances)){assert(/^[a-z][a-z0-9-]{0,47}$/.test(k),'Invalid account');balances[k]=safe(v,'Opening balance')}
 return Object.freeze({currency,balances:Object.freeze(balances),events:Object.freeze([]),openingTotal:Object.values(balances).reduce((a,b)=>addMinor(a,b),0)});
}
export function applyTransfer(ledger,{id,from,to,amountMinor,memo}){
 assert(typeof id==='string'&&id.length>0&&id.length<=64,'Event id required');assert(!ledger.events.some(e=>e.id===id),'Duplicate event '+id);
 assert(from in ledger.balances&&to in ledger.balances,'Unknown account in '+id);assert(from!==to,'Transfer must move between accounts');
 safe(amountMinor,'Amount');assert(amountMinor>0,'Transfer amount must be positive',RangeError);
 assert(typeof memo==='string'&&memo.trim().length>0,'Every transfer states what it is for');
 const balances={...ledger.balances,[from]:addMinor(ledger.balances[from],-amountMinor),[to]:addMinor(ledger.balances[to],amountMinor)};
 const next=Object.freeze({...ledger,balances:Object.freeze(balances),events:Object.freeze([...ledger.events,Object.freeze({id,from,to,amountMinor,memo})])});
 assertConserved(next);return next;
}
export function assertConserved(ledger){
 const total=Object.values(ledger.balances).reduce((a,b)=>addMinor(a,b),0);
 assert(total===ledger.openingTotal,'Ledger is not conserved',RangeError);return true;
}
export function formatMinor(amountMinor,currency='USD'){safe(amountMinor,'Amount');const sign=amountMinor<0?'-':'',a=Math.abs(amountMinor);return `${sign}${currency} ${Math.floor(a/100)}.${String(a%100).padStart(2,'0')}`}
