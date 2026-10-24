// Figma Side-Bar/Master/Workspace 4218:9166 (docs/figma-contracts/datepicker-sidebar.json): `<Sidebar variant="workspace">`
// as tall as the frame (1252). The Master rail (68: the 28px brand mark in a Margin-Compact header, then the workspaces —
// Avatar/Single Square Medium tiles with a 1px Border/Inverse ring, the current one's Border/Active/Accent/Solid Focus-Ring
// — and the add action, Button/Icon-Main Medium Tertiary, Gap/Small apart) Gap/2XSmall beside the Main panel
// (Sidebar/Default-Width: the current workspace's name with its chevron and the settings action in the header, then
// Body-Content rows, the Divider and Footer rows). Only Master-Background=Default renders: code's rail is always
// Surface/Default (no prop sets it Flat or Inverse; `background` paints the Main panel), so Flat and Inverse are skipped.
import { child, findAll, itemsOf, logoOf, rowsMap, textOf } from "./_sidebar-shared.mjs";

const rail = ".zen-sidebar__workspace-rail";
const main = ".zen-sidebar__workspace-main";
const tile = (k) => `.zen-sidebar__workspace-items > .zen-sidebar__item-group:nth-child(${k + 1}) > .zen-sidebar__item`;
const W = (k) => `Master > Center-Container > Master-Body-Content > Frame 1 > Workspace#${k}`;
export default {
  contract: "docs/figma-contracts/datepicker-sidebar.json",
  setId: "4218:9166",
  kind: "sbWorkspace",
  root: ".zen-sidebar",
  cases: (vp, { spec }) => {
    if (vp["Master-Background"] !== "Default") return null;
    const master = child(spec, "Master");
    const mainNode = child(spec, "Main");
    const frame = child(child(child(master, "Center-Container"), "Master-Body-Content"), "Frame 1");
    const name = textOf(child(child(child(mainNode, "Header"), "Child-Header-Content"), "Frame 1"));
    const workspaces = frame.c.filter((node) => node.n === "Workspace").map((node, k) => ({
      id: `w${k}`,
      label: k === 0 ? name : textOf(node),
      initials: textOf(node),
      theme: (node.main.match(/Theme=(\w+)/) ?? [])[1]?.toLowerCase(),
      selected: !child(node, "Focus-Ring")?.hidden,
    }));
    return {
      height: spec.h,
      mark: logoOf(child(child(child(master, "Header"), "Master-Header-Content"), "Logo")).mark,
      workspaces,
      body: itemsOf(child(child(mainNode, "Center-Container"), "Child-Body-Content"), "b"),
      footer: itemsOf(child(child(mainNode, "Footer-Container"), "Child-Footer-Content"), "f"),
    };
  },
  // Child-Header-Content is a slot: its sample name is Heading/Subheading (24px row, 2px lower), where code's
  // WorkspaceHeader sets the name in Heading/4 after Figma's Workspace Child-Header 4233:5950 (Sidebar.tsx): ask the
  // designer which the workspace name takes.
  figmaExceptions: [["text", "Inter 600 20px/28px ls=-0.6px none"], ["h", 28], ["y", 28]].map(([prop, code]) => ({
    vp: { "Master-Background": "Default" }, layer: "Main > Header > Child-Header-Content > Frame 1 > Workspace", prop, code,
    note: "workspace name: the slot sample is Heading/Subheading, code's WorkspaceHeader Heading/4 (Child-Header 4233:5950); ask the designer",
  })),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    // The panels' Background-Blur effect style has no generated token (style-effects.css), so their blur is not compared.
    { figma: "Master", dom: rail, check: ["size", "x", "y", "fill", "radius"] },
    { figma: "Master > Header", dom: ".zen-sidebar__workspace-header", check: ["size", "x", "y"] },
    { figma: "Master > Header > Master-Header-Content > Logo", dom: ".zen-sidebar__workspace-header > span", check: ["size", "x", "y"] },
    { figma: "Master > Header > Master-Header-Content > Logo > logo-Zen", dom: ".zen-sidebar__workspace-header svg", check: ["size", "x", "y"] },
    { figma: "Master > Center-Container", dom: ".zen-sidebar__workspace-body", check: ["size", "x", "y"] },
    { figma: "Master > Center-Container > Master-Body-Content > Frame 1", dom: ".zen-sidebar__workspace-items", check: ["size", "x", "y"] },
    ...[0, 1].flatMap((k) => [
      { figma: W(k), dom: tile(k), check: ["size", "x", "y", "radius"] },
      { figma: W(k), dom: tile(k), check: ["stroke"], strokeVia: "shadow" },
      { figma: `${W(k)} > Text`, dom: `${tile(k)} .zen-avatar__inner`, check: ["size", "x", "y", "fill", "radius"] },
      { figma: `${W(k)} > Text > Label`, dom: `${tile(k)} .zen-avatar__initials`, check: ["text"] },
      { figma: `${W(k)} > Focus-Ring`, dom: `${tile(k)}::after`, check: ["stroke"], strokeVia: "after", when: (vp, props) => props.workspaces[k]?.selected },
    ]),
    { figma: "Master > Center-Container > Master-Body-Content > Frame 1 > Button/Icon-Main", dom: ".zen-sidebar__workspace-action-slot .zen-button", check: ["size", "x", "y"] },
    { figma: "Master > Center-Container > Master-Body-Content > Frame 1 > Button/Icon-Main > Container", dom: ".zen-sidebar__workspace-action-slot .zen-button", check: ["fill", "radius"] },
    { figma: "Main", dom: main, check: ["size", "x", "y", "fill", "radius"] },
    { figma: "Main > Header", dom: `${main} .zen-sidebar__header`, check: ["size", "x", "y"] },
    { figma: "Main > Header > Child-Header-Content > Frame 1 > Workspace", dom: ".zen-sidebar__workspace-name", check: ["text", "h", "x", "y"] },
    { figma: "Main > Header > Child-Header-Content > Frame 1 > icon-chevron-down-line", dom: ".zen-sidebar__workspace-trigger > .zen-icon", check: ["size", "y"] },
    { figma: "Main > Header > Child-Header-Content > Wrapper > Collapse", dom: ".zen-sidebar__workspace-action .zen-button", check: ["size", "y", "right"] },
    { figma: "Main > Center-Container", dom: `${main} .zen-sidebar__body`, check: ["size", "x", "y"] },
    ...rowsMap("Main > Center-Container > Child-Body-Content", `${main} .zen-sidebar__body .zen-sidebar__section-items > .zen-sidebar__item-group`, 6),
    { figma: "Main > Divider", dom: `${main} .zen-sidebar__divider`, check: ["size", "x", "y"] },
    { figma: "Main > Footer-Container", dom: `${main} .zen-sidebar__footer`, check: ["size", "x", "y"] },
    ...rowsMap("Main > Footer-Container > Child-Footer-Content", `${main} .zen-sidebar__footer-content > .zen-sidebar__item-group`, 2),
  ],
};
