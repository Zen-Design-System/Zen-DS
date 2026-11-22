import { Fragment, Text as TextNode, defineComponent, h, isVNode, type PropType, type SlotsType, type VNodeChild } from "vue";
import { hasLineBreak, headingModel, textModel, textRunModel, type ContentTone, type HeadingLevel, type TextAlign, type TextElement, type TextVerticalAlign, type TypographyStyleName } from "@zen-ds/core";
import { restAttrs } from "../../_shared/attrs";
import { layoutSizingProps } from "../Layout/sizing-props";

export { headingLevels, plural, textElements, textTones, type HeadingLevel, type TextAlign, type TextElement, type TextTone, type TextVerticalAlign } from "@zen-ds/core";

/** What Text and Heading share (React: TextProps and HeadingProps beside their own). */
const textProps = {
  ...layoutSizingProps,
  /** Colour role: a Color/Content token by its path ("base", "support-blue-light"). Caption styles take a Light tone. */
  tone: { type: String as PropType<ContentTone>, default: "strongest" },
  /** true: one line with an ellipsis; a number: clamp to that many lines. The full text stays in the DOM. */
  truncate: { type: [Boolean, Number], default: undefined },
  /** Text alignment (Figma Alignment): start · center · end · justify. Unset keeps the parent's. */
  align: { type: String as PropType<TextAlign> },
  /** Vertical alignment inside a Fixed or Fill height (Figma Align top / middle / bottom). */
  verticalAlign: { type: String as PropType<TextVerticalAlign> },
  /** `false`: one line that never wraps (Figma text Auto width). */
  wrap: { type: Boolean, default: true },
  /** Figma Number: Tabular, digits of one width. */
  tabularNumbers: { type: Boolean, default: false },
};

const defaultSlot = Object as SlotsType<{ default?: () => VNodeChild }>;

/** The text of the content's text nodes, in order (React: Children.toArray's strings); arrays and fragments flattened. */
function textParts(nodes: VNodeChild): unknown[] {
  if (Array.isArray(nodes)) return nodes.flatMap(textParts);
  if (isVNode(nodes) && nodes.type === TextNode) return [String(nodes.children ?? "")];
  if (isVNode(nodes) && nodes.type === Fragment) return textParts(nodes.children as VNodeChild);
  return [nodes];
}

/**
 * Figma text styles with Zen's content colours (React: Text). Paragraphs, labels and inline copy; titles use Heading.
 * Meta in Body/Small takes tone "base"; Caption is always tone "light". Words with a "\n" show as lines.
 *
 *   <Text>Invite people to collaborate on this project.</Text>
 *   <Text text-style="Body/Small/Regular" tone="base">Updated 2 min ago</Text>
 */
export const Text = defineComponent({
  name: "Text",
  inheritAttrs: false,
  props: {
    ...textProps,
    /** Figma text style, e.g. "Body/Base/Regular" (default), "Caption/Regular", "Heading/4". */
    textStyle: { type: String as PropType<TypographyStyleName>, default: "Body/Base/Regular" },
    /** Element to render: p (a block), span inside a line, label for a form label. */
    as: { type: String as PropType<TextElement>, default: "p" },
    /** For `as="label"`: the field's id (written as `for`). */
    htmlFor: { type: String },
  },
  slots: defaultSlot,
  setup(props, { attrs, slots }) {
    return () => {
      const children = slots.default?.();
      const text = textModel(props, hasLineBreak(textParts(children)));
      return h(props.as, {
        ...restAttrs(attrs),
        ...(props.htmlFor === undefined ? {} : { for: props.htmlFor }),
        class: [text.className, attrs.class],
        ...text.attributes,
        style: [text.vars, attrs.style, text.clamp],
      }, [children]);
    };
  },
});

/**
 * A real heading (h1–h6) in a Figma text style (React: Heading). The level follows the page outline; the look follows
 * the ladder (1 Heading/1 · 2 Heading/4 · 3 Heading/Subheading · 4 Body/Extra/Bold · 5–6 Body/Base/Bold) unless
 * `textStyle` sets it (a card title is always Heading/Subheading).
 */
export const Heading = defineComponent({
  name: "Heading",
  inheritAttrs: false,
  props: {
    ...textProps,
    /** Document level (h1–h6), from the page outline. */
    level: { type: Number as PropType<HeadingLevel>, default: 2 },
    /** Visual style; defaults to the level's ladder style. */
    textStyle: { type: String as PropType<TypographyStyleName> },
  },
  slots: defaultSlot,
  setup(props, { attrs, slots }) {
    return () => {
      const heading = headingModel(props);
      return h(heading.tag, { ...restAttrs(attrs), class: [heading.className, attrs.class], ...heading.attributes, style: [heading.vars, attrs.style, heading.clamp] }, [slots.default?.()]);
    };
  },
});

/**
 * Words with a style of their own inside a Text or Heading (React: TextRun; Figma's mixed styles): bold, italic,
 * underlined, struck through, coloured or in another text style. Everything else comes from the text around it.
 *
 *   <Text>Your plan renews on <TextRun bold>Nov 2</TextRun>.</Text>
 */
export const TextRun = defineComponent({
  name: "TextRun",
  inheritAttrs: false,
  props: {
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
    strikethrough: { type: Boolean, default: false },
    /** The words' colour role; unset keeps the Text's. */
    tone: { type: String as PropType<ContentTone> },
    /** Another Figma text style for these words; unset keeps the Text's. */
    textStyle: { type: String as PropType<TypographyStyleName> },
  },
  slots: defaultSlot,
  setup(props, { attrs, slots }) {
    return () => {
      const run = textRunModel(props);
      return h("span", { ...restAttrs(attrs), class: [run.className, attrs.class], style: attrs.style, ...run.attributes }, [slots.default?.()]);
    };
  },
});
