import { useEffect, useState } from "react";
import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { parseSrc, studioApi } from "../api";
import { isFrameLook } from "../appearance/AppearanceSection";
import { EFFECT_STYLES } from "../appearance/appearanceModel";
import { setPropsOnLayers } from "../edit/multi";
import { onSourceUpdate } from "../select/picker";
import type { ExtraLayer } from "../select/multiSelection";
import { useStudio } from "../store";
import type { EditOp, SourceElement } from "../types";
import { ScrubNumberField } from "./controls/ScrubNumberField";
import { PropField } from "./PropField";
import { propSpecs, valueOf, type Literal, type PropSpec, type PropValue } from "./propSchema";
import { InspectorSection } from "./Section";

/*
 * Several frames selected (Box, Stack, Grid in any mix: Figma's multi-selection of frames, F5c of
 * docs/research/studio-figma-design-parity-2026-10-18.md): Appearance (opacity), Fill, Stroke and Effects as one frame's
 * panel shows them, a value shared by all of them, "Mixed" where they differ. A change goes to every frame in one edit
 * and one undo step (edit/multi setPropsOnLayers).
 */

/** The frame look props a mixed selection edits (the rest of each frame's props stay in its own panel). */
export const MULTI_LOOK_PROPS = ["opacity", "surface", "border", "effectStyle"] as const;

function useElements(layers: ExtraLayer[]) {
  const key = layers.map((layer) => layer.src).join("|");
  const undo = useStudio((state) => state.undo.length);
  const [version, setVersion] = useState(0);
  const [read, setRead] = useState<{ key: string; elements: SourceElement[] } | null>(null);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    let alive = true;
    void Promise.all(layers.map((layer) => { const at = parseSrc(layer.src); return at ? studioApi.element(at.file, at.loc) : Promise.resolve(null); }))
      .then((elements) => { if (alive && elements.every(Boolean)) setRead({ key, elements: elements as SourceElement[] }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` names the layers.
  }, [key, version, undo]);
  return read && read.key === key ? read.elements : null;
}

const literalOf = (value: PropValue): Literal | undefined => (value.state === "literal" ? value.value : undefined);

export function MultiFrameLook({ layers, editable }: { layers: ExtraLayer[]; editable: boolean }) {
  const frames = layers.length > 1 && layers.every((layer) => isFrameLook(layer.name.slice(layer.name.lastIndexOf(".") + 1)));
  const elements = useElements(frames ? layers : []);
  if (!frames || !elements) return null;
  const specs = propSpecs("Stack");
  const spec = (name: string) => specs.find((candidate) => candidate.name === name) as PropSpec;
  /** The value every frame shares (unset counts as the default), or "mixed". */
  const shared = (name: string): { value: Literal | undefined; mixed: boolean; bound: boolean } => {
    const values = elements.map((element) => valueOf(element.attributes, name));
    const bound = values.some((value) => value.state === "bound" || value.state === "spread");
    const literals = values.map((value) => literalOf(value) ?? (name === "opacity" ? 100 : "none"));
    return { value: literals[0], mixed: literals.some((value) => value !== literals[0]), bound };
  };
  const disabled = !editable;
  const write = (ops: EditOp[], label: string) => { void setPropsOnLayers(layers, ops, `${layers.length} frames · ${label}`); };
  const setOrRemove = (name: string, value: Literal, fallback: Literal, label: string) =>
    write([value === fallback ? { op: "removeProp", name } : { op: "setProp", name, value: typeof value === "number" ? { kind: "number", value } : { kind: "string", value: String(value) } }], label);
  const field = (name: string, label: string, fallback: string) => {
    const now = shared(name);
    const value: PropValue = now.mixed || now.value === undefined || now.value === fallback ? { state: "unset" } : { state: "literal", value: now.value, raw: "" };
    return (
      <PropField
        spec={{ ...spec(name), defaultValue: fallback }}
        label={label}
        value={value}
        disabled={disabled || now.bound}
        hint={now.mixed ? "Mixed" : now.bound ? "Bound to code in some frames" : undefined}
        resettable={false}
        onSet={(next) => setOrRemove(name, next, fallback, `${label} → ${String(next)}`)}
        onReset={() => write([{ op: "removeProp", name }], `${label} removed`)}
      />
    );
  };
  const opacity = shared("opacity");
  const effect = shared("effectStyle");
  return (
    <>
      <InspectorSection title="Appearance" fieldGrid>
        <div className="studio-shape__pair" data-prop="opacity">
          <ScrubNumberField label={<Icon name="icon-drop-line" size="sm" decorative />} name="Opacity" suffix="%" min={0} max={100}
            value={opacity.mixed ? null : typeof opacity.value === "number" ? opacity.value : 100} disabled={disabled || opacity.bound}
            onCommit={(next) => setOrRemove("opacity", Math.round(Math.min(100, Math.max(0, next))), 100, `Opacity → ${Math.round(next)}%`)} />
        </div>
      </InspectorSection>
      <InspectorSection title="Fill">{field("surface", "Fill", "none")}</InspectorSection>
      <InspectorSection title="Stroke">{field("border", "Stroke", "none")}</InspectorSection>
      <InspectorSection
        title="Effects"
        actions={effect.mixed || effect.value !== "none"
          ? <IconButton icon="icon-minus-line" aria-label="Remove effects" appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => write([{ op: "removeProp", name: "effectStyle" }], "Effects removed")} />
          : undefined}
      >
        <PropField
          spec={{ ...spec("effectStyle"), editor: { kind: "enum", options: ["none", ...EFFECT_STYLES.map((style) => style.name)] }, defaultValue: "none" }}
          label="Effect"
          value={effect.mixed || effect.value === "none" ? { state: "unset" } : { state: "literal", value: effect.value as Literal, raw: "" }}
          disabled={disabled || effect.bound}
          hint={effect.mixed ? "Mixed" : undefined}
          resettable={false}
          onSet={(next) => setOrRemove("effectStyle", next, "none", `Effect → ${String(next)}`)}
          onReset={() => write([{ op: "removeProp", name: "effectStyle" }], "Effects removed")}
        />
      </InspectorSection>
    </>
  );
}
