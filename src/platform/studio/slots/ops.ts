import { applyEdit } from "../api";
import type { EditRequest, EditResponse, EditValue, StateDecl } from "../types";

/*
 * The slot ops of POST /__zen-studio/edit (spec "Source ops", tools/studio/slots.mjs): the only module that knows their
 * shapes. One op per request = one undo record, through the admin drafts, like every other edit.
 *
 * types.ts is on hold while other sessions edit it: its EditOp union lists the first four ops (types.slots.patch) but
 * not clearSlot / resetSlot yet (nor EditResponse their cleared / reset fields), so sendSlotEdit goes through applyEdit
 * with the single cast below. The main session adds the types (scratchpad integration/ui-notes.md) and removes the cast.
 */

/**
 * A wrapper the server puts the slot's current content and the new element in (gap-less slots, registry
 * insertTargetFor). Props are formatted like setProp values (EditValue), as tools/studio/slots.mjs reads them.
 */
export type SlotWrap = { tag?: "Stack" | "Grid" | "Box"; props?: Record<string, EditValue> };

export type InsertChildOp = {
  op: "insertChild";
  /** One JSX element (palette snippet; lines after the first indented from column 0, reindented by the server). */
  code: string;
  /** The ReactNode prop that holds the slot (`side`, `leading`); omitted: children. */
  prop?: string;
  /** Position in SourceElement.children to insert before; omitted: at the end. */
  index?: number;
  wrap?: SlotWrap;
  /** "toast": the server adds `const { toast } = useToast();` to the enclosing component and the useToast import.
   * "media": the code reads platformMedia (imported in example pages). */
  requires?: ("toast" | "media")[];
  /** The code's useState values: the server declares them in the enclosing component under fresh names. */
  state?: StateDecl[];
};
/**
 * Sent on the element itself (loc/name = the element); the server requires the file hash. `row`: the element a `.map`
 * callback returns, the row of its list this instance renders: that row goes from the list's data (answer `row`).
 */
export type RemoveElementOp = { op: "removeElement"; row?: number };
/** The element's source again right after it; the answer's `inserted.loc` is the copy. `row`: the row is copied in its data. */
export type DuplicateElementOp = { op: "duplicateElement"; row?: number };
/** Swaps the element with its previous / next element sibling in the same JSX parent; `moved.loc` is where it is now. */
/** `parent`: the element that lists a const's `{name}` shown in several places (`{summary}` in both branches): that one moves. */
/** `row`: the element a `.map` callback returns, this row of its list: it swaps with the row before / after it in the data. */
export type MoveElementOp = { op: "moveElement"; to: "prev" | "next"; parent?: string; row?: number };

/**
 * Figma's "Delete contents", sent on the slot's host: every child goes (the tag closes itself), or the `prop` attribute.
 * The server requires the file hash; refused for an empty slot and for required children or a required prop.
 */
export type ClearSlotOp = { op: "clearSlot"; prop?: string };
/**
 * Figma's "Reset slot", sent on the slot's host: the slot's content (children, or the `prop` attribute) goes back to the
 * saved file (the disk text; a draft is what differs). The server requires the file hash; refused when the slot matches
 * the saved file or the host is new since the last save.
 */
export type ResetSlotOp = { op: "resetSlot"; prop?: string };

/*
 * Data-slot items (dataSlots.ts, tools/studio/items.mjs), sent on the host: the objects of `prop` (an array literal, or
 * one object for an object prop). `index` counts the items as the array literal holds them; the server requires the hash.
 */
/**
 * Adds one object literal at `index` (omitted: last); an absent prop becomes `prop={[code]}` (`single`: `prop={code}`).
 * `list`: the prop takes one object or a list, so one object written there becomes `[object, code]`.
 */
