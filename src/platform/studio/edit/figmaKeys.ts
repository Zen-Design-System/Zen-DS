import { useEffect } from "react";
import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi, zoomIn, zoomOut } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { layerOfHit, multiSelection, selectLayers } from "../select/multiSelection";
import { childHits, findBySrc, isTypingTarget, parentHit, rectOf, selectHit, type FiberHit } from "../select/picker";
import { canEdit, studioStore } from "../store";
import type { EditOp, StudioSelection } from "../types";
import { stepLayer } from "./arrange";
import { textEditSession } from "./textEdit";

/*
 * Figma's canvas keys the Studio did not have (research docs/research/studio-figma-native-parity-2026-10-17.md P3; the
 * browser's own meaning of ⌘[ ⌘] and ⌘A no longer gets through on the canvas):
 *   ⌘A            select all layers of the selected layer's parent (Figma: Select all)
 *   ⌘] / ⌘[       bring forward / send backward one place (Zen: later layers paint on top, as Figma's)
 *   ⌥⌘] / ⌥⌘[     bring to front / send to back
 *   \             select the parent (as ⇧Enter)
 *   + / −         zoom in / out (no ⌘)
 *   1 … 9, 0      a shape's opacity 10 … 90 %, 100 % (two digits typed quickly: 55 %)
 *   ⌥A ⌥D ⌥W ⌥S   align a floating layer to its frame's left / right / top / bottom edge, ⌥H ⌥V its centre
 * Every change is one edit, one ⌘Z.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });

function selectedHit(selection: NodeSelection): { hit: FiberHit; frame: Element | null } | null {
  const world = canvasApi.getWorldElement();
  if (!world) return null;
  const hits = findBySrc(world, selection.src);
  const hit = hits[selection.instance] ?? hits[0];
  return hit ? { hit, frame: hit.hosts[0]?.closest("[data-studio-frame]") ?? null } : null;
}

/** ⌘A: the selected layer and every other layer of its parent. */
function selectAll(selection: NodeSelection) {
  const world = canvasApi.getWorldElement();
  const found = selectedHit(selection);
  if (!world || !found) return;
  const parent = parentHit(found.hit, found.frame);
  if (!parent) return;
  const layers = childHits(parent).filter((kid) => kid.hosts.length && rectOf(kid.hosts)).map((kid) => layerOfHit(kid, world));
  const [first, ...others] = layers;
  if (!first) return;
  selectLayers(first, others);
}

/** ⌥⌘] / ⌥⌘[: the layer to the end (front) or the start (back) of its parent's layers. */
async function toEnd(selection: NodeSelection, front: boolean) {
  const found = selectedHit(selection);
  const at = parseSrc(selection.src);
  if (!found || !at) return;
  const parent = parentHit(found.hit, found.frame);
  const parentAt = parent ? parseSrc(parent.src) : null;
  if (!parent || !parentAt || parentAt.file !== at.file) { fail("Its parent is written elsewhere: order it there"); return; }
  const siblings = childHits(parent).filter((kid) => kid.src !== selection.src);
  const edge = front ? siblings.at(-1) : siblings[0];
  const edgeAt = edge ? parseSrc(edge.src) : null;
  if (!edgeAt) return;
  const element = await studioApi.element(at.file, at.loc);
  if (!element) return;
  const op = { op: "moveTo", parent: parentAt.loc, ...(front ? { after: edgeAt.loc } : { before: edgeAt.loc }) } as EditOp;
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [op], hash: element.hash }, front ? `Bring ${selection.name} to front` : `Send ${selection.name} to back`);
  if (!response.ok) return;
  const loc = response.moved?.loc ?? response.inserted?.loc;
  if (loc) studioStore.setState({ selection: { ...selection, src: `${response.file}:${loc}` } });
}

/** A Shape's opacity: 1 … 9 → 10 … 90 %, 0 → 100 % (back to its default); two digits typed quickly → that %. */
let digits = { text: "", at: 0 };
async function setOpacity(selection: NodeSelection, key: string) {
  const now = Date.now();
  digits = now - digits.at < 500 && digits.text.length === 1 ? { text: digits.text + key, at: now } : { text: key, at: now };
  const value = digits.text.length === 2 ? Number(digits.text) || 100 : key === "0" ? 100 : Number(key) * 10;
  const at = parseSrc(selection.src);
  if (!at) return;
  const element = await studioApi.element(at.file, at.loc);
  if (!element) return;
  const ops: EditOp[] = value >= 100 ? [{ op: "removeProp", name: "opacity" }] : [{ op: "setProp", name: "opacity", value: { kind: "number", value } } as EditOp];
  await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops, hash: element.hash }, `Opacity → ${value}%`);
}

