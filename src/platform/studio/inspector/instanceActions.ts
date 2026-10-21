import { pageLabels } from "../../PlatformApp";
import type { PlatformPage } from "../../PlatformExamples";
import { zoomToFrame } from "../board/presentFrame";
import { navigate } from "../shell/navigation";
import { studioStore } from "../store";
import type { StudioSelection } from "../types";
import { componentSlug, nodeKind } from "./propSchema";
import { inspectorStatus } from "./status";

/*
 * Figma's instance items in the layer menu for a Zen component (spec docs/research/studio-instance-panel-parity-spec-
 * 2026-10-21.md §1; A's re-measure K-70): Go to main component and Reset all changes.
 * - Reset all changes is the Design panel's header reset (resetAll.ts): the panel publishes it for the layer it shows,
 *   so the menu runs the same request (one ⌘Z) and both agree on what counts as a change.
 * - Go to main component opens the component's Studio page on its Main component frame, as Figma opens the main in the
 *   library file.
 */

type NodeRef = Extract<StudioSelection, { kind: "node" }>;

/** What the Design panel can do for the instance it shows. */
export type InstanceActions = {
  src: string;
  instance: number;
  /** Changed design props the reset takes back (the instance's and its nested instances'). */
  changes: number;
  reset: () => void;
};

let published: InstanceActions | null = null;
let version = 0;
const listeners = new Set<() => void>();

/** The Design panel publishes its instance's actions while it shows it; null when it stops. */
export function publishInstanceActions(next: InstanceActions | null, from?: { src: string; instance: number }) {
  // A panel unmounting clears only what it published (the next selection's panel may have published already).
  if (!next && from && published && (published.src !== from.src || published.instance !== from.instance)) return;
  const changed = (published?.src ?? null) !== (next?.src ?? null) || published?.instance !== next?.instance || published?.changes !== next?.changes;
  published = next;
  // The panel republishes on every render; listeners hear only a different layer or count.
  if (!changed) return;
  version += 1;
  listeners.forEach((listener) => listener());
}

/** The actions for `selection`, when the Design panel shows it. */
export function instanceActionsFor(selection: NodeRef): InstanceActions | null {
  return published && published.src === selection.src && published.instance === selection.instance ? published : null;
}

/** The menu re-renders when the panel publishes (it opens on the same click that selects the layer). */
export const subscribeInstanceActions = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const instanceActionsVersion = () => version;

/** The Studio page of a Zen component (its docs page), or null for a layer that is none. */
export function mainPageOf(name: string): PlatformPage | null {
  const short = name.slice(name.lastIndexOf(".") + 1);
  if (nodeKind(short) !== "zen") return null;
  const slug = componentSlug(short);
  return slug && slug in pageLabels ? (slug as PlatformPage) : null;
}

const MAIN_FRAME = "main-component";

/** Go to main component for a Zen instance: its page, the Main component frame selected and in view. */
export function goToZenMain(name: string): boolean {
  const page = mainPageOf(name);
  if (!page) { inspectorStatus.set("neutral", `${name} has no main component in Zen Studio`); return false; }
  const state = studioStore.getState();
  const samePage = state.page === page && !state.localPage && state.space === "document";
  // Another page's board is still drawn until the new one loads: its frames are not the ones to select.
  const stale = samePage ? null : document.querySelector(`[data-studio-frame="${MAIN_FRAME}"]`);
  navigate(page);
  // The board draws its frames after the page loads: wait for the Main component frame (else its Playground).
  const started = Date.now();
  const settle = () => {
    const found = document.querySelector<HTMLElement>(`[data-studio-frame="${MAIN_FRAME}"]`);
    const main = found && found !== stale ? found : null;
    if (!main && Date.now() - started < 6000) { requestAnimationFrame(settle); return; }
    const frame = main ?? document.querySelector<HTMLElement>('[data-studio-frame="playground"]');
    if (!frame) return;
    studioStore.setState({ selection: { kind: "frame", frameId: frame.dataset.studioFrame ?? MAIN_FRAME } });
    zoomToFrame(frame);
  };
  requestAnimationFrame(settle);
  return true;
}
