// Figma Side-Bar/Master/Basic 4081:15234 (docs/figma-contracts/datepicker-sidebar.json): `<Sidebar>` (variant basic,
// density medium) as tall as the frame (1252). The Surface/Default panel (Corner-Radius/XLarge, Shadow/Bottom/Level-1)
// inset Padding/XSmall from the page edge; its Header (Margin-Compact around the LOGO slots and the Collapse control:
// Button/Icon-Flat Small in a 20px wrapper), Body-Content (Padding/XSmall, 44px rows Gap/3XSmall apart), the Pale
// Divider and the Footer-Content rows. Expand=No is the icon rail (`collapsed`): the mark over the Collapse control,
// Gap/Large apart, and icon-only rows. The rows, labels and Select come from the variant; the logo slots are drawn at
// the Figma artwork's size (the artwork is the app's). The hidden Side-Bar/Sub flyout (SidebarSubMenu) is not compared.
import { panel, rowPath, sidebarMap, sidebarProps } from "./_sidebar-shared.mjs";

const body = (k) => rowPath(`${panel} > Center-Container > Body-Content`, k);
const foot = (k) => rowPath(`${panel} > Footer-Container > Footer-Content`, k);

export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "4081:15234",
  kind: "sbSidebar",
  root: ".zen-sidebar",
  cases: (vp, { spec }) => sidebarProps(vp, spec),
  // Expand=No: the master's rail is 84 (a 68px panel, Padding/XSmall on both sides); code's rail is Patterns/Sidebar's
  // 80 (a 72px panel, the inset on the outer edge only; user 2026-10-21, CHANGELOG; open in QUESTIONS.md "Rail width"),
  // so the panel's insides sit 2px further in. The master's footer rail rows are also 48 wide (body rows 44): code draws
  // every rail row 44.
  figmaExceptions: [
    ["(root)", "w", 80], [panel, "w", 72], [`${panel} > Header`, "w", 72], [`${panel} > Center-Container`, "w", 72],
    [`${panel} > Divider`, "w", 72], [`${panel} > Footer-Container`, "w", 72],
    [`${panel} > Header > Header-Content > Logo`, "x", 30], [`${panel} > Header > Header-Content > Logo > logo-Zen`, "x", 31],
    [`${panel} > Header > Wrapper > Collapse`, "x", 28], [`${panel} > Header > Wrapper > Collapse > Container > Leading-Icon`, "x", 34],
    ...[0, 1, 2, 3, 4, 5].flatMap((k) => [[body(k), "x", 22], [`${body(k)} > Element > Icon-Wrapper`, "x", 34]]),
    ...[0, 1].flatMap((k) => [[foot(k), "x", 22], [foot(k), "w", 44], [`${foot(k)} > Element > Icon-Wrapper`, "x", 34]]),
  ].map(([layer, prop, code]) => ({ vp: { Expand: "No" }, layer, prop, code, note: "rail: code is Patterns/Sidebar's 80 (72 panel, outer inset only; QUESTIONS.md Rail width), the master 84 (68 panel, footer rows 48)" })),
  map: sidebarMap(),
};
