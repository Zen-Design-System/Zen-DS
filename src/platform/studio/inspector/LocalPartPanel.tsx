import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Heading } from "../../../components/Text";
import { ToggleButton } from "../../../components/Toggle";
import { typographyStyles } from "../../../tokens/typography.generated";
import { parseSrc, subscribeStudioWrites } from "../api";
import { localLayerAt, mainsOf, pushChangesToMain, setInstanceOverrides, setInstanceValues, setsOf, type LocalLayer, type MainRef, type SetRef } from "../edit/localComponents";
import { nestedPathOf, parentLayerOf, partChain, selectedPartStore, withoutPart, type PartHit } from "../select/parts";
import { canEdit, studioStore } from "../store";
import type { StudioSelection } from "../types";
import { OverrideProperties } from "./OverrideProperties";
import { withoutLayer, withOverride, type OverrideTable } from "./overrides";
import { InspectorRow, InspectorSection } from "./Section";
import { RowInputField, RowSelectField } from "./rowFields";

/*
 * A layer inside an instance of a page's own component (F7b, spec docs/research/studio-f7b-instance-overrides-spec-2026-10-19.md):
 * ⌘-click into the instance (Figma's deep select) and its words, its visibility, a nested instance's variant and
 * properties, or a nested Zen component's properties change for this instance only, written as the `<Use>`'s
 * `overrides` (one edit each). Reset changes takes this layer back to its main; Push changes to main writes them all
 * into the main.
 */

type PartSelection = Extract<StudioSelection, { kind: "node" }>;
type Literal = string | number | boolean;

/**
 * The part's layer path inside the instance: its own, or that of the nearest component part at or above its element (a
 * Text's DOM node is the Text's: the same element, so parentLayerOf, which starts above it, would skip it).
 */
function layerPathOf(part: PartHit | null): string | null {
  if (!part) return null;
  if (part.isComponent) { const own = nestedPathOf(part); if (own) return own; }
  for (const candidate of partChain(part.owner, part.element)) {
    const path = candidate.isComponent ? nestedPathOf(candidate) : null;
    if (path) return path;
  }
  for (let at = parentLayerOf(part), depth = 0; at && depth < 12; at = parentLayerOf(at), depth++) {
    const path = at.isComponent ? nestedPathOf(at) : null;
    if (path) return path;
  }
  return null;
}

function useLocalLayer(selection: PartSelection, path: string | null) {
  const [state, setState] = useState<{ layer: LocalLayer | null; mains: MainRef[]; sets: SetRef[] } | null>(null);
  useEffect(() => {
    const at = parseSrc(selection.src);
    if (!at || !path) { setState(null); return undefined; }
    let alive = true;
    const load = async () => {
      const layer = await localLayerAt(at.file, at.loc, path);
      // An instance of another page's component: its nested instances' choices are that page's.
      const file = layer?.mainFile ?? at.file;
      const [mains, sets] = await Promise.all([mainsOf(file), setsOf(file)]);
      if (alive) setState({ layer, mains, sets });
    };
    void load();
    const stop = subscribeStudioWrites(() => void load());
    return () => { alive = false; stop(); };
  }, [selection.src, path]);
  return state;
}

/** A field that writes on Enter or blur (Esc puts the value back). */
function WordsField({ label, value, disabled, onCommit }: { label: string; value: string; disabled: boolean; onCommit: (next: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <RowInputField
      size="sm"
      aria-label={label}
      value={draft ?? value}
      disabled={disabled}
      onValueChange={setDraft}
      onBlur={() => { if (draft !== null && draft !== value) onCommit(draft); setDraft(null); }}
      onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); if (event.key === "Escape") setDraft(null); }}
    />
  );
}

