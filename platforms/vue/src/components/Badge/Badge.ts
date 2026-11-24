import { defineComponent, h, type PropType, type SlotsType, type VNodeChild } from "vue";
import { badgeModel, badgeRemoveName, badgeSizes, scaleKey, type BadgeBackground, type BadgeSize, type BadgeTheme, type IconName } from "@zen-ds/core";
import "../../_shared/core-icons";
import { restAttrs } from "../../_shared/attrs";
import { useZenLabels } from "../../_shared/context";
import { iconPart } from "../../_shared/icon";
import { slotText } from "../../_shared/slots";
import { useIconTooltip } from "../../_shared/tooltip";
import { Icon } from "../Icon/Icon";

export { badgeSizes, badgeThemes, type BadgeBackground, type BadgeSize, type BadgeTheme } from "@zen-ds/core";

const badgeProps = {
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size: { type: String as PropType<BadgeSize>, default: "md" },
  theme: { type: String as PropType<BadgeTheme>, default: "neutral" },
  background: { type: String as PropType<BadgeBackground>, default: "solid" },
  /** Leading icon by name; the `leading` slot takes any content. Replaces the default dot. */
  leading: { type: String as PropType<IconName> },
  /** Figma Leading-Icon: shows the leading layer (the default dot, or `leading`); false hides it. */
  leadingIcon: { type: Boolean, default: true },
  /** Shows the remove button (icon-x-circle-solid), named "Remove <label>" from a text label. Emits `remove`. */
  remove: { type: Boolean, default: false },
  /** Name of the remove button when the label is not plain text. */
  removeLabel: { type: String },
};

/** Figma Badge (260:4825), React: components/Badge. Size × Theme × Background, a leading dot or icon, an optional remove button. */
export const Badge = defineComponent({
  name: "Badge",
  inheritAttrs: false,
  props: badgeProps,
  emits: { remove: () => true },
  slots: Object as SlotsType<{ default?: () => VNodeChild; leading?: () => VNodeChild }>,
  setup(props, { attrs, slots, emit }) {
    const labels = useZenLabels();
    let removeName = "";
    const removeTip = useIconTooltip(() => (props.remove ? removeName : false));
    return () => {
      const badge = badgeModel(props.size);
      const children = slots.default?.();
      const leading = props.leadingIcon ? iconPart(slots.leading, props.leading) ?? h(Icon, { name: "icon-circle-small-solid", decorative: true }) : null;
      removeName = badgeRemoveName(labels.value, slotText(children), props.removeLabel);
      return h("span", { ...restAttrs(attrs), class: ["zen-badge", attrs.class], style: attrs.style, "data-size": badge.size, "data-tone": props.theme, "data-background": props.background }, [
        leading ? h("span", { class: "zen-badge__leading" }, [leading]) : null,
        h("span", { class: badge.textClass }, [children]),
        props.remove ? h("button", removeTip.bind({ class: "zen-badge__remove", type: "button", "aria-label": removeName, onClick: () => emit("remove") }), [h(Icon, { name: "icon-x-circle-solid", decorative: true }), removeTip.tooltip()]) : null,
      ]);
    };
  },
});

/** A count on a Badge (React: BadgeCounter): no leading dot, size sm by default. */
export const BadgeCounter = defineComponent({
  name: "BadgeCounter",
  inheritAttrs: false,
  props: {
    value: { type: [String, Number] },
    size: { type: String as PropType<BadgeSize>, default: "sm" },
    theme: badgeProps.theme,
    background: badgeProps.background,
    leadingIcon: badgeProps.leadingIcon,
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    return () => {
      const value = props.value;
      return h(Badge, { ...attrs, class: ["zen-badge--counter", attrs.class], theme: props.theme, background: props.background, leadingIcon: false, size: scaleKey(props.size, badgeSizes) }, () =>
        h("span", { "aria-label": value === undefined ? undefined : `${value}` }, [value ?? slots.default?.()]));
    };
  },
});
