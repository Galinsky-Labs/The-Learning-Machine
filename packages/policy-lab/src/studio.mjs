import {compilePolicyRuleSet, SUPPORTED_POLICY_FACTS} from "./compiler.mjs";
// P9 "Write the Law" studio: compound visitor rules (TLM-073), multi-policy comparison (TLM-075), tradeoff data (TLM-076),
// a symmetric stress harness (TLM-077) and rule history with forks and portable exports (TLM-078).
export const STUDIO_SCHEMA = "2.0.0";
export const VISITOR_SOURCE = "visitor-authored-hypothesis";
const EFFECTS = new Set(["permit", "restrict", "conditional", "unresolved"]);
const assert = (c, m) => { if (!c) throw new TypeError(m); };
const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const exact = (v, fields, label) => { assert(plain(v), label + " must be a plain object"); const k = Object.keys(v); assert(k.length === fields.length && k.every((x) => fields.includes(x)), label + " fields differ"); };
const text = (v, label, max) => { assert(typeof v === "string" && v.trim().length > 0 && v.length <= max, "Invalid " + label); return v; };
const ident = (v, label) => { assert(typeof v === "string" && /^[a-z][a-z0-9-]{0,47}$/.test(v), "Invalid " + label); return v; };
const deepFreeze = (v) => { if (v && typeof v === "object") { for (const c of Object.values(v)) deepFreeze(c); Object.freeze(v); } return v; };
export function fnv(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); }

