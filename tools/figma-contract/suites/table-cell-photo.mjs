// Figma Primitives/Table/Cell/Photo-Cell 1603:4668 (docs/figma-contracts/table-cells.json): Bold × Subtext, a column with
// `content: "photo"` (code: Avatar Shape=Square · Photo · Subtle). The Photo is a 24px rectangle with Corner-Radius/XSmall
// on one line and 32px with Corner-Radius/Small over a Subtext (Image-Size/XSmall · Small), centred on the Text-Cell,
// Spacing/Gap/Small before it. The Text-Cell's checks are shared (_table-shared.mjs).
import { mediaSuite, PHOTO } from "./_table-shared.mjs";

// Ask the designer: Figma's Photo is a bare rectangle (no stroke), while code draws the photo as Avatar Shape=Square,
// which keeps the Avatar's 1px OUTSIDE Border/Inverse ring and the picture's 1px INSIDE Border/Neutral/Subtle stroke
// (as Avatar-Cell's Avatar and Image draw them). `code` pins both per mode (light · dark).
const note = "Figma Photo-Cell's Photo is a bare rectangle; code draws Avatar Shape=Square with its Border/Inverse ring and Border/Neutral/Subtle inner stroke (ask the designer).";
const pinned = ["1px rgb(255, 255, 255)", "1px rgb(33, 33, 33)", "1px rgba(1, 1, 1, 0.13)", "1px rgba(255, 255, 255, 0.184)"];
export default mediaSuite({
  setId: "1603:4668",
  content: "photo",
  media: () => PHOTO,
  visual: [
    { figma: "Photo", dom: ".zen-avatar", check: ["size", "x", "y", "radius"] },
    { figma: "Photo", dom: ".zen-avatar", check: ["stroke"], strokeVia: "shadow" },
    { figma: "Photo", dom: ".zen-avatar__inner::after", check: ["stroke"] },
  ],
  figmaExceptions: pinned.map((code) => ({ vp: {}, layer: "01 > Content-Div > Photo", prop: "stroke", code, note })),
});
