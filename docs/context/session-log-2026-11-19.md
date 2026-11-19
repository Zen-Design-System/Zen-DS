# Session log 2026-11-19

## Code view P2b PR3: portable examples, controls and forms (tier M; Giám sát session)

User: "Do this task here: Code view P2b PR3" (plan §11 slice 3). Branch `zen/feat/code-view-p2b3-20261119`, worktree
`.claude/worktrees/p2b-pr3`.

- 92 examples of Button, Input, Checkbox, Radio Button, Toggle, Slider, Slider Field, Segmented, Search, Color Picker,
  Color Selector, Uploader, Form, Date Picker and Calendar moved to `examples/pages/<page>/<slug>.example.tsx`; five
  agents (three pages each), one review pass here. All twelve page CSS files went. Baseline 417 → 325 code strings
  (`examples:check -- --write`); 180 example files compile as copied.
- Demo world: `videos` (canyon timelapse; `demo-vectors.mjs` loads `.webm` as empty) and `calendarEvents` (the review
  moved the 20 events each Calendar example had copied).
- Review fixes: two Toggles wrapped in a hidden-legend FormFieldset to fill/hug (an extra screen-reader group) → a Stack
  with `align="stretch" fillChildren`; the Early access table lost its 760px minimum at 390 (cells cut) → `Box
  scroll="x"` + Table `minWidth: 760` (390 panel identical again).
- Visual diff (224 panels, 1512 + 390): 185 identical; changed = the phone examples on AppShell (page margins, one device
  label per example), "Search during an import" (opens on the finished import: an effect started it before), Kickoff
  files' seeded upload (starts on first pointer/focus, so the capture no longer catches it moving), the Đìzai Studio mark
  in desktop frames (Thumbnail 2xs, as PR2), anti-aliasing (≤ 21 px).
- Costs logged: radio cards select from the radio row (the `::after` cover was page CSS), focus targets where a
  component gives no ref (Slider wraps, ColorSelector, FileUpload) → BACKLOG-user-and-later P2 refs line.
- Checks: tsc, examples:check, usage:check (0 portable-subset warnings in the new files), usage:selftest, style:check,
  studio:selftest, guidelines:check, mcp:selftest; gate `qa --isolated --only=<15 pages>`.

## Code view P2b PR5: portable examples, overlays and feedback (tier M; session from "Code view P2b")

Task from the P2b session (plan §11 slice 5). Branch `zen/feat/code-view-p2b5-20261119`, worktree
`.claude/worktrees/studio-assets-deep-fixes-ad01e0`; browser runs in Giám sát's slot (GO 15:33, extended 15:41).

- 50 examples of Dialog, Bottom Sheet, Side Panel, Popover, Menu, Tooltip, Toast and Chip moved to
  `examples/pages/<page>/<slug>.example.tsx`; four agents (two pages each), one review pass here. All six page CSS
  files went. Baseline 325 → 275 code strings; 230 example files compile as copied.
- Demo world: `leaveHistory` (Alex's earlier time off; two Dialog examples had copied it, days written out so no new
  formatter needs vectors). Style-guard baseline: dropped the stale `toast.css` entry (the file was already empty).
- Review fixes: the Toast phone app's tab bar slot kept an 8px see-through strip (Stack gap with no toast) that took
  clicks → gap only while a toast shows; the Chip phone filter row stopped at AppShell's margin, so no chip was cut and
  nothing showed it scrolls → negative inline margin of `--zen-margin-comfortable`, as before.
- Visual diff (116 panels, 1512 + 390): 88 identical; changed = phone examples on AppShell (19), the Đìzai Studio
  mark as Thumbnail 2xs (6), "Controls on video" one description line longer (3; the film waits for Play: autoplay was
  an effect reading `matchMedia`).
- Costs logged: Side Panel docking reads the frame through a page-side `DockingFrame` (`startOpen` prop); narrow
  layouts follow the breakpoint instead of a measured width (Dialog rows, Menu task rows, Side Panel tables); the Toast
  phone app keeps its scroll on a tab change; focus targets Breadcrumbs crumbs, Table row checkboxes, EmptyState action
  and Tooltip's own close X → BACKLOG-user-and-later P2 refs line.
- Checks: tsc, examples:check, usage:check + selftest, style:check, studio:selftest, guidelines:check, build; gate
  `qa --isolated --keep-going --pages=<8> --files=<66>` PASS, then `--pages=chip` after the chip fix PASS.

## Tooltip: the close X gives focus back to the trigger (tier S; same session, asked by Giám sát)

Found while porting the Tooltip examples (P2b PR5): a `closable` tooltip's X, or Escape while the X had focus, unmounted
the focused button and dropped focus on body. Branch `zen/fix/tooltip-close-focus-20261119` from main e64ee694.
- `Tooltip.tsx`: closing from inside the tooltip focuses the trigger (first focusable in the anchor outside the
  surface); a flag keeps that returned keyboard focus from opening the tooltip again. Other closes are unchanged.
- Test: `tests/interaction/tooltip-closable.test.tsx` (Enter on the X, Escape on the X → trigger focused, tip closed).
- BACKLOG-user-and-later refs line and plan §11 PR5 paragraph updated; CHANGELOG line.

## Code view P2b PR4: navigation and structure (tier M; Giám sát session, user "làm PR4 ở đây luôn")

