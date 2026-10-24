// Shared pieces of the sidebar suites (docs/figma-contracts/datepicker-sidebar.json, read 2026-10-24).
import { child, findAll, textOf } from "./_chart-shared.mjs";

export { child, findAll, textOf };

/** The rows of a Figma Body-Content / Footer-Content slot as SidebarItems (label, icon, Select, Theme from each Item). */
const ROW = ["Item", "Primitives/Side-Bar/Menu-Item/Master"];
export const itemsOf = (slot, prefix) => (slot?.c ?? []).filter((node) => ROW.includes(node.n)).map((node, index) => ({
  id: `${prefix}${index}`,
  label: textOf(child(child(node, "Element"), "Label-Wrapper")) ?? "Label",
  icon: child(child(child(node, "Element"), "Icon-Wrapper"), "Icon")?.main,
  selected: /Select=Yes/.test(node.main ?? ""),
  theme: /Theme=Accent/.test(node.main ?? "") ? "accent" : "neutral",
}));

/** The LOGO instance's artwork sizes: the wordmark (Union) and the mark (logo-Zen), and the Version badge's text. */
export function logoOf(logo) {
  const union = child(logo, "Union");
  const mark = child(logo, "logo-Zen");
  const version = child(logo, "Version");
  return {
    logo: union ? [union.w, union.h] : undefined,
    mark: mark ? [mark.w, mark.h] : undefined,
    productName: version && !version.hidden ? textOf(child(version, "Text-Wrapper")) : undefined,
  };
}

/** The Figma path of the `k`-th row of a slot at `route` (an Item, or a Primitives/Side-Bar/Menu-Item/Master instance). */
export const rowPath = (route, k) => `${route} > ${ROW.join("|")}#${k}`;

/** Map entries for the rows of a Figma slot at `route` and their DOM `rows` (an :nth-child list), `count` rows. */
export function rowsMap(route, rows, count, { when, check = ["size", "x", "y", "fill", "radius"] } = {}) {
  const entries = [];
  for (let k = 0; k < count; k += 1) {
    const row = `${rows}:nth-child(${k + 1}) > .zen-sidebar__item`;
    const item = rowPath(route, k);
    entries.push(
      { figma: item, dom: row, check, when },
      { figma: `${item} > Element > Icon-Wrapper`, dom: `${row} .zen-sidebar__item-icon`, check: ["size", "x", "y"], when },
      { figma: `${item} > Element > Label-Wrapper > Label`, dom: `${row} .zen-sidebar__item-label`, check: ["text", "h", "x", "y"], when },
    );
  }
  return entries;
}

export const panel = "Component/Side-Bar/Placeholder";
const bodyRows = ".zen-sidebar__body .zen-sidebar__section-items > .zen-sidebar__item-group";
const footerRows = ".zen-sidebar__footer-content > .zen-sidebar__item-group";
const expanded = (vp) => vp.Expand === "Yes";
const rail = (vp) => !expanded(vp);

/** The case of a Side-Bar/Master/* variant: its height, rail, logo slots, body and footer rows, and the Search. */
export function sidebarProps(vp, spec, extra = {}) {
  const surface = child(spec, panel);
  const header = child(child(surface, "Header"), "Header-Content");
  const logo = child(header, ".Primitives/Sidebar/LOGO") ?? child(header, "Logo");
  const search = child(surface, "Search-Container");
  return {
    height: spec.h,
    collapsed: rail(vp),
    ...logoOf(logo),
    ...(search && !search.hidden ? { search: "Search" } : {}),
    body: itemsOf(child(child(surface, "Center-Container"), "Body-Content"), "b"),
    footer: itemsOf(child(child(surface, "Footer-Container"), "Footer-Content"), "f"),
    ...extra,
  };
}

/**
 * Map entries of a Side-Bar/Master/* panel: the surface, Header (LOGO wordmark · product badge, or the rail's mark, and
 * the Collapse control), the Search slot (the field, or the rail's Search button), Body-Content rows, the Divider and
 * Footer-Content rows (`body` / `footer` row counts). `logoText: false` where the LOGO instance is scaled in Figma (its
 * badge text then has no text style to compare).
 */
export function sidebarMap({ body = 6, footer = 2, search = false, logoText = true } = {}) {
  const H = `${panel} > Header`;
  return [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: panel, dom: ".zen-sidebar__surface", check: ["size", "x", "y", "fill", "radius", "fx"] },
    { figma: H, dom: ".zen-sidebar__header", check: ["size", "x", "y"] },
    { figma: `${H} > Header-Content > .Primitives/Sidebar/LOGO > Union`, dom: ".zen-sidebar__default-brand-expanded", check: ["h", "x", "y"], when: expanded },
    { figma: `${H} > Header-Content > .Primitives/Sidebar/LOGO > Version`, dom: ".zen-sidebar__default-brand-product", check: ["h", "x", "y", "fill", "radius"], when: expanded },
    { figma: `${H} > Header-Content > .Primitives/Sidebar/LOGO > Version > Text-Wrapper > Label`, dom: ".zen-sidebar__default-brand-product", check: ["text"], when: (vp) => logoText && expanded(vp) },
    { figma: `${H} > Header-Content > Logo`, dom: ".zen-sidebar__default-brand-collapsed", check: ["size", "x", "y"], when: rail },
    { figma: `${H} > Header-Content > Logo > logo-Zen`, dom: ".zen-sidebar__default-brand-collapsed > svg", check: ["size", "x", "y"], when: rail },
    { figma: `${H} > Wrapper > Collapse`, dom: ".zen-sidebar__collapse", check: ["size", "x", "y"] },
    { figma: `${H} > Wrapper > Collapse > Container`, dom: ".zen-sidebar__collapse", check: ["fill", "radius"] },
    { figma: `${H} > Wrapper > Collapse > Container > Leading-Icon`, dom: ".zen-sidebar__collapse > .zen-icon", check: ["size", "x", "y"] },
    ...(search ? [
      { figma: `${panel} > Search-Container`, dom: ".zen-sidebar__search", check: ["size", "x", "y"] },
      { figma: `${panel} > Search-Container > Search/Default`, dom: ".zen-sidebar__search > *", check: ["size", "x", "y"], when: expanded },
      { figma: `${panel} > Search-Container > Button/Icon-Main`, dom: ".zen-sidebar__search .zen-button", check: ["size", "x", "y"], when: rail },
    ] : []),
    { figma: `${panel} > Center-Container`, dom: ".zen-sidebar__body", check: ["size", "x", "y"] },
    ...rowsMap(`${panel} > Center-Container > Body-Content`, bodyRows, body, { when: expanded }),
    ...rowsMap(`${panel} > Center-Container > Body-Content`, bodyRows, body, { when: rail }).filter((entry) => !entry.figma.endsWith("Label")),
    { figma: `${panel} > Divider`, dom: ".zen-sidebar__divider", check: ["size", "x", "y"] },
    { figma: `${panel} > Footer-Container`, dom: ".zen-sidebar__footer", check: ["size", "x", "y"] },
    ...rowsMap(`${panel} > Footer-Container > Footer-Content`, footerRows, footer, { when: expanded }),
    ...rowsMap(`${panel} > Footer-Container > Footer-Content`, footerRows, footer, { when: rail }).filter((entry) => !entry.figma.endsWith("Label")),
  ];
}
