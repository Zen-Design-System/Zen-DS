import { HIDDEN_SLOTS_PROP, hiddenSlotsOf } from "../../../../tools/studio/visibility.mjs";
import type { ScreenPart } from "./proto/runtime";
import type { PageNode } from "./render/renderPage";

/*
 * A Screen's phone parts in the page (studio-responsive-breakpoints §3.6), pure so screenModel.selftest.mjs runs it in
 * Node: its root AppShell, and where a part the canvas adds goes (builder/screenParts.ts writes it).
 */

/** A Screen's lone root AppShell, or null. */
export function rootShellOf(screen: PageNode): PageNode | null {
  const content = screen.children.filter((child) => !(child.kind === "text" && !child.value.trim()));
  return content.length === 1 && content[0].kind === "element" && content[0].name === "AppShell" ? content[0] : null;
}

/**
 * Where a part goes: the root AppShell, unless the Screen draws phone parts of its own in the mobile layout (it then
 * shows those instead of the AppShell's frame, runtime.tsx), or has this one switched off, or has no root AppShell.
 * A desktop Screen narrowed to a phone's width (the desktop layout) shows its AppShell, so the part goes there.
 */
export function partHost(screen: PageNode, part: ScreenPart, layout: "mobile" | "desktop"): PageNode {
  const shell = rootShellOf(screen);
  if (!shell) return screen;
  if (layout === "desktop") return shell;
  const off = hiddenSlotsOf(screen.props[HIDDEN_SLOTS_PROP]);
  const other: ScreenPart = part === "topNavigation" ? "bottomNavigation" : "topNavigation";
  const own = (prop: ScreenPart) => screen.props[prop]?.kind === "element";
  return (own(part) && off.includes(part)) || (own(other) && !off.includes(other)) ? screen : shell;
}

