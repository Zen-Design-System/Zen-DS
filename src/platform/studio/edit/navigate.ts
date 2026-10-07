import { useEffect } from "react";
import { canvasApi } from "../canvas/viewport";
import { childHits, findBySrc, parentHit, rectOf, selectHit, type FiberHit } from "../select/picker";
import { multiSelection } from "../select/multiSelection";
import { withoutPart } from "../select/parts";
import { studioStore } from "../store";
import { textEditSession } from "./textEdit";

/*
 * Layer navigation keys, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 4): Tab / ⇧Tab select
 * the next / previous sibling (round the parent's layers), ⇧Enter the parent (Esc does too; Enter goes in, as before).
 * Only while the canvas itself has focus and a layer is selected; otherwise Tab moves focus as usual.
 */

function selectedHit(): { hit: FiberHit; frame: Element | null } | null {
  const selection = studioStore.getState().selection;
  const world = canvasApi.getWorldElement();
  if (selection?.kind !== "node" || !world) return null;
  const hits = findBySrc(world, selection.src);
  const hit = hits[selection.instance] ?? hits[0];
  if (!hit) return null;
  return { hit, frame: hit.hosts[0]?.closest("[data-studio-frame]") ?? null };
}

function reveal(hit: FiberHit) {
  const rect = rectOf(hit.hosts);
  if (rect) canvasApi.ensureVisible(rect);
}

/** The sibling `step` places away among the parent's layers that render (wrapping round). */
function sibling(step: 1 | -1): FiberHit | null {
  const found = selectedHit();
  if (!found) return null;
  const parent = parentHit(found.hit, found.frame);
  if (!parent) return null;
  const siblings = childHits(parent).filter((kid) => kid.hosts.length && rectOf(kid.hosts));
  const at = siblings.findIndex((kid) => kid.hosts[0] === found.hit.hosts[0]);
  if (at < 0 || siblings.length < 2) return null;
  return siblings[(at + step + siblings.length) % siblings.length];
}

export function useNavigateKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      const tab = event.key === "Tab";
      const up = event.key === "Enter" && event.shiftKey;
      if (!tab && !up) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target && target !== document.body && !target.matches(".studio-viewport")) return;
      const state = studioStore.getState();
      const selection = state.selection;
      if (state.tool !== "select" || state.presenting || selection?.kind !== "node" || textEditSession.get()) return;
      const world = canvasApi.getWorldElement();
      if (up) {
        event.preventDefault();
        event.stopPropagation();
        multiSelection.clear();
        // A part → its owner; a layer → the layer around it (the frame at the top, as Esc does).
        if (selection.part) { studioStore.setState({ selection: withoutPart(selection) }); return; }
        const found = selectedHit();
        const parent = found ? parentHit(found.hit, found.frame) : null;
        if (parent && world) { selectHit(parent, world); reveal(parent); }
        else if (selection.frameId) studioStore.setState({ selection: { kind: "frame", frameId: selection.frameId } });
        return;
      }
      if (selection.part) return;
      const next = sibling(event.shiftKey ? -1 : 1);
      if (!next || !world) return;
      event.preventDefault();
      event.stopPropagation();
      multiSelection.clear();
      selectHit(next, world);
      reveal(next);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
