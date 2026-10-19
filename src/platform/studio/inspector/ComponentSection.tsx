import { useEffect, useState, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu } from "../../../components/Menu";
import { typographyStyles } from "../../../tokens/typography.generated";
import { ToggleButton } from "../../../components/Toggle";
import { applyEdit, parseSrc, studioApi, subscribeStudioWrites } from "../api";
import { loadEngine, zenComponents } from "../builder/engine";
import {
  addVariant, BINDING_OF, bindLayer, createInstance, detachInstance, goToMain, mainsOf, newProperty, renameComponent, renameVariantProperty,
  overrideCount, pushChangesToMain, resetInstance, selectInstances, setAbout, setComponentProperties, setInstanceValues, setsOf, setVariantValues, swapInstance, objectCode,
  type MainRef, type PropertyRef, type SetRef,
} from "../edit/localComponents";
import type { EditOp, StudioSelection } from "../types";
import { InspectorRow, InspectorSection } from "./Section";
import { RowInputField, RowSelectField } from "./rowFields";
import { inspectorStatus } from "./status";

/*
 * Figma UI3's component blocks at the top of the Design panel, for a page's own components (edit/localComponents.ts;
 * F7 of docs/research/studio-figma-design-parity-2026-10-18.md, spec studio-f7-components-spec-2026-10-19.md):
 * - a main component: its name, Create instance, Select instances, and its component properties (+ Text, Boolean,
 *   Instance swap, Slot; each with its default);
 * - a variant (a main in a set): its value of each variant property;
 * - a component set: its name, Add variant, its variant properties (rename) and component properties;
 * - an instance: the component it shows (Swap), its variant and property values (Figma's instance properties), Reset,
 *   Go to main component, Detach;
 * - a layer inside a main: Figma's Apply component property (text, visible, instance swap).
 * Read again after every write, so undo shows at once.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
type Instance = { of: string; mainId: string; setId: string | null; variant: Record<string, string>; values: Record<string, unknown>; own: { variant: Record<string, string>; props: Record<string, unknown>; overrides: number } };
type Found = {
  mains: MainRef[];
  sets: SetRef[];
  /** The selection is this main's root layer. */
  main: MainRef | null;
  /** The selection is this set's frame. */
  set: SetRef | null;
  /** The selection is an instance. */
  instance: Instance | null;
  /** The main (and its set) whose layers hold the selection, for Apply component property; null outside a main. */
  owner: { main: MainRef; set: SetRef | null; loc: string; bound: Partial<Record<PropertyRef["type"], string>> } | null;
};

const literalsOf = (value: unknown): Record<string, unknown> => {
  const entry = value as { kind?: string; fields?: Record<string, { kind: string; value?: unknown }> } | undefined;
  if (entry?.kind !== "object" || !entry.fields) return {};
  return Object.fromEntries(Object.entries(entry.fields).flatMap(([key, field]) => (field.kind === "literal" ? [[key, field.value]] : [])));
};

function useComponents(selection: NodeSelection): Found | null {
  const [found, setFound] = useState<Found | null>(null);
  useEffect(() => {
    let alive = true;
    const at = parseSrc(selection.src);
    if (!at) { setFound(null); return undefined; }
    const load = async () => {
      try {
        const [mains, sets, engine, source] = await Promise.all([mainsOf(at.file), setsOf(at.file), loadEngine(), studioApi.source(at.file)]);
        if (!alive) return;
        const tree = engine.parsePage(source.content, { components: new Set(zenComponents) });
        let instance: Instance | null = null;
        let owner: Found["owner"] = null;
        engine.eachElement(tree.board, (node, parents) => {
          if (node.loc !== at.loc) return;
          if (node.name === "Use") {
            const resolved = engine.resolveInstance(tree, node);
            if (resolved?.main.id) instance = { of: String(node.props.of?.value ?? ""), mainId: resolved.main.id, setId: resolved.set?.id ?? null, variant: resolved.variant, values: resolved.values, own: { variant: literalsOf(node.props.variant) as Record<string, string>, props: literalsOf(node.props.props), overrides: overrideCount(node) } };
          }
          const component = [...parents].reverse().find((parent) => (parent as { name?: string }).name === "Component") as { props?: Record<string, { value?: unknown }> } | undefined;
          const mainId = String(component?.props?.id?.value ?? "");
          const main = mains.find((entry) => entry.id === mainId);
          if (main) {
            const bound: Partial<Record<PropertyRef["type"], string>> = {};
            for (const [type, attr] of Object.entries(BINDING_OF) as Array<[PropertyRef["type"], string]>) {
              const value = node.props[attr]?.value;
              if (typeof value === "string") bound[type] = value;
            }
            owner = { main, set: main.set ? sets.find((entry) => entry.id === main.set) ?? null : null, loc: node.loc, bound };
          }
        });
        setFound({ mains, sets, main: mains.find((entry) => entry.rootLoc === at.loc) ?? null, set: sets.find((entry) => entry.loc === at.loc) ?? null, instance, owner });
      } catch {
        if (alive) setFound(null);
      }
    };
    void load();
    const stop = subscribeStudioWrites(() => void load());
    return () => { alive = false; stop(); };
  }, [selection.src, selection.name]);
  return found;
}

