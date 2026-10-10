import { Fragment, useEffect, useState } from "react";
import { Icon } from "../../../components/Icon";
import { typographyStyles } from "../../../tokens/typography.generated";
import { dataItemBlock, dataSlotOf, editDataItem, insertIntoSlot, openSlotPicker, slotHostContext, sourceItems, type DataSlot } from "../slots";
import { paletteFor } from "../slots/palette";
import { slotOf } from "../slots/registry";
import type { SourceElement, StudioSelection } from "../types";
import type { FieldApi } from "./fieldApi";
import { NestedInstanceGroup } from "./NestedProperties";
import type { NestedInstances } from "./nestedInstances";
import { ObjectProperties, type ShapedProp } from "./ObjectProperties";
import { entryDefaultIcon, entryLabel, entryOptions, entryProp, entryShown, entryWarnings, holds, isSetValue, placedProps, type ComponentGroups, type GroupToggle, type PropEntry } from "./propGroups";
import { PropField } from "./PropField";
import { propLabel, type PropSpec, type PropValue } from "./propSchema";
import { savedSetProp } from "./writePlan";
import { InspectorSection } from "./Section";
import "./nested.css";

/*
 * The Properties section of a component with Figma groups (propGroups.ts): its own properties and booleans, then one
 * group per nested layer (Top-Leading, Top-Heading-Text, Top-Trailing, Main-Heading-Text…), each with the props, list
 * items and nested Zen instances written for it. A layer whose boolean is off shows no group, and a prop that does
 * nothing in the current state is left out, as Figma hides a hidden layer's properties.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

const NULLISH = /^(null|undefined|false|""|''|\[\])$/;

/** The props the conditions read: as rendered (bound values as they are now), else as the source writes them. */
function conditionProps(rendered: Record<string, unknown> | undefined, element: SourceElement): Record<string, unknown> {
  if (rendered) return rendered;
  const out: Record<string, unknown> = {};
  for (const attr of element.attributes) {
    if (attr.kind === "spread") continue;
    if (attr.kind === "true") out[attr.name] = true;
    else if (attr.kind === "string") out[attr.name] = attr.value ?? "";
    else if (attr.shape?.type === "array") out[attr.name] = attr.shape.items;
    else out[attr.name] = NULLISH.test((attr.value ?? "").trim()) ? undefined : attr.value;
  }
  return out;
}

/**
 * Content written in place (`leading={<Avatar />}`, `trailing={[{ … }]}`): a boolean may remove it. A variable or a
 * condition (`leading={back ? … : undefined}`, a playground's state) is the code's to decide.
 */
function inPlace(element: SourceElement, prop: string): boolean {
  const attr = element.attributes.filter((candidate) => candidate.kind !== "spread" && candidate.name === prop).at(-1);
  if (!attr || attr.kind !== "expression") return true;
  return Boolean(attr.shape) || /^\s*</.test(attr.value ?? "");
}

/** A Figma boolean that stands for a prop's presence: on writes its starting value, off removes the prop. */
/** How long a switch shows the value it was set to before the canvas renders it (its hot update, then the props read). */
const PENDING_MS = 3000;

/** A Figma boolean that shows a layer: on writes what `toggle.on` says, off removes the prop (also used for a content
 *  slot's prop in the generic Properties, DesignPanel). */
