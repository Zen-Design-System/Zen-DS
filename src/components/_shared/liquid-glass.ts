import { useCallback } from "react";
import { glassStyles, type GlassParams, type GlassStyleName } from "../../styles/generated/glass-styles";

/*
 * Figma's GLASS effect (Liquid-Glass/Normal · Liquid-Glass/Large · Glass-Floating, src/styles/generated/glass-styles.ts)
 * drawn in the browser:
 *   - frost: the backdrop blurred by `frost` / 2 (Figma's blur radii map to CSS that way);
 *   - refraction: near the edge the backdrop bends, along a convex bezel `depth` px wide that pulls the picture in by up
 *     to refraction × depth / 2 px, so straight lines behind the glass curve at its rim;
 *   - dispersion: each colour bends a little differently (the coloured fringe at the rim);
 *   - light: the bevel's specular rim, white, brightest at the edge facing `lightAngle` and the one opposite, fading a
 *     third of the depth in, `lightIntensity` strong; painted above the element's own fill (an inline background-image).
 *
 * The bend is an SVG filter used as `backdrop-filter: url(#…)`, with a displacement map drawn for the element's size and
 * corner radius (redrawn when it resizes). Only Chromium draws SVG backdrop filters: elsewhere, and with
 * prefers-reduced-transparency, the element keeps its CSS frost (backdrop-filter: blur) and its fill, unchanged.
 *
 *   const glass = useLiquidGlass("liquid-glass-normal", style === "liquid-glass");
 *   <form ref={glass} …>
 */

const SVG_NS = "http://www.w3.org/2000/svg";
let host: SVGSVGElement | null = null;
let serial = 0;
const maps = new Map<string, string>();
const MAP_CACHE = 64;

/** Chromium is the engine that draws an SVG filter as a backdrop filter. */
function canRefract(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined" || typeof ResizeObserver === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-transparency: reduce)").matches) return false;
  const brands = (navigator as Navigator & { userAgentData?: { brands?: Array<{ brand: string }> } }).userAgentData?.brands;
  if (brands?.length) return brands.some((entry) => /Chromium|Google Chrome|Microsoft Edge|Opera/.test(entry.brand));
  return /Chrome\//.test(navigator.userAgent) && !/CriOS|FxiOS|Firefox/.test(navigator.userAgent);
}

/** One hidden <svg> holds every glass filter of the document. */
function filterHost(): SVGSVGElement {
  if (host?.isConnected) return host;
  host = document.createElementNS(SVG_NS, "svg");
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("focusable", "false");
  host.setAttribute("width", "0");
  host.setAttribute("height", "0");
  host.setAttribute("data-zen-liquid-glass", "");
  host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  document.body.appendChild(host);
  return host;
}

/** A drawn map (data URL) by its key, the oldest dropped past MAP_CACHE. */
function cached(key: string, draw: () => string): string {
  const hit = maps.get(key);
  if (hit) return hit;
  const url = draw();
  if (maps.size >= MAP_CACHE) maps.delete(maps.keys().next().value as string);
  maps.set(key, url);
  return url;
}

/**
 * Draws a w×h map pixel by pixel: `paint(data, at, inside, nx, ny)` gets the pixel's offset in `data`, its distance in
 * from the edge of the rounded rectangle (corner r) and the outward normal there.
 */
function drawMap(w: number, h: number, r: number, paint: (data: Uint8ClampedArray, at: number, inside: number, nx: number, ny: number) => void): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(w, h);
  const halfW = w / 2, halfH = h / 2, innerW = halfW - r, innerH = halfH - r;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const px = x + 0.5 - halfW, py = y + 0.5 - halfH;
      const qx = Math.abs(px) - innerW, qy = Math.abs(py) - innerH;
      const at = (y * w + x) * 4;
      if (qx > 0 && qy > 0) {
        const length = Math.hypot(qx, qy) || 1;
        paint(image.data, at, r - length, (qx / length) * Math.sign(px), (qy / length) * Math.sign(py));
      } else if (qx > qy) paint(image.data, at, r - qx, Math.sign(px), 0);
      else paint(image.data, at, r - qy, 0, Math.sign(py));
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/** The displacement map: red and green are 128 ± the inward shift, full at the edge and gone `depth` px in along a convex
 *  bezel (1 − √(1 − t²)). Inward: the rim shows what lies a little further in. */
const displacementMap = (w: number, h: number, r: number, depth: number) => cached(`d${w}x${h}:${r}:${depth}`, () => drawMap(w, h, r, (data, at, inside, nx, ny) => {
  const t = Math.min(1, Math.max(0, 1 - inside / depth));
  const bend = 1 - Math.sqrt(1 - t * t);
  data[at] = Math.round(128 - nx * bend * 127);
  data[at + 1] = Math.round(128 - ny * bend * 127);
  data[at + 2] = 128;
  data[at + 3] = 255;
}));

