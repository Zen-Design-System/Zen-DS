// Figma "Component" 5974:20590 (docs/figma-contracts/datepicker-sidebar.json) — Side-Bar/Master/Small-Density, whose set
// lost its name in Figma (QUESTIONS.md "Side-Bar/Master/Small-Density is named Component"): `<Sidebar
// variant="small-density">`, the dense tools' Sidebar. A flush 240px Surface/Default column (no inset, corners or shadow)
// with a 44px Header (Padding/Small around the 20px LOGO slots and the Collapse control), the Search slot (Padding/XSmall ·
// Small), Body-Content (Padding/XSmall · Small, 36px rows) and the Footer (Padding/Small). Expand=No is the 52px rail:
// the mark over the Collapse control, the Search button (Button/Icon-Main Small Tertiary) and icon-only rows. Rows,
// labels and Select come from the variant; the logo slots are drawn at the artwork's size; the Search field is a Search
// (its own suites), here its box.
import { panel, sidebarMap, sidebarProps } from "./_sidebar-shared.mjs";

export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "5974:20590",
  kind: "sbSidebar",
  root: ".zen-sidebar",
  cases: (vp, { spec }) => sidebarProps(vp, spec, { variant: "small-density" }),
  // Expand=No: Figma's Header (44) and Search-Container (48) HUG their content, centred in the 52px panel; code's span the
  // rail and centre the same content (the logo, Collapse and Search button places are compared and match).
  figmaExceptions: [["Header", "x", 0], ["Header", "w", 52], ["Search-Container", "x", 0], ["Search-Container", "w", 52]]
    .map(([layer, prop, code]) => ({ vp: { Expand: "No" }, layer: `${panel} > ${layer}`, prop, code, note: "rail: Figma hugs the header / search box and centres it; code's box spans the rail, its content centred alike" })),
  // The LOGO instance is scaled to 20px here (5/6, which code mirrors), so its badge text has no text style to compare.
  map: sidebarMap({ search: true, logoText: false }),
};
