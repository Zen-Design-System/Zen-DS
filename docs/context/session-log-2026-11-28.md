# Session log — 2026-11-28

## `@zen-ds/vue` 0.1.0, ready to publish (tier M, branch zen/feat/vue-package-release-20261128)

The user approved through the supervisor (11-28): "3. OK", publish `@zen-ds/vue`, and "2. Làm luôn", Code view P4,
which comes after this PR. The package was private, version 0.0.0, with exports pointing at `src/index.ts`.

- `tools/code-languages/vue-build.mjs` (`npm run vue:build`) builds `platforms/vue/dist` with vite's JS API. Output is
  one ES module per source file, with `vue` external. `@zen-ds/core` is a path alias inside this repo, so the web core
  ships inside the package under `dist/core/`. Declarations come from tsc on TypeScript 5 (`tsconfig.build.json`, as
  vue-tsc), and `@zen-ds/core` is rewritten to the relative path. React's `styles.css`, `reset.css` and fonts ship as
  they are; only the banner names the package. The script fails if an import leaves the package.
- `platforms/vue/package.json`: 0.1.0, not private. Exports are `.` (types + import), `./styles.css`, `./reset.css`
  and `./package.json`. `vue` ^3.5 is the peer. The licence is in `dist/LICENSE.md`. The registry is in
  `publishConfig`. `sideEffects` keeps the source path of `core-icons` for the parity bundle.
- `tools/code-languages/vue-verify-package.mjs` (`npm run vue:verify-package`) is the twin of `verify:package`. It
  packs into `dist-pack/vue/` and installs the tarball offline into a copy of `examples/vue-consumer-smoke`, where only
  `vue` and `vite` are linked, so a declaration that names `@vue/runtime-core` would fail as under pnpm. It checks:
  - the exports resolve;
  - only `vue` lies outside the package;
  - no parity fixtures or sources are shipped;
  - `styles.css` is byte-identical to React's;
  - `vue-tsc` passes on `App.vue` with `skipLibCheck: false`;
  - `vite build` passes, Button-only JS ≤ 50 KB gz (36.9 measured) and CSS ≤ 110 KB gz (99.0);
  - `renderToString` works in Node.
  The first run caught two wrong props in the template (Text `tone="subtext"`, IconButton `level="flat"`).
- CI: a step after `verify:package` runs `vue:verify-package -- --reuse-lib`.
- `release.yml`: a `publish-vue` job on `vue-v[0-9]*` checks that the tag matches, then runs `vue:check` and
  `vue:verify-package`, checks that the version is not published yet, and publishes `dist-pack/vue/*.tgz`. React's
  filter became `v[0-9]*`, because a bare `v*` also matches `vue-v0.1.0`, and its job skips `vue-` tags.
  `docs/registry-setup.md` has the row.
- Not done: no tag pushed (Giám sát asks the user after the merge). `languages.ts` still says the Vue package is "not
  published yet" until the first publish.
