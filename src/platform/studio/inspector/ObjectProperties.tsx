import { useEffect, useMemo, useState } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { dataItemBlock, dataSlotOf, editDataItem, useSlotRunning, useSlotServer, type DataSlot } from "../slots";
import type { StudioSelection } from "../types";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { AttrShape, EditValue, ObjectShape, ShapeField } from "../types";
import type { FieldApi } from "./fieldApi";
import { objectSchemaOf, useApiTypes, type FieldSpec } from "./objectSchema";
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

export type ShapedProp = { spec: PropSpec; shape: AttrShape };

type Group = { key: string; prop: string; index?: number; title: string; meta?: string; object: ObjectShape; fields: FieldSpec[]; list?: { count: number; last: boolean; literal: boolean } };
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
export function ObjectProperties({ component, props, api, only, selection }: { component: string; props: ShapedProp[]; api: FieldApi; only?: { prop: string; index?: number }; selection?: NodeSelection }) {
  const types = useApiTypes(componentSlug(component));
  const [overrides, setOverrides] = useState<Record<string, PropValue>>({});
  // The element read again (its shapes changed): what it holds now replaces the optimistic values.
  const signature = JSON.stringify(props.map((entry) => entry.shape));
  useEffect(() => setOverrides({}), [signature]);

  const groups = useMemo(() => {
    const out: Group[] = [];
    for (const { spec, shape } of props) {
      const label = propLabel(spec.name, component);
      if (shape.type === "object") {
        const schema = objectSchemaOf(spec.type, types, "object");
        out.push({ key: spec.name, prop: spec.name, title: label, meta: schema?.typeName || undefined, object: shape, fields: groupFields(shape, schema?.fields ?? null) });
      } else {
        const schema = objectSchemaOf(spec.type, types, "array");
        // Item ops count the array literal's items: only a list of plain objects changes from here.
        const literal = shape.items.every((item) => item.type === "object");
        shape.items.forEach((item, index) => {
          if (item.type !== "object") return;
          const list = { count: shape.items.length, last: index === shape.items.length - 1, literal };
          out.push({ key: `${spec.name}#${index}`, prop: spec.name, index, title: `${label} · ${index + 1}`, meta: itemName(item), object: item, fields: groupFields(item, schema?.fields ?? null), list });
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

  const write = (group: Group, field: FieldSpec, value: Literal | null) => {
    if (api.disabled) return;
    // An optional boolean switched off is left out (`dot: false` reads as noise); a field reset is removed.
    const remove = value === null || (value === false && field.optional && field.editor.kind === "boolean");
    const where = `${group.prop}${group.index !== undefined ? `[${group.index}]` : ""}.${field.name}`;
    setOverrides((current) => ({ ...current, [`${group.key}.${field.name}`]: remove ? { state: "unset" } : { state: "literal", value: value as Literal, raw: "" } }));
    void api.apply(
      [{ op: "setField", name: group.prop, ...(group.index !== undefined ? { index: group.index } : {}), key: field.name, value: remove ? null : toEditValue(value as Literal) }],
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
          {group.fields.map((field) => {
            const written = group.object.fields.find((candidate) => candidate.key === field.name);
            const value = overrides[`${group.key}.${field.name}`] ?? valueOfField(written);
            return (
              <PropField
                key={field.name}
                spec={field}
                label={propLabel(field.name)}
                value={value}
                disabled={api.disabled}
                boundHint={api.boundHint}
                resettable={field.optional}
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
