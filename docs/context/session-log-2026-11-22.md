# Session log — 2026-11-22

## Code view P3, part 1: web core, Vue parity harness, 9 W1 components (tier L; session "Build Code view P3")

User approved P3 ("Làm codeview"). Branch `zen/feat/code-view-vue-p3-core-20261122` from main f81c4ff0. Plan §12 has
the shape; this is what part 1 did and found.

- **Deps:** `vue` 3.5.45, `vue-tsc` 3.3.14, `typescript5` (npm alias of typescript 5.9.3). vue-tsc needs TypeScript's JS
  API; the repo's TypeScript 7.0.2 ships only the native compiler (`lib/` has no `typescript.js`), so vue-tsc runs with
  `run(require.resolve("typescript5/lib/tsc"))` (`tools/code-languages/vue-tsc.mjs`). Shared checkouts need
  `npm install` after the merge.
- **Harness:** esbuild bundles `src/index.ts` + `platforms/vue/src/index.ts` + the fixtures for Node (0.4 s; React,
  Vue external so both sides use one instance; `ignoreAnnotations` because package.json's sideEffects names only
  `dist/components/Icon/core.js`, and esbuild otherwise drops `import "../Icon/core"`). Mutation check: a wrong
  `data-background` in Vue Badge fails 42/42 cases with the first differing line.
- **Refactor proof:** React SSR of all 199 cases written before the model moves, compared after: 199/199 unchanged.
  `guidelines:build` changed only `code-languages.generated.json` (the props docs read the moved unions as before).
- **Models:** Badge, Button, Divider, Icon, Link, Tooltip (hover wait + icon tooltip placement), VisuallyHidden.
  `visibleBounds` → `_shared/layer-space.ts`. Link keeps its defaults in the signature (the props docs read them there).
- **Result:** 9/41 W1 ready, 202 cases 100%, vue-tsc clean. Static CI checks pass (tsc, usage selftest + check,
  guidelines, tokens/styles/icons, mcp, ai-ui, style, compile-api).
