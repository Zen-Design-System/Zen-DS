# Session log 2026-10-09

## DockIcon re-sync from Figma (tier M)

- Live Dock-Icon 308:45902 (page ❖ Dock Icon 298:45468), read with use_figma (read-only). Axes: Size XSmall · Small ·
  Medium · Large · XLarge · 2XLarge; 25 themes; Solid/Subtle. Sizes: 24/12 · 32/16 · 40/20 · 48/28 (Image-Size/Large,
  Popular/Large) · 56/28 (Image-Size/XLarge) · 80/44 (Image-Size/2XLarge, Popular/2XLarge); radius Corner-Radius/Rounded.
  Paints: every fill/content binding matched the code except Accent/Solid content = Color/Content/On-Colors.
  Emoji: Medium 40 + Heading/1, Large 48 + Display/3 (unchanged).
- Code: `dockIconSizes` + `2xlarge`, CSS large 48 / xlarge 56 / 2xlarge 80, accent solid → content-on-colors. Metric's
  Figma instance is Dock-Icon Large 48 (MetricWidget JSDoc updated). Docs examples kept their size (lg→xl, xl→2xl).
- Figma-side issue (not edited, read-only): the set reports errors — 22 "Size=Large, …" variants are 80px duplicates
  (Subtle themes + On-Color/Surface Solid) that should be named Size=2XLarge (component property definitions throw).
- Re-check after the user's Figma update: the set is clean (no duplicate names, property definitions readable, 266
  variants = 44 per size + Emoji at Medium/Large). Sizes, radius, glyph bindings and all 46 Theme/Background paints match
  the code as re-synced above; nothing to change. Not adopted: Figma's default variant (Size=2XLarge, Icon-Src
  icon-home-03-solid) — the code keeps `size="md"` and `icon-star-93-solid` as API defaults. Backlog Figma item removed.
- User updated Figma again: Size=Large glyph is now 24 (Element-Size/Popular/Medium, was 28 Popular/Large); the other
  sizes unchanged (re-read live). dock-icon.css large glyph → popular-medium; JSDoc, guideline and CHANGELOG updated.

## Zen Studio: spaces, folders, visual New page, modes in Play/Present (user request, tier L: Studio chrome)

- Pushed `65d9cb7` + `2d23cae` to PR #7 first (user's step 1).
- Modes: `Toolbar` drops ModesMenu (light/dark stays); `ModesMenu.tsx` keeps `PreviewModeFields`; PagePanel's "Change"
  link removed. `PresentBar` gets optional stepping, `leading` and `modesScope`; `Player` uses it (Back · Restart ·
  light/dark · Modes · Exit) with Play's own modes over the canvas modes (`previewAttributes` on the layer). E2E S-03:
  no toolbar Modes, Present's panel on screen.
- Spaces: `StudioState.space` (session + `?space=studio`); `navigate` → document, `openLocalPage` → studio, `setSpace`
  reopens the last builder page if it still exists. Toolbar Segmented "Space" (Document | Studio) replaces the
  breadcrumb (`breadcrumbsFor`, `revealSection` removed). StudioApp: Studio with no page = `StudioHome` (EmptyState: New
  page / New folder), no canvas or inspector (treated like a doc page).
- Folders: `folderStore.ts` (SETTINGS key "folders"; create/rename/delete → its pages to the Trash; BroadcastChannel);
  `PageRecord.folder`, `putPage({ folder })` keeps the folder on writes, `movePage`, duplicate keeps it. PagesPanel by
  space; Studio = MyPagesHeader ("Folders", New folder, New page, "Studio options") + `StudioFolderTree` (folder rows
  with chevron, count, + and ⋯; nested page rows; "Not in a folder"). Page rows: "Move to" menu group. Trashing the open
  page stays in Studio. Limitation: mirrors (.zen-studio/pages, a linked folder) do not carry folders.
- New page: a wide Dialog (not ModalForm: thumbnails are live templates, some with a <form>), Start from = radio cards
  (Blank placeholder + `TemplateThumb`: the template at 1440/390 scaled into the card, rendered when scrolled into
  view, inert), Device = radio cards drawn 9:19.5 / 3:4 / 16:10 with widths; Enter in Title creates; `folder` prop.
- E2E: `openStudioSpace` helper; New page / Studio options / radio selections updated in builder, starters, build-check.
  Generated `compile-api.generated.mjs` and `library/keywords.generated.ts` were stale from earlier commits: rebuilt.
- Gate round 1: usage-guard (`.studio-home` painted Canvas → removed, the canvas area paints it; blank placeholder
  border → Pale) and stale generated files. Round 2: Studio E2E 136/142 — HO-03…07 (the Import input lives in the Studio
  space's header: `openStudioSpace` before it) and B-11 (`showLeftTab("pages")` clicked a tab the Studio home does not
  have: it now waits for the tab-less Pages panel).
- User: "the modes popover lacks the popover effect". The panel already had Effect/Popover (shadow, blur 20, Popover
  border/background, measured); it lacked the Popover open motion: `.platform-fullscreen-bar__panel` now runs
  zen-motion-pop-in (from below, origin bottom centre; reduced motion: fade).
