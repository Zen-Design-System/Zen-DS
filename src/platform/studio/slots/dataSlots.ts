/*
 * Zen Studio data slots: Figma slots whose content the code takes as data, not JSX. TopNavigation's Top-Trailing holds
 * Figma's Trailing-Slot (Action instances); the code writes `trailing={[{ icon, label, onClick }]}`, so its items are
 * objects added, removed, duplicated and reordered by the server's item ops (tools/studio/items.mjs), and each one is
 * edited field by field (ObjectProperties, op setField). User, 2026-10-04: "trailing của top navigation là slot cho
 * phép thay đổi và thêm bớt element" → the data slot approach.
 *
 * Pure: no React, type-only imports, so a node selftest can import it directly.
 */

export type DataSlot = {
  /** The component that owns the slot (its display name). */
  component: string;
  /** The prop the items are written in. */
  prop: string;
  /** The Figma name the inspector shows ("Top-Trailing": the instance that holds Figma's Trailing-Slot). */
  name: string;
  /** What one item is called ("Action": Figma's instance in the slot). */
  itemName: string;
  /**
   * `array`: a list of objects; `object`: one object (the slot holds one item, removing it removes the prop); `list`: one
   * object or a list of them (the component takes either): adding beside the one object turns it into a list.
   */
  form: "array" | "object" | "list";
  /** Most items the component renders (more warn; they never block). */
  max: number;
  /**
   * Most items the guidelines advise when the component draws them all (`max` Infinity): more warn (the harness's
   * count rule) but every one shows. Unset: `max` warns.
   */
  advised?: number;
  /** Why more than `max` are not drawn (or more than `advised` are not advised), for the warning. */
  maxNote?: string;
  figma?: { node: string };
  /**
   * Items take a `group` field: next to each other with one group they share one pill (TopNavigation `trailing`, Figma's
   * Nav-Action with a trailing icon). The Studio then groups by drop, ungroups by drag out, and lists groups together.
   * A function tests the owner's rendered props, for a component that draws groups in some states only (read it with
   * `slotGroups`).
   */
  groups?: boolean | ((props: Record<string, unknown>) => boolean);
  /** Why the items do not group in the owner's current state (`groups` false for its props): the notes and refusals. */
  groupsOffNote?: string;
  /** The code of a new item: one object literal (its handler calls toast, so `requires: ["toast"]`). */
  newItem: (count: number) => { code: string; requires?: ("toast")[] };
};

/** A Figma Nav-Action: an icon-only action with a working handler (examples never lock interactions). */
const navAction = (label: string, icon: string) => ({
  code: `{ icon: "${icon}", label: "${label}", onClick: () => toast({ title: "${label}" }) }`,
  requires: ["toast" as const],
});

/** An id from the label and the item's place (`activity-4`): readable, and apart from ids the code already wrote. */
const idFor = (label: string, count: number) => `${label.toLowerCase()}-${count + 1}`;
/** A new item of an id + label list (Breadcrumbs, Tabs, Segmented, Popover; Stepper's `title`): real copy in turn. */
const plainItem = (count: number, labels: readonly string[], key = "label") => {
  const label = labels[Math.min(count, labels.length - 1)];
  return { code: `{ id: "${idFor(label, count)}", ${key}: "${label}" }` };
};
/** A new item that needs an icon (Bottom Navigation, Bottom Sheet actions). */
const iconItem = (count: number, items: ReadonlyArray<readonly [string, string]>) => {
  const [label, icon] = items[Math.min(count, items.length - 1)];
  return { code: `{ id: "${idFor(label, count)}", label: "${label}", icon: "${icon}" }` };
};

/** New trailing actions in turn: a label that says what its icon does. */
const NAV_ACTIONS: ReadonlyArray<readonly [string, string]> = [["Favourite", "icon-star-01-line"], ["Share", "icon-share-01-line"], ["More", "icon-dots-horizontal-line"]];