/** ⌥A ⌥D ⌥W ⌥S ⌥H ⌥V: a floating layer flush with its frame's edge (or centred), its offset written in px. */
async function align(selection: NodeSelection, edge: "left" | "right" | "top" | "bottom" | "hcenter" | "vcenter") {
  const found = selectedHit(selection);
  const host = found?.hit.hosts[0];
  const at = parseSrc(selection.src);
  if (!(host instanceof HTMLElement) || !at) return;
  if (host.dataset.position !== "absolute" || !host.matches(".zen-stack, .zen-grid, .zen-box, .zen-shape")) {
    inspectorStatus.set("neutral", "Align moves a layer in a frame without auto layout; in auto layout use the frame's Alignment");
    return;
  }
  const block = host.offsetParent instanceof HTMLElement ? host.offsetParent : null;
  if (!block) return;
  const element = await studioApi.element(at.file, at.loc);
  if (!element) return;
  const x = edge === "left" ? 0 : edge === "right" ? block.clientWidth - host.offsetWidth : edge === "hcenter" ? (block.clientWidth - host.offsetWidth) / 2 : null;
  const y = edge === "top" ? 0 : edge === "bottom" ? block.clientHeight - host.offsetHeight : edge === "vcenter" ? (block.clientHeight - host.offsetHeight) / 2 : null;
  const ops: EditOp[] = [];
  // Pinned left / top (the default) takes the offset; a layer pinned elsewhere is pinned left / top again, as Figma's
  // align writes its X / Y.
  if (x !== null) ops.push({ op: "setProp", name: "insetLeft", value: { kind: "number", value: Math.round(x) } } as EditOp, { op: "removeProp", name: "constraintX" }, { op: "removeProp", name: "insetRight" });
  if (y !== null) ops.push({ op: "setProp", name: "insetTop", value: { kind: "number", value: Math.round(y) } } as EditOp, { op: "removeProp", name: "constraintY" }, { op: "removeProp", name: "insetBottom" });
  const written = new Set(element.attributes.map((attr) => attr.name));
  const needed = ops.filter((op) => op.op !== "removeProp" || written.has((op as { name: string }).name));
  await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: needed, hash: element.hash }, `Align ${selection.name} ${edge.replace("hcenter", "horizontal centre").replace("vcenter", "vertical centre")}`);
}

const ALIGN_KEYS: Record<string, "left" | "right" | "top" | "bottom" | "hcenter" | "vcenter"> = { KeyA: "left", KeyD: "right", KeyW: "top", KeyS: "bottom", KeyH: "hcenter", KeyV: "vcenter" };

export function useFigmaKeys() {
  useEffect(() => {
    let running = false;
    const run = (task: Promise<unknown>) => { running = true; void task.finally(() => { running = false; }); };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const target = event.target instanceof Element ? event.target : null;
      const onCanvas = !target || target === document.body || target.matches(".studio-viewport");
      if (!onCanvas || isTypingTarget(target) || textEditSession.get()) return;
      const state = studioStore.getState();
      if (state.presenting || state.tool === "interact") return;
      const mod = event.metaKey || event.ctrlKey;
      // + / − without ⌘: zoom (Figma's).
      if (!mod && !event.altKey && (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_") && !(state.selection?.kind === "node" && state.selection.part)) {
        event.preventDefault();
        if (event.key === "+" || event.key === "=") zoomIn(); else zoomOut();
        return;
      }
      const selection = state.selection;
      if (selection?.kind !== "node" || selection.part || state.tool !== "select") return;
      // \: the parent (as ⇧Enter).
      if (!mod && !event.altKey && event.key === "\\") {
        const world = canvasApi.getWorldElement();
        const found = selectedHit(selection);
        const parent = found ? parentHit(found.hit, found.frame) : null;
        event.preventDefault();
        if (parent && world) { multiSelection.clear(); selectHit(parent, world); }
        else if (selection.frameId) studioStore.setState({ selection: { kind: "frame", frameId: selection.frameId } });
        return;
      }
      if (mod && !event.altKey && !event.shiftKey && event.code === "KeyA") { event.preventDefault(); selectAll(selection); return; }
      if (!canEdit(state) || running) {
        if ((mod && (event.code === "BracketRight" || event.code === "BracketLeft")) || (event.altKey && !mod && ALIGN_KEYS[event.code])) event.preventDefault();
        return;
      }
      if (mod && !event.shiftKey && (event.code === "BracketRight" || event.code === "BracketLeft")) {
        event.preventDefault();
        const front = event.code === "BracketRight";
        run(event.altKey ? toEnd(selection, front) : stepLayer(selection, front ? "next" : "prev"));
        return;
      }
      if (event.altKey && !mod && !event.shiftKey && ALIGN_KEYS[event.code]) {
        event.preventDefault();
        run(align(selection, ALIGN_KEYS[event.code]));
        return;
      }
      if (!mod && !event.altKey && !event.shiftKey && /^Digit[0-9]$/.test(event.code) && selection.name === "Shape") {
        event.preventDefault();
        run(setOpacity(selection, event.code.slice(5)));
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
