# Write the Law and the capstone (P9)

- **TLM-073 Compound visitor rules** (`policy-lab/src/studio.mjs`): schema 2.0.0 policies with up to 24 rules, nested `all`/`any`/`not`
  conditions, annotations and up to eight exceptions (carve-outs) per rule. Every condition is compiled by the bounded TLM-052 compiler, so
  no arbitrary code, unknown facts or excessive depth is accepted. Evaluation is three-valued: unknown facts or unknown exceptions leave the
  outcome unresolved; conflicting effects are `disputed`. Export carries a checksum; import recompiles the authored shape, so imported meaning
  is re-validated and evaluates identically on edited cases.
- **TLM-074 Accessible authoring** (`rule-builder.mjs`, `/studio`): a pure reducer for terms, all/any grouping, exclusions (NOT terms),
  carve-outs, effects, default effect, annotations and 50-step undo/redo. Every rule is shown as a plain sentence. All controls are native
  form elements.
- **TLM-075 Same-facts comparison**: present law, the proposal and visitor drafts run on one fact snapshot (digest shown). Present law is
  reported unresolved because no curated current-law rule set covers combined facts—no verdict is invented; the proposal is reported
  `not-evaluable-incomplete-draft`. Pairwise attribution swaps each changed rule into the base policy to identify exactly which rule changed
  the outcome, and reports when only a combination of changes does.
- **TLM-076 Tradeoffs and uncertainty**: a scenario × policy matrix with the outcome, who bears it, and outcome counts. It carries no score of
  morality, compliance or quality, and scenarios are not weighted by real-world frequency.
- **TLM-077 Symmetric stress harness**: ten checks, five for under-protecting creators and five for over-restricting learning, plus
  contradiction and unknown-access checks, and one-fact flips showing what a rule hinges on. Every policy—proposal-like or not—faces the same
  battery.
- **TLM-078 History and forks**: append-only revisions with parent links and branches; each revision stores its evidence on all scenarios,
  replay verifies nothing older changed, and checksummed local export/import recompiles every revision.
- **TLM-079 Module 7**: draft → predict → stress test → respond to a real finding (revise or keep, with reasons; older evidence is kept) →
  defend with any stance. Opposite, dissenting drafts both complete.
- **TLM-080 Module 8 capstone** (`capstone.mjs`, `/capstone`): three novel transfer situations. The checklist requires cross-domain evidence
  actually observed in the labs, explained reasoning, a stated counterargument with a response and acknowledged uncertainty. The position
  (including undecided) is never an input to the assessment; bare endorsement of the proposal does not complete.
