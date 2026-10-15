import type { UiChild, UiNode, UiSpec, UiValue } from "./spec.mjs";

export type SpecOp =
  | { op: "setProp"; id: string; name: string; value: UiValue }
  | { op: "removeProp"; id: string; name: string }
  | { op: "setText"; id: string; text: string | number }
  | { op: "setChildren"; id: string; children: UiChild[] }
  | { op: "insertChild"; parent: string; index?: number; node: UiChild }
  | { op: "removeNode"; id: string }
  | { op: "replaceNode"; id: string; node: UiNode }
  | { op: "moveNode"; id: string; parent: string; index?: number }
  | { op: "setData"; path: string; value: unknown }
  | { op: "setState"; path: string; value: unknown };

export class OpError extends Error {
  code: "unknown-op" | "invalid-op" | "unknown-id" | "not-a-node" | "cycle" | "map-template";
  op: SpecOp | null;
}
export function applyOps<T extends UiSpec>(spec: T, ops: SpecOp | SpecOp[]): T;
