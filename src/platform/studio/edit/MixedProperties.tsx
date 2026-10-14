import { useEffect, useMemo, useState } from "react";
import { SelectField } from "../../../components/Input";
import { typographyStyles } from "../../../tokens/typography.generated";
import { parseSrc, studioApi } from "../api";
import { InspectorRow, InspectorSection } from "../inspector/Section";
import { componentGroupsOf } from "../inspector/componentGroups";
import { TextControl, TypographyControl } from "../inspector/PropField";
import { entryLabel, entryOptions, entryProp, figmaOptions } from "../inspector/propGroups";
import { matchOption, propSpecs, valueOf, type Literal, type PropSpec } from "../inspector/propSchema";
import { canvasApi } from "../canvas/viewport";
import { findBySrc, onSourceUpdate } from "../select/picker";
import type { ExtraLayer } from "../select/multiSelection";
import { tokenPx, type SpacingScale } from "../select/spacing";
import { useStudio } from "../store";
import type { SourceElement } from "../types";
import { setPropsOnLayers } from "./multi";

/*
 * The properties of several layers of one component (Figma's multi-selection: a value shared by all of them shows,
 * "Mixed" when they differ; setting one writes it on every layer in one edit and one undo step). Variants, booleans,
 * text, numbers (a count, a heading level), text styles and spacing steps ("md · 16", measured on the first layer)
 * written as literals; a prop bound to code in any of the layers is left to the code.
 */

const short = (name: string) => name.slice(name.lastIndexOf(".") + 1);
type Shown = { spec: PropSpec; value: Literal | null; mixed: boolean; bound: boolean };
/** A text prop (a plain string, not one that also takes a number): typed once, written on every layer. */
const isText = (spec: PropSpec) => spec.editor.kind === "string" && !spec.editor.numeric;
/** A number typed once (a plain number, or a string-or-number prop such as a width). */
const isNumber = (spec: PropSpec) => spec.editor.kind === "number" || (spec.editor.kind === "string" && Boolean(spec.editor.numeric));
const SHOWN_KINDS = new Set(["enum", "boolean", "number-enum", "typography"]);
/** The spacing scale a layout prop's steps come from (the canvas spacing areas' rules, select/spacing.ts), or null. */
function spacingScaleOf(component: string, prop: string): SpacingScale | null {
  if (component === "Card" && prop === "spacing") return "card";
  if (/^(gap|rowGap|columnGap)$/.test(prop)) return "gap";
  return /^padding(X|Y|Top|Right|Bottom|Left)?$/.test(prop) || (component === "FormActions" && prop === "inset") ? "padding" : null;
}

