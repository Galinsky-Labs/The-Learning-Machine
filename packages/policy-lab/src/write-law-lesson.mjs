import {STUDIO_SCENARIOS, evaluateStudioPolicy, stressTestPolicy, createHistory, commitRevision, compileStudioPolicy} from "./studio.mjs";
// TLM-079: Module 7 "Write the Law" — draft, predict, stress-test, revise from counterexamples, defend. Dissent completes.
const freeze = (v) => { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const need = (s, stage) => { if (!s || s.stage !== stage) throw new RangeError(`Lesson is at ${s?.stage ?? "an unknown stage"}, not ${stage}`); };
const text = (v, min, max, name) => { if (typeof v !== "string" || v.trim().length < min || v.trim().length > max) throw new RangeError(`${name} must contain ${min}–${max} characters`); return v.trim(); };
export const PREDICTION_SCENARIOS = Object.freeze(["lawful-ephemeral-learning", "pirated-source", "regurgitating-output"]);
export function createWriteLawLesson() { return freeze({stage: "draft", history: null, predictions: null, observed: null, stress: null, revisionResponse: null, defense: null}); }
export function submitDraft(s, policyInput) { need(s, "draft"); return freeze({...s, stage: "predict", history: createHistory(policyInput, "First draft")}); }
const head = (s) => s.history.revisions.find((r) => r.id === s.history.heads.main).policy;
export function predictDraftOutcomes(s, predictions) {
  need(s, "predict");
  for (const id of PREDICTION_SCENARIOS) if (!["permit", "restrict", "conditional", "unresolved", "disputed"].includes(predictions?.[id])) throw new TypeError("Predict an outcome for every scenario");
  const policy = head(s), observed = PREDICTION_SCENARIOS.map((id) => ({scenarioId: id, predicted: predictions[id], observed: evaluateStudioPolicy(policy, STUDIO_SCENARIOS.find((x) => x.id === id).facts).outcome}));
  return freeze({...s, stage: "stress", predictions: {...predictions}, observed: observed.map((o) => ({...o, matched: o.predicted === o.observed}))});
}
export function runStressTest(s) { need(s, "stress"); return freeze({...s, stage: "revise", stress: stressTestPolicy(head(s))}); }
// Respond to at least one counterexample: either revise the policy or keep it with a reason. Older evidence is preserved.
export function respondToCounterexample(s, {findingCheckId, revisedPolicyInput = null, reason}) {
  need(s, "revise");
  const why = text(reason, 10, 800, "Reason");
  if (s.stress.findings.length && !s.stress.findings.some((f) => f.checkId === findingCheckId)) throw new RangeError("Respond to one of the stress-test findings");
  let history = s.history;
  if (revisedPolicyInput) { compileStudioPolicy(revisedPolicyInput); history = commitRevision(history, {policyInput: revisedPolicyInput, note: "Revision responding to " + (findingCheckId || "stress test")}); }
  return freeze({...s, stage: "defend", history, revisionResponse: {findingCheckId: findingCheckId ?? null, revised: Boolean(revisedPolicyInput), reason: why, newStress: stressTestPolicy(head({history}))}});
}
export function defendPolicy(s, {stance, statement}) {
  need(s, "defend");
  if (!["supports-proposal-direction", "opposes-proposal-direction", "mixed", "neither"].includes(stance)) throw new RangeError("Choose a stance");
  return freeze({...s, stage: "complete", defense: {stance, statement: text(statement, 20, 1200, "Statement"), agreementRequired: false, revisions: s.history.revisions.length}});
}