- User: still wrong (screenshot: the panel's text read through). Cause: the panel was a child of the pill, whose
  backdrop-filter made the pill its backdrop root, so the panel's blur(20) never reached the screen behind. Fix:
  `FullScreenBar` renders a `.platform-fullscreen-dock` (fixed, no paint, pointer-events none) holding the panel and the
  pill as siblings; the pill and panel take presses. Measured: panel parent backdrop none, panel blur(20px), the phone
  behind frosted. The panel was already in the Studio chrome modes (Neutral-S7 · Compact · Dashboard, 32px controls).
- User: in Play / Present the Studio UI keeps its own modes, only the example changes. (1) Light/dark there changed the
  Studio theme (`setStudioTheme`, or a frame override): now Present's and Play's own `theme`, like the other modes; the
  Studio theme and frame overrides stay. (2) `ChromeScope` set theme/component theme/density/typography but not
  radius/emphasis/contrast, so the bar and the Modes panel took the example's: `chromeModes` (+ `useChromeAttributes`)
  now set all seven. Measured in Present: example dark + Luxury; the bar light, rounded, S7, compact; Studio light after.

## Studio chrome scale: token modes "Studio" (user request, tier L: token source + Studio chrome)

- Committed + pushed the Studio work first (`e09b535`). User's rules: keep Zen tokens, principles and components; only
  add modes (Component Size, Typography Configuration — and, after a follow-up, Corner Radius) and adapt them to the
  request (base 13, Figma UI3 scale, components 24 · 28 · 32, smaller corners as components shrink).
- Token sources: mode "Studio" appended to `component-size.json` (Compact + Button 20/24/28/32/40/48, icons 12/12/16/16/
  20/24, Input 28/32/40/48 + headings 36/32/28, Chip 24/28/32, Select-Item 24/28, Segmented 24/28, Tab 28/32, Table
  40/32, Element-Size Base 16 · Medium 20 · Large 24, vertical paddings to the new heights), `typography-configuration
  .json` (Dashboard + Caption 11/16, Body-Small 12/16, Body-Base 13/20, Body-Extra 15/22, Subheading 15/22, Heading-4
  18/24 … Heading-1 24/32, Display scaled, button labels 15/13/13/12/11, caps 12/11) and `corner-radius.json` (Standard +
  2XSmall 2 · XSmall 4 · Small 6 · Base 8 · Large 12…, Action 6/6/8/8/12 with focus +6, Input 6/8/8/12, Rounded 1000).
  `figma.collections.json` modes + a repo-only note. `zenDensities` / `zenTypographies` / `zenRadii` + "studio".
- `ChromeScope.chromeModes`: density / typography / radius "studio". Example mode pickers list their values explicitly,
  so "studio" never appears there. Measured: inspector select 28px r6, segmented 24px, tabs 28px.
- Follow-up (user): Studio corners = Rounded, the others scaled with the current scale. `corner-radius.json` Studio is now
  Rounded ×0.8 (the controls' 40 → 32): 2XSmall 2 · XSmall 4 · Small 6 · Base 10 · Large 12 · XLarge 16 · 2XLarge 20 ·
  3XLarge 22 · Giant 26 · XGiant 28; Input 10 · 10 · 12 · 12; Action, Focus and Rounded stay 1000 (pills).
- Static gates on the first build (before the radius follow-up): style / usage guard, Studio selftests, tokens:check,
  tsc, Vitest 30/30, Figma contracts 23/23 + interactions.

## Inspector: one input pattern, no per-field reset; list rows on Corner-Radius/Base (user, tier S)

- Removed every per-field reset button (PropField "Reset … to default", DesignPanel text style, HostTextAlignment,
  PositionSection offsets, LayoutSection direction / alignment, SizingSection align in parent) and the empty slots that
  reserved 24px. Defaults stay reachable inside the controls (TypographyControl "None", Position "none", IconToggle
  "Default", ScaleField Backspace) or with Reset all overrides; Restore-a-binding stays (it is not a default).
- `InspectorRow` renders its action column only with an action (`data-action`); `.studio-layout-group__row` and
  `.studio-sizing__pair` add the slot column with `:has(> slot)`; Min and max shows its slot only with menu items.
  Measured: every property / content / attribute control ends at the same right edge (1500px at 1512).
- User: "an input's corner and a sidebar item's should match in Zen" — they do (Input/Medium and Base: 12 Rounded, 10
  Studio). The Studio's own list rows (Pages, Layers, Assets, Quick insert, inspector items) were on Small / XSmall:
  now Corner-Radius/Base like the Zen Sidebar item.
- Gate for the Studio modes (before these edits): PASS, Studio E2E 142/142; warnings pre-existing (inline-message
  "Copy value" dead click added to BACKLOG).
- Corner ladder: ×0.8 broke Zen's concentric rule (Rounded climbs +4 a step, so a 4px inset nests; ×0.8 gave Base 10 /
  Large 12). Then the user: "base 8". Studio radius now 2XS 2 · XS 4 · S 6 · Base 8 · L 12 · XL 16 · 2XL 20 · 3XL 24 ·
  Giant 28 · XGiant 32; Input 8 · 8 · 12 · 12; actions, focus and Rounded 1000.
- Studio corner audit by Zen role: code block → Base; value chip → pill (Tag); notes (group / sizing / layout / position
  warnings, part edit note, builder errors) → Large (Inline Message); alignment box and constraints → Input/Small; row
  flashes and drop targets (property row, slot, layers into, slots onto) → Base; assets drop zone → Large (was the
  undefined --zen-corner-radius-medium); New page cards → XLarge (Base thumb + 8 inset); removed the tabs override
  (Zen Tabs corner) and the dead `.studio-modes` / `.studio-modes__panel` rules. Popovers (Quick insert, Gate, Drafts)
  were already Large with Base rows; canvas annotations (labels, tags, kbd, counts, swatches) stay XSmall / 2XSmall.
- User: "Kept in …" goes in a tooltip by an info icon after Folders. MyPagesHeader: Folders + Zen's labelTooltip pattern
  (Tooltip small, 12px icon-info-circle-line button, 24px hit area, Focus/Neutral/Subtle ring), placement right (the
  scrolling panel cut it off above/below). `StorageLine` renders only for Reconnect / a sync error with Retry.
- Gate for the inspector change: PASS, Studio E2E 142/142 (warnings pre-existing: LayoutSection "Remove" not danger,
  `.studio-part__swatch` Pale border on an actionable box — added to BACKLOG).
- User: no shortcut on the sidebar search. PagesPanel's Search drops `shortcut="k"` (the ⌘K badge and the field's own
  handler); ⌘K still opens the page search through StudioApp's handler (and Keyboard shortcuts lists it).
