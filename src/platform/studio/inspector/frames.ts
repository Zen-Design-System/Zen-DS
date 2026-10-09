import { useEffect, useState } from "react";
import type { IconName } from "../../../icons/generated/names";
import { pageLabels } from "../../PlatformApp";
// The lists as registry.ts composed them last: this module stays out of an example's hot update.
import { getPageExamples } from "../../examples/pageExamples";
import type { PlatformPage } from "../../PlatformExamples";
import { findFrame, subscribeStudioFrames } from "../board/frames";
import { zoomToFrame } from "../board/presentFrame";
import { canvasApi } from "../canvas/viewport";
import { onSourceUpdate } from "../select/picker";
import { studioStore } from "../store";
import { inspectorStatus } from "./status";

/*
 * Frames on the board as the inspector and the Layers panel name them (ids "playground", "docs", "document",
 * "example:<n>"; a builder page's "screen:<id>[:<state>]" and "overlay:<id>", named by the board). Kept out of the component files so a source edit hot-updates without a Fast Refresh cascade.
 */

/** Frame label as the board shows it. */
export function frameLabel(frameId: string, page: PlatformPage) {
  if (frameId === "playground") return "Playground";
  if (frameId === "main-component") return "Main component";
  if (frameId === "docs") return "Docs";
  if (frameId === "document") return pageLabels[page] ?? "Document";
  const example = /^example:(\d+)$/.exec(frameId);
  if (example) return `Example: ${getPageExamples(page)[Number(example[1])]?.title ?? `#${Number(example[1]) + 1}`}`;
  if (isBuilderFrame(frameId)) return findFrame(frameId)?.label ?? frameId;
  return frameId;
}

/** A builder page's frame (a Screen or an Overlay of a page kept in this browser). */
export const isBuilderFrame = (id: string | null | undefined) => typeof id === "string" && /^(screen|overlay):/.test(id);

export const frameKind = (id: string) => (id === "playground" ? "Playground" : id === "main-component" ? "Component set" : id === "docs" ? "Docs" : id === "document" ? "Document" : id.startsWith("example:") ? "Example" : id.startsWith("screen:") ? "Screen" : id.startsWith("overlay:") ? "Overlay" : "Frame");
export const frameIcon = (id: string): IconName => (id === "playground" ? "icon-sliders-04-line" : id === "main-component" ? "icon-grid-01-line" : id === "docs" ? "icon-book-closed-line" : id.startsWith("example:") || isBuilderFrame(id) ? "icon-layout-alt-01-line" : "icon-file-code-line");

/** The example a frame id ("example:<n>") shows on this page, if any. */
export function exampleOf(page: PlatformPage, frameId: string | null) {
  if (isBuilderFrame(frameId)) return findFrame(frameId)?.example ?? null;
  const match = frameId ? /^example:(\d+)$/.exec(frameId) : null;
  return match ? getPageExamples(page)[Number(match[1])] ?? null : null;
}

/** Copies text and reports it in the inspector footer. */
export function copyText(text: string, what: string) {
  void navigator.clipboard?.writeText(text).then(
    () => inspectorStatus.set("positive", `Copied ${what}`),
    () => inspectorStatus.set("negative", "The browser blocked the clipboard"),
  );
}

export type FrameInfo = { id: string; label: string; kind: string; width: number; element: Element };

/** The frames on the board (data-studio-frame), refreshed with the page, HMR updates and DOM changes. */
export function useFrames(page: PlatformPage): FrameInfo[] {
  const [frames, setFrames] = useState<FrameInfo[]>([]);
  useEffect(() => {
    let timer = 0;
    let tries = 0;
    const read = () => {
      const world = canvasApi.getWorldElement();
      const next = world ? Array.from(world.querySelectorAll("[data-studio-frame]")).map((element) => {
        const id = element.getAttribute("data-studio-frame") ?? "";
        return { id, label: frameLabel(id, page), kind: frameKind(id), width: Math.round((element as HTMLElement).offsetWidth), element };
      }) : [];
      // The label too: two builder pages both have "screen:screen-1", and React keeps the frame's element between them.
      setFrames((current) => (current.length === next.length && current.every((frame, index) => frame.id === next[index].id && frame.label === next[index].label && frame.width === next[index].width && frame.element === next[index].element) ? current : next));
      if (!next.length && tries++ < 20) timer = window.setTimeout(read, 300);
    };
    read();
    const world = canvasApi.getWorldElement();
    const observer = new MutationObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(read, 400); });
    if (world) observer.observe(world, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-studio-frame", "style"] });
    const offUpdate = onSourceUpdate(read);
    // A frame registers its new label (another builder page's title) without a DOM change the observer sees.
    const offFrames = subscribeStudioFrames(() => { window.clearTimeout(timer); timer = window.setTimeout(read, 50); });
    return () => { window.clearTimeout(timer); observer.disconnect(); offUpdate(); offFrames(); };
  }, [page]);
  return frames;
}

/** Selects a frame and zooms the canvas to it (a tall page frame fits its width, top-aligned, as the frame toolbar does). */
export function focusFrame(frame: FrameInfo) {
  studioStore.setState({ selection: { kind: "frame", frameId: frame.id } });
  if (frame.element instanceof HTMLElement) zoomToFrame(frame.element);
}
