import type { SourceAttr, SourceChild } from "../types";

/*
 * Zen Studio content slots: the props of a component that take free content in an example or template instance (Figma
 * native SLOT properties, plus Dialog's Custom frame), where each slot renders in the DOM, and how new content is laid
 * out when the insert picker adds to it. Spec: docs/research/studio-slots-spec-2026-10-03.md, "Slot registry" and
 * "InsertPicker". Named "content slots" because "slot" already means DetachPlan slots and the inspector bridge slots.
 *
 * Studio-side data only: src/components/** is never annotated. Every container, anchor and gap below was checked against
 * the component source and CSS on 2026-10-03; palette.selftest.mjs re-checks them so they cannot drift.
 * Pure: no React, type-only imports and erasable TypeScript, so `node palette.selftest.mjs` imports it directly. The DOM
 * helpers take elements as arguments and never touch `document`.
 */

export type ContentSlotKind =
  /** Free content: add, remove, duplicate and move anything the palette offers. */
  | "content"
  /** A small fixed place (ListItem leading / trailing): only the components in `accepts.only`. */
  | "atom"
  /** A layout primitive's own children (Stack, Grid, Box): the inspector titles it "Children". */
  | "layout";

/**
 * How the slot lays out its children. `block`: normal flow, no gap (Dialog Custom, Accordion content, TabPanel, Box).
 */
export type SlotFlow = "column" | "row" | "block";

/**
 * The space between the slot's children. `none`: the container has no gap, so a second child goes in a `<Stack gap="md">`
 * (insertTargetFor). `md`: the container already spaces its children Gap/Medium (16px). `own`: the container spaces
 * them itself (a layout primitive's `gap` prop, ListItem trailing's built-in Gap/Small).
 */
export type SlotGap = "none" | "md" | "own";

/** Where a ghost drop zone sits relative to its anchor element (for slots whose container does not mount empty). */
export type SlotPlace = "before" | "after" | "first-child" | "last-child";
/** A ghost's anchor: the element (`selector`), the side, and `flow` when the ghost lays out otherwise there. */
export type SlotGhostAnchor = { selector: string; place: SlotPlace; flow?: SlotFlow };

type Literal = string | number | boolean;

/** A host prop the way slot rules read it: a literal, or `{ bound }` when the source writes an expression. */
export type HostPropValue = Literal | { bound: string };
export type HostProps = Readonly<Record<string, HostPropValue | undefined>>;

/**
 * One host-prop condition. The value (or `default` when the prop is unset) must be one of `is` and none of `not`;
 * `truthy` requires a set, non-false value. A bound value is unknown, so the condition holds (the slot stays offered).
 */
export type SlotCondition = { prop: string; is?: readonly Literal[]; not?: readonly Literal[]; truthy?: boolean; default?: Literal };

export type ContentSlot = {
  /** The component that owns the slot (its display name, as in api.generated.json). */
  component: string;
  /** `children`, or the ReactNode prop the content is written in (`side={<…/>}`). */
  prop: string;
  /** The Figma slot name ("Content", "Main-Contents"); layout primitives use "Children". */
  name: string;
  /** The Figma component property (`Content#6643:0`) and component (set) node. `native`: a SLOT property, not a frame. */
  figma?: { property?: string; node?: string; native: boolean };
  kind: ContentSlotKind;
  /**
   * Selector of the element the slot's children render in, resolved from the component's root element (slotHostRoot,
   * then `root.querySelector`); `:scope >` keeps nested instances out. `null`: the root itself is the container.
   */
  container: string | null;
  /** The container renders while the slot is empty. False: draw a ghost drop zone at `ghostAnchor` instead. */
  mountsWhenEmpty: boolean;
  /**
   * Where the empty slot would render (resolved from the root like `container`; `:scope` is the root itself). A list: the
   * first anchor on the page (PageHeader Trailing-Slots: after the actions, else under the header). Missing anchor: the
   * component edge.
   */
  ghostAnchor?: SlotGhostAnchor | readonly SlotGhostAnchor[];
  /**
   * How the empty slot's ghost sits beside its anchor when that differs from `flow` (the content's own layout):
   * TopNavigation's Control-Slot lays one control out in a row, but it stacks under the bar.
   */
  ghostFlow?: SlotFlow;
  /** The component's own parts that share the container (selector relative to it): not slot content, left out of outlines. */
  parts?: string;
  flow: SlotFlow;
  gap: SlotGap;
  /** Most layers the slot takes (Figma maxChildren). A limit warns; it never blocks. */
  max?: number;
  accepts?: {
    /** Component names the slot takes (the palette shows only these); empty or absent: anything. */
    only?: readonly string[];
    /** Component names the slot never takes (harness errors such as accordion/no-nested). */
    deny?: readonly string[];
    /** Host props that make the slot one click target (role=button / a link): no controls or fields inside. */
    noInteractiveWhen?: readonly string[];
  };
  /** The slot renders only while every condition holds (ModalForm side: a layout with a side column). */
  activeWhen?: readonly SlotCondition[];
  /** Rendered in a portal and only while open: outline it after opening, edit it from the inspector rows. */
  overlay?: boolean;
};

