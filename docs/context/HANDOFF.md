# Handoff — read this first in a new session

The short, current picture of Zen DS: state, gate, owners, where the details are. Keep it under ~90 lines. When a
session changes this picture, edit the matching line here, add a CHANGELOG entry, and put the detail in
`docs/context/session-log-<date>.md`. Long state text belongs in `HANDOFF-details.md`, work items in `BACKLOG.md`.

Last updated: 2026-10-07.

## Read order

1. This file.
2. [`AGENTS.md`](../../AGENTS.md): tier table (§C), how to build or change a component, the gate commands.
3. [`BACKLOG.md`](BACKLOG.md): only when picking up work or logging a follow-up.
4. [`HANDOFF-details.md`](HANDOFF-details.md): full state (versions, token syncs, contracts, harness), gate detail, house
   rules. `grep -n` it by topic.
5. On demand for the area you touch: [`CHANGELOG.md`](../../CHANGELOG.md), [`component-usage-rules.md`](../component-usage-rules.md),
   the latest `session-log-*.md` (search by component name), [`design-system-context.md`](design-system-context.md).

## State in short

- **Git:** work is on the local branch `claude/zen-ds-0.4.0` on top of `eafb0de`; nothing is pushed and `main` still
  points at `eafb0de`. New work shows as uncommitted changes. **Commit or push only when the user asks.**
  Zen Studio (`tools/studio/`, `src/platform/studio/`) has never been committed: by the user's decision (2026-10-03) it
  goes in later as one batch with every Studio session's work (canvas, drafts, resize, slots, detach, Figma-grade
  editing, multi-select), not file by file (`detach.mjs` alone would need the untracked `jsx-source.mjs`).
- **Source of truth:** the live Figma file `9nZv4uW2LT21yuHabMTCh1`, read-only through `use_figma`. The older key `yhWJ…`
  in some docs has no MCP access.
- **Library:** every Figma component is built (60 folders in `src/index.ts`, 49 guideline slugs). API vocabulary,
  labels (en/vi), `data-tone` variants and the harness are described in `HANDOFF-details.md` ("Vibe-code readiness").
  Since 2026-10-03 Stack/Grid/Box (and Text/Heading on the width axis) take Figma sizing: `width`/`height` hug · fill ·
  px, min/max, `alignSelf`, Stack `fillChildren` (`src/components/Layout/sizing.ts`, rules at the end of `layout.css`).
  Since 2026-10-05 Text/Heading/Icon `tone` takes every resting Color/Content token by its path (81 tones, old names are
  aliases; `src/components/_shared/contentTone.ts` + `content-tone.css`, test `tests/content-tone.test.tsx`).
