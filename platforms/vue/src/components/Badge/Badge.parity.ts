import type { ParitySpec } from "../../../parity";

export default {
  Badge: {
    base: { children: "Design" },
    cases: [
      { leading: { $: "Icon", name: "icon-check-line", size: "xs" } },
      { leadingIcon: false, leading: "icon-check-line" },
      { remove: true, theme: "red" },
      { remove: true, removeLabel: "Remove the Design tag" },
      { remove: true, children: { $: "strong", children: "Design" } },
      { remove: true, children: 42 },
      { size: "xs", background: "subtle", theme: "green" },
      { class: "tag", "data-testid": "badge", "data-size": "ignored" },
    ],
  },
  BadgeCounter: {
    inherits: ["Badge"],
    base: { value: 3 },
    cases: [{ value: "99+" }, { size: "md", theme: "red" }, { value: undefined, children: "7" }, { background: "subtle" }],
  },
} satisfies ParitySpec;
