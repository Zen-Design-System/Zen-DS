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

