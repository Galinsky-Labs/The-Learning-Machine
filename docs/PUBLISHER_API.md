# Publisher API and optional tutor (P10)

`apps/api` is a small, dependency-light Node service (`node:http`, `pg`, and the official Anthropic SDK loaded only when a key is set).
The public static site is complete without it: no lesson calls it, and the tutor panel falls back to authored hints.

## Publishing (TLM-081..085)
- **TLM-081 Auth and roles:** scrypt password hashes, mandatory TOTP (RFC 6238) at every login, HMAC-signed 8-hour sessions, roles
  `author`, `reviewer`, `publisher`. The first publisher is created once with `ADMIN_BOOTSTRAP_TOKEN`; afterwards bootstrap is refused.
- **TLM-082 Authoring and preview:** drafts must compile with the lesson compiler; preview returns the compiled graph; approval requires
  a different person from the author; authors cannot overwrite each other's drafts.
- **TLM-083 Evidence integrity:** a submitted source is validated by inserting it into the curated U.S.-law pack (`validateUsLawPack`:
  trusted hosts, HTTPS, provenance class, scope limits), stored with a SHA-256 digest, and approved or rejected with a note by an
  independent reviewer; a changed record fails the integrity check.
- **TLM-084 Media rights:** PNG, JPEG, WAV and Ogg only (SVG and other active formats refused), type verified by magic bytes, ≤2 MB, a
  declared license from a closed list (proof required for licensed media), rights holder, SHA-256 identity, independent rights review.
- **TLM-085 Releases:** a release is the canonical manifest of approved lessons, sources and media, addressed by its SHA-256 digest.
  Releases are insert-only (a database trigger rejects UPDATE/DELETE). Activation appends to an activation log inside a locked transaction;
  rollback re-activates the previous release; `GET /releases/active` serves the active manifest.

## Optional tutor (TLM-086..088)
- **Provider-neutral:** a provider is `{id, available, generate()}`. The suggested provider is Anthropic Claude (`claude-opus-5-5`, low
  effort, server-side refusal fallback), enabled only when `ANTHROPIC_API_KEY` is set. Choosing the provider is an owner decision.
- **Evidence-grounded with bias controls:** the prompt contains only authored or computed lesson evidence; replies must cite supplied
  evidence IDs, may not tell the learner which position to hold, and may not present the proposal as enacted law. Failing replies are
  withheld and replaced by an authored hint, labelled as such.
- **Consent, limits and privacy:** nothing is sent without a consent token whose scopes the visitor chose; the learner's own question
  needs a separate scope; consent expires after 30 minutes; 20 requests per 10 minutes per address; 400 output tokens; request bodies
  are never logged; no account is needed and the tutor is off by default in the web panel.

## Operations
- Start: `cd apps/api && node src/migrate.mjs && node src/server.mjs` (migrations use `DATABASE_URL_DIRECT` when present).
- Env: `DATABASE_URL`, `DATABASE_URL_DIRECT`, `SESSION_SECRET` (≥32 chars), `ADMIN_BOOTSTRAP_TOKEN`, optional `ANTHROPIC_API_KEY`,
  `TUTOR_MODEL`, `CORS_ORIGINS`. The web panel reads `PUBLIC_TUTOR_API_URL` at build time; unset means authored hints only.
- Tests: `node --test apps/api/tests/*.test.mjs`; the Postgres store test runs when `TEST_DATABASE_URL` is set (CI uses a Postgres service).