/** The bevel's light: white, `intensity` at the edge facing the light and the one opposite (Figma's −45° lights the
 *  top-left rim), a third as bright across them, fading out a third of `depth` in. */
const lightMap = (w: number, h: number, r: number, depth: number, angle: number, intensity: number) => cached(`l${w}x${h}:${r}:${depth}:${angle}:${intensity}`, () => {
  const radians = (angle * Math.PI) / 180;
  const lx = -Math.cos(radians), ly = Math.sin(radians);
  const rim = Math.max(2, depth / 3);
  return drawMap(w, h, r, (data, at, inside, nx, ny) => {
    if (inside < 0 || inside > rim) return;
    const facing = Math.abs(nx * lx + ny * ly);
    const alpha = intensity * (0.33 + 0.67 * facing) * (1 - inside / rim) ** 2;
    data[at] = 255;
    data[at + 1] = 255;
    data[at + 2] = 255;
    data[at + 3] = Math.round(alpha * 255);
  });
});

const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number>) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
};

/** Keeps one colour channel of a displaced backdrop (alpha kept). */
const CHANNEL = {
  r: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  g: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  b: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
} as const;

/** The filter of one element: frost → three displacements (one per colour, for the dispersion) → recombined. */
function createFilter(id: string, params: GlassParams) {
  const filter = svg("filter", { id, x: 0, y: 0, width: 1, height: 1, filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" });
  const frost = svg("feGaussianBlur", { in: "SourceGraphic", stdDeviation: params.frost / 2, edgeMode: "duplicate", result: "frost" });
  const image = svg("feImage", { x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: "none", result: "map" });
  const channels = (["r", "g", "b"] as const).map((channel) => ({
    channel,
    displace: svg("feDisplacementMap", { in: "frost", in2: "map", scale: 0, xChannelSelector: "R", yChannelSelector: "G", result: `d${channel}` }),
    keep: svg("feColorMatrix", { in: `d${channel}`, type: "matrix", values: CHANNEL[channel], result: channel }),
  }));
  const rg = svg("feBlend", { in: "r", in2: "g", mode: "screen", result: "rg" });
  const rgb = svg("feBlend", { in: "rg", in2: "b", mode: "screen" });
  filter.append(frost, image, ...channels.flatMap((entry) => [entry.displace, entry.keep]), rg, rgb);
  return { filter, image, channels };
}

/** Puts the glass on `element` and keeps its maps in step with its size; returns the cleanup. */
function attachGlass(element: HTMLElement, params: GlassParams): () => void {
  serial += 1;
  const id = `zen-liquid-glass-${serial}`;
  const parts = createFilter(id, params);
  filterHost().appendChild(parts.filter);
  let frame = 0;
  const draw = () => {
    frame = 0;
    const w = Math.round(element.offsetWidth), h = Math.round(element.offsetHeight);
    if (!w || !h) return;
    const radius = Math.round(Math.min(Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0, w / 2, h / 2));
    const depth = Math.max(1, Math.min(params.depth, w / 2, h / 2));
    for (const node of [parts.filter, parts.image]) { node.setAttribute("width", String(w)); node.setAttribute("height", String(h)); }
    parts.image.setAttribute("href", displacementMap(w, h, radius, depth));
    // Blue bends a little more than red: the dispersion fringe.
    const scale = params.refraction * depth;
    const spread = 0.25 * params.dispersion;
    for (const { channel, displace } of parts.channels) displace.setAttribute("scale", (scale * (channel === "r" ? 1 - spread : channel === "b" ? 1 + spread : 1)).toFixed(2));
    element.style.setProperty("-webkit-backdrop-filter", `url(#${id})`);
    element.style.setProperty("backdrop-filter", `url(#${id})`);
    element.style.setProperty("background-image", `url("${lightMap(w, h, radius, depth, params.lightAngle, params.lightIntensity)}")`);
    element.style.setProperty("background-size", "100% 100%");
    element.style.setProperty("background-repeat", "no-repeat");
  };
  const observer = new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(draw); });
  observer.observe(element);
  draw();
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    parts.filter.remove();
    for (const property of ["backdrop-filter", "-webkit-backdrop-filter", "background-image", "background-size", "background-repeat"]) element.style.removeProperty(property);
  };
}

/**
 * A ref that gives an element Figma's GLASS effect `style` (while `enabled`). One ref can go on several elements (each
 * gets its own filter); without Chromium it does nothing and the element keeps its CSS frost.
 */
export function useLiquidGlass(style: GlassStyleName, enabled = true) {
  return useCallback((element: HTMLElement | null) => {
    if (!element || !enabled || !canRefract()) return undefined;
    return attachGlass(element, glassStyles[style]);
  }, [style, enabled]);
}