- User: the tooltip was cut off at the panel's right edge (a narrow panel). The Zen <Tooltip> renders in place, inside
  the scrolling panel; the info icon now uses Zen's `useIconTooltip` (a fixed layer in the portal, flipped and clamped
  to the window): measured at a 220px panel, the tooltip sits at x 4–164, in the portal. build-check's `storageLine`
  reads the info icon's name when the line is hidden.
- Full gate (token scope, 56 pages): Vitest 30/30, Figma contracts 23/23, audit/dark/behaviour 0 errors (warnings are
  example debt), Studio E2E 141/142 — B-07 read the hidden storage line: it now reads the info icon's name. Style guard
  radius/role: the alignment box and constraints are not fields → Corner-Radius/Base. MyPages' raw-button warnings were
  from the <Tooltip> version (the current file passes).

## Merge main into the feature branch, then PR #7 into main (user: "commit, push and merge into main")

- Committed `6eb5ff4`; PR #7 was CONFLICTING (main had PR #6: 20 commits, 396 files). The two pre-session WIP files
  (form.tsx, visually-hidden.tsx) were stashed for the merge and popped back afterwards, still uncommitted.
- 14 conflicts resolved in `8b88eba`: BottomSheet (both sides hosted sheets in device frames), Input (SelectField sheet
  + main's DatePickerSheet), layout example (main's 1440px cap + the flat Tasks card), Toolbar (main's ./modKey; no
  breadcrumb), PropField (no per-field reset; main's Add object action kept), SizingSection (main's "Child size"), handoff
  E2E imports; CHANGELOG / BACKLOG / 2026-10-08 log kept both sides; generated docs, keywords, compile API rebuilt.
- After the merge: tsc, tokens:check (Studio modes intact), guidelines in sync, gate on layout / form / input /
  bottom-sheet / date-picker 0 errors, Vitest 44 files / 561 tests pass, Studio E2E 175/176 — SE-12 fails on origin/main
  too (clean worktree), so not a merge regression (BACKLOG P2).

## Figma-language inspector, step 1: Auto layout on Figma's field grid (user: "Phần Design các pros chỉnh nên giống hệt Figma")

- Spec `docs/research/studio-inspector-figma-spec-2026-10-09.md` (user's answers: pixels on Zen's ladder, no Freeform,
  Grid + Auto layout first). Reference: the user's Figma UI3 screenshots (Flow · Resizing · Alignment | Gap · Padding H|V
  · Clip content).
- `InspectorFields` (Section.tsx): [field][field][24px icon], Caption labels above; `InspectorSection fieldGrid` stacks
  plain rows (PropField) the same way. LayoutSection rebuilt on it; SizingSection "Resizing", Align in parent and Child
  size label-above; Auto shows no measured number (user, mid-task); Clip content moved from Appearance (isLayoutProp).
- `axisPaddingOps` (layoutModel): smallest form for the H/V fields (+7 selftest checks). ScaleField: `scaleStep` → "16"
  with caption "md" (needs the new optional `SelectFieldOption.caption`, docs regenerated). Cross axis → a Popover beside
  Gap. Bound/spread layout props keep rows in Figma's order with Figma's words.
- E2E: L-04 rewritten (H/V), new L-10 Clip content and L-11 Cross axis, scale labels via `scaleStep()` in I-06, I-15,
  B-04, L-03, L-07, AP-01 — all pass.
