# Session log 2026-11-01

## Session "Component example thumbnails" · docs Examples as static thumbnails (tier S; user 2026-11-01)

- Ask: "Phần example của các component chỉ nên hiển thị thumbnail tĩnh, chỉ cho interact khi bấm play để nhẹ trang
  hơn. Thumbnail nên nhỏ vừa lại để xếp theo grid cho gọn." The user picked a scaled live preview over pre-captured
  images (~500 examples × light/dark would have put 15–40 MB of webp in git and gone stale on every example edit).
- Built (`PlatformShowcases.tsx`): `ComponentExamples` shows `ExampleThumb`s in `.pe-thumbs` (auto-fill, min 240px;
  150px under 620px). A thumb is the example's bare `ExampleCard` laid out 520 / 960 (wide) / 1280 (screen) px wide,
  scaled to contain in a 4:3 frame, `inert`, mounted when within 400px of the viewport, its own portal root (an overlay
  opened on mount stays inside), CSS animations and transitions off. Play (Button/Overlay black-overlay, also a click on
  the frame) swaps it for the live `ExampleCard` across the row with a new `onClose` → Close (focus goes to Close, back to
  Play on close). One example plays at a time.
- `?examples=live` keeps the old all-live grid; `tools/platform-audit/{audit,behaviour,shoot,visual-diff}.mjs` add it, so
  the audits, behaviour walk, screenshots and visual diffs still drive every example. No audit threshold or rule changed.
- Checked: a Playwright walk on a private server (badge, chart, app-shell at 1512/390): no console errors, Play → focus on
  Close, Close → focus on "Play Task status"; thumbnails mount lazily (0 mounted at page top); chart page 6.6k DOM nodes vs
  9.5k live. tsc, style:check, usage:check clean.
- Gate (`--isolated`, badge · chart · app-shell · typography): PASS; behaviour 0 findings. 16 "new" rhythm warnings on
  app-shell A1–A4 (1512/390/320/1512-dark) were the baselined findings with the style list in another order (no gate had
  run app-shell since 10-26; live-mode DOM is unchanged here). Re-baselined `rhythm` for app-shell; the rewrite dropped the
  3 "Side panel toggled" keys only the gate's smoke step produces, so they were put back: the diff swaps exactly those 16 keys.

## Studio Project setup: Corner radius tiles (tier S; user 2026-11-01: "Phần này xấu quá")

Branch zen/fix/studio-radius-tiles-20261101 (walk session).
- The tile drew a cropped card corner at Base radius. Rounded and Smooth share Base 12, so they looked the same; the
  picture was cut at its right and bottom edges.
- First try, a card holding a button: the user still found it ugly. Three styles were rendered with real tokens
  (Corner, Button, Card); the user picked Corner.
