import test from 'node:test';import assert from 'node:assert/strict';
import {assumption,propagate,sensitivity} from '../src/assumptions.mjs';
import {estimateCreatorEarnings,DEFAULT_EARNINGS_ASSUMPTIONS,creatorEarningsModel} from '../src/earnings.mjs';
import {entryCosts,compareAssumptionSets} from '../src/competition.mjs';
import {buildCore,viewScenario,VIEWPOINTS} from '../src/viewpoints.mjs';
import {LESSON_INPUTS,TRANSFER_MARKETS} from '../src/lesson.mjs';
const a=(id,low,high,evidenceClass='illustrative',source=null)=>assumption({id,label:id,low,high,unit:'u',evidenceClass,source});
test('unknown inputs propagate to an unknown result instead of a precise forecast',()=>{
 const r=propagate([a('x',1,2),a('y',null,null)],v=>v.x*v.y);
 assert.equal(r.status,'unknown');assert.equal(r.point,null);assert.deepEqual(r.missing,['y']);
 assert.equal(sensitivity([a('y',null,null)],v=>v.y).status,'unknown');
});
test('unsupported evidence is labelled not-a-forecast and never yields a point value',()=>{
 const r=propagate([a('x',2,2,'unsupported')],v=>v.x*10);
 assert.equal(r.status,'not-a-forecast');assert.equal(r.point,null);assert.equal(r.low,20);assert.match(r.statement,/not a forecast/);
 const measured=propagate([a('x',2,2,'measured','test fixture')],v=>v.x*10);assert.equal(measured.point,20);
 assert.equal(propagate([a('x',2,2,'illustrative')],v=>v.x).point,null);
});
test('range boundaries, malformed assumptions and provenance',()=>{
 assert.throws(()=>a('x',3,1),/low ≤ high/);assert.throws(()=>a('x',1,null),/neither bound/);
 assert.throws(()=>a('x',1,2,'measured'),/need a source/);assert.throws(()=>a('x',1,2,'guess'),/evidence class/);
 const r=propagate([a('x',1,3),a('y',-1,1)],v=>v.x*v.y);assert.deepEqual([r.low,r.high],[-3,3]);
 assert.equal(r.provenance.length,2);assert.throws(()=>propagate([a('x',1,2),a('x',1,2)],v=>v.x),/Duplicate/);
});
test('creator earnings are a visibly conditional range driven by stated assumptions',()=>{
 const r=estimateCreatorEarnings();
 assert.equal(r.kind,'conditional-estimate');assert.equal(r.status,'not-a-forecast');assert.equal(r.point,null);
 assert.match(r.conditional,/^If /);assert.match(r.disclaimer,/not a factual verdict/);
 assert.equal(r.low,creatorEarningsModel({baselineUnitSales:800,substitutionShare:0.3,royaltyPerUnitMinor:150,licensingIncomeMinor:0}));
 assert.equal(r.high,creatorEarningsModel({baselineUnitSales:1200,substitutionShare:0,royaltyPerUnitMinor:250,licensingIncomeMinor:40000}));
 assert.ok(r.sensitivity.ranking.length===4);
 const zeroSub=DEFAULT_EARNINGS_ASSUMPTIONS.map(x=>x.id==='substitutionShare'?a('substitutionShare',0,0):x);
 assert.equal(estimateCreatorEarnings(zeroSub).status,'illustrative-range');
 const fullSub=DEFAULT_EARNINGS_ASSUMPTIONS.map(x=>x.id==='substitutionShare'?a('substitutionShare',1,1):x);
 assert.equal(estimateCreatorEarnings(fullSub).low,0);
 assert.throws(()=>estimateCreatorEarnings(DEFAULT_EARNINGS_ASSUMPTIONS.map(x=>x.id==='substitutionShare'?a('substitutionShare',0,1.5):x)),/between 0 and 1/);
 assert.equal(estimateCreatorEarnings(DEFAULT_EARNINGS_ASSUMPTIONS.map(x=>x.id==='baselineUnitSales'?a('baselineUnitSales',null,null):x)).status,'unknown');
});
test('competition: alternative assumptions can honestly reverse the cheapest regime',()=>{
 const cmp=compareAssumptionSets(TRANSFER_MARKETS['small-entrant'],TRANSFER_MARKETS['large-entrant']);
 assert.equal(cmp.reversed,true);assert.deepEqual(cmp.changedInputs,['worksNeeded','expectedRevenueMinor']);
 assert.equal(cmp.first.cheapestForEntrant,'learning-permission-with-lawful-copy');assert.equal(cmp.second.cheapestForEntrant,'collective-flat-license');
});
test('competition property: ranking always matches computed costs for many assumption sets',()=>{
 let seed=7;const rnd=n=>{seed=(seed*1103515245+12345)%2147483648;return seed%n};
 for(let i=0;i<200;i++){
  const r=entryCosts({fixedEntryCostMinor:rnd(1e6),worksNeeded:rnd(10000),perWorkLicenseMinor:rnd(5000),collectiveFlatFeeMinor:rnd(2e6),lawfulCopyPriceMinor:rnd(3000),expectedRevenueMinor:rnd(5e6)});
  const costs=r.ranking.map(x=>r.rows.find(y=>y.regime===x).totalEntryCostMinor);
  for(let k=1;k<costs.length;k++)assert.ok(costs[k-1]<=costs[k]);
  for(const row of r.rows)assert.equal(row.entryViable,row.marginMinor>0);
 }
 assert.throws(()=>entryCosts({...TRANSFER_MARKETS['small-entrant'],subsidy:1}),/requires exactly/);
});
test('viewpoints: identical factual core, different emphasis, reasoned opposition and self-critical questions',()=>{
 const core=buildCore(LESSON_INPUTS),views=Object.keys(VIEWPOINTS).map(v=>viewScenario(core,v));
 assert.equal(new Set(views.map(v=>v.coreDigest)).size,1);
 assert.equal(views.find(v=>v.viewpoint==='creator').opposition.target,'learning-permission-with-lawful-copy');
 assert.equal(views.find(v=>v.viewpoint==='teacher').opposition.target,'per-copy-purchase');
 assert.equal(views.find(v=>v.viewpoint==='developer').opposition.target,'collective-license');
 for(const v of views){assert.ok(v.premiseChallenge.endsWith('?'));assert.ok(v.selfCheck.endsWith('?'));assert.match(v.opposition.argument,/\d/)}
 assert.deepEqual(buildCore(LESSON_INPUTS),core,'switching viewpoints does not mutate the core');
 assert.throws(()=>viewScenario(core,'regulator-score'),/Unknown viewpoint/);
});
