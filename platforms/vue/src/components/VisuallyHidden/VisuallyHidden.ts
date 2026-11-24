import { defineComponent, h, type PropType } from "vue";
import { visuallyHiddenClass, type VisuallyHiddenElement } from "@zen-ds/core";
import { restAttrs } from "../../_shared/attrs";

export { visuallyHiddenElements, type VisuallyHiddenElement } from "@zen-ds/core";

/**
 * Content for assistive technology only (React: components/VisuallyHidden): clipped to a 1px box, still read by screen
 * readers and found by in-page search. Use it to name icon-only headers, add context to repeated links, announce status
 * (role="status") and build skip links (`focusable`).
 */
export const VisuallyHidden = defineComponent({
  name: "VisuallyHidden",
  inheritAttrs: false,
  props: {
    /** Element to render. Default span (valid inside buttons, links and table headers). */
    as: { type: String as PropType<VisuallyHiddenElement>, default: "span" },
    /** Shows the content as a Surface pill while it, or a link or button inside it, has focus (skip links). */
    focusable: { type: Boolean, default: false },
    /** With `as="a"`: the link target, e.g. "#main". */
    href: { type: String },
    /** With `as="label"`: the id of the control it labels. */
    htmlFor: { type: String },
  },
  setup(props, { attrs, slots }) {
    return () => h(props.as, {
      ...restAttrs(attrs),
      href: props.href,
      for: props.htmlFor,
      class: [...visuallyHiddenClass(props.focusable), attrs.class],
      style: attrs.style,
      "data-focusable": props.focusable ? "true" : undefined,
    }, slots.default?.());
  },
});
