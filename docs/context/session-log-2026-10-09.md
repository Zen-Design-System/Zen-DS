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
