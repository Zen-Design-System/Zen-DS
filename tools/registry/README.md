# Zen DS private registry

A self-hosted [Verdaccio](https://verdaccio.org) 6 that serves the licensed `@zen-ds/*` packages. Access is per
seat: developers sign in with their Zen account through `npm login` (browser), CI with the licence key, and the
`zen-license` plugin checks both against the `zen-license-management` PocketBase backend on every request, so a
deactivated licence or a removed team member stops working with a token issued earlier.

| Path | What |
| --- | --- |
| `config.yaml` | The registry config: only `@zen-ds/*`, no uplinks (never proxies npmjs), no sign-up, web UI off |
| `plugins/verdaccio-zen-license/` | The plugin (`index.js`: auth + `npm login` routes), its PocketBase client (`license-store.js`), the sign-in page (`login-page.js`), CI-token and usage files (`state.js`), `usage-report.js` |
| `test/plugin.test.js` | Unit tests with a fake store and clock |
| `test/e2e.test.js` | Real PocketBase + Verdaccio + npm: publish, install, revoke, restore, browser `npm login`, seats, CI cap, usage |
| `test/pocketbase/pb_migrations/` | A copy of the live license schema + the registry-access changes (licenses, team_members) |
| `scripts/build-login-page.mjs` | Renders the sign-in page from Zen DS (real components + the CSS they use + Inter) into `plugins/verdaccio-zen-license/login/` (committed). Rerun after Zen changes: `npm run build:lib` in the root, then this script |
| `scripts/fetch-pocketbase.mjs` | Downloads the pinned PocketBase (0.39.11) into `.bin/` for the e2e test |
| `deploy/` | Dockerfile, docker-compose (Verdaccio + Caddy), server setup, backup/restore to R2, deploy script |

```bash
cd tools/registry
npm install
npm test            # unit + e2e (about 15 s; the first run downloads PocketBase)
npm run test:unit
npm run test:stack  # the same e2e against the Docker stack + backup → wipe → restore (needs Docker, ~1 min)
```

## How access works

- **Seats**: a licence (`licenses`, `active` set, business or pro) has `max_members` seats, held by its `owner`
  and then its `team_members`, oldest first. Owners manage the team in the licence-management app.
- **Developers** run `npm login` (npm's web login): `POST /-/v1/login` gives npm a sign-in link
  (`/-/zen/login/<id>`, 10 minutes, single use) and a polling link (`/-/zen/done/<id>`). The page signs in to
  PocketBase with Google (`sign_in_provider`; the registry also requires a linked Google login) and hands the user token to the registry, which finds the licences the
  person owns or belongs to and issues a token only for a seat they hold. The token carries the licence and user ids.
- **CI** runs `npm login --auth-type=legacy` with the **licence key** (the `licenses` record id) as password. At
  most `ci_tokens_per_license` (3) CI tokens stay active per licence; a fourth retires the oldest
  (`zen-ci-tokens.json` in the storage volume). Basic auth with the key on each request is refused.
- Tokens are JWTs valid for 365 days. Every request re-checks the licence, the seat or the CI slot, cached
  `cache_seconds` (300): unticking `active` or removing a team member cuts access within 5 minutes. Tokens from
  before seats (2026-10-14) are refused with "run npm login again".
- **Usage**: each customer request is counted per month and licence (developers, CI tokens, client IPs, installs)
  in `zen-usage.json`; on the server, `podman exec zen-registry node
  /verdaccio/plugins/verdaccio-zen-license/usage-report.js [YYYY-MM]` prints the table. Many IPs for few
  developers, or one CI token used from many places, is what a shared key looks like.
- If PocketBase is unreachable, cached answers keep serving for `stale_grace_seconds` (3600); after that the
  registry answers 503, never 401.
- Publishing: only the CI publisher, whose key's SHA-256 is `ZEN_PUBLISHER_KEY_HASH`. With no hash set, nobody can
  publish.

Customer setup:

```ini
# .npmrc in the project
@zen-ds:registry=https://npm.<domain>/
```
```bash
npm login --registry=https://npm.<domain>/ --scope=@zen-ds                       # developer: browser sign-in
npm login --registry=https://npm.<domain>/ --scope=@zen-ds --auth-type=legacy    # CI: password = licence key
```

## Environment

| Variable | What |
| --- | --- |
| `ZEN_LICENSE_STORE_EMAIL`, `ZEN_LICENSE_STORE_PASSWORD` | The `registry_clients` account the plugin signs in as |
| `ZEN_LICENSE_STORE_URL` | Optional; overrides `store_url` in `config.yaml` |
| `ZEN_PUBLISHER_KEY_HASH` | `printf %s "$KEY" \| shasum -a 256` of the CI publisher key |

The live account (`registry@zen-ds.dev`) was created on 2026-10-08; its credentials are in
`~/.config/zen-registry/license-store.env` on the machine that created it (mode 600), to move to the VPS.

## PocketBase

Live since 2026-10-08 on `zen-license-management` (`test/pocketbase/pb_migrations/1791500001_registry_access.js`
is the same change, run by the e2e test against a copy of the live schema, `1791500000_live_licenses_fixture.js`):

- `registry_clients`: an auth collection with the registry's one account; all rules null (superuser only).
- `licenses.viewRule`: `@request.auth.id != "" && (owner.id = @request.auth.id || team_members_via_license.user ?=
  @request.auth.id) || @request.auth.collectionName = "registry_clients"`. The registry reads one license by id and
  cannot list (listRule unchanged). The `@request.auth.id != ""` part closes an anonymous read: before, a license
  without team members was readable by anyone who knew its id.

Rollback: set `licenses.viewRule` back to
`owner.id = @request.auth.id || team_members_via_license.user ?= @request.auth.id` and delete `registry_clients`.

Seats (2026-10-14, `1791500002_registry_members.js`): `team_members.listRule` and `viewRule` gain
`|| @request.auth.collectionName = "registry_clients"`, so the registry can count a licence's members (read-only).
Rollback: remove that part from both rules (developer sign-ins then fail with 503; CI tokens keep working).

## Deploy (VPS, `npm.dizai.studio`)

**Live (checked 2026-10-25):** the Podman variant below on 51.79.205.10 (OVH VPS Singapore) since 2026-10-14; the
owner's remaining steps (SSH access, R2 backups, uptime check, real `npm login`, deprecating the old npmjs packages)
and the open choices are in the Vietnamese runbook [`docs/registry-setup.md`](../../docs/registry-setup.md).

The stack: `deploy/docker-compose.yml` runs the registry image (`deploy/Dockerfile`: Verdaccio 6.10.5 + plugin +
`config.yaml`, health-checked) behind Caddy 2.11.7, which gets the HTTPS certificate by itself. Packages live in
the `zen-registry_storage` volume, backed up nightly to R2 (03:17 UTC, kept 30 days).

**Once, before the first deploy**

1. **VPS:** Ubuntu 24.04, 1 vCPU / 1–2 GB, near Singapore (the license store is there). SSH as root with your key.
2. **DNS:** an `A` record `npm.dizai.studio` → the VPS IPv4 (and `AAAA` if it has IPv6). Caddy needs it to resolve
   before it can get the certificate.
3. **R2:** a bucket (e.g. `zen-registry-backups`) and an API token with Object Read & Write on it. Write
   `~/.config/zen-registry/backup.env` from `deploy/backup.env.example` (chmod 600).
4. **Secrets:** `deploy/make-env.sh` writes `~/.config/zen-registry/registry.env` (license-store account,
   public URL, publisher key hash) and creates `publisher.key` once (the CI publish key, for Phase 4).

**Deploy (and every redeploy)**

```bash
tools/registry/deploy/deploy.sh root@<vps>
```

It copies `tools/registry` to `/opt/zen-registry`, the two env files to `/etc/zen-registry/` (first time only;
existing ones are kept), then runs `deploy/setup.sh` on the server: security updates, Docker, firewall (22, 80,
443 only), `docker compose up -d --build`, and the backup cron.

**Host that already runs Caddy (Podman)** — the live server 51.79.205.10 hosts the PocketBase agent and its own
system Caddy on 80/443, so the stack there runs under Podman instead: `deploy/podman/deploy.sh root@51.79.205.10 -i
~/.ssh/tungnt620` installs the Quadlet unit `zen-registry.service` (Verdaccio on 127.0.0.1:4873, volume
`zen-registry-storage`) and appends `deploy/podman/Caddyfile.snippet` to `/etc/caddy/Caddyfile` once (backup kept
next to it). It also copies `~/.config/zen-registry/backup.env` (first time only) and, once the server has one,
installs the same nightly backup; without it the deploy warns that nothing is backed up. `backup.sh` and
`restore.sh` find the Quadlet unit and use `podman`, its volume and the host network (ufw's forward policy drops
bridged traffic); set `ZEN_CONTAINER_ENGINE` to override. Logs: `journalctl -u zen-registry`.

**Check**

```bash
curl -fsS https://npm.dizai.studio/-/ping                   # {}
ssh root@<vps> 'cd /opt/zen-registry/deploy && docker compose ps && ./backup.sh'   # healthy; one backup now
npm login --registry=https://npm.dizai.studio/ --scope=@zen-ds --auth-type=legacy  # with a real license key
```

Then add an external uptime check on `https://npm.dizai.studio/-/ping` (UptimeRobot, Better Stack, …) that alerts
you: when the registry is down, customers' installs and CI fail.

**Operate**

| Task | Command (on the server, in `/opt/zen-registry/deploy`) |
| --- | --- |
| Logs | `docker compose logs -f registry` (Caddy: `caddy`); Podman: `journalctl -u zen-registry -f`; backups: `/var/log/zen-registry-backup.log` |
| Restore | `./restore.sh latest` or `./restore.sh storage-<stamp>.tar.gz` (stops, replaces, starts the registry; Docker or Podman) |
| Rotate the license-store password | change it in PocketBase, edit `/etc/zen-registry/registry.env`, `docker compose up -d` |
| Upgrade Verdaccio / Caddy | bump the tags in `deploy/Dockerfile` / `docker-compose.yml`, `npm run test:stack`, redeploy |

The storage volume holds Verdaccio's token secret (`.verdaccio-db.json`): restoring a backup keeps customers'
tokens valid; losing it without a backup means every customer runs `npm login` again.