- Not in this step (spec §4): Position, Appearance / Fill / Stroke / Effects, Component properties and Typography on
  the grid; typing a number into a scale field (it is still a list). Popover items with a caption are two lines (Zen's
  Popover/Item), so the spacing list is taller than Figma's.
- Follow-ups the same day (user): (1) "thụt ra thụt vào" — every InspectorRow on the shared grid (label | control |
  icon column always), Position `fieldGrid`, constraints on the grid; (2) token selects one line, token + value:
  `SelectFieldOption.caption` → `meta` (Popover trailing, check after it), ScaleField / Position insets / mixed
  selection; field "md 16" (`ScaleTrail`); (3) the alignment box's marks keep their 20 × 16 size, centred on the dot.
- (4) W / H menu as Figma's (user's screenshot): one-line items with glyphs (Fixed (px) · Hug · Fill), min / max items
  per axis in the same menu (`limitItems`, `onLimit`), the ruler menu removed. (5) A stray Studio draft on layout.tsx
  from a screenshot script was discarded (POST /__zen-studio/discard); the file on disk never changed. (6) The
  `.studio-part__swatch` Pale-border warning: a decorative chip, marked `zen-allow-pale-actionable-box`.
- (7) User rule: coloured (non-neutral) action text and icons use the Light step. Menu danger and BottomSheet
  destructive items Negative/Base → Light (Button danger/positive already Light). Accent actions (Button Secondary,
  flat Accent, the Popover's accent binding) are Accent/Base in Figma: asked the user before changing them.
- (8) Assets as Figma's (user's answers: drill-in libraries, real thumbnails with Grid · List): AssetsPanel rewritten
  (Libraries · AllResults · ComponentLibrary with folding groups · IconGrid with Line/Solid in the header · PhotoGrid
  unchanged); AssetThumb (lazy, scaled engine render; `useItemNode` / `renderInert` shared with ItemPreview, plus a
  PreviewBoundary — the Table preview threw on its dropped `cell` functions and took the panel down). Back clears the
  search. E2E: `openAssetLibrary()` helper; `[data-asset]` instead of `.studio-assets__row` (library, builder, instance,
  structural, handoff, build-check).
- (9) New page: no Title / Device (Untitled page N, desktop); Page › Name in PagePanel, Screen › Device in FramePanel
  (applyEdit setProp on <Screen>); Zen Card for the choices; sticky Create / Cancel. E2E newPage() names the page and
  sets its device through those controls. A screenshot script had made a real "Untitled page" in .zen-studio/pages: moved
  to .zen-studio/trash. Toolbar (Figma tools): asked, the user dismissed — waiting for their call.
