import { gapValue, normalizeScale, paddingValue, scaleTokenSuffix, type ZenGap, type ZenPadding, type ZenScale } from "../../../components/_shared/scale";
import { componentSchema, editorFor, parseDefault, valueOf, type PropValue } from "../inspector/propSchema";
import type { EditOp, SourceAttr } from "../types";
import { breakpointOf, columnsOp, columnsSource, gridItems, gridLayout, soleColumn, spanOf, withTrackPx, type GridLayout } from "./gridTracks";
import type { FiberHit } from "./picker";

/*
 * Spacing on the canvas (Figma-like): the selected element's padding and gap areas, measured from the DOM, and for the
 * Zen layout components the prop each area edits. Hovering an area names its token ("gap · md · 16"); clicking one opens
 * the spacing scale (SpacingLayer). Host elements, parts and other layout components show their spacing read-only.
 * A grid's gaps are the strips between its tracks (never the free part of a cell, which no gap token sizes); a Zen
 * Grid column wider than its only item shows that free space as its own area ("free"), which SpacingLayer offers to
 * remove (Fit column to content: the Grid's px column takes the item's width).
 * A side or gap a prop sets to 0 (`none`) still gets an area to click: a thin band (ZERO_BAND) along that edge or on the
 * seam between the two neighbours, tinted only on hover, so `none` is set and left from the canvas like any other step.
 */

export type Box = { x: number; y: number; w: number; h: number };
/** Which tokens an area's values come from: Spacing/Gap, Spacing/Padding, or the Card padding tokens. */
export type SpacingScale = "gap" | "padding" | "card";
export type SpacingSide = "top" | "right" | "bottom" | "left" | "row" | "column";

export type SpacingArea = Box & {
  kind: "gap" | "padding" | "free";
  /** padding: the side; gap: "row" (between rows, a horizontal strip) or "column" (between columns, a vertical strip). */
  side: SpacingSide;
  /** The length the area stands for, in CSS px (unscaled): that side's padding, or the row / column gap. */
  px: number;
  /** Props the area edits: the first one written on the element wins, the last is the fallback. Empty: read-only. */
  props: string[];
  /** Alt+click edits this prop instead (padding on every side)… */
  altProp?: string;
  /** …and removes these side props where they are written, so every side takes the value (paddingX, paddingY). */
  altClears?: string[];
  scale: SpacingScale;
  /** free: the Grid column (0-based) whose only item leaves this space, the column's width and the item's, in CSS px. */
  column?: { index: number; px: number; content: number };
  /** A 0 length (`none`): the box is a ZERO_BAND hit band on the edge or seam, not the area (no tint until hovered). */
  zero?: boolean;
};

/** Screen px of the band a 0 padding side (inward from its edge) or a 0 gap (centred on the seam) takes the pointer in. */
export const ZERO_BAND = 6;

/** The selected element whose spacing is shown, and whether its areas edit props (a Zen layout component). */
export type SpacingOwner = { src: string; name: string; host: Element; editable: boolean; /** The rendered props (a spread's live values). */ props?: Record<string, unknown> };

type LayoutRule = {
  /** Gap areas between rows / between columns → props (first written wins, last is the fallback). */
  rowGap?: string[];
  columnGap?: string[];
  /** Padding areas on the left/right and top/bottom → props; Alt edits `alt` on every side. */
  paddingX?: string[];
  paddingY?: string[];
  alt?: string;
  paddingScale?: "padding" | "card";
  /** The element whose gaps the gap prop sets, when it is not the component's root; its own gaps are then read-only. */
  gapElement?: (host: Element) => Element | null;
};

/* The Zen layout components whose gap and padding areas edit props (spec: left/right → paddingX when the component has
 * it, else padding; top/bottom → paddingY, else padding; Grid gaps → columnGap / rowGap when written, else gap). */
