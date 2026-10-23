import { Fragment, isValidElement } from "react";
import { applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { hitOf, instanceOf, nameOf, srcOf, type Fiber, type FiberHit } from "../select/picker";
import { cellDataTarget } from "../table/tableCells";
import type { DataSource, EditOp, EditValue, ViaField, ViaHolder } from "../types";
import { rowOf } from "./detach";
import { inspectorStatus } from "./status";

/*
 * A prop a component of the example passes on from its own props (data-source.mjs kind "param"): `function
 * PersonAvatar({ person, size })` draws `<Avatar size={size} theme={person.theme}>`. Figma edits the nested instance's
 * property; here it is written where that component is used, the use that renders the selected instance (read on the
 * canvas, user 2026-10-10: "không chỉnh được props avatar hoặc các nested khác trong table cell"): a fixed value there
 * (`<PersonAvatar size="sm">` → "md": every row its column draws), or the data the use reads (`person={people[row.id]}`
 * then `.theme`: that row's person, op setDataField `path`).
 *
 * A value a helper function builds from its argument (kind "param" with `helper`, BACKLOG P1 2026-10-10): the sidebar
 * example's `personAvatar(people[t.assignee])` in rows `taskRow(t)` builds and a RowCard draws. No fiber marks the call,
 * so the canvas names it by where React holds the instance: the annotated elements above it whose props hold its element
 * (RowCard's `rows[3].leading`), with the plain fields of each object on the way; the dev server follows that place
 * through the code to the call and its row (data-source.mjs `via`), and writes the data the call reads (people.alex.photo).
 */

/** The use of `component` that renders `hit`: the nearest annotated element of that name above it. */
function useOf(hit: FiberHit, component: string): FiberHit | null {
  for (let fiber = hit.fiber?.return ?? null, guard = 0; fiber && guard < 400; fiber = fiber.return, guard++) {
    if (typeof fiber.type === "function" && nameOf(fiber) === component && srcOf(fiber)) return hitOf(fiber);
  }
  return null;
}

/** Where a data edit of the use finds its row (a Table cell's, a .map row's), or {} for data read by path. */
function rowTarget(use: FiberHit, source: DataSource, file: string): Partial<EditOp> | null {
  if (source.kind === "cell") return cellDataTarget(use.hosts[0], file);
  if (source.kind !== "row") return {};
  const world = canvasApi.getWorldElement();
  const at = parseSrc(use.src);
  const row = world && at ? rowOf({ kind: "node", src: use.src, name: use.name, instance: instanceOf(world, use), frameId: null, panelId: null }) : null;
  return row && "row" in row ? { row: row.row } : null;
}

const SRC_PREFIX = "data-zen-";

/** An object's plain fields (strings, numbers, booleans), and an element's key: what finds its row in the data. */
function plainFields(value: unknown, key?: string | null): Record<string, ViaField> | undefined {
  if (!value || typeof value !== "object") return key ? { key } : undefined;
  const out: Record<string, ViaField> = {};
  let count = 0;
  for (const [name, field] of Object.entries(value as Record<string, unknown>)) {
    if (count >= 16 || name.startsWith(SRC_PREFIX)) continue;
    if ((typeof field === "string" && field.length <= 200) || typeof field === "number" || typeof field === "boolean") { out[name] = field; count += 1; }
  }
  if (key) out.key = key;
  return count || key ? out : undefined;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || isValidElement(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/** Where `value` (a holder's props) holds one of `targets`' elements (by their props object): the steps and which one. */
function heldIn(value: unknown, targets: Map<object, number>, depth = 0): { path: ViaHolder["path"]; holds: number } | null {
  if (!value || typeof value !== "object" || depth > 7) return null;
  if (isValidElement(value)) {
    const props = value.props as object;
    const holds = targets.get(props);
    if (holds !== undefined) return { path: [], holds };
    // A fragment is transparent: `<>…{taskList(…)}</>` holds its children.
    if (value.type === Fragment) {
      const inner = heldIn((props as { children?: unknown }).children, targets, depth + 1);
      return inner ? { path: ["children", ...inner.path], holds: inner.holds } : null;
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < Math.min(value.length, 500); index++) {
      const inner = heldIn(value[index], targets, depth + 1);
      const item = value[index];
      if (inner) return { path: [{ index, fields: isValidElement(item) ? plainFields(item.props, item.key) : plainFields(item) }, ...inner.path], holds: inner.holds };
    }
    return null;
  }
  if (!isPlainObject(value)) return null;
  for (const [name, field] of Object.entries(value).slice(0, 80)) {
    if (name.startsWith(SRC_PREFIX)) continue;
    const inner = heldIn(field, targets, depth + 1);
    if (inner) return { path: [name, ...inner.path], holds: inner.holds };
  }
  return null;
}

/**
 * The annotated elements of the instance's file above `hit` that hold it in their props, nearest first (op
 * setDataField `via`): each with the prop and steps to it, its own .map row and plain props, and `holds` when it holds a
 * nearer holder instead (an element a helper returns).
 */
export function viaOf(hit: FiberHit): ViaHolder[] {
  const at = parseSrc(hit.src);
  const world = canvasApi.getWorldElement();
  if (!at || !hit.fiber) return [];
  const targets = new Map<object, number>();
  for (const fiber of [hit.fiber, hit.fiber.alternate]) if (fiber?.memoizedProps) targets.set(fiber.memoizedProps, -1);
  if (hit.props) targets.set(hit.props, -1);
  const via: ViaHolder[] = [];
  for (let fiber: Fiber | null = hit.fiber.return, guard = 0; fiber && guard < 800 && via.length < 10; fiber = fiber.return, guard++) {
    const src = srcOf(fiber);
    const holder = src ? parseSrc(src) : null;
    if (!src || !holder || src === hit.src || holder.file !== at.file || !fiber.memoizedProps || targets.has(fiber.memoizedProps)) continue;
    const found = heldIn(fiber.memoizedProps, targets);
    if (!found || typeof found.path[0] !== "string") continue;
    const [prop, ...path] = found.path as [string, ...ViaHolder["path"]];
    const own = hitOf(fiber);
    const row = own && world ? rowOf({ kind: "node", src: own.src, name: own.name, instance: instanceOf(world, own), frameId: null, panelId: null }) : null;
    via.push({ loc: holder.loc, prop, path, ...(row && "row" in row ? { row: row.row } : {}), ...(plainFields(fiber.memoizedProps, fiber.key) ? { fields: plainFields(fiber.memoizedProps, fiber.key) } : {}), ...(found.holds >= 0 ? { holds: found.holds } : {}) });
    targets.set(fiber.memoizedProps, via.length - 1);
    if (fiber.alternate?.memoizedProps) targets.set(fiber.alternate.memoizedProps, via.length - 1);
  }
  return via;
}

/** A helper's value (kind "param" with `helper`): op setDataField on the instance's own element, through `via`. */
async function writeThroughHelper(hit: FiberHit | null | undefined, source: DataSource, value: EditValue, label: string, extra: string[]): Promise<boolean> {
  const at = hit ? parseSrc(hit.src) : null;
  const via = hit ? viaOf(hit) : [];
  if (!hit || !at || !via.length) {
    inspectorStatus.set("negative", `This value comes from the data ${source.helper ?? "a helper"}(…) is given; select the layer on the canvas`);
    return false;
  }
  const element = await studioApi.element(at.file, at.loc);
  if (!element) return false;
  const target = typeof source.child === "number" ? { child: source.child } : { prop: source.prop };
  const response = await applyEdit({ file: element.file, loc: element.loc, name: element.name, ops: [{ op: "setDataField", ...target, ...(extra.length ? { path: extra } : {}), via, value } as EditOp], hash: element.hash }, label);
  if (!response.ok) inspectorStatus.set("negative", ("error" in response && response.error) || "Not saved");
  return response.ok;
}

/**
 * Writes `value` for the `source` (kind "param") of the selected instance `hit`, where its component is used, or —
 * read by a helper — in the data of the call that drew it. `extra`: fields further inside the value (an item's `src`).
 */
export async function writeAtUse(hit: FiberHit | null | undefined, source: DataSource, value: EditValue, label: string, extra: string[] = []): Promise<boolean> {
  if (source.helper) return writeThroughHelper(hit, source, value, label, extra);
  const component = source.component;
  const prop = source.prop;
  const use = hit && component ? useOf(hit, component) : null;
  const at = use ? parseSrc(use.src) : null;
  if (!use || !at || !prop) {
    inspectorStatus.set("negative", `Its value comes from where <${component ?? "the component"}> is used; select it on the canvas`);
    return false;
  }
  const element = await studioApi.element(at.file, at.loc);
  if (!element) return false;
  const attr = element.attributes.filter((candidate) => candidate.name === prop).at(-1);
  const path = [...(source.path ?? []), ...extra];
  let ops: EditOp[];
  // The value the use reads is data the server follows (the whole `person` is a factory call, its `.theme` a literal:
  // with a `path` the server decides).
  const data = attr?.kind === "expression" && attr.dataSource && (attr.dataSource.editable || (path.length > 0 && ["row", "cell", "data"].includes(attr.dataSource.kind)));
  if (attr && data && attr.dataSource) {
    // The use reads data (`person={people[row.id]}`): that data, in this instance's row.
    const row = rowTarget(use, attr.dataSource, element.file);
    if (!row) {
      inspectorStatus.set("negative", `<${component}> renders in several places, so the row to edit is unclear; edit the data in code`);
      return false;
    }
    ops = [{ op: "setDataField", prop, ...(path.length ? { path } : {}), ...row, value } as EditOp];
  } else if (!path.length && attr?.kind !== "expression" && attr?.kind !== "spread") {
    // Written as a literal there (or not at all): the use's own prop.
    ops = [{ op: "setProp", name: prop, value }];
  } else {
    const why = attr?.dataSource?.reason ?? "it is computed in the code";
    inspectorStatus.set("negative", `<${component} ${prop}={${attr?.value ?? "…"}}>: ${why}`);
    return false;
  }
  const response = await applyEdit({ file: element.file, loc: element.loc, name: element.name, ops, hash: element.hash }, `${label} (at <${component}>)`);
  if (!response.ok) inspectorStatus.set("negative", ("error" in response && response.error) || "Not saved");
  return response.ok;
}
