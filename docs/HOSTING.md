# Hosting

**Status:** the public static site is hosted on Render as `the-learning-machine` (free static site, service
`srv-dbsvitjbc2fs73cmp7lg`) at <https://the-learning-machine.onrender.com>. It auto-deploys from `main`.

- Build: `npx --yes pnpm@11.25.0 install --frozen-lockfile && npx --yes pnpm@11.25.0 build`
- Publish directory: `apps/web/dist`
- Environment: `NODE_VERSION=24`
- Configuration is documented in `render.yaml`.

The static site is the whole public learning experience. It requires no account, API key, database or remote model.
Any optional publisher/API service is separate and the public site must keep working when it is absent.

Hosting existing is not production acceptance: TLM-094 and TLM-096 still require recovery drills and independently
verified live smoke, accessibility, security and rollback evidence.
