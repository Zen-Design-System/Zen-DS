import type { EditOp, EditValue, SourceAttr, SourceElement } from "../types";
import { literalOf, ownValueOf, propSpecs, valueOf, type Literal, type PropSpec, type PropValue } from "./propSchema";

/*
 * What an inspector edit of one prop writes, so a variant or boolean edit never takes a component's behaviour away
 * (user, 2026-10-05: "Các component vẫn giữ đúng behavior của nó dù có chỉnh sửa variant và bật tắt boolean"; they
 * chose "Sửa trạng thái ban đầu"). One place for every caller: DesignPanel's FieldApi and the nested-instance writes.
 *
 * 1. A prop bound to state (`checked={agree}`, SourceAttr.state: `const [agree, setAgree] = useState(false)` in the
 *    component) shows that initial state and edits it (op setStateInit): the binding, and so the toggling, stays.
 * 2. A state prop with a `defaultX` twin (Checkbox checked ↔ defaultChecked, Tabs value ↔ defaultValue …) that the
 *    source does not control writes the twin, so the component stays uncontrolled and interactive. A literal `checked`
 *    (which locks it: `checked ?? internal`) moves to `defaultChecked` on the next edit.
 * 3. A boolean switched off goes back to its default by removing the prop, unless that default is true: `={false}`
 *    would still override an automatic behaviour (TopNavigation `collapsed={false}` stops the scroll-linked fold).
 */

export type WritePlan = {
  ops: EditOp[];
  /** What the edit changes when it is not the prop itself ("the initial state of agree", "defaultChecked"). */
  note?: string;
};

const capitalise = (name: string) => `${name[0].toUpperCase()}${name.slice(1)}`;

export const toEditValue = (value: Literal): EditValue =>
  typeof value === "boolean" ? { kind: "boolean", value } : typeof value === "number" ? { kind: "number", value } : { kind: "string", value };

/** The prop's spec on the component (null: not in api.generated.json). */
const specOf = (component: string, name: string): PropSpec | null => propSpecs(component).find((spec) => spec.name === name) ?? null;

/** The `defaultX` twin of a state prop (`checked` → `defaultChecked`) when the component has both, else null. */
export function stateTwinOf(component: string, name: string): string | null {
  if (name.startsWith("default")) return null;
  const twin = `default${capitalise(name)}`;
  const names = new Set(propSpecs(component).map((spec) => spec.name));
  return names.has(name) && names.has(twin) ? twin : null;
}

/** Props hidden from the inspector list because their state prop's row edits them (`defaultChecked` under `checked`). */
export function isTwinRow(component: string, name: string): boolean {
  if (!/^default[A-Z]/.test(name)) return false;
  const base = `${name[7].toLowerCase()}${name.slice(8)}`;
  return stateTwinOf(component, base) === name;
}

/** The written attribute `name` (spreads left out). */
const attrOf = (attributes: readonly SourceAttr[], name: string) => attributes.find((attr) => attr.kind !== "spread" && attr.name === name);

/**
 * The value the inspector shows for `name`: a state binding's initial state (editable), an uncontrolled state prop's
 * twin, else what the source writes (ownValueOf).
 */
export function displayValueOf(component: string, attributes: SourceAttr[], name: string, live: Record<string, unknown> | undefined): PropValue {
  const value = ownValueOf(attributes, name, live);
  const attr = attrOf(attributes, name);
  if (value.state === "bound" && attr?.state) return { state: "literal", value: attr.state.value, raw: attr.raw };
  const twin = stateTwinOf(component, name);
  if (twin && value.state === "unset") {
    const twinValue = ownValueOf(attributes, twin, live);
    if (twinValue.state === "literal") return twinValue;
  }
  return value;
}

