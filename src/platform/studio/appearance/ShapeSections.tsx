import { Icon, type IconName } from "../../../components/Icon";
import { CORNERS } from "./appearanceModel";
import { CornerRadiusField } from "./AppearanceSection";
import { DEFAULT_LINE_STROKE, DEFAULT_SHAPE_FILL } from "../../../components/Shape/paint";
import { STAR_RATIO } from "../../../components/Shape/geometry";
import { ScrubNumberField } from "../inspector/controls/ScrubNumberField";
import type { FieldApi } from "../inspector/fieldApi";
import { PropField } from "../inspector/PropField";
import type { Literal, PropSpec, PropValue } from "../inspector/propSchema";
import { InspectorSection } from "../inspector/Section";
import type { EditOp } from "../types";
import { ImageFillRow } from "./ImageFillRow";
import "./appearance.css";

/*
 * Figma UI3's panel for a shape (Shape, src/components/Shape): Arc for an ellipse (Start °, Sweep %, Ratio %, the fields
 * beside its on-canvas handles), Count and Ratio for a polygon or star, then Appearance (opacity, a rectangle's corner
 * radius), Fill and Stroke (weight, Inside / Center / Outside). Colours are Zen tokens (the swatch lists of
 * inspector/palettes.ts). A value back at Figma's default removes the prop, so the code stays short. Rotation sits in
 * Position (PositionSection), W / H in Layout.
 */

/** The props these sections show, so DesignPanel keeps them out of Properties. */
export const shapePropNames: readonly string[] = ["type", "fill", "image", "imageFit", "imageCrop", "imageScale", "stroke", "strokeWeight", "strokeAlign", "arcStart", "arcSweep", "arcRatio", "pointCount", "starRatio", "opacity", "radius", ...CORNERS, "d", "viewBox", "fillRule"];

/** A field's leading mark, an icon as Figma's (it is also what the pointer scrubs). */
const mark = (name: IconName) => <Icon name={name} size="sm" decorative />;

const literalOf = (value: PropValue) => (value.state === "literal" ? value.value : undefined);
const numberOf = (value: PropValue) => { const shown = literalOf(value); return typeof shown === "number" ? shown : null; };

/** The ops that write `value` to `prop`, or remove it when it is the default (Figma: a field back at its default). */
const writeOps = (prop: string, value: number, fallback: number): EditOp[] => (value === fallback ? [{ op: "removeProp", name: prop }] : [{ op: "setProp", name: prop, value: { kind: "number", value } }] as EditOp[]);

