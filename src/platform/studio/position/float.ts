import { applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus, saveShortcut, undoShortcut } from "../inspector/status";
import { expectRender, renderedNow } from "../select/remap";
import { flushStudioStore, studioStore } from "../store";
import type { SourceElement, StudioNodeRef } from "../types";
import { positionProps } from "./positionModel";

/*
 * The structural half of Ignore auto layout: a layer with no position props of its own floats in a Box (wrapInBox,
 * select/wrapSelection.ts), and turning it off takes that Box away again (op "unwrap", tools/studio/jsx-source.mjs
 * applyUnwrap), so the code is exactly what it was. One request and one undo step each.
 */

/** A Box that only floats one layer: no props but position props (and a key), no spread, one element inside. */
export function isFloatWrapper(element: SourceElement | null): boolean {
  if (!element || element.name !== "Box") return false;
  const own = new Set<string>(positionProps);
  if (element.attributes.some((attr) => attr.kind === "spread" || (attr.name !== "key" && !own.has(attr.name)))) return false;
  const kids = element.children.filter((child) => child.kind !== "text" || child.value.trim());
  return kids.length === 1 && kids[0].kind === "element";
}

let running = false;

/**
 * Takes the floating Box at `boxSrc` away (the layer it holds goes back into the flow where the Box was) and selects
 * that layer. `ref` gives the frame, panel and instance of the selection. True when the file changed.
 */
export async function unwrapFloat(boxSrc: string, ref: Omit<StudioNodeRef, "src" | "name">): Promise<boolean> {
  const at = parseSrc(boxSrc);
  if (!at || running) return false;
  running = true;
  try {
    const box = await studioApi.element(at.file, at.loc).catch(() => null);
    if (!box || box.name !== "Box") {
      inspectorStatus.set("negative", "The Box moved before the change was saved; nothing was written");
      return false;
    }
    const inner = box.children.find((child) => child.kind === "element");
    const name = inner?.kind === "element" ? inner.name : "Layer";
    const before = renderedNow(canvasApi.getWorldElement());
    const response = await applyEdit({ file: at.file, loc: at.loc, name: "Box", ops: [{ op: "unwrap" }], hash: box.hash }, `${name} back in auto layout`);
    if (!response.ok) {
      inspectorStatus.set("negative", /Unknown op "unwrap"/.test(response.error) ? "Restart the dev server to turn Ignore auto layout off" : response.error);
      return false;
    }
    if (response.before === response.after || !response.unwrapped) return false;
    const snippet = response.snippet && !response.snippet.synced ? `Example code not updated${response.snippet.reason ? `: ${response.snippet.reason}` : ""}` : null;
    inspectorStatus.set("positive", [`${name} is back in auto layout (its Box is gone)`, response.draft ? `Draft · ${saveShortcut} to save` : `${undoShortcut} to undo`, snippet].filter(Boolean).join(" · "));
    // Select the layer where the Box was, synchronously: Vite may reload the page as soon as it sees the write.
    const selection = { kind: "node" as const, ...ref, src: `${response.file}:${response.unwrapped.loc}`, name };
    expectRender(selection, before, () => undefined);
    studioStore.setState({ selection });
    flushStudioStore();
    return true;
  } finally {
    running = false;
  }
}
