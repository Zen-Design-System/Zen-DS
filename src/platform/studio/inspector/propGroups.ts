import type { DataSlot } from "../slots/dataSlots";
import type { FigmaPropsEntry } from "./figmaProps.generated";

/*
 * Properties grouped the way Figma's instance panel groups them (user, 2026-10-05: "Tổ chức lại theo nhóm như Figma.
 * Cái nào của nested nào. Cái nào thuộc component bị tắt boolean rồi thì không hiện"): the component's own properties
 * and its booleans first, then one group per nested layer, named as in Figma. A nested group shows only while its
 * Figma boolean is on, and a prop that does nothing in the current state (Title label without onTitleClick) hides too.
 *
 * In code a Figma boolean is usually the presence of a prop (Expand-Heading ⇔ `largeTitle`), so a boolean row switches
 * it: on writes a starting value (a text, an item through the data-slot ops, or the slot picker), off removes the prop.
 * Conditions read the rendered props, so values bound to playground state count as they render.
 *
 * Pure: type-only imports, so a node selftest (propGroups.selftest.mjs) imports it directly.
 */

/** A condition on one prop as rendered: set (not null / undefined / false / "" / an empty list), unset, a list size
 *  (an absent list counts as empty), or one of some string values. */
export type GroupCondition =
  | { prop: string; set: true }
  | { prop: string; unset: true }
  | { prop: string; minItems: number }
  | { prop: string; maxItems: number }
  | { prop: string; oneOf: readonly string[] };

export type GroupToggle = {
  /** The Figma boolean's name, the row's label. */
  label: string;
  /** The prop whose presence the boolean stands for. */
  prop: string;
  /** Shown only while these hold (Expand-Trailing sits inside Expand-Heading). */
  when?: readonly GroupCondition[];
  /**
   * What switching it on writes: a text (the first set prop of `from`, else `value`), an item through the data-slot ops
   * (a working handler, examples and templates only; `slot` absent: the component's data slot for the prop,
   * dataSlots.ts), or the content-slot picker (Control-Slot).
   */
  on: { kind: "text"; value: string; from?: readonly string[] } | { kind: "item"; slot?: DataSlot } | { kind: "slot" };
};

/** A reason shown under a prop's field while its conditions hold: the prop stays editable (Studio editing is free, user
 *  2026-10-04), the warning says why it does nothing right now. */
export type PropWarning = { when: readonly GroupCondition[]; text: string };

/** `label`: the Figma property name shown for the row (generated groups); else the prop's own label (propSchema).
 *  `options`: code value → the Figma option's name ("medium" → "Medium (Base)"), in Figma's order (generated groups). */
export type PropEntry = string | { prop: string; label?: string; options?: Readonly<Record<string, string>>; when?: readonly GroupCondition[]; warn?: readonly PropWarning[] };

export type PropGroup = {
  /** The Figma nested layer ("Top-Heading-Text"); absent for the component's own group. */
  name?: string;
  /** Figma node of the layer in the main component (documentation). */
  figma?: string;
  /** The code props it holds, in Figma order. */
  props: readonly PropEntry[];
  /** Shown only while these hold (its Figma boolean is on). */
  when?: readonly GroupCondition[];
};

export type ComponentGroups = {
  /** The Figma component (set) the groups follow. */
  figma: string;
  /** The component's own group: its Figma properties (variants), then its booleans, then the code-only props (`after`).
   *  Props no group lists land at the end. */
  own: readonly PropEntry[];
  toggles: readonly GroupToggle[];
  after: readonly PropEntry[];
  nested: readonly PropGroup[];
};

const set = (prop: string): GroupCondition => ({ prop, set: true });
const unset = (prop: string): GroupCondition => ({ prop, unset: true });

/** TopNavigation's Top-Leading as a data slot (one Back action) for its boolean: not listed in the Slots section. */
const topLeading: DataSlot = {
  component: "TopNavigation", prop: "leading", name: "Top-Leading", itemName: "Action", form: "object", max: 1,
  figma: { node: "12013:39641" },
  newItem: () => ({ code: '{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back" }) }', requires: ["toast"] }),
};

