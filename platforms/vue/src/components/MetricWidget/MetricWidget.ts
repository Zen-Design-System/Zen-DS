import { defineComponent, h, type PropType, type SlotsType, type VNode, type VNodeArrayChildren, type VNodeChild } from "vue";
import {
  metricCaptionLabelClass,
  metricDockSize,
  metricModel,
  metricTitleClass,
  metricTrendModel,
  metricTrendSubLabelClass,
  metricTrendText,
  type DockIconBackground,
  type DockIconTheme,
  type IconName,
  type MetricSize,
  type MetricTrendContent,
  type MetricTrendDirection,
} from "@zen-ds/core";
import "../../_shared/core-icons";
import { dataAttrs } from "../../_shared/attrs";
import { useCardContent } from "../../_shared/card-content";
import { useZenLabels } from "../../_shared/context";
import { iconPart } from "../../_shared/icon";
import { hasContent, slotContent, slotText } from "../../_shared/slots";
import { Badge } from "../Badge/Badge";
import { DockIcon } from "../DockIcon/DockIcon";
import { Icon } from "../Icon/Icon";

export { metricSizes, type MetricSize, type MetricTrendContent, type MetricTrendDirection } from "@zen-ds/core";

/** Text or a vnode: what a trend's label and Sub-Label hold. */
type MetricText = string | number | VNode;

/** A Metric's trend: the change in the badge ("9%") and what it is measured against beside it ("vs. August"). */
export interface MetricTrendValue {
  direction: MetricTrendDirection;
  label: MetricText;
  subLabel?: MetricText;
}

/** A slot's content, else the prop's value: React's `ReactNode` props are both in Vue. */
const contentOf = (slot: (() => VNodeChild) | undefined, value: VNodeChild): VNodeChild => slotContent(slot) ?? value;
const shown = (value: VNodeChild) => value !== undefined && value !== null && value !== false && hasContent(value);

/**
 * Figma .Primitives/Metrics/Metric-Trend (595:55134), React: MetricTrend. A Small Badge holding the change, then the
 * Sub-Label; inside a Solid card it follows the card unless `content` is set. Without a `sub-label`, a text label that
 * starts with a figure is split ("+9% vs. August" → 9% · vs. August).
 */
export const MetricTrend = defineComponent({
  name: "MetricTrend",
  inheritAttrs: false,
  props: {
    trend: { type: String as PropType<MetricTrendDirection>, default: "normal" },
    /** Figma Content (Default · Inverse · On-Color). Default: the enclosing Solid card's family, else Default. */
    content: { type: String as PropType<MetricTrendContent> },
    /** What the change is measured against ("vs. last year"); the `subLabel` slot takes any content. */
    subLabel: { type: [String, Number] },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild; subLabel?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const labels = useZenLabels();
    const card = useCardContent();
    return () => {
      const look = metricTrendModel(props.trend, props.content, card());
      const children = slots.default?.();
      const text = slotText(children);
      const sub = contentOf(slots.subLabel, props.subLabel);
      const { figure, words, signed } = metricTrendText<VNodeChild>(props.trend, text ?? children, shown(sub) ? sub : undefined, text);
      // The arrow carries the sign the badge leaves out, so it is named then; a signed figure says it in its text.
      const arrow = look.icon ? h(Icon, signed ? { name: look.icon, decorative: true } : { name: look.icon, decorative: false, "aria-label": props.trend === "positive" ? labels.value.increase : labels.value.decrease }) : undefined;
      const data = dataAttrs(attrs);
      const badge = h(Badge, { ...(words ? {} : data), size: "small", theme: look.theme, background: look.background, leadingIcon: Boolean(look.icon) }, { default: () => [figure], ...(arrow ? { leading: () => arrow } : {}) });
      if (!words) return badge;
      return h("span", { ...data, class: "zen-metric-trend", "data-content": look.dataContent }, [badge, h("span", { class: metricTrendSubLabelClass }, [words])]);
    };
  },
});

/** A trend as MetricTrend draws it. */
const trendOf = (trend: MetricTrendValue) => h(MetricTrend, { trend: trend.direction, ...(typeof trend.subLabel === "object" ? {} : { subLabel: trend.subLabel }) }, {
  default: () => [trend.label],
  ...(typeof trend.subLabel === "object" ? { subLabel: () => [trend.subLabel as VNode] } : {}),
});

/**
 * Figma Primitives/Metric/Metric-Inline (React: Metric): Icon-Highlight (Dock-Icon + label over number, then the trend)
 * or Title-Highlight (title row, number and trend, Dock-Icon in the corner). `label`, `value`, `counter` and `icon-emoji`
 * take text or a slot of the same name; `action` and `custom` are slots.
 */
