import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi, useStudioServer } from "../api";
import { currentFiber, onSourceUpdate } from "../select/picker";
import { selectPart, withoutPart } from "../select/parts";
import { canEdit, useStudio } from "../store";
import type { SourceElement, StudioSelection } from "../types";
import { computedCaption, dataItemBlock, duplicateShortcut, editDataItem, groupRuns, itemGroup, itemTitle, removeShortcut, renderedItemTitle, slotGroupsAt, sourceItems, useSlotRunning, useSlotServer, type DataItemHit } from "../slots";
import { editDataGroup } from "../slots/actions";
import type { DataGroupHit } from "../slots/dataItems";
import { sectionEntries, titleOf } from "../slots/sectionList";
import { plural } from "../../../components/Text";
import { PropField } from "./PropField";
import { canvasApi } from "../canvas/viewport";
import type { FieldApi } from "./fieldApi";
import { ObjectProperties } from "./ObjectProperties";
import { objectSchemaOf, useApiTypes } from "./objectSchema";
import { componentSlug, propSpecs } from "./propSchema";
import { InspectorSection } from "./Section";

/*
 * A data-slot item selected on the canvas (TopNavigation's Top-Trailing action, dataSlots.ts): Figma's nested instance in
 * a slot. Its fields are edited as the owner's object (op setField on the item's index), and it moves, duplicates and
 * goes like a layer (item ops; ⌘D and ⌫ on the canvas); a slot whose items take a `group` (TopNavigation trailing) also
 * groups it with the item before or after it, or takes it out of its group. PartPanel mounts it when the selected part is the item itself,
 * and `DataItemBanner` when the part sits inside one (the icon in the action).
 */

type PartSelection = Extract<StudioSelection, { kind: "node" }>;
type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/** The owner's source and a FieldApi on it (one write per apply; the hash follows each answer). */
function useOwnerSource(host: NodeSelection): { element: SourceElement | null; api: FieldApi } {
  const parsed = parseSrc(host.src);
  const server = useStudioServer();
  const role = useStudio((state) => state.role);
  const undoCount = useStudio((state) => state.undo.length);
  const redoCount = useStudio((state) => state.redo.length);
  const editable = canEdit() && role === "admin" && server.writable;
  const [element, setElement] = useState<SourceElement | null>(null);
  const [version, setVersion] = useState(0);
  const hashRef = useRef<string | null>(null);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    if (!parsed) { setElement(null); return undefined; }
    let alive = true;
    void studioApi.element(parsed.file, parsed.loc).then((next) => {
      if (!alive) return;
      setElement(next);
      hashRef.current = next?.hash ?? null;
    });
    return () => { alive = false; };
  }, [parsed?.file, parsed?.loc, version, undoCount, redoCount]);
  const api: FieldApi = useMemo(() => {
    const apply: FieldApi["apply"] = async (ops, label) => {
      if (!element || !editable) return false;
      const response = await applyEdit({ file: element.file, loc: element.loc, name: element.name, ops, hash: hashRef.current ?? element.hash }, label);
      if (response.ok) hashRef.current = response.hash;
      setVersion((value) => value + 1);
      return response.ok;
    };
    return {
      // Only ObjectProperties uses this api: it reads the shapes, writes with apply.
      valueFor: () => ({ state: "unset" }),
      setProp: () => undefined,
      setProps: () => undefined,
      removeProp: () => undefined,
      apply,
      disabled: !editable || !element,
      boundHint: host.panelId ? "Use Playground properties" : undefined,
    };
  }, [element, editable, host.panelId]);
  return { element, api };
}

