import { BREAKPOINT_LABELS, type ZenBreakpointKey } from "../../../../tools/studio/screen-devices.mjs";
import { CELL_COMPONENTS, CELL_PROPS } from "../../../../tools/studio/responsive-props.mjs";
import type { PageChild, PageNode, PageValue } from "../builder/render/renderPage";

/*
 * "Changes on this breakpoint" (docs/research/studio-responsive-breakpoints-2026-10-26.md §3.5): what Zen changes by
 * itself at the breakpoint a Screen shows, listed from the Screen's tree, so the person sees what moves before it moves.
 * One registry (BEHAVIOURS) of the system's own rules: the phone's modes, the page margins, the AppShell's structure, the
 * phone sheets, Grid columns written per breakpoint, and the components whose phone look follows the breakpoint.
 */

/** What a Screen holds and how it shows now (its view's device, else its own). */
export type BreakpointFacts = {
  breakpoint: ZenBreakpointKey;
  /** The device type it renders on, and its width in CSS px. */
  device: "phone" | "tablet" | "desktop";
  width: number;
  /** The Screen's layout: mobile (its Top / Bottom Navigation, the AppShell's content without its frame) or desktop. */
  layout: "mobile" | "desktop";
  /** Every component the Screen uses, its own props' too. */
  names: ReadonlySet<string>;
  /** The page margins its paddings take (`padding="margin-comfortable"`, `paddingX="margin-compact"`…). */
  margins: ReadonlySet<"comfortable" | "compact">;
  /** A lone root AppShell, and whether it has a phone part (Top / Bottom Navigation, ActionBar, hero, backdrop). */
  shell: { root: boolean; mobileParts: boolean };
  /** Each Grid's `columns` written per breakpoint. */
  grids: ReadonlyArray<Partial<Record<ZenBreakpointKey, number | string>>>;
  /** Stack, Grid and Box props written per breakpoint (P2): the layer, the prop, its values. */
  layoutProps: ReadonlyArray<{ layer: string; prop: string; values: Partial<Record<ZenBreakpointKey, string | number | boolean>> }>;
  /** Each Stack, Grid or Box `hideOn` list. */
  hideOn: ReadonlyArray<readonly ZenBreakpointKey[]>;
};

/** One change: a short line, and what it means (the row's tooltip). */
export type BreakpointBehaviour = { id: string; label: string; detail: string };

const literal = (value: PageValue | undefined) => (value?.kind === "literal" ? value.value : undefined);

/** Every element of `node`'s subtree, itself first, through children, element props, fragments, lists and objects. */
function eachElement(node: PageNode, visit: (node: PageNode) => void) {
  visit(node);
  const value = (entry: PageValue | undefined): void => {
    if (!entry) return;
    if (entry.kind === "element") eachElement(entry.node, visit);
    else if (entry.kind === "fragment") entry.children.forEach(child);
    else if (entry.kind === "array") entry.items.forEach(value);
    else if (entry.kind === "object") Object.values(entry.fields).forEach(value);
  };
  const child = (entry: PageChild) => {
    if (entry.kind === "element") eachElement(entry, visit);
    else if (entry.kind === "map") eachElement(entry.node, visit);
  };
  Object.values(node.props).forEach(value);
  node.children.forEach(child);
}

const MARGIN = /^margin-(comfortable|compact)$/;
/** The props Stack, Grid and Box take per breakpoint (tools/studio/responsive-props.mjs RESPONSIVE_PROPS; columns apart). */
const LAYOUT_PROPS: Record<string, string[]> = {
  Stack: ["direction", "gap", "align", "justify", "wrap", "padding", "paddingX", "paddingY"],
  Grid: ["gap", "rowGap", "columnGap", "padding"],
  Box: ["padding", "paddingX", "paddingY"],
};
const BREAKPOINT_KEYS: readonly string[] = ["desktop", "tablet", "mobile"];
const MOBILE_PARTS = ["topNavigation", "bottomNavigation", "actionBar", "hero", "backdrop"];

