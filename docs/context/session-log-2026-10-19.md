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

## Session B · Studio parity F5c: Export, typography details, several frames, selection colors, local styles

Branch `zen/feat/studio-f5c-panel-export-20261019` (worktree `../Zen-DS-f5c`, stacked on F5b).

- **Export** (`inspector/ExportSection.tsx`, Figma UI3's last section on layers and frames): settings scale × format per
  layer (session), "Export <layer>" downloads `<layer>[@Nx].png|jpg|svg`. Drawn by `htmlExport.ts layerPicture`: the
  layer's export copy alone at its layout size inside its ZenProvider's attributes, fonts and photos as data URLs,
  through `screenshot.ts` (now `pictureSvg` + `drawPng` with JPG on white). SVG = the HTML in a foreignObject (opens in
  browsers, not vector paths); PDF listed as not yet.
- **Text**: `tone` leaves Typography for a Fill section (Figma: a text's colour is its fill); Typography's Style details
  (`TextStyleDetails.tsx`): font, size and line height as rendered, letter and paragraph spacing, case, decoration, all
  read-only ("Edit text styles in Figma").
- **Several frames** (`MultiFrameLook.tsx`): Appearance (opacity), Fill, Stroke, Effects with Mixed, one edit for all
  (edit/multi setPropsOnLayers); MixedProperties leaves those props to it. **Selection colors** (`SelectionColors.tsx`):
  the colours a frame / selection and its layers paint with (partInfo coloursOf), by variable, with counts; read-only.
- **Nothing selected**: Local styles (`LocalStyles.tsx`): text, color, effect styles from the style manifest, folded.
- Moved to F10 (Session C, agreed): Layout guide and the page background.
- E2E FW-91…94.

## Session B · Studio parity F7a: component sets, variants, properties

Branch `zen/feat/studio-f7-components-20261019` (stacked on F5c). Spec card:
`docs/research/studio-f7-components-spec-2026-10-19.md`.

- **Dialect** (`dialect.mjs`): `<ComponentSet id name properties? description? link?>` around `<Component variant={{…}}>`;
  `properties={{ Name: { type: text|boolean|swap|slot, default?, preferred? } }}`; bindings `data-prop-text`,
  `-visible`, `-swap`, `-slot`; `<Use of variant props>`. Variants without values get Figma's positional names
  (Property 1 = Default, Variant2…). `localComponents`, `componentSets`, `resolveInstance`, checks with messages.
- **Canvas** (`renderPage.tsx`): a set renders as Figma's set frame (wrap row, `data-zen-set`), each variant marked,
  instances resolve their variant and values (text, visibility, swap), nested instances with a cycle guard.
- **Studio** (`edit/localComponents.ts`, `inspector/ComponentSection.tsx`): Combine as variants (siblings, one edit),
  Add variant, variant values and axis rename, Properties (+ Text / Boolean / Instance swap / Slot, rename, default,
  −), Apply component property on a main's layer (None / a property / Create …), instance panel (variant selects,
  values, Reset all changes), swap lists sets and mains (drops variant / props), description and link rows. Layers
  names a set and gives it the component icon (`select/layerNames.ts`, `layerMeta.ts`, told A).
- **Export** (`compile.mjs`): one function per set or main, typed destructured props, variants by if-chains, bindings.
- **Figma**: push COMPONENT_SET (variants named by values, properties, `propRefs`, `slot`, link), INSTANCE with
  variant / props; pull reads sets, mains, instances and bindings back (round trip in figma-push.selftest); the
  reader marks a page's own component by its place inside the frame read. Zen plugin (only committer for F7):
  `dc882cd` (combineAsVariants, add/edit/deleteComponentProperty, componentPropertyReferences, createSlot, instances
  on their variant with setProperties, stand-ins settled async) and `34fe7b4` (mains and sets keep their Studio id);
  full `npm test` before each build, dist backed up.
- Fixed on the way: a new swap property defaulted to `icon-star-line`, which no icon has (now `icon-star-01-line`);
  layer-meta selftest's `<Use>` message.
- Checks: dialect / compile / doc / push (307) / pull (83) selftests, studio:selftest, tsc. E2E FW-70…76 written; run
  waits for the gate slot.
- F7b (own PR): overrides inside an instance, Push changes / Restore, nested exposed instances, Assets › Local.

## Session B · Studio parity F7b: overrides inside an instance, Push changes, slots, Assets › Local

Branch `zen/feat/studio-f7b-overrides-20261019` (stacked on F7a). Spec card:
`docs/research/studio-f7b-instance-overrides-spec-2026-10-19.md`.

- **Layer paths** (`tools/studio/instance-paths.mjs`, pure): a main's layers below its root by given name / nested
  component name / tag, `[i]` on shared ones; dialect `mainLayerPaths`; `<Use overrides>` checked (a layer, or one inside a
  leaf layer; literals). Selftest `instance-paths.selftest.mjs` (in studio:selftest).
- **Canvas** (`renderPage.tsx`): instance layers drawn in `NestedContext` scopes named by their paths (so the existing
  deep select reaches them as parts of the `<Use>`), `overrides` applied (props, `children` words, `variant.X` /
  `props.X` on a nested instance), outer instances win; `<Use slots>` drawn in the main's `data-prop-slot` layer as page
  layers.
- **Panel**: `inspector/LocalPartPanel.tsx` (routed in Inspector.tsx for parts of a `<Use>`): Show layer, Text (a bound
  text sets its property), a nested instance's variant and properties, a nested Zen component's properties
  (OverrideProperties now takes the `<Use>`'s table and writer), Reset changes, Push changes to main. Instance panel:
  Reset all changes also clears overrides; Push changes to main; canvas menu items on an instance.
- **Edits** (`edit/localComponents.ts`): `resetInstance`, `pushChangesToMain` (one `many setProps` edit: setText /
  setProp on the main's layers, a leaf layer's own `overrides`, the instance's leftovers kept), `localLayerAt`,
  `setInstanceOverrides`. `arrange.mjs` many setProps admits `setText` (A told; C made the same change for F10 — the
  second to land takes main's hunk).
- **Export** (`compile.mjs`): overrides of bound layers become property values, others a comment in the tag; slot
  properties are `ReactNode` props (`{content ?? <>default</>}`), instances pass their slot layers.
- **Figma**: push `layerOverrides` (child indices into the drawn main, found after the frame is built; characters,
  visible, fill, nested values) and `slots`; plugin `3106e91` (overrides) and `1785c37` (slots).
- **Assets › Local** (C's area, OK'd): a set is one tile ("N variants"), the description in the tooltip.
- Plugin for C (F6b/F8/F4 fix): `711e203` text runs, `0d55f95` image fills, `328c1d4` free frames (layout NONE).
- Checks: instance-paths 8, dialect 48, doc 142, compile 70, push 313, plugin npm test; E2E FW-77…79, FW-95, FW-96
  written (run waits for the gate slot). BACKLOG: pull of overrides/slots, deep override push, slot drop target (F7c),
  the export question for the user.
- First E2E run of F7a/F7b (20 rows, slot of 2026-10-19 evening): 15/20, then fixed and 20/20 (93 s).
  - Add variant sliced the variant's code by lines from a character range, so the paste was refused. It now slices by
    offsets, as edit/clipboard.ts does.
  - ⌘-click on a text inside an instance selects its DOM node. Its layer path is now taken from the Text component on the
    same element; parentLayerOf starts above that element.
  - A layer hidden in an instance stays selected by its last path, as in Figma.
  - An instance of a main without properties now shows Properties when it changed layers inside it, so Reset all changes
    is reachable.
  - FW-70 counts several selected layers by the header.
- Gate on F7b's top (F5b + F5c + F7a + F7b, main d8505fe9): PASS. All static steps passed; Studio E2E 336/336. Report
  `.qa/reports/2026-10-19T14-03-08-ce247a8f.md`.
- The E2E shots then showed three panel slips, now fixed:
  - a set's variant property row was not on its properties' grid;
  - the header said "Local component" for an instance and a set, where Figma says "Instance" and "Component set";
  - an instance showed a Typography section.
- Main d56666ec (#148) merged: its reader's GROUP box sits beside F7's component reading. Push and pull selftests pass.
  Re-gated before shipping.
- Two stacked PRs from the one gated tree, agreed with Giám sát: F5 (rest) = F5b + F5c, and F7 = F7a + F7b.
- User 2026-10-19: no field in the tool's panel may jut out or step in, and the shared Inline-Field is used. The
  re-gate was stopped and the panels were made to follow the rule:
  - the component panels use `RowInputField` / `RowSelectField`;
  - a component's name and an instance's component end where fields end (the icon column is kept);
  - `.studio-shape__pair` is on the panel's three-column grid (Opacity was 16px past the column);
  - Stroke's Sides is an inline select in the pair (it drew a nested row that ended 32px short).
- E2E `panelFits` / `expectPanelFits` (figma.mjs) now checks, in FW-50/52/54/56/71/72/74/75/77/92/95:
  - every field is inside the panel and ends on a field-grid line;
  - a section's rows start on one left edge;
  - no select value or short input value is cut off.
- 27/27 of Session B's FW rows pass with `--no-retry`. A retry runs on the page the failed attempt left, which hid
  FW-54's real error.
- More slips the shots showed, now fixed:
  - Corner radius' Independent corners was a button in an empty-label row, mid-panel. It is now an icon in the radius
    row's icon column (PropField takes an `action`).
  - Selection colors showed cut-off CSS names. Each colour is now a read-only field: swatch, the variable in Figma's
    words (`colourVariableName`) and a BadgeCounter, on the field grid (`.studio-inspector__wide-field`).
- E2E runner (`tools/studio/e2e/run.mjs`; asked by Giám sát; the reset approved by the user 2026-10-19: "làm luôn
  phần reset trang trước khi retry"):
  - A retry used to open a fresh tab on the documents the first try had changed: a row's cached page kept its edits,
    so the retry failed on that leftover and hid the cause. That is how FW-52's stroke "survived": attempt 1 added it,
    the retry found it. Nothing survives across runs: the server empties its drafts and pages folder at every start.
  - Before each row, the runner keeps every draft's text and the files of the pages folder. Before a retry it puts them
    back: drafts discarded or rewritten, files rewritten.
  - A scenario that exports `forgetPages()` (figma.mjs) has the pages its first try added removed, and seeds them again.
  - A row that fails twice reports its first try's error, then `(retry: …)`.
  - Proved with a temporary forced failure in FW-52: once on a page the row made, once on a page an earlier row made.
    Both retries passed; the temporary code is out. FW-52's own leftover-stroke guard is gone too.

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

## F9 in the live Zen file (Session A, worktree `../Zen-DS-f9b`, branch `zen/fix/figma-push-frame-size-20261019`)

The user asked to test F9 in real Figma after #146. A Studio page (Pen logo, Pencil underline, a group with a flipped
star, a Subtract ticket stub in a 560 × 240 free frame) pushed through the real importer (`studio-import.js`, a trimmed
copy in one `use_figma` call on "Studio exports — QA"; storing code in the file and evaluating it was refused by the
safety check) and pulled back with `figmaReadCode`. Bugs, each fixed at its owner:
- Plugin (fbbc407, local + `studio-import`): GROUP / BOOLEAN_OPERATION landed in the auto layout flow at 0, 0 (keepPlace);
  a boolean group's shapes sat at 0, 0 in their holder (placeAbsolute without layoutPositioning); a vector was resized to
  its Zen box after its path, stretching the curve (Figma sizes a vector to its path: pathOffsets); fixedHeight ignored.
- Push: a frame's px width / height was never sent (free frames hugged): `fixedWidth` / `fixedHeight`, no Fill over them.
- Pull reader: Figma throws on a property a node type lacks (pointCount on VECTOR, clipsContent / constraints / layoutMode
  on GROUP), so any page with shapes failed in the live file; reads now ask first (`own`). A mirrored shape read as
  rotation -180: decoded as flip like frames, centre through the mirror. GROUP size was missing (NaN); a group pinned out
  of an auto layout took token insets in a wrapper Stack: px X / Y now; absolute X / Y to the hundredth.
- Round trip after the fixes: vectors, group, flipped star and Subtract come back as drawn, no notes, dialect clean.
  Left for Session C (frames): a free frame (Box, every layer absolute) pushes as an auto layout frame and pulls back as
  a Stack without its size; the pull reads no FIXED size; figma-native ignores fixedHeight. Told C.
- QA frames removed from the Zen file.

## F4 follow-ups (Session C) — tier S, branch `zen/fix/figma-free-frame-none-20261019` (on A's 5fdf003c)
- **Free frames ↔ Figma layoutMode NONE** (A found it in the live Zen file: a free frame pushed as a VERTICAL auto
  layout and pulled back as `<Stack gap="none">` without its size): push writes NONE for a Box of a px size whose layers
  all float (or none); the reader gives every child of a NONE frame its X / Y (not only shapes and groups) and the frame
  `fixed: { w, h }`; the pull writes the Box with its size, a text or a component inside the Studio's float Box at its
  px X / Y. figma-native sizes NONE frames and reads fixedHeight. Importer: Session B's plugin `328c1d4` (NONE frame
  sized before its children, children placed without layoutPositioning). Selftest: figma-push +2 (round trip).
- **B-20** failed only inside the full E2E run (twice; alone and with its builder group green): the new frame's
  selection waited 2 s of animation frames for the frame to register, which a busy run outlasts. `selectFrameWhenShown`
  now waits for the frames registry to announce it (10 s).
## Studio View and Find — F10 (Session C) — tier M, branch `zen/feat/studio-f10-view-20261019` (from main, not stacked)

- **View options** (`canvas/viewOptions.ts`, this browser's, localStorage): Pixel grid ⌘' (on), Outlines ⌘Y (Mac;
  Ctrl+Y stays Redo elsewhere), Rulers ⇧R, Layout guides ⌃G (Ctrl+Alt+G elsewhere) — `canvas/viewKeys.ts`, Actions
  rows, Shortcuts rows; the four leave figmaNotYet. Zoom 2 %–25 600 % (`MAX_ZOOM` 256, steps double past 400 %;
  `FIT_MAX_ZOOM` 4 keeps zoom-to-fit as before); the pixel grid (a hairline per world px) from 400 %. Outlines: CSS on
  the frames' layers (Border/Neutral/Solid hairlines, fills / shadows / pictures off).
- **Rulers and guides** (`canvas/Rulers.tsx`): rulers along the canvas between the panels, in the board's coordinates
  (the frames' X / Y; 0 at the selected frame's top-left); a guide dragged from a ruler belongs to the frame it lands on
  (else the canvas), moves by dragging, goes when dropped on its ruler. Page header `guides` (outside ⌘Z, as the
  page's OS). Found while testing: the selection layer's capture sat above the rulers (now z 20) and the world's 0 is
  not the board's (offset of the frames' container).
- **Layout guides** (`canvas/LayoutGuides.tsx`, `canvas/LayoutGuidePanel.tsx` in FramePanel for Screens): Columns /
  Rows / Grid; columns and rows between the frame's own `--zen-margin-comfortable` with `--zen-gutter` (its device's
  Breakpoint & Grids mode); header `layoutGuides` by frame. Default counts 12 / 8 / 4 → BACKLOG (designer).
- **Canvas Background** (`canvas/CanvasBackground.tsx`, Page panel with nothing selected): Canvas · Canvas Alt · Canvas
  Flat · Surface · Neutral · Dark (Neutral/Solid; Inverse/Solid is white in light mode); frame names read in Inverse
  content on Dark. Header `canvas`.
- **Find and replace** (`edit/FindPanel.tsx`, pure `edit/findModel.ts` + selftest 4): ⌘F on any page (pages you made
  search their layers), Enter / ⇧Enter step and select, Replace all = one `many` setProps edit with `setText` ops (one
  line in arrange.mjs, Session A agreed).
- **Tests:** findModel selftest 4; Figma walk FW-100…105.
- **Ship:** gate on da5f7936 (main d56666ec): every step green but Studio E2E 335 / 1 — B-20, because #149's fix
  (gated 336 / 0) landed after the run started; `--only=figma` 93 / 1 — FW-05 still listed ⇧R as "Rulers isn't in Zen
  Studio yet", which F10 builds (expectation updated). On e3850527 (766f9871 merged + FW-05 updated): B-20 and FW-05
  green; tsc, studio:selftest, usage, style green. Giám sát: ship on this evidence.

## Studio F8c — pictures in the direct paste (Session C) — tier S, branch `zen/feat/studio-f8c-native-pictures-20261019`
User picked "Dán ảnh qua ⌘C→⌘V" (the rest of F8). `tools/studio/figma-native.mjs`:
- `nativePictures` (SHA-1 = Figma's image hash, size from the header), `imagePaint` (Fill · Fit · Crop = STRETCH with
  the shown part as transform · Tile scale), the bytes as message blobs (`Image.dataBlob`), the Studio src as shared
  plugin data (`pluginData` with no plugin id, key `zenstudio-image`, read from Figma's own copy of a probe layer).
- A Shape rectangle / ellipse is Figma's ROUNDED_RECTANGLE / ELLIPSE (variables, Corner-Radius, arc, opacity, rotation
  and flip about the centre); frames take their image fill. Bug met: a Shape path pasted as an empty 0.01 px VECTOR;
  other Shape kinds are now a note (BACKLOG shapes item narrowed).
- Live tests in the Zen file (QA page, each removed): data: and local http URLs in `meta.imageHashes` are never fetched
  (the first "proof" used a hash Figma already had); blobs place fresh PNG, JPEG, GIF; WebP never → `figmaClipboard.ts`
  draws it as PNG on a canvas (checked in Chromium). Final run through `figmaPasteHtml`: 4 fresh pictures, bytes and
  hashes exact, crop / tile / rotation / radius variable / src as sent.
- Slip, fixed: the first test paste landed in the user's "UI Foundations" file (Figma's front tab); found by name and
  removed at once. The paste script now opens the Zen file and refuses to paste when Figma shows another file.
- Selftest figma-native 85 (+ pictures, shapes, the path note). Open (BACKLOG): a component's own picture (Avatar,
  Image) needs the pack to record its image layer. BACKLOG "Layout guide column count" removed: the user keeps
  12 / 8 / 4 (2026-10-19).
- Gate finding met (usage:check ⚠ layer/popover-is-overlay, my F10 rulers.css): the rulers took Background/Popover;
  they are canvas chrome like the panels, so Surface/Default now.
- **A component's own picture** (user: "làm ảnh riêng của Avatar/Image luôn"; Image and Thumbnail have no Figma set,
  so in practice Avatar/Single Theme=Photo and the table's Avatar-Cell / Photo-Cell): the pack records `img` (the fills)
  on every layer with an IMAGE fill. `packFrom` writes it from a capture; `native-pack.mjs images-code` / `images` read
  it with use_figma (3 parts, hashes of the answers checked) instead of a full re-capture: 671 layers (+114 KB). The
  writer fills the first such layer after the nested edits (the variant shown), an override `fillPaints` with the
  picture's blob. Live paste (QA page, removed): Avatar Large, Avatar-Cell (nested Avatar → Square Small Photo),
  Photo-Cell show their fresh pictures, hashes exact. Selftest figma-native 90.
- Gate (Giám sát's slot after B, on 1a18705f): `npm run qa -- --isolated --files=<11 files>` PASS — static ✓, Studio E2E
  336 works · 0 broken (1577 s); report `.qa/reports/2026-10-19T16-58-37-ee53b0aa.md`.

## Direct paste of the other Shapes (Session C, 2026-10-20) — tier S, branch `zen/feat/studio-native-shapes-20261020`
BACKLOG item the user approved 2026-10-17 ("Direct paste of Studio Shapes"), picked up while #154 waited for CI.
- One capture of a probe built with the importer's own calls (QA page; clipboard saved and put back; probe removed)
  gave Figma's encodings: LINE + ARROW_LINES cap, REGULAR_POLYGON `count`, STAR `count` / `starInnerScale`, VECTOR
  network (Q as cubic; even-odd = one region of style 0), BOOLEAN_OPERATION with its shapes inside.
- `figma-native.mjs`: one `shape()` writer for every Shape kind; `parsePath` reads Q; `vectorNetwork` groups loops into
  regions per vectorPaths entry. Selftest figma-native 102.
- Live paste of a Shapes page through figma-push → figmaPasteHtml (the first paste missed while B's gate loaded the
  machine; the retry landed): types, sizes, rotation / flip about the centre, counts, the even-odd hole, Subtract as
  drawn (screenshot), test nodes removed.
- Found: an arrow gets a head at both ends in Figma (plugin import too); the Studio draws one. A LINE with a per-vertex
  cap network was dropped by the paste; BACKLOG asks for a Figma copy of a ⇧L arrow. Experiments stopped once the user
  was active in Figma.
- Page-local components (same BACKLOG item): a probe capture gave Figma's set / variant / property / instance
  encoding; the writer is parked on `zen/wip/studio-native-local-components-20261020` (set and properties pasted right,
  instances unlinked from their pasted main). Later pastes, even a known-good one, stopped landing while the user
  worked in Figma: experiments stopped, every test node removed, BACKLOG says what to try next.
- Gate (Giám sát's slot, 5faa80e7): static ✓, Studio E2E 335 works · 1 broken. The broken row, PT-15 (Present's device
  simulator, a click timeout), works alone right after (`--rows=PT-15`, 63 s); nothing in the change reaches Present.
  Reports `.qa/reports/2026-10-19T18-30-20-ee53b0aa.md`, `.qa/studio-e2e/2026-10-19T18-58-10.md`. Main 7db4c184 merged
  after it (#155, compile.mjs only).

## AppShell rebuilt from scratch on Figma's AppShell patterns (tier L, branch zen/feat/appshell-patterns-20261019)

User: "đập appshell hiện có ra làm lại từ đầu"; answers "Phá hẳn, migrate hết" (no aliases) and "Màn hình + templates".
Then "Các example Appshell nên build như trong Figma ◇ Master-Layout · Example".

- **Library:**
  - AppShell is rewritten: `pattern` (6 desktop structures), `collapse`, the mobile pattern (`mobileTop`, `hero`,
    `backdrop`, `actionBar`), `layout` desktop | drawer | mobile.
  - New AppShellHeader (Header/AppShell) and AppShellPane.
  - ActionBar `surface="glass"`; TopNavigation `transparent` / `transparent-on-color`; Sidebar `toggleHere`.
  - Spec and migration map: `docs/research/appshell-rebuild-2026-10-19.md`.
- **Harness and docs:**
  - The app-shell rules are rewritten, and two are new: `collapse-beside-master-crumb` and `pattern-parts`.
  - Guideline entry with 2 Do/Don't visuals; component-usage-rules §17, AGENTS.consumer, the responsive skill and
    getting-started are updated.
- **Consumers migrated:** the 7 templates and HR (agents), the appLayer shell (agent), and the platform page `app-shell`.
  - That page's sections A–F (41 screens) are files under `examples/pages/app-shell/`, one agent per 3–4 screens.
  - The 16 behaviour examples stay until the sections land.
- **Studio:**
  - The Screen section's parts have a host (`screen-chrome.mjs`: shell or header).
  - `migrateAppShellProps` moves saved pages to the new props on load.
  - The phone header is derived from the AppShellHeader.
  - Figma push and pull write the AppShellHeader. The Body keeps Figma's Margin-Comfortable padding in both directions:
    no doubled padding Stack.
  - The slots registry, cloning.json (sidePanel, topNavigation), builder.css and drag selectors are updated, as are the
    E2E fixtures B-39/41/42, SP-22 and HO-10.
- **Checks so far:**
  - All 54 `studio:selftest` steps pass.
  - The app-shell interaction tests pass (38/38).
  - tsc is clean outside the example files still being written.
- **Wave 2 and component parity (afternoon):**
  - All 41 Figma screens are built (A–F) from use_figma node dumps, and compared 1:1 beside the Figma screenshots.
  - Fixed at their owners:
    - TopNavigation: a centred title with a subtitle, and the Control-Bar size.
    - BottomNavigation: the floating-glass selected tab.
    - AppShell: the media spacer and backdrop Image, the Focus stepper at 200 per step, a Transparent bar on the page
      canvas, the floating clearance in tokens.
    - Sidebar: `shadow`, and sections 8 apart.
    - MetricCard tile `iconBackground`.
    - ActionBar: the Primary keeps its label (user).
    - New AppShell `band` (user).
  - Harness: primary-in-top-bar allows a header without a Main row; pale-on-canvas reads Band-Sheet / Media sheets.
  - Studio: the push pads the Control frame as the code does; registry slot layouts follow; partProps regenerated.
  - A stale Studio admin draft of app-shell.tsx on :5262 was serving old code. Discarded; the lesson is in memory and
    in the agents' brief.
  - Checks: `npx vitest run` 1098 passed, all studio selftests, usage:selftest.
- **Evening: user answers, photos, phase 3:**
  - TopNavigation capline / subheading, `topBar={false}` and trailing nodes are adopted by D2–D5, E2, E5, E7 and F1–F12.
  - User answers:
    - An Avatar on the mobile top nav is 44.
    - Text on the Accent band is On-Accent, one line with an ellipsis.
    - No Breadcrumbs on mobile: AppShellHeader and PageHeader turn a trail into Back under 744.
    - 26 photos are exported from Figma into `platformMedia`.
  - Phase 3 ("Màn hình"): 26 platform pages had their screen and phone app examples rebuilt on the new shell. Six
    agents worked in waves after two rate-limit stops.
  - Fixed at their owners on the way:
    - SidePanel: Escape is scoped to its AppShell.
    - AppShellHeader: the stack test needs a pixel of slack.
    - Sidebar: labels ellipsize in their grid track.
    - The harness tag reader skips comments.
    - PlatformPhone gives its content the mobile Zen modes, so focus is no longer lost on a phone screen switch.
    - Studio's Assets App shell writes AppShellHeader.
- **Night: finish and merge main:**
  - The conversation group is done, so all 32 Phase-3 pages are on the new shell.
  - User rules, now in the audit and the harness:
    - Contrast by APCA (`apcaPick`, Lc ≥45).
    - h1 ≥ Heading/1 (Display allowed).
    - Gap/3XSmall on the ladder.
  - False positives the new shell exposed were fixed at their checks: sizes under any transform, `.pf-app-frame`
    device, outline after the leading pane, chrome left out of the style count, wordmarks, the nearest shell's canvas.
  - Merged main 02dd4dca (118 commits, 8 conflicts) as 8dd57911. tsc, usage, style, guidelines, ai-ui, ai-kit and mcp
    are green; vitest has 1126 passed; all 67 studio selftests pass.
  - Gate plan agreed with the supervisor:
    - the scoped `qa --isolated` on the 211 changed files (41 pages);
    - `platform:audit --quality` on the other 39 pages;
    - the full Studio E2E;
    - then the PR.
- **Gate 2026-10-20, 02:00–03:05 (the supervisor's slot): FAIL.** Report `.qa/reports/2026-10-19T18-59-47-26060f06.md`.
  - Static: all green, including the full vitest and every Figma contract.
  - Platform audit: shard 2 started with app-shell (41 screens × 1512/390/320, smoke, density) and hit the 30 min cap,
    so it wrote no report. The next run uses `ZEN_QA_SHARDS=4`.
  - Behaviour found two problems, both fixed at their owners:
    - Sidebar with `brand` + `logoCollapsed`: the collapse button remounted when the brand gave way to the rail mark,
      so focus was lost and aria-expanded stayed stale. It is now the header's second child in both states. A
      regression test fails on the old code.
    - Avatar's self row offered only disabled menu items; it now offers Edit your profile.
    - app-shell joins the behaviour probe's HEAVY_PAGES.
  - Studio E2E: 315 works · 21 broken, all on this branch.
    - LB-03, LB-05, AI-*, AG-* read the blank desktop page's content Stack as `padding="xl"`. Inside the master layout
      the AppShell Body pads, so that Stack is unpadded; the rows now accept both.
    - MC-02 (Layers row timeout) waits for a row re-run.
  - Contact sheets at 390, plus two fixes:
    - The B4 artboard was a fixed 390 and overflowed a phone column; it now fills, up to 390.
    - B5's three labelled links sat at the row's edge; in the drawer layout Changelog and Community move into More.
  - Also fixed: page-header Nested pages hid its trail by hand under 480. It now passes the full trail, and PageHeader
    turns it into Back on a phone.
  - Merged main 36c866ce (#156, #157). Conflicts in CHANGELOG and this log were resolved keeping both sides. tsc, all
    67 studio selftests and the E2E selftest are green.
- **Open:**
  - Image has no frameless option for the E1 mascot; this needs the user's approval for a new prop.
  - Designer questions:
    - E7 Segmented on black-overlay: the Figma node fails there.
    - F4 vacuum crop.
    - Card spacing xs (a new API).
  - `src/platform/examples/pages/progress.tsx` has two `layout="stacked"` edits of unknown origin. Left out of this
    change.
