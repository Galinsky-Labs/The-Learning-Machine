import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CASE_LIBRARY,runCaseLibrary,runCase} from "../src/case-library.mjs";
const catalog=JSON.parse(readFileSync(new URL("../../../content/us-law/authorities.json",import.meta.url),"utf8"));
const bill=JSON.parse(readFileSync(new URL("../../../content/us-law/proposed-bill.json",import.meta.url),"utf8"));
test("eighteen distinct contexts all reproduce their golden outcomes",()=>{
 const r=runCaseLibrary(catalog,bill);
 assert.equal(r.total,18);assert.equal(r.contexts,18);assert.equal(r.passed,18,JSON.stringify(r.cases.filter(c=>!c.passed).map(c=>[c.id,c.observed])));
 assert.equal(new Set(CASE_LIBRARY.map(c=>c.id)).size,18);
});
test("adversarial scrutiny is symmetric: nine cases break pro-learning intuitions and nine break pro-restriction ones",()=>{
 const r=runCaseLibrary(catalog,bill);assert.deepEqual(r.balance,{"favors-learning":9,"favors-restriction":9});assert.equal(r.symmetric,true);
 for(const evaluator of new Set(CASE_LIBRARY.map(c=>c.evaluator))){
  const cases=CASE_LIBRARY.filter(c=>c.evaluator===evaluator);
  assert.ok(cases.some(c=>c.naive==="favors-learning")&&cases.some(c=>c.naive==="favors-restriction"),evaluator+" challenges both sides");
 }
});
test("a changed fact changes the observed result, so goldens are not hard-coded",()=>{
 const c=CASE_LIBRARY.find(x=>x.id==="nonprofit-classroom-display");
 assert.equal(runCase(c.id,catalog,bill).passed,true);
 assert.throws(()=>runCase("missing",catalog,bill),/Unknown legal case/);
});
