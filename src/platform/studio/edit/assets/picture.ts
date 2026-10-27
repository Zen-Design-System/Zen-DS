import { applyEdit, parseSrc, studioApi } from "../../api";
import { canvasApi } from "../../canvas/viewport";
import { writeAtUse } from "../../inspector/callSite";
import { rowOf } from "../../inspector/detach";
import { inspectorStatus } from "../../inspector/status";
import { findBySrc, nameOf, srcOf, type Fiber, type FiberHit } from "../../select/picker";
import { nestedPathOf, selectedPartStore, type PartHit } from "../../select/parts";
import { overrideOps, overrideTable, withOverride } from "../../inspector/overrides";
import { cellDataTarget } from "../../table/tableCells";
import { pictureCode, resolveMedia } from "../../builder/library/media";
import { PHOTO_PROPS } from "../../inspector/propSchema";
import { repoValueFor } from "./repoMedia";
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
 * A picture a helper draws for each row (`personAvatar(people[t.assignee])`) is written in the data of the call that drew
 * it (callSite.ts `via`); a face drawn from a list prop (an AvatarStack's items[2], a ChatMessage's seenBy[0]) writes
 * that item's field (BACKLOG P1 2026-10-10).
 */

/** Layers whose picture is their `src` (propSchema.ts PHOTO_PROPS). */
export const PICTURED: ReadonlySet<string> = new Set(Object.keys(PHOTO_PROPS));

export const UPLOAD_ONLY_LOCAL = "An uploaded photo stays in this browser: on example code pick a photo from People or the Library, or drop the file from the computer";

/**
 * The picture a component draws as a nested instance (an AvatarStack's Avatar, Figma's nested Avatar/Single) when it
 * is the selected part on a page you made and its owner holds no picture of its own: that part and its layer path.
 */
export function nestedPicture(selection: NodeSelection & { part?: StudioPartRef }, given?: PartHit | null): { part: PartHit; path: string } | null {
  if (!selection.part || PICTURED.has(selection.name) || !parseSrc(selection.src)?.file.startsWith("local:")) return null;
  const part = given ?? selectedPartStore.get();
  if (!part || part.name !== selection.part.name || !PICTURED.has(part.name)) return null;
  const path = nestedPathOf(part);
  return path ? { part, path } : null;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) && !("$$typeof" in (value as object));

/** How well an item of a list prop matches the face drawn from it: its picture, its name as the face's key, its fields as the face's props. */
function itemScore(item: Record<string, unknown>, props: Record<string, unknown>, key: string | null, field: string): number {
  let score = 0;
  const picture = item[field];
  if (typeof picture === "string" && picture) score += picture === props[field] ? 3 : -10;
  else if (!props[field]) score += 1;
  if (key && Object.values(item).some((value) => value === key || (typeof value === "string" && key.startsWith(`${value}-`)))) score += 2;
  for (const [name, value] of Object.entries(item)) if (name !== field && (typeof value === "string" || typeof value === "number") && props[name] === value) score += 1;
  return score;
}

/** The faces an owner draws (the pictured fibers inside it without a source of their own), in drawing order. */
function facesOf(owner: FiberHit, name: string): Fiber[] {
  const out: Fiber[] = [];
  const visit = (fiber: Fiber | null, depth: number) => {
    for (let current = fiber; current && depth < 60; current = current.sibling) {
      if (srcOf(current) && current !== owner.fiber) continue;
      if (typeof current.type === "function" && nameOf(current) === name && !srcOf(current)) out.push(current);
      visit(current.child, depth + 1);
    }
  };
  visit(owner.fiber?.child ?? null, 0);
  return out;
}

/**
 * The item of its owner's list prop a face was drawn from (pictures inside list props, BACKLOG P1 2026-10-10): an
 * AvatarStack's `items[2]` (its layer is Avatar[2]), a ChatMessage's `seenBy[0]`, an `author`: { prop, path } with path
 * ["2", "src"] (or ["src"] for an object prop), or null when the owner holds no such item.
 */