/** A slot component: its root element (what `container` and `ghostAnchor` resolve from) and its slots. */
export type SlotComponent = {
  /** Selector of the component's root element. Overlays render it in a portal: their first host is a `<template>`. */
  root: string;
  /** Heading level of the component's own title: a number, `{ prop, default }` when a prop sets it, null without one. */
  titleLevel: number | { prop: string; default: number } | null;
  slots: readonly ContentSlot[];
};

/* Figma: the live file 9nZv4uW2LT21yuHabMTCh1 (2026-10-03 scan). Code: line refs in the spec's research reports. */

const card: ContentSlot = {
  // Card.tsx: <div className="zen-card__content">{children}</div> always; card.css: flex column, no gap.
  component: "Card", prop: "children", name: "Content", figma: { property: "Content#6643:0", node: "6643:51021", native: true },
  kind: "content", container: ":scope > .zen-card__content", mountsWhenEmpty: true, flow: "column", gap: "none",
  accepts: { deny: ["Card", "MetricCard", "ChartCard"], noInteractiveWhen: ["onClick"] },
};

const overlayDeny = ["Dialog", "ModalForm", "SidePanel", "BottomSheet", "Popover", "Menu"] as const;

const dialog: ContentSlot = {
  // Dialog.tsx: {children ? <div className="zen-dialog__custom">…</div> : null} after .zen-dialog__content; dialog.css:
  // padding only (block). Figma Modal/Dialog has no SLOT: a BOOLEAN Custom shows the Custom frame.
  component: "Dialog", prop: "children", name: "Custom", figma: { property: "Custom#10154:11", node: "841:17177", native: false },
  kind: "content", container: ":scope > .zen-dialog__custom", mountsWhenEmpty: false,
  ghostAnchor: { selector: ":scope > .zen-dialog__content", place: "after" }, flow: "block", gap: "none",
  accepts: { deny: [...overlayDeny] }, overlay: true,
};

const modalFormMain: ContentSlot = {
  // Dialog.tsx ModalForm: {children ? <div className="zen-modal-form__body">…</div> : null} in .zen-modal-form__main;
  // dialog.css: flex column, gap Medium.
  component: "ModalForm", prop: "children", name: "Main-Contents", figma: { property: "Main-Contents#4080:0", node: "841:17182", native: true },
  kind: "content", container: ":scope > .zen-modal-form__content > .zen-modal-form__main > .zen-modal-form__body", mountsWhenEmpty: false,
  ghostAnchor: { selector: ":scope > .zen-modal-form__content > .zen-modal-form__main > .zen-modal-form__header", place: "after" }, flow: "column", gap: "md",
  accepts: { deny: [...overlayDeny, "Form"] }, overlay: true,
};

const modalFormSide: ContentSlot = {
  // <aside className="zen-modal-form__side"> before .zen-modal-form__main, only when side is set and layout is not
  // basic / big (hasSide); dialog.css: flex column, gap Medium.
  component: "ModalForm", prop: "side", name: "Side-Content", figma: { property: "Side-Content#4267:15", node: "841:17182", native: true },
  kind: "content", container: ":scope > .zen-modal-form__content > .zen-modal-form__side", mountsWhenEmpty: false,
  ghostAnchor: { selector: ":scope > .zen-modal-form__content > .zen-modal-form__main", place: "before" }, flow: "column", gap: "md",
  accepts: { deny: [...overlayDeny, "Form"] }, activeWhen: [{ prop: "layout", is: ["1-3", "half-half", "3-4"], default: "basic" }], overlay: true,
};

const modalFormTop: ContentSlot = {
  // {top ? <div className="zen-modal-form__top">…</div> : null}, first in .zen-modal-form__main; flex column, gap Medium.
  component: "ModalForm", prop: "top", name: "Top-Custom-Slot", figma: { property: "Top-Custom-Slot#12048:15", node: "841:17182", native: true },
  kind: "content", container: ":scope > .zen-modal-form__content > .zen-modal-form__main > .zen-modal-form__top", mountsWhenEmpty: false,
  ghostAnchor: { selector: ":scope > .zen-modal-form__content > .zen-modal-form__main", place: "first-child" }, flow: "column", gap: "md",
  accepts: { deny: [...overlayDeny, "Form"] }, overlay: true,
};

