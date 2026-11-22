# Session log — 2026-11-22

## Layers on the canvas — PR4: Layers rows and several layers at once (tier M, branch zen/feat/studio-loose-rows-20261122)

User 11-22 via Giám sát: "OK luôn" for the four loose-layer parts left, one PR each (PR4–PR6). Engine: op many moveTo
takes `looseByLoc` (each layer its own <Layer>) and `atByLoc` (each its px in a free frame), as one moveTo's
`loose` / `at`. Layers (edit/layersDrag.ts): a frame row's top / bottom quarter, or beside a layer on the canvas's row,
is the canvas (`board` place: the Board's order is the code's; Layers lists the front-most first) → moveToCanvas /
moveManyToCanvas with `before` / `after` that Board child, each where it shows; a layer on the canvas into a free frame
keeps its px (`at` / `atByLoc`). Canvas (edit/drag.ts): several flow layers over the empty canvas → moveManyToCanvas
(all on the canvas already → moveFrames: their X / Y); several floating layers outside their frame → followGroupOut
(canvas, or into a frame with atByLoc); several layers on the canvas into a free frame → atByLoc. SelectionLayer lets a
multi-selection drag together instead of moving one Layer. moveManyToCanvas selects every new layer (selectLayers).
E2E FW-285…289 (FW-286: Layers' front-most-first order puts "below Two" before it in the code).
Found on the way: the opt-in dnd campaign's board drop (DND-01…03, tools/studio/e2e/scenarios/dnd.mjs) still expected a
new frame around the item, the rule before PR1 (#415 did not run that group). It now expects a <Layer> of the Board
holding the item with no position, its width the Figma width (or 390 for one that fills without one).
QA: FW-270…289 + FW-35/153/162 work; studio:dnd 0 findings; dnd group 8/8 (DND-01…03 after the fix: 700 drops right); qa --isolated PASS (Studio E2E 462 works, 8 shards; SE-12 and B-36 on retry); build ✓.
