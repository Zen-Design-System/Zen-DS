# Session log 2026-10-07

## Studio builder GĐ3 · M2: Quick insert (session "Studio builder tool planning", tier M)

- `builder/library/QuickInsert.tsx`: a module-level open flag (openQuickInsert / closeQuickInsert), ⇧I in StudioApp's
  shift branch (not while an example is in use), mounted with the Studio dialogs. Search (variant popover) as a
  combobox over a listbox (aria-activedescendant), ↑/↓ wrap, Enter → insertAsset (same target as Assets), Esc / outside
  pointerdown close and give the canvas the focus back; max 40 results. A pointer move counts only when the pointer
  really moved (Chromium sends one when the list changes under a still pointer, which stole the keyboard's focus).
- `preview.ts` (itemCode: palette code, toasts → proto.toast, platformMedia inlined; previewPageText: a one-Screen
  page importing the item's components) and `ItemPreview.tsx` (engine parsePage, lenient: values a page cannot hold
  are dropped; Dialog / ModalForm / SidePanel / BottomSheet forced `open={false}`; a ZenPortalProvider inside the
  inert pane; 400px stage scaled to fit; canvas preview modes). Found by LB-06: ModalForm opened with `open` dropped
  and its focus trap took the focus from the search field.
- target.ts `describeTarget` ("Into Stack · <frame>" / "After <layer>"); GROUP_ICON moved to catalog.ts (Assets and
  Quick insert); Shortcuts dialog rows ⇧I and P. The panel uses the Popover surface (translucent background + its
  blur + Popover/Subtle outline; `zen-allow-popover-layer`, it floats). Search: a 3-letter token must equal a
  guideline keyword ("thẻ" no longer lists a dozen items through "theme"); selftest 78.
- E2E LB-05 (⇧I, Enter into the selected Stack), LB-06 (↓, real preview, Esc no change), LB-07 (example page,
  nothing selected; reopens the host page first: the rows before leave a builder page open). build-check gains a
  Quick insert step (13/13). Gate PASS, 106 works / 0 broken.

## Studio builder GĐ3 · M3: icons, photos, icon swap, zen-media (session "Studio builder tool planning", tier M)

- `library/iconSearch.ts` (pure): iconGlyphs (line/solid of one drawing = one glyph; a cut-only drawing takes medium;
  940 glyphs), searchIcons (AND over tokens: word 60/45 +10 first word, synonym 50 +10 on the name's first word +5 for
  the row's first word, typo 35 / 45 on the first word; ties shorter name, A–Z), searchPhotos (alt + key words).
  `iconSynonyms.ts` EN + VI → icon-name words (and photo alt words). Selftest `iconSearch.selftest.mjs` 39 (in
  studio:selftest; synonym words checked against the icon names and PlatformMedia.tsx's alt texts). Its first run
  showed the tie problem (annotation-x before x-close for "đóng"), hence the first-word and row-order bonuses.
- `media.ts`: LIBRARY_PHOTOS (viewer, mountainRoad, site[0–5], feed[0–7] under file-name keys), resolveMedia,
  photoCode (builder page: `src="zen-media:<key>"`; example: platformMedia.<path>, pasteCode adds the import).
  renderPage resolves `zen-media:` on every prop value (canvas, Play, previews).
- `edit/assets/assets.ts`: `Insertable` (label, root, code(file), refusal, state, icon) for palette items, icons and
  photos; insertItem (canEdit; an icon with an Icon selected → setProp name, one undo step), dropAsset / pressAsset take
  Insertables; insertAsset(item) kept.
- AssetsPanel: Segmented Components · Icons · Photos (sized to its labels: full width cut "Components"), Icons grid of
  IconButtons (Line / Solid, 240 at most, swap hint, plural count), Photos grid (2 columns). Quick insert: groups
  Components (20) · Icons (12) · Photos (6) for a query, components only when empty; "Swap the selected Icon" line;
  icon / photo previews without the engine.
- E2E LB-08 (Icons "xoá" → trash, added), LB-09 (swap to heart, one Icon, ⌘Z), LB-10 (Photos "cà phê" → zen-media,
  the canvas img loads this build's URL), LB-11 (Quick insert "đóng" → an x Icon), LB-12 (example page: platformMedia +
  import). build-check gains a photo + Icon step (the photo loads site-cafe-<hash>.webp). Gate PASS 111 / 0. I-11
  timed out once with --no-retry after the library group (2/2 alone): Backlog P3 next to I-15.

## Studio builder GĐ4 spec (session "Studio builder tool planning", tier XS)

- Read-only survey of the Inspector against Figma's instance panel (an Explore agent, file:line evidence in the spec
  §2): Figma order for 55 / 151 components with code option labels; icon swap without preferred values; no component
  swap in ReactNode props; nested instances booleans only, one level; no Reset all overrides; no Hug/Fill/Fixed on
  instances in the Inspector; Detach refused on builder pages. Figma capture: 144 sets (VARIANT 269, BOOLEAN 144,
  SLOT 59, INSTANCE_SWAP 36, TEXT 24); figma-props-read.js keeps no preferredValues.
- Spec `docs/research/studio-builder-instance-spec-2026-10-07.md` (M1 panel parity + Reset all, M2 swaps, M3 nested
  props + one undo step across owner and nested, M4 sizing + Detach on builder pages; Q1 sizing approach, Q2 swap the
  whole layer, Q3 preferred values from Figma, Q4 what Reset all keeps). Waiting for the user's OK.

## Studio builder GĐ4 M1 (session "Studio builder tool planning", tier M)

- User approved the GĐ4 spec: Q2 Swap instance via Quick insert, Q3 preferred icons read from Figma, Q4 Reset all keeps
  the content. Q1 (sizing) asked "which is friendlier?": answered (b) is cleaner in Layers and code but an L library
  change; proposed (a) wrap in a Stack + fold the wrapper in Layers, unwrap on Hug, move/delete it with the instance.
  Recorded in the spec §8, to settle before M4.
- Figma option names: generated rows carry `options` (code value → Figma name; a set by its last path part); PropField
  `optionLabels` → EnumControl lists Figma's options first in Figma order (`figmaOptions`, matchOption maps md ↔ medium),
  code-only options last. MixedProperties uses the same names and labels.
- Coverage: 15 more Figma sets mapped (70 components). `inheritedProps.ts` adds props a component takes from another
  component's props type (`extends` clause, or ALIAS_EXTENDS for type aliases build-api does not read: NumberField,
  TextAreaField; BadgeCounter's leadingIcon is set by the component and left out); shared by propSchema and
  figma-props-build; selftest 11 (ALIAS_EXTENDS matched against the source).
- BACKLOG 306–310: nested groups in the map (`nested`: Label from Primitives/Input/Label, Help-Text from code props
  until the Figma set is read in M2), object toggles (`on: { code }` → setProp expression; the object's row shows only
  while set), editor `icon-toggle` (switch + picker; off writes false, on resets to the default).
- Reset all overrides: `resetAll.ts` (design editors, fixed values only, KEEP value/open/type/as/headingLevel…, required
  props kept), DesignPanel header ↺ (zen instances), one runPlan of every planPropReset; selftest 12.
- E2E `instance` IN-01…IN-06 (fixture frame "E2E instance"); the rows that picked "primary"/"sm" now pick the Figma
  names; IN-04/05 wait for the switch to flip (layer switches read the rendered props, ~0.3–0.5 s after the source).
  build-check step 6: "Primary" + Reset all + 2× ⌘Z. Full matrix 117 works except the known flaky I-15 (3/5 alone).

## Studio builder GĐ4 M2 (session "Studio builder tool planning", tier M)

- Figma read (use_figma, read-only, 4 parallel calls; one call of 25 sets timed out at 60 s): every INSTANCE_SWAP's
  default and preferred-value count. Preferred values hold the whole icon set (1,569–3,534; Chat bubble 4), so the
  user picked "Figma's default + the icons this file uses" over a hand-written list. Stored in component-properties.json
  (`default`, `preferred`, `swapRead`); figma-props-read.js reads them from now on.
- figma-props-build: swap rows carry `default` (an icon name); toggles `on: { swap: "<Src prop>" }` start from it (Button
  Leading/Trailing → icon-plus-line); Slider's Icon boolean skipped (its icon-toggle row switches it).
- IconControl: grouped popover (Default in Figma · Used in this file · All icons) when not searching; the file's icons
  come from studioApi.source via InspectorFileContext (iconSuggestions.ts pure, selftest 5).
- Server op `replaceElement { code, state? }` (arrange.mjs replacePlan, slot op, hash required): the code takes the
  element's place in a child, a prop value, a .map row; key kept; names as pasteCode; unused imports go; cloning `only`
  respected. arrange.selftest +4 cases (36).
- Client: slots `swapSlotLayer` (⇄ menu on atom-slot rows, palette items of accepts.only), `swapSelection` + assets
  `swapItem` / `swapTarget`, Quick insert mode "swap" (quickInsertState.ts; header ⇄, canvas menu "Swap instance…"),
  SlotConfirm verb "swap".
- E2E IN-07…IN-11 (fixture: Badge with a heart icon, ListItem with an Avatar), build-check 15 steps (Swap instance on
  the production engine, 135.5 KB).
- I-14 (WP-E) expected the old fixed Leading-Icon (icon-check-line); it now expects Figma's default (icon-plus-line). Caught by the gate's full matrix.

## Studio builder GĐ4 M3 (session "Studio builder tool planning", tier M)

- Nested instances: `nestedRows(name)` builds a nested component's rows from its Figma groups (own variants with option
  names, text toggles such as Button Leading-Icon, then swaps / texts / booleans), else its design props (choices,
  switches, icons); NestedInstanceGroup renders fields (PropField with optionLabels / defaultIcon) and toggles, `when`
  read on the nested hit's props. Before: booleans only.
- useNestedInstances takes a nullable element and is read once in DesignPanel (`nested` prop to GroupedProperties and
  NestedProperties; `sourceOf(item)` added).
- Reset all overrides: nested instances written inside the owner in its file join; one request `many` setProps with
  `opsByLoc` (arrange.mjs manyPlan: each loc its own setProp / removeProp list; selftest case 37). Elsewhere-written
  nested instances (shared code) are left alone. Tooltip counts the nested ones.
- E2E IN-12 (Avatar in Leading: Shape · Size · Theme · Background · Status · Focus; Size › Large writes the nested
  Avatar), IN-13 (Reset all: ListItem `selected` + nested Avatar `size` in one edit, one ⌘Z). Fixture ListItem gains
  `selected` and an Avatar `size`. Full matrix in 3 chunks: 124 works; build-check 15/15 (engine 135.6 KB).

## Studio builder GĐ4 M4 (session "Studio builder tool planning", tier M)

- User settled Q1: "(a) wrap in a Stack + 3 fixes"; and asked to fix the flaky I-15 in its test (waits for `sm · N`
  before ⌫).
- W / H for an instance: `select/instanceSizing.ts` (store the canvas publishes), ResizeLayer measures it (written mode,
  else crossFits → Fill / Hug) and plans `set` with planResize (typed px: `corner` so never fullWidth), `planFill`,
  `planHugAxis` (resize.ts: Hug unwraps a Studio wrap Stack that sizes nothing else, op unwrap). `write(…, keep)`
  keeps the instance selected inside a new Stack; an unwrap selects it where the Stack was; WrapRecord `inverse` /
  `keep` make ⌘Z / ⇧⌘Z re-select it. Inspector: `inspector/InstanceSizeGroup.tsx` (SizeField from SizingSection, new
  `onInput`) in the Layout section of Zen instances.
- The Stack follows: Layers fold it into the instance's row (`isStudioWrap`, alias, `data-wrapped`); `studioWrapOf`
  (slots/actions.ts, from the source: `stackTagBefore` + studioWrapper) makes remove / duplicate / move (actions.ts) and
  stepLayer / moveLayer (edit/arrange.ts) act on the Stack and select the instance inside (`insideWrap`);
  moveAvailability reads the Stack's siblings.
- Detach on builder pages: `tools/studio/browser-detach.mjs` (lazy chunk, 16.6 KB gzip; engine 136.9 KB with
  jsx-source split into its own chunk), `loadDetach`, `localDetachPlan`; detach.mjs `pageLayout` turns the recipes'
  inline styles into Layout props on *.zen.tsx (max-content → width="hug", flex 1 → Fill) and refuses the rest
  (EmptyState, DescriptionList). Selftests: detach page cases, engine-iso graph of browser-detach.
- E2E IN-14…IN-17 (128 rows); build-check 17 steps (detach chunk on its own; Detach on the build).

## Studio builder GĐ3b spec + M1 (session "Studio builder tool planning", tier M)

- User: "theo thứ tự đi" → GĐ3b first. Spec `docs/research/studio-builder-starters-spec-2026-10-07.md`; the user chose
  every proposal (both sources, snapshot of what renders, HTML → Layout by token, overlays → Overlay frames).
- M1: `builder/starters/snapshot.ts` walks the frame's fibers: library components by export identity (memo / forwardRef
  objects too; providers walked through), props → literals (handlers dropped, refs and controller objects such as
  useForm's `form` left out with one note, controlled props → their default twin, HTML field attributes add
  defaultValue / defaultChecked, library photos → `zen-media:`), elements in props found by their props object in a
  props → fiber index (page components walked through, unrendered ones read from props), `<br>` → a line break, a
  single-child HTML wrapper unwrapped silently. `toDialect.ts` prints the page (selftest 16 checks, validateDialect).
  `newPageFromFrame.ts`: validate, putPage, open, status "Not kept: …".
