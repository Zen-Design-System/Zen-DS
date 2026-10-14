import { applyEdit, parseSrc, studioApi } from "../../api";
import { canvasApi } from "../../canvas/viewport";
import { writeAtUse } from "../../inspector/callSite";
import { rowOf } from "../../inspector/detach";
import { inspectorStatus } from "../../inspector/status";
import { findBySrc } from "../../select/picker";
import { nestedPathOf, selectedPartStore, type PartHit } from "../../select/parts";
import { overrideOps, overrideTable, withOverride } from "../../inspector/overrides";
import { cellDataTarget } from "../../table/tableCells";
import { pictureCode, resolveMedia } from "../../builder/library/media";
import { PHOTO_PROPS } from "../../inspector/propSchema";
import { rowScope } from "../../inspector/rowScope";
import type { EditOp, EditValue, StudioPartRef } from "../../types";
import type { NodeSelection } from "../arrange";

/*
 * Putting a picture on a layer, Figma's "replace image" (user, 2026-10-10: "có thể thay hình vào avatar trong mọi
 * component hệt như các example"): the Photos click, a photo dropped on the layer and the Inspector's Picture all end
 * here. The layer's `src` decides where the picture is written: a value from data (a .map row's `row.photo`, a Table
 * cell's, examples/data.ts) is written in that row's data, so only this row changes; a prop a component of the file
 * passes on (`PersonAvatar`'s person) is written where that component is used; anything else is the prop itself. The
 * value is the file's: `zen-media:` on a page you made, `new URL(…, import.meta.url).href` in the repo (media.ts).
 */

/** Layers whose picture is their `src` (propSchema.ts PHOTO_PROPS). */
export const PICTURED: ReadonlySet<string> = new Set(Object.keys(PHOTO_PROPS));

export const UPLOAD_ONLY_LOCAL = "An uploaded photo stays in this browser: on example code pick a photo from People or the Library";

/**
 * The picture a component draws as a nested instance (an AvatarStack's Avatar, Figma's nested Avatar/Single) when it
 * is the selected part on a page you made and its owner holds no picture of its own: that part and its layer path.
 */
export function nestedPicture(selection: NodeSelection & { part?: StudioPartRef }): { part: PartHit; path: string } | null {
  if (!selection.part || PICTURED.has(selection.name) || !parseSrc(selection.src)?.file.startsWith("local:")) return null;
  const part = selectedPartStore.get();
  if (!part || part.name !== selection.part.name || !PICTURED.has(part.name)) return null;
  const path = nestedPathOf(part);
  return path ? { part, path } : null;
}

/** Puts `value` (zen-media:/zen-asset:/URL) on the selected layer; false with the reason shown when it cannot. */
export async function writePicture(selection: NodeSelection, value: string, label: string): Promise<boolean> {
  const at = parseSrc(selection.src);
  if (!at) return false;
  // A nested picture (core rebuild M8: an AvatarStack's Avatar): its own src, as the owner's instance overrides, the way
  // Figma overrides one nested instance's image (one undo step; the Inspector's Reset takes it back).
  const nested = nestedPicture(selection);
  if (nested) {
    const owner = await studioApi.element(at.file, at.loc);
    if (!owner) { inspectorStatus.set("negative", `The ${selection.name} is no longer there`); return false; }
    const table = overrideTable(nested.part.owner.props?.overrides);
    const response = await applyEdit({ file: at.file, loc: at.loc, name: owner.name, ops: overrideOps(table, withOverride(table, nested.path, "src", value)), hash: owner.hash }, `${selection.name} › ${nested.path} → ${label}`);
    if (response.ok) inspectorStatus.set("positive", `${nested.part.name} in ${selection.name} shows ${label}`);
    return response.ok || (inspectorStatus.set("negative", "error" in response ? response.error : "The picture was not changed"), false);
  }
  const element = await studioApi.element(at.file, at.loc);
  if (!element) { inspectorStatus.set("negative", `The ${selection.name} is no longer there`); return false; }
  const src = element.attributes.filter((attr) => attr.name === "src").at(-1);
  const source = src?.kind === "expression" ? src.dataSource : undefined;
  const world = canvasApi.getWorldElement();
  const hit = world ? findBySrc(world, selection.src)[selection.instance] ?? null : null;
  const code = (file: string): EditValue | null => pictureCode(file, value);
  const shown = resolveMedia(value);
  const say = (ok: boolean, error?: string) => { if (!ok) inspectorStatus.set("negative", error || "The picture was not changed"); return ok; };
  // A picture read from the shared library (platformMedia in PlatformMedia.tsx) is not changed there — that would change
  // every page's photo; the layer takes the new picture as its own value instead.
  const library = source?.file?.endsWith("/PlatformMedia.tsx") ?? false;
  if (source?.editable && !library && (source.kind === "cell" || source.kind === "row" || source.kind === "data")) {
    let row: Partial<EditOp> = {};
    if (source.kind === "cell") {
      const target = cellDataTarget(hit?.hosts[0], at.file);
      if (!target) return say(false, "Select the picture in its table cell, so the Studio knows which row to change");
      row = target;
    } else if (source.kind === "row") {
      const found = rowOf(selection);
      if (!found || "reason" in found) return say(false, found && "reason" in found ? found.reason : "The Studio cannot tell which row this is; select it again on the canvas");
      row = { row: found.row };
    }
    const next = code(source.file ?? at.file);
    if (!next) return say(false, UPLOAD_ONLY_LOCAL);
    const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "setDataField", prop: "src", ...row, value: next } as EditOp], hash: element.hash }, `${selection.name} → ${label}`);
    return say(response.ok, "error" in response ? response.error : undefined);
  }
  if (source?.kind === "param") {
    const next = code(at.file);
    if (!next) return say(false, UPLOAD_ONLY_LOCAL);
    return writeAtUse(hit, source, next, `${selection.name} → ${label}`);
  }
  const next = code(at.file);
  if (!next) return say(false, UPLOAD_ONLY_LOCAL);
  // One written layer drawn for several rows (a helper builds each row's avatar): a fixed picture would show on all of
  // them, which no one drops a photo for. Say so instead of changing every row (Figma overrides one instance).
  const renders = world ? findBySrc(world, selection.src).length : 1;
  // A page you made: a picture on one row of a list (a .map) is that row's own, as one instance in Figma (op setRowProp:
  // the rows get a field, the layer reads it), unless the Design panel says "All rows".
  if (renders > 1 && at.file.startsWith("local:") && src?.kind !== "expression" && rowScope.get() === "row") {
    const found = rowOf(selection);
    if (found && !("reason" in found)) {
      const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "setRowProp", name: "src", row: found.row, value: next }], hash: element.hash }, `${selection.name} → ${label} (row ${found.row + 1})`);
      if (response.ok && typeof shown === "string") inspectorStatus.set("positive", `${selection.name} in row ${found.row + 1} shows ${label}`);
      return say(response.ok, "error" in response ? response.error : undefined);
    }
  }
  if (renders > 1 && src?.kind === "expression") return say(false, `This picture is shared by ${renders} rows (it comes from the code, not from each row's data), so one row cannot take its own. Change the person's photo in the data, or edit the code.`);
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "setProp", name: "src", value: next } as EditOp], hash: element.hash }, `${selection.name} → ${label}`);
  if (response.ok && typeof shown === "string") inspectorStatus.set("positive", `${selection.name} shows ${label}`);
  return say(response.ok, "error" in response ? response.error : undefined);
}
