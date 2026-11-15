// TLM-063: keep current law, the proposed bill, educational interpretation and visitor hypotheticals visibly separate,
// and let the learner inspect every cited source with its date, provenance status and scope limits.
export const TRUTH_LAYERS = Object.freeze({
  "current-law": "Dated U.S. authority from the curated catalog (statute, constitution or court decision).",
  "proposed-bill": "The Right to Learn proposal. It is not enacted law, and only authoritative loaded text may be quoted as provisions.",
  "interpretation": "This lesson's educational explanation of how the sources might apply to the fixture. Not a holding and not legal advice.",
  "hypothetical": "A rule or permission assumed for the exercise. It changes nothing about current law.",
  "unknown": "A material fact the fixture does not establish.",
});
const assert = (c, m) => { if (!c) throw new TypeError(m); };
const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export function inspectSource(catalog, id) {
  assert(plain(catalog) && Array.isArray(catalog.authorities), "Authority catalog is invalid");
  const a = catalog.authorities.find((x) => x.id === id);
  if (!a) throw new RangeError("Unknown source " + id);
  assert(typeof a.sourceUrl === "string" && /^https:\/\//.test(a.sourceUrl), "Source has no verifiable link");
  return Object.freeze({layer: "current-law", id: a.id, kind: a.kind, citation: a.citation, title: a.title, forum: a.forum, issuedOn: a.issuedOn,
    sourceUrl: a.sourceUrl, sourceType: a.sourceType, researchStatus: a.researchStatus, stance: a.stance ?? null, relevance: a.relevance,
    scopeLimitations: a.scopeLimitations, catalogCuratedOn: catalog.curatedOn ?? null,
    caution: a.kind === "precedent" && a.forum && /District Court/.test(a.forum) ? "A single district-court ruling binds only its parties; other courts may disagree." : null});
}
function collectSourceIds(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => collectSourceIds(v, found));
  else if (plain(value)) {
    if (typeof value.id === "string" && typeof value.citation === "string" && typeof value.sourceUrl === "string") found.add(value.id);
    Object.values(value).forEach((v) => collectSourceIds(v, found));
  }
  return found;
}
function collectText(value, keys, out = []) {
  if (Array.isArray(value)) value.forEach((v) => collectText(v, keys, out));
  else if (plain(value)) for (const [k, v] of Object.entries(value)) {
    if (keys.includes(k) && typeof v === "string") out.push(v);
    else if (keys.includes(k) && Array.isArray(v) && v.every((x) => typeof x === "string")) out.push(...v);
    else collectText(v, keys, out);
  }
  return out;
}
function collectUnknowns(value, path = "", out = []) {
  if (plain(value)) for (const [k, v] of Object.entries(value)) { if (v === null && !["issuedOn", "stance", "fallbackReason"].includes(k)) out.push((path ? path + "." : "") + k); else if (plain(v)) collectUnknowns(v, (path ? path + "." : "") + k, out); }
  return out;
}
// caseRun: the output of runCase (case-library) — its input facts plus the evaluator result.
export function buildTruthLayerView(caseRun, caseInput, catalog, bill) {
  assert(plain(caseRun) && plain(caseRun.result), "A completed case evaluation is required");
  assert(plain(bill) && bill.documentKind === "proposed-bill", "Proposed-bill record is required");
  const sources = [...new Set([...collectSourceIds(caseRun.result), ...(caseRun.relatedSources ?? [])])].map((id) => inspectSource(catalog, id));
  const interpretation = collectText(caseRun.result, ["explanation", "caveats", "caveat", "qualification", "learningPermissionScope"]);
  const hypothetical = [];
  if (caseInput?.learningPermission === "hypothetical-learning-permission") hypothetical.push("The exercise assumes a hypothetical statutory learning permission.");
  const view = {
    caseId: caseRun.id,
    layers: Object.freeze([
      Object.freeze({layer: "current-law", description: TRUTH_LAYERS["current-law"], items: Object.freeze(sources)}),
      Object.freeze({layer: "proposed-bill", description: TRUTH_LAYERS["proposed-bill"], items: Object.freeze([Object.freeze({status: bill.status, versionId: bill.versionId ?? null, enactedLaw: bill.enactedLaw === true, authoritativeFullText: bill.authoritativeFullText === true, provisionCount: Array.isArray(bill.provisions) ? bill.provisions.length : 0, notice: bill.notice ?? null})])}),
      Object.freeze({layer: "interpretation", description: TRUTH_LAYERS.interpretation, items: Object.freeze([...new Set(interpretation)])}),
      Object.freeze({layer: "hypothetical", description: TRUTH_LAYERS.hypothetical, items: Object.freeze(hypothetical)}),
      Object.freeze({layer: "unknown", description: TRUTH_LAYERS.unknown, items: Object.freeze(collectUnknowns(caseInput?.facts ?? {}))}),
    ]),
  };
  return validateTruthLayerView(Object.freeze(view), catalog);
}
export function validateTruthLayerView(view, catalog) {
  assert(plain(view) && Array.isArray(view.layers), "Invalid truth-layer view");
  const names = view.layers.map((l) => l.layer);
  assert(JSON.stringify(names) === JSON.stringify(Object.keys(TRUTH_LAYERS)), "Truth layers must all be present and ordered");
  const current = view.layers[0].items, proposal = view.layers[1].items[0], interpretation = view.layers[2].items;
  for (const s of current) {
    const real = catalog.authorities.find((a) => a.id === s.id);
    assert(real && real.citation === s.citation && real.sourceUrl === s.sourceUrl, "Current-law item is not in the curated catalog: " + s.id);
  }
  assert(proposal && proposal.enactedLaw === false, "The proposal must never be presented as enacted law");
  for (const text of interpretation) assert(!/\b(the court held|is the law|binding holding)\b/i.test(text) || /not/i.test(text), "Interpretation may not be phrased as a holding: " + text);
  return view;
}
