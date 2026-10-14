import type { EditOp, SourceAttr } from "../types";

/*
 * A Zen Grid's columns on the canvas: the track list the source writes for the breakpoint that renders, and the tracks
 * the browser laid out. Resize uses them (a width drag on the only item of a px column resizes that column, so its
 * neighbours follow, as in Figma auto layout); spacing uses them (a gap strip sits between two tracks, never over the
 * free part of a cell; a px column wider than its only item shows that free space, which "Fit column to content"
 * removes). The pure helpers run in Node (gridTracks.selftest.mjs); the DOM ones only when called.
 */

export type Breakpoint = "desktop" | "tablet" | "mobile";

/** Where the `columns` track list that renders is written: the attribute itself (`columns="…"`) or one of its fields. */
export type ColumnsSource = { list: string; field: string | null };

/** "minmax(0, 320px) 1fr" → ["minmax(0, 320px)", "1fr"]; null when empty, unbalanced, or a track repeats (repeat(…)). */
export function splitTracks(list: string): string[] | null {
  const tracks: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of list.trim()) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth < 0) return null;
    if (/\s/.test(char) && depth === 0) {
      if (current) tracks.push(current);
      current = "";
    } else current += /\s/.test(char) ? " " : char;
  }
  if (depth !== 0) return null;
  if (current) tracks.push(current);
  if (!tracks.length || tracks.some((track) => /^repeat\(/i.test(track) || track.startsWith("["))) return null;
  return tracks;
}

const PX = /^(\d+(?:\.\d+)?)px$/;

/**
 * A column sized in px: "320px" (Fixed) or "minmax(<min>, 320px)" (fills up to 320): its px, and the same track at
 * another px (the form is kept). Null for fr, auto, %, fit-content… (the column follows the Grid's width or content).
 */
export function pxTrack(track: string): { px: number; write: (px: number) => string } | null {
  const fixed = PX.exec(track);
  if (fixed) return { px: Number(fixed[1]), write: (px) => `${px}px` };
  const minmax = /^minmax\(\s*([^,()]+?)\s*,\s*(\d+(?:\.\d+)?)px\s*\)$/i.exec(track);
  if (!minmax) return null;
  const min = minmax[1];
  // A px minimum above the new maximum would hold the column open: the drag lowers it with the maximum.
  const minPx = PX.exec(min);
  return { px: Number(minmax[2]), write: (px) => `minmax(${minPx && Number(minPx[1]) > px ? `${px}px` : min}, ${px}px)` };
}

/** The list with column `index` at `px` (its form kept); null when that column is not sized in px. */
export function withTrackPx(list: string, index: number, px: number): string | null {
  const tracks = splitTracks(list);
  const track = tracks?.[index];
  const sized = track ? pxTrack(track) : null;
  if (!tracks || !sized) return null;
  return tracks.map((item, at) => (at === index ? sized.write(px) : item)).join(" ");
}

/** The list with column `index` written as `track` ("auto": the column hugs its content); null without that column. */
export function withTrack(list: string, index: number, track: string): string | null {
  const tracks = splitTracks(list);
  if (!tracks || index >= tracks.length) return null;
  return tracks.map((item, at) => (at === index ? track : item)).join(" ");
}

/** The responsive keys Grid reads at each breakpoint, first written wins (Layout.tsx: tracks of desktop / tablet / mobile). */
const keysAt: Record<Breakpoint, Breakpoint[]> = {
  desktop: ["desktop", "tablet", "mobile"],
  tablet: ["tablet", "desktop", "mobile"],
  mobile: ["mobile", "tablet", "desktop"],
};

/**
 * The track list that renders at `breakpoint` and where the source writes it: `columns="…"`, or the string field of
 * `columns={{ mobile: 1, desktop: "…" }}` that Grid reads there. Null for a column count (equal fr columns), a bound
 * value, a spread, or no `columns` (auto-fill).
 */
