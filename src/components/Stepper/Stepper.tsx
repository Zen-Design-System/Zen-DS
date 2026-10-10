import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import type { IconName } from "../Icon";
import { VisuallyHidden } from "../VisuallyHidden";
import { renderIcon } from "../_shared/icon";
import { slotItems } from "../_shared/slots";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./stepper.css";
import "../Icon/core";

export const stepperStates = ["default", "focused", "passed", "error"] as const;
export type StepperState = (typeof stepperStates)[number];
export type StepperOrientation = "horizontal" | "vertical";

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
  /** Index of the current step (State=Focused). Earlier steps are Passed, later ones Default. */
  current?: number;
  /** Figma Stepper-Bar/Horizontal or Stepper-Bar/Vertical. */
  orientation?: StepperOrientation;
  /** Makes Passed/Focused/Error steps clickable (e.g. to go back and edit). Default steps stay inert. */
  onStepClick?: (step: StepperStep, index: number) => void;
  /** Names the list (default "Progress", from the locale's labels). */
  "aria-label"?: string;
  className?: string;
}

const stateOf = (step: StepperStep, index: number, current: number): StepperState =>
  step.error ? "error" : index < current ? "passed" : index === current ? "focused" : "default";

/**
 * One step as a child of Stepper (Figma Stepper-Bar's Step-Horizontal / Step-Vertical): `<StepperStep id title caption />`.
 * It declares the step and renders nothing on its own; Stepper draws it.
 */
export function StepperStep(_step: StepperStep): null {
  return null;
}

/** Figma .Primitives/Stepper/Item (1625:4827): 24px marker — number (Style=Text) or icon (Style=Icon). */
export function StepperItem({ state = "default", index = 1, icon }: { state?: StepperState; index?: number; icon?: IconName | ReactElement }) {
  const glyph = state === "passed" ? "icon-check-solid" : state === "error" ? "icon-info-octagon-solid" : icon;
  return (
    <span className="zen-stepper-item" data-state={state} aria-hidden="true">
      {glyph ? renderIcon(glyph) : <span className={typographyStyles[state === "focused" ? "Body/Small/Bold" : "Body/Small/Medium"]}>{index}</span>}
    </span>
  );
}

/**
 * Figma Stepper-Bar/Horizontal (1625:8328) and Stepper-Bar/Vertical (1625:8656) built from Step-Horizontal /
 * Step-Vertical: a marker between two 2px progress lines (Neutral/Subtle ahead, Neutral/Solid behind, Negative/Solid
 * on error) with Title + Caption (gap 3XSmall, padding-inline XSmall).
 */
export function Stepper({ ref, steps: stepsProp, children, current = 0, orientation = "horizontal", onStepClick, "aria-label": ariaLabelProp, className, ...rest }: StepperProps) {
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.progress;
  const steps: StepperStep[] = stepsProp ?? slotItems(children, StepperStep).map(({ slotKey, ...step }, index) => ({ ...step, id: step.id ?? slotKey ?? String(index) }));
  return (
    <ol {...rest} ref={ref} className={["zen-stepper", className].filter(Boolean).join(" ")} data-orientation={orientation} aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const state = stateOf(step, index, current);
        const position = index === 0 ? "first" : index === steps.length - 1 ? "last" : "middle";
        const clickable = Boolean(onStepClick) && state !== "default";
        const body = (
          <>
            <span className="zen-stepper__track">
              <span className="zen-stepper__line" data-part="before" />
              <StepperItem state={state} index={index + 1} icon={step.icon} />
              <span className="zen-stepper__line" data-part="after" />
            </span>
            <span className="zen-stepper__contents">
              <span className={`zen-stepper__title ${typographyStyles["Body/Base/Bold"]}`}>{step.title}</span>
              {step.caption ? <span className={`zen-stepper__caption ${typographyStyles["Caption/Regular"]}`}>{step.caption}</span> : null}
              {state === "error" ? <VisuallyHidden> {t.stepError}</VisuallyHidden> : state === "passed" ? <VisuallyHidden> {t.stepCompleted}</VisuallyHidden> : null}
            </span>
          </>
        );
        return (
          <li key={step.id} className="zen-stepper__step" data-state={state} data-position={position} aria-current={state === "focused" ? "step" : undefined}>
            {clickable
              ? <button type="button" className="zen-stepper__hit" onClick={() => onStepClick?.(step, index)}>{body}</button>
              : <span className="zen-stepper__hit">{body}</span>}
          </li>
        );
      })}
    </ol>
  );
}
