import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { IconButton } from "../../../components/Button";
import { Checkbox } from "../../../components/Checkbox";
import { sectorAt, type ChartPaletteName } from "../../../components/Chart/chartCore";
import { Icon } from "../../../components/Icon";
import { InputField, SelectField } from "../../../components/Input";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { SourceElement } from "../types";
import {
  addEntry, addRow, readChartTable, removeEntry, removeRow, setCell, setEntryLabel, setRowLabel, type ChartEdit, type ChartTable,
} from "./chartDataModel";
import { arrowStep, evaluateNumber } from "./controls/numberMath";
import type { FieldApi } from "./fieldApi";
import { InspectorSection, SectionNote } from "./Section";

/*
 * A chart's data in the Inspector (user 2026-10-28: "cho phép thêm bớt sector, nhập số cho từng sector để xem chart";
 * approved 2026-10-30: every chart with data, a sector's label and number, colours from the palette): a Data section of
 * one row per sector (a label, its numbers, − to remove; + adds one after the last), and for charts whose columns are a
 * list (series, a heatmap's columns, a line's comparison) that list above it (rename, −, +). The model, the reads and
 * every write: chartDataModel.ts; each intent is one write, so the canvas redraws at once and ⌘Z takes it back.
 */

/** The chart's other props the table reads, as written (literals only). */
const OWNER_PROPS = ["label", "barLabel", "lineLabel", "orientation", "palette"] as const;

/** The chart's Data table, or null: its data is not literals in the page (the Properties rows keep showing it). */
export function useChartTable(element: SourceElement | null, api: FieldApi): ChartTable | null {
  const owner = Object.fromEntries(OWNER_PROPS.map((prop) => {
    const value = api.valueFor(prop);
    return [prop, value.state === "literal" ? value.value : undefined];
  }));
  const key = JSON.stringify(owner);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `owner`
  return useMemo(() => (element ? readChartTable(element.name, element.attributes, owner) : null), [element, key]);
}

