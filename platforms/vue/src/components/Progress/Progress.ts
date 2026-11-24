import { defineComponent, h, useId, type PropType, type SlotsType, type VNodeChild } from "vue";
import { progressBarModel, progressCircleModel, type ProgressBarLayout, type ProgressBarTheme, type ProgressCircleTheme, type ProgressStatusScale } from "@zen-ds/core";
import "../../_shared/core-icons";
import { dataAttrs } from "../../_shared/attrs";
import { useZenLabels } from "../../_shared/context";
import { slotContent, slotText } from "../../_shared/slots";
import { Icon } from "../Icon/Icon";

export {
  progressBarLayouts,
  progressBarThemes,
  progressCircleThemes,
  progressStatus,
  type ProgressBarLayout,
  type ProgressBarTheme,
  type ProgressCircleTheme,
  type ProgressStatusScale,
} from "@zen-ds/core";

/** A label slot's content: its text when it is only text (it then names the bar, as a string label does), else the nodes. */
function slotLabel(slot: (() => VNodeChild) | undefined): VNodeChild | undefined {
  const content = slotContent(slot);
  return content === undefined ? undefined : slotText(content) ?? content;
}

// Vue camelizes declared prop names: `aria-label` arrives as `ariaLabel`.
const ariaLabelOf = (props: object) => (props as { ariaLabel?: string }).ariaLabel;

/**
 * Figma Progress-Bar (1536:260), React: components/Progress. An 8px rounded track with the theme's fill. Inline: the label
 * trails the bar (`label` true shows the rounded percentage). Stacked: a Label · Value row above a full-width bar. Labels
 * as text props or in the `label` / `valueLabel` slots. Takes `class` and `data-*` attributes, as React's.
 */
export const ProgressBar = defineComponent({
  name: "ProgressBar",
  inheritAttrs: false,
  props: {
    /** 0–100. */
    value: { type: Number, required: true },
    theme: { type: String as PropType<ProgressBarTheme>, default: "neutral" },
    /** `inline` (the label trails the bar) · `stacked` (a Label · Value row above a full-width bar). */
    layout: { type: String as PropType<ProgressBarLayout>, default: "inline" },
    /** Inline: trails the bar, and `true` (or a bare `label` attribute) shows the percentage. Stacked: names the bar. */
    label: { type: [Boolean, String, Number] as PropType<boolean | string | number>, default: undefined },
    /** Stacked only: the text at the end of the row, such as "3 of 5 steps". Default: the rounded percentage. */
    valueLabel: { type: [String, Number] },
    /** Accessible name when there is no visible label. */
    "aria-label": { type: String },
    /** Status theme only: `quota` for usage against a limit (high = bad); default `completion`. */
    scale: { type: String as PropType<ProgressStatusScale>, default: "completion" },
  },
  slots: Object as SlotsType<{ label?: () => VNodeChild; valueLabel?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const labels = useZenLabels();
    const labelId = useId();
    return () => {
      const bar = progressBarModel<VNodeChild>({
        value: props.value,
        theme: props.theme,
        layout: props.layout,
        label: slotLabel(slots.label) ?? props.label,
        valueLabel: slotLabel(slots.valueLabel) ?? props.valueLabel,
        ariaLabel: ariaLabelOf(props),
        scale: props.scale,
      }, labels.value);
      const label = bar.shown ? h("span", { id: bar.stacked ? labelId : undefined, class: bar.labelClass }, [bar.text]) : null;
      const track = h("div", {
        class: "zen-progress-bar__track",
        role: "progressbar",
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": bar.now,
        "aria-label": bar.ariaLabel,
        "aria-labelledby": bar.labelledByLabel ? labelId : undefined,
        "aria-valuetext": bar.ariaValueText,
      }, [h("span", { class: "zen-progress-bar__fill", style: { width: `${bar.value}%` }, hidden: bar.value === 0 })]);
      return h("div", { ...dataAttrs(attrs), class: ["zen-progress-bar", attrs.class], "data-layout": props.layout, "data-tone": props.theme, "data-status": bar.status },
        bar.stacked ? [h("div", { class: "zen-progress-bar__header" }, [label, h("span", { class: bar.valueClass }, [bar.end])]), track] : [track, label]);
    };
  },
});

/**
 * Figma Progress-Circle (1531:13954) + Progress-Circle/Icon (6915:62964), React: components/Progress. A 20px ring with a
 * pie from 12 o'clock; 100 is Done (a full disc with a check). `decorative` hides the ring from screen readers when a
 * visible word beside it already says the progress. Takes `class` and `data-*` attributes, as React's.
 */
export const ProgressCircle = defineComponent({
  name: "ProgressCircle",
  inheritAttrs: false,
  props: {
    /** 0–100. 100 renders the Done state with a check. */
    value: { type: Number, required: true },
    theme: { type: String as PropType<ProgressCircleTheme>, default: "accent" },
    /** Text beside the ring; `true` (or a bare `label` attribute) shows the rounded percentage. The `label` slot takes any content. */
    label: { type: [Boolean, String, Number] as PropType<boolean | string | number>, default: undefined },
    "aria-label": { type: String },
    /** The ring only repeats a visible word beside it: hidden from screen readers. Its own `label` text still shows. */
    decorative: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ label?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const labels = useZenLabels();
    return () => {
      const circle = progressCircleModel<VNodeChild>({ value: props.value, label: slotLabel(slots.label) ?? props.label, ariaLabel: ariaLabelOf(props), decorative: props.decorative }, labels.value);
      return h("div", { ...dataAttrs(attrs), class: ["zen-progress-circle", attrs.class], "data-tone": props.theme }, [
        h("span", { class: "zen-progress-circle__icon", "data-done": circle.done ? "true" : "false", style: { "--zen-progress-value": circle.value }, ...circle.ring }, [
          circle.done ? h(Icon, { name: "icon-check-solid", decorative: true }) : null,
        ]),
        circle.shown ? h("span", { class: circle.labelClass }, [circle.text]) : null,
      ]);
    };
  },
});
