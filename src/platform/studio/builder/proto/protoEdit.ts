import { applyEdit } from "../../api";
import type { EditOp, EditValue } from "../../types";
import { DEFAULT_DELAY, DELAY_TRIGGER, protoActionCode, type ProtoAction, type ProtoFrame, type ProtoOptions } from "./protoModel";

/*
 * Writes a layer's prototype action: the trigger prop's `proto.*(…)` expression (setProp), or no prop at all for None
 * (removeProp). One edit, one undo step, from the Prototype tab and from a drag on the canvas (ProtoLinks) alike.
 */

export type ProtoLayer = { file: string; loc: string; name: string };

/** The target an action takes when none is named yet: Navigate to → another Screen than the layer's own, Open overlay →
 *  the first Overlay, a toast → "Done", a link → "https://". */
export function defaultTarget(action: ProtoAction, frames: ProtoFrame[], homeScreen: string | null): string | undefined {
  const screens = frames.filter((frame) => frame.kind === "screen" && !frame.state).map((frame) => frame.id);
  if (action === "navigate") return screens.find((screen) => screen !== homeScreen) ?? screens[0];
  if (action === "open") return frames.find((frame) => frame.kind === "overlay")?.id;
  if (action === "toast") return "Done";
  if (action === "link") return "https://";
  return undefined;
}

const SAY: Record<ProtoAction, string> = { none: "No interaction", navigate: "Navigate to", open: "Open overlay", close: "Close overlay", back: "Back", toast: "Show toast", link: "Open link" };

/** Sets `trigger` on the layer to `action` (with `target` and `options`); None removes the prop. After delay always
 *  names its delay. Resolves to whether it was written. */
export async function writeAction(layer: ProtoLayer, trigger: string, action: ProtoAction, target?: string, options?: ProtoOptions, label?: string): Promise<boolean> {
  if (action === "none") {
    const response = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [{ op: "removeProp", name: trigger } as EditOp] }, "Remove interaction");
    return Boolean(response.ok);
  }
  const written = trigger === DELAY_TRIGGER ? { ...options, delay: options?.delay ?? DEFAULT_DELAY } : options;
  const code = protoActionCode(action, target ?? "", written);
  const response = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [{ op: "setProp", name: trigger, value: { kind: "expression", code } } as EditOp] }, label ?? (target ? `${SAY[action]} ${target}` : SAY[action]));
  return Boolean(response.ok);
}

/** Sets `trigger` to lead each item of a choice control to its own target (`proto.navigate({ home: "screen-1" })`); an
 *  item without a target goes nowhere. */
export async function writeItemTargets(layer: ProtoLayer, trigger: string, action: "navigate" | "open", targets: Record<string, string | undefined>, label: string, options?: ProtoOptions): Promise<boolean> {
  const code = protoActionCode(action, targets, options);
  const response = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [{ op: "setProp", name: trigger, value: { kind: "expression", code } } as EditOp] }, label);
  return Boolean(response.ok);
}

/** Sets (or, `null`, removes) one prop of a layer: an Overlay's position, close on outside press, background. */
export async function writeProp(layer: ProtoLayer, prop: string, value: EditValue | null, label: string): Promise<boolean> {
  const op = value ? ({ op: "setProp", name: prop, value } as EditOp) : ({ op: "removeProp", name: prop } as EditOp);
  const response = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [op] }, label);
  return Boolean(response.ok);
}
