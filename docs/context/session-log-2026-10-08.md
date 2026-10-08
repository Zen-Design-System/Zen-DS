# Session log 2026-10-08

## Private registry · Phase 2: license auth plugin (session "Verdaccio private registry")

- Distribution decided with the user: self-hosted Verdaccio 6.10.5 on a VPS, per-company license keys checked
  against the `zen-license-management` PocketBase, scope `@zen-ds` (the npm org `zen-ds` is the user's).
- New `tools/registry/` (own package.json, devDeps verdaccio 6.10.5 + js-yaml): `config.yaml` (only `@zen-ds/*`,
  no uplinks, no sign-up, web off, 365 d JWT), plugin `plugins/verdaccio-zen-license/` (SHA-256 key check, license
  re-checked on every request with a 300 s cache, 1 h stale grace on store outage then 503, `zen-publisher` key hash
  from env). Denials are errors: Verdaccio's fallback grants on a plain `false`.
- Tests: 10 unit (fake store/clock) + 7 e2e (real PocketBase 0.39.11 + Verdaccio + npm: publish gate, anonymous /
  wrong key / sign-up refused, install by token and by key, revoke → 403 with the old token, re-activate).
  A mutation (license re-check removed) fails the revocation test. `npm test` in tools/registry: 17/17.
- Not touched: the library, the platform, the live PocketBase. No `npm run qa` (no UI change).

## Private registry · Phase 2 follow-up: license id as the key, live access (same session)

- User: customers copy the key from the license server; `npm login` only (option A). The live `licenses` collection
  (read with `pbc admin`) has no key field, so the key is the license record id; valid = `active` (business + pro).
  Plugin rewritten to that (username ignored, lookup by id, cache capped at 10 000 entries); the key-hash scheme and
  `scripts/license-key.js` removed. Test store = a copy of the live schema + `1791500001_registry_access.js`.
- Found: live `licenses.viewRule` let anonymous requests read any license without team members (26/30):
  `team_members_via_license.user ?= @request.auth.id` matched the empty auth id. User approved fixing it together.
- Live on zen-license-management (user approved): `registry_clients` auth collection (rules null) + account
  `registry@zen-ds.dev` (credentials in `~/.config/zen-registry/license-store.env`, 600); `licenses.viewRule` =
  `@request.auth.id != "" && (…old rule…) || @request.auth.collectionName = "registry_clients"`. Old rules backed up
  in the session scratchpad. Verified live: anonymous 404 on all 30; registry account reads 30/30, cannot list.
- `npm test` in tools/registry: 19/19 (12 unit, 7 e2e incl. owner / member / stranger / anonymous access).

## Private registry · Phase 3: VPS deployment kit (same session; user: "prepare files only")

- `tools/registry/deploy/`: Dockerfile (verdaccio/verdaccio:6.10.5 + plugin + config, healthcheck), docker-compose
  (registry + caddy:2.11.7, automatic HTTPS for `npm.dizai.studio`, storage volume), Caddyfile, `setup.sh` (Ubuntu
  24.04: unattended upgrades, Docker apt repo, ufw 22/80/443, compose up, 03:17 UTC backup cron), `backup.sh` /
  `restore.sh` (rclone 1.75.1 → R2, 30-day retention; keys via a 600 env file), `make-env.sh`, `deploy.sh`. shellcheck clean.
- `config.yaml` paths are the image's; plugin reads `ZEN_LICENSE_CACHE_SECONDS`. Caddy refuses an empty global
  `email`, so the ACME email was dropped.
- `npm run test:stack`: the e2e against the real compose stack + backup → wipe → restore (packages and existing
  tokens survive), 9/9; `npm test` 19/19.
- Local: `~/.config/zen-registry/registry.env` and `publisher.key` created (600). Not done: the VPS, DNS, R2
  bucket/token (`backup.env`), the deploy itself, the uptime monitor.

## Private registry · Phase 4: rename to @zen-ds/react + release workflow (same session, tier L)

- User: name `@zen-ds/react`; publish on a `v*` tag; the user sets the GitHub secret and deprecates the old public
  npmjs packages themselves.
- Rename: 547 occurrences in 204 files (`@zen/design-system` and the regex form `@zen\/design-system`) + the two lockfile
  name entries; history left as is (session logs, CHANGELOG entries, docs/research, docs/context).
  `package.json`: `private` removed, `publishConfig.registry` = https://npm.dizai.studio/.
- `.github/workflows/release.yml`: tag = package.json version, npm ci, tsc, usage:check, guidelines:check,
  verify:package, not-yet-published check, then `npm publish` of the verified dist-pack tarball (secret
  `ZEN_REGISTRY_PUBLISH_KEY`). A local dry run (local PocketBase + Verdaccio, the step's own shell) caught that a bare
  `dist-pack/x.tgz` is read as a GitHub shorthand (now `./dist-pack/…`); then publish → license login → install →
  import (313 exports) → zen-usage bin all pass.
- Checks: tsc ✓, guidelines:check ✓, mcp:selftest ✓, studio:selftest ✓ (615), handoff selftest ✓, usage checker on
  fixtures ✓ (consumer mode finds `@zen-ds/react` imports). Two pre-existing failures, same on a clean `main` (backlog):
  usage:selftest (JSON cut at 8 KB) and verify:package "zen-ds-mcp answers over stdio" (server exits before replies 4–5).
  `npm run qa` not run (memory: ask first).

## Two pre-existing gate failures fixed (same session, user-approved, PR #5)

- `mcp/server.mjs`: stdin close waited for nothing and called `process.exit(0)`, dropping async tools/call replies;
  now it waits for in-flight requests and flushes stdout. Replay of verify:package's requests: 5/5 runs get all replies.
- `tools/usage-guard/check-usage.mjs` and `cli.mjs`: `process.exit(main())` → `process.exitCode = main()`, so piped
  output (62 KB `--list`) is not cut at 8 KB. Exit codes unchanged (bad.tsx 1, good.tsx 0).
- Now green: usage:selftest, usage:check, mcp:selftest, verify:package ("Package OK", MCP check included).
- CI "Package" still failed on PR #5 (and on main, run 37602020509): npm 11 puts the prepack build log into
  `npm pack --json` stdout. verify-package now runs build:lib, then `npm pack --json --ignore-scripts`; passes under npm 11.21.0.
- Legal: `LICENSE.md` drafted (user: Dizai Studio, Vietnam, subscription, apps-not-kits, EULA only); `license` field; README section; Inter OFL referenced. Draft note stays until a lawyer reviews it.

## Phase 5: customer setup docs (approved: "continue with customer setup docs")
- getting-started "Install": scope line, `npm login` with the licence key, CI token via `${ZEN_DS_NPM_TOKEN}`, Docker
  build secret, an error table. Messages checked against a local registry + real npm (pty login): wrong key = E409
  "sign-up is closed", no token = E401 "Unable to authenticate…", inactive = E403 "license is not active".
- README, `AGENTS.consumer.md` (agents never handle the key), platform Installation page (5 steps, copy only).
- `zen-ds init` adds `@zen-ds:registry=…` (from `publishConfig`) to `.npmrc`; `doctor` requires it and fails on a
  literal token in the project `.npmrc`. verify-package asserts both; tsc, guidelines:check, mcp:selftest, verify:package pass.
