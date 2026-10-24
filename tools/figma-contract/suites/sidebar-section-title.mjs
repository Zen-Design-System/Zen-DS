// Figma Primitives/Sidebar/Menu-Item/Section-Title 6044:81281 (docs/figma-contracts/datepicker-sidebar.json): a section's
// 32px title row, Body/Small/Regular in Content/Neutral/Light, Spacing/Padding/XSmall above and below and Padding/Small
// (Medium) · Padding/XSmall (Small) at the sides; the optional Action-Slot (16px) at its end. A `sections` title of a
// `<Sidebar density>`. The row FILLs its list (the Sidebar's width, not compared); each variant also renders with the
// documented action (a Button/Icon-Flat Small in the 16px slot) to place the slot. State=Hover is pointer :hover (no
// prop): it renders at rest, its fill is not compared (code draws no hover on the title, which is not a control).
import { child, textOf } from "./_chart-shared.mjs";

const title = ".zen-sidebar__section-item";
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "6044:81281",
  kind: "sbSection",
  root: title,
  cases: (vp, { spec }) => {
    const base = { density: vp.Density.toLowerCase(), label: textOf(child(spec, "Elements")) };
    return [base, { ...base, action: true }];
  },
  map: [
    { figma: "", dom: ":root", check: ["h", "radius"] },
    { figma: "", dom: ":root", check: ["fill"], when: (vp) => vp.State !== "Hover" },
    { figma: "Elements > *#0", dom: `${title} > .zen-sidebar__item-label`, check: ["text", "h", "x", "y"] },
    { figma: "Elements > Action-Slot", dom: `${title} > .zen-sidebar__section-action`, check: [], when: (vp, props) => !props.action },
    { figma: "Elements > Action-Slot", dom: `${title} > .zen-sidebar__section-action`, check: ["size", "y"], forceVisible: true, when: (vp, props) => Boolean(props.action) },
    { figma: "Elements > Action-Slot > icon-plus-line", dom: `${title} > .zen-sidebar__section-action .zen-button__icon`, check: ["size"], when: (vp, props) => Boolean(props.action) },
  ],
};
