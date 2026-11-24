import type { ParitySpec } from "../../../parity";

export default {
  VisuallyHidden: {
    base: { children: "Actions" },
    cases: [
      { as: "a", href: "#main", focusable: true, children: "Skip to main content" },
      { as: "label", htmlFor: "search", children: "Search" },
      { role: "status", children: "3 results" },
      { class: "extra", id: "hint" },
    ],
  },
} satisfies ParitySpec;
