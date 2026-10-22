import type { ScaleAnchor } from "./scaleModel";

/*
 * The Scale tool's state between its parts (ScalePanel.tsx, ScaleHandles.tsx, the K key in StudioApp.tsx): the anchor
 * the panel picks (Figma keeps it while the tool is on), and the event that puts the focus in the factor field.
 */

/** Dispatched on window: the Scale panel focuses its factor field (K while the Scale tool is on). */
export const SCALE_FOCUS_EVENT = "zen-studio-scale-focus";

let anchor: ScaleAnchor = { x: 0, y: 0 };
export const scaleAnchor = {
  get: (): ScaleAnchor => anchor,
  set: (next: ScaleAnchor) => { anchor = next; },
};

/** Focuses the Scale panel's factor field (it focuses itself as it opens, too). */
export const focusScaleField = () => window.dispatchEvent(new Event(SCALE_FOCUS_EVENT));
