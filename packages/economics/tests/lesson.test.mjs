import test from 'node:test';import assert from 'node:assert/strict';
import {createMarketLesson,chooseStructure,predictConsequences,runMarket,viewMarketViewpoint,reviseDecision,runMarketTransfer,consequenceTable} from '../src/lesson.mjs';
function toRevise(structure='collective-license'){
 let s=chooseStructure(createMarketLesson(),structure);
 s=predictConsequences(s,{creators:'gains',learners:'unchanged',developers:'unchanged'});
 s=runMarket(s);s=viewMarketViewpoint(s,'creator');return viewMarketViewpoint(s,'developer');
}
test('learner revises a decision by citing an explicit computed consequence',()=>{
 let s=toRevise();
 assert.equal(s.stage,'revise');
 const dev=s.observation.consequences.find(c=>c.role==='developers');assert.equal(dev.observed,'pays');assert.equal(dev.matched,false);
 assert.throws(()=>reviseDecision(s,{structure:'subscription',citedConsequenceId:'made-up:creators',reason:'because I think so'}),/Cite/);
 s=reviseDecision(s,{structure:'learning-permission-with-lawful-copy',citedConsequenceId:'collective-license:developers',reason:'Developers pay 60000 under the collective license; entry matters to me.'});
 assert.equal(s.revision.changed,true);assert.equal(s.revision.agreementRequired,false);
 s=runMarketTransfer(s,'large-entrant','learning-permission-with-lawful-copy');
 assert.equal(s.stage,'complete');assert.equal(s.transfer.matched,false);assert.equal(s.transfer.result.cheapestForEntrant,'collective-flat-license');
});
test('keeping the original decision is a valid revision when it cites evidence',()=>{
 const s=reviseDecision(toRevise('per-copy-purchase'),{structure:'per-copy-purchase',citedConsequenceId:'per-copy-purchase:creators',reason:'Creators earn the most here and I accept the learner cost.'});
 assert.equal(s.revision.changed,false);
});
test('multiple perspectives are required and stages cannot be skipped',()=>{
 let s=chooseStructure(createMarketLesson(),'subscription');
 assert.throws(()=>runMarket(s),/not run/);
 assert.throws(()=>predictConsequences(s,{creators:'gains'}),/every role/);
 s=runMarket(predictConsequences(s,{creators:'gains',learners:'pays',developers:'unchanged'}));
 s=viewMarketViewpoint(s,'teacher');s=viewMarketViewpoint(s,'teacher');assert.equal(s.stage,'viewpoints');
 assert.equal(consequenceTable().length,15);
});
