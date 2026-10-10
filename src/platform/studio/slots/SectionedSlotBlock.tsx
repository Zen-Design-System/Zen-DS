import { useState } from "react";
import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu } from "../../../components/Menu";
import { plural } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { RenameField } from "../builder/RenameField";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { selectPart } from "../select/parts";
import type { SourceElement, StudioSelection } from "../types";
import { rewriteDataSlot } from "./actions";
import { ItemRow, iconMeta } from "./DataSlotBlock";
import { itemParts, renderedItemTitle } from "./dataItems";
import { itemTitle, type DataSlot } from "./dataSlots";
import { selectedHit } from "./dom";
import { freshRow, rowFields, sectionEntries, sectionsCode, titleOf, type SectionEntry } from "./sectionList";
import "./slots.css";

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/*
 * A nested data slot shown as Figma's slot (Sidebar Body-Content; user, 2026-10-10: "Figma không phân biệt content section
 * hay content không … tôi không thể xoá hẳn content hoặc content section … hành vi thiết kế phải tự do như Figma"): one
 * list of Section-Title and Menu-Item rows. Every row moves anywhere, goes (a title's rows join the group above), and the
 * list adds a Menu-Item or a Section title, or empties at once. Each change writes the list back whole (sectionList.ts,
 * op setItems): one undo step. A row's own fields are edited when it is selected (DataItemPanel).
 */