const sidePanel: ContentSlot = {
  // SidePanel.tsx: {children ? <div className="zen-side-panel__body">…</div> : null} after the header; side-panel.css:
  // flex column, gap Medium. Standard renders in place, Modal in a portal; both only while open.
  component: "SidePanel", prop: "children", name: "Contents", figma: { property: "Contents#4083:122", node: "1573:3128", native: true },
  kind: "content", container: ":scope > .zen-side-panel__body", mountsWhenEmpty: false,
  ghostAnchor: { selector: ":scope > .zen-side-panel__header", place: "after" }, flow: "column", gap: "md",
  accepts: { deny: [...overlayDeny] }, overlay: true,
};

const bottomSheet: ContentSlot = {
  // BottomSheet.tsx: <div className="zen-bottom-sheet__body"> always (inside form.zen-bottom-sheet__form with onSubmit);
  // type="action" renders its items there instead of children. bottom-sheet.css: flex column, gap Medium.
  component: "BottomSheet", prop: "children", name: "Contents", figma: { property: "Contents#4060:0", node: "4059:14161", native: true },
  kind: "content", container: ":scope > .zen-bottom-sheet__body, :scope > .zen-bottom-sheet__form > .zen-bottom-sheet__body", mountsWhenEmpty: true, flow: "column", gap: "md",
  accepts: { deny: [...overlayDeny] }, activeWhen: [{ prop: "type", not: ["action"], default: "modal" }], overlay: true,
};

const accordion: ContentSlot = {
  // Accordion.tsx: .zen-accordion__panel > __panel-inner > <div className="zen-accordion__content Body/Base/Regular">;
  // accordion.css: padding only (block). The panel is inert while collapsed: expand it before outlining.
  component: "Accordion", prop: "children", name: "Contents", figma: { property: "Contents#4035:8", node: "239:18764", native: true },
  kind: "content", container: ":scope > .zen-accordion__panel > .zen-accordion__panel-inner > .zen-accordion__content", mountsWhenEmpty: true,
  flow: "block", gap: "none", accepts: { deny: ["Accordion"] },
};

const tabPanel: ContentSlot = {
  // Tabs.tsx: <div role="tabpanel" className="zen-tab-panel" hidden={hidden}>{children}</div>; no layout CSS (block).
  component: "TabPanel", prop: "children", name: "Content", kind: "content", container: null, mountsWhenEmpty: true, flow: "block", gap: "none",
};

const chartCard: ContentSlot = {
  // Chart.tsx: Card > .zen-card__content > <div className="zen-chart-card__body"> holding the header, the range
  // Segmented and then {children}; chart.css: flex column, gap Medium. In Figma a Card instance with Content filled.
  component: "ChartCard", prop: "children", name: "Content", figma: { property: "Content#6643:0", node: "6643:51021", native: true },
  kind: "content", container: ":scope > .zen-card__content > .zen-chart-card__body", mountsWhenEmpty: true,
  parts: ":scope > .zen-chart-card__header, :scope > .zen-segmented", flow: "column", gap: "md",
  accepts: { deny: ["Card", "MetricCard", "ChartCard"] },
};

const listItemLeading: ContentSlot = {
  // ListItem.tsx: {leading ? <span className="zen-list-item__leading">…</span> : null}, first in .zen-list-item__wrapper
  // (a button or link when the row is clickable). Figma: the Leading of List-Item (not a SLOT property).
  component: "ListItem", prop: "leading", name: "Leading", figma: { node: "4080:11700", native: false },
  kind: "atom", container: ":scope > .zen-list-item__wrapper > .zen-list-item__leading", mountsWhenEmpty: false,
  ghostAnchor: { selector: ":scope > .zen-list-item__wrapper", place: "first-child" }, flow: "row", gap: "none", max: 1,
  accepts: { only: ["Avatar", "DockIcon"], noInteractiveWhen: ["onClick", "href"] },
};

const listItemTrailing: ContentSlot = {
  // ListItem.tsx: {trailing ? <span className="zen-list-item__trailing">…</span> : null} after the wrapper, outside the
  // row button; list-item.css: inline-flex, gap Small. Figma Slot-Actions (4080:11386) Actions#4060:8.
  component: "ListItem", prop: "trailing", name: "Actions", figma: { property: "Actions#4060:8", node: "4080:11386", native: true },
  kind: "atom", container: ":scope > .zen-list-item__trailing", mountsWhenEmpty: false,
  ghostAnchor: { selector: ":scope > .zen-list-item__wrapper", place: "after" }, flow: "row", gap: "own",
  accepts: { only: ["Badge", "IconButton", "Button"] },
};