/* Figma: the live file 9nZv4uW2LT21yuHabMTCh1, Top-Navigation/Mobile 12014:45167 (2026-10-04 scan, re-read 2026-10-05):
 * Navigator-bar › Top-Trailing (12013:39653) › Trailing-Slot › Action; Expand-Heading › Header-Trailing (12014:44753) ›
 * Trailing-Slot › Action. Both are `.Primitives/Mobile/Top-Navigation/Trailling` (12013:39571), whose Trailing-Slot takes
 * 3 (maxChildren). Code: TopNavigation.tsx draws MAX_ACTIONS = 3 (a root's largeTitleAction joins them first). User,
 * 2026-10-05: "Cả hai tối đa 3 như Figma". */
export const DATA_SLOTS: Readonly<Record<string, readonly DataSlot[]>> = {
  TopNavigation: [
    {
      component: "TopNavigation", prop: "trailing", name: "Top-Trailing", itemName: "Action", form: "array", max: 3,
      // The compact types draw Nav-Action/Flat, which never pairs (Figma's Icon-Flat has no trailing icon; the component
      // ignores `group` there). User, 2026-10-05: "Behavior action trailing group không áp dụng cho action dạng flat".
      groups: (props) => !String(props.type ?? "default").startsWith("compact"),
      groupsOffNote: "Compact types keep their Flat actions apart (Figma's Icon-Flat has no trailing icon)",
      maxNote: "the bar draws three places, a group counting as one (on a root, the large title's actions take the first places)",
      figma: { node: "12013:39653" },
      newItem: (count) => navAction(...NAV_ACTIONS[Math.min(count, NAV_ACTIONS.length - 1)]),
    },
    {
      component: "TopNavigation", prop: "largeTitleAction", name: "Header-Trailing", itemName: "Action", form: "list", max: 3,
      maxNote: "Header-Trailing draws three actions (on a root they also lead the folded bar, which draws three in all)",
      figma: { node: "12014:44753" },
      newItem: (count) => (count === 0 ? navAction("New", "icon-plus-line") : navAction(...NAV_ACTIONS[Math.min(count - 1, NAV_ACTIONS.length - 1)])),
    },
  ],
  /* Figma SLOT properties (docs/figma-contracts/component-properties.json, read 2026-10-05) whose code takes the items as
   * data (2026-10-08): Breadcrumbs Item-List 4031:20161, Tab-Bar Item-List 1577:5477, Segmented Item-List 1238:892,
   * Stepper-Bar Items 1625:8328, Bottom-Navigation Nav-Items 4060:26671, Bottom-Sheet Items 4059:14161, Description List
   * Items 14859:79180 and Popover/Default Item-List 4031:26126. Limits are the usage harness's (tabs/item-count,
   * segmented/option-count, stepper/step-count, bottom-navigation/destinations); the others draw every item. Their
   * items carry no handler (the owner's onValueChange / onSelect / onNavigate answers), so no toast is needed. */
  Breadcrumbs: [{
    component: "Breadcrumbs", prop: "items", name: "Item-List", itemName: "Item", form: "array", max: Number.POSITIVE_INFINITY, figma: { node: "4031:20161" },
    newItem: (count) => plainItem(count, ["Reports", "Q3", "Summary"]),
  }],
  Tabs: [{
    component: "Tabs", prop: "items", name: "Item-List", itemName: "Tab", form: "array", max: Number.POSITIVE_INFINITY, advised: 7, maxNote: "Tabs hold 2–7 items (more: a Sidebar or a SelectField)", figma: { node: "1577:5477" },
    newItem: (count) => plainItem(count, ["Activity", "Members", "Settings"]),
  }],
  Segmented: [{
    component: "Segmented", prop: "options", name: "Item-List", itemName: "Segment", form: "array", max: Number.POSITIVE_INFINITY, advised: 5, maxNote: "Segmented holds 2–5 options (more: Tabs or a SelectField)", figma: { node: "1238:892" },
    newItem: (count) => plainItem(count, ["Week", "Month", "Year"]),
  }],
  Stepper: [{
    component: "Stepper", prop: "steps", name: "Items", itemName: "Step", form: "array", max: Number.POSITIVE_INFINITY, advised: 7, maxNote: "a Stepper holds 2–7 steps (more needs grouping)", figma: { node: "1625:8328" },
    newItem: (count) => plainItem(count, ["Review", "Payment", "Confirm"], "title"),
  }],
  BottomNavigation: [{
    component: "BottomNavigation", prop: "items", name: "Nav-Items", itemName: "Nav-Item", form: "array", max: Number.POSITIVE_INFINITY, advised: 5, maxNote: "a Bottom Navigation holds 3–5 root destinations", figma: { node: "4060:26671" },
    newItem: (count) => iconItem(count, [["Alerts", "icon-bell-01-line"], ["Settings", "icon-settings-01-line"], ["Home", "icon-home-02-line"]]),
  }],
  BottomSheet: [{
    component: "BottomSheet", prop: "items", name: "Items", itemName: "Action", form: "array", max: Number.POSITIVE_INFINITY, figma: { node: "4059:14161" },
    newItem: (count) => iconItem(count, [["Share", "icon-share-01-line"], ["Archive", "icon-archive-line"], ["Settings", "icon-settings-01-line"]]),
  }],
  DescriptionList: [{
    component: "DescriptionList", prop: "items", name: "Items", itemName: "Item", form: "array", max: Number.POSITIVE_INFINITY, figma: { node: "14859:79180" },
    newItem: (count) => ({ code: `{ term: "${["Owner", "Due", "Status"][Math.min(count, 2)]}", description: "${["Bao Nguyen", "Oct 14", "In review"][Math.min(count, 2)]}" }` }),
  }],
  Popover: [{
    component: "Popover", prop: "items", name: "Item-List", itemName: "Item", form: "array", max: Number.POSITIVE_INFINITY, figma: { node: "4031:26126" },
    newItem: (count) => plainItem(count, ["Rename", "Duplicate", "Archive"]),
  }],
};