export function LocalPartPanel({ selection }: { selection: PartSelection }) {
  const part = useSyncExternalStore(selectedPartStore.subscribe, selectedPartStore.get, selectedPartStore.get);
  const resolved = part && part.owner.src === selection.src && part.element.isConnected ? part : null;
  // A layer the instance hides is no longer drawn: it stays selected (as in Figma), by the path it had.
  const lastPath = useRef<string | null>(null);
  const livePath = layerPathOf(resolved);
  if (livePath) lastPath.current = livePath;
  const path = livePath ?? lastPath.current;
  const loaded = useLocalLayer(selection, path);
  const layer = loaded?.layer ?? null;
  const disabled = !canEdit();
  const instanceName = layer?.instance.name ?? "the instance";
  const segment = path ? path.split("/").at(-1)!.replace(/\[\d+\]$/, "") : resolved?.name ?? "Layer";
  const table: OverrideTable = layer?.table ?? {};
  const write = (next: OverrideTable, label: string) => void setInstanceOverrides(selection, next, label);
  const set = (prop: string, value: Literal | null, label: string) => { if (path) write(withOverride(table, path, prop, value), label); };
  const changed = Boolean(layer && Object.keys(layer.own).length);
  const nested = layer?.nested ?? null;
  const nestedSet = nested?.setId ? loaded?.sets.find((entry) => entry.id === nested.setId) ?? null : null;
  const nestedMain = nested ? loaded?.mains.find((entry) => entry.id === nested.mainId) ?? null : null;
  const nestedProperties = nestedSet?.properties ?? nestedMain?.properties ?? [];
  const words = layer ? (typeof layer.own.children === "string" ? layer.own.children : layer.words) : null;
  const shown = layer ? (layer.own.hidden === undefined ? !layer.hiddenInMain : layer.own.hidden !== true) : true;

  return (
    <div className="studio-inspector__panel">
      <header className="studio-inspector__head-block">
        <div className="studio-inspector__title-row">
          <span className="studio-inspector__kind-icon" aria-hidden="true"><Icon name={nested ? "icon-diamond-line" : "icon-layers-three-01-line"} size={16} /></span>
          <Heading level={2} textStyle="Body/Small/Bold" className="studio-part__title">
            {segment}
            <span className={`studio-part__owner ${typographyStyles["Body/Small/Regular"]}`}>{` · in ${instanceName}`}</span>
          </Heading>
        </div>
        <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{`Changes apply to this ${instanceName} only`}</p>
        <div className="studio-part__links">
          {/* zen-allow-compact-button: quiet links under the layer name in a dense tool panel, as on any part */}
          <Button appearance="flat" level="primary" size="xs" startIcon="icon-corner-left-up-line" className="studio-inspector__src" onClick={() => studioStore.setState({ selection: withoutPart(selection) })}>
            {`Select ${instanceName}`}
          </Button>
          {Object.keys(table).length ? (
            // zen-allow-compact-button: Figma's Push changes to main component, beside the owner link
            <Button appearance="flat" level="primary" size="xs" startIcon="icon-upload-01-line" disabled={disabled} onClick={() => void pushChangesToMain(withoutPart(selection) as PartSelection)}>
              Push changes to main
            </Button>
          ) : null}
        </div>
      </header>

      {!path ? <p className={`studio-inspector__empty ${typographyStyles["Body/Small/Regular"]}`}>Finding the layer…</p> : !layer ? null : (
        <>
          <InspectorSection
            title="Layer"
            actions={changed ? <IconButton icon="icon-reverse-left-line" aria-label="Reset changes" tooltip={`Reset changes · back to ${instanceName}'s main`} appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => write(withoutLayer(table, path), `${instanceName} › ${path}: reset changes`)} /> : undefined}
          >
            <InspectorRow label="Show" name="local-layer-visible">
              <ToggleButton aria-label="Show layer" size="sm" checked={shown} disabled={disabled} onCheckedChange={(on) => set("hidden", on ? (layer.hiddenInMain ? false : null) : true, `${instanceName} › ${path}: ${on ? "shown" : "hidden"}`)} />
            </InspectorRow>
            {words !== null && (layer.name === "Text" || layer.name === "Heading") ? (
              <InspectorRow label="Text" name="local-layer-text">
                <WordsField
                  label="Text"
                  value={layer.boundText && layer.instance.props[layer.boundText] !== undefined ? String(layer.instance.props[layer.boundText]) : words}
                  disabled={disabled}
                  onCommit={(next) => {
                    // A text bound to a component property: Figma sets the property on the instance.
                    if (layer.boundText && !path.includes("/")) void setInstanceValues(withoutPart(selection) as PartSelection, layer.instance.variant, { ...layer.instance.props, [layer.boundText]: next });
                    else set("children", next === layer.words ? null : next, `${instanceName} › ${path}: text → ${next.slice(0, 40)}`);
                  }}
                />
              </InspectorRow>
            ) : null}
          </InspectorSection>

          {nested ? (
            <InspectorSection title="Instance">
              {(nestedSet?.axes ?? []).map((axis) => (
                <InspectorRow key={`axis-${axis.name}`} label={axis.name} name="local-nested-variant">
                  <RowSelectField size="sm" aria-label={axis.name} disabled={disabled} value={nested.variant[axis.name] ?? axis.values[0]} options={axis.values.map((value) => ({ value, label: value }))} onValueChange={(next) => set(`variant.${axis.name}`, next, `${instanceName} › ${path}: ${axis.name} → ${next}`)} />
                </InspectorRow>
              ))}
              {nestedProperties.filter((property) => property.type === "text" || property.type === "boolean").map((property) => (
                <InspectorRow key={property.name} label={property.name} name="local-nested-property">
                  {property.type === "boolean" ? (
                    <ToggleButton aria-label={property.name} size="sm" checked={nested.values[property.name] === true} disabled={disabled} onCheckedChange={(on) => set(`props.${property.name}`, on, `${instanceName} › ${path}: ${property.name} ${on ? "on" : "off"}`)} />
                  ) : (
                    <WordsField label={property.name} value={String(nested.values[property.name] ?? "")} disabled={disabled} onCommit={(next) => set(`props.${property.name}`, next, `${instanceName} › ${path}: ${property.name} → ${next.slice(0, 40)}`)} />
                  )}
                </InspectorRow>
              ))}
            </InspectorSection>
          ) : null}

          {/* A Zen component inside the main (a Badge, a Button): its Figma properties, written as this instance's overrides. */}
          {resolved && !nested && resolved.isComponent && !["Stack", "Grid", "Box", "Text", "Heading"].includes(layer.name) ? (
            <OverrideProperties selection={selection} part={resolved} path={path} table={table} onWrite={write} />
          ) : null}
        </>
      )}
    </div>
  );
}
