import type { ParitySpec } from "../../../parity";

const steps = [
  { id: "details", title: "Details", caption: "Optional" },
  { id: "payment", title: "Payment" },
  { id: "review", title: "Review", icon: "icon-check-line" },
  { id: "done", title: "Done" },
];

export default {
  Stepper: {
    base: { steps, current: 1 },
    cases: [
      { current: 0 },
      { current: 3, orientation: "vertical" },
      { steps: steps.map((step, index) => (index === 1 ? { ...step, error: true } : step)), current: 2 },
      { current: undefined, defaultCurrent: 2, $label: "uncontrolled: Passed steps go back" },
      { onStepClick: () => undefined, current: 2, $label: "onStepClick: reached steps are buttons" },
      { "aria-label": "Checkout", class: "wide", "data-testid": "steps" },
      { steps: undefined, current: 1, children: [{ $: "StepperStep", id: "a", title: "Account" }, { $: "StepperStep", id: "b", title: "Team", caption: "2 people" }, { $: "StepperStep", id: "c", title: "Plan", error: true }], $label: "StepperStep children" },
    ],
  },
  StepperItem: {
    base: { index: 2 },
    cases: [{ state: "focused", index: 3 }, { icon: { $: "Icon", name: "icon-check-line" } }, { "data-testid": "marker", id: "dropped" }],
  },
} satisfies ParitySpec;
