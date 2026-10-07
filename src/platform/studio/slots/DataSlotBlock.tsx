import { useId, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { plural } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { selectPart } from "../select/parts";
import type { SourceElement, StudioSelection } from "../types";
import { editDataItem } from "./actions";
import { computedCaption, itemParts, renderedItemTitle, slotGroupsAt, sourceItems } from "./dataItems";
import { groupRuns, itemGroup, itemTitle, type DataSlot } from "./dataSlots";
import { selectedHit } from "./dom";
import "./slots.css";

/*
 * A data slot in the inspector's Slots section (dataSlots.ts): TopNavigation's Top-Trailing listed like a content slot,
 * its items (the actions) as rows. A row selects the item on the canvas (its fields are edited there), moves it up or
 * down and removes it; "Add {Action} to {Slot}" writes a new item with a working handler. Items the code computes
 * (`trailing={actions}`, a condition) are read-only with where they come from. In a playground the items are the main
 * component's: listed, changed in an example.
 * Slots whose items take a `group` (TopNavigation trailing, `slot.groups`) list a group's rows joined by a bracket; a
 * row drags (Figma's Layers): onto another row's edge it moves there (joining the group it lands inside, leaving one it
 * is dragged out of), onto a row's middle the two share one pill. The link button groups a row with the next one, or
 * takes it out of its group (the keyboard way).
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

export type DataSlotBlockProps = {
  selection: NodeSelection;
  element: SourceElement;
  slot: DataSlot;
  /** Admin, writable dev server, example or template content (canStructurallyEdit). */
  editable: boolean;
  playground: boolean;
  /** The running slot edit ("Adding…"), else null. */
  running: string | null;
};

/* ── row drag (Figma's Layers): reorder, or drop onto a row to share its group ─────────────────────────────────── */

type RowDrop = { verb: "drop" | "group"; to: number };

/**
 * A press on row `from` of `list`: moving 4 px starts a drag; the row under the pointer shows where it lands
 * (`data-drop`: before / after its edge, onto its middle when `groups`), Esc cancels, the release calls `onDrop`.
 * `sameGroup(a, b)`: dropping onto a row of one's own group changes nothing.
 */
function pressRow(event: ReactPointerEvent, list: HTMLElement, from: number, groups: boolean, sameGroup: (a: number, b: number) => boolean, onDrop: (drop: RowDrop) => void) {
  if (event.button !== 0 || (event.target as Element).closest(".zen-button")) return;
  const start = { x: event.clientX, y: event.clientY };
  const source = list.querySelector(`[data-item-index="${from}"]`);
  let dragging = false;
  let drop: RowDrop | null = null;
  let marked: Element | null = null;
  const mark = (row: Element | null, where: string | null) => {
    if (marked && marked !== row) marked.removeAttribute("data-drop");
    marked = row;
    if (row && where) row.setAttribute("data-drop", where);
    else row?.removeAttribute("data-drop");
  };
  const stop = () => {
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", cancel, true);
    window.removeEventListener("keydown", onKey, true);
    mark(null, null);
    source?.removeAttribute("data-dragging");
  };
  const onMove = (move: PointerEvent) => {
    if (!dragging) {
      if (Math.hypot(move.clientX - start.x, move.clientY - start.y) < 4) return;
      dragging = true;
      source?.setAttribute("data-dragging", "");
    }
    move.preventDefault();
    const row = document.elementFromPoint(move.clientX, move.clientY)?.closest("[data-item-index]") ?? null;
    if (!row || !list.contains(row)) { drop = null; mark(null, null); return; }
    const index = Number(row.getAttribute("data-item-index"));
    if (index === from) { drop = null; mark(null, null); return; }
    const rect = row.getBoundingClientRect();
    const at = (move.clientY - rect.top) / Math.max(1, rect.height);
    const where = at < 0.3 ? "before" : at > 0.7 ? "after" : groups ? "onto" : at < 0.5 ? "before" : "after";
    if (where === "onto") {
      drop = sameGroup(from, index) ? null : { verb: "group", to: index };
      mark(row, drop ? "onto" : null);
      return;
    }
    const place = where === "before" ? index : index + 1;
    const to = place > from ? place - 1 : place;
    drop = to === from ? null : { verb: "drop", to };
    mark(row, drop ? where : null);
  };
  const onUp = () => {
    stop();
    if (!dragging) return;
    // The click that follows a drag is not a row click.
    window.addEventListener("click", (click) => { click.preventDefault(); click.stopPropagation(); }, { capture: true, once: true });
    if (drop) onDrop(drop);
  };
  const cancel = () => { stop(); drop = null; };
  const onKey = (key: KeyboardEvent) => {
    if (key.key !== "Escape" || !dragging) return;
    key.preventDefault();
    key.stopImmediatePropagation();
    cancel();
  };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", cancel, true);
  window.addEventListener("keydown", onKey, true);
}