const listItemContents: ContentSlot = {
  // ListItem.tsx: <span className="zen-list-item__contents">{children ?? title + caption}</span> always, inside the
  // wrapper (a button or link when the row is clickable); list-item.css: flex column, gap 3XSmall. Figma Contents#6331:289
  // holds the Info-Content primitive (Title · Subtitle): children replace the title and caption.
  component: "ListItem", prop: "children", name: "Contents", figma: { property: "Contents#6331:289", node: "4080:11700", native: true },
  kind: "content", container: ":scope > .zen-list-item__wrapper > .zen-list-item__contents", mountsWhenEmpty: true,
  parts: ":scope > .zen-list-item__title, :scope > .zen-list-item__caption", flow: "column", gap: "own",
  accepts: { deny: ["List", "ListItem", "ListBox", ...overlayDeny], noInteractiveWhen: ["onClick", "href"] },
};

const listBoxHeader: ContentSlot = {
  // ListItem.tsx ListBox: {header ? <div className="zen-list-box__header">…</div> : null} before the body; list-item.css:
  // flex column, gap Medium, padding Card-padding-medium (XSmall below). Figma Component/List-Box Header-Slot (Header=Yes).
  component: "ListBox", prop: "header", name: "Header-Slot", figma: { property: "Header-Slot#14939:20", node: "14922:75297", native: true },
  kind: "content", container: ":scope > .zen-list-box__header", mountsWhenEmpty: false,
  ghostAnchor: { selector: ":scope > .zen-list-box__body", place: "before" }, flow: "column", gap: "md",
  accepts: { deny: ["ListBox", ...overlayDeny] },
};

const listBoxBody: ContentSlot = {
  // ListBox: <div className="zen-list-box__body">{children}</div> always; flex column, gap Large (the rows' rhythm),
  // padding Card-padding-medium. Figma Body-Slot#14933:0 holds the List-Item instances.
  component: "ListBox", prop: "children", name: "Body-Slot", figma: { property: "Body-Slot#14933:0", node: "14922:75297", native: true },
  kind: "content", container: ":scope > .zen-list-box__body", mountsWhenEmpty: true, flow: "column", gap: "own",
  accepts: { deny: ["ListBox", ...overlayDeny] },
};

const listBoxFooter: ContentSlot = {
  // ListBox: {footer ? <div className="zen-list-box__footer">…</div> : null} after the body; flex column, gap Medium,
  // padding Card-padding-medium. Figma Footer-Slot#14939:30 (Footer=Yes).
  component: "ListBox", prop: "footer", name: "Footer-Slot", figma: { property: "Footer-Slot#14939:30", node: "14922:75297", native: true },
  kind: "content", container: ":scope > .zen-list-box__footer", mountsWhenEmpty: false,
  ghostAnchor: { selector: ":scope > .zen-list-box__body", place: "after" }, flow: "column", gap: "md",
  accepts: { deny: ["ListBox", ...overlayDeny] },
};

const topNavigationControl: ContentSlot = {
  // TopNavigation.tsx: {controlBar ? <div className="zen-top-nav__control">{controlBar}</div> : null}, pinned under the
  // bar or in the fold (a folding Search); top-navigation.css: a flex row whose one child fills it. Figma Control-Bar ›
  // Control-Slot (12014:44786, 48px): a Search, Segmented or Tabs. Its actions (Top-Trailing, Header-Trailing) are data
  // slots (dataSlots.ts). User, 2026-10-04.
  component: "TopNavigation", prop: "controlBar", name: "Control-Slot", figma: { property: "Control-Slot#12014:37", node: "12014:44764", native: true },
  // Empty, it would render at the end of the header (after the large title, before a banner). The ghost sits just below
  // the header's edge: a strip inside it covered the large title (2026-10-05).
  kind: "atom", container: ".zen-top-nav__control", mountsWhenEmpty: false, ghostAnchor: { selector: ":scope", place: "after" }, ghostFlow: "column", flow: "row", gap: "none", max: 1,
  accepts: { only: ["Search", "Segmented", "Tabs"] },
};

const sidebarHeader: ContentSlot = {
  // Sidebar.tsx SidebarPanel: <div className="zen-sidebar__header">{brand}{collapse control}</div> always (the default
  // logo and the collapse control are the component's own parts); sidebar.css: a flex row, no gap. Figma ❖ Sidebar
  // Side-Bar/Master/Basic Header-Content (the LOGO; the collapse Wrapper follows it). The workspace variant's
  // Child-Header-Content is the same prop.
  component: "Sidebar", prop: "brand", name: "Header-Content", figma: { property: "Header-Content#4081:58", node: "4081:15234", native: true },
  // The default brand is the slot's content once it shows a logo: a collapsed rail draws `logoCollapsed` there instead of
  // `brand`, which is not Empty. Without any logo it is the component's own (empty) part.
  kind: "content", container: ".zen-sidebar__header", mountsWhenEmpty: true,
  parts: ".zen-sidebar__default-brand:not(:has(> .zen-sidebar__default-brand-expanded, > .zen-sidebar__default-brand-collapsed, > .zen-sidebar__default-brand-product)), .zen-sidebar__workspace-title, .zen-sidebar__collapse",
  flow: "row", gap: "none",
  accepts: { only: ["Avatar", "Image", "Icon", "DockIcon", "Text", "Badge"] },
};

