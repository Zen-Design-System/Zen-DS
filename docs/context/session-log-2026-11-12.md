# Session log — 2026-11-12

## The figma E2E group's FW-80/101/181/183 (tier S; session Bug; branch zen/fix/figma-group-rows-20261112)

User: "sửa luôn 4 dòng FW-80/101/181/183" (logged P1 in BACKLOG.md on 2026-11-11).

**Cause: one row, not four.**
- FW-101 (⌘Y Outlines) opened a new page and waited for a `.zen-text` in its Screen. A new page has none since the
  "Start building here…" hint became the canvas's, not a layer. Its `evaluate` timed out and the row stopped with
  Outlines still on.
- Outlines live in localStorage for every page (`canvas/viewOptions.ts`), and they paint
  `background: none !important`. So every later row in that browser saw Shapes without fill, picture or gradient:
  - FW-80: "the canvas paints none";
  - FW-181: the gradient never painted;
  - FW-183: Pick color's tag never named Info / Solid;
  - FW-130/182/184/186 failed after it and passed alone.
- FW-80, 181 and 183 alone: 3 works.

**Fix (`tools/studio/e2e/scenarios/figma.mjs` FW-101):**
- The row now uses the walk page, which has a Card with text.
- It turns Outlines off in `finally`, so a failure can't leak into the rows after it.
- The product is unchanged.
- BACKLOG.md P1 is closed.

**QA:**
- FW-80, 181 and 183 alone: 3 works.
- FW-101 then FW-80: 2 works.
- `--only=figma`: 202 works, 4 broken. FW-80/101/181/183 are fixed.
  - FW-14, 107, 119 and 237 hit their 20 s limit in a run where several rows needed the Studio loaded twice (Chromium
    cut the load, ~330 requests cancelled; the known #340 case).
  - All four work alone and worked in the group run on 2026-11-11, so they are not this change.
- `npm run qa -- --isolated` PASS (Studio E2E 461 works, 0 broken); `npm run build` ✓.

## Studio UX polish N1–N11 re-check + build (tier M; session "Re-check Studio UX polish notes N1–N11"; branch claude/determined-pascal-2db9c0)

User 2026-11-12: "Rà UX polish N1–N11", then "Làm hết trừ N10". Notes: `docs/research/studio-ux-audit-2026-10-04.md`.

**Re-check on main 2146bf58** (Playwright, private server, `?page=button`; screenshots sent to the user):
- Fixed before: N3 (size pill, 2026-10-27 §2.7). Moot: N10 (Caption 11px is Zen's, ~155 uses in the chrome).
- Half fixed: N7 (Inspector rows; Present/Play Modes subtitle still "Light · Neutral - S1 · Compact"), N9 (status line
  gone; the tip hard-coded ⌘).
- Still true: N1 (68 rows, 1 icon), N2 (name 4×), N4 (inner Button: 5 ƒ rows + 2 grey switches), N5, N6 (title at
  −1700px on open: Close takes focus), N8 ("div", "h2 ×6"), N11 (1280: canvas 656 < 1024: 680).
- New B1: at 1280 × 800 the "?" covered the tools' last button (Zen Agent).

**Fixes:**
- N1 `shell/navigation.ts` COMPONENT_GROUPS: Assets' 12 groups and GROUP_ICON; an unlisted page → "More components".
- N2 board kicker = the eyebrow's section (`StudioBoard.tsx`); a docs page's Inspector head = "Page" (`PagePanel.tsx`).
- N4 `GroupedProperties.tsx`: in a playground (boundHint) bound/spread props leave the Design tab's rows and toggles; the
  section note names them ("Set in Playground properties: …"). Nested instances and the Code tab keep theirs.
- N5 snippets import once (`PlatformExamples.tsx` ×3); `SourcePanel` path = folder (shrinks first) + file, full path in
  `title`; under a 400px Inspector the path takes the header's first row (`@container studio-right`).
- N6 `shell.css`: Dialog 1120 wide, groups in `columns: 4 240px`, the list scrolls between title and Close;
  `DescriptionList stackBelow={0}`; keys wrap inside the column.
- N7 Modes subtitle = scope only ("This presentation only" / "Only while playing"); `previewSummary` removed.
- N8 `select/layerNames.ts` HTML_LABELS: div… → Frame, h1–h6 → Heading, p/span… → Text, img → Image (selftest +1).
- N9 the select hint uses ⌘ or Ctrl as Keyboard shortcuts does.
- N11 Pages | Layers 240 (`layout.ts`, `studio.css`, `store.ts`; a saved 272 reads as the default). Proposed 240 + 280;
  the first gate broke B-58/B-59 ("Mekong Freight", Height "Hug" cut off): at 280 the two field columns cut short
  values, against the panel grid rule (user 2026-10-19), so the Inspector keeps 320. 1280: canvas 688 (was 656; 1024: 680).
- B1 `canvas/CanvasChrome.tsx` measures widths only: tools `data-at-start` (from the left edge) or the corner
  `data-raised` (top-right); below 768px canvas.css already raises it.

**After** (same walk): panes 240/320; 1280 canvas 688; tools/corner overlap none at 1512, 1440, 1280 (at-start), 1279,
1100, 1024 (at-start), 800, 390; Shortcuts title + Close in view; path 68 + 113px shown; 0 console errors.