function useElements(layers: ExtraLayer[]) {
  const key = layers.map((layer) => layer.src).join("|");
  const undo = useStudio((state) => state.undo.length);
  const redo = useStudio((state) => state.redo.length);
  const [version, setVersion] = useState(0);
  const [read, setRead] = useState<{ key: string; elements: SourceElement[] } | null>(null);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    let alive = true;
    void Promise.all(layers.map((layer) => {
      const at = parseSrc(layer.src);
      return at ? studioApi.element(at.file, at.loc) : Promise.resolve(null);
    })).then((elements) => {
      if (alive && elements.every(Boolean)) setRead({ key, elements: elements as SourceElement[] });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` names the layers.
  }, [key, version, undo, redo]);
  return read && read.key === key ? read.elements : null;
}

export function MixedProperties({ layers, editable }: { layers: ExtraLayer[]; editable: boolean }) {
  const names = new Set(layers.map((layer) => short(layer.name)));
  const component = names.size === 1 ? [...names][0] : null;
  const elements = useElements(component ? layers : []);
  const specs = useMemo(() => (component ? propSpecs(component).filter((spec) => SHOWN_KINDS.has(spec.editor.kind) || isText(spec) || isNumber(spec)) : []), [component]);
  if (!component || !specs.length) return null;
  if (!elements) return <InspectorSection title={`${component} properties`}><p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>Reading the layers…</p></InspectorSection>;
  const rows: Shown[] = specs.map((spec) => {
    const values = elements.map((element) => valueOf(element.attributes, spec.name));
    const bound = values.some((value) => value.state === "bound" || value.state === "spread");
    const literal = values.map((value) => (value.state === "literal" ? value.value : spec.defaultValue));
    const mixed = literal.some((value) => value !== literal[0]);
    return { spec, value: mixed ? null : literal[0] ?? null, mixed, bound };
  });
  const write = (spec: PropSpec, value: Literal) => {
    const literal = typeof value === "boolean" ? { kind: "boolean" as const, value } : typeof value === "number" ? { kind: "number" as const, value } : { kind: "string" as const, value: String(value) };
    void setPropsOnLayers(layers, [{ op: "setProp", name: spec.name, value: literal }], `${layers.length} × ${component} ${spec.name} → ${String(value)}`);
  };
  // Spacing steps read "md · 16" as in the one-layer Layout section, measured where the first layer renders.
  const world = canvasApi.getWorldElement();
  const host = world ? findBySrc(world, layers[0].src)[layers[0].instance]?.hosts[0] ?? null : null;
  // A spacing token's value, shown at the end of its option's row ("md … 16px"), as every token select.
  const stepMeta = (spec: PropSpec, option: string) => {
    const scale = host ? spacingScaleOf(component, spec.name) : null;
    const px = scale && host ? tokenPx(host, scale, option) : null;
    return px === null ? undefined : `${Number.isInteger(px) ? px : px.toFixed(1)}px`;
  };
  // The rows and options by their Figma names, as the one-layer panel shows them (generated groups, propGroups.ts).
  const groups = componentGroupsOf(component);
  const entries = groups ? [...groups.own, ...groups.after, ...groups.nested.flatMap((group) => group.props)] : [];
  const entryOf = (prop: string) => entries.find((entry) => entryProp(entry) === prop);
  return (
    <InspectorSection title={`${component} properties`} note={`A value set here goes to all ${layers.length} layers (one undo step). Mixed: they differ.`}>
      {rows.map(({ spec, value, mixed, bound }) => {
        const entry = entryOf(spec.name);
        const rowLabel = (entry && entryLabel(entry)) ?? spec.name;
        const hint = bound ? "Bound to code in some layers — change it there" : undefined;
        if (isText(spec)) {
          // Mixed values show as the placeholder; a string any layer holds but cannot write as text is left to the code.
          const shown = typeof value === "string" ? value : undefined;
          return (
            <InspectorRow key={spec.name} label={rowLabel} name={spec.name} hint={hint}>
              <TextControl label={`${spec.name} for ${layers.length} layers`} value={mixed ? undefined : shown} fallback={mixed ? "Mixed" : undefined} disabled={!editable || bound} onSet={(next) => write(spec, String(next))} />
            </InspectorRow>
          );
        }
        if (isNumber(spec)) {
          // A plain number prop takes digits only; a string-or-number one (a width) takes either.
          const strict = spec.editor.kind === "number";
          return (
            <InspectorRow key={spec.name} label={rowLabel} name={spec.name} hint={hint}>
              <TextControl numeric label={`${spec.name} for ${layers.length} layers`} value={mixed || value === null ? undefined : (value as string | number)} fallback={mixed ? "Mixed" : undefined} disabled={!editable || bound} onSet={(next) => { if (!strict || typeof next === "number") write(spec, next); }} />
            </InspectorRow>
          );
        }
        if (spec.editor.kind === "typography") {
          return (
            <InspectorRow key={spec.name} label={rowLabel} name={spec.name} hint={hint}>
              <TypographyControl label={`${spec.name} for ${layers.length} layers`} value={mixed || typeof value !== "string" ? undefined : value} fallback={undefined} emptyLabel={mixed ? "Mixed" : undefined} disabled={!editable || bound} onSet={(next) => write(spec, next)} />
            </InspectorRow>
          );
        }
        const names = entry && spec.editor.kind === "enum" ? entryOptions(entry) : undefined;
        const named = spec.editor.kind === "enum" ? (names ? figmaOptions(spec.editor.options, names, matchOption) : { options: spec.editor.options, labels: undefined })
          : spec.editor.kind === "number-enum" ? { options: spec.editor.options.map(String), labels: undefined }
          : { options: ["true", "false"], labels: undefined };
        const options = named.options;
        const label = (option: string) => (spec.editor.kind === "boolean" ? (option === "true" ? "Yes" : "No") : named.labels?.[option] ?? option);
        return (
          <InspectorRow key={spec.name} label={rowLabel} name={spec.name} hint={hint}>
            <SelectField
              aria-label={`${spec.name} for ${layers.length} layers`}
              size="sm"
              disabled={!editable || bound}
              value={mixed || value === null ? "" : spec.editor.kind === "enum" ? matchOption(String(value), options) : String(value)}
              placeholder={mixed ? "Mixed" : "—"}
              onValueChange={(next) => write(spec, spec.editor.kind === "boolean" ? next === "true" : spec.editor.kind === "number-enum" ? Number(next) : next)}
              options={options.map((option) => ({ value: String(option), label: label(String(option)), meta: spec.editor.kind === "enum" ? stepMeta(spec, String(option)) : undefined }))}
            />
          </InspectorRow>
        );
      })}
    </InspectorSection>
  );
}
