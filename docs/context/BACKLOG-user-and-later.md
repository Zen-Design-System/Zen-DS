# The user's items and the later phase

Split out of `BACKLOG.md` on 2026-10-25 (user, 2026-10-24 23:40: clear the BACKLOG once, then move on). These items are
not dev work a session can pick up: the first list waits on the user, the second on the next phase. Entry text is
unchanged from `BACKLOG.md` unless a line says otherwise. Questions for the designer stay in
[`QUESTIONS.md`](QUESTIONS.md).

## For the user (Việc của anh/chị)
- **P3 · Figma: publish the renamed layers (user, 2026-10-12):** 186 layers in the Zen file were renamed to Zen's names
  (and Inline-Message's slot property Visual → Leading, same id), names only, checked before/after
  (`docs/figma-contracts/layer-renames-2026-10-12.json`, with the undo map). Other files see them once the library is
  published. What `ALLOWED` in nested-paths.mjs still lists is structure, not naming: unnamed bottom-navigation items
  and stepper steps, pages named by number, ChatComposer actions named by job, code-only layers (Retry, Counter…).
  Also waiting on the publish since 2026-10-23: `.Primitives/Input/Property-Value`'s Value-Slot (Person / Tags), which
  Import from Studio fills with every person and label (the user's choice of a slot).
- **P2 · Direct paste (⌘V on the canvas) into other files (2026-10-17; waits on the library publish):** it binds by
  node id, so only the Zen file takes it; other files need the published library and full component definitions in the
  paste (instances by `componentKey`, as Figma's own copies carry). The rest of the parity list closed on 2026-10-23
  (Copy for Figma in a copy event, grid cards' heights, the pack at 7.7 MB; the slot and alias differences kept by
  design). Pointer: `docs/research/studio-native-paste-2026-10-17.md` §8.
- **P2 · LICENSE.md is a draft: legal review before selling (2026-10-08):** drafted on PR #5 (Dizai Studio, Vietnam law, subscription, apps-not-kits, per company + member limit); a lawyer must review it and remove its "Draft" note. Was: package.json has no `license` field and the repo no
  LICENSE/EULA; needed before selling (legal text from the user).
- **P2 · Private registry: the user's steps, then Phase 6 (2026-10-08; rewritten 2026-10-24):** Phase 3: the kit is
  ready (`tools/registry/deploy/`, Podman since 01b198b9); the user creates the VPS, DNS `npm.dizai.studio`, the R2
  bucket + `backup.env`, runs `deploy.sh`, adds an uptime check and tries one real `npm login`. Phase 4: the user sets
  `ZEN_REGISTRY_PUBLISH_KEY` (read by `.github/workflows/release.yml`) and deprecates the public npmjs `@zen-ds/*`
  packages. Phase 5 is done (PR #5). Phase 6, a payment webhook (nothing in `tools/registry` yet): the user picks the
  provider, then L.
- **P3 · Private registry: warn on shared license keys (2026-10-08; rewritten 2026-10-24):** the usage report per
  licence exists (5afe9ea2: developers, CI keys, IPs and installs per month; `usage-report.js` sorts by IP count). Left:
  a warning when one key goes far beyond its `seats`, and the package version of each install
  (`tools/registry/plugins/verdaccio-zen-license/index.js`). Decision (user): is the monthly report enough?
- **P3 · Code Connect for Description List (blocked, 2026-10-04):** Figma answers "You need a Dev or Full seat on an
  Organization or Enterprise plan to use Code Connect" for this account. Once a seat is available: map
  `Description List` 14859:79180 (Layout → `layout`, Items slot → `items`) and `.Primitives/Description-List/Item`
  14859:78890 (Term → `term`, Value → `description`, Emphasis → `emphasis`, Action/Action Button → `action`) with
  `.figma.ts` templates (the repo has no figma.config.json yet).
- **P3 · Builder Link folder: the permission prompt of a real folder is untested (2026-10-06, GĐ2 M4):**
  `npm run studio:build-check` covers link, write, Trash (trash/ copy), Restore and the reconnect after a reload through
  an OPFS folder, which the browser always grants; a folder the person picks is usually "prompt" after a reload, so the
  Reconnect button path (`mirrors.ts` reconnectFolder → requestPermission) needs one check by hand in Chromium.
  (2026-10-25: about 2 minutes, optional; close the line if the user skips it.)
- **P2 · Toolbar Search 240 vs DashboardHeader's 320 (2026-10-24; a user / designer question):** the user's rule caps
  a toolbar Search at 240 (harness `search/toolbar-width`, audit kinds `toolbar-search` / Figma
  `search/toolbar-width`), but Figma's `Primitives/Dashboard/Header` Type=Control-Bar (4122:33401) has its Search
  FIXED 320, and code follows it (`dashboard-header.css` `--zen-dashboard-header-search-basis`); all three checks
  leave that slot out. Move the component (and Figma) to 240?
- **P3 · Figma screens older than the 2026-10-24 rules (the designer's file; audit warnings):** ◇ Master-Layout ·
  Example › B1 · Column has a 280 Search in Trailing-Slots (`search/toolbar-width`); ◆ HR-Platform has 6 Paid / Unpaid
  Badges and Master-Layout Example › B4 · Column a Draft Badge with Leading-Icon off (`badge/status-priority-icon`);
  Master-Layout Example E2, F1, F2 have 10 Metric-Cards with a Subtle Neutral Dock-Icon
  (`metric/dock-icon-by-meaning`). Update them in Figma, or keep them with the user's OK.
- **P2 · Metric-Card Dock-Icon Solid by default? (2026-10-24; a user / designer question):** the user's "metric card
  dùng dock icon solid" is checked only on status cards in code (`metric/dock-icon-by-meaning`: total, in progress,
  overdue, done), because Figma's Metric-Card Type=KPI (6643:64008) and code default to Neutral Subtle and ~100
  example cards use it. Make Solid the default in Figma and code, each card coloured by what it counts?

## Later phase (Giai đoạn sau)
- **Code view in other languages — on hold (user, 2026-10-08: "tạm lưu backlog, sẽ làm giai đoạn sau"):** order chosen:
  HTML/CSS → Vue → Swift → Flutter → Svelte. Plan `docs/research/code-languages-plan-2026-10-03.md`, phases P1–P9, each
  approved on its own. Still to answer when it starts: web strategy (§8.1; proposed A, native Vue/Svelte on the shared
  CSS), the dropdown meanwhile (§8.4; proposed: all six with honest states), example snippets as the render's source
  (§8.3; proposed). Examples get every language too (user, 2026-10-03). Nothing built.
- **P3 · Studio UX polish N1–N11 — deferred by the user 2026-10-08 ("để sau"):** `docs/research/studio-ux-audit-2026-10-04.md`.
  Written before the UI3 shell (#63) and F0–F10, so re-check each note in the Studio UI design check (next phase).
- **P3 · Studio panels in dark chrome and at 280px (2026-10-03; rewritten 2026-10-24):** no screenshot pass of the
  rebuilt UI3 panels in dark chrome (`chromeTheme`, `src/platform/studio/store.ts` ~21) or at their 280px minimum width
  (`inspector/inspector.css` ~3). Goes with N1–N11 (above).
- **ListItem Value in Figma — decided, not built (user, 2026-10-23: "not now"; 2026-10-13: "code first"):** code has
  `value` · `valueCaption` · `valueTone` (a right-aligned two-line amount, CHANGELOG 0.4.0 Added); Figma List-Item keeps
  the hand-built text stack in the Trailing slot. A `.Primitives/List-Item/…/Value` in `9nZv4uW2…` waits until the user
  asks for it.
- **P3 · A language setting for Studio projects (user, 2026-10-25: "Để đợt sau"; new):** Studio pages set no
  `locale`, so every page renders en-US: Table date cells (`edit: "date"`, #294) show "10/25", not "25/10", on the
  canvas, in Play and in Figma. A project (or page) setting such as "Ngôn ngữ: Tiếng Việt" would set ZenProvider
  `locale`, each frame's `lang` and the push's text.
