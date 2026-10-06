# Session log 2026-10-02

## Top Navigation roots, banner, Sidebar arrows (session "Component library review và fixes", tier M)

- **User decisions:** P2 yes. G4 yes (match Figma). G6: "luôn nằm dưới Top-Navigation".
- **P2:** the Sidebar workspace trigger opens its listbox on ArrowDown/ArrowUp. Test in `tests/interaction/app-shell.test.tsx`.
- **G4 + G5:** TopNavigation `topBar`, Figma Top-bar boolean 12014:34, read from the live file.
  - A root (largeTitle, no leading, no identity) hides the bar row: the bar overlays the large-title row (`data-bar="overlay"`). The trailing actions plus `largeTitleAction` sit there, and an invisible `ActionsRoom` keeps the title clear of them.
  - When folded, the title shows in the same row and the header keeps its height. The new `--zen-top-nav-shrink` moves only the part of the fold below the bar.
  - PlatformPhone's pinned height accounts for the overlay.
- **G6:** TopNavigation `banner`, pinned under the bar and the control bar. It moves with the shrink, not with the fold.
- **Checks:** 4 new interaction tests: row height, `topBar`, the folded row with reachable actions, the pinned banner. Guideline Do/Don't lines. The playground has Back and Banner toggles.
- **Peers:** the motion session confirmed its top-navigation.css hunks were untouched. The examples session will switch alert-banner › "Offline on a phone" to `banner`.
- **Backup:** `backups/p2-g4-g6-topnav-sidebar-20261002-0110.tar.gz`.

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

## AI Chat Field + Chat-Control field stroke (session "Cloud migration feasibility", tier S)

- User: "Update phần AI Chat Field và Chat Control". Read live Figma AI/Chat-Field 12074:16888 (12 variants) and
  Chat-Control 6182:56819 (6 variants) with read-only `use_figma`; neither set is in the figma-kit lock.
- Diff vs code: both field containers carry Input/Border/Default (1px INSIDE; clear in S1–S3, Border/Neutral/Subtle in
  S4) that code never drew; AI field Style=Default also lacked Effect/Input's background blur (40 → 20px CSS). Focused =
  Default fill + stroke (code swapped to Input/Background/Focused, same value in every repo mode). Layout, paddings,
  text styles, icons, AI Model pill and the Typing/Long-Typing swaps already matched.
