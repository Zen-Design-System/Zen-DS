import { defineComponent, h, type PropType } from "vue";
import type { DividerColor, DividerOrientation } from "@zen-ds/core";
import { dataAttrs } from "../../_shared/attrs";

export { dividerColors, type DividerColor, type DividerOrientation } from "@zen-ds/core";

/**
 * Figma Divider (460:38361), React: components/Divider. A 1px line: Default (Pale) is the everyday rule; Medium (Subtle)
 * and High (Solid) add emphasis only when the design calls for it. Takes `class` and `data-*` attributes, as React's.
 */
export const Divider = defineComponent({
  name: "Divider",
  inheritAttrs: false,
  props: {
    /** Default → Border/Neutral/Pale · Medium → Subtle · High → Solid. */
    color: { type: String as PropType<DividerColor>, default: "default" },
    orientation: { type: String as PropType<DividerOrientation>, default: "horizontal" },
    /** Dashed line; a Default dashed line steps up to Border/Neutral/Subtle. */
    dashed: { type: Boolean, default: false },
    /** Purely visual: hidden from assistive tech. */
    decorative: { type: Boolean, default: false },
  },
  setup(props, { attrs }) {
    return () => {
      const own = {
        ...dataAttrs(attrs),
        class: ["zen-divider", attrs.class],
        "data-color": props.color,
        "data-orientation": props.orientation,
        "data-dashed": props.dashed ? "true" : undefined,
      };
      if (props.decorative) return h("div", { ...own, "aria-hidden": "true" });
      return props.orientation === "vertical" ? h("div", { ...own, role: "separator", "aria-orientation": "vertical" }) : h("hr", own);
    };
  },
});