// ---------- TLM-073: compound rules with exceptions and annotations ----------
export function compileStudioPolicy(input) {
  exact(input, ["schemaVersion", "id", "title", "rules", "defaultEffect"], "Studio policy");
  assert(input.schemaVersion === STUDIO_SCHEMA, "Unsupported studio policy schema");
  ident(input.id, "policy ID"); text(input.title, "policy title", 120);
  assert(EFFECTS.has(input.defaultEffect), "Unsupported default effect");
  assert(Array.isArray(input.rules) && input.rules.length >= 1 && input.rules.length <= 24, "A policy needs 1–24 rules");
  const ids = new Set(), compiledRules = [];
  for (const rule of input.rules) {
    exact(rule, ["id", "label", "annotation", "when", "effect", "exceptions"], "Studio rule");
    ident(rule.id, "rule ID"); assert(!ids.has(rule.id), "Duplicate rule ID " + rule.id); ids.add(rule.id);
    text(rule.label, "rule label", 120); assert(typeof rule.annotation === "string" && rule.annotation.length <= 1000, "Invalid annotation");
    assert(EFFECTS.has(rule.effect), "Unsupported rule effect");
    assert(Array.isArray(rule.exceptions) && rule.exceptions.length <= 8, "At most eight exceptions per rule");
    const parts = [{id: rule.id, when: rule.when, effect: rule.effect}];
    for (const ex of rule.exceptions) {
      exact(ex, ["id", "label", "when", "effect"], "Rule exception");
      ident(ex.id, "exception ID"); assert(!ids.has(ex.id), "Duplicate ID " + ex.id); ids.add(ex.id);
      text(ex.label, "exception label", 120); assert(EFFECTS.has(ex.effect), "Unsupported exception effect");
      parts.push({id: ex.id, when: ex.when, effect: ex.effect});
    }
    // The bounded TLM-052 compiler validates every condition (operators, facts, depth, node limits).
    const compiled = compilePolicyRuleSet({schemaVersion: "1.0.0", id: input.id + "-" + rule.id, framework: "hypothetical",
      rules: parts.map((p) => ({id: p.id, sourceIds: [VISITOR_SOURCE], when: p.when, effect: p.effect, rationale: "Visitor-authored hypothetical rule."}))},
    {allowedSourceIds: [VISITOR_SOURCE]});
    const [main, ...exceptions] = compiled.rules;
    compiledRules.push({id: rule.id, label: rule.label, annotation: rule.annotation, when: main.when, effect: rule.effect,
      exceptions: exceptions.map((e, i) => ({id: e.id, label: rule.exceptions[i].label, when: e.when, effect: e.effect}))});
  }
  return deepFreeze({schemaVersion: STUDIO_SCHEMA, id: input.id, title: input.title, rules: compiledRules, defaultEffect: input.defaultEffect,
    framework: "hypothetical", sourceId: VISITOR_SOURCE});
}
const unknown = (v) => v === null || v === undefined || v === "unknown";
export function evaluateCondition(c, facts) {
  if (c.operator === "all") { const r = c.conditions.map((x) => evaluateCondition(x, facts)); return r.includes(false) ? false : r.includes(null) ? null : true; }
  if (c.operator === "any") { const r = c.conditions.map((x) => evaluateCondition(x, facts)); return r.includes(true) ? true : r.includes(null) ? null : false; }
  if (c.operator === "not") { const r = evaluateCondition(c.condition, facts); return r === null ? null : !r; }
  const actual = facts[c.fact];
  if (c.operator === "exists") return unknown(actual) ? null : c.value;
  if (unknown(actual)) return null;
  if (c.operator === "eq") return Object.is(actual, c.value);
  if (c.operator === "neq") return !Object.is(actual, c.value);
  return c.value.some((v) => Object.is(actual, v));
}
export function validateFactSnapshot(facts) {
  assert(plain(facts), "Fact snapshot must be a plain object");
  for (const k of Object.keys(facts)) assert(SUPPORTED_POLICY_FACTS.includes(k), "Unsupported fact " + k);
  return facts;
}
export function evaluateStudioPolicy(policy, factsInput) {
  const facts = validateFactSnapshot(factsInput), trace = [];
  for (const rule of policy.rules) {
    const match = evaluateCondition(rule.when, facts);
    let effect = null, decidedBy = null, status;
    if (match === false) status = "not-applicable";
    else if (match === null) { status = "unknown"; }
    else {
      const ex = rule.exceptions.map((e) => ({e, r: evaluateCondition(e.when, facts)}));
      const hit = ex.find((x) => x.r === true);
      if (hit) { status = "exception-applies"; effect = hit.e.effect; decidedBy = hit.e.id; }
      else if (ex.some((x) => x.r === null)) { status = "exception-unknown"; }
      else { status = "applies"; effect = rule.effect; decidedBy = rule.id; }
    }
    trace.push(Object.freeze({ruleId: rule.id, status, effect, decidedBy}));
  }
  const effects = [...new Set(trace.filter((t) => t.effect).map((t) => t.effect))];
  const unknowns = trace.filter((t) => t.status === "unknown" || t.status === "exception-unknown").map((t) => t.ruleId);
  let outcome;
  if (effects.length > 1) outcome = "disputed";
  else if (unknowns.length) outcome = "unresolved";
  else if (effects.length === 1) outcome = effects[0];
  else outcome = policy.defaultEffect;
  return Object.freeze({policyId: policy.id, outcome, trace: Object.freeze(trace), unknownRules: Object.freeze(unknowns),
    decidedBy: Object.freeze(trace.filter((t) => t.decidedBy).map((t) => t.decidedBy)), framework: "hypothetical"});
}
export function exportStudioPolicy(policy) {
  const body = JSON.stringify(policy);
  return JSON.stringify({format: "tlm-studio-policy-v2", checksum: fnv(body), policy: JSON.parse(body)});
}
export function importStudioPolicy(serialized) {
  assert(typeof serialized === "string" && serialized.length <= 200000, "Serialized policy must be text under 200 KB");
  let env; try { env = JSON.parse(serialized); } catch { throw new TypeError("Serialized policy is not valid JSON"); }
  assert(plain(env) && env.format === "tlm-studio-policy-v2" && plain(env.policy), "Unsupported policy export");
  assert(fnv(JSON.stringify(env.policy)) === env.checksum, "Policy checksum mismatch");
  const p = env.policy;
  // Re-run the compiler on the authored shape so imported meaning is re-validated, not trusted.
  return compileStudioPolicy({schemaVersion: p.schemaVersion, id: p.id, title: p.title, defaultEffect: p.defaultEffect,
    rules: p.rules.map((r) => ({id: r.id, label: r.label, annotation: r.annotation, when: r.when, effect: r.effect, exceptions: r.exceptions.map((e) => ({id: e.id, label: e.label, when: e.when, effect: e.effect}))}))});
}

// ---------- shared scenario battery (fact snapshots) ----------
const F = (o) => Object.freeze({"work.copyrightStatus": "protected", "access.method": "purchase", "access.lawful": true, "copying.performed": true,
  "copying.intermediateCopies": true, "retention.retained": false, "retention.durationDays": 0, "teaching.performed": false, "outputs.created": true,
  "outputs.distributed": false, "outputs.containsProtectedExpression": false, ...o});