/** An item row: select it, move it, (un)group it, remove it (InspectorItem's look, with the slot rows' trailing actions). */
function ItemRow({ index, name, meta, onSelect, onPress, move, group, link, onRemove, busy, reason }: {
  index: number;
  name: string;
  meta?: string;
  onSelect: () => void;
  onPress?: (event: ReactPointerEvent) => void;
  move?: { prev: boolean; next: boolean; onMove: (to: "prev" | "next") => void };
  /** Its place in a group of rows: the bracket that joins them. */
  group?: { name: string; place: "first" | "middle" | "last" };
  /** Group it with the next row, or take it out of its group. */
  link?: { label: string; icon: "icon-link-01-line" | "icon-link-broken-01-line"; onClick: () => void };
  onRemove?: () => void;
  busy: boolean;
  reason?: string;
}) {
  const reasonId = useId();
  return (
    <li className="studio-inspector__item-wrap studio-slots__item-wrap" data-item-index={index} data-group={group?.place} data-reason={reason ? true : undefined} onPointerDown={onPress}>
      <button type="button" className="studio-inspector__item" data-component aria-describedby={reason ? reasonId : undefined} aria-description={group ? `In group ${group.name}` : undefined} onClick={onSelect}>
        <span className="studio-inspector__item-icon" aria-hidden="true"><Icon name="icon-cube-line" size={16} /></span>
        <span className={`studio-inspector__item-name ${typographyStyles["Body/Small/Medium"]}`}>{name}</span>
        {meta ? <span className={`studio-inspector__item-meta ${typographyStyles["Body/Small/Regular"]}`}>{meta}</span> : null}
      </button>
      {move ? (
        <span className="studio-slots__moves">
          <IconButton appearance="flat" level="primary" size="xs" icon="icon-arrow-up-line" aria-label={`Move ${name} up`} disabled={busy || !move.prev} onClick={() => move.onMove("prev")} />
          <IconButton appearance="flat" level="primary" size="xs" icon="icon-arrow-down-line" aria-label={`Move ${name} down`} disabled={busy || !move.next} onClick={() => move.onMove("next")} />
        </span>
      ) : null}
      {link ? <IconButton appearance="flat" level="primary" size="xs" icon={link.icon} aria-label={link.label} disabled={busy} onClick={link.onClick} /> : null}
      {onRemove ? <IconButton appearance="flat" level="primary" size="xs" icon="icon-trash-line" aria-label={`Remove ${name}`} disabled={busy} onClick={onRemove} /> : null}
      {reason ? <span id={reasonId} className={`studio-slots__item-reason ${typographyStyles["Body/Small/Regular"]}`}>{reason}</span> : null}
    </li>
  );
}

/** "icon-bell-01-line" → "bell-01" as a row's meta. */
const iconMeta = (value: unknown) => (typeof value === "string" ? value.replace(/^icon-/, "").replace(/-(line|solid|duotone)$/, "") : undefined);

