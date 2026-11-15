# Hosting

| Service | Render id | URL | Notes |
|---|---|---|---|
| Static site `the-learning-machine` | `srv-dbsvitjbc2fs73cmp7lg` | <https://the-learning-machine.onrender.com> | Free static site from `main`; security headers from `apps/web/security-headers.json` |
| Optional API `the-learning-machine-api` | `srv-dbt0iu3l550s739mr5m0` | <https://the-learning-machine-api.onrender.com> | Free Node web service, `healthCheckPath: /health`, migrations at start |
| Database | Neon project `the-learning-machine` (`old-firefly-66700900`, aws-us-east-2, Postgres 17) | — | Pooled host for runtime (`DATABASE_URL`), direct host for migrations (`DATABASE_URL_DIRECT`) |

- Static build: `npx --yes pnpm@11.25.0 install --frozen-lockfile && npx --yes pnpm@11.25.0 build`, publish `apps/web/dist`, `NODE_VERSION=24`.
- API build: `npx --yes pnpm@11.25.0 install --frozen-lockfile --filter @learning-machine/api...`; start
  `cd apps/api && node src/migrate.mjs && node src/server.mjs`.
- Configuration is documented in `render.yaml` (secrets `sync: false`).
- Auto-deploy is enabled, but Render did not pick up pushes to `main` automatically during setup; deploys were triggered through the
  Render API. Check the Render GitHub integration if new merges do not deploy.

The static site is the whole public learning experience and needs no account, API key, database or remote model.

Hosting existing is not production acceptance: TLM-094 and TLM-096 still require staging, recovery drills against the live origin and
independently verified smoke, accessibility, security and rollback evidence.

## Recovery drill log (TLM-094, partial)

2026-11-15, performed through the Render API against the static site `srv-dbsvitjbc2fs73cmp7lg`:

1. Deploy `dep-dbt0mmlckfvc73ceihg0` of `883853f` (current `main`) reached `live`.
2. Rollback `dep-dbt0n1c9v7es73bsh3t0` to the earlier deploy of `6dbb9d3` reached `live` (previous release restored).
3. Redeploy `dep-dbt0n3s9v7es73bshb6g` of `883853f` reached `live` (roll-forward).

The optional API `srv-dbt0iu3l550s739mr5m0` deployed `live` with its `/health` check passing, which requires a reachable database;
its logs show `applied migration 001_init.sql` and `database configured; tutor offline-only`. Publisher releases have their own
application-level rollback (`POST /releases/rollback`), covered by tests.

**Not yet done:** a separate staging service (not created, to stay within the shared Render service limit), and browser smoke tests
against the live origins—this build environment cannot reach new `*.onrender.com` hosts, so live pages were verified only by Render deploy
status and logs. TLM-094 therefore remains in progress.
