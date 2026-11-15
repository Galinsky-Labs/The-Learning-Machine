# Local progress (TLM-089) and plain-language text (TLM-090)

## Local progress
`packages/progress` stores per-module stages in `localStorage` only after the visitor switches it on. Saved data is
integrity-checked; corrupt or foreign data is discarded with a message, never half-restored. Clearing removes the data and the opt-in
and leaves a tombstone so a later autosave cannot silently restore it; the disclosure states that physical erasure cannot be guaranteed.
Export/import uses portable text and records the lesson release digest so changed lessons are flagged. No account exists.

## Plain-language, localization-ready text
`content/i18n/catalog.json` holds the plain-language guide in English and Spanish. `packages/content/src/i18n.mjs` validates that
every locale has every key with matching placeholders, falls back visibly to English when a locale is missing, and refuses to
translate entries marked `official` (legal text): those are always shown in the original English with a label and a source ID from the
curated catalog. `pnpm content:check` also screens guide text for sentence length and very long words.
Only the guide and notices are catalogued so far; lesson bodies are still English-only.
