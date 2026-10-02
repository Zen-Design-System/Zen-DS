# Session log 2026-10-02

## One commit for motion P1 and more, audit tool fixes (session "Add audit check for text overflowing its box", tier S)

- **Gate in the quiet window:** `npm run qa` (report `.qa/reports/2026-10-01T23-30-39-fbc81114.md`). Static checks,
  Vitest and all Figma suites passed. Behaviour reported 6 "Escape does not close" dialogs, caused by the peer's
  uncommitted Escape change in Dialog.tsx and fixed in the tool below. Smoke: chat@390 passed when re-run alone;
  templates@390 HR · Home is the known intermittent finding (BACKLOG P3).
- **Commit `809d576`** (user: "đợi xong hết commit 1 lần"): 70 files, this session's work only. Index blobs were built
  from HEAD, plus the motion sweep re-run on HEAD and this session's own hunks. The staged tree passed tsc, usage
  selftest, guidelines:check and tokens:check in a temporary checkout. Left out: the 3 outline lines in
  `PlatformMobileShowcases.tsx`, which are woven into the examples session's rewrite.
- **Audit tools** (approved by the user, requested by "Disable input và search từ Figma"):
  - `behaviour.mjs` dialogFlow: a second Escape when an inner popup was open.
  - `audit.mjs` targets and edges: unscaled size inside a scaled phone (chat@390: 3 targets → 0).
  - `quality-checks.mjs` densitySnapshot: skips `[inert]` content.
  - `shoot.mjs`: `--timeout=` and `--wait-until=`.

## Spacing ladder: a `ladder` audit check and the sweep (session "Add audit check for text overflowing its box", tier M, user: "làm tất cả")

- **Check:** `quality-checks.mjs` adds `ladder` (warn, baselined like rhythm; wired in `audit.mjs`). It reads the
  rendered gaps of Stack, Grid and non-`zen-*` markup. It reports a gap that is not 2xs/xs/sm/md/lg/xl in the current
  density, and peer groups (two or more siblings laid out alike, no own surface) whose inner gap is wider than the gap
  between them. Findings carry the element's first words. Probe page: bad groups and a 2px gap are reported; good groups
  and heading → group are not.
- **Tuning after the first run:**
  - Centred items of different heights were read as stacked, so an axis now needs two items that do not overlap on it.
  - Heading/toolbar → content (§13: md, then lg inside) was reported, so only peer groups are compared now.
- **Sweep:**
  - 3xs → 2xs for the two lines of one item, → xs for a heading with its description: content, navigation, layout and
    form app-layer files and HrExpenseOverview, 18 gaps in all.
  - HR Home `3xl`/`3xl` → `xl`/`sm` like the other HR pages.
  - Playground property rows 4px → Gap/Medium.
  - Result: 0 `ladder` findings on all 61 pages at 1512 and 390.
- **Skipped at peers' request:** `src/platform/examples/pages/**` (the examples session fixes `top-navigation.tsx:459`
  `gap="3xs"` itself) and their platform.css rules. List `inset` values were kept as set.
- **Left for a decision:** the docs chrome off-ladder gaps (BACKLOG P3, tier L).
- **Backups:** `backups/spacing-ladder-tools-20261002-0845.tar.gz`, `backups/spacing-ladder-ui-20261002-0846.tar.gz`.

## Popover item icon alignment on phones (session "Add audit check for text overflowing its box", tier S, user report)

- Report: in the Chat hold menu on a phone, the icons sit higher than the labels.
- Measured in the "Hold to react" example (390, scale 0.78): the 20px icon was centred 2px above the 40px row. The label
  line is 24px in the Mobile type scale, and `.zen-popover__item[data-tone=icon|photo-small] .zen-popover__item-leading`
  aligns the leading to the top (Figma counter-axis MIN, which is right for wrapped labels).
- Fix (`popover.css`): `margin-block-start: max(0px, (line-height-body-base − leading size) / 2)`, using the Icon or
  Photo-Small leading token. Result: icon and label offset 0 at Compact (20px icon) and Comfortable (24px icon).
- Icon size question (user): the leading is bound to Element-Size/Popular/Base in Figma
  (`.Primitives/Popover/Item/Content` Theme=Icon) and to `--zen-element-size-popular-base` in code. The icon fills it:
  20 Compact, 24 Comfortable, measured.
- Checks: style guard and usage guard clean; all Popover Figma suites match; 25/25 interactions.
- Backup: `backups/popover-leading-align-20261002-1753.tar.gz`.
- QA: static, Vitest (22), dark, behaviour ✓; S4 probe: field stroke rgba(1,1,1,.114) inset, composer focus ring intact.
  Smoke ✗ "zen-chat-message paints over the open popover" on varying chat examples: flaky (chat alone clean 3/3) and
  reproduced with the edits removed (A/B) → pre-existing, in BACKLOG.

## comboFlow knows the Date Picker Combobox (same session, tier S, user: "Duyệt sửa và commit hết")

- The inputs session made DateField an APG Date Picker Combobox. comboFlow only knew listbox combos, so the gate
  reported "combobox does not open a listbox" four times (date-picker › Due date, Date of birth; input › Start and Due
  date).
- `behaviour.mjs`: `popupState(key, want)` takes any role (`[role='<want>']`) and reports `activeInPopup`. comboFlow
  routes aria-haspopup dialog|grid to the picker branch: the dialog must open, focus must land inside it, Escape must
  close it, and focus must come back to the field (an error for pickers; still a warning for listboxes).
- date-picker and input APG runs are clean; the listbox comboboxes are unchanged.
- An adversarial review workflow (3 reviewers, 2 skeptics per finding) checked this and the popover alignment fix
  before the commit. Backup: `backups/combo-dialog-20261002-1820.tar.gz`.
