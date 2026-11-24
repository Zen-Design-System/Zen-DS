import type { ParitySpec } from "../../../parity";

export default {
  Button: {
    base: { children: "Save" },
    cases: [
      { startIcon: { $: "Icon", name: "icon-check-line", size: "sm" } },
      { endIcon: "icon-chevron-right-line-small", startIcon: "icon-plus-line" },
      { disabled: true },
      { state: "disabled", level: "secondary" },
      { type: "submit", "aria-describedby": "hint" },
      { appearance: "flat", level: "accent", size: "sm" },
      { class: "wide", style: { width: "100%" }, "data-testid": "save" },
    ],
  },
  IconButton: {
    base: { icon: "icon-plus-line", "aria-label": "Add" },
    cases: [
      { icon: { $: "Icon", name: "icon-check-line", size: "sm" } },
      { tooltip: false },
      { tooltip: "Add a file" },
      { appearance: "flat" },
      { appearance: "overlay" },
      { disabled: true },
      { class: "close", "data-testid": "add" },
    ],
  },
} satisfies ParitySpec;
