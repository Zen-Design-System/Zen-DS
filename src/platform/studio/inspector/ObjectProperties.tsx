import { Fragment, useEffect, useMemo, useState } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { plural } from "../../../components/Text";
import { announceEditStatus } from "../api";
import { dataItemBlock, dataSlotOf, editDataItem, useSlotRunning, useSlotServer, type DataSlot } from "../slots";
import type { StudioSelection } from "../types";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { AttrShape, EditValue, ObjectShape, ShapeField } from "../types";
import type { FieldApi } from "./fieldApi";
import { objectSchemaOf, objectSchemasOf, schemaFor, useApiTypes, type FieldSpec } from "./objectSchema";
import { PropField } from "./PropField";
import { componentSlug, propLabel, type Literal, type PropEditor, type PropSpec, type PropValue } from "./propSchema";
import "./nested.css";

/*
 * Object and array props written in place, edited field by field (B2, 2026-10-04): TopNavigation's
 * `leading={{ icon, label, onClick }}` and `trailing={[{ icon, label, dot }, …]}`, EmptyState's primaryAction, an
 * ActionBar's actions… Each object (each array item) is a group, like Figma's nested instance properties: its booleans,
 * text, icons and enums from the TypeScript type the prop takes (docs/api types), the fields written without a known
 * type from their literal. Writes go through op setField, so the rest of the object stays as written.
 */

/** `via`: the shape is a same-file const's literal (`options={countries}`), edited there. */
export type ShapedProp = { spec: PropSpec; shape: AttrShape; via?: { name: string; line: number } };

type Group = { key: string; prop: string; index?: number; title: string; meta?: string; object: ObjectShape; fields: FieldSpec[]; list?: { count: number; last: boolean; literal: boolean }; via?: { name: string; line: number } };
type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/** An editor for a field the type does not list, from the literal written there. */
function inferredEditor(field: ShapeField): PropEditor {
  if (field.kind === "boolean") return { kind: "boolean" };
  if (field.kind === "number") return { kind: "number" };
  if (field.kind === "string") return /^icon-/.test(field.value) ? { kind: "icon" } : { kind: "string" };
  return { kind: "readonly" };
}

function valueOfField(field: ShapeField | undefined): PropValue {
  if (!field) return { state: "unset" };
  if (field.kind === "string" || field.kind === "boolean" || field.kind === "number") return { state: "literal", value: field.value, raw: "" };
  return { state: "bound", expression: field.value, raw: "" };
}

const toEditValue = (value: Literal): EditValue =>
  typeof value === "boolean" ? { kind: "boolean", value } : typeof value === "number" ? { kind: "number", value } : { kind: "string", value };

/*
 * A list of numbers in an item (StackBarChart `data[n].values`, 2026-10-10 palette sweep: "bound in code"): edited as
 * text, "12, 18, 7", and written back as the array literal `[12, 18, 7]`.
 */
const isNumberList = (field: FieldSpec) => /^(?:readonly\s+)?number\[\]$|^(?:Readonly)?Array<number>$/.test(field.type.trim());
const NUMBER = /^-?\d+(?:\.\d+)?$/;
function numberListText(written: ShapeField | undefined): string | null {
  if (written?.kind !== "expression") return null;
  const body = /^\[([\s\S]*)\]$/.exec(written.value.trim())?.[1];
  if (body === undefined) return null;
  const parts = body.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.every((part) => NUMBER.test(part)) ? parts.join(", ") : null;
}
/** "12, 18 7" → `[12, 18, 7]`; null when a part is not a number. */
function numberListCode(text: string): string | null {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  return parts.every((part) => NUMBER.test(part)) ? `[${parts.join(", ")}]` : null;
}

const display = (value: Literal) => (typeof value === "string" ? `"${value.length > 24 ? `${value.slice(0, 24)}…` : value}"` : String(value));

/** What names an item in its group title ("Audio call"): its label, title, term or name when written as text. */
function itemName(object: ObjectShape): string | undefined {
  for (const key of ["label", "title", "term", "name", "header"]) {
    const field = object.fields.find((candidate) => candidate.key === key);
    if (field?.kind === "string" && field.value.trim()) return field.value.trim();
  }
  return undefined;
}

