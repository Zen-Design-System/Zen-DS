# Session log 2026-10-12

## Core-rebuild plan leftovers: dashboard walk, design words, Figma Actions column, AiChatBubble layers (session "Kiểm tra tiến độ plan", branch zen/feat/studio-design-words, tier M)

- User approved items 1–5 of the plan's remainder; merged PR #21 (Chip layer names) at the user's request after CI
  passed (7c99cfe). Work in worktree `Zen-CodeBase/Zen-DS-words` from that main.
- **Dashboard walk rerun (criterion of M4):** the 2026-10-10 script (`dash-walk3.mjs`) on the E2E harness server:
  27/27 steps, no refusal (19 operations + sub-steps). The earlier "?" rows were the script's: the multi-selection now
  reads "3 layers" (was "×3"), and three cards with one label hid the drag / → reorder; with distinct labels both work.
- **Criterion 7, design words on Studio pages:** `src/platform/studio/words.ts` (`designWords`, `codeWordsIn`, glossary:
  layer, layers inside, property, list, From data: person › photo, set in code, shared properties, id) and
  `useWords.ts` (`useWords`/`speak`/`useStudioPage`: on only while `state.localPage`). Applied where a designer reads:
  the Inspector status line (text + details), `InspectorRow` hints and label tooltips, section notes, the ƒ bound mark,
  bound values ("data: person › theme"), value kinds (Action, List, Group of values), sizing tooltips, part / slot /
  selection / object / table-cell notes, insert-picker warnings. File:line: the canvas tag, Layers tooltips and the
  multi-selection list show none (`picker.ts srcMeta`); the Inspector header and the part/cell code links read "Show
  code"; the Code tab keeps the highlighted lines. Example and template pages keep the developer wording (and the
  selftests that pin it). `words.selftest.mjs` (in studio:selftest): 22 rewrites + every message the engine and the
  Studio write (487, read with Babel) come out with no code words. E2E B-35 (new): status, tag, header, notes and 5
  tooltips clean after an insert, ⌘D and a refusal.
