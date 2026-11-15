# Legal cases, truth layers and the education/acquisition lessons (P7)

## TLM-061 — Models, archives, output infringement and memorization

`packages/policy-lab/src/model-outputs.mjs` evaluates four independent activity axes: training copies, a retained archive, distribution of
model weights, and generated outputs. Statuses are `issue-indicated`, `unresolved-material-facts`, `separate-fair-use-analysis`,
`covered-only-by-hypothetical-permission` and `not-indicated-by-fixture`. A learning permission—whether a fair-use argument or a
hypothetical statutory permission—applies at most to the training-copies axis; it never licenses a permanent archive, distribution of a
model that reproduces expression, or substantially similar outputs. Each axis cites dated catalog sources (§§ 102(b), 106, 107, 108,
Bartz, Kadrey, Authors Guild v. Google). `factsFromRetentionAudit` maps measured retention from `/model` onto the legal facts without
overclaiming: verbatim storage implies reproducible expression; parametric models leave the question unresolved pending extraction tests.

## TLM-062 — Eighteen-context adversarial case library

`case-library.mjs` holds 18 cases in 18 distinct contexts, each built to break one common intuition. Nine break intuitions that favour
learning permission and nine break intuitions that favour restriction; every evaluator (education, fixation, acquisition, independent
limits, model/output) is exercised in both directions. Each case runs through the real evaluator and must reproduce its golden outcome.

## TLM-063 — Legal truth layers and source inspector

`truth-layers.mjs` separates every case result into five ordered layers: current law (catalog authorities only), the proposed bill
(status, enacted = false, authoritative text loaded or not), the lesson's interpretation, hypothetical assumptions and unknown facts. The
source inspector shows citation, forum, date, research status, relevance, scope limits, catalog curation date and a caution for single
district-court rulings. Views fail closed if a source is not in the curated catalog, if layers are missing or reordered, or if the
proposal is presented as enacted law.

## TLM-064 — Complete education and acquisition lessons

`legal-lesson.mjs` and `/law` provide two complete Socratic routes—teaching, classrooms and temporary copies; and acquisition, retention
and outputs—over the case library: hypothesis → prediction from the evaluator's bounded outcome set → evaluation → predicted versus
observed → truth layers and source inspection → the learner's own explanation (reasoned disagreement is recorded, not penalised;
unqualified “is legal / is illegal / always / never” claims receive a question about the cited facts) → transfer to a case that
challenges the opposite intuition. A direct explanation is always available. Everything runs locally; it is not legal advice.