export const STUDIO_SCENARIOS = Object.freeze([
  {id: "lawful-ephemeral-learning", label: "Lawfully bought book, temporary copies, nothing kept", facts: F({})},
  {id: "pirated-source", label: "Training on an unauthorized copy", facts: F({"access.method": "unauthorized", "access.lawful": false})},
  {id: "permanent-archive", label: "Lawful access but copies kept for ten years", facts: F({"retention.retained": true, "retention.durationDays": 3650})},
  {id: "regurgitating-output", label: "Outputs reproduce protected expression and are distributed", facts: F({"outputs.distributed": true, "outputs.containsProtectedExpression": true})},
  {id: "classroom-teaching", label: "Teacher uses a licensed work in class", facts: F({"access.method": "license", "teaching.performed": true, "outputs.created": false})},
  {id: "public-domain", label: "Public-domain work", facts: F({"work.copyrightStatus": "public-domain", "access.method": "public-source"})},
  {id: "unknown-access", label: "Nobody knows how the copy was obtained", facts: F({"access.method": "unknown", "access.lawful": null})},
  {id: "streamed-and-cached", label: "Streamed work cached for 30 days", facts: F({"access.method": "stream", "retention.retained": true, "retention.durationDays": 30})},
  {id: "no-copy-reading", label: "Reading without making any copy", facts: F({"copying.performed": false, "copying.intermediateCopies": false, "outputs.created": false})},
  {id: "style-only-output", label: "Distributed outputs share only style and ideas", facts: F({"outputs.distributed": true})},
].map((s) => Object.freeze(s)));

// ---------- TLM-075: same facts, many policies, exact attribution ----------
function withRule(policy, ruleId, replacement) {
  const rules = policy.rules.filter((r) => r.id !== ruleId);
  if (replacement) { const at = policy.rules.findIndex((r) => r.id === ruleId); rules.splice(at < 0 ? rules.length : at, 0, replacement); }
  return {...policy, rules};
}
export function attributeDifference(base, variant, facts) {
  const a = evaluateStudioPolicy(base, facts), b = evaluateStudioPolicy(variant, facts);
  const sig = (r) => JSON.stringify(r);
  const ids = [...new Set([...base.rules.map((r) => r.id), ...variant.rules.map((r) => r.id)])];
  const changed = ids.filter((id) => sig(base.rules.find((r) => r.id === id) ?? null) !== sig(variant.rules.find((r) => r.id === id) ?? null));
  const responsible = changed.filter((id) => evaluateStudioPolicy(withRule(base, id, variant.rules.find((r) => r.id === id) ?? null), facts).outcome !== a.outcome);
  const defaultChanged = base.defaultEffect !== variant.defaultEffect;
  const defaultResponsible = defaultChanged && evaluateStudioPolicy({...base, defaultEffect: variant.defaultEffect}, facts).outcome !== a.outcome;
  return Object.freeze({baseOutcome: a.outcome, variantOutcome: b.outcome, outcomeChanged: a.outcome !== b.outcome, changedRules: Object.freeze(changed),
    responsibleRules: Object.freeze(responsible), defaultEffectResponsible: defaultResponsible,
    interaction: a.outcome !== b.outcome && responsible.length === 0 && !defaultResponsible ? "only-the-combination-of-changes-alters-the-outcome" : null});
}
export function comparePolicies({proposal, policies}, facts) {
  validateFactSnapshot(facts);
  assert(Array.isArray(policies) && policies.length >= 1 && policies.length <= 6, "Compare 1–6 visitor policies");
  assert(plain(proposal) && proposal.documentKind === "proposed-bill", "Proposed-bill record required");
  const present = Object.freeze({framework: "current-law", outcome: "unresolved", reason: "No curated current-law rule set in this repository covers these combined facts; inspect the dated sources in the legal-cases lesson instead of relying on an encoded verdict."});
  const prop = Object.freeze({framework: "proposed-law", outcome: proposal.authoritativeFullText && proposal.provisions?.length ? "requires-loaded-provisions" : "not-evaluable-incomplete-draft", enactedLaw: false});
  const results = policies.map((p) => evaluateStudioPolicy(p, facts));
  const pairwise = [];
  for (let i = 1; i < policies.length; i++) pairwise.push(Object.freeze({base: policies[0].id, variant: policies[i].id, ...attributeDifference(policies[0], policies[i], facts)}));
  return Object.freeze({factsDigest: fnv(JSON.stringify(facts)), presentLaw: present, proposal: prop, visitor: Object.freeze(results), pairwise: Object.freeze(pairwise)});
}