/** A text field that writes on Enter or blur (Esc puts the value back), as Figma's name fields. */
function NameField({ label, value, disabled, onCommit, leading, placeholder, allowEmpty = false }: { label: string; value: string; disabled: boolean; onCommit: (next: string) => void; leading?: ReactNode; placeholder?: string; allowEmpty?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <RowInputField
      size="sm"
      aria-label={label}
      leading={leading}
      value={draft ?? value}
      placeholder={placeholder}
      disabled={disabled}
      onValueChange={setDraft}
      onBlur={() => { if (draft !== null && (allowEmpty || draft.trim()) && draft.trim() !== value) onCommit(draft.trim()); setDraft(null); }}
      onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); if (event.key === "Escape") setDraft(null); }}
    />
  );
}

/** Figma's Edit component: a main's or set's description and documentation link (Assets and the instance show them). */
function AboutRows({ file, loc, description, link, disabled }: { file: string; loc: string; description?: string; link?: string; disabled: boolean }) {
  return (
    <>
      <InspectorRow label="Description" name="component-description">
        <NameField label="Description" value={description ?? ""} placeholder="What it is for" allowEmpty disabled={disabled} onCommit={(next) => void setAbout(file, loc, "description", next)} />
      </InspectorRow>
      <InspectorRow label="Link" name="component-link">
        <NameField label="Link" value={link ?? ""} placeholder="https://" allowEmpty disabled={disabled} onCommit={(next) => void setAbout(file, loc, "link", next)} />
      </InspectorRow>
    </>
  );
}

const TYPE_LABEL: Readonly<Record<PropertyRef["type"], string>> = { text: "Text", boolean: "Boolean", swap: "Instance swap", slot: "Slot" };
const TYPE_ICON = { text: "icon-type-01-line", boolean: "icon-toggle-right-line", swap: "icon-switch-horizontal-01-line", slot: "icon-layout-alt-04-line" } as const;
const diamond = <Icon name="icon-diamond-line" size="sm" decorative />;

