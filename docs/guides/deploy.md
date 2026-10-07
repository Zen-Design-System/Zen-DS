# Deploying the docs platform

The platform (`src/platform`) ships as a static site to PocketBase Cloud with the `pbc` CLI. `pbc.json` in the repo
root records the build and the three environments; every environment builds the same code.

| Environment | Frontend | URL |
| --- | --- | --- |
| `dev` (default) | `zen-docs-dev` | https://19kf53qj4bamsnz.fbjc.pocketbasecloud.com |
| `staging` | `zen-docs-staging` | https://4vg0dbjqfpeh2rn.fbjc.pocketbasecloud.com |
| `production` | `zen-docs-production` | https://ozt2hd2nqzmsig8.fbjc.pocketbasecloud.com |

All three share one PocketBase backend, `zen-license-management`
(https://flrhpbeu1gj0js1.fbjc.pocketbasecloud.com). Deploying a frontend never touches it.

Project: Zen (`t4309893piaszm7`), region Singapore (fbjc).

## Deploy

```bash
pbc login                      # once per machine
pbc environments               # what each environment points at
pbc deploy                     # → dev
pbc deploy --env staging
pbc deploy --env production
```