const rules: Record<string, LayoutRule> = {
  Stack: { rowGap: ["gap"], columnGap: ["gap"], paddingX: ["paddingX"], paddingY: ["paddingY"], alt: "padding" },
  Grid: { rowGap: ["rowGap", "gap"], columnGap: ["columnGap", "gap"], paddingX: ["padding"], paddingY: ["padding"] },
  Box: { paddingX: ["paddingX"], paddingY: ["paddingY"], alt: "padding" },
  Form: { rowGap: ["gap"], columnGap: ["gap"] },
  // The gap spaces the options (a row of choices keeps its own column gap); the legend gap is the fieldset's own.
  FormFieldset: { rowGap: ["gap"], columnGap: ["gap"], gapElement: (host) => host.querySelector(":scope > .zen-form-fieldset__options") },
  // `inset` is the side padding of a sticky bar.
  FormActions: { paddingX: ["inset"] },
  Card: { paddingX: ["spacing"], paddingY: ["spacing"], paddingScale: "card" },
};

/** Components whose padding and gap the selection tints (read-only unless they have a rule above). */
export const layoutNames = new Set(["Stack", "Grid", "Box", "Container", "Form", "FormFieldset", "FormActions", "ActionBar", "Card"]);

type RawArea = { kind: "gap" | "padding"; side: SpacingSide; rect: DOMRect; px: number; zero?: boolean };

/**
 * The padding sides and the gaps between laid-out children of `element`, in client pixels. `zeros`: a 0 side, and a 0
 * gap between two touching neighbours, come back too as a rect 0 px thick on that edge or seam.
 */
