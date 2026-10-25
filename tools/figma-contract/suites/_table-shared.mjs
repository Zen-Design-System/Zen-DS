// Shared pieces of the Table cell suites (docs/figma-contracts/table-cells.json, re-read from the live file 2026-10-23).
// Every Primitives/Table/Cell/* set is the Content of a Table/Cell/Default (FIXED Table/Cell/Size, padding Small ×
// Medium, one line). Each case renders a real Table (cases/table-cells.tsx `tableCell`) whose one column is as wide as
// the Figma cell: the primitive plus Spacing/Padding/Medium on both sides. A suite measures from the cell's own content
// element (TableMedia, TableText, the Badge…), so offsets compare to the primitive's frame. Labels and captions are read
// from the variant, so a Figma edit to them changes the case too. Text-hugging widths are never asserted (Inter renders
// 1–2px wider on CI's Linux): heights, offsets from fixed neighbours, text styles and paints are.
import { at, child, textOf } from "./_chart-shared.mjs";

export { at, child, textOf };
export const contract = "docs/figma-contracts/table-cells.json";
const PAD = 16; // Spacing/Padding/Medium, each side of Table/Cell/Default.
/** A solid 8×8 picture for Avatar/Photo cells (Figma's IMAGE fill compares as a picture: the `image` check). */
export const PHOTO = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#c8a"/></svg>');
/** The `tableCell` case of a variant: its Table column (JSON) and row, in a box the Figma cell's width. */
export const cellCase = (spec, column, row = {}, extra = {}) => ({ width: spec.w + 2 * PAD, column, row, ...extra });

const TEXT = "01 > Content-Div > Primitives/Table/Cell/Text-Cell";
const subtext = (vp) => vp.Subtext === "Yes";

/**
 * Avatar-, Photo-, Basic-Icon- and Dock-Icon-Cell (Bold × Subtext): `01 > Content-Div` (gap Spacing/Gap/Small) holds the
 * visual, XSmall without a Subtext and Small with one, then a Text-Cell (Label Body/Base Regular|Bold · Strongest over the
 * Subtext Caption/Regular · Light, gap 3XSmall). Drawn by a column's `content` (TableMedia + cellVisual); `visual` gives
 * the visual's map entries (paths under `01 > Content-Div`) and `media(spec)` the row's picture or icon name. `second`
 * measures the cell in the Table's second column, where it draws as the primitive (the first column draws a Dock Icon
 * Small with or without a Subtext).
 */
export function mediaSuite({ setId, content, media, visual, figmaExceptions = [], second = false }) {
  return {
    contract,
    setId,
    kind: "tableCell",
    root: ".zen-table-media",
    cases: (vp, { spec }) => {
      const text = at(spec, TEXT);
      const column = { content, field: "name", mediaField: "media", bold: vp.Bold === "Yes", ...(subtext(vp) ? { captionField: "caption" } : {}) };
      return cellCase(spec, column, { name: textOf(child(text, "Label")), caption: textOf(child(text, "Subtext")), media: media(spec) }, second ? { second: true } : {});
    },
    figmaExceptions,
    map: [
      { figma: "", dom: ":root", check: ["h"] },
      { figma: "01 > Content-Div", dom: ":root", check: ["h", "x", "y"] },
      ...visual.map((entry) => ({ ...entry, figma: `01 > Content-Div > ${entry.figma}` })),
      { figma: TEXT, dom: ".zen-table-text", check: ["h", "x", "y"] },
      { figma: `${TEXT} > Label`, dom: ".zen-table-text__label", check: ["text", "h", "x", "y"] },
      { figma: `${TEXT} > Subtext`, dom: ".zen-table-text__caption", check: ["text", "h", "x", "y"], when: subtext },
      // Subtext=No: the Text-Cell's Caption is hidden, and code draws no caption.
      { figma: `${TEXT} > Caption`, dom: ".zen-table-text__caption", check: [], when: (vp) => !subtext(vp) },
    ],
  };
}
