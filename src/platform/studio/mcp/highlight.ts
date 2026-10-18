import { useSyncExternalStore } from "react";
import { BATCH_TOOLS } from "../../../../tools/studio/mcp/tools.mjs";

/*
 * The layers an AI just changed, flashed on the canvas (plan docs/research/studio-vibe-agent-2026-10-18.md §9, V1a; owed
 * since Studio MCP M1): any MCP client's write — Zen Agent's or Claude Code's — outlines the layers its answer names for a
 * moment, so the person sees what moved. AiHighlights.tsx draws them.
 */

/** The tools that change the page (the writes the relay runs; mcp/tools.mjs). */
const WRITES = new Set([...BATCH_TOOLS, "batch", "create_page", "add_frame"]);

/** How long a flash stays before it fades (the fade itself is a Zen motion duration in mcp.css). */
export const FLASH_MS = 1200;

export type Flash = { key: number; ids: string[]; at: number };

let flashes: Flash[] = [];
let next = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function useFlashes(): Flash[] {
  return useSyncExternalStore(subscribe, () => flashes, () => flashes);
}

/** Outlines `ids` for a moment. */
export function flashLayers(ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return;
  const flash: Flash = { key: ++next, ids: unique, at: Date.now() };
  flashes = [...flashes, flash];
  notify();
  // Kept until its fade has run: AiHighlights fades it from FLASH_MS on.
  window.setTimeout(() => {
    flashes = flashes.filter((entry) => entry !== flash);
    notify();
  }, FLASH_MS + 600);
}

/** Ids an answer's head names that are not what changed: the parent it went into, the original it copied, what is gone. */
const HEADS = /(?:Added to|Moved into|Copied|Replaced|Deleted \S+|Removed \S+) #n[\w-]+/g;
const firstId = (text: string) => /#(n[\w-]+)/.exec(text)?.[1] ?? null;

/**
 * The layers a write tool's answer says it changed: the first layer of its outline (not that layer's children, nor the
 * parent "Added to #…" names), one per op of a batch; none for reads, a deleted layer or a whole new page.
 */
export function changedIds(tool: string, content: unknown): string[] {
  if (!WRITES.has(tool) || tool === "create_page" || !Array.isArray(content)) return [];
  const text = content.filter((item) => item?.type === "text").map((item) => String(item.text)).join("\n").replace(HEADS, "");
  if (tool === "batch") return text.split("\n").filter((line) => /^\d+\. /.test(line)).map(firstId).filter((id): id is string => Boolean(id));
  const id = firstId(text);
  return id ? [id] : [];
}
