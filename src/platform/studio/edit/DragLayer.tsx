import { typographyStyles } from "../../../tokens/typography.generated";
import { useDragView } from "./drag";

/*
 * What a layer drag draws (edit/drag.ts): the outline of the container it lands in (an instance's slot: violet, named),
 * the 2 px insertion line, and a pill at the pointer ("Copy" while ⌥ is held, or why it cannot land there). Client
 * coordinates, made relative to the viewport here.
 */
export function DragLayer({ viewport }: { viewport: HTMLElement | null }) {
  const view = useDragView();
  if (!view || !viewport) return null;
  const origin = viewport.getBoundingClientRect();
  const place = (box: { x: number; y: number; w: number; h: number }) => ({ transform: `translate(${box.x - origin.left}px, ${box.y - origin.top}px)`, width: box.w, height: box.h });
  return (
    <>
      {/* An instance's slot (F7c): Figma's slot outline and name tag, in the component colour. */}
      {view.into ? (
        <div className="studio-drag__into" data-slot={view.slot ? "true" : undefined} style={place(view.into)}>
          {view.slot ? <span className={`studio-drag__slot-tag ${typographyStyles["Caption/Medium"]}`}>{view.slot}</span> : null}
        </div>
      ) : null}
      {view.line ? <div className="studio-drag__line" style={place(view.line)} /> : null}
      {view.guides?.map((guide, index) => <div key={index} className="studio-drag__guide" style={place(guide)} />)}
      {/* Figma's equal spacing: the matching gaps in pink, each with its px. */}
      {view.spacing?.map((mark, index) => (
        <div key={`s${index}`} className="studio-drag__spacing" data-axis={mark.axis} style={place(mark)}>
          <span className={`studio-drag__spacing-label ${typographyStyles["Caption/Medium"]}`}>{mark.label}</span>
        </div>
      ))}
      {view.label ? (
        <span className={`studio-drag__label ${typographyStyles["Caption/Medium"]}`} data-tone={view.tone} style={{ transform: `translate(${view.pointer.x - origin.left}px, ${view.pointer.y - origin.top}px)` }}>
          {view.label}
        </span>
      ) : null}
    </>
  );
}
