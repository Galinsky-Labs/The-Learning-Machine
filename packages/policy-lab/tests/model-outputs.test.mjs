import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {evaluateModelOutputScenario,factsFromRetentionAudit} from "../src/model-outputs.mjs";
const catalog=JSON.parse(readFileSync(new URL("../../../content/us-law/authorities.json",import.meta.url),"utf8"));
const base={lawfulAccess:true,trainingCopiesDeletedAfterUse:true,permanentArchiveKept:false,archiveFromUnauthorizedSource:false,
 modelReproducesProtectedExpressionOnPrompt:false,weightsDistributedToPublic:false,outputSubstantiallySimilar:false,
 outputDistributedOrDisplayed:false,outputSubstitutesForWork:false,onlyUnprotectedIdeasOrFactsInOutput:true};
const scenario=(facts,learningPermission="hypothetical-learning-permission")=>({schemaVersion:"1.0.0",scenarioId:"model-case",evaluationDate:"2026-10-19",learningPermission,facts:{...base,...facts}});
const status=(r,a)=>r.assessments.find(x=>x.activity===a).status;
test("learning permission covers at most the training axis and is never a distribution license",()=>{
 const clean=evaluateModelOutputScenario(scenario({}),catalog);
 assert.equal(status(clean,"training-copies"),"covered-only-by-hypothetical-permission");
 assert.equal(clean.overall,"no-issue-indicated-by-fixture");assert.match(clean.learningPermissionScope,/never licenses/);
 const distributing=evaluateModelOutputScenario(scenario({weightsDistributedToPublic:true,modelReproducesProtectedExpressionOnPrompt:true}),catalog);
 assert.equal(status(distributing,"training-copies"),"covered-only-by-hypothetical-permission");
 assert.equal(status(distributing,"model-weights-distribution"),"issue-indicated");
 assert.deepEqual(distributing.issueActivities,["model-weights-distribution"]);
});
test("negative output cases: substantially similar distributed outputs are flagged regardless of permission",()=>{
 for(const permission of ["none","fair-use-argument","hypothetical-learning-permission"]){
  const r=evaluateModelOutputScenario(scenario({outputSubstantiallySimilar:true,onlyUnprotectedIdeasOrFactsInOutput:false,outputDistributedOrDisplayed:true,outputSubstitutesForWork:true},permission),catalog);
  assert.equal(status(r,"generated-output"),"issue-indicated",permission);
 }
 const unknown=evaluateModelOutputScenario(scenario({outputSubstantiallySimilar:true,onlyUnprotectedIdeasOrFactsInOutput:false,outputSubstitutesForWork:null}),catalog);
 assert.equal(status(unknown,"generated-output"),"unresolved-material-facts");
 const style=evaluateModelOutputScenario(scenario({onlyUnprotectedIdeasOrFactsInOutput:true,outputDistributedOrDisplayed:true}),catalog);
 assert.equal(status(style,"generated-output"),"not-indicated-by-fixture");
});
test("negative archive cases: a permanent library from unauthorized sources is flagged even when training is permitted",()=>{
 const r=evaluateModelOutputScenario(scenario({permanentArchiveKept:true,archiveFromUnauthorizedSource:true}),catalog);
 assert.equal(status(r,"retained-archive"),"issue-indicated");
 assert.equal(status(r,"training-copies"),"covered-only-by-hypothetical-permission");
 assert.ok(r.assessments.find(a=>a.activity==="retained-archive").sources.some(s=>s.id==="bartz-anthropic"));
 const lawfulArchive=evaluateModelOutputScenario(scenario({permanentArchiveKept:true}),catalog);
 assert.equal(status(lawfulArchive,"retained-archive"),"separate-fair-use-analysis");
 const unlawfulAccess=evaluateModelOutputScenario(scenario({lawfulAccess:false}),catalog);
 assert.equal(status(unlawfulAccess,"training-copies"),"issue-indicated");
});
test("memorization evidence from the model lab maps onto the legal facts without overclaiming",()=>{
 assert.equal(factsFromRetentionAudit({kind:"verbatim-storage",exactCopiesRecoverable:12}).modelReproducesProtectedExpressionOnPrompt,true);
 assert.equal(factsFromRetentionAudit({kind:"learned-parameters",exactCopiesRecoverable:null}).modelReproducesProtectedExpressionOnPrompt,null);
});
test("malformed scenarios, unknown permissions and missing authorities fail closed",()=>{
 assert.throws(()=>evaluateModelOutputScenario({...scenario({}),extra:1},catalog),/fields/);
 assert.throws(()=>evaluateModelOutputScenario(scenario({},"blanket-license"),catalog),/learning permission/);
 assert.throws(()=>evaluateModelOutputScenario(scenario({outputSubstantiallySimilar:"yes"}),catalog),/outputSubstantiallySimilar/);
 assert.throws(()=>evaluateModelOutputScenario(scenario({}),{jurisdiction:"United States",authorities:[]}),/missing/);
 assert.throws(()=>evaluateModelOutputScenario({...scenario({}),evaluationDate:"2025-01-01"},catalog),/unavailable/);
});
