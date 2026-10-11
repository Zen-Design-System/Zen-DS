// Figma Primitives/Dashboard/Header 4122:33402 (docs/figma-contracts/dashboard-header.json, read 2026-10-11): Type
// Control-Bar · Navigation · Main · Custom, a 40px row of slots. Geometry of each group (its size and offset from the
// row) and the Main title's text style; the slots' own components have suites of their own (Chip, Button…).
const type = (vp) => ({ "Control-Bar": "control-bar", Navigation: "navigation", Main: "main", Custom: "custom" })[vp.Type];
export default {
  contract: "docs/figma-contracts/dashboard-header.json",
  setId: "4122:33402",
  kind: "dashboardHeader",
  root: ".zen-dashboard-header",
  cases: (vp) => ({ type: type(vp) }),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    // Control-Bar: Search FIXED 320, Control-Slots Gap/Medium after it, Action-Slots FILL to the end.
    { figma: "Elements > Search/Default", dom: ".zen-dashboard-header__search", check: ["size", "x", "y"], when: (vp) => vp.Type === "Control-Bar" },
    { figma: "Elements/Control-Slots", dom: ".zen-dashboard-header__controls", check: ["size", "x", "y"], when: (vp) => vp.Type === "Control-Bar" },
    { figma: "Elements/Action-Slots", dom: ".zen-dashboard-header__actions", check: ["size", "x", "y"], when: (vp) => vp.Type === "Control-Bar" },
    // Navigation: Leading-Slots and Trailing-Slots share the row (both FILL), Gap/Medium apart.
    { figma: "Elements/Leading-Slots", dom: ".zen-dashboard-header__leading", check: ["w", "x"], when: (vp) => vp.Type === "Navigation" },
    { figma: "Elements/Trailing-Slots", dom: ".zen-dashboard-header__trailing", check: ["size", "x", "y"], when: (vp) => vp.Type === "Navigation" },
    // Main (a PageHeader): the title's text style and place; Trailing-Slots after the actions, Gap/Small apart.
    { figma: "Element/Header-Text/Heading-Wrapper/Heading Text", dom: ".zen-page-header__titles .zen-heading", check: ["text", "x", "y"], when: (vp) => vp.Type === "Main" },
    { figma: "Element/Trailing-Slots", dom: ".zen-page-header__trailing", check: ["size", "x", "y"], when: (vp) => vp.Type === "Main" },
  ],
};
