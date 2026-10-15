import { CanvasStatus } from "./CanvasStatus";
import { CanvasTools } from "./CanvasTools";

/**
 * The canvas's floating chrome, placed as in Figma UI3: tools bottom-centre, the tip "?" bottom-right, both inside the
 * part of the canvas the floating panels leave (the zoom is on the Inspector's tab row).
 * StudioApp mounts it in the canvas area after the examples' overlay layer, so a Dialog or Side Panel an example left
 * open (and its scrim) never covers the tools: Select stays one click away (E2E O-02).
 */
export function CanvasChrome() {
  return (
    <>
      <CanvasTools />
      <CanvasStatus />
    </>
  );
}