- **Figma Actions column (M6 leftover):** Table `content: "actions"` + column `actions` (`TableRowAction`), drawn by
  `RowActions` as Figma's Actions-Cell (IconButton flat, Medium Primary default, nested layer `Button`, aria-label via
  new label key `rowAction` en/vi; not editable in place). figma-pull: Actions-Cell → that column from the first row's
  buttons (name from the icon: chevron → Open, dots → More actions, edit, trash…); a row's own icon/size/level → its
  override `Row[row-N]/actions/Button`. Studio cell Content lists Actions (starts with Figma's dots-vertical button).
  figma-pull selftest 48 (+1), NO-21 now 6 columns and 9 "Open, row N" buttons; Vitest nested-overrides +2.
- **AiChatBubble:** `overrides` prop; actions are `nest("Button", …, index)` inside each Tooltip (its handlers sit on
  the anchor span, so the layer between keeps the tooltip: Vitest checks focus → tooltip "Like" + aria-describedby);
  children through `nest.slot`.
- Docs: guideline Table (Cell content, row actions), docs/api regenerated (table, ai-chat, provider labels),
  compile-api.generated.mjs.

## Design words everywhere; Date field's Leading-Icon read in Figma (session "Kiểm tra tiến độ plan", branch zen/feat/design-words-everywhere, tier M)

- PR #22 merged (9207125) after CI. User: "trong figma không thấy chỗ nào để leading-icon"; design words on example and
  template pages too: OK; Q4 and Q5: OK.
- Date field, read live (`use_figma`, read-only, `skipInvisibleInstanceChildren = false`): `Field › Container ›
  Leading` (hidden) and `Trailing` (the calendar; its own icon layer is the Leading-Trailing primitive's `Leading-Icon`).
  The M7 note "Figma names it Leading-Icon" was a misread: the code's `Leading`/`Trailing` match; nested-paths' DateField
  reason now says hidden (like the other fields); the designer item left BACKLOG.
- `useWords` / `speak` always speak design words; words.ts keeps a repo file's name and drops its line (`LINE_REF`), drops a
  Studio page's file (`PAGE_REF`). Inspector header, part and cell links read "Show code" everywhere (copy-location stays
  for repo files); canvas tag, Layers tooltips, multi-selection list and slot rows show no line; nested shared label
  names the file. `data-inspector-src` on the Inspector header: E2E `waitInspector` reads it (was the "file:line" text).
  E2E I-31 (new): an edit on the uploader example — status "Draft · uploader.tsx · ⌘S to save", tag "Button", header
  "Show code", tooltips clean.

## Figma push P0 (Q4) (session "Kiểm tra tiến độ plan", branch zen/feat/figma-push, tier M)

- Spec `docs/research/studio-figma-push-spec-2026-10-12.md`; the user chose the Zen plugin, Import free / rebind
  licensed, the plugin folder in local git. P0 (repo only): `figma-push.mjs` `figmaFromPage` (the inverse of
  `pageFromFigma`, same JSON), `figma-steps.mjs` (shared steps), `nested-layers-build.mjs` → `nestedLayers.generated.ts`
  (nested-paths now records each nest() layer's component), `figma-push-cli.mjs`. Selftest 18 (round trips); both in
  studio:selftest. P2 items are noted on push (Overviews: Sidebar / DashboardHeader slots, absolute layers).

## Figma push P1: plugin Import from Studio + Studio Export › Figma (session "Kiểm tra tiến độ plan", tier L)

- Plugin (~/Documents/zen-ds-figma-plugin-main, not a repo before): tarball backup, `git init` local (user's choice),
  .gitignore skips backups/ dist/ dist-web/; snapshot 9daf48a, feature 53d42d2 (studio-import.js, code.js handler, UI
  Import › Import from Studio, tests/studio-import.test.js, bundle-behavior stub). The Age of Emerald session works in
  the same folder (docs/luc-thach-3d, src/ui/emerald-*, tests, ios): told, nothing of theirs touched.
- Studio: Export › Figma (figmaExport.ts), figma-map.mjs split from figma-pull (isomorphic), figmaPackage + stable keys
  (page doc printed with ids; CLI counts), .d.mts for figma-map / figma-push, E2E HO-09 (first id HO-08 was taken).
- Read-only check against the live file (use_figma): sets, property names, Spacing variables, text styles, icons all
  present; found Sidebar writing other sets' properties → fixed (write only the chosen set's, selftest 21).

## Figma push P2–P4 (Q4 rest, Q5) (session "Kiểm tra tiến độ plan", the user: "tiếp xong hết tôi thử 1 lần")

- P2 figma-push: data slots, node slots, SidebarMenuItem / AppShellAction, Dashboard header texts + Search, Table as
  Figma's Data-Rows and cells, absolute layers, pictures; keys for generated layers. Plugin 3b984fc: textList / texts
  (nested too), swapIcon, image, fixedWidth, absolute, slots replace their sample content. Two read-only checks of the
  live file: sets / properties / slots / text layers all present; a media cell's label is in its nested Text-Cell
  (fixed: the push writes it there, not on the cell). Overviews and Table pages push with no notes.
- P3 binding-diff.mjs + Figma bindings dialog (Main component), GET /binding-diff (read only: the token header
  `call()` does not send was refused first — E2E MC-08 caught it, also a cold-start timeout: timeout 40 s).
- P4 rebind.mjs in the save's Figma check job, ParityDialog Download for Figma, plugin 173e97f rebind (licensed).
- Selftests: figma-push 36, binding-diff 8, rebind 5 (all in studio:selftest); plugin npm test green; dist rebuilt
  (backups/pre-studio-rebind-dist-20261012.tgz before).

## Nested layer names for every component (session "Kiểm tra tiến độ plan", branch zen/feat/figma-contracts, tier M)

- PR #24 merged (f5b4b52); the shared checkout Zen-DS switched to main (fast-forward; Giám sát told).
- Full contracts for the 29 sets without one are not practical through use_figma (20 KB answers, 0.7–2 MB contracts):
  what the gate needs is each set's layer names. Four read-only use_figma calls (37 sets, hidden layers included) →
  `docs/figma-contracts/nested-layers.json`; nested-paths reads it for sets without a full contract and for layers a
  full one dropped. Re-read: `tools/figma-contract/nested-layers-read.mjs code | merge`.
- Result: Input's hidden Leading / Trailing now checked (4 ALLOWED entries gone; Text-Area has none in Figma); 44/44
  components match after renaming code layers to Figma's (Tab-Item, File-Item) and allowing the rest with reasons (unnamed instances, glyph-named
  icons, layers Figma does not draw); designer item in BACKLOG.
- User review of PR #25: Action → CTA, Actions → Buttons and Primary → CTA were wrong and are reverted. Action is its own
  component with its own tokens (mobile/tablet) and never becomes a Button name; a button layer is named by its level.
  My mistake (read read-only in Figma afterwards): Empty-State's CTA is the wrapper (.Empty-State/CTAs) of two unnamed
  Button/Main (Primary, Tertiary), not the primary button; Dialog / Side-Panel do have an Actions frame (Buttons is the
  .Primitives/Modal/Actions instance inside it). Zen's names are kept and allowed with reasons; the Figma side is in
  the BACKLOG designer item. Second review: `Leading` is the wrapper that holds an icon or any other element
  (InlineMessage's and Toast's `icon` take a node; Inline-Message Custom is a Visual slot), so Leading → Icon is
  reverted too; an inline component's own buttons are its `Action` (not the top navigation's); ChatComposer keeps
  `Send` (Figma's `Main` is a Button appearance's name). Lesson: a layer-name gate is matched by asking which side follows the principle, not by
  renaming code to Figma.
