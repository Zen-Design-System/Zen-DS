# Session log — 2026-09-29

## Figma connector check (session "Zen-Variables tokens update")

The user signed in the claude.ai Figma connector; the plugin server `plugin:design:figma` still needs auth. Every call
below was read-only (`use_figma`) against the live file `9nZv4uW2LT21yuHabMTCh1`.

- **Variables.** An order-independent FNV hash of name + every mode value was compared per collection and per group.
  - Global Colors, Emphasis Level and Typography Configuration (Dashboard/Popular/Mobile) match the synced zip exactly.
  - Component Theme differs in 4 values: the live file is newer than the zip (export 2026-09-28 14:59).
    - `Chip-Secondary/Background/Seclected/Default`: S3 and S4 → Surface/Default.
    - `Chip-Secondary/Border/Selected`: S4 → Border/Active/Neutral/Solid.
    - `Chip-Secondary/Border/Weigth-Active`: S4 → Primary.
  - Of the 7 collections outside the zip, only `Corner-Radius/Input/Small` differs: live 12/12/8/2, repo 8/8/4/2.
  - Scope lock (AGENTS.md, 2026-09-29): both drifts were applied, then reverted within the turn, and listed in the
    HANDOFF Backlog for the user to approve. The repo is back to the zip values; `tokens:build` output is unchanged.
  - Live modes the repo does not have: Typography `Ecom-Demo` and `Zen-Platform` (platform.css), and Base Colors
    `Chat`, `VT` and `Ecom-Demo`. Global Dimensions' mode is renamed `Zen`.
- **`Input/Border/Disabled`**: STROKE_COLOR, not hidden from publishing. It is the 1px INSIDE Container stroke of
  State=Disabled in Text-Field, Select-Field, Date-Field, Number (both) and Text-Area. That matches the input.css wiring.
