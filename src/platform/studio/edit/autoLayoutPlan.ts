/*
 * The plans of Figma's Add / Remove auto layout (edit/autoLayout.ts), from the layers' boxes as the canvas measures them:
 * pure, so tools/studio/autolayout-matrix.mjs checks them on thousands of arrangements. The code they become is
 * tools/studio/relayout.mjs relayoutCode.
 */

/** Where a layer sits in its frame (px from the frame's padding box) and what its element is. */
export type PlanLayer = {
  box: { x: number; y: number; w: number; h: number };
  /** The element's name (Stack, Button…). */
  name: string;
  /** A Box that only floats one layer (position/float.ts isFloatWrapper): Add auto layout gives the layer back. */
  floatWrapper: boolean;
  /** Its width / height sized by the flow (written "fill", or stretched): Remove auto layout fixes them as they show. */
  fill?: { width?: boolean; height?: boolean };
};

export const POSITION = ["position", "constraintX", "constraintY", "insetTop", "insetRight", "insetBottom", "insetLeft"];
export const FLOW = ["direction", "gap", "align", "justify", "wrap", "padding", "paddingX", "paddingY", "fillChildren"];
/** A Box prop that paints: such a frame keeps its Box and takes the auto layout inside. */
export const PAINTS = ["surface", "border", "radius", "radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft", "effectStyle", "clip", "scroll"];
/** Layers that float themselves (position absolute); any other floats in a Box around it. */
export const FLOATS = new Set(["Stack", "Grid", "Box", "Shape"]);

/** A spacing step for a px length ("none" under half a pixel). */
export type KeyOf = (scale: "gap" | "padding", px: number) => string;

export type AddPlan = {
  row: boolean;
  /** The layers' new order (indexes into the given layers). */
  order: number[];
  gap: string;
  padding: { padding?: string } | { paddingX?: string; paddingY?: string };
  align: "center" | "end" | undefined;
  /** relayout.mjs plan. */
  plan: Record<string, unknown>;
};

/**
 * Add auto layout: side by side when the layers' centres spread more across than down (Figma reads their places the
 * same way), in that order; the gap the mean of the spaces between them, the padding the space before the first,
 * both snapped to the spacing steps; across the flow the edge or centre they share. A painted frame keeps its Box and
 * takes a Stack inside (also when it is empty, so it still gets auto layout).
 */
export function addPlan(layers: readonly PlanLayer[], keyOf: KeyOf, painted: boolean): AddPlan {
  const spread = (values: number[]) => (values.length ? Math.max(...values) - Math.min(...values) : 0);
  const row = layers.length > 1 && spread(layers.map((layer) => layer.box.x + layer.box.w / 2)) > spread(layers.map((layer) => layer.box.y + layer.box.h / 2));
  const order = layers.map((_, index) => index).sort((a, b) => (row ? layers[a].box.x - layers[b].box.x : layers[a].box.y - layers[b].box.y) || a - b);
  const sorted = order.map((index) => layers[index]);
  const gaps = sorted.slice(1).map((layer, index) => (row ? layer.box.x - (sorted[index].box.x + sorted[index].box.w) : layer.box.y - (sorted[index].box.y + sorted[index].box.h)));
  const gap = gaps.length ? keyOf("gap", Math.max(0, gaps.reduce((sum, value) => sum + value, 0) / gaps.length)) : "none";
  const left = layers.length ? Math.max(0, Math.min(...layers.map((layer) => layer.box.x))) : 0;
  const top = layers.length ? Math.max(0, Math.min(...layers.map((layer) => layer.box.y))) : 0;
  const padX = keyOf("padding", left);
  const padY = keyOf("padding", top);
  const padding = padX === padY ? { padding: padX === "none" ? undefined : padX } : { paddingX: padX === "none" ? undefined : padX, paddingY: padY === "none" ? undefined : padY };
  // Across the flow: the line the layers share best (start, centre or end edge, within 2px), whatever their source
  // order; a tie keeps the start (autolayout matrix, 2026-10-17: the first layer once decided it).
  const lane = (at: (box: PlanLayer["box"]) => number) => spread(layers.map((layer) => at(layer.box)));
  const lanes = {
    start: lane((box) => (row ? box.y : box.x)),
    center: lane((box) => (row ? box.y + box.h / 2 : box.x + box.w / 2)),
    end: lane((box) => (row ? box.y + box.h : box.x + box.w)),
  };
  const best = (["start", "center", "end"] as const).reduce((a, b) => (lanes[b] < lanes[a] ? b : a));
  const align = layers.length < 2 || best === "start" || lanes[best] >= 2 ? undefined : best;
  // Stack's own defaults (column, gap md) stay unwritten.
  const flow = { direction: row ? "row" : undefined, gap: gap === "md" ? undefined : gap, align };
  // Only a layer that floats itself loses its X / Y: another component's own `position` (an ActionBar's sticky / fixed /
  // static) is its behaviour, never a place (autolayout matrix, 2026-10-17).
  const children = layers.map((layer) => (layer.floatWrapper ? { unwrap: true } : FLOATS.has(layer.name) ? { remove: POSITION } : {}));
  const plan = painted
    ? { tag: "Box", set: padding, remove: ["width", "height", "padding", "paddingX", "paddingY"], children, order, wrap: { tag: "Stack", set: flow } }
    : { tag: "Stack", set: { ...flow, ...padding }, remove: ["width", "height", "padding", "paddingX", "paddingY", ...PAINTS], children, order };
  return { row, order, gap, padding, align, plan };
}

/**
 * Remove auto layout: a Box of the size the frame has now, each layer at the X / Y it shows (px); a layer that cannot
 * float itself floats in a Box around it; a layer that filled the flow keeps the size it shows (Figma: Fill becomes
 * Fixed once the frame has no auto layout).
 */
export function removePlan(layers: readonly PlanLayer[], size: { width: number; height: number }): Record<string, unknown> {
  const px = (value: number) => Math.round(value);
  const children = layers.map((layer) => {
    const place = { position: "absolute", insetLeft: px(layer.box.x), insetTop: px(layer.box.y) };
    const size = { width: layer.fill?.width ? px(layer.box.w) : undefined, height: layer.fill?.height ? px(layer.box.h) : undefined };
    if (FLOATS.has(layer.name)) return { set: { ...place, ...size }, remove: ["alignSelf"] };
    // Another component floats in a Box; a size the flow gave it goes on that Box, which it fills as before.
    return { float: { set: { ...place, ...size } } };
  });
  return { tag: "Box", set: { width: px(size.width), height: px(size.height) }, remove: [...FLOW, "width", "height"], children };
}

/**
 * The code of a layer placed at (x, y) px in a Frame without auto layout: a Stack, Grid, Box or Shape floats itself
 * (position absolute, insets), anything else floats in a Box of its own (the Studio's floating wrapper, which a later
 * drag moves with smart guides, edit/drag.ts floatOf).
 */
export function floatingCode(code: string, root: string, x: number, y: number): string {
  const place = `position="absolute" insetLeft={${Math.round(x)}} insetTop={${Math.round(y)}}`;
  const trimmed = code.trim();
  if (/^(Stack|Grid|Box|Shape)$/.test(root) && trimmed.startsWith(`<${root}`)) return trimmed.replace(new RegExp(`^<${root}(?=[\\s/>])`), `<${root} ${place}`);
  return `<Box ${place}>\n${trimmed.split("\n").map((line) => `  ${line}`).join("\n")}\n</Box>`;
}