- Found and fixed: contracts.lock.json was stale on main (10 sets: the 2026-10-09 re-captures and DashboardHeader never
  refreshed it), so figma-kit's selftest failed; `figma-call.mjs lock` → 13/13.
- Gate (isolated): passed; 12 contact sheets looked at, no visual change (the renames are override keys). Its
  `deadclick` warn on uploader "Retry desert-trail-lookbook.jpg" (also on main, about 3 runs in 4 in the gate's page
  order) was the probe, not the app: the previous card's failed submit focuses and scrolls to its invalid field a few
  frames later (`focusFirstInvalidField`), the page moved 88px after `pointAt` measured, and the click landed on the
  photo. Fixed at its owner: `behaviour.mjs` checks the point still hits the button (`B.hits`) and measures again.

## Studio → Figma: app pages imported as an empty frame; coverage audit; P1 (tier S/M)

- User: Studio export of Dashboard / Admin list imports into Figma as an empty frame. Both `.figma.json` in Downloads
  already had `children: []`: `figmaFromPage` dropped any component without a Figma set with its whole subtree, and
  AppShell (no set) wraps the page.
- User then asked whether examples, templates and AppShell are really built from Studio components matching Figma.
  Static audit (numbers, groups, plan): `docs/research/studio-figma-push-spec-2026-10-12.md` §8. Short: examples 71%,
  templates 76%, AppShell 23% Figma-placeable; 38% / 58% of Figma components sat inside a code-only wrapper; 12/15
  templates in AppShell. User approved P1 → P4 in order; session "Kiểm tra tiến độ plan" estimated 7–10 days.
- P1 done (`tools/studio/figma-push.mjs`): wrappers → frames of their layers (named by Zen), Heading → text, Menu →
  trigger, AppShellAccount → Avatar, PageHeader → Dashboard header Main, AppShell → Sidebar + Column (Dashboard header
  Navigation top bar, Sections, Main), Screen chrome (Sidebar / Page header, Top / Bottom navigation), every Screen
  layer. Fixed on the way: Dashboard header toggles false with a filled slot, Sidebar children in Header-Content and no
  Select=Yes, root key equal to its child's, overlays noted as "only the first Screen", repeated notes; Export › Figma
  refuses a page with nothing to place. Export dialog copy "Not placed yet" → "Notes".
- Checks: figma-push selftest 36 → 52; E2E HO-10; the plugin's importer (its test mock) places the Dashboard package
  without errors (no plugin change). Dashboard 1 → 125 layers, Admin list 1 → 158.
- Left for P3: charts (no sets captured), MetricCard trend/action, ListItem leading, ListBox header.
- Not done: the user's try in Figma with the new export (Download again from Studio › Export › Figma).

## P2: AppShell rebuilt on Figma's parts; app frames pulled back as AppShell (tier L)