- (10) Toolbar (user: "Bộ Figma + đặt bằng chuột"): StudioTool + screen/stack/text/image; CanvasTools in groups;
  edit/place.ts arms the pointer (dropTargetAt + publishDragView as an asset drag; capture on window so the canvas sees
  no press), back to Move after a place; builder/proto/addFrame.ts shared with the Prototype panel; A / T keys; hints.
  E2E ST-26 (Text placed), ST-27 (Escape), B-20 (Screen on the page's device). Gate fixes found on the way: Assets "See
  all" / Upload compact buttons justified, plural count; B-09 / B-12 / B-19 / AP-03 adapted to the new page flow and the
  narrower control column; renamePage renames a Screen still named after the page (pageModel withScreenTitles).
- (11) Gate fixes: O-01 / O-02 used the toolbar's "Select" (now "Move"); SE-12 held Control, which macOS Chrome turns
  into a right-click — now ControlOrMeta (passes; it failed on main for the same reason). BACKLOG: SE-12 and the Studio
  chrome lint debt entries removed (fixed).

## Figma updates, batch 1 (user: "Update giống Figma hết", "lưu ý có slot", "tất cả component nên có slot như Figma") — tier L

- Read with use_figma (read-only): ❖ Voice 15081:1294 (Voice Recorder 15084:79711, AI Voice Conversation 15084:79715),
  Chat/Bubble/Voice 15084:80205, AI/Chat-Field State=Voice 15114:219, ◇ Master-Layout Header/Dashboard 4122:34662
  (rows in its Sections slot: 12 / 24 / 12 / 24) and Primitives/Dashboard/Header 4122:33402 (7 slots); a slot inventory
  of every ❖ / ◇ page (43 sets with slots).
- Built: components/Voice (VoiceRecorder, AiVoiceConversation), ChatVoice (+ hold actions as a file), AiChatField
  `listening`, AppShell `headerCenter` + `sections` + the 12px top bar, PageHeader `trailing`; 38 labels (en / vi);
  platform page "voice" (playground + 4 examples), examples on Chat (Voice messages), AI Chat (Dictate a prompt),
  App Shell (Search in the middle), Page Header (Invoice settings); guideline, harness `voice/actions-wired` with
  fixtures, Do / Don't visuals, smoke fixture; axe baseline: the two Voice components' Neutral/Light captions (the same
  Figma contrast decision the 21 other entries record).
- User decisions: list slots get children of their own item component AND keep the arrays (batch 2).
- Gate run 1 FAIL, fixed: Chat "Voice messages" moved into a phone (PlatformPhone + PlatformChatHeader + composer;
  Delete hides the bubble); ChatVoice speed corner 4 (concentric with the 16px bubble); Voice actions `flex: 0 1 80px`
  (Comfortable 390 overflow); AiVoiceConversation status → `h{headingLevel}`; Voice cards `theme="flat"` (§16); AI Chat
  "Dictate a prompt" without the model button, Voice → voice mode (new `onVoiceMode`); main Voice action off without its
  handler; Voice example 5 (limit + long title on a narrow card: states/edge cases); PlatformApp Download Figma → the
  Figma file, Feedback → the repo's new-issue page (new tab); workspace avatar C… purple (3:1). 5 Studio E2E reds re-ran
  green alone (flaky).
- Runs 2–8: Voice colour roles (Ready bars Border/Neutral/Subtle as fill; level bars Content/Accent/Light with
  zen-allow-colour-role), footer inset Padding/Medium; actions 80+8px columns with an XSmall gap (Figma's 96px centres,
  fits 390 Comfortable; a container query collapsed the playground card, dropped); state badge no longer shrinks; App
  Shell playground side panel: one Body/Base/Regular line instead of a DescriptionList (8 → 7 text styles). Run 4: E2E
  181/181, dark, behaviour clean; final voice run PASS.


## Studio canvas menu cut off at the top; no captions on disabled items (tier S, session e4bf4af9)

- Bug (user screenshot): right-click a layer with a tall menu (~820px, window ~1050) → the menu opened above the pointer,
  its top items off screen. Cause: CanvasMenu raised its 1px anchor to `room − 8 − height`, without Menu's 4px gap and
  the anchor's 1px, so Menu's placement found 5px too little below; resolveAnchoredSide then kept the side it took on
  opening ("top", more room above the pointer) because neither side fit.
- Fix (`studio/shell/CanvasMenu.tsx`): the fit check and the raised anchor count anchor + gap + margin (13px below,
  12px above), so the menu fits below the raised anchor and Menu flips to it. Disabled items drop their caption in the
  final item list (user: "bỏ các dòng subtext của item disabled"); the reasons stay in the source for the Inspector.
- Checked with a Playwright script on the E2E harness server: windows 700 / 820 tall, pointer mid-window, 582px menu →
  110→692 / 230→812 (whole, 8px margin); 6 disabled items, 0 captions. Gate: static ✓; ST-03/04/05 green. Studio E2E
  reds were flakes outside the menu: ST-12 / D-01 / D-02 / D-06 ("save-x rendered after the reseed") green alone; IN-15
  (Inspector W → Fill container after typing 240) fails without this fix too (A/B on HEAD~1's CanvasMenu: 1/3 red; with
  it 2/4). The fix was committed in 3ec528d by another session's commit (it swept the working tree).
- IN-15 fixed (user: "sửa luôn IN-15"): a real dropped click, not a test race. Replayed with a Playwright route that
  injected logs into the served ResizeLayer module (no source edit): after the 240 write the select layer has no hit
  for ~115ms (canvas re-render); the Inspector keeps the W field 250ms, so "Fill container" reached `setSize` with an
  empty `latest` and returned silently (no POST /edit). Fix (`select/ResizeLayer.tsx`): with no target but the same
  selection still shown in the Inspector, the choice waits (`waiting` ref) and is written by the publish effect once
  the element is read again; dropped with the fields' 250ms unpublish. Replay: 10/10 work, 3 of them through the wait.
- Gate (`--files=` ResizeLayer + CanvasMenu, --isolated): static ✓, tsc ✓, Studio self-tests ✓; E2E 184/187, IN-15 ✓.
  Reds B-02 ("Button not imported"), HO-01 ("unexpected code"), B-25 (new app-frame row) are in builder/compile files
  another session was editing during the run; all four green alone right after. ⚠ stale sidebar docs: that session's.

## Studio fixes + app frame for pages you make (user: 4 bugs on a new page; "trang trống nên bao gồm sidebar, header page…") — tier M

- Bugs (E2E B-21…B-24, builder group): spacing hit areas passed right-clicks nowhere → `onPassContextMenu` to the
  canvas menu; a builder-page wrap lost the selection (the page re-renders and drops it) → the start selection is read
  before the write; Sidebar / App shell declared state → palette `builder` variants (static selectedId), state never
  sent on a local file, previews use the static code (the App shell thumbnail's Breadcrumbs lost `items` → `.map`
  error); Screen `canvas` prop (default · alt · flat) + Screen › Canvas.
- App frame: `tools/studio/screen-chrome.mjs` (SCREEN_CHROME, screenLayout, screenChromeCode; no imports, the client
  takes it); dialect: `layout` + chrome props validated, `newPageText` / `frameCode` write the four parts (`chrome:
  false` keeps the old blank for the editing selftests); runtime Screen lays them out (row + header / column + bars);
  compile: AppShell or the bars around the page; Inspector › Screen: Layout (tablet) + one checkbox per part
  (insertChild prop / removeProp); rename keeps PageHeader / TopNavigation titles. Rows B-25, B-26.
- Palette selftest: Voice had no Assets item (batch 1) → "Voice recorder" (Chat group).


## Sidebar slots like Figma (user: "Sidebar thiếu slot như figma") — tier M, session 604bd7

- Read with use_figma (read-only), ❖ Sidebar 6849:33453: Basic 4081:15234 / Small-Density 5974:20590 have the slots
  Header-Content, Body-Content (Menu-Items), Footer-Content (Menu-Items), Sub-Item (+ Sub-Menu boolean); Workspace
  4218:9166 has Master-Header / Master-Body / Child-Header / Child-Body / Child-Footer-Content (+ Workspace-bar);
  Menu-Item 1536:27473 has Trailing-Slot.
- Gap: Body-Content took only the `sections` array; Footer-Content took a node but had no item component (examples
  hand-built `<button>` FooterButtons). Header (`brand`/`logo`), Sub-Item (`subMenu`), workspace rail and Trailing-Slot
  (`trailingAction`) were already there.
- Built (batch-2 rule: slot children of the item component AND the arrays): `SidebarMenuItem` (the fields of a
  `SidebarItem`, nested rows as children or an array; read with `_shared/slots.ts` `slotItems`) and
  `SidebarMenuSection`; Sidebar `children` = Body-Content after `sections` (consecutive rows form one section, other
  content stays in place); `footer` and `SidebarSubMenu` children take the rows. A row context shares rail, open groups
  and `onItemClick`; `selectedId` opens groups of slot rows too. CSS: footer rows stretch and take the rail width.
- Examples: Studio navigation footer → SidebarMenuItem; Handbook body → children (sections + nested chapters).
  Guideline: Slots row, footer do-rule, tags. `trailingAction` documented (Trailing-Slot, not a control).
- Test `tests/interaction/sidebar-slots.test.tsx` (6): slot body = the same `sections` DOM, clicks/toggle, mixed
  content order, footer selection/width, rail width + hidden label, sub-menu rows. Sidebar/AppShell suites 50/50.
- Not done (scope lock): no harness rule for slot rows without `onItemClick`; Studio slot palette untouched (another
  session owns `src/platform/studio`).
- Gate (Studio scope): PASS, E2E 187/187 after B-02 / HO-01 / B-25 expectations (a new page imports its frame's
  components; HO-01 exports a phone page) and keywords regenerated (the Sidebar session's new components); baseline
  +B-21…B-26.

## Batch 2: list slots as children (user: "Children + giữ mảng") — tier M

- `_shared/slots.ts` slotItems(children, Item) → props + slotKey (the Sidebar session [604bd7] built Sidebar's slots on
  it; Sidebar left to them). Tabs: TabItem `value`; Breadcrumbs: BreadcrumbItem `item`; Stepper: `StepperStep` (the
  data type's name, renders null); BottomNavigation: `BottomNavigationItem` (same). Arrays stay and win.
- tests/interaction/list-slots.test.tsx: children markup = array markup for all four; Tabs keys and onValueChange;
  StepperStep alone renders nothing. Guidelines: an api row per component; tagsFor gains the item tags. One example per
  page now uses children (Tabs › Your work, Breadcrumbs › Long path, Stepper › Invoice approval, Bottom Navigation ›
  Phin & Co); the harness count rules (tabs/item-count, stepper/step-count, bottom-navigation/destinations) still count
  arrays only.


## Studio: Sidebar / Page Header slots, Screen parts as Toggles (user: "nó là toggle", "Header Page vẫn chưa có slot, Sidebar vẫn chưa có slot") — tier M, session 604bd7

- Cause: `studio/slots/registry.ts` had no Sidebar or PageHeader entry, so selecting them showed no Slots; the Screen's
  parts were Checkboxes (8d6b085 chose them because a ToggleButton beside a label column wrapped the labels).
- Registry (Figma 9nZv4uW2LT21yuHabMTCh1): Sidebar `brand` Header-Content#4081:58 (parts: default brand, workspace title,
  collapse), `children` Body-Content#4081:59 (takes SidebarMenuItem / SidebarMenuSection), `footer` Footer-Content#4081:60;
  PageHeader `actions` Action-Slots#4122:78 (part: the trailing span), `trailing` Trailing-Slots#4122:82.
  `ghostAnchor` may be a list (first anchor on the page, optional `flow`): Trailing-Slots goes after the actions, else
  under the header, clear of Action-Slots' ghost at the row's end; Footer-Content's ghost is the body's last strip (inside
  the Sidebar). A narrow ghost at a row's end ends its tag at its right edge (`data-align="end"`, slots.css).
- Palette: "Menu item" / "Menu section" (Navigation), warned outside Sidebar / SidebarSubMenu; preferred items for the five
  slots; folders. Selftest: the conditional-mount check also reads `? <>…` and `{prop … ? (`; the index check follows
  `export *`; Sidebar / PageHeader sources and five deep scenarios (1483 items in 31 host slots: tsc, usage, style clean).
- Builder: the Screen's Sidebar writes three `<SidebarMenuItem>` children instead of `sections` (rows are layers);
  dialect CHROME_IMPORTS read from the chrome code; builder / dialect / compile selftests updated. FramePanel: one
  `<Toggle label>` per part across the field (the cell is full width, the switch ends the row).
- E2E: B-25 wording; B-23 expects the Sidebar's Menu-Item rows (Assets › Sidebar and App shell write them too); new B-27
  (Sidebar slots brand · children (3 rows) · footer + Menu item; PageHeader actions + Primary button · trailing).
  Screenshots on the harness server (toggles, both Slots sections, ghosts) checked.
- Gate finding fixed (on HEAD 8d6b085 too, A/B with my edits stashed): after B-14 the right panel stays on Prototype, so
  `newPage` never found the Design tab's "Page name" and B-15 … B-27 timed out in a full builder run; `newPage` opens
  the Design tab first. Builder group 27/27.
- Gate finding fixed: ST-12, D-01, D-02, D-06 failed in every full Studio E2E run ("save-x rendered after the reseed";
  green alone). A diagnostic in `freshSelect` showed the canvas serving StudioSaveFixture's K-23 pasted text (locs 13:4 …
  20:8) while the disk had 11:4 … 17:8. Cause: Vite 8's HMR invalidation (`reloadModule`) leaves
  `lastInvalidationTimestamp`, the stamp it checks before caching a transform, so the paste's in-flight transform was
  cached after K-23's discard and served from then on (also a Studio bug: Discard right after an edit could keep the
  old canvas). `reloadFile` (vite-plugin-zen-studio.mjs) invalidates plainly before the HMR reload. starters + handoff +
  keyboard + structural + drafts: 53/57 → 57/57.
