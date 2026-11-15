import {simulateLicensing} from './scenarios.mjs';
// TLM-071: creator, teacher and developer viewpoints over one unchanged factual core.
const assert=(c,m)=>{if(!c)throw new TypeError(m)};
export const VIEWPOINTS=Object.freeze({
 creator:Object.freeze({label:'Creator',metric:'creatorTotalMinor',worseWhen:'lower',interest:'income from their works',
  premise:'Does this scenario assume learners would otherwise have bought my work at all?',selfCheck:'Would a higher price also mean fewer learners ever find my work?'}),
 teacher:Object.freeze({label:'Teacher',metric:'learnerCostMinor',worseWhen:'higher',interest:'affordable access for students',
  premise:'Does this scenario count students who cannot pay, or only those who do?',selfCheck:'If creators earn too little, will the works my students need keep being made?'}),
 developer:Object.freeze({label:'Developer',metric:'developerCostMinor',worseWhen:'higher',interest:'the cost of building and entering the market',
  premise:'Does this scenario assume my model substitutes for the works rather than complements them?',selfCheck:'Is a cheaper input fair if outputs from my model compete with the creators who supplied it?'})
});
export function digest(value){const t=JSON.stringify(value);let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')}
// core: {inputs: [licensing inputs for each structure]} — the same objects for every viewpoint.
export function buildCore(inputs){
 assert(Array.isArray(inputs)&&inputs.length>=2,'Compare at least two structures');
 const results=inputs.map(i=>simulateLicensing(i));
 const rows=results.map(r=>Object.freeze({structure:r.structure,creatorTotalMinor:r.creatorTotalMinor,learnerCostMinor:-(r.ledger.balances.learners)-(r.ledger.balances.library),developerCostMinor:-(r.ledger.balances.developers)}));
 const core=Object.freeze({rows:Object.freeze(rows),inputsDigest:digest(inputs)});
 return Object.freeze({...core,coreDigest:digest(core.rows)});
}
export function viewScenario(core,viewpoint){
 const v=VIEWPOINTS[viewpoint];assert(v,'Unknown viewpoint');
 const sorted=[...core.rows].sort((a,b)=>(v.worseWhen==='lower'?a[v.metric]-b[v.metric]:b[v.metric]-a[v.metric])||a.structure.localeCompare(b.structure));
 const worst=sorted[0],best=sorted[sorted.length-1];
 const same=worst[v.metric]===best[v.metric];
 return Object.freeze({viewpoint,label:v.label,coreDigest:digest(core.rows),emphasis:v.metric,interest:v.interest,
  ranking:Object.freeze(sorted.map(r=>Object.freeze({structure:r.structure,value:r[v.metric]}))),
  opposition:same?Object.freeze({target:null,argument:`On these inputs every structure gives the same ${v.metric}; this viewpoint has no numeric objection.`})
   :Object.freeze({target:worst.structure,argument:`As a ${v.label.toLowerCase()}, I oppose ${worst.structure}: ${v.metric} is ${worst[v.metric]} versus ${best[v.metric]} under ${best.structure}.`}),
  premiseChallenge:v.premise,selfCheck:v.selfCheck});
}
