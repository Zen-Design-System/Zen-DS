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

`figma-console-extract.js` runs unchanged in the Figma desktop console and in the `use_figma` MCP tool (it uses
`globalThis`, never `window`). Helpers: `__RUN(ids, filter?)` fills `__OUTS` (the JSON stored in
`docs/figma-contracts/`); `__N()`/`__C(i)` chunk it for the clipboard; `__HASHES(ids, filter?)` returns
`[{ id, n, h, v: { 'Size=Small,State=Default': hash } }]`, an FNV-1a hash of the whole entry (`h`) and of each variant's
`JSON.stringify(spec)` (a plain component has the one key `''`); `__DIGEST(entry)` gives the same digest for an entry
you already have; `__KEY(vp)` builds the variant key. `filter` receives each variant's `vp`.

- **Desktop console** (live file `9nZv4uW2LT21yuHabMTCh1`, **Cmd+Opt+I** → Console): paste the file, run
  `await __RUN(['<set id>', …])`, then on its own line (`copy()` does nothing inside an `await` statement)
  `copy(__OUTS)`, or `copy(__C(i))` for each `i < __N()` above ~230 kB.
- **Hidden instance children:** the extractor sets `figma.skipInvisibleInstanceChildren = false` first (since
  2026-10-08), so hidden layers inside instances are captured and hashed like `tools/figma-kit`; a contract captured
  before that date may show them as added nodes on its next compare — re-capture it.
- **`use_figma`** (read-only): nothing survives between calls and the result is capped near 20 KB, so each call is the
  whole file plus a `return` line. Hash first, then fetch only what changed:
  1. `return (await __HASHES(['<id>', …])).map(({ v, ...s }) => s);` for many sets (18 sets, 258 variants: ≈5 s),
     then `return await __HASHES(['<id>', …]);` for the changed sets (≈55 chars per variant, ≤ ≈300 variants a call).
  2. In node, digest the stored contract with the same code and compare `h`, then the `v` keys:
     `const X = {}; vm.runInNewContext(fs.readFileSync('tools/figma-contract/figma-console-extract.js', 'utf8'), X);`
     `const stored = JSON.parse(fs.readFileSync('docs/figma-contracts/<file>.json', 'utf8')).map(X.__DIGEST);`
     A key on one side only is an added or removed variant; a changed `h` with every `v` equal means only a
     description, docs link or property definition changed.
  3. `await __RUN(['<id>'], vp => [<changed keys>].includes(__KEY(vp))); return JSON.parse(__OUTS);` and, above
     ~18 KB, `return __OUTS.slice(i * 18000, (i + 1) * 18000);` in one call per `i`, joined before `JSON.parse`.
     The filtered entry is byte-identical to the stored one with the other variants left out, so patch variants by key.

Save the JSON under `docs/figma-contracts/` and point the suite's `contract` at it.

**Whole contracts through `use_figma` (2026-10-08, `mcp-capture/`):** a call returns at most 20,480 bytes, so a contract
of ~1 MB needs compressing. `mcp-capture/capture-template.js` is the extractor plus a structural dedupe (`__PACK`: a
subtree repeated anywhere is stored once) and LZ-string base64 (~13× together). Replace `__FILE__`, `__IDS__` and `__I__`
and send the whole file as the call's `code`; it returns `ZCAP|file|i|n|hash|chunk`: call `I = 0` to learn `n`, then
`1 … n-1` (a helper agent can make the calls so the chunks stay out of the main conversation).
`ZEN_SESSION=<transcript id> node tools/figma-contract/mcp-capture/assemble.cjs out.json` reads the chunks back from the
session's transcripts (subagents included), checks the hash and writes `{ file: [entries] }`; write each file with the
serialisation it had (`json.dumps`, with or without `ensure_ascii`) and run `run-all.mjs`.

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