- Gate (`npm run qa -- --isolated`, these files): PASS, Studio self-tests and the full Studio E2E 188/188 (411 s); B-27
  recorded in matrix.baseline.json (the file is sorted now).

## Studio dialog button gap (user: "khi giao diện studio giảm size thì spacing giữa các button bị rộng") — tier XS

- The Studio sizes (density "studio": 32px buttons) keep the standard spacing, so ModalActions' Gap/Small 12 read wide.
  shell.css: in .studio-chrome / .studio-chrome-portal, .zen-modal-actions and __main take Gap/XSmall 8 (as the
  inspector actions and toolbar groups). Measured on the New page dialog through the E2E server: 8px between 32px buttons.

## PageHeader title ↔ description 4px (user: "gap giữa 2 dòng này trên header đang được update trong Figma là 4px") — tier XS

- Figma (read only): ◇ Header/Dashboard 4122:34662 › Header-Text slot, VERTICAL, itemSpacing 4 bound to
  Spacing/Gap/2XSmall. page-header.css: `.zen-page-header__row + .zen-page-header__description` takes 2XSmall − XSmall
  as its top margin (the header keeps Gap/XSmall between its other parts; on a phone the row dissolves and the
  description still follows the title). Test: backlog-fixes-2026-10-05 "sets the description 4px under the title"
  (desktop, mobile). Studio dialog gap gate: PASS (E2E 188/188).