/** The facts of a Screen's dialect node as it shows (`shown`: its breakpoint, device, width and layout). */
export function screenFacts(screen: PageNode, shown: Pick<BreakpointFacts, "breakpoint" | "device" | "width" | "layout">): BreakpointFacts {
  const names = new Set<string>();
  const margins = new Set<"comfortable" | "compact">();
  const grids: Array<Partial<Record<ZenBreakpointKey, number | string>>> = [];
  const layoutProps: Array<{ layer: string; prop: string; values: Partial<Record<ZenBreakpointKey, string | number | boolean>> }> = [];
  const hideOn: ZenBreakpointKey[][] = [];
  const content = screen.children.filter((child) => !(child.kind === "text" && !child.value.trim()));
  const root = content.length === 1 && content[0].kind === "element" && content[0].name === "AppShell" ? content[0] : null;
  eachElement(screen, (node) => {
    if (node !== screen) names.add(node.name);
    for (const value of Object.values(node.props)) {
      const text = literal(value);
      const margin = typeof text === "string" ? MARGIN.exec(text) : null;
      if (margin) margins.add(margin[1] as "comfortable" | "compact");
    }
    // A Grid cell's span per breakpoint counts too, on every layer that takes it (responsive-props.mjs CELL_COMPONENTS).
    for (const prop of [...(LAYOUT_PROPS[node.name] ?? []), ...(CELL_COMPONENTS.includes(node.name) ? CELL_PROPS : [])]) {
      const value = node.props[prop];
      if (value?.kind !== "object") continue;
      const values = Object.fromEntries(Object.entries(value.fields).flatMap(([key, field]) => { const at = literal(field); return BREAKPOINT_KEYS.includes(key) && (typeof at === "string" || typeof at === "number" || typeof at === "boolean") ? [[key, at]] : []; }));
      if (Object.keys(values).length) layoutProps.push({ layer: node.name, prop, values });
    }
    const hide = LAYOUT_PROPS[node.name] ? node.props.hideOn : undefined;
    if (hide?.kind === "array") hideOn.push(hide.items.flatMap((item) => { const at = literal(item); return typeof at === "string" && BREAKPOINT_KEYS.includes(at) ? [at as ZenBreakpointKey] : []; }));
    const columns = node.name === "Grid" ? node.props.columns : undefined;
    if (columns?.kind === "object") {
      const keys = Object.fromEntries(Object.entries(columns.fields).flatMap(([key, field]) => {
        const at = literal(field);
        return (key === "desktop" || key === "tablet" || key === "mobile") && (typeof at === "number" || typeof at === "string") ? [[key, at]] : [];
      }));
      if (Object.keys(keys).length) grids.push(keys);
    }
  });
  return { ...shown, names, margins, shell: { root: Boolean(root), mobileParts: Boolean(root && MOBILE_PARTS.some((prop) => root.props[prop])) }, grids, layoutProps, hideOn };
}

/** A per-breakpoint value at `breakpoint`, as the library resolves it (_shared/responsive.ts resolveAt): its own key, then
 *  the wider ones, a narrower key only when no wider one is set. */
export function valueAt<T>(values: Partial<Record<ZenBreakpointKey, T>>, breakpoint: ZenBreakpointKey): T | undefined {
  const order: ZenBreakpointKey[] = breakpoint === "mobile" ? ["mobile", "tablet", "desktop"] : breakpoint === "tablet" ? ["tablet", "desktop", "mobile"] : ["desktop", "tablet", "mobile"];
  for (const key of order) if (values[key] !== undefined) return values[key];
  return undefined;
}

/** Components that open their list as a bottom sheet on a phone (_shared/phone-sheet.tsx usePhoneSheet). */
const PHONE_SHEETS = ["Select", "Menu", "Chip", "Segmented", "DateField"];
/** Components whose phone look follows the frame's breakpoint (their CSS reads [data-breakpoint="mobile"]). */
const PHONE_LOOKS: Array<[string, string]> = [
  ["Pagination", "Pagination folds its optional pages (1 … 5 … 12)"],
  ["AlertBanner", "A Medium Alert Banner puts its action on a line of its own"],
  ["DatePicker", "A two-month Date Picker stacks its months"],
  ["SidePanel", "A modal Side Panel takes the screen's width"],
  ["AiChatField", "The AI chat field hides its model picker"],
];