/** Whether an edit of `name` writes something other than the prop as written (a state initializer or a twin). */
export function writesElsewhere(component: string, attributes: SourceAttr[], name: string, live: Record<string, unknown> | undefined): boolean {
  if (attrOf(attributes, name)?.state) return true;
  const own = ownValueOf(attributes, name, live).state;
  return Boolean(stateTwinOf(component, name)) && (own === "unset" || own === "literal");
}

/** The ops that set `name` to `value` without taking the component's behaviour away (rules 1–3 above). */
export function planPropWrite(component: string, attributes: SourceAttr[], name: string, value: Literal, live?: Record<string, unknown>): WritePlan {
  const attr = attrOf(attributes, name);
  if (attr?.kind === "expression" && attr.state) {
    return attr.state.value === value ? { ops: [] } : { ops: [{ op: "setStateInit", name, value: toEditValue(value) }], note: `the initial state of ${attr.state.name}` };
  }
  const own = ownValueOf(attributes, name, live);
  const twin = stateTwinOf(component, name);
  // A literal, or a data binding given a fixed value (`checked={row.done}`): the twin takes it, so the control stays
  // uncontrolled and clickable instead of locked by `checked`.
  const dataBound = own.state === "bound" && (own.origin?.kind === "bound-value" || own.origin?.kind === "loop-bound");
  if (twin && (own.state === "unset" || own.state === "literal" || dataBound)) {
    const ops: EditOp[] = own.state === "unset" ? [] : [{ op: "removeProp", name }];
    // An unset boolean is false (Toggle documents no default for defaultChecked, and its useState starts false).
    const twinDefault = specOf(component, twin)?.defaultValue ?? (typeof value === "boolean" ? false : null);
    const twinWritten = valueOf(attributes, twin).state !== "unset";
    if (twinDefault !== null && value === twinDefault) {
      if (twinWritten) ops.push({ op: "removeProp", name: twin });
    } else ops.push({ op: "setProp", name: twin, value: toEditValue(value) });
    return { ops, note: twin };
  }
  if (value === false && specOf(component, name)?.defaultValue !== true) {
    return { ops: own.state === "unset" ? [] : [{ op: "removeProp", name }] };
  }
  // A boolean switched back on when it is on by default (TableMedia bold): the default again, so on → off → on leaves
  // the file as it was instead of a `bold` the saved file never had.
  if (value === true && specOf(component, name)?.defaultValue === true) {
    return { ops: own.state === "unset" ? [] : [{ op: "removeProp", name }] };
  }
  return { ops: [{ op: "setProp", name, value: toEditValue(value) }] };
}

/**
 * The ops of the row's reset: a state binding's initial state goes back to the prop's default (the binding stays;
 * nothing when there is no known default), a state prop drops its twin (and a locking literal), else the prop goes.
 */
export function planPropReset(component: string, attributes: SourceAttr[], name: string, live?: Record<string, unknown>): WritePlan {
  const attr = attrOf(attributes, name);
  const twin = stateTwinOf(component, name);
  if (attr?.kind === "expression" && attr.state) {
    const fallback = specOf(component, name)?.defaultValue ?? (twin ? specOf(component, twin)?.defaultValue : null) ?? (typeof attr.state.value === "boolean" ? false : null);
    return fallback === null || fallback === attr.state.value ? { ops: [] } : { ops: [{ op: "setStateInit", name, value: toEditValue(fallback) }], note: `the initial state of ${attr.state.name}` };
  }
  const own = ownValueOf(attributes, name, live);
  if (twin && (own.state === "unset" || own.state === "literal")) {
    const ops: EditOp[] = own.state === "literal" ? [{ op: "removeProp", name }] : [];
    if (valueOf(attributes, twin).state !== "unset") ops.push({ op: "removeProp", name: twin });
    return { ops, note: twin };
  }
  return { ops: own.state === "unset" ? [] : [{ op: "removeProp", name }] };
}

/**
 * The binding the saved file gives `name` when the draft replaced it with a fixed value (`status={one.online}` →
 * `status`), so the row's action puts it back instead of resetting to the default (needs GET /element's
 * savedAttributes: a drafted file on a dev server from 2026-10-05). Null otherwise.
 */
