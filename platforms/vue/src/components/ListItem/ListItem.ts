import { defineComponent, h, type PropType, type SlotsType, type VNodeArrayChildren, type VNodeChild } from "vue";
import {
  layoutSizing,
  listBoxModel,
  listInset,
  listItemCaptionClass,
  listItemTitleClass,
  listItemValueCaptionClass,
  listItemValueClass,
  listItemValueStyle,
  withSizingVars,
  type ContentTone,
  type IconName,
  type LayoutSpan,
  type ListBoxColor,
  type ListBoxSurface,
  type ListBoxTheme,
  type ListInset,
  type Responsive,
} from "@zen-ds/core";
import { restAttrs } from "../../_shared/attrs";
import { iconPart } from "../../_shared/icon";
import { hasContent, slotContent } from "../../_shared/slots";
import { useGridCell } from "../Layout/Layout";
import { layoutSizingProps } from "../Layout/sizing-props";

export { listBoxColors, listBoxSurfaces, listBoxThemes, type ListBoxColor, type ListBoxSurface, type ListBoxTheme, type ListInset } from "@zen-ds/core";

/** A slot's content, else the prop's value: React's `ReactNode` props are both in Vue. */
const contentOf = (slot: (() => VNodeChild) | undefined, value: VNodeChild): VNodeChild => slotContent(slot) ?? value;
const given = (value: VNodeChild) => value !== undefined && value !== null && value !== false && value !== "" && hasContent(value);

/** A plain list of List-Items (ul, no bullets), React: List. The container insets it sideways (ListBox does). */
export const List = defineComponent({
  name: "List",
  inheritAttrs: false,
  props: {
    /** @deprecated Rows keep Figma's spacing; this still gives them a horizontal padding for existing apps. */
    inset: { type: String as PropType<ListInset>, default: "auto" },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    return () => h("ul", { ...restAttrs(attrs), class: ["zen-list", attrs.class], style: attrs.style, "data-inset": listInset(props.inset) }, [slots.default?.()]);
  },
});

/**
 * Figma List-Item (4080:11700), React: ListItem. Leading · Contents (title over caption) · Value · Trailing. With
 * `@click` or `href` the row is one action (Interactive=Yes). `title`, `caption`, `value` and `value-caption` take text or
 * a slot of the same name; `leading` an icon name or a slot (a Dock Icon, an Avatar); `trailing` is a slot. The default
 * slot replaces the title/caption stack.
 */