export function ChartDataSection({ table, api }: { table: ChartTable; api: FieldApi }) {
  // What was typed shows until the element is read again with it (or the write fails).
  const [typed, setTyped] = useState<Record<string, number | boolean | string | null>>({});
  const signature = JSON.stringify([table.rows, table.list?.entries]);
  useEffect(() => setTyped({}), [signature]);
  const written = api.valueFor("palette");
  const palette: ChartPaletteName = written.state === "literal" && written.value === "secondary" ? "secondary" : "primary";
  const disabled = api.disabled;
  const run = (edit: ChartEdit | null, optimistic?: [string, number | boolean | string | null]) => {
    if (!edit || disabled) return;
    if (optimistic) setTyped((current) => ({ ...current, [optimistic[0]]: optimistic[1] }));
    void api.apply(edit.ops, edit.label).then((written) => { if (!written) setTyped({}); });
  };

  const row = table.row.toLowerCase();
  // Up to two columns side by side (a value and its target, two series, a line and its comparison): the label on the
  // panel's first field column, the numbers sharing the second. More (three series, a heatmap's columns) show one at a
  // time, picked above the rows, so every field stays on the panel's grid and no number is cut off.
  const [picked, setPicked] = useState(0);
  const many = table.columns.length > 2;
  const at = Math.min(picked, table.columns.length - 1);
  const shown = many ? [at] : table.columns.map((_, index) => index);
  const valuesStyle = { "--studio-chart-data-columns": shown.length } as CSSProperties;
  const swatch = (index: number | null) => (index === null ? undefined : <span className="studio-chart-data__colour" style={{ background: sectorAt(index, palette) }} aria-hidden="true" />);
  const notes = [...table.notes, ...(table.via ? [`Written in const ${table.via.name} (line ${table.via.line}): add or remove ${row}s there`] : [])];

  const list = table.list;
  return (
    <>
      {list ? (
        <InspectorSection
          title={list.title}
          className="studio-chart-data"
          actions={list.addable ? <IconButton icon="icon-plus-line" aria-label={`Add ${list.item.toLowerCase()}`} appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => run(addEntry(table))} /> : undefined}
        >
          {list.entries.map((entry, index) => (
            <div key={index} className="studio-chart-data__entry" data-chart-entry={index}>
              <LabelCell
                label={`${list.item} ${index + 1} name`}
                value={(typed[`entry:${index}`] as string | undefined) ?? entry.label}
                placeholder={table.kind === "line" && index === 0 ? "Line" : undefined}
                leading={swatch(entry.colour)}
                disabled={disabled || (entry.label === null && !(table.kind === "line" && index === 0))}
                onCommit={(next) => run(setEntryLabel(table, index, next), [`entry:${index}`, next])}
              />
              {entry.removable ? (
                <IconButton icon="icon-minus-line" aria-label={`Remove ${list.item.toLowerCase()} ${entry.label ?? index + 1}`} appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => run(removeEntry(table, index))} />
              ) : <span />}
            </div>
          ))}
        </InspectorSection>
      ) : null}
      <InspectorSection
        title="Data"
        className="studio-chart-data"
        actions={table.structural ? <IconButton icon="icon-plus-line" aria-label={`Add ${row}`} appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => run(addRow(table))} /> : undefined}
        note={notes.length ? <SectionNote text={notes[0]} more={notes.slice(1).join(" · ") || undefined} /> : undefined}
      >
        {many ? (
          <div className="studio-chart-data__entry">
            <SelectField
              size="sm"
              aria-label={`${list?.item ?? "Column"} to edit`}
              value={table.columns[at].key}
              leading={list?.entries[at]?.colour !== undefined ? swatch(list.entries[at].colour) : undefined}
              onValueChange={(key) => setPicked(Math.max(0, table.columns.findIndex((column) => column.key === key)))}
              options={table.columns.map((column) => ({ value: column.key, label: column.label }))}
            />
            <span />
          </div>
        ) : null}
        <div className="studio-chart-data__table" role="table" aria-label={`${table.component} data`}>
          {shown.length > 1 ? (
            <div className="studio-chart-data__row" role="row">
              <span role="columnheader" className={`studio-chart-data__head ${typographyStyles["Caption/Regular"]}`}>{table.row}</span>
              <span className="studio-chart-data__values" role="none" style={valuesStyle}>
                {shown.map((index) => {
                  const column = table.columns[index];
                  return (
                    <span key={column.key} role="columnheader" className={`studio-chart-data__head ${typographyStyles["Caption/Regular"]}`} data-kind={column.kind} title={column.label}>
                      {column.kind === "flag" ? <><Icon name="icon-hourglass-line" size="2xs" decorative /><VisuallyHidden>{column.label}</VisuallyHidden></> : column.label}
                    </span>
                  );
                })}
              </span>
              <span role="columnheader" aria-label="Remove" />
            </div>
          ) : null}
          {table.rows.map((entry, rowIndex) => {
            const name = entry.label ?? `${table.row} ${rowIndex + 1}`;
            return (
              <div key={rowIndex} className="studio-chart-data__row" role="row" data-chart-row={rowIndex}>
                <span role="cell" className="studio-chart-data__cell">
                  <LabelCell
                    label={`${table.row} ${rowIndex + 1} label`}
                    value={(typed[`label:${rowIndex}`] as string | undefined) ?? entry.label ?? entry.labelBound ?? ""}
                    leading={table.rowColours ? swatch(rowIndex) : undefined}
                    disabled={disabled || entry.label === null}
                    onCommit={(next) => run(setRowLabel(table, rowIndex, next), [`label:${rowIndex}`, next])}
                  />
                </span>
                <span className="studio-chart-data__values" role="none" style={valuesStyle}>
                  {shown.map((columnIndex) => {
                    const column = table.columns[columnIndex];
                    const cell = entry.cells[columnIndex];
                    const key = `cell:${rowIndex}:${columnIndex}`;
                    const value = key in typed ? typed[key] : cell.value;
                    return (
                      <span key={column.key} role="cell" className="studio-chart-data__cell" data-kind={column.kind}>
                        {column.kind === "flag" ? (
                          <Checkbox
                            aria-label={`${name} ${column.label}`}
                            checked={value === true}
                            disabled={disabled || cell.bound !== undefined}
                            onCheckedChange={(checked) => run(setCell(table, rowIndex, columnIndex, checked), [key, checked])}
                          />
                        ) : (
                          <NumberCell
                            label={`${name} ${column.label}`}
                            value={typeof value === "number" ? value : null}
                            bound={cell.bound}
                            optional={column.optional}
                            disabled={disabled}
                            onCommit={(next) => run(setCell(table, rowIndex, columnIndex, next), [key, next])}
                          />
                        )}
                      </span>
                    );
                  })}
                </span>
                <span role="cell">
                  {table.structural ? (
                    <IconButton icon="icon-minus-line" aria-label={`Remove ${row} ${name}`} appearance="flat" level="primary" size="xs" disabled={disabled || table.rows.length < 2} onClick={() => run(removeRow(table, rowIndex))} />
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </InspectorSection>
    </>
  );
}

/** A label: written on Enter or leaving the field; Escape puts it back. */
function LabelCell({ label, value, placeholder, leading, disabled, onCommit }: { label: string; value: string | null; placeholder?: string; leading?: ReactNode; disabled: boolean; onCommit: (next: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);
  return (
    <InputField
      size="sm"
      aria-label={label}
      leading={leading}
      value={draft ?? value ?? ""}
      placeholder={placeholder}
      disabled={disabled}
      onValueChange={setDraft}
      onBlur={() => { if (draft !== null && draft.trim() && draft.trim() !== value) onCommit(draft.trim()); setDraft(null); }}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        if (event.key === "Escape") { setDraft(null); (event.target as HTMLInputElement).blur(); }
      }}
    />
  );
}

const display = (value: number | null) => (value === null ? "" : String(Number(value.toFixed(4))));

/**
 * A number: typed (an expression such as "+10" or "*2" works, as in Figma's fields), written on Enter or leaving the
 * field; ↑ / ↓ step 1 (⇧ 10) and write once the key is let go (one undo step); Escape puts it back. A number the code
 * computes shows read-only. An optional field (a target) cleared is removed.
 */
function NumberCell({ label, value, bound, optional, disabled, onCommit }: { label: string; value: number | null; bound?: string; optional?: boolean; disabled: boolean; onCommit: (next: number | null) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  useEffect(() => { pendingRef.current = pending; }, [pending]);
  useEffect(() => { setDraft(null); setPending(null); }, [value]);
  const current = pending ?? value;
  const commit = (next: number | null) => {
    setDraft(null);
    setPending(null);
    if (disabled || next === value) return;
    if (next === null && !optional) return;
    onCommit(next);
  };
  const fromDraft = (text: string) => (text.trim() === "" ? null : evaluateNumber(text, value));
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (draft !== null) commit(fromDraft(draft));
      (event.target as HTMLInputElement).blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraft(null);
      setPending(null);
      (event.target as HTMLInputElement).blur();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const base = draft !== null ? fromDraft(draft) ?? value ?? 0 : current ?? 0;
      setDraft(null);
      setPending(base + (event.key === "ArrowUp" ? 1 : -1) * arrowStep(event.shiftKey));
    }
  };
  if (bound !== undefined) {
    return <InputField size="sm" aria-label={`${label} (written in code)`} value={bound} title={bound} disabled readOnly />;
  }
  return (
    <InputField
      size="sm"
      aria-label={label}
      inputMode="decimal"
      value={draft ?? display(current)}
      disabled={disabled}
      onValueChange={setDraft}
      onKeyDown={onKeyDown}
      onKeyUp={(event) => { if ((event.key === "ArrowUp" || event.key === "ArrowDown") && pendingRef.current !== null) commit(pendingRef.current); }}
      onBlur={() => { if (draft !== null) commit(fromDraft(draft)); }}
    />
  );
}
