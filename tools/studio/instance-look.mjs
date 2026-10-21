// An instance's own layer look on a page made in the Studio (spec docs/research/studio-instance-panel-parity-spec-
// 2026-10-21.md §2; A's re-measure K-74): Figma's Appearance on an instance (opacity, layer blend), for a Zen component.
// A page writes them as a frame does, `opacity={40}` (percent) and `blendMode="multiply"`. A page has no `style`
// (dialect.mjs), so the Studio takes them off the component's props: the canvas (renderPage) and the exported code
// (compile.mjs) put them on the component's own `style` (`style={{ opacity: 0.4, mixBlendMode: "multiply" }}`), the
// Figma push on the instance (figma-push.mjs), and the pull back (figma-pull.mjs).

/**
 * The Zen components whose `style` reaches their root element. tests/smoke/conformance.test.tsx keeps this exact: a
 * component that starts or stops forwarding it fails there. Layout primitives and Shape are not here: they have
 * `opacity` and `blendMode` of their own.
 */
export const STYLE_ON_ROOT = new Set([
  "ActionBar", "AppShell", "AppShellAccount", "AppShellAction", "AppShellHeader", "AppShellPane", "AvatarStack", "Badge",
  "BadgeCounter", "BadgeStatus", "Button", "CalendarAgenda", "CalendarAgendaItem", "CalendarDate", "CalendarDayCell", "CalendarDayTile",
  "CalendarEvent", "CalendarEventBlock", "CalendarMonth", "CalendarNowLine", "CalendarTimeGrid", "CalendarToolbar",
  "CalendarWeekStrip", "Card", "Chip", "ChipGroup", "ColorField", "ColorSwatch", "ControlBarSelectItem", "CurvePreview",
  "DashboardHeader", "DateField", "DatePickerItem", "DescriptionList", "EmptyState", "FileIcon", "Flag", "Form",
  "FormActions", "FormField", "FormFieldset", "HeadingField", "Icon", "IconButton", "InputField", "Link", "List", "ListBox",
  "ListItem", "NumberField", "PageHeader", "PaginationItem", "Popover", "PopoverBunkAction", "PopoverBunkActionDivider",
  "PopoverBunkActionGroup", "PopoverItem", "PopoverManualAddNew", "PopoverSearch", "PropertyField",
  "ScheduleDayPlanner", "ScheduleEventCard", "ScheduleHourLabel", "ScheduleItinerary", "ScheduleItineraryItem",
  "ScheduleResource", "ScheduleResourceGrid", "ScheduleSlotPicker", "Search", "SegmentedItem", "SelectField",
  "SkeletonHeading", "SkeletonShape", "SkeletonText", "Stepper", "TabItem", "Table", "Tag", "TextAreaField",
  "TimelineActivity", "TimelineGantt", "TimelineGanttBar", "TimelineGanttLabel", "TimelineItem", "TimelineMarker",
  "TimelineMilestone", "TimelineMilestones", "ToggleListItem", "TooltipSurface",
]);

/** Components the conformance test sees forwarding `style` that are no instance: their own look, or not a layer. */
export const STYLE_ON_ROOT_NOT_INSTANCES = new Set(["Box", "Stack", "Grid", "Container", "Shape", "Text", "Heading", "TextRun", "VisuallyHidden", "ZenProvider"]);

/** The look props an instance takes on a page. */
export const INSTANCE_LOOK_PROPS = ["opacity", "blendMode"];

/** Whether a page element named `name` takes an instance look (a Zen component that forwards `style`). */
export function takesInstanceLook(name) {
  return STYLE_ON_ROOT.has(String(name ?? "").split(".").pop());
}

/** The CSS of an instance look: `opacity` 0–100 → 0–1, `blendMode` → mix-blend-mode; null when it is Figma's default. */
export function instanceLookStyle({ opacity, blendMode } = {}) {
  const style = {};
  if (typeof opacity === "number" && Number.isFinite(opacity) && opacity < 100) style.opacity = Math.round(Math.max(0, opacity)) / 100;
  if (typeof blendMode === "string" && blendMode && blendMode !== "pass-through") style.mixBlendMode = blendMode;
  return Object.keys(style).length ? style : null;
}

/** `style={{ … }}` as code: the object literal's source. */
export function instanceLookCode(style) {
  return `{ ${Object.entries(style).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(", ")} }`;
}
