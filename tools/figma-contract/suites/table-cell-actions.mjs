// Figma Primitives/Table/Cell/Actions-Cell 1603:14291 (docs/figma-contracts/table-cells.json): Type=Icon Button, a column
// with `content: "actions"` and one action (the variant's icon, icon-dots-vertical-line). An Actions slot (HUG,
// Spacing/Gap/XSmall) holding Button/Icon-Flat Medium · Primary · Default: 40px (Button/Size/Medium), Rounded,
// Background/Neutral/Flat/Default, the 20px icon (Button/Icon-Size/Medium) centred in Content/Neutral/Strongest.
import { at, cellCase } from "./_table-shared.mjs";

const BUTTON = "Actions > Button/Icon-Flat";
export default {
  contract: "docs/figma-contracts/table-cells.json",
  setId: "1603:14291",
  kind: "tableCell",
  root: ".zen-table-actions",
  cases: (vp, { spec }) => cellCase(spec, { content: "actions", align: "right", actions: [{ id: "more", icon: at(spec, `${BUTTON} > Container > Leading-Icon`).main, label: "More actions" }] }),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Actions", dom: ":root", check: ["size", "x", "y"] },
    { figma: BUTTON, dom: ".zen-button", check: ["size", "x", "y"] },
    { figma: `${BUTTON} > Container`, dom: ".zen-button", check: ["size", "fill", "radius", "fx"], fxIgnoreInset: true },
    { figma: `${BUTTON} > Container`, dom: ".zen-button", check: ["stroke"], strokeVia: "shadow" },
    { figma: `${BUTTON} > Container > Leading-Icon`, dom: ".zen-button__icon", check: ["size", "x", "y"] },
    { figma: `${BUTTON} > Container > Leading-Icon > Vector`, dom: ".zen-button__icon", check: ["fill"], fillVia: "color" },
  ],
};
