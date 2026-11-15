import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CASE_LIBRARY,runCase} from "../src/case-library.mjs";
import {buildTruthLayerView,inspectSource,validateTruthLayerView,TRUTH_LAYERS} from "../src/truth-layers.mjs";
const catalog=JSON.parse(readFileSync(new URL("../../../content/us-law/authorities.json",import.meta.url),"utf8"));
const bill=JSON.parse(readFileSync(new URL("../../../content/us-law/proposed-bill.json",import.meta.url),"utf8"));
test("every library case separates current law, proposal, interpretation, hypothetical and unknown layers",()=>{
 for(const c of CASE_LIBRARY){
  const v=buildTruthLayerView(runCase(c.id,catalog,bill),c.input,catalog,bill);
  assert.deepEqual(v.layers.map(l=>l.layer),Object.keys(TRUTH_LAYERS));
  assert.ok(v.layers[0].items.length>0,c.id+" cites current law");
  assert.equal(v.layers[1].items[0].enactedLaw,false);
 }
 const hyp=CASE_LIBRARY.find(c=>c.id==="model-regurgitates"),view=buildTruthLayerView(runCase(hyp.id,catalog,bill),hyp.input,catalog,bill);
 assert.equal(view.layers[3].items.length,1);
 const unknown=CASE_LIBRARY.find(c=>c.id==="classroom-unknown-facts");
 assert.deepEqual(buildTruthLayerView(runCase(unknown.id,catalog,bill),unknown.input,catalog,bill).layers[4].items,["classroomOrSimilarPlace"]);
});
test("source inspector shows date, provenance status, scope limits and district-court caution",()=>{
 const s=inspectSource(catalog,"bartz-anthropic");
 assert.equal(s.issuedOn,"2025-06-23");assert.match(s.sourceUrl,/^https:/);assert.ok(s.scopeLimitations.length>20);assert.ok(s.researchStatus);
 assert.match(s.caution,/district-court/);
 assert.equal(inspectSource(catalog,"usc17-107").caution,null);
 assert.throws(()=>inspectSource(catalog,"invented-case"),/Unknown source/);
});
test("views fail closed if the proposal is presented as enacted or a source is invented",()=>{
 const c=CASE_LIBRARY[0],run=runCase(c.id,catalog,bill);
 assert.throws(()=>buildTruthLayerView(run,c.input,catalog,{...bill,enactedLaw:true}),/never be presented as enacted/);
 const v=buildTruthLayerView(run,c.input,catalog,bill),forged=JSON.parse(JSON.stringify(v));
 forged.layers[0].items.push({id:"made-up",citation:"1 F.4th 1",sourceUrl:"https://example.com"});
 assert.throws(()=>validateTruthLayerView(forged,catalog),/not in the curated catalog/);
 const reordered=JSON.parse(JSON.stringify(v));reordered.layers.reverse();
 assert.throws(()=>validateTruthLayerView(reordered,catalog),/ordered/);
});
