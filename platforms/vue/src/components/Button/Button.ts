import { defineComponent, h, type PropType, type SlotsType, type VNodeChild } from "vue";
import { buttonModel, iconButtonModel, type ButtonAppearance, type ButtonLevel, type ButtonSize, type ButtonState, type IconName } from "@zen-ds/core";
import { boolAttr, restAttrs } from "../../_shared/attrs";
import { iconPart } from "../../_shared/icon";
import { useIconTooltip } from "../../_shared/tooltip";

export {
  buttonAppearances,
  buttonFlatLevels,
  buttonIconFlatLevels,
  buttonIconMainLevels,
  buttonLevels,
  buttonMainLevels,
  buttonOverlayLevels,
  buttonSizes,
  buttonStates,
  type ButtonAppearance,
  type ButtonLevel,
  type ButtonSize,
  type ButtonState,
} from "@zen-ds/core";

const shared = {
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size: { type: String as PropType<ButtonSize>, default: "md" },
  /** Figma component set: Main, Flat or Overlay. */
  appearance: { type: String as PropType<ButtonAppearance>, default: "main" },
  /** Optional deterministic state for component matrices; native interaction states still work. */
  state: { type: String as PropType<ButtonState> },
  type: { type: String as PropType<"button" | "submit" | "reset">, default: "button" },
};

/**
 * Figma Button/Main (React: components/Button). `disabled`, `aria-*`, `data-*` and listeners (`@click`) go to the
 * `<button>`. Icons by name (`start-icon="icon-plus-line"`) or in the `startIcon` / `endIcon` slots.
 */
export const Button = defineComponent({
  name: "Button",
  inheritAttrs: false,
  props: {
    level: { type: String as PropType<ButtonLevel> },
    /** Leading icon by name; the `startIcon` slot takes any content. */
    startIcon: { type: String as PropType<IconName> },
    /** Trailing icon by name; the `endIcon` slot takes any content. */
    endIcon: { type: String as PropType<IconName> },
    ...shared,
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild; startIcon?: () => VNodeChild; endIcon?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    return () => {
      const button = buttonModel({ level: props.level, size: props.size, state: props.state, disabled: boolAttr(attrs.disabled) });
      const start = iconPart(slots.startIcon, props.startIcon);
      const end = iconPart(slots.endIcon, props.endIcon);
      return h("button", {
        ...restAttrs(attrs),
        type: props.type,
        disabled: button.disabled,
        class: ["zen-button", attrs.class],
        style: attrs.style,
        "data-size": button.size,
        "data-appearance": props.appearance,
        "data-level": button.level,
        "data-variant": button.level,
        "data-state": button.state,
      }, [
        start ? h("span", { class: "zen-button__icon", "aria-hidden": "true" }, [start]) : null,
        h("span", { class: button.labelClass }, [slots.default?.()]),
        end ? h("span", { class: "zen-button__icon", "aria-hidden": "true" }, [end]) : null,
      ]);
    };
  },
});

/**
 * Figma Button/Icon-Main (React: IconButton): a square, icon-only action. Name it with `aria-label`; it shows that name
 * as a tooltip after 1s of hover (at once on keyboard focus) — `tooltip` gives a longer hint, `:tooltip="false"` turns it
 * off only when a visible label already sits beside it.
 */
export const IconButton = defineComponent({
  name: "IconButton",
  inheritAttrs: false,
  props: {
    /** The glyph by name; the `icon` slot takes any content. */
    icon: { type: String as PropType<IconName> },
    /** Default tertiary (Icon-Main), primary (Icon-Flat, close/dismiss), accent (Icon-Overlay). */
    level: { type: String as PropType<ButtonLevel> },
    /** The tooltip's text (default: aria-label), or false. The `tooltip` slot takes any content. */
    tooltip: { type: [String, Boolean] as PropType<string | false>, default: undefined },
    ...shared,
  },
  slots: Object as SlotsType<{ icon?: () => VNodeChild; tooltip?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const tip = useIconTooltip(() => (slots.tooltip ? slots.tooltip() : props.tooltip === undefined ? (attrs["aria-label"] as string | undefined) : props.tooltip));
    return () => {
      const button = iconButtonModel({ level: props.level, size: props.size, state: props.state, appearance: props.appearance, disabled: boolAttr(attrs.disabled) });
      return [
        h("button", tip.bind({
          ...restAttrs(attrs),
          type: props.type,
          disabled: button.disabled,
          class: ["zen-button", "zen-button--icon-only", attrs.class],
          style: attrs.style,
          "data-size": button.size,
          "data-appearance": props.appearance,
          "data-level": button.level,
          "data-variant": button.level,
          "data-state": button.state,
          "aria-label": attrs["aria-label"],
        }), h("span", { class: "zen-button__icon", "aria-hidden": "true" }, [iconPart(slots.icon, props.icon)])),
        tip.tooltip(),
      ];
    };
  },
});