function measureSpacing(element: Element, withPadding: boolean, zeros = false): RawArea[] {
  const style = getComputedStyle(element);
  if (style.display === "none" || style.display === "contents" || style.display === "inline") return [];
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return [];
  const width = (element as HTMLElement).offsetWidth;
  const scale = width ? rect.width / width : 1;
  const css = (value: string) => parseFloat(value) || 0;
  const px = (value: string) => css(value) * scale;
  const inner = { left: rect.left + px(style.borderLeftWidth), top: rect.top + px(style.borderTopWidth), right: rect.right - px(style.borderRightWidth), bottom: rect.bottom - px(style.borderBottomWidth) };
  const pad = { top: px(style.paddingTop), right: px(style.paddingRight), bottom: px(style.paddingBottom), left: px(style.paddingLeft) };
  const content = { left: inner.left + pad.left, top: inner.top + pad.top, right: inner.right - pad.right, bottom: inner.bottom - pad.bottom };
  const areas: RawArea[] = [];
  if (withPadding) {
    const sides: Array<[SpacingSide, DOMRect, string]> = [
      ["top", new DOMRect(inner.left, inner.top, inner.right - inner.left, pad.top), style.paddingTop],
      ["bottom", new DOMRect(inner.left, content.bottom, inner.right - inner.left, pad.bottom), style.paddingBottom],
      ["left", new DOMRect(inner.left, content.top, pad.left, content.bottom - content.top), style.paddingLeft],
      ["right", new DOMRect(content.right, content.top, pad.right, content.bottom - content.top), style.paddingRight],
    ];
    for (const [side, box, value] of sides) {
      if (box.width > 0.5 && box.height > 0.5) areas.push({ kind: "padding", side, rect: box, px: css(value) });
      else if (zeros && !css(value) && Math.max(box.width, box.height) > 0.5) areas.push({ kind: "padding", side, rect: box, px: 0, zero: true });
    }
  }
  if (!/flex|grid/.test(style.display)) return areas;
  const rowGap = css(style.rowGap);
  const columnGap = css(style.columnGap);
  if (!rowGap && !columnGap && !zeros) return areas;
  // A grid's gaps sit between its tracks: an item narrower than its cell leaves free space, which is no gap.
  const grid = style.display.includes("grid") ? gridLayout(element) : null;
  if (grid) return [...areas, ...gridGaps(element, grid, content, rowGap, columnGap, zeros)];
  const children = Array.from(element.children).slice(0, 80).flatMap((child) => {
    const childStyle = getComputedStyle(child);
    if (childStyle.display === "none" || childStyle.position === "absolute" || childStyle.position === "fixed") return [];
    const box = child.getBoundingClientRect();
    return box.width || box.height ? [box] : [];
  });
  /*
   * Lines in visual order: rows of a grid or a row flex (items that share a vertical band, whatever their alignment), or
   * the columns of a column flex. Gaps between items of a line and between lines; reverse directions read the same.
   */
  const columnFlow = style.display.includes("flex") && style.flexDirection.startsWith("column");
  const start = (box: DOMRect) => (columnFlow ? box.left : box.top);
  const end = (box: DOMRect) => (columnFlow ? box.right : box.bottom);
  const along = (box: DOMRect) => (columnFlow ? box.top : box.left);
  const lines: Array<{ from: number; to: number; items: DOMRect[] }> = [];
  for (const box of [...children].sort((a, b) => start(a) - start(b))) {
    const line = lines[lines.length - 1];
    if (line && start(box) < line.to - 1) {
      line.items.push(box);
      line.to = Math.max(line.to, end(box));
    } else lines.push({ from: start(box), to: end(box), items: [box] });
  }
  // Inside a line: the gap between neighbours (row flex, grid: column gaps; column flex: row gaps), across the line.
  const within = columnFlow ? rowGap : columnGap;
  const across = columnFlow ? "row" : "column";
  const single = lines.length === 1;
  for (const line of lines) {
    const items = [...line.items].sort((a, b) => along(a) - along(b));
    const from = single ? (columnFlow ? content.left : content.top) : line.from;
    const to = single ? (columnFlow ? content.right : content.bottom) : line.to;
    for (let index = 1; index < items.length && (within || zeros); index++) {
      const a = items[index - 1];
      const b = items[index];
      const space = columnFlow ? b.top - a.bottom : b.left - a.right;
      // A 0 gap is two neighbours that touch (an overlap from a negative margin is no gap to edit).
      const zero = !within && Math.abs(space) <= 0.5;
      if (!zero && (space <= 0.5 || !within)) continue;
      const size = zero ? 0 : space;
      areas.push({
        kind: "gap",
        side: across,
        rect: columnFlow ? new DOMRect(from, a.bottom, to - from, size) : new DOMRect(a.right, from, size, to - from),
        px: within,
        ...(zero ? { zero } : {}),
      });
    }
  }
  // Between lines: the other gap, along the whole content box.
  const outer = columnFlow ? columnGap : rowGap;
  for (let index = 1; index < lines.length && (outer || zeros); index++) {
    const space = lines[index].from - lines[index - 1].to;
    const zero = !outer && Math.abs(space) <= 0.5;
    if (!zero && (space <= 0.5 || !outer)) continue;
    const size = zero ? 0 : space;
    const at = lines[index - 1].to;
    areas.push({
      kind: "gap",
      side: columnFlow ? "column" : "row",
      rect: columnFlow ? new DOMRect(at, content.top, size, content.bottom - content.top) : new DOMRect(content.left, at, content.right - content.left, size),
      px: outer,
      ...(zero ? { zero } : {}),
    });
  }
  return areas;
}

/**
 * The gap strips of a laid-out grid: between neighbouring columns (row by row, joined where they meet; a single row
 * spans the content box) and between rows (the content box's width), up to the last track that holds an item. A strip
 * an item spans across is left out.
 */
