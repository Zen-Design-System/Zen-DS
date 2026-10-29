import api from "../../../api.generated.json";
import type { PageNode, PageTree } from "../render/renderPage";
import { actionTriggersOf, connectTrigger, DELAY_TRIGGER, findNode, HOVER_TRIGGER, isItemTrigger, itemOwnerOf } from "./protoModel";

/*
 * The events a component takes, read from the generated API docs (its `on[A-Z]…` function props). Apart from
 * protoModel.ts, which stays free of the API data so its selftest runs in Node.
 */

type ApiEntry = { name: string; extends?: string | null; props: Array<{ name: string; type: string }> };
const API: Map<string, ApiEntry> = new Map(Object.values(api as unknown as Record<string, ApiEntry[]>).flat().map((entry) => [entry.name, entry]));

/** The event props a component takes (`on[A-Z]…` functions; onClick and While hovering for one that takes the DOM
 *  element's props). A Screen takes After delay. */
export function triggersOf(name: string, written: string[]): string[] {
  if (name === "Screen") return [DELAY_TRIGGER];
  const entry = API.get(name.split(".")[0]);
  const own = (entry?.props ?? []).filter((prop) => /^on[A-Z]/.test(prop.name) && /=>|Function|Handler/.test(prop.type)).map((prop) => prop.name);
  const dom = entry?.extends && /HTMLAttributes/.test(entry.extends) ? ["onClick", HOVER_TRIGGER] : [];
  return [...new Set([...written.filter((prop) => /^on[A-Z]/.test(prop) || prop === HOVER_TRIGGER), ...dom, ...own])];
}

/** Does the component place and animate itself when it opens (it takes `open`: Dialog, SidePanel, BottomSheet…)? An
 *  Overlay holding one follows it; any other layer is placed by the Overlay's position. */
export const placesItself = (name: string) => Boolean(API.get(name.split(".")[0])?.props.some((prop) => prop.name === "open"));

/** Does it open next to the element that opens it (it takes `anchorRef`: DatePicker, Popover)? In Play it sits by the
 *  layer that opened its Overlay, as Figma's Manual overlay by its trigger. */
export const anchorsItself = (name: string) => placesItself(name) && Boolean(API.get(name.split(".")[0])?.props.some((prop) => prop.name === "anchorRef"));

/**
 * What the Prototype tab and the canvas edit for the layer at `loc`: the layer with its triggers and the one a ⊕ drag
 * writes; or, for a layer that takes no event but is one item of a choice control (a SidebarMenuItem: its Sidebar hands
 * the click over), that control with the item picked.
 */
export type ProtoSubject = { node: PageNode; triggers: string[]; trigger: string | null; item: string | null };
export function protoSubject(tree: PageTree | null, loc: string): ProtoSubject | null {
  const node = findNode(tree, loc);
  if (!node) return null;
  // Its own events, then its action objects' buttons (a Dialog's primary and secondary, a TopNavigation's Back).
  const triggers = [...triggersOf(node.name, Object.keys(node.props)), ...actionTriggersOf(node)];
  if (triggers.length) return { node, triggers, trigger: connectTrigger(node, triggers), item: null };
  const owned = itemOwnerOf(tree, node);
  if (owned) {
    const ownerTriggers = triggersOf(owned.owner.name, Object.keys(owned.owner.props));
    const trigger = connectTrigger(owned.owner, ownerTriggers);
    if (trigger && isItemTrigger(owned.owner, trigger)) return { node: owned.owner, triggers: ownerTriggers, trigger, item: owned.item };
  }
  return { node, triggers, trigger: null, item: null };
}

/** Does it take typed text (an input: Search, a text field)? Its Filter table compares by "contains". */
export const takesText = (name: string) => /\b(Input|Textarea)HTMLAttributes\b/.test(API.get(name.split(".")[0])?.extends ?? "");
