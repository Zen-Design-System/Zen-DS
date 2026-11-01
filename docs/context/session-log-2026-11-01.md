# Session log 2026-11-01

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

