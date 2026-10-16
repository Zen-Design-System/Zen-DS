// Types of figma-clip.mjs (a Studio frame on the clipboard for Figma).
import type { PageDoc } from "./browser-engine.mjs";

export const FIGMA_CLIP_ATTRIBUTE: string;
export function figmaClipHtml(pkg: unknown): string;
export function packageFromClip(clip?: { html?: string | null; text?: string | null }): Record<string, unknown> | null;
export function onlyFrame(doc: PageDoc | null | undefined, frameId: string): PageDoc | null;
