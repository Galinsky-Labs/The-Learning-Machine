import {evaluateEducationLesson} from "./education-lesson.mjs";
import {evaluateFixationLesson} from "./fixation-lesson.mjs";
import {evaluateAcquisitionExercise} from "./acquisition.mjs";
import {evaluateIndependentLimits} from "./independent-limits.mjs";
import {evaluateModelOutputScenario} from "./model-outputs.mjs";
// TLM-062: eighteen adversarial contexts. Each case is built to break one naive intuition; half target intuitions that
// favour learning permission and half target intuitions that favour restriction, so both sides get equal scrutiny.
const DATE = "2026-10-19";
const ACQUISITION_SOURCES = ["lesson-receipt", "lesson-loan", "lesson-unauthorized"];
const learningStub = (id) => ({scenarioId: id, outcome: "unresolved", qualification: "Learning-use evaluation is kept separate and unresolved in this case.", matchedRuleIds: [], unknownRuleIds: []});
const educationFacts = {instructionMode: "face-to-face", workUse: "display", institutionNonprofit: true, instructorOrPupil: true,
  classroomOrSimilarPlace: true, audiovisualWork: false, copyLawfullyMade: true, responsiblePersonKnewOrHadReasonCopyUnlawful: false,
  publicAudience: true, commercialPurpose: false};
const limitFacts = {accessControlCircumvented: false, section1201ExceptionEstablished: false, protectedComputerAccessed: false, accessAuthorized: true,
  communicationIntercepted: false, interceptionAuthorized: true, personalDataProcessed: false, privacyAuthorizationOrLegalBasisEstablished: true,
  contractRestrictionApplies: false, plannedUseCompliesWithContract: true, confidentialityDutyApplies: false, plannedUseCompliesWithConfidentialityDuty: true,
  tradeSecretClaimed: false, improperAcquisitionUseOrDisclosure: false};
const copyrightStub = {outcome: "unresolved", qualification: "Copyright result kept separate in this case.", matchedRuleIds: [], unknownRuleIds: []};
const modelFacts = {lawfulAccess: true, trainingCopiesDeletedAfterUse: true, permanentArchiveKept: false, archiveFromUnauthorizedSource: false,
  modelReproducesProtectedExpressionOnPrompt: false, weightsDistributedToPublic: false, outputSubstantiallySimilar: false,
  outputDistributedOrDisplayed: false, outputSubstitutesForWork: false, onlyUnprotectedIdeasOrFactsInOutput: true};
