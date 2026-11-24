import type { ParitySpec } from "../../../parity";

export default {
  Divider: {
    cases: [
      { orientation: "vertical", decorative: true },
      { orientation: "vertical", dashed: true, color: "high" },
      { class: "rule", "data-testid": "rule" },
    ],
  },
} satisfies ParitySpec;
