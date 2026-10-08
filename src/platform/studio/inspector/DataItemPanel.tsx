import { useEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "../../../components/Button";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi, useStudioServer } from "../api";
import { onSourceUpdate } from "../select/picker";
import { selectPart, withoutPart } from "../select/parts";
import { canEdit, useStudio } from "../store";
import type { SourceElement, StudioSelection } from "../types";
import { computedCaption, dataItemBlock, duplicateShortcut, editDataItem, groupRuns, itemGroup, itemTitle, removeShortcut, renderedItemTitle, slotGroupsAt, sourceItems, useSlotRunning, useSlotServer, type DataItemHit } from "../slots";
import { canvasApi } from "../canvas/viewport";
import type { FieldApi } from "./fieldApi";
import { ObjectProperties } from "./ObjectProperties";
import { propSpecs } from "./propSchema";
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

/** The item's own sections: what it is, its actions (move, duplicate, remove) and its fields. */
export function DataItemSections({ selection, item }: { selection: PartSelection; item: DataItemHit }) {
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
        {spec && attr?.shape && shape ? <ObjectProperties component={host.name} props={[{ spec, shape: attr.shape }]} api={api} only={{ prop: slot.prop, index: attr.shape.type === "array" ? index : undefined }} /> : null}
      </InspectorSection>
    </>
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