- **Text styles (36).** 31 match the re-derived snapshots exactly.
  - Heading/2, Heading/3 and Caption/* differ only in the cached `paragraphSpacing` (28/24/10), which is stale in
    Figma: it is bound to Font-Size (25/22/11).
  - The snapshots keep the variable values; Open items asks the designer to refresh them.
- **Contracts re-captured.** The repo's console-extract logic ran through `use_figma`, and FNV checksums of the
  captures matched: `.Chip/Trailing` 99bb77af, Input/Heading 2ed9efc9.
  - The two sets were replaced in `checkbox-radio-chip-popover.json` and `input-search.json`. Python round-trip
    formatting is identical, so each file shows a one-line diff.
  - The "stale capture" exceptions were dropped. Chip/Trailing is 72/72 and Input/Heading 432/432.
  - The H3 44px Container exception stays: it is still in Figma.
  - Seen in the capture: the Small Badge-Counter Text-Wrapper now has Spacing/Padding/3XSmall side padding (Backlog).

## Segmented phone example: "Period switch on a phone" (session "Add a phone example to the Segmented page")

The Segmented page had 3 examples, and `npm run qa -- --pages=segmented` warned "fewer than 4 examples · not covered:
states, mobile". Since 2026-09-28 a Segmented wider than its container scrolls sideways (guideline: the Overflow row
and a Do), but no platform example showed it.

### Spec card

- **Figma:** Segmented + Primitives/Segmented/Item (page 1070:17807). The overflow is code only: the Figma container
  hugs and clips, so there is no node for the scroll itself.
- **Frame:** `PlatformPhone` (iPhone 15, 390×844) with a child screen, "Spending".
  - Header: `TopNavigation type="compact"` with the Back chevron.
  - Back goes to a master "Wallet" screen (its large title is the h1), and its Spending row comes back.
    `usePhoneScreen().go` moves focus to that row, or to Back. The Budgets and Savings rows select.
- **Segmented:**
  - Default level (Secondary) and size (md), no `fullWidth`, `aria-label="Period"`.
  - Controlled `value` + `onValueChange`: This week · This month · This quarter · This year, with This month selected.
- **Why it overflows:** measured on the platform (Dashboard typography), the labels need 372px in Compact and 388px in
  Comfortable (items 32/40px high).
  - The phone content is 350px wide (390 − 2 × Margin/Compact).
  - It overflows by 22px / 38px, so This year is cut mid-word in both densities.
- **Content:**
  - `Metric size="small"`: a Heading/4 value, the key status of a child screen.
  - An `h2` Heading/Subheading, "By category", over a `List` of `ListItem` + `DockIcon` (subtle), with `plural()`
    captions and a Body/Base/Medium amount.
  - This week has no payments. It shows `EmptyState headingLevel={2}` (illustration kept, since it replaces the screen
    body) with the way out "Show this month" (Tertiary), which selects This month and focuses that segment.
- **Spacing:** every block sits on Margin/Compact (20px), so it lines up with the Back chevron and the large title.
  - The Segmented, the Metric and the heading use `padding-inline: var(--zen-margin-compact)`; the rows use
    `List inset="compact"`, the same token.
  - Stack gap lg between blocks and xs between the heading and its list; top padding XSmall, bottom Large.
- **Trend:** `direction: "normal"`. Positive draws `icon-arrow-circle-up-solid`, which contradicts "−8%", and
  spending less is not good or bad in itself.
- **Data adds up:** this month $1,284.50 across 5 categories, this quarter $3,912.75, this year (to date) $11,640.20.

### Files

- `src/platform/PlatformShowcases.tsx`:
  - `spendingPeriods`, `spendingCategories`, `spendingByPeriod` and `SegmentedPhonePeriodExample`, after
    `SegmentedInboxExample`;
  - the 4th `segmented:` entry, with its code sample.
- `CHANGELOG.md`: one line under [0.4.0] Unreleased › Added.
- `docs/context/HANDOFF.md`: three Backlog lines (below).

### Verification

- `npm run qa -- --pages=segmented`: **PASS** (`.qa/reports/2026-09-28T18-26-12-f98d5313.md`).
  - Passed: tsc, style guard (0 new), usage guard (0 in my edits), both self-tests, guidelines in sync.
  - Audit at 1512 + 390 (smoke, quality, density): 0 errors. Dark: 0.
  - Coverage: "segmented: 4 example(s)", nothing missing.
  - The contact sheets segmented-1512/390 were opened after every run.
- Warnings and interruptions:
  - Behaviour was clean (0/0) on the 18:18 run, on the same default screen. Later runs were cut short by other
    sessions' hot updates ("[run] … results may be incomplete"). The only change to the example after 18:18 is the
    empty week's action, checked by hand.
  - 4 ⚠ `[targets]` at 390 (51–64 × 20). At a 390 viewport the phone preview is scaled to 0.63, so 32px segments
    measure 20px. Every phone example has the same warning (Backlog P3).
  - One run in between failed the usage-guard self-test and the guidelines sync. The cause was the in-progress files
    (01:15–01:18) of the peer "Fix the 5 component dead clicks…". That session fixed them, and the next run passed.
  - `npm test` (whole suite) passed on the original Segmented code after the revert (18:21 run).
- **In the browser:**
  - This week → EmptyState (h2). Show this month → This month is selected and has focus.
  - This year → data, scrolled into view.
  - Back → Wallet (h1), focus on Spending. Budgets → selected. Spending → back, focus on Back, the period kept.
- **Comfortable** (Component Size chip in the topbar):
  - Items 40px, container 48px, 388px of content in 350px; the labels fit.
  - Everything at x = 20, no page overflow.
  - Light and dark shots at 1512 and 390 for This month, This year and This week. Set back to Compact afterwards.
- **Copy:** the EmptyState caption is "Card payments show up here once they clear." The longer version left "clear."
  alone on a second line.

### Found, not fixed (Scope lock → Backlog)

- **Segmented scroll-into-view under a scaled ancestor.** The layout effect in `Segmented.tsx` adds a screen-px delta
  (`getBoundingClientRect`) to `scrollLeft` (the group's own CSS px). Inside PlatformPhone, which scales the device, it
  falls short by the scale:
  - 390 viewport (scale 0.631): selecting This year gives scrollLeft 15.5 instead of 22, and the segment stays 2.8px
    past the edge.
  - 1512 (scale 0.828): 19 instead of 22, and the segment ends flush, without its 4px inset.
  - Without a transform (a real phone, the templates, the tests) it is exact.
  - A fix was applied and verified, then reverted under the Scope lock:
    - 22.5 with a 4.2px inset at scale 0.631, and 38.5 in Comfortable at 0.828;
    - `tests/interaction/controls.test.tsx` passed 13/13 with a new case under `transform: scale(0.5)`.
  - The patch, ready to apply:

```diff
-    const inset = parseFloat(getComputedStyle(group).paddingInlineStart) || 0;
-    if (rect.left < box.left + inset) group.scrollLeft -= box.left + inset - rect.left;
-    else if (rect.right > box.right - inset) group.scrollLeft += rect.right - (box.right - inset);
+    // Rects are in screen pixels; scrollLeft and the padding are in the group's own CSS pixels. They differ under a scaled
+    // ancestor (a device preview's transform), where the segment would stop short of the edge, so convert.
+    const scale = box.width / group.offsetWidth || 1;
+    const inset = (parseFloat(getComputedStyle(group).paddingInlineStart) || 0) * scale;
+    if (rect.left < box.left + inset) group.scrollLeft -= (box.left + inset - rect.left) / scale;
+    else if (rect.right > box.right - inset) group.scrollLeft += (rect.right - (box.right - inset)) / scale;
```

  - The test: render the four periods in
    `<div style={{ transform: "scale(0.5)", transformOrigin: "0 0" }}><div style={{ width: 200 }}>…</div></div>` with
    `defaultValue="This year"`. The group overflows, and the last item's rect stays inside the group's rect.
- **`targets` reads scaled phone previews** (P3): at a 390 viewport, every control in PlatformPhone measures ×0.63.
- **Phone List inset** (P3): Chip "Mobile filter row" and Button "Mobile footer CTA" leave the List at 24px, while their
  other content sits at 20px.

### Update: the scroll-into-view patch is applied (approved by the user, after `qa --all`)

The user approved the patch above and asked to wait until the peer's `npm run qa -- --all` had finished. That run
passed at 02:22 (61 pages). The patch went in at 02:23, and the P2 line left the HANDOFF Backlog.

- **Test first:** the new case in `tests/interaction/controls.test.tsx` ("Segmented keeps the selection in view inside
  a scaled ancestor") was added before the fix.
  - It failed on the old code: the last item's right edge was at 132.9 against the group's 100.
  - It passes with the fix: 13/13.
- **`Segmented.tsx`:** the layout effect divides the screen-px delta by the group's scale
  (`box.width / group.offsetWidth`) and scales the 2XSmall inset the same way.
  - With no transform the scale is 1, so the templates and the playground behave as before.
  - No CSS, token or API change.
- **Measured on "Period switch on a phone":**
  - 390 viewport (scale 0.631): This year → scrollLeft 22.5 (max 22), 4.2px inside the edge (it was 2.8px past it).
  - 1512 (scale 0.828): 22.5 in Compact and 38.5 (max 38) in Comfortable, both 4.2px inside.
  - This week goes back to 0 with its 4px inset. Segments that are already visible do not move.
- **`npm run qa -- --pages=segmented,templates`: PASS** (`.qa/reports/2026-09-28T19-25-14-f98d5313.md`).
  - Figma contracts and the whole `npm test` suite passed.
  - Audit: 0 errors. Dark: 0. Behaviour: 0/0, a clean run this time.
  - The same 4 `[targets]` ⚠ (the preview's scale).
  - The four contact sheets were opened. Templates › "Empty & error states" at 390 is unchanged: it is unscaled, and
    "No results" is in view.
- `CHANGELOG.md`: one line under [0.4.0] Unreleased › Fixed.

## The last 5 dead clicks: component behaviour (session "Fix the 5 component dead clicks left in the baseline")

The user asked to clear the 5 `|deadclick|` keys left in `tools/platform-audit/behaviour-baseline.json` after the
handler-less actions were wired (session log 2026-09-28, "Handler-less actions"). They were component behaviour, not
missing handlers.

### Figma (the live file through `docs/figma-contracts/`)

`use_figma` was not attached to this session (`plugin:design:figma` needs auth), so the states come from the captures of
the live file `9nZv4uW2LT21yuHabMTCh1` in `docs/figma-contracts/` (`checkbox-radio-chip-popover.json` was re-captured
today).

- **Chip/Number-Only (1536:26687):** described as a "numeric-only compact indicator for counts or rankings" (item counts
  in list headers, quantities), with Select No/Yes and State Default / Hover / Focused for when it is pressable. There
  is no static variant: a count is the Default state. Chip/Normal and Chip/Advanced say "DO NOT use as a read-only
  label — use Tag".
- **`.Primitives/Date-Picker/Action` (460:38871):** Cancel = Button/Main Small Tertiary, Submit = Primary, gap
  Spacing/Gap/XSmall. Button/Main has State=Disabled, which the new disabled actions use.
- **`Control-Bar/Select-Item` (9021:27379):** Default / Hover / Selected only, no Disabled. Code already drew disabled
  items with Content/Disabled (Read-only bar); Undo / Redo now use it too (HANDOFF Open items: ask the designer).
- **Chat reply:** no Figma set (JSDoc in `ChatReply.tsx`).

### What each dead click was, and the fix

| Key | Cause | Fix |
| --- | --- | --- |
| chip "Counters" `button.zen-chip "#"` | A Number-only Chip always rendered a `<button>`, even as a count | `Chip.tsx`: with no press handler, no `selected` / `select`, no submit, no caller ARIA state and not disabled, a Number-only chip renders a `<span data-static>` in the Default state. `chip.css`: no pointer, and pointer hover / press skip it (a forced `data-state` still draws for specimens). |
| date-picker "Report period" Cancel, Submit | With `showActions` both buttons only called `close()`; inline there is nothing to close | New API (below); the example applies a report period and Cancel returns to it. |
| input "Compose announcement" Redo | The bar used `execCommand("undo" / "redo")`: nothing said whether this field had history. That stack is shared by every field on the page, so Undo could also undo typing in the title | `RichTextField` keeps its own history (below); Undo / Redo are disabled while there is nothing to undo or redo. |
| chat "Reply to any message" quote | The name is cut at 40 characters: the dead one was the quote of the **deleted** message ("Message unavailable"), whose original is not in the thread, so the jump found nothing. The other quotes already scrolled to the original and flashed it (`data-flash`), which the probe counts. | `ChatReplyQuote`: a `kind: "deleted"` target renders a `<span data-static>` with the same look, no hover, no pointer, out of the tab order. The other quotes are unchanged. |

### DatePicker: the API

- `onApply?: (value: Date | null, range: DatePickerRange | null) => void`: Submit. `value` is the picked date in single
  mode (null in range mode), `range` the picked range in range mode (null in single mode). One callback for both modes
  keeps the single-mode guess `onApply={(date) => …}` right; a range-mode `(range) => …` guess fails type-checking
  (react-docgen cannot document a discriminated union of props, so the modes share one interface).
- `onCancel?: () => void`: Cancel, after the picker drops the draft.
- `range` / `defaultRange` (`DatePickerRange`, exported): range mode gets the controlled / uncontrolled pair of the API
  conventions (`value` / `defaultValue` stay single mode). The initial month follows `range.start` too.
- `DatePickerAction`: `cancelDisabled` / `applyDisabled` (Button/Main Disabled).
- Behaviour with `showActions`:
  - picks are a draft shown over the applied value (`value` / `range`, or the uncontrolled one); `onValueChange` /
    `onRangeChange` still report each pick;
  - Submit applies the draft (an uncontrolled picker keeps it; a controlled parent follows `onApply`) and closes a
    popover; Cancel drops it and closes a popover; Escape and an outside click close without applying;
  - a new applied value (Submit, or a controlled change such as a date typed into the field) replaces any draft;
  - inline, Cancel and Submit are disabled until there is a draft that differs from the applied value, and Submit also
    until a range has its end date. When the action pressed with the keyboard turns disabled, focus moves to the
    selected day (else the first day that can be picked) instead of falling back to the page.
- Without `showActions` nothing changed: a pick applies at once.
- Harness:
  - new rule `date-picker/actions-need-apply` (warn): `showActions` without `onApply`, with fixtures (bad: 1, good: 2);
  - `interaction/controlled-needs-handler` accepts `onApply` as the handler of `value`, and pairs `range` with
    `onRangeChange` / `onApply` by hand (its type never matches `onRangeChange`'s argument), with a fixture.
- The example: `range={period}` (this month so far), `maxDate={today}`, the dual calendar on last month + this month
  (`month` / `onMonthChange`), and `onApply` sets the period. The line under it is a `role="status"`: "Report period:
  Sep 1 → Sep 29 · 29 days" (`plural()`), replacing the instruction text "Pick a start and end date across both
  months." The playground commits through `onApply` when Actions is on (`onValueChange` otherwise; the deprecated
  `onChange` is gone from it and its code sample).
- DateField keeps committing a pick at once; making `datePickerActions` a draft is Backlog (P2).
  `zen-allow-date-apply` marks the spot in `Input.tsx`.

### RichTextField: its own history

- Each step is the editor's HTML (after `normalize()`) plus the selection as child-index paths, so it survives the HTML
  being parsed back in. Undo puts the caret where the undone edit began (the selection is recorded on `beforeinput` and
  before each command).
- Typing of one kind (insert or delete) within 1 s of the last keystroke is one step; a caret move, a paste, Enter, a
  command, a link or media insert, a block type change and ⌘⇧S are steps of their own. IME composition is recorded at
  `compositionend`.
- Undo / Redo: the Editor-Bar, ⌘Z / ⇧⌘Z / Ctrl+Y, and `beforeinput` historyUndo / historyRedo (the Edit menu, the context
  menu) all use this history; `execCommand("undo" / "redo")` is no longer called.
- A `value` set from outside (clearing after Post) or the first content starts a new history. An empty editor is ""
  before focus and `<p><br></p>` after: both count as the same content, so focusing never adds a step.
- `disabled={isReadOnly || { undo: !canUndo, redo: !canRedo }}` on the bar (the prop already took a map).

### Files

- `src/components/Chip/Chip.tsx`, `chip.css`
- `src/components/DatePicker/DatePicker.tsx`, `index.ts`
- `src/components/Input/Input.tsx` (RichTextField; a comment above DateField's DatePicker)
- `src/components/Chat/ChatReply.tsx`, `chat-reply.css`, `Chat.tsx` (JSDoc of `onJumpToReply`)
- `src/platform/PlatformShowcases.tsx` ("Report period"), `src/platform/PlatformExamples.tsx` (date-picker playground)
- `tools/usage-guard/check-usage.mjs`, `fixtures/bad.tsx`, `fixtures/good.tsx`, `guidelines.source.mjs` (Chip, Date
  Picker, Input, Chat), then `npm run guidelines:build` (docs/api, docs/guidelines, platform JSON)
- `tests/interaction/actions.test.tsx` (new, 6 tests)
- `tools/platform-audit/behaviour-baseline.json`

### Verification

- `npx tsc --noEmit -p .` clean · `npm run usage:selftest` 146 rules ✓ · `npm run usage:check` 3 warnings (the platform
  chrome, as before) · `npm run style:check` 0 new · `npm run guidelines:check` ✓ · `npm test` 231 passed, 6 skipped
  (the new file: Chip static count, DatePicker range draft / Submit / Cancel, keyboard focus after Submit, controlled
  single date, RichTextField history vs another field, ChatReplyQuote deleted).
- `npm run qa -- --pages=chip,date-picker,input,chat` (`.qa/reports/2026-09-28T18-25-58-73755ffd.md`, 11 pages): every
  static step ✓, behaviour 0 errors / 0 warnings (11 known). It failed only on 11 `[fit]` errors of the new audit check
  ("Add audit check for text overflowing its box"), not seeded yet and none from this work: DatePicker "September" at
  Comfortable ×4 (playground and Booking range), List Item "Trailing actions" ×2, Templates captions ×5. Warnings are
  the known contrast and coverage debt.
- After that session seeded the `fit` keys (01:50), the same command **PASS**ed
  (`.qa/reports/2026-09-28T18-51-07-73755ffd.md`): static all ✓, audit 0 errors (24 known warnings: contrast, and the
  `targets` of scaled phone previews), dark 0 errors, behaviour 0 / 0 (11 known), coverage gaps as before (date-picker
  and input: mobile). Its 22 contact sheets were opened again.
- All 22 contact sheets opened (chip, date-picker, input, chat, button, card, dialog, popover, list-item, templates,
  avatar × 1512 / 390). States the sheets do not show were shot and opened: Report period with a draft (Cancel and
  Submit live, the summary still the applied period), after Submit ("Aug 3 → Aug 14 · 12 days", both disabled), a new
  start (Submit waiting for the end) and Cancel (back to Aug 3–14); Compose announcement after Bulleted list (Undo on)
  and after Undo (empty again, Redo on).
- `node tools/platform-audit/behaviour.mjs --pages=chip,date-picker,input,chat`: "No new findings" (chat: 9 known focus).
  With `--baseline-update`: 24 → 19 keys, **5 removed (the 5 deadclick keys), 0 added, 0 changed** (diffed against a
  copy taken just before; only `generated` changed besides). Deadclick keys: 0.

### Coordination

- The Chat owners ("Search popover component và Overviews" and its fork) were not running (last active 2026-09-27),
  so no message could reach them. The change stayed inside `ChatReplyQuote` (not the demo wiring, `chatDemo` or
  `ChatReactors` they own).
- Told "Add a phone example to the Segmented page" which parts of `PlatformShowcases.tsx` this session edited, and when
  the in-progress harness files briefly broke its gate (fixed by `guidelines:build`). Told "Add audit check for text
  overflowing its box" when the src edits were final, for its `fit` baseline seed.

### Found, not fixed (Scope lock → HANDOFF Backlog)

- DateField `datePickerActions` commits a pick at once (P2).
- A harness rule for Normal / Advanced chips with nothing to do (`chip/needs-action`, P3).
- The Chat quote of an original that is not in the thread (not loaded) does nothing by default (P3).
- Open items (designer): a Disabled state for `Control-Bar/Select-Item`.

## Text-fit audit check `fit` (session "Add audit check for text overflowing its box")

### Why

- On 2026-09-28, Templates › "Empty & error states" at 390 rendered its Segmented as "404 No resultsFirst useLoad
  failed", and the platform audit reported nothing (session log 2026-09-28, "Segmented overflow").
- The items had `min-width: 0` and shrank below their nowrap labels. The container had `overflow: hidden`, and
  `audit.mjs` treats anything under a hidden/clip ancestor as intentionally clipped: `overflow` skips it (`clipped`),
  and `edges` measures only the visible part of the text.
- The owner of `quality-checks.mjs` and the audit flags, "Quy trình kiểm tra Component build", was not running and
  could not be reached (SendMessage: not reachable). The running peers ("Add a phone example to the Segmented page",
  "Fix the 5 component dead clicks…", "Đánh giá Zen DS hiện tại (fork)") were told before the edits and gave a stable
  point before the baseline was seeded.

### The check

`tools/platform-audit/quality-checks.mjs` › `textFit({ scopeSel })`. It runs in the page like the other quality checks,
on the same regions: example stages, playground previews and portalled overlays.

- For each visible text node it measures the text's horizontal extent (Range rects). Then it walks the text's own
  boxes: its block, then wrappers that hold nothing but this label, up to the control that owns it (button, tab,
  option, chip…).
- The walk stops at a floating layer (`position: absolute/fixed`, e.g. the Chart value bubble), at a box that holds
  other text (a layout container, whose children sit side by side), and before an example frame (`.pe-card__stage`,
  `.pe-card__preview`, `.platform-example-row`): content escaping a frame is the `overflow` check's business.
- A box is reported when the text is more than 1px wider than its **content box** (in CSS px: phone frames scale) and
  the box:
  - is not a scroll container (`overflow-x: auto/scroll`);
  - does not ellipsize (`text-overflow: ellipsis` with clipping, on a block container);
  - has no `mask-image` (a faded edge);
  - is not screen-reader-only (a 1px clipped box, `clip-path: inset(50%)`, `clip: rect(0…)`), not
    `.zen-visually-hidden` and not under `[data-audit-skip-quality]`.
- Not measured: SVG and chart SVG, code (`pre`, `.platform-code`), native fields, skeletons, rotated or vertical text.
- This is the geometric form of `scrollWidth > clientWidth + 1`. It also sees text pushed out on the left by
  centring: a centred flex item overflows on both sides, and `scrollWidth` only counts the right.
- Why the content box and not the padding box: in the Segmented case the text passed the padding box by only
  1–2px. It had eaten the items' 6px padding and touched the next label; the labels were 3–16px wider than their
  content box.
- Pre-wrap text (chat bubbles) keeps its trailing spaces, which hang past the line end by design. A near miss is
  measured again word by word. The first scan had 6 false positives in Chat and AI Chat because of this.
- The message names the example, the text and the box, the overflow in px, and what happens:
  - "spills out of it": overflow visible, past the padding box;
  - "is cut off with no ellipsis": the box clips past its padding;
  - "fills its padding": past the content box only;
  - "…text-overflow: ellipsis does nothing on a flex or grid container, set it on the text's own block": Chrome
    draws no ellipsis on a flex container's own text (checked on the scratch page).
  - Then the fix: give it room (flex-shrink: 0 / min-width: auto), wrap, ellipsize, or scroll the row.

### Wiring

- `audit.mjs`:
  - New kind `fit`: severity error, baselined like the other quality kinds (`BASELINED`, `SEVERITY`).
  - Runs with `--quality` on the page, in the playground sweep and on overlays opened by `--smoke`. One helper,
    `quality(scope)`, now runs `qualityChecks` and `textFit` for each of those scopes.
  - With `--density` it also runs at Comfortable. Text that outgrows its box only there is reported as
    `at Comfortable: …`. The match uses the stable part of the message, so a label already reported at Compact is not
    reported twice.
  - `--baseline-update=<kinds>` rewrites only those kinds; plain `--baseline-update` is unchanged. It was used to seed
    `fit` without turning other kinds' current findings (peers were mid-edit) into accepted debt. Checked: after the
    seed, every non-`fit` key is byte-identical to before.
  - `--css=<file>` injects a stylesheet into every page before the checks, to re-create a fixed bug without editing
    the shared tree. It is refused with `--baseline-update` (exit 2).
- `tools/qa/run.mjs`: `fit` is in `ERROR_KINDS`, so a new finding fails the gate.
- Docs: `docs/qa/build-qa-process.md` (table row, and seeding a new check with `--baseline-update=<kind>`),
  `skills/zen-build-qa/SKILL.md` (finding → fix row).
- Cost: 2–7 ms per page and scope; `qualityChecks` takes 8–103 ms on the same pages.

### Proof

- **Scratch page, 200px column** (`scratch-proof.mjs` in this session's scratchpad, not in the repo). It holds the real
  "Empty & error states" Segmented (its markup, and every stylesheet of the running platform) in a 200px column
  inside a `.pe-card__stage`.
  - Today's CSS: the Segmented scrolls (`overflow-x: auto`), the items keep 47/87/77/93px, and textFit reports 0.
  - With `.zen-segmented { overflow: hidden } .zen-segmented__item { flex-shrink: 1 }` injected, the items shrink
    to 32/54/48/57px (scrollWidth 34/65/57/69), and textFit reports all four: "404" 8px (fills its padding), "No
    results" 25px, "First use" 20px, "Load failed" 27px (spills out). The screenshot shows "404No resultsFirst
    useLoad failed".
- **Scratch page, intentional cases** (`scratch-exemptions.mjs`): 60px boxes holding a ~150px label.
  - Not reported, as required: sr-only (1px clip), sr-only (`clip-path: inset(50%)`), `.zen-visually-hidden`, a scroll
    container, a block with ellipsis, a `mask-image` fade, `data-audit-skip-quality`, pre-wrap text with trailing
    spaces, a floating bubble on a 24px button, a pill in a row that scrolls.
  - Reported: a label squeezed in a flex row (overflow visible) and a box that clips with no ellipsis.
- **End to end**, on the real template:
  `node tools/platform-audit/audit.mjs --pages=templates --viewports=390 --quality --no-playground --css=<old-segmented.css>`
  - Result: `✗ [fit] templates@390: Empty & error states: "No results" (button.zen-segmented__item) is 15px wider than
    its box …` for all four items (404 3px, No results 15px, First use 11px, Load failed 16px), exit 1.
  - Without `--css`, the Segmented is clean. `--css` with `--baseline-update` exits 2.

### Baseline: 24 findings already on the platform (not fixed, Scope lock)

Seeded with `audit.mjs --viewports=1512,390 --smoke --quality --density --baseline-update=fit` (every page, the gate's
flags) and `--viewports=1512 --dark --no-playground --quality --baseline-update=fit`. `quality-baseline.json` went
from 52 to 76 keys, and every non-`fit` key is unchanged. The seed started at 01:34, after the last `src/` write of
both running peers. It found 18 findings at Compact, all at 390, and 6 more only at Comfortable. Dark mode, smoke
overlays and playground sweeps added none. Each group was checked on a screenshot, and all of them are real.

| Page | Examples | Text (box) | px | What happens |
| --- | --- | --- | --- | --- |
| templates@390 | the page's template list (5 rows) | captions (`span.zen-list-item__caption`) | 10–46 | The trailing file name leaves the caption column ~63px wide; long words ("PageHeader,", "(useFormState),") spill toward it. |
| stepper@390 | Stepper, Checkout, Icon steps | step titles (`span.zen-stepper__title`) | 1–22 | Equal-share steps (`.zen-stepper__step { flex: 1 1 0; min-width: 0 }`) are narrower than a one-word title: "WorkspaceInvite team". |
| app-shell@390 | App Shell, Admin app, Flat canvas | PageHeader h1 and description | 9–25 | The desktop examples keep the sidebar open at 390 (the example card sets `breakpoint="desktop"`), so `main` is 16px wide and the title breaks one letter per line. |
| sidebar@390 | Flat · knowledge base | caption "Teamspaces / Product · edited…" | 6 (46 at Comfortable) | The caption column next to the avatar stack is narrower than "Teamspaces". |
| date-picker@1512, @390 (Comfortable) | Date Picker, Booking range | month button "September 2026" | 4 | The text fills the button's padding and nearly touches the arrows. |
| list-item@390 (Comfortable) | Trailing actions | captions "Product Designer · invited…" | 9 | The content column is 42px wide ("Ava …"); "Designer" spills toward the action icons. |

Not reported, as intended: Templates › Sign in "Continue with SSO" is cut, but ellipsized ("Continue with…"). The
Segmented phone example on the Segmented page scrolls sideways, and its items keep their width.

### Verification

- The gate after seeding: `npm run qa -- --all` → **PASS**, 61 pages, 31 min
  (`.qa/reports/2026-09-28T18-51-31-fbc81114.md`).
  - Static: tsc, both self-tests, and guidelines in sync all pass. Style guard, usage guard and figma-contract were
    skipped: no UI file in scope, because this session changed only `tools/` and docs.
  - Runtime 1512 + 390 (smoke, quality, density): 0 errors and 58 baseline, 24 of them `fit` (0 new `fit`). The 98
    warnings are pre-existing warn kinds: 74 contrast and 24 targets.
  - Dark: 0 errors and 45 warnings (contrast). Behaviour: 0/0, 19 baseline. Coverage: the same ⚠ as before; this change
    adds no example.
  - All 114 contact sheets were opened (the Stop hook asked for every one), looking for text collisions that `fit`
    misses. There were none. Every other cut label is ellipsized, or sits in a sideways scroll: tables in
    `.zen-table` (`overflow: auto`), chip rows, Segmented, and desktop chat examples at 390.
    - The only miss is outside `fit` by definition. At 390, in Side Panel › "Docked inspector", the "Hero banner" card
      fits its text. The canvas is squeezed to 40px, though, so the docked panel covers the card (Open, P3 below).
    - The sheets of the pages with `fit` debt (stepper, templates, app-shell, list-item) match the table above.
- The proof re-run against the seeded baseline:
  - Old CSS: `✗ templates@390 fit:4 (+7 baseline)`, exit 1. Only the four Segmented items fail; the five caption
    findings are baseline.
  - Today's CSS: `✓ templates@390 clean (+7 baseline)`, exit 0.
- `node --check` passes on `audit.mjs`, `quality-checks.mjs` and `run.mjs`.

### Open (HANDOFF Backlog)

- **P2 · Text-fit debt:** the 24 findings above, not fixed (Scope lock).
- **P3 · `fit` follow-ups:**
  - The owner should review `textFit` and the two new flags.
  - Still unchecked: a control that fits its own text but is cut off by an `overflow: hidden` ancestor or covered by
    a sibling. Examples: a Segmented with `flex-shrink: 0` in a clipping container hides its last items; at 390 the
    Side Panel › "Docked inspector" card sits under the panel. `overflow` skips these as clipped, and `fit` does not
    see them, because the text fits its box.

## Token update from the user's exports (session "Đánh giá Zen DS hiện tại (fork)")

The user supplied `Zen-Variables.zip` (Component Theme with mode Neutral - S4 only, and Corner Radius), then a
Component Theme export with mode Neutral - S3 only. That replaced a first S3 file sent by mistake. These resolve the
Backlog item "Live Figma is ahead of `Zen-Variables.zip`" from the connector check above. The files were diffed with a
script: all 113 Component Theme names and 25 Corner Radius names exist in the repo, and nothing was added, removed or
renamed.

| Token | Mode | Before | After |
| --- | --- | --- | --- |
| `Chip-Secondary/Background/Seclected/Default` | Neutral - S4 | Active/Neutral/Subtle | Surface/Default |
| `Chip-Secondary/Border/Selected` | Neutral - S4 | Border/Neutral/Subtle/Default | Border/Active/Neutral/Solid |
| `Chip-Secondary/Border/Weigth-Active` | Neutral - S4 | Active/Secondary | Active/Primary |
| `Corner-Radius/Input/Small` | Rounded / Smooth / Standard / Luxury | 8 / 8 / 4 / 2 | 12 / 12 / 8 / 2 |

- **S3, the user's decision:** the correct S3 export sets `Chip-Secondary/Background/Seclected/Default` to
  Neutral/Pale/Default (the mistaken file and the morning's live check said Surface/Default). The user then decided on
  Active/Neutral/Subtle, which is the value the repo already had. S3 is therefore unchanged. The manifest note records
  the decision, and HANDOFF Open items asks the designer to set the Figma variable, or the next sync overwrites it.
- **Writing:** a format-preserving merge (parse, check the round-trip, set `valuesByMode`, write with the same indent),
  so each source file shows only the changed lines. The manifest `synchronizationNote` and `lastSynchronizedAt` were
  edited by hand. `tokens:build` + `tokens:check`: 2,368 tokens, 0 missing aliases, 0 cycles.
- **Consumers:** no CSS change was needed.
  - `chip.css` reads the selected background, border and weight through `--zen-chip-*`. S4 no longer emits
    `--zen-chip-secondary-background-seclected-default-shadow-off`, so the Tertiary action shadow comes back by fallback.
  - `input.css` (small `.zen-input__control` and the dashed `rect` of small fields) reads
    `--zen-corner-radius-input-small`.
- **Computed style** (Playwright on :5173, light):
  - The S4 selected Secondary chip is `#fff`, has a `#111` 2px border and the shadow, exactly like Neutral - S1.
  - S3 is unchanged: Subtle fill, 1px Subtle border, no shadow.
  - Small input controls are 12 / 12 / 8 / 2 px, the same as Medium in every radius mode.
- **Gates:** `node tools/figma-contract/run-all.mjs`: 23 suites + 25 interactions green (no suite covers small inputs or
  S4 yet).

## Figma parity update: 9 components (session "Đánh giá Zen DS hiện tại (fork)")

The user asked to check and update Checkbox, Radio Button, Toggle, Chat/Bubble/Text-You, Chat/Bubble/Text-Others,
Search Popover, the Table cell primitives, Segmented and Breadcrumbs against the live Figma file, "only update", with
everything else going to the Backlog.

- **Method:** one workflow agent per group (7) read the live file `9nZv4uW2LT21yuHabMTCh1` read-only through
  `use_figma`. Each ran the repo's extractor, diffed the capture against the stored contract (where there was one) and
  against the code and computed styles, fixed only existing-variant mismatches in its own component folder, and
  re-measured. One reviewer then checked every hunk against the captures and the house rules. It found nothing wrong
  against Figma; it flagged stale generated docs and the core icon set, both fixed below.
- **Figma nodes:** Checkbox/Mark 311:47222, Checkbox/Text 309:46871, .Primitives/Checkbox/Content 309:46789,
  Radio-Mark 373:96225, Radio-Button 373:96272, .Primitives/Radio-Button/Content 373:96322, Toggle 1526:5703,
  Toggle-Button 1523:104, .Primitives/Toggle/Content 1526:5945, Chat/Bubble/Text-You 6349:59476, Text-Others 6323:1394,
  Search/Popover 1604:27401, .Primitives/Popover/Search 846:38183, Primitives/Table/Cell/* (13 sets, 1603:2869 …
  1603:23274), Segmented 1238:892, Primitives/Segmented/Item 1204:11690, Breadcrumbs 4031:20161,
  .Primitives/Breadcrumbs/Item 292:43787, Item/Slot 4031:20158.

| Component | Figma now | Code before → after | File |
| --- | --- | --- | --- |
| Checkbox, Radio | Content Subtext Caption/Regular 11/16 | Body/Small/Regular 12px → Caption/Regular 11px | `Checkbox.tsx`, `RadioButton.tsx` |
| Checkbox, Radio | Selected Hover fill #4f4f4f | `var()` fallback #606060 → #4f4f4f (the token already rendered #4f4f4f) | `checkbox.css` |
| Toggle | Set overrides Subtext to Caption/Regular 11/16 (24/24 variants) | 12px → 11px (the primitive still says 12: designer question) | `Toggle.tsx` |
| Toggle | Track HUG = 2 × dot + 2 × Spacing/Padding/3XSmall | fixed sizes → `calc()` from the tokens, same 28×16 / 36×20 / 44×24; three fallbacks corrected | `toggle.css` |
| Chat bubbles | Message → Time gap Spacing/Gap/3XSmall; Message max width 220 / 516 | gap 0 → 2px (Business bubble 60 → 62px); text content max 212 / 508 → 220 / 516 | `chat.css` |
| Search/Popover | Focused and Typing: 3px OUTSIDE stroke on Input/Border/Default | no ring → `0 0 0 3px var(--zen-input-border-default)`; transparent except in Neutral - S4 | `search.css`, `Search.tsx` JSDoc |
| Table cells | Subtext Caption/Regular 11/16; Trend icons trend-up-01 / trend-down-01 / minus | 12px → 11px; arrow icons → trend icons | `Table.tsx` |
| Table editor | Editabled-Cell padding Small × Medium, Tags–input gap XSmall, underline INSIDE | padding, gap and the underline as an inset shadow | `table.css` |
| Segmented | Medium badge Wrapper padding 3XSmall each side (Small: 0) | 0 → 2px each side (badge slot 16 → 20px) | `segmented.css` |
| Breadcrumbs | Item/Slot gap 2XSmall 4; Item-List gap XSmall 8 | 0 → 4px; 2 → 8px | `breadcrumbs.css` |

- **Figma changes that needed no code change:** Checkbox/Text root gap (a single child), Radio's removed SLOT prop,
  Segmented Item lost its 4 Hover × Selected variants (code never had a hover on the selected item),
  `.Primitives/Popover/Search` is unchanged.
- **Follow-through:** Checkbox, Radio and Toggle caption JSDoc, the Checkbox and Table guideline text
  (`guidelines.source.mjs`), `npm run guidelines:build`, and `npm run icons:build` (the trend icons joined the core set:
  97 core icons). The Checkbox/Text suite lost its two Subtext map entries and a stale exception: the live nested
  instance no longer exposes Subtext (1200 → 1120 checks).
- **Contracts:** the fresh captures replaced the six Checkbox/Radio entries in `checkbox-radio-chip-popover.json`
  (Chip and Popover entries byte-identical), the Segmented and Toggle entries in
  `segmented-toggle-badge-avatarstack.json` and the Search/Popover entry in `input-search-primitives.json`. New:
  `breadcrumbs.json`, `chat-bubbles.json`, `table-cells.json`. Same `json.dumps` format as the existing files.
- **Checks:** `node tools/figma-contract/run-all.mjs` 23 suites + 25 interactions green; `tsc`, `style:check`,
  `usage:check` (3 pre-existing platform warnings), `guidelines:check`, `icons:check`. Playwright before/after
  measurements per group, including Comfortable density for Toggle and Breadcrumbs.
- **Build-QA:** `npm run qa` (breadcrumbs, chat, checkbox, radio-button, segmented, search, table, toggle): **PASS**
  (`.qa/reports/2026-09-28T21-03-18-a4b8c773.md`). Static gates, Figma contracts and the Vitest suite pass; audit 0
  errors (9 `targets` ⚠ from the scaled phone previews, Backlog); dark 0; behaviour 0/0. After the Search example copy
  was corrected ("no focus ring" → a ring only where inputs have a border), `npm run qa -- --pages=search` **PASS**
  (`.qa/reports/2026-09-28T21-09-54-a4b8c773.md`). All 30 contact sheets were opened; the only new observation is
  pre-existing (Popover "Selection toolbar" wraps at 390, Backlog).
- **Not done (Scope lock):** 45 follow-ups were reported. Work items are in the HANDOFF Backlog ("From the Figma
  parity update"), and designer questions are in Open items.
