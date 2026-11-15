// TLM-070: every economic input carries an evidence class and a range. Missing or unsupported evidence never becomes a precise forecast.
export const EVIDENCE_CLASSES=Object.freeze(['measured','sourced-estimate','illustrative','unsupported']);
const assert=(c,m)=>{if(!c)throw new TypeError(m)};
export function assumption({id,label,low,high,unit,evidenceClass,source=null}){
 assert(typeof id==='string'&&/^[a-z][A-Za-z0-9-]{0,47}$/.test(id),'Invalid assumption id');assert(typeof label==='string'&&label.trim(),'Label required');
 assert(EVIDENCE_CLASSES.includes(evidenceClass),'Unknown evidence class');
 assert(typeof unit==='string'&&unit.length>0,'Unit required');
 if(low===null||high===null)assert(low===null&&high===null,'An unknown assumption has neither bound');
 else assert(Number.isFinite(low)&&Number.isFinite(high)&&low<=high,'Range must have low ≤ high');
 if(evidenceClass==='measured'||evidenceClass==='sourced-estimate')assert(typeof source==='string'&&source.length>0,'Measured or sourced assumptions need a source');
 return Object.freeze({id,label,low,high,unit,evidenceClass,source});
}
// Evaluates a monotone function at every corner of the assumption box and reports the interval plus provenance.
export function propagate(assumptions,fn,{maxCorners=256}={}){
 assert(Array.isArray(assumptions)&&assumptions.length>0,'Assumptions required');assert(typeof fn==='function','Model function required');
 const ids=new Set();for(const a of assumptions){assert(!ids.has(a.id),'Duplicate assumption '+a.id);ids.add(a.id)}
 const unknown=assumptions.filter(a=>a.low===null),unsupported=assumptions.filter(a=>a.evidenceClass==='unsupported');
 const provenance=Object.freeze(assumptions.map(a=>Object.freeze({id:a.id,evidenceClass:a.evidenceClass,source:a.source,range:a.low===null?null:[a.low,a.high]})));
 if(unknown.length)return Object.freeze({status:'unknown',low:null,high:null,point:null,missing:Object.freeze(unknown.map(a=>a.id)),provenance,
  statement:`Cannot be estimated: ${unknown.map(a=>a.label).join(', ')} unknown.`});
 assert(2**assumptions.length<=maxCorners,'Too many assumptions to enumerate corners');
 let low=Infinity,high=-Infinity;
 for(let mask=0;mask<2**assumptions.length;mask++){
  const values=Object.fromEntries(assumptions.map((a,i)=>[a.id,(mask>>i)&1?a.high:a.low]));
  const v=fn(values);assert(Number.isFinite(v),'Model produced a non-finite value');if(v<low)low=v;if(v>high)high=v;
 }
 const precise=unsupported.length===0&&assumptions.every(a=>a.evidenceClass==='measured')&&low===high;
 const status=unsupported.length?'not-a-forecast':assumptions.some(a=>a.evidenceClass==='illustrative')?'illustrative-range':'sourced-range';
 return Object.freeze({status,low,high,point:precise?low:null,missing:Object.freeze([]),unsupported:Object.freeze(unsupported.map(a=>a.id)),provenance,
  statement:status==='not-a-forecast'?`Range ${low}–${high} rests on unsupported assumptions (${unsupported.map(a=>a.label).join(', ')}); it is an exploration, not a forecast.`
   :status==='illustrative-range'?`Illustrative range ${low}–${high}; it follows from lesson assumptions, not from market evidence.`:`Range ${low}–${high} from sourced assumptions.`});
}
// One-at-a-time sensitivity: which assumption moves the result most across its own range (others at midpoint).
export function sensitivity(assumptions,fn){
 if(assumptions.some(a=>a.low===null))return Object.freeze({status:'unknown',ranking:Object.freeze([])});
 const mid=Object.fromEntries(assumptions.map(a=>[a.id,(a.low+a.high)/2]));
 const ranking=assumptions.map(a=>{const lo=fn({...mid,[a.id]:a.low}),hi=fn({...mid,[a.id]:a.high});return Object.freeze({id:a.id,swing:Math.abs(hi-lo),direction:hi>lo?'increases':hi<lo?'decreases':'none'})}).sort((x,y)=>y.swing-x.swing||x.id.localeCompare(y.id));
 return Object.freeze({status:'computed',ranking:Object.freeze(ranking)});
}