- **Tokens:** repo-only edit 2026-10-06 (user): Component Size `Sidebar/Default-Width` = Compact 240 / Comfortable 260
  (Figma still 260 / 280 — keep 240/260 on the next variables sync unless Figma is updated); the docs no longer pin a
  260px rail. Before it: synced from the user's exports; the latest is the 2026-10-05 evening export "Zen-Variables 2": Global Colors
  carries Figma's Zen-High-Contrast mode (equal to the algorithm) and a re-synced Mint ramp; Mode Colors (Semantic) adds
  the 20 Support Sky/Mint tokens (repo 2,199). Avatar, Badge/BadgeCounter and DockIcon took the Figma Sky, Mint, Bronze
  and Golden themes the same day. Before it: the 2026-10-05 Global Colors export (235 values in Cyan, Grass,
  Blue, Bronze, Orange and Zen, step 9 included; no names changed). **Zen-High-Contrast (2026-10-05, prototype):**
  `ZenProvider contrast="high" | "system"` → `data-contrast`; `scripts/high-contrast.mjs` (block `ZenHighContrast`, also
  pasted into the Zen Plugin's `src/plugin/code.js`) generated the mode until Figma's Global Colors held it (the export does since 2026-10-05 evening), and
  `tokens:build` writes it at the end of tokens.css; `tokens:check` verifies its rules (step 9 / backgrounds fixed,
  Subtle borders 3:1, Neutral alpha 9–11 and colour steps 10–11 4.5:1). Before it: the 2026-10-03 Global Colors export from the Zen Plugin's new
  ramp algorithm (258 values: Light Neutral 4–6, Dark steps 2 and 4–7; no names changed). Before it: the 2026-10-02 Component Size token `AI-Chat/Field/Corner-Radius` and the 2026-10-03 Component Theme tokens `Input/Border/Focus` and `Input/Border/Popover-Search` (2,179 variables; that evening's Neutral-S7 export set `Input/Border/Focus` to Focus/Neutral/Solid, as in the other eight modes). Since 2026-10-05 Color/Content/Placeholder = Neutral-Alpha/9 in Light and Dark (user request, matches the live file; was step 8 like Disabled). The VT, Chat and Ananas
  ramps were removed from the repo but still exist in Figma: a future sync must drop them again. Motion tokens are
  code-owned (`tokens/source/motion.json`, 2026-10-01); the Figma "Motion" collection only mirrors the durations, so a
  variables sync ignores it.
- **Figma parity:** `node tools/figma-contract/run-all.mjs` (23 suites + 25 interactions). Captures live in
  `docs/figma-contracts/`: slice them with a script, never `Read` a whole file (0.7–2 MB each).
- **Harness:** 154 usage rules (`npm run usage:rules`). The style-guard baseline is empty, so every style finding is new.
- **Templates:** `src/templates/` holds the page templates shown on `?page=templates`; `src/templates/hr/` is the Figma HR-Platform set (7 pages on one `HrShell`; `HrRouterContext` links them, as App Shell › HR workspace does). Platform examples reuse its data from `src/platform/appLayer/hrDemo.tsx`. The pages were rebuilt from Figma node data on 2026-09-30 (read with `use_figma`, never from screenshots): same components/primitives, Figma copy and data, nothing invented — rebuilt again on 2026-10-01 from Zen components + research with the Figma as a moodboard only (brief docs/research/template-rebuild-brief-2026-09-30.md, shared data src/templates/hr/data.ts); follow-ups in BACKLOG "Template rebuild follow-ups". Screen rules: elevation follows the Sidebar, widget titles Subheading.
- **Examples (rebuilt 2026-09-30 → 10-02):** the 43 component + mobile pages read their examples from
  `src/platform/examples/pages/<page>.tsx` (one file per page, picked up by `examples/registry.ts`; a page with a file
  shows only those, app-layer extras are not appended). Shared world and formatters: `examples/data.ts` (Đìzai
  Studio, Alex Duong, today Sep 30, 2026). The rules are in `docs/research/example-rebuild-brief-2026-09-30.md`
  (spacing ladder §3b, one style §3c, phone Top Navigation §5b, final check §9) and usage rules §13–§15 (§15 grouped
  lists on phones: Surface-Alt screen, a white block per group). One mood (2026-10-06, usage rules §16): the stage is
  Canvas/Default and boxes on it are flat Surface/Default (Card/MetricCard `theme="flat"`, ListBox), no border or
  shadow unless a condition picks another pairing (Sidebar, white page/phone, Surface in Surface, clickable, selected). Phone frames (`PlatformPhone`) always render in
  Comfortable + Mobile (2026-10-06); only the Studio's Present changes modes, for that presentation. The old
  example functions were removed on 2026-10-02 (`PlatformShowcases.tsx` keeps ExampleCard, the Popover content sets
  and the registry; `PlatformMobileShowcases.tsx` only ChartReportPanel); the 12 app-layer pages (action-bar, app-shell, description-list, form, image, layout, link, menu, page-header, side-panel, text, visually-hidden) were rebuilt the same way on 2026-10-02 by the session "Add audit check for text overflowing its box". Their old examples in `src/platform/appLayer/*.tsx` no longer render (dead code, Backlog); the playgrounds there still do.
- **Figma re-sync kit:** `tools/figma-kit/` (README there) hashes the live sets through `use_figma`, names only the changed variants, fetches them and patches `docs/figma-contracts/`; `contracts.lock.json` holds the hashes. Use it instead of re-reading sets or spawning one agent per set.
- **Ship:** `npm run ship` (`tools/ship/README.md`) runs the gate for a small branch, pushes and opens the PR link/API. Pushing needs a GitHub token with Contents, Pull requests and Workflows write (or `gh auth login`); the sandbox cannot reach github.com, run it on the Mac.
- **Gate is parallel:** `tools/qa/run.mjs` runs tsc, contract suites and Vitest side by side, and audit + dark audit + behaviour side by side (`ZEN_QA_SHARDS`, `--serial` to opt out). Contract suites run 4 at a time (`ZEN_QA_SUITES`), each in its own `.out/<suite>-<pid>` folder; on the Mac (2026-09-30) all 23 passed that way on a token change. A token sync takes the fast path by itself (56 pages ≈ 10 min).
- **Native tokens:** `npm run tokens:native` (also part of `tokens:build`) writes `platforms/swift` and `platforms/flutter` (tokens + text styles, mode-aware resolver, shared vectors; see `platforms/README.md`). Swift/Dart were never compiled: run `swift test` and `flutter test` first. Not done: shadows, components.
- **Dev server:** `npm run dev`, port 5173. Since 2026-10-03 it answers on `localhost`, `127.0.0.1` and `[::1]` alike: Node 24 binds "localhost" to `::1` only, so `tools/dev/loopback-both-families.mjs` (in `vite.config.ts`) forwards the other loopback family. Any of the three works for `--url=` in `npm run qa`, audit, behaviour and shoot.
- **Zen Studio (2026-10-02) is the default docs UI:** `src/main.tsx` lazy-loads `src/platform/studio/StudioApp`
  (canvas tool: Pages/Layers, zoomable board of Playground/Examples/Docs frames, Inspector that edits source). The
  classic `PlatformApp` renders for `?ui=classic` and whenever `navigator.webdriver` is true, so `npm run qa`, audit,
  behaviour and shoot keep the same DOM. `vite.config.ts` runs `tools/studio/vite-plugin-zen-studio.mjs` (dev only):
  `data-zen-src` on platform JSX + `/__zen-studio/*` (source read, edit, write; admin role + per-server token).
  Docs-chrome functions carry a `// zen-studio-chrome` comment (never selectable). Spec:
  `docs/research/zen-studio-spec-2026-10-02.md`; plugin notes and selftest: `tools/studio/README.md`,
  `node tools/studio/selftest.mjs`. `vite.studio.config.ts` + `studio.html` serve the Studio alone on 5180.
  Since 2026-10-06 the canvas chrome floats as in Figma (`canvas/CanvasChrome.tsx`, mounted by StudioApp after the
  examples' overlay layer so a Dialog scrim never covers it): zoom top-right (percentage menu only), tools bottom-centre
  (`CanvasTools`, toolbar "Tools"), the tip as a "?" icon bottom-right (`CanvasStatus`, hint text visually hidden).
- **Studio → builder plan + E2E (2026-10-05, session "Studio builder tool planning"):** approved plan
  `docs/research/studio-builder-plan-2026-10-05.md` (GĐ0 E2E + GĐ1 fixes approved; GĐ2–5 builder pages each need a
  spec + the user's OK). `npm run studio:e2e` (`tools/studio/e2e/`, README there) drives the Studio on its own server
  (5190+) and writes an 81-row feature matrix; baseline `matrix.baseline.json` = 80 works / 1 broken (left: GĐ3 Assets
  without a selection ST-02).
  WP-C server: `tools/studio/data-source.mjs` (`dataSource` on GET /element, op setDataField, data files draftable);
  WP-C client: propSchema `dataEditable` / `dataSourceLabel` (bound PropValue carries `dataSource`), PropField data
  editor + "Set fixed value" (non-state bindings only), DesignPanel.setProp → setDataField with the row (rowOf);
  WP-F: overlays are layers in Select (studio.css data-picking, picker hostsOf/frameOfFiber/rendersPortal), `.map`
  text edits its row's data (textEdit.ts).
  WP-E: Figma properties for 53 components: read with `tools/studio/figma-props-read.js` (use_figma, one call per ❖ page)
  into `docs/figma-contracts/component-properties.json`; map `tools/studio/figma-props.map.mjs`; build/check
  `tools/studio/figma-props-build.mjs` → `inspector/figmaProps.generated.ts`; `inspector/componentGroups.ts` (hand-written
  propGroups first, else `groupsFromFigma`).
  WP-D (part): `src/platform/studio/appearance/` (AppearanceSection + CornerRadiusField + EffectsSection, pure
  `appearanceModel.ts` + selftest), mounted by DesignPanel for Box/Image (`appearancePropNames` leave Properties).
  Canvas `position/ConstraintLayer.tsx` (dashed constraint lines + pills, mounted after SlotLayer; E2E AP-04).
  ScaleField: `inspector/controls/{ScaleField.tsx, scale.ts (+selftest), hostContext.ts}`; PropField renders it for any enum
  whose type is a gap/padding/radius scale (`scaleOfType`), DesignPanel provides the canvas host (E2E I-15).
  Layout (2026-10-06, redesign spec phases 3, 4, 6): `inspector/LayoutSection.tsx` (moved out of DesignPanel) +
  `layoutModel.ts` (pure, selftest) + `controls/{AlignmentBox,ColumnsField}.tsx` + `controls/controls.css`; E2E group
  `layout` (L-01…L-08) on the fixture's new Grid example (frame 5).
  WP-B2 (2026-10-06): shared demo code (`isSharedFile`: annotated, not an example/template/playground file) is
  restructured after "Change shared code?": server `slots.mjs`/`jsx-source.mjs` refuse with code "confirm" (+ `uses`,
  `users` from `tools/studio/shared-code.mjs importersOf`) until `shared: true`; client `api.ts sendEdit` asks through
  `sharedConfirm.ts` + `shell/SharedConfirm.tsx` (alertdialog), a yes holds per file per page load (E2E ST-12).
  GĐ1 is complete apart from ST-02 (Assets with nothing selected = GĐ3). New: `src/platform/studio/gate.ts` + `shell/ReadOnlyChip.tsx` (why read-only), CanvasMenu
  targets (node / several / frame / canvas), `layout.ts` `phone` flag.
  **GĐ2 approved 2026-10-06:** spec `docs/research/studio-builder-pages-spec-2026-10-06.md` (pages in a gitignored
  `.zen-studio/pages/` on the dev server, lists as `mock.items.map`, blank page + device, delivered M1 → M4). In
  progress: M1 done 2026-10-06 (engine without Node: `posix.mjs`, `sha1.mjs`, `component-modules.mjs`; `dialect.mjs`;
  `browser-engine.mjs`; client `src/platform/studio/builder/` = engine.ts, localApi.ts (api.ts routes "local:" files),
  store/pageStore.ts (IndexedDB), render/renderPage.tsx (no eval, data-zen-src + data-zen-name), proto/runtime.tsx,
  BuilderBoard.tsx, NewPageDialog.tsx; store `localPage` + `pageKey(…, localPage)`; LOCAL_SERVER in useStudioServer;
  palette `builder` → proto.toast; E2E group `builder` B-01…B-06). M2 done 2026-10-06: `tools/studio/pages-folder.mjs`
  + plugin GET /pages, POST /pages/write|trash (`.zen-studio/pages/`, trash moves to `.zen-studio/trash/`,
  `ZEN_STUDIO_PAGES_DIR` for the E2E server); client `builder/store/pageModel.ts` (pure: sync plan, revisions, Trash),
  pageStore v2 (IndexedDB v2: revisions, settings, trashedAt, mirror sync), `store/mirrors.ts` (dev folder or File
  System Access Link folder), `builder/MyPages.tsx` (row + section menus, Rename / Version history / Trash dialogs,
  Import / Export); E2E B-07…B-13. M3 done 2026-10-06: `dialect.mjs` boardFrames / freeFrameId / frameCode /
  protoCode; slots.mjs insertChild takes Screen / Overlay on a builder page (BUILDER_RUNTIME, runtime import);
  `builder/proto/Player.tsx` (Play = `presenting: "play:<screen>"`, P, `?play=`, R, Esc), `proto/PrototypePanel.tsx`
  (Inspector tab "prototype": Flow + Interactions via setProp / removeProp), `proto/ProtoLinks.tsx` (arrows),
  `usePageTree.ts`; Interact tool runs proto on the canvas; Overlay frame is a `data-zen-overlay-root`; E2E B-14…B-18;
  baseline 98 works / 1 broken (ST-02). M4 done 2026-10-06: `npm run studio:build-check` (`tools/studio/e2e/build-check.mjs`:
  vite build + preview, the builder flow incl. Link folder through an OPFS folder, engine chunk size, parser only in
  it); `tools/studio/source-helpers.mjs` holds UNIT / pathTo / piece / importEdits (detach.mjs re-exports them and
  calls jsx-source `registerDetach`), so the browser engine has no detach recipes: 150 → 135 KB gzip; budget 140
  (user, 2026-10-06; the check fails above it). **GĐ2 is complete.** Next: GĐ3 (library search and insert): spec
  `docs/research/studio-builder-library-spec-2026-10-06.md` approved 2026-10-06 (preview of the focused item only,
  uploads with GĐ5, starters = GĐ3b, Vietnamese keywords); delivered M1 → M3. M1 done 2026-10-06:
  `src/platform/studio/builder/library/` (search.ts pure + selftest 77, synonyms.ts EN/VI → palette ids,
  keywords.generated.ts from `tools/studio/library-keywords-build.mjs` (--check in studio:selftest), catalog.ts,
  target.ts: frame in view → its first layout); Assets uses them; E2E group `library` LB-01…LB-04; ST-02 fixed:
  baseline 103 works / 0 broken. M2 done 2026-10-07: `library/QuickInsert.tsx` (⇧I in StudioApp; combobox +
  listbox, target line from target.ts describeTarget, a click outside closes), `ItemPreview.tsx` + `preview.ts` (the
  item's code in a one-Screen page parsed by the engine and drawn by renderPage; overlays forced closed, portals kept
  in the inert pane), E2E LB-05…LB-07, build-check 13 steps; baseline 106 works / 0 broken. M3 done 2026-10-07: `library/{iconSearch.ts (pure:
  glyphs, icon + photo search), iconSynonyms.ts, icons.ts, media.ts (LIBRARY_PHOTOS, `zen-media:` keys, resolveMedia,
  photoCode)}`; edit/assets/assets.ts `Insertable` (palette / icon / photo; an icon on a selected Icon swaps its name);
  Assets kinds Components · Icons · Photos; Quick insert groups; renderPage resolves `zen-media:`; E2E LB-08…LB-12;
  build-check 14 steps; baseline 111 works / 0 broken. **GĐ3 is complete.** GĐ4 instance panel like Figma: spec
  `docs/research/studio-builder-instance-spec-2026-10-07.md`, approved 2026-10-07 (Q2–Q4 as proposed; Q1 sizing: the
  user asked which is friendlier, proposal "(a) wrap in a Stack + 3 fixes" recorded in the spec §8, to settle before
  M4). M1 done 2026-10-07: Figma option names (`propGroups.ts` figmaOptions / entryOptions → PropField optionLabels,
  MixedProperties too); 70 mapped components (`figma-props.map.mjs`, nested groups `nested`, object toggles `on: { code }`);
  `inspector/inheritedProps.ts` (props from another component's props type, ALIAS_EXTENDS checked against the source);
  editor `icon-toggle` (boolean | IconName); Reset all overrides (`inspector/resetAll.ts`, DesignPanel header, one
  runPlan); E2E group `instance` IN-01…IN-06, build-check step 6 picks "Primary" + Reset all; baseline 117 works. M2 done
  2026-10-07: Figma swap defaults read (component-properties.json `default` / `preferred` on INSTANCE_SWAP; preferred =
  the whole icon set, so the user chose "default + icons used in this file": `inspector/iconSuggestions.ts`,
  InspectorFileContext); toggles `on: { swap }` start from Figma's default; server op `replaceElement` (arrange.mjs
  replacePlan, a slot op); Slots ⇄ menu on atom-slot rows (`swapSlotLayer`); Swap instance = Quick insert mode "swap"
  (`builder/library/quickInsertState.ts`, Inspector header ⇄, canvas menu) → `swapSelection`; E2E IN-07…IN-11,
  build-check 15 steps (Swap instance on the build). M3 done 2026-10-07: `nestedInstances.ts` nestedRows (a nested
  component's Figma groups: variants with option names, text toggles, swaps, texts; else its design props) rendered by
  NestedInstanceGroup; the hook is read once in DesignPanel (`nested` passed to GroupedProperties / NestedProperties);
  Reset all overrides adds the nested instances written inside the owner in its file, through op many setProps
  `opsByLoc` (arrange.mjs) = one ⌘Z; E2E IN-12, IN-13 (124 rows). M4 done 2026-10-07 (Q1: wrap in a Stack + 3 fixes):
  instance W / H (`select/instanceSizing.ts` published by ResizeLayer, `inspector/InstanceSizeGroup.tsx`, resize.ts
  planFill / planHugAxis: Hug unwraps); the Stack follows (Layers fold `isStudioWrap`, `studioWrapOf` in remove /
  duplicate / move / drag); Detach on builder pages (`tools/studio/browser-detach.mjs` lazy chunk, detach.mjs
  `pageLayout` for *.zen.tsx); E2E IN-14…IN-17 (128 rows), build-check 17 steps (engine 136.9 KB, detach 16.6 KB).
  **GĐ4 is complete.** GĐ3b starters: spec `docs/research/studio-builder-starters-spec-2026-10-07.md`, approved
  2026-10-07 (Q1 both sources, Q2 snapshot of what renders, Q3 HTML → Layout by token, Q4 overlays → Overlay frames). M1
  done 2026-10-07: `builder/starters/{snapshot.ts (fibers → literal tree; library components by export identity, so it
  runs on the build), toDialect.ts (pure, selftest), newPageFromFrame.ts}`; canvas frame menu + FramePanel button "New
  page from this frame"; E2E group `starters` SP-01…SP-03 (rows may set `timeout`: opening the Templates page compiles
  it); build-check 18 steps. M2 done 2026-10-07: `builder/starters/hostLayout.ts` (rendered HTML → Stack / Grid / Box /
  Heading / Text / Link / Image / Divider by token, measured with detach.ts textStyleKey / toneKey and partInfo
  colorTokensFor; `classProps` reads a primitive's className CSS back as props), docs chrome (`.pe-card*`,
  `.platform-phone*`, `.zen-provider`) walked through, the stage's padding kept; E2E SP-04 (fixture frame "E2E html");
  `tools/studio/e2e/starters-coverage.mjs` (every example frame, nothing saved): 323/323 valid. M3 done 2026-10-07:
  `builder/starters/fromTemplate.tsx` (templates render off screen as their Templates-page frame, lazy chunk) + New
  page's Start from (SelectField above Title; device from the template); overlays → `<Overlay id=…>` frames
  (`overlayNode`: open state dropped, an action object's onClick → `proto.close()`, SnapValue kind "proto";
  `pageFromSnapshot` / `overlayIds` in newPageFromFrame.ts shared by both); E2E SP-05, SP-06 (134 rows); build-check 19
  steps (Start from a phone template on the build). **GĐ3b is complete.** GĐ5 export: spec
  `docs/research/studio-builder-handoff-spec-2026-10-07.md`, approved 2026-10-07 (Q1 React and HTML, Q2 Promote into
  `src/templates/studio`, Q3 PNG in the browser, Q4 uploads in the browser). M1 done 2026-10-07: `tools/studio/compile.mjs`
  (page → one React component; isomorphic, lazy chunk `browser-compile.mjs` via `builder/engine.ts` loadCompile; selftest
  runs tsc noUnusedLocals + usage-guard consumer mode on its outputs), `tools/studio/standins.mjs` + generated
  `compile-api.generated.mjs` (`compile-api-build.mjs --check` in studio selftest: required function props / object
  fields from docs/api; the renderer `builder/render/renderPage.tsx` passes the same stand-ins, a Table column without
  `cell` shows `row[id]`), `builder/export/{ExportDialog.tsx, exportState.ts}` (PagePanel and My pages "Export…");
  `OBJECT_FIELDS` (closed object props: compile leaves out a design's own fields such as an option's `at`); snapshot
  leaves out a date outside a list (a prop, a DatePicker range) and a component value (`as={RouterLink}`, `to` → `href`).
  `starters-coverage.mjs --compile` (tsc + harness on every frame's React; a
  harness finding the design has too is noted, not failed). E2E SP-07 (Admin list's Table renders), HO-01 (136 rows);
  build-check 21 steps (compiler chunk, Export on the build). M2 done 2026-10-07:
  `builder/export/htmlExport.tsx` (lazy with the HTML tab: frames rendered off screen by renderFrame inside a
  ZenProvider, lazy photos loaded first; markup without data-zen-*/data-studio-*, runtime wrappers renamed `.screen` /
  `.overlay`; styles.css = reset.css (?inline) + the loaded rules whose classes are all `zen-*` and are used by the
  screens, token rules with their `--zen-*` only, the @font-face / @keyframes they name; fonts and library photos in
  the zip), `tools/studio/zip.mjs` (store-only writer + reader, selftest with unzip -t and Python zipfile),
  `builder/render/frames.ts` (frameOf shared with the board), CodeView language "html". E2E HO-02 (zip content),
  HO-03 (each HTML frame vs its canvas frame at 100%: 0.00% of pixels differ); build-check 22 steps. M3 done 2026-10-07:
  Export › Handoff (`prepareHandoff` in htmlExport.tsx: one off-screen render in the Studio's preview modes
  (`canvasModes`, a frame's own theme), the HTML files, a PNG per frame (`export/screenshot.ts`: exported markup in an
  SVG foreignObject, fonts and photos as data URLs, animations off), each frame's Tab stops (role + name), the compiled
  code (`compile.mjs` now returns `actions` per frame, `components`, `dataType`) and `export/handoff.ts` (pure:
  guideline notes from docs/guidelines/*.md, design names from the page tree, the markdown; `handoff.selftest.mjs` 15
  checks in studio selftest)); CodeView language "markdown". E2E HO-04 (zip content, handoff.md facts, each PNG vs its
  canvas frame: ≤ 0.02%), 139 rows; build-check 23 steps (the handoff on the build). M4 done 2026-10-07:
  `builder/assets/uploads.ts` (IndexedDB v3 store `assets`, id = name slug + FNV-1a of the bytes + extension, object
  URLs, `missingAssets` asks the linked folder first), `zen-asset:` in media.ts resolveMedia (MISSING_PHOTO picture when
  absent), BuilderBoard / Player re-render on `useUploadsVersion` and name missing photos (status "warning"), Assets ›
  Photos (Upload, drop, Your photos above Library), assets.ts `uploadInsertable` + a photo on a selected page Image swaps
  its `src`, exports (htmlExport maps an upload's object URL to `assets/<id>`; handoff code assets from the store),
  Import pages… takes a .zip (its `*.zen.tsx` + the `assets/<id>` the pages name), the linked folder writes / reads
  `assets/<id>` (mirrors.ts). E2E HO-05 (upload → page → canvas → zip → Import in a fresh browser), HO-06 (missing photo
  → replaced), 141 rows; build-check 24 steps (upload on the build, the folder's assets/). M5 done 2026-10-07:
  `tools/studio/promote.mjs` (planPromotion: compile with suffix "Template", photos from src/assets/media or the
  request; writePromotion: atomic, a differing template is a conflict unless overwrite; typecheck: a tsconfig in
  node_modules/.cache extending the repo's, noUnusedLocals, the file only; selftest 12 checks in studio selftest), dev
  server `POST /promote` (admin, dialect check, `ZEN_STUDIO_PROMOTE_DIR` for the E2E server: lib/server.mjs
  promoteDirOf), `studioApi.promote`, Export panel secondary action (DEV + admin; Replace on conflict; result line
  `data-e2e="promote-result"`). E2E HO-07 (142 rows); build-check 24 steps (no Promote on the build). **GĐ5 is
  complete** (M1–M5), merged to main (PR #1). Backlog after it (user, 2026-10-07): batch 1 cleanup and batch 2 Studio
  quick fixes done (E2E B-19, 143 rows; data-slot `removeItem { all }`); batch 4 examples/docs P2 done (6 fixed, 10
  already fixed and closed); batch 5a Studio P2 done (frame Save/Discard ownership, example pages keep state through
  keepOnHotUpdate in src/platform/hotData.ts, Effect settings, object props: + and same-file consts; E2E 147 rows, the
  gate's Studio E2E step now has 25 min); the CI Package step stays logged (P2, not approved). Batch 5b (Studio P3 small items) is
  done: 16 rows closed (E2E SE-08, SE-09, LB-13, LB-14, L-09; 152 rows), see the session log. Batch 5c (the five Studio decisions of batch 8, plus arrow keys on several layers, ⇧-click range in Layers and Mixed text props) is done: E2E SE-10…13, K-13, I-16; 158 rows, all working. Batch 6 (13 component decisions, plus ToggleListItem and ChipGroup composed without Figma: verify them, Backlog P2) is done: gate .qa/reports/2026-10-07T16-05-21 — browser tests 31/31, Studio E2E 158/158; the only ✗ is the cloud-only chat emoji [fit] (Backlog P3). Next in order: batches 6b, 7, 9. A backlog sweep (2026-10-07) checked the ~440 open items against the code: ~145 were done or
  duplicates and are closed with evidence (4 more close with the 5b gate); ~290 stay open (~214 work, ~63 decisions,
  ~13 need a check by hand). New P2: qa step ④ (example coverage) reads no `examples/pages` source. Batch 8 (the
  decision list) answered the same day (user: "theo đề xuất"): 12 rows closed, the approved work is tagged
  "Decided 2026-10-07 … → batch N" in BACKLOG (5c Studio, 6 components, 6b examples/docs, 7 Figma and fonts, 9
  tooling); still the user's: the Code Connect seat and package publishing; the designer questions are unchanged.
  `npm run qa` runs `studio:selftest` + `studio:e2e` when Studio files change (`uiKind` "studio" in tools/qa/lib.mjs).
- **Studio slots (2026-10-03, session "Slot Component phân biệt"):** spec `docs/research/studio-slots-spec-2026-10-03.md`.
  Client `src/platform/studio/slots/*` is live (Slots section, insert picker, Remove/⌫, ⌘D, canvas slot outlines, Layers
  slot rows, Reset slot / Clear contents); server ops in `tools/studio/slots.mjs` (live since the 2026-10-03 17:37 swap).
  Playground slots stay empty; only example/template files accept structural ops. Since 2026-10-04 (user: editing is
  free) the palette offers every DS component and host rules warn ("Not recommended here") instead of hiding; stateful
  items carry `state` and the server declares their useState (slots.mjs stateFor / hookEdits; Image imports
  platformMedia in example pages). `palette.selftest.mjs --deep` checks every item in every host.
  Data slots (props written as objects, `slots/dataSlots.ts` + server `tools/studio/items.mjs`): TopNavigation
  Top-Trailing (`trailing`, array) and Header-Trailing (`largeTitleAction`, form `list` = one object or an array) take 3
  each since 2026-10-05, matching Figma's Trailing-Slot and the component's `MAX_ACTIONS`; Control-Slot is a content slot.
  TopNavigation grouped actions (2026-10-05): `trailing[].group` (runs of one group share a pill in the bar style;
  `trailingGroup` deprecated); the slot has `groups: true`, so the Studio drags items on the canvas (`edit/itemDrag.ts`,
  armed from SelectionLayer onPointerDown) and in Slots rows (`DataSlotBlock` pressRow), server ops `groupItem` /
  `ungroupItem` / `moveItem regroup` in `tools/studio/items.mjs` (selftest 20 cases). propGroups entries can carry
  `warn` (shown under the field, never hidden).
- **Figma-grade editing (2026-10-03, session "Figma-like editing functionality"; plan
  `docs/research/studio-figma-editing-plan-2026-10-03.md`, all 8 phases done):** code in `src/platform/studio/edit/**`
  (mounted by `EditLayer` in StudioCanvas; hooks in SelectionLayer press / double-click / Enter / empty-canvas, LayersPanel
  press, StudioApp Delete / ⌘D and the Assets tab, CanvasMenu clipboard group, ShortcutsDialog rows), server ops
  `moveTo` / `pasteCode` / `many` in `tools/studio/arrange.mjs` (wired by slots.mjs, test `arrange.selftest.mjs`, in
  `node tools/studio/selftest.mjs`), `GET /element` `range`. Inline text edit, drag + arrow reorder, clipboard,
  Tab/⇧Enter + ⌥ measure, Layers DnD, Assets tab, Quick actions ⌘/, marquee (drag on empty canvas no longer pans:
  Space / Hand / scroll) and multi-layer Delete / ⌘D / copy / Mixed props. Follow-ups in BACKLOG.
- **Grid columns on the canvas (2026-10-06, session "Search spacing collapse bug"):** `select/gridTracks.ts` (+ selftest in
  `studio:selftest`) reads/writes a Grid's px column at the frame's breakpoint (setProp `columns` or setField of its
  key). Resize: the only item of a px column that fills it (no Fixed width of its own) resizes the column
  (`resize.ts` rule `column`, preview on the Grid's track list); spacing: grid gaps between tracks, `free` areas +
  Fit column to content (`SpacingLayer`). An item with a Fixed width still edits its own width (one request = one element).
- **Position / effects / corners (2026-10-03):** Stack/Grid/Box `position`, `constraintX/Y`, `inset*`; Box `effectStyle`,
  `clip`, per-corner radius; Image corners (spec `docs/research/studio-position-effects-radius-spec-2026-10-03.md`).
  Studio UI: the Position section is built (2026-10-04, session "Cho phép edit element floating":
  `src/platform/studio/position/**`, mounted by DesignPanel above Layout; any other layer floats in a Box, server op
  `unwrap` takes it away again); Effects and CornerRadiusField are still the next block (Backlog).
- **Object/array props (2026-10-04, B2):** props written as `{ … }` or `[{ … }]` are edited field by field (op `setField`,
  `SourceAttr.shape`; inspector `ObjectProperties.tsx` + `objectSchema.ts` read `docs/api/<slug>.json` types).
  `node tools/studio/editability-audit.mjs` counts what stays locked by class; next steps (B2+, B3–B5) in BACKLOG P2.
  **Data slots (2026-10-04, session "Mở lại port preview"):** Figma slots whose content the code takes as objects
  (`slots/dataSlots.ts`: TopNavigation `trailing` = Top-Trailing, `largeTitleAction` = Header-Trailing; Control-Slot
  `controlBar` is a content slot in `registry.ts`). Server ops `insertItem` / `removeItem` / `duplicateItem` / `moveItem`
  (`tools/studio/items.mjs`, test `items.selftest.mjs`); client `slots/dataItems.ts` (an item on the canvas = the part
  whose props hold the item object itself), `slots/DataSlotBlock.tsx` (Slots rows), `inspector/DataItemPanel.tsx` (a
  selected action: fields, move, duplicate ⌘D, remove ⌫), generic list controls in `ObjectProperties.tsx`.
  **Figma property groups (2026-10-05, same session):** `inspector/propGroups.ts` (registry, TopNavigation only; test
  `propGroups.selftest.mjs`, in the Studio selftest) + `GroupedProperties.tsx` replace the flat Properties list and the
  "Nested instances" section for a grouped component; nested-instance logic moved to `inspector/nestedInstances.ts`
  (its write()/valueFor are owned by session "Nested boolean không hoạt động" since 2026-10-05).
  **Text alignment (2026-10-05):** Text/Heading `align` = Figma's icon Alignment under Style (`TextAlignControl`, editor
  kind `text-align`; unset shows `textInfo` `RenderedText.align`); `truncate` = Truncate text + Max lines (kind
  `truncate`, `LinesControl`); Text/Heading take `height`, `verticalAlign` and `align="justify"` (row "Vertical", note
  from `textInfo` `alignmentHint`); host text elements get the rows from `inspector/HostTextAlignment.tsx` (inline style).
  Since 2026-10-03 admin edits are **drafts** on the dev server (`drafts-<port>.json` in `node_modules/.cache/zen-studio`)
  until Save: per frame (frame toolbar "N changes · Discard · Save", `tools/studio/frame-scope.mjs`) or Save all
  (toolbar, ⌘S). A drafted file renders from its draft on 5173 too, so `npm run qa` warns ("Unsaved Zen Studio drafts")
  when its browser checks see one; a disk edit to a drafted file rebases the draft onto it.
  Resize (2026-10-03): `select/resize.ts` + `ResizeLayer.tsx` (canvas handles, wrap of components in a filling Stack
  via the server op `wrap`), `inspector/SizingSection.tsx` (mounted by the Layout section owner through
  `inspector/fieldApi.ts` LayoutGroupProps + `api.apply`), `studio/cloning.json` (what is never wrapped; read by
  server and client). Slots (session "Slot Component phân biệt") live in `tools/studio/slots.mjs` + `studio/slots/*`.
  Multi-select + wrap (2026-10-03, session "Chọn nhiều element vào container"): Shift+click (canvas) or Shift/⌘+click
  (Layers) adds layers; the extras live in `select/multiSelection.ts` (own store, cleared when the primary changes,
  moved by writes), the Inspector shows `inspector/SelectionActions.tsx` instead of the Design panel. ⇧A wraps them in a
  Stack inferred from the render, ⌥⌘G in a Box (`select/wrapSelection.ts`, server op `wrap` + `with`). Delete/⌘D stay
  one layer (blocked with a status while several are selected).
  Inspector writes go through `inspector/writePlan.ts` (2026-10-05, user: edits keep behaviour): a prop bound to
  `useState(<literal>)` edits that literal (op `setStateInit`, `SourceAttr.state`), an uncontrolled state prop writes its
  `defaultX` twin, a boolean off is removed unless its default is true; such writes remount the frame
  (`board/remount.ts`). Nested-instance writes and the builder plan's WP-C reuse the same module.
  The Design tab (`src/platform/studio/inspector/DesignPanel.tsx`) runs in this order:
  1. The header (UI3, 2026-10-06): name · ×N · Detach/Remove icons (`compact`), kind · Docs, file:line + copy.
  2. Layout, which holds the Size group (`SizingSection.tsx`).
  3. Properties (plus inherited HTML booleans: disabled/required/readOnly, `propSchema.ts` `propSpecs`): Figma groups, else
     `autoGroups.ts` sections (Appearance · Content · Icon · State · Actions · More) and one section per object prop.
     Design panel UI3 (2026-10-06, `docs/research/studio-design-panel-ui3-2026-10-06.md`): Body/Small only; bound values
     show their control + a ƒ mark (`Section.tsx` BoundMark) and edit to a fixed value; read-only values in `StaticField`.
  4. Nested instances (`NestedProperties.tsx`, logic in `nestedInstances.ts`): booleans of the Zen components the
     selection renders from its props, found by fiber ownership (consts, helpers, local components, other files and
     Table column cells included; children are slot content). Writes go through `writePlan.ts` in a per-hook queue;
     data-bound booleans (`SourceAttr.origin` bound-value/loop-bound) have a switch + Restore (GET /element
     `savedAttributes`); `api.ts` rebases a stale edit across the Studio's own prop-level writes (2026-10-05).
  Under a spread, a prop the spread does not feed stays editable in every section (`propSchema.ts` `ownValueOf`); the
  server's setProp writes it in front of the first spread. `PlatformExamples.tsx` must export components only (and
  types), or every Studio edit to a playground reloads the whole page.
  5. Slots/Children (`studio/slots/`).

  Every control writes through `FieldApi` (`inspector/fieldApi.ts`: `apply` = one write and one undo step). The redesign
  spec is `docs/research/studio-inspector-redesign-2026-10-03.md`. Phases 2–7 are in the Backlog. The gate cannot map
  Studio files to a page ("Page mapping" ✗), so verify them in `?ui=studio` by hand.
- **List Item + List Box (Figma sync 2026-10-06 night, session "List Item padding/gap adjustment"):** rows pad
  Padding/Small 12px above and below, 0 at the sides (no Device variant); a clickable row's fill = the row's height,
  12px past it sideways, corners `--zen-interactive-list-item-radius`; List gap 3XSmall for every row. `ListBox`
  (Figma Component/List-Box 14922:75297, in `src/components/ListItem`): Surface, 2XLarge, header/footer Card-padding-medium,
  body Card-padding-medium × `--zen-list-container-vertical-padding`, gap 3XSmall — use it instead of a Box padded by
  hand. Phone lists across a screen: `Box paddingX="lg" paddingY="xs"`. No `--zen-list-bleed`; `List inset`
  deprecated. Studio: slots ListItem Contents, ListBox Header/Body/Footer; Detach gives rows `paddingY sm`.
  Since 2026-10-06 (user): ListBox only for List-Item rows; Description List, toggles, forms, Tabs stay in a Card. ListBox
  `theme` (flat default · shadow · pale · border) is picked by usage rules §16 (Sidebar → shadow, white page/phone or
  Surface-in-Surface → border).
- **Description List in Figma (2026-10-04):** built from code on the new page ❖ Description List (14857:3): `Description List`
  14859:79180 (Layout × Divider, Items slot) + `.Primitives/Description-List/Item` 14859:78890 (8 variants). No figma-contract
  suite yet (Backlog if wanted).
- **Phones (2026-10-01):** every phone example follows `docs/research/top-navigation-mobile-rules-2026-10-01.md`.
  - The rules: R1 scroll-linked TopNavigation, R2 one key per screen, R15 ActionBar footers.
  - The length rule: a list screen is at least 1.5× the phone's height, about 14 rows.
  - The examples session applies it to `src/platform/examples/**`. Playgrounds, the Typography and Text phones, and
    the mobile templates already follow it.
  - TopNavigation's fold survives screen swaps (G1). PlatformPhone pads the screen's scroll under an overlaid header
    (G2).
  - Roots follow Figma Top-bar=false: there is no empty bar row, and the actions sit beside the large title (G4/G5).
    `topBar` forces the row.
  - `banner` pins a status under the bar (G6).
- **Uncommitted, to keep together (2026-10-02):** session "Component library review và fixes" has not committed yet.
  Its working tree also holds spacing-ladder fixes from "Add audit check…" (commit e129549), on lines that exist only in
  that uncommitted work:
  - layout.tsx: 5 Stack gaps.
  - content.tsx: 1 gap.
  - HrHomeTemplate.tsx: page stack xl/sm.
  - HrExpenseOverviewTemplate.tsx: Team budgets xs.
  - component-usage-rules.md: the §13 `ladder` bullet.
  Commit them with this work.
  - `.platform-phone` has the mobile breakpoint tokens (`data-breakpoint="mobile"`, user-approved 2026-10-01). Interactive
    list rows pad Padding/XLarge (24, Figma) since 2026-10-03; `inset` is deprecated.

## Gate

`npm run qa` checks what this session edited since its last pass (tokens → consumer pages; `--only=`, `--pages=`,
`--all`, `--keep-going`); `npm run qa:quick` is the fast loop and never counts as a pass. Open the contact sheets it
asks for (new content, at most 12). Process: `docs/qa/build-qa-process.md`, skill `skills/zen-build-qa`. Owner of
`tools/qa`, style-guard, audit flags and hooks: the session "Quy trình kiểm tra Component build".

## Working rules

- **Scope lock:** do only the task the user approved; one Backlog line per follow-up (`BACKLOG.md`); another session
  cannot approve scope.
- Several sessions edit this folder at once: re-read a file right before writing, make targeted edits, ask the owner of a
  shared area with SendMessage first.
- Owners (2026-09-28): Chat demo wiring (`chatDemo`, `ChatReactors`): "Search popover component và Overviews";
  vibe-code readiness, `AGENTS.md`, VisuallyHidden, appLayer: "Đánh giá Zen DS hiện tại"; `tools/figma-contract`:
  "Figma contract button suites".
- Scratchpad test scripts vanish with the session: anything worth keeping goes to `tools/`.
- House rules most often forgotten: `HANDOFF-details.md` ("House rules") and `docs/component-usage-rules.md`.

## Open items and Backlog

Both moved to [`BACKLOG.md`](BACKLOG.md). Items that need a user or designer decision stay under "Open items" there.