/** The fields a group shows: the type's (written or not, when editable), then the written ones the type does not list. */
function groupFields(object: ObjectShape, typed: FieldSpec[] | null): FieldSpec[] {
  const written = object.fields.filter((field) => field.key !== "…");
  const out: FieldSpec[] = [];
  for (const spec of typed ?? []) {
    const field = written.find((candidate) => candidate.key === spec.name);
    // A tag with one value (Menu `type: "group"`) says which kind the item is: nothing to choose.
    if (spec.editor.kind === "enum" && spec.editor.options.length === 1) continue;
    if (spec.editor.kind !== "readonly" || field) out.push(spec);
  }
  for (const field of written) {
    if (out.some((spec) => spec.name === field.key) || /^on[A-Z]/.test(field.key) || field.key === "id" || field.key === "key") continue;
    if (typed && typed.length) continue; // a known type: only its fields (an unknown key is the code's own)
    out.push({ name: field.key, type: "", description: "", defaultValue: null, editor: inferredEditor(field), optional: true });
  }
  return out;
}

/**
 * `only`: one object or one array item (a data-slot item selected on the canvas, DataItemPanel), its fields without the
 * group header (the panel names the item).
 */
/**
 * `selection` (the Design panel's): an array prop's items also move, go and come (a copy of the last one) from their
 * group headers, in example and template content (Backlog P2 after B2, user 2026-10-04). A data slot's items
 * (TopNavigation trailing) do that in the Slots section instead.
 */
