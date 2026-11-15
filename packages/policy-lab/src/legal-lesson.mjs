import {CASE_LIBRARY, runCase} from "./case-library.mjs";
// TLM-064: complete education and acquisition lessons as Socratic routes over the adversarial case library.
export const OUTCOME_OPTIONS = Object.freeze({
  "education": Object.freeze({key: "section110Outcome", options: ["exempt-on-cited-facts", "outside-section-110-1", "unresolved-material-facts"]}),
  "fixation": Object.freeze({key: "outcome", options: ["fixed-on-cited-facts", "not-fixed-on-cited-facts", "unresolved"]}),
  "acquisition": Object.freeze({key: "accessAssessment", options: ["lawful", "unauthorized", "unresolved"]}),
  "independent-limits": Object.freeze({key: "overall", options: ["independent-limit-indicated", "independent-limits-unresolved", "no-independent-limit-indicated-by-fixture"]}),
  "model-output": Object.freeze({key: "overall", options: ["issue-indicated-on-some-activity", "unresolved-material-facts", "no-issue-indicated-by-fixture"]}),
});
export const LEGAL_LESSONS = Object.freeze({
  education: Object.freeze({title: "Teaching, classrooms and temporary copies", question: "When does teaching with someone else's work need permission, and when is a copy even a copy?",
    caseIds: Object.freeze(["nonprofit-classroom-display", "for-profit-tutoring-display", "recorded-course-video", "classroom-unknown-facts", "streaming-buffer", "maintenance-ram", "longer-buffer"])}),
  acquisition: Object.freeze({title: "Getting the material, keeping it and what comes out", question: "Does a learning purpose change how material may be obtained, kept, or reproduced?",
    caseIds: Object.freeze(["purchased-book-study", "pirated-dataset", "library-loan-unknown", "drm-circumvention-study", "scraping-behind-login", "unknown-license-terms", "openly-shared-material", "model-regurgitates", "style-only-output", "permanent-pirated-archive", "lawful-ephemeral-training"])}),
});
const ABSOLUTE = [/\b(is|are|was) (completely |totally |always |definitely )?(legal|lawful|illegal|unlawful)\b/i, /\balways (allowed|legal|infringes|infringing)\b/i, /\bnever (allowed|legal|infringes|infringing)\b/i];
const freeze = (o) => Object.freeze(o);
const text = (v, min, max, name) => { if (typeof v !== "string" || v.trim().length < min || v.trim().length > max) throw new RangeError(`${name} must contain ${min}–${max} characters`); return v.trim(); };
const need = (s, stage) => { if (!s || s.stage !== stage) throw new RangeError(`Lesson is at ${s?.stage ?? "an unknown stage"}, not ${stage}`); };
const caseOf = (id) => { const c = CASE_LIBRARY.find((x) => x.id === id); if (!c) throw new RangeError("Unknown legal case"); return c; };
const headline = (run) => run.observed[OUTCOME_OPTIONS[run.evaluator].key];
export function createLegalLesson(lessonId, caseId) {
  const lesson = LEGAL_LESSONS[lessonId];
  if (!lesson) throw new RangeError("Unknown legal lesson");
  if (!lesson.caseIds.includes(caseId)) throw new RangeError("Case is not part of this lesson");
  return freeze({lessonId, caseId, stage: "hypothesize", hypothesis: null, prediction: null, run: null, explanation: null, challenges: freeze([]), transfer: null, directExplanationViewed: false});
}
export function recordLegalHypothesis(s, hypothesis) { need(s, "hypothesize"); return freeze({...s, stage: "predict", hypothesis: text(hypothesis, 3, 600, "Hypothesis")}); }
export function commitLegalPrediction(s, outcome) {
  need(s, "predict");
  const {options} = OUTCOME_OPTIONS[caseOf(s.caseId).evaluator];
  if (!options.includes(outcome)) throw new RangeError("Choose one of the offered outcomes");
  return freeze({...s, stage: "experiment", prediction: outcome});
}
export function runLegalExperiment(s, catalog, bill) {
  need(s, "experiment");
  const run = runCase(s.caseId, catalog, bill);
  return freeze({...s, stage: "observe", run, observation: freeze({predicted: s.prediction, observed: headline(run), matched: s.prediction === headline(run)})});
}
export function continueLegalExplanation(s) { need(s, "observe"); return freeze({...s, stage: "explain"}); }
// Reasoned disagreement is allowed. Only unqualified legal absolutes get a Socratic question about the cited facts.
export function submitLegalExplanation(s, explanation, {acknowledgeChallenge = false} = {}) {
  need(s, "explain");
  const value = text(explanation, 10, 1000, "Explanation");
  const hits = ABSOLUTE.map((p) => value.match(p)?.[0]).filter(Boolean);
  if (hits.length && !acknowledgeChallenge) return freeze({...s, challenges: freeze(hits.map((claim) => freeze({claim, question: `You wrote “${claim}”. Which cited facts support that, and would it still hold if one unknown fact changed?`})))});
  return freeze({...s, stage: "transfer", explanation: freeze({text: value, disagreesWithFixture: /\bdisagree\b/i.test(value), challengeAcknowledged: hits.length > 0})});
}
export function transferCandidates(s) {
  const current = caseOf(s.caseId);
  return Object.freeze(LEGAL_LESSONS[s.lessonId].caseIds.filter((id) => id !== s.caseId && caseOf(id).naive !== current.naive));
}
export function runLegalTransfer(s, caseId, prediction, catalog, bill) {
  need(s, "transfer");
  if (!transferCandidates(s).includes(caseId)) throw new RangeError("Transfer needs a different case that challenges the opposite intuition");
  const c = caseOf(caseId);
  if (!OUTCOME_OPTIONS[c.evaluator].options.includes(prediction)) throw new RangeError("Commit a transfer prediction first");
  const run = runCase(caseId, catalog, bill);
  return freeze({...s, stage: "complete", transfer: freeze({caseId, prediction, observed: headline(run), matched: prediction === headline(run), run, agreementRequired: false})});
}
export function viewLegalExplanation(s, catalog, bill) {
  if (!s) throw new TypeError("Invalid lesson");
  const run = runCase(s.caseId, catalog, bill);
  return freeze({...s, directExplanationViewed: true, directExplanation: `${caseOf(s.caseId).intuition} — On this fixture the evaluator reports “${headline(run)}”. The sources and their scope limits are in the source inspector.`});
}
export const LEGAL_LESSON_STAGES = Object.freeze(["hypothesize", "predict", "experiment", "observe", "explain", "transfer", "complete"]);
