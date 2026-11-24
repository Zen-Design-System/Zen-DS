import { defineComponent, h, type Component, type PropType, type VNodeChild } from "vue";
import { externalLabelParts, linkModel, type LinkTone, type LinkUnderline } from "@zen-ds/core";
import "../../_shared/core-icons";
import { restAttrs } from "../../_shared/attrs";
import { useZenLabels } from "../../_shared/context";
import { slotText } from "../../_shared/slots";
import { Icon } from "../Icon/Icon";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden";

export { linkTones, linkUnderlines, type LinkTone, type LinkUnderline } from "@zen-ds/core";

/** The label followed by the external-link glyph; a text label keeps its last word and the glyph on one line. */
function withExternalGlyph(children: VNodeChild): VNodeChild[] {
  const glyph = h("span", { class: "zen-link__external", "aria-hidden": "true" }, h(Icon, { name: "icon-link-external-line", size: "1em", decorative: true }));
  const text = slotText(children);
  if (text === undefined) return [children, glyph];
  const parts = externalLabelParts(text);
  if (!parts) return [text.trimEnd(), glyph];
  return [parts.lead, h("span", { class: "zen-link__keep" }, [parts.last, glyph])];
}

/**
 * An inline link in the Content/Hyperlink colours (React: components/Link). It inherits the font of the text around it,
 * so place it inside a `<Text>`. Links navigate; actions on the page are Buttons.
 *
 *   <Link href="/settings/billing">Billing settings</Link>
 *   <Link href="https://status.zen.design" external>Status page</Link>
 *   <Link :as="RouterLink" to="/projects">All projects</Link>
 */
export const Link = defineComponent({
  name: "Link",
  inheritAttrs: false,
  props: {
    /** Destination URL. Required unless `as` renders a router link that takes its own destination prop (e.g. `to`). */
    href: { type: String },
    /** Opens in a new tab, with a trailing external-link icon and a visually hidden "(opens in a new tab)". */
    external: { type: Boolean, default: false },
    /** When the underline shows: hover (default), always (inside running text), none. Always with tone="inherit". */
    underline: { type: String as PropType<LinkUnderline> },
    /** hyperlink (default) or inherit (the surrounding text colour). */
    tone: { type: String as PropType<LinkTone>, default: "hyperlink" },
    /** Show the Visited colour once the destination has been visited (hyperlink tone only). */
    visited: { type: Boolean, default: false },
    /** Element or router component rendered instead of `<a>` (`:as="RouterLink" to="/settings"`). */
    as: { type: [String, Object, Function] as PropType<string | Component>, default: "a" },
  },
  setup(props, { attrs, slots }) {
    const labels = useZenLabels();
    return () => {
      const children = slots.default?.();
      const content = props.external ? [...withExternalGlyph(children), h(VisuallyHidden, null, () => ` ${labels.value.opensInNewTab}`)] : children;
      const root = {
        ...restAttrs(attrs),
        href: props.href,
        ...linkModel({ external: props.external, tone: props.tone, underline: props.underline, visited: props.visited, target: attrs.target as string | undefined, rel: attrs.rel as string | undefined }),
        class: ["zen-link", attrs.class],
        style: attrs.style,
      };
      // A router component takes its content as a slot.
      return typeof props.as === "string" ? h(props.as, root, content) : h(props.as, root, { default: () => content });
    };
  },
});
