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