export function DataSlotBlock({ selection, element, slot, editable, playground, running }: DataSlotBlockProps) {
  const busy = running !== null;
  const listRef = useRef<HTMLUListElement>(null);
  const source = sourceItems(element, slot);
  const items = source.state === "items" ? source.items : [];
  const count = items.length;
  const unit = slot.itemName.toLowerCase();
  const writable = editable && !playground && source.state !== "computed";
  const canAdd = writable && !(slot.form === "object" && count > 0);
  const array = slot.form !== "object";
  // Which items the canvas draws now (the bar draws two; a hidden one is still listed, with why).
  const parts = itemParts(selectedHit(selection), slot);
  const caption = playground
    ? (count ? `${plural(count, unit)} · add or remove in an example` : "Empty in the component · add in an example")
    : source.state === "computed" ? "From code"
      : count ? `${plural(count, unit)}${array && count > slot.max ? ` · ${slot.max} show` : ""}` : "Empty";

  // Groups (slot.groups, for the host as drawn now): runs of rows next to each other with one written group. Off (the
  // compact TopNavigation's Flat actions): rows only reorder, and a note says why the groups written do nothing here.
  const grouping = slotGroupsAt(selectedHit(selection), slot);
  const runs = grouping ? groupRuns(items) : [];
  const ignoredGroups = Boolean(slot.groups) && !grouping && items.some((item) => itemGroup(item.fields));
  const sameGroup = (a: number, b: number) => {
    const group = itemGroup(items[a]?.fields ?? []);
    return Boolean(group) && group === itemGroup(items[b]?.fields ?? []);
  };

  const select = (index: number, name: string) => {
    const part = parts[index];
    if (part) selectPart(part, canvasApi.getWorldElement());
    else inspectorStatus.set("neutral", `${name} is not drawn right now${index >= slot.max && slot.maxNote ? `: ${slot.maxNote}` : ""}`);
  };

  return (
    <div className="studio-slots__slot" data-slot={slot.prop} data-empty={count ? undefined : true}>
      <div className="studio-slots__head">
        <span className="studio-slots__icon" aria-hidden="true"><Icon name="icon-grid-dots-blank-line" size={16} /></span>
        <span className={`studio-slots__name ${typographyStyles["Body/Small/Medium"]}`}>{slot.name}</span>
        <span className={`studio-slots__caption ${typographyStyles["Body/Small/Regular"]}`}>{caption}</span>
        {canAdd ? (
          <div className="studio-slots__add">
            {/* zen-allow-accent: the add-to-slot button matches the content slots' add button, accent so it stands out (user, 2026-10-04) */}
            <IconButton
              appearance="flat"
              level="accent"
              size="xs"
              icon="icon-plus-line"
              aria-label={`Add ${slot.itemName} to ${slot.name}`}
              disabled={busy}
              onClick={() => { void editDataItem(selection, slot, "add"); }}
            />
          </div>
        ) : null}
      </div>
      {source.state === "computed" ? <p className={`studio-slots__note ${typographyStyles["Body/Small/Regular"]}`}>{computedCaption(slot, source.code)}</p> : null}
      {ignoredGroups ? <p className={`studio-slots__note ${typographyStyles["Body/Small/Regular"]}`}>{slot.groupsOffNote}: their groups are kept for the other types.</p> : null}
      {count ? (
        <ul ref={listRef} aria-label={`${slot.name} items`} className="studio-inspector__items">
          {items.map((item, index) => {
            // A label the source computes (`seen ? "Notifications" : …`): the one the canvas shows.
            const written = itemTitle(slot, item.fields, index);
            const part = parts[index];
            const name = written === `${slot.itemName} ${index + 1}` && part ? renderedItemTitle({ slot, index, part }) : written;
            const icon = item.fields.find((field) => field.key === "icon");
            const hidden = array && index >= slot.max && !parts[index];
            const run = runs.find((candidate) => index >= candidate.first && index <= candidate.last);
            const grouped = run && run.group !== null && run.last > run.first ? run : null;
            const next = index + 1 < count ? itemTitle(slot, items[index + 1].fields, index + 1) : null;
            const own = itemGroup(item.fields);
            return (
              <ItemRow
                key={`${index}:${name}`}
                index={index}
                name={name}
                group={grouped ? { name: grouped.group!, place: index === grouped.first ? "first" : index === grouped.last ? "last" : "middle" } : undefined}
                onPress={writable && array && count > 1 && !busy ? (event) => { if (listRef.current) pressRow(event, listRef.current, index, grouping, sameGroup, (drop) => { void editDataItem(selection, slot, drop.verb, index, drop.to); }); } : undefined}
                link={writable && grouping && own !== undefined
                  ? grouped || own ? { label: `Take ${name} out of its group`, icon: "icon-link-broken-01-line", onClick: () => { void editDataItem(selection, slot, "ungroup", index); } }
                    : next ? { label: `Group ${name} with ${next}`, icon: "icon-link-01-line", onClick: () => { void editDataItem(selection, slot, "group", index, index + 1); } } : undefined
                  : undefined}
                meta={hidden ? "Not shown" : iconMeta(icon?.value)}
                reason={hidden ? slot.maxNote : undefined}
                onSelect={() => select(index, name)}
                move={writable && array && count > 1 ? { prev: index > 0, next: index < count - 1, onMove: (to) => { void editDataItem(selection, slot, "move", index, to === "prev" ? index - 1 : index + 1); } } : undefined}
                onRemove={writable ? () => { void editDataItem(selection, slot, "remove", index); } : undefined}
                busy={busy}
              />
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