## Studio: nested parts editable like Figma's exposed instances (user: "nested Modal action phải cho phép tôi sửa button direction như trong Figma", "các component/patterns đều bị mất nested") — tier M, session 604bd7

- Figma (read-only): Modal/Forms 841:17182 and Modal/Dialog 841:17177 expose their "Buttons" (.Primitives/Modal/Actions
  694:9383: Direction Horizontal|Vertical, Button Dual|Single|Triple). Code: Dialog / ModalForm `actionsDirection` →
  ModalActions `direction`; the button count follows the actions given (data, not a prop).
- Cause: a deep-selected part (PartPanel) was read-only; `drivingProps` only matched objects and text, never an enum.
- Built: `tools/studio/part-props-build.mjs` (+ `--check` in studio:selftest) reads src/components/**/*.tsx into
  `inspector/partProps.generated.ts`: owner → part → part prop → owner prop when the JSX passes a prop on unchanged
  (destructured name, props.x, behind ?? / ||); DOM plumbing, handlers and polymorphic locals (`const Tag`) left out
  (74 owners, 113 parts). `inspector/partForwarding.ts` composes it along the part's fiber chain (wrappers such as a
  Portal skipped). PartPanel: a Properties section of those props (enum, boolean, text, number, icon kinds) with the
  part's Figma names, writing the owner (planPropWrite / planPropReset, one undo step each).
- Tests: `tools/studio/part-props.selftest.mjs` (10); E2E O-04 (⌘-click between the fixture Dialog's Cancel and Done →
  ModalActions → Direction Vertical → `<Dialog actionsDirection="vertical">`; the fixture Dialog got a Cancel action, so
  SP-06 compares its page with spaces folded: the two-action Dialog is written over several lines). Gate PASS, Studio
  E2E 189/189; O-04 recorded in the baseline.
