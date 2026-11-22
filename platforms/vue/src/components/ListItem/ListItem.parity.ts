import type { ParitySpec } from "../../../parity";

const rows = [
  { $: "ListItem", title: "Design review", caption: "Today · 10:30" },
  { $: "ListItem", title: "Brand refresh", leading: { $: "DockIcon", icon: "icon-calendar-line", size: "md", background: "subtle" } },
];
const press = () => undefined;

export default {
  // ToggleListItem waits for Toggle (wave 2).
  List: {
    base: { "aria-label": "Updates", children: rows },
    cases: [{ id: "inbox", class: "wide", "data-testid": "list" }, { inset: "compact", $label: "deprecated inset" }],
  },
  ListItem: {
    slots: ["trailing"],
    base: { title: "Design review", caption: "Today · 10:30" },
    cases: [
      { leading: "icon-clock-line" },
      { leading: { $: "DockIcon", icon: "icon-calendar-line", size: "md", background: "subtle" } },
      { leading: { $: "Avatar", theme: "blue", alt: "", children: "AC" }, caption: undefined },
      { value: "+94,860,000 VND", valueCaption: "3,600.00 USD" },
      { value: "92 h", valueTone: "negative-light" },
      { value: 12, valueTone: "inherit" },
      { valueCaption: "Due Oct 2" },
      { trailing: { $: "Badge", theme: "red", size: "sm", children: "Overdue" } },
      { onClick: press, selected: true, $label: "a clickable row, selected" },
      { onClick: press, $label: "a clickable row" },
      { href: "/projects/brand", selected: true },
      { as: "div", titleLines: 2 },
      { children: { $: "span", class: "custom", children: "Custom contents" } },
      { title: { $: "strong", children: "Brand" }, caption: { $: "em", children: "2 people" } },
      { id: "row-1", "aria-label": "Design review, today", class: "row", style: { opacity: 0.8 } },
    ],
  },
  ListBox: {
    slots: ["header", "footer"],
    base: { children: { $: "List", "aria-label": "Updates", children: rows } },
    cases: [
      { header: { $: "Heading", level: 4, textStyle: "Heading/Subheading", children: "Activity" } },
      { footer: { $: "Button", level: "tertiary", children: "Show all" } },
      { theme: "pale", color: "brand" },
      { theme: "default", surface: "alt" },
      { theme: "border", surface: "alt" },
      { theme: "shadow", surface: "alt", $label: "Alt on a theme without it" },
      { theme: "border", color: "brand", $label: "a hue on a theme without one" },
      { as: "section", "aria-labelledby": "activity" },
      { width: "fill", maxWidth: 480 },
      { width: 320, alignSelf: "start", style: { marginTop: "8px" } },
      { span: "full", rowSpan: 2, $label: "span outside a Grid" },
      { class: "panel", "data-testid": "box" },
    ],
  },
} satisfies ParitySpec;
