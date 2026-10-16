# Backlog and open items

Moved out of `HANDOFF.md` on 2026-09-29 (text unchanged). Since 2026-10-08 (user) a bug or gate finding is fixed at
once, in the change that met it; only questions for the user or designer and work too large for that change are added
here, one line each (priority + pointer), and mentioned in the report (Scope lock, `AGENTS.md`).
Read this file only when picking up work or logging a follow-up. Done, closed and duplicate entries move to
`BACKLOG-archive.md` (text unchanged).

## Open items
- **P2 · Templates take the phone chrome (2026-10-16, follow-up of the responsive header P3, waits for the user):**
  AdminList, Detail, Dashboard, SettingsForm and HrShell keep their PageHeader in the content and have no
  `topNavigation` / `bottomNavigation`, so on a phone they show the drawer and the desktop header rows. Each needs its
  PageHeader moved into `sections` (a small desktop spacing change to review at 1512 / 390) and its phone parts by
  `docs/component-usage-rules.md` §17. Zen Studio pages made from them already get the phone parts (P4).
- **P2 · Figma Stack-Bar segments don't scale in proportion (2026-10-16):** charts now fill a stretched Chart-Card in
  Figma (every `Chart/*` set, Chart-Card, Metric-Card), but in `Chart/Stack-Bar-Chart` only the bottom segment of each
  column takes the extra height: `.Primitives/Chart/Column/Stack-Bar/Single`'s Value slot is a vertical auto layout,
  which can't share height by ratio. Proportional needs that slot rebuilt as a GRID with FLEX rows per segment value
  (every sample column). Code scales correctly.
