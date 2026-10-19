import { announceEditStatus } from "../api";
import { findFrame } from "../board/frames";
import { layerPicture } from "../builder/export/htmlExport";
import { canvasApi } from "../canvas/viewport";
import { exportSettingsOf } from "../inspector/ExportSection";
import { displayName } from "../select/layerMeta";
import { findBySrc } from "../select/picker";
import { srcAttr } from "../select/srcIds";
import { modKey } from "../shell/modKey";
import { pageKey, studioStore } from "../store";
import type { StudioSelection } from "../types";
import { clipboardActions } from "./clipboard";

/*
 * Figma's Copy as (plan docs/research/studio-figma-design-parity-2026-10-18.md F3) for the selected layer: as code (its
 * JSX, as ⌘C copies it), as CSS (how it lays out and what it paints, each value by the Zen variable it reads when one
 * matches it, else the value), as PNG (⇧⌘C: a picture on the clipboard at 2x, or at the layer's first export setting's
 * scale, as Figma copies) and as SVG (its markup as text). Both pictures are the Export section's drawing
 * (htmlExport.ts layerPicture, F5c): the layer alone at its size, in its modes; a frame copies its body.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/** ⇧⌘C (Ctrl+Shift+C elsewhere): Copy as PNG, as the menus write it. */
export const copyAsPngShortcut = modKey === "⌘" ? "⇧⌘C" : "Ctrl+Shift+C";

const done = (message: string) => announceEditStatus({ kind: "unchanged", message, at: Date.now() });
const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });

/** The variable families a CSS property's value may come from, most likely first. */
const FAMILIES: Readonly<Record<string, readonly string[]>> = {
  "background-color": ["--zen-color-background-", "--zen-color-surface-", "--zen-color-"],
  color: ["--zen-color-content-", "--zen-color-"],
  "border-color": ["--zen-color-border-", "--zen-color-"],
  gap: ["--zen-spacing-gap-", "--zen-spacing-"],
  "row-gap": ["--zen-spacing-gap-", "--zen-spacing-"],
  "column-gap": ["--zen-spacing-gap-", "--zen-spacing-"],
  padding: ["--zen-spacing-padding-", "--zen-spacing-"],
  "border-radius": ["--zen-radius-"],
  "box-shadow": ["--zen-effect-", "--zen-shadow-"],
};

/** Every Zen variable the provider around `host` defines, by its computed value. */
function variablesOf(host: Element): Map<string, string[]> {
  const scope = host.closest(".zen-provider") ?? document.documentElement;
  const style = getComputedStyle(scope);
  const byValue = new Map<string, string[]>();
  for (let index = 0; index < style.length; index++) {
    const name = style.item(index);
    if (!name.startsWith("--zen-")) continue;
    const value = normalise(style.getPropertyValue(name));
    if (value) byValue.set(value, [...(byValue.get(value) ?? []), name]);
  }
  return byValue;
}

/** A value as computed styles write it (colours as rgb(…), spacing as px), so a variable and a property compare. */
function normalise(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^#|^rgb|^hsl|^oklch|^color\(/.test(trimmed)) {
    const probe = document.createElement("i");
    probe.style.color = trimmed;
    document.body.append(probe);
    const rgb = getComputedStyle(probe).color;
    probe.remove();
    return rgb;
  }
  return trimmed;
}

/** `value` as `var(--zen-…)` when a variable of the property's family holds it, else as it is. */
function tokenFor(property: string, value: string, variables: Map<string, string[]>): string {
  const families = FAMILIES[property];
  const names = families ? variables.get(normalise(value)) : undefined;
  if (!families || !names) return value;
  for (const family of families) {
    const name = names.find((candidate) => candidate.startsWith(family));
    if (name) return `var(${name})`;
  }
  return value;
}