export function ToggleRow({ toggle, on: rendered, value, api, selection, element }: { toggle: GroupToggle; on: boolean; value: PropValue; api: FieldApi; selection: NodeSelection; element: SourceElement }) {
  // Optimistic: the switch flips at once and holds until the canvas shows the new value (a second press meanwhile acts
  // on what the switch shows, not on the props read before the write landed).
  const [pending, setPending] = useState<boolean | null>(null);
  useEffect(() => {
    if (pending === null) return undefined;
    if (pending === rendered) { setPending(null); return undefined; }
    const timer = window.setTimeout(() => setPending(null), PENDING_MS);
    return () => window.clearTimeout(timer);
  }, [pending, rendered]);
  const on = pending ?? rendered;
  const spec: PropSpec = { name: toggle.prop, type: "boolean", description: `Figma boolean ${toggle.label}: shows the ${toggle.label} layer (${toggle.prop} set).`, defaultValue: false, editor: { kind: "boolean" } };
  // A value the source computes (a playground's state, a condition) or spreads: read-only, showing what renders.
  const computed = (value.state === "bound" && !inPlace(element, toggle.prop)) || value.state === "spread";
  const shown: PropValue = computed ? { state: "spread", via: value.state === "bound" ? value.expression : value.state === "spread" ? value.via : "", live: on } : { state: "literal", value: on, raw: "" };
  // An item toggle's data slot: its own, else the component's for the prop (dataSlots.ts).
  const slot: DataSlot | null = toggle.on.kind === "item" ? toggle.on.slot ?? dataSlotOf(element.name, toggle.prop) : null;
  const startValue = () => {
    const { on: start } = toggle;
    // The host stays selected after an item add, so this row stays reachable to switch the layer off again.
    if (start.kind === "item") { if (slot) void editDataItem(selection, slot, "add", 0, 0, { keepHost: true }); return; }
    if (start.kind === "slot") {
      // A slot that takes one component (PageHeader Breadcrumbs, Tabs) gets it at once, as Figma's boolean shows its
      // layer; a slot that takes several asks which (the picker).
      // The items as the picker lists them here (paletteFor: a builder page's static versions, what cannot go here left out).
      const slot = slotOf(element.name, toggle.prop);
      const only = slot?.accepts?.only?.length === 1 ? slot.accepts.only[0] : null;
      const offer = slot && only ? paletteFor(slotHostContext(selection, element, slot)) : null;
      const items = offer?.items.filter((item) => item.root === only) ?? [];
      if (slot && offer && items.length === 1) { void insertIntoSlot({ selection, element, slot, item: items[0], context: offer.context }); return; }
      openSlotPicker(selection, toggle.prop);
      return;
    }
    // An object written as code (an action: `{ label: "Action" }`), then edited field by field in Object properties.
    if (start.kind === "code") { void api.apply([{ op: "setProp", name: toggle.prop, value: { kind: "expression", code: start.code } }], `${element.name} ${toggle.label} on`); return; }
    const from = (start.from ?? []).map((prop) => api.valueFor(prop)).find((candidate) => candidate.state === "literal" && typeof candidate.value === "string" && candidate.value.trim());
    api.setProp(toggle.prop, from?.state === "literal" ? from.value : start.value);
  };
  // Back on after the draft switched it off: what the saved file has comes back (an Avatar leading, "New review", the
  // two call actions with their toast hook), as Figma shows a hidden layer's content again; else a starting value. A
  // playground refuses slot ops: the saved attribute is set again in its saved place (savedSetProp), not at the tag's end.
  const switchOn = () => {
    const saved = element.savedAttributes?.[toggle.prop];
    if (!saved) { startValue(); return; }
    const op = selection.panelId ? savedSetProp(toggle.prop, saved) : { op: "resetSlot" as const, prop: toggle.prop };
    if (!op) { startValue(); return; }
    void api.apply([op], `${element.name} ${toggle.label} on`).then((written) => { if (!written) startValue(); });
  };
  // Off: the items go through the item op (all of them at once), so the useToast() line they brought goes with them
  // (example and template content; a playground removes the prop).
  const switchOff = () => {
    const { on: start } = toggle;
    if (start.kind === "item" && slot && dataItemBlock(selection) === null && sourceItems(element, slot).state === "items") { void editDataItem(selection, slot, "remove", 0, 0, { all: true }); return; }
    api.removeProp(toggle.prop);
  };
  return (
    <PropField
      spec={spec}
      label={toggle.label}
      value={shown}
      disabled={api.disabled}
      resettable={false}
      onSet={(next) => {
        if (next === true && !on) { setPending(true); switchOn(); } else if (next === false && on) { setPending(false); switchOff(); }
      }}
      onReset={() => undefined}
    />
  );
}

