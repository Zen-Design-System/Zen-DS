import { useEffect, useRef, useState } from "react";
import { FLASH_MS, useFlashes } from "./highlight";
import "./mcp.css";

/*
 * The canvas outline of the layers an AI just changed (highlight.ts). Measured from the canvas elements marked
 * `<file>:@<id>` (builder/render/renderPage.tsx) against the canvas area, every frame while a flash is up, so it stays on
 * its layer while the person pans or zooms. Pointer events pass through.
 */

type Box = { key: string; x: number; y: number; width: number; height: number; leaving: boolean };

export function AiHighlights() {
  const flashes = useFlashes();
  const rootRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);

  useEffect(() => {
    if (!flashes.length) {
      setBoxes([]);
      return undefined;
    }
    let frame = 0;
    const measure = () => {
      const area = rootRef.current?.parentElement;
      if (area) {
        const origin = area.getBoundingClientRect();
        const now = Date.now();
        const next: Box[] = [];
        for (const flash of flashes) {
          for (const id of flash.ids) {
            area.querySelectorAll(`[data-zen-src$=":@${CSS.escape(id)}"]`).forEach((element, index) => {
              const rect = element.getBoundingClientRect();
              if (!rect.width && !rect.height) return;
              next.push({ key: `${flash.key}-${id}-${index}`, x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height, leaving: now - flash.at >= FLASH_MS });
            });
          }
        }
        setBoxes(next);
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [flashes]);

  return (
    <div ref={rootRef} className="studio-ai-flashes" aria-hidden="true">
      {boxes.map((box) => (
        <div key={box.key} className="studio-ai-flash" data-leaving={box.leaving ? "true" : undefined} style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.width, height: box.height }} />
      ))}
    </div>
  );
}