- Canvas frame menu and FramePanel "New page from this frame". E2E SP-01 (fixture frame → page, edit level), SP-02 Sign
  in (desktop), SP-03 Mobile list (phone), no console errors; run.mjs takes a row's own `timeout`. build-check step on
  the minified build (templates page, frame label click: Layers shows 500 rows).

## Studio builder GĐ3b M2 (session "Studio builder tool planning", tier M)

- `builder/starters/hostLayout.ts`: a rendered HTML element → Stack (flex: direction, gap, align, justify, wrap; block:
  gap = median space between children) / Grid (column count, gap) / Box (surface or border token, radius) around it,
  padding by token; h1–h6 → Heading, text tags → Text (textStyleKey / toneKey exported from inspector/detach.ts), `a` →
  Link, `img` → Image (`zen-media:` for library photos), `hr` → Divider; aria-hidden, display none, svg / form fields /
  video left out; a wrapper around one thing unwrapped. `classProps`: a Stack / Grid / Box / Text with a className gets
  what it renders as the props it does not write.
- snapshot.ts: React's lone text child (no text fiber) read from props; docs chrome (`.pe-card*`, `.platform-phone*`,
  `.zen-provider`) walked through; the stage's padding → the padded Stack (`starterPage({ padding })`); several elements
  in one prop → a row Stack; notes grouped (className, style), logic functions (get…/is…) quiet.
