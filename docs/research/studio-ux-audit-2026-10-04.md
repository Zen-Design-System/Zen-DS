# Zen Studio — UX/UI audit (2026-10-04)

Session "Kiểm tra stack hiện và ẩn toast", on the user's request "Kiểm tra lại hết UX và UI của studio xem đã tối ưu
và đẹp nhất chưa". Read-only audit: nothing was changed. Findings go to `docs/context/BACKLOG.md` for approval
(scope lock).

- **Build:** local dev server, `?ui=studio`, role Admin (default) and Viewer, chrome Light and Dark.
- **Viewports:** 1920×1080, 1512×982, 1440×900, 1280×800, 1100×768, 1024×768, 768×1024, 390×844 (Playwright Chromium,
  fresh context per measurement: the Studio keeps its zoom in sessionStorage).
- **Pages:** Overviews, Button (canvas, Docs frame, 6 examples, Present), Design Tokens (document page), Table.
- **Probes:** probe-core, probe-heuristics, probe-perception, probe-ltr and probe-focus from the ux-ui-audit skill,
  plus Studio-specific scripts (chrome-only contrast with alpha compositing, popover geometry, zoom and frame
  geometry). Scripts were scratch files (not kept).
- **Standards:** Zen house rules win (AGENTS.md, component-usage-rules, memory decisions). Accessibility is judged
  against WCAG 2.2 AA. Usability is argued from Nielsen's heuristics and Figma UI3 parity
  (`zen-studio-figma-parity`).

**Not covered:**
- The edit → draft → Save flow. It writes source and peers were active, so it was left alone.
- Touch gestures on a device.
- Screen-reader output.
- Production-build performance. The dev server loads 250 requests, so its timings are not meaningful.

## Summary

| Severity | Count |
| --- | --- |
| Major (UX) | 8 |
| Accessibility | 4 (1 Studio-only, 3 library-wide) |
| Note (polish) | 11 |

The chrome is solid:

- 0 console errors on 6 loads.
- 0 unnamed controls.
- Tab reaches every region with a visible indicator.
- The spacing and type scale is all on tokens: 7 font sizes; 13 spacing values (2·4·8·12·16·20·24·32·40·48 plus a few
  hairline/raw values); 6 radii.
- Dark chrome passes contrast everywhere it matters.

Most defects are geometry: an off-screen menu, a first view that clips the frame, and fit-to-screen that does not fit.

## Findings

### 01 · Major · Zoom menu opens off-screen on every desktop size
The zoom menu (the `86% ▾` button) opens below a control that already sits at the bottom of the screen. At every width
with a docked left panel, no item can be reached with the mouse; keyboard zoom (⌘+/−, Shift+1) still works.
```
1512×982 (4/4 attempts): trigger y 930–962 → menu y 966–1259, items visible 0/7
1280×800 / 1440×900 / 1920×1080: menu starts 4px under the trigger, 0/7 visible
1024×768, 1100×768, 390×844 (left panel is a drawer): menu y 419–712, 7/7 visible
```
- **Owner:** `src/platform/studio/canvas/ZoomControls.tsx` (Zen `Menu`).
- **Likely cause (not verified):** the portal layer `.studio-canvas-area > .studio-portal-root { contain: layout paint }`
  (studio.css:39). Inspector Selects flip correctly: a trigger at y 809 opened its list at 595–799.
- **Fix:** open upward (`side="top"`), or let Menu's flip measure the viewport.

### 02 · Major · Toolbar does not fit a phone
At 390px the toolbar holds 690px of controls in 374px. Six controls are off-screen, including the only button that
opens the Inspector drawer.
```
390×844: toolbar scrollWidth 690 / clientWidth 374
off-screen: Modes, Dark interface, Undo, Redo, Role: Admin, Inspector
768×1024: 752/752 (fits)
```
**Fix:** below ~600px, keep only Panels, the tool switcher and Inspector, and move Modes, theme, Undo/Redo and role
into the Zen Studio menu.

### 03 · Major · First view clips the Playground under the Inspector
The initial zoom stops at 75%, so on a 1280 laptop and at 1024 the Playground's right edge is hidden. Its centred
specimens look off-centre.
```
1280×800: zoom 75% · playground 320–1040 · canvas 272–960 → 80px hidden
1024×768: zoom 75% · playground 48–768  · canvas 0–704   → 64px hidden
768×1024: playground ends at 768 = canvas edge (no margin)
1440/1512: fits (0px hidden)
```
**Fix:** fit the first frame's width to the visible canvas (minus the 48px margin), or reserve the margin on both
sides.

