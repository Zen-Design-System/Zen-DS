import { applyEdit } from "../../api";
import type { EditOp, EditResponse, EditValue } from "../../types";
import { DEFAULT_DELAY, DELAY_TRIGGER, fieldTrigger, frameNamed, protoActionCode, type ProtoAction, type ProtoFrame, type ProtoOptions } from "./protoModel";

/*
 * Writes a layer's prototype action: the trigger prop's `proto.*(…)` expression (setProp), or no prop at all for None
 * (removeProp); an action object's button ("primaryAction.onClick") gets its field set or removed (setField). One edit,
 * one undo step, from the Prototype tab and from a drag on the canvas (ProtoLinks) alike.
 */

/** The op that writes `code` on the trigger (null: removes it). A layer's `compose` puts the code in its place among the
 *  trigger's actions (one step of `proto.run(…)`, W-52 B2) first. */
function triggerOp(trigger: string, written: string | null, compose?: ProtoLayer["compose"]): EditOp {
  const code = compose ? compose(written) : written;
  const field = fieldTrigger(trigger);
  if (field) return { op: "setField", name: field.prop, key: field.field, value: code === null ? null : { kind: "expression", code } } as EditOp;
  return code === null ? ({ op: "removeProp", name: trigger } as EditOp) : ({ op: "setProp", name: trigger, value: { kind: "expression", code } } as EditOp);
}

/** The layer a trigger is on. `compose`: the trigger holds several actions and this one is a step of them; it gives the
 *  trigger's whole code with that step written (null: removed), null when no action is left. */
export type ProtoLayer = { file: string; loc: string; name: string; compose?: (code: string | null) => string | null };

/** The target an action takes when none is named yet: Navigate to → another Screen than the layer's own, Open overlay →
 *  the first Overlay, a toast → "Done", a link → "https://". `words` (the layer's label): a frame named the same, or
 *  starting the same, comes first (walk 2026-10-29 W-57: "Invite members" opened the first overlay, Filter). */
export function defaultTarget(action: ProtoAction, frames: ProtoFrame[], homeScreen: string | null, words?: string): string | undefined {
  const screens = frames.filter((frame) => frame.kind === "screen" && !frame.state).map((frame) => frame.id);
  const kind = action === "navigate" ? "screen" : action === "open" ? "overlay" : null;
  const named = kind && words ? frameNamed(frames.filter((frame) => frame.kind === kind && !frame.state && frame.id !== homeScreen), words) : undefined;
  if (named) return named;
  if (action === "navigate") return screens.find((screen) => screen !== homeScreen) ?? screens[0];
  if (action === "open") return frames.find((frame) => frame.kind === "overlay")?.id;
  if (action === "toast") return "Done";
  if (action === "link") return "https://";
  return undefined;
}

const SAY: Record<ProtoAction, string> = { none: "No interaction", navigate: "Navigate to", open: "Open overlay", close: "Close overlay", back: "Back", toast: "Show toast", link: "Open link", filter: "Filter table", step: "Change step", set: "Set variable", if: "Conditional" };

/** Sets `trigger` on the layer to `action` (with `target` and `options`); None removes the prop. After delay always
 *  names its delay. Resolves to whether it was written. */
export async function writeAction(layer: ProtoLayer, trigger: string, action: ProtoAction, target?: string | Record<string, string | undefined>, options?: ProtoOptions, label?: string): Promise<boolean> {
  if (action === "none") {
    const response = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [triggerOp(trigger, null, layer.compose)] }, layer.compose ? "Remove action" : "Remove interaction");
    return Boolean(response.ok);
  }
  const written = trigger === DELAY_TRIGGER ? { ...options, delay: options?.delay ?? DEFAULT_DELAY } : options;
  const code = protoActionCode(action, target ?? "", written);
  const response = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [triggerOp(trigger, code, layer.compose)] }, label ?? (typeof target === "string" && target ? `${SAY[action]} ${target}` : SAY[action]));
  return Boolean(response.ok);
}

/** Sets `trigger` to lead each item of a choice control to its own target (`proto.navigate({ home: "screen-1" })`); an
 *  item without a target goes nowhere. */
export async function writeItemTargets(layer: ProtoLayer, trigger: string, action: "navigate" | "open", targets: Record<string, string | undefined>, label: string, options?: ProtoOptions): Promise<boolean> {
  const code = protoActionCode(action, targets, options);
  const response = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [triggerOp(trigger, code, layer.compose)] }, label);
  return Boolean(response.ok);
}

/** Writes an action's code on `trigger` as it is (Set variable, Conditional, several actions), through the layer's
 *  `compose`; null removes it. */
export function triggerCodeEdit(layer: ProtoLayer, trigger: string, code: string | null, label: string): Promise<EditResponse> {
  return applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [triggerOp(trigger, code, layer.compose)] }, label);
}
export async function writeTriggerCode(layer: ProtoLayer, trigger: string, code: string | null, label: string): Promise<boolean> {
  return Boolean((await triggerCodeEdit(layer, trigger, code, label)).ok);
}

/** Sets (or, `null`, removes) one prop of a layer: an Overlay's position, close on outside press, background. */
export async function writeProp(layer: ProtoLayer, prop: string, value: EditValue | null, label: string): Promise<boolean> {
  const op = value ? ({ op: "setProp", name: prop, value } as EditOp) : ({ op: "removeProp", name: prop } as EditOp);
  const response = await applyEdit({ file: layer.file, loc: layer.loc, name: layer.name, ops: [op] }, label);
  return Boolean(response.ok);
}
