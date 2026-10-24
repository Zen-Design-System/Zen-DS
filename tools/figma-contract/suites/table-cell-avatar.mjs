// Figma Primitives/Table/Cell/Avatar-Cell 1603:2869 (docs/figma-contracts/table-cells.json): Bold × Subtext, a column with
// `content: "avatar"`. The Avatar/Single Circle · Photo · Background=Subtle is XSmall (Image-Size/XSmall 24) on one line
// and Small (32) over a Subtext, centred on the Text-Cell, Spacing/Gap/Small before it: its Surface fill, 1px OUTSIDE
// Border/Inverse ring (code: a box-shadow ring), Rounded radius and the photo's 1px INSIDE Border/Neutral/Subtle stroke.
// Focus-Ring, initials and Status stay hidden. The Text-Cell's checks are shared (_table-shared.mjs).
import { mediaSuite, PHOTO } from "./_table-shared.mjs";

export default mediaSuite({
  setId: "1603:2869",
  content: "avatar",
  media: () => PHOTO,
  visual: [
    { figma: "Avatar", dom: ".zen-avatar", check: ["size", "x", "y", "fill", "radius"] },
    { figma: "Avatar", dom: ".zen-avatar", check: ["stroke"], strokeVia: "shadow" },
    { figma: "Avatar > Image", dom: ".zen-avatar__inner::after", check: ["size", "stroke", "radius"] },
    { figma: "Avatar > Image", dom: ".zen-avatar__inner", check: ["image"] },
    { figma: "Avatar > Focus-Ring", dom: ".zen-avatar::before", check: [] },
    { figma: "Avatar > Text", dom: ".zen-avatar__initials", check: [] },
    { figma: "Avatar > Status", dom: ".zen-avatar__status", check: [] },
  ],
});
