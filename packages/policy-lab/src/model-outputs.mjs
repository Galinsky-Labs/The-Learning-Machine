// TLM-061: models, archives, output infringement and memorization.
// Each activity is analysed on its own axis. A learning permission (current fair-use reasoning or a hypothetical
// statutory permission) never becomes a licence to keep a permanent archive, distribute copies or emit copied outputs.
const REQUIRED_AUTHORITIES = Object.freeze({
  reproduction: "usc17-106",
  fairUse: "usc17-107",
  archives: "usc17-108",
  idea: "usc17-102-b-",
  training: "bartz-anthropic",
  marketHarm: "kadrey-meta",
  substitution: "google-books",
});
export const MODEL_OUTPUT_ACTIVITIES = Object.freeze([
  "training-copies", "retained-archive", "model-weights-distribution", "generated-output",
]);
const FACT_NAMES = Object.freeze([
  "lawfulAccess", "trainingCopiesDeletedAfterUse", "permanentArchiveKept",
  "archiveFromUnauthorizedSource", "modelReproducesProtectedExpressionOnPrompt",
  "weightsDistributedToPublic", "outputSubstantiallySimilar", "outputDistributedOrDisplayed",
  "outputSubstitutesForWork", "onlyUnprotectedIdeasOrFactsInOutput",
]);
const LEARNING_PERMISSIONS = new Set(["none", "fair-use-argument", "hypothetical-learning-permission"]);

