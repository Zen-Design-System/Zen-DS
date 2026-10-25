# Session log 2026-10-26

## UI/UX Pro Max skill · evaluation, then UX principles + product patterns

The user (2026-10-26): research folding the "UI/UX Pro Max" skill (zip, v2.15.0, MIT) into Zen's skills for Figma and
Studio; evaluate it first. Read it in a scratch folder and ran its search on four Zen-like briefs: app briefs came back
as landing patterns with off-domain palettes and fonts (an internal HR dashboard → "Education teal", Victorian
serifs); its UX rows (WCAG 2.2, forms, navigation, charts) are the useful part. Verdict: don't install it (its visual
layer breaks Zen's hard rules); take the UX layer as Zen-owned principles. Plan P1–P5 (ux-principles.md,
product-patterns.md, a robustness pass in design-principles §9, wiring into the Figma AI kit and Zen Agent's prompt):
`docs/research/ui-ux-pro-max-evaluation-2026-10-26.md`.
Then (user): P1–P5 approved without G4 ("Bỏ G4. Phần đó nghiên cứu sau": data-view principles are a later study).
Wrote `skills/zen-component-usage/references/ux-principles.md` (states, forms, navigation, WCAG 2.2, touch, motion;
each item names the Zen part, e.g. Form already focuses the first invalid field, so a long form only adds an
InlineMessage summary) and `product-patterns.md` (13 families → screens, trust, avoid, Figma ◆ / code templates);
design-principles §0 and §9 (push the data, break it on purpose, walk it as a user); the two SKILL.md files; the AI
kit (`kit.mjs`, `aiKit.ts`, kit README/AGENTS); a short block in Zen Agent's prompt. Checks: ai-kit:check 193 ✓,
agent selftest 21 ✓, words ✓, guidelines:check ✓, usage:selftest ✓. Built first in the shared checkout, then moved to
the worktree branch `zen/docs/ux-principles-20261026` at Giám sát's request (no browser gate: docs and two source
lists).

## dnd E2E rows: DND-03 and DND-05…08 fixed and baselined (tier S; branch zen/fix/studio-dnd-e2e-20261026; PR #308)

Found while #304 recorded the opt-in groups (session-log-2026-10-25, "New E2E rows that break fail the gate"): DND-03
and DND-06 failed alone, DND-07 hung past its 40-min limit, DND-05/08 never ran. Each row, at its owner:
- **DND-03 (product, Segmented):** the screenshot was a blank page; the run's Vite error was "Maximum update depth
  exceeded" (stack in `_shared/phone-sheet.tsx`). Cause: on a phone a full-width Segmented shares its row equally
  (`flex: 1 1 0`), so in a box as wide as its content (CalendarToolbar in a column that does not stretch, a floating
  layer) its widest label is cut → chip row; the chip row (chip padding + gaps) is wider than the segments' sum, which
  was the `needed` width → segments again → cut → … Each ChipGroup mount sets its Chips' breakpoint state, so React's
  limit tripped in phone-sheet. Fix in `Segmented.tsx`: `needed` for full width = widest segment × count; segments
  that come back and are cut at once keep the chips until the chips have more room than that width (no CSS change).
  Regression case in `tests/interaction/segmented-phone-chips.test.tsx` (floating Segmented + CalendarToolbar in a
  `align-items: flex-start` column): on 22548853's Segmented it fails with the same "Maximum update depth exceeded".
