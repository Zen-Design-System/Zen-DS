# Vue consumer smoke app

Template used by `npm run vue:verify-package` (tools/code-languages/vue-verify-package.mjs). The script builds and packs
`@zen-ds/vue`, copies this folder to a temporary directory, installs the tarball there and checks what a real app would
hit:

- `vue-tsc` with `skipLibCheck: false` against the shipped declarations (`src/App.vue` uses a wide slice of the API);
- `vite build` of `button-only.html`, held to the JS and CSS budgets;
- `ssr.mjs`: `renderToString` in plain Node.

Keep it small and realistic: it is what an AI or a developer does right after `npm install`.
