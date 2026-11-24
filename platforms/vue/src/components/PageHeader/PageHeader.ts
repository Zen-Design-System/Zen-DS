import { defineComponent, h, type PropType, type SlotsType, type VNodeChild } from "vue";
import { pageHeaderOnPhone, pageHeaderTitleStyle, type PageHeaderBack } from "@zen-ds/core";
import "../../_shared/core-icons";
import { restAttrs } from "../../_shared/attrs";
import { useAppShellChrome } from "../../_shared/app-shell-chrome";
import { useZen } from "../../_shared/context";
import { hasContent, slotContent } from "../../_shared/slots";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { Heading, Text } from "../Text/Text";

export type { PageHeaderBack } from "@zen-ds/core";

/** A slot's content, else the prop's value: React's `ReactNode` props are both in Vue. */
const contentOf = (slot: (() => VNodeChild) | undefined, value: VNodeChild): VNodeChild => slotContent(slot) ?? value;
const given = (value: VNodeChild) => value !== undefined && value !== null && value !== false && value !== "" && hasContent(value);

/**
 * The top of an app page (React: PageHeader): breadcrumbs or eyebrow, the h1 title with its meta and actions, a
 * description and optional section tabs. `title`, `child-title`, `description` and `eyebrow` take text or a slot of the
 * same name; `breadcrumbs`, `actions`, `meta`, `trailing` and `tabs` are slots. On a phone the trail gives way to Back.
 *
 *   <PageHeader title="Team members" description="12 members · Design workspace">
 *     <template #actions><Button level="tertiary">Export</Button><Button level="primary">Invite member</Button></template>
 *   </PageHeader>
 */
export const PageHeader = defineComponent({
  name: "PageHeader",
  inheritAttrs: false,
  props: {
    /** The page title (an h1 by default: one per page). */
    title: { type: [String, Number] },
    /** Figma Child-Heading: a second title after the title, in Content/Neutral/Light ("Members" › "Design team"). */
    childTitle: { type: [String, Number] },
    /** One or two sentences under the title (Content/Neutral/Light). */
    description: { type: [String, Number] },
    /** Above the title when there are no breadcrumbs: a short section label. */
    eyebrow: { type: [String, Number] },
    /** A Back control for detail pages: `{ label, onClick }`. */
    back: { type: Object as PropType<PageHeaderBack> },
    /** Heading level of the title: 1 (Heading/1), or 2 (Heading/4) when the page already has an h1. */
    headingLevel: { type: Number as PropType<1 | 2>, default: 1 },
  },
  slots: Object as SlotsType<{ title?: () => VNodeChild; childTitle?: () => VNodeChild; description?: () => VNodeChild; eyebrow?: () => VNodeChild; breadcrumbs?: () => VNodeChild; actions?: () => VNodeChild; meta?: () => VNodeChild; trailing?: () => VNodeChild; tabs?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const zen = useZen();
    const chrome = useAppShellChrome();
    return () => {
      const back = props.back;
      // On a phone a trail gives way: nothing beside a `back` of the page's own. (A Breadcrumbs becomes Back to its
      // parent with the Breadcrumbs port, wave 2.)
      const crumbs = slotContent(slots.breadcrumbs);
      const trail = !pageHeaderOnPhone(chrome()?.phone, zen?.breakpoint) ? crumbs : back ? null : crumbs;
      const eyebrow = contentOf(slots.eyebrow, props.eyebrow);
      const childTitle = contentOf(slots.childTitle, props.childTitle);
      const description = contentOf(slots.description, props.description);
      const meta = slotContent(slots.meta);
      const actions = slotContent(slots.actions);
      const trailing = slotContent(slots.trailing);
      const tabs = slotContent(slots.tabs);
      return h("header", { ...restAttrs(attrs), class: ["zen-page-header", attrs.class], style: attrs.style }, [
        back ? h("div", { class: "zen-page-header__back" }, [
          h(Button, { appearance: "flat", level: "primary", size: "sm", onClick: back.onClick }, { startIcon: () => [h(Icon, { name: "icon-chevron-left-line-medium", decorative: true })], default: () => [back.label] }),
        ]) : null,
        trail ? h("div", { class: "zen-page-header__breadcrumbs" }, [trail])
          : given(eyebrow) ? h(Text, { class: "zen-page-header__eyebrow", textStyle: "Body/Small/Medium", tone: "base" }, () => [eyebrow]) : null,
        h("div", { class: "zen-page-header__row" }, [
          h("div", { class: "zen-page-header__titles" }, [
            h(Heading, { level: props.headingLevel, textStyle: pageHeaderTitleStyle(props.headingLevel) }, () => [
              contentOf(slots.title, props.title),
              given(childTitle) ? h("span", { class: "zen-page-header__child" }, [childTitle]) : null,
            ]),
            meta ? h("div", { class: "zen-page-header__meta" }, [meta]) : null,
          ]),
          actions || trailing ? h("div", { class: "zen-page-header__actions" }, [actions, trailing ? h("span", { class: "zen-page-header__trailing" }, [trailing]) : null]) : null,
        ]),
        given(description) ? h(Text, { class: "zen-page-header__description", tone: "light" }, () => [description]) : null,
        tabs ? h("div", { class: "zen-page-header__tabs" }, [tabs]) : null,
      ]);
    };
  },
});