export function columnsSource(attributes: SourceAttr[], breakpoint: Breakpoint): ColumnsSource | null {
  const attr = attributes.find((attribute) => attribute.kind !== "spread" && attribute.name === "columns");
  if (!attr) return null;
  if (attr.kind === "string") return attr.value ? { list: attr.value, field: null } : null;
  if (attr.kind !== "expression") return null;
  const string = /^\s*(["'`])([^"'`$]*)\1\s*$/.exec(attr.value ?? "");
  if (string) return { list: string[2], field: null };
  if (attr.shape?.type !== "object") return null;
  const fields = attr.shape.fields;
  // A spread inside the object may hold any key: what renders cannot be read from the source.
  if (fields.some((field) => field.kind === "spread")) return null;
  for (const key of keysAt[breakpoint]) {
    const field = fields.find((candidate) => candidate.key === key);
    if (!field) continue;
    return field.kind === "string" ? { list: field.value, field: key } : null;
  }
  return null;
}

/** The op that writes `list` where `source` reads it (setProp of the attribute, or setField of its key). */
export function columnsOp(source: ColumnsSource, list: string): EditOp {
  return source.field
    ? { op: "setField", name: "columns", key: source.field, value: { kind: "string", value: list } }
    : { op: "setProp", name: "columns", value: { kind: "string", value: list } };
}

/* ───────────── DOM ───────────── */

export type Span = { from: number; to: number };
/** A grid's laid-out tracks in client px (screen, after canvas zoom), and the CSS px per client px ratio. */
export type GridLayout = { columns: Span[]; rows: Span[]; scale: number };

/** "320px 1032px" (a grid container's computed template: the used track sizes) → [320, 1032]; null when not px. */
function usedSizes(value: string): number[] | null {
  const parts = value.trim().split(/\s+/);
  if (!parts.length || parts.some((part) => !PX.test(part))) return null;
  return parts.map((part) => Number(PX.exec(part)![1]));
}

/** The breakpoint `element` renders at (its nearest data-breakpoint: the frame's, else the app's), desktop when none. */
export function breakpointOf(element: Element): Breakpoint {
  const value = element.closest("[data-breakpoint]")?.getAttribute("data-breakpoint");
  return value === "tablet" || value === "mobile" ? value : "desktop";
}

/** The columns and rows `grid` laid out (left-to-right, implicit tracks included); null when it is not a grid now. */
export function gridLayout(grid: Element): GridLayout | null {
  try {
    const style = getComputedStyle(grid);
    if (!/grid/.test(style.display) || style.direction === "rtl") return null;
    // Tracks packed from the start only: centred or spread tracks (justify-content / align-content) start elsewhere.
    const packed = (value: string) => /^(normal|start|flex-start|left|stretch|)$/.test(value.trim());
    if (!packed(style.justifyContent) || !packed(style.alignContent)) return null;
    const columns = usedSizes(style.gridTemplateColumns);
    const rows = usedSizes(style.gridTemplateRows);
    if (!columns || !rows) return null;
    const rect = grid.getBoundingClientRect();
    const width = (grid as HTMLElement).offsetWidth;
    const scale = width ? rect.width / width : 1;
    const css = (value: string) => parseFloat(value) || 0;
    const left = rect.left + (css(style.borderLeftWidth) + css(style.paddingLeft)) * scale;
    const top = rect.top + (css(style.borderTopWidth) + css(style.paddingTop)) * scale;
    const spans = (sizes: number[], start: number, gap: number) => {
      let at = start;
      return sizes.map((size) => {
        const span = { from: at, to: at + size * scale };
        at = span.to + gap * scale;
        return span;
      });
    };
    return { columns: spans(columns, left, css(style.columnGap)), rows: spans(rows, top, css(style.rowGap)), scale };
  } catch {
    return null;
  }
}

/** The tracks `box` lies in: the first and last index whose span it overlaps by more than a pixel; null outside them all. */
export function spanOf(spans: Span[], from: number, to: number): { first: number; last: number } | null {
  const hit = spans.flatMap((span, index) => (Math.min(span.to, to) - Math.max(span.from, from) > 1 ? [index] : []));
  return hit.length ? { first: hit[0], last: hit[hit.length - 1] } : null;
}

/** The laid-out children of a grid (displayed, in flow) with their boxes. */
export function gridItems(grid: Element): Array<{ element: Element; rect: DOMRect }> {
  return Array.from(grid.children).slice(0, 200).flatMap((child) => {
    const style = getComputedStyle(child);
    if (style.display === "none" || style.display === "contents" || style.position === "absolute" || style.position === "fixed") return [];
    const rect = child.getBoundingClientRect();
    return rect.width || rect.height ? [{ element: child, rect }] : [];
  });
}

/**
 * The column `item` (a child of `grid`) is the only item of: its index, the column's span and the item's box, in client
 * px. Null when it spans several columns, shares its column with another item, or the grid is not laid out.
 */
export function soleColumn(grid: Element, item: Element): { index: number; column: Span; rect: DOMRect; scale: number } | null {
  const layout = gridLayout(grid);
  if (!layout) return null;
  const items = gridItems(grid);
  const own = items.find((entry) => entry.element === item);
  if (!own) return null;
  const span = spanOf(layout.columns, own.rect.left, own.rect.right);
  if (!span || span.first !== span.last) return null;
  const column = layout.columns[span.first];
  const shared = items.some((entry) => entry.element !== item && Math.min(column.to, entry.rect.right) - Math.max(column.from, entry.rect.left) > 1);
  return shared ? null : { index: span.first, column, rect: own.rect, scale: layout.scale };
}
