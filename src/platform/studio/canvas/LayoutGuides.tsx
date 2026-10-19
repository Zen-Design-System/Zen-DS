import { useEffect, useState, type CSSProperties } from "react";
import { headerLayoutGuides, type LayoutGuide } from "../builder/store/pageModel";
import { usePage } from "../builder/store/pageStore";
import { useStudio } from "../store";
import { canvasApi, getViewport } from "./viewport";
import { useViewOptions } from "./viewOptions";
import "./layout-guides.css";

/*
 * Figma's layout guides (⌃G, Studio parity F10) over the frames of a page you made: a frame's columns or rows sit
 * between the Breakpoint & Grids Margin-Comfortable and with its Gutter, read on the frame itself (its device's mode),
 * a grid is squares of its size. Red bands as Figma's; a view of the canvas (they never take a click).
 */

/** A px value read from the frame's own tokens (its device's Breakpoint & Grids mode). */
const tokenPx = (element: Element, name: string) => Number.parseFloat(getComputedStyle(element).getPropertyValue(name)) || 0;

function guideStyle(guide: LayoutGuide, margin: number, gutter: number, zoom: number): CSSProperties {
  if (guide.type === "grid") return { backgroundSize: `${guide.size * zoom}px ${guide.size * zoom}px` };
  const tracks = `repeat(${guide.count}, minmax(0, 1fr))`;
  return guide.type === "columns"
    ? { gridTemplateColumns: tracks, paddingInline: margin * zoom, columnGap: gutter * zoom }
    : { gridTemplateRows: tracks, paddingBlock: margin * zoom, rowGap: gutter * zoom };
}

export function LayoutGuides({ viewport }: { viewport: HTMLElement | null }) {
  const { layoutGuides } = useViewOptions();
  const localPage = useStudio((state) => state.localPage);
  const page = usePage(localPage);
  const [, redraw] = useState(0);
  useEffect(() => canvasApi.onChange(() => redraw((count) => count + 1)), []);
  if (!layoutGuides || !viewport || !localPage || !page) return null;
  const all = headerLayoutGuides(page.text);
  const frames = Object.entries(all);
  if (!frames.length) return null;
  const view = viewport.getBoundingClientRect();
  const { zoom } = getViewport();
  return (
    <div className="studio-layout-guides" aria-hidden="true">
      {frames.map(([frameId, guides]) => {
        const frame = document.querySelector(`[data-studio-frame="${CSS.escape(frameId)}"]`);
        const screen = frame?.querySelector(".studio-builder-screen") ?? frame;
        if (!frame || !screen) return null;
        const rect = screen.getBoundingClientRect();
        const margin = tokenPx(screen, "--zen-margin-comfortable");
        const gutter = tokenPx(screen, "--zen-gutter");
        return guides.map((guide, index) => (
          <div
            key={`${frameId}-${index}`}
            className="studio-layout-guide"
            data-type={guide.type}
            style={{ transform: `translate(${rect.left - view.left}px, ${rect.top - view.top}px)`, width: rect.width, height: rect.height, ...guideStyle(guide, margin, gutter, zoom) }}
          >
            {guide.type === "grid" ? null : Array.from({ length: guide.count }, (_, track) => <span key={track} className="studio-layout-guide__track" />)}
          </div>
        ));
      })}
    </div>
  );
}
