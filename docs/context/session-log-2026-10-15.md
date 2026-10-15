# Session log 2026-10-15

## Figma descriptions of the property-panel sets (tier XS, user: "cập nhật mô tả Figma cho 5 bộ mới")

- `tools/figma-docs/component-descriptions.mjs`: Input/Inline-Field, Input/Color-Field, Color-Picker,
  .Primitives/Input/Color-Swatch, Slider/Field, Chart/Curve-Preview, from the designer's Figma drafts and the
  guidelines (color-picker, slider-field, curve-preview); in FORCE (they replace the specific drafts); Color-Swatch in
  `build.mjs` EXTRA (a private set the contract leaves out).
- Written with `build.mjs sets "…"` (6 written); Color-Picker's four Format variants held a copy of the draft: cleared,
  the set holds the text. Old texts in "Description backup 2026-10-15" (15741:3) on 🔒 ARCHIVED: review, delete, publish.
- Read back: no "Draft", a Code line each, no `&amp;`.

## Segmented component-size tokens (tier XS, user: "update lại tokens component size của segmented", "update theo figma")

- Live read of Component Size `Segmented/*`: Size unchanged (Medium 36 / 44, Small 28 / 36). Changed since the
  2026-10-14 capture: Spacing Medium/Small Gap → 0 (was dm-4 / dm-2), Text-Wrapper-Padding → dm-8 (was dm-4);
  Spacing/XSmall/* gone from Figma → removed (no consumer). Studio mode = Compact.
- `component-size.json`, tokens:build (web + native), segmented.css fallbacks; contract of Primitives/Segmented/Item and
  Segmented re-captured (mcp-capture, 1 call): only padding 4 → 8, gap → 0 and widths; contracts.lock rebuilt.

## Accordion Size=Small (tier M, user: "làm Accordion size Small"; spec "Bậc giữa, thoáng hơn")

- Figma (9nZv4uW2LT21yuHabMTCh1): .Primitives/Accordion/Content +4 Small variants (cloned from Medium; SLOT and Title
  refs restored, Body/Base/Bold title, Body/Small/Regular content, Contents Gap/Small; Full: title hugs its lines,
  Chevron-Space 20 with no inset, row gap Gap/Small). Accordion/Text +8 Small variants in grid rows 12–15 (nested
  primitive Size=Small, padding Padding/Small, Container gap Gap/Small, Wrapper inset 0, Box Corner-Radius/Base).
  Collapsed 44, open 104. Descriptions: Accordion/Text via tools/figma-docs (FORCE), primitive by hand; backups in
  "Description backup 2026-10-15".
- Code: `size` small/sm (titleStyle, contentStyle per size; CSS Small block), guideline Size and Contents rows,
  component-properties Size options, Studio maps regenerated, example Layer settings (Small in a panel).
- Fixed (user: "sửa luôn"): the primitive's 8 Content Width=Full variants had no Title text-property reference → linked
  to Title#239:80 (16 nested instances, none customised, all read the property).
- Box border (user removed it in Figma, 2026-10-15): all 16 Box roots of Accordion/Text, Small included, have no stroke;
  Divider keeps its bottom Pale rule. Code draws none on Box, so nothing changes; BACKLOG P3 designer question closed,
  Accordion JSDoc: Divider rule Pale (was Subtle), Box no border.

## Zen Studio as Figma UI3 floating panels (tier L, user: "đổi UI Zen Studio về giống như UI floating của UI3")

Decisions (user picked every recommendation): toolbar removed as in UI3; Inline-Field Type=Number in Figma first;
colour = swatch + token name (no free hex); SliderField only for number props with a known min–max; component size stays
the Studio mode; Emphasis Light.
- Figma (file 9nZv…, published by the user): Input/Inline-Field + 8 variants Type=Number (Text clones, Field Trailing on,
  swapped to `.Primitives/Input/Number/Trailing`, value 12, Disabled steppers State=Disabled), set 1448×616; description
  and doc frame text updated (repo source `tools/figma-docs/component-descriptions.mjs` same). Fixed on the way:
  Number/Trailing's − button bound Neutral/Strongest (old swap) → fresh instance, Button-Tertiary/Content like +.
- Shell: `studio.css` — canvas area `inset: 0`, panels absolute (Spacing/Padding/XSmall from the edges, Corner-Radius
  XLarge, the popover edge and shadow); both panels full height (a hugging Inspector left its option lists no room: B-15/B-16 found the Select list cut off above it). `--studio-inset-
  left/right` = what docked panels cover: the overlay portal, canvas tools and "?" sit in the rest; a document page's
  canvas area starts after the left panel. `PanelHeaders.tsx` replaces `Toolbar.tsx` (brand menu = mark + chevron, holds
  light/dark; Document | Studio fills the left header; role · undo/redo · drafts head the Inspector; `CollapsedLeftBar` /
  `CollapsedRightBar` when not docked). Drafts density `panel` (count + Save all). Zoom menu on the Inspector tab row.
- Canvas: `setCanvasInsets` (StudioApp measures the docked panels with a ResizeObserver) and `getSafeBox`; `viewportFor`,
  zoom centre, `ensureVisible`, `zoomToWidth/Read`, `viewportForWidth`, keep-in-view, FrameChrome's label/toolbar clamps
  and drag edge-pan use the visible part.
- Inspector: `InspectorRow` provides `useInlineLabel()`; TextControl, NumberControl, LinesControl, EnumControl's select,
  NumberEnumControl, Typography, Tone (ColorSwatch at the end, no chevron), Icon, Photo, ScaleField and StaticField draw
  `layout="inline"`; the row hides its label (`:has`) and the field spans both columns. Switches/Segmented keep the label,
  indented by the field inset. Playground selects (platform markup) get the same look by CSS only. `NumberSliderControl`
  (SliderField, write after a 400 ms pause / blur) for `numberRanges.ts`.
- Bug met: EnumControl's Segmented fit used 16px chrome; since #60 it is 24 (label padding 8) → "Stac…" cut. Now read
  from the Segmented tokens, measured against the control column so select ↔ Segmented never flips.
- E2E selectors: openStudioSpace (`.studio-space`), S-02 (zoom on the tab row), S-03, D-01 (drafts button name), G
  chromeText. Checks: tsc, studio:selftest, style:check, usage:check, screenshots 1512/1100/900/390, dark.

## Studio Inspector polish after UI3 (tier S, user screenshots: hint text, Theme, warning padding)

- Row hints (`InspectorRow hint`) sat flush under the field in Body/Small (= the field's 12px): now Zen Input's Help-Text
  — Caption/Regular, Content/Neutral/Light, `Input/Spacing/Small/Outside-Field-Gap` (4px) above. The X/Y caption
  ("Placed by the parent's auto layout") and Position's neutral notes the same.
- Frame › Theme: the three Segmented labels were cut at 320px ("P… L… D…"). First a select; the user then picked the
  Screen Canvas pattern: InspectorFields, label above, the Segmented across both field columns. Only this row; other
  Segmented keep the fit check (a select when the labels would be cut).
- No-effect warnings (GroupedProperties idle notes, Sizing "Align in parent needs…", Position constraint notes) were
  hand-drawn pills (2px padding, radius 16): now `InlineMessage theme="warning"` with the fix as `action`, ending at the
  fields' edge (`.studio-inspector__warning`). Their old CSS removed.
- Screen panel rhythm (user: the switches under Device felt unevenly spaced): an unlabelled InspectorFields row is
  28px (its icon cell) but the field grid aligned to the top, so a 20px labelled Toggle had 8px above and 16px below.
  `.studio-fields:not([data-labelled])` now centres: Device → Sidebar → Page header → Canvas all 8px apart.
- Document | Studio cut to "Docu…" in the left header (dark, user): `SpaceBar` floats at the top centre of the visible
  canvas (`.studio-space-bar`, between --studio-inset-left/right); a phone keeps it in the left drawer. The brand button
  shows "Zen Studio" again (compact in the corner bar and on a phone). Document pages get padding-top 48 + 2 × edge so
  the floating bars no longer cover the hero (the right bar already did since #63).
- Alignment box: padding-block Spacing/Padding/XSmall (dots 18px from top/bottom, 22px from the sides, as Figma's), fill
  Input/Background/Default (Neutral/Pale read paler than the Gap field beside it).
- EnumControl with no fallback: a leading "Default" choice, selected while unset, picking it resets the prop (Stack
  Scroll x | y showed no selection; selects showed "—").
- Action column: the user compared Framer's and Figma's ways (mock shots), kept the column, then asked for Wrap "như cách
  của bạn" and the same for similar modes: Wrap = Flow's third segment (L-01), Grid gap link = commands at the top of the
  gap lists (ScaleField `actions`; L-07). Cross axis was tried as a select under Gap; the user kept the ⚙ menu. Position's ignore-auto-layout toggle, the Effects eye and Restore stay (Figma's places).
- Save all ran out of a 320px Inspector header with drafts: `.studio-right` is container `studio-right`; below 360px with
  drafts the role badge hides (avatar only). Role button: no chevron; its avatar is the signed-in
  person's photo, else their initial (2XSmall: one letter) on a solid hue picked from their id (user: "dùng màu"); the
  person icon only with nobody signed in. Checked with a real draft, then discarded.

## Studio Screen = master layout (tier M, user: "một số [template] làm sai thành bị duplicate 2 sidebar", "trang Dashboard tôi vừa tạo từ template bị lỗi"; chose "Template dùng khung của Screen", "Khung Screen = Master-Layout đầy đủ")

- Cause: the Screen's own app-frame props (`sidebar`, `header`, drawn by builder/proto/runtime.tsx) sat beside a
  template's AppShell, so Screen › Sidebar on a page from a template drew a second Sidebar (Figma was right).
- Now the desktop frame is one root `<AppShell>` (tools/studio/screen-frame.mjs): op `screenFrame` (jsx-source.mjs,
  alone, on a Screen) switches `FRAME_PARTS` (sidebar, header, headerActions, sections, aside, floatingAction, footer;
  screen-chrome.mjs, import-free for the client) on that AppShell, wrapping the content on the first part and unwrapping
  on the last; imports follow. FramePanel's desktop toggles read and write it; the mobile toggles are unchanged. Page
  header also reads a PageHeader in the AppShell's content (where the templates keep it): off removes that one, so on
  never adds a second.
- `migrateScreenFrame` runs when a page opens (localApi.ts ensurePageDoc → moveScreenFrame, on the text and on the print
  with ids, so ids and Figma links stay): the Screen's Sidebar → AppShell `sidebar` unless it has one, its PageHeader →
  `sections` unless a PageHeader is already there. New desktop pages and Screens start that way (dialect.mjs
  screenLines); a phone Screen starts without the AppShell.
- Mobile layout: runtime Screen, compile.mjs and figma-push.mjs draw a lone root AppShell's content only (no top bar or
  drawer under the Top/Bottom navigation). The Screen's own Header slot is gone (registry.ts): the AppShell's Sections is
  the free header now.
- Tests: screen-frame.selftest.mjs (19, in studio:selftest), builder.selftest app-frame block rewritten (56),
  compile.selftest (37), figma-push.selftest phone check (245), engine-iso lists the two modules. E2E: B-26 (a tablet's
  desktop layout shows AppShell's drawer button: AppShell's own < 1024 breakpoint), B-28 (AppShell › Sections), HO-08
  (its fixture is a pre-master-layout page), new B-36 (a two-Sidebar page from before opens with one, the template's) and
  SP-22 (Dashboard template: toggles read its parts; Page header off → none, on → one). A probe over the 12 desktop
  templates: 1 AppShell, 1 Sidebar, no Screen props each, the toggles reading the template's parts.
- Found on the way, fixed: the HTML export dropped VisuallyHidden's rule (htmlExport.tsx usedBy stripped `:focus-within`
  inside `:not(…)`, inverting it), so AppShell's "Skip to content" showed and shifted the page 20px (HO-08 0.50% → 0.00%).

## Studio free frames: move, ⌥-copy, draw (tier M, user: "canvas của studio tự do hơn. Giống Figma. Có thể vẽ frame, kéo frame đi mọi nơi", "cho phép copy", "bấm option và hold kéo để duplicate frame giống figma")

- Scope: pages you made (Studio space). Component (Document) pages keep their generated layout (StudioBoard
  auto layout; StudioFrame.tsx / board.css were held by the Preview session) — not free yet, asked the user.
- Data: `x` / `y` on a Board's Screen / Overlay, `width` / `height` on a drawn Screen (dialect.mjs validates them, numbers,
  x and y together, no size on an Overlay; frameCode writes them; Screen/Overlay runtime drops them, `height` = least
  height). Export/compile never read them. Frames without a place keep the old row (96 apart) right of the placed
  ones (`builder/render/framePlace.ts` placeFrames + snapBox, selftest 12); a move pins the row in the same edit
  (`many setProps`), an added frame (copy, Frame tool) pins it first (one more undo step, old pages only).
- Gestures (`builder/frameMove.ts`): drag by the name label (FrameChrome) or on a selected frame (SelectionLayer, a
  click there still picks the layer); 3 px threshold, red smart guides (edges/centres, 6 screen px; ⌘ off), ⇧ one
  axis, ⌥ copy (switches mid-drag), Esc back, edge pan. Toolbar Screen → Frame: drag = Screen of that size (device
  from its width, no app frame; ⇧ square, ⌥ from centre), click = device Screen at the point. Keys
  (`builder/frameKeys.ts`, capture phase, frame selection only): ⌘D beside (past frames in the way), ⌘C / ⌘V (other
  pages too), arrows 1 / 10 px settled in one edit after 400 ms. Writes in `builder/frameEdit.ts`. A selected frame
  the page lost (⌘Z of a copy) is deselected. `board/frames.ts onFramesMoved` tells FrameChrome (and ProtoLinks in
  the Prototype session's branch) to re-measure.
- Bug met on the way: the live drag notified the canvas, whose listeners re-entered the drag update (stack overflow);
  guarded.
- Probes (Playwright, own Vite on 5186 without the Studio plugin, pages in the browser only): move + row pins, ⌥ copy
  at the drop, draw 270×371 phone Screen, ⌘D, nudge 10+1, ⌘C ⌘V, ⌘Z; label click selects only, click inside a selected
  frame selects the layer, body drag moves, Esc restores with no write, ⇧ keeps y, component page label drag moves
  nothing; 0 page errors. Selftests: builder 50/50 (new free-frame block), framePlace 12/12. E2E B-20 now drives Frame; new row B-37 (move by name, ⌥ copy, ⌘Z).
- Gate PASS (`--isolated --files=…`, 19 files): style, usage, Studio selftests, guidelines, tsc; Studio E2E 268 works ·
  0 broken.
- User's answers: F = Frame tool (Present → ⌥⌘↵, Figma's: StudioApp keys, labels via `shell/modKey.ts presentShortcut`,
  CanvasMenu, ShortcutsDialog, FrameChrome / FramePanel aria-keyshortcuts, Quick actions, E2E O-03 / S-03); component
  pages stay as they are; ship as a PR (worktree `../Zen-DS-freeframes`, branch from main 8471be9).

## Self-managed state for template pages in Studio (tier M, user: "chip advance, date input… hoạt động như bình thường trong studio"; chose B + the lock fix)

- Cause: "New page from this frame" keeps literals only (handlers go), so state a parent held froze; and a controlled
  prop without a `default…` twin stayed a literal that locked the control (snapshot.ts twin rule).
- Chip: `popoverItems` without `onPopoverSelect`/`onPopoverCreate` = the chip keeps the choice (start: items marked
  `selected`; key = the start props, so a Studio edit restarts it): label = the one picked value (+ its photo/icon),
  count for multiple, × / Delete clear; placeholder = children, or `popoverLabel` when the label was the start value.
  Picks make it Selected only for a filter chip (`selected`/`defaultSelected` given, or nothing picked at first): the
  Dashboard's Period chip starts on a value without `selected` and only changes it (SP-15 caught the first version).
  `defaultSelected` (Normal/Number-only toggle themselves, Advanced clears itself), `defaultPopoverOpen`. No
  `onSelectedChange`: the harness pairs on<P>Change with P and would flag every `selected` + onClick chip.
- Pagination `page` optional + `defaultPage`, `defaultPageSize` (resize keeps the first row, as the examples do);
  Stepper `defaultCurrent` (Passed steps go back); SelectField `defaultPopoverOpen`.
- Found on the way, fixed: DateField's API had no `extends` (`type DateFieldProps = InputFieldProps & {…}`), so the
  snapshot kept `value=""` and a picked day never showed. build-api `extendsOf` follows a same-file props type (only
  DateField changed). figma-push reads the twin (`defaultChecked`/`defaultSelected` → Select=Yes; Checkbox had it too).
- part-props-build: after `??` own state in front of a prop (an Identifier) passes the prop on (`usedItems ??
  popoverItems`), so Chip Popover items / Avatar src and Pagination pageSize keep their part mapping; adds ColorPicker
  ChannelField value (`draft ?? value`, same meaning). A broader alias/`||` version was tried and dropped: it added ~15
  mappings, one harmful (Popover open → popoverOpen would lock it).
- Harness `chip/multiple-needs-count` skips a chip that counts itself (fixtures updated). Guidelines rows for the three.
- Tests: tests/interaction/self-managed-state.test.tsx (11); Studio E2E SP-23 (Admin list filter chip in Interact:
  "Role" → "Owner" → "Role, 2 applied" → cleared), SP-24 (Dashboard New project DateField: calendar, 15th fills it);
  part-props and figma-push selftests; starters coverage 46/46 with compile; npm test 910 passed.
- Still needs option C (not built): links between components (a chip that opens a DatePicker or BottomSheet, a filter
  that filters a Table, Next on a Stepper).

## Present / Play viewport: Auto · Desktop · Tablet · Phone · W × H, drag to resize (tier S, user: "trong present của trang thiết kế, nên cho chọn các view desktop, tablet, mobile, hoặc số điền tự do để preview" + "cho phép User nắm góc kéo không?")

- Spec: a Viewport button on the Present/Play bar (PresentBar; icon + "Viewport" / device / "W × H", IconButton on a
  phone) opens a bar panel: Segmented Auto · Desktop · Tablet · Phone (Play's DEVICE_WIDTH at 900 / 1024 / 844 high),
  then NumberField inline W and H (200–4096 px, empty H = Fill the window). A fixed size renders the example in a box
  of that many CSS px (`board/presentViewport.tsx` useViewportFit): overlay root (Dialog/SidePanel/Menu open inside),
  `contain: layout` (a presented desktop screen fills the box), scaled down from its top-left to fit the window, never
  up; panel caption "W × H at N%". Auto keeps the old layout (the wrappers are `display: contents`, same tree, so a
  switch keeps the example's state). Present resets it on exit like its modes; Play keeps it through Restart.
- Drag (ViewportHandles, the canvas frame edge's pattern): right edge = W (×2, the box is centred), bottom = H, corner
  both; Info-blue ring + grips on hover/drag, size tag at the box's bottom, Shift snaps to 8, Esc restores (Present and
  Play leave Escape to a drag: `presentEscapeOwners`), double-click → Auto, result announced; hidden from AT (W/H fields
  are the keyboard way). With the panel open its middle covers the bottom grip (the strip still takes the rest).
- Checked with Playwright on :5173 (Present on button: Phone 390×844, Desktop at 98%, 1000×Fill, clamp 50→200, ‹ ›
  keeps it, Esc closes panel then exits; drag +50 → 490, −100 → 744, corner+Shift → 400×784, Esc mid-drag restores
  without leaving Present, double-click → Auto; Play on local:dashboard-7: Tablet 768×1024 at 87%, Restart keeps it).
  No page errors. Gate: usage-guard `layer/canvas-is-page` on the box → `zen-allow-canvas-layer` (the box is the
  presented screen's page, as Present's layer).
- Fix (user: "kéo frame nhưng số kích thước vẫn giữ nguyên và ngược lại", screenshot: toolbar 1341, Inspector "Auto
  (1440px)" on local:admin-list-team-members-3): FramePanel built its frameOverrides key as `pageKey(page, collection)`,
  the board (StudioFrame, FrameChrome, Present) as `pageKey(page, collection, localPage)`; on a builder page the
  Inspector read and wrote `<platform page>` while the frame used `local:<id>` (Theme was dead there too). FramePanel now
  reads the board's key. Playwright: edge drag → Width "1329 (custom)"; Width 1024 → frame 1024px, toolbar 1024.
- Interact overlays (user: drop Interact because zoomed out "popover sẽ lỗi, modal hiện ngoài frame" → "nếu có [cách
  fix] thì không cần bỏ"). Repro (Playwright, 50%): Dialog at 100% centred on the canvas over many frames; Menu and
  Toast at 100% beside a 50% frame. Cause: every example portalled into the one unscaled canvas-area layer. Fix:
  StudioFrame is `data-zen-overlay-root` (Dialog/ModalForm/SidePanel/Menu/Chat open in it) and has its own portal
  layer `.studio-frame__portal` (ZenPortal users: Popover, Tooltip, toasts; `contain: layout`), both in the world; a
  frame holding a contained modal gets min-height 720 (board re-measures). Library, at the owner: positions inside a
  scaled container were written in viewport px — `useAnchoredPosition` now converts through the container's scale
  (as Menu did; shift into view allowed again there), and the fixed layers (Tooltip, Sidebar rail tooltip, Table
  editor bubble) go through `fixedLayerSpace` (`_shared/layer-space.ts`: nearest transform/contain/container block;
  identity on a normal page). After (50%): Dialog inside its frame, Menu/Toast/date-range popover/Tooltip at the
  frame's scale on their anchors (tooltip centred, 4 screen px = 8 × 0.5 above). E2E O-01..O-04 4/0.
- Gate PASS (14 files; Vitest 66/66 after rewriting the scaled-frame test, which asserted the old unit mix: left 500 in
  a 0.5 frame = half-way off the anchor; now "under its anchor" + "shifted into view" + fixedLayerSpace cases). Contact
  sheet tooltip-390 "A tip on a phone": the closable tip was cut at the phone screen's left edge, the same in the
  2026-10-14 sheet (pre-existing). Fixed at the owner: an explicit top/bottom Tooltip measures itself against
  visibleBounds (now exported from useAnchoredPosition) and shifts by `--zen-tooltip-shift`, 4px in.
## Studio Prototype usability (tier M, user: "Nâng cấp Usability của tính năng Prototype của Studio")

- Walk first (private E2E-style server on the worktree, Playwright): a Button → Screen 2 took select + tab + 2 picks;
  no drag to connect, arrows not clickable, the tab read `onClick`, Flow rows inert, a tab bar's tabs could not lead to
  different screens (one `onValueChange` for the bar; a SidebarMenuItem "takes no clicks"), Play gave no hint where to
  press and named the screen twice.
- Branch `zen/feat/prototype-usability-20261015`, worktree `../Zen-DS-proto` (the shared checkout had the Canvas session's
  frame-placement work in progress: frames stacked mid-edit). `builder/proto/`: `protoModel.ts` (pure: frames, links,
  trigger words, choice items, per-item code; selftest 18 in studio:selftest), `protoTriggers.ts` (API triggers,
  `protoSubject`: an item layer edits its control), `protoEdit.ts` (one edit per action), `protoDom.ts` (item elements
  by label, layer elements through React — BottomNavigation keeps the mark off its DOM — selected-item store).
- Canvas (`ProtoLinks.tsx`): a screen-space layer portalled into the viewport (z 15: above Select, below frame chrome);
  ⊕ drag → Navigate to / Open overlay; arrow click selects its layer; selected arrows' ends drag to retarget, off every
  frame to remove; a press on ⊕ opens the action list; Esc cancels. Items in a row (tabs) get ⊕ inside by their right
  edge and arrows from their top.
- Per item: `proto.navigate|open({ item: target })`; `runtime.tsx protoHandler` picks by the value or the item's id
  (`onItemClick(item)`); `compile.mjs` writes `choiceKey` + a typed map (compile selftest "by item", tsc-checked);
  handoff.md lists each item. Play hotspots (`Player.tsx`): what leads somewhere (a tab bar's linked tabs only), the
  control's own corners, fade = Motion/Duration/Slow × 3.
- E2E: new group `prototype` PT-01…PT-05 (⊕, arrow click, end drag/remove, ⌘Z; tab bar by item; hints; Flow; Sidebar
  row); B-17 picks the overlay by its title. Not merged with the Canvas session's `onFramesMoved` (not on main yet):
  ProtoLinks re-measures on frame style/size changes; subscribe to `onFramesMoved` once it lands.

## Studio Prototype, round 2 (tier M, user approved the P2 list: "ok")

- Branch brought up to origin/main b20fe50 (#68 free frames, #69 Present/Play viewport): stash, fast-forward, pop;
  conflicts in Player.tsx (viewport + hotspots kept), package.json, docs (both sides kept). ProtoLinks now follows
  `onFramesMoved`; Overlay frames are named by what they show (render/frames.ts via protoModel `overlayTitleOf`).
- Options as the action's second argument (`proto.navigate("x", { animation, direction, duration, delay })`; close / back
  take them first); defaults (Dissolve, left, base) are not written. `protoModel` ANIMATIONS / optionsOf /
  protoActionCode (protoEdit no longer goes through the engine's protoCode). Play (`Player.tsx`, `playMotion.ts`): the
  frame going away stays drawn until its motion ends (onAnimationEnd, 700 ms fallback); distances × Motion/Movement,
  durations Motion/Duration/*; Back runs the popped step backwards.
- After delay: Screen `onDelay` (stripped in renderPage; Play runs it per visit). While hovering: `whileHovering` on a
  layer that takes DOM props, Open overlay only; renderPage turns it into pointer enter / leave only where the actions
  carry `hover` (Play), so the canvas never opens overlays under the pointer; a hover overlay lets the pointer through.
- Overlay settings on the Overlay element (`position`, `closeOnOutside`, `background`), for layers that do not open
  themselves (`placesItself` = an `open` prop; compile-api-build writes OPENS for the export). Canvas and Play place the
  layer the same way (`.studio-builder-overlay__place`, `.studio-player__overlay`). Add overlay is a menu (Dialog ·
  Bottom sheet · Side panel · Card; dialect `frameCode` `holds`); an empty Overlay is a drop target (drag.ts) and a
  selected Overlay frame an insert target (target.ts; refuses when it already shows a layer).
- Export: After delay → useEffect per screen, While hovering → onPointerEnter / onPointerLeave, a custom overlay →
  `{overlay === "x" && (…)}` with its place in a comment and a TODO line; handoff lists animation and delay.
- Tests: protoModel selftest 26, compile selftest 50 (tsc on the outputs), E2E PT-06…PT-10 (Push options + backwards,
  After delay 300 ms, While hovering, Card overlay top right + dim + outside press, emptied Overlay takes a Card);
  B-14/B-17, PT-01/PT-04 pick "Dialog" from Add overlay.

## Clip content: overlays stay inside their frame (tier S, user: 720 → "Có", Popover tràn ra ngoài frame → "Không")

- `.studio-frame { overflow: clip }` (board.css). Clipping alone left popovers in short example frames unusable (the
  date-range calendar lost its last row and Cancel/Submit; Assign people flipped up and was mostly cut), so the 720px
  rule now also covers anchored surfaces in example frames (`.zen-popover[data-side]`, `.zen-menu`, Date/Colour Picker
  `[data-side]`); `:has()` is resolved before the popover measures, so it opens below its anchor, whole. Playground
  frames are left out (the Popover playground's open specimen made it 720 tall with empty space).
- IconTooltipLayer flips/clamps against `visibleBounds(space.block)`: `fixedLayerSpace` now returns the fixed
  containing block, since a fixed layer is clipped only from there up (identity on a normal page).
- Checked (Playwright, 50%): Menu inside its frame; date-range popover and Assign people whole inside a grown frame;
  icon tooltip unchanged; 27 pages scanned at rest: no visible content cut by the clip, no example frame grown at rest.