- Worktree `Zen-DS-appshell`, branch `zen/feat/appshell-figma` on top of the P1 branch (PR #26), so the shared main
  checkout and :5173 stay as they are. Own dev server :5187 (`.claude/launch.json` zen-appshell-worktree-5187).
- AppShell's top bar renders `DashboardHeader type="navigation"` (leading = toggle + header, center, trailing); the
  `<header>` stays the sticky padded shell. Without a centre the leading content keeps taking the rest (as before);
  stacking and its measure unchanged (row gap read from the bar). Studio slot selectors moved to the bar's slots;
  palette selftest reads DashboardHeader's files for AppShell; Center-Slots gap "own".
- visual-diff before/after (app-shell, sidebar, breadcrumbs, dashboard-header, alert-banner, visually-hidden,
  page-header; 1512 + 390): 93/94 identical. The changed one is a fix: at 390 the centred Search ran under the bell.
- figma-pull: `appShellElement` (Master-Layout and the push's frames → AppShell), `screenChrome` (the push's Screen
  frame → Screen sidebar/header), Type=Main title from `text`/`texts` when no Header-Text slot; the root Stack around
  a lone AppShell is dropped. The live Overviews fixture now pulls as an AppShell (3 checks rewritten, 1 dropped).
- Checks: pull 47, push 57 (round trips), Studio self-tests, Vitest smoke + AppShell 177, tsc, guidelines rebuilt.
- Gate run 1 failed on E2E NO-19 ("the Sidebar is 540 px tall in a 686 px row"): the pulled Overviews is now an
  AppShell, and an AppShell on a Studio Screen was as tall as the browser window (sticky 100dvh), shorter than the page
  (the user's Dashboard page too). Fixed in `builder.css` (AppShell fills the Screen; Sidebar / aside height auto).
  NO-18/19/20 + HO-10 rerun: works; HO-10 added to the E2E baseline (P1 had left it out).
- User answers: open the P2 PR ("OK"); top bar "Theo figma": 72px (Margin-Comfortable above and at the sides,
  Padding/XSmall below, as the Master-Layout's Navigation row; the 2026-10-09 change to 12/12 reverted, the templates'
  paddingY sm kept: PageHeader 8 + 12 below the bar, as Figma's Main row). Push draws the Header frame the same.

## Clip content on every frame, as in Figma (tier S/M)

- User: Figma still clips (cuts shadows) where the Studio does not; "nên thêm bật tắt clipping trong studio … giống
  figma". Cause: the Zen plugin never set clipsContent, and createFrame clips by default.
- Session "Lỗi UI" (holding the push and plugin files): studio-import.js sets clipsContent = spec.clip === true on
  every frame build (the page frame keeps clipping); figma-push frameNode writes clip for any frame with `clip`.
- Here (branch zen/feat/studio-clip-content, on top of P2): Stack and Grid take `clip` like Box (data-clip,
  effects.css `:is(.zen-box, .zen-stack, .zen-grid)[data-clip="true"] { overflow: clip }`); the Studio's Clip content
  checkbox shows for Stack, Grid and Box (propSchema isLayoutProp, LayoutSection); figma-pull reads clipsContent
  (figmaReadCode, not on the page frame) into `clip`. Docs rebuilt.
- Checks: effects selftest 64, pull selftest 49, Studio self-tests, E2E L-10 + new L-12 (baseline), tsc.

## Export / import test: nested variants in slots; the design copy's Table cells (tier S/M)

- Re-imported the Dashboard into the live file (my frame 15276:1842 on "Studio exports — QA", the stashed importer of
  session "Lỗi UI"; their frames untouched): 129 layers, no notes. Measured the fit grids: 592 / 544 vs the Studio's
  568 / 568 → proposal (width passed down, n = ⌊(W+gap)/(min+gap)⌋, a GRID of equal columns), done by "Lỗi UI",
  re-measured 568 / 568 on their 15279:3.
- User: "nhiều lỗi variant nested trong slot dùng sai". Read-only audit (slot children vs the master's slot content,
  330 checked): differences legit except AppShellAccount's Avatar (Solid; code draws background="subtle"). Admin list /
  HR Home vs the Studio sheets: avatars as Figma's placeholder, badges as words, no checkbox / menu columns, sort arrows,
  AI field's model picker, HR Home's hero missing. Push-side items sent to "Lỗi UI" (push held by other sessions).
- Root of the table ones: snapshot.ts cellsAsText kept a cell's Avatar only with a photo and joined the rest into text.
  Rewritten (readCell): TableMedia → avatar / photo / icon / dock-icon column (+ caption, bold, `<id>Photo|Icon`,
  `Row[id]/<col>/Avatar|Dock-Icon` looks), TableBadges / TableTags → badge / tag (+ `…/Badge` theme, background, dot),
  TableActions → actions (icon + name without the row), TableText → text + caption. E2E SP-12 (Admin list → design
  copy: avatar column, badges with colour and dot, actions, "AM" on the canvas); SP-01, NO-17 still pass.
- After "Lỗi UI" re-exported Admin list (15301:3, matches the sheet): the page's own initials (BH, where Table's
  initialsOf gives BN) as the Avatar override's `children`; VisuallyHidden text left out of a cell's words.
- Also committed "Lỗi UI"'s finished export work (user OK): plugin 2d222ab (index only, "Kết nối file Figma
  Pokeslide"'s Table last-row hunks left uncommitted at their request) and PR #26's branch (their hunks stripped).

## Studio → Figma: the Dashboard tried in the live Zen file, then fixed (session "Lỗi UI", tier M)

- User: the imported Dashboard was broken (metrics stacked with "Metric Title / $1,680.68", table cells overlapping,
  huge Avatars, Button/Label/Title/Caption defaults) and asked for the feature to be tested, not only the mock.
- Test bed: the plugin's own `createStudioImporter` run through the Figma MCP (`use_figma`, ~46 KB per call: esbuild-
  minified importer + the package) in the Zen file 9nZv4uW2LT21yuHabMTCh1, on a page "Studio exports — QA" (left there
  with the final frame 15258:3 for the user to look at; delete it when done). The user's own import was in another
  file whose components differ (the same package placed far better in the Zen file): file to be named by the user.
- Causes found by the live run: the root frame's height clipped (`resize()` fixes both axes); Grid columns written as
  null for `repeat(auto-fit, …)` and Figma's grid starting as 2 × 2 Flex rows in a 100 px frame (cells overlapping);
  MetricCard label/value/trend/icon/action, ListItem title/caption/leading, ListBox header, ChartCard never written;
  Card's ⋮ Sub-Action on by default; List-Box Header/Footer are Yes/No variants; `icon-chevron-right-line` is
  `…-medium` in Figma (icons/generated/aliases.ts); hiding a layer before filling slots made its slot unreachable
  (skipInvisibleInstanceChildren) and the importer then emptied the first slot (the Sidebar brand vanished).
- Fixed, push (`figma-push.mjs`): fit columns → wrapping row, Fill + minWidth, row gap, cards Fill height (frames hug);
  N columns → GRID with rows and sizes; MetricCard / ChartCard → Card (no Sub-Action) around Metric-Inline / Chart
  (Line, Stack-Bar; texts, Segmented items from `ranges`, hidden parts); ListItem texts + leading Avatar/Dock Icon
  swap; ListBox header/footer and Sidebar brand framed in their slot; Sidebar without footer; AppShell Canvas fill;
  Text default style + tone variable; Search placeholder; Chip leading icon; icon cuts. Pull: Body/Base/Regular left
  out, a wrap of fill+minWidth cells reads back as Grid minColumnWidth.
- Fixed, plugin (`~/Documents/zen-ds-figma-plugin-main/src/plugin/studio-import.js`): root hugs its height; GRID rows
  Hug and sizes; wrap row gap bound; minWidth; colour fills by variable (text and frame); Yes/No variant from a
  boolean; nested `set` swap and `swapIcon`; `hide` after slots; a named slot never falls back to another of several;
  an INSTANCE_SWAP equal to the current icon skipped. dist rebuilt (backup `backups/pre-studio-dashboard-20261012-2044-dist.tgz`).
- Checks: live import of the Dashboard export with no notes, compared with the template at 1440 (screens in the
  report); figma-push selftest 52 → 67 (section 9, Dashboard parts, Grid round trip); figma-pull 48, figma-diff,
  parity, engine-iso, slots pass; plugin `npm test` passes (studio-import section 6 with invisible-children skipping);
  the Studio's own `exportFigma` in the browser gives 130 layers.
- Left: chart data is Figma's sample (titles and ranges are the page's); `rangesFullWidth={false}` still draws a full
  Segmented track; Overlays and Chip popovers are not pushed.

