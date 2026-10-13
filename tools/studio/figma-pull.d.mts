// Types of figma-pull.mjs (a Figma frame read back as a Studio page). The Studio loads it for Export › Figma's base.
import type { PageDoc } from "./browser-engine.mjs";
import type { FigmaMapping } from "./figma-map.mjs";

export function figmaReadCode(nodeId: string, options?: { part?: number }): string;
export function pageFromFigma(frame: Record<string, unknown>, options: { title?: string; mapping: FigmaMapping; file?: string | null }): { text: string; notes: string[]; doc: PageDoc };
export function figmaDocId(figmaId: string, part?: string): string;
export function repoMapping(rootDir?: string): Promise<FigmaMapping>;