- **P1 · 320px debt left: designer calls (2026-10-16):** 197 → 33 baselined 320 findings (docs grids, small-phone docs
  chrome, ListItem / Toast / Stepper text fixed; session log). Left, each a call for the user or the designer: Chat desktop
  examples at Comfortable on a 288px screen (13: composer send button, call button, the fixed 32px file-text box, read
  receipts, file size/time); Voice actions at Comfortable need 192px, a Voice in a Card on a 320 phone has 168 (5; it
  overflowed at both densities before the wider stage, now only at Comfortable); 4–13px at Comfortable in a 208px card:
  DatePicker "October 2026" (2), Small Pagination 216px (1), Rating "Freelance illustrators" + Sort chip (1), Settings form
  Avatar 2XL + FileUpload (1) — a `wrap` there changes 390/1512, so stack them on phones or accept. Not 320 layout:
  templates "Show all" target (1, the audit counts a link clipped inside a template's scroll frame), text-style
  rhythm/scale debt also recorded at 390/1512 (8) and widgets "9 text styles" (1; the same gallery is now recorded at 1512 / 390 / dark too: 9 widget types in one
  example, a designer call whether a gallery may exceed 7 styles).
- **P3 · Designer question: Navigation-Mobile/Top/Action-Icon-Gap is 20 (2026-10-15):** Component Size spacing now aliases
  Spacing/Gap|Padding, but the Gap ladder has no 20 (16 Medium, 24 Large), so this one stays on `dm-20`. Keep, or move it to a
  Gap step (a visible change in Top Navigation's flat icon actions)?

- **P2 · Studio option C, waiting for the user (2026-10-15):** links between components on a template page (a Chip
  that opens a DatePicker or Bottom Sheet, a filter Chip or Search that filters a Table, a Stepper's Next button): a
  Prototype action "open this popover, anchored to this element" and/or Figma-like variables. B (components keep their
  own state) is done: session log 2026-10-15 "Self-managed state".
- **P2 · AI UI: `verified` status is a heuristic (2026-10-14, user):** `tools/ai-ui/build-catalog.mjs` marks a component
  `verified` when a Figma contract file or suite name matches its folder (41 components). Confirm the list or set it in
  `tools/ai-ui/catalog.config.mjs` `STATUS_OVERRIDES`. Pointer: docs/ai-ui/README.md "Open decisions".
- **P3 · AI UI: classifier placement in the product (2026-10-15, user; handoff Q4):** the user chose "UI while typing"
  (Q1 decided). The kit classifies on the device (`keywordClassifier`) and asks the model only once an intent is likely;
  a smarter classifier (embeddings or a small model) is the product's choice: on-device keeps keystrokes private, a
  server one needs consent. Pointer: docs/ai-ui/README.md "Composing while typing".
- **P2 · AI UI: a tentative look for a guessed form (2026-10-15, designer; ShapeShift reference):** while the intent
  is only likely, ShapeShift shows the form faded with its empty slots as dashed "+ Add date" chips; Zen has no
  tentative state or token (Chip `state="placeholder"` only recolours the label). Needs Figma: a state on the form's
  components or an opacity token, and the dashed add-chip. Pointer: docs/ai-ui/README.md "Composing while typing".
- **P3 · AI UI: the recognised span underlined in the prompt field (2026-10-15, designer):** ShapeShift underlines the
  words a slot came from; `extractSlots` returns the `spans`, but `AiChatField` is a plain textarea (an overlay or a
  contenteditable, tier M). Needs Figma.
- **P3 · Keycap component (2026-10-15, designer):** keyboard hints ("Tab to keep as booking") need a Kbd; the AI UI demo
  uses Tag for now.
- **P2 · AI UI: spec format, this tree or A2UI / json-render (2026-10-14, user; handoff Q2):** the runtime uses Zen's own
  node tree (Studio dialect shape). An A2UI exporter is possible on top; decide before a native renderer is needed.
- **P2 · AI UI: a 4-column Table in a 600 / 390 px chat column (2026-10-14, designer):** needs ~608 px and scrolls
  sideways in its own box (tests/ai-ui/narrow.test.tsx). Keep, or a compact mode that folds columns (Figma first)?
- **P3 · AI UI: prose has no code block (2026-10-14, designer):** `markdownToSpec` renders fenced code as `Text as="code"`;
  no mono text style or CodeBlock / Prose component exists. Needs Figma.
- **P3 · AI UI: ChatReactorsPanel is experimental (2026-10-14, user):** its required `glyph` is a formatter function with
  no JSON form (`unavailable` in the catalog). Give it a JSON form if chat reactions should be composable.
- **P3 · AI UI: `data-ai-ui-id` on components that do not forward HTML attributes (2026-10-14):** the Skeletons (and any
  part that keeps `...rest`) carry no id in the DOM; decide whether every component should forward `data-*`.
- **P3 · Designer question: Popover label at 3.75:1 (2026-10-14):** `.zen-popover__label` ("Select an option or create one" in
  PopoverManualAddNew) uses Content/Neutral/Light, #838383 on white at 12px, under AA's 4.5:1. Baselined in
  tests/smoke/axe-baseline.json. Keep, or move the label to Content/Neutral/Medium?
- **P3 · Designer question: the mobile playground's "Sort by" Action sheet marks the current sort (2026-10-15, seen by `usage:check`, on main since 2026-10-07):** `src/platform/PlatformMobilePlaygrounds.tsx:240` passes `selectedId` to a `type="action"` BottomSheet; rule `bottom-sheet/choice-uses-list-item` warns that a single choice is a Modal sheet with `<List>` of `<ListItem selected>` rows. Keep the Action sheet (Figma shows Sort by as actions) and allow it, or switch the playground to the Modal sheet?
- **P1 · Studio → Figma coverage, P3–P4 (user approved 2026-10-12, in this order; P1, P2 merged 2026-10-13):** done on
  the way: MetricCard, ChartCard / charts, ListItem leading, ListBox header, AiChatBlock, Table cells (a design copy's
  and the push's: avatar, badge, actions, checkbox, sort). Left for P3: TopNavigation (114 uses ↔ Top-Navigation/Mobile
  + 8 Nav-Action sets), ColorSelector, TabItem, InputConditions, UploaderFileItem, DatePickerSheet, chat parts, Metric
  (re-capture); the chart family now belongs to session "Chart components với animation". P4: raw HTML and className in
  examples. Audit and numbers: `docs/research/studio-figma-push-spec-2026-10-12.md` §8.
- **P3 · Export › Figma: a Grid inside a Grid cell does not stretch to its row (2026-10-14, seen on Dashboard):** CSS
  stretches both inner Grids of the metric row, so all four MetricCards match the tallest. Figma keeps the second pair
  at its own height (168 vs 248 when one card has `custom`). The push hugs frame cells on purpose (figma-push.mjs: "Fill
  inside Fill leaves Figma a height it cannot settle"). A fix needs push, importer (FLEX rows) and pull, plus a live check.
- **P3 · Zen plugin `code.js` Swap Project Colors reads `getVariableById` (sync) (2026-10-14):** under the manifest's
  `dynamic-page` it throws (caught), so a Global Color that is an alias derives from nothing (`getBgColor`, ~line 5655).
  Import from Studio no longer uses any sync API (`tests/plugin-source-safety.test.js` checks it).
- **P3 · Figma: publish the renamed layers (user, 2026-10-12):** 186 layers in the Zen file were renamed to Zen's names
  (and Inline-Message's slot property Visual → Leading, same id), names only, checked before/after
  (`docs/figma-contracts/layer-renames-2026-10-12.json`, with the undo map). Other files see them once the library is
  published. What `ALLOWED` in nested-paths.mjs still lists is structure, not naming: unnamed bottom-navigation items
  and stepper steps, pages named by number, ChatComposer actions named by job, code-only layers (Retry, Counter…).
- **P1 · Review the rebound Figma styles Color Chart Sector/On-Color/Secondary and /Tertiary (user 2026-10-14: "Thử rồi
  duyệt sau"):** they bound Content/Neutral/Strongest (alpha 1) with a 48% / 20% paint opacity, and a bound colour's
  opacity follows the variable's alpha, so they drew solid everywhere. Now bound to Content/Neutral/Light (49% light /
  60% dark) and Border/Neutral/Subtle/Pressed (18% / 23%); the Bullet-Chart main's Track and the widget boards use them.
  If the user rejects it, restore the old binding (and the layer-opacity workaround). Session log 2026-10-13.
- **P1 · Box theme vocabulary in code (user 2026-10-13: "Figma trước, code sau"):** Figma Card / List-Box now take
  Theme · Surface (Default|Alt|Flat) · Color (+Blue, Purple; List-Box Pale hues), Metric-Card and Chart-Card
  expose their Card. Code next, on its own branch: Card `surface` flat + `color`, ListBox `surface` + `color`,
  MetricCard / ChartCard pass-through, Studio figma-props map, figma-docs source text, contract re-capture,
  usage-guard rules mirroring the Figma `theme/*` audit (Canvas → boxes, bars match the canvas, one elevation, one
  colour mode, no gradient box). Gradient themes are gone in Figma (user 2026-10-14 "Giữ solid, xoá gradient"):
  Card Gradient, every Semi-Pale (Neutral too) and List-Box Semi-Pale deleted; code's Card `theme="semi-pale"` is a
  deprecated alias of pale (2026-10-14, user "OK"). The Card contract still lists Semi-Pale until this re-capture, so
  the Studio map keeps offering it (renders pale).
  Pointer: skills/zen-figma-design/references/screen-rules.md §1, session-log-2026-10-13 "◆ Performance".
- **P2 · Navigation surfaces missing in the Figma library (designer, 2026-10-13):** Side-Bar/Master/Basic has no
  background variant (code Sidebar has default/alt/flat + divider), Top-Navigation/Mobile has no Flat type,
  Bottom-Navigation has no surface choice and its main carries an unstyled drop shadow. Screens override by variable
  until then (screen-rules §1).
- **P1 · Widget themes phase 2 — code + Studio (user, 2026-10-13; waits for the user's review of phase 1):** mirror the
  Figma build in code and Studio: Card `color` + themes `gradient`/`solid` (Solid sets `data-theme`), MetricCard `type`
  (7), the new paint styles in `styles/source/figma`, `tools/figma-docs` description source (the seven new chart sets'
  Figma descriptions still say Value Heading/3, Semi-Pale and Gradient), Studio figma-props map. Detail:
  `docs/context/session-log-2026-10-13.md` ("Widget themes phase 1"). The charts part is done (2026-10-14, branch
  `zen/feat/charts-phase2`: seven components, Studio palette, push/pull of all 15 chart sets).
- **P2 · Studio inspector has no chart Figma properties (charts phase 2, 2026-10-14):** the chart sets are missing from
  `docs/figma-contracts/component-properties.json` (captured 2026-10-05), so the inspector's Figma-props rows (Show
  Legend, Show Average, Type, Orientation …) are absent for charts; push/pull carry them. Needs a contract re-capture.
- **P2 · BarList leader length (designer, 2026-10-14):** Figma Chart/Bar-List draws the leader bar at 78% of its track
  (216 of 276px); code fills the track with the leader. Which is meant? (User 2026-10-14: "tính theo tỷ lệ của giá
  trị cho đúng" — code is proportional; the Figma fix was refused by the tool's shared-library guard: the user edits it
  or allows the write.)
- **P2 · Figma chart/widget bugs found in the widgets batch (designer, 2026-10-14; Figma not edited):** Bar-Chart
  Vertical `Average › Rule` 15335:2421 strokeCap NONE (no dots); Segmented `Item-List` FIXED 114 in Line, Stack-Bar,
  Multi-Line, Chart-Card and Heatmap (labels overlap); Area fills bound to Background/Accent|Neutral while lines use the
  Chart Sector styles (drift in a theme where they differ); coloured Solid Cards bind Content/Neutral (fails in dark,
  Light 2.9:1 on Cyan/Orange — code re-points); Solid hue cards: the series in the card's own hue uses Brand in code
  (On-Color/Tertiary washes out as an area); white on Solid Yellow 1.7:1; no Border/Inverse/Pale|Subtle token;
  Metric-Card Hero keeps a Brand Pale fill override on a Solid Brand Card (make it Pale/Brand?). Older chart diffs
  to settle: X-label pill (16 tall Bold full-width vs 20 Medium hug), Stack-Bar column max 48 vs code 40, bar lanes
  38/26 vs 36/28, horizontal/heatmap axis gaps 8 vs 16. Detail: `docs/research/widget-patterns-spec-2026-10-14.md`,
  `docs/research/chart-phase2-spec-2026-10-14.md` §4.
- **P2 · Older chart sets bake their card (designer, 2026-10-13):** Bar, Donut, Radial, Heatmap (and Multi-Line) draw
  their own Surface/Default card, so they cannot take Card Theme/Color; the new charts are card-less content that sits
  in a Card. Align the old ones the same way? (a component property cannot reach slot content of a nested Card).
- **P2 · Studio push of LineChart still draws Figma's sample axis (user, 2026-10-13: "sync lại component của figma lẫn
  studio"):** the Figma side is fixed (`.Chart/Line-Chart/Trend` 6/7-Sectors label layers now run top → bottom like 4/12,
  so a Sector switch keeps the Y labels in order). Studio has no copy of that set: `chartCardNode` in
  tools/studio/figma-push.mjs leaves Figma's sample data. Next, once the user confirms the scope: pick Sector 4/6/7/12 by
  the point count and write X labels, the six Y ticks and the active tooltip (push; pull has no chart mapping yet).
- **P2 · Voice proposals awaiting the user's approval (2026-10-13):** Discard confirm or Undo (R4), a silence warning and
  auto end-of-turn in the guideline (R6, A5, A8), `useVoiceLevels(stream)` so real apps move like the sample (R7),
  `state="thinking"` (A4), ChatVoice `onSeek` (C3). Pointer: `docs/research/voice-usability-review-2026-10-13.md`.
- **P3 · ListItem Value in Figma (user, 2026-10-13: "code first"):** code has `value` · `valueCaption` · `valueTone`
  (a right-aligned two-line amount, CHANGELOG 0.4.0 Added); Figma List-Item has no primitive for it yet (built by hand
  as a text stack in the Trailing slot). Add a `.Primitives/List-Item/…/Value` to `9nZv4uW2…` only when the user approves.
- **P3 · Sheet-style table for long content (user, 2026-10-13):** Table rows are FIXED at Table/Cell/Size (one line,
  ellipsis). The docs Props / API / Keyboard references still need multi-line rows: a temporary `.platform-ref`
  override in `src/platform/platform.css` lets them grow. Replace it with the planned sheet component (needs the user's
  approval and a Figma source).
- ~~**P2 · Studio ↔ Figma P6b: round trip by push key**~~ done 2026-10-13 (user approved; branch zen/feat/figma-keys,
  spec §8 "P6b"). Update from Figma on an exported page now lists only the designer's edits and keeps code-only
  detail. Still open, P3:
  - A frame a designer made from scratch still pulls without code-only detail (Container / Box / Form come back as
    Stack). This is inherent, since nothing in Figma holds that detail.
  - A pull in another browser has no export kept, so it falls back to a two-way comparison.
- **P2 · Examples' last 112 classNames (2026-10-13, branch zen/feat/examples-classnames):** P1–P5 of the Studio → Figma
  coverage are done (spec §8). What is left has no Zen prop, so it waits for the user: (1) padding on the page-margin
  token (Figma Margin/Comfortable: 24, 20 on a phone) and per-side padding (Figma auto layout has both): ai-chat,
  bottom-navigation safe area, checkbox indent; (2) component internals: Table min-width, ProgressBar label width,
  Toggle width, a Card's content filling its height, SidePanel height when docked, Segmented hug; (3) Skeleton widths,
  `ch` / rem widths and min-heights on mode tokens (Badge size, line heights); (4) media (img / video / photo buttons);
  (5) bespoke responsive rules (divider zoom group, search split borders, image channels, visually-hidden site header).
  Session log 2026-10-13 "P5".
- **P2 · Chart family in Studio Export › Figma (2026-10-12, unblocked 2026-10-13):** map `BarChart`, `DonutChart`,
  `RadialChart`, `HeatmapChart` and series `LineChart` in `tools/studio/figma-push.mjs` (SETS / CHART_SETS) to Figma
  Chart/Bar-Chart 15321:84071, Chart/Donut-Chart 15324:80365, Chart/Radial-Chart 15325:1135, Chart/Heatmap-Chart
  15326:1043, Chart/Multi-Line-Chart 15426:2521 (header properties: spec `docs/research/chart-family-spec-2026-10-12.md`
  §5.1). The chart mapping itself (CHART_SETS, chartCardNode) landed on main with PR #26; extend it, then run the real
  importer in the Zen file (memory: test in real Figma). Needs the user's go-ahead (new scope).
- **P3 · Chart family Figma contracts (2026-10-12):** capture `docs/figma-contracts/chart-*.json` for the five new sets
  (`tools/figma-contract/mcp-capture`) and add parity suites, so a later Figma edit is caught like the other components.
- **P3 · Figma layers left unnamed (designer, 2026-10-12):** the nested layer-name gate (tools/figma-contract/
  nested-paths.mjs, 44/44 components since nested-layers.json) allows code names Figma has no layer for: unnamed
  instances that carry their component's name (AiChatField's three action buttons, AlertBanner / InlineMessage / Toast /
  ChatCall actions, Pagination's Previous / Next / page-size chip, SidePanel's close button), icons named after their
  glyph (AlertBanner, Dialog, SidePanel, EmptyState, Tabs), and Figma names that differ from Zen's, which the code keeps
  (user, 2026-10-12): Empty-State's buttons unnamed inside CTA (code `Primary` / `Secondary`), Modal/Forms' action row
  `Footer › Buttons` (code `Actions`, as Dialog and Side-Panel), Bottom-Navigation Floating's `CTA` (code `Action`),
  Inline-Message's `Icon-Wrapper › Icon` / Custom `Visual` slot and Toast's `icon-Container › Icon` (code `Leading`),
  Chat-Control's trailing send instance `Main` (code `Send`).
  Naming them in Figma with Zen's names lets the gate check them and a Studio page's overrides land in Figma by name.
  Pointer: `ALLOWED` in nested-paths.mjs.
- **P1 · Figma usability — a row's picture through a helper (session "Table states", 2026-10-10):** the sidebar example
  builds each row's avatar with `personAvatar(people[t.assignee])` (a plain function, not a component), so the engine
  cannot reach that row's person; a dropped photo is refused ("shared by 14 rows"). Extend kind "param" to helper
  functions called with data (data-source.mjs classify → the call's argument → the row's data), then the drop changes
  that person's photo. Pointer: `docs/research/studio-usability-eval-2026-10-10.md` §5.
- **P1 · Figma usability — pictures inside list props (2026-10-10):** an AvatarStack's `items[i].src`, ChatMessage
  `seenBy`, Card `image`-like fields: a drop on one face should write that item's field (ObjectProperties already edits
  the item; the drop needs the item index from the part under the pointer). On a page you made an AvatarStack face
  now takes its own photo as an override (M8, 2026-10-11); example code still waits for this.
- **P2 · Figma usability — a photo file dropped from the desktop on a repo page (2026-10-10):** uploads live in this
  browser (IndexedDB), so example and template code cannot read them; a drop there needs the dev server to save the file
  under `src/assets/media/` (POST route + `MEDIA_REPO_FILES` refresh). On pages you made it works today.
- **P2 · Figma: Android system bars (user, 2026-10-10):** the Studio's Android Screens draw a Material 3 status bar
  (24) and gesture handle (108 × 4, 10 from the bottom) with dummy icons (builder/proto/DeviceBars.tsx); the Zen file's
  ⚙️ Operation Components has only Status-bar/IOS/Mobile, /Tablet and System/Bottom-Indicator. Designer: add
  Status-bar/Android/Mobile (+ Tablet) and an Android navigation bar there; then the code follows those nodes.
- **Zen Studio Main component (user, 2026-10-09; spec docs/research/studio-main-component-spec-2026-10-09.md):** M1–M3 done
  (frame, selection, Layers, Inspector; token edits of component CSS as drafts with undo; Figma check on save with keep /
  undo the save). P2 · not drawn yet: overlays (Dialog, ModalForm, SidePanel, BottomSheet, Toast) and 12
  components no Assets item uses (spec §3.2).

- **Questions for the designer and decisions for the user** are collected in [`QUESTIONS.md`](QUESTIONS.md) (moved
  there 2026-10-08). Code keeps its current behaviour until each is answered.
- **Zen-High-Contrast, next steps (prototype in code since 2026-10-05; user: keep step 9, no new tokens):**
  - Done (2026-10-05 evening, export "Zen-Variables 2"): Global Colors now carries the Zen-High-Contrast mode, which
    equals the algorithm on all 960 values; build-tokens takes Figma's mode and tokens:check verifies it. The Mint ramp
    was synced in the same export and matches the live file (Mint/9 #40E7AD). The native packages carry the second mode
    as data (resolver default Zen); mapping it to iOS accessibilityContrast / Flutter highContrast is still open.

- Phone decisions from the Top Navigation research (2026-10-01, `docs/research/top-navigation-mobile-rules-2026-10-01.md`):

- **P3 · Figma contracts without a suite are out of date (2026-10-08):** the contracts every suite reads were
  re-captured on 2026-10-08 through `use_figma` (button-text, button-icon, checkbox-radio-chip-popover, the Input/Heading
  entry of input-search; all 23 suites match). `avatar-single`, `chat-bubbles`, `datepicker-sidebar`,
  `input-search-primitives`, the rest of `input-search`, `segmented-toggle-badge-avatarstack` (but its two Segmented sets,
  re-captured 2026-10-14) and `table-cells` still
  hold the September capture (26 of the checked sets changed in Figma). No test reads them; re-capture each when its
  suite is written (the same LZ-chunk capture, `tools/figma-contract/README.md`).

- **Code view in other languages — on hold (user, 2026-10-08: "tạm lưu backlog, sẽ làm giai đoạn sau"):** order chosen:
  HTML/CSS → Vue → Swift → Flutter → Svelte. Plan `docs/research/code-languages-plan-2026-10-03.md`, phases P1–P9, each
  approved on its own. Still to answer when it starts: web strategy (§8.1; proposed A, native Vue/Svelte on the shared
  CSS), the dropdown meanwhile (§8.4; proposed: all six with honest states), example snippets as the render's source
  (§8.3; proposed). Examples get every language too (user, 2026-10-03). Nothing built.
- **P3 · Studio UX polish N1–N11 — deferred by the user 2026-10-08 ("để sau"):** `docs/research/studio-ux-audit-2026-10-04.md`.

## Backlog (plan before opening sessions)
- ~~**P1 · CI "Package" step: `npm pack --json` output mixed with the build log**~~ fixed 2026-10-08 (PR #5: build:lib, then `npm pack --json --ignore-scripts`; verified under npm 11). Was: **(2026-10-08, cause of the P2 below):**
  on CI (Node 24 / npm 11) the prepack `build:lib` output (vite "building…") lands in `npm pack --json`'s stdout, so
  `scripts/verify-package.mjs:48` `JSON.parse` fails; same on main run 37602020509. Locally (npm 10) it passes.
  Fix idea: build first, then `npm pack --json --ignore-scripts`. Blocks the Release workflow and CI green on PR #5.
- ~~**P1 · verify:package fails "zen-ds-mcp answers over stdio"**~~ fixed 2026-10-08 (PR #5: the server answers what is in flight and flushes stdout before exiting). Was: **(2026-10-08, same on clean main):** `mcp/server.mjs`
  exits when stdin ends, before the async replies to requests 4 (check_usage) and 5 (get_component) are written; the
  check reads ids 1–3 only. Likely the cause of the P2 CI "Package" failures below. Blocks the Release workflow
  (it runs verify:package). Pointer: `mcp/server.mjs` stdin end, `scripts/verify-package.mjs` §7.
- ~~**P1 · usage:selftest crashes: `--list` JSON cut at 8 KB**~~ fixed 2026-10-08 (PR #5: `process.exitCode` instead of `process.exit()` in check-usage.mjs and cli.mjs). Was: **(2026-10-08, same on clean main):** `check-usage.mjs` ends
  with `process.exit(main())`, which drops unflushed piped stdout (62 KB); the selftest's `JSON.parse` fails. CI runs it.
  Pointer: `tools/usage-guard/check-usage.mjs:1330`, `tools/usage-guard/selftest.mjs:11`.
- ~~**P2 · Private registry Phase 5, customer docs (2026-10-08):**~~ **Done 2026-10-08 (PR #5):** getting-started
  (scope line, `npm login`, CI token, error table checked against a live npm), README, `AGENTS.consumer.md`, the platform
  Installation page; `zen-ds init` writes the `.npmrc` line, `doctor` requires it and flags a committed token.
- **P2 · LICENSE.md is a draft: legal review before selling (2026-10-08):** drafted on PR #5 (Dizai Studio, Vietnam law, subscription, apps-not-kits, per company + member limit); a lawyer must review it and remove its "Draft" note. Was: package.json has no `license` field and the repo no
  LICENSE/EULA; needed before selling (legal text from the user).
- ~~**P0 · Live license backend: anonymous read of licenses by id**~~ fixed live 2026-10-08 (user-approved, with the registry access change; verified anonymous 404 on all 30). Was: **(2026-10-08, found by the registry e2e test):**
  `licenses.viewRule` `owner.id = @request.auth.id || team_members_via_license.user ?= @request.auth.id` lets a
  request with no auth read any license that has no team members (26 of 30 live): `?=` over an empty back-relation
  matches the empty auth id. Exposes owner id, type, credits, purchase date. Fix: prefix `@request.auth.id != "" && (…)`.
  Pointer: zen-license-management `licenses` rules; `tools/registry/test/pocketbase/pb_migrations/`.
- **P2 · Private registry Phases 3–6 (2026-10-08, plan agreed in chat):** Phase 3 kit ready (`tools/registry/deploy/`,
  README "Deploy"); the user creates the VPS, DNS `npm.dizai.studio`, R2 bucket + `backup.env`, runs `deploy.sh`, adds
  an uptime check, and tries one real `npm login`. Phase 4 (rename + release workflow) done 2026-10-08; the user sets
  `ZEN_REGISTRY_PUBLISH_KEY` and deprecates the public npmjs `@zen-ds/*` packages. Then Phase 5 docs, Phase 6 payment webhook.
- **P3 · Private registry: flag shared license keys (2026-10-08):** log installs per license (IP, version) and warn when
  one key is used far beyond its `seats`. Pointer: `tools/registry/plugins/verdaccio-zen-license/index.js`.
- ~~**P2 · CI "Package" step fails on every run of the 0.4.0 branch**~~ cause found and fixed 2026-10-08 (PR #5: npm 11 pack JSON + MCP replies). Was: ** (2026-10-07, seen when merging PR #1):** 14 of 14
- **P3 · Example lint debt seen in the DockIcon re-sync gate (2026-10-09, not caused by it):** `divider.tsx:358` a
  `<Text textStyle="Heading/2">` used as a title (type/visual-heading); `action-bar.tsx:406, 521` ListItem trailing
  buttons at size xs (list-item/trailing-button-medium).
- **P3 · Example debt surfaced by the 2026-10-08 token fast path (not caused by it):** ai-chat "Assistant on a phone" has
  no h1 (outline starts at h2); card "Spacing=small" nested corners not concentric (16 vs 12 + 16); dead clicks in chat
  (inbox row, Audio call), app-shell (Activity), list-item (Revoke invite), uploader (Retry). Report:
  `.qa/reports/2026-10-08T15-19-57-2f7410ba.md`.
  Also on templates (seen 2026-10-08 16:13): HR pages use 8 text styles each ([rhythm]), HR · Home sibling h2 in
  Heading/1 vs Heading/4 ([outline-siblings]), and the templates page exceeds the 90s behaviour budget. Also (2026-10-09): inline-message "Verify a domain" › Copy value dead click. Report:
  `.qa/reports/2026-10-08T16-13-55-2f7410ba.md`.
- **P3 · Button example "Hand off when ready": a Stack with gap 2px (2026-10-08, audit [ladder] warning at 1512/390/dark,
  surfaced by the gate for the classic code-view change, not caused by it).** Pointer: `src/platform/examples/pages/button.tsx`.
- **P3 · Table bulkActions follow-ups (2026-10-08):** (a) no harness rule caps `bulkActions` at 5 (documented only);
  (b) `src/templates/AdminListTemplate.tsx` still shows its own sticky ActionBar for selected rows (text actions Change
  role / Remove) — decide whether it moves to `bulkActions`. Pointer: `src/components/Table/Table.tsx` (TableBulkBar).
- **P2 · CI "Package" step fails on every run of the 0.4.0 branch (2026-10-07, seen when merging PR #1):** 14 of 14
  finished CI runs since 2026-09-29 failed, almost all in "Package (pack, install in a temp app, budgets, zen-usage,
  MCP, zen-ds)" (twice Browser tests, twice Platform audit); `npm run verify:package` passes locally ("Package OK").
  The job log could not be read from the cloud session (its storage host is blocked). PR #1 was merged with it on the
  user's call. Pointer: `.github/workflows/ci.yml` step "Package", `scripts/verify-package.mjs`.
- **P2 · Builder: Inspector Frames list keeps the previous local page's frames (2026-10-06, seen during GĐ2 M2):**
  open page A then page B (both new pages, Screen id `screen-1`): the Page panel's Frames shows A's title. Likely the
  frame registry keys `screen:screen-1` without the page. Pointer: `builder/BuilderBoard.tsx` frame ids,
  `inspector/PagePanel.tsx` Frames.
- **P3 · Studio E2E I-11 is flaky too (2026-10-07, seen during GĐ3 M3):** "timed out after 20 s" once with
  `--no-retry` right after the library group; 2/2 alone. Pointer: `tools/studio/e2e/scenarios/inspector.mjs` I-11.
- ~~**P3 · Studio E2E I-15 is flaky**~~ done 2026-10-07 (GĐ4 M4, the user chose to fix the row: it waits for the field to
  read "sm · …" before ⌫; 5/5 alone, full matrix). Was: **(2026-10-06, session "Studio builder tool planning", seen during GĐ2 M2):** "Timed out
  waiting for ⌫ removes gap" on the first try in 2 of 3 full runs (passes on retry and alone, 2/2); the gate counts a
  failed try as a regression. Pointer: `tools/studio/e2e/scenarios/inspector.mjs` I-15, ScaleField ⌫ reset.
  2026-10-07 (GĐ4 M1): 3/5 alone, both tries failed once in a gate run. Likely race: ⌫ right after ⌘Z is planned from
  the element and hash read before the undo's refetch, so the server refuses it as stale; the row could wait for the
  field to read "sm · …" again before ⌫.
- **P3 · usage:selftest fails now and then while another gate runs (2026-10-07):** twice a fixture rule reported 0 hits
  (`alert-banner/small-no-action`…, then `content/lights-no-light-text`) and passed 3/3 right after; both times a
  `npm run qa` ran in parallel. Find the shared state (a cache or a file the gate rewrites) before trusting a red run.
- **P3 · Builder Link folder: the permission prompt of a real folder is untested (2026-10-06, GĐ2 M4):**
  `npm run studio:build-check` covers link, write, Trash (trash/ copy), Restore and the reconnect after a reload through
  an OPFS folder, which the browser always grants; a folder the person picks is usually "prompt" after a reload, so the
  Reconnect button path (`mirrors.ts` reconnectFolder → requestPermission) needs one check by hand in Chromium.
- **P3 · Grid column resize follow-ups (2026-10-06, session "Search spacing collapse bug"):** (1) an item with a Fixed
  width (a Studio wrap Stack `width={240}`) that is alone in a px Grid column still edits its own width on a drag, which
  can leave free space again; resizing the column and clearing that width needs one request touching two elements
  (server op). (2) Double-click (Hug) on a column item does nothing ("drag the edge"): could write the track as `auto`.
  (3) No E2E row for the column drag / Fit yet (probe scripts were ad hoc). **Batch 5b 2026-10-07:** (2) done: a Hug double-click on the only item of a px column writes that column's track as `auto` (planHug, gridTracks withTrack); (3) E2E L-09 covers the Hug; the drag has no row yet. (1) still open.
- **P3 · List Item follow-ups (2026-10-06, session "List Item padding/gap adjustment"):** (1) Box padding is not
  breakpoint-aware, so desktop boxes of rows (`padding="xl"`, 24px) keep 24px on a 390px window where the page margin
  is 20px; (2) the Demo page's List composition (14730:79268, "My Leaves") still has the old List padding (12 top/bottom,
  0 sides, gap 2): with the new master its rows touch the frame sides and the fills overlap — update it in Figma;
  (3) BottomSheet body pads Margin-Compact, 16px on phones, so a clickable row's fill sits 4px from the sheet edge
  (Pick one, Sort by, template sheets); padding phone sheets 20px (title, search, body, footer) would give 8px — a
  component decision; (4) Card keeps radius 24px on phones while row blocks are `radius="xl"` 20px (Chart › Hours on a
  phone): Card radius xl on phones would match and be concentric with the fill; (5) Chat conversation rows keep the
  component's 16px inset (Figma Margin-Compact) while phone titles sit at 20px; (6) App Shell › Studio app's list block
  is a Studio-detached Box (24px fixed) next to Cards that pad 20px on phones; (7) code strings that differ from their
  render, seen by the review but not about lists: badge › Invoice status, menu › Keyboard and shortcuts, list-item ›
  Grouped notifications and layout › Main column / Centred (Card theme border vs flat), layout › Elevated panel (prose
  says shadow, render is flat), stepper / date-picker / pagination / rating snippets that leave out their List rows;
  avatar › Who's online status row sits on the card edge while the rows are inset.
  Gate warnings seen on these pages, not from this change: action-bar.tsx:404/519 trailing button size xs
  (list-item/trailing-button-medium); avatar › Profile photo has no h1 (outline-h1/start); app-shell › Search in the top
  bar "Activity, new" and chat › First message "Audio call" dead clicks; button.tsx:403 Heading/2 Text on a Studio-detached
  row (type/visual-heading) and its 2px Stack gap (ladder); list-item › Pending invites Revoke flagged as a dead click but
  works (3 → 2 rows + toast). **Sweep 2026-10-07:** done: (6) the list block is a `ListBox theme="shadow"` (app-shell.tsx:252); (7) the badge, menu, list-item and layout Main column / Centred code strings match their render, pagination's snippet has its List, and avatar's status row is a Stack above the ListBox (avatar.tsx:107-121). Duplicates: layout › Elevated panel (the Card → ListBox leftovers row above), "Activity, new" (a probe-order artifact, Done line of 2026-10-05 batch 1), button Heading/2 Text and 2px gap (Structural audit warnings row), Revoke (closed as a probe artifact). Still open: (1)–(5); (7) the stepper, date-picker and rating snippets; action-bar xs trailing buttons; avatar › Profile photo h1; chat › First message now flags "Video call" (its handler exists: check by hand). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (3) phone sheets pad 20px and (4) Card uses radius xl on phones → batch 6 · **Done 2026-10-07 (batch 6)** (bottom-sheet.css --zen-bottom-sheet-inset; card.css XLarge on phones); (5) chat rows keep Figma's 16px (closed).
- **P3 · Sky/Mint/Bronze/Golden themes, follow-ups (2026-10-05, session "Cập nhật Zen Variables tokens"):** (1) Avatar
  Golden Solid has white initials at 2.58:1 (Bronze 3.38:1): add `golden` to `avatar/solid-initials-contrast` (today
  green|teal|orange|cyan) and to the avatar guideline Don't; (2) Figma Dock-Icon Solid Sky, Mint (and Yellow) draw white
  icons (On-Colors, 1.6–1.8:1) while Avatar/Badge use On-Brights there: ask whether Figma should switch to On-Brights;
  (3) the Badge and Badge-Counter contracts (`segmented-toggle-badge-avatarstack.json`, 102 of 126 variants) predate the
  four themes, `avatar-single.json` holds only the Photo/Neutral subset, and no suite reads them: re-capture with
  tools/figma-kit when a suite is written.
- **P3 · TopNavigation groups follow-ups (2026-10-05, session "Dual action trên top navigation Figma"):** (1) Header-Trailing
  (`largeTitleAction`) takes no `group` yet; (2) Figma's pill holds two, nothing warns at three in one group (a harness
  rule or a Studio drop warning); (3) Studio E2E rows for drag/group (gestures sent to "Studio builder tool planning");
  (4) the 5173 dev server needs a restart before the Studio item ops `groupItem` / `ungroupItem` work there. **Sweep 2026-10-07:** done: (4) the 5173 dev server was restarted after the item ops landed. Still open: (1)–(3).
- **P3 · Input Small text style vs Figma (2026-10-04):** `InputContent` uses Body/Small/Medium for Small, but `fieldTextStyle` (Input.tsx) gives every field but XLarge Body/Base/Medium; check the Figma Input Small content style and align one of them.
- **Mostly done 2026-10-07 (batch 5a): the unset prop gets a + (objectStarter.ts; named types read from docs/api, E2E IN-18) and `prop={CONST}` held by a same-file const of up to 20 items edits field by field there (E2E IN-19; its items do not move or go from the inspector); B3 done in GĐ4 M3; B4 (L) and B5 beyond these classes stay open.** P2 · Studio object props, next steps (2026-10-04): after B2 (`setField`): adding an object to an unset prop
  (EmptyState `secondaryAction` "Not set"), editing `prop={CONST}` data held by a
  same-file const (86 props, `editability-audit.mjs --class=data-const`). Then B3 (nested non-boolean props), B4 (override
  for loop-bound/bound/conditional props, 3,087), B5 (tests per class). Add/remove/reorder list items: done 2026-10-04 by
  session "Mở lại port preview" (`tools/studio/items.mjs`, ObjectProperties `selection`/`only`, DataItemPanel).
- **P3 · Code Connect for Description List (blocked, 2026-10-04):** Figma answers "You need a Dev or Full seat on an
  Organization or Enterprise plan to use Code Connect" for this account. Once a seat is available: map
  `Description List` 14859:79180 (Layout → `layout`, Items slot → `items`) and `.Primitives/Description-List/Item`
  14859:78890 (Term → `term`, Value → `description`, Emphasis → `emphasis`, Action/Action Button → `action`) with
  `.figma.ts` templates (the repo has no figma.config.json yet).
- **P3 · Accordion `contentWidth` follow-ups (2026-10-03, session 2dd655b9):** ~~(1) a Content width control in the
  Accordion playground (Figma has the property since 2026-10-03)~~ done 2026-10-07 (backlog batch 4: Title / Full); (2) the audit's [rhythm] concentric check measures
  insets inside scaled phones (accordion@390 reports 8 + 5 for 8 + 8).

- **Studio multi-select follow-ups (2026-10-03, session "Chọn nhiều element vào container"):**
- **Studio nested booleans, after the 2026-10-05 fix (session "Nested boolean không hoạt động"):**
  - P3 · `origin` cannot see state that reaches a prop through a render-function parameter (Table cell
    `checked={feature.on}` with rows from useState): it reads bound-value, so a fixed value is offered and locks the toggle.
- **Studio Design tab: remaining items (2026-10-03; session "Cloud migration feasibility"; spec docs/research/studio-inspector-redesign-2026-10-03.md):**
  - **Approved phases still to do:**
    - Phase 7: polish, Appearance surface/border.
  - **P3 · Unchecked dark / Comfortable / 280px:** no screenshot pass of the inspector in dark mode, Comfortable
    density or at 280px.
- **Full-width table pages follow-ups (2026-10-03; session "Cloud migration feasibility"; need the user's OK):**
  - **P3 · Harness rule:** flag a bare `<Container>` whose subtree holds a non-Card Table (new rule = new scope).

- **From Zen Studio, the canvas tool (2026-10-02; session "Platform UI/UX redesign với canvas editor"):**
  - **P3 · Studio drafts, live push:** other browsers learn about a draft or a stale disk by the 10 s poll / focus;
    a Vite ws event (`zen-studio:drafts`) from the plugin would show it at once (verify 2026-10-03).
  - **P3 · Studio drafts and the standalone audit tools:** only `npm run qa` warns that 5173 renders unsaved drafts;
    `platform:audit`, `platform:shoot` and `visual-diff` run on 5173 without saying so (tools/platform-audit/*).
  - **P3 · PlatformPhone scale feedback (latent):** `PlatformPhone.tsx` scales from its immediate parent's width minus
    32 and falls back to scale 1 when that room is ≤ 0, so a host sized by its content (grid/inline box around the phone)
    loops. Surfaced by the phone centring (2026-10-03, Chat playground; fixed there with a definite width). Harden: keep
    the last scale instead of 1, or measure a host whose width does not depend on the phone.
  - **P3 · Phone on fractional pixels:** the fit box is `spec.width * scale` (e.g. 323.02px), so centred phones land on
    half pixels (1px gap differences, anti-aliasing in element screenshots); round the fit size in PlatformPhone.
  - **P3 · action-bar 390 contact sheet:** the sticky "No changes to save yet · Undo changes · Save changes" bar of
    Unsaved changes is drawn over the neighbouring cells (Two choices on a phone, Running total) in the shot.
  - **P3 · Board follow-ups (2026-10-03, stable layout):** a width override past the section edge overlaps the Docs
    frame and is left out of the section surface and zoom-to-fit (extend the surface / fitRect to the rendered extent
    without changing the grid track); "ResizeObserver loop completed" still fires at zoom ≤ 0.5 when frame labels crowd
    (pre-existing: defer FrameChrome's RO-path style writes to the next frame); at 1024px a toolbar inside the frame
    top opens its width menu upward off the window; after Clear contents → Reset slot → Undo ×2 on card example:5 the
    selection layer drops the selection; GET /element 404s for removed children after a slot Clear. **Batch 5b 2026-10-07:** the frame chrome lays out on the next frame after a size change (no observer loop; not reproduced before). Zoom-to-fit was done earlier (see the sweep). Still open: the section size with a width override; unsure: the width menu at 1024, Undo×2, GET /element 404. **Done 2026-10-08 (Studio backlog agent):** the section surface reaches a frame widened past the section edge (StudioBoard `--studio-section-overflow`; the grid track and the Docs frame stay put); GET /element 404 reproduced on card example:5 (Clear → Reset → Undo ×2: the spacing and resize layers read the host at its place before the write) and fixed (`select/remap.ts` liveSrc and mapInChangedBlock); not reproduced: the width menu at 1024 (768 / 600 / 1366 tall, toolbar in the frame top: opens below, inside the window) and Undo ×2 (the selection stays on the Card).
  - **P3 · Resize follow-ups (2026-10-03):** a fillChildren column with `height="fill"` whose own parent gives it no
    height collapses its children to 0 (needs a parent-aware rule); a column/row with only a minHeight keeps content
    heights (decide Figma parity); a px-capped component (number Chip, CSS max-width 40px) still offers width handles
    that only size its wrap Stack; after a wrapper edit, a child on the same source line keeps its old column and the
    selection drops ~2 s later; a `.map` drag previews only the pressed instance; a Hug double-click on an axis that is
    already Hug still sends one no-op edit; a dropdown Chip hides both axes (decide whether width stays). **Sweep 2026-10-07:** done: a Hug double-click on an axis that is already Hug writes nothing (resize.ts:582, :601; ResizeLayer.tsx:978-982). The rest is still open (two of them are decisions). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** a minHeight-only Stack sizes Fill children as Figma does, and a dropdown Chip keeps its width handle → batch 5c. **Done 2026-10-07** (layout.css, chip.css; E2E SE-10).

- **From the AI Chat Field / Chat-Control update (2026-10-02; session "Cloud migration feasibility"):**
  - **Found while verifying those fixes (2026-10-02; need the user's OK):**
    - **P3 · HR · Home Settings menu closes in the full smoke flow** (stays open alone): state left by an earlier step
      (the "Open navigation" drawer?); the smoke never samples it.
    - **P3 · Popover shift → edge hand-over jumps:** a surface shifted into view (fits on neither edge) jumps to its
      edge-aligned spot once the anchor slides far enough for an edge to fit (64–96px seen while resizing 360→424).
      Inherent to shift-then-align; a continuous hand-over would clamp from the edge the anchor moves toward.
    - **P3 · useAnchoredPosition in scaled frames:** offsets are measured in screen px but written as CSS px, so in a
      transform-scaled docs phone a surface sits slightly off its anchor (pre-existing; the clamp now uses the scale).

- **Template rebuild follow-ups (2026-10-01; brief docs/research/template-rebuild-brief-2026-09-30.md):**
  - **P3 · Table:** rows of a table without onRowClick still show the hover fill (Team budgets); the
    `table/title-heading-4` rule wants Heading/4 for a Card title that heads a table, while cards use
    Heading/Subheading (Detail page used one zen-allow). **Sweep 2026-10-07:** done: `table/title-heading-4` accepts Heading/Subheading inside a Card (check-usage.mjs:900-901); the zen-allow at DetailTemplate.tsx:271 is no longer needed. Still open: the hover fill without onRowClick.
  - **P3 · HrShell:** the Approvals counter in the module sidebar is static data; it doesn't follow approvals made on
    the page.
  - **P3 · AiChatBlock:** its greeting is an h2 in Heading/1, so a page that also has Heading/4 section h2s trips
    `outline-siblings` (HR · Home).
- **HR template audit follow-ups (2026-09-30, batch 6b; log: session-log-2026-09-30.md "Batch 6b"):**
  - **Waiting for design (user 2026-09-30: "Chờ thiết kế") · All Tasks Calendar / Gantt tabs:** Figma's Tab-Bar has
    List · Kanban · Calendar · Gantt but only List and Kanban frames exist; the two panels stay as they are until the
    designer draws them.
  - **Checkbox column closed 2026-10-05 (user: "Cột checkbox như code là cũng ổn" — keep 48, no drag handle).** **P2 · Table (All Tasks):** checkbox column 48 vs Figma 64 with a hover drag handle; no add-row slot (Leave Types,
    Public Holiday, Tasks build "Add New" as a data row / Stack); fill column still wraps in a narrow preview. **Sweep 2026-10-07:** the narrow-preview fill column is the same as the "Narrow tables without fixed widths" row. Still open: no add-row slot.
  - **P2 · Component gaps from the Tasks frames:** Box has no Support/Subtle colour surfaces (Kanban columns); Card
    Spacing Small 16/16 vs Figma ticket 12/12; ModalForm Big 960 vs 800, no action icon (Attach File), TextAreaField
    fixed 112 vs 240; PageHeader title-to-chevron gap 12 vs 8; ProgressCircle Done shows a check vs a full disc; flag
    text tone Base vs Light.
- **Review batch 5 follow-ups (2026-09-30, items 13–17; log: session-log-2026-09-30.md "Review batch 5"):**
  - **P3 · Components seen by the template agents:** emoji DockIcon XSmall draws a 12px glyph (Figma 28px); ProgressCircle
    has no decorative mode (status read twice); ModalForm `header={false}` has no accessible name; Box has no tinted
    surfaces (Kanban column colours); Card content does not fill a stretched card; AiChatBlock greeting is an h2 (Home
    adds a hidden h1). **Sweep 2026-10-07:** duplicates: Box tinted surfaces ("Component gaps from the Tasks frames" row) and the AiChatBlock greeting (AiChatBlock row). Still open: emoji DockIcon XSmall, ProgressCircle decorative mode, ModalForm `header={false}` name, Card content fill.
- **Typography outline / content hierarchy (2026-09-29):** the user approved every recommendation ("theo đề xuất");
  implemented the same day (session log, "Typography outline"). Follow-ups:
  - **P3:** the docs platform's own outline on the Typography page (h2 Heading/3 sections, example h1s under h3 card
    titles); ExampleCard should expose `data-screen`; a durable selftest for the quality/outline runtime checks; the
    redundant `ZenProvider typography="mobile"` wrappers around PlatformPhone; the Typography topbar chip no longer
    reaches phone frames (they default to Mobile); TopNavigation stories for the heading behaviour; the Text
    "Headings" story could label each level's default style. Review:
  `docs/context/typography-hierarchy-review-2026-09-29.md` (8 decisions, ~30 verdicts; the phone child screen has no
  h1, h2 renders in 6 styles, the enforcement misses missing h1s and errors on valid group headers). **Sweep 2026-10-07:** done: ExampleCard exposes `data-screen` (PlatformShowcases.tsx:41). The rest is still open. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the Typography chip does not override phone frames; phones stay Mobile (closed).
- **Process (2026-09-29):** batch A of `docs/context/process-audit-2026-09-29.md` is done (tiers in AGENTS.md §C,
  consumer-scoped QA, ledger/Stop-hook fixes, scoped static gates, Scope-lock wording, a `use_figma`-safe extractor),
  then a token fast path, label-key scoping and a narrower tier L (`--all` only for every-page changes; library
  components like AppShell stay scoped). Token sync: `skills/zen-token-sync` (the claude.ai `zen-ds-token-sync` skill is
  out of date: point it at the repo skill).
  The user chose to work with it for a few days; batches B (parallel gate), C (Figma kit, suites, live tokens) and
  D (lighter docs) wait here until needed. Batch A follow-ups: **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** batch C (Figma kit, suites, live tokens) joins batch 7; batch D is dropped.
  - **P2 · Seed the contrast/targets baseline:** `node tools/platform-audit/audit.mjs --quality --viewports=1512,390
    --baseline-update=contrast,targets` over all pages, plus a `--dark` pass (≈20 min). Until then those known
    warnings show as new.
  - **P3 · Gate details:** baseline JSON notes and their generators (`check-styles.mjs:353`, `audit.mjs:483`) still say
    "fix these when you touch them" (Scope lock wording); token scope follows importers one level (a Button token →
    23 pages); token scope reads CSS only, not inline `var()` in TSX; `foundations.css` maps to the representative set;
    a reused pid can keep a stale "running" marker alive for up to 6 h; `--only` runs that each render part of an edit's pages never clear it (one run must cover them all, so plain `npm run qa` is simpler); edits made by scripts through Bash are often not recorded; mixed stale guidelines (own + another
    session's) fail instead of rebuilding.
- **P3 · Package weight:** every app loads the whole 63 KB gz stylesheet. Consider per-component CSS entry points.
- **P3 · `-shadow-off` leaks into nested component themes** (found 2026-09-29, token update): companions are emitted
  only in the modes whose fill is tinted, so a Neutral-S4 scope inside a Neutral-S3 scope inherits S3's `0 0 #0000`
  and its selected chip loses the Figma shadow. Nothing in the repo nests component themes, but `ZenProvider` allows
  it. Fix idea: `scripts/build-tokens.mjs` emits `<token>-shadow-off: initial` in the other modes.
- **P3 · Input family contracts predate the new small radius:** `docs/figma-contracts/input-search*.json` and
  `datepicker-sidebar.json` were captured when `Corner-Radius/Input/Small` was 8 / 8 / 4 / 2. No suite checks them
  yet; re-capture before building the Input suites. (2026-09-29: the DatePicker Action entry and the two
  Select-Month-Year variants are refreshed; see the DatePicker block below.)
- **From the app-layer examples rebuild (2026-10-02, session "Add audit check…"): shared or component items, nothing
  fixed here.**
  - **P3 · AppShell aside** assumes 440px (SIDE_PANEL_DEFAULT_WIDTH) before an aside has docked once and ignores
    SidePanel size="small" (360), so a small panel that would fit opens as an overlay.
  - **P3 · Audit `edges`** counts the focus outline of a programmatically focused `tabIndex={-1}` heading as a frame
    and reports its text as flush (`tools/platform-audit/audit.mjs`).
  - **P3 · Dead app-layer example code:** the old examples of the 12 rebuilt pages in `src/platform/appLayer/*.tsx`
    (layout, content, navigation, form, shell, shellScreens, text, panels) no longer render; the playgrounds there do.
  - **P3 · Component nits seen in the second fix round:**
    - EmptyState inside a Card is lopsided: no top padding, 48px at the bottom (`empty-state.css:10`).
    - The read-only TextArea still draws its resize grip.
    - Table has no selected-row cue (aria-current / Selected fill) for the row whose detail is open in a docked panel.
- **P3 · Harness idea `chip/needs-action`:** a Normal or Advanced Chip with no onClick, `selected`, `popoverItems`,
  `onPopoverCreate` or `onClearSelection` renders a dead button; Figma says a read-only label is a Tag (Badge for
  status). 0 cases in the repo today (Chip "Counters" was Number-only, now a static count). Same session log.
- **P3 · Chat quote whose original is not in the thread** (older history not loaded): the default jump finds nothing
  and does nothing. Apps must pass `onJumpToReply` to load it; add that to the Chat guideline, or give the default a
  fallback. Chat owners ("Search popover component và Overviews").
- **P3 · `fit` follow-ups** for its owner "Quy trình kiểm tra Component build" (offline while it was built): review
  `textFit` and the new `audit.mjs` flags `--baseline-update=<kinds>` and `--css=<file>`. Still unchecked: a control
  that fits its own text but is cut off by an `overflow: hidden` ancestor or covered by a sibling. Examples: a
  Segmented with `flex-shrink: 0` in a clipping container would hide its last items, and at 390 the Side Panel ›
  "Docked inspector" card sits under the panel. `overflow` skips these as clipped, and `fit` does not see them.
- **From the Figma parity update of 2026-09-29** (session log, "Figma parity update"). The designer questions from
  the same run are under Open items.
  - **P2 · Contract suites for the updated components.** The fresh captures are saved in `docs/figma-contracts/`
    (`segmented-toggle-badge-avatarstack.json`, `input-search-primitives.json` for Search/Popover, and new
    `breadcrumbs.json`, `chat-bubbles.json`, `table-cells.json`), but only Checkbox and Radio have suites. The gap
    drifts fixed today would have failed a suite.
    - Add suites for Segmented (a harness kind that renders SegmentedItem inside Segmented), Search/Popover
      (a `search` kind, including a Neutral-S4 mode), Breadcrumbs (a figmaExceptions entry for the 4px list padding),
      Toggle, the Table cells and the Chat bubbles.
    - Re-add a caption x check to the Checkbox/Text suite: the nested instance no longer exposes Subtext, so only
      the primitive's offset is checked.
    - Labels render ~1px narrower than Figma's text boxes (Inter metrics); the suites need a global width tolerance.
  - **P3 · Code follow-ups found in passing** (need approval):
    - Chat: the keyboard focus ring on a bubble uses Corner-Radius/XLarge on every corner and ignores the Business
      radius and the tail corner (`chat.css:172, 175`). One-emoji reaction pills measure 28×24 against Figma's 24×24
      (Apple Color Emoji is 20px wide at 16px; `chat.css:99`, needs a design call). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the one-emoji pill stays 28×24 (accepted, closed).
    - Segmented: `:focus-visible` on a selected item replaces its Shadow/Action/Basic (`segmented.css:15–16`).
    - Table: `TableMedia` defaults to `bold = true` while every Figma media cell defaults to Bold=No (behaviour
      change, needs a decision); Photo-Cell radius (XSmall at 24px, Small at 32px) has no API or harness check;
      the text editor adds Effect/Popover over a Neutral/Pale fill when it grows (house-rule exception?); a duplicate
      `gap` in the select-editor rule (`table.css:85`). **Sweep 2026-10-07:** done: the duplicate `gap` is gone (table.css:104). Still open: Photo-Cell radius; decisions: TableMedia `bold` default, the text editor popover lift. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** TableMedia defaults to `bold=false` like Figma (CHANGELOG: behaviour change) → batch 6 · **Done 2026-10-07 (batch 6)** (Table.tsx; call sites keep `bold`; CHANGELOG Changed); the text editor lift is an accepted exception (closed).
    - Breadcrumbs: the Sub plate's bleed covers the first 4px of the chevron's hit area. (The 28px height is fixed:
      20px as in Figma since 2026-09-29.)
    - Toggle: the platform showcases still pass the deprecated `selected` / `onSelectedChange`
      (`PlatformShowcases.tsx:557–559`); its JSDoc does not cite the node ids; Figma renamed the Caption prop to
      Subtext (a `subtext` alias would be new API). **Sweep 2026-10-07:** done: Figma has no Subtext property to rename (component-properties.json, 2026-10-07). Still open: the deprecated props in the showcases and the JSDoc node ids.

- **From the App Shell rework of 2026-09-29** (session "App Shell kiểm tra lại"; session log 2026-09-29, "App Shell"):
  - **P3 · Sidebar headers from HR-Platform:** a workspace/account switcher header (square Avatar, name, email,
    chevron-selector) and a drill-in module header (Back chevron + Heading/4 "Time Off").
- **From the DatePicker + Breadcrumbs Figma re-read of 2026-09-29** (session "App Shell kiểm tra lại"; session log
  2026-09-29, "DatePicker radius + Breadcrumbs"):
  - **P3 · Rest of `datepicker-sidebar.json`:** Header, Item, Calendar-Table and Calendar Single/Dual still hold the
    2026-09-27 hex values and miss hidden nodes inside instances (structure and bindings checked equal to live);
    Time-Picker and the mobile sets changed in Figma. Re-capture in the desktop console when the DatePicker suite is
    built.
  - **P3 · DatePicker parts with no code:** Time-Picker (460:38628, Single-Calendar's Time-Picker prop), the mobile
    date picker (9921:3283, 9923:2323, 9923:2791, 9923:3576), and Event-List with 1–4 dots and its On-Selected colour
    (510:36577); `DatePickerItem event` draws one Accent/Light dot. **Sweep 2026-10-07:** done: `DatePickerTimePicker` (460:38628, DatePicker.tsx:507-509) and the mobile picker (`device="mobile"`, date-picker.css:95). Still open: Event-List with 1–4 dots.
  - **P3 · DatePicker sizes in px:** day cells (32 / 24) and the 224px panel are px, while Figma binds
    Select-Item/Size/Medium | Small (40 / 32 in Comfortable), so the calendar does not grow with density.

- **From the examples rebuild (2026-09-30/10-01) — RESOLVED 2026-10-02 (user: "cứ xử lý hết"; CHANGELOG "Approved backlog fixes"). Kept on purpose: the Content/Placeholder colour (Figma token; Zen fields always have a visible label) and the Avatar solid colours (Figma; harness warns instead):**
  - **P3 · Pagination:** `resultsRange` prints "of 1284 results" without thousands separators (labels.ts en/vi); the
    guideline's "jump to page" wording and Enter row do not match the Manually theme (a page-size input). **Sweep 2026-10-07:** done: thousands separators through Intl.NumberFormat and an en dash (labels.ts:245-246, :280, :464). Still open: the guideline's "jump to page" wording.
- **From the UX interaction pass and the Top Navigation research (2026-10-01; session "Component library review và
  fixes"; research §5):**
  - **P3 · G3 harness:** `top-navigation/search-folds-to-action` checks only `collapsed`. A `scrollRef` bar with a
    Search and no `searchAction` passes.
  - **P3 · G7 Figma Top Navigation features without props:**
    - large-title Capline, Subheading and Badges;
    - a bar-title Dropdown;
    - a selection-mode recipe;
    - a hero header that turns opaque on scroll.
  - **P3 · G9 docs:**
    - `example-patterns.md` §2 still puts every phone on `type="compact"` and `.pe-phone-cta`.
    - The guideline's HIG "Navigation bars" link now redirects to "Toolbars".
    - The Bottom Navigation guideline lacks "tapping the current tab scrolls to the top" (R14).
  - **P3 · Phone targets and sizes:**
    - The MetricCard breakdown chevron, the ChartCard open button and Pagination prev/next are 24px on phones.
    - FileUpload's button is 32px and has no size prop.
    - Menu and Chip popovers have no phone (sheet) mode, so templates build their own sheets.
  - **P3 · Docs frames:**
- **From the example polish pass + its gate (2026-10-01) — RESOLVED 2026-10-01/02 (components, platform.css, data.ts, audit tools by "Add audit check…"). ~~Still open: useChatDemo Delete has a confirm but no Undo toast yet (partly)~~ Undo done (checked 2026-10-07, backlog sweep: chatDemo.tsx:61-73 deleteWithUndo); every line below is closed:**
- **From the AI-readiness re-evaluation of 2026-10-02** (session "Đánh giá khả năng AI với library hiện tại"; blind trial on
  the packed tarball + memory-vs-repo audit; session log 2026-10-02, "AI-readiness re-evaluation"). Proposal, nothing fixed:
  - **P2 · Memory-only rules → repo:** token-sync gotchas (skills/zen-token-sync points to private memory), playground empty
    slots, backup naming on APFS; 15 more rules are documented but unchecked (elevation follows Sidebar, grouped lists,
    table without container, phone Chips not Segmented…). **Batch C 2026-10-07:** the token-sync gotchas are in
    skills/zen-token-sync now. Still open: the playground empty-slot and APFS backup notes live in the Mac's memory
    (not readable from a cloud session), and the unchecked rules (see the Container+Table rule row).
  - **P2 · Distribution:** `private: true`, 22 local commits not pushed, CI never ran; apps outside this Mac cannot install. **Sweep 2026-10-07:** done: the branch is pushed and CI runs (its Package failure is the CI row at the top of the Backlog). Still open: `private: true` (a decision: publish, and where).
- P3 (2026-10-03, session "Component Theme tokens update"): re-capture the Input/Search contracts. `figma-kit status` on
  Field-Only, Text-Area, Search/Popover, Search/Default, Autocomplete-Field and Text-Field: 152 variants differ. Real
  rebindings: Focused/Typing → `Input/Border/Focus` / `Input/Border/Popover-Search` (code follows), Search/Popover Hover
  1 → 2px (code follows), Disabled → `Input/Border/Disabled`, `.Primitives/Input/Text-Area` fill/stroke now
  Input/Background/Default + Input/Border/Default. The rest are stale token values (Corner-Radius/Input/Small 8 → 12,
  Caption 10 → 11, XLarge tracking). No suite maps these strokes; use `tools/figma-kit` fetch + patch.
- P3 (same session, for the designer): ~~Neutral-S7 focus is faint by design~~ — resolved 2026-10-03 evening: the designer
  set `Input/Border/Focus` in Neutral-S7 to Focus/Neutral/Solid (export synced). Still open: `Input/Border/Popover-Search` stores "Focus/Neutral/Solid at
  opacity 0" in S1–S6, which the export writes as `#NANNANNAN`: a plain transparent value would export cleanly. Also
  `.Primitives/Input/Text-Area` Focused has a 2px Focus/Neutral/Subtle outer ring, Field-Only a 3px one (both
  Focus/Neutral/Subtle since 2026-10-13; code uses the 3px ring on both). Also 2026-10-13: Field-Only's
  Inputted-Error/Blank-Error border is Color/Focus/Negative/Solid but Text-Area's is still Color/Border/Negative/Solid/Default
  (same colour; code uses Focus/Negative/Solid on both).
- P2 (2026-10-03, session "Slot Component phân biệt"): Figma file — set `Bubble-Chat-Others-Business/Background/Default`
  to Color/Background/Surface/Default in all nine Component Theme modes (repo changed at the user's request); the next
  Component Theme sync reverts it otherwise.
- **Done (checked 2026-10-07, batch 5a):** the Effects section and Corner radius (independent corners) were built in `appearance/AppearanceSection.tsx` (E2E AP-01…03); this batch added the spec's Effect settings (the style's layers, read-only) and the read-only theme effect of Card / MetricCard / ChartCard (E2E AP-05, AP-06). The resize "inset" kind stays a question for the resize owner. Was: ~~P2 (same session): Studio Phase 2 UI not built yet — Effects section (session eye), CornerRadiusField (the Position
  section was built 2026-10-04, see below); waits for the inspector owner's ScaleField + `FieldApi.apply` response
  (`docs/research/studio-position-effects-radius-spec-2026-10-03.md` §4, §6 C–E). Also resize.ts: an "inset" kind for
  absolute layers (ask the resize owner).~~
- P3 (same session): Card `theme="shadow"` on an inherited alt surface (page scope `--zen-card-surface`, e.g.
  `.pe-shell[data-canvas="alt"]`) still casts its shadow; only an explicit `surface="alt"` drops it (CSS cannot read the
  inherited var).
- P3 (same session): Studio slots — ~~duplicate then clear the original makes reset treat the original as new (⌘Z works)~~
  done 2026-10-08 (`tools/studio/slots.mjs` matchElements: a changed element right before its identical copy, same tag
  without its JSX props, keeps the saved identity; slots selftest); remove + insert of a same-named element in one slot is matched as the same element by "Modified"; menu captions over
  240px ("Required by ChartCard — replace its content instead") need shorter copy; snippet sync for inserts is best
  effort (most hand-written snippets do not contain the inserted element's anchor).
- P3 (2026-10-09, session 604bd7) · Studio slots, still "edit it in the code" (`node tools/studio/slot-audit.mjs --ops`
  lists them): moving an element of a condition held in a const (`{narrow ? … : tasksEmpty}`, 12), an atom slot holding
  a string (EmptyState `icon="…"`, 41: the icon is a prop, swapped in Properties), and `.map` rows whose list is computed
  (`Object.entries(…)`, a spread, `.filter` first: 33 per op, refused with the reason). A drag of one row moves the whole
  `{rows.map(…)}` block; Move up / down reorder the row in its data (a drag between rows could too).
- P3 (2026-10-08, Studio backlog agent) · Studio E2E I-06 timed out once in ~10 library + inspector runs (`--no-retry`): after the reseed the canvas still showed the previous row's seed and edit (Seed 9, I-05's label), also after waitSeed's reload. Not seen again in 10 runs; the next failure now names its step (10 s step timeout). Pointer: `tools/studio/e2e/scenarios/inspector.mjs` waitSeed, `run.mjs` reseed.
- P3 (2026-10-06, same session): **Card Flat has no hover/pressed** when clickable (`card.css` only styles Border's
  interactive states), so clickable cards stay `theme="border"` under §16; a Flat interactive state would let them
  follow the default mood.
