# Figma contract checker

Verifies production React components against Figma **data** (not screenshots):
geometry (size, offsets → padding/gap), fills, strokes (colour + weight + alignment),
radius, effect styles, text styles and text colour — with every bound variable resolved
through the real CSS custom property in each mode (light/neutral-s1 and dark/brand-s1, plus the Smooth Corner Radius
mode for Button).

```bash
node tools/figma-contract/run-all.mjs          # every suite + interaction checks
node tools/figma-contract/check.mjs tools/figma-contract/suites/chip-normal.mjs --only=Focused
node tools/figma-contract/interactions.mjs     # keyboard / pointer behaviour
```

Needs Playwright (Chromium) and esbuild — from the repo's node_modules or a global install.

## Refreshing the Figma data

1. Open the Zen Kaiz file in the Figma desktop app, then **Cmd+Opt+I** → Console
   (the `figma` Plugin API global is available there).
2. Paste `figma-console-extract.js`, then run
   `await __RUN(['<set id>', ...])` and `copy(__OUTS)` (chunk with `__OUTS.slice(a, b)` above ~230 kB).
3. Save the JSON under `docs/figma-contracts/` and point the suite's `contract` at it.

Local styles (paint/text/effect/grid with bound variables) come from the same console session and
live in `styles/source/figma/figma-styles.full.json`; `npm run styles:build` generates CSS from it.

## Writing a suite

`suites/*.mjs` export `{ contract, setId, kind, cases(vp) → props | props[] | null, map[] }`.
A map entry pairs a Figma layer path (`A/B/C`, or `A > B/Slash-Name > C` when names contain `/`,
`A|B` for alternatives) with a DOM selector (`::before`/`::after` allowed) and a list of checks:
`size | w | h | x | y | pos | fill | stroke | radius | fx | text | opacity`.
Record genuine Figma inconsistencies in `figmaExceptions` with a note instead of copying them. An exception matches
`vp` (a subset of the variant props), `layer` and `prop`; add `code` (the exact value code renders instead) so a later
drift still fails.
Components that paint their stroke as an inset ring inside `box-shadow` (Button) use `strokeVia: "shadow"` plus
`fxIgnoreInset: true`, so `fx` compares only the outer shadow; `fxBackdrop: true` also asserts the effect style's
background blur (`--zen-style-*-backdrop-filter`, or none when the variant has no effect style). Gradient strokes drawn
by a masked `::after` (Button/Overlay's 1px ring) use `strokeVia: "mask"` and compare the colour stops. `fillVia` reads
`color` (icons, text), `fill` (SVG) or `caret` (Input's Cursor) instead of the background.
A suite may set `modes` (default light/neutral-s1 + dark/brand-s1); a mode may add `radius` (Corner Radius mode) so
radius bindings are checked where the tokens differ per size. Figma geometry is Compact, so density stays fixed.
`map` entries take `when(vp, props)` to apply per case (e.g. Button's `withIcons` case).

The Button suites cover all six sets at every size (`docs/figma-contracts/button-text.json`, `button-icon.json`);
the older Medium-only `button.json` is superseded.
