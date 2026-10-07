import { inspectorStatus } from "../../inspector/status";
import { openLocalPage } from "../../shell/navigation";
import { loadEngine, zenComponents } from "../engine";
import { freeId, putPage } from "../store/pageStore";
import { snapshotFrame, type Snapshot } from "./snapshot";
import { starterPage, starterTitle, type SnapNode } from "./toDialect";

/*
 * "New page from this frame" (Studio builder GĐ3b M1, the canvas menu of an example or template frame): a builder page,
 * kept in this browser, holding what the frame shows (./snapshot.ts) as one Screen, then opened on the canvas. The
 * status line says what could not be kept.
 */

/** How many notes the status line lists before "N more". */
const LISTED = 3;

export async function newPageFromFrame(frame: { element: Element; label: string }): Promise<string | null> {
  return pageFromSnapshot(snapshotFrame(frame.element), { title: starterTitle(frame.label), from: frame.label });
}

/** An overlay's frame id: its title as a slug, else its component's name ("delete-the-file", "side-panel"), each once. */
export function overlayIds(overlays: SnapNode[]): Array<{ id: string; node: SnapNode }> {
  const taken = new Set<string>();
  return overlays.map((node) => {
    const title = node.props.find(([key]) => key === "title")?.[1];
    const base = (title?.kind === "literal" && typeof title.value === "string" ? title.value : node.name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32).replace(/-+$/, "") || "overlay";
    let id = base;
    for (let n = 2; taken.has(id) || id === "screen-1"; n += 1) id = `${base}-${n}`;
    taken.add(id);
    return { id, node };
  });
}

/**
 * A builder page holding `shot` (its overlays as Overlay frames), saved in this browser and opened; the status line
 * says where it came from and what could not be kept. The page's id, or null (nothing to copy, or a page the dialect
 * refuses: a bug, said in the status line).
 */
export async function pageFromSnapshot(shot: Snapshot, { title, from }: { title: string; from: string }): Promise<string | null> {
  if (!shot.nodes.length) {
    inspectorStatus.set("neutral", `${from} shows no library components to start a page from`);
    return null;
  }
  const text = starterPage({ title, device: shot.device, nodes: shot.nodes, padding: shot.padding, overlays: overlayIds(shot.overlays) });
  const engine = await loadEngine();
  const errors = engine.validateDialect(text, { components: new Set(zenComponents) });
  if (errors.length) {
    inspectorStatus.set("negative", `Could not start a page from ${from}: line ${errors[0].line}: ${errors[0].message}`);
    return null;
  }
  const id = await freeId(title);
  await putPage(id, text, { title });
  openLocalPage(id);
  const notes = shot.notes.length > LISTED ? [...shot.notes.slice(0, LISTED), `${shot.notes.length - LISTED} more`] : shot.notes;
  const overlays = shot.overlays.length ? `${shot.overlays.length === 1 ? "1 overlay" : `${shot.overlays.length} overlays`} as Overlay frames (link their triggers in Prototype)` : null;
  inspectorStatus.set(notes.length ? "neutral" : "positive", [`New page "${title}" from ${from}`, overlays, notes.length ? `Not kept: ${notes.join("; ")}` : null].filter(Boolean).join(" · "));
  return id;
}