/** The item's own sections: what it is, its actions (move, duplicate, remove) and its fields (`children`: the rows after them). */
export function DataItemSections({ selection, item, children }: { selection: PartSelection; item: DataItemHit; children?: ReactNode }) {
  const host = withoutPart(selection) as NodeSelection;
  const { element, api } = useOwnerSource(host);
  useSlotServer();
  const running = useSlotRunning();
  const { slot, index } = item;
  const source = element ? sourceItems(element, slot) : null;
  const items = source?.state === "items" ? source.items : [];
  const shape = items[index];
  // A label the source computes (`seen ? "Notifications" : …`): the one the canvas shows.
  const written = shape ? itemTitle(slot, shape.fields, index) : null;
  const name = written && written !== `${slot.itemName} ${index + 1}` ? written : renderedItemTitle(item);
  const block = dataItemBlock(selection);
  const computed = source?.state === "computed" ? computedCaption(slot, source.code, source.via) : null;
  const off = api.disabled ? null : block ?? computed;
  const can = !api.disabled && !off && Boolean(shape) && running === null;
  const array = slot.form !== "object";
  const spec = propSpecs(host.name).find((candidate) => candidate.name === slot.prop);
  const attr = element?.attributes.filter((candidate) => candidate.kind === "expression" && candidate.name === slot.prop).at(-1);
  // A nested slot (Sidebar `sections[n].items`): the item's group list, edited through its own field spec (SidebarItem[]).
  const types = useApiTypes(slot.nested ? componentSlug(host.name) : null);
  const place = source?.state === "items" ? source.at?.[index] : undefined;
  const groupShape = slot.nested && place && attr?.shape?.type === "array" ? attr.shape.items[place.group] : undefined;
  const listField = groupShape?.type === "object" ? groupShape.fields.find((field) => field.key === slot.nested) : undefined;
  const listShape = listField?.kind === "expression" ? listField.shape : undefined;
  const listSpec = slot.nested && spec ? objectSchemaOf(spec.type, types, "array")?.fields.find((field) => field.name === slot.nested) : undefined;
  const act = (verb: "remove" | "duplicate" | "move" | "group" | "ungroup", to = 0) => { void editDataItem(selection, slot, verb, index, to); };
  const count = items.length;
  // Groups (slot.groups, for the owner as drawn now): the run it is in, and its neighbours' names for the buttons. Off (the
  // compact TopNavigation's Flat actions): no group buttons, and a group it carries is said to do nothing here.
  const grouping = slotGroupsAt(item.part.owner, slot);
  const own = grouping && shape ? itemGroup(shape.fields) : undefined;
  const run = grouping ? groupRuns(items).find((candidate) => index >= candidate.first && index <= candidate.last) : undefined;
  const ignoredGroup = slot.groups && !grouping && shape ? itemGroup(shape.fields) : null;
  const inGroup = Boolean(run && run.group !== null && run.last > run.first);
  const neighbour = (at: number) => (items[at] ? itemTitle(slot, items[at].fields, at) : null);
  // What its unset fields draw (a crumb's level and chevron come from its place): shown in the default tone.
  const ownerProps = item.part.owner.fiber ? currentFiber(item.part.owner.fiber).memoizedProps ?? {} : {};
  const defaults = slot.itemDefaults?.(index, count, ownerProps);

  return (
    <>
      <InspectorSection title={slot.itemName} note={off ?? undefined}>
        <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>
          {array ? `${name} · ${index + 1} of ${count || "?"} in ${slot.name}` : `${name} · ${slot.name}`}
          {array && count > slot.max ? ` · ${slot.max} show` : ""}
          {inGroup && run ? ` · group ${run.group} (${run.last - run.first + 1})` : ""}
        </p>
        {ignoredGroup ? <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>Group {ignoredGroup} draws no pill here: {slot.groupsOffNote}.</p> : null}
        {api.disabled ? null : (
          <div className="studio-item__actions" role="group" aria-label={`${name} actions`}>
            {array ? (
              <>
                <IconButton appearance="flat" level="primary" size="xs" icon="icon-arrow-up-line" aria-label={`Move ${name} up`} disabled={!can || index === 0} onClick={() => act("move", index - 1)} />
                <IconButton appearance="flat" level="primary" size="xs" icon="icon-arrow-down-line" aria-label={`Move ${name} down`} disabled={!can || index >= count - 1} onClick={() => act("move", index + 1)} />
                <IconButton appearance="flat" level="primary" size="xs" icon="icon-duplicate-line" aria-label={`Duplicate ${name} (${duplicateShortcut})`} disabled={!can} onClick={() => act("duplicate")} />
              </>
            ) : null}
            {/* Groups: one pill on the canvas (Figma's Nav-Action with a trailing icon); a group the code computes stays as written. */}
            {array && grouping && own !== undefined ? (
              own || inGroup ? (
                <IconButton appearance="flat" level="primary" size="xs" icon="icon-link-broken-01-line" aria-label={`Take ${name} out of its group`} disabled={!can} onClick={() => act("ungroup")} />
              ) : (
                <>
                  <IconButton appearance="flat" level="primary" size="xs" icon="icon-link-01-line" aria-label={neighbour(index - 1) ? `Group ${name} with ${neighbour(index - 1)}` : `Group ${name} with the action before it`} disabled={!can || index === 0} onClick={() => act("group", index - 1)} />
                  <IconButton appearance="flat" level="primary" size="xs" icon="icon-link-01-line" aria-label={neighbour(index + 1) ? `Group ${name} with ${neighbour(index + 1)}` : `Group ${name} with the action after it`} disabled={!can || index >= count - 1} onClick={() => act("group", index + 1)} />
                </>
              )
            ) : null}
            <IconButton appearance="flat" level="primary" size="xs" icon="icon-trash-line" aria-label={`Remove ${name} (${removeShortcut})`} disabled={!can} onClick={() => act("remove")} />
          </div>
        )}
      </InspectorSection>
      <InspectorSection title="Properties" note={computed ?? (element && !shape ? "Not found in the source — select it again" : undefined)}>
        {slot.nested
          ? (listSpec && listShape && place ? <ObjectProperties component={host.name} props={[{ spec: listSpec, shape: listShape }]} api={api} only={{ prop: slot.nested, index: place.index }} within={{ name: slot.prop, index: place.group }} defaults={defaults} /> : null)
          : spec && attr?.shape && shape ? <ObjectProperties component={host.name} props={[{ spec, shape: attr.shape }]} api={api} only={{ prop: slot.prop, index: attr.shape.type === "array" ? index : undefined }} defaults={defaults} /> : null}
        {/* The props its owner passes on to every item (PartPanel's PartProperties: a crumb's Emphasis). */}
        {children}
      </InspectorSection>
    </>
  );
}