function gridGaps(element: Element, grid: GridLayout, content: { left: number; top: number; right: number; bottom: number }, rowGap: number, columnGap: number, zeros = false): RawArea[] {
  const items = gridItems(element).flatMap(({ rect }) => {
    const columns = spanOf(grid.columns, rect.left, rect.right);
    const rows = spanOf(grid.rows, rect.top, rect.bottom);
    return columns && rows ? [{ columns, rows }] : [];
  });
  if (!items.length) return [];
  const lastColumn = Math.max(...items.map((item) => item.columns.last));
  const lastRow = Math.max(...items.map((item) => item.rows.last));
  const areas: RawArea[] = [];
  const single = lastRow === 0;
  for (let index = 0; index < lastColumn && (columnGap || zeros); index++) {
    const x = grid.columns[index].to;
    const w = grid.columns[index + 1].from - x;
    const zero = !columnGap && Math.abs(w) <= 0.5;
    if (!zero && (w <= 0.5 || !columnGap)) continue;
    let strip: { from: number; to: number } | null = null;
    const flush = () => {
      if (strip) areas.push({ kind: "gap", side: "column", rect: new DOMRect(x, strip.from, zero ? 0 : w, strip.to - strip.from), px: columnGap, ...(zero ? { zero } : {}) });
      strip = null;
    };
    for (let row = 0; row <= lastRow; row++) {
      const across = items.some((item) => item.columns.first <= index && item.columns.last > index && item.rows.first <= row && item.rows.last >= row);
      if (across) { flush(); continue; }
      const from = single ? content.top : grid.rows[row].from;
      const to = single ? content.bottom : grid.rows[row].to;
      strip = strip ? { from: strip.from, to } : { from, to };
    }
    flush();
  }
  for (let index = 0; index < lastRow && (rowGap || zeros); index++) {
    const y = grid.rows[index].to;
    const h = grid.rows[index + 1].from - y;
    if (rowGap && h > 0.5) areas.push({ kind: "gap", side: "row", rect: new DOMRect(content.left, y, content.right - content.left, h), px: rowGap });
    else if (!rowGap && Math.abs(h) <= 0.5) areas.push({ kind: "gap", side: "row", rect: new DOMRect(content.left, y, content.right - content.left, 0), px: 0, zero: true });
  }
  return areas;
}

/** The free space of each Grid column wider than its only item (left and / or right of the item), in client px. */
function freeAreas(element: Element): Array<{ rect: DOMRect; column: NonNullable<SpacingArea["column"]> }> {
  return gridItems(element).flatMap(({ element: item }) => {
    const sole = soleColumn(element, item);
    if (!sole) return [];
    const { column, rect, scale } = sole;
    const width = column.to - column.from;
    if (width - rect.width <= 1) return [];
    const info = { index: sole.index, px: Math.round(width / scale), content: Math.round(rect.width / scale) };
    const sides = [new DOMRect(column.from, rect.top, rect.left - column.from, rect.height), new DOMRect(rect.right, rect.top, column.to - rect.right, rect.height)];
    return sides.filter((side) => side.width > 0.5 && side.height > 0.5).map((side) => ({ rect: side, column: info }));
  });
}

/**
 * The spacing areas of the selection: a Zen layout component's areas carry the props they edit; a part, a host element
 * (div, section…) and the other layout components (Container, Action Bar) show theirs read-only. Other components
 * (Buttons, inputs…) show none.
 */
