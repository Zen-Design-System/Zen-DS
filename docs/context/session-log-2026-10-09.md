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