/** Figma's component properties of a main or set: + (Text, Boolean, Instance swap, Slot), each row's name and default, −. */
function PropertiesSection({ owner, properties, axes, onRenameAxis, disabled }: {
  owner: { file: string; loc: string; name: string };
  properties: PropertyRef[];
  axes?: Array<{ name: string; values: string[] }>;
  onRenameAxis?: (from: string, to: string) => void;
  disabled: boolean;
}) {
  const write = (next: PropertyRef[], label: string) => void setComponentProperties(owner, next, label);
  const update = (index: number, patch: Partial<PropertyRef>, label: string) => write(properties.map((property, at) => (at === index ? { ...property, ...patch } : property)), label);
  const add = (type: PropertyRef["type"]) => { const property = newProperty(properties, type); write([...properties, property], `Add ${TYPE_LABEL[type].toLowerCase()} property ${property.name}`); };
  return (
    <InspectorSection
      title="Properties"
      actions={(
        <Menu
          aria-label="Add property"
          items={(["text", "boolean", "swap", "slot"] as const).map((type) => ({ id: type, label: TYPE_LABEL[type], icon: TYPE_ICON[type], onSelect: () => add(type) }))}
          trigger={<IconButton icon="icon-plus-line" aria-label="Add property" appearance="flat" level="primary" size="xs" disabled={disabled} />}
        />
      )}
      note={!properties.length && !axes?.length ? "Add a property to change it on each instance" : undefined}
    >
      {(axes ?? []).map((axis) => (
        // A variant property in the same row as the component properties: its icon, its name, its values.
        <div key={`axis-${axis.name}`} className="studio-component-property" data-prop="variant-property">
          <span className="studio-component-property__type" title="Variant"><Icon name="icon-diamond-line" size="sm" decorative /></span>
          <NameField label={`Variant property ${axis.name}`} value={axis.name} disabled={disabled || !onRenameAxis} onCommit={(next) => onRenameAxis?.(axis.name, next)} />
          <span className={`studio-component-property__values ${typographyStyles["Body/Small/Regular"]}`} title={axis.values.join(", ")}>{axis.values.join(", ")}</span>
          <span />
        </div>
      ))}
      {properties.map((property, index) => (
        <div key={`${property.name}-${index}`} className="studio-component-property" data-prop="component-property">
          <span className="studio-component-property__type" title={TYPE_LABEL[property.type]}><Icon name={TYPE_ICON[property.type]} size="sm" decorative /></span>
          <NameField label={`${TYPE_LABEL[property.type]} property name`} value={property.name} disabled={disabled} onCommit={(next) => update(index, { name: next }, `Rename property ${property.name} → ${next}`)} />
          {property.type === "boolean" ? (
            <ToggleButton aria-label={`${property.name} default`} size="sm" checked={property.default === true} disabled={disabled} onCheckedChange={(checked) => update(index, { default: checked }, `${property.name} default → ${checked ? "on" : "off"}`)} />
          ) : property.type === "slot" ? <span /> : (
            <NameField label={`${property.name} default`} value={String(property.default ?? "")} disabled={disabled} onCommit={(next) => update(index, { default: next }, `${property.name} default → ${next}`)} />
          )}
          <IconButton icon="icon-minus-line" aria-label={`Remove property ${property.name}`} appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => write(properties.filter((_, at) => at !== index), `Remove property ${property.name}`)} />
        </div>
      ))}
    </InspectorSection>
  );
}

/** Figma's Apply component property on a layer of a main: its text, its visibility, its icon or nested instance. */
function ApplyPropertySection({ selection, found, disabled }: { selection: NodeSelection; found: NonNullable<Found["owner"]>; disabled: boolean }) {
  const holder = found.set ?? found.main;
  const ownerAt = { file: found.main.file, loc: found.set ? found.set.loc : found.main.componentLoc, name: holder.name };
  const properties = found.set ? found.set.properties : found.main.properties;
  const kinds: Array<PropertyRef["type"]> = [
    ...(selection.name === "Text" || selection.name === "Heading" ? ["text" as const] : []),
    "boolean",
    ...(selection.name === "Icon" || selection.name === "Use" ? ["swap" as const] : []),
  ];
  const label = { text: "Text", boolean: "Visible", swap: "Swap", slot: "Slot" } as const;
  /** A new property of `type` defined on the main or set and this layer bound to it, in one edit. */
  const create = async (type: PropertyRef["type"]) => {
    const property = newProperty(properties, type);
    if (type === "text") {
      const element = await studioApi.element(found.main.file, found.loc);
      const text = element?.children.find((child) => child.kind === "text" && child.value.trim());
      if (text?.kind === "text") property.default = text.value.trim();
    }
    if (type === "swap" && selection.name === "Icon") {
      const element = await studioApi.element(found.main.file, found.loc);
      const name = element?.attributes.find((attr) => attr.kind === "string" && attr.name === "name")?.value;
      if (name) property.default = name;
    }
    const all = [...properties, property];
    const value = Object.fromEntries(all.map((entry) => [entry.name, { type: entry.type, ...(entry.default !== undefined ? { default: entry.default } : {}) }]));
    const opsByLoc: Record<string, EditOp[]> = {
      [ownerAt.loc]: [{ op: "setProp", name: "properties", value: { kind: "expression", code: objectCode(value) } }],
      [found.loc]: [{ op: "setProp", name: BINDING_OF[type], value: { kind: "string", value: property.name } }],
    };
    const element = await studioApi.element(found.main.file, found.loc);
    if (!element) return;
    const response = await applyEdit({ file: found.main.file, loc: found.loc, name: element.name, ops: [{ op: "many", action: "setProps", locs: Object.keys(opsByLoc), opsByLoc } as EditOp], hash: element.hash }, `Create ${TYPE_LABEL[type].toLowerCase()} property ${property.name}`);
    if (response.ok) inspectorStatus.set("positive", `${property.name}: each instance of ${holder.name} can change it`);
  };
  return (
    <InspectorSection title="Component property">
      {kinds.map((type) => {
        const options = properties.filter((property) => property.type === type);
        const current = found.bound[type] ?? "";
        return (
          <InspectorRow key={type} label={label[type]} name={`bind-${type}`}>
            <RowSelectField
              size="sm"
              aria-label={`${label[type]} property`}
              disabled={disabled}
              value={current}
              placeholder="None"
              options={[{ value: "", label: "None" }, ...options.map((property) => ({ value: property.name, label: property.name })), { value: "__create__", label: `Create ${TYPE_LABEL[type].toLowerCase()} property…` }]}
              onValueChange={(next) => {
                if (next === "__create__") void create(type);
                else if (next !== current) void bindLayer(selection, type, next || null);
              }}
            />
          </InspectorRow>
        );
      })}
    </InspectorSection>
  );
}