const sidebarBody: ContentSlot = {
  // ItemList: <div className="zen-sidebar__items"> always, the `sections` entries first, then the children (runs of
  // SidebarMenuItem rows share one section); sidebar.css: a flex column, gap Medium between sections. Figma
  // Body-Content#4081:59 holds the Menu-Item instances (Child-Body-Content in the workspace variant).
  component: "Sidebar", prop: "children", name: "Body-Content", figma: { property: "Body-Content#4081:59", node: "4081:15234", native: true },
  kind: "content", container: ".zen-sidebar__body > .zen-sidebar__items", mountsWhenEmpty: true, flow: "column", gap: "md",
  accepts: { only: ["SidebarMenuItem", "SidebarMenuSection"], deny: [...overlayDeny] },
};

const sidebarFooter: ContentSlot = {
  // {footer ? <><divider /><div className="zen-sidebar__footer"><div className="zen-sidebar__footer-content">… only
  // with a footer; sidebar.css: a flex column, Gap/3XSmall like the rows. Figma Footer-Content#4081:60 holds Menu-Items.
  component: "Sidebar", prop: "footer", name: "Footer-Content", figma: { property: "Footer-Content#4081:60", node: "4081:15234", native: true },
  kind: "content", container: ".zen-sidebar__footer-content", mountsWhenEmpty: false,
  // Empty: a strip at the body's end, the Sidebar's bottom edge where the footer goes (after the body would be under it).
  ghostAnchor: { selector: ".zen-sidebar__body", place: "last-child" }, flow: "column", gap: "own",
  accepts: { only: ["SidebarMenuItem"], deny: [...overlayDeny] },
};

const pageHeaderActions: ContentSlot = {
  // PageHeader.tsx: {actions || trailing ? (<div className="zen-page-header__actions">{actions}<span trailing/></div>)}
  // in the title row; page-header.css: a wrapping flex row, Gap/Small. Figma ◇ Master-Layout Primitives/Dashboard/Header
  // Type=Main Action-Slots (two Button/Main). Trailing-Slots shares the container: it is a part here.
  component: "PageHeader", prop: "actions", name: "Action-Slots", figma: { property: "Action-Slots#4122:78", node: "4122:33402", native: true },
  kind: "content", container: ":scope > .zen-page-header__row > .zen-page-header__actions", mountsWhenEmpty: false,
  // Empty: a strip at the title row's end (the titles fill the row, so after them would be outside it).
  ghostAnchor: { selector: ":scope > .zen-page-header__row", place: "last-child" }, parts: ".zen-page-header__trailing", flow: "row", gap: "own",
  accepts: { only: ["Button", "IconButton", "Menu"], deny: [...overlayDeny] },
};

const pageHeaderTrailing: ContentSlot = {
  // {trailing ? <span className="zen-page-header__trailing">…</span> : null} after the actions; page-header.css: an
  // inline flex row, Gap/Small. Figma Trailing-Slots (Action-Item Button/Icon-Main, Avatar/Single).
  component: "PageHeader", prop: "trailing", name: "Trailing-Slots", figma: { property: "Trailing-Slots#4122:82", node: "4122:33402", native: true },
  kind: "content", container: ":scope > .zen-page-header__row > .zen-page-header__actions > .zen-page-header__trailing", mountsWhenEmpty: false,
  // Empty: after the action buttons; without actions, under the header (as TopNavigation's Control-Slot), so it does not
  // sit on Action-Slots' ghost at the row's end.
  ghostAnchor: [
    { selector: ":scope > .zen-page-header__row > .zen-page-header__actions", place: "last-child" },
    { selector: ":scope", place: "after", flow: "column" },
  ],
  flow: "row", gap: "own",
  accepts: { only: ["IconButton", "Avatar", "Menu"], deny: [...overlayDeny] },
};

const metricAction: ContentSlot = {
  // MetricWidget.tsx Title-Highlight at XLarge–Medium: <div className="zen-metric__header"><span
  // className="zen-metric__title-row">…label…</span>{action}</div>, always while titled (activeWhen); metric-widget.css: a
  // flex row, space-between, gap Small. Figma: the title row's Button/Icon-Main XSmall Tertiary (not a SLOT property).
  // An atom so Swap instance (⇄) reaches it (2026-10-08).
  component: "Metric", prop: "action", name: "Action", figma: { native: false },
  kind: "atom", container: ":scope > .zen-metric__contents > .zen-metric__header", mountsWhenEmpty: true, parts: ":scope > .zen-metric__title-row",
  flow: "row", gap: "own", max: 1,
  accepts: { only: ["IconButton", "Button"] },
  activeWhen: [{ prop: "variant", is: ["title-highlight"], default: "icon-highlight" }, { prop: "size", is: ["xl", "xlarge", "lg", "large", "md", "medium"], default: "xl" }],
};

