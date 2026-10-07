import { CanvasStatus } from "./CanvasStatus";
import { CanvasTools } from "./CanvasTools";
import { ZoomControls } from "./ZoomControls";

/**
 * The canvas's floating chrome, placed as in Figma: zoom top-right, tools bottom-centre, the tip "?" bottom-right.
 * StudioApp mounts it in the canvas area after the examples' overlay layer, so a Dialog or Side Panel an example left
 * open (and its scrim) never covers the tools: Select stays one click away (E2E O-02).
 */
export function CanvasChrome() {
  return (
    <>
      <ZoomControls />
      <CanvasTools />
      <CanvasStatus />
    </>
  );
}