/**
 * A nested slot's group as drawn (a Sidebar section, its Section-Title or its rows' container), selected like Figma's
 * frame in the slot (user, 2026-10-10: "Tất cả các element trong slot phải xoá và thêm được hết", "section title đang
 * không xoá được"): its title edited (or written, for the untitled top group), a row added at its end, and removed:
 * the section with its rows, the title alone (its rows join the section above) or the rows.
 */
export function DataGroupSections({ selection, hit }: { selection: PartSelection; hit: DataGroupHit }) {
  const host = withoutPart(selection) as NodeSelection;
  const { element, api } = useOwnerSource(host);
  useSlotServer();
  const running = useSlotRunning();
  const { slot, group, role } = hit;
  const entries = element ? sectionEntries(element, slot) : null;
  const title = entries?.find((entry) => entry.kind === "title" && entry.group === group);
  const label = title?.fields.find((field) => field.key === "label");
  const name = title?.kind === "title" ? titleOf(title) : `Section ${group + 1}`;
  const rows = entries?.filter((entry) => entry.kind === "item" && entry.group === group).length ?? 0;
  const can = !api.disabled && entries !== null && running === null;
  const removeVerb = role === "group" ? "remove" : role === "title" ? "removeTitle" : "clearRows";
  const removeLabel = role === "group" ? `Remove the section ${name}` : role === "title" ? `Remove the title ${name}` : `Remove the rows of ${name}`;
  return (
    <InspectorSection title={role === "title" ? "Section-Title" : role === "list" ? "Section rows" : "Section"} note={element && !entries ? `The code builds ${slot.prop}: edit it there` : undefined}>
      <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{`${name} · ${plural(rows, slot.itemName)} in ${slot.name}`}</p>
      {role !== "list" ? (
        <PropField
          spec={{ name: "label", type: "string", description: "", defaultValue: null, editor: { kind: "string" } }}
          label="Label"
          value={label?.kind === "string" ? { state: "literal", value: label.value, raw: "" } : { state: "unset" }}
          disabled={!can}
          onSet={(value) => { void api.apply([{ op: "setField", name: slot.prop, index: group, key: "label", value: { kind: "string", value: String(value) } }], `${host.name} ${slot.prop}[${group}].label → "${String(value)}"`); }}
          onReset={() => { void editDataGroup(selection, slot, group, "removeTitle"); }}
        />
      ) : null}
      <div className="studio-item__actions" role="group" aria-label={`${name} actions`}>
        {/* zen-allow-accent: the add-to-slot button matches the Slots section's add buttons (user, 2026-10-04) */}
        <IconButton appearance="flat" level="accent" size="xs" icon="icon-plus-line" aria-label={`Add ${slot.itemName} to ${name}`} disabled={!can} onClick={() => { void editDataGroup(selection, slot, group, "addRow"); }} />
        <IconButton appearance="flat" level="primary" size="xs" icon="icon-trash-line" aria-label={removeLabel} disabled={!can || (role === "title" && !title) || (role === "list" && !rows)} onClick={() => { void editDataGroup(selection, slot, group, removeVerb); }} />
      </div>
    </InspectorSection>
  );
}

/** A part inside a data-slot item (the icon of an action): which item it belongs to, and a way to select it. */
export function DataItemBanner({ item }: { item: DataItemHit }) {
  const label = renderedItemTitle(item);
  return (
    <div className="studio-item__banner">
      <p className={`studio-inspector__note studio-part__edit ${typographyStyles["Body/Small/Regular"]}`}>
        Inside {item.slot.itemName} <span className={typographyStyles["Caption/Bold"]}>{label}</span> of {item.slot.name}
      </p>
      {/* zen-allow-compact-button: a quiet link under the part name in a dense tool panel, like "Select {owner}" */}
      <Button appearance="flat" level="primary" size="xs" startIcon="icon-corner-left-up-line" onClick={() => selectPart(item.part, canvasApi.getWorldElement())}>
        Select {label}
      </Button>
    </div>
  );
}
