# Session log 2026-10-24

## Session C · Prototypes pushed to Figma (tier M; BACKLOG P3, user-approved via the progress session)

Branch `zen/feat/push-prototype-20261024` from main 1b9a9cd0; plugin `studio-import` dcd3af3 + 6490d95. User, verbatim: "Cho C
(đang rảnh) làm luôn P3 'Push Overlays and prototype actions to Figma': push mọi Screen và Overlay thành frame, kèm
reaction Navigate / Open / Close overlay / Back."
- Push: `figmaPackage` writes `frames` for every Screen, Screen state and Overlay (`figmaFromPage` takes `frame`; an
  Overlay's frame hugs, no canvas or height; a page of one Overlay draws it, so Copy for Figma on an Overlay frame works
  now). The old notes ("only the first Screen", "Overlays not pushed", "interactions not pushed") are gone; what Figma
  has no reaction for is named per action, and an action on a part with no layer of its own is counted.
- `tools/studio/figma-proto.mjs` (new): action ↔ reaction both ways, Motion tokens (120/200/280 ms, Emphasized curve;
  the push selftest compares them with tokens/source/motion.json), Overlay settings as hand-step notes, ACTION_LAYERS
  for Dialog, Side Panel and Bottom Sheet buttons (read in the Zen file; the sheet's two are both "Button/Main", so
  its path is a list of names, plugin layerAt takes one; checked live).
- Plugin: `place` → `placeFrame` per frame, side by side, then `applyReactions` (setReactionsAsync, nested layers too);
  `existingRoot(pkg, part)` keeps a whole page's frames (`set = page`) apart from ⌘C copies and reuses the old
  whole-page frame for the first Screen; a copy's reaction finds the page's frames on the page.
