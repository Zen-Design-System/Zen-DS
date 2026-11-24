import { typographyStyles } from "../../tokens/typography.generated";
import type { IconName } from "../../icons/generated/names";
// The icons it names draw at once: the core set registers them (npm run icons:check).
import "../Icon/core";

/*
 * Stepper's framework-free part (the web core, src/core): step states, positions, which steps take a press and what a
 * marker draws. React's Stepper and the Vue port both draw from it (tools/code-languages/vue-parity.mjs).
 */

export const stepperStates = ["default", "focused", "passed", "error"] as const;
export type StepperState = (typeof stepperStates)[number];
export type StepperOrientation = "horizontal" | "vertical";

/** A step's state: Error when it failed, else Passed before `current`, Focused at it, Default after it. */
export const stepState = (error: boolean | undefined, index: number, current: number): StepperState =>
  error ? "error" : index < current ? "passed" : index === current ? "focused" : "default";

export const stepPosition = (index: number, count: number) => (index === 0 ? "first" : index === count - 1 ? "last" : "middle");

/**
 * Steps the person has reached take a press when the app listens (onStepClick); a Stepper that keeps its own step
 * (`current` left out) goes back to a Passed one.
 */
export const stepClickable = (state: StepperState, index: number, current: number, { listens, controlled }: { listens: boolean; controlled: boolean }) =>
  listens ? state !== "default" : !controlled && index < current;

/** A marker's glyph: a check when Passed, the error mark on Error, else the step's own icon (none: its number). */
export const stepGlyph = <Icon>(state: StepperState, icon: Icon | undefined): IconName | Icon | undefined =>
  state === "passed" ? "icon-check-solid" : state === "error" ? "icon-info-octagon-solid" : icon;

export const stepNumberClass = (state: StepperState) => typographyStyles[state === "focused" ? "Body/Small/Bold" : "Body/Small/Medium"];
export const stepTitleClass = `zen-stepper__title ${typographyStyles["Body/Base/Bold"]}`;
export const stepCaptionClass = `zen-stepper__caption ${typographyStyles["Caption/Regular"]}`;
