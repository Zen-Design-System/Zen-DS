import { computed, defineComponent, h, ref, useId, watch, type PropType } from "vue";
import { getRegisteredIcon, iconSize, loadIconBucket, resolveContentTone, scopeIconIds, warnUnknownIcon, type ContentTone, type IconName, type IconSize } from "@zen-ds/core";
import { restAttrs } from "../../_shared/attrs";

export { iconNames, iconSizes, preloadIcons, registerIcons, type IconColorMode, type IconDefinition, type IconName, type IconSize } from "@zen-ds/core";

/**
 * Zen icon (React: components/Icon). Icons used by Zen components draw at once; any other name loads its bucket on first
 * use (an empty box of the same size shows until then — `preloadIcons()` avoids it). Without `title` the icon is
 * decorative (aria-hidden).
 */
export const Icon = defineComponent({
  name: "Icon",
  inheritAttrs: false,
  props: {
    /** One of the Zen icon names (`IconName` autocompletes them), e.g. `icon-home-03-line`. */
    name: { type: String as PropType<IconName>, required: true },
    /** A token size (`2xs`…`3xl`, default `base` = 20px) or a px number. */
    size: { type: [String, Number] as PropType<IconSize | number | string>, default: "base" },
    /** Colour: a Color/Content token by its path, as on Text ("light", "positive-base"). Default: the parent's colour. */
    tone: { type: String as PropType<ContentTone> },
    /** Accessible name; without it the icon is decorative (aria-hidden). */
    title: { type: String },
    decorative: { type: Boolean, default: undefined },
  },
  setup(props, { attrs }) {
    // Inline SVGs share one document: clipPath/mask/gradient ids are unique per instance (scopeIconIds).
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    // Bumped when a lazily loaded bucket lands, so the render reads the registry again.
    const loaded = ref(0);
    const missing = ref(false);
    watch(() => props.name, (name) => {
      missing.value = false;
      if (getRegisteredIcon(name) || typeof window === "undefined") return;
      void loadIconBucket(name).then(() => {
        if (name !== props.name) return;
        if (!getRegisteredIcon(name)) { warnUnknownIcon(name); missing.value = true; }
        loaded.value += 1;
      });
    }, { immediate: true });
    const icon = computed(() => (loaded.value, getRegisteredIcon(props.name)));
    const content = computed(() => (icon.value ? scopeIconIds(icon.value.content, uid) : ""));
    return () => {
      if (missing.value) return null;
      const definition = icon.value;
      const decorative = props.decorative ?? !props.title;
      const { name: sizeName, custom } = iconSize(props.size);
      return h("svg", {
        ...restAttrs(attrs),
        class: ["zen-icon", attrs.class],
        "data-color-mode": definition?.colorMode,
        "data-icon": props.name,
        "data-size": sizeName,
        "data-tone": props.tone ? resolveContentTone(props.tone) : undefined,
        "data-loading": definition ? undefined : "true",
        viewBox: definition?.viewBox,
        role: decorative ? undefined : "img",
        "aria-hidden": decorative ? true : undefined,
        "aria-label": !decorative && !props.title ? attrs["aria-label"] : undefined,
        focusable: "false",
        style: [attrs.style, custom ? { width: custom, height: custom } : {}],
      }, [props.title ? h("title", props.title) : null, definition ? h("g", { innerHTML: content.value }) : null]);
    };
  },
});
