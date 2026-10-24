# Backlog and open items

Moved out of `HANDOFF.md` on 2026-09-29 (text unchanged). Since 2026-10-08 (user) a bug or gate finding is fixed at
once, in the change that met it; only questions for the user or designer and work too large for that change are added
here, one line each (priority + pointer), and mentioned in the report (Scope lock, `AGENTS.md`).
Read this file only when picking up work or logging a follow-up. Done, closed and duplicate entries move to
`BACKLOG-archive.md` (text unchanged).

## Open items
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
- **ListItem Value in Figma — decided, not built (user, 2026-10-23: "not now"; 2026-10-13: "code first"):** code has
  `value` · `valueCaption` · `valueTone` (a right-aligned two-line amount, CHANGELOG 0.4.0 Added); Figma List-Item keeps
  the hand-built text stack in the Trailing slot. A `.Primitives/List-Item/…/Value` in `9nZv4uW2…` waits until the user
  asks for it.
- **P3 · New APIs the contract suites asked for (2026-10-24; each needs the user's go):** Figma draws what code has no
  prop for, so those variants return null in their suites (`tools/figma-contract/suites/*.mjs`). Popover placement that
  covers its anchor (Input/Autocomplete-Field Focused opens the list over the Add slot; code 4px below it); the sheet
  header of `.Primitives/Date-Picker` 9923:2323 (Option 1 caption + picked date + edit, Option 2 range + Clear dates); the
  Workspace Sidebar rail's Master-Background Flat / Inverse; Avatar status Disabled / Pending / Inactive and the 4px
  XSmall dot; DatePicker event days on the calendar (the Single calendars' day-1 dot: DatePicker has no events prop,
  while DatePickerItem takes `event` 1–4 since #266 and Event-List 1–4 is compared).
- **P3 · Contract checker gaps (2026-10-24; harness work, the user's go):** `tools/figma-contract/check.mjs` reads the
  first visible paint only (second fills and background-image overlays: Toggle bar, Social Others bubble, Editable
  cell), compares `fx` only without a spread ring in the same shadow list (Toggle-Button dot), one corner radius (bubble
  tails, Range-Selected-End), no max / min width (chat 220 / 516, Business 66 / 42), no inset edge shadows (Editable
  cell underline), dash patterns or IMAGE fills. The suites name each skipped layer.

- **Questions for the designer and decisions for the user** are collected in [`QUESTIONS.md`](QUESTIONS.md) (moved
  there 2026-10-08). Code keeps its current behaviour until each is answered.
- **Code view in other languages — on hold (user, 2026-10-08: "tạm lưu backlog, sẽ làm giai đoạn sau"):** order chosen:
  HTML/CSS → Vue → Swift → Flutter → Svelte. Plan `docs/research/code-languages-plan-2026-10-03.md`, phases P1–P9, each
  approved on its own. Still to answer when it starts: web strategy (§8.1; proposed A, native Vue/Svelte on the shared
  CSS), the dropdown meanwhile (§8.4; proposed: all six with honest states), example snippets as the render's source
  (§8.3; proposed). Examples get every language too (user, 2026-10-03). Nothing built.
- **P3 · Studio UX polish N1–N11 — deferred by the user 2026-10-08 ("để sau"):** `docs/research/studio-ux-audit-2026-10-04.md`.
  Written before the UI3 shell (#63) and F0–F10, so re-check each note in the Studio UI design check (next phase).

## Backlog (plan before opening sessions)
Triaged 2026-10-24 against main 545216b6: every entry was checked against the code and git history. Done, stale,
duplicate, merged and rewritten entries are in `BACKLOG-archive.md` ("Archived 2026-10-24"), text unchanged, each with
its verdict. What is left is grouped by owner; each entry has a priority, and "decision" names who answers before work
starts.

### Business (the user's own)
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

### Studio editor / push-pull / plugin
- **P3 · Builder Link folder: the permission prompt of a real folder is untested (2026-10-06, GĐ2 M4):**
  `npm run studio:build-check` covers link, write, Trash (trash/ copy), Restore and the reconnect after a reload through
  an OPFS folder, which the browser always grants; a folder the person picks is usually "prompt" after a reload, so the
  Reconnect button path (`mirrors.ts` reconnectFolder → requestPermission) needs one check by hand in Chromium.

### Components

### Tooling / harness / contracts
- **P3 · Harness candidates from the 2026-10-24 inventory (the user picks which become rules):**
  `docs/research/harness-inventory-2026-10-24.md` (grouped lists on phones, a table without a container, phone Chips
  instead of a Segmented that does not fit; a bare `<Container>` around a Table has 0 cases). The four approved rules
  (`table/bulk-actions-max`, `chip/needs-action`, three actions in one TopNavigation group, `search-folds-to-action` on
  `scrollRef` bars) shipped 2026-10-24.

### Next-phase Studio design check
- **P3 · Studio panels in dark chrome and at 280px (2026-10-03; rewritten 2026-10-24):** no screenshot pass of the
  rebuilt UI3 panels in dark chrome (`chromeTheme`, `src/platform/studio/store.ts` ~21) or at their 280px minimum width
  (`inspector/inspector.css` ~3). Goes with N1–N11 (Open items).
