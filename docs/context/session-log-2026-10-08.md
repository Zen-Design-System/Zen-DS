# Session log 2026-10-08 — backlog clear-out (parallel agents)

User asks: clear the whole backlog before new features; fix a bug when you meet it (no deferring, now in AGENTS.md);
the phone top bar takes the canvas colour (Alt bars on Canvas/Default); push straight to `claude/zen-ds-0.4.0`.

**Done (all pushed):**
- Components: ListItem trailing slot passes taps to the row; docked SidePanel closes on Escape and returns focus;
  AiChatField draws only the actions it has handlers for; DateField parses a typed date and opens DatePickerSheet on
  phones (new, BottomSheet `footer` slot, `ok` label); DatePicker `calendar="stacked"`; MetricWidget Figma props;
  shared NotificationDot and SidebarShellContext; AiChatBlock `headingLevel`; Tooltip describes a focused control
  inside a wrapper; Layout column Fill / `fillChildren` use a 0% basis (no collapse to 0 without a parent height).
- Platform: 173 phone bars → Alt; HR Home has one visible h1; Design Tokens dark contrast; ~4,000 lines of never-shown
  appLayer examples, `shellScreens.tsx` and their CSS removed (examples live in `examples/pages/*`).
- Harness/QA: `copy/plural-count` Unicode/vi, icon-button rule on AppShellAction/Account, opaque() only for `${`
  outside braces, `tooltip/focusable-trigger` accepts a wrapper; audit false positives fixed (§16 selected cards,
  ListBox as card, corner scale, behaviour shared-ancestor focus ring, heavy-page budgets, text-style limit 8 on whole
  screens); MCP `get_component` brief/full; verify-package JSON parse; `zen-ds check` runs CSS rules.
- Three agents (examples, Studio canvas, Studio server) merged; a fourth (Studio leftovers) runs in a worktree.

**Verification:** tsc, usage selftest + check (8 warnings, all known), style-guard, guidelines:check, studio selftests,
Vitest (smoke + axe + interactions) green; visual diff of all 804 panels for the Layout change: only image/timing noise;
`npm run qa -- --all --isolated`: PASS, 0 errors (warnings fixed at their owner, see commits).

**Figma drift:** every contract hashes differently; normalised for extractor format changes, 26 of 53 checked sets
changed for real, 39 unchecked (too large for one `use_figma` call). Re-capture needs the desktop console → QUESTIONS.md.

**Moved:** designer questions and user decisions → `docs/context/QUESTIONS.md`.
