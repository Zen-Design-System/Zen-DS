# Per-component CSS entry points: spec card (2026-10-24)

User (2026-10-24, through the progress session): "… và tách CSS theo component (per-component entry points) để app không
phải tải cả 63 KB." BACKLOG "P3 · Package weight". Tier L (package surface; no component source changes).

## Today
- `vite.lib.config.ts` builds ES modules with `preserveModules` and `cssCodeSplit: false`. Each component module
  imports its own CSS (`import "./button.css"`, 80 files under `src/components` and `src/ai-ui`); Vite gathers it into
  `components.css` and leaves the JS free of CSS imports.
- `scripts/build-lib-css.mjs` assembles `dist/styles.css`: the Inter `@font-face`, tokens, text styles, effects, a
  box-sizing baseline, then `components.css`, which is the source files verbatim in the import-graph order (checked on
  2026-10-24: 80 of 80 files found unchanged).
- `package.json` exports `./styles.css` and `./reset.css`; `sideEffects` lists only the two icon registration modules.
- Measured on main 6a7e872a: the base (tokens 27 KB, text styles, effects, fonts) is about 30 KB gz, and the components
  are about 157 KB gz unminified. The "63 KB" of 2026-09-29 is out of date: a Button-only app loads all of it.

## Options
- **A. Each component's JS imports its CSS** (cssCodeSplit plus kept imports, `sideEffects: ["*.css"]`): automatic, but
  every module then imports `.css`, so plain Node (`renderToString`, the `verify:package` SSR check), Jest and other
  CSS-less test runners break for today's apps. Rejected: current consumers must keep working.
- **B. Flat per-component `.css` files that `@import` their dependencies:** Vite inlines `@import` per stylesheet and
  does not dedupe across stylesheets. Button's CSS would be repeated, and imported after Dialog it would land after
  Dialog's overrides of it. Rejected.
- **C. Opt-in style entries (chosen):** `import "@zen-ds/react/styles/Dialog";` is a tiny JS module of side-effect CSS
  imports:
  - first the shared base, then the CSS of Dialog and of every component it renders;
  - in the order of `styles.css`.
  Bundlers load a CSS module once, at its first import, so several entries never repeat a file, and each component's
  own CSS keeps its place after the CSS it overrides. The library JS stays CSS-free, and `styles.css` is unchanged.

## Shape
- `dist/styles/base.css`: fonts (`../fonts/`), tokens, text styles, effects, the box-sizing baseline (as `styles.css`
  without the components).
- `dist/styles/parts/<src path>.css`: each source CSS file, verbatim.
- `dist/styles/<Name>.js` + `<Name>.d.ts` (`export {}`): one per PascalCase export of `@zen-ds/react`. Its closure is
  read from the built JS import graph (static and dynamic imports) and the CSS each module imports in `src`.
- `dist/styles/manifest.json`: name → parts, for `zen-ds doctor`.
- `package.json` changes:
  - exports `./styles/base.css` and `./styles/*` (types + default);
  - `sideEffects` adds `*.css` and `./dist/styles/*.js`, so bundlers keep the imports (it also protects `styles.css`
    under webpack).

## Checks
- `build-lib-css.mjs` fails when the parts in order do not reproduce `components.css`, or when an entry's parts are
  out of order.
- `verify:package`:
  - pattern exports resolve;
  - a third smoke page (`split.html`: one style entry plus Button) builds;
  - the CSS it loads is measured against `button-only.html` (`styles.css`).
- `zen-ds doctor` accepts `styles.css` or style entries. With entries, it names each component imported from
  `@zen-ds/react` whose CSS no imported entry covers.
- One browser check in the gate slot: the smoke app rendered with `styles.css` and with entries gives the same pixels.

## Limits (documented)
- Entries need a bundler that loads CSS from JS, as `styles.css` already does.
- AI UI renders any component, so apps that use it keep `styles.css`.
- The relative order of two unrelated components follows the app's import order.
