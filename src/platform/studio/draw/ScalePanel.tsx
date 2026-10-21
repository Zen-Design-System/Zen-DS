import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../../../components/Icon";
import { InputField } from "../../../components/Input";
import { typographyStyles } from "../../../tokens/typography.generated";
import { announceEditStatus } from "../api";
import { InspectorSection } from "../inspector/Section";
import { canEdit, useStudio } from "../store";
import { scaleSelection } from "./scaleLayers";
import { factorText, parseFactor, type ScaleAnchor } from "./scaleModel";
import { scaleAnchor, SCALE_FOCUS_EVENT } from "./scaleTool";
import "./draw.css";

/*
 * The right panel while the Scale tool (K) is on, Figma's Scale section: the factor ("2", "1.5x", "200%"; Enter scales
 * the selection, which K focuses), and the anchor point that stays put (3 × 3, a radio group: arrows move it). What
 * scales is scaleModel.ts's: px values; Zen steps stay, and the status line names them.
 */

const POINTS: ReadonlyArray<{ anchor: ScaleAnchor; name: string }> = [
  { anchor: { x: 0, y: 0 }, name: "Top left" }, { anchor: { x: 0.5, y: 0 }, name: "Top" }, { anchor: { x: 1, y: 0 }, name: "Top right" },
  { anchor: { x: 0, y: 0.5 }, name: "Left" }, { anchor: { x: 0.5, y: 0.5 }, name: "Center" }, { anchor: { x: 1, y: 0.5 }, name: "Right" },
  { anchor: { x: 0, y: 1 }, name: "Bottom left" }, { anchor: { x: 0.5, y: 1 }, name: "Bottom" }, { anchor: { x: 1, y: 1 }, name: "Bottom right" },
];
const same = (a: ScaleAnchor, b: ScaleAnchor) => a.x === b.x && a.y === b.y;

export function ScalePanel() {
  const editable = useStudio((state) => canEdit(state));
  const selected = useStudio((state) => (state.selection?.kind === "node" && !state.selection.part) || state.selection?.kind === "frame");
  const [draft, setDraft] = useState(factorText(1));
  const [anchor, setAnchor] = useState<ScaleAnchor>(scaleAnchor.get());
  const field = useRef<HTMLInputElement>(null);
  const points = useRef<Array<HTMLButtonElement | null>>([]);

  // K focuses the factor (Figma), also when the tool is already on.
  useEffect(() => {
    const focus = () => { field.current?.focus(); field.current?.select(); };
    focus();
    window.addEventListener(SCALE_FOCUS_EVENT, focus);
    return () => window.removeEventListener(SCALE_FOCUS_EVENT, focus);
  }, []);

  const apply = () => {
    const factor = parseFactor(draft);
    if (factor === null) { announceEditStatus({ kind: "error", message: "Type a scale such as 2, 1.5x or 200%", at: Date.now() }); return; }
    // Back to the canvas, as a field's Enter does (the tool keys work again: V for Move).
    document.querySelector<HTMLElement>(".studio-viewport")?.focus();
    if (factor === 1) return;
    void scaleSelection(factor, anchor).then((done) => { if (done) setDraft(factorText(1)); });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") { event.preventDefault(); apply(); }
    else if (event.key === "Escape") {
      // Back to the canvas, as Figma's Esc leaves the field.
      event.preventDefault();
      setDraft(factorText(1));
      document.querySelector<HTMLElement>(".studio-viewport")?.focus();
    }
  };
  const pick = (next: ScaleAnchor, focus = false) => {
    setAnchor(next);
    scaleAnchor.set(next);
    if (focus) points.current[POINTS.findIndex((point) => same(point.anchor, next))]?.focus();
  };
  // APG radio group: the arrows move the anchor across the 3 × 3 points.
  const onPointKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = index + step;
    if (next >= 0 && next < POINTS.length && !(Math.abs(step) === 1 && Math.floor(next / 3) !== Math.floor(index / 3))) pick(POINTS[next].anchor, true);
  };

  return (
    <InspectorSection title="Scale">
      <div className="studio-scale-row" data-prop="scale">
        <InputField
          ref={field}
          size="sm"
          aria-label="Scale"
          value={draft}
          disabled={!editable}
          leading={<Icon name="icon-scale-02-line" size="sm" decorative />}
          onValueChange={setDraft}
          onKeyDown={onKeyDown}
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="studio-scale-anchor" role="radiogroup" aria-label="Anchor">
          {POINTS.map((point, index) => {
            const on = same(point.anchor, anchor);
            return (
              <button
                key={point.name}
                ref={(node) => { points.current[index] = node; }}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={point.name}
                tabIndex={on ? 0 : -1}
                className="studio-scale-anchor__point"
                disabled={!editable}
                onClick={() => pick(point.anchor)}
                onKeyDown={(event) => onPointKey(event, index)}
              />
            );
          })}
        </div>
      </div>
      <p className={`studio-scale-note ${typographyStyles["Caption/Regular"]}`}>
        {selected ? "Sizes, positions and strokes scale; Zen steps stay" : "Select a layer or a frame to scale"}
      </p>
    </InspectorSection>
  );
}