// ---------- TLM-076: tradeoff and uncertainty data (no scores) ----------
const ACTOR_EFFECTS = Object.freeze({permit: {creator: "bears any loss of control", learner: "may proceed", developer: "may proceed"},
  restrict: {creator: "retains control", learner: "is stopped or must license", developer: "is stopped or must license"},
  conditional: {creator: "depends on the condition", learner: "must meet the condition", developer: "must meet the condition"},
  unresolved: {creator: "faces uncertainty", learner: "faces uncertainty", developer: "faces uncertainty"},
  disputed: {creator: "faces conflicting rules", learner: "faces conflicting rules", developer: "faces conflicting rules"}});
export function tradeoffMatrix(policies, scenarios = STUDIO_SCENARIOS) {
  const rows = scenarios.map((s) => Object.freeze({scenarioId: s.id, label: s.label,
    outcomes: Object.freeze(policies.map((p) => { const r = evaluateStudioPolicy(p, s.facts); return Object.freeze({policyId: p.id, outcome: r.outcome, actors: ACTOR_EFFECTS[r.outcome], decidedBy: r.decidedBy}); }))}));
  const counts = policies.map((p) => { const c = {permit: 0, restrict: 0, conditional: 0, unresolved: 0, disputed: 0}; for (const r of rows) c[r.outcomes.find((o) => o.policyId === p.id).outcome]++; return Object.freeze({policyId: p.id, ...c}); });
  return Object.freeze({rows: Object.freeze(rows), counts: Object.freeze(counts),
    note: "Counts show how often each outcome occurs on the lesson scenarios. They are not a morality, compliance or quality score, and the scenarios are not weighted by real-world frequency."});
}

// ---------- TLM-077: symmetric adversarial stress tests ----------
const FLAW_CHECKS = Object.freeze([
  {id: "permits-distributed-copied-expression", scenario: "regurgitating-output", bad: ["permit"], question: "Your rule permits distributing outputs that reproduce protected expression. Is that intended, and what protects the creator's market?"},
  {id: "permits-unauthorized-source", scenario: "pirated-source", bad: ["permit"], question: "Your rule permits learning from an unauthorized copy. Does it reward the unauthorized acquisition?"},
  {id: "permits-permanent-archive", scenario: "permanent-archive", bad: ["permit"], question: "Your rule permits keeping copies for ten years. Is a permanent library still 'learning'?"},
  {id: "restricts-public-domain", scenario: "public-domain", bad: ["restrict"], question: "Your rule restricts using a public-domain work. What right is being protected?"},
  {id: "restricts-reading-without-copying", scenario: "no-copy-reading", bad: ["restrict"], question: "Your rule restricts reading that makes no copy. Is that broader than copyright reaches?"},
  {id: "restricts-lawful-ephemeral-learning", scenario: "lawful-ephemeral-learning", bad: ["restrict"], question: "Your rule restricts lawful, temporary, non-retained learning with no copied output. What harm does it prevent?"},
  {id: "restricts-style-only-output", scenario: "style-only-output", bad: ["restrict"], question: "Your rule restricts outputs that share only style or ideas. Ideas are not protected—why restrict them?"},
  {id: "contradiction", scenario: "*", bad: ["disputed"], question: "Two of your rules give conflicting effects on the same facts. Which should win, and why?"},
  {id: "silent-on-unknown-access", scenario: "unknown-access", bad: ["permit", "restrict"], question: "Nobody knows how the copy was obtained, yet your rule gives a definite answer. Is that justified?"},
]);
export function stressTestPolicy(policy, scenarios = STUDIO_SCENARIOS) {
  const byId = new Map(scenarios.map((s) => [s.id, s]));
  const findings = [];
  for (const check of FLAW_CHECKS) {
    const targets = check.scenario === "*" ? scenarios : [byId.get(check.scenario)].filter(Boolean);
    for (const s of targets) {
      const r = evaluateStudioPolicy(policy, s.facts);
      if (check.bad.includes(r.outcome)) findings.push(Object.freeze({checkId: check.id, scenarioId: s.id, outcome: r.outcome, decidedBy: r.decidedBy, question: check.question,
        direction: check.id.startsWith("permits") ? "may-under-protect-creators" : check.id.startsWith("restricts") ? "may-over-restrict-learning" : "internal-consistency"}));
    }
  }
  // Counterexamples: flip one fact at a time and report where the outcome changes, so the visitor sees what the rule hinges on.
  const hinges = [];
  for (const s of scenarios.slice(0, 4)) {
    const base = evaluateStudioPolicy(policy, s.facts).outcome;
    for (const fact of ["access.lawful", "retention.retained", "outputs.containsProtectedExpression", "teaching.performed"]) {
      const flipped = {...s.facts, [fact]: s.facts[fact] === true ? false : true};
      const out = evaluateStudioPolicy(policy, flipped).outcome;
      if (out !== base) hinges.push(Object.freeze({scenarioId: s.id, fact, from: base, to: out}));
    }
  }
  return Object.freeze({policyId: policy.id, checksRun: FLAW_CHECKS.length, findings: Object.freeze(findings), hinges: Object.freeze(hinges),
    balance: Object.freeze({underProtect: FLAW_CHECKS.filter((c) => c.id.startsWith("permits")).length, overRestrict: FLAW_CHECKS.filter((c) => c.id.startsWith("restricts")).length}),
    note: "Every policy—whether it resembles the proposal, current law or neither—faces the identical battery."});
}

