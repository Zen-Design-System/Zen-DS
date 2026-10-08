# Zen DS private registry

A self-hosted [Verdaccio](https://verdaccio.org) 6 that serves the licensed `@zen-ds/*` packages. Access is
per company license: the `zen-license` auth plugin checks the license key (the license record id) against the
`zen-license-management` PocketBase backend, and re-checks the license on every request, so a deactivated license
stops working with a token issued earlier.

| Path | What |
| --- | --- |
| `config.yaml` | The registry config: only `@zen-ds/*`, no uplinks (never proxies npmjs), no sign-up, web UI off |
| `plugins/verdaccio-zen-license/` | The auth plugin (`index.js`) and its PocketBase client (`license-store.js`) |
| `test/plugin.test.js` | Unit tests with a fake store and clock |
| `test/e2e.test.js` | Real PocketBase + Verdaccio + npm: publish, install, revoke, restore |
| `test/pocketbase/pb_migrations/` | A copy of the live license schema + the registry-access change |
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

- **License key** = the id of the customer's record in the `licenses` collection of `zen-license-management`
  (15 characters), copied from the license server. One license per company, shared by its developers and CI.
- The customer runs `npm login` once, with any username and the license key as password; npm stores a token.
  The license must have `active` set (business and pro alike).
- The token is a JWT valid for 365 days. Whether it still works depends on the license: it is re-checked on every
  request, cached `cache_seconds` (300), so unticking `active` cuts access within 5 minutes.
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
npm login --registry=https://npm.<domain>/ --scope=@zen-ds --auth-type=legacy
#   Username: anything    Password: <license key>    Email: anything
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

## Deploy (VPS, `npm.dizai.studio`)

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
| Logs | `docker compose logs -f registry` (Caddy: `caddy`); backups: `/var/log/zen-registry-backup.log` |
| Restore | `./restore.sh latest` or `./restore.sh storage-<stamp>.tar.gz` (stops, replaces, starts the registry) |
| Rotate the license-store password | change it in PocketBase, edit `/etc/zen-registry/registry.env`, `docker compose up -d` |
| Upgrade Verdaccio / Caddy | bump the tags in `deploy/Dockerfile` / `docker-compose.yml`, `npm run test:stack`, redeploy |

The storage volume holds Verdaccio's token secret (`.verdaccio-db.json`): restoring a backup keeps customers'
tokens valid; losing it without a backup means every customer runs `npm login` again.

