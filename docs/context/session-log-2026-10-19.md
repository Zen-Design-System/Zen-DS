# Session log 2026-10-19

## Studio frames, presets, sections — F4 (Session C of the parity plan; user: "chia session làm có nhanh hơn không?" → "ok") — tier M, worktree `.claude/worktrees/compassionate-hertz-fda2db`, branch `zen/feat/studio-f4-frames-20261019`

Plan `docs/research/studio-figma-design-parity-2026-10-18.md` §5 F4, built on the AppShell session's frame picker and
device simulator (#134) and on F1 (#139).
- **User's answers (2026-10-19):** the Frame tool behaves as Figma's ("Như Figma": a click makes a 100 × 100 frame at
  once, the presets live in the right panel; the click menu of 2026-10-18 is gone) and the presets are Figma's whole
  list ("Đủ nhóm Figma": Phone, Tablet, Desktop, Presentation, Watch, Paper, Social media; Zen's devices first in their
  group, a Zen device that shares a Figma name takes Figma's name of its size: Desktop 1512 × 982 = MacBook Pro 14").
- **Presets:** `screen-devices.mjs FRAME_PRESET_GROUPS`; `builder/FramePresets.tsx` (Disclosure groups, the Inspector's
  Design tab while the Frame tool is on); a preset frame goes beside the selected frame, else right of the right-most
  frame (top-aligned), else in the middle of the view (`frameMove.placeInView`), then into view (`revealFrame`). Drawn
  and sized frames are named "Frame N" (the Prototype panel's Add screen keeps "Screen N").
- **Resize and fields:** `board/FrameHandles.tsx` (8 handles on a selected Screen or Section of a page you made, ⇧
  ratio, ⌥ from the center, ⌘ no snapping, live size pill, Esc; only the changed fields are written, one edit) and
  `builder/FrameGeometry.tsx` (Position X / Y, Layout W / H with Figma's number fields; an Overlay's W / H read only),
  both writing through `frameEdit.setFrameBoxes`. The view-only Width (Inspector › Frame, the toolbar's width menu, the
  right-edge drag) stays for example frames only. A Screen's H is the least it takes (content may keep it taller).
- **Sections (decision: beside the frames, not around them):** `<Section id title x y width height />` is a Board
  child (dialect `SECTION_SIZE`, `boardSections`, `sectionCode`; runtime `Section` renders nothing outside the Studio),
  drawn first (behind) by `builder/SectionFrame.tsx` as a frame of kind "section" (`data-studio-frame="section:<id>"`),
  so selection, Delete, ⇧2 and the name label come from the frame code. What a Section holds is read from the board
  (`board/sections.ts`: the smallest Section a frame's middle lies in) — a frame dragged in or out needs no write.
  ⇧S / the Frame button's menu (Frame F · Section ⇧S) draws one (a click: 400 × 400); dragging its name moves its
  frames along (one edit); Delete takes them (`removeFrames`, one edit), ⌘⌫ keeps them; right-click a frame › Wrap in
  new section (80 px around); its name is a pill inside its top-left corner, renamed by double-click (`title`). Figma
  push sends one Screen, so Sections are noted "not pushed". Not yet: ⌥-drag copy of a Section with its frames.
- **N / ⇧N:** `board/frameOrder.ts` (reading order: rows by top, each left to right), select + zoom, wrapping.
- **Pages order and dividers:** `builder/store/pageOrderStore.ts` (IndexedDB settings "pageOrder", one order per list:
  a folder, or the pages in no folder of a project / Drafts); pages the order does not name come after, oldest first
  (the list no longer follows the last edit); `StudioFolders.tsx PageList` drags rows (another list: the page moves to
  that folder), Add divider in a page's menu, Delete divider in the divider's.
- **Keys / words:** ⇧S, N, ⇧N out of `figmaNotYet`; Shortcuts (Section, Zoom to next / previous frame, ⌘⌫); Actions
  (Frame, Section, Wrap in new section, Zoom to next / previous frame). Words lint ✓.
- **Shared-file edits (announced):** Inspector.tsx (presets mount), FramePanel.tsx (Section panel route, X / Y / W / H,
  Width for examples only), FrameChrome.tsx (Section labels, handles, no width menu on page frames), layerMeta.ts and
  rename.ts (`section:` frames), marquee.ts (a Section is no marquee frame), StudioApp.tsx, CanvasMenu.tsx, CanvasTools.tsx.
- **Tests:** `board/sections.selftest.mjs` (12), dialect selftest +7 (Section), `studio:selftest` ✓, tsc ✓. E2E: B-20,
  B-45, B-46, PT-15 moved to the presets; Figma walk FW-40…49 (presets, click, handles, fields, Section draw / move /
  delete / wrap, N / ⇧N, Frame button menu, Pages order + divider after a reload).
- **Runs (after merging main 5918b309: F2, F3, Bug):** full Studio E2E 336 / 336; `--only=figma` 51 / 51; CI quick steps
  (usage, guidelines, ai-ui, mcp, style) ✓; gate `npm run qa -- --isolated --files=…` PASS (third run). The first two
  gate runs caught B-20, both fixed: a frame just added was selected before the board showed it, and the board's next
  render of the row-pinned text cleared the selection (now `board/frames.ts selectFrameWhenShown`, for addFrame,
  addSection and copyFrame); the row now reads the Screen tags exactly. FW-49 once lost the page order on an instant
  reload: the order is now written before it shows.
- **Seen, not F4 (main has it too):** the builder / prototype / starters / main / device E2E groups log 19× "[Unhandled
  error] ResizeObserver loop completed with undelivered notifications" (Vite forwards it; every row passes); same count
  on main 5918b309. Told Giám sát.

## Main component for every component + count rule + Code properties (tier L, session "Bug")

User: "làm tiếp phần còn thiếu của main component" · "Bug UI của studio" (Code properties rows flush to the panel edge)
· "Luôn ghi vào harness và rule là các badge dùng số đếm luôn dùng badge counter".
- Main component: `mainComponent/samples.ts` (drawn-only samples: parts, Chat, Popover open in place, Toast, Dashboard
  header with every type's props, the 5 modal overlays open); variant-sets-build keeps sets without an axis (one cell);
  map `main` for List-Item Default/Selected, conversation call rows ("" = no prop), DatePickerSheet mode. Row sets
  (Dashboard header) at 1232, first axis down the rows; open Popover static in a cell; Uploader photo by zen-media key.
- Modal overlays: internal `OverlayPreviewContext` (_shared/overlay.ts) skips useModal's effect (focus, Tab trap,
  Escape, scroll lock, inert outside); the cell is a `[data-zen-overlay-root]` screen with `contain: layout paint`.
  Toggles keep a sample's own value when on (Bottom Sheet title).
- E2E BL-02 now fails a component with Figma sets that is not drawn; the sweep re-opens a page once (Vite re-optimize).
  board: 1202 variants on 42 pages; main/inspector groups 27/28 (MC-08 red only for the uncommitted Segmented contract,
  as its memory says).
- Count rule: harness `badge/count-uses-counter` error, new `badge/count-text-uses-counter` (span/Text with a count
  class and a lone count) + fixtures; component-usage-rules §18; Badge guideline; Figma audit `badge/count-uses-counter`
  (live rolled-back test: Badge "12"/"99+" flagged, "Live" and Badge-Counter not); screen-rules row. Studio counts in
  StudioFolders, AssetsPanel (3), VariablesWindow (2), CodeProperties → BadgeCounter xs Neutral Subtle.
- Code properties: `placement="panel"` (DesignPanel frame/text/shape) insets 12 like a section; body grid gap 8.
  Measured: rows 1196–1492 like a section's, chevron 1208, divider full width.

## Bottom Navigation from Figma to Studio (tier S, session "Bug"; user: "Update bottom navigation từ Figma lên Studio")

- Live read (❖ Bottom-Navigations (Mobile) 4060:20144): public sets unchanged (Default · Floating · Floating-Glass,
  CTA boolean, item slots); Floating's Action = `.Primitives/Bottom-Navigation` Theme=Primary, Floating-Glass's = Glass.
  Code defaulted a floating action to "default" (white) → now Primary unless floating-glass.
- Studio: map CTA → `action` toggle (`{ icon: "icon-plus-line", label: "New" }`); variant-sets-build turns code toggles
  into values (9 object toggles now drawn: actions, saved colours); Main component: FIXED_WIDTHS 390 for the three bars,
  a 4-tab sample (selected solid, others line, an Inbox dot). B-28 failed once in the full gate run (selection timing),
  passes alone.
- Progress (user: "progress … đã update từ Figma lên Studio rồi đúng không?" → "Nền nó đang là trong suốt, trên studio là
  nền xám"): #128 had the Studio side; the live Progress-Circle/Icon Base now has no fill (2px ring only, all 14
  variants) → progress.css background transparent. Done=No pies differ per theme sample (20–85%); Accent/Neutral keep 80.
  The user's Studio (:5174, Vite from 2026-10-16 in the shared checkout) serves the new code: a reload shows it.

## Studio Text tool — F6a (Session C; user: "F6a trước, F6b sau", rich text API "Component mới TextRun") — tier M, branch `zen/feat/studio-f6-text-20261019`

Plan §5 F6 split by the user: F6a the Text tool (this), F6b rich text with a new inline `TextRun` component (next PR).
- **T tool on a page you made** (`draw/drawModel.ts` kind "text", `draw/drawTool.ts`, new `edit/textCreate.ts`): a click
  makes `<Text wrap={false}>` (Auto width), a drag `<Text width={…}>` (Auto height); in a frame without auto layout it
  floats in a Box at the point (the Ignore auto layout wrapper, as other layers). The keys typed from the release on are
  held (`textEdit.holdKeysForText`) and replace the new words when the editor opens (a ref keeps them across React's dev
  double effect, which lost the first key). T on the words of a Text / Heading edits them at the caret (`editTextAt`).
  Example pages keep the placement tool.
- **Editor:** in a Text layer of a page you made Enter is a new line (Esc / Tab / a click outside leave); elsewhere
  (example pages, other texts) Enter leaves as before. The first gate found K-08 / DA-01 (example pages: Enter commits)
  broken by a newline everywhere; the newline is now for pages you made only.
  A text the Text tool made and left untouched, or any Text / Heading emptied, is deleted with its float Box
  (`removeEmptyText`). Found while testing: after an edit, Enter did not edit the same text again (the selection's source
  cache kept the old words); it now reads again on each source update.
- **Library:** Text sets `data-breaks` when a string child holds "\n"; text.css `white-space: pre-line` (`pre` with
  `wrap={false}`). Only texts with a line break change.
- **Resizing** (`edit/TextResize.tsx`, mounted in DesignPanel's Typography for Text / Heading; Session B was not running,
  so the one-row mount is mine): Auto width = wrap={false}, Auto height = width, Fixed size = width + height, from the
  rendered size, one edit.
- Paste of plain text with nothing selected already makes a `<Text>` in the frame in view (F3, Session A); not changed.
- **Tests:** drawModel selftest +2; Figma walk FW-60…66.

## Studio rich text — F6b (Session C; user: rich text API "Component mới TextRun") — tier M, branch `zen/feat/studio-f6b-textrun-20261019` (stacked on F6a)

- **Library:** `TextRun` (`src/components/Text/TextRun.tsx`): a span with `data-bold` / `data-italic` /
  `data-decoration` / `data-tone` and a text style class; bold is `--zen-emphasis-font-weight-bold`. Guideline rows (Line
  breaks, Mixed styles), harness `text-run/inside-text` (+ fixtures), platform example "Mixed styles in a sentence", story.
- **Canvas** (`edit/richText.ts` pure runs + selftest, `edit/richTextEdit.ts`, `edit/RichTextEditor.tsx`): ⌘B ⌘I ⌘U ⇧⌘X
  toggle a style over the selected words (all have it → off, else on); the plain editor hands over to the rich one at
  the first format key; a Text with runs opens in the rich editor. Leaving writes the Text again with its runs (one
  `replaceElement`, one ⌘Z); emptied → deleted. TextRun is transparent to the picker and skipped in Layers; a text layer
  with runs is named by all its words (`layer-meta.textWordsOf`). Found while testing: Layers listed the run as a
  "span" layer and named the text by its first words only — both fixed.
- **Figma** (`tools/studio/text-runs.mjs`): push gives TEXT `segments` ({start, end, textStyle, bold, italic,
  decoration, fill}; bold = the style's Bold sibling, font Bold only for a Heading); the pull reader reads
  `getStyledTextSegments` and writes TextRuns; native ⌘C → ⌘V writes `characterStyleIDs` + `styleOverrideTable`; the
  Zen plugin's importer applies segments (Session B, `studio-import.js applySegments`). `figma-diff` keeps TextRuns as
  part of their Text (a text change carries the runs, in order; before, a merge put the words first and the runs last).
  `doc.mjs` / `compile.mjs` write a text with runs on one line as a person writes it.
- Enter in the rich editor: a new line on a page you made, else it leaves (as F6a's plain editor after K-08 / DA-01).
  Plugin importer: Session B's `711e203` (feat(studio-import): a text's runs from Zen Studio).
- **Tests:** richText selftest 12; figma-push +7 (round trip, React export), figma-native +5, figma-diff +3,
  layer-meta +1; Figma walk FW-67…69.

## Studio images — F8a (Session C, decision 8; split as F6: F8b = canvas crop editing + direct ⌘C→⌘V of pictures) — tier M, branch `zen/feat/studio-f8-images-20261019` (stacked on F6b)

- **Library** (`src/components/_shared/image-fill.ts` + selftest 17): `image` / `imageFit` (fill · fit · crop · tile) /
  `imageCrop` (% of the picture) / `imageScale` (tile %) on Shape (rectangle: CSS background; ellipse / polygon / star:
  an SVG pattern) and on Box / Stack / Grid (Layout `appearance.ts`, its own `data-image`; Session B agreed the Layout
  edit). A Shape with a picture has no colour unless given. Stories, guideline rows (Shape, Layout), docs regenerated.
- **Studio:** ⇧⌘K on a page you made → the file dialog → `draw/placeImage.ts` queues the pictures → drawTool kind
  "image": a click places the picture at its own size, fitted to the frame and moved inside it; a drag sets the width
  with the picture's ratio; each further picture waits for its click (status line), Esc puts the rest away. Written as
  `<Shape image="zen-asset:…" label="…" data-name="<file>" …/>`. `canvas/fileDrop.ts`: files dropped on a frame go in
  at the point (window listeners: the viewport may mount after the toolbar), pasted pictures in the middle of the
  selected frame or the frame that shows most (clipboard.ts `setImagePaste`, Session A agreed). Fill › Image
  (`appearance/ImageFillRow.tsx`, Shape and frames): the photo picker + Upload + −, Image fit, Tile scale; Crop starts
  from Fill's visible part (`coverCrop`). Layers: a rectangle with a picture shows the image icon.
- **Figma** (`tools/studio/figma-image.mjs`): push `imageFill` {src, scaleMode, crop, scale} + bytes in `images`; the
  pull reader reads the IMAGE paint (crop from imageTransform, src from shared plugin data "zenstudio"/"image"); a
  picture made in Figma is noted. Importer: Session B's plugin `0d55f95` (applyImageFill; re-import replaces or removes
  only the picture it placed). Direct paste notes image fills (F8b).
- Found while testing: a picture placed near a frame's edge was cut off (now moved inside); the drop listener on the
  viewport element was never attached (now on the window).
- **Tests:** image-fill selftest 17; drawModel +2; figma-push +4, figma-pull +4; Figma walk FW-80…86.

## Studio crop on the canvas — F8b (Session C) — tier S, branch `zen/feat/studio-f8b-crop-20261019` (stacked on F8a)

- `draw/CropHandles.tsx` (mounted beside ArcHandles in SelectionLayer) + pure `draw/cropModel.ts` (selftest 6): crop
  mode on a rectangle Shape or frame whose image fill is Crop starts with Image fit → Crop or the row's Crop button;
  the whole picture shows faint around the layer, a drag moves it, a corner scales it (opposite corner still, ratio
  kept, always covering the layer), live through the layer's own CSS variables; a release writes `imageCrop` (one
  edit). Esc / Enter / another selection end it; the layer's resize handles step aside meanwhile (found while testing:
  they sat on the picture's corners and resized the layer instead).
- Not done (BACKLOG, native clipboard item): pictures in the direct ⌘C → ⌘V (kiwi blobs + image hashes, needs a Figma
  capture). Rotated / flipped layers and SVG shapes keep the panel's crop only.
- **Tests:** cropModel selftest 6; Figma walk FW-87.

### F6–F8 ship (Session C; Giám sát: one gate on the stack top, one PR)
- Gate on 968e589b: every step green but Studio E2E, which hit tools/qa/run.mjs's 40-min cap at the nested group (no
  row broken by then). Then main 17bc4c43 (A's F9) merged: Shape keeps vector / boolean / flip and takes the image
  fill, Box groups take no picture, F9's `freeFrame` helper stays (the F6/F8 walk frame is `walkBox`). On the merged
  tree: tsc, studio:selftest, usage, guidelines, ai-ui, style, vitest 71/71; Studio E2E uncapped 335 / 1 (B-20, twice in
  the full run; alone and with its whole builder group 45/45 green — order-dependent, cause not found), `--only=figma`
  87 / 1 (FW-03 still expected ⇧⌘K to arm the tool without the file dialog: updated, green).
- The reader's `readImageFill` reads fills behind `"fills" in node` (A: Figma throws on a property a node type lacks).

## Session B · Studio parity F5a: one Figma frame is one element, the right panel in Figma's order

Plan `docs/research/studio-figma-design-parity-2026-10-18.md` F5 (decisions 1–2, approved 2026-10-18); spec card
`docs/research/studio-f5-right-panel-spec-2026-10-19.md` (F5 split in three PRs: F5a API + panel order, F5b typed values
and variable pills, F5c typography, multi-selection, nothing selected, Export, Layout guide). Branch
`zen/feat/studio-f5-right-panel-20261019`. Tier L.

- **Library (Layout):** `appearance.ts` (new): `FrameAppearanceProps` (surface, border, borderWeight, borderSides,
  borderStyle, radius + corners, opacity) and `FrameTransformProps` (rotation, flip) on Box, Stack and Grid;
  `FrameEffectProps` (effectStyle) split from `BoxEffectProps` so Stack / Grid's props docs list it. CSS: one rule set for
  the three frames (layout.css, effects.css); Stack / Grid corners through `data-corners` + `--zen-layout-radius`
  (`data-radius` is the radius *mode* attribute in tokens.css — not reusable); rotation / flip as CSS individual
  transforms (`rotate`, `scale`) so they compose with position.css and leave the layout box alone; dashed only on
  Subtle. Unset props render nothing (existing pages' DOM unchanged).
- **Harness:** box/border-matches-action, effect-needs-surface, blur-needs-tint, shadow-no-border, radius/redundant-corners,
  radius/full-mixed cover Stack and Grid; new `layout/opacity-percent` (error: 0 < opacity < 1) and `box/dashed-is-subtle`;
  a dashed frame skips border-matches-action. Fixtures bad/good; selftest 215 rules.
- **Docs:** guidelines source (layout: api rows, use, do), regenerated; story `FrameAppearance`; Layout page's "Layers
  over photos" sheet is one Stack with surface, corners and shadow.
- **Figma:** push `frameLook` (fill on every frame, stroke Border/Neutral/*, weight, one side, dash 2/2 = the Input's,
  radius or per-corner radii + vars, effect style, opacity, rotation, flip); pull reads them in figmaReadCode (per-side
  weights, corners + bound vars, `effectStyleId` → name, opacity, mirror from `relativeTransform`) and `frameLookProps`
  writes them on the Stack / Grid itself (a painted frame that lays nothing out stays a Box; a scrolling Grid keeps a
  Box). Selftests: push 297 (round trip of every look), pull 81 (read format, notes for values without a token).
  `library-keys` packages now carry effect and paint style keys. Zen plugin (`~/Documents/zen-ds-figma-plugin-main`,
  commit f6969ca, dist rebuilt, backup in backups/): `applyFrameLook` + `turnAboutCentre`; test on the mock.
- **Studio:** DesignPanel in Figma UI3's order (instance properties under the header; Position → Layout → Appearance →
  Typography → Fill → Stroke → Effects; a frame's code-only properties and layers at the end). AppearanceSection: opacity
  + corners + the header eye (Show / Hide ⇧⌘H); FillSection, StrokeSection (weight, Sides, Dash) for Box / Stack / Grid;
  palettes `surfacePalette` / `borderPalette`; Position: Rotate 90° right, Flip horizontal / vertical (positionModel
  `flipTurn` / `turnOps`, for A's ⇧H / ⇧V). ⇧A on a filled Box → one Stack keeping the paint (autoLayoutPlan; matrix
  12,569 cases, 0 findings). E2E Figma walk FW-50…56.
- Left: BACKLOG P2 — figma-native.mjs / native-pack (⌘C → ⌘V) do not map a frame's look (no owner session).

## Session B · Studio parity F5b: typed values and variables (decision 1)

Branch `zen/feat/studio-f5b-typed-values-20261019` (worktree `../Zen-DS-f5b`, stacked on F5a). Spec card §1 of
`docs/research/studio-f5-right-panel-spec-2026-10-19.md`.

- **Token fields** (ScaleField: gap, padding, radius, corners): a digit or operator starts typing; Enter evaluates
  (controls/numberMath) on the shown value and snaps to the nearest step (`scale.ts nearestStep`, a tie the smaller);
  the status names the snap. A written step reads as Figma's variable pill (`data-variable`, pale capsule) with the
  variable's path as its tooltip.
- **W / H**: `parseSizingInput(text, axis, evaluate)` takes Figma's arithmetic; Constrain proportions (session state per
  layer, Figma keeps it in the file) writes the other axis at the shown ratio in the same change (`sizingModel withRatio`).
- **Offsets in a free frame** (Box without auto layout, where Zen takes px): Detach variable → the step's px, Apply
  variable → the nearest step.
- **Colours**: a hex typed into a colour list's search lists the three nearest variables (`controls/colorMatch.ts`,
  rendered colours read through a 1-px canvas) and Create variable… (opens Local variables).
- Selftests: sizingModel 105, scale 18, colorMatch 8 (new, in studio:selftest). E2E FW-57…59, FW-90 (F5 also takes
  FW-90…99, told A and C).
- Gate 1 (2026-10-19): static pass; Studio E2E 335/336, PT-15 (Present simulator) a click timeout under load, passes
  alone. The E2E shots showed the variable pill cutting "Medium 16" to "Medi…" (its padding took the name's width):
  fixed with a negative margin as wide as the padding (controls.css), and FW-57 now types 16 and checks "Medium" whole.

## Studio F9a — vectors (Session A, worktree `../Zen-DS-f9`, branch `zen/feat/studio-f9-vectors-20261019`)

Spec card `docs/research/studio-f9-vectors-spec-2026-10-19.md`; the user chose `pathkit-wasm` and live boolean groups
(both F9b).
- Library: `Shape type="vector"` (`d` in absolute M / L / C / Q / Z, `viewBox`, `fillRule`); geometry.ts
  `parseVectorPath`, `vectorPathData`, `parseViewBox`, `vectorBounds` (curve extremes), `fitVectorPath` (selftest 12);
  defaults as Figma's Pen (no fill, Border/Neutral/Solid, centred stroke). Harness `shape/vector-path` (+2 bad, 1 good).
  Guideline, docs/api, AI catalog, compile API, keywords regenerated; two examples (Pencil underline, Pen logo mark) and
  the playground's vector.
- Studio: `draw/penModel.ts` (pure, selftest 23: corners, smooth points, ⇧ 45°, Schneider curve fit for the Pencil,
  sub-paths with handles, move point / handle (mirrored), remove point), `draw/penTool.ts` (P / ⇧P, overlay, one
  `pasteCode` per vector; drawTool.ts now exports targetAt / localOf / screenOf / snapTargets), `select/VectorHandles.tsx`
  (Enter / double-click vertex edit: live `d`, one write with the new bounds and the box moved; turned vectors keep
  their box). Tool bar Pen split button, CanvasStatus hints, Shortcuts, figmaNotYet without Pen / Pencil.
- Figma: push `VECTOR` + `vectorPaths` (fitted to the size); pull VECTOR → Shape vector (unreadable paths noted and left
  out); plugin `studio-import.js` builds a Shape VECTOR (plugin commit fc18ba7, its test extended). Selftests: push 296,
  pull 81, layer-meta 12.
- E2E figma FW-115…118 (Pen closed, Pen curve, vertex edit, Pencil) written; run once the gate slot is free.

## F2 / F3 leftovers on F5a — groups, flips, rotate handles (Session A, merged into the F9 branch)

Built on main d145fd16 (B's F5a: `flipTurn` / `turnOps`, frame rotation / flip), branch
`zen/feat/studio-group-flip-rotate-20261019`, then merged into `zen/feat/studio-f9-vectors-20261019` to ship with F9a
in one gate (the slot queue is the bottleneck).
- Box `group` (B handed it over: "a group renders no look"): Layout.tsx ignores surface / border / radius / effect /
  padding / scroll / clip for a group, keeps opacity / rotation / flip; harness `box/group-no-look`; guideline row.
- `edit/groupLayers.ts` `groupSelection` (⌘G, menu, floating via op group + `group`, auto layout via op group `flow`),
  Layers "Group N" (layer-meta) and icon, ⇧⌘G "Ungroup" label; figmaNotYet without ⌘G / ⇧H / ⇧V.
- `edit/flipLayers.ts` (⇧H / ⇧V: flipTurn per layer, several floating layers mirrored across their union via
  alignLayers `moveOps`), Shape `flip` (CSS individual `rotate` / `scale`, as frames), `select/RotateHandles.tsx`
  (zones just outside the corners, ⇧ 15°, Esc, one write through turnOps).
- Figma: push Box group → frame `group: true` (plugin turns it into a GROUP of its layers; plugin 7bc4ddf), Shape flip
  (plugin e9767da); pull GROUP → Box group with its layers at their X / Y inside it (reader: positions relative to the
  group), free-frame px insets for frames too. Selftests push 302, pull 86, arrange 50, layer-meta 13, usage 218 rules.
- E2E FW-119…121 written; run with F9a's when the slot is ours.

## Studio F9b — path operations (Session A, worktree `../Zen-DS-f9b`, branch `zen/feat/studio-f9b-path-ops-20261019`, stacked on F9)

- `pathkit-wasm` 1.0.0 (devDependency, the user's pick; the shared checkout needs `npm install` once merged).
  `tools/studio/path-ops.mjs` (kit passed in): shape outlines (rectangles with Corner-Radius px, arcs, polygons, stars,
  vectors), placed by insets / rotation / flip, boolean results (first shape the base; simplified, even-odd), Flatten,
  Outline stroke (inside / outside cut by the fill), `planBooleans` (selftest 15 in Node with the wasm file).
- Library: Shape `type="boolean"` + `operation` + children (drawn hidden in `.zen-shape__operands`), its result like a
  vector. Live groups: `builder/localApi.ts` `withBooleans` re-plans every group after each edit of a page you made, in
  the same write (as withPhoneSync), PathKit loaded from `draw/pathKit.ts` on the first page that has one.
- Studio: `edit/pathOps.ts` (⌥⇧U/S/I/E, ⌘E, ⌥⌘O; menu for several shapes and for one; Actions), op group `tag:
  "Shape"` (boolean) and `childless` (one vector in the layers' place). Layers "Union N" … with the intersect icon.
- Figma: push BOOLEAN_OPERATION with its shapes (plugin 40d5bd6: built in a frame, then figma.union / subtract /
  intersect / exclude, painted); pull BOOLEAN_OPERATION → Shape boolean, its result from `fillGeometry`.
- Not built: Use as mask ⌃⌘M (a Box `mask`: Session B's Layout, one PR with B) — BACKLOG.
- E2E: figma group 70/70 (FW-115…124; FW-122 selects the shapes with Enter, FW-123's vector regex takes any attribute
  order, FW-37 gets 40 s).
- Group fit (found while writing the BACKLOG line "a group's box does not follow its layers" — fixed instead, scope
  lock): `tools/studio/group-fit.mjs` `planGroups` (pure, selftest 6) refits a Box group around its px layers after each
  edit, in localApi's same write; token insets, Fill sizes and turned / flipped groups are left as they are. FW-124.
- Lesson: a union merge dropped a `}` in figma-pull.selftest.mjs and a "✗" grep missed the SyntaxError — fixed in F9 and
  F9b; memory "selftest-exit-code".
- Gate (`--isolated`, 76 files): static, runtime audit (1512/390/320, dark), behaviour ✓; Studio E2E 335/336 — SP-09
  ("Reports gone from the Screen", a starters row F9b does not touch) timed out under load, then passed alone and in
  the whole starters group (24/24). Shape coverage ⚠ is the existing BACKLOG line (count updated to 9).