export function spacingAreas(hit: FiberHit, part: boolean, toBox: (rect: DOMRect) => Box): { owner: SpacingOwner | null; areas: SpacingArea[] } {
  const none = { owner: null, areas: [] };
  if (hit.hosts.length !== 1) return none;
  const host = hit.hosts[0];
  const rule = !part && hit.isComponent ? rules[hit.name] : undefined;
  if (!part && hit.isComponent && !layoutNames.has(hit.name)) return none;
  try {
    const areas: SpacingArea[] = [];
    const gapHost = rule?.gapElement?.(host) ?? null;
    // 0 areas only where a prop sets them: a read-only 0 has nothing to show.
    for (const raw of measureSpacing(host, true, Boolean(rule))) {
      const box = raw.zero ? zeroBand(toBox(raw.rect), raw) : toBox(raw.rect);
      const zero = raw.zero ? { zero: true } : {};
      if (raw.kind === "padding") {
        const horizontal = raw.side === "left" || raw.side === "right";
        const props = (horizontal ? rule?.paddingX : rule?.paddingY) ?? [];
        if (raw.zero && !props.length) continue;
        const alt = props.length && rule?.alt ? { altProp: rule.alt, altClears: [...new Set([...(rule.paddingX ?? []), ...(rule.paddingY ?? [])])].filter((name) => name !== rule.alt) } : {};
        areas.push({ ...box, kind: "padding", side: raw.side, px: raw.px, props, ...alt, scale: rule?.paddingScale && props.length ? rule.paddingScale : "padding", ...zero });
      } else {
        const props = gapHost ? [] : (raw.side === "column" ? rule?.columnGap : rule?.rowGap) ?? [];
        if (raw.zero && !props.length) continue;
        areas.push({ ...box, kind: "gap", side: raw.side, px: raw.px, props, scale: "gap", ...zero });
      }
    }
    // A Zen Grid: the free space of a px column wider than its only item (SpacingLayer offers Fit column to content).
    if (rule && hit.name === "Grid") {
      for (const free of freeAreas(host)) areas.push({ ...toBox(free.rect), kind: "free", side: "column", px: free.column.px - free.column.content, props: [], scale: "gap", column: free.column });
    }
    if (gapHost && rule) {
      // A row of options keeps its own column gap (form.css): only the gap between lines follows the prop there.
      const row = gapHost.getAttribute("data-direction") === "row";
      for (const raw of measureSpacing(gapHost, false, true)) {
        const props = raw.side === "column" ? (row ? [] : rule.columnGap ?? []) : rule.rowGap ?? [];
        if (raw.zero && !props.length) continue;
        areas.push({ ...(raw.zero ? zeroBand(toBox(raw.rect), raw) : toBox(raw.rect)), kind: "gap", side: raw.side, px: raw.px, props, scale: "gap", ...(raw.zero ? { zero: true } : {}) });
      }
    }
    const editable = Boolean(rule) && areas.some((area) => area.props.length > 0);
    return { owner: { src: hit.src, name: hit.name, host, editable, props: hit.props }, areas };
  } catch {
    return none;
  }
}

/** A 0 area's hit band: a padding side inward from its edge, a gap centred on the seam between its neighbours. */
function zeroBand(box: Box, raw: RawArea): Box {
  const across = raw.kind === "gap" ? raw.side === "column" : raw.side === "left" || raw.side === "right";
  const shift = raw.kind === "gap" ? -ZERO_BAND / 2 : raw.side === "right" || raw.side === "bottom" ? -ZERO_BAND : 0;
  return across ? { ...box, x: box.x + shift, w: ZERO_BAND } : { ...box, y: box.y + shift, h: ZERO_BAND };
}

const sameColumn = (a: SpacingArea["column"], b: SpacingArea["column"]) => a === b || Boolean(a && b && a.index === b.index && a.px === b.px && a.content === b.content);
const sameArea = (a: SpacingArea, b: SpacingArea) => a.kind === b.kind && a.side === b.side && a.zero === b.zero && a.scale === b.scale && a.altProp === b.altProp && (a.altClears ?? []).join() === (b.altClears ?? []).join()
  && sameColumn(a.column, b.column)
  && Math.abs(a.px - b.px) < 0.01 && a.props.join() === b.props.join()
  && Math.abs(a.x - b.x) < 0.25 && Math.abs(a.y - b.y) < 0.25 && Math.abs(a.w - b.w) < 0.25 && Math.abs(a.h - b.h) < 0.25;
export const sameAreas = (a: SpacingArea[], b: SpacingArea[]) => a.length === b.length && a.every((area, index) => sameArea(area, b[index]));
export const sameOwner = (a: SpacingOwner | null, b: SpacingOwner | null) => a === b || Boolean(a && b && a.src === b.src && a.name === b.name && a.host === b.host && a.editable === b.editable);

/* ───────────── Tokens ───────────── */

const gapKeys: ZenGap[] = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "giant", "xgiant", "2xgiant"];
const paddingKeys: ZenPadding[] = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];

/** The CSS custom property of a scale key ("--zen-spacing-gap-medium"), or null for none / an unknown key. */
export function tokenVariable(scale: SpacingScale, key: string): string | null {
  if (key === "none") return null;
  if (scale === "card") {
    const suffix = scaleTokenSuffix[normalizeScale(key) as ZenScale];
    return suffix ? `--zen-card-padding-${suffix}` : null;
  }
  try {
    const value = scale === "gap" ? gapValue(key as ZenGap) : paddingValue(key as ZenPadding);
    return /var\((--[\w-]+)\)/.exec(value ?? "")?.[1] ?? null;
  } catch {
    return null;
  }
}

