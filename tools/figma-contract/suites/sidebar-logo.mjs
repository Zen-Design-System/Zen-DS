// Figma .Primitives/Sidebar/LOGO 4081:14937 (docs/figma-contracts/datepicker-sidebar.json): the Sidebar header's brand
// slots, `logo` + `productName` (Default: the wordmark, then the product name in a Small Neutral Subtle badge Gap/XSmall
// after it) and `logoCollapsed` (Minimize: the 28px mark box of the rail). The artwork is the app's, so it is drawn at the
// Figma's size and its box placed. LOGO pads its 24px row 2px to 28 (Element-Size/Popular/Large); code's brand row is the
// 24px slot and the Header centres it in the same band, so the vertical places are compared in place by sidebar-basic.
import { logoOf } from "./_sidebar-shared.mjs";

const brand = ".zen-sidebar__default-brand";
const minimize = (vp) => vp.State === "Minimize";
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "4081:14937",
  kind: "sbSidebar",
  root: brand,
  cases: (vp, { spec }) => ({ height: 400, collapsed: minimize(vp), ...logoOf(spec), ...(minimize(vp) ? { logo: [78.9, 24] } : {}) }),
  map: [
    { figma: "Union", dom: `${brand} > .zen-sidebar__default-brand-expanded`, check: ["h", "x"], when: (vp) => !minimize(vp) },
    { figma: "Version", dom: `${brand} > .zen-sidebar__default-brand-product`, check: ["h", "x", "fill", "radius"], when: (vp) => !minimize(vp) },
    { figma: "Version > Text-Wrapper > Label", dom: `${brand} > .zen-sidebar__default-brand-product`, check: ["text"], when: (vp) => !minimize(vp) },
    { figma: "", dom: ":root", root: ".zen-sidebar__default-brand-collapsed", check: ["size"], when: minimize },
    { figma: "logo-Zen", dom: ".zen-sidebar__default-brand-collapsed > svg", root: ".zen-sidebar__default-brand-collapsed", check: ["size", "x", "y"], when: minimize },
    { figma: "Version", dom: ".zen-sidebar__default-brand-product", check: [], when: minimize },
  ],
};
