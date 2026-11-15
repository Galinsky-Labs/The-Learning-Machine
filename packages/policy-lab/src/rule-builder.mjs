import {compileStudioPolicy, STUDIO_SCHEMA} from "./studio.mjs";
import {SUPPORTED_POLICY_FACTS} from "./compiler.mjs";
// TLM-074: accessible rule authoring as a pure reducer (terms, exclusions, carve-outs, preview, undo/redo).
export const TERM_OPERATORS = Object.freeze(["eq", "neq", "in"]);
export const FACT_CHOICES = Object.freeze({
  "work.copyrightStatus": ["protected", "public-domain", "licensed", "unknown"],
  "access.method": ["purchase", "license", "borrow", "stream", "public-source", "unauthorized", "unknown"],
  "access.lawful": [true, false], "copying.performed": [true, false], "copying.intermediateCopies": [true, false],
  "retention.retained": [true, false], "retention.durationDays": [0, 1, 30, 365, 3650], "teaching.performed": [true, false],
  "outputs.created": [true, false], "outputs.distributed": [true, false], "outputs.containsProtectedExpression": [true, false],
});
const freeze = (v) => { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
export function emptyDraft(id = "my-policy", title = "My hypothetical policy") {
  return freeze({id, title, defaultEffect: "unresolved", rules: [], nextId: 1});
}
export function createBuilder(draft = emptyDraft()) { return freeze({past: [], present: draft, future: []}); }
function term(fact, operator, value) {
  if (!SUPPORTED_POLICY_FACTS.includes(fact)) throw new TypeError("Unknown fact");
  if (!TERM_OPERATORS.includes(operator)) throw new TypeError("Unknown operator");
  if (operator === "in" ? !Array.isArray(value) || value.length === 0 : Array.isArray(value)) throw new TypeError("Value does not fit the operator");
  return {operator, fact, value};
}
function step(b, next) { return freeze({past: [...b.past, b.present].slice(-50), present: next, future: []}); }
const clone = (d) => JSON.parse(JSON.stringify(d));
export function applyAction(b, action) {
  const d = clone(b.present);
  const rule = (id) => { const r = d.rules.find((x) => x.id === id); if (!r) throw new RangeError("Unknown rule"); return r; };
  switch (action.type) {
    case "undo": if (!b.past.length) return b; return freeze({past: b.past.slice(0, -1), present: b.past.at(-1), future: [b.present, ...b.future]});
    case "redo": if (!b.future.length) return b; return freeze({past: [...b.past, b.present], present: b.future[0], future: b.future.slice(1)});
    case "set-title": d.title = String(action.title).slice(0, 120); break;
    case "set-default": d.defaultEffect = action.effect; break;
    case "add-rule": { const id = "rule-" + d.nextId++; d.rules.push({id, label: action.label || "Rule " + id.slice(5), annotation: "", group: "all", terms: [], exclusions: [], effect: action.effect || "permit", carveOuts: []}); break; }
    case "remove-rule": d.rules = d.rules.filter((r) => r.id !== action.ruleId); break;
    case "set-effect": rule(action.ruleId).effect = action.effect; break;
    case "set-group": if (!["all", "any"].includes(action.group)) throw new TypeError("Group must be all or any"); rule(action.ruleId).group = action.group; break;
    case "set-annotation": rule(action.ruleId).annotation = String(action.annotation).slice(0, 1000); break;
    case "add-term": rule(action.ruleId).terms.push(term(action.fact, action.operator, action.value)); break;
    case "remove-term": rule(action.ruleId).terms.splice(action.index, 1); break;
    case "add-exclusion": rule(action.ruleId).exclusions.push(term(action.fact, action.operator, action.value)); break;
    case "add-carve-out": { const r = rule(action.ruleId); r.carveOuts.push({id: r.id + "-x" + (r.carveOuts.length + 1), label: action.label || "Carve-out", term: term(action.fact, action.operator, action.value), effect: action.effect}); break; }
    case "remove-carve-out": rule(action.ruleId).carveOuts.splice(action.index, 1); break;
    default: throw new TypeError("Unknown builder action");
  }
  return step(b, d);
}
const wrap = (conds, op) => conds.length === 1 ? conds[0] : {operator: op, conditions: conds};
// Turns the draft into the compiled studio policy. Exclusions become NOT terms; carve-outs become exceptions.
export function draftToPolicyInput(d) {
  return {schemaVersion: STUDIO_SCHEMA, id: d.id, title: d.title, defaultEffect: d.defaultEffect,
    rules: d.rules.map((r) => {
      if (r.terms.length === 0) throw new RangeError(`${r.label} needs at least one term`);
      const positive = wrap(r.terms, r.group), negatives = r.exclusions.map((t) => ({operator: "not", condition: t}));
      const when = negatives.length ? {operator: "all", conditions: [positive, ...negatives]} : positive;
      return {id: r.id, label: r.label, annotation: r.annotation, when, effect: r.effect, exceptions: r.carveOuts.map((c) => ({id: c.id, label: c.label, when: c.term, effect: c.effect}))};
    })};
}
export function buildPolicy(b) { return compileStudioPolicy(draftToPolicyInput(b.present)); }
export function describeRule(r) {
  const show = (t) => `${t.fact} ${t.operator === "eq" ? "is" : t.operator === "neq" ? "is not" : "is one of"} ${Array.isArray(t.value) ? t.value.join(", ") : String(t.value)}`;
  const body = r.terms.map(show).join(r.group === "all" ? " and " : " or ") || "(no terms yet)";
  const excl = r.exclusions.length ? `, unless ${r.exclusions.map(show).join(" or ")}` : "";
  const carve = r.carveOuts.map((c) => `; but ${c.effect} when ${show(c.term)}`).join("");
  return `If ${body}${excl}, then ${r.effect}${carve}.`;
}
