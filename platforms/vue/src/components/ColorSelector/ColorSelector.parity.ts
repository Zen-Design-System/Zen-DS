import type { ParitySpec } from "../../../parity";

// The playground's swatches: support colours, Yellow with a dark check.
const swatch = (name: string) => `var(--zen-color-background-support-${name}-solid)`;
const colors = ["blue", "green", "yellow", "orange", "red", "pink", "purple", "teal"].map((name) => ({ value: swatch(name), label: name[0].toUpperCase() + name.slice(1), ...(name === "yellow" ? { contrast: "dark" } : {}) }));

export default {
  ColorSelector: {
    // `name` is given: without it React and Vue each name the radios with their own generated id (useId), which the
    // canonical HTML does not map for `name`.
    base: { "aria-label": "Label colour", colors, value: swatch("blue"), name: "label-colour" },
    cases: [
      { value: swatch("yellow"), $label: "dark check selected" },
      { value: undefined, $label: "nothing selected" },
      { value: "transparent", $label: "a value no swatch has" },
      { "aria-label": undefined, $label: "default group name" },
      { colors: [{ value: "#fff", label: "White", contrast: "dark" }, { value: "#000", label: "Black", contrast: "light" }], value: "#000" },
      { colors: [], $label: "no swatches" },
      { name: "project-colour" },
      { class: "picker", style: { gap: "4px" }, id: "colours", title: "dropped", "data-testid": "colours" },
    ],
  },
} satisfies ParitySpec;