/** Whether the slot's items group for the owner's rendered props (props unknown: the component's default state groups). */
export function slotGroups(slot: DataSlot, props: Record<string, unknown> | null | undefined): boolean {
  if (typeof slot.groups === "function") return props ? slot.groups(props) : true;
  return Boolean(slot.groups);
}

/** The component's data slots, in the order the inspector lists them (none: an empty list). */
export const dataSlotsOf = (component: string): readonly DataSlot[] => DATA_SLOTS[component] ?? [];

/** One data slot by component and prop. */
export const dataSlotOf = (component: string, prop: string): DataSlot | null => dataSlotsOf(component).find((slot) => slot.prop === prop) ?? null;

/** The item's `group` as written: the name, null for none, undefined when the code computes it. */
export function itemGroup(fields: ReadonlyArray<{ key: string; kind: string; value: unknown }>): string | null | undefined {
  const field = [...fields].reverse().find((candidate) => candidate.key === "group");
  if (!field) return null;
  return field.kind === "string" && typeof field.value === "string" ? field.value : undefined;
}

/**
 * The items as places, Figma Trailing-Slot style: each run of items next to each other with one written group is one
 * place (a pill), every other item a place of its own. `first`/`last` are item positions; `group` the run's name.
 */
export function groupRuns(items: ReadonlyArray<{ fields: ReadonlyArray<{ key: string; kind: string; value: unknown }> }>): Array<{ first: number; last: number; group: string | null }> {
  const runs: Array<{ first: number; last: number; group: string | null }> = [];
  items.forEach((item, index) => {
    const group = itemGroup(item.fields) ?? null;
    const last = runs[runs.length - 1];
    if (group !== null && last?.group === group && last.last === index - 1) last.last = index;
    else runs.push({ first: index, last: index, group });
  });
  return runs;
}

/** The item's own name in a row or a status: its label / title / name when written as text, else "{Action} {n}". */
export function itemTitle(slot: DataSlot, fields: ReadonlyArray<{ key: string; kind: string; value: unknown }>, index: number): string {
  for (const key of ["label", "title", "name"]) {
    const field = fields.find((candidate) => candidate.key === key);
    if (field?.kind === "string" && typeof field.value === "string" && field.value.trim()) return field.value.trim();
  }
  return `${slot.itemName} ${index + 1}`;
}