export function ShapeSections({ api, specs, host }: { api: FieldApi; specs: PropSpec[]; host: HTMLElement | null }) {
  const type = String(literalOf(api.valueFor("type")) ?? "rectangle");
  const line = type === "line" || type === "arrow";
  // A vector (the Pen's, F9) is stroked and unfilled by default, its stroke centred on the path, as Figma's.
  const vector = type === "vector";
  const spec = (name: string) => specs.find((candidate) => candidate.name === name);
  const number = (prop: string, fallback: number) => numberOf(api.valueFor(prop)) ?? fallback;
  const bound = (prop: string) => { const state = api.valueFor(prop).state; return state === "bound" || state === "spread"; };
  const write = (prop: string, value: number, fallback: number, label: string) => { void api.apply(writeOps(prop, value, fallback), label); };
  const field = (prop: string, label: string, fallback: Literal, onSet?: (value: Literal) => void) => {
    const found = spec(prop);
    if (!found) return null;
    // The default the component paints with, shown when nothing is written (Figma shows the default too).
    const withDefault: PropSpec = { ...found, defaultValue: fallback };
    return <PropField spec={withDefault} label={label} value={api.valueFor(prop)} disabled={api.disabled} onSet={onSet ?? ((value) => api.setProp(prop, value))} onReset={() => api.removeProp(prop)} />;
  };
  const stroke = String(literalOf(api.valueFor("stroke")) ?? (line || vector ? DEFAULT_LINE_STROKE : "none"));
  return (
    <>
      {type === "ellipse" ? (
        <InspectorSection title="Arc" fieldGrid>
          <div className="studio-shape__pair">
            <ScrubNumberField label={mark("icon-refresh-cw-01-line")} name="Arc start" suffix="°" round={1} min={0} max={360} value={number("arcStart", 0)} disabled={api.disabled || bound("arcStart")}
              onCommit={(value) => write("arcStart", value % 360, 0, `Arc start → ${value}°`)} />
            <ScrubNumberField label={mark("icon-pie-chart-01-line")} name="Arc sweep" suffix="%" round={1} min={0} max={100} value={number("arcSweep", 100)} disabled={api.disabled || bound("arcSweep")}
              onCommit={(value) => write("arcSweep", value, 100, `Arc sweep → ${value}%`)} />
          </div>
          <div className="studio-shape__pair">
            <ScrubNumberField label={mark("icon-circle-cut-line")} name="Arc ratio" suffix="%" round={1} min={0} max={100} value={number("arcRatio", 0)} disabled={api.disabled || bound("arcRatio")}
              onCommit={(value) => write("arcRatio", value, 0, `Arc ratio → ${value}%`)} />
          </div>
        </InspectorSection>
      ) : null}
      {type === "polygon" || type === "star" ? (
        <InspectorSection title={type === "star" ? "Star" : "Polygon"} fieldGrid>
          <div className="studio-shape__pair">
            <ScrubNumberField label={mark("icon-hash-01-line")} name="Count" min={3} max={60} value={number("pointCount", type === "star" ? 5 : 3)} disabled={api.disabled || bound("pointCount")}
              onCommit={(value) => write("pointCount", value, type === "star" ? 5 : 3, `Count → ${value}`)} />
            {type === "star" ? (
              <ScrubNumberField label={mark("icon-percent-01-line")} name="Star ratio" suffix="%" round={1} min={0} max={100} value={number("starRatio", STAR_RATIO)} disabled={api.disabled || bound("starRatio")}
                onCommit={(value) => write("starRatio", value, STAR_RATIO, `Star ratio → ${value}%`)} />
            ) : null}
          </div>
        </InspectorSection>
      ) : null}
      <InspectorSection title="Appearance" fieldGrid>
        <div className="studio-shape__pair">
          <ScrubNumberField label={mark("icon-drop-line")} name="Opacity" suffix="%" min={0} max={100} value={number("opacity", 100)} disabled={api.disabled || bound("opacity")}
            onCommit={(value) => write("opacity", value, 100, `Opacity → ${value}%`)} />
        </div>
        {type === "rectangle" ? <CornerRadiusField api={api} specs={specs} host={host} /> : null}
      </InspectorSection>
      {line ? null : (
        <InspectorSection title="Fill">
          {field("fill", "Fill", vector || api.valueFor("image").state !== "unset" ? "none" : DEFAULT_SHAPE_FILL)}
          <ImageFillRow api={api} specs={specs} host={host} />
        </InspectorSection>
      )}
      <InspectorSection title="Stroke" fieldGrid={stroke !== "none"}>
        {field("stroke", "Stroke", line || vector ? DEFAULT_LINE_STROKE : "none")}
        {stroke !== "none" ? (
          <>
            <div className="studio-shape__pair">
              <ScrubNumberField label={mark("icon-line-height-line")} name="Stroke weight" min={0} max={400} round={1} value={number("strokeWeight", 1)} disabled={api.disabled || bound("strokeWeight")}
                onCommit={(value) => write("strokeWeight", value, 1, `Stroke weight → ${value}`)} />
            </div>
            {line ? null : field("strokeAlign", "Position", vector ? "center" : "inside")}
          </>
        ) : null}
      </InspectorSection>
    </>
  );
}
