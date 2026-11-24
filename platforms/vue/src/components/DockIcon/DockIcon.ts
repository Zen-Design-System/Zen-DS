import { defineComponent, h, type PropType, type SlotsType, type VNodeChild } from "vue";
import { dockIconDefaultEmoji, dockIconModel, type DockIconBackground, type DockIconSize, type DockIconTheme, type IconName } from "@zen-ds/core";
import "../../_shared/core-icons";
import { dataAttrs } from "../../_shared/attrs";
import { slotContent } from "../../_shared/slots";
import { Icon } from "../Icon/Icon";

export { dockIconSizes, dockIconSupportColors, dockIconThemes, type DockIconBackground, type DockIconSize, type DockIconTheme } from "@zen-ds/core";

/**
 * Figma Dock-Icon (308:45902), React: components/DockIcon. A round, fully filled icon tile for app, category or file-type
 * marks in lists, tables and cards. Theme=Emoji shows `emoji` (or the `emoji` slot, which wins) instead of the icon.
 * Takes `class` and `data-*` attributes, as React's.
 */
export const DockIcon = defineComponent({
  name: "DockIcon",
  inheritAttrs: false,
  props: {
    /** Figma Icon-Src, by name. */
    icon: { type: String as PropType<IconName>, default: "icon-star-93-solid" },
    /** Theme=Emoji: the emoji (or any glyph) shown instead of an icon; the `emoji` slot takes any content. */
    emoji: { type: String },
    /** XSmall 24 · Small 32 · Medium 40 · Large 48 · XLarge 56 · 2XLarge 80. Short (sm, md…) or Figma (small, medium…) spelling. */
    size: { type: String as PropType<DockIconSize>, default: "md" },
    theme: { type: String as PropType<DockIconTheme>, default: "neutral" },
    /** Solid (default) or Subtle; Pale is always subtle, Inverse / On-Color / Surface / Emoji always solid. */
    background: { type: String as PropType<DockIconBackground>, default: "solid" },
    /** Accessible name when the icon carries meaning on its own; omit when a text label sits next to it. */
    label: { type: String },
  },
  slots: Object as SlotsType<{ emoji?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    return () => {
      const dock = dockIconModel(props);
      const glyph = props.theme === "emoji"
        ? h("span", { class: "zen-dock-icon__emoji" }, [slotContent(slots.emoji) ?? props.emoji ?? dockIconDefaultEmoji])
        : h(Icon, { name: props.icon, decorative: true });
      return h("span", {
        ...dataAttrs(attrs),
        class: ["zen-dock-icon", attrs.class],
        "data-size": dock.size,
        "data-tone": props.theme,
        "data-background": dock.background,
        role: dock.role,
        "aria-label": props.label,
        "aria-hidden": dock.ariaHidden,
      }, [glyph]);
    };
  },
});
