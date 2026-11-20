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

## Layers on the canvas, outside any frame — PR1 (tier L, branch zen/feat/studio-loose-layers-20261120)

User: "Các component vẫn chỉ tạo và đặt trong frame. Không đặt ở ngoài frame được" → asked for the scope: "Đủ như
Figma", 3 PRs (PR1 loose layers made by drop/paste + moved/selected/copied/deleted; PR2 drag out of / into frames;
PR3 draw tools on the empty canvas). The Board held Screen/Overlay/Section/Slice only (#346/#413 wrapped in "Frame N").
- Dialect: `<Layer id x y [width]>` holds one layer (dialect.mjs boardLayers/layerCode; arrange.mjs childRefusal "stands
  alone"; slots.mjs removal: removing its layer removes the Layer; looseLayers() takes pasted layers out of their frame).
- Board: frame id `layer:<id>`, a StudioFrame of kind "layer" with no chrome (FrameChrome skips it), `data-hug` unless it
  has a width (fill components: Top Navigation 390, Line chart 297). builder/looseLayer.ts: add, select, fit.
- Click selects its layer (clickTarget: the Layer is the content root); a drag/⌥-drag/arrows/⌘D move or copy the Layer
  (frameMove pressFrame, frameKeys); Delete/⌘X via the engine; Layers promotes it to a top-level row; Inspector Position
  X / Y = its board place (FrameGeometry LoosePosition); canStructurallyEdit allows `layer:`.
- Drop/paste: boardPaste dropOnBoard/pasteOnBoard make Layers (several copied layers keep their arrangement: clip
  `boxes`); ⌘V with a loose layer selected pastes over the copied one or beside it; Paste here on a loose Button too.
- Not yet: Figma push (the plugin places frames only: notes "N layers on the canvas … not pushed yet") → follow-up PR
  with the plugin; resize handles on a loose component; PR2/PR3.
E2E (FW-270…274 from Giám sát): B-55/56 and FW-153/269 rewritten for Layers; FW-270 move/snap/⌥, FW-271 keys, FW-272
click/Layers/X-Y/double-click, FW-273 ⌘C⌘V + Assets beside, FW-274 two shapes pasted. studio:dnd 0 findings.
QA notes: a full non-sharded Studio E2E run (09:50–10:47) broke DR-02…15, VA-01…09, BP-09…17, NO-08/19 with "the
Studio did not load (the tab does not answer)": each a seededPage row (Sync with the folder + reload) late in the run,
the folder holding hundreds of pages; AG, board and BP-01…08 between them worked. Each group alone works; B-56 (a page
with a <Layer> left in the folder) then DR-02/03/04 work → stall môi trường, chạy riêng qua (the gate's shards start
with an empty folder). The first sharded gate lost shard 2–3 to a Clamshell Sleep (pmset 11:07:50–12:16:23); its re-run:
461 works, SE-06 (Checkbox row in Layers, a code page) once, alone 27/27 select.


## FW-169: the Code view's language picker is not a property row (tier XS, Giám sát, branch zen/fix/studio-fw169-code-picker-20261120)

Found by Bug while running the figma group for #416: FW-169 broke on main since the Code view's language picker (P1
2f405263, 2026-11-13) with "Example code: off the field grid: Code language … ends at 87 of 294". The picker sits in
CodeView's own header (the same view as on the docs pages), not on an Inspector row; `panelFits` (figma.mjs) now skips
fields inside `.studio-code__header` for the field-line check; its juts-out and cut-off checks still cover it. The figma
group is opt-in, so neither the gate nor CI ran it. FW-169 works (13 s).
