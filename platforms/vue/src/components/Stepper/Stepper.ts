import { defineComponent, h, ref, type PropType, type SlotsType, type VNode, type VNodeArrayChildren, type VNodeChild } from "vue";
import { stepCaptionClass, stepClickable, stepGlyph, stepNumberClass, stepPosition, stepState, stepTitleClass, type IconName, type StepperOrientation, type StepperState } from "@zen-ds/core";
import "../../_shared/core-icons";
import { dataAttrs, restAttrs } from "../../_shared/attrs";
import { useZenLabels } from "../../_shared/context";
import { iconPart } from "../../_shared/icon";
import { slotItems } from "../../_shared/slot-items";
import { slotContent } from "../../_shared/slots";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden";

export { stepperStates, type StepperOrientation, type StepperState } from "@zen-ds/core";

/** A step's title or caption: text, or a vnode. */
type StepContent = string | number | VNode;

/** One step of a Stepper, as data (`steps`) or as a StepperStep child. */
export interface StepperStepData {
  id: string;
  /** Figma Step Title (Body/Base/Bold). */
  title: StepContent;
  /** Figma Caption (Caption/Regular), e.g. "Optional". */
  caption?: StepContent;
  /** Figma Style=Icon: an icon (name or vnode) replaces the step number. */
  icon?: IconName | VNode;
  /** Marks the step as failed (State=Error); otherwise the state follows `current`. */
  error?: boolean;
}

/** One step as a child of Stepper (Figma Stepper-Bar's Step): `<StepperStep id="details" title="Details" />`. It declares
 *  the step and renders nothing on its own; Stepper draws it. */
export const StepperStep = defineComponent({
  name: "StepperStep",
  props: {
    id: { type: String, required: true },
    title: { type: [String, Number, Object] as PropType<StepContent> },
    caption: { type: [String, Number, Object] as PropType<StepContent> },
    /** An icon name, or a vnode. */
    icon: { type: [String, Object] as PropType<string | VNode> },
    error: { type: Boolean, default: undefined },
  },
  setup: () => () => null,
});

/** Figma .Primitives/Stepper/Item (1625:4827), React: StepperItem. A 24px marker: number (Style=Text) or icon (Style=Icon). */
export const StepperItem = defineComponent({
  name: "StepperItem",
  inheritAttrs: false,
  props: {
    state: { type: String as PropType<StepperState>, default: "default" },
    index: { type: Number, default: 1 },
    /** The glyph by name; the `icon` slot takes any content. */
    icon: { type: String as PropType<IconName> },
  },
  slots: Object as SlotsType<{ icon?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    return () => {
      // Passed and Error draw their own mark; otherwise the icon slot, the icon, or the step's number.
      const own = props.state === "passed" || props.state === "error" ? undefined : slotContent(slots.icon);
      const glyph = stepGlyph(props.state, props.icon) as string | undefined;
      const drawn: VNodeChild = own ?? iconPart(undefined, glyph);
      const content: VNodeArrayChildren = [drawn || h("span", { class: stepNumberClass(props.state) }, String(props.index))];
      return h("span", { ...dataAttrs(attrs), class: "zen-stepper-item", "data-state": props.state, "aria-hidden": "true" }, content);
    };
  },
});

/** The steps declared as StepperStep children. */
function stepsOf(nodes: VNodeChild): StepperStepData[] {
  return slotItems<StepperStepData>(nodes, StepperStep).map((item, index) => ({ id: item.id ?? item.slotKey ?? String(index), title: item.title, caption: item.caption, icon: item.icon, error: item.error }));
}

/**
 * Figma Stepper-Bar/Horizontal (1625:8328) and Stepper-Bar/Vertical (1625:8656), React: Stepper. Steps as data (`steps`)
 * or StepperStep children. Leave `current` out and the Stepper keeps the step itself (from `default-current`): a Passed
 * step can then be pressed to go back. With `@step-click`, every reached step takes a press.
 */
export const Stepper = defineComponent({
  name: "Stepper",
  inheritAttrs: false,
  props: {
    /** The steps as data; or StepperStep children. */
    steps: { type: Array as PropType<StepperStepData[]> },
    /** Index of the current step (State=Focused). Earlier steps are Passed, later ones Default. */
    current: { type: Number, default: undefined },
    /** Uncontrolled start for `current`. */
    defaultCurrent: { type: Number, default: 0 },
    orientation: { type: String as PropType<StepperOrientation>, default: "horizontal" },
    /** `@step-click`: a reached step was pressed (Passed/Focused/Error steps become buttons). */
    onStepClick: { type: Function as PropType<(step: StepperStepData, index: number) => void> },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const labels = useZenLabels();
    const own = ref(props.defaultCurrent);
    return () => {
      const t = labels.value;
      const controlled = props.current !== undefined;
      const current = controlled ? (props.current as number) : own.value;
      const steps = (props.steps as StepperStepData[] | undefined) ?? stepsOf(slots.default?.());
      return h("ol", { ...restAttrs(attrs), class: ["zen-stepper", attrs.class], style: attrs.style, "data-orientation": props.orientation, "aria-label": (attrs["aria-label"] as string | undefined) ?? t.progress }, steps.map((step, index) => {
        const state = stepState(step.error, index, current);
        const clickable = stepClickable(state, index, current, { listens: Boolean(props.onStepClick), controlled });
        const body = [
          h("span", { class: "zen-stepper__track" }, [
            h("span", { class: "zen-stepper__line", "data-part": "before" }),
            // An icon given as a vnode goes in the marker's icon slot.
            typeof step.icon === "object" ? h(StepperItem, { state, index: index + 1 }, { icon: () => step.icon }) : h(StepperItem, { state, index: index + 1, icon: step.icon }),
            h("span", { class: "zen-stepper__line", "data-part": "after" }),
          ]),
          h("span", { class: "zen-stepper__contents" }, [
            h("span", { class: stepTitleClass }, [step.title]),
            step.caption ? h("span", { class: stepCaptionClass }, [step.caption]) : null,
            state === "error" ? h(VisuallyHidden, null, () => ` ${t.stepError}`) : state === "passed" ? h(VisuallyHidden, null, () => ` ${t.stepCompleted}`) : null,
          ]),
        ];
        const press = () => { if (!controlled) own.value = index; props.onStepClick?.(step, index); };
        return h("li", { key: step.id, class: "zen-stepper__step", "data-state": state, "data-position": stepPosition(index, steps.length), "aria-current": state === "focused" ? "step" : undefined }, [
          clickable ? h("button", { type: "button", class: "zen-stepper__hit", onClick: press }, body) : h("span", { class: "zen-stepper__hit" }, body),
        ]);
      }));
    };
  },
});