- **DND-06 (scenario):** Layers lists the front-most layer first (`data-order="front"`, Figma's order), so a row's upper
  half is after it in the code; the product wrote Text, ListBox, Box, Card, which is right. The "empty Screen's own
  row" no longer exists (the frame row is the Screen's), so the third drag now goes into the middle of the Card's row
  (into the Card, last).
- **DND-07 (scenario):** Layers names a Box "Frame N", so the `/^\s*Box\b/` row filter never matched; each item waited
  out the click and three ⌘Z timeouts (~25 s × 128 items > 40 min, then the retry). The Frame row is now found by its
  layer id (`local:<page>.zen.tsx:<loc>#0`). Measured 10 items in 24 s; the row limit is now 10 min (was 40).
- **DND-05, DND-08:** worked the first time they ran; nothing changed.

Runs (gate slot from Giám sát, main 22548853 merged first):
- `--only=dnd --rows=DND-03,DND-06,DND-08,DND-05 --no-retry`: 4 works, 274 s, no Vite errors.
- `ZEN_DND_LIMIT=10 … --rows=DND-07 --no-retry`: works, 24 s.
- Vitest `segmented-phone-chips` 4/4, plus toast-search-chip-segmented, controls, layout-sizing, chart-card-metric,
  calendar, menu-chip-sheet: 79/79.
- `npm run qa -- --isolated --pages=calendar --files=<3 files>`: PASS (Figma contracts 33 suites for Segmented,
  vitest full suite, audit 1512/390/320 + dark + behaviour 0 new, Studio E2E 363 works in 4 shards). Contact sheets
  segmented/calendar at 390 and 1512 looked the same as before (chips in "Periods on a phone", the full-width switch in
  the phone Calendar toolbar).
- `npm run platform:audit:selftest`: 70 passed (segmented-fit cases included).
- `--only=dnd --update-baseline`: 8 works, 0 broken, 990 s (DND-07 260 s), no Vite errors. The baseline now holds
  DND-01…08; README, run.mjs and dnd.mjs say about 17 minutes for the group.
- Merged main 8ec5baa9 (#306) before the push, then 9c517538 (#311: CHANGELOG and this log kept both sides, #311 first).

## Studio Play: desktop full screen + dark popovers (tier S, branch zen/fix/studio-play-desktop-20261026)

The user: "Phần play prototype đang lỗi. Không hiện full màn hình desktop ra", then "lỗi popover trong table không
chuyển sang darkmode khi UI bản play đang là darkmode". Reproduced on the DEMO-MEET page `quan-ly-task` with Playwright on
a private Studio server (a copy of `.zen-studio/pages`).

- **Desktop not full screen.** Play's Auto viewport drew a desktop Screen as a card `min(1440px, 100%)` wide on a 24px
  padded stage with rounded corners (1920 window: 240px gutters each side). Since #288 (10-24) ▷ on a page's Screen
  starts Play instead of Present's full-screen card, so the user met the card where a full screen used to be. Fix
  (`builder/proto/Player.tsx`, `builder.css`): the stage carries `data-viewport` from the viewport asked for (auto when
  no device is simulated, set before the fixed box measures, so its padding never changes under the measure); in Auto
  the stage has no padding and the device is `width: 100%`, `height: 100cqh`, square, no shadow. Fixed viewports
  (devices, typed W × H) keep the padded stage.
- **Popover light in a dark Play.** Play had no `ZenPortalProvider`, so everything that portals through ZenPortal (the
  Table editor layer, icon tooltips, a portalled Chip popover, the ToastStack) went to the Studio's `<body>`, outside the
  layer that carries Play's `data-theme`. Fix: `Player` holds the portal root and wraps the ToastProvider and the layer
  in `ZenPortalProvider`; `PlayLayer` draws `.official-portal-root.studio-portal-root` with Play's modes beside the
  device, as Present does. Not inside the device: a modal opened there (a Side Panel) inerts the device's other
  children (`inertOutside`), and a popover opened from the modal must stay live.
- Checked by script (1512, 1920, 1280 and iPad landscape at 80%): device = the page under the bar; Table popover dark
  (bg 5/255) under its cell, flips above at the bottom of a scaled iPad; Escape closes it and stays in Play; a select in
  the task Side Panel picks; tooltip and toast in the dark layer. Present already had its own portal root.
- E2E rows PT-27 (desktop Auto fills, iPad on the padded stage) and PT-28 (dark Table popover, toast, tooltip, a Table
  popover in a modal Side Panel picks), ids from Giám sát. tsc, studio:selftest, style:check, usage:check pass.
- Gate (Giám sát's GO, main 9c517538 merged): rows PT-27/28 passed only on retry at first (PT-28 read the Present bar's
  hover tooltip, from the Studio chrome; the row now reads the panel's "Close panel" tip and moves the pointer off the
  bar), then 2/2 first try; prototype group 28/28; `npm run qa -- --isolated` PASS, Studio E2E 367 works · 0 broken
  (report .qa/reports/2026-10-25T21-01-44-68156075.md).