/** The CSS declarations a person reads a layer by: its box, its auto layout, its paint and its text. */
export function cssOf(host: HTMLElement): string[] {
  const style = getComputedStyle(host);
  const variables = variablesOf(host);
  const out: string[] = [];
  const add = (property: string, value: string | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    out.push(`${property}: ${tokenFor(property, value, variables)};`);
  };
  add("width", `${Math.round(host.offsetWidth)}px`);
  add("height", `${Math.round(host.offsetHeight)}px`);
  if (style.position === "absolute") {
    add("position", "absolute");
    add("left", `${Math.round(host.offsetLeft)}px`);
    add("top", `${Math.round(host.offsetTop)}px`);
  }
  if (style.display.includes("flex")) {
    add("display", "flex");
    add("flex-direction", style.flexDirection);
    if (style.flexWrap !== "nowrap") add("flex-wrap", style.flexWrap);
    if (style.justifyContent !== "normal" && style.justifyContent !== "flex-start") add("justify-content", style.justifyContent);
    if (style.alignItems !== "normal" && style.alignItems !== "stretch") add("align-items", style.alignItems);
    if (style.rowGap !== "normal" && style.rowGap !== "0px") add("gap", style.rowGap === style.columnGap ? style.rowGap : `${style.rowGap} ${style.columnGap}`);
  } else if (style.display === "grid") {
    add("display", "grid");
    add("grid-template-columns", style.gridTemplateColumns);
    if (style.rowGap !== "normal" && style.rowGap !== "0px") add("gap", style.rowGap);
  }
  const padding = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
  if (padding.some((side) => side !== "0px")) {
    const sides = padding.every((side) => side === padding[0]) ? [padding[0]] : padding;
    out.push(`padding: ${sides.map((side) => tokenFor("padding", side, variables)).join(" ")};`);
  }
  if (style.backgroundColor !== "rgba(0, 0, 0, 0)") add("background-color", style.backgroundColor);
  if (style.backgroundImage !== "none") add("background-image", style.backgroundImage);
  if (parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== "none") {
    out.push(`border: ${style.borderTopWidth} ${style.borderTopStyle} ${tokenFor("border-color", style.borderTopColor, variables)};`);
  }
  if (style.borderRadius !== "0px") add("border-radius", style.borderRadius);
  if (style.boxShadow !== "none") add("box-shadow", style.boxShadow);
  if (style.opacity !== "1") add("opacity", style.opacity);
  // Text: a layer that holds text of its own (a Text, a Heading, a label).
  if (Array.from(host.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) {
    add("color", style.color);
    add("font-family", style.fontFamily);
    add("font-size", style.fontSize);
    add("font-weight", style.fontWeight);
    add("line-height", style.lineHeight);
    if (style.letterSpacing !== "normal") add("letter-spacing", style.letterSpacing);
  }
  return out;
}

const hostOf = (selection: NodeSelection) => {
  const world = canvasApi.getWorldElement();
  const hit = world ? findBySrc(world, selection.src)[selection.instance] : undefined;
  const host = hit?.hosts[0];
  return host instanceof HTMLElement ? { host, hit } : null;
};

/** Figma's Copy as CSS: the layer's declarations on the clipboard, under its name. */
export async function copyAsCss(selection: NodeSelection): Promise<boolean> {
  const found = hostOf(selection);
  if (!found) { fail(`${selection.name} is not on the canvas right now`); return false; }
  const name = displayName(selection.name, found.hit?.props, selection.src);
  const text = `/* ${name} */\n${cssOf(found.host).join("\n")}\n`;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    fail("The browser did not let the Studio write to the clipboard");
    return false;
  }
  done(`Copied ${name} as CSS`);
  return true;
}

/** Figma's Copy as code: the layer's JSX (Zen's code), as ⌘C copies it. */
export async function copyAsCode(selection: NodeSelection): Promise<boolean> {
  const copied = await clipboardActions.copy(selection);
  if (copied !== false) done(`Copied ${selection.name} as code`);
  return copied !== false;
}

/**
 * What a picture copy draws: a layer's own element (the one its source writes, as the Export section draws it) or a
 * frame's body, its name, and the key its export settings are kept under (ExportSection: `src`, or the frame's).
 */
function pictureTarget(selection: StudioSelection | null): { host: HTMLElement; name: string; key: string } | null {
  if (selection?.kind === "frame") {
    const frame = findFrame(selection.frameId);
    if (!frame?.element.isConnected) return null;
    const state = studioStore.getState();
    return { host: frame.element, name: frame.label, key: `frame:${pageKey(state.page, state.collection, state.localPage)}:${frame.id}` };
  }
  if (selection?.kind !== "node" || selection.part) return null;
  const world = canvasApi.getWorldElement();
  const hit = world ? findBySrc(world, selection.src)[selection.instance] : undefined;
  const hosts = (hit?.hosts ?? []).filter((node): node is HTMLElement => node instanceof HTMLElement);
  const host = hosts.find((node) => srcAttr(node) === selection.src) ?? hosts[0];
  return host ? { host, name: displayName(selection.name, hit?.props, selection.src), key: selection.src } : null;
}

/**
 * Figma's Copy as PNG (⇧⌘C): the selected layer or frame as a picture on the clipboard, at its first export setting's
 * scale, else 2x. The clipboard item takes the drawing as a promise, so the write starts inside the key press (the
 * browser asks for one; the drawing itself takes a moment).
 */
export async function copyAsPng(selection: StudioSelection | null): Promise<boolean> {
  const target = pictureTarget(selection);
  if (!target) { fail("Select a layer or a frame to copy as PNG"); return false; }
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) { fail("This browser cannot put a picture on the clipboard"); return false; }
  const scale = exportSettingsOf(target.key)[0]?.scale ?? 2;
  const picture = layerPicture(target.host, { format: "png", scale });
  const blob = picture.then((result) => { if ("error" in result) throw new Error(result.error); return result.blob; });
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  } catch {
    const result = await picture.catch(() => null);
    fail(result && "error" in result ? `Couldn't copy ${target.name} as PNG. ${result.error}` : "The browser did not let the Studio put a picture on the clipboard");
    return false;
  }
  const result = await picture;
  const note = "error" in result ? null : result.notes[0];
  done(`Copied ${target.name} as PNG${scale === 1 ? "" : ` (${scale}x)`}${note ? ` · ${note}` : ""}`);
  return true;
}

/** Figma's Copy as SVG: the selected layer or frame as SVG markup (text), as the Export section's SVG draws it. */
export async function copyAsSvg(selection: StudioSelection | null): Promise<boolean> {
  const target = pictureTarget(selection);
  if (!target) { fail("Select a layer or a frame to copy as SVG"); return false; }
  const result = await layerPicture(target.host, { format: "svg", scale: 1 });
  if ("error" in result) { fail(`Couldn't copy ${target.name} as SVG. ${result.error}`); return false; }
  try {
    await navigator.clipboard.writeText(await result.blob.text());
  } catch {
    fail("The browser did not let the Studio write to the clipboard");
    return false;
  }
  done(`Copied ${target.name} as SVG${result.notes[0] ? ` · ${result.notes[0]}` : ""}`);
  return true;
}