let probe: HTMLElement | null = null;

/** A resolved length ("16px", "calc(…)") in CSS px. */
function lengthPx(value: string): number | null {
  const plain = /^(-?\d*\.?\d+)px$/.exec(value);
  if (plain) return Number(plain[1]);
  if (value === "0") return 0;
  if (typeof document === "undefined") return null;
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;top:0;left:0;height:0;";
  }
  if (!probe.isConnected) document.body.append(probe);
  probe.style.width = value;
  const width = parseFloat(getComputedStyle(probe).width);
  return Number.isFinite(width) ? width : null;
}

/** What a scale key measures on `element` (its density, breakpoint and mode), in CSS px; null when it cannot be read. */
export function tokenPx(element: Element, scale: SpacingScale, key: string): number | null {
  if (key === "none") return 0;
  const variable = tokenVariable(scale, key);
  if (!variable) return null;
  const value = getComputedStyle(element).getPropertyValue(variable).trim();
  return value ? lengthPx(value) : null;
}

/** "paddingX" → "padding-x". */
export const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export type SpacingOption = { key: string; px: number | null };

/** The keys a prop's type allows (in scale order), each with what it measures on `element`. */
export function spacingOptions(component: string, prop: string, element: Element, scale: SpacingScale): SpacingOption[] {
  const type = componentSchema(component)?.props.find((candidate) => candidate.name === prop)?.type;
  const editor = type ? editorFor(type) : null;
  const keys = editor?.kind === "enum" ? editor.options : [];
  const options = keys.map((key) => ({ key, px: tokenPx(element, scale, key) }));
  // A short list of named sizes (Card: md, sm) reads smallest first.
  return scale === "card" ? options.sort((a, b) => (a.px ?? 0) - (b.px ?? 0)) : options;
}

/** The documented default of a prop ("md"), short spelling. */
export function defaultKey(component: string, prop: string): string | null {
  const value = parseDefault(componentSchema(component)?.props.find((candidate) => candidate.name === prop)?.default ?? null);
  return typeof value === "string" ? normalizeScale(value) : null;
}

/** The key whose token measures `px` (the documented default first), or null. */
export function keyForPx(options: SpacingOption[], px: number, preferred?: string | null): string | null {
  const near = (option: SpacingOption) => option.px !== null && Math.abs(option.px - px) < 0.5;
  const first = preferred ? options.find((option) => option.key === preferred && near(option)) : undefined;
  return (first ?? options.find(near))?.key ?? null;
}

/** For read-only areas: the Spacing/Gap or Spacing/Padding step a length matches, if any. */
export function familyKeyForPx(element: Element, scale: "gap" | "padding", px: number): string | null {
  if (px <= 0) return null;
  const keys: string[] = scale === "gap" ? gapKeys : paddingKeys;
  return keyForPx(keys.map((key) => ({ key, px: tokenPx(element, scale, key) })), px);
}

/** The prop an area edits: the first of `props` written on the element (as an attribute), else the last. */
export function areaProp(area: SpacingArea, attributes: SourceAttr[] | null, alt: boolean): string | null {
  if (alt && area.altProp) return area.altProp;
  if (!area.props.length) return null;
  const written = attributes ? area.props.find((name) => attributes.some((attr) => attr.kind !== "spread" && attr.name === name)) : undefined;
  return written ?? area.props[area.props.length - 1];
}

export type AreaState = {
  prop: string | null;
  /** How the prop is written in the source (null while the source is not read, and for read-only areas). */
  value: PropValue | null;
  /** The scale key the area shows now: the written value, else the step its length matches. */
  key: string | null;
  /** px for the label: the area's own length, or the written step's when Alt edits another prop than the side's own. */
  px: number;
  bound: boolean;
  /** The prop whose expression or spread makes the area read-only, and how it is written. */
  boundBy: { prop: string; value: PropValue } | null;
  /** Alt: the sides differ (paddingX / paddingY written, `padding` not), so no one step is current. */
  mixed: boolean;
  /** Side props an Alt edit removes (written ones only), so the value reaches every side. */
  clears: string[];
  options: SpacingOption[];
};

