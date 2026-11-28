# Session log — 2026-11-28

## `@zen-ds/vue` 0.1.0, ready to publish (tier M, branch zen/feat/vue-package-release-20261128)

The user approved through the supervisor (11-28): "3. OK", publish `@zen-ds/vue`, and "2. Làm luôn", Code view P4,
which comes after this PR. The package was private, version 0.0.0, with exports pointing at `src/index.ts`.

- `tools/code-languages/vue-build.mjs` (`npm run vue:build`) builds `platforms/vue/dist` with vite's JS API. Output is
  one ES module per source file, with `vue` external. `@zen-ds/core` is a path alias inside this repo, so the web core
  ships inside the package under `dist/core/`. Declarations come from tsc on TypeScript 5 (`tsconfig.build.json`, as
  vue-tsc), and `@zen-ds/core` is rewritten to the relative path. React's `styles.css`, `reset.css` and fonts ship as
  they are; only the banner names the package. The script fails if an import leaves the package.
- `platforms/vue/package.json`: 0.1.0, not private. Exports are `.` (types + import), `./styles.css`, `./reset.css`
  and `./package.json`. `vue` ^3.5 is the peer. The licence is in `dist/LICENSE.md`. The registry is in
  `publishConfig`. `sideEffects` keeps the source path of `core-icons` for the parity bundle.
- `tools/code-languages/vue-verify-package.mjs` (`npm run vue:verify-package`) is the twin of `verify:package`. It
  packs into `dist-pack/vue/` and installs the tarball offline into a copy of `examples/vue-consumer-smoke`, where only
  `vue` and `vite` are linked, so a declaration that names `@vue/runtime-core` would fail as under pnpm. It checks:
  - the exports resolve;
  - only `vue` lies outside the package;
  - no parity fixtures or sources are shipped;
  - `styles.css` is byte-identical to React's;
  - `vue-tsc` passes on `App.vue` with `skipLibCheck: false`;
  - `vite build` passes, Button-only JS ≤ 50 KB gz (36.9 measured) and CSS ≤ 110 KB gz (99.0);
  - `renderToString` works in Node.
  The first run caught two wrong props in the template (Text `tone="subtext"`, IconButton `level="flat"`).
- CI: a step after `verify:package` runs `vue:verify-package -- --reuse-lib`.
- `release.yml`: a `publish-vue` job on `vue-v[0-9]*` checks that the tag matches, then runs `vue:check` and
  `vue:verify-package`, checks that the version is not published yet, and publishes `dist-pack/vue/*.tgz`. React's
  filter became `v[0-9]*`, because a bare `v*` also matches `vue-v0.1.0`, and its job skips `vue-` tags.
  `docs/registry-setup.md` has the row.
- Not done: no tag pushed (Giám sát asks the user after the merge). `languages.ts` still says the Vue package is "not
  published yet" until the first publish.

## Studio collaboration GĐ 1: sharing with real permissions (tier L, branch zen/feat/studio-collab-g1-20261128)

User via Giám sát: "làm đi" (GĐ 1–3 approved 2026-11-22: one editor per page with a soft lock, PocketBase cloud +
studio.dizai.studio, licence holders / seats only). Plan `docs/research/studio-collaboration-plan-2026-11-07.md`; the
BACKLOG-user-and-later line was brought up to date before any code.

- **Backend (repo only).** `tools/studio/pocketbase/pb_migrations/1795800000_studio_collab.js`: `studio_seats` (a
  person reads their own; superusers write), `studio_projects` (name, owner, owner_email, local_id; a seat holder
  creates one as its owner, only the owner renames or deletes, the owner never changes; owner + members read),
  `studio_members` (project, email, role editor/viewer; the owner invites, changes and removes, a member may leave;
  everyone in the project reads). Every read needs a seat (`@collection.studio_seats.email ?= @request.auth.email`).
  Pages, assets and comments collections move to GĐ 2, which writes them. `collab.test.mjs` checks the rules against the
  repo's pinned PocketBase 0.39.11 (`npm run studio:collab-test`; it skips without the binary). Runbook in the folder's
  README for the developer (import, seats from Polar, hosted build, Caddy); no session touches the live instance.
- **Client.** `src/platform/studio/collab/`: `collabModel.ts` (+ selftest in studio:selftest: emails, access, ceiling,
  link), `collabStore.ts` (seat + shared projects from PocketBase, owner actions, refusals in words, a dev-only stand-in
  `window.__zenStudioCollab` for the E2E), `ShareDialog.tsx` (a ModalForm: Email + Role, people with access, Copy link;
  the first invite shares the project), `SharedProjects.tsx` (Studio home "Shared with you", `?shared=<id>` marks one),
  `SeatGate.tsx` (hosted builds only: no seat → "No Zen Studio seat" + Log out).
- **Roles.** `state.role` stays the role the Studio works in (about 40 readers unchanged); `store.ts withRole` keeps it
  as `chosenRole` (saved) under `roleCeiling` (from the open project's membership). A Can view member's role menu has
  Can edit off ("Ask the project's owner"), the View only chip says the project is shared as Can view (gate reason
  `shared-viewer`, no Switch to Can edit). An owner or editor may still pick Can view for themself, so G-01/G-03 hold.
- **Hosting.** `npm run studio:build:hosted` → `dist-studio/` (git-ignored), the platform build with the seat door on.
- E2E FW-302 (Share as owner), FW-303 (Can view member), FW-304 (Shared with you + link), ids from Giám sát.
- Runs (Giám sát's slot 22:11): FW-302, FW-303, FW-304 work on the first try (82 s); shell + gate groups 26/26, no
  retries (G-01/G-03: a self-picked Can view still offers Can edit back). Baseline records the three.
- API rules on a real PocketBase (the user allowed the download in this session: pocketbase_0.39.11_darwin_arm64.zip,
  11.9 MB, into the git-ignored tools/registry/.bin): `npm run studio:collab-test` 2/2 pass. The migration applies; the
  server refuses a seatless project, a project for someone else or under another email, a member's invite or self
  upgrade, giving the project away, moving an invite, a second invite of one email; a seatless invitee sees nothing; a
  member leaves; deleting the project takes its members.
- Gate `npm run qa -- --isolated --files=…` PASS: static steps, Studio E2E 472 works · 0 broken in 5 shards, no retries.
  `npm run build` passes.
