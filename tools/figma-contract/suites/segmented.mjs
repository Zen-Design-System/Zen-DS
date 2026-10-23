// Figma Segmented 1238:892 (docs/figma-contracts/segmented-toggle-badge-avatarstack.json): Level Secondary · Primary ·
// Black-Overlay · White-Overlay, a pill track (Spacing/Padding/3XSmall, Effect/Overlay) around its Item-List slot of
// Primitives/Segmented/Item (the item itself: suites/segmented-item.mjs). The options and the selected one are read from
// the slot's items. Checks the track's height, fill, radius and Effect/Overlay (shadow and background blur), and each
// item's height, fill, shadow and label. Items hug their labels (Inter differs on CI's Linux), so no width is asserted
// and only the first item's start (the track's padding) is; Item-List has no DOM box of its own (the items are the
// group's children), so its 2px offset is the first item's.
import { child, textOf } from "./_chart-shared.mjs";

const ITEMS = 2;
const item = (i) => `Item-List > Primitives/Segmented/Item-${i + 1}`;
const nth = (i) => `.zen-segmented__item:nth-child(${i + 1})`;

export default {
  contract: "docs/figma-contracts/segmented-toggle-badge-avatarstack.json",
  setId: "1238:892",
  kind: "stbSegmented",
  root: ".zen-segmented",
  cases: (vp, { spec }) => {
    const items = (child(spec, "Item-List")?.c ?? []).filter((node) => !node.hidden);
    const options = items.map((node, index) => ({ id: `o${index}`, label: textOf(child(node, "Text-Wrapper")) }));
    const selected = items.findIndex((node) => /Select=Yes/.test(node.main ?? ""));
    return { level: vp.Level.toLowerCase(), options, value: `o${selected}` };
  },
  map: [
    { figma: "", dom: ":root", check: ["h", "fill", "radius", "fx"], fxBackdrop: true },
    ...Array.from({ length: ITEMS }, (_, i) => [
      { figma: item(i), dom: nth(i), check: ["h", "y", "fill", "radius", "fx"], fxIgnoreInset: true },
      { figma: `${item(i)} > Leading`, dom: `${nth(i)} .zen-segmented__leading`, check: [] },
      { figma: `${item(i)} > Text-Wrapper`, dom: `${nth(i)} .zen-segmented__label`, check: ["h", "y"] },
      { figma: `${item(i)} > Text-Wrapper > Label`, dom: `${nth(i)} .zen-segmented__label`, check: ["text"] },
      { figma: `${item(i)} > Wrapper`, dom: `${nth(i)} .zen-segmented__badge`, check: [] },
    ]).flat(),
    { figma: item(0), dom: nth(0), check: ["x"] },
    { figma: `${item(0)} > Text-Wrapper`, dom: `${nth(0)} .zen-segmented__label`, check: ["x"] },
    // Item-List's gap (0), measured from the second item so no label width enters: the first ends where it starts.
    { figma: item(0), dom: nth(0), figmaRoot: item(1), root: nth(1), check: ["right"] },
  ],
};