### Same session, later: every template imported live (user: "test nhiều case và nhiều thiết kế hơn"; "lỗi header sidebar")

- Live in the QA page, one template per `use_figma` call (three at once timed out), packages squeezed (repeated
  substrings → `~Xy` tokens, quotes → `^`) and the stashed importer patched at run time for new fields. Frames:
  Dashboard 15279:3, Invoice 15280:3, HR Home 15287:3, Admin list 15290:3, plus earlier mobile detail/list, Sign in,
  Settings.
- Fixed, push: chart Segmented takes its Level/Size and hugs (`rangesFullWidth`); Sidebar brand kept in one frame;
  forms (fields' Label/Text/Message, Toggle, FileUpload, Divider in a row, fillChildren, Text in a column fills, clip,
  maxWidth); DescriptionList / Tabs / vertical Stepper items; ListItem trailing + custom contents; InlineMessage
  texts/action and Close only with `onClose`; Breadcrumbs Dash + Level; fit grids counted for the width each frame
  fills (Screen, AppShell less the Sidebar 240 or rail 84, Container gutter + maxWidth, tracks) → even GRID, cells keep
  minW (peer "Studio export/import Figma frame" measured 592/544 vs 568/568); collapsed Sidebar → rail (Expand=No,
  rows `hugLayers` Element, mark in header, Divider between groups); ListBox `hugLayers` Container-Slot + Body-Slot
  hugH; full-width Segmented slot fillW. Pull: GRID cells' minWidth → minColumnWidth; rail → `collapsed` with labels
  (layer names) and group titles (frame names), Divider rows skipped.
