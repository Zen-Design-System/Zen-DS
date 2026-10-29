import { applyEdit, squashEdits } from "../../api";
import { inspectorStatus } from "../../inspector/status";
import type { EditOp } from "../../types";
import { loadEngine, zenComponents } from "../engine";
import type { PageTree } from "../render/renderPage";
import { getPage, pageFile } from "../store/pageStore";
import { snapshotTemplate } from "./fromTemplate";
import { overlayIds } from "./newPageFromFrame";
import { linkOverlays, starterOverlay, starterScreen } from "./toDialect";

/*
 * Add Screen › a template (walk 2026-10-29 W-49: Add Screen only made a blank Screen, so an app of template-quality
 * screens meant one page per template): the template renders off screen and is copied as New page copies it, then goes
 * into the open page as one more Screen, with its overlays as Overlay frames, opened by the buttons named as they are.
 * One undo step.
 */

/** Adds template `templateId` to page `localPage` as a Screen (and its overlays); the new Screen's frame id, or false. */
export async function addTemplateScreen(localPage: string, templateId: string): Promise<string | false> {
  const made = await snapshotTemplate(templateId);
  if (!made || !made.shot.nodes.length) {
    inspectorStatus.set("neutral", `${made?.title ?? "That template"} shows no library components to start a Screen from`);
    return false;
  }
  const [engine, page] = await Promise.all([loadEngine(), getPage(localPage)]);
  if (!page) return false;
  const tree = engine.parsePage(page.text, { components: new Set(zenComponents) }) as unknown as PageTree;
  if (!tree.board) return false;
  // Frame ids the page has: a new Screen and each overlay take free ones (an overlay "filter" twice becomes "filter-2").
  const taken = tree.board.children.flatMap((child) => (child.kind === "element" && child.props.id?.kind === "literal" ? [String(child.props.id.value)] : []));
  const id = engine.freeFrameId("screen", taken);
  const overlays = overlayIds(made.shot.overlays).map((overlay) => {
    let free = overlay.id;
    for (let n = 2; taken.includes(free) || free === id; n += 1) free = `${overlay.id}-${n}`;
    taken.push(free);
    return { ...overlay, id: free };
  });
  const linked = linkOverlays(made.shot.nodes, overlays);
  const codes = [starterScreen({ id, title: made.title, device: made.shot.device, nodes: made.shot.nodes, padding: made.shot.padding }), ...overlays.map(starterOverlay)];
  const label = `Add Screen from ${made.title}`;
  const before = page.text;
  let after = before;
  for (const [index, code] of codes.entries()) {
    // The Board as the last write left it (each insert is one edit; they become one undo step below).
    const board = (engine.parsePage(after, { components: new Set(zenComponents) }) as unknown as PageTree).board;
    if (!board) return false;
    const response = await applyEdit({ file: pageFile(localPage), loc: board.loc, name: "Board", ops: [{ op: "insertChild", code } as EditOp] }, label);
    if (!response.ok) return index ? `screen:${id}` : false;
    after = response.after;
  }
  if (codes.length > 1) squashEdits(codes.length, label, before, after);
  const unlinked = overlays.length - linked.length;
  inspectorStatus.set("positive", [
    `${made.title} added as a Screen`,
    overlays.length ? `${overlays.length === 1 ? "1 overlay" : `${overlays.length} overlays`} as Overlay frames${linked.length ? `, ${linked.length} opened by their buttons` : ""}${unlinked ? ` (link ${unlinked === overlays.length ? "their" : `the other ${unlinked}`} triggers in Prototype)` : ""}` : null,
  ].filter(Boolean).join(" · "));
  return `screen:${id}`;
}