- Fixture frame "E2E html" (HtmlFixture) + E2E SP-04; starters rows open the fixture page fresh. Coverage script
  `tools/studio/e2e/starters-coverage.mjs`: 323/323 frames valid, 57 with nothing left out. IN-16 waits for the Layers
  rows (it flaked in the M1 gate).

## Studio builder GĐ3b M3 (session "Studio builder tool planning", tier M)

- `builder/starters/fromTemplate.tsx`: `templateChoices()` / `snapshotTemplate(id)` load `appLayer/templates` lazily,
  render `examples.templates[i].render()` (the Templates page's frame: PlatformPhone or `.patpl-frame`, both chrome)
  off screen (fixed, left of the viewport, inert), wait 3 frames + 150 ms, snapshot, unmount.
- New page dialog: SelectField "Start from" (Blank page + 15 templates, "(phone)" marked) above Title; Device only for
  Blank; Title optional for a template; "Creating…" while it renders.
- Overlays: `overlayNode` (open / defaultOpen dropped; an object prop whose onClick was a function gets
  `onClick: proto.close()`); `pageFromSnapshot` writes them as Overlay frames (`overlayIds`: title slug, unique).
  Coverage on templates / dialog / side-panel / bottom-sheet: 33/33 valid, 65 Overlay frames.
- E2E SP-05 (Start from Sign in), SP-06 (fixture Dialog → `<Overlay id="fixture-dialog">`, Done closes it); toDialect
  selftest 18; build-check 19 (Start from Mobile list on the build → phone page).

## Studio builder GĐ5 spec + M1 (session "Studio builder tool planning", tier M)

- User: "tiếp" → GĐ5. Spec `docs/research/studio-builder-handoff-spec-2026-10-07.md`; answers: React and HTML, Promote
  into `src/templates/studio`, PNG in the browser, uploads in the browser (IndexedDB).
- `tools/studio/compile.mjs`: screens → branches on a history (state variants first), overlays → `overlay` state, proto →
  code, mock → `export const mock` + inferred type, `zen-media:` → `./assets` imports; only used state is declared.
  Selftest 27 (tsc with noUnusedLocals, usage-guard consumer mode). Lazy chunk `browser-compile.mjs`.
- Export panel (SidePanel modal, Segmented React / Design file, CodeView Copy, Download). HO-01.
- Found while compiling the starters: a Table column without `cell` threw in Table (`column.cell is not a function`),
  so a page from Admin list / Dashboard / the HR lists stopped the canvas (GĐ3b's SP rows used Sign in and Mobile list).
  Fix: `standins.mjs` + generated `compile-api.generated.mjs` (12 components); renderer and compiler share them. SP-07.
- Snapshot: a date outside a list (DateField `today`, a DatePicker range) is left out (it became ISO text, which the
  prop does not take); a component value (`as={RouterLink}`) is left out, its `to` becomes `href`.
- Generated `OBJECT_FIELDS` (44 components): compile leaves out fields a closed object type lacks (option `at`, file `bytes`).
- Coverage `--compile`: templates + 4 pages 26/40 → 40/40; every page 314/323, then the 9 (date-picker, link,
  top-navigation, uploader) 46/46 after the fixes above; every page again: 323/323 (tsc + harness).
- Gate PASS (.qa/reports/2026-10-07T06-32-15-e54a8cf5.md, E2E 136 works); build-check 21/21 (compiler chunk 4.3 KB,
  engine 137.6 / 140 KB: the stand-in list is in the renderer).

## Studio builder GĐ5 M2 (session "Studio builder tool planning", tier M)

- User: "tiếp" → M2. HTML from an off-screen render (renderFrame in a ZenProvider, theme light, the device's
  breakpoint, syncDocument off; its data-zen-src file is `export:<id>` so it never reads as the canvas page).
- styles.css from document.styleSheets: a rule is the library's when every class is `zen-*` (or a :root / data-attribute
  token rule, kept with its `--zen-*` declarations), and it is kept when its selector without states matches a screen;
  @media / @supports / @layer wrap what they keep; fonts named by the kept CSS go in the zip (`fonts/`), others stay
  links; reset.css comes from `?inline` (its `*` / `body` rules cannot be told from the docs' own in the build).
- HO-03 first failed at 33%: off screen a lazy Image never loads, so its markup kept the 4:3 loading frame; images now
  load before the markup is read. Then 0.00% on the screen, its empty state and the Dialog overlay.
- Zip writer: store only, UTF-8 names, CRC-32; `unzipFiles` reads it back for E2E and build-check.
- Gate PASS (.qa/reports/2026-10-07T07-17-29-e54a8cf5.md, E2E 138 works); build-check 22/22 (the HTML step on the build:
  one bundled sheet, styles.css 328 KB with the Inter and JetBrains Mono files).

## Studio builder GĐ5 M3 (session "Studio builder tool planning", tier M)

- User: "tiếp" → M3. One render serves the HTML, the pictures and the focus order; it now uses the Studio's preview
  modes (theme, component theme, density, typography, radius, emphasis, contrast; a frame's own theme), as the canvas.
- Pictures: XMLSerializer (XHTML inside the SVG), fonts and photos as data URLs (an SVG image loads nothing). The first
  overlay picture was blank: an SVG image draws every animation at its start (the Dialog and scrim at opacity 0); the
  picture CSS turns animations and transitions off. Then ≤ 0.02% of pixels differ from the canvas (HO-04).
- handoff.md sections follow docs/research/studio-builder-export-2026-10-05.md §6. The usage harness cannot run in the
  browser (check-usage.mjs reads files with node:fs): the file names `npx zen-usage <Page>.tsx` instead. Open questions:
  builder pages have no canvas notes yet, so the section says so.
- Build-check 23/23: Mobile list's pictures on the build (780×2428, 370 KB; its overlay 1440×1280).
- Gate PASS (.qa/reports/2026-10-07T07-44-17-e54a8cf5.md, E2E 139 works).

## Studio builder GĐ5 M4 (session "Studio builder tool planning", tier M)

- User: "tiếp" → M4. Uploads in IndexedDB (pageStore v3 `assets`); ids hash the bytes with FNV-1a (crypto.subtle needs
  a secure context, which the E2E host alias is not). The renderer resolves `zen-asset:` synchronously from loaded
  object URLs; BuilderBoard and Player subscribe so a photo shows once loaded.
- Replace a missing photo: a photo click on a selected Image of a page sets its `src` (as an icon click swaps an
  Icon's glyph). This also changes a library photo click on a selected Image (was: add after it).
- E2E: HO-05 found that the dev server's pages folder already holds the page in a fresh browser, so an imported copy
  takes its own id; the row reads it from the address. LB-05 / LB-06 failed with --no-retry: after LB-04 a frame stays
  selected and "New page from this frame" also matched getByRole("New page") (retries hid it): `exact: true` now.
- Build-check 24/24: the upload on the build, its copy in the linked (OPFS) folder's assets/.
- Gate PASS (.qa/reports/2026-10-07T08-20-19-e54a8cf5.md, E2E 141 works).

## Studio builder GĐ5 M5 (session "Studio builder tool planning", tier M)

- Continued after M4 (the user asked how long was left). compile.mjs takes `suffix` (Template); promote.mjs plans,
  writes (atomic; unchanged files are not rewritten; a differing template needs overwrite) and type-checks the file
  alone with the repo's settings; POST /promote adds the harness (runHarness: style-guard + usage-guard).
- The E2E server promotes into node_modules/.cache/zen-studio/e2e-promote-<port>/ (never the repo's src/templates/studio).
  HO-07: Promote → TypeScript ✓ · harness ✓, the photo copied; a local edit to the template → "exists and differs" →
  Replace → the page's code again.
- GĐ5 complete: M1 React, M2 HTML, M3 handoff, M4 uploads, M5 Promote.
- The first M5 gate failed one promote selftest check (not reproduced alone or under load; its detail was not listed). tsc now runs with --pretty false (its error lines are what the filter reads) and each failing check prints ✗ lines the gate shows. Rerun: gate PASS (.qa/reports/2026-10-07T08-40-11-e54a8cf5.md, E2E 142 works).

## Backlog cleanup (session "Studio builder tool planning", tier XS)

- User: "Khoan xử backlog trước", then approved batches 1 (cleanup), 2 (Studio quick fixes), 4 (examples/docs P2); the
  CI Package step stays logged (P2). An inventory pass counted 297 open rows (194 actionable, 80 decisions, 4 blocked,
  8 manual, 11 maybe done).
- Closed 12 rows that are done or duplicated, each struck with a dated reason: placeholder contrast (kept token),
  Typography scrollRef (done), the second Code Connect line, PageHeader mobile order ×2 (done 2026-10-05), Light
  Neutral step 10 (decided), the 2026-10-03 design-tokens gate line (all parts tracked), Narrow window navigation
  (done), Pending invites and Hana Kim dead clicks (probe), TopNavigation E2E rows (duplicate), playground Avatar
  (kept). The other overlaps are fragments inside multi-topic lines and stay as written.

## Backlog batch 2: Studio quick fixes (session "Studio builder tool planning", tier S)

- 14 rows approved ("2 · Studio sửa nhanh"); 13 fixed, 1 (setProp/removeProp on a multi-line self-closing tag) already
  fixed: set then remove returns the original text (a selftest check now covers it).
- Frames list (P2): `inspector/frames.ts` useFrames kept page A's frames on page B (same `screen:screen-1` id, same
  element); it compares labels too and re-reads on the frame registry. E2E B-19 fails on the old code, passes now.
- First view: `FIRST_VISIT_MIN_ZOOM` 0.5 (`canvas/viewport.ts`); measured on 5173: 1280 → Playground ends at 912, the
  Inspector starts at 960; 1024 → 656 / 704 (63%).
- `jsx-source.mjs` setPropEdits: a new last attribute goes after a trailing `// comment` (3 selftest checks).
- Selftest samples: tsconfig.json excludes `src/platform/examples/drafts` (gitignored), the samples' tsconfigs set
  `exclude: []`; `detachable.selftest.mjs` joins `npm run studio:selftest` (33 checks).
- Inspector: "Child size" (SizingSection), `title` on truncated headings (DesignPanel, FramePanel), nodeKind falls back
  to the engine's zenComponents (ZenPortal, PopoverBulkAction* read as Zen), List "Row inset" label removed; palette
  "Metric card · Value and trend in a card".
- Data slots: `removeItem { all: true }` (items.mjs; the toast hook goes with the items) for a Figma list boolean
  switched off with 2+ items (GroupedProperties ToggleRow); a move past identical items writes nothing and says why
  (slots/actions.ts runDataItem). items selftest 21 cases.
- SlotLayer clearOfPill: a + chip that lands on `.studio-resize__pill` moves just below it.
- Gate PASS (.qa/reports/2026-10-07T09-23-28-e54a8cf5.md): Studio selftests, style/usage guard, TypeScript, Studio E2E
  143 works · 0 broken. Not covered in a browser: the list-boolean switch-off path (no TopNavigation in the E2E
  fixture) and the chip/pill move (measured by code only).

## Backlog batch 4: examples/docs P2 (session "Studio builder tool planning", tier S)

- 16 rows approved ("4 · Examples/docs P2"). First an audit (`audit.mjs --quality`, 13 pages × 1512/390) and 390 shots:
  10 were already fixed by later work and are closed with the evidence (SSO label, Docked inspector, Trailing actions →
  Pending invites with a More menu, the Menu table scrolls by design, Sidebar shells use lists, Bulk-Action bar, Brand
  colour example gone, Dialog Half-Half, Templates list caption, chat/side-panel h1s).
- Fixed: Visually Hidden playground stage `pac-vh-stage--table` min(680px, 100%) (the table is ~664px; Archive was cut);
  ai-chat phone TopNavigation `title="Zen AI"` (its code sample had it); HrPublicHolidayTemplate h2 Heading/4; Table
  playground Progress `label`, Neutral (default), code sample too; PlatformChatHeader `scrollRef`, passed by the 5
  Messenger threads and the Chat playground (all 6 headers `data-scroll-linked`, `data-scrolled` once scrolled); Accordion
  playground Content width chip.
- Rebased batch 2 onto main after PR #4 merged (it carried batch 1, PR #2 Google sign-in, PR #3); `npm install` for the
  new `pocketbase` dependency (AuthGate skips automated browsers, so audits and E2E run as before).
- Gate PASS (.qa/reports/2026-10-07T09-50-16-e54a8cf5.md): 0 errors; the ⚠ are the templates page's existing rhythm /
  outline-siblings (the same lines as the audit before the edits; AiChatBlock row in the Backlog) and its known 90 s
  behaviour budget. Contact sheets templates-390/1512 reviewed.

## Backlog batch 5a: Studio P2 (session "Studio builder tool planning", tier M)

- User: "theo thứ tự" (Studio medium → component P2 → Figma contracts → the decision list). 5a = the Studio P2 rows.
- Frame Save/Discard: `sourceDrafts.ts` frameLocs reads the frame's React tree too (Zen components keep data-zen-src
  off the DOM; overlays portal out); `frame-scope.mjs` owns the module-level declarations the owned code names
  (closure; routers never), list elements inside ExampleMap / keepOnHotUpdate(…) literals, and a router's fallback
  statement (templates playground: 2237 → 28 of PlatformExamples.tsx's 2409 lines). Real pages: an example owns
  ~100/812 lines of top-navigation.tsx; chat examples ~45% of chat.tsx (shared messenger code). Selftest 23.
  An E2E row was dropped: the fixture is itself a draft of the host page, so a frame Discard there reverts the fixture.
- Remount: reproduced on 5173 (open a thread in chat › Chats inbox, write a prop through the API): Vite "Could not Fast
  Refresh ("examples" export is incompatible)". Fix: keepOnHotUpdate moved to src/platform/hotData.ts and wraps all 55
  example pages (script with @babel/parser; one import line each); registry keeps the records (isWideExample);
  readers re-render on useHotDataVersion, notified after React Refresh (plugin-react's before-refresh hook + a 0 ms
  timer: a render before the refresh met an unknown type and remounted); example frames keyed by place (a title edit
  kept remounting); a setDataField write restarts the selected frame (data read into initial state).
- Effects/CornerRadius (1096) were already built (AppearanceSection); added the spec's Effect settings and the card
  theme effect row (E2E AP-05, AP-06; layout fixed after a screenshot: the settings toggle in the section header).
- 312 leftovers: Toast Actions → toggle; Close stays skipped (a no-op handler fails the harness); Toggle has no Figma
  Subtext property; characterLimit/Help-Text wait for the read.
- 240: objectStarter.ts (+ for an unset object prop; named types from docs/api via import.meta.glob, E2E IN-18);
  jsx-source constLiteralFor: shape and setField through a same-file const of ≤ 20 items (selftest +6, E2E IN-19 on a
  new "E2E const" fixture example, appended last so frame indexes stay).
- Gate: the first run failed S-01 (React key warning): the new "E2E const" fixture wrote Segmented options with
  `value` instead of `id` (the fixture is outside tsc). Fixed; S-01 and IN-19 pass. studio:build-check 24/24.
- Gate reruns: the second was cut off by the gate's 15 min limit (no summary), which left StudioSaveFixture.tsx saved
  mid-D-02, so the third failed D-01 ("Unsaved · 1 file"). Restored from git; the Studio E2E step's limit is now 25 min
  (tools/qa/run.mjs; the matrix runs ~15). Both logged in the Backlog (shard the matrix; restore the fixture at start).
- Gate PASS (.qa/reports/2026-10-07T11-40-19-e54a8cf5.md): Studio E2E 147 works · 0 broken in 946 s (past the old
  900 s limit); the scoped run before it covered the runtime audit (templates ⚠ pre-existing, same lines as before).

## Backlog sweep (session "Studio builder tool planning", tier XS)

- Five read-only agents checked every open item (lines 157–1239, ~440 items split from 326 lines) against the code,
  audits and probes: ~111 done, ~37 duplicates, ~214 still open, ~63 decisions, ~13 unsure.
- BACKLOG.md: done rows carry "Done (checked 2026-10-07, backlog sweep: evidence)", duplicates point to the kept row,
  rows with some parts done get a "Sweep 2026-10-07" note (done / still open). No line added or removed in the body.
- Rows fixed only by the ungated WIP b89020f (Escape to the common parent, optimistic switches, Assets Clear search)
  stay open with a note until the batch 5b gate passes.
- New: P2 qa step ④ reads only *Showcases.tsx and appLayer/ (run.mjs:456, lib.mjs:227), so pages in examples/pages
  skip the coverage matrix; P3 stale leftovers (a layout.tsx comment, a DetailTemplate zen-allow, stale baselines).

## Backlog batch 8: decisions (session "Studio builder tool planning", tier XS)

- 61 questions from the sweep's DECISION rows, each with a recommendation; the user took every recommendation.
- BACKLOG.md: 12 rows closed ("Closed (2026-10-07, user decision in backlog batch 8: …)"); the others carry
  "Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8): … → batch N". No recommendation, still open: the Code
  Connect seat (Org/Enterprise) and package publishing; the nine designer questions are unchanged.

## QA gate step ④ and example-page scoping (session "Studio builder tool planning", tier S, batch 8 item 61)

- tools/qa/run.mjs: step ④ reads `src/platform/examples/pages/<page>.tsx`'s `examples` array (plain or
  `keepOnHotUpdate(…, "examples", [ … ])`) for pages that have one; the app-layer maps stay for the others.
- tools/qa/lib.mjs: `isExampleSource` takes examples/pages/*.tsx; `pagesForEdit` maps examples/pages/<page>.tsx|.css to
  `<page>` (all 55 file names equal their `page` export). Before, such edits mapped to no page without `--pages`.
- Replica over all 55 pages: every page has examples; gaps: side-panel (edge cases, mobile), sidebar (states, mobile),
  tooltip (mobile), logged P3. Quick gate --only=side-panel,tooltip: step ④ warns as expected
  (.qa/reports/2026-10-07T13-07-50-e54a8cf5.md). The full gate runs with batch 5b.