const edu = (id, facts, setting = "nonprofit-school") => ({schemaVersion: "1.0.0", scenarioId: id, evaluationDate: DATE, setting, facts: {...educationFacts, ...facts}});
const fix = (id, caseProfile, facts) => ({schemaVersion: "1.0.0", scenarioId: id, evaluationDate: DATE, caseProfile, facts});
const acq = (id, method, kind, authorization, sourceId) => ({schemaVersion: "1.0.0", id, acquisition: {method, evidence: {id: id + "-evidence", kind, authorization, description: "Authored lesson evidence record for " + id + ".", sourceId}}, learningEvaluation: learningStub(id)});
const lim = (id, facts) => ({schemaVersion: "1.0.0", scenarioId: id, evaluationDate: DATE, copyrightEvaluation: copyrightStub, facts: {...limitFacts, ...facts}});
const mod = (id, facts, learningPermission = "hypothetical-learning-permission") => ({schemaVersion: "1.0.0", scenarioId: id, evaluationDate: DATE, learningPermission, facts: {...modelFacts, ...facts}});
const L = "favors-learning", R = "favors-restriction";
export const CASE_LIBRARY = Object.freeze([
  {id: "nonprofit-classroom-display", context: "Nonprofit classroom", naive: R, intuition: "Showing any protected work in class infringes.", evaluator: "education", input: edu("nonprofit-classroom-display", {}), expected: {section110Outcome: "exempt-on-cited-facts"}},
  {id: "for-profit-tutoring-display", context: "Private for-profit tutoring", naive: L, intuition: "Teaching is always exempt.", evaluator: "education", input: edu("for-profit-tutoring-display", {institutionNonprofit: false, commercialPurpose: true}, "for-profit-school"), expected: {section110Outcome: "outside-section-110-1"}},
  {id: "recorded-course-video", context: "Recorded online course", naive: L, intuition: "A recording of a lesson is the same as teaching in person.", evaluator: "education", input: edu("recorded-course-video", {instructionMode: "recorded"}), expected: {section110Outcome: "outside-section-110-1"}},
  {id: "classroom-unknown-facts", context: "Classroom with unknown facts", naive: R, intuition: "If you cannot prove the exemption, the use is infringing.", evaluator: "education", input: edu("classroom-unknown-facts", {classroomOrSimilarPlace: null}), expected: {section110Outcome: "unresolved-material-facts"}},
  {id: "streaming-buffer", context: "Streaming playback buffer", naive: R, intuition: "Every momentary copy in a buffer is a fixed copy.", evaluator: "fixation", input: fix("streaming-buffer", "cablevision-buffer", {storageKind: "buffer", durationMilliseconds: 1200, automaticallyOverwritten: true, perceptible: null, reproducible: null, retainedUntilPowerOff: false}), expected: {outcome: "not-fixed-on-cited-facts"}},
  {id: "maintenance-ram", context: "Repair technician RAM copy", naive: L, intuition: "Copies in RAM never count.", evaluator: "fixation", input: fix("maintenance-ram", "mai-maintenance-ram", {storageKind: "ram", durationMilliseconds: null, automaticallyOverwritten: false, perceptible: true, reproducible: true, retainedUntilPowerOff: true}), expected: {outcome: "fixed-on-cited-facts"}},
  {id: "longer-buffer", context: "A slower buffer", naive: L, intuition: "Anything under a few seconds is automatically safe.", evaluator: "fixation", input: fix("longer-buffer", "cablevision-buffer", {storageKind: "buffer", durationMilliseconds: 4000, automaticallyOverwritten: true, perceptible: null, reproducible: null, retainedUntilPowerOff: false}), expected: {outcome: "unresolved"}},
  {id: "purchased-book-study", context: "Studying a purchased book", naive: R, intuition: "Using a book to learn requires the author's separate permission.", evaluator: "acquisition", input: acq("purchased-book-study", "purchase", "receipt", "confirmed", "lesson-receipt"), relatedSources: ["usc17-106", "usc17-107"], expected: {accessAssessment: "lawful", learningUseOutcome: "unresolved"}},
  {id: "pirated-dataset", context: "Training on a pirated dataset", naive: L, intuition: "A good learning purpose cures how the material was obtained.", evaluator: "acquisition", input: acq("pirated-dataset", "pirated-copy", "unauthorized-copy-record", "denied", "lesson-unauthorized"), relatedSources: ["bartz-anthropic", "usc17-106"], expected: {accessAssessment: "unauthorized", learningUseOutcome: "unresolved"}},
  {id: "library-loan-unknown", context: "Library loan of uncertain status", naive: R, intuition: "Uncertain provenance means the access was unlawful.", evaluator: "acquisition", input: acq("library-loan-unknown", "borrow", "loan-record", "unknown", "lesson-loan"), relatedSources: ["usc17-109"], expected: {accessAssessment: "unresolved", learningUseOutcome: "unresolved"}},
  {id: "drm-circumvention-study", context: "Breaking DRM to study a work", naive: L, intuition: "A learning exception lets you bypass copy protection.", evaluator: "independent-limits", input: lim("drm-circumvention-study", {accessControlCircumvented: true, section1201ExceptionEstablished: false}), expected: {overall: "independent-limit-indicated"}},
  {id: "scraping-behind-login", context: "Scraping behind someone else's login", naive: L, intuition: "Public-interest learning makes any data collection fine.", evaluator: "independent-limits", input: lim("scraping-behind-login", {protectedComputerAccessed: true, accessAuthorized: false}), expected: {overall: "independent-limit-indicated"}},
  {id: "unknown-license-terms", context: "Licensed data with unread terms", naive: R, intuition: "Every license silently forbids learning.", evaluator: "independent-limits", input: lim("unknown-license-terms", {contractRestrictionApplies: null, plannedUseCompliesWithContract: null}), expected: {overall: "independent-limits-unresolved"}},
  {id: "openly-shared-material", context: "Openly shared material, no other duties", naive: R, intuition: "Something else will always make learning unlawful.", evaluator: "independent-limits", input: lim("openly-shared-material", {}), expected: {overall: "no-independent-limit-indicated-by-fixture"}},
  {id: "model-regurgitates", context: "Model that recites training text", naive: L, intuition: "A model is just numbers, so distributing it is always fine.", evaluator: "model-output", input: mod("model-regurgitates", {weightsDistributedToPublic: true, modelReproducesProtectedExpressionOnPrompt: true}), expected: {overall: "issue-indicated-on-some-activity", issueActivities: ["model-weights-distribution"]}},
  {id: "style-only-output", context: "Output in a general style", naive: R, intuition: "Any output resembling an artist's style infringes.", evaluator: "model-output", input: mod("style-only-output", {outputDistributedOrDisplayed: true}), expected: {overall: "no-issue-indicated-by-fixture", issueActivities: []}},
  {id: "permanent-pirated-archive", context: "Keeping a permanent pirated library", naive: L, intuition: "Permission to learn also covers keeping the library.", evaluator: "model-output", input: mod("permanent-pirated-archive", {permanentArchiveKept: true, archiveFromUnauthorizedSource: true}), expected: {overall: "issue-indicated-on-some-activity", issueActivities: ["retained-archive"]}},
  {id: "lawful-ephemeral-training", context: "Lawful, ephemeral training copies", naive: R, intuition: "Training is infringement no matter how it is done.", evaluator: "model-output", input: mod("lawful-ephemeral-training", {}, "fair-use-argument"), expected: {overall: "no-issue-indicated-by-fixture", issueActivities: []}},
].map((c) => Object.freeze(c)));
function observe(c, catalog, bill) {
  switch (c.evaluator) {
    case "education": { const r = evaluateEducationLesson(c.input, catalog, bill); return {result: r, observed: {section110Outcome: r.section110Outcome}}; }
    case "fixation": { const r = evaluateFixationLesson(c.input, catalog); return {result: r, observed: {outcome: r.outcome}}; }
    case "acquisition": { const r = evaluateAcquisitionExercise(c.input, {allowedSourceIds: ACQUISITION_SOURCES}); return {result: r, observed: {accessAssessment: r.acquisition.accessAssessment, learningUseOutcome: r.learningUse.outcome}}; }
    case "independent-limits": { const r = evaluateIndependentLimits(c.input, catalog); return {result: r, observed: {overall: r.overall}}; }
    case "model-output": { const r = evaluateModelOutputScenario(c.input, catalog); return {result: r, observed: {overall: r.overall, issueActivities: [...r.issueActivities]}}; }
    default: throw new TypeError("Unknown evaluator " + c.evaluator);
  }
}
export function runCase(caseId, catalog, bill) {
  const c = CASE_LIBRARY.find((x) => x.id === caseId);
  if (!c) throw new RangeError("Unknown legal case");
  const {result, observed} = observe(c, catalog, bill);
  const passed = JSON.stringify(observed) === JSON.stringify(c.expected);
  return Object.freeze({id: c.id, context: c.context, naive: c.naive, intuition: c.intuition, evaluator: c.evaluator, relatedSources: Object.freeze([...(c.relatedSources ?? [])]), observed: Object.freeze(observed), expected: c.expected, passed, result});
}
export function runCaseLibrary(catalog, bill) {
  const results = CASE_LIBRARY.map((c) => runCase(c.id, catalog, bill));
  const balance = {[L]: results.filter((r) => r.naive === L).length, [R]: results.filter((r) => r.naive === R).length};
  return Object.freeze({cases: Object.freeze(results), passed: results.filter((r) => r.passed).length, total: results.length,
    contexts: new Set(results.map((r) => r.context)).size, balance: Object.freeze(balance), symmetric: balance[L] === balance[R]});
}