export function SectionedSlotBlock({ selection, element, slot, editable, playground, running }: {
  selection: NodeSelection;
  element: SourceElement;
  slot: DataSlot;
  editable: boolean;
  playground: boolean;
  running: string | null;
}) {
  const busy = running !== null;
  const [renaming, setRenaming] = useState<number | null>(null);
  const entries = sectionEntries(element, slot);
  const list = entries ?? [];
  const writable = editable && !playground && entries !== null;
  const parts = itemParts(selectedHit(selection), slot);
  const rows = list.filter((entry) => entry.kind === "item").length;
  const titles = list.filter((entry) => entry.kind === "title").length;
  const dividers = list.length - rows - titles;
  const unit = slot.itemName.toLowerCase();
  const caption = entries === null ? "From code"
    : list.length ? [rows ? plural(rows, unit) : "", titles ? plural(titles, "section title") : "", dividers ? plural(dividers, "separator") : ""].filter(Boolean).join(" · ") : "Empty";
  /** The row's place among the slot's items (what the canvas and the Inspector count). */
  const placeIn = (from: readonly SectionEntry[], at: number) => from.slice(0, at).filter((entry) => entry.kind === "item").length;
  const nameAt = (at: number): string => {
    const entry = list[at];
    if (!entry) return slot.itemName;
    if (entry.kind === "title") return titleOf(entry);
    if (entry.kind === "separator") return "Separator";
    const place = placeIn(list, at);
    const written = itemTitle(slot, entry.fields, place);
    const part = parts[place];
    return written === `${slot.itemName} ${place + 1}` && part ? renderedItemTitle({ slot, index: place, part }) : written;
  };
  const write = (next: SectionEntry[], label: string, select?: number) => { void rewriteDataSlot(selection, slot, sectionsCode(next, slot), label, select); };
  const ids = new Set(list.flatMap((entry) => entry.fields.filter((field) => field.key === "id" && field.kind === "string").map((field) => String(field.value))));

  const move = (at: number, to: number) => {
    const next = [...list];
    const [entry] = next.splice(at, 1);
    next.splice(to, 0, entry);
    write(next, `Move ${nameAt(at)} in ${slot.name}`, entry.kind === "item" ? placeIn(next, to) : undefined);
  };
  const remove = (at: number) => write(list.filter((_, index) => index !== at), `Remove ${nameAt(at)} from ${slot.name}`);
  /** A new row at the end of the list, or (`title`: a title row's place) at the end of that section (user, 2026-10-10:
   *  "cho phép user add chúng vào từng stack riêng"). */
  const addRow = (title?: number) => {
    const fields = freshRow(rowFields(slot.newItem(rows).code), ids);
    let at = list.length;
    if (title !== undefined) {
      at = title + 1;
      while (at < list.length && list[at].kind !== "title") at += 1;
    }
    const next: SectionEntry[] = [...list.slice(0, at), { kind: "item", group: -1, index: -1, fields }, ...list.slice(at)];
    const where = title !== undefined && list[title]?.kind === "title" ? titleOf(list[title] as Extract<SectionEntry, { kind: "title" }>) : slot.name;
    write(next, `Add ${slot.itemName} to ${where}`, placeIn(next, at));
  };
  const addTitle = () => {
    const fields: SectionEntry["fields"] = slot.grouped
      ? [{ key: slot.grouped.typeKey, kind: "string", value: slot.grouped.group }, { key: "label", kind: "string", value: "Section" }]
      : [{ key: "label", kind: "string", value: "Section" }];
    write([...list, { kind: "title", group: -1, fields }], `Add a section title to ${slot.name}`);
    setRenaming(list.length);
  };
  /** A divider (Menu `{ type: "separator" }`): at the end, or after the selected row's place. */
  const addSeparator = () => {
    if (!slot.grouped) return;
    write([...list, { kind: "separator", fields: [{ key: slot.grouped.typeKey, kind: "string", value: slot.grouped.separator }] }], `Add a separator to ${slot.name}`);
  };
  const rename = (at: number, label: string) => {
    const entry = list[at];
    if (entry?.kind !== "title") return Promise.resolve();
    const fields = entry.fields.some((field) => field.key === "label")
      ? entry.fields.map((field) => (field.key === "label" ? { key: "label", kind: "string" as const, value: label } : field))
      : [{ key: "label", kind: "string" as const, value: label }, ...entry.fields];
    write(list.map((candidate, index) => (index === at ? { ...entry, fields } : candidate)), `Rename section ${titleOf(entry)} → ${label}`);
    return Promise.resolve();
  };
  const select = (at: number) => {
    const place = placeIn(list, at);
    const part = parts[place];
    if (part) selectPart(part, canvasApi.getWorldElement());
    else inspectorStatus.set("neutral", `${nameAt(at)} is not drawn right now`);
  };

  return (
    <div className="studio-slots__slot" data-slot={slot.prop} data-empty={list.length ? undefined : true}>
      <div className="studio-slots__head">
        <span className="studio-slots__icon" aria-hidden="true"><Icon name="icon-grid-dots-blank-line" size={16} /></span>
        <span className={`studio-slots__name ${typographyStyles["Body/Small/Medium"]}`}>{slot.name}</span>
        <span className={`studio-slots__caption ${typographyStyles["Body/Small/Regular"]}`}>{caption}</span>
        {writable ? (
          <div className="studio-slots__add">
            <Menu
              align="end"
              aria-label={`Add to ${slot.name}`}
              items={[
                { id: "row", label: slot.itemName, icon: "icon-cube-line", disabled: busy, onSelect: () => addRow() },
                { id: "title", label: "Section title", icon: "icon-heading-01-line", disabled: busy, onSelect: addTitle },
                ...(slot.grouped ? [{ id: "separator", label: "Separator", icon: "icon-minus-line" as const, disabled: busy, onSelect: addSeparator }] : []),
              ]}
              // zen-allow-accent: the add-to-slot button matches the content slots' add button, accent so it stands out (user, 2026-10-04)
              trigger={<IconButton appearance="flat" level="accent" size="xs" icon="icon-plus-line" aria-label={`Add to ${slot.name}`} disabled={busy} />}
            />
            {list.length ? (
              <Menu
                align="end"
                aria-label={`${slot.name} options`}
                items={[{ id: "clear", label: "Remove all", icon: "icon-trash-line", danger: true, disabled: busy, onSelect: () => write([], `Remove everything from ${slot.name}`) }]}
                trigger={<IconButton appearance="flat" level="primary" size="xs" icon="icon-dots-horizontal-line" aria-label={`${slot.name} options`} disabled={busy} />}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {entries === null ? <p className={`studio-slots__note ${typographyStyles["Body/Small/Regular"]}`}>The code builds {slot.prop}: edit it there.</p> : null}
      {list.length ? (
        <ul aria-label={`${slot.name} items`} className="studio-inspector__items">
          {list.map((entry, at) => {
            const moveRow = writable && list.length > 1 ? { prev: at > 0, next: at < list.length - 1, onMove: (to: "prev" | "next") => move(at, to === "prev" ? at - 1 : at + 1) } : undefined;
            if (entry.kind === "title") {
              return renaming === at ? (
                <li key={`t${at}`} className="studio-inspector__item-wrap studio-slots__item-wrap studio-slots__title-row">
                  <span className="studio-inspector__item" data-renaming="true">
                    <span className="studio-inspector__item-icon" aria-hidden="true"><Icon name="icon-heading-01-line" size={16} /></span>
                    <RenameField value={titleOf(entry) === "Untitled section" ? "" : titleOf(entry)} label="Section title" onCommit={(label) => rename(at, label)} onDone={() => setRenaming(null)} />
                  </span>
                </li>
              ) : (
                <ItemRow
                  key={`t${at}:${titleOf(entry)}`}
                  index={at}
                  name={titleOf(entry)}
                  meta="Section title"
                  onSelect={() => { if (writable) setRenaming(at); }}
                  add={writable ? { label: `Add ${slot.itemName} to ${titleOf(entry)}`, onClick: () => addRow(at) } : undefined}
                  move={moveRow}
                  onRemove={writable ? () => remove(at) : undefined}
                  busy={busy}
                />
              );
            }
            if (entry.kind === "separator") {
              return <ItemRow key={`s${at}`} index={at} name="Separator" meta="Divider" onSelect={() => undefined} move={moveRow} onRemove={writable ? () => remove(at) : undefined} busy={busy} />;
            }
            const icon = entry.fields.find((field) => field.key === "icon");
            return (
              <ItemRow
                key={`i${at}:${nameAt(at)}`}
                index={placeIn(list, at)}
                name={nameAt(at)}
                meta={iconMeta(icon?.value)}
                onSelect={() => select(at)}
                move={moveRow}
                onRemove={writable ? () => remove(at) : undefined}
                busy={busy}
              />
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
