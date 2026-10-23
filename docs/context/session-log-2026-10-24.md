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

## Native packages compiled in CI (tier S, CI only; BACKLOG P3; user: "thêm job CI macOS chạy swift test và flutter test cho platforms/")

Branch zen/ci/native-platform-tests-20261024 from main 6a7e872a, PR #267.
- `.github/workflows/native.yml` (Native packages): `swift test` in platforms/swift and `flutter test` in platforms/flutter
  (subosito/flutter-action@v2, Flutter 3.24.5 stable), both on macos-14; only on PRs / pushes to main that touch
  platforms/**, scripts/build-native-tokens.mjs or the workflow, plus workflow_dispatch (macOS minutes).
- First run (0608e651): Apple Swift 5.10 builds the package (20 s) and passes 4/4 tests; Flutter 3.24.5 passes 4/4. #238's
  Zen-High-Contrast Swift and Dart compile — nothing to fix in the generator's templates.
- This Mac still cannot run either locally (memory native-toolchains-broken-locally, updated): the PR's run is the check.