const emptyStateIcon: ContentSlot = {
  // EmptyState.tsx: the placeholder illustration (illustration true) draws {renderIcon(icon)} in
  // <span className="zen-empty-state__icon">, always (its default icon when unset); empty-state.css: inline-flex, an
  // Icon inside sized 44px. Figma Empty-State/Illustration/Placeholder (6085:25816) icon. An atom for ⇄ (2026-10-08).
  component: "EmptyState", prop: "icon", name: "Icon", figma: { node: "6085:25816", native: false },
  kind: "atom", container: ":scope > .zen-empty-state__illustration > .zen-empty-state__icon", mountsWhenEmpty: true, flow: "row", gap: "none", max: 1,
  accepts: { only: ["Icon"] },
  activeWhen: [{ prop: "illustration", is: [true], default: true }],
};

const layout = (component: string, flow: SlotFlow, gap: SlotGap): ContentSlot => ({
  component, prop: "children", name: "Children", kind: "layout", container: null, mountsWhenEmpty: true, flow, gap,
});

/** Every component with content slots, by display name. */
export const CONTENT_SLOTS: Readonly<Record<string, SlotComponent>> = {
  Card: { root: ".zen-card", titleLevel: null, slots: [card] },
  Dialog: { root: ".zen-dialog", titleLevel: { prop: "headingLevel", default: 2 }, slots: [dialog] },
  ModalForm: { root: ".zen-modal-form", titleLevel: { prop: "headingLevel", default: 2 }, slots: [modalFormMain, modalFormSide, modalFormTop] },
  SidePanel: { root: ".zen-side-panel", titleLevel: { prop: "headingLevel", default: 2 }, slots: [sidePanel] },
  // The sheet title is a fixed h2 (BottomSheet.tsx).
  BottomSheet: { root: ".zen-bottom-sheet", titleLevel: 2, slots: [bottomSheet] },
  Accordion: { root: ".zen-accordion", titleLevel: { prop: "headingLevel", default: 3 }, slots: [accordion] },
  TabPanel: { root: ".zen-tab-panel", titleLevel: null, slots: [tabPanel] },
  ChartCard: { root: ".zen-chart-card", titleLevel: { prop: "headingLevel", default: 3 }, slots: [chartCard] },
  ListItem: { root: ".zen-list-item", titleLevel: null, slots: [listItemLeading, listItemContents, listItemTrailing] },
  ListBox: { root: ".zen-list-box", titleLevel: null, slots: [listBoxHeader, listBoxBody, listBoxFooter] },
  // Its title level is a string prop ("h1"); nothing inserted into the Control-Slot takes a heading level from it.
  TopNavigation: { root: ".zen-top-nav", titleLevel: null, slots: [topNavigationControl] },
  Sidebar: { root: ".zen-sidebar", titleLevel: null, slots: [sidebarHeader, sidebarBody, sidebarFooter] },
  PageHeader: { root: ".zen-page-header", titleLevel: { prop: "headingLevel", default: 1 }, slots: [pageHeaderActions, pageHeaderTrailing] },
  Metric: { root: ".zen-metric", titleLevel: null, slots: [metricAction] },
  EmptyState: { root: ".zen-empty-state", titleLevel: null, slots: [emptyStateIcon] },
  // Stack and Grid space their children with their gap prop (default md); Box is a plain block (Layout.tsx, layout.css).
  Stack: { root: ".zen-stack", titleLevel: null, slots: [layout("Stack", "column", "own")] },
  Grid: { root: ".zen-grid", titleLevel: null, slots: [layout("Grid", "row", "own")] },
  Box: { root: ".zen-box", titleLevel: null, slots: [layout("Box", "block", "none")] },
};

const LAYOUT_PRIMITIVES = new Set(["Stack", "Grid", "Box"]);

/** The component's content slots, in the order the inspector lists them (none: an empty list). */
export function slotsOf(component: string): readonly ContentSlot[] {
  return CONTENT_SLOTS[component]?.slots ?? [];
}

/** One slot by component and prop. */
export function slotOf(component: string, prop: string): ContentSlot | null {
  return slotsOf(component).find((slot) => slot.prop === prop) ?? null;
}

/** Stack, Grid and Box: free frames whose children are the slot (titled "Children"). Text and Heading are not frames. */
export const isLayoutPrimitive = (component: string) => LAYOUT_PRIMITIVES.has(component);

/** Selector of the component's root element, or null when it has no content slots. */
export const slotRootSelector = (component: string) => CONTENT_SLOTS[component]?.root ?? null;

/* ───────────── Host props ───────────── */

