// Figma Primitives/Side-Bar/Menu-Item/Master 1536:27473 (docs/figma-contracts/datepicker-sidebar.json): Density Medium
// (44px, Padding/Small, Gap/Small) · Small (36px, Padding/XSmall, icon → label Gap/XSmall) × Level Master · Child ×
// Theme Neutral · Accent × State (Default · Hover · Focus: a 3px OUTSIDE Focus/<Theme>/Subtle ring · Disabled) × Select.
// Each variant is one `sections` row of a `<Sidebar density>` (the row reads its padding and gap from the Sidebar); a
// Child row is the only child of a group, opened on mount. Rows FILL their list, so their width is the Sidebar's, not
// compared. Each variant also renders with its optional parts on (Counter "8", Dropdown, Noti-Dot): hidden in Figma,
// their sizes and paints are compared, not their stale x (Figma keeps the place a hidden layer had).
import { child, textOf } from "./_chart-shared.mjs";

const nested = "Wrapper > Primitives/Side-Bar/Menu-Item/Master";
const isChild = (vp) => vp.Level === "Child";
const rowMap = (prefix, rowDom, when) => {
  const F = (route) => (prefix && route ? `${prefix} > ${route}` : prefix || route);
  // DOM selectors are scoped to the row (a Child's parent row has an icon and a dropdown too).
  const at = (entry) => ({ ...entry, dom: entry.dom === ":root" ? ":root" : `${rowDom} ${entry.dom}`, root: rowDom, when: (vp, props) => when(vp) && (!entry.when || entry.when(vp, props)), ...(prefix ? { figmaRoot: prefix } : {}) });
  const parts = (vp, props) => Boolean(props.item.counter);
  return [
    { figma: F(""), dom: ":root", check: ["h", "fill", "radius", "stroke"], strokeVia: "outline" },
    { figma: F("Element > Icon-Wrapper"), dom: ".zen-sidebar__item-icon", check: ["size", "x", "y"] },
    { figma: F("Element > Icon-Wrapper > Icon"), dom: ".zen-sidebar__item-icon > .zen-icon", check: ["size", "x", "y"] },
    { figma: F("Element > Icon-Wrapper > Icon > Vector"), dom: ".zen-sidebar__item-icon > .zen-icon", check: ["fill"], fillVia: "color" },
    { figma: F("Element > Label-Wrapper > Label"), dom: ".zen-sidebar__item-label", check: ["text", "h", "x", "y"] },
    { figma: F("Element > Icon-Wrapper > Primitives/Notification-Dot"), dom: ".zen-sidebar__notification-dot", check: [], when: (vp, props) => !parts(vp, props) },
    { figma: F("Counter"), dom: ".zen-sidebar__counter", check: [], when: (vp, props) => !parts(vp, props) },
    { figma: F("Dropdown"), dom: ".zen-sidebar__item-dropdown", check: [], when: (vp, props) => !parts(vp, props) },
    { figma: F("Trailing-Slot"), dom: ".zen-sidebar__trailing-action", check: [] },
    { figma: F("Element > Icon-Wrapper > Primitives/Notification-Dot"), dom: ".zen-sidebar__notification-dot", check: ["size", "x", "y", "fill", "radius"], forceVisible: true, when: parts },
    { figma: F("Counter"), dom: ".zen-sidebar__counter", check: ["h", "fill", "radius"], forceVisible: true, when: parts },
    { figma: F("Counter > Text-Wrapper > Label"), dom: ".zen-sidebar__counter .zen-badge__text", check: ["text"], when: parts },
    { figma: F("Dropdown"), dom: ".zen-sidebar__item-dropdown", check: ["size"], forceVisible: true, when: parts },
    { figma: F("Dropdown > Vector"), dom: ".zen-sidebar__item-dropdown > .zen-icon", check: ["fill"], fillVia: "color", when: parts },
  ].map(at);
};
const masterRow = ".zen-sidebar__section-items > .zen-sidebar__item-group > .zen-sidebar__item";
const childRow = ".zen-sidebar__sub-menu > .zen-sidebar__item-group > .zen-sidebar__item";
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "1536:27473",
  kind: "sbMenuItem",
  root: masterRow,
  cases: (vp, { spec }) => {
    const row = isChild(vp) ? child(child(spec, "Wrapper"), "Primitives/Side-Bar/Menu-Item/Master") : spec;
    const item = {
      id: "item",
      label: textOf(child(child(row, "Element"), "Label-Wrapper")),
      icon: child(child(child(row, "Element"), "Icon-Wrapper"), "Icon").main,
      theme: vp.Theme.toLowerCase(),
      selected: vp.Select === "Yes",
      state: vp.State === "Disabled" ? undefined : vp.State.toLowerCase(),
      disabled: vp.State === "Disabled",
    };
    const base = { density: vp.Density.toLowerCase(), child: isChild(vp), item };
    return [base, { ...base, item: { ...item, counter: Number(textOf(child(row, "Counter"))), dropdown: true, notificationDot: true } }];
  },
  // Level=Child wraps the nested row in a Wrapper padded 1px above and below (46 / 38 high); code spaces a group's rows
  // Spacing/Gap/3XSmall (2) apart instead, so a child row starts 1px higher in its group (ask the designer which pitch the
  // Sidebar's nested rows should have: Figma's Body-Content adds its own 2px gap between the 46px items).
  figmaExceptions: [{ vp: { Level: "Child" }, layer: nested, prop: "y", code: 0, note: "Child Wrapper pads the row 1px; code spaces child rows Gap/3XSmall apart (ask the designer)" }],
  map: [
    ...rowMap("", masterRow, (vp) => !isChild(vp)),
    // Child: the Tree-Line (a 2px rule 9px into a 16px column after Padding/Small) and the nested row 28px in.
    { figma: "Tree-Line > Rectangle 1", dom: ".zen-sidebar__sub-menu::before", root: ".zen-sidebar__sub-menu", check: ["x", "w"], when: isChild },
    { figma: nested, dom: childRow, root: ".zen-sidebar__sub-menu", check: ["x", "y"], when: isChild },
    ...rowMap(nested, childRow, isChild),
  ],
};
