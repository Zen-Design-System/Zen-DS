# Zen Studio E2E harness

The harness drives the Zen Studio UI in Chromium, the way a person uses it. It then writes a feature matrix: for each
feature, whether it works or is broken, with evidence. It was built as GĐ0 of
`docs/research/studio-builder-plan-2026-10-05.md`.

```bash
npm run studio:e2e                           # every group, about 2 minutes
npm run studio:e2e -- --only=shell,select    # some groups
npm run studio:e2e -- --rows=K-07,I-03       # some rows (debugging)
npm run studio:e2e -- --update-baseline      # record this run after a fix
npm run studio:selftest                      # Studio source self-tests + this harness's fixtures (no browser)
```

Flags: `--host=<example page id>` (default `uploader`), `--port=<n>`, `--headed`, and `--keep`, which leaves the
server up.

`npm run qa` runs the self-tests as a static step and the E2E as a runtime step whenever Studio files are in scope:
`src/platform/studio/**`, `src/platform/examples/e2e/**` or `tools/studio/**`. With `--quick` it runs only the
shell, select and inspector groups.

## The production build (builder pages without the dev server)

`npm run studio:build-check` (about 1 minute) builds the platform into `node_modules/.cache/zen-studio/build-check/dist`,
serves it with `vite preview` (no Studio plugin, no `/__zen-studio` API) on 5290–5299 and drives a builder page through
New page, Assets insert, an Inspector edit and ⌘Z, a reload, Add screen + Navigate to + Play, then Link folder, Move to
Trash, Restore and a reload, with the folder picker answering an Origin Private File System folder (a real File System
Access handle). It also measures the edit engine's lazy chunk against its budget (140 KB gzip, the user's call on 2026-10-06; over
it fails) and checks that a component page never requests it. Report and a Play screenshot:
`.qa/studio-e2e/build-check-<stamp>.{json,png}`. It is not part of `npm run qa`; run it after changes to the builder,
the engine modules or the build config.

## How it stays out of everyone's way

- **Its own Vite server.** It starts one on 5190–5199 (`lib/server.mjs`) with `vite.studio.config.ts` and its own
  optimizer cache. The Studio plugin keeps drafts per port, so the harness's drafts never reach 5173 or 5180, and their
  Save all never reaches the harness. The drafts file is deleted before the server starts and after it stops.
- **The fixture is only ever a draft.** `fixtures/host-page.tsx` is served as a draft of the host page, by default
  `src/platform/examples/pages/uploader.tsx`, and is never saved.
  - Every reseed is one write, and the marker "Seed <n>" changes each time. Rows wait for the marker, because the old
    DOM shares the new text's `line:col` locations.
- **One file is saved.** That file is `src/platform/examples/e2e/StudioSaveFixture.tsx`. A snapshot is taken before
  the run (`.qa/studio-e2e/snapshot-<stamp>/`), and the file is restored byte for byte afterwards.
  - A host page or `data.ts` that the harness turned into fixture text is restored too.
  - A change someone else made in the meantime is reported and never overwritten.
- **Server restarts are handled.** A peer's edit to `tools/studio/*.mjs` restarts the server with a new token, and the
  API client pings again and retries.

## Rows and the baseline

- **Where rows live.** `scenarios/<group>.mjs` exports `rows`, each `{ id, feature, wp, run(ctx) }`.
  - `run` returns evidence when the feature works, or throws a reason when it does not.
  - Elements are found by `data-e2e="<id>"` in the current source (`lib/source.mjs`). They are clicked with the real
    pointer through the canvas picker (`lib/studio.mjs`). Results are checked in the source the UI wrote
    (`GET /source` + `describeElement`) and in the DOM.
- **The baseline.** `matrix.baseline.json` maps each row id to `works` or `broken`.
  - A row that moves from works to broken is a regression, and the run exits 1.
  - A row that moves from broken to works is reported as fixed: record it with `--update-baseline`.
  - Rows listed under `flaky` are known races. They stay `broken` until the race is fixed.
- **Reports.** They go to `.qa/studio-e2e/<stamp>.{md,json}`, with one screenshot per failing row. The 10 latest runs
  are kept.

## Adding a row

1. Put the elements it needs in a fixture, each with a `data-e2e` id.
2. Write the row.
   - Start from `freshSelect(ctx, id, { frame })` in `scenarios/inspector.mjs`: it reseeds, waits for the seed, zooms
     to the frame, selects the element and waits for the Inspector.
   - For a feature that a hot update breaks, also add a `{ reload: true }` twin, so the feature itself is still covered.
3. Run `npm run studio:selftest`, which checks that every id named in a scenario exists in a fixture.
4. Run `npm run studio:e2e -- --rows=<id>`.
