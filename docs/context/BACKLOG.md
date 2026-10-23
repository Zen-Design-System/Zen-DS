# Backlog and open items

Moved out of `HANDOFF.md` on 2026-09-29 (text unchanged). Since 2026-10-08 (user) a bug or gate finding is fixed at
once, in the change that met it; only questions for the user or designer and work too large for that change are added
here, one line each (priority + pointer), and mentioned in the report (Scope lock, `AGENTS.md`).
Read this file only when picking up work or logging a follow-up. Done, closed and duplicate entries move to
`BACKLOG-archive.md` (text unchanged).

## Open items
- **P3 · Figma instances of a workflow step still drawn as themed Badges (2026-10-21; code done 2026-10-23):** the
  code side moved to BadgeStatus (platform examples, the app-layer AppShell playground, the HR Tasks template); Figma
  screens that show a task's or project's step with a themed Badge instance still need swapping to Badge-Status. Waits
  for the user: a write to the Zen Figma file.
- **P3 · PropertyField ↔ Figma gaps (2026-10-21):** a People / Labels cell pushes one person and two tags (the
  Property-Value variants hold that many), and `BadgeStatus progress` is not pushed (Progress-Icon's arc is set by hand in
  Figma). Pointer: `tools/studio/figma-property.mjs`.
- **P2 · Calendar/Toolbar Mobile in the Mobile typography — question for the designer (2026-10-21, Calendar in code):**
  Figma drew the Mobile variant (16125:399) in the desktop type sizes; with Mobile typography Heading/3 is 26px, so
  "September 2026" (~200px) and a fourth view label ("Agenda") no longer fit 358px beside Today and the arrows, in
  Comfortable density. Code: the mobile toolbar's default title is the short form ("Sep 2026"), and the phone example
  offers three views. Designer: keep the short title, or another style / layout? Pointer: `src/components/Calendar/CalendarToolbar.tsx`.
