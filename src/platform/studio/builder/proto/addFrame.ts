import { applyEdit } from "../../api";
import type { EditOp } from "../../types";
import { loadEngine, zenComponents } from "../engine";
import type { PageNode, PageTree } from "../render/renderPage";
import { getPage, pageFile } from "../store/pageStore";

/*
 * A new Screen or Overlay at the end of a builder page's Board (one edit, one undo step): the Prototype panel's
 * "Add screen" / "Add overlay" and the toolbar's Screen tool. A Screen takes the device of the page's first Screen, so a
 * phone flow stays on phones.
 */

const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

export async function addFrame(localPage: string, kind: "screen" | "overlay"): Promise<boolean> {
  const [engine, page] = await Promise.all([loadEngine(), getPage(localPage)]);
  if (!page) return false;
  const tree = engine.parsePage(page.text, { components: new Set(zenComponents) }) as unknown as PageTree;
  if (!tree.board) return false;
  const frames = tree.board.children.filter((child): child is PageNode => child.kind === "element");
  const id = engine.freeFrameId(kind, frames.map((frame) => String(literal(frame, "id") ?? "")));
  const firstScreen = frames.find((frame) => frame.name === "Screen");
  const device = String((firstScreen && literal(firstScreen, "device")) ?? "desktop");
  const title = kind === "screen" ? `Screen ${id.split("-").at(-1)}` : "Are you sure?";
  const response = await applyEdit({ file: pageFile(localPage), loc: tree.board.loc, name: "Board", ops: [{ op: "insertChild", code: engine.frameCode({ kind, id, title, device }) } as EditOp] }, kind === "screen" ? "Add screen" : "Add overlay");
  return Boolean(response.ok);
}
