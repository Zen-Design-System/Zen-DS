import { defineComponent, h, type PropType, type SlotsType, type VNodeChild } from "vue";
import { inlineMessageActionButton, inlineMessageCaptionClass, inlineMessageModel, inlineMessageTitleClass, type IconName, type InlineMessageTheme } from "@zen-ds/core";
import "../../_shared/core-icons";
import { dataAttrs } from "../../_shared/attrs";
import { useZenLabels } from "../../_shared/context";
import { iconPart } from "../../_shared/icon";
import { slotContent } from "../../_shared/slots";
import { useIconTooltip } from "../../_shared/tooltip";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";

export { inlineMessageThemes, type InlineMessageTheme } from "@zen-ds/core";

/**
 * Figma Inline-Message (595:54857), React: components/InlineMessage. A Subtle-surface message inside the content it
 * describes: an icon, a title, a caption (the default slot), one action and a close control. Only `data-*` attributes
 * reach the root, as in React.
 *
 *   <InlineMessage theme="warning" title="Storage almost full" @close="hide">Archive old files or upgrade.</InlineMessage>
 */
export const InlineMessage = defineComponent({
  name: "InlineMessage",
  inheritAttrs: false,
  props: {
    theme: { type: String as PropType<InlineMessageTheme> },
    /** Figma Title (Body/Base/Bold); the `title` slot takes any content. */
    title: { type: String },
    /** false hides the icon; an icon name replaces it, the `icon` slot takes any content. Custom: a 36px image placeholder. */
    icon: { type: [Boolean, String] as PropType<boolean | IconName | string>, default: true },
    /** Figma Action: one Button/Main Small Tertiary under the text. `onClick` is called on click. */
    action: { type: Object as PropType<{ label: VNodeChild; onClick?: () => void }> },
    /**
     * Shows the close control (icon-x-small-line); `@close` sets it. A prop rather than an emit so the control appears and
     * goes with the listener, as in React (Vue does not re-render a child when only an emit listener changes).
     */
    onClose: { type: Function as PropType<() => void> },
    /** Accessible name of the close control. Default: the locale's "Dismiss". */
    closeLabel: { type: String },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild; title?: () => VNodeChild; icon?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const labels = useZenLabels();
    let closeName = "";
    const closeTip = useIconTooltip(() => (props.onClose ? closeName : false));
    return () => {
      const message = inlineMessageModel({ theme: props.theme, closeLabel: props.closeLabel, labels: labels.value });
      closeName = message.closeLabel;
      const leading = props.icon === false ? null : iconPart(slots.icon, typeof props.icon === "string" ? props.icon : undefined) ?? h(Icon, { name: message.icon, decorative: true });
      const title = slotContent(slots.title) ?? props.title;
      const caption = slotContent(slots.default);
      const action = props.action;
      return h("div", { ...dataAttrs(attrs), class: ["zen-inline-message", attrs.class], "data-tone": message.theme, role: message.role }, [
        h("div", { class: "zen-inline-message__container" }, [
          leading ? h("span", { class: "zen-inline-message__icon", "aria-hidden": "true" }, [leading]) : null,
          h("div", { class: "zen-inline-message__content" }, [
            h("div", { class: "zen-inline-message__text" }, [
              title ? h("span", { class: inlineMessageTitleClass }, [title]) : null,
              caption ? h("span", { class: inlineMessageCaptionClass }, [caption]) : null,
            ]),
            action ? h(Button, { class: "zen-inline-message__action", ...inlineMessageActionButton, onClick: action.onClick }, () => [action.label]) : null,
          ]),
        ]),
        props.onClose
          ? h("button", closeTip.bind({ type: "button", class: "zen-inline-message__close", "aria-label": message.closeLabel, onClick: () => props.onClose?.() }), [h(Icon, { name: "icon-x-small-line", decorative: true }), closeTip.tooltip()])
          : null,
      ]);
    };
  },
});