export function GroupedProperties({ groups, selection, element, api, specs, shaped, note, rendered, nested }: {
  groups: ComponentGroups;
  selection: NodeSelection;
  element: SourceElement;
  api: FieldApi;
  /** The Properties specs (layout, text, sizing and position props already left out). */
  specs: PropSpec[];
  /** Object and array props written in place (edited field by field). */
  shaped: ShapedProp[];
  note?: string;
  /** The element's props as rendered now (undefined: not on the canvas). */
  rendered: Record<string, unknown> | undefined;
  /** Its nested instances (DesignPanel reads them once: Reset all overrides plans theirs too). */
  nested: NestedInstances;
}) {
  const props = conditionProps(rendered, element);
  const component = element.name;
  const specOf = (prop: string) => specs.find((spec) => spec.name === prop);
  const shapedOf = new Map(shaped.map((entry) => [entry.spec.name, entry]));
  const placed = placedProps(groups);
  // Props no group lists stay in the component's own group, after the code-only ones.
  const after: PropEntry[] = [...groups.after, ...specs.map((spec) => spec.name).filter((name) => !placed.has(name))];

  /** A group's rows: its fields, the list items and objects written in place, the nested Zen instances in its props. */
  const rows = (entries: readonly PropEntry[], key: string) => {
    const shown = entries.filter((entry) => entryShown(entry, props)).map(entryProp);
    const warnings = new Map(entries.map((entry) => [entryProp(entry), entryWarnings(entry, props)]));
    // A Figma name for the row when the group gives one (generated from the Figma read), else the prop's label.
    const labels = new Map(entries.map((entry) => [entryProp(entry), entryLabel(entry)]));
    // And its options by their Figma names ("Medium (Base)"), in Figma's order; the file still gets the code value.
    const optionNames = new Map(entries.map((entry) => [entryProp(entry), entryOptions(entry)]));
    const defaultIcons = new Map(entries.map((entry) => [entryProp(entry), entryDefaultIcon(entry)]));
    const fields = shown.filter((prop) => !shapedOf.has(prop)).map(specOf).filter((spec): spec is PropSpec => Boolean(spec));
    const objects = shown.flatMap((prop) => (shapedOf.has(prop) ? [shapedOf.get(prop)!] : []));
    const instances = nested.items.filter((item) => shown.includes(item.prop));
    return (
      <>
        {fields.map((spec) => (
          <Fragment key={`${key}:${spec.name}`}>
            {/* A content slot's prop the Figma booleans do not switch (TopNavigation Title-Leading): a switch that puts a
                real component in, never a text field (DesignPanel does the same for components without Figma groups). */}
            {spec.editor.kind === "node" && slotOf(component, spec.name) && !groups.toggles.some((toggle) => toggle.prop === spec.name) ? (
              <ToggleRow toggle={{ prop: spec.name, label: labels.get(spec.name) ?? propLabel(spec.name, component), on: { kind: "slot" } }} on={api.valueFor(spec.name).state !== "unset"} value={api.valueFor(spec.name)} api={api} selection={selection} element={element} />
            ) : (
            <PropField
              spec={spec}
              label={labels.get(spec.name) ?? propLabel(spec.name, component)}
              optionLabels={optionNames.get(spec.name)}
              defaultIcon={defaultIcons.get(spec.name)}
              value={api.valueFor(spec.name)}
              disabled={api.disabled}
              boundHint={api.boundHint}
              onSet={(value) => api.setProp(spec.name, value)}
              onReset={() => api.removeProp(spec.name)}
              onAddObject={(code) => { void api.apply([{ op: "setProp", name: spec.name, value: { kind: "expression", code } }], `${component} ${spec.name} added`); }}
              restore={api.restoreFor?.(spec.name)}
              repeats={api.repeats}
            />
            )}
            {/* The field stays editable; the warning says why it does nothing in this state. */}
            {(warnings.get(spec.name) ?? []).map((text) => (
              <p key={text} className={`studio-group__warning ${typographyStyles["Body/Small/Regular"]}`}>
                <Icon name="icon-alert-triangle-line" size="sm" decorative />
                {text}
              </p>
            ))}
          </Fragment>
        ))}
        {objects.length ? <ObjectProperties component={component} props={objects} api={api} selection={selection} /> : null}
        {objects.flatMap((entry) => warnings.get(entry.spec.name) ?? []).map((text) => (
          <p key={text} className={`studio-group__warning ${typographyStyles["Body/Small/Regular"]}`}>
            <Icon name="icon-alert-triangle-line" size="sm" decorative />
            {text}
          </p>
        ))}
        {instances.length ? (
          <div className="studio-nested">
            {instances.map((item) => <NestedInstanceGroup key={item.src} item={item} nested={nested} element={element} api={api} />)}
          </div>
        ) : null}
      </>
    );
  };

  const toggles = groups.toggles.filter((toggle) => holds(toggle.when, props));
  return (
    <InspectorSection title="Properties" note={note}>
      {rows(groups.own, "own")}
      {toggles.map((toggle) => (
        <ToggleRow key={toggle.label} toggle={toggle} on={isSetValue(props[toggle.prop])} value={api.valueFor(toggle.prop)} api={api} selection={selection} element={element} />
      ))}
      {rows(after, "after")}
      {groups.nested.filter((group) => holds(group.when, props)).map((group) => (
        <div key={group.name} role="group" aria-label={group.name} className="studio-group">
          <div className="studio-group__header">
            <span className="studio-group__icon" aria-hidden="true"><Icon name="icon-cube-line" size={16} /></span>
            <span className={`studio-group__name ${typographyStyles["Body/Small/Medium"]}`}>{group.name}</span>
          </div>
          {rows(group.props, group.name ?? "")}
        </div>
      ))}
    </InspectorSection>
  );
}
