# Model internals (P4)

## TLM-033 — Optional TensorFlow.js neural backend

`packages/learning-lab/src/neural.mjs` defines one genuine two-layer network (256 binary pixels → bounded ReLU hidden layer →
softmax) trained by full-batch gradient descent from a seeded Glorot initializer.

- **Reference engine (default):** float64 JavaScript, no download, always available. It is the CPU fallback.
- **Optional TensorFlow.js engine:** `tf-loader.mjs` dynamically imports `@tensorflow/tfjs-core` and the CPU backend (and WebGL when the
  visitor asks to try the GPU) only after the visitor chooses it. It uses the same initial parameters and explicit backpropagation
  equations. If loading or training fails, the reference engine trains instead and the model records `fallbackReason`.
- **Limits:** 2–32 hidden units, 1–200 epochs, ≤64 examples, a wall-clock budget ≤8 s checked every epoch, and an abort signal.
  A stopped run records `stoppedReason` (`completed`, `time-budget`, `cancelled`) instead of pretending to finish.

## TLM-034 — Parameter inspector

`inspector.mjs` reads the stored parameters of the neural network or the TLM-027 linear classifier: shapes, counts, min/max,
mean magnitude, L2 norm and the change from the stored initial parameters. `weightGrid` returns the exact stored first-layer weights
as a 16 × 16 grid; the heatmap and the optional numeric table in `/model` are drawn from that grid. `serializeModel`/`deserializeModel`
round-trip parameters exactly with an FNV-1a integrity checksum (not a cryptographic signature); tampered or malformed models fail closed.

## TLM-036 — Reproducible model experiments

`model-trace.mjs` records schema version, algorithm, engine, fallback, options, seed, split IDs, dataset digest, parameter checksum
and the completed epoch count. Replay re-trains the float64 reference with the recorded inputs:

- reference runs must reproduce every parameter exactly (`exact-match`);
- TensorFlow.js runs are float32 and backend-dependent, so they are compared within a declared tolerance (default 1e-4);
- wall-clock time is labelled measured and is never replayed; budget-stopped runs replay their recorded epoch count.

Tests include a pinned CPU golden checksum and a TensorFlow.js CPU-versus-reference tolerance test. GPU (WebGL) runs are only checked
at runtime in the browser by the same tolerance comparison; no GPU result is claimed in CI.

## TLM-035 — Dataset disposal and the retained model

`retention.mjs` keeps the lesson drawings, split and three models (nearest-example memorizer, linear classifier, neural network) in
one immutable local application store. `disposeTrainingData` removes the drawings and split and records
`physicalErasureGuaranteed:false`; the models stay and keep working. `auditRetention` measures, before disposal, what each model still
reveals: the memorizer holds exact copies of every training drawing; the parametric models hold no drawings but are measurably more
confident on training drawings than on held-out drawings (a membership signal), and linear weights can be turned into class templates.
`findAbsoluteRetentionClaims` flags promises such as “permanently erased” or “fully unlearned”; the shipped disclosures are tested against it.

## TLM-037 — Honest intermediate-operation microscope

`microscope.mjs` traces one forward pass from stored parameters: input pixels, hidden weighted sums, ReLU, logits and softmax
(kind `computed`, with the executed values), a forward-pass timing (kind `measured`, with its clock and caveat) and an arrow diagram
(kind `illustration`, which must carry a disclosure). `validateMicroscopeTrace` rejects undeclared provenance, illustrations without
disclosures, measurements without clocks and performance figures not labelled as measured; `verifyMicroscopeTrace` recomputes the pass and
rejects altered values.

## TLM-038 — Unseen transfer and overfitting challenge

`transfer.mjs` offers five novel drawings (far-shifted cross, small square, vertical line, broken square, and a square-cross hybrid with no
ground truth). The visitor commits per-model predictions first; the results are computed. When a model fails where the visitor expected
success, a revision citing one of those failures is required before it is recorded. The hybrid never counts as right, wrong or surprising.

## TLM-039 — Module 3: What Did the Machine Learn?

`/model` is a complete Socratic route (`model-lesson.mjs` + `ModelLesson.tsx`): open hypothesis → predictions committed before any
result (does the network still work after disposal? does the memorizer keep copies? does the network keep copies?) → the real
experiment in the lab (train, dispose) → predicted-versus-observed table → the learner's own explanation → transfer challenge and
revision. Explanations are never graded for agreement. An explanation that asserts an absolute guarantee (“permanently erased”,
“fully unlearned”) receives an evidence question; the learner may revise or keep the wording and continue. A direct explanation is
always one button away. Everything is keyboard- and screen-reader-operable form controls and tables; nothing is sent over the network.

## TLM-040 — Device limits and browser compatibility

`device-limits.mjs` estimates training work analytically (multiply-adds; not a timing claim), reads browser-reported capabilities
(Worker, WebGL, `hardwareConcurrency`, `deviceMemory`, Save-Data) and plans a bounded run. Low-power or data-saver devices get at most
8 hidden units, 40 epochs and 1.5 s, no GPU offer (and no TensorFlow.js download with Save-Data), plus a stated reason and a
non-neural alternative. Any plan is clamped to a work cap. Reference training runs in `workers/model.worker.ts`; the controller
terminates the worker at its budget plus 0.5 s grace, on cancellation or on supersession, so no unbounded loop can hold the page.
Without Worker support, training runs on the page inside the same epoch-checked time budget. Results returned by the worker are
re-validated before use.
