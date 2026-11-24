import type { ParitySpec } from "../../../parity";

export default {
  Icon: {
    base: { name: "icon-check-line" },
    cases: [
      ...(["2xs", "xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl"] as const).map((size) => ({ size })),
      { size: 24 },
      { size: "1.5rem" },
      { tone: "light" },
      { tone: "positive-base" },
      { title: "Done" },
      { decorative: false, "aria-label": "Done" },
      { name: "icon-alert-circle-line", $label: "content with ids (clip-path)" },
      { class: "row-icon", style: { opacity: 0.5 }, "data-testid": "mark" },
    ],
  },
} satisfies ParitySpec;