const NUMBER = /^-?\d+(\.\d+)?$/;
const QUOTED = /^(["'])((?:(?!\1)[^\\])*)\1$/;

/**
 * A SourceElement's attributes as HostProps: strings, `true` shorthands and literal expressions ({3}, {false}, {"a"})
 * become literals; any other expression is `{ bound }`. A spread is kept under "…" (it may set anything).
 */
export function hostPropsOf(attributes: readonly SourceAttr[]): HostProps {
  const props: Record<string, HostPropValue> = {};
  for (const attr of attributes) {
    if (attr.kind === "string") props[attr.name] = attr.value ?? "";
    else if (attr.kind === "true") props[attr.name] = true;
    else if (attr.kind === "spread") props["…"] = { bound: attr.raw };
    else {
      const code = (attr.value ?? "").trim();
      const quoted = QUOTED.exec(code);
      props[attr.name] = code === "true" ? true : code === "false" ? false : NUMBER.test(code) ? Number(code) : quoted ? quoted[2] : { bound: code };
    }
  }
  return props;
}

const isBound = (value: HostPropValue | undefined): value is { bound: string } => typeof value === "object" && value !== null;

/** Whether a prop is set to something that is not false / null / undefined (a bound value counts as set). */
const isSet = (props: HostProps, prop: string) => {
  const value = props[prop];
  return value !== undefined && value !== false && !(isBound(value) && /^(null|undefined|false)$/.test(value.bound));
};

function holds(condition: SlotCondition, props: HostProps): boolean {
  const raw = props[condition.prop];
  if (isBound(raw)) return true;
  const value = raw ?? condition.default;
  if (condition.truthy && !value) return false;
  if (condition.is && (value === undefined || !condition.is.includes(value))) return false;
  if (condition.not && value !== undefined && condition.not.includes(value)) return false;
  return true;
}

/** Whether the slot renders with these host props (bound values count as yes: the source decides at run time). */
export const isSlotActive = (slot: ContentSlot, props: HostProps = {}) => (slot.activeWhen ?? []).every((condition) => holds(condition, props));

/** The slots this instance renders. */
export const activeSlotsOf = (component: string, props: HostProps = {}) => slotsOf(component).filter((slot) => isSlotActive(slot, props));

/** The flow this instance renders: a Stack follows its `direction` (a bound direction keeps the default column). */
export const slotFlowOf = (slot: ContentSlot, props: HostProps = {}): SlotFlow =>
  (slot.component === "Stack" && slot.kind === "layout" && props.direction === "row" ? "row" : slot.flow);

/** The prop that hides an inactive slot, for the inspector's caption ("Side-Content shows with the 1-3, Half-Half or 3-4 layout"). */
export const inactiveCondition = (slot: ContentSlot, props: HostProps = {}) => (slot.activeWhen ?? []).find((condition) => !holds(condition, props)) ?? null;

/** A clickable Card (onClick) or ListItem (onClick / href) is one click target: no controls inside its content. */
export function isClickableHost(component: string, props: HostProps = {}): boolean {
  return slotsOf(component).some((slot) => (slot.accepts?.noInteractiveWhen ?? []).some((prop) => isSet(props, prop)));
}

/** Whether the slot itself sits inside the click target (Card content, ListItem leading; not ListItem trailing). */
export const slotIsClickTarget = (slot: ContentSlot, props: HostProps = {}) => (slot.accepts?.noInteractiveWhen ?? []).some((prop) => isSet(props, prop));

/* ───────────── Headings ───────────── */

/**
 * Heading level of the component's own title: Dialog, ModalForm, SidePanel → `headingLevel` (default 2); BottomSheet 2;
 * Accordion and ChartCard → `headingLevel` (default 3). Null when the component has no title (Card, TabPanel, layouts).
 */
export function hostTitleLevel(component: string, props: HostProps = {}): number | null {
  const level = CONTENT_SLOTS[component]?.titleLevel ?? null;
  if (level === null || typeof level === "number") return level;
  const value = props[level.prop];
  return typeof value === "number" ? value : level.default;
}

const clampLevel = (level: number) => Math.min(6, Math.max(2, Math.round(level)));

/**
 * The level a Heading inserted into the host's slot takes: the host title + 1. A host without a title (Card, TabPanel,
 * a layout) uses the nearest preceding Heading in the same surface + 1, then the nearest titled ancestor + 1, then 3
 * (a card on a page whose title is the h1 → sections h2 → card titles h3). Clamped to 2–6: an insert is never the h1
 * (heading/h1-is-heading-1). `ancestors`: nearest first, the host left out.
 */
export function headingLevelFor(
  host: string,
  hostProps: HostProps = {},
  options: { nearestHeading?: number; ancestors?: ReadonlyArray<{ name: string; props?: HostProps }> } = {},
): number {
  const own = hostTitleLevel(host, hostProps);
  if (own !== null) return clampLevel(own + 1);
  if (options.nearestHeading) return clampLevel(options.nearestHeading + 1);
  for (const ancestor of options.ancestors ?? []) {
    const level = hostTitleLevel(ancestor.name, ancestor.props);
    if (level !== null) return clampLevel(level + 1);
  }
  return 3;
}

/* ───────────── Insert target ───────────── */

/** What the slot holds now: its layers (elements, text runs, {…} expressions; whitespace and comments left out). */
export type SlotContentSummary = {
  count: number;
  /** The only layer when `count` is 1 and it is an element. Pass its props (GET /element) so a row Stack is told apart. */
  only?: { name: string; props?: HostProps };
};

/** A slot's children as a SlotContentSummary (the only child's props are not in SourceChild: add them when known). */
export function contentSummaryOf(children: readonly SourceChild[]): SlotContentSummary {
  const layers = children.filter((child) => child.kind !== "text" || child.value.trim() !== "");
  const first = layers[0];
  return { count: layers.length, ...(layers.length === 1 && first.kind === "element" ? { only: { name: first.name } } : {}) };
}

export type InsertTarget =
  /** insertChild on the slot itself. */
  | { mode: "direct"; warning?: string }
  /** insertChild on the slot's only child (a column Stack or a Grid), at its end. */
  | { mode: "into"; name: "Stack" | "Grid" }
  /** insertChild on the slot with `wrap`: the current content and the new item go into a `<Stack gap="md">`. */
  | { mode: "wrap"; wrap: { tag: "Stack"; props: { gap: "md" } } };

/**
 * Where an insert goes (spec "InsertPicker"). An empty slot, or one whose container already spaces its children (gap md
 * or own), takes the item directly. A gap-less slot (Card, Dialog Custom, Accordion, TabPanel, Box) holding one column
 * Stack or a Grid inserts into that frame; holding anything else (one element, text, an expression, or several
 * layers), the content and the new item are wrapped in `<Stack gap="md">` (the spacing ladder's in-surface step). An
 * atom slot at its `max` still takes the item (limits warn, never block) and says so.
 */
export function insertTargetFor(slot: ContentSlot, content: SlotContentSummary): InsertTarget {
  if (slot.kind === "atom") {
    return slot.max !== undefined && content.count >= slot.max
      ? { mode: "direct", warning: `${slot.name} holds ${slot.max === 1 ? "one layer" : `${slot.max} layers`} in the component; this adds one more` }
      : { mode: "direct" };
  }
  if (slot.gap !== "none" || content.count === 0) return { mode: "direct" };
  const only = content.count === 1 ? content.only : undefined;
  if (only?.name === "Grid") return { mode: "into", name: "Grid" };
  // A row Stack is a button or tag row, not the content frame. Without its props the direction is unknown: wrap.
  if (only?.name === "Stack" && only.props && only.props.direction !== "row" && !isBound(only.props.direction)) return { mode: "into", name: "Stack" };
  return { mode: "wrap", wrap: { tag: "Stack", props: { gap: "md" } } };
}

/* ───────────── DOM ───────────── */

/**
 * The component's root element among its host nodes (the fiber's DOM nodes, portals included): the first that is or
 * contains `root`. An overlay's first host is its `<template data-zen-overlay-anchor>`; its panel is in the portal.
 */
export function slotHostRoot(component: string, hosts: readonly Element[]): Element | null {
  const selector = slotRootSelector(component);
  if (!selector) return null;
  for (const host of hosts) {
    const root = host.matches(selector) ? host : host.querySelector(selector);
    if (root) return root;
  }
  return null;
}

/** The element the slot's children render in (null: not mounted, e.g. an empty Dialog Custom or a closed overlay). */
export const slotContainer = (root: Element, slot: ContentSlot) => (slot.container === null ? root : root.querySelector(slot.container));

/** A slot's ghost anchors in order (none, one or a list). */
export const ghostAnchorsOf = (slot: ContentSlot): readonly SlotGhostAnchor[] => (!slot.ghostAnchor ? [] : "selector" in slot.ghostAnchor ? [slot.ghostAnchor] : slot.ghostAnchor);

/** Where to draw an empty slot that does not mount: the anchor element and the side. Null: use the component edge. */
export function slotGhostAnchor(root: Element, slot: ContentSlot): { element: Element; place: SlotPlace; flow?: SlotFlow } | null {
  for (const anchor of ghostAnchorsOf(slot)) {
    const element = anchor.selector === ":scope" ? root : root.querySelector(anchor.selector);
    if (element) return { element, place: anchor.place, ...(anchor.flow ? { flow: anchor.flow } : {}) };
  }
  return null;
}

/** The container's children that are slot content (the component's own `parts`, relative to the container, left out). */
export function slotContentElements(container: Element, slot: ContentSlot): Element[] {
  const parts = slot.parts ? new Set(container.querySelectorAll(slot.parts)) : null;
  return [...container.children].filter((child) => !parts?.has(child));
}
