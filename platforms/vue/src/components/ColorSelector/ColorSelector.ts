import { defineComponent, h, nextTick, ref, useId, type PropType } from "vue";
import { colorSelectorLabel, colorSwatchModel, type ColorOption } from "@zen-ds/core";
import "../../_shared/core-icons";
import { dataAttrs } from "../../_shared/attrs";
import { useZenLabels } from "../../_shared/context";
import { Icon } from "../Icon/Icon";

export type { ColorOption } from "@zen-ds/core";

/**
 * Figma Color-Selector (373:97252), React: components/ColorSelector. Round swatches, one radio each; the swatch whose
 * colour is `value` shows the check. Choosing one emits `valueChange` with its value. Takes `class` and `data-*`
 * attributes, as React's.
 */
export const ColorSelector = defineComponent({
  name: "ColorSelector",
  inheritAttrs: false,
  props: {
    colors: { type: Array as PropType<ColorOption[]>, required: true },
    value: { type: String },
    /** Names the group (default "Colour", from the locale's labels). */
    "aria-label": { type: String },
    name: { type: String },
  },
  emits: { valueChange: (value: string) => typeof value === "string" },
  setup(props, { attrs, emit }) {
    const labels = useZenLabels();
    const autoName = useId();
    const root = ref<HTMLDivElement>();
    // Vue camelizes declared prop names: `aria-label` arrives as `ariaLabel`.
    const ariaLabel = () => (props as unknown as { ariaLabel?: string }).ariaLabel;
    // The radios are controlled, as React's: after a choice the checked radio follows `value` again (the new one once
    // the parent takes it, the old one when it does not).
    const syncChecked = () => {
      for (const input of root.value?.querySelectorAll<HTMLInputElement>(".zen-color-swatch > input") ?? []) input.checked = input.value === props.value;
    };
    return () => h("div", {
      ...dataAttrs(attrs),
      ref: root,
      class: ["zen-color-selector", attrs.class],
      role: "radiogroup",
      "aria-label": colorSelectorLabel(labels.value, ariaLabel()),
    }, props.colors.map((color) => {
      const swatch = colorSwatchModel(color, props.value);
      return h("label", { key: color.value, class: "zen-color-swatch", "data-selected": swatch.selected ? "true" : undefined, "data-contrast": swatch.contrast, style: swatch.style, title: color.label }, [
        h("input", {
          type: "radio",
          name: props.name ?? autoName,
          value: color.value,
          checked: swatch.selected,
          "aria-label": color.label,
          onChange: () => {
            emit("valueChange", color.value);
            void nextTick(syncChecked);
          },
        }),
        h("span", { class: "zen-color-swatch__fill", "aria-hidden": "true" }, [swatch.selected ? h(Icon, { name: "icon-check-line", decorative: true }) : null]),
      ]);
    }));
  },
});