Branch `zen/feat/code-view-p2b4-nav-20261119`, worktree `.claude/worktrees/p2b-pr4` (the PR4 session that had started
stopped clean and was archived on the user's word; its survey gave the per-page helper list).
- 104 examples of 15 pages to files by six agents; ten page CSS files went (Card's Playground rule → platform.css).
  Baseline 275 → 171; 334 example files compile as copied. `videos.canyonPortrait` added to data.ts before the agents ran.
- Bug met → fixed: Sidebar's flyout dropped focus on close (the old example hid it with querySelector). `SidebarFlyout`
  reads its opener on first render and, if focus was inside when it closes, focuses the opener again (skips StrictMode's
  trial unmount). Test `tests/interaction/sidebar-flyout-focus.test.tsx`.
- Bug met → fixed: Badge and Segmented phone chip rows (PR2/PR3) lacked the edge bleed PR5 found.
- Review fixes: Layout's TasksCardFrame looked for the card before the app rendered (390 showed the cut table) → watches
  for it, falls back to the breakpoint; Conversation header's thread sat at the top with doubled margins → fills the
  body above the composer, edge to edge.
- Visual diff (274 panels, 1512 + 390): 199 identical; changed = phone examples on AppShell, the studio logo (2xs) in
  desktop frames and Dashboard Header's Zen wordmark, the two chip-row bleeds, a capture-scroll artifact on the
  Description List page top.
- Gate (`qa --isolated --only=<15 pages + badge, segmented>`): Vitest 98/98, Sidebar Figma suites 6/6, dark clean; two
  findings fixed: Receipt on a phone returned focus to the row's `li`, APG wants the row button → the click's
  `currentTarget` is kept in a ref and focused on close (no DOM query); Handbook's logo grew 2px past the 20px Small-Density
  slot at Comfortable → the row and the 2xs mark take the slot's height. Re-run on sidebar + description-list: PASS.

## Code view P2b PR6: data (tier M; Giám sát session, user "làm PR6 ở đây luôn")

- The "P2b PR6" session the coordinator's chip had just started stopped before editing anything and was archived;
  PR7 runs in its own session (file areas agreed: PR6 = the nine data pages, both append to `data.ts`).
- Five agents ported 97 examples (Chart 30; Metric 16; Table 8 + Sheet Table 5; Shape 12 + Curve Preview 6; Voice 7 +
  Schedule 6 + Timeline 7): 431/505 are files, baseline 74 (PR7's). Page CSS deleted: chart, metric, schedule, table.
- Review: data copied into two to six files moved into `data.ts` (`clientShares`, `clientSharesYtd`, `teamCapacity`,
  `hoursThisWeek`, `scheduleResources`, `bookingSlots`, `roadmapGroups`, `activityLog`). A first rename script also
  renamed the words in comments and aria-labels ("against capacity"); reverted and redone on code references only.
- Bug met → fixed: Voice's live-microphone recorder kept the microphone open when it left the screen while paused (the
  unmount effect went with the subset) → a paused take checks every 0.5 s that its recorder is still there.
- Kept on purpose: Metric's `usd` alias (MetricCard `format` would pass a second argument to `formatMoney`).
- Visual diff (212 panels, 1512 + 390): 195 identical; changed = the studio logo (2xs) in four desktop frames, the five
  phone examples now on AppShell (a few px of margin), and capture artifacts (docs search bar, Voice playground clock).


## Code view P2b PR7: chat, AI and App Shell pages, gate closed (tier M; session from "Code view P2b")

Branch `zen/feat/code-view-p2b7-chat-shell-20261119`, worktree `studio-words-props-dark-20261027-b8fcaa`.
- 74 examples of Chat, AI Chat, AI UI, Widgets (2) and App Shell + its five layout pages to files by eight agents; the
  App Shell part files and chat, ai-chat, app-shell.css went. 505/505 moved: baseline 0, `examples/portable-subset` an
  error (usage selftest fails if it is ever a warning again). Merged main after PR6 (#409): plan, HANDOFF, BACKLOG and
  baseline conflicts, both sides kept.
- `@zen-ds/react/ai-ui` allowed in examples (alias in vite, vitest, tsconfig, the fixture; the snippet-parser test); the
  1.1 MB AI UI catalog is a prop the page loads lazily (pages load at start-up).
- Bugs met → fixed: harness `sidebarLook` read `density="small"` as shadowless (only `variant="small-density"`; A1's
  allow comment went, Sidebar JSDoc fixed); Voice messages' Bao Tran (not in the demo world) and undeletable sent texts;
  a typed invoices sentence stayed on the Skeleton; Discover's "Not a match" dropped focus; three Smart home
  descriptions (Surface → Tertiary IconButtons, Heading/1 → Display/3, OK → Select). Style-guard baseline 1 → 0
  (chat.css went). Review added PR6's lesson: AI Chat streams and Chat's voice playback stop once the example is gone.
- Visual diff (200 panels, 1512 + 390): 173 identical; changed = studio logo/mark (2xs) in 8 desktop frames, the three
  fixed Smart home descriptions, Widgets on a phone on AppShell (body spacing), AI UI ≤ 3/255 per channel (fade-ins
  were page CSS) plus Skeleton first's added sentence, a 6 px icon edge in B1.
- Gate (`qa --isolated --pages=<10 pages + sidebar> --files=…`): first run 1 ✗ (snippet-parser test did not know the
  AI UI entry) → fixed; re-run PASS (Vitest 98/98, audit 1512/390/320, dark, APG, Sidebar Figma 6/6) with one ⚠
  dead click on E3's Save heart (same handler as main; checked again in the final run).