const assert = (condition, message) => { if (!condition) throw new TypeError(message); };
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;
const exact = (value, fields, label) => {
  assert(plain(value), label + " must be a plain object");
  const keys = Object.keys(value);
  assert(keys.length === fields.length && keys.every((key) => fields.includes(key)), "Invalid " + label + " fields");
};
const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
};
const deepFreeze = (value) => {
  if (value && typeof value === "object") { for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value); }
  return value;
};
function sources(catalog, evaluationDate) {
  assert(plain(catalog) && catalog.jurisdiction === "United States", "A United States authority catalog is required");
  assert(Array.isArray(catalog.authorities), "Authority catalog is invalid");
  const index = new Map(catalog.authorities.map((a) => [a.id, a]));
  return Object.fromEntries(Object.entries(REQUIRED_AUTHORITIES).map(([key, id]) => {
    const a = index.get(id);
    assert(plain(a) && typeof a.citation === "string" && typeof a.scopeLimitations === "string" &&
      /^https:\/\//.test(a.sourceUrl), "Required model/output authority is missing or invalid: " + id);
    assert(a.issuedOn === null || (validDate(a.issuedOn) && a.issuedOn <= evaluationDate),
      "Model/output authority is unavailable on the evaluation date: " + id);
    return [key, Object.freeze({ id: a.id, citation: a.citation, issuedOn: a.issuedOn, sourceUrl: a.sourceUrl, scopeLimitations: a.scopeLimitations })];
  }));
}
// Statuses: issue-indicated, unresolved-material-facts, separate-fair-use-analysis, not-indicated-by-fixture.
function trainingCopies(f, permission, src) {
  let status;
  if (f.lawfulAccess === false) status = "issue-indicated";
  else if (f.lawfulAccess === null || f.trainingCopiesDeletedAfterUse === null) status = "unresolved-material-facts";
  else status = permission === "hypothetical-learning-permission" ? "covered-only-by-hypothetical-permission" : "separate-fair-use-analysis";
  return { activity: "training-copies", status, sources: [src.reproduction, src.fairUse, src.training],
    explanation: f.lawfulAccess === false
      ? "Copies made from unlawfully obtained material raise an acquisition problem that a learning rationale does not cure."
      : "Intermediate copies made to learn are reproductions; courts have weighed them under fair use on specific records, and no categorical rule exists." };
}
function retainedArchive(f, src) {
  let status;
  if (f.permanentArchiveKept === false) status = "not-indicated-by-fixture";
  else if (f.permanentArchiveKept === null) status = "unresolved-material-facts";
  else if (f.archiveFromUnauthorizedSource === true) status = "issue-indicated";
  else if (f.archiveFromUnauthorizedSource === null) status = "unresolved-material-facts";
  else status = "separate-fair-use-analysis";
  return { activity: "retained-archive", status, sources: [src.reproduction, src.archives, src.training],
    explanation: "A permanent library is a separate use from learning. Section 108 covers specified libraries and archives under conditions; it is not a general archive permission, and Bartz distinguished retention of pirated copies from training." };
}
function weights(f, src) {
  let status;
  if (f.weightsDistributedToPublic === false) status = "not-indicated-by-fixture";
  else if (f.weightsDistributedToPublic === null || f.modelReproducesProtectedExpressionOnPrompt === null) status = "unresolved-material-facts";
  else status = f.modelReproducesProtectedExpressionOnPrompt ? "issue-indicated" : "separate-fair-use-analysis";
  return { activity: "model-weights-distribution", status, sources: [src.reproduction, src.idea],
    explanation: "Parameters are not automatically copies, but a model that can be prompted to reproduce protected expression may embody retrievable copies; distributing it is a distribution question, not a learning question." };
}
function outputs(f, src) {
  let status;
  if (f.onlyUnprotectedIdeasOrFactsInOutput === true && f.outputSubstantiallySimilar !== true) status = "not-indicated-by-fixture";
  else if (f.outputSubstantiallySimilar === null) status = "unresolved-material-facts";
  else if (f.outputSubstantiallySimilar === false) status = "not-indicated-by-fixture";
  else if (f.outputDistributedOrDisplayed === null || f.outputSubstitutesForWork === null) status = "unresolved-material-facts";
  else status = "issue-indicated";
  return { activity: "generated-output", status, sources: [src.reproduction, src.idea, src.substitution, src.marketHarm],
    explanation: "Outputs are judged by what they contain. Ideas, facts and general style are not protected, but substantially similar output is a reproduction, and displaying or distributing it is a separate exclusive-right question. Market substitution weighs against fair use." };
}
export function evaluateModelOutputScenario(input, catalog) {
  exact(input, ["schemaVersion", "scenarioId", "evaluationDate", "learningPermission", "facts"], "model/output scenario");
  assert(input.schemaVersion === "1.0.0", "Unsupported model/output scenario schema");
  assert(typeof input.scenarioId === "string" && /^[a-z0-9][a-z0-9-]{0,127}$/.test(input.scenarioId), "Invalid scenario ID");
  assert(validDate(input.evaluationDate), "Invalid evaluation date");
  assert(LEARNING_PERMISSIONS.has(input.learningPermission), "Invalid learning permission");
  exact(input.facts, [...FACT_NAMES], "model/output facts");
  for (const name of FACT_NAMES) assert(input.facts[name] === null || typeof input.facts[name] === "boolean", "Invalid " + name);
  const src = sources(catalog, input.evaluationDate), f = input.facts;
  const assessments = [trainingCopies(f, input.learningPermission, src), retainedArchive(f, src), weights(f, src), outputs(f, src)];
  const issues = assessments.filter((a) => a.status === "issue-indicated").map((a) => a.activity);
  const unresolved = assessments.filter((a) => a.status === "unresolved-material-facts").map((a) => a.activity);
  return deepFreeze({
    schemaVersion: "1.0.0", scenarioId: input.scenarioId, evaluationDate: input.evaluationDate,
    learningPermission: input.learningPermission,
    learningPermissionScope: "Applies at most to the training-copies axis. It never licenses archives, model distribution or outputs.",
    assessments, issueActivities: issues, unresolvedActivities: unresolved,
    overall: issues.length ? "issue-indicated-on-some-activity" : unresolved.length ? "unresolved-material-facts" : "no-issue-indicated-by-fixture",
    qualification: "Educational fixture over a dated source catalog. Not legal advice; an absent issue is not a declaration of lawfulness.",
    axesIndependent: true,
  });
}
// Bridge from the P4 model lab: what a measured retention audit implies for the legal facts.
export function factsFromRetentionAudit(audit) {
  assert(plain(audit) && (audit.kind === "verbatim-storage" || audit.kind === "learned-parameters"), "Expected a retention audit");
  if (audit.kind === "verbatim-storage") return Object.freeze({ modelReproducesProtectedExpressionOnPrompt: audit.exactCopiesRecoverable > 0, basis: "Exact training copies are stored inside the model and can be read back." });
  return Object.freeze({ modelReproducesProtectedExpressionOnPrompt: null, basis: "No exact copies are stored, but measured confidence gaps show training examples remain detectable; whether expression can be reproduced needs extraction testing." });
}
