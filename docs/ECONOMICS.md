# Economics module (P8): Creator, Student and Market

All figures are illustrative lesson inputs in integer minor units (cents). Nothing here is market data.

- **TLM-065 Stakeholder graph** (`packages/economics/src/graph.mjs`): creator, publisher, learner, developer, user and regulator actors with
  three edge types that cannot be mixed—permission (a right), information (work, model, output, usage data, rules) and money (positive
  integer amount + currency). An edge carrying fields of another type is rejected. `auditGraph` lists information flows that no declared
  permission covers and explicitly notes that payment alone is not modelled as permission. Findings are not legal conclusions.
- **TLM-066 Integer money** (`money.mjs`): safe-integer minor units, overflow checks, basis-point rates with an explicit rounding mode
  (`floor`, `ceil`, `half-even`), largest-remainder allocation whose parts always sum to the total, and a double-entry ledger that
  re-checks conservation after every transfer and requires a memo for each.
- **TLM-067 Access, fees and licensing** (`scenarios.mjs`): per-copy purchase, subscription, library access, collective licence and a
  hypothetical learning permission with lawful copies. Each structure requires exactly its declared inputs—no defaults—so every
  transfer follows from a stated input. Golden ledgers are pinned in tests.
- **TLM-068 Creator earnings and substitution** (`earnings.mjs`): a conditional range over four assumptions; substitution share is
  marked `unsupported`, so the result is labelled “not a forecast” and carries an “If …, then …” statement and a sensitivity ranking.
- **TLM-069 Competition and entry cost** (`competition.mjs`): entrant cost under per-work licensing, a flat collective licence and
  lawful-copy purchase. Declared alternative assumptions (small versus large data needs) reverse which regime is cheapest; a property
  test checks the ranking always matches computed costs. A note reminds that the cheapest entry regime may pay creators least.
- **TLM-070 Assumption provenance** (`assumptions.mjs`): every input has a range, unit and evidence class (`measured`,
  `sourced-estimate`, `illustrative`, `unsupported`); measured/sourced inputs need a source. Unknown inputs make the result unknown;
  unsupported inputs make it “not a forecast”; only fully measured, zero-width inputs produce a point value.
- **TLM-071 Viewpoints** (`viewpoints.mjs`): creator, teacher and developer views over one unchanged core (same digest). Each ranks
  structures by its own metric, states a numeric objection, challenges the scenario's premise and asks a self-critical question.
- **TLM-072 Module 6** (`lesson.mjs`, `/market`): choose a structure → predict each group's position → run the ledger → see the
  conditional earnings range → view at least two viewpoints → revise or keep the recommendation citing a computed consequence →
  transfer to entry-cost markets. No agreement or policy score.
