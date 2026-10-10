import { applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { hitOf, instanceOf, nameOf, srcOf, type FiberHit } from "../select/picker";
import { cellDataTarget } from "../table/tableCells";
import type { DataSource, EditOp, EditValue } from "../types";
import { rowOf } from "./detach";
import { inspectorStatus } from "./status";

/*
 * A prop a component of the example passes on from its own props (data-source.mjs kind "param"): `function
 * PersonAvatar({ person, size })` draws `<Avatar size={size} theme={person.theme}>`. Figma edits the nested instance's
 * property; here it is written where that component is used, the use that renders the selected instance (read on the
 * canvas, user 2026-10-10: "không chỉnh được props avatar hoặc các nested khác trong table cell"): a fixed value there
 * (`<PersonAvatar size="sm">` → "md": every row its column draws), or the data the use reads (`person={people[row.id]}`
 * then `.theme`: that row's person, op setDataField `path`).
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

/** Writes `value` for the `source` (kind "param") of the selected instance `hit`, where its component is used. */
export async function writeAtUse(hit: FiberHit | null | undefined, source: DataSource, value: EditValue, label: string): Promise<boolean> {
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
  const path = source.path ?? [];
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
