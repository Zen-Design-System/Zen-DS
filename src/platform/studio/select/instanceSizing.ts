import type { ParentLayout } from "../inspector/sizingModel";
import type { ResizeAxis } from "./resize";

/*
 * The selected Zen instance's size as the Inspector's Size group shows it (GĐ4 M4, the user's choice "a Stack wrap and
 * three fixes"): the canvas (ResizeLayer) knows how each axis resizes (its own size prop, fullWidth, a Stack wrap, the
 * Studio wrap Stack it sits in) and publishes it here; the Inspector reads it and calls `set`, which writes through
 * the same plans as a drag on the canvas (planResize, planFill, planHugAxis): one request, one undo step. Hug on an
 * axis of an instance whose wrap Stack then sizes nothing takes the Stack away again.
 */

/** One axis: what renders now (the written mode, else what the instance does by itself) and its size in CSS px. */
export type InstanceAxis = {
  mode: "hug" | "fill" | "fixed";
  /** The mode is written in the source (a size prop, fullWidth, or its wrap Stack's width / height). */
  written: boolean;
  px: number;
};

export type InstanceSizingInput = { kind: "hug" } | { kind: "fill" } | { kind: "fixed"; px: number };

export type InstanceSizing = {
  /** The instance's data-zen-src. */
  src: string;
  name: string;
  /** Null: the axis does not resize here (the canvas has no handle for it either). */
  width: InstanceAxis | null;
  height: InstanceAxis | null;
  /** It sits in a Studio wrap Stack, which takes its size. */
  stacked: boolean;
  /** The layout the instance (or its wrap Stack) sits in, for the Fill caption. */
  parent: ParentLayout;
  set: (axis: ResizeAxis, input: InstanceSizingInput) => void;
};

let current: InstanceSizing | null = null;
const listeners = new Set<() => void>();
const data = (value: InstanceSizing | null) => (value ? JSON.stringify({ ...value, set: undefined }) : "");

export const instanceSizing = {
  get: (): InstanceSizing | null => current,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  /** The same data again keeps the snapshot (no re-render); its `set` is the newest one either way. */
  publish(next: InstanceSizing | null) {
    if (current && next && data(current) === data(next)) {
      current.set = next.set;
      return;
    }
    if (!current && !next) return;
    current = next;
    for (const listener of listeners) listener();
  },
};