### 04 · Major · "Zoom to fit all" does not fit all
Shift+1 at 1512×982 sets 26%. The Docs frame stays half outside the canvas, and 3 of 8 frame labels are hidden at that
zoom.
```
frames x 326–1405, canvas x 272–1192 → Docs frame 213px past the right edge
labels hidden: Hand off when ready, Controls on a photo, Approve on a phone
```
**Fix:** fit the union of all frames, or label the action "Zoom to fit examples". Keep frame names visible at any zoom
(Figma truncates them; it never hides them).

### 05 · Major · Two different descriptions of the same page on one screen
The board under the h1 and the Inspector's Page section describe the page differently. The board text was written
for DS builders (Figma mapping), not for readers.
```
Board (PlatformExamples.tsx:583 ExamplePage description):
  "Establish consistent interaction across project states with defined button styles. Button Style Tokens act as
   meaningful identifiers for your visual system's standard interaction elements."
Inspector (guidelines.generated.json → button.purpose):
  "Triggers an action on the current surface (save, submit, open, delete). Navigation between pages is a link, not a Button."
45 ExamplePage descriptions; 9 mention Figma mapping ("mapped from the Figma Search page", …)
```
**Fix:** one source per page. The guideline `purpose` is the user-facing one. Keep the Figma-mapping notes in the
spec docs.

### 06 · Major · Quick actions list is see-through
The ⌘/ palette uses the translucent Popover fill without the Popover blur. Canvas text and selection outlines show
through the rows, for example the board description behind "Select tool".
```
palette background rgba(255, 255, 255, 0.898) · backdrop-filter: none
```
**Fix:** add `backdrop-filter: var(--zen-style-effect-popover-backdrop-filter)`, as Zen Popover/Toast do, or use the
opaque Popover fill.

### 07 · Major · Layers search has a dead-end empty state
A Layers search with no match leaves an empty panel, and the count above it is unchanged. Pages and Assets show an
EmptyState with a way out.
```
Layers "zzqq": "158 layers in 8 frames" + blank list
Pages  "zzqq": "No pages found · Nothing matches “zzqq”. Try a component name like “Button”. [Clear search]"
Assets "zzqq": "No components match · Try another name, or clear the search."
```
**Fix:** the same EmptyState plus Clear search, and a count of the matches ("0 of 158 layers").

### 08 · Major · Docs read small on the canvas
Studio is the default docs UI, so readers land on a canvas whose first zoom shrinks body text to 12–13.7px, and 12px
captions to about 9–10px.
```
1280×800 zoom 75% → 16px body renders 12.0px     1512×982 zoom 86% → 13.7px
1440×900 zoom 78% → 12.5px                        1920×1080 zoom 100% → 16px
frame text at 1512: 75 nodes render at 10.3px, 11 at 9.4px
```
**Fix (product decision):** open the Docs frame at 100% (zoom to frame on "Docs"), or give Viewers a reading view.

### A1 · Accessibility · Studio focus ring fails 3:1 in light chrome (WCAG 2.2 SC 1.4.11)
Studio's own focus rings use Focus/Accent/Solid (#ff66d4). This covers page rows, frame labels, panels and resizers.
Zen components use Focus/Neutral, so the chrome mixes two focus styles.
```
frame label outline 2px #ff66d4 on canvas rgb(247,247,247): 2.42:1  (needs 3:1)  — dark chrome: 7.23:1 ✓
page row inset ring #ff66d4 on #fff: ≈2.6:1
12 uses of --zen-color-focus-accent-solid in src/platform/studio (shell.css:56, :81, :118, board.css:239, …)
```
**Fix:** use Focus/Neutral/Solid in the chrome, as the components do, or add a contrasting inner or outer ring.

### A2 · Accessibility · Inactive tab labels below 4.5:1 in light chrome (SC 1.4.3) — library-wide
```
"Layers", "Assets", "Code" 14px/500 rgba(0,0,0,0.486) on #fff: 3.79:1 (needs 4.5:1) — dark chrome passes
"⌘K" hint "K": 3.79:1
```
This is the Zen Tabs default (Content/Neutral/Light), and docs kickers and Table headers share the tone (3.74–3.79:1).
The kicker tone is a house decision (2026-10-04), so this needs a decision rather than a Studio patch.

