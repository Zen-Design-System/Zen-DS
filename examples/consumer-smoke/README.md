# Consumer smoke app

Template used by `npm run verify:package` (scripts/verify-package.mjs). The script packs `@zen-ds/react`, copies
this folder to a temporary directory, installs the tarball there and checks what a real app would hit:

- `tsc` with `skipLibCheck: false` against the shipped declarations (`src/app.tsx` uses a wide slice of the API);
- `vite build` of two pages; `button-only.html` is held to the JS budget;
- `ssr.mjs`: `renderToString` in plain Node.

Keep it small and realistic: it is what an AI or a developer does right after `npm install`.
