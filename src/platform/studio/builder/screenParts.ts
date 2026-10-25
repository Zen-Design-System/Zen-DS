import { screenChromeCode } from "../../../../tools/studio/screen-chrome.mjs";
import { HIDDEN_SLOTS_PROP, hiddenSlotsOf } from "../../../../tools/studio/visibility.mjs";
import { applyEdit } from "../api";
import { slotSwitchOp } from "../edit/visibility";
import { engineNow } from "./engine";
import type { ScreenPart } from "./proto/runtime";
import type { PageNode, PageTree } from "./render/renderPage";
import { partHost, rootShellOf } from "./screenModel";

/*
 * The phone parts a Screen lacks on the mobile breakpoint (docs/research/studio-responsive-breakpoints-2026-10-26.md
 * §3.6): the canvas's dashed "Add Top / Bottom Navigation" (runtime.tsx PartPlaceholder) writes the part into the
 * Screen's root AppShell, so the app gets it too (AppShell shows its mobile pattern below 1024 once it has a mobile part);
 * a Screen without one takes it as its own prop (the Screen section's Top / Bottom navigation). One edit, one undo step.
 */

const literalOf = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/** The Screens of a page by id (a Screen's default state first). */
export function screenNodeOf(tree: PageTree | null, id: string): PageNode | undefined {
  const screens = (tree?.board?.children ?? []).filter((child): child is PageNode => child.kind === "element" && child.name === "Screen" && literalOf(child, "id") === id);
  return screens.find((node) => literalOf(node, "state") === undefined) ?? screens[0];
}

/** Four plain destinations, when the Sidebar gives the Bottom Navigation fewer than two (decision D3). */
const BLANK_ITEMS = [1, 2, 3, 4].map((n) => `  { id: "item-${n}", label: "Item ${n}", icon: "icon-circle-line" },`);

/**
 * The code a part starts with: a Top Navigation with the Screen's title; a Bottom Navigation from the root AppShell
 * Sidebar's first top-level rows (icon and label, as the phone header is drawn from the desktop one:
 * tools/studio/responsive-header.mjs), else four blank items.
 */
export function partCode(screen: PageNode, part: ScreenPart, mock: Record<string, unknown> = {}): string {
  const title = String(literalOf(screen, "title") ?? literalOf(screen, "id") ?? "Untitled");
  if (part === "topNavigation") return screenChromeCode("topNavigation", title);
  const derived = rootShellOf(screen) ? engineNow()?.phoneChromeCode(screen, { mock }).bottomNavigation : null;
  return derived ?? [`<BottomNavigation value="item-1" showLabels items={[`, ...BLANK_ITEMS, `]} />`].join("\n");
}

/** Whether a Screen is a child screen (Back, two crumbs or more: component-usage-rules §17 R14), which takes no Bottom
 *  Navigation. Read from its desktop AppShell, as the phone header is drawn. */
export function isChildScreen(screen: PageNode, mock: Record<string, unknown> = {}): boolean {
  return Boolean(rootShellOf(screen)) && engineNow()?.phoneChromeCode(screen, { mock }).kind === "child";
}

/** Adds a missing phone part to a Screen: shows it again when it was switched off (its layers kept), else writes it. */
export function addScreenPart(file: string, tree: PageTree | null, id: string, part: ScreenPart, layout: "mobile" | "desktop") {
  const screen = screenNodeOf(tree, id);
  if (!screen) return;
  const host = partHost(screen, part, layout);
  const label = `${part === "topNavigation" ? "Top" : "Bottom"} navigation added`;
  const off = hiddenSlotsOf(host.props[HIDDEN_SLOTS_PROP]);
  const keep = off.includes(part) && host.props[part]?.kind === "element" ? slotSwitchOp(off, part, true) : null;
  const op = keep ?? { op: "insertChild" as const, prop: part, code: partCode(screen, part, (tree?.mock ?? {}) as Record<string, unknown>) };
  void applyEdit({ file, loc: host.loc, name: host.name, ops: [op] }, label);
}
