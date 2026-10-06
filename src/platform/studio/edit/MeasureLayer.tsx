import { typographyStyles } from "../../../tokens/typography.generated";
import { useMeasureView } from "./measure";

/* ⌥ measure (edit/measure.ts): the measured layer's outline, the distance lines and their labels, in red like Figma's. */
export function MeasureLayer({ viewport }: { viewport: HTMLElement | null }) {
  const view = useMeasureView();
  if (!view || !viewport) return null;
  const origin = viewport.getBoundingClientRect();
  const at = (x: number, y: number) => `translate(${x - origin.left}px, ${y - origin.top}px)`;
  return (
    <>
      <div className="studio-measure__target" style={{ transform: at(view.target.x, view.target.y), width: view.target.w, height: view.target.h }} />
      {view.lines.map((line, index) => (
        <div key={`l${index}`} className="studio-measure__line" style={{ transform: at(line.x, line.y), width: line.w, height: line.h }} />
      ))}
      {view.lines.map((line, index) => (
        <span
          key={`t${index}`}
          className={`studio-measure__label ${typographyStyles["Caption/Medium"]}`}
          data-axis={line.h === 1 ? "x" : "y"}
          style={{ transform: at(line.x + line.w / 2, line.y + line.h / 2) }}
        >
          {line.label}
        </span>
      ))}
    </>
  );
}