- Fixed, plugin: slot hugH / fillW, `hugLayers` [{ name, w, h }] after the slots (tests + dist rebuilt; the peer
  a493ce's strokeBottom change is in the same file).
- Checks: figma-push selftest 67 → 101 (sections 10–11: forms, widths, rail, round trips), figma-pull 48, figma-diff,
  parity, binding-diff; plugin `npm test`; every frame measured in Figma (Dashboard 568/568, 4 × 276).
- Then fixed (after a493ce released the file; user: "button more action đang dùng sai variant"; peer bd6bd7's
  comparison with the Studio sheets): IconButton without a level gets Button.tsx's resolved Level (Main Tertiary, Flat
  Primary, Overlay Accent; the Invoice ⋯ was Figma's Primary) and the pull leaves it out; `minmax(0, Npx)` tracks are
  Fixed N; `selectable` → a 48px checkbox column (header Type=Checkbox + Control-Cell, `edge` kept), `sort` → the
  sorted header's arrow glyph, both read back as props; avatar cells draw their Avatar (size by caption, Subtle,
  initials or photo, the row's override; pull: TABLE_DRAWS Avatar); Form gap lg; AppShellAccount Subtle; AiChatBlock
  → Figma's AI/Chat-Block/Pale (greeting, Chip/Normal suggestions, its field by layer key "AI" with Style/placeholder/
  Model, centred ≤ 800) and back; AiChatField Model only with `model`. An array cell value stays "" (Table.tsx textOf
  renders nothing too). The sort glyph is the header's Icon layer itself: swapped by component (nested `set`, cut
  name). Live: Invoice 15295:3, HR Home 15299:3, Admin list 15301:3 (re-made after peer bd6bd7's snapshot.ts fix:
  avatars, badges, actions, checkbox column, sorted arrow as in the Studio); then 15303:283 with an avatar override's
  own initials (`children`: Bich Ngoc Ha → BH, read back as that row's override) and "—" for an unsigned member.
  push selftest 118, pull 51. The QA pages made in the pane browser's Studio were moved to its trash.
- Left (data, not push): several Studio template pages hold flattened data (Admin list rows 2–10 "name · email" on
  one line, empty-state rows with no fields, booleans in cells); TopNavigation, Thumbnail, ActionBar have no Figma
  set; Sidebar search not drawn; Description List set has a duplicate variant in Figma (designer).

## Table: no last-row rule inside a surface (session a493ce, tier S)
- User rule: rows of a table inside a box/card/accordion/container end without a bottom stroke; applied back to Studio
  and the Platform. `table.css`: one `:is(<surfaces>) … tbody > tr:last-child > :is(cell, empty)` rule (Card,
  ChartCard, MetricCard, Accordion panel, SidePanel, Dialog, ModalForm, BottomSheet, Popover, ListBox, Box with
  data-surface/data-border); page tables keep it. Table guideline `do` line added (guidelines rebuilt).
- Verified on a private :5174 server: synthetic tables in each surface → last row 0px, plain Box and canvas → 1px.
  `npm run qa -- --isolated --files=…` PASS (53 browser tests, audits, dark, behaviour); table contact sheets reviewed.
- Figma push mirror (user: do it now, no backlog): plugin `studio-import.js` gained `applyStrokeBottom` (`strokeBottom`
  on an INSTANCE or FRAME sets only strokeBottomWeight, the paint stays bound; a reused instance without it gets its
  component's weight back) + a studio-import test (2 rows → last 0; re-import with 3 → middle back to 1); plugin
  `npm test` passes, dist rebuilt (backup `backups/pre-strokebottom-dist-*.tgz`). `figma-push.mjs` (after "Lỗi UI" released it):
  `SURFACES` + a `surface` flag in convert's context (frameNode: passed down or a Box with surface/border; instanceNode
  slots of a surface; wrapperNode for an unmapped surface) → tableNode's last row cells `strokeBottom: 0`; selftest §13
  (page table / Card / bordered Box / plain Box), 105 checks pass.
- Corrections to the earlier Figma library findings: Pagination's light previous arrow is its Disabled state (Inline,
  Manually) — not a bug; Table/Cell/Header's Title (All-Caps/S, 16px line) sits in a 12px fixed Wrapper → 2px over
  top and bottom in all 8 variants (invisible, no clip); the Edit cell's 62px was the row's caption height, not the cell; its text colour follows the nested Input-Content state (Typing = Strongest for a cell with a value, user) — no library gap. Figma's Edit field is left-aligned while code right-aligns number editors (table/editor-number-right): the user keeps the code and the designer updates Figma.

