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

## Studio collaboration GĐ 2: a shared project's pages in the cloud (tier L, branch zen/feat/studio-collab-g2-20261128)

Stacked on GĐ 1 (PR #439). Plan GĐ 2: page text, images, comments and project theme saved in PocketBase, versioned
saves, conflicts kept in Version history, a migration path from a machine to a cloud project.

- **Probed first** on the local PocketBase 0.39.11: rules have no arithmetic (`version + 1` is refused at migration
  time), so a save sends `base_version` (the version it read) and a higher `version`, and the rule is
  `@request.body.base_version = version && @request.body.version > version`; an aliased join
  (`@collection.studio_members:me.…`) keeps project, email and role on one member row (a viewer is refused even with an
  editor in the project); a text field's default max is 5000 characters, so pages take `max: 5000000`.
- **Backend.** `pb_migrations/1795900000_studio_collab_pages.js`: `studio_pages` (owner + editors write, versioned, a
  page trashed by a save, deleted for good by the owner), `studio_assets` (photo files by Studio asset id), `studio_comments`
  (one JSON per page, every member writes, versioned), `studio_projects.data` (the owner's settings). `collab.test.mjs`
  3/3 (a new test for all of it).
- **Client.** `collab/cloudModel.ts` (pure: ids, header project, planCloudSync → pull / push / create / conflict /
  trash-local; a viewer never sends; selftest 17) and `collab/cloudSync.ts` (CloudApi over PocketBase or the E2E's
  stand-in `window.__zenStudioCollab.cloud`; what each page last agreed on in IndexedDB `collab-cloud`; settings: the
  owner's go up, others adopt `shared-<id>` via `projectStore.adoptProject`, kept out of the dev folder; photos up with a
  writer's push, down with a pull; comments joined with page-comments.mjs mergeComments for the open page and the pages
  a round moved; a stale save → the cloud's page with reason "conflict" (this copy in Version history) and "Someone saved
  … first" in the status). Runs at start, every 20 s and 2 s after a page changes (`pageStore.subscribePages`).
- **UI.** Shared with you's cards open the project (`shared-<id>`); sharing a project uploads its pages (the migration
  path; a draft moved into a shared project goes up the same way).
- E2E FW-305 (member pulls and pushes v2), FW-306 (conflict), FW-307 (sharing uploads), ids from Giám sát.
- Runs (Giám sát's slot 23:12): FW-307 worked at once; FW-305/306 first failed in the scenario (a page named "Home"
  matched the top bar's Home crumb, so the row left the project); renamed Landing and opened from the Pages panel, both
  work. Shell + gate + prototype 95/95, no retries; baseline records the three. Met on the way and fixed: a shared
  project's home offered Project settings to a member (only its owner saves them).
- Gate `npm run qa -- --isolated --files=…` PASS: static steps, Studio E2E 475 works · 0 broken in 5 shards (NO-12 timed
  out once under load and passed on retry; alone, `--no-retry`, it works in 11 s). `npm run build` passes.

## Studio collaboration GĐ 3: seeing each other, soft lock (tier L, branch zen/feat/studio-collab-g3-20261128)

Stacked on GĐ 2 (PR #440). Plan GĐ 3: realtime updates, avatars of the people on the page, a soft lock ("Bích is
editing this page"; the next person views until the editor leaves or presses Edit anyway).

- **Backend.** `pb_migrations/1796000000_studio_collab_presence.js`: `studio_presence` (project, page_id, user, email,
  name, editing, seen epoch ms, created); members read, a person writes and removes only their own row, one row per
  person and page. `collab.test.mjs` 4/4.
- **Client.** `collab/presenceModel.ts` (pure, selftest 14: live rows within 45 s, one per person, the first editor holds
  the lock, Edit anyway, a viewer never claims edit), `collab/presence.ts` (this person's row renewed every 15 s, removed
  on leave and with a keepalive request when the tab closes; reads on every renewal and on the server's presence event;
  publishes `state.pageLock`), CloudApi gains presence and `subscribe` (PocketBase realtime on pages, comments, presence;
  the E2E stand-in's `listeners`); a page or comments event runs a sync round at once (`cloudPlaceOf` names where the open
  page is). `state.pageLock` caps the role like a Can view membership; gate reason `page-locked` ("<name> is editing this
  page", Edit anyway in the View only note). `PagePeople`: the others' AvatarStack beside the role.
- E2E FW-308 (realtime), FW-309 (who is on the page), FW-310 (soft lock: locked, lifts, Edit anyway).
- Runs (Giám sát's slot 00:13): FW-308 (their save on the canvas 446 ms after the server's event), FW-309, FW-310 work
  on the first try. In the shell + gate + prototype run (98/98) FW-308 passed only on retry: the rows shared one cloud
  project and record id, and the E2E server's pages folder kept FW-305/306's copy of that page, so FW-308 met a second
  page of the project mid-conflict. Each cloud row now has its own project and record ids; FW-305…310 back to back,
  `--no-retry`: 6/6.
- Gate `npm run qa -- --isolated --files=…` PASS: static steps, Studio E2E 478 works · 0 broken in 4 shards (NO-11 timed
  out once under load and passed on retry; alone, `--no-retry`, it works in 11 s). `npm run build` passes.