- `project.css`: one corner line (top and left border in accent), rounded as `--zen-corner-radius-action-medium`
  capped at `--zen-corner-radius-xlarge` (Rounded's pill → 20). `zen-allow-radius-role`: it pictures a button's corner.
  The selected tile's ring is accent (Component theme shares the tile).
- Gate `--isolated`: PASS, Studio E2E 451 works · 0 broken. Two runs in between failed on timeouts only: the Mac slept
  on battery (pmset log 19:18–19:40); `--failed` re-runs passed.

## Docs platform chrome → Figma B5 (tier L; user 2026-11-01: "Giao diện document nên làm lại cho đơn giản hơn giống example B5")

Branch claude/docs-chrome-b5-020c25 (worktree). Spec card: B5 node 15917:6719 = Pattern/AppShell/Desktop Layout=Docs.
- `PlatformApp.tsx`: the library `AppShell pattern="docs" canvas="flat"` (`layout` from a 1024px media query, so the
  panes and the drawer agree): `AppShellHeader` (brand link + version Badge, centre Search with the old nav-search
  behaviour, actions Appearance · colour mode · Feedback · Download Figma · AccountMenu); `leadingPane` an
  `AppShellPane theme="canvas"` with `SidebarSubMenu` (no icons; first section "Getting started"); `trailingPane`
  "On this page" + "Was this page helpful?" from 1280px when the page has ≥ 2 sections; under 1024px a flat Sidebar
  in the drawer (search, rows, Figma / Feedback footer), header icons search · appearance · mode · account, brand mark
  only under 744. Breadcrumbs Docs › [Design Tokens | Foundations] › page open the column (none on Overviews). The
  settings' data-* stay on the `.official-platform` root (now a div: AppShell owns `<main>`).
- `PlatformTemplate.tsx`: `PlatformTopbar` and the chips removed; `PlatformAppearancePanel` (SidePanel standard small,
  six SelectFields, docked by AppShell `sidePanel`, modal when it cannot dock); `PlatformColorModeButton` (aria-pressed,
  name "Dark mode" as the QA scripts click); `PlatformPageTemplate` drops the 400px cover for Display/3 + Body/Extra lead.
- `PlatformReference.tsx`: the 28px pill rail became `PlatformOnThisPage` text links (B5) fed by `usePageSections`
  (`[data-toc-label]`, else the page's h2s); `ExamplePage` no longer renders the rail.
- `platform.css`: old sidebar/topbar/drawer/hero/rail rules removed; shell rules for the brand, header line, wide pages
  (`data-page-width`), breadcrumbs gap, sticky offset from `--zen-app-shell-header-height`. Tools: `audit.mjs` skips
  contrast in `.official-nav-pane`; `shoot.mjs` pins the AppShell header and panes.
- Harness found and fixed: the drawer Sidebar on Canvas/Flat needed `background="flat"` `shadow={false}`.
- User follow-up ("phần playground props để dưới component thay vì bên phải"): `.platform-example-panel--stack` is one
  column at every width (title · preview · properties · code); `.platform-playground-controls` is a grid of
  `minmax(min(100%, 280px), 1fr)` columns with a Pale line above (the old ≤ 1024 / ≤ 620 overrides removed).
- Gate `qa --all --isolated` (4792s): ✗ 195 audit errors, nearly all at 320, plus density at 1512. Causes: (1) the
  ≤ 374px rule still took 32px off `.official-page` inside the AppShell Body's own 24px padding (examples got 240
  instead of 272) → the 16px gutter is now the Body's side padding; (2) "On this page" plus Comfortable's 260px panes
  left component previews ~928px at 1512 → on component pages the pane shows from 1600px (text/foundation pages from
  1280), so a 1512 window keeps ~1216px as before. Also fixed: Link playground's Caption text style used tone Base
  (now Light). Re-run on the 35 pages: audit 0 · dark 0 · behaviour 1 warning (Popover Search focus = Figma, question
  in BACKLOG-user-and-later). Studio E2E 451 works · 0 broken. Chrome walk (Playwright, isolated): Appearance docks,
  Escape closes it and focus returns; ⌘K → "tog" → Enter opens Toggle; drawer Escape; the header search icon focuses
  the drawer search; dark mode; no console errors. The drawer Sidebar got the brand (its header was empty).

## Studio chrome → Figma B4 · Workspace Editor (tier L, branch `claude/studio-chrome-b4-59548a`)

User 2026-11-01: "Giao diện Studio thì làm lại kiểu B4" — replaces the 2026-10-15 UI3 floating panels (PR #63).
Source: Figma `9nZv4uW2LT21yuHabMTCh1` node `15916:6196` (read with use_figma: Pattern/AppShell/Desktop
Layout=Workspace; panes 240 + 8px edge, Theme=Border, Corner-Radius/XLarge, Border/Neutral/Pale, no effects; Body =
Neutral/Pale field r XLarge, 8px from the panes; top bar = Header/AppShell with Avatar Square "Z", Body/Base/Bold name,
Badge Small, Segmented secondary, AvatarStack, tertiary Play, Share, primary Publish; zoom Chip/Advanced Small at the
field's bottom-right). Code twin: `WorkspaceEditorApp` (`examples/pages/app-shell/b-desktop-2.tsx`).

- **Top bar** (`shell/PanelHeaders.tsx` `TopBar`, 48px, replaces LeftHeader/RightHeader/Collapsed*Bar): Zen Studio
  menu (Avatar "Z" + chevron, same items), Pages and layers button while that pane is a drawer, page name, Saved /
  Unsaved Badge (admin, writable; a page you made is always Saved); end =
  Read-only chip, Undo/Redo, Role, Present / Play (⌥⌘↵), Open on phone (a page you made, from the selected Screen),
  Save all with the drafts count or Export, the Inspector button while it is a drawer. Phone keeps menu, name,
  Present, drafts count, Inspector; Undo/Redo/role stay in the menu as before (S-07).
- **Panes** (`studio.css`): Border panes under the bar, no shadow (drawers keep the popover shadow while they cover the
  canvas); tab rows get B4's 8px Pane-Content padding; the Inspector's Close ends its tab row as a drawer.
- **Canvas** = the area between the panes (`--studio-left-column` / `--studio-right-column-end`), radius XLarge; its
  default colour is Neutral/Pale (`canvas.css`; the page Background option "Canvas" now reads "Pale"). The strips under
  the old floating panels, `--studio-inset-*`, `setCanvasInsets` and the inset measuring in StudioApp are gone:
  `getSafeBox` is the whole viewport (fit, zoom to selection, keep in view, first view, rulers, frame chrome).
  StudioCanvas already compensates the canvas's left edge moving when a pane resizes.
- **Overlay layer** inset 0 in the canvas area; window-placed tooltips shift back by the area's top-left; the App Shell
  playground full screen anchors its portal at the window corner (`position: fixed`).
- **Zoom** is an advanced Chip in the canvas's bottom-right corner beside the tip "?" (now a tertiary IconButton),
  `zen-allow-chip-action` (Menu trigger). Agent panel and AI chip lose their inset offsets.
- **E2E:** S-02 (zoom Chip), S-03 (top bar), G-01…03 chromeText (top bar), new S-10 (B4 geometry, no pane shadow, Pale
  canvas, no view switch repeated in the bar). Ids kept: `#studio-left`, `#studio-right`, `studio-left-panel-*`, `.studio-zoom__value`,
  "Zen Studio menu", "Undo", "Inspector", "Pages and layers".
- Walk (Playwright, private server): 1512 light/dark, 1100 + Pages drawer, 900 + Inspector drawer, 390, Studio home,
  a page you made in Prototype; Present, resizer keys, zoom Chip menu, ⌘\, Undo. Fixed on the way: at 390px the zoom
  Chip ran into the tools (the corner moves to the canvas's top-right below 768px); a Saved badge on Studio's folders,
  and beside another file's drafts.
- Gate run 1: 449 works, B-55…57 broken — their drag dropped 80px right of a Screen fitted to the view, which is now the
  Inspector pane (the canvas ends there): `dragAssetToBoard` drops inside the canvas area (below the Screen when the
  right is short). S-10 recorded in the baseline.
- User 2026-11-01 ("Tính năng bị trùng", screenshot of the bar): B4's centre Mode Segmented repeated the Inspector's
  Design · Code · Prototype tabs. Removed from the top bar; the Inspector's tabs stay (they also work while the
  Inspector is a drawer, where the bar had no room for the Segmented). S-10 now checks the bar repeats none of them.
- Export lived twice (top bar Export and the Page section's Export…): the top bar keeps it (B4's primary action; tertiary
  beside Save all; on a phone in the Zen Studio menu), the Page section drops it. E2E I-32, handoff `openExport` and
  build-check now press the top bar's Export; S-07, S-10, I-32 and nine HO rows pass.
- `studio:build-check` fails 8 steps here and on a clean origin/main worktree alike (chunk checks, then time-outs):
  pre-existing, logged in BACKLOG (P2).
- User 2026-11-01 ("bị trống phía trên"): a page you made opened with an empty band above its title — the first view
  centred a desktop Screen fitted by width in the narrower canvas. `firstVisit.ts` now starts the view at the board's
  title block (`.studio-board__title`) at the 48px margin when the height allows; ST-30…32, B-52, B-55, S-04 pass.
- User 2026-11-01: the page name to the bar's centre; at the start a trail Home (house icon) › the project, its avatar
  (initial on the project's Primary; Drafts: file icon) beside its name, a menu that switches project; Home opens the
  projects grid. `shell/ProjectCrumbs.tsx` (Zen Breadcrumbs, the project crumb a Menu trigger); the bar is a 3-column grid
  (sides equal, centre ≤ 40vw). The Pages panel's ProjectBar (← All projects, name, ⋯) said the same and is removed
  (settings and delete stay on the project card and the project home). Docs pages read Home › Docs. E2E S-11.
- Gate `--isolated --files=<branch files>`: PASS — static all ✓, Studio E2E 453 works · 0 broken (4 shards, 2253 s),
  report `.qa/reports/2026-11-01T16-20-41-0039f614.md`.
- CI on #373 failed in Build: a stray `*/` in shell.css left a comment line outside the comment (lightningcss minify
  stops; the dev server does not minify). Fixed; `npm run build` passes locally.