export const ListItem = defineComponent({
  name: "ListItem",
  inheritAttrs: false,
  props: {
    title: { type: [String, Number] },
    /** Lines the title may take before it truncates: 1 (Figma's one line) or 2. */
    titleLines: { type: Number as PropType<1 | 2>, default: 1 },
    caption: { type: [String, Number] },
    leading: { type: String as PropType<IconName> },
    /** A value at the row's end, read with the title ("+94,860,000 VND"). */
    value: { type: [String, Number] },
    /** The line under `value`. */
    valueCaption: { type: [String, Number] },
    /** Colour of `value`, a Color/Content tone ("negative-light"). */
    valueTone: { type: String as PropType<ContentTone>, default: "strongest" },
    /** Figma State=Selected; interactive rows only. */
    selected: { type: Boolean, default: false },
    /** `@click`: the row is one action. */
    onClick: { type: Function as PropType<(event: MouseEvent) => void> },
    /** Renders the row as a link. */
    href: { type: String },
    /** "li" (default, inside <List>) or "div" on its own. */
    as: { type: String as PropType<"li" | "div">, default: "li" },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild; title?: () => VNodeChild; caption?: () => VNodeChild; leading?: () => VNodeChild; value?: () => VNodeChild; valueCaption?: () => VNodeChild; trailing?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    return () => {
      const leading = iconPart(slots.leading, props.leading);
      const caption = contentOf(slots.caption, props.caption);
      const value = contentOf(slots.value, props.value);
      const valueCaption = contentOf(slots.valueCaption, props.valueCaption);
      const trailing = slotContent(slots.trailing);
      const custom = slotContent(slots.default);
      const hasValue = value !== undefined && value !== null;
      const hasValueCaption = valueCaption !== undefined && valueCaption !== null;
      const body: VNodeArrayChildren = [
        given(leading) ? h("span", { class: "zen-list-item__leading" }, [leading]) : null,
        h("span", { class: "zen-list-item__contents" }, custom ? [custom] : [
          h("span", { class: listItemTitleClass }, [contentOf(slots.title, props.title)]),
          given(caption) ? h("span", { class: listItemCaptionClass }, [caption]) : null,
        ]),
        hasValue || hasValueCaption ? h("span", { class: "zen-list-item__value" }, [
          hasValue ? h("span", { class: listItemValueClass, style: listItemValueStyle(props.valueTone) }, [value]) : null,
          hasValueCaption ? h("span", { class: listItemValueCaptionClass }, [valueCaption]) : null,
        ]) : null,
      ];
      const interactive = Boolean(props.onClick || props.href);
      const current = props.selected ? "true" : undefined;
      return h(props.as, {
        ...restAttrs(attrs),
        class: ["zen-list-item", attrs.class],
        style: attrs.style,
        "data-selected": props.selected ? "true" : undefined,
        "data-interactive": interactive ? "true" : undefined,
        "data-title-lines": props.titleLines === 2 ? "2" : undefined,
      }, [
        props.href
          ? h("a", { class: "zen-list-item__wrapper", href: props.href, onClick: props.onClick, "aria-current": current }, body)
          : props.onClick
            // aria-current, like the link row: the selected row is the current item, not a pressed toggle.
            ? h("button", { type: "button", class: "zen-list-item__wrapper", onClick: props.onClick, "aria-current": current }, body)
            : h("span", { class: "zen-list-item__wrapper" }, body),
        trailing ? h("span", { class: "zen-list-item__trailing" }, [trailing]) : null,
      ]);
    };
  },
});

/**
 * Figma Component/List-Box (14922:75297), React: ListBox. The box that holds a list of rows: `header` and `footer` slots
 * around the body (the default slot, usually a <List>). `theme`, `color` and `surface` are Figma's Theme, Color and
 * Surface; it sizes and spans like a Stack.
 */
export const ListBox = defineComponent({
  name: "ListBox",
  inheritAttrs: false,
  props: {
    theme: { type: String as PropType<ListBoxTheme>, default: "default" },
    color: { type: String as PropType<ListBoxColor>, default: "neutral" },
    surface: { type: String as PropType<ListBoxSurface>, default: "default" },
    /** "div" (default) or "section" when the box is a titled region (give it aria-labelledby). */
    as: { type: String as PropType<"div" | "section">, default: "div" },
    width: layoutSizingProps.width,
    minWidth: layoutSizingProps.minWidth,
    maxWidth: layoutSizingProps.maxWidth,
    alignSelf: layoutSizingProps.alignSelf,
    /** Columns of its Grid (a count, or "full"). */
    span: { type: [Number, String, Object] as PropType<Responsive<LayoutSpan>> },
    /** Rows of its Grid. */
    rowSpan: { type: [Number, Object] as PropType<Responsive<number>> },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild; header?: () => VNodeChild; footer?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const cell = useGridCell(props);
    return () => {
      const sizing = layoutSizing({ width: props.width, minWidth: props.minWidth, maxWidth: props.maxWidth, alignSelf: props.alignSelf });
      const header = slotContent(slots.header);
      const footer = slotContent(slots.footer);
      return h(props.as, {
        ...restAttrs(attrs),
        ...sizing.attributes,
        ...cell.value.attributes,
        style: withSizingVars(attrs.style as Record<string, unknown> | undefined, { ...sizing.vars, ...cell.value.vars }),
        ...listBoxModel(props.theme, props.color, props.surface),
        class: ["zen-list-box", attrs.class],
      }, [
        header ? h("div", { class: "zen-list-box__header" }, [header]) : null,
        h("div", { class: "zen-list-box__body" }, [slots.default?.()]),
        footer ? h("div", { class: "zen-list-box__footer" }, [footer]) : null,
      ]);
    };
  },
});
