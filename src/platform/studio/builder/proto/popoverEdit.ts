import { applyEdit, squashEdits } from "../../api";
import type { EditOp, EditResponse } from "../../types";
import { loadEngine } from "../engine";
import type { PageNode, PageTree } from "../render/renderPage";
import { getPage } from "../store/pageStore";
import type { ProtoLayer } from "./protoEdit";
import { findNode as findNodeIn, protoActionCode } from "./protoModel";
import { freePopoverId, OWN_POPOVER, openersOf, POPOVER_ROWS, POPOVER_TRIGGER, popoverItemsCode, popoverOpenedBy, popoverOverlayCode, sampleLabels, type MockList, type PopoverData } from "./popoverModel";

/*
 * Writes the Popover option (popoverModel.ts): on, a layer's On click opens a new Overlay holding a Popover with Sample
 * rows (a Chip gets its own `popoverItems`); off, the click and that Overlay go (the Overlay stays when another layer
 * opens it too); its rows are the Popover's items. Each change is one edit and one undo step, as Figma's.
 */

const ok = (response: EditResponse): response is Extract<EditResponse, { ok: true }> => response.ok;
const expression = (code: string) => ({ kind: "expression", code }) as const;

/** Joins the two writes of one gesture into one undo step. */
function joined(first: EditResponse, second: EditResponse, label: string): boolean {
  if (!ok(first)) return false;
  if (!ok(second)) return true;
  squashEdits(2, label, first.before, second.after);
  return true;
}

/** Turns the layer's popover on: Sample rows, opened by its click (`words`: the layer's words, the Overlay's name). */
export async function turnOnPopover(layer: ProtoLayer, tree: PageTree | null, words: string): Promise<boolean> {
  const items = popoverItemsCode({ kind: "sample", labels: sampleLabels(POPOVER_ROWS.start) });
  const own = OWN_POPOVER[layer.name];
  if (own) {
    // A Chip that opens a popover shows its chevron (Figma's Dropdown), unless the page says otherwise.
    const node = findNodeIn(tree, layer.loc);
    const dropdown = node && node.props.dropdown === undefined ? [{ op: "setProp", name: "dropdown", value: { kind: "boolean", value: true } } as EditOp] : [];
    const response = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [{ op: "setProp", name: own, value: expression(items) } as EditOp, ...dropdown] }, "Add popover");
    return response.ok;
  }
  if (!tree?.board) return false;
  const id = freePopoverId(tree);
  const title = `${words.trim() || layer.name} popover`;
  // The Overlay goes last on the Board, after the layer, so the layer's place in the code stays where it was.
  const added = await applyEdit({ file: layer.file, loc: tree.board.loc, name: "Board", ops: [{ op: "insertChild", code: popoverOverlayCode(id, title, items) } as EditOp] }, "Add popover");
  if (!ok(added)) return false;
  const linked = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [{ op: "setProp", name: POPOVER_TRIGGER, value: expression(protoActionCode("open", id)) } as EditOp] }, "Add popover");
  return joined(added, linked, "Add popover");
}

/** Turns it off: the click goes, and the Overlay with it when no other layer opens it. `replace`: the code the click
 *  takes instead (Prototype tab: another action), else none. */
export async function turnOffPopover(layer: ProtoLayer, node: PageNode, tree: PageTree | null, localPage: string, replace?: string, label = "Remove popover"): Promise<boolean> {
  const own = OWN_POPOVER[layer.name];
  if (own && !popoverOpenedBy(tree, node)) {
    // What a pick did goes with the rows (a Filter table on its pick); the chevron stays as written.
    const pick = node.props.onPopoverSelect !== undefined ? [{ op: "removeProp", name: "onPopoverSelect" } as EditOp] : [];
    const response = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [{ op: "removeProp", name: own } as EditOp, ...pick] }, label);
    return response.ok;
  }
  const opened = popoverOpenedBy(tree, node);
  const click = { file: layer.file, loc: layer.loc, name: layer.name, ops: [replace ? ({ op: "setProp", name: POPOVER_TRIGGER, value: expression(replace) } as EditOp) : ({ op: "removeProp", name: POPOVER_TRIGGER } as EditOp)] };
  if (!opened || openersOf(tree, opened.id) > 1) return (await applyEdit(click, label)).ok;
  const remove = async () => {
    const [engine, page] = await Promise.all([loadEngine(), getPage(localPage)]);
    if (!page) return { ok: false, code: "not-found", error: "No page" } as EditResponse;
    // A removal names the text it was read from (the server refuses it without the file's hash).
    return applyEdit({ file: layer.file, loc: opened.overlay.loc, name: "Overlay", ops: [{ op: "removeElement" } as EditOp], hash: engine.sha1(page.text) }, label);
  };
  // The later of the two in the code goes first, so the other's place stays where it was.
  const line = (loc: string) => Number(loc.split(":")[0]);
  if (line(opened.overlay.loc) > line(layer.loc)) {
    const removed = await remove();
    return ok(removed) && joined(removed, await applyEdit(click, label), label);
  }
  const unlinked = await applyEdit(click, label);
  return ok(unlinked) && joined(unlinked, await remove(), label);
}

/** Writes the popover's rows: the Popover's `items` (or a Chip's `popoverItems`). */
export async function writePopoverRows(target: ProtoLayer, data: PopoverData, list: MockList | undefined, label: string): Promise<boolean> {
  const prop = OWN_POPOVER[target.name] ?? "items";
  const response = await applyEdit({ file: target.file, loc: target.loc, name: target.name, ops: [{ op: "setProp", name: prop, value: expression(popoverItemsCode(data, list)) } as EditOp] }, label);
  return response.ok;
}