/*
 * Figma Top-Navigation/Mobile (12014:45167, 2026-10-05 read): Type, Margin; booleans Top-bar, Top-Leading,
 * Top-Heading-Text, Top-Trailing, Expand-Heading, Expand-Trailing, Control-Bar (+ Status-Bar, which the code leaves
 * to the device); nested Top-Leading (12013:39641), Top-Heading-Text (12014:44793, Type=Sub: Header, Subheading,
 * Leading), Top-Trailing (12013:39653, Trailing-Slot), Main-Heading-Text (12005:30073, Type=H1–H3), Header-Trailing
 * (12014:44753), Control-Bar › Control-Slot (12014:44764).
 */
const topNavigation: ComponentGroups = {
  figma: "12014:45167",
  // Top-bar is a prop of its own (topBar); it only matters on a screen with a large title.
  own: ["type", "margin", { prop: "topBar", when: [set("largeTitle")] }],
  toggles: [
    { label: "Top-Leading", prop: "leading", on: { kind: "item", slot: topLeading } },
    { label: "Top-Heading-Text", prop: "title", on: { kind: "text", value: "Title", from: ["largeTitle"] } },
    { label: "Top-Trailing", prop: "trailing", on: { kind: "item" } },
    { label: "Expand-Heading", prop: "largeTitle", on: { kind: "text", value: "Title", from: ["title"] } },
    { label: "Expand-Trailing", prop: "largeTitleAction", when: [set("largeTitle")], on: { kind: "item" } },
    { label: "Control-Bar", prop: "controlBar", on: { kind: "slot" } },
  ],
  // Code only: no Figma property.
  after: ["sticky", { prop: "collapsed", when: [set("largeTitle")] }, { prop: "scrollRef", when: [set("largeTitle")] }, "banner", "aria-label"],
  nested: [
    { name: "Top-Leading", figma: "12013:39641", when: [set("leading")], props: ["leading"] },
    {
      name: "Top-Heading-Text", figma: "12014:44793", when: [set("title")],
      props: ["title", "subtitle", "titleLeading", { prop: "titleLabel", when: [set("onTitleClick")] }, { prop: "headingLevel", when: [unset("largeTitle")] }],
    },
    // Grouped actions (Figma's Trailing-Icon on a Nav-Action) are each action's `group` now: drag one action onto another.
    // The deprecated `trailingGroup` stays editable, with what replaces it.
    {
      name: "Top-Trailing", figma: "12013:39653", when: [set("trailing")],
      props: [{
        prop: "trailingGroup",
        warn: [
          { when: [], text: "Deprecated: drag one action onto another (canvas or Slots) so both share a group." },
          { when: [{ prop: "type", oneOf: ["compact", "compact-alt", "compact-overlay"] }], text: "Compact types keep their Flat actions apart (Figma's Icon-Flat has no trailing icon)." },
        ],
      }, {
        // Each action's Group stays editable on the compact types (it comes back with the other types) and says why it
        // draws no pill there (user, 2026-10-05: trailing groups do not apply to Flat actions).
        prop: "trailing",
        warn: [{ when: [{ prop: "type", oneOf: ["compact", "compact-alt", "compact-overlay"] }], text: "Compact types keep their Flat actions apart: Group draws no pill here (Figma's Icon-Flat has no trailing icon)." }],
      }],
    },
    // The screen's heading level goes with the title that is the heading: the large title while there is one.
    { name: "Main-Heading-Text", figma: "12005:30073", when: [set("largeTitle")], props: ["largeTitle", { prop: "headingLevel", when: [set("largeTitle")] }] },
    { name: "Header-Trailing", figma: "12014:44753", when: [set("largeTitle"), set("largeTitleAction")], props: ["largeTitleAction"] },
    { name: "Control-Bar", figma: "12014:44764", when: [set("controlBar")], props: ["controlBar", "searchAction"] },
  ],
};

const GROUPS: Readonly<Record<string, ComponentGroups>> = { TopNavigation: topNavigation };

/** The component's Figma groups, or null (its Properties stay one list). */
export const propGroupsOf = (component: string): ComponentGroups | null => GROUPS[component] ?? null;

/** Whether a rendered value counts as set: not null / undefined / false / "", and a list with at least one item. */
export const isSetValue = (value: unknown) => value !== undefined && value !== null && value !== false && value !== "" && !(Array.isArray(value) && value.length === 0);

