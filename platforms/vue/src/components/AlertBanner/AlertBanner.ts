import { defineComponent, h, type PropType, type SlotsType, type VNodeChild } from "vue";
import { alertBannerActionButton, alertBannerModel, type AlertBannerSize, type AlertBannerTheme, type IconName } from "@zen-ds/core";
import "../../_shared/core-icons";
import { dataAttrs } from "../../_shared/attrs";
import { useZenLabels } from "../../_shared/context";
import { iconPart } from "../../_shared/icon";
import { useIconTooltip } from "../../_shared/tooltip";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";

export { alertBannerSizes, alertBannerThemes, type AlertBannerSize, type AlertBannerTheme } from "@zen-ds/core";

/**
 * Figma Alert-Banner (6828:9393), React: components/AlertBanner. A full-width Solid strip for page-level messages:
 * Medium 56px · Small 32px, five themes, an optional action (Medium only) and a close control. Only `data-*` attributes
 * reach the root, as in React.
 *
 *   <AlertBanner theme="warning" :action="{ label: 'Upgrade', onClick: upgrade }" @close="hide">Your trial ends in 3 days.</AlertBanner>
 */
export const AlertBanner = defineComponent({
  name: "AlertBanner",
  inheritAttrs: false,
  props: {
    theme: { type: String as PropType<AlertBannerTheme> },
    /** Short (sm, md…) or Figma (small, medium…) spelling. */
    size: { type: String as PropType<AlertBannerSize>, default: "md" },
    /** Figma Leading: true shows the theme icon, false hides it, or an icon name; the `leading` slot takes any content. */
    leading: { type: [Boolean, String] as PropType<boolean | IconName | string>, default: true },
    /** Figma Action (Medium only): Button/Overlay Small Inverse. `onClick` is called on click. */
    action: { type: Object as PropType<{ label: VNodeChild; onClick?: () => void }> },
    /**
     * Shows the close control (icon-x-small-line); `@close` sets it. A prop rather than an emit so the control appears and
     * goes with the listener, as in React (Vue does not re-render a child when only an emit listener changes).
     */
    onClose: { type: Function as PropType<() => void> },
    /** Accessible name of the close control. Default: the locale's "Dismiss". */
    closeLabel: { type: String },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild; leading?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const labels = useZenLabels();
    let closeName = "";
    const closeTip = useIconTooltip(() => (props.onClose ? closeName : false));
    return () => {
      const banner = alertBannerModel({ theme: props.theme, size: props.size, closeLabel: props.closeLabel, labels: labels.value });
      closeName = banner.closeLabel;
      const leading = props.leading === false ? null : iconPart(slots.leading, typeof props.leading === "string" ? props.leading : undefined) ?? h(Icon, { name: banner.icon, decorative: true });
      const action = banner.showsAction ? props.action : undefined;
      return h("div", { ...dataAttrs(attrs), class: ["zen-alert-banner", attrs.class], "data-tone": banner.theme, "data-size": banner.size, role: banner.role }, [
        leading ? h("span", { class: "zen-alert-banner__icon", "aria-hidden": "true" }, [leading]) : null,
        h("span", { class: banner.messageClass }, [slots.default?.()]),
        action ? h(Button, { class: "zen-alert-banner__action", ...alertBannerActionButton, onClick: action.onClick }, () => [action.label]) : null,
        props.onClose
          ? h("button", closeTip.bind({ type: "button", class: "zen-alert-banner__close", "aria-label": banner.closeLabel, onClick: () => props.onClose?.() }), [h(Icon, { name: "icon-x-small-line", decorative: true }), closeTip.tooltip()])
          : null,
      ]);
    };
  },
});
