import type { ParitySpec } from "../../../parity";

const caller = { class: "loading", id: "loading", style: { width: "120px" }, title: "ignored", "data-testid": "loading" };

export default {
  SkeletonText: {
    base: { lines: 3 },
    cases: [
      { lines: 1 },
      { lines: 2 },
      { lines: 5 },
      { lines: 0 },
      { lines: -3 },
      { lines: 2.5 },
      { lines: undefined },
      { ...caller, animated: false },
    ],
  },
  SkeletonHeading: {
    base: { size: "medium" },
    cases: [{ size: undefined }, { size: "lg", animated: false }, { ...caller, "data-size": "ignored" }],
  },
  SkeletonShape: {
    base: { shape: "rectangle", size: "medium" },
    cases: [
      { shape: undefined, size: undefined },
      { shape: "round", size: "2xs" },
      { shape: "pill", size: "lg", animated: false },
      { shape: "square", size: "xsmall" },
      { ...caller, "data-shape": "ignored", "data-size": "ignored" },
    ],
  },
} satisfies ParitySpec;