/** An instance's properties (Figma UI3, under the instance's header): each variant property, then each component property. */
function InstancePropertiesSection({ selection, instance, found, disabled }: { selection: NodeSelection; instance: Instance; found: Found; disabled: boolean }) {
  const set = instance.setId ? found.sets.find((entry) => entry.id === instance.setId) ?? null : null;
  const main = found.mains.find((entry) => entry.id === instance.mainId);
  const properties = set?.properties ?? main?.properties ?? [];
  const write = (variant: Record<string, string>, props: Record<string, unknown>) => void setInstanceValues(selection, variant, props);
  const setVariant = (axis: string, value: string) => write({ ...instance.own.variant, [axis]: value }, instance.own.props);
  const setValue = (property: PropertyRef, value: unknown) => {
    const props = { ...instance.own.props };
    if (value === property.default) delete props[property.name];
    else props[property.name] = value;
    write(instance.own.variant, props);
  };
  // Figma's changed instance: its own values and the layers inside it it changed (F7b overrides).
  const changed = Object.keys(instance.own.variant).length + Object.keys(instance.own.props).length + instance.own.overrides;
  // A main without properties: the section only for an instance that changed layers inside it (its Reset all changes).
  const plain = !set?.axes.length && !properties.length;
  if (plain && !changed) return null;
  return (
    <InspectorSection
      title="Properties"
      actions={changed ? <IconButton icon="icon-reverse-left-line" aria-label="Reset all changes" tooltip="Reset all changes" appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => void resetInstance(selection)} /> : undefined}
      note={plain ? `${instance.own.overrides} layer${instance.own.overrides === 1 ? "" : "s"} changed in this instance` : undefined}
    >
      {(set?.axes ?? []).map((axis) => (
        <InspectorRow key={`axis-${axis.name}`} label={axis.name} name="instance-variant">
          <RowSelectField size="sm" aria-label={axis.name} disabled={disabled} value={instance.variant[axis.name] ?? axis.values[0]} options={axis.values.map((value) => ({ value, label: value }))} onValueChange={(next) => setVariant(axis.name, next)} />
        </InspectorRow>
      ))}
      {properties.filter((property) => property.type !== "slot").map((property) => (
        <InspectorRow key={property.name} label={property.name} name="instance-property">
          {property.type === "boolean" ? (
            <ToggleButton aria-label={property.name} size="sm" checked={instance.values[property.name] === true} disabled={disabled} onCheckedChange={(checked) => setValue(property, checked)} />
          ) : (
            <NameField label={property.name} value={String(instance.values[property.name] ?? "")} disabled={disabled} onCommit={(next) => setValue(property, next)} />
          )}
        </InspectorRow>
      ))}
    </InspectorSection>
  );
}