export function itemPictureOf(part: PartHit): { prop: string; path: string[] } | null {
  const field = PHOTO_PROPS[part.name];
  if (!field || srcOf(part.fiber)) return null;
  const props = part.props;
  const key = typeof part.fiber.key === "string" ? part.fiber.key : null;
  const layerIndex = Number(/\[(\d+)\]$/.exec(nestedPathOf(part) ?? "")?.[1] ?? NaN);
  type Candidate = { prop: string; index: number | null; score: number };
  const candidates: Candidate[] = [];
  for (const [prop, value] of Object.entries(part.owner.props)) {
    if (prop.startsWith("data-zen-") || prop === "children" || prop === "overrides") continue;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (!isPlainObject(item)) return;
        // A repeated layer's own place (Avatar[2]) names its item outright.
        const score = Number.isInteger(layerIndex) ? (index === layerIndex ? 100 : -100) : itemScore(item, props, key, field);
        candidates.push({ prop, index, score });
      });
    } else if (isPlainObject(value) && (field in value || "name" in value)) {
      candidates.push({ prop, index: null, score: itemScore(value, props, key, field) });
    }
  }
  const best = Math.max(...candidates.map((candidate) => candidate.score));
  const tied = candidates.filter((candidate) => candidate.score === best && best >= 2);
  if (!tied.length) return null;
  let chosen = tied[0];
  if (tied.length > 1) {
    // Faces alike (the same photo, no name): their drawing order among the owner's faces that look the same.
    const faces = facesOf(part.owner, part.name).filter((fiber) => fiber.memoizedProps?.[field] === props[field]);
    const rank = faces.findIndex((fiber) => fiber === part.fiber || fiber === part.fiber.alternate);
    if (rank < 0 || rank >= tied.length || tied.some((candidate) => candidate.prop !== tied[0].prop)) return null;
    chosen = tied[rank];
  }
  return { prop: chosen.prop, path: chosen.index === null ? [field] : [String(chosen.index), field] };
}

/** Writes a face's picture in the item of its owner's list prop it was drawn from: where that list is written or read. */
async function writeItemPicture(selection: NodeSelection, part: PartHit, item: { prop: string; path: string[] }, value: string, label: string): Promise<boolean> {
  const at = parseSrc(selection.src);
  if (!at) return false;
  const say = (ok: boolean, error?: string) => { if (!ok) inspectorStatus.set("negative", error || "The picture was not changed"); return ok; };
  const element = await studioApi.element(at.file, at.loc);
  if (!element) return say(false, `The ${selection.name} is no longer there`);
  const attr = element.attributes.filter((candidate) => candidate.name === item.prop).at(-1);
  if (!attr || attr.kind === "spread") return say(false, `${selection.name}'s ${item.prop} is not written here; edit it in the code`);
  const source = attr.kind === "expression" ? attr.dataSource : undefined;
  const where = item.path.length > 1 ? `${item.prop}[${Number(item.path[0]) + 1}]` : item.prop;
  const next = pictureCode(source?.file ?? at.file, value);
  if (!next) return say(false, UPLOAD_ONLY_LOCAL);
  // The list is a component's prop or a helper's argument: where that is written (callSite.ts), then the item's field.
  if (source?.kind === "param") return writeAtUse(part.owner, source, next, `${selection.name} ${where} → ${label}`, item.path);
  let row: Partial<EditOp> = {};
  if (source?.kind === "cell") {
    const target = cellDataTarget(part.owner.hosts[0], at.file);
    if (!target) return say(false, "Select the picture in its table cell, so the Studio knows which row to change");
    row = target;
  } else {
    // The owner drawn by a .map (`team.map((t) => <AvatarStack items={t.members…} />)`): its row, by place and fields.
    const found = rowOf(withoutPartOf(selection));
    if (found && "reason" in found && source?.kind === "row") return say(false, found.reason);
    if (found && !("reason" in found)) row = { row: found.row, rowFields: plainProps(part.owner.props) };
  }
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "setDataField", prop: item.prop, path: item.path, ...row, value: next } as EditOp], hash: element.hash }, `${selection.name} ${where} → ${label}`);
  if (response.ok && typeof resolveMedia(value) === "string") inspectorStatus.set("positive", `${part.name} ${where} of ${selection.name} shows ${label}`);
  return say(response.ok, "error" in response ? response.error : undefined);
}

