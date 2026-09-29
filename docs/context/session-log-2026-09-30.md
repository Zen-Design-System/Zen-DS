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
