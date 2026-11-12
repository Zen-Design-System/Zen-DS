import { useLayoutEffect, useState } from "react";
import { CanvasStatus } from "./CanvasStatus";
import { CanvasTools } from "./CanvasTools";

/**
 * Where the pills go when the canvas is narrow (2026-11-12, polish re-check B1: at 1280 × 800 the "?" covered the tools'
 * last button). null: the tools centred, the corner beside them; "start": the tools from the left edge, so they end
 * before the corner; "top": not even that fits, so the corner moves to the canvas's top-right (as on a phone).
 * Measured from the widths alone, not where the tools are now, so a move never undoes itself.
 */
type Crowding = "start" | "top" | null;

function useCrowding(): Crowding {
  const [crowding, setCrowding] = useState<Crowding>(null);
  useLayoutEffect(() => {
    const area = document.querySelector<HTMLElement>(".studio-canvas-area");
    const tools = area?.querySelector<HTMLElement>(":scope > .studio-canvas-tools");
    const status = area?.querySelector<HTMLElement>(":scope > .studio-status");
    if (!area || !tools || !status) return undefined;
    const measure = () => {
      // Below 768px canvas.css puts the corner at the top already: nothing meets the tools.
      if (window.matchMedia("(max-width: 767.98px)").matches) { setCrowding(null); return; }
      // The corner's own inset (Padding/Medium) is also the gap kept beside the tools.
      const edge = parseFloat(getComputedStyle(status).right) || 16;
      const free = area.clientWidth - status.offsetWidth - 2 * edge;
      setCrowding(area.clientWidth / 2 + tools.offsetWidth / 2 <= free ? null : edge + tools.offsetWidth <= free ? "start" : "top");
    };
    const observer = new ResizeObserver(measure);
    for (const element of [area, tools, status]) observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  return crowding;
}

/**
 * The canvas's floating chrome, placed as in Figma UI3: tools bottom-centre, the tip "?" bottom-right, both inside the
 * part of the canvas the floating panels leave (the zoom is on the Inspector's tab row).
 * StudioApp mounts it in the canvas area after the examples' overlay layer, so a Dialog or Side Panel an example left
 * open (and its scrim) never covers the tools: Select stays one click away (E2E O-02).
 */
export function CanvasChrome() {
  const crowding = useCrowding();
  return (
    <>
      <CanvasTools atStart={crowding === "start"} />
      <CanvasStatus raised={crowding === "top"} />
    </>
  );
}