- Also (peer report): a collapsed Sidebar showing `logoCollapsed` no longer reads "Header-Content · Empty" (the default
  brand with a logo counts as the slot's content).

## Studio: slot audit and code-written slot content (user: "nên kiểm tra lại hết các slot … tự do như Figma", "Rất nhiều chỗ của stack không thể chỉnh sửa", "Kiểm tra test toàn diện và nâng cấp") — tier L, session 604bd7

- Measured: `tools/studio/slot-audit.mjs` (new). 3,326 slots of 2,340 instances in the annotated files: 1,735 all JSX in
  place, 1,092 empty, 499 with content written as code (Stack.children 225: condition 150, map 57, call 39, const 12).
  `--ops` runs insert / clear / remove / duplicate / move in memory with slots.mjs on every slot of the example pages,
  templates and shared code (15.7k ops, ~9 min); the top refusals were moves of a condition's element (616), `.map` rows
  (remove / duplicate 86 each, move 26) and const-held JSX (remove / duplicate 18, move 22, insert 4).
- Built (slots.mjs, arrange.mjs, client actions.ts / content.ts / SlotsSection.tsx):
  - `childUnitAt`: a child written as `{open && <X/>}`, `{a ? <X/> : <Y/>}` or `{rows.map(…)}` moves (Move up/down,
    drag) as that whole block; a drag checks the names the block reads where it lands; the moved element is re-found by
    its tag's first line. The Slots section gives those layers Move buttons; readBlock allows the move (props still not).
  - `constJsx` / `constUses` / `constRemoval`: `prop={name}` and `{name}` with `const name = <JSX>` in the file are slot
    content edited where the const is written (insert joins it, duplicate makes a fragment, removing its JSX removes the
    const, its comment and every use); refused when the code reads it elsewhere, exports it, or (insert into a module
    const) needs an action or state. describeSlots sends `const`; the Slots section notes "Written in name".
- After: move · condition 281 OK / 26 (14 playground by design, 12 a condition inside a const), move · map 14 / 0,
  const-jsx insert 19 / 0, duplicate 20 / 0, remove 18 / 2 (read elsewhere). Left (BACKLOG): `.map` rows' removal / copy
  in their data (86 each), moving a const shown as `{name}` (22), inserting into a prop that holds a condition or a call
  (95), a string icon slot (41).
- Tests: slots selftest +41 (1,881), arrange selftest rewritten for blocks (45 cases); E2E SP-08 (HR · Home: Footer-Content
  of footer={appsButton} → + Menu item inside `const appsButton`).

## Studio: `.map` rows in their data, const moves by holder, props that hold code (same request, continued) — tier L, session 604bd7

- `.map` rows (slot-audit: remove / duplicate 0 of 86 before): Remove, Duplicate (⌘D) and Move up / down on the element a
  `.map` callback returns edit the list where it is written (`dataRowEdit` in data-source.mjs: inline array, const,
  import such as examples/data.ts, a `useState` start value — the frame restarts). The copy's key field gets a value no
  row has (`ava-copy`, the next number, text "… copy"); a key built in code, a filtered / computed list, a spread or a
  lazy initializer is refused with the reason. describeSlots marks such elements `row: true`; the client sends `row`
  (rowOf), skips the repeat confirmation, selects the copy (instance + the lists before it) or the moved row (instance
  ± 1, waiting for the node that shows it: keyed rows move their node, unkeyed ones swap content). Plugin route
  `editRow` (falls back to the code op when the element is not a row's root); Move availability counts rows.
- Const shown in several places (`{summary}` in both returns): moveElement takes `parent` (the holder), sent by the
  canvas, the menu and the keyboard (constHolderOf). Props that hold code (`footer={open ? <A/> : null}`,
  `actions={render()}`) take an insert as `<>{code}<New/></>`; icon props refuse it.
- After (`node tools/studio/slot-audit.mjs --ops`, 15.3k ops): remove · map 53 / 33, duplicate · map 50 / 36, move row ·
  map 52 / 33 (the rest: computed lists 15, spreads 4, computed values 3, `.filter` / `Object.keys` / a helper first 5,
  rows of a nested list 6), move · const-jsx 12 / 2, insert · call 62 / 0, insert · condition 245 / 6 (playground). The
  audit now passes `parent` for const moves, measures row moves and prints every reason with `--op=`.
- Item 4 ("nested … chưa chính xác", "stack … khó thao tác"), measured with a scratch selection crawl (isolated server,
  click every layer at a point it owns, compare the selection): every reachable layer selects right; 46 of 99 visible
  layers on HR · Home (Stacks, Grids, Lists their children fill) have no point a click reaches. A decision for the user
  (Figma's click rule and/or right-click › Select layer), in QUESTIONS.md / QUESTIONS.vi.md.
- Tests: data-source selftest +6 (18 cases), slots selftest 1,906, E2E DA-05 (⌘D → `ava-copy`, copy selected), DA-06
  (Delete → crew = [bao, chi], no confirm), DA-07 (menu Move down → [bao, ava, chi], Ava selected).
