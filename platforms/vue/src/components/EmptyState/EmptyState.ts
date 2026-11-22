import { defineComponent, h, inject, type PropType, type SlotsType, type VNodeChild } from "vue";
import {
  emptyStateActionLevels,
  emptyStateArt,
  emptyStateCaptionClass,
  emptyStateIllustrationClass,
  emptyStateModel,
  type ButtonLevel,
  type EmptyStateHeadingLevel,
  type EmptyStateSize,
  type IconName,
} from "@zen-ds/core";
import "../../_shared/core-icons";
import { dataAttrs, restAttrs } from "../../_shared/attrs";
import { iconPart } from "../../_shared/icon";
import { slotContent } from "../../_shared/slots";
import { Button } from "../Button/Button";
import { emptyStateCardKey } from "./context";

export { emptyStateSizes, type EmptyStateSize } from "@zen-ds/core";

/** A CTA as React takes it: its label, the click callback (a prop value, not an event) and an optional Button level. */
export interface EmptyStateAction {
  label: VNodeChild;
  onClick?: () => void;
  /** Button level; defaults to primary for `primaryAction` and tertiary for `secondaryAction`. */
  level?: ButtonLevel;
}

/**
 * Figma Empty-State/Illustration/Placeholder (16339:69), React: EmptyStateIllustration. A faded grid, a dashed and a solid
 * circle, and an icon: `md` 240 with a 44 icon, `sm` 200. Only `data-*` attributes reach the root.
 */
export const EmptyStateIllustration = defineComponent({
  name: "EmptyStateIllustration",
  inheritAttrs: false,
  props: {
    /** The icon at the centre by name; the `icon` slot takes any content. */
    icon: { type: String as PropType<IconName>, default: "icon-user-circle-line" },
    /** `md` 240 (default) · `sm` 200. */
    size: { type: String as PropType<EmptyStateSize>, default: "md" },
  },
  slots: Object as SlotsType<{ icon?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    return () => h("span", { ...dataAttrs(attrs), class: emptyStateIllustrationClass(props.size), "aria-hidden": "true" }, [
      h("svg", { viewBox: "0 0 240 240", width: "240", height: "240", class: "zen-empty-state__art" }, [
        h("g", { class: "zen-empty-state__grid" }, emptyStateArt.lines.map((line) => h("line", { ...line }))),
        ...emptyStateArt.circles.map(({ className, ...circle }) => h("circle", { key: className, class: className, ...circle })),
      ]),
      h("span", { class: "zen-empty-state__icon" }, [iconPart(slots.icon, props.icon)]),
    ]);
  },
});

/**
 * Figma Empty-State (16339:135), React: components/EmptyState. A 320px centred column: the illustration, then the title,
 * the caption (the default slot) and up to two full-width CTAs. Inside a titled card (ChartCard) the title sits one level
 * below the card title in Body/Extra/Bold and the size defaults to `sm`. Every attribute goes to the root `<section>`.
 *
 *   <EmptyState title="No projects yet" icon="icon-folder-line" :primary-action="{ label: 'Create project', onClick: create }">
 *     Projects you create or join will show up here.
 *   </EmptyState>
 */
export const EmptyState = defineComponent({
  name: "EmptyState",
  inheritAttrs: false,
  props: {
    /** Figma Title (Heading/4 stand-alone; Body/Extra/Bold in a titled card or at level 4 and deeper); the `title` slot takes any content. */
    title: { type: String },
    /** Heading level of the title: one below the nearest heading above. Default 3, or one below the card title in a ChartCard. */
    headingLevel: { type: Number as PropType<EmptyStateHeadingLevel> },
    /** For a Card you title yourself: the title uses Body/Extra/Bold so it never outsizes the card title. */
    compactTitle: { type: Boolean, default: false },
    /** `md` (240, default) fills the page's main content; `sm` (200) one region of a page. Default `sm` in a ChartCard. */
    size: { type: String as PropType<EmptyStateSize> },
    /** true draws the placeholder with `icon`, false hides it (avoid it: use `size="sm"`); the `illustration` slot takes your own art. */
    illustration: { type: Boolean, default: true },
    /** Icon at the centre of the placeholder by name; the `icon` slot takes any content. */
    icon: { type: String as PropType<IconName> },
    /** Figma CTA Primary: Button/Main Medium Primary, full width. */
    primaryAction: { type: Object as PropType<EmptyStateAction> },
    /** Figma CTA Secondary: Button/Main Medium Tertiary, full width. */
    secondaryAction: { type: Object as PropType<EmptyStateAction> },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild; title?: () => VNodeChild; illustration?: () => VNodeChild; icon?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const cardLevel = inject(emptyStateCardKey, undefined);
    const cta = (action: EmptyStateAction, level: ButtonLevel) => h(Button, { appearance: "main", level: action.level ?? level, size: "md", onClick: action.onClick }, () => [action.label]);
    return () => {
      const empty = emptyStateModel({ size: props.size, headingLevel: props.headingLevel, compactTitle: props.compactTitle, cardLevel });
      const art = props.illustration === false ? null : slotContent(slots.illustration) ?? h(EmptyStateIllustration, { icon: props.icon, size: empty.size }, slots.icon ? { icon: slots.icon } : {});
      const caption = slotContent(slots.default);
      const { primaryAction, secondaryAction } = props;
      return h("section", { ...restAttrs(attrs), class: [empty.className, attrs.class], style: attrs.style }, [
        art,
        h("div", { class: "zen-empty-state__body" }, [
          h("div", { class: "zen-empty-state__content" }, [
            h(empty.heading, { class: empty.titleClass }, [slotContent(slots.title) ?? props.title]),
            caption ? h("p", { class: emptyStateCaptionClass }, [caption]) : null,
          ]),
          primaryAction || secondaryAction
            ? h("div", { class: "zen-empty-state__actions" }, [
                primaryAction ? cta(primaryAction, emptyStateActionLevels.first) : null,
                secondaryAction ? cta(secondaryAction, emptyStateActionLevels.second) : null,
              ])
            : null,
        ]),
      ]);
    };
  },
});
