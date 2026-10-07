import { useEffect, useMemo, useState } from "react";
import { SelectField } from "../../../components/Input";
import { typographyStyles } from "../../../tokens/typography.generated";
import { parseSrc, studioApi } from "../api";
import { InspectorRow, InspectorSection } from "../inspector/Section";
import { componentGroupsOf } from "../inspector/componentGroups";
import { entryLabel, entryOptions, entryProp, figmaOptions } from "../inspector/propGroups";
import { matchOption, propSpecs, valueOf, type Literal, type PropSpec } from "../inspector/propSchema";
import { onSourceUpdate } from "../select/picker";
import type { ExtraLayer } from "../select/multiSelection";
import { useStudio } from "../store";
import type { SourceElement } from "../types";
import { setPropsOnLayers } from "./multi";

/*
 * The properties of several layers of one component (Figma's multi-selection: a value shared by all of them shows,
 * "Mixed" when they differ; setting one writes it on every layer in one edit and one undo step). Variants and booleans
 * written as literals; a prop bound to code in any of the layers is left to the code.
 */

const short = (name: string) => name.slice(name.lastIndexOf(".") + 1);
type Shown = { spec: PropSpec; value: Literal | null; mixed: boolean; bound: boolean };

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
  const specs = useMemo(() => (component ? propSpecs(component).filter((spec) => spec.editor.kind === "enum" || spec.editor.kind === "boolean") : []), [component]);
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
    void setPropsOnLayers(layers, [{ op: "setProp", name: spec.name, value: typeof value === "boolean" ? { kind: "boolean", value } : { kind: "string", value: String(value) } }], `${layers.length} × ${component} ${spec.name} → ${String(value)}`);
  };
  // The rows and options by their Figma names, as the one-layer panel shows them (generated groups, propGroups.ts).
  const groups = componentGroupsOf(component);
  const entries = groups ? [...groups.own, ...groups.after, ...groups.nested.flatMap((group) => group.props)] : [];
  const entryOf = (prop: string) => entries.find((entry) => entryProp(entry) === prop);
  return (
    <InspectorSection title={`${component} properties`} note={`A value set here goes to all ${layers.length} layers (one undo step). Mixed: they differ.`}>
      {rows.map(({ spec, value, mixed, bound }) => {
        const entry = entryOf(spec.name);
        const names = entry && spec.editor.kind === "enum" ? entryOptions(entry) : undefined;
        const named = spec.editor.kind === "enum" ? (names ? figmaOptions(spec.editor.options, names, matchOption) : { options: spec.editor.options, labels: undefined }) : { options: ["true", "false"], labels: undefined };
        const options = named.options;
        const label = (option: string) => (spec.editor.kind === "boolean" ? (option === "true" ? "Yes" : "No") : named.labels?.[option] ?? option);
        return (
          <InspectorRow key={spec.name} label={(entry && entryLabel(entry)) ?? spec.name} name={spec.name} hint={bound ? "Bound to code in some layers — change it there" : undefined}>
            <SelectField
              aria-label={`${spec.name} for ${layers.length} layers`}
              size="sm"
              disabled={!editable || bound}
              value={mixed || value === null ? "" : spec.editor.kind === "enum" ? matchOption(String(value), options) : String(value)}
              placeholder={mixed ? "Mixed" : "—"}
              onValueChange={(next) => write(spec, spec.editor.kind === "boolean" ? next === "true" : next)}
              options={options.map((option) => ({ value: String(option), label: label(String(option)) }))}
            />
          </InspectorRow>
        );
      })}
    </InspectorSection>
  );
}
