import { inspectorStatus } from "../../inspector/status";
import { openLocalPage } from "../../shell/navigation";
import { loadEngine, zenComponents } from "../engine";
import { freeId, putPage } from "../store/pageStore";
import { snapshotFrame } from "./snapshot";
import { starterPage, starterTitle } from "./toDialect";

/*
 * "New page from this frame" (Studio builder GĐ3b M1, the canvas menu of an example or template frame): a builder page,
 * kept in this browser, holding what the frame shows (./snapshot.ts) as one Screen, then opened on the canvas. The
 * status line says what could not be kept.
 */

/** How many notes the status line lists before "N more". */
const LISTED = 3;

export async function newPageFromFrame(frame: { element: Element; label: string }): Promise<string | null> {
  const shot = snapshotFrame(frame.element);
  if (!shot.nodes.length) {
    inspectorStatus.set("neutral", `${frame.label} shows no library components to start a page from`);
    return null;
  }
  const title = starterTitle(frame.label);
  const text = starterPage({ title, device: shot.device, nodes: shot.nodes, padding: shot.padding });
  const engine = await loadEngine();
  const errors = engine.validateDialect(text, { components: new Set(zenComponents) });
  if (errors.length) {
    inspectorStatus.set("negative", `Could not start a page from ${frame.label}: line ${errors[0].line}: ${errors[0].message}`);
    return null;
  }
  const id = await freeId(title);
  await putPage(id, text, { title });
  openLocalPage(id);
  const notes = shot.notes.length > LISTED ? [...shot.notes.slice(0, LISTED), `${shot.notes.length - LISTED} more`] : shot.notes;
  inspectorStatus.set(notes.length ? "neutral" : "positive", [`New page "${title}" from ${frame.label}`, notes.length ? `Not kept: ${notes.join("; ")}` : null].filter(Boolean).join(" · "));
  return id;
}