export type InsertItemOp = { op: "insertItem"; prop: string; code: string; index?: number; single?: boolean; list?: boolean; requires?: "toast"[]; nest?: ItemNest };
/** The list is the `key` of the prop's index-th object (Sidebar `sections[n].items`); index / to count in that list. */
export type ItemNest = { index: number; key: string };
/** Removes the index-th item (the only one, or an object prop, takes the attribute with it); `all`: every item, the attribute with them. */
export type RemoveItemOp = { op: "removeItem"; prop: string; index?: number; all?: boolean; nest?: ItemNest };
/** A copy of the index-th item right after it (fresh id / value / key strings); `list` as in InsertItemOp. */
export type DuplicateItemOp = { op: "duplicateItem"; prop: string; index: number; list?: boolean; nest?: ItemNest };
/**
 * The index-th item goes to position `to`. `regroup` (items with a `group` field): "drop" = a drag (it joins the group it
 * lands inside, keeps its own beside a group-mate, else leaves it), "tidy" = an arrow move; both drop a group left with
 * one item.
 */
export type MoveItemOp = { op: "moveItem"; prop: string; index: number; to: number; regroup?: "drop" | "tidy"; nest?: ItemNest };
/** A drop onto the item at `with`: the index-th item moves beside it and both share one `group`. */
export type GroupItemOp = { op: "groupItem"; prop: string; index: number; with: number };
/** The index-th item leaves its group (it goes right after the group, its `group` field removed). */
export type UngroupItemOp = { op: "ungroupItem"; prop: string; index: number };
/** The whole list at once (one array literal; null removes the prop): Sidebar Body-Content's titles and rows, edited freely. */
export type SetItemsOp = { op: "setItems"; prop: string; code: string | null };
export type ItemEditOp = InsertItemOp | RemoveItemOp | DuplicateItemOp | MoveItemOp | GroupItemOp | UngroupItemOp | SetItemsOp;

/** Swap instance (GĐ4 M2): `code` takes the place of the element the request names; the server requires the hash. */
export type ReplaceElementOp = { op: "replaceElement"; code: string; state?: StateDecl[] };

export type SlotEditOp = InsertChildOp | RemoveElementOp | DuplicateElementOp | MoveElementOp | ClearSlotOp | ResetSlotOp | ItemEditOp | ReplaceElementOp;

/** An edit request carrying one slot op; `hash` (the file's effective text) is always sent. */
export type SlotEditRequest = Omit<EditRequest, "ops" | "hash"> & { ops: [SlotEditOp]; hash: string };

type Applied = Extract<EditResponse, { ok: true }>;
export type SlotEditApplied = Applied & {
  /** insertChild and duplicateElement: the new element's opening tag ("line:column"). */
  inserted?: { loc: string };
  /** moveElement: the moved element's opening tag now. */
  moved?: { loc: string };
  /** removeElement: the element (or the attribute that held it) went. */
  removed?: true;
  /** clearSlot: the slot is empty now. */
  cleared?: true;
  /** resetSlot: the slot holds its saved content again. */
  reset?: true;
  /** Item ops: where the item is now (removeItem: where it was). */
  item?: { prop: string; index: number };
  /**
   * removeElement / duplicateElement with `row`: the list's data changed (`file` above is the data's file). `index`: the
   * list's item, `loc`: the element's opening tag in its own `file` after the edit, `state`: a useState list.
   */
  row?: { index: number; state: boolean; loc: string; file: string };
};
export type SlotEditResponse = SlotEditApplied | Extract<EditResponse, { ok: false }>;

const LOC = /^\d+:\d+$/;

/** The location an answer reports (`inserted` or `moved`), or null when it is missing or malformed. */
export function answeredLoc(response: SlotEditApplied, field: "inserted" | "moved"): string | null {
  const loc = response[field]?.loc;
  return typeof loc === "string" && LOC.test(loc) ? loc : null;
}

/** A dev server started before the slot ops existed answers 400 "Unknown op …". */
export const isUnknownSlotOp = (error: string) => /Unknown op "(insertChild|removeElement|duplicateElement|moveElement|clearSlot|resetSlot|insertItem|removeItem|duplicateItem|moveItem|groupItem|ungroupItem)"/.test(error);

/** Sends one slot op (one undo record). The edit status line (draft / saved / error) is set by applyEdit. */
export function sendSlotEdit(request: SlotEditRequest, label: string): Promise<SlotEditResponse> {
  // The one cast while types.ts is on hold (see the header): EditOp does not list clearSlot / resetSlot yet. The answer
  // needs none: SlotEditResponse only adds optional fields.
  return applyEdit(request as unknown as EditRequest, label);
}