- Fix: inset 1px `--zen-input-border-default` first in each resting box-shadow; AI field gets the input backdrop blur
  (Surface resets it, Glass keeps its 2px); AI focus no longer swaps the fill. Composer focus ring (peer's, user-approved)
  untouched. Kept: composer radius 20px (deliberate, multi-line growth).
- Backlog: Component Theme S5/S6 missing in repo; AiChatField focus ring vs composer (decision).
- Backup: `Zen-CodeBase/backups/zen-ds-before-chat-field-border-20261002-175412.tar.gz`.

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

## AI-readiness re-evaluation (session "Đánh giá khả năng AI với library hiện tại", read-only, tier S)

- Snapshot of the shared tree at ~17:50 copied to the scratchpad (peers running); `build:lib`, `verify:package` 19/19 ✓,
  tsc, usage selftest/check (157 rules), guidelines, style-guard `--all` (0), tokens, icons, MCP, Vitest 422 ✓.
- API probe (28 MUI/Radix-style guesses, no docs): 18 type-check; the 10 misses are all caught by tsc.
- Blind trial (fresh agent, tarball + MCP helper only): "Sales overview" desktop + Vietnamese phone "Cài đặt". 808 lines,
  0 type errors, `zen-usage` clean, doctor ✓, 1 inline style (`--zen-list-inset`), 1 raw `<span lang>`, 17 files + 49 MCP
  calls; agent score 7.5. Rendered offline: no console errors, no overflow, dark ✓, one h1 per screen; axe light-mode
  contrast from DS tokens only; Metric trend text truncates; the language sheet followed the contradicting guideline.
- Memory audit (46 rules): 23 enforced+documented, 15 documented only, 6 memory only, 2 contradicted.
- Findings → BACKLOG "From the AI-readiness re-evaluation of 2026-10-02". Nothing in the library changed.

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

## Examples pass: grouped lists, DateField ArrowDown, Bottom Navigation Light (session "Disable input và search từ Figma", tier M)

- User report on the Toggle settings phone ("khó nhìn"): new usage rule §15 grouped lists (Surface-Alt screen, white
  Box per group, kicker in the Box's md inset, List block paddingX md + paddingY 2xs). Two agents applied it to avatar,
  bottom-navigation, chart, date-picker, dialog, inline-message, input, list-item, stepper; toggle by hand.
- User decision: Bottom Navigation idle labels back to Content/Neutral/Light (Floating-Glass keeps Strongest); tests
  in component-fixes and b5-navigation-fixes assert the token instead of 4.5:1.
- DateField: `role="combobox"` (axe aria-allowed-attr) and ArrowDown opens the calendar with focus on the selected day,
  else today, else the first pickable day; `tests/interaction/datefield-combobox.test.tsx` (3 tests).
- Data: INV-2026-0140 back to page-local (four pages disagreed); time-off caption is the type only.
- Gate: behaviour clean; 3 smoke "paints over the open popover" (chat ×2, templates@390) were the audit sampling a stale
  popover rect, fixed in audit.mjs by "Cloud migration feasibility"; popover@390 topbar is the redesign session's P2.
- Backlog G10 (approved with "Backlog cần duyệt cứ xử lý hết"): the old example map and every function only it used
  are gone. PlatformShowcases.tsx 5,469 → 198 lines, PlatformMobileShowcases.tsx 999 → 27 (ChartReportPanel). Done
  with `tsc --noUnusedLocals` rounds (412 declarations/imports); exports still imported elsewhere kept. AGENTS.md
  references updated. Backup: `backups/zen-ds-before-dead-examples-20261002-193646.tar.gz`.
- Gate after the cleanup (`.qa/reports/2026-10-02T12-41-29-98ad4cec.md`): static ✓, TypeScript ✓, 11 Figma suites ✓,
  Vitest 23/23 ✓. Two ✗: popover@390 "official-topbar__controls paints over" (Backlog P2 docs topbar at 390, its
  session ended) and table@1512 "Invite guest focus" (the page hot-reloaded mid-run; `behaviour.mjs --pages=table` re-run
  is clean). Contact sheets reviewed: no visual change from the cleanup.

## Flaky smoke "paints over the open popover" on chat — fixed in the audit (same session, user: "sửa lỗi đi")

- Two workflows (ultracode): 3 independent investigations + synthesis, then 4 verifications. Scripts and logs:
  session scratchpad (`reproduce/`, `code/`, `tool-skeptic/`, `synth/`, `verify-*/`), gone with the session.
- Root cause (all three lenses agree, high confidence): `audit.mjs` smoke read the first floating popover's rect once,
  moved the mouse twice (60ms each) and hit-tested that stale rect ~130ms later. Chat demo timers started by earlier
  smoke clicks (chat.tsx `later(2600)` call → "No answer", `later(1400)`, `later(900)`) re-render a ChatThread, whose
  `pin()` sets scrollTop = scrollHeight (thread still "pinned" after Playwright's scripted scroll). The portalled popover
  (z 1000, above the z 1 card) follows its anchor; at 390 Chrome scroll anchoring on a nested phone message also scrolls
  the window 26px. Stale points then hit the message / thread / Reply svg that slid in. Not a UI bug: 0/461 live samples
  were covered. Timing (2.6s timer vs ~140ms window, load, HMR) made it intermittent.
- Fix: tag one non-closing popover (`data-audit-popover`), re-read its rect before each move and inside the same
  evaluate as `elementFromPoint`; skip if it closed; remove the tag. No new message type (a "closed on hover" check would
  be new scope). Header doc line updated.
- Verified: 6 gate-flag runs clean (3 concurrent; old tool failed in the same batch); instrumented runs show moves of
  −34/−873px with no hit; negative controls (popover z 0, card raised over it, fixed overlay) flagged by new ⊇ old;
  all 61 pages × 1512/390 old vs new: no real overlap lost, none added; templates@390 HR · Home #1 old 5/5 → new 0/5;
  adversarial review: no defect, low-severity hardening ideas → BACKLOG. Runs saw peer 500s/HMR and an outage
  19:12–19:26 (load avg ~45), counted as noise.
- Side findings → BACKLOG (need approval): Reaction-Bar clipped at 390 (P2, useAnchoredPosition), ChatThread re-pin
  after programmatic scroll, docs page 26px jump, React picker refocus per render, smoke coverage gaps.
- Backup: `Zen-CodeBase/backups/zen-ds-before-smoke-live-rect-20261002-185639.tar.gz`.

## App-layer examples rebuilt (same session, tier L, user: "làm luôn")

- **Scope:** the 12 pages without an examples file (action-bar, app-shell, description-list, form, image, layout, link,
  menu, page-header, side-panel, text, visually-hidden). The examples session agreed to hand them over and had no
  drafts. Each page got a new `src/platform/examples/pages/<page>.tsx` (+ .css), built to the example brief; no shared
  file was edited.
- **Build workflow:** 4 builders × 3 pages, then a zen-ux-reviewer per batch. Every page ended clean on tsc,
  usage-guard, style-guard and audit --quality --smoke at 1512/390; the shots were reviewed and every interaction was
  tried. Review: 2 P1, 25 P2, 33 P3.
- **Fix rounds:**
  - Round 1: 4 fixers, then 4 verifiers. Every page-level P1/P2 was resolved with evidence.
  - Round 2: leftovers and the problems round 1 introduced: a caption that broke after its separator, a Container
    that shrank, focus landing on a tooltip button, a missing CSS snippet, a 0% trend shown as positive.
  - Audit after round 2: no error-level findings on any of the 12 pages.
- **Shared and component items** went to BACKLOG under "From the app-layer examples rebuild":
  - P1: Full screen breaks because of the platform.css:492 focus rule. Its owner was notified.
  - PageHeader on phones (description below the wrapped actions) and its h2 style.
  - Checkbox / Radio outline contrast; SidePanel submit; AppShell aside width.
  - EmptyState inside a Card; FormActions; the read-only TextArea grip; Table selected row; DescriptionList at 390.
  - The audit's edges check; the dead appLayer code; brief §3b.
- **Backups** were made by the builders and fixers before their edits (`backups/zen-ds-before-*-20261002-*.tar.gz`).
- User approved fixing the Backlog P2 docs topbar at 390 ("Tôi sửa luôn"): PlatformTopbar renders the settings chips in
  a non-sticky `.official-topbar-settings` row at ≤1024px (matchMedia); sticky bar 72px. popover/sidebar smoke clean.
- P1 from "Add audit check…": my `.pe-card:is(:focus-within…)` raise rule (0,3,0) beat `[data-fullscreen]`, so Full
  screen collapsed screen cards; now `:not([data-fullscreen="true"])`. Brief §3b breakpoint note corrected.
  Backup: `backups/zen-ds-before-topbar390-fullscreen-20261002-214822.tar.gz`.

## Component Theme S5–S7 + Zen Studio canvas tool (session "Platform UI/UX redesign với canvas editor", tier L)

- Backup first: `backups/platform-before-studio-20261002-181727.tar.gz` (+ `.RESTORE.md`).
- Tokens: `~/Downloads/Component Theme.json` (modes Neutral - S5, S6, S7 only) merged format-preserving into
  `tokens/source/figma/component-theme.json`; collections note; ZenProvider `zenComponentThemes`, PlatformTemplate chip,
  Storybook, guideline Provider line, getting-started. tokens:build/check/native:check clean. S5 = S4 + filled inputs
  (Subtle, focused Flat); S6 = S4 + filled Tertiary buttons / Secondary chips; S7 = S5 with focused Pale.
- Zen Studio (spec `docs/research/zen-studio-spec-2026-10-02.md`): built by a 3-builder workflow on its own server
  (5180, `vite.studio.config.ts`, own cacheDir), reviewed by 4 reviewers (61 findings: 4 blockers), fixed by 3 fixers,
  re-verified (47 fixed, 11 partly). Integrator work: bridge seam (ExamplePage/ComponentPreview/PlaygroundControls
  codemod ×41/PlatformCode/ExampleCard `bare`/getPageExamples), active panel as an external store (switching panels no
  longer re-renders the board), `zen-studio-chrome` comments on docs-chrome functions, store persists page + flushes on
  pagehide/vite:beforeFullReload, fit-to-playground first view.
- Two majors from re-verification fixed by hand: snippet sync now only edits the snippet of the example whose render
  holds/renders the element, text only in JSX text, and transplants only the changed characters (survey of 5,098 tags
  + 816 texts over every example file: 0 bad); undo records are context hunks (2 lines above/below), so undo never
  lands on a look-alike or relocates after the element was deleted, and an outside edit between an element and its
  snippet no longer blocks undo (unit + 3,000-case fuzz).
- Integration on 5173 after a quiet-window "go" from "Cloud migration feasibility": `src/main.tsx` (Studio default,
  classic for `?ui=classic` / navigator.webdriver) and `vite.config.ts` (zenStudio() before react()). Classic DOM checked
  under Playwright on button/input/app-shell/table: unchanged, 0 console errors.
- Backlog: P3 app-layer HMR cycle (full reload on appLayer/templates edits). The classic full-screen P2 was fixed by
  "Disable input và search từ Figma".

## Six Backlog follow-ups from the smoke investigation (same session, user: "xử lý hết lần lượt")

1. **Reaction-Bar clipped at 390 (P2):** `useAnchoredPosition` — new `clampAnchoredLeft()`; a surface that fits on
   neither edge of its anchor is shifted into the visible bounds (VIEWPORT_MARGIN 8); fitting surfaces unchanged.
   Probe: 12/12 Reaction-Bars inside at 390 (x 72–382 or 8–318), 1512 unchanged. Tests: anchored-position.test.tsx (6).
2. **ChatThread re-pin (P3):** `inputAt`/`lastTop` → refs; `focusin` counts as input; an input ≥48px from the end unpins.
   Tests: chat-thread-picker.test.tsx (pointer + focus cases fail on the old Chat.tsx, pass now; no-input case still pins).
3. **Docs page jump (P3):** measured −38px at 390 with no input (2/2); `.platform-phone { overflow-anchor: none }` → 0
   (2/2). On the frame, not the screen, so the phone's own scroller keeps its anchoring.
4. **Picker refocus (P3):** Popover merges refs with an inline callback, so a stable useCallback alone still ran every
   render (test failed); the callback now focuses only a surface node it has not seen. Test fails on old code.
5. **Smoke hardening (P3, audit.mjs):** pointer spot clamped (opposite side when off-screen), on-screen part sampled,
   0×0/closed skipped, `report.smokeStats` + one summary line (information only; the gate reads only report.pages),
   hover-revealed buttons clicked with the pointer on their row.
6. **Threads opening at scrollTop 0:** not reproduced: 13/13 threads open at their end at 1512 and 390, before and after.
- Coordination: peers told before each shared file (Popover hook, Chat.tsx, platform.css); "Platform UI/UX redesign"
  changed vite.config/main.tsx mid-way (Studio for humans; Playwright keeps the classic DOM).
- QA: `npm run qa` ✓ PASS (report .qa/reports/2026-10-02T15-10-06-48475494.md): static, TS, Figma suites (6), Vitest full
  suite, audit/dark/behaviour 0 errors; warnings are pre-existing template rhythm/outline debt (in BACKLOG). 12 contact
  sheets reviewed.
- Backups: `backups/zen-ds-before-{popover-clamp-20261002-214903,chat-thread-pin-20261002-215717,
  phone-overflow-anchor-20261002-220508,smoke-hardening-20261002-220718}.tar.gz`.
- Round 2 (3 fixers after a final 2-agent verification): undo history moved to the pure `history.ts` with record-time
  unique context (2–12 lines) and hash-exact fast path (`node src/platform/studio/history.selftest.mjs`: 89 checks,
  40k fuzz, 0 wrong writes; wired into `tools/studio/selftest.mjs`); nested parts (`select/parts.ts`, PartPanel);
  fit ignores the Docs frame, first visit ≥ 75%, min zoom 0.02; frame toolbar clamped; ⌘\ keeps the world still;
  example overlays stay inside the canvas area; one Info selection colour; drawers focus + close; snippet sync
  edits only the changed characters, only the owning example's snippet, text only inside the same element.
- User follow-ups: Foundation (and Overviews/Installation) pages are normal scrolling pages, not canvas boards
  (`doc/DocumentPage.tsx`; no canvas tools, Layers or Inspector there); Zoom to frame uses the magnifier icon
  (`icon-zoom-in-line`).

## Component Size token + AI Chat field radius (session "Component Size tokens and corner radius", tier XS)

- Export `Component Size.json` (Downloads) vs `tokens/source/figma/component-size.json` (script diff): 1 added,
  `AI-Chat/Field/Corner-Radius` (Compact `{Corner-Radius/Giant}`, Comfortable `{Corner-Radius/XGiant}`); 0 removed, 0 value
  changes. The export lists tokens in another order: repo order kept, new token appended. 194 → 195, repo 2,176 → 2,177
  (figma.collections.json, design-system-context.md, token-architecture.md, README.md).
- `tokens:build` (23:42:50) added only `--zen-ai-chat-field-corner-radius` (both density blocks) + generated.ts/catalog/native.
- `.zen-ai-field` (ai-chat.css) now uses it instead of `--zen-corner-radius-giant`; peer's inset stroke/blur kept.
  Probe ?page=ai-chat: Rounded/Smooth 32 → 36px, Standard 28 → 32px, Luxury 2px (Compact → Comfortable); icon buttons
  40/48px, so field radius = button radius + Padding/Small 12 in both densities.
- Backup: `backups/zen-ds-before-component-size-ai-field-radius-20261002-234222.tar.gz`.
- **Verification round 2 (workflow, 4 agents) and follow-ups:** fixed in audit.mjs a 30s Playwright default wait per
  missing button (full pass ~11× slower; now 0.93× the pre-hardening time), the sticky docs bar covering the hovered row
  (block "center" + elementFromPoint check), pointer-events wrappers taken as hover-revealed (Top Navigation bar), a
  pointer spot inside near-full-width popovers, smokeStats lost in sharded merges (run.mjs), and a leftover Toast blinding
  the sample (toast stack hidden while sampling). Negative control (chat popovers z 0): 30/30 flagged vs old 20 (superset,
  incl. Team messenger #11 and Reply #11 / Files #13 at 390). Positive control: chat, toast, top-nav, date-picker clean.
- useAnchoredPosition: no shift inside transform-scaled frames (screen px vs layout px; restored the pre-clamp placement,
  e.g. ai-chat@390 phone popover x 89.4); the lastAlign "hand-over" rewrite removed (no measurable effect).
- ChatThread: unpin only when the thread was already away from its end (atEnd ref, no race with content growing); the
  reader's own message re-pins only on a real append (previous newest now second to last, key unseen; key = id or text),
  so prepended history, a removed last message and Undo keep the place. Tests added for each (fail on the previous code).
- Lesson: script (python) edits are not recorded by the gate's PostToolUse ledger → run `npm run qa -- --files=…` or
  edit with the Edit tool. Also: never land tests ahead of their fix (a peer's gate ran them and failed).
