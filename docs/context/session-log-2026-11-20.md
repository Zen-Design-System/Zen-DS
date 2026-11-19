# Session log — 2026-11-20

## Code view P2b closed in the status lines (tier XS; session "Code view P2b")

Giám sát merged PR7 (#410, main 87acd3d7): P2b is done, 505/505 examples are files, baseline 0, `examples/portable-subset`
an error. Plan §11 and HANDOFF already said so; the plan's status header and the BACKLOG-user-and-later "Code view"
entry still said "started" and now say done (#400–#410). The BACKLOG line "Refs to components' inner controls" stays:
it waits for the user's approval.

## ⌘X, then ⌘V on the empty canvas (tier S, branch zen/fix/paste-outside-frame-20261120)

User: "hiện lỗi không cho cắt component ra ngoài frame" (answer: ⌘X, then ⌘V on the empty canvas). With nothing
selected, ⌘V pasted into the frame in view (spotInView) and said "Nothing here takes a paste…" when none was in view.
Fix (edit/clipboard.ts pasteOnCanvas): nothing selected, the copied layer not in view (or cut), and no Screen / Overlay
under the view's middle → builder/boardPaste.ts pasteOnBoard(middle, { centred, text }): a new frame centred there, as
Paste here's (Figma pastes in the middle of the view). A copied layer still in view keeps its place (FW-35).
Also: main's Studio E2E could not open the Studio ("@zen-ds/react/ai-ui" unresolved since #410); vite.studio.config.ts
takes the alias (same line as Giám sát's #412).
E2E FW-269 (id from Giám sát). FW-35/36/83/153/154, K-07/21/23–27, ST-04 work.
