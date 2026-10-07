import type { EditOp } from "../types";
import type { Literal, PropSpec, PropValue } from "./propSchema";
import type { PropRestore } from "./PropField";

/**
 * What every inspector control reads and writes through. DesignPanel builds one per selection; a write is one apply
 * (one draft edit, one undo step).
 */
export type FieldApi = {
  valueFor: (name: string) => PropValue;
  setProp: (name: string, value: Literal) => void;
  setProps: (values: Record<string, Literal>) => void;
  removeProp: (name: string) => void;
  /**
   * Several ops as one write, through the panel's queue and file hash (one request, one undo step, one draft change).
   * `optimistic` values show at once until the panel reads the element again. Resolves true when the file holds the
   * edit (written, or already there), false when nothing was written.
   */
  apply: (ops: EditOp[], label: string, optimistic?: Record<string, PropValue>) => Promise<boolean>;
  disabled: boolean;
  /** Shown under a value bound to an expression (inside a playground: where to change it instead). */
  boundHint?: string;
  /** The row's restore action when the draft replaced a binding the saved file has (PropField `restore`). */
  restoreFor?: (name: string) => PropRestore | null;
  /** How many elements the selection's source line renders (a .map row): a fixed value applies to all of them. */
  repeats?: number;
};

/**
 * Props of each group of the Layout section (Flow, Size, Alignment + Gap, Padding, Columns…), so groups built in
 * separate files (SizingSection) read the selection the same way. See docs/research/studio-inspector-redesign-2026-10-03.md.
 */
export type LayoutGroupProps = {
  api: FieldApi;
  /** The selected component's documented props that the group may show. */
  specs: PropSpec[];
  /** The selected component's name: "Stack", "Grid", "Box", "Container", "Form", "Text"… */
  component: string;
  /** The selection's rendered element on the canvas, for measured px; null while it isn't found. */
  host: HTMLElement | null;
};