- **P2 · Studio Variables v2 (2026-10-17; re-checked 2026-10-23):** v1 is on main (#116: Local variables window, edit /
  alias / create / rename / duplicate / delete, drafts + live tokens.css, Save builds the tokens, Copy for Figma →
  plugin); Apply / Detach variable on Inspector fields (E5) came with F5b (#151). Open: modes (add / rename / delete), new
  collections, description / scoping / code syntax, rename of a variable code reads (rewrite its CSS readers), Change
  variable mode per frame / section / page (E6; today a frame's Theme Light/Dark, for the session only). Pointer:
  `docs/research/studio-figma-native-parity-2026-10-17.md` §10.
- **P3 · Metric Title-Highlight Figma slips (2026-10-17, for the designer):** in 7523:507049, the Header gap of 12 is
  unbound (should be Spacing/Gap/Small) and Medium's Metric-Number has paragraphSpacing bound to Font-Size/Heading-3
  (session log 2026-10-17, "Metric-Inline/Title-Highlight"; the Custom-Slot padding is fixed).
- **P1 · 320px debt left: designer calls (2026-10-16):** 197 → 33 baselined 320 findings (docs grids, small-phone docs
  chrome, ListItem / Toast / Stepper text fixed; session log). Left, each a call for the user or the designer: Chat desktop
  examples at Comfortable on a 288px screen (13: composer send button, call button, the fixed 32px file-text box, read
  receipts, file size/time); Voice actions at Comfortable need 192px, a Voice in a Card on a 320 phone has 168 (5; it
  overflowed at both densities before the wider stage, now only at Comfortable); 4–13px at Comfortable in a 208px card:
  DatePicker "October 2026" (2), Small Pagination 216px (1), Rating "Freelance illustrators" + Sort chip (1), Settings form
  Avatar 2XL + FileUpload (1) — a `wrap` there changes 390/1512, so stack them on phones or accept. Not 320 layout:
  templates "Show all" target (1, the audit counts a link clipped inside a template's scroll frame), text-style
  rhythm/scale debt also recorded at 390/1512 (8) and widgets "8 text styles" (1; the same gallery is now recorded at 1512 / 390 / dark too, 9 → 8 after the user's Heading/1 call: 7 widget types in one
  example, a designer call whether a gallery may exceed 7 styles).
- **P3 · Designer question: Navigation-Mobile/Top/Action-Icon-Gap is 20 (2026-10-15):** Component Size spacing now aliases
  Spacing/Gap|Padding, but the Gap ladder has no 20 (16 Medium, 24 Large), so this one stays on `dm-20`. Keep, or move it to a
  Gap step (a visible change in Top Navigation's flat icon actions)?

- **P2 · Studio option C, waiting for the user (2026-10-15):** links between components on a template page (a Chip
  that opens a DatePicker or Bottom Sheet, a filter Chip or Search that filters a Table, a Stepper's Next button): a
  Prototype action "open this popover, anchored to this element" and/or Figma-like variables. B (components keep their
  own state) is done: session log 2026-10-15 "Self-managed state".
- **P2 · AI UI: decisions for the user (merged 2026-10-23 from five entries of 2026-10-14/15; `docs/ai-ui/README.md`
  "Open decisions"):** (1) `verified` is a heuristic: `tools/ai-ui/build-catalog.mjs` marks a component verified when a
  Figma contract file or suite name matches its folder (41); confirm them or list them in `tools/ai-ui/catalog.config.mjs`
  `STATUS_OVERRIDES` (empty). (2) Spec format: Zen's node tree (Studio dialect shape) or A2UI / json-render (an exporter
  can sit on top); decide before a native renderer is needed. (3) Classifier placement (handoff Q4): the kit classifies on
  the device (`keywordClassifier`); a smarter one (embeddings or a small model) on the device keeps keystrokes private, a
  server one needs consent ("Composing while typing"). (4) `ChatReactorsPanel` is experimental: its required `glyph` is a
  formatter with no JSON form; give it one if chat reactions should be composable. (5) `data-ai-ui-id` does not reach the
  DOM on components that keep their HTML attributes (the Skeletons): should every component forward `data-*`?
- **P2 · AI UI: Figma first, for the designer (merged 2026-10-23 from six entries of 2026-10-14/15):** (1) a tentative
  look for a guessed form (ShapeShift: the form faded, empty slots as dashed "+ Add date" chips); Zen has no tentative
  state or token (Chip `state="placeholder"` only recolours the label). (2) The recognised span underlined in the prompt
  field: `extractSlots` returns the `spans`, but `AiChatField` is a plain textarea (an overlay or a contenteditable, tier
  M). (3) "AI glow" gradient tokens for the "AI is working" orb (demo CSS `.px-ai-ui-orb` in
  `src/platform/examples/pages/ai-ui.css`, from Support Pink / Violet / Cyan); `tokens.css` has no gradient token; if
  the orb stays it becomes a component (AiChatBubble `thinking="orb"`?). (4) A 4-column Table in a 600 / 390 px chat
  column needs ~608 px and scrolls sideways in its own box (`tests/ai-ui/narrow.test.tsx`): keep, or a compact mode that
  folds columns? (5) Prose has no code block: `markdownToSpec` renders fenced code as `Text as="code"`; no mono text
  style or CodeBlock / Prose component. (6) A Keycap (Kbd) for keyboard hints ("Tab to keep as booking"; the demo uses Tag).
- **P2 · Example className, round 2 (2026-10-23, session B; user: "theo bạn cái nào lợi hơn lâu dài, chính xác nhất"):**
  the 2026-10-12 coverage plan's P3 (TopNavigation, ColorSelector, TabItem, InputConditions, UploaderFileItem,
  DatePickerSheet, chat, Metric) and P4/P5 (className 219 → 112) were merged on 2026-10-13 (spec
  `docs/research/studio-figma-push-spec-2026-10-12.md` §8). Examples added since carry 177 className and 74 raw tags
  again. Doing now (branch `zen/chore/examples-classnames-20261023`): classes with a Figma-equivalent Zen prop (Fill
  container, Absolute, max size, scroll, Grid stackBelow) become props, bleed margins become structure, dead classes go;
  docs-only CSS (ch widths, component internals, motion, media, demo focus rings) stays. User decisions 2026-10-23: Card /
  ListBox content becomes an auto layout column, Box / Stack get `sticky`, wrapping rows use Fill + min width. Three PRs;
  spec card `docs/research/examples-classnames-round2-spec-2026-10-23.md`.
- **P3 · Zen plugin `code.js` Swap Project Colors reads `getVariableById` (sync) (2026-10-14):** under the manifest's
  `dynamic-page` it throws (caught), so a Global Color that is an alias derives from nothing (`getBgColor`, ~line 5655).
  Import from Studio no longer uses any sync API (`tests/plugin-source-safety.test.js` checks it).
- **P3 · Figma: publish the renamed layers (user, 2026-10-12):** 186 layers in the Zen file were renamed to Zen's names
  (and Inline-Message's slot property Visual → Leading, same id), names only, checked before/after
  (`docs/figma-contracts/layer-renames-2026-10-12.json`, with the undo map). Other files see them once the library is
  published. What `ALLOWED` in nested-paths.mjs still lists is structure, not naming: unnamed bottom-navigation items
  and stepper steps, pages named by number, ChatComposer actions named by job, code-only layers (Retry, Counter…).
- **P2 · Code-side rules for the Figma theme audit — waits for the user (2026-10-13, rest of "Box theme vocabulary in
  code"; re-checked 2026-10-23):** the vocabulary is in code: Card / ListBox `theme` · `color` · `surface`, MetricCard
  and ChartCard pass it through, the Studio map and the Card contract follow #210 (no Semi-Pale; `semi-pale` is a
  deprecated alias of pale). Left: usage-guard rules mirroring the Figma audit's `theme/mixed-elevation`,
  `theme/mode-override`, `theme/mixed-boxes`, `theme/on-solid-content` and `theme/on-white-solid`
  (`skills/zen-figma-design/harness/zen-figma-audit.js`); code already has card/pale-on-canvas-default,
  layer/surface-on-canvas-alt-border, layer/surface-flat-is-navigation and surface/no-shadow-on-tinted. New harness
  rules need the user's yes, and colour / composition principles stay skill guidance unless the user says otherwise.
- **P2 · Navigation surfaces missing in the Figma library (designer, 2026-10-13; re-checked 2026-10-23):** Patterns/Sidebar
  takes Theme · Density · Shadow since 2026-10-21 (#181) and Top-Navigation/Mobile has Type=Transparent /
  Transparent-On-Color since 2026-10-17. Left: Bottom-Navigation has no surface choice and its main carries an unstyled
  drop shadow (not re-read since 2026-10-13). Screens override by variable until then (screen-rules §1).
- **P2 · Chart questions for the designer (merged 2026-10-23 from four entries of 2026-10-13 … 10-18; Figma not
  edited):** (a) parity: active X pill (20px hug, Medium vs sector-wide 16px Bold), 88% dim of inactive columns, Bar
  label padding / thinning, Tooltip anchor and lanes, bar lanes 38/26 vs 36/28, horizontal / heatmap axis gaps 8 vs 16,
  Heatmap density token, Chart Card description gap; Figma lacks the Line / Multi-Line active dot, Area Stacked and
  Grouped / Combo active states, Radial default variant (`docs/research/chart-parity-audit-2026-10-17.md` §2–§4).
  (b) Figma slips from the widgets batch: Bar-Chart Vertical `Average › Rule` 15335:2421 strokeCap NONE (no dots);
  Segmented `Item-List` FIXED 114 in Line, Stack-Bar, Multi-Line, Chart-Card and Heatmap (labels overlap); Area fills
  bound to Background/Accent|Neutral while lines use the Chart Sector styles; Solid hue cards: the series in the card's
  own hue uses Brand in code (On-Color/Tertiary washes out as an area); no Border/Inverse/Pale|Subtle token; Metric-Card
  Hero keeps a Brand Pale fill override on a Solid Brand Card (`docs/research/widget-patterns-spec-2026-10-14.md`,
  `chart-phase2-spec-2026-10-14.md` §4). (c) Bar, Donut, Radial, Heatmap and Multi-Line draw their own Surface/Default
  card, so they cannot take Card Theme / Color like the card-less new charts: align them? (d) Beside a taller LineChart
  card (Grid stretch) BarList's 5 rows sit ~72px apart: hug at the top, or fill as now? (`docs/research/studio-vibe-agent-2026-10-18.md` §7)
- **P2 · Direct paste (⌘V on the canvas), what is left (merged 2026-10-23 from the 2026-10-17 P2 and P3):** it binds by
  node id, so only the Zen file takes it; other files need the published library and full component definitions in the
  paste (instances by `componentKey`, as Figma's own copies carry). The frame menu's Copy for Figma writes async
  (Chromium rewrites the html, only the plugin reads it). Parity left after native-diff: slot contents written at
  Figma's outer level, grid row minimum heights, kept overrides by resolved variable, and a smaller pack (23 MB on
  2026-10-23). Pictures go since 2026-10-19 (F8c), a frame's whole look since #177. Pointer:
  `docs/research/studio-native-paste-2026-10-17.md` §6, §7c, §8.
- **P3 · AppShell phone bars in Figma (2026-10-23, B; found by AppShell, needs the user's OK):** figma-push draws a
  phone frame's top and bottom bars only from the builder Screen's own `topNavigation` / `bottomNavigation`. An
  AppShell's own phone bars are named in the push notes and not drawn: a root AppShell on a phone Screen keeps only its
  content, as the runtime shows it, and an AppShell inside a page draws only its desktop parts. Drawing them (Figma
  Pattern/AppShell/Mobile, its Bar type by canvas: default→Alt, alt→Default, flat→Default on Surface/Flat) is new scope.
  Pointer: `tools/studio/figma-push.mjs` `appShellNode` (~852) and the Screen's mobile chrome (~2232).
- **P2 · Figma library gaps the 438-page Studio → Figma test found (2026-10-18, questions for the designer):** (a)
  Accordion/Text has no content slot, so an open Accordion's content cannot be drawn (the push notes it); (b) Dock-Icon
  has Theme=Emoji only at Medium and Large (the HR templates use XSmall in table cells: the default variant shows);
  (c) Chat/Section/Read-List Seen by=5+ holds four Avatars after "+N" where Chat.tsx draws five (the push writes four).
  Pointer: session log 2026-10-17 "Studio → Figma test run", figma-push.mjs chatMessageNode.
- **P2 · Studio push of Line, Bar, Area, Grouped and Combo charts draws Figma's sample data (user, 2026-10-13: "sync lại
  component của figma lẫn studio"; re-checked 2026-10-23):** the push picks each chart's Sector (4 / 6 / 7 / 12) by the
  point count since 2026-10-17, and Stack-Bar and Donut draw the page's data (`stackBarMarks`, `donutMarks` in
  `tools/studio/figma-charts.mjs`). Left, once the user confirms the scope: X labels, the six Y ticks and the active
  tooltip for Line, Bar, Area, Grouped and Combo (the pull takes the matching palette sample's data).
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
- **P3 · Update from Figma in another browser (2026-10-13, P6b leftover):** a pull in a browser that kept no export
  falls back to a two-way comparison. Pointer: `docs/research/studio-figma-push-spec-2026-10-12.md` §8 "P6b".
- **P3 · Figma contract suites still to write (2026-10-23; captures done the same day):** the 14 chart sets and
  Chart/Chart-Card now have contracts (`docs/figma-contracts/chart-*.json`, read 2026-10-23) and avatar-single,
  chat-bubbles, input-search-primitives, table-cells, datepicker-sidebar, input-search and
  segmented-toggle-badge-avatarstack were re-read whole; only Input/Heading and the Segmented sets have a parity suite,
  so a later Figma edit to the others is still not caught. A suite per set (`tools/figma-contract/suites`, README
  "Writing a suite") needs a browser slot each and the user's go (new harness work).
- **P3 · Designer question: Side-Bar/Master/Small-Density is named "Component" in Figma (2026-10-23, contract re-read):**
  the set 5974:20590 on ❖ Sidebar (key 1cca393d…, Expand Yes/No) lost its name; no other set has it. The push imports
  it by key (library-keys.json) so it still lands, but a pull or a component-properties re-capture matches sets by
  name (`tools/studio/figma-props.map.mjs` Sidebar `Side-Bar/Master/Small-Density`). Rename it back in Figma, or say
  it is retired.
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
- **P2 · Figma usability — a photo file dropped from the desktop on a repo page (2026-10-10):** uploads live in this
  browser (IndexedDB), so example and template code cannot read them; a drop there needs the dev server to save the file
  under `src/assets/media/` (POST route + `MEDIA_REPO_FILES` refresh). On pages you made it works today.
- **P2 · Figma: Android system bars (user, 2026-10-10):** the Studio's Android Screens draw a Material 3 status bar
  (24) and gesture handle (108 × 4, 10 from the bottom) with dummy icons (builder/proto/DeviceBars.tsx); the Zen file's
  ⚙️ Operation Components has only Status-bar/IOS/Mobile, /Tablet and System/Bottom-Indicator. Designer: add
  Status-bar/Android/Mobile (+ Tablet) and an Android navigation bar there; then the code follows those nodes.

- **Questions for the designer and decisions for the user** are collected in [`QUESTIONS.md`](QUESTIONS.md) (moved
  there 2026-10-08). Code keeps its current behaviour until each is answered.
- **P3 · Zen-High-Contrast in the native packages (2026-10-05):** Global Colors carries the Zen-High-Contrast mode since
  the export "Zen-Variables 2" (it equals the algorithm on all 960 values; tokens:check verifies it). The native packages
  carry the second mode as data (resolver default Zen); mapping it to iOS accessibilityContrast / Flutter highContrast is
  still open. Pointer: `platforms/README.md`.

- **Code view in other languages — on hold (user, 2026-10-08: "tạm lưu backlog, sẽ làm giai đoạn sau"):** order chosen:
  HTML/CSS → Vue → Swift → Flutter → Svelte. Plan `docs/research/code-languages-plan-2026-10-03.md`, phases P1–P9, each
  approved on its own. Still to answer when it starts: web strategy (§8.1; proposed A, native Vue/Svelte on the shared
  CSS), the dropdown meanwhile (§8.4; proposed: all six with honest states), example snippets as the render's source
  (§8.3; proposed). Examples get every language too (user, 2026-10-03). Nothing built.
- **P3 · Studio UX polish N1–N11 — deferred by the user 2026-10-08 ("để sau"):** `docs/research/studio-ux-audit-2026-10-04.md`.
  Written before the UI3 shell (#63) and F0–F10, so re-check each note in the Studio UI design check (next phase).

## Backlog (plan before opening sessions)
- **P2 · LICENSE.md is a draft: legal review before selling (2026-10-08):** drafted on PR #5 (Dizai Studio, Vietnam law, subscription, apps-not-kits, per company + member limit); a lawyer must review it and remove its "Draft" note. Was: package.json has no `license` field and the repo no
  LICENSE/EULA; needed before selling (legal text from the user).
- **P2 · Private registry Phases 3–6 (2026-10-08, plan agreed in chat):** Phase 3 kit ready (`tools/registry/deploy/`,
  README "Deploy"); the user creates the VPS, DNS `npm.dizai.studio`, R2 bucket + `backup.env`, runs `deploy.sh`, adds
  an uptime check, and tries one real `npm login`. Phase 4 (rename + release workflow) done 2026-10-08; the user sets
  `ZEN_REGISTRY_PUBLISH_KEY` and deprecates the public npmjs `@zen-ds/*` packages. Then Phase 5 docs, Phase 6 payment webhook.
- **P3 · Private registry: flag shared license keys (2026-10-08):** log installs per license (IP, version) and warn when
  one key is used far beyond its `seats`. Pointer: `tools/registry/plugins/verdaccio-zen-license/index.js`.
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
- **P2 · Builder: Inspector Frames list keeps the previous local page's frames (2026-10-06, seen during GĐ2 M2):**
  open page A then page B (both new pages, Screen id `screen-1`): the Page panel's Frames shows A's title. Likely the
  frame registry keys `screen:screen-1` without the page. Pointer: `builder/BuilderBoard.tsx` frame ids,
  `inspector/PagePanel.tsx` Frames.
- **P3 · Studio E2E I-11 is flaky too (2026-10-07, seen during GĐ3 M3):** "timed out after 20 s" once with
  `--no-retry` right after the library group; 2/2 alone. Pointer: `tools/studio/e2e/scenarios/inspector.mjs` I-11.
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
