import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import type { IconName } from "../Icon";
import { VisuallyHidden } from "../VisuallyHidden";
import { renderIcon } from "../_shared/icon";
import { slotItems } from "../_shared/slots";
import { useZenLabels } from "../_shared/zen-context";
import { stepCaptionClass, stepClickable, stepGlyph, stepNumberClass, stepPosition, stepState, stepTitleClass, type StepperOrientation, type StepperState } from "./model";
import "./stepper.css";
import "../Icon/core";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useControllableState } from "../_shared/use-controllable-state";
import { dataAttributes } from "../_shared/data-attributes";

export { stepperStates, type StepperOrientation, type StepperState } from "./model";

export interface StepperStep {
  id: string;
  /** Figma Step Title (Body/Base/Bold). */
  title: ReactNode;
  /** Figma Caption (Caption/Regular), e.g. "Optional". */
  caption?: ReactNode;
  /** Figma Style=Icon: an icon (name or icon element) replaces the step number. */
  icon?: IconName | ReactElement;
  /** Marks the step as failed (State=Error); otherwise the state follows `current`. */
  error?: boolean;
}

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root `<ol>`. */
export interface StepperProps extends HTMLAttributes<HTMLOListElement> {
  /** The root `<ol>`. */
  ref?: Ref<HTMLOListElement>;
  /** The steps as data. Or give StepperStep children (Figma Stepper-Bar's steps): `<StepperStep id="details" title="Details" />`. */
  steps?: StepperStep[];
  /** The steps as StepperStep elements, in order, when `steps` is not given. Stepper still draws each one's state
   *  from `current`, the progress lines and the click behaviour. */
  children?: ReactNode;
  /** Index of the current step (State=Focused). Earlier steps are Passed, later ones Default. Leave it out and Stepper
   *  keeps the step itself, from `defaultCurrent`: a Passed step can then be pressed to go back to it. */
  current?: number;
  /** Uncontrolled start for `current` (default 0). */
  defaultCurrent?: number;
  /** Figma Stepper-Bar/Horizontal or Stepper-Bar/Vertical. */
  orientation?: StepperOrientation;
  /** Makes Passed/Focused/Error steps clickable (e.g. to go back and edit). Default steps stay inert. */
  onStepClick?: (step: StepperStep, index: number) => void;
  /** Names the list (default "Progress", from the locale's labels). */
  "aria-label"?: string;
  className?: string;
  /** Figma instance overrides: props of the step markers it draws, by layer (`{ "Step[review]": { icon: "icon-check-line" } }`). Written by Zen Studio;
   *  app code sets the steps. */
  overrides?: NestedOverrides;
}

/**
 * One step as a child of Stepper (Figma Stepper-Bar's Step-Horizontal / Step-Vertical): `<StepperStep id title caption />`.
 * It declares the step and renders nothing on its own; Stepper draws it.
 */
export function StepperStep(_step: StepperStep): null {
  return null;
}

/** Figma .Primitives/Stepper/Item (1625:4827): 24px marker — number (Style=Text) or icon (Style=Icon). */
export function StepperItem({ state = "default", index = 1, icon, ref, ...rest }: {
  state?: StepperState;
  index?: number;
  icon?: IconName | ReactElement;
  /** Ref to the marker's root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}) {
  const glyph = stepGlyph(state, icon);
  return (
    <span {...dataAttributes(rest)} ref={ref} className="zen-stepper-item" data-state={state} aria-hidden="true">
      {glyph ? renderIcon(glyph) : <span className={stepNumberClass(state)}>{index}</span>}
    </span>
  );
}

/**
 * Figma Stepper-Bar/Horizontal (1625:8328) and Stepper-Bar/Vertical (1625:8656) built from Step-Horizontal /
 * Step-Vertical: a marker between two 2px progress lines (Neutral/Subtle ahead, Neutral/Solid behind, Negative/Solid
 * on error) with Title + Caption (gap 3XSmall, padding-inline XSmall).
 */
export function Stepper({ ref, steps: stepsProp, children, current: currentProp, defaultCurrent = 0, orientation = "horizontal", onStepClick, "aria-label": ariaLabelProp, className, overrides, ...rest }: StepperProps) {
  const nest = useNested(overrides);
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.progress;
  const [current, setCurrent] = useControllableState({ value: currentProp, defaultValue: defaultCurrent, name: "Stepper current" });
  const steps: StepperStep[] = stepsProp ?? slotItems(children, StepperStep).map(({ slotKey, ...step }, index) => ({ ...step, id: step.id ?? slotKey ?? String(index) }));
  return (
    <ol {...rest} ref={ref} className={["zen-stepper", className].filter(Boolean).join(" ")} data-orientation={orientation} aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const state = stepState(step.error, index, current);
        const position = stepPosition(index, steps.length);
        const clickable = stepClickable(state, index, current, { listens: Boolean(onStepClick), controlled: currentProp !== undefined });
        const body = (
          <>
            <span className="zen-stepper__track">
              <span className="zen-stepper__line" data-part="before" />
              {nest("Step", <StepperItem state={state} index={index + 1} icon={step.icon} />, step.id)}
              <span className="zen-stepper__line" data-part="after" />
            </span>
            <span className="zen-stepper__contents">
              <span className={stepTitleClass}>{step.title}</span>
              {step.caption ? <span className={stepCaptionClass}>{step.caption}</span> : null}
              {state === "error" ? <VisuallyHidden> {t.stepError}</VisuallyHidden> : state === "passed" ? <VisuallyHidden> {t.stepCompleted}</VisuallyHidden> : null}
            </span>
          </>
        );
        return (
          <li key={step.id} className="zen-stepper__step" data-state={state} data-position={position} aria-current={state === "focused" ? "step" : undefined}>
            {clickable
              ? <button type="button" className="zen-stepper__hit" onClick={() => { setCurrent(index); onStepClick?.(step, index); }}>{body}</button>
              : <span className="zen-stepper__hit">{body}</span>}
          </li>
        );
      })}
    </ol>
  );
}