const withoutPartOf = (selection: NodeSelection): NodeSelection => { const { part: _part, ...owner } = selection as NodeSelection & { part?: StudioPartRef }; return owner; };

/** An owner's plain props (a row's fields as drawn), to find its row when a filter moved it. */
function plainProps(props: Record<string, unknown>): Record<string, string | number | boolean> | undefined {
  const out: Record<string, string | number | boolean> = {};
  for (const [name, value] of Object.entries(props)) {
    if (name.startsWith("data-zen-")) continue;
    if ((typeof value === "string" && value.length <= 200) || typeof value === "number" || typeof value === "boolean") out[name] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Puts `value` (zen-media:/zen-asset:/URL) on the selected layer; false with the reason shown when it cannot. */
export async function writePicture(selection: NodeSelection, picked: string, label: string, given?: PartHit | null): Promise<boolean> {
  const at = parseSrc(selection.src);
  if (!at) return false;
  // An upload on a repo page is saved in the repo first (repoMedia.ts): example code reads files, not this browser.
  const value = await repoValueFor(at.file, picked);
  if (typeof value !== "string") { inspectorStatus.set("negative", value.error); return false; }
  // A nested picture (core rebuild M8: an AvatarStack's Avatar): its own src, as the owner's instance overrides, the way
  // Figma overrides one nested instance's image (one undo step; the Inspector's Reset takes it back).
  const nested = nestedPicture(selection, given);
  if (nested) {
    const owner = await studioApi.element(at.file, at.loc);
    if (!owner) { inspectorStatus.set("negative", `The ${selection.name} is no longer there`); return false; }
    const table = overrideTable(nested.part.owner.props?.overrides);
    const response = await applyEdit({ file: at.file, loc: at.loc, name: owner.name, ops: overrideOps(table, withOverride(table, nested.path, "src", value)), hash: owner.hash }, `${selection.name} › ${nested.path} → ${label}`);
    if (response.ok) inspectorStatus.set("positive", `${nested.part.name} in ${selection.name} shows ${label}`);
    return response.ok || (inspectorStatus.set("negative", "error" in response ? response.error : "The picture was not changed"), false);
  }
  // A face drawn from an item of the owner's list prop (an AvatarStack's items[2]): that item's picture.
  const ref = (selection as NodeSelection & { part?: StudioPartRef }).part;
  const part = ref ? given ?? selectedPartStore.get() : null;
  const item = part && part.name === ref?.name && !PICTURED.has(selection.name) ? itemPictureOf(part) : null;
  if (part && item) return writeItemPicture(selection, part, item, value, label);
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
  // No picture of its own, drawn by a helper (personAvatar's initials branch): the photo the data gives the other branch.
  const helper = !src ? element.attributes.find((attr) => attr.kind === "expression" && attr.dataSource?.kind === "param" && attr.dataSource.helper) : undefined;
  if (helper?.kind === "expression" && helper.dataSource?.helper) {
    const next = code(at.file);
    if (!next) return say(false, UPLOAD_ONLY_LOCAL);
    return writeAtUse(hit, { kind: "param", editable: true, helper: helper.dataSource.helper, prop: "src" }, next, `${selection.name} → ${label}`);
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
  if (renders > 1 && src?.kind === "expression") return say(false, `This picture is shared by ${renders} rows: change it in the data, or in the Code tab`);
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "setProp", name: "src", value: next } as EditOp], hash: element.hash }, `${selection.name} → ${label}`);
  if (response.ok && typeof shown === "string") inspectorStatus.set("positive", `${selection.name} shows ${label}`);
  return say(response.ok, "error" in response ? response.error : undefined);
}
