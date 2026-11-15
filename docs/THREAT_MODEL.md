# Threat model, secure publishing and privacy audit (TLM-093)

Scope: the public static site, the optional publisher API (`apps/api`), its Neon database and the optional tutor provider.
This is the project's own review. It is **not** an independent security audit.

| Asset / boundary | Threat | Control | Evidence |
|---|---|---|---|
| Visitor drawings, audio, camera frames | Exfiltration | All processing local; CSP `connect-src 'self'` + API origin only; no analytics | `security.spec.mjs` (no third-party requests on any page), camera/audio specs (no uploads) |
| Static pages | XSS, clickjacking, plugin abuse | CSP (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'none'`), `nosniff`, `no-referrer`, COOP, Permissions-Policy limiting camera/mic to self | `apps/web/security-headers.json` applied on Render and exercised in `security.spec.mjs` |
| Workers | Runaway compute | Budgeted, terminating worker controllers (vision, model training) | `device-limits.test.mjs`, worker specs |
| Publisher accounts | Credential stuffing, session theft | scrypt hashes, mandatory TOTP, 8-hour HMAC sessions, no cookies (no CSRF surface), bootstrap disabled after first account | `publisher.test.mjs` |
| Separation of duties | Self-approval of content | Author ≠ approver for drafts, sources and media | `publisher.test.mjs` |
| Uploaded media | Malicious files | Closed MIME list verified by magic bytes, SVG/HTML refused, 2 MB cap, 3 MB body cap, SHA-256 identity | `publisher.test.mjs` |
| Sources | Fabricated authority | Validated against the curated pack's trusted hosts and provenance classes; digest re-checked at review | `publisher.test.mjs` |
| Releases | Tampering, silent rollback | Digest-addressed manifests, DB trigger forbids UPDATE/DELETE, append-only activation log | `store-pg.test.mjs` |
| Tutor | Data leakage, persuasion, fabricated law | Consent scopes, separate consent for learner text, minimum context, output checks, offline fallback, rate limit, no content logging | `tutor.test.mjs` |
| Secrets | Leakage in repo | Secret scanner gate; secrets only as Render env vars (`sync: false`) | `pnpm scan:secrets` |
| Local progress | Unwanted persistence | Opt-in, explicit clear with tombstone, integrity-checked import | `progress.test.mjs`, `progress.spec.mjs` |

## Accepted residual risks (owner review requested)
- `script-src 'unsafe-inline'` is required by Astro's inline island hydration scripts; removing it needs hash-based CSP generation.
- The API rate limiter is in memory per instance; a restart resets counters.
- Free-tier hosting has cold starts and no SLA; the static site does not depend on the API.
- No independent penetration test or privacy review has been performed.
