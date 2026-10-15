import type { UiChild, UiNode, UiSpec } from "./spec.mjs";

export type MarkdownOptions = { idPrefix?: string; gap?: string };
export function markdownToSpec(markdown: string, options?: MarkdownOptions): UiSpec;
export function markdownToNode(markdown: string, options?: MarkdownOptions): UiNode;
export function inline(text: string, id?: (kind: string) => string): UiChild[];
