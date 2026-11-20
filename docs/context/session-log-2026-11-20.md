# Session log — 2026-11-20

## Code view P2b closed in the status lines (tier XS; session "Code view P2b")

Giám sát merged PR7 (#410, main 87acd3d7): P2b is done, 505/505 examples are files, baseline 0, `examples/portable-subset`
an error. Plan §11 and HANDOFF already said so; the plan's status header and the BACKLOG-user-and-later "Code view"
entry still said "started" and now say done (#400–#410). The BACKLOG line "Refs to components' inner controls" stays:
it waits for the user's approval.

## Studio E2E server: the AI UI alias (tier XS; Giám sát session, found by Bug)

- After P2b PR7 (#410) the AI UI examples import `@zen-ds/react/ai-ui`. `vite.config.ts`, `vitest.config.ts` and
  tsconfig got the alias, `vite.studio.config.ts` (the Studio E2E server) did not, so every Studio E2E row failed with
  "the Studio did not open" on main 87acd3d7+. CI runs no Studio E2E, so it passed. Fixed: the same alias, AI UI first.

## ⌘X, then ⌘V on the empty canvas (tier S, branch zen/fix/paste-outside-frame-20261120)

User: "hiện lỗi không cho cắt component ra ngoài frame" (answer: ⌘X, then ⌘V on the empty canvas). With nothing
selected, ⌘V pasted into the frame in view (spotInView) and said "Nothing here takes a paste…" when none was in view.
Fix (edit/clipboard.ts pasteOnCanvas): nothing selected, the copied layer not in view (or cut), and no Screen / Overlay
under the view's middle → builder/boardPaste.ts pasteOnBoard(middle, { centred, text }): a new frame centred there, as
Paste here's (Figma pastes in the middle of the view). A copied layer still in view keeps its place (FW-35).
Found on the way: main's Studio E2E could not open the Studio ("@zen-ds/react/ai-ui" unresolved since #410); fixed in
#412 (below), merged into this branch.
E2E FW-269 (id from Giám sát). FW-35/36/83/153/154, K-07/21/23–27, ST-04 work.
QA: qa --isolated PASS (Studio E2E 462 works; B-45 and DA-08 passed on retry: a cut load, the table editor not open in time); build ✓.

## Backlog tidy + worktree clean-up (tier XS, Giám sát, branch zen/docs/backlog-tidy-20261120)

User: "ok dọn dẹp đi". BACKLOG-user-and-later.md still listed "Studio prototype walk 2026-10-29: pick which fixes to
build"; the entry has been in BACKLOG-archive.md since 2026-11-02 (all nine §4 fixes merged, #349–#370), so the stray
copy goes. 23 worktrees whose branches are merged and clean were removed (`git worktree remove`, branches kept); four
stay while their sessions or a :5186 Studio server still run in them.