/** Everything the label and the picker show for an area. */
export function areaState(area: SpacingArea, owner: SpacingOwner, attributes: SourceAttr[] | null, alt: boolean): AreaState {
  const prop = owner.editable ? areaProp(area, attributes, alt) : null;
  if (!prop) {
    const key = area.scale === "card" ? null : familyKeyForPx(owner.host, area.scale, area.px);
    return { prop: null, value: null, key, px: area.px, bound: false, boundBy: null, mixed: false, clears: [], options: [] };
  }
  const options = spacingOptions(owner.name, prop, owner.host, area.scale);
  // A spread that the live props show not to set the prop ({...rest} carrying a className) leaves it unset, editable.
  const read = (name: string): PropValue => { const found = valueOf(attributes ?? [], name, owner.props); return found.state === "spread" && owner.props && found.live === undefined ? { state: "unset" } : found; };
  const value = attributes ? read(prop) : null;
  // Alt edits `padding` on every side: the side props written beside it give way (an expression never does).
  const otherProp = alt && area.altProp === prop && !area.props.includes(prop);
  const sides = otherProp && attributes ? (area.altClears ?? []).map((name) => ({ name, value: read(name) })).filter((side) => side.value.state !== "unset") : [];
  const boundSide = sides.find((side) => side.value.state !== "literal");
  const boundBy = value && (value.state === "bound" || value.state === "spread") ? { prop, value } : boundSide ? { prop: boundSide.name, value: boundSide.value } : null;
  const bound = Boolean(boundBy);
  const literal = value?.state === "literal" && typeof value.value === "string" ? normalizeScale(value.value) : null;
  const known = literal && options.some((option) => option.key === literal) ? literal : null;
  const mixed = !known && sides.length > 0;
  const key = known ?? (mixed ? null : keyForPx(options, area.px, defaultKey(owner.name, prop)));
  // Alt while this side shows paddingX/paddingY: show the written step's own length.
  const px = otherProp && known ? options.find((option) => option.key === known)?.px ?? area.px : area.px;
  return { prop, value, key, px, bound, boundBy, mixed, clears: sides.map((side) => side.name), options };
}

/** "gap · md · 16", "padding-x · bound · 20", "padding · 10". */
export function areaLabel(area: SpacingArea, state: AreaState): string {
  const name = state.prop ? kebab(state.prop) : area.kind;
  const px = Number.isInteger(state.px) ? String(state.px) : state.px.toFixed(1);
  const middle = state.bound ? "bound" : state.mixed ? "mixed" : state.key;
  return [name, middle, state.mixed ? null : px].filter(Boolean).join(" · ");
}

/**
 * A free area's fix: the Grid's px column at its item's width (columns="…", or the `columns` field read at the frame's
 * breakpoint). Null for another area, a column the source does not size in px (fr, auto, a count) or a bound value.
 */
export function fitColumn(area: SpacingArea, owner: SpacingOwner, attributes: SourceAttr[] | null): { ops: EditOp[]; px: number; label: string } | null {
  if (area.kind !== "free" || !area.column || !attributes || owner.name !== "Grid") return null;
  const source = columnsSource(attributes, breakpointOf(owner.host));
  const list = source ? withTrackPx(source.list, area.column.index, area.column.content) : null;
  if (!source || !list) return null;
  const at = source.field ? `columns.${source.field}` : "columns";
  return { ops: [columnsOp(source, list)], px: area.column.content, label: `Grid ${at} → "${list}"` };
}

/** "column 1 · 80 free". */
export const freeLabel = (area: SpacingArea) => `column ${(area.column?.index ?? 0) + 1} · ${Number.isInteger(area.px) ? area.px : area.px.toFixed(1)} free`;