// ---------- TLM-078: history, forks and portable export ----------
export function createHistory(policyInput, note) {
  const policy = compileStudioPolicy(policyInput);
  const rev = {id: "r1", parent: null, branch: "main", note: text(note, "revision note", 300), policy, evidence: Object.freeze(STUDIO_SCENARIOS.map((s) => Object.freeze({scenarioId: s.id, outcome: evaluateStudioPolicy(policy, s.facts).outcome})))};
  return deepFreeze({format: "tlm-studio-history-v1", revisions: [rev], heads: {main: "r1"}});
}
export function commitRevision(history, {branch = "main", parent, policyInput, note}) {
  ident(branch, "branch");
  const parentId = parent ?? history.heads[branch];
  assert(history.revisions.some((r) => r.id === parentId), "Unknown parent revision");
  const policy = compileStudioPolicy(policyInput);
  const id = "r" + (history.revisions.length + 1);
  const rev = {id, parent: parentId, branch, note: text(note, "revision note", 300), policy,
    evidence: STUDIO_SCENARIOS.map((s) => ({scenarioId: s.id, outcome: evaluateStudioPolicy(policy, s.facts).outcome}))};
  return deepFreeze({...history, revisions: [...history.revisions, rev], heads: {...history.heads, [branch]: id}});
}
export function forkRevision(history, fromId, branch, policyInput, note) {
  assert(!history.heads[branch], "Branch already exists");
  return commitRevision(history, {branch, parent: fromId, policyInput, note});
}
// Replays every revision's evidence; any drift means older evidence was lost or altered.
export function replayHistory(history) {
  return Object.freeze(history.revisions.map((r) => Object.freeze({id: r.id, intact: r.evidence.every((e) => evaluateStudioPolicy(r.policy, STUDIO_SCENARIOS.find((s) => s.id === e.scenarioId).facts).outcome === e.outcome)})));
}
export function exportHistory(history) { const body = JSON.stringify(history); return JSON.stringify({checksum: fnv(body), history: JSON.parse(body)}); }
export function importHistory(serialized) {
  assert(typeof serialized === "string" && serialized.length <= 2000000, "History export too large");
  let env; try { env = JSON.parse(serialized); } catch { throw new TypeError("History export is not valid JSON"); }
  assert(plain(env) && plain(env.history) && env.history.format === "tlm-studio-history-v1", "Unsupported history export");
  assert(fnv(JSON.stringify(env.history)) === env.checksum, "History checksum mismatch");
  const h = env.history;
  for (const r of h.revisions) { const recompiled = importStudioPolicy(exportStudioPolicy(r.policy)); assert(JSON.stringify(recompiled) === JSON.stringify(r.policy), "Revision " + r.id + " does not recompile identically"); }
  const replay = replayHistory(h);
  assert(replay.every((r) => r.intact), "History evidence does not replay");
  return deepFreeze(h);
}
