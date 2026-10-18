import { applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { multiSelection, sourceOrder, type ExtraLayer } from "../select/multiSelection";
import { expectRender, renderedNow } from "../select/remap";
import { flushStudioStore, studioStore } from "../store";
import type { EditOp, EditValue, StudioSelection } from "../types";
import { floatingItems, type FloatingItem } from "./alignLayers";

/*
 * Layers floating in a frame without auto layout go into one floating Box that keeps each of them where it is (plan
 * docs/research/studio-figma-design-parity-2026-10-18.md F3): Figma's Frame selection (⌥⌘G) on such layers, and the
 * start of a group (⌘G). The Box sits at the box around them, sized to it; each layer's insets become its offset in the
 * Box. One op "group" (tools/studio/arrange.mjs groupPlan), one undo step; the Box is selected after it.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/** The selected layers as floating items of one block (every one floats, all in one frame), else null. */
export function floatingGroup(layers: ExtraLayer[]): FloatingItem[] | null {
  if (!layers.length) return null;
  const items = floatingItems(layers);
  if (typeof items === "string" || !items.length) return null;
  return items.every((item) => item.block === items[0].block) ? items : null;
}

/** Puts floating `items` in one floating Box with `props` (one edit) and selects it; `label` names the undo step. */
export async function boxFloating(items: FloatingItem[], props: Record<string, EditValue>, label: string, done: string): Promise<boolean> {
  const ordered = [...items].sort((a, b) => sourceOrder(a.target, b.target));
  const left = Math.min(...ordered.map((item) => item.offset.left));
  const top = Math.min(...ordered.map((item) => item.offset.top));
  const right = Math.max(...ordered.map((item) => item.offset.left + item.box.width));
  const bottom = Math.max(...ordered.map((item) => item.offset.top + item.box.height));
  const [first, ...others] = ordered;
  const at = parseSrc(first.target.src);
  if (!at) return false;
  const element = await studioApi.element(at.file, at.loc).catch(() => null);
  if (!element) { inspectorStatus.set("negative", `${first.target.name} is no longer there — select it again`); return false; }
  const kids: Record<string, { x: number; y: number }> = {};
  for (const item of ordered) {
    const loc = parseSrc(item.target.src)?.loc;
    if (loc) kids[loc] = { x: Math.round(item.offset.left - left), y: Math.round(item.offset.top - top) };
  }
  const op = {
    op: "group",
    with: others.map((item) => parseSrc(item.target.src)?.loc ?? ""),
    props,
    box: { x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) },
    kids,
  } as unknown as EditOp;
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [op], hash: element.hash }, label);
  if (!response.ok || !response.inserted) return false;
  const box: NodeSelection = { kind: "node", src: `${response.file}:${response.inserted.loc}`, name: "Box", frameId: first.target.frameId, panelId: first.target.panelId, instance: 0 };
  multiSelection.clear();
  expectRender(box, before, () => undefined, 1500);
  studioStore.setState({ selection: box });
  flushStudioStore();
  inspectorStatus.set("positive", done);
  return true;
}