/** The registry: each rule says what it changes at the facts' breakpoint, or null. */
const BEHAVIOURS: Array<{ id: string; at: (facts: BreakpointFacts) => Omit<BreakpointBehaviour, "id"> | null }> = [
  { id: "phone-modes", at: (facts) => (facts.device === "phone" ? { label: "Comfortable density, Mobile typography", detail: "A phone sets these modes, as a phone app's ZenProvider does: controls grow to touch size and text takes the Mobile scale." } : null) },
  { id: "margins", at: (facts) => {
    if (facts.breakpoint !== "mobile" || !facts.margins.size) return null;
    const steps = [facts.margins.has("comfortable") ? "Comfortable 24 → 20" : null, facts.margins.has("compact") ? "Compact 20 → 16" : null].filter(Boolean).join(", ");
    return { label: `Page margins: ${steps}`, detail: "Margin Comfortable and Margin Compact are Breakpoint & Grids tokens: a phone keeps less room at the sides." };
  } },
  { id: "mobile-layout", at: (facts) => (facts.layout === "mobile" && facts.shell.root && !facts.shell.mobileParts ? { label: "Top and Bottom Navigation replace the Sidebar and header", detail: "The mobile layout shows the Screen's Top and Bottom Navigation and the AppShell's content without its frame." } : null) },
  { id: "app-shell", at: (facts) => {
    if (!facts.shell.root || facts.width >= 1024 || (facts.layout === "mobile" && !facts.shell.mobileParts)) return null;
    return facts.shell.mobileParts
      ? { label: "AppShell: phone pattern", detail: "Below 1024 the AppShell shows its Top Navigation, Bottom Navigation and ActionBar (Pattern/AppShell/Mobile)." }
      : { label: "AppShell: header with the Sidebar in a drawer", detail: "Below 1024 the AppShell leaves its desktop structure: the Sidebar opens from a menu button. Add a Top or Bottom Navigation for the phone pattern." };
  } },
  { id: "phone-sheets", at: (facts) => {
    const used = PHONE_SHEETS.filter((name) => facts.names.has(name));
    return facts.breakpoint === "mobile" && used.length ? { label: `${used.join(", ")} open as bottom sheets`, detail: "On a phone their lists open in a Bottom Sheet instead of a popover." } : null;
  } },
  { id: "grid-columns", at: (facts) => {
    if (facts.breakpoint === "desktop") return null;
    const changed = facts.grids.flatMap((values) => {
      const wide = valueAt(values, "desktop");
      const here = valueAt(values, facts.breakpoint);
      return here !== undefined && here !== wide ? [`${wide} → ${here}`] : [];
    });
    return changed.length ? { label: `Grid columns: ${changed.join(", ")}`, detail: `Grids with columns written per breakpoint show their ${BREAKPOINT_LABELS[facts.breakpoint]} value (a breakpoint without its own takes the next wider one's).` } : null;
  } },
  { id: "layout-props", at: (facts) => {
    if (facts.breakpoint === "desktop") return null;
    const changed = facts.layoutProps.flatMap(({ layer, prop, values }) => {
      const wide = valueAt(values, "desktop");
      const here = valueAt(values, facts.breakpoint);
      return here !== undefined && here !== wide ? [`${layer} ${prop} ${wide} → ${here}`] : [];
    });
    if (!changed.length) return null;
    return { label: `Layout: ${changed.slice(0, 3).join(", ")}${changed.length > 3 ? ` +${changed.length - 3}` : ""}`, detail: `Stack, Grid and Box props and a Grid cell's span written per breakpoint show their ${BREAKPOINT_LABELS[facts.breakpoint]} value (Inspector › Auto layout › Breakpoint, Grid cell).` };
  } },
  { id: "hidden-here", at: (facts) => {
    const count = facts.hideOn.filter((list) => list.includes(facts.breakpoint)).length;
    return count ? { label: `${count} ${count === 1 ? "frame" : "frames"} hidden here`, detail: `Frames set to Hide on ${BREAKPOINT_LABELS[facts.breakpoint]}: not drawn here, still in Layers (dimmed).` } : null;
  } },
  { id: "phone-looks", at: (facts) => {
    const looks = facts.breakpoint === "mobile" ? PHONE_LOOKS.filter(([name]) => facts.names.has(name)).map(([, text]) => text) : [];
    return looks.length ? { label: looks.join(" · "), detail: "These components take their phone look from the breakpoint of the frame they are in." } : null;
  } },
];

/** What Zen changes at the facts' breakpoint, in the registry's order. */
export function behavioursAt(facts: BreakpointFacts): BreakpointBehaviour[] {
  return BEHAVIOURS.flatMap(({ id, at }) => { const found = at(facts); return found ? [{ id, ...found }] : []; });
}