export function ComponentSection({ selection, disabled }: { selection: NodeSelection; disabled: boolean }) {
  const found = useComponents(selection);
  if (!found) return null;
  const blocks: ReactNode[] = [];
  if (found.set) {
    const set = found.set;
    blocks.push(
      <InspectorSection key="set" title="Component set" className="studio-component-section">
        <div className="studio-inspector__wide-field"><NameField label="Component set name" value={set.name} leading={diamond} disabled={disabled} onCommit={(next) => void setName(set.file, set.loc, next)} /></div>
        <AboutRows file={set.file} loc={set.loc} description={set.description} link={set.link} disabled={disabled} />
        <div className="studio-component-section__actions">
          <Button size="sm" level="tertiary" startIcon="icon-plus-line" disabled={disabled} onClick={() => void addVariant(set)}>Add variant</Button>
        </div>
      </InspectorSection>,
      <PropertiesSection key="set-properties" owner={{ file: set.file, loc: set.loc, name: set.name }} properties={set.properties} axes={set.axes} onRenameAxis={(from, to) => void renameVariantProperty(set, from, to)} disabled={disabled} />,
    );
  } else if (found.main) {
    const main = found.main;
    const set = main.set ? found.sets.find((entry) => entry.id === main.set) ?? null : null;
    blocks.push(
      <InspectorSection key="main" title={set ? "Variant" : "Component"} className="studio-component-section">
        {set ? (set.axes.map((axis) => (
          <InspectorRow key={axis.name} label={axis.name} name="variant-value">
            <NameField label={`${axis.name} of this variant`} value={main.variant?.[axis.name] ?? ""} disabled={disabled} onCommit={(next) => void setVariantValues(main, { ...(main.variant ?? {}), [axis.name]: next })} />
          </InspectorRow>
        ))) : (
          <div className="studio-inspector__wide-field"><NameField label="Component name" value={main.name} leading={diamond} disabled={disabled} onCommit={(next) => void renameComponent(main, next)} /></div>
        )}
        {!set ? <AboutRows file={main.file} loc={main.componentLoc} description={main.description} link={main.link} disabled={disabled} /> : null}
        <div className="studio-component-section__actions">
          <Button size="sm" level="tertiary" disabled={disabled} onClick={() => void createInstance(main, selection)}>Create instance</Button>
          <Button size="sm" level="tertiary" disabled={!main.uses.length} onClick={() => selectInstances(main, selection)}>{main.uses.length ? `Select ${main.uses.length} instance${main.uses.length > 1 ? "s" : ""}` : "No instances"}</Button>
        </div>
      </InspectorSection>,
    );
    if (!set) blocks.push(<PropertiesSection key="main-properties" owner={{ file: main.file, loc: main.componentLoc, name: main.name }} properties={main.properties} disabled={disabled} />);
  } else if (found.instance) {
    const instance = found.instance;
    // Figma's swap list: the page's component sets and the mains outside a set.
    const choices = [...found.sets.map((set) => ({ value: set.id, label: set.name })), ...found.mains.filter((main) => !main.set).map((main) => ({ value: main.id, label: main.name }))];
    const shown = instance.setId ?? instance.mainId;
    blocks.push(
      <InspectorSection key="instance" title="Instance" className="studio-component-section">
        <div className="studio-inspector__wide-field">
        <RowSelectField
          size="sm"
          aria-label="Component"
          leading={diamond}
          value={shown}
          disabled={disabled || choices.length < 2}
          options={choices}
          onValueChange={(next) => {
            if (next === shown) return;
            const to = found.mains.find((main) => main.id === next) ?? (() => { const set = found.sets.find((entry) => entry.id === next); return set ? ({ id: set.id, name: set.name } as MainRef) : null; })();
            if (to) void swapInstance(selection, to);
          }}
        />
        </div>
        <div className="studio-component-section__actions">
          <Button size="sm" level="tertiary" onClick={() => void goToMain(selection)}>Go to main component</Button>
          {instance.own.overrides ? <Button size="sm" level="tertiary" disabled={disabled} onClick={() => void pushChangesToMain(selection)}>Push changes to main</Button> : null}
          <Button size="sm" level="tertiary" disabled={disabled} onClick={() => void detachInstance(selection)}>Detach instance</Button>
        </div>
      </InspectorSection>,
      <InstancePropertiesSection key="instance-properties" selection={selection} instance={instance} found={found} disabled={disabled} />,
    );
  }
  if (found.owner && !found.set) blocks.push(<ApplyPropertySection key="apply" selection={selection} found={found.owner} disabled={disabled} />);
  return blocks.length ? <>{blocks}</> : null;
}

/** A set's name (Figma renames the set; its variants keep their values). */
async function setName(file: string, loc: string, name: string) {
  const element = await studioApi.element(file, loc);
  if (!element) return;
  await applyEdit({ file, loc, name: element.name, ops: [{ op: "setProp", name: "name", value: { kind: "string", value: name } }], hash: element.hash }, `Rename component set → ${name}`);
}
