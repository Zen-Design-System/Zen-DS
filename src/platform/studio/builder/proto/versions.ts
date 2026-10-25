import { BREAKPOINTS, breakpointOfWidth, screenBreakpoint, type ZenBreakpointKey } from "../../../../../tools/studio/screen-devices.mjs";
import type { PageNode, PageTree } from "../render/renderPage";
import type { PageDevice } from "./runtime";

/*
 * A Screen's versions (Make a separate Screen, docs/research/studio-responsive-breakpoints-2026-10-26.md §5): a Screen
 * drawn for a breakpoint with `versionOf="<primary id>"`. Play, Present and Open on phone show the version for the
 * viewport's breakpoint wherever the flow reaches the primary (decision D4: `proto.navigate("home")` at a phone's width
 * shows `home-mobile`). Pure: the Player, the phone's DevicePlay and Present share it.
 */

/** A Screen as the versions read it. */
export type VersionScreen = { id: string; versionOf?: string; device: PageDevice; width?: number };

const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/** The page's Screens (one per id: its default state's) as versions read them. */
export function versionScreensOf(tree: PageTree | null): VersionScreen[] {
  const seen = new Set<string>();
  return (tree?.board?.children ?? []).flatMap((child) => {
    if (child.kind !== "element" || child.name !== "Screen") return [];
    const id = String(literal(child, "id") ?? "");
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const device = (literal(child, "device") as PageDevice | undefined) ?? "desktop";
    const width = literal(child, "width");
    const versionOf = literal(child, "versionOf");
    return [{ id, device, width: typeof width === "number" ? width : undefined, versionOf: typeof versionOf === "string" && versionOf !== id ? versionOf : undefined }];
  });
}

/** The breakpoint a viewport `width` wide shows (a phone or tablet device keeps its own). */
export const viewportBreakpoint = (width: number, device?: PageDevice): ZenBreakpointKey => (device ? screenBreakpoint(device, width) : breakpointOfWidth(width));

/**
 * The Screen to show for `id` at `breakpoint`: the primary's version drawn for that breakpoint, else the version of the
 * nearest wider breakpoint below desktop (a phone without its own takes the tablet's), else the primary. `id` may name a
 * version: a link to `home-mobile` at desktop width shows `home`.
 */
export function versionFor(screens: ReadonlyArray<VersionScreen>, id: string, breakpoint: ZenBreakpointKey): string {
  const own = screens.find((screen) => screen.id === id);
  const primary = own?.versionOf && screens.some((screen) => screen.id === own.versionOf) ? own.versionOf : id;
  const versions = screens.filter((screen) => screen.versionOf === primary);
  if (!versions.length) return id;
  // mobile → mobile, then tablet; tablet → tablet; desktop → the primary.
  const order = BREAKPOINTS.slice(1, BREAKPOINTS.indexOf(breakpoint) + 1).reverse();
  for (const key of order) {
    const match = versions.find((screen) => screenBreakpoint(screen.device, screen.width) === key);
    if (match) return match.id;
  }
  return primary;
}
