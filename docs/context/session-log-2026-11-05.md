# Session log 2026-11-05

## Export draws the tab bar's More sheet (session "More tab", tier S; branch claude/export-more-sheet-20261105)

Follow-up of PR #382 (merged as 03973a05): the user confirmed here "Có, làm tiếp" (relayed first by Giám sát).

- `tools/studio/compile.mjs` `withMoreSheet`: a Screen's tab bar whose More leads nowhere of its own
  (`responsive-header.mjs playMoreSheet`, the same test as Play) gets `onValueChange` = More opens `moreOpen`, the other
  tabs run the bar's own handler (`const tabs: (choice: string) => void = …`); its sheet (the action BottomSheet of the
  Sidebar rows past the fourth, `onSelect` the per-item navigate) goes at the page's root with `open={moreOpen}
  onOpenChange={setMoreOpen}`, one per distinct sheet, shown on the screens whose bar opens it. Both the AppShell form
  (phone parts on the master layout) and the plain phone form.
- §17 row and CHANGELOG say the export writes it; the derived note says "opens in Play and in the export".
- Tests: compile selftest 98 (sheet state, wrapper, one shared sheet, rows, a More with its own target unchanged; the
  output passes usage-guard consumer mode and tsc with noUnusedLocals).
