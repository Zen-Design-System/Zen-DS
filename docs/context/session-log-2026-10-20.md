# Session log 2026-10-20

## Copy as PNG (⇧⌘C) / SVG (Session A, worktree `../Zen-DS-f9b`, branch `zen/feat/studio-copy-as-png-20261020`)

The user (through the progress session): layerPicture is on main (#151), build ⇧⌘C now. The rest of F3 (plan §5).
- `edit/copyAs.ts`: `copyAsPng` writes a ClipboardItem whose PNG is the drawing's promise, so the write starts inside the
  key press; scale = the layer's first export setting (ExportSection `exportSettingsOf`, one read-only export added to
  B's file) else 2x, as Figma copies. `copyAsSvg`: the Export section's SVG (HTML in a foreignObject) as text. A frame
  copies its body (`findFrame`). Status: "Copied Rectangle as PNG (2x)".
- ⇧⌘C in `figmaKeys.ts` for layers and frames, before the edit-rights check (copying reads the canvas). Layer menu's Copy
  as list, the frame menu and Quick actions; ShortcutsDialog row; "Copy as PNG" out of FIGMA_NOT_YET and the E2E list.
- E2E FW-125 (⇧⌘C → PNG at 2x the layer, page unchanged), FW-126 (Copy as SVG at the layer's size; the frame menu's Copy
  as PNG at 2x the Screen's width).
