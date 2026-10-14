import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";
import { useStudio } from "../store";
import type { StudioVariantRef } from "../types";
import { variantHover } from "./hover";
import { variantElement, variantKey } from "./model";

/*
 * Outlines in the Main component frame (spec §2): the selected variant or layer and the one under the pointer, drawn in
 * screen space with the selection layer's own outline and name tag (select/select.css), followed every frame while
 * there is one (pan, zoom and re-renders move it).
 */

type Box = { x: number; y: number; w: number; h: number; name: string };
const same = (a: Box | null, b: Box | null) => a === b || Boolean(a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.name === b.name);

export function VariantOutline({ world }: { world: HTMLElement | null }) {
  const selection = useStudio((state) => state.selection);
  const hover = useSyncExternalStore(variantHover.subscribe, variantHover.get, variantHover.get);
  const selected = selection?.kind === "variant" ? selection : null;
  const rootRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<{ selected: Box | null; hover: Box | null }>({ selected: null, hover: null });

  useEffect(() => {
    if (!world || (!selected && !hover)) {
      setBoxes((current) => (current.selected || current.hover ? { selected: null, hover: null } : current));
      return undefined;
    }
    let frame = 0;
    const boxOf = (ref: StudioVariantRef | null, origin: DOMRect): Box | null => {
      const element = ref ? variantElement(world, ref) : null;
      if (!ref || !element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height, name: ref.name };
    };
    const measure = () => {
      const root = rootRef.current;
      if (root) {
        const origin = root.getBoundingClientRect();
        const next = { selected: boxOf(selected, origin), hover: hover && (!selected || variantKey(hover) !== variantKey(selected)) ? boxOf(hover, origin) : null };
        setBoxes((current) => (same(current.selected, next.selected) && same(current.hover, next.hover) ? current : next));
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [world, selected, hover]);

  const style = (box: Box) => ({ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h });
  return (
    <div ref={rootRef} className="studio-selection studio-mc-outline" aria-hidden="true">
      {boxes.hover ? <div className="studio-selection__outline" data-kind="hover" style={style(boxes.hover)} /> : null}
      {boxes.selected ? (
        <div className="studio-selection__outline" data-kind="selected" style={style(boxes.selected)}>
          <span className="studio-selection__tag" data-place={boxes.selected.y < 24 ? "below" : "above"}>
            <span className={typographyStyles["Caption/Medium"]}>{boxes.selected.name}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