export function restorableBinding(element: SourceElement, name: string): SourceAttr | null {
  const saved = element.savedAttributes?.[name];
  if (!saved || saved.kind !== "expression" || saved.state || !saved.value) return null;
  const now = attrOf(element.attributes, name);
  return now?.kind === "expression" && now.value === saved.value ? null : saved;
}

/**
 * The next request that puts a saved binding back, read from the element as the file holds it now (one request each:
 * a slot op is sent alone): first the `defaultX` twin a fixed value wrote in the draft goes, then the saved attribute
 * returns where and as it was (op resetSlot; a playground, which refuses slot ops, gets setProp). Empty when done.
 */
export function restoreStep(component: string, element: SourceElement, name: string, saved: SourceAttr, playground: boolean): EditOp[] {
  const twin = stateTwinOf(component, name);
  if (twin && element.savedAttributes?.[twin] === null && valueOf(element.attributes, twin).state !== "unset") return [{ op: "removeProp", name: twin }];
  if (element.attributes.some((now) => now.kind !== "spread" && now.name === name && now.raw === saved.raw)) return [];
  if (!playground) return [{ op: "resetSlot", prop: name }];
  const write = savedSetProp(name, saved);
  return write ? [write] : [];
}

/** setProp's `before`: the attribute the saved file writes after this one, so a playground's write lands in place. */
const beforeOf = (saved: SourceAttr): { before?: string } => (saved.next ? { before: saved.next } : {});

/** A saved attribute as setProp writes it again (bare → true, "x", {code}); null for a spread. */
function savedValue(attr: SourceAttr): EditValue | null {
  if (attr.kind === "true") return { kind: "boolean", value: true };
  if (attr.kind === "string") return { kind: "string", value: attr.value ?? "" };
  return attr.kind === "expression" && attr.value ? { kind: "expression", code: attr.value } : null;
}

/**
 * The setProp that writes a saved attribute back as and where the saved file has it (a playground's presence switch
 * back on: its file refuses resetSlot, and a plain setProp would append it to the tag); null for a spread.
 */
export function savedSetProp(name: string, saved: SourceAttr): EditOp | null {
  const value = savedValue(saved);
  return value ? { op: "setProp", name, value, ...beforeOf(saved) } : null;
}

/** The literal a written attribute holds (bare → true, "x", {false}, {2}), or undefined for an expression. */
const attrLiteral = (attr: SourceAttr): Literal | undefined => (attr.kind === "true" ? true : attr.kind === "string" ? attr.value ?? "" : attr.kind === "expression" ? literalOf(attr.value ?? "") : undefined);

/**
 * Switching a prop back to what the saved file writes (`bold` off, then on again): the saved attribute comes back where
 * and as it was (op resetSlot {prop} on the drafted element), so the file is the saved one again instead of the same
 * value in another place. Also for a state prop's `defaultX` twin. Null when the saved file does not write that value.
 * A playground, whose file refuses slot ops, gets a setProp of the saved attribute in its saved place (savedSetProp).
 */
export function savedWrite(component: string, element: SourceElement, name: string, value: Literal, playground = false): WritePlan | null {
  const saved = element.savedAttributes;
  if (!saved) return null;
  for (const prop of [name, stateTwinOf(component, name)]) {
    const attr = prop ? saved[prop] : undefined;
    if (!prop || !attr || attrLiteral(attr) !== value) continue;
    // Already as saved: nothing to put back (the server would refuse it).
    if (element.attributes.some((now) => now.kind !== "spread" && now.name === prop && now.raw === attr.raw)) return null;
    if (!playground) return { ops: [{ op: "resetSlot", prop }] };
    const write = savedSetProp(prop, attr);
    return write ? { ops: [write] } : null;
  }
  return null;
}
