/** A node of a Zen UI spec: one component with JSON props and children. */
export type UiNode = { type: string; id?: string; pending?: boolean; props?: Record<string, UiValue>; children?: UiChild[] };
export type RefMarker = { $ref: string };
export type StateMarker = { $state: string };
export type ActionMarker = { $action: string; args?: Record<string, UiValue>; path?: string; value?: UiValue; id?: string };
export type MapMarker = { $map: string; as: string; node: UiNode };
export type PendingMarker = { $pending: "text" | "heading" | "shape" };
export type Marker = RefMarker | StateMarker | ActionMarker | MapMarker | PendingMarker;
export type UiValue = string | number | boolean | null | UiValue[] | { [key: string]: UiValue } | UiNode | Marker;
export type UiChild = string | number | UiNode | RefMarker | StateMarker | MapMarker | PendingMarker;
export type UiSpec = { version: 1; root: UiNode; data?: Record<string, unknown>; state?: Record<string, unknown> };
export type MarkerKind = "ref" | "state" | "action" | "map" | "pending";
export type WalkContext = { path: string; parent: UiNode | null; key: string | null; inMap: boolean };

export const SPEC_VERSION: 1;
export const MARKERS: readonly string[];
export const PENDING_KINDS: readonly ["text", "heading", "shape"];
export function markerOf(value: unknown): MarkerKind | null;
export function isNode(value: unknown): value is UiNode;
export function splitPath(path: string): string[];
export function readPath(base: unknown, path: string | string[]): unknown;
export function writePath<T>(base: T, path: string | string[], value: unknown): T;
export function walkNodes(root: UiNode | undefined, visit: (node: UiNode, context: WalkContext) => void | false, context?: WalkContext): void;
export function nodeIds(specOrNode: UiSpec | UiNode): string[];
export function findNode(specOrNode: UiSpec | UiNode, id: string): { node: UiNode; parent: UiNode | null; path: string; inMap: boolean } | null;
export function assignIds<T extends UiSpec>(spec: T): T;
export function isInteractive(node: UiNode, catalogEntry?: { bindings?: Array<{ prop: string; handler: string; auto?: boolean }> } | null): boolean;
