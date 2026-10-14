// Types of figma-diff.mjs (pulling a Figma frame again).
import type { PageDoc } from "./browser-engine.mjs";

export type FigmaSource = { file: string | null; node: string };

export type FigmaChange = {
  key: string;
  kind: "prop" | "text" | "add" | "remove" | "order" | "move";
  /** The element's document id (from its Figma layer). */
  id: string;
  /** What the person reads in the list. */
  label: string;
  /** The Studio changed the same spot since the last pull (three ways only): unticked at first. */
  conflict?: boolean;
  name?: string;
};

export function figmaSource(header: unknown): FigmaSource | null;
export function sameFigmaSource(a: FigmaSource | null, b: FigmaSource | null): boolean;
export function isFigmaId(id: unknown): boolean;
export function describeNode(node: unknown): string;
export function figmaChanges(docs: { base?: PageDoc | null; current: PageDoc; incoming: PageDoc }): { changes: FigmaChange[]; threeWay: boolean };
export function mergeFigma(current: PageDoc, incoming: PageDoc, changes: FigmaChange[]): { doc: PageDoc; skipped: string[] };