## UI Foundations deck — Figma rebuild in the typed-document concept (no library change)

- Took over from the session "UI Foundations Figma review" (branch `claude/eloquent-ptolemy-lhe433`): SG85 fonts,
  `docs/research/ui-foundations-deck/` (outline, now 5 parts · 17 lessons · 116 pages; approved concept; HANDOFF.md).
- The Figma MCP cannot load SG85 Chi Son 2, SG85 Saigon 1985 or Fz Bohemian Typewriter (server-side fonts, Pro plan,
  SVG text falls back to Inter). User chose to build in Figma with stand-ins behind `Typed/*` text styles and swap the
  families on desktop: Paytone One (rounded, user's pick over Anton), Kalam Bold, Courier Prime.
- Figma file `WxivIlv1HgC9NEMwtw9MOS`, page 727:2: `_Template · Typed` components, `UIF Deck` variables, sections
  `00 · Opening` (pp. 1–2) and `Lesson 01 · The UI craft` (pp. 3–9) with Vietnamese keynote cards; the newspaper
  version archived at y = 40000. Overflow/overlap audit clean. Node ids and anatomy in the deck HANDOFF.md.
- Repo: `.claude/settings.json` allows `mcp__Figma` (asks for `generate_image`) and two read-only session lookups.
  The Bohemian TTF stays out of git (non-commercial licence, public repo).
- 2026-10-13: keynotes for pages 1–9 rewritten as detailed teaching scripts (goal, script with a running example,
  common mistakes, timed activity, class questions, transition); cards 1040 wide, slides re-spaced to 3200, rows to
  2600. Structure recorded in the deck HANDOFF.md.
- 2026-10-13: real images for the platform-guideline pages (user: "Các ảnh về platform guidelines của Apple và
  Material nên dùng ảnh thật"): 034 (Material window size classes, Android docs), 057 (Material 3 dialogs, HIG Liquid
  Glass), 058 (HIG Accessibility spacing do/don't, Android 48 dp targets), 059 (iPhone tab bar, iPad sidebar, Material
  navigation bar and rail). New `images` builder and `knSet` keynote editor in `deck-lib.js` (stored copy patch4).
  058 point 1 corrected to the HIG table: 44 × 44 pt default, 28 × 28 pt minimum. Sources and licences in
  `figma/real-images.md`; the image files stay out of git.
