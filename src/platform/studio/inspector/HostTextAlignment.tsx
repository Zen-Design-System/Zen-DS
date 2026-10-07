import { IconButton } from "../../../components/Button";
import type { EditOp, SourceElement } from "../types";
import { TextAlignControl } from "./PropField";
import { InspectorRow } from "./Section";
import { alignmentHint, type RenderedText } from "./textInfo";

/*
 * Figma's Typography › Alignment for a host text element (a <p className={typographyStyles[…]}>, a <span> of copy),
 * written as the element's own inline style: textAlign (start · center · end · justify) and alignContent (start ·
 * center · end for top · middle · bottom). A style={{ … }} written in place takes the key (op setField); without one,
 * the element gains style={{ key: … }} (op setProp). The row's reset removes the key, or the whole style when it was
 * the only key. A style bound to an expression, or a key bound to one, stays read-only and shows what the canvas
 * renders. Unset rows show the computed alignment; picking that one writes nothing.
 */

type Axis = {
  /** The Zen prop it mirrors (Text / Heading align, verticalAlign): the hint and the computed value follow it. */
  prop: "align" | "verticalAlign";
  key: "textAlign" | "alignContent";
  label: string;
  options: string[];
  /** Zen value → the CSS value written. */
  css: Record<string, string>;
  /** A written CSS value → the Zen value it shows as (undefined: not one of the options). */
  read: Record<string, string>;
};

const axes: Axis[] = [
  {
    prop: "align", key: "textAlign", label: "Alignment", options: ["start", "center", "end", "justify"],
    css: { start: "start", center: "center", end: "end", justify: "justify" },
    read: { left: "start", start: "start", center: "center", right: "end", end: "end", justify: "justify" },
  },
  {
    prop: "verticalAlign", key: "alignContent", label: "Vertical", options: ["top", "middle", "bottom"],
    css: { top: "start", middle: "center", bottom: "end" },
    read: { normal: "top", start: "top", "flex-start": "top", center: "middle", end: "bottom", "flex-end": "bottom" },
  },
];

export function HostTextAlignment({ name, element, rendered, disabled, send }: {
  name: string;
  element: SourceElement;
  rendered: RenderedText;
  disabled: boolean;
  send: (ops: EditOp[], label: string) => void;
}) {
  const style = element.attributes.find((attr) => attr.kind !== "spread" && attr.name === "style");
  const fields = style?.shape?.type === "object" ? style.shape.fields : null;
  // A style that is not an object literal written in place (a const, a function call): read-only here.
  const styleBound = Boolean(style) && !fields;
  return (
    <>
      {axes.map((axis) => {
        const field = fields?.find((candidate) => candidate.key === axis.key);
        const fieldBound = Boolean(field) && field?.kind !== "string";
        const written = field?.kind === "string" ? axis.read[field.value.trim()] ?? field.value : undefined;
        const locked = disabled || styleBound || fieldBound;
        const computed = axis.prop === "align" ? rendered.align : rendered.valign;
        const set = (next: string) => {
          const value = axis.css[next] ?? next;
          const label = `${name} ${axis.label.toLowerCase()} → ${value}`;
          send(style
            ? [{ op: "setField", name: "style", key: axis.key, value: { kind: "string", value } }]
            : [{ op: "setProp", name: "style", value: { kind: "expression", code: `{ ${axis.key}: ${JSON.stringify(value)} }` } }], label);
        };
        const reset = () => send(fields?.length === 1
          ? [{ op: "removeProp", name: "style" }]
          : [{ op: "setField", name: "style", key: axis.key, value: null }], `${name} ${axis.label.toLowerCase()} reset`);
        const hint = styleBound ? `Set in code: style={${style?.value ?? "…"}}`
          : fieldBound ? `Set in code: ${axis.key}: ${field?.value}`
            : alignmentHint(axis.prop, rendered);
        return (
          <InspectorRow
            key={axis.key}
            name={axis.key}
            label={axis.label}
            labelTitle={`${axis.label} · style.${axis.key}`}
            isDefault={!field}
            hint={hint}
            action={field && !locked ? <IconButton icon="icon-reverse-left-line" aria-label={`Reset ${axis.label.toLowerCase()} to default`} appearance="flat" level="primary" size="xs" onClick={reset} /> : null}
          >
            <TextAlignControl label={axis.label} options={axis.options} value={written} fallback={computed ?? undefined} disabled={locked} onSet={set} />
          </InspectorRow>
        );
      })}
    </>
  );
}
