# Session log — 2026-09-30

## Dark ramps, fourth Global Colors export (session "Add audit check for text overflowing its box", tier XS)

- 264 Dark values changed, Light none: steps 1–8 of the Dark solid ramps are a touch lighter (153 of 154, at most
  4/255 per channel; Gray/2 #1B1B1B → #191919 is darker), plus Gray/11–12 and 110 small Alpha adjustments. The
  192 VT/Chat/Ananas variables in the export stay out. Dark Canvas = Gray/1 #121212, Surface = Gray/2 #191919
  (canvas/surface contrast 1.11 → 1.07), Strongest text #FDFDFD, all confirmed in the browser.
- `tokens:build` (+ native), `tokens:check`, `tokens:native:check` clean. Gate on the token fast path
  (`--files=src/styles/tokens.css,…`, 56 pages, 10.5 min): audit and Dark audit 0 errors; each of the 34 Dark warnings
  also appears in Light at the same ratio. The contract step fails from the parallel-suite bug (BACKLOG P1); all 23
  suites + 25 interactions pass through `run-all.mjs`, which the user accepted as the evidence.
- Lost time: plain `npm run qa` missed the fast path (tokens.css is script-written), the dev server stopped mid-run.
  Recipe saved to memory for future colour syncs.

## Gate fix: parallel contract suites and the token fast path (same session, approved by the user)

- `tools/figma-contract/check.mjs` and `interactions.mjs` build into `.out/<suite>-<pid>` (removed on exit, `--keep`
  keeps it). The shared `.out/harness.js` + `index.html` let concurrent suites render each other's cases.
- `tools/qa/run.mjs`: the scoped contract step runs `ZEN_QA_SUITES` (default 4) suites at a time, 1 under `--serial`
  (it was `Promise.all` over all of them). `TOKEN_ONLY` also holds when no UI file is recorded but a token source was
  edited, since `tokens:build` writes `tokens.css` through a script.
- Verified with a manual run, `--files=tokens/source/figma/global-colors.json` only: the fast-path note appears and
  the contract step passes 23/23 suites + interactions (it failed 18/23 before).

## Typography outline P2 follow-ups (same session, tier S, approved by the user: "tiếp tục")

- Inventory first: `audit.mjs --quality --outline` over all 61 pages (122 runs): 0 errors, 12 screens without an h1
  (outline-h1) and 6 whose outline does not start at h1; outline-card and outline-siblings 0. Form "Mobile checkout"
  was already fixed.
- Fixed: Bottom Navigation "Floating + action" (compact TopNavigation with the tab name, as the playground does),
  "Glass over media" (visually hidden h1: a full-bleed media screen); Templates "Empty & error states" (PageHeader
  "Projects" h1, Empty States h2, "Project not found"). The first longer description spilled out of the Templates
  list caption at 390 (`fit`), so it keeps its old length. The other 9 screens (Chat desktop, Sidebar shells, Side
  Panel "Docked inspector") are baselined debt, listed in BACKLOG.
- `audit.mjs`: outline-* on by default (`--no-outline`); outline-* and rhythm re-seeded (popover, action-bar and input
  held for the "Component library review và fixes" session, seeded later).
- `tools/qa/lib.mjs`: `pagesAt` follows a helper through the functions that use it (3 levels), and an exported
  component used in other files maps to their pages (a foundation or app-layer file counts as its own pages).
  PlatformPhone → 18 pages, PlatformTypographyHierarchy → typography, ProjectList → bottom-navigation.
- EmptyState in a self-titled Card: no example does it (outline-card 0); left as an API question for the user.