export const Metric = defineComponent({
  name: "Metric",
  inheritAttrs: false,
  props: {
    /** Figma Metric-Title. */
    label: { type: [String, Number] },
    /** Figma Metric-Number, already formatted ("$1,680.68"). */
    value: { type: [String, Number] },
    /** Figma Trend → Metric-Trend: `{ direction, label, subLabel }`. */
    trend: { type: Object as PropType<MetricTrendValue> },
    /** Figma Dock-Icon; false hides it. */
    icon: { type: [String, Boolean] as PropType<IconName | false>, default: "icon-home-02-solid" },
    iconTheme: { type: String as PropType<DockIconTheme>, default: "neutral" },
    iconBackground: { type: String as PropType<DockIconBackground>, default: "subtle" },
    /** Dock-Icon Theme=Emoji: an emoji instead of an icon. */
    iconEmoji: { type: String },
    size: { type: String as PropType<MetricSize>, default: "xl" },
    variant: { type: String as PropType<"icon-highlight" | "title-highlight">, default: "icon-highlight" },
    /** Dock-Icon size: Medium 40 or Large 48 (Title-Highlight). */
    iconSize: { type: String as PropType<"md" | "lg" | "medium" | "large"> },
    /** Figma Metric-Color: a dot before the label; a string is the series colour. */
    metricColor: { type: [Boolean, String], default: false },
    /** Icon-Highlight: Figma Counter, a Small Neutral Subtle Badge after the label. */
    counter: { type: [String, Number] },
    /** Title-Highlight: an icon before the title (by name; the `labelIcon` slot takes any content). */
    labelIcon: { type: String as PropType<IconName> },
  },
  slots: Object as SlotsType<{ label?: () => VNodeChild; value?: () => VNodeChild; iconEmoji?: () => VNodeChild; counter?: () => VNodeChild; labelIcon?: () => VNodeChild; action?: () => VNodeChild; custom?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    return () => {
      const { size, stacked, titled, labelClass, valueClass } = metricModel(props.size);
      const label = contentOf(slots.label, props.label);
      const value = contentOf(slots.value, props.value);
      const emoji = contentOf(slots.iconEmoji, props.iconEmoji);
      const color = props.metricColor;
      const dot = color ? h("span", { class: "zen-metric__color", "aria-hidden": "true", style: typeof color === "string" ? { background: color } : undefined }) : null;
      const trend = props.trend ? trendOf(props.trend) : null;
      const dock = (extra: Record<string, unknown>, dockSize: "large" | "medium") => (shown(emoji)
        ? h(DockIcon, { ...extra, theme: "emoji", background: props.iconBackground, size: dockSize }, { emoji: () => [emoji] })
        : props.icon ? h(DockIcon, { ...extra, icon: props.icon, theme: props.iconTheme, background: props.iconBackground, size: dockSize }) : null);
      const root = { ...dataAttrs(attrs), class: ["zen-metric", attrs.class], "data-size": size };
      if (props.variant === "title-highlight") {
        const dockSize = metricDockSize(props.iconSize, stacked);
        const mark = dock({ class: "zen-metric__icon" }, dockSize);
        const labelIcon = iconPart(slots.labelIcon, props.labelIcon, { size: "md" });
        const action = slotContent(slots.action);
        const custom = slotContent(slots.custom);
        const body: VNodeArrayChildren = [
          h("div", { class: "zen-metric__contents" }, [
            titled ? h("div", { class: "zen-metric__header" }, [
              h("span", { class: "zen-metric__title-row" }, [
                h("span", { class: "zen-metric__title-label" }, [
                  labelIcon ? h("span", { class: "zen-metric__label-icon" }, [labelIcon]) : null,
                  h("span", { class: metricTitleClass }, [label]),
                ]),
              ]),
              action,
            ]) : null,
            h("div", { class: "zen-metric__content" }, [
              titled ? null : h("span", { class: "zen-metric__label-row" }, [dot, h("span", { class: metricCaptionLabelClass }, [label])]),
              h("span", { class: valueClass }, [value]),
              trend,
            ]),
          ]),
          mark,
        ];
        return h("div", { ...root, "data-variant": "title-highlight", "data-icon": mark ? dockSize : undefined, "data-custom": custom ? "true" : undefined },
          custom ? [h("div", { class: "zen-metric__body" }, body), h("div", { class: "zen-metric__custom" }, [custom])] : body);
      }
      const counter = contentOf(slots.counter, props.counter);
      return h("div", { ...root, "data-layout": stacked ? "stacked" : "inline" }, [
        dock({}, stacked ? "large" : "medium"),
        h("div", { class: "zen-metric__contents" }, [
          h("div", { class: "zen-metric__content" }, [
            h("span", { class: "zen-metric__label-row" }, [
              dot,
              h("span", { class: labelClass }, [label]),
              shown(counter) ? h(Badge, { class: "zen-metric__counter", size: "small", theme: "neutral", background: "subtle" }, () => [counter]) : null,
            ]),
            h("span", { class: valueClass }, [value]),
          ]),
          trend,
        ]),
      ]);
    };
  },
});
