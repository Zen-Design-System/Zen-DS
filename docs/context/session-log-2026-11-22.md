# Session log — 2026-11-22

## Layers on the canvas — PR5: resize a component on the canvas (tier S, branch zen/feat/studio-loose-resize-20261122)

Part 2 of the four the user approved 11-22. select/resize.ts: AxisRule `layer` + ResizeTarget.layer + withLayer (a
width the component cannot take, wrap / fullWidth, is its <Layer>'s; no height handles, "Its height is its own on the
canvas"); planResize writes setProp width (+ x from the left edge: PlanOptions.layerX, the right edge stays); planHug
removes it. select/ResizeLayer.tsx applies withLayer to a component on the canvas whose Layer has a width (its frame is
not `data-hug`: one that fills, a Top Navigation, a chart); write() sends the plan to the Layer and keeps the component
selected. A Button (hugs) keeps the existing wrap. builder/FrameGeometry.tsx LoosePosition: a W field for such a Layer.
E2E FW-290, FW-291 (from Giám sát's FW-285…294).
The first E2E run (GO 20:18) broke FW-290/291. Two bugs were found and fixed in this change:
- **Slot chip over the handle.** The Top Navigation's empty Top-Trailing / Control "+" chips (slots layer z 11) sat on
  its new right handle, so a press or double-click there opened the picker. slots/SlotLayer.tsx `clearOfPill` now also
  moves a chip off any `.studio-resize__handle`, on the side its centre is on: inward over the layer, or out past a
  filled slot's edge.
- **Left-edge X not written.** The Layer's X from a left-edge drag was planned only for the preview, not on release.
  `Drag.layerX0` is taken at the press, and `layerXOf` is used by both.
FW-290/291 then pass, along with FW-102…112 and DR-07.
