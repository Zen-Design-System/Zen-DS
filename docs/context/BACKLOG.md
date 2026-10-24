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
- **P3 · Figma contract suites, next batch (2026-10-23):** the 14 chart sets and Chart/Chart-Card have passing suites
  (`tools/figma-contract/suites/chart-*.mjs`, user's go 2026-10-23, done the same day). Still without one: the re-read
  avatar-single, chat-bubbles, input-search-primitives, table-cells, datepicker-sidebar, input-search and
  segmented-toggle-badge-avatarstack contracts. A suite per set needs a browser slot and the user's go.

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
- **P3 · Package weight:** every app loads the whole 63 KB gz stylesheet. Consider per-component CSS entry points.
  Decision (user), L.
- **P3 · Code Connect for Description List (blocked, 2026-10-04):** Figma answers "You need a Dev or Full seat on an
  Organization or Enterprise plan to use Code Connect" for this account. Once a seat is available: map
  `Description List` 14859:79180 (Layout → `layout`, Items slot → `items`) and `.Primitives/Description-List/Item`
  14859:78890 (Term → `term`, Value → `description`, Emphasis → `emphasis`, Action/Action Button → `action`) with
  `.figma.ts` templates (the repo has no figma.config.json yet).

### Studio editor / push-pull / plugin
- **P3 · Studio resize leftovers (2026-10-03/06; rewritten 2026-10-24):** (1) an item with a Fixed width alone in a px
  Grid column still edits its own width on a drag (`select/ResizeLayer.tsx` ~732: no grid cell while that width would
  stay); resizing the column and clearing that width needs one request touching two elements (server op), M. (2) A
  `.map` drag previews only the pressed instance while its pill says "all N" (`preview()` ~367 sizes `drag.host` only),
  S–M.
- **P3 · Studio drafts, live push (2026-10-02):** other browsers learn about a draft or a stale disk by the 10 s poll,
  focus or visibility (`src/platform/studio/sourceDrafts.ts` ~31, ~121); a Vite ws event (`zen-studio:drafts`) from the
  plugin, as `zen-studio:pages-changed` does (`tools/studio/vite-plugin-zen-studio.mjs` ~173), would show it at once. S.
- **P3 · Builder Link folder: the permission prompt of a real folder is untested (2026-10-06, GĐ2 M4):**
  `npm run studio:build-check` covers link, write, Trash (trash/ copy), Restore and the reconnect after a reload through
  an OPFS folder, which the browser always grants; a folder the person picks is usually "prompt" after a reload, so the
  Reconnect button path (`mirrors.ts` reconnectFolder → requestPermission) needs one check by hand in Chromium.
- **P3 · Studio slots: what still says "edit it in the code" (2026-10-08/09; rewritten 2026-10-24):** (a) remove +
  insert of a same-named element in one slot is matched as the same element by "Modified" (`tools/studio/slots.mjs`
  matchElements ~2109; a selftest case first), S–M. (b) `node tools/studio/slot-audit.mjs --ops` lists the moves still
  refused with the reason (`tools/studio/items.mjs` ~59–89): an element of a condition held in a const (12 on 10-09), an
  atom slot holding a string (41: EmptyState `icon="…"`, swapped in Properties), `.map` rows whose list is computed
  (33). Re-run the counts; decision (user): which to build (M–L each).
- **P3 · Studio object props: a per-row override (2026-10-04; rewritten 2026-10-24):** bound, conditional and loop-bound
  props are editable since 10b1b91c (a fixed value, the data item at its source, or every row; E2E I-09…I-11, IN-18,
  IN-19). Left from B4: an override of one row that leaves the shared data alone. Decision (user): wanted (L)? If not,
  relabel the "B4" classes of `tools/studio/editability-audit.mjs` (~210).
- **P3 · Studio E2E row for ungroup (2026-10-05; rewritten 2026-10-24):** TopNavigation item ops have E2E ST-23 (drag
  swap) and ST-24 (drop to group); `ungroupItem` has only a selftest (`tools/studio/items.selftest.mjs` ~278). S.

### Components
- **P2 · ModalForm `header={false}` has no accessible name (2026-09-30; rewritten 2026-10-24):** the title is not
  rendered, but `aria-labelledby` still points at its id, and only `data-*` props reach the panel, so an app cannot pass
  `aria-label` (`src/components/Dialog/Dialog.tsx` ~372, ~411). No repo page uses `header={false}` today. S.
- **P3 · Component a11y and behaviour nits (2026-09-29 … 10-03; gathered 2026-10-24; engineering, S each):**
  ProgressCircle has no decorative mode (always `role="progressbar"`, `Progress.tsx` ~106; HR Tasks repeats the visible
  status); the read-only TextArea still draws its resize grip (`input.css` ~143); Table has no selected-row cue
  (`aria-current`, Selected fill) for the row whose detail is open in a docked panel; a Popover surface shifted into
  view jumps 64–96px to its edge-aligned spot once an edge fits (`Popover/useAnchoredPosition.ts` ~46, ~149: clamp from
  the edge the anchor moves toward); a Chat quote whose original is not loaded does nothing (`Chat/ChatReply.tsx` ~115:
  tell apps to pass `onJumpToReply` in the guideline, or give the default a fallback); the Chat bubble focus ring uses
  Corner-Radius/XLarge on every corner, ignoring the Business radius and the tail corner (`chat.css` ~200–204); the
  Breadcrumbs Sub plate's −8px bleed covers the chevron's first 4px (hover only; `breadcrumbs.css` ~15, ~41: accept or
  trim).
- **P3 · TopNavigation follow-ups (2026-10-01/05; rewritten 2026-10-24):** (1) `largeTitleAction` takes no `group`
  (`TopNavigation.tsx` ~222, ~372; check that Figma's Expand-Trailing has a dual pill first), S. (2) Figma features
  without props, new API (the user's OK, M each): a bar-title Dropdown (`onTitleClick` makes the title a button, with no
  chevron or menu), a selection-mode recipe, a hero header that turns opaque on scroll (`scrollRef` serves the opaque
  types only), large-title Badges (a Badge in `largeTitleAction` may cover it: a Figma check). Capline and Subheading
  are done (`largeTitleCapline`, `largeTitleSubheading`).
- **P3 · Phone targets and sheets (2026-10-01):** the MetricCard breakdown chevron (the caller's `action`), the
  ChartCard open button (`size="2xs"`, `Chart.tsx` ~306) and Pagination prev / next (`Pagination.tsx` ~110) are 24px on
  phones; FileUpload's button is a fixed `sm` with no size prop (`Uploader.tsx` ~216), S–M. Menu and Chip popovers have
  no phone sheet mode, so templates build their own sheets: a design decision, L.
- **P3 · DatePicker leftovers (2026-09-29):** Event-List with 1–4 dots and its On-Selected colour (510:36577; `event`
  draws one Accent/Light dot, `DatePicker.tsx` ~31, ~82), S–M. Day cells (32 / 24) and the 224px panel are px while
  Figma binds Select-Item/Size/Medium | Small (40 / 32 in Comfortable), so the calendar does not grow with density
  (`date-picker.css` ~10–29), M.
- **P3 · Card states (2026-10-03/06; merged 2026-10-24):** `theme="shadow"` on an inherited alt surface (page scope
  `--zen-card-surface`, e.g. `.pe-shell[data-canvas="alt"]`) still casts its shadow; only an explicit `surface="alt"`
  drops it (`card.css` ~167), S–M. The Default theme (Flat before #210) has no hover or pressed state when clickable
  (`card.css` ~175 styles Border and Flat-Border only), so clickable cards stay bordered: Figma's Default hover /
  pressed first (designer), then S.
- **P3 · Table follow-ups (2026-10-01/08; merged 2026-10-24):** (a) `src/templates/AdminListTemplate.tsx` still shows
  its own sticky ActionBar for selected rows (Change role / Remove): move it to `bulkActions`? (decision, then S); (b)
  rows of a table without `onRowClick` still show the hover fill (`table.css` ~57): Figma's Cell Hover or clickable rows
  only? (designer); (c) no add-row slot; the HR templates now use the page header's action or a per-column button: still
  wanted? (decision, M).
- **P3 · Sidebar headers from HR-Platform (2026-09-29; rewritten 2026-10-24):** `HrShell` builds both through slots: the
  account header (square Avatar, name, email; `src/templates/hr/HrShell.tsx` ~353) and Back + Heading/4 in `search` with
  `searchCollapsed` (~362). Left: the account header's chevron-selector switch menu, and whether Sidebar should own
  these parts. Decision (user): a recipe or a component part (M).
- **P3 · Toggle docs (2026-09-29; rewritten 2026-10-24):** the platform still passes the deprecated `selected` /
  `onSelectedChange` (`PlatformGuidelineVisuals.tsx` ~180, ~337; `PlatformExamples.tsx` ~1041, ~1050), and Toggle /
  ToggleButton have no JSDoc citing their node ids (`Toggle.tsx` ~44, ~118). S.

### Platform examples and docs
- **P3 · Example audit baselines (2026-10-08; rewritten 2026-10-24):** `behaviour-baseline.json` still holds the chat
  inbox-row dead click, a probe race closed 2026-10-08: re-measure (in progress on
  zen/fix/platform-examples-backlog-20261024). The HR pages' 9 text styles moved to QUESTIONS.md (designer batch
  2026-10-24). S.
- **P3 · Guideline and snippet wording (2026-10-01/06; gathered 2026-10-24), S:** Pagination's "jump to page" wording
  and Enter row (`tools/usage-guard/guidelines.source.mjs` ~337, ~1020; Manually is a page-size input); the
  TopNavigation guideline's HIG "Navigation bars" link redirects to "Toolbars"; the Bottom Navigation guideline lacks
  "tapping the current tab scrolls to the top" (R14); the stepper "Pickup order" snippet names its Orders list only in a
  comment (`stepper.tsx` ~695).
- **P3 · Typography outline leftovers (2026-09-29; rewritten 2026-10-24):** the docs platform's own outline (section h2s
  in Heading/3, ExampleCard titles h3: `PlatformShowcases.tsx` ~46, ~110; decision), TopNavigation stories for the
  heading behaviour, and the Text "Headings" story labelling each level's default style. Review:
  `docs/context/typography-hierarchy-review-2026-09-29.md`. S–M.
- **P3 · PlatformPhone sizing (2026-10-03):** the scale falls back to 1 when its parent leaves no room
  (`src/platform/PlatformPhone.tsx` ~119: keep the last scale, or measure a host whose width does not depend on the
  phone), and the fit box lands on fractional px (~132: round it). Latent, S.
- **P3 · One browser run settles each (2026-10-02/03; gathered 2026-10-24):** the HR · Home Settings menu closing in the
  full smoke flow (HrShell is on AppShell since 71d3a22c: likely gone); action-bar › Unsaved changes' sticky bar drawn
  over its neighbours in the 390 sheet (a screen card since a50da8a9). Close each if clean. S.

### Tooling / harness / contracts
- **P3 · Harness candidates from the 2026-10-24 inventory (the user picks which become rules):**
  `docs/research/harness-inventory-2026-10-24.md` (grouped lists on phones, a table without a container, phone Chips
  instead of a Segmented that does not fit; a bare `<Container>` around a Table has 0 cases). The four approved rules
  (`table/bulk-actions-max`, `chip/needs-action`, three actions in one TopNavigation group, `search-folds-to-action` on
  `scrollRef` bars) shipped 2026-10-24.
- **P3 · Audit gaps (2026-10-02/03; the user's go 2026-10-24), in flight:** the focused-heading `edges` frame (PR #264);
  `fit` / `overflow` also catch a control clipped by an `overflow: hidden` ancestor or covered by a sibling, and a durable
  selftest for the quality / outline checks (B, PR #270). Done: `platform:audit`, `platform:shoot` and `visual-diff` warn
  on the shared :5173 and take `--isolated` (2026-10-24).
- **P3 · Gate details (the user's decisions 2026-10-24), in flight:** baseline notes follow the fix-at-once rule and a
  reused pid no longer keeps a stale "running" marker (PR #264); B.2, re-run only the steps that failed when nothing
  changed (next PR). Done 2026-10-24: token scope reads inline `var()` in TSX (importers stay one level); a Bash
  script's edits counting only when the command names the file is documented (`skills/zen-build-qa` §3). Kept on
  purpose: partial `--only` runs and mixed stale guidelines fail. Not now: B.4, C.4, C.6, C.7; no global text-width
  tolerance (the suites' `xr` / `wr` / `cxr` checks replace it).
- **P3 · Figma contract suites from the 2026-09-29 parity list (merged 2026-10-24):** the Open-items entry "Figma
  contract suites, next batch" holds the plan; it should also name Breadcrumbs (a figmaExceptions entry for the 4px list
  padding; `breadcrumbs.json` was not in the 2026-10-23 re-read), a harness kind that renders SegmentedItem inside
  Segmented, and Search/Popover with Neutral-S4 (`popover-search.mjs` checks Default only). Fold in when that entry
  starts.
- **P3 · Studio panels in dark chrome and at 280px (2026-10-03; rewritten 2026-10-24):** no screenshot pass of the
  rebuilt UI3 panels in dark chrome (`chromeTheme`, `src/platform/studio/store.ts` ~21) or at their 280px minimum width
  (`inspector/inspector.css` ~3). Goes with N1–N11 (Open items).