### A3 · Accessibility · Danger button text 3.74:1 (SC 1.4.3) — library-wide
```
"Delete project" #fff on rgb(229, 83, 46), 14px/600: 3.74:1 (needs 4.5:1; 600 at 14px is not "large")
```
These are the Background/Negative/Solid and On-Colors tokens (the Global Colors synced today). It belongs to the token
owner.

### A4 · Accessibility · Placeholder dash at 1.92:1
```
Inspector "State —" placeholder rgba(0,0,0,0.267) on Surface: 1.92:1 (dark: 3.42:1)
```
Placeholders are not strictly in SC 1.4.3. "Not set" in Light tone (as Sort/Selected ids already use) reads better.

### Notes (polish)
- **N1.** Pages lists 56 components flat, all with the same cube icon (1 distinct icon over 56 rows). Assets already
  groups them (Text, Actions, Navigation, Data display…). Grouping Pages the same way halves the scan.
- **N2.** The page name appears three times: the toolbar breadcrumb "Components › Button", the board eyebrow
  "Components / Button" and the Inspector "Page · Button".
- **N3.** The selection size badge carries rule notes ("99 × 40 · A playground specimen is never wrapped in a Stack",
  "1392 × 302 · Height comes from the Table itself"). Figma shows the size only. The explanation belongs in the
  Inspector.
- **N4.** The Inspector lists a playground-bound prop twice: "Playground properties" (editable) and "Properties"
  ("Bound to {level} · Use Playground properties", 6 rows for Button). Collapse the bound rows into one line.
- **N5.** Code tab, Snippet: two imports from the same package (`import { Button } …; import { Icon } …` from
  "@zen/design-system") and two blank lines. Source header: "…les.tsx" truncates from the start, so the file name is
  lost. Use middle truncation.
- **N6.** The Shortcuts dialog is one long column. Descriptions wrap in a narrow column next to about 120px of empty
  space, and the title scrolls away when focus lands on Close.
- **N7.** The Modes popover subtitle lists 3 of 6 modes ("Light · Neutral-S1 · Compact · applies to the canvas"). The
  Inspector lists 6 and wraps an orphan "· Medium".
- **N8.** Layers rows show raw tag names (div, h2, Row). "h2 ×6" appears under each of the six sections, which reads
  like 36 headings.
- **N9.** The status hint says "⌘/Ctrl-click" while the Shortcuts dialog shows Mac glyphs only. At 390 the hint
  truncates to "Select · click a la…".
- **N10.** Left nav section labels are 11px ("Get started", "Foundation", "Components"), the only text below 12px.
- **N11.** The chrome takes 272 + 320 = 592px, so at 1280 the canvas (688px) is narrower than at 1024 (704px, left
  panel as drawer). Figma UI3 uses about 240 + 240.

## What works (measured)
- 0 console errors or page errors over 6 loads (3 viewports × 2 pages).
- Accessible names: 0 unnamed, 0 polluted, 0 duplicate (probe-core).
- Keyboard: Tab is not trapped. The order runs toolbar → Pages → canvas (`role=application`, "Button canvas") → frame
  labels → status → zoom → Inspector, with a `:focus-visible` indicator on each.
- Focusing content inside the canvas never scrolls it natively (scroll 0,0 in 4/4 attempts). keepInView pans the
  world instead.
- Inspector Selects flip upward near the bottom (trigger 809 → list 595–799).
- Pages and Assets empty states have copy and a way out.
- Present (F) opens the example full screen with "Exit full screen". Picking a frame in the Inspector's Frames list
  zooms to it at 100% and shows Width, Theme, Present and Copy code.
- Dark chrome: every chrome text passes except the placeholder dash (3.42:1).
- No long tasks over 50ms on load. A skeleton covers loading.
- Viewer role: the footer says "View only — switch to Admin to edit", and the playground controls still preview.

## Where to start (impact ÷ effort)
1. **01** Zoom menu: one prop or flip fix.
2. **A1** Focus ring token swap in 12 places.
3. **03 + 04** Initial zoom and fit-all geometry, plus frame labels at any zoom.
4. **07** Layers empty state: reuse EmptyState.
5. **06** Popover blur on Quick actions.
6. **02** Toolbar overflow at phone width.
7. **05** One description per page: content decision.
8. **08** Docs reading zoom or view: product decision.
9. Notes N1–N11, then the library-wide A2/A3 decisions with the token owner.