/** Whether every condition holds for these rendered props. */
export function holds(conditions: readonly GroupCondition[] | undefined, props: Readonly<Record<string, unknown>>): boolean {
  return (conditions ?? []).every((condition) => {
    const value = props[condition.prop];
    if ("minItems" in condition) return Array.isArray(value) && value.length >= condition.minItems;
    if ("maxItems" in condition) return (Array.isArray(value) ? value.length : 0) <= condition.maxItems;
    if ("oneOf" in condition) return typeof value === "string" && condition.oneOf.includes(value);
    return "set" in condition ? isSetValue(value) : !isSetValue(value);
  });
}

export const entryProp = (entry: PropEntry) => (typeof entry === "string" ? entry : entry.prop);
export const entryLabel = (entry: PropEntry) => (typeof entry === "string" ? undefined : entry.label);
export const entryOptions = (entry: PropEntry) => (typeof entry === "string" ? undefined : entry.options);

/**
 * A select's options with their Figma names: the options Figma has first, in Figma's order and named as in Figma, then
 * the ones only the code has, as written. `match` maps a code value onto the editor's option ("medium" → "md").
 */
export function figmaOptions(options: readonly string[], names: Readonly<Record<string, string>>, match: (value: string, options: readonly string[]) => string): { options: string[]; labels: Record<string, string> } {
  const labels: Record<string, string> = {};
  for (const [value, name] of Object.entries(names)) {
    const option = match(value, options);
    if (options.includes(option) && !(option in labels)) labels[option] = name;
  }
  const named = Object.keys(labels);
  return { options: [...named, ...options.filter((option) => !(option in labels))], labels };
}

/** Figma option name → code value (generated) as code value → name; a set's path ("Button/Main") names it by its last part. */
function optionNames(options: Readonly<Record<string, string>>, set: boolean): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [name, value] of Object.entries(options)) if (!(value in names)) names[value] = set ? name.split("/").at(-1) ?? name : name;
  return names;
}
export const entryShown = (entry: PropEntry, props: Readonly<Record<string, unknown>>) => typeof entry === "string" || holds(entry.when, props);
/** The warnings of an entry that hold for these rendered props (the field stays; the text says why it does nothing). */
export const entryWarnings = (entry: PropEntry, props: Readonly<Record<string, unknown>>): string[] =>
  typeof entry === "string" ? [] : (entry.warn ?? []).filter((warning) => holds(warning.when, props)).map((warning) => warning.text);

/** Every prop the groups place (in a nested group or the component's own list). */
export function placedProps(groups: ComponentGroups): Set<string> {
  return new Set([...groups.own.map(entryProp), ...groups.after.map(entryProp), ...groups.nested.flatMap((group) => group.props.map(entryProp))]);
}

/**
 * Groups from the Figma read (figmaProps.generated.ts, tools/studio/figma-props-build.mjs) for a component without
 * hand-written groups: its Figma properties in Figma order with Figma names, and its layer booleans as toggles (an
 * instance-swap row such as Leading-Icon-Src shows only while its boolean's prop is set, as in Figma). No nested
 * groups: those need the layer structure (hand-written, like TopNavigation's).
 */
export function groupsFromFigma(entry: FigmaPropsEntry): ComponentGroups {
  const toggled = new Set(entry.toggles.map((toggle) => toggle.prop));
  const row = (item: FigmaPropsEntry["own"][number]): PropEntry => {
    // A Yes/No variant held as a boolean is a switch: its options need no names.
    const options = item.options && !Object.values(item.options).every((value) => value === "true" || value === "false") ? optionNames(item.options, item.type === "SET") : undefined;
    return { prop: item.prop, label: item.label, ...(options ? { options } : {}), ...(toggled.has(item.prop) ? { when: [set(item.prop)] } : {}) };
  };
  // Figma's instance panel: the variants (and which set) first, then the booleans, then instance swaps and texts.
  const variant = (item: FigmaPropsEntry["own"][number]) => item.type === "VARIANT" || item.type === "SET";
  return {
    figma: entry.figma,
    own: entry.own.filter(variant).map(row),
    toggles: entry.toggles.map((toggle) => ({ label: toggle.label, prop: toggle.prop, on: toggle.on === "slot" ? { kind: "slot" } : { kind: "text", value: toggle.on } })),
    after: entry.own.filter((item) => !variant(item)).map(row),
    nested: [],
  };
}