export function ObjectProperties({ component, props, api, only, selection, defaults, within, focus }: {
  component: string;
  props: ShapedProp[];
  api: FieldApi;
  only?: { prop: string; index?: number };
  selection?: NodeSelection;
  defaults?: Readonly<Record<string, Literal>>;
  /** The props are a list inside the element's `name` (its index-th object): Sidebar `sections[1].items` (setField `path`). */
  within?: { name: string; index?: number };
  /** The field that takes the focus when `token` changes (a double-click on the item's text, focusContent.ts). */
  focus?: { field: string; token: number };
}) {
  const types = useApiTypes(componentSlug(component));
  const [overrides, setOverrides] = useState<Record<string, PropValue>>({});
  // The element read again (its shapes changed): what it holds now replaces the optimistic values.
  const signature = JSON.stringify(props.map((entry) => entry.shape));
  useEffect(() => setOverrides({}), [signature]);

  const groups = useMemo(() => {
    const out: Group[] = [];
    for (const { spec, shape, via } of props) {
      const label = propLabel(spec.name, component);
      if (shape.type === "object") {
        const schema = objectSchemaOf(spec.type, types, "object");
        out.push({ key: spec.name, prop: spec.name, title: label, meta: schema?.typeName || undefined, object: shape, fields: groupFields(shape, schema?.fields ?? null), via });
      } else {
        // A union of item types (Menu `MenuEntry[]`): each item takes the one it is (`type: "group"`).
        const schemas = objectSchemasOf(spec.type, types, "array");
        // Item ops count the array literal's items: only a list of plain objects written in place changes from here (a
        // const's list edits field by field; its items stay as the code writes them).
        const literal = !via && shape.items.every((item) => item.type === "object");
        shape.items.forEach((item, index) => {
          if (item.type !== "object") return;
          const list = { count: shape.items.length, last: index === shape.items.length - 1, literal };
          out.push({ key: `${spec.name}#${index}`, prop: spec.name, index, title: `${label} · ${index + 1}`, meta: itemName(item), object: item, fields: groupFields(item, schemaFor(schemas, item.fields)?.fields ?? null), list, via });
        });
      }
    }
    return out.filter((group) => (group.fields.length || group.list) && (!only || (group.prop === only.prop && group.index === only.index)));
  }, [props, types, component, only?.prop, only?.index]);

  useSlotServer();
  const running = useSlotRunning();
  if (!groups.length) return null;
  // Item ops: an admin's, in example and template content, never for a data slot (the Slots section has those).
  const structural = selection && !only && !api.disabled && dataItemBlock(selection) === null ? selection : null;
  const listOf = (group: Group): DataSlot | null => {
    if (!structural || !group.list?.literal || group.index === undefined || dataSlotOf(component, group.prop)) return null;
    const label = propLabel(group.prop, component);
    return { component, prop: group.prop, name: label, itemName: "Item", form: "array", max: Number.POSITIVE_INFINITY, newItem: () => ({ code: "{}" }) };
  };
  const busy = running !== null;

  // What a data-slot item's unset fields draw (dataSlots.ts itemDefaults: a crumb's level and chevron come from its
  // place): the one selected item's from DataItemPanel, every listed item's from the owner's values here.
  const ownerValues = new Proxy({} as Record<string, unknown>, {
    get: (_target, key) => {
      if (typeof key !== "string") return undefined;
      const value = api.valueFor(key);
      return value.state === "literal" ? value.value : value.state === "unset" ? undefined : value.live;
    },
  });
  const defaultsOf = (group: Group): Readonly<Record<string, Literal>> | undefined => {
    if (only) return defaults;
    if (group.index === undefined || !group.list) return undefined;
    return dataSlotOf(component, group.prop)?.itemDefaults?.(group.index, group.list.count, ownerValues);
  };

  /** `sub`: one key of an object the field holds (StackBarChart `values.design`), written through setField `path`. */
  const write = (group: Group, field: FieldSpec, value: Literal | null, sub?: string) => {
    if (api.disabled) return;
    // An optional boolean switched to what it draws unset is left out (`dot: false` reads as noise; a crumb's `dash`
    // is on unset, so off is written); a field reset is removed.
    const remove = value === null || (!sub && field.optional && field.editor.kind === "boolean" && value === (defaultsOf(group)?.[field.name] ?? false));
    const where = `${group.prop}${group.index !== undefined ? `[${group.index}]` : ""}.${field.name}${sub ? `.${sub}` : ""}`;
    const list = !remove && !sub && isNumberList(field) ? numberListCode(String(value)) : null;
    if (!remove && !sub && isNumberList(field) && list === null) { announceEditStatus({ kind: "error", message: `${propLabel(field.name)}: write numbers separated by commas (12, 18, 7)`, at: Date.now() }); return; }
    const edit: EditValue | null = remove ? null : list !== null ? { kind: "expression", code: list } : toEditValue(value as Literal);
    setOverrides((current) => ({ ...current, [`${group.key}.${field.name}${sub ? `.${sub}` : ""}`]: remove ? { state: "unset" } : { state: "literal", value: value as Literal, raw: "" } }));
    const into = sub ? [{ key: field.name }] : [];
    void api.apply(
      [within
        ? { op: "setField", name: within.name, ...(within.index !== undefined ? { index: within.index } : {}), path: [{ key: group.prop, ...(group.index !== undefined ? { index: group.index } : {}) }, ...into], key: sub ?? field.name, value: edit }
        : { op: "setField", name: group.prop, ...(group.index !== undefined ? { index: group.index } : {}), ...(into.length ? { path: into } : {}), key: sub ?? field.name, value: edit }],
      `${component} ${where} → ${remove ? "reset" : display(value as Literal)}`,
    ).then((written) => { if (!written) setOverrides({}); });
  };

  return (
    <div className="studio-nested studio-object">
      {groups.map((group) => (
        <div key={group.key} role="group" aria-label={group.meta ? `${group.title}: ${group.meta}` : group.title} className="studio-nested__group">
          {only ? null : (
            <div className="studio-object__header">
              <span className="studio-object__icon" aria-hidden="true"><Icon name="icon-brackets-ellipses-line" size={16} /></span>
              <span className={`studio-object__title ${typographyStyles["Body/Small/Medium"]}`}>{group.title}</span>
              {group.meta ? <span className={`studio-object__meta ${typographyStyles["Body/Small/Regular"]}`}>{group.meta}</span> : null}
              {(() => {
                const list = listOf(group);
                if (!list || group.index === undefined || !group.list) return null;
                const index = group.index;
                const named = group.meta ?? group.title;
                return (
                  <span className="studio-object__actions">
                    <IconButton appearance="flat" level="primary" size="xs" icon="icon-arrow-up-line" aria-label={`Move ${named} up`} disabled={busy || index === 0} onClick={() => { void editDataItem(structural!, list, "move", index, index - 1); }} />
                    <IconButton appearance="flat" level="primary" size="xs" icon="icon-arrow-down-line" aria-label={`Move ${named} down`} disabled={busy || group.list.last} onClick={() => { void editDataItem(structural!, list, "move", index, index + 1); }} />
                    <IconButton appearance="flat" level="primary" size="xs" icon="icon-trash-line" aria-label={`Remove ${named}`} disabled={busy} onClick={() => { void editDataItem(structural!, list, "remove", index); }} />
                  </span>
                );
              })()}
            </div>
          )}
          {group.via && (group.index === undefined || group.index === 0) ? (
            <p className={`studio-object__via ${typographyStyles["Caption/Regular"]}`}>Written in const {group.via.name} (line {group.via.line}): an edit changes every place that reads it.</p>
          ) : null}
          {group.fields.map((field) => {
            const written = group.object.fields.find((candidate) => candidate.key === field.name);
            // A nested data slot's list (Sidebar `sections[n].items`): its rows are items of their own, selected on the
            // canvas or in Slots, not one code field here.
            const nested = !within && group.index !== undefined ? dataSlotOf(component, group.prop) : null;
            if (nested?.nested === field.name) {
              const rows = written?.kind === "expression" && written.shape?.type === "array" ? written.shape.items.length : null;
              return (
                <p key={field.name} className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>
                  {rows === null ? `${propLabel(field.name)}: written in the code` : `${plural(rows, nested.itemName)} in ${nested.name}: select one on the canvas or in Slots to edit it`}
                </p>
              );
            }
            // An object of plain values (StackBarChart `values`: { design: 120, engineering: 180 }): one row per key.
            const keyed = written?.kind === "expression" && written.shape?.type === "object" && written.shape.fields.length
              && written.shape.fields.every((sub) => sub.kind === "string" || sub.kind === "number" || sub.kind === "boolean") ? written.shape.fields : null;
            if (keyed) {
              return (
                <Fragment key={field.name}>
                  {keyed.map((sub) => (
                    <PropField
                      key={`${field.name}.${sub.key}`}
                      spec={{ name: `${field.name}.${sub.key}`, type: "", description: "", defaultValue: null, editor: inferredEditor(sub) }}
                      label={`${propLabel(field.name)} · ${sub.key}`}
                      value={overrides[`${group.key}.${field.name}.${sub.key}`] ?? valueOfField(sub)}
                      disabled={api.disabled}
                      resettable={false}
                      onSet={(next) => write(group, field, next, sub.key)}
                      onReset={() => undefined}
                    />
                  ))}
                </Fragment>
              );
            }
            // A list of objects in an item (a Menu group's `items`): its own groups, written through setField `path`.
            if (!within && written?.kind === "expression" && written.shape?.type === "array" && written.shape.items.length && written.shape.items.every((item) => item.type === "object")) {
              return <ObjectProperties key={field.name} component={component} props={[{ spec: field, shape: written.shape }]} api={api} within={{ name: group.prop, index: group.index }} />;
            }
            const fieldDefaults = defaultsOf(group);
            const listText = isNumberList(field) ? numberListText(written) : null;
            const value = overrides[`${group.key}.${field.name}`] ?? (listText !== null ? { state: "literal" as const, value: listText, raw: "" } : valueOfField(written));
            const shown = listText !== null || (isNumberList(field) && !written) ? { ...field, editor: { kind: "string" as const } } : field;
            return (
              <PropField
                key={field.name}
                spec={fieldDefaults && field.name in fieldDefaults ? { ...shown, defaultValue: fieldDefaults[field.name] } : shown}
                label={propLabel(field.name)}
                value={value}
                disabled={api.disabled}
                boundHint={api.boundHint}
                resettable={field.optional}
                autoFocusToken={focus?.field === field.name ? focus.token : 0}
                onSet={(next) => write(group, field, next)}
                onReset={() => write(group, field, null)}
              />
            );
          })}
          {group.list?.last && listOf(group) && group.index !== undefined ? (
            // zen-allow-compact-button: a quiet "add" under a dense inspector list, like the slot rows' actions
            <Button appearance="flat" level="primary" size="xs" startIcon="icon-plus-line" className="studio-object__add" aria-label={`Add an item to ${propLabel(group.prop, component)} (a copy of the last one)`} disabled={busy} onClick={() => { void editDataItem(structural!, listOf(group)!, "duplicate", group.index!); }}>
              Add item
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