- Pull: the reader reads `reactions` (destination by the frame id the import kept); `pageFromFigma` writes `proto.*`
  back, the frame's After delay as the Screen's `onDelay`; a Dialog button's reaction goes into its action prop when the
  page has one. Native paste: an Overlay root hugs; interactions are a note (the plugin's import carries them).
- Live in the Zen file (QA page, removed): the real importer (unrelated parts stubbed) placed 3 frames 120 px apart,
  the Overlay 440×212 hugging; Invite → Open overlay (Dissolve 0.2 s, CUSTOM_CUBIC_BEZIER); the Dialog's Primary →
  Close overlay; imported again: 0 created, reactions kept. The reader read back Push right 0.28 s, While hovering and
  After delay 1.5 s.
- Tests: push 467 (+16), pull 135, native 150 (+1), plugin `npm test` (multi-frame, legacy frame, ⌘C copy, removed
  reaction, missing destination); E2E HO-16 (new, Export › Figma of HTML_PAGE; id from Giám sát).

## Backlog triage · "Backlog (plan before opening sessions)" (tier XS, docs only; started by the progress session)
- All 53 entries checked against main 545216b6: grep, the named files, git history, and two read-only Figma variable
  reads (Bubble-Chat-Others-Business is Surface/Default in all nine modes; Popover-Search is still NaN in S1–S6).
- 10 done, 2 stale, 3 duplicates of archived entries, 25 partly done (rewritten to what is left), 13 still open
  (5 kept as written, 8 merged into group entries). 48 originals archived with their verdict, text unchanged.
- Left: 35 entries under 7 owner groups (business, Studio, components, designer, platform, tooling, design check);
  4 P2: the LICENSE review, the registry's user steps, ModalForm `header={false}` without a name (a11y), and the
  contrast/targets baseline seeding. "## Open items" untouched; nothing P1-urgent found. No work started.
- User "Giao 35 mục theo đề xuất": the Designer entry moved to QUESTIONS.md / .vi.md as the 2026-10-24 designer batch.

## Session B · platform-audit `clip` check and self-test (tier S; Tooling 2a + 2b, user "Theo đề xuất", handed over by chart-contract-suites)

- **2a `clip`** (`tools/platform-audit/quality-checks.mjs` controlClip, wired in audit.mjs like `fit`: `--quality`,
  error, baselined). It reports three cases:
  - a control (button, link, tab, option, input…) cut off by an `overflow: hidden | clip` or `contain: paint` ancestor
    (> 2px);
  - a control wholly past that edge while a sibling control of the same parent shows;
  - a control whose visible middle is under another element of the example (elementFromPoint, the window scrolled to it
    and back).

  Not reported: scroll containers, a device frame's bottom edge, a group hidden as a whole, floating layers and scrims,
  invisible hit areas, the docs chrome, and a bar over the scroll container the control scrolls in.
- **2b** `tools/platform-audit/selftest.mjs` (`npm run platform:audit:selftest`, gate harness list, CI):
  - fixtures with the real tokens.css and typography.css in headless Chromium, no dev server;
  - each kind, with a clean twin: scale, roles, hierarchy, rhythm, ladder, fit, card-gap, legend-column, outline,
    outline-h1/-start/-card/-siblings, clip (10 fixtures);
  - pageChecks is cut out of audit.mjs by its top-level braces (the script runs when imported).
- **Gate bug fixed:** tools/qa/run.mjs ERROR_KINDS missed `counts` (an error since 2026-10-15), and `card-gap` and
  `legend-column` (since 10-16), so the gate passed them as warnings. The self-test now checks that the list equals
  audit.mjs SEVERITY's errors.
- **First full run (gate slot):** controlClip alone ran on every page at 1512, 390, 320 and dark 1512 (isolated server).
  - It found 137 covers. All of them were content passing under a sticky layer: an AppShell bottom bar, a docked
    ActionBar, a header, or a Gantt / Schedule label column. That is by design, so a cover inside a sticky or fixed
    layer is no finding now (self-test fixture added, 41 checks).
  - The re-run found nothing, before and after merging train A (#274). `clip` needs no baseline entries.
  - Scoped gate (`--isolated`, 10 pages): PASS, 0 errors and 0 new warnings at 1512, 390 and 320 and in dark.
- **Own wiring bug, found in the gate's output:** the gate skipped the new Platform-audit self-test, because
  `auxKind` (tools/qa/lib.mjs) did not count tools/platform-audit as a tool folder. Fixed. qa:selftest now checks
  that every folder in the gate's harness list is an auxKind (it fails without the fix). The static gate then ran
  the step: PASS.

## Session B · Studio editor group of the planned backlog (tier S; user: "Giao 35 mục theo đề xuất … Phần không cần quyết làm ngay")

The group's six entries (BACKLOG rewritten in #262), each checked against the code first:
- **Drafts live push** (built): the dev server sends `zen-studio:drafts` over its HMR socket whenever the drafts change
  (`persist`) or a drafted file changes on disk (`diskChanged`); `sourceDrafts.ts` reads GET /drafts at once. E2E D-07:
  a draft written by the API (another client) and its discard show in the tab's drafts button within 2.5 s.
- **Resize leftovers (2)** (built): a `.map` row's resize previews every row it draws (`copiesOf`: the same
  data-zen-src in its frame; restored with the drag). E2E DA-10 (drag without release, all rows alike, Escape writes
  nothing).
- **Ungroup E2E** (built): ST-28 groups Favourite with Share from the Inspector's item row, then takes Favourite out
  (ungroupItem: a group of one is no group, Favourite keeps its place).
- **Resize leftovers (1)**, **slots (a)**, **slots (b)**, **per-row override**: questions for the user (sent to the progress
  session as one list). Slots (a) turned out not to be told apart by text: a remove + insert of a same-named element
  in its place and an edit of the original's words give the same draft, byte for byte.
- **Link folder**: a hand check in Chromium (an OS folder picker), asked of the user with the list.

The user's answers (through the progress session, "Theo đề xuất"): resize (1) stays as Figma does it, slots (a) closed,
slots (b) A built and B not (computed `.map` rows keep "edit it in the code"), no per-row override (relabelled).
- **Slots (b) A** (built): `constChildUse` (slots.mjs) finds the `{…}` child unit that shows a const through a condition
  (`childUnitAt` on each read), the one at the Studio's `parent` when the const is read elsewhere too; two at one holder
  are refused by name. `describeSlots` lists a condition's const elements, so the client's `constHolderOf` and
  `readBlock` place them. `slot-audit --op=move`: 22 → 4 refused (ai-ui `field`, shown twice in one Stack). Selftest
  +16, E2E ST-29 (fixture ConstFixture: Send backward on `{view === "list" ? note : null}`, `trailing={note}` stays).
- **Per-row override**: editability-audit's three "B4" classes name what the Studio edits (I-09, I-10, I-11).

## Contract suites, batch 2 (tier L; BACKLOG P3, the user's go 2026-10-24 through the progress session)
- 66 suites, written by seven parallel helpers (one per group, case kinds in `tools/figma-contract/cases/<group>.tsx`,
  merged by cases.tsx so they never shared a file): Avatar/Single, Avatar/Stack, Avatar status, Badge, Badge-Counter;
  Segmented Item (a SegmentedItem-in-Segmented kind), Segmented, Toggle, Toggle-Button, Toggle Content, Breadcrumbs (3);
  nine Input fields; eleven Input parts, Search/Default, Search/Popover (+ a light/neutral-s4 mode), Divider; thirteen
  Table cells; seventeen DatePicker and Sidebar parts; three Chat sets. `.Primitives/Date-Picker` 9923:2323 has none
  (code has no sheet header): BACKLOG. All 105 suites + 25 interaction checks pass (one by one, niced, beside another session's --all gate).
- Code drifts fixed at their owners (CHANGELOG): Avatar, Badge, Input (six), Table toggle columns, DatePicker (six),
  Sidebar (four, incl. the Workspace width 340 → 320 Compact). I read every diff before the commit; tsc, style:check,
  usage:check clean.
- Figma-side inconsistencies → `figmaExceptions` + QUESTIONS.md "From the contract suites, batch 2"; resolved:
  QUESTIONS Segmented (P2) binding, the BACKLOG Breadcrumbs "4px list padding" (both captures pad 0). New BACKLOG: the
  APIs the suites asked for, the checker gaps. Linux fonts (#252): no text-decided width or x is asserted.

## Menu and Chip on phones (C, tier L; branch `zen/feat/menu-chip-phone-sheet-20261024`)

- User decision 2026-10-24 (option A, automatic), handed from box-themes. `_shared/phone-sheet.tsx` holds SelectField's
  rule (`usePhoneSheet`: the nearest `data-breakpoint` above the control, else ZenProvider's) and `sheetLeading`;
  SelectField and DateField now use it too.
- Figma, read with use_figma: Primitives/Sheet-Actions/Item (4059:17214) holds `.Primitives/Popover/Item/Content`
  (829:20006), whose Subtext is Caption/Regular 11px, 2px under the label. So BottomSheet items got `caption`, and the
  Popover's own caption, Body/Small/Regular 12px since v0.2, was fixed to Caption/Regular at its owner.
- Menu on a phone: `<BottomSheet type="action">` holding the Menu's own rows (`SheetActionRow`, MenuContext `sheet`),
  so `children` composition, groups (a labelled `role=group` with its own list) and separators survive; shortcuts are
  dropped. Trigger `aria-haspopup="dialog"`; keyboard opening starts on the first / last item (`data-autofocus`). The
  sheet's modal owns Escape, Tab and focus return. The deliberate action-sheet-without-items is `zen-allow-sheet-items`.
- Chip on a phone: SelectField's sheet (List + ListItem, Selected + check, Search filtering by text unless the app
  filters, `done` label for `popoverMultiple`). `onPopoverCreate` chips keep their popover.
- Tests: `tests/interaction/menu-chip-sheet.test.tsx` (7). Two backlog-fixes tests that test the popovers at 390px are
  pinned to `breakpoint="desktop"`. Chip's "Filters on a phone" example now uses `popoverItems` instead of a hand-built
  sheet. Generated: guidelines/api docs, Studio compile-api and partProps.

## Gate: `--failed` re-runs only what failed (process audit B.2; the user's go 2026-10-24) (tier S, tools/qa)
- `npm run qa -- --failed`: after a failing full run with nothing in its scope edited since (the ledger's editedAt), the
  gate keeps TypeScript, the Figma contracts and Vitest where they passed, runs the quick static gates again, the browser
  steps only on the pages that had an error or no report (`retryPagesFrom` in lib.mjs reads the last run's audit /
  dark / behaviour JSON), and the Studio E2E only if it failed; a pass marks the files passed as a full run would.
  Anything edited, a passing or quick last run, or a missing report → it says why and runs everything.
- qa:selftest 26 → 30 checks (the page choice); a static-only run against a fake failed ledger skipped TypeScript and
  re-ran the failed self-test (the fake ledger and its report removed after).
## Tooling fixes (#264; tier S–M; the user's go 2026-10-24)
- `avatar/solid-initials-contrast`: measured today's tokens (both themes the same): golden 2.58, teal 2.70, cyan 2.96,
  orange 2.98 below 3:1; green 3.48 and bronze 3.38 pass, so the rule lists golden | teal | cyan | orange (fixtures,
  guideline, the sidebar example's comment).
- `-shadow-off`: `token-outputs.mjs` declares each companion in every component theme (`initial` where not tinted);
  tokens.css +66 lines, no value changed; Chromium check of a Neutral-S4 chip inside Neutral-S3: the shadow is back.
  `tokens:check` counts gaps (66 on main, 0 here).
- Audit `edges`: a focused element's outline / ring is not a frame. Gate: `pidIsQaRun` (a reused pid is stale).
  Baseline notes follow fix-at-once. Playground empty slots → example-patterns §3c; APFS backups → zen-build-qa §2.
- BACKLOG P2 seeding: `audit.mjs --quality --viewports=1512,390 --baseline-update=contrast,targets` over all 73
  pages, light (636 s) and `--dark` (658 s), isolated: no new key. The three contrast keys (app-shell E7 2.90:1 at
  1512/390/320) were all there were; targets 0. Baseline unchanged. The dark pass with playgrounds also lists
  rhythm/roles/scale/outline-siblings findings the light keys hold; the gate's dark step (`--no-playground`) never sees
  most of them.
## Components group of the triaged backlog (tier M; user 2026-10-24 via the coordinator: "Giao 35 mục theo đề xuất … Phần không cần quyết làm ngay; phần cần quyết gom lại hỏi tôi một lượt")

Branch zen/fix/components-backlog-20261024 from main 6e4e6605 (worktree festive-archimedes-176df5, beside PR #248's
queued gate). The 9 Components entries of PR #262's triaged BACKLOG: what needs no decision is built; the decisions
went to the coordinator as one list.
- ModalForm `header={false}`: the title stays the modal's name as a visually hidden heading, the unshown description is
  no longer referenced; new `aria-label` / `aria-labelledby` (labelledby wins). Interaction tests in dialog-modal.
- Nits: ProgressCircle `decorative` (HR Tasks' status marks; harness progress/needs-label accepts it, good fixture);
  Table `currentRowId` (aria-current + Selected fill; six templates and the Side Panel files example moved off
  `selectedIds` for the open row); Popover / Menu keep their opened edge and clamp from it (resolveAnchoredAlign no
  longer flips while open: a 64px jump at anchor x 278 in a 390px window); TextArea `:read-only, :disabled` no grip;
  Chat ring radius per bubble shape (`--zen-chat-ring-radius`); onJumpToReply documented for threads that load older
  messages (jumpToChatMessage returns false when the original is not rendered); Breadcrumbs plate bleed = Figma, noted.
- Toggle docs: platform visuals, playground and its PlaygroundToggle on checked / onCheckedChange; JSDoc cites
  Toggle-Button 1523:104 and Toggle 1526:5703.
- Card: `--zen-card-shadow` set with an alt `--zen-card-surface` (platform .pe-shell[data-canvas="alt"]);
  surface="default" resets it. Test in card-color.
- Phone targets: 44px `::after` hit areas under `[data-breakpoint="mobile"]` for the ChartCard Open button, the Metric
  header action and Pagination's xs arrows (outward only: `data-arrow`), zen-allow-slot-size (no 44 token). FileUpload
  `buttonSize`; Settings template uses md on phones.
- DatePicker: Event-List read in Figma (510:36577: 4px dots, Gap/3XSmall, Content/Accent/Light, On-Selected
  Date-Picker-Item/Content/Selected); `event` count, Calendar passes counts. Cells/panels from
  --zen-select-item-size-medium|small (Compact 32/24, Comfortable 40/32, Studio 28): tests in calendar.
- TopNavigation: Figma check — Header-Trailing holds `.Primitives/Top-Navigation/Mobile/Nav-Slot/Action` (6340:42675)
  like the bar, its Nav-Action has Trailing-Icon / -2, so `largeTitleAction` pairs a `group` (groupedPlaces); the push
  mirror (figma-top-nav topNavActions) groups the lead too and notes it.
- Decisions sent to the coordinator: TopNavigation new props, Menu/Chip phone sheet, AdminList bar → bulkActions,
  Table add-row (recommend close), Sidebar headers (recipe), designer: Card Default hover/pressed, Table hover on
  non-clickable rows.
- Checks: tsc, usage:check / selftest, style:check, guidelines / ai-ui / Studio maps rebuilt, push / pull selftests,
  vitest dialog-modal, anchored-position, popover/menu files, card-color, component-fixes, calendar + date files,
  navigation / top-navigation-parity / liquid-glass. Gate: pending its slot from Giám sát.
- User decisions (2026-10-24, "Theo đề xuất", via the coordinator), built here: AdminListTemplate's selection ActionBar
  → Table `bulkActions` (labels name the skipped rows); Sidebar recipe "Account header and module title" (brand +
  chevron-selector Menu, SidebarSubHeader); Card Default Hover/Pressed and Table hover on rows that open nothing →
  QUESTIONS.md / .vi.md; Table add-row closed. Menu/Chip phone sheets handed to session C (#271, spec sent; Menu.tsx
  overlap = #266's clamp). TopNavigation (2) in progress on `wip/top-nav-20261024`: Figma read — Heading-Text/Basic
  4060:17984 Dropdown = icon-chevron-down-line 20 Gap/2XSmall after the Sub title; Badges = a row under the H1 heading
  (Gap/XSmall, Badge Medium Neutral Solid), so `largeTitleAction` does not cover it. BACKLOG: 7 Components entries
  archived, TopNavigation and the sheet line rewritten.
- CI: the library CSS check reads comments (`.pe-` in card.css's comment failed "Gates, tests and package"); reworded.

## Tooling: approved harness rules, inventory, :5173 warning, token scope in TSX (tier S–M; the user's decisions 2026-10-24)
- Rules (each with an `expect:` case in fixtures/bad.tsx and a clean case in good.tsx): `table/bulk-actions-max` (array
  literal or `(ids) => [ … ]` with more than five), `chip/needs-action` (Normal/Advanced with no handler, popover or
  selection; code samples, stories and component source skipped), `max-three-trailing` flags a group of three or more
  (my "count each item" recommendation meant this: a grouped pair stays one place, as Figma's dual Nav-Action),
  `search-folds-to-action` also on `scrollRef`. `chip/needs-action` found two dead chips in Studio's ThemePreview
  specimen: they now press like the buttons beside them.
- 1e/1f: `docs/research/harness-inventory-2026-10-24.md` (0 bare Containers around a Table; 887 Do/Don't lines, 161
  checked; three candidates for the user).
- 2c: `toolServer()` in tools/qa/isolated-server.mjs; audit, shoot and visual-diff warn on :5173 and take `--isolated`.
- 3c: `tokenScope` reads `var(--zen-…)` in TSX/TS (component folders → their page, example pages → the page); against
  228897cd it finds 19 TSX consumers. 3d documented in skills/zen-build-qa §3. B.2 is its own PR.
- Follow-up (#276, Giám sát 2026-10-24): `date-picker-event-list.mjs` compares Event-List Number-Event 1–4 (offsets from
  the first dot; 256/256 over 8 variants × 2 modes); BACKLOG Tooling lines closed, Gate details archived.

## Native packages compiled in CI (tier S, CI only; BACKLOG P3; user: "thêm job CI macOS chạy swift test và flutter test cho platforms/")

Branch zen/ci/native-platform-tests-20261024 from main 6a7e872a, PR #267.
- `.github/workflows/native.yml` (Native packages): `swift test` in platforms/swift and `flutter test` in platforms/flutter
  (subosito/flutter-action@v2, Flutter 3.24.5 stable), both on macos-14; only on PRs / pushes to main that touch
  platforms/**, scripts/build-native-tokens.mjs or the workflow, plus workflow_dispatch (macOS minutes).
- First run (0608e651): Apple Swift 5.10 builds the package (20 s) and passes 4/4 tests; Flutter 3.24.5 passes 4/4. #238's
  Zen-High-Contrast Swift and Dart compile — nothing to fix in the generator's templates.
- This Mac still cannot run either locally (memory native-toolchains-broken-locally, updated): the PR's run is the check.

## TopNavigation props (tier M; user 2026-10-24 "Theo đề xuất", Components decision 1)

Branch zen/feat/top-nav-props-20261024, stacked on #266 (the WIP from `wip/top-nav-20261024` re-applied).
- Figma (read live): `.Primitives/Heading-Text/Basic` 4060:17984 — Type=Sub's Dropdown is icon-chevron-down-line 20,
  Spacing/Gap/2XSmall after the title; H1's Badges are a row under the heading (Contents gap XSmall, Badge Medium
  Neutral Solid), so `largeTitleAction` (beside the title) does not cover it.
- `titleMenu` (Menu around a title button, `aria-haspopup="menu"`; the button sits inside the heading, out of the tab
  order while the large title shows), `titleDropdown` (the chevron on an `onTitleClick` title), `largeTitleBadges`
  (heading-stack + badges row), `scrolledType` (type switches with `scroll.scrolled`; `data-scrolled-type` fades the
  ::before fill and the content colour, also under reduced motion).
- Examples: Title menu, Large title with badges, Hero header, Selection mode (recipe). Guideline do-lines.
- Studio: push writes Top-Heading-Text Dropdown and Main-Heading-Text Badges (only when on, notes for the menu's items,
  the sample Badge and scrolledType); pull reads Dropdown back as `titleDropdown`. Selftest case.
- Tests: navigation.test (titleMenu opens its menu, titleDropdown, badges 8px under the heading, scrolledType both ways).
- Checks: tsc, usage:check / selftest, style:check, guidelines / ai-ui / Studio maps, studio:selftest, push / pull.

## Merge train A (#274: #263, #265, #268, #269, #271; tier L gate)
- Built on main 9143769d, then merged main 6999a5f3, 454b9374 and 59baff82 (date-picker.css combined as #266's and
  #269's owners OK'd; #269's DatePicker suites read `.zen-date-picker__events > i`). Member heads re-merged as they moved.
- `npm run qa -- --all --isolated`: PASS (static, Vitest 85/85, all contract suites, audit 1512/390/320 0 errors,
  dark 0, behaviour 0, Studio E2E 4 shards); 12 new contact sheets reviewed, nothing to fix.
- verify:package: all checks pass; Button with its style entry 34.1 KB CSS gz against 97.2 KB with styles.css.
- #268 style comparison: a 19-entry page (entries imported in reverse order) against styles.css: 1,247,556 computed
  values, 0 differences (12 registered custom properties of Voice / PageHeader / DashboardHeader exist only with
  styles.css), screenshots identical; 58.9 KB against 97.2 KB CSS gz.
- BACKLOG: the Platform examples group (#263) and Package weight (#268) closed to the archive.

## Session B · harness inventory candidates (tier S; user picked all three, 2026-10-24, via the progress session)

- **`listbox/grouped-on-phone` (error):**
  - On a phone screen, it flags a ListBox, Card or bare List that holds two or more kicker groups (Body/Small/Bold)
    of rows.
  - It also flags a kicker + bare List group straight on the screen when the screen has two or more of them.
  - One kicker over one bare list is the open section of listbox/closing-list-on-phone, so it is left alone.
  - 0 hits in the repo.
- **`table/titled-box` (warn):**
  - It flags a Table in a Card or ListBox with no heading above it in the box, no ListBox header and no caption.
  - Read as "the box names it": the literal "every Table in a titled box" contradicts §14 (a page table sits bare
    under its Heading/4). The progress session was told.
  - 0 hits.
- **`segmented-fit` (audit, `--quality`, warn, baselined):** on a phone (viewport < 768 or `.platform-phone`), it flags
  a Segmented that scrolls sideways, or a fullWidth one with an ellipsized label. Self-test: 4 fixtures, 46 checks.
- **Guidelines:** list-item, segmented and table name the checks; guidelines and ai-ui were rebuilt.
- **E2E baseline:** PT-16…21, HO-13…16 and K-24…27 are now works (all ✓ without retry in the 355/0 full run; their
  owners are archived; Giám sát's ask).
- **Gate slot:**
  - The first segmented-fit scan (every page at 1512, 390, 320 and dark) found 12 hits in the desktop compositions at
    phone widths (app-shell B3/B4/G1, chart Range ×2, Studio analytics) and in the Segmented playground. All are
    baselined (14 keys with the playground's "Full width toggled"). A BACKLOG line holds the example fixes (Chip rows on
    phones, a design call).
  - The messages carry no px, because they are baseline keys.
  - The gate also caught ST-28 failing under load (the Inspector re-rendered while the row held its button). It now
    clicks through the locator: 3/3 alone, structural 22/22.

## Session B · E2E ST-29 and DA-10, broken since #265 (tier S; Giám sát, fix-now rule)

Both rows were broken in every run since #265: train A's gate, #275's gate and a local run. New rows don't fail the
gate, so they looked green. They were written without being run, which was the slip.
- **ST-29:** Send backward on a const shown on a condition and in a prop opened "Move in all 2 places?". The move only
  touches the `{…}` at the holder (constHolderOf), so runMove now counts only the renders the holder shows directly
  (`moveRepeats`, slots/actions.ts). That is a UI fix as well: the dialog was wrong there.
- **DA-10:** a ListItem in a List can never be resized (cloning.json: it cannot be wrapped, so no handles). The data
  fixture now has a `.map` of Boxes (`crew-tile`), and DA-10 resizes those (3 rows, height 53 → 78 on every row,
  Escape writes nothing).
- **Runs:** both rows pass alone; the structural and data groups pass together (32); the full default E2E gives 355 works,
  0 broken (1562 s).
- **Baseline:** my new rows (D-07, DA-10, ST-28, ST-29, VA-05…09) went into matrix.baseline.json as works, so a
  regression now fails the gate. The other teams' new rows (PT-16…21, HO-13…16, K-24…27) are left to their owners.


## Contract checker gaps (tier M, harness; user 2026-10-24 "Làm", BACKLOG P3)

Branch zen/feat/contract-checker-gaps-20261024.
- `tools/figma-contract/check.mjs`: `fills` (every visible paint, bottom to top: background-color under the
  background-image layers, one-colour gradients as solids, `none` layers skipped), `image` (IMAGE fill = an `<img>` or a
  `url()`), `radius` on mixed corners (all four, each binding; pills ≥ 999 per corner), `minw` / `maxw` / `minh`, `dash`
  (SVG dasharray × dashScale, else a dashed border), `fxIgnoreRing`, `strokeVia: "inset"` (edge or ring), per-side `sw`
  read at `strokeSide`. README lists them.
- A full run-all with only the semantic changes (per-corner radius, per-side weight) passed: no suite regressed.
- Un-skipped: Toggle-Button / Toggle / Control-Cell bar fills, the dot's fx (fxIgnoreRing); Editable cell fills (Surface |
  Pale pinned: code's opaque Surface under Figma's Pale) and its 2px bottom underline (inset); Range-Selected-End
  corners (Item, Mobile Item); chat bubble fills (Social Others: Surface | Neutral/Subtle), tail corners, Business
  min 66, Message max 220 / 516, min 42; gridline dashes (bar, area, trend charts); Read-Only dashes (fields, text area);
  photos (Avatar/Single, Chip Normal / Advanced, Avatar / Photo cells, Popover item content). No drift found.
- Negative checks: a 500px text cap and a 1px underline (CSS edited, restored) fail as `maxw` and `stroke`.

## Session B · platform audit per-page watchdog (tier S; bug at its owner, Giám sát + progress session)

#278's CI "Platform audit" was cancelled at 45 min. It audited ~4–5 s per page up to templates@390, then nothing for
32 min on text@390, which the green run on 4b8f626e did in seconds. It was not #278's segmented-fit: CI runs the
audit without `--quality`. audit.mjs had no per-page limit, because page.evaluate has no timeout.
- **`--page-timeout`** (180 s; 420 with `--quality`/`--density`; 900 with `--smoke`): a watchdog closes the tab of a page
  past it (its pending calls throw). The page is audited once more in a new tab, then reported as an `errors` finding
  by name, and the run goes on.
- **Self-test fault injection:** tools/platform-audit/selftest.mjs serves three pages, the middle one spinning after
  load, and runs audit.mjs as CI does with `--page-timeout=3`. The hung page is re-tried, then reported, and the
  others are audited: 10 s. With the watchdog disabled, the self-test hangs to its 120 s cap and fails.

