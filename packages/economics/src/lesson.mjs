import {simulateLicensing} from './scenarios.mjs';
import {buildCore,viewScenario,VIEWPOINTS} from './viewpoints.mjs';
import {entryCosts} from './competition.mjs';
import {estimateCreatorEarnings} from './earnings.mjs';
// TLM-072: Module 6 "Creator, Student and Market".
const creators=[{id:'ana',works:3},{id:'ben',works:1}];
export const LESSON_INPUTS=Object.freeze([
 {structure:'per-copy-purchase',currency:'USD',creators,learners:40,copyPriceMinor:1200,creatorRoyaltyBasisPoints:1500,rounding:'half-even'},
 {structure:'subscription',currency:'USD',creators,learners:40,subscriptionPriceMinor:900,creatorPoolBasisPoints:3000,rounding:'half-even'},
 {structure:'library-access',currency:'USD',creators,learners:40,libraryAcquisitionPriceMinor:4500,creatorRoyaltyBasisPoints:1500,rounding:'half-even'},
 {structure:'collective-license',currency:'USD',creators,developers:2,licenseFeeMinor:30000,administrationBasisPoints:1000,rounding:'half-even'},
 {structure:'learning-permission-with-lawful-copy',currency:'USD',creators,developers:2,copyPriceMinor:1200,creatorRoyaltyBasisPoints:1500,rounding:'half-even'}
].map(i=>Object.freeze(i)));
export const TRANSFER_MARKETS=Object.freeze({
 'small-entrant':Object.freeze({fixedEntryCostMinor:500000,worksNeeded:50,perWorkLicenseMinor:2000,collectiveFlatFeeMinor:400000,lawfulCopyPriceMinor:1500,expectedRevenueMinor:800000}),
 'large-entrant':Object.freeze({fixedEntryCostMinor:500000,worksNeeded:5000,perWorkLicenseMinor:2000,collectiveFlatFeeMinor:400000,lawfulCopyPriceMinor:1500,expectedRevenueMinor:8000000})
});
const ROLES=['creators','learners','developers'];
const freeze=o=>Object.freeze(o);
const need=(s,stage)=>{if(!s||s.stage!==stage)throw new RangeError(`Lesson is at ${s?.stage??'an unknown stage'}, not ${stage}`)};
const sign=v=>v>0?'gains':v<0?'pays':'unchanged';
function roleNets(result){
 const creatorsNet=Object.entries(result.ledger.balances).filter(([k])=>k.startsWith('creator-')).reduce((n,[,v])=>n+v,0);
 return {creators:creatorsNet,learners:result.ledger.balances.learners+result.ledger.balances.library,developers:result.ledger.balances.developers};
}
export function createMarketLesson(){return freeze({stage:'decide',decision:null,predictions:null,observation:null,viewpointsSeen:freeze([]),revision:null,transfer:null})}
export function chooseStructure(s,structure){need(s,'decide');if(!LESSON_INPUTS.some(i=>i.structure===structure))throw new RangeError('Choose one of the lesson structures');return freeze({...s,stage:'predict',decision:structure})}
export function predictConsequences(s,predictions){
 need(s,'predict');
 for(const r of ROLES)if(!['gains','pays','unchanged'].includes(predictions?.[r]))throw new TypeError('Predict gains, pays or unchanged for every role');
 return freeze({...s,stage:'run',predictions:freeze({...predictions})});
}
export function runMarket(s){
 need(s,'run');
 const result=simulateLicensing(LESSON_INPUTS.find(i=>i.structure===s.decision)),nets=roleNets(result);
 const consequences=freeze(ROLES.map(r=>freeze({id:`${s.decision}:${r}`,role:r,netMinor:nets[r],observed:sign(nets[r]),predicted:s.predictions[r],matched:sign(nets[r])===s.predictions[r]})));
 return freeze({...s,stage:'viewpoints',observation:freeze({result,consequences,earnings:estimateCreatorEarnings()})});
}
export function viewMarketViewpoint(s,viewpoint){
 if(!['viewpoints','revise'].includes(s?.stage))throw new RangeError('Run the market first');
 const view=viewScenario(buildCore(LESSON_INPUTS),viewpoint);
 const seen=s.viewpointsSeen.includes(viewpoint)?s.viewpointsSeen:freeze([...s.viewpointsSeen,viewpoint]);
 return freeze({...s,stage:seen.length>=2?'revise':'viewpoints',viewpointsSeen:seen,lastView:view});
}
// A revision must cite an explicit consequence; keeping the original decision is allowed with a reason.
export function reviseDecision(s,{structure,citedConsequenceId,reason}){
 need(s,'revise');
 if(!LESSON_INPUTS.some(i=>i.structure===structure))throw new RangeError('Choose one of the lesson structures');
 const core=buildCore(LESSON_INPUTS),ids=new Set(core.rows.flatMap(r=>ROLES.map(role=>`${r.structure}:${role}`)));
 if(!ids.has(citedConsequenceId))throw new RangeError('Cite one of the computed consequences');
 if(typeof reason!=='string'||reason.trim().length<10||reason.trim().length>600)throw new RangeError('Reason must contain 10–600 characters');
 return freeze({...s,stage:'transfer',revision:freeze({from:s.decision,to:structure,changed:structure!==s.decision,citedConsequenceId,reason:reason.trim(),agreementRequired:false})});
}
export function consequenceTable(){
 return freeze(LESSON_INPUTS.flatMap(i=>{const nets=roleNets(simulateLicensing(i));return ROLES.map(r=>freeze({id:`${i.structure}:${r}`,structure:i.structure,role:r,netMinor:nets[r]}))}));
}
export function runMarketTransfer(s,market,predictedCheapest){
 need(s,'transfer');
 const assumptions=TRANSFER_MARKETS[market];if(!assumptions)throw new RangeError('Unknown transfer market');
 const result=entryCosts(assumptions);
 if(!result.ranking.includes(predictedCheapest))throw new RangeError('Predict which regime is cheapest for the entrant');
 return freeze({...s,stage:'complete',transfer:freeze({market,predictedCheapest,result,matched:predictedCheapest===result.cheapestForEntrant})});
}
export const MARKET_VIEWPOINTS=Object.keys(VIEWPOINTS);
