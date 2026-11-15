// TLM-080: Module 8 "Right to Learn" capstone. Novel transfer exercises scored only on reasoning, never on position.
export const EVIDENCE = Object.freeze({
  technical: Object.freeze({"memorizer-keeps-copies": "The nearest-example memorizer kept exact copies after the dataset was disposed.", "confidence-gap": "The neural network was measurably more confident on training drawings than unseen ones.", "transfer-failure": "Shifted and resized drawings broke models that scored well on held-out data.", "selective-masking-needs-recognition": "Selective masking had to recognize the target before concealing it."}),
  legal: Object.freeze({"pirated-dataset": "Acquisition is evaluated separately from the learning use.", "permanent-pirated-archive": "A permanent library is a separate use from learning.", "model-regurgitates": "A model that reproduces expression raises a distribution question.", "streaming-buffer": "Cablevision's buffer was not fixed on its specific record.", "for-profit-tutoring-display": "Section 110(1) is limited to nonprofit face-to-face teaching."}),
  economic: Object.freeze({"collective-license:developers": "Developers pay most under the collective license.", "learning-permission-with-lawful-copy:creators": "Creators earn least under the learning permission with lawful copies.", "per-copy-purchase:learners": "Learners pay most under per-copy purchase.", "entry-reversal": "Which access regime is cheapest for an entrant reverses with scale."}),
});
export const CAPSTONE_EXERCISES = Object.freeze([
  {id: "museum-audio-guide", prompt: "A public museum wants to train a model on scans of its collection—some still under copyright—to generate spoken audio guides for visitors."},
  {id: "study-app-flashcards", prompt: "A startup's study app learns from purchased textbooks and generates flashcards that it sells to students."},
  {id: "musician-style-tool", prompt: "A music-education nonprofit builds a tool that learns chord patterns from recordings and suggests practice exercises in a similar style."},
].map((e) => Object.freeze(e)));
export const POSITIONS = Object.freeze(["permit", "restrict", "permit-with-conditions", "undecided"]);
const UNCERTAINTY = /\b(uncertain|unknown|depends|might|may|unclear|not sure|cannot know|would need|if )/i;
// Rubric criteria are identical for every position; the position itself is never an input to scoring.
export function assessCapstone(exerciseId, submission) {
  const exercise = CAPSTONE_EXERCISES.find((e) => e.id === exerciseId);
  if (!exercise) throw new RangeError("Unknown capstone exercise");
  const {position, reasoning, evidenceIds, counterargument, response} = submission ?? {};
  if (!POSITIONS.includes(position)) throw new RangeError("Choose a position (undecided is allowed)");
  for (const [v, name, max] of [[reasoning, "Reasoning", 1500], [counterargument, "Counterargument", 800], [response, "Response to the counterargument", 800]])
    if (typeof v !== "string" || v.length > max) throw new TypeError(name + " must be text up to " + max + " characters");
  if (!Array.isArray(evidenceIds) || evidenceIds.length > 12) throw new TypeError("Evidence must be a list of up to 12 IDs");
  const domains = Object.fromEntries(Object.entries(EVIDENCE).map(([d, items]) => [d, evidenceIds.filter((id) => id in items)]));
  const unknownIds = evidenceIds.filter((id) => !Object.values(EVIDENCE).some((items) => id in items));
  const criteria = [
    {id: "cross-domain-evidence", met: Object.values(domains).filter((l) => l.length > 0).length >= 2, description: "Cites evidence from at least two of the technical, legal and economic labs."},
    {id: "explained-reasoning", met: reasoning.trim().length >= 80, description: "Explains how the evidence applies to this new situation (at least a few sentences)."},
    {id: "engages-counterargument", met: counterargument.trim().length >= 30 && response.trim().length >= 30, description: "States the strongest opposing argument and responds to it."},
    {id: "acknowledges-uncertainty", met: UNCERTAINTY.test(reasoning + " " + response), description: "Names what is unknown or what the answer depends on."},
    {id: "only-real-evidence", met: unknownIds.length === 0, description: "Cites only evidence observed in the labs."},
  ];
  return Object.freeze({exerciseId, position, criteria: Object.freeze(criteria.map((c) => Object.freeze(c))), complete: criteria.every((c) => c.met),
    evidenceByDomain: Object.freeze(domains), positionAffectsAssessment: false,
    note: "Completion depends only on reasoning quality. Any position, including opposition to the proposal or undecided, can complete."});
}
