import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "../../../components/Button";
import { tableEditorTypeFor } from "../../../components/Table";
import { pictureCode } from "../builder/library/media";
import { UPLOAD_ONLY_LOCAL } from "../edit/assets/picture";
import { Icon } from "../../../components/Icon";
import { Heading } from "../../../components/Text";
import { ToggleButton } from "../../../components/Toggle";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi, useStudioServer } from "../api";
import { PartPanel } from "../inspector/PartPanel";
import { EnumControl, IconControl, NumberControl, TextControl } from "../inspector/PropField";
import { InspectorRow, InspectorSection } from "../inspector/Section";
import { InspectorFileContext } from "../inspector/controls/hostContext";
import { PhotoControl } from "../inspector/controls/PhotoControl";
import { inspectorStatus } from "../inspector/status";
import { currentFiber, fiberOf, hostsOf, onSourceUpdate, shortSrc, srcOf, type Fiber } from "../select/picker";
import { selectedPartStore, withoutPart, type PartHit } from "../select/parts";
import { canEdit, studioStore, useStudio } from "../store";
import type { EditOp, EditValue, ObjectShape, SourceAttr, SourceElement, StudioSelection } from "../types";
import { bodyRows, fieldText, rowFieldsOf, tableCellOf, tableData, tableFiberOf, TABLE_PARTS, type TableCellHit, type TableColumnInfo } from "./tableCells";

/*
 * The Inspector of a Table's Data-Row and Cell (user, 2026-10-10: "phải chọn được loại dữ liệu của cell", "giống Figma
 * 100%"). A Cell is Figma's Table/Cell/Default: its Content (the primitive cell it holds: Text-Cell, Avatar-Cell,
 * Badge-Cell…), Align and Open-Button, then the Content's own properties (Bold, Subtext) and the row's value it shows.
 * A column draws one kind of data, so Content, Align, Bold and Subtext are written on the column (every row of it
 * changes): a column without `cell` takes them as fields (`content`, `align`, `bold`, `captionField`, `mediaField`,
 * op setField on `columns`); a column whose `cell` writes the content gets that element swapped (op replaceElement) or
 * its props set. The value is the row's own data (op setDataField, the row found by its key: data-source.mjs). A
 * Data-Row lists its row's fields. Any other part of a Table goes to PartPanel.
 *
 * Figma's State (user, 2026-10-10: "Datarow của table thiếu trạng thái select khi có checkbox, chưa cho phép chuyển cột
 * nào/nguyên dòng thành editable"): a Data-Row's State Default · Selected is the Table's selection as written (the
 * useState list behind `selectedIds`, else `defaultSelectedIds`; Selected also turns the Checkbox column on), its
 * Editable is the Table's `editable` (every value cell of every row in State=Edit); a Cell's State Default · Edit ·
 * Selected writes `edit: "<type>"` on its column (one column of every row, as the code works) or selects its row.
 */

type PartSelection = Extract<StudioSelection, { kind: "node" }>;

/** Figma Table/Cell/Default › Content: the primitive cells (Table.tsx TableCellContent), by Figma's names. */
const CONTENTS = ["text", "avatar", "photo", "icon", "dock-icon", "badge", "tag", "trend", "progress", "checkbox", "toggle"] as const;
type Content = (typeof CONTENTS)[number];
const CONTENT_LABELS: Record<string, string> = {
  text: "Text", avatar: "Avatar", photo: "Photo", icon: "Icon", "dock-icon": "Dock Icon", badge: "Badge", tag: "Tag", trend: "Trend",
  progress: "Progress", checkbox: "Checkbox", toggle: "Toggle", actions: "Actions", custom: "Custom",
};
/** Figma's component for each Content (the section title of its properties). */
const CONTENT_COMPONENTS: Record<string, string> = {
  text: "Text-Cell", avatar: "Avatar-Cell", photo: "Photo-Cell", icon: "Basic-Icon-Cell", "dock-icon": "Dock-Icon-Cell", badge: "Badge-Cell", tag: "Tag-Cell",
  trend: "Trend-Cell", progress: "Progress-Cell", checkbox: "Control-Cell", toggle: "Control-Cell", actions: "Actions-Cell", custom: "Content",
};
/** Contents with Figma's Bold and Subtext (Text-Cell: Caption). */
const LABELLED = new Set(["text", "avatar", "photo", "icon", "dock-icon"]);
const MEDIA = new Set(["avatar", "photo", "icon", "dock-icon"]);

/* ───────────── Source of an element, read again after edits ───────────── */

function useElement(src: string | null): SourceElement | null {
  const [element, setElement] = useState<SourceElement | null>(null);
  const [version, setVersion] = useState(0);
  const undo = useStudio((state) => state.undo.length);
  const redo = useStudio((state) => state.redo.length);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    const at = src ? parseSrc(src) : null;
    if (!at) { setElement(null); return undefined; }
    let alive = true;
    void studioApi.element(at.file, at.loc).then((next) => { if (alive) setElement(next); });
    return () => { alive = false; };
  }, [src, version, undo, redo]);
  return element;
}

function useEditable(): boolean {
  const server = useStudioServer();
  const role = useStudio((state) => state.role);
  return canEdit() && role === "admin" && server.writable;
}

/** One edit on an element, its answer reported in the status line when refused. */
async function edit(element: SourceElement | null, ops: EditOp[], label: string): Promise<boolean> {
  if (!element) return false;
  const response = await applyEdit({ file: element.file, loc: element.loc, name: element.name, ops, hash: element.hash }, label);
  if (!response.ok) inspectorStatus.set("negative", ("error" in response && response.error) || "Not saved");
  return response.ok;
}

/* ───────────── The column as written ───────────── */

const attr = (element: SourceElement | null, name: string): SourceAttr | undefined => element?.attributes.filter((candidate) => candidate.name === name).at(-1);

/**
 * The column's object literal in the Table's `columns` (written in place or in a same-file const): its index there and
 * its fields, found by the column's id. Null with why when the columns are not written as a list the Studio edits.
 */
function columnShape(table: SourceElement | null, id: string): { index: number; shape: ObjectShape } | { reason: string } | null {
  if (!table) return null;
  const columns = attr(table, "columns");
  const shape = columns?.shape;
  if (shape?.type !== "array") return { reason: columns ? `The columns come from {${(columns.value ?? "").slice(0, 40)}}; edit them in the code` : "The Table has no columns" };
  const index = shape.items.findIndex((item) => item.type === "object" && item.fields.some((field) => field.key === "id" && field.kind === "string" && field.value === id));
  const item = shape.items[index];
  return item?.type === "object" ? { index, shape: item } : { reason: `The column "${id}" is not written in the list; edit it in the code` };
}

const fieldOf = (shape: ObjectShape, key: string) => [...shape.fields].reverse().find((field) => field.key === key);

/* ───────────── A column's `cell` content (a column whose `cell` writes it) ───────────── */

/** The Content a written element is (TableText → text, TableMedia by its media, TableBadges → badge…). */
function contentOfWritten(element: SourceElement | null): string {
  switch (element?.name) {
    case "TableText": return "text";
    case "TableMedia": {
      const media = attr(element, "media")?.raw ?? "";
      if (/<(DockIcon)\b/.test(media)) return "dock-icon";
      if (/<(Icon|FileIcon)\b/.test(media)) return "icon";
      if (/shape="square"/.test(media)) return "photo";
      return "avatar";
    }
    case "TableBadges": case "Badge": return "badge";
    case "TableTags": case "Tag": return "tag";
    case "TableTrend": return "trend";
    case "ProgressBar": return "progress";
    case "Checkbox": return "checkbox";
    case "ToggleButton": return "toggle";
    case "TableActions": return "actions";
    default: return element ? "custom" : "text";
  }
}

/** The value code a written content shows: its children as JSX (`{row.name}` or text), else its value prop. */
function labelCode(element: SourceElement, inner: SourceElement | null): string {
  const holder = (element.name === "TableBadges" || element.name === "TableTags") && inner ? inner : element;
  const children = holder.children.filter((child) => child.kind !== "text" || child.value.trim());
  if (children.length) {
    return children.map((child) => (child.kind === "text" ? child.value.trim() : child.kind === "expression" ? child.raw : "")).join("");
  }
  const value = attr(element, "value") ?? attr(element, "defaultChecked") ?? attr(element, "checked");
  if (value?.kind === "expression") {
    // Number(x) || 0 and Boolean(x), written by a switch to Progress or a control: back to x.
    const code = (value.value ?? "").replace(/^Number\((.*)\) \|\| 0$/s, "$1").replace(/^Boolean\((.*)\)$/s, "$1");
    return `{${code}}`;
  }
  return "";
}

/** One JSX element as code: prop values as written (`'"sm"'`, `"{false}"`; true: the bare name), `carried` attributes first. */
function tag(name: string, props: Array<[string, string | true]>, children?: string, carried: string[] = []): string {
  const attrs = [...carried.map((raw) => ` ${raw}`), ...props.map(([key, value]) => (value === true ? ` ${key}` : ` ${key}=${value}`))].join("");
  return children === undefined ? `<${name}${attrs} />` : `<${name}${attrs}>${children}</${name}>`;
}
const quoted = (value: string) => JSON.stringify(value);

/** The new element for `content`, carrying the label, Subtext and Bold of the written one (`header`: a control's name). */
function contentCode(content: Content, element: SourceElement, inner: SourceElement | null, header: string): string {
  const label = labelCode(element, inner);
  const expression = label.startsWith("{") && label.endsWith("}") ? label.slice(1, -1) : JSON.stringify(label);
  const caption = attr(element, "caption");
  const bold = attr(element, "bold");
  const carried = [caption?.raw, bold && !/\{\s*false\s*\}/.test(bold.raw) ? bold.raw : undefined].filter((raw): raw is string => Boolean(raw));
  // Figma's media cells: XSmall over one line, Small over a Subtext (Table.tsx cellVisual).
  const size = (alone: string, captioned: string) => quoted(caption ? captioned : alone);
  const media = (code: string) => tag("TableMedia", [["media", `{${code}}`]], label, carried);
  const name = quoted(header);
  switch (content) {
    case "text": return tag("TableText", [], label, carried);
    case "avatar":
    case "photo":
      return media(tag("Avatar", [["size", size("xs", "sm")], ["shape", quoted(content === "photo" ? "square" : "circle")], ["background", quoted("subtle")], ["alt", quoted("")]]));
    case "icon": return media(tag("Icon", [["name", quoted("icon-face-smile-line")], ["size", size("base", "lg")], ["decorative", true]]));
    case "dock-icon": return media(tag("DockIcon", [["size", size("xs", "sm")], ["theme", quoted("neutral")], ["background", quoted("subtle")]]));
    case "badge": return tag("TableBadges", [], tag("Badge", [["size", quoted("medium")], ["theme", quoted("neutral")], ["background", quoted("subtle")], ["leadingIcon", "{false}"]], label));
    case "tag": return tag("TableTags", [], tag("Tag", [], label));
    case "trend": return tag("TableTrend", [["trend", quoted("up")]], label);
    case "progress": return tag("ProgressBar", [["value", `{Number(${expression}) || 0}`], ["label", true], ["aria-label", name]]);
    case "checkbox": return tag("Checkbox", [["defaultChecked", `{Boolean(${expression})}`], ["aria-label", name]]);
    case "toggle": return tag("ToggleButton", [["size", quoted("sm")], ["defaultChecked", `{Boolean(${expression})}`], ["aria-label", name]]);
    default: return "";
  }
}

/** The fibers an example writes inside the cell (its column's `cell`), outermost first (the Table's own left out). */
function writtenFibers(cell: TableCellHit): Fiber[] {
  const out: Fiber[] = [];
  const td = fiberOf(cell.td);
  const visit = (fiber: Fiber | null, depth: number) => {
    for (let current = fiber; current && depth < 80 && out.length < 60; current = current.sibling) {
      const src = srcOf(current);
      if (src && src !== cell.src) out.push(current);
      visit(current.child, depth + 1);
    }
  };
  try {
    visit(td ? currentFiber(td).child : null, 0);
  } catch {
    // React internals changed: what was found so far.
  }
  return out;
}

/** The outermost element an example writes in the cell (its column's `cell`), or null when the Table draws it. */
const writtenContent = (cell: TableCellHit): string | null => srcOf(writtenFibers(cell)[0] ?? null);

/* ───────────── Panel ───────────── */

/** The Inspector for a selected part: a Table's Data-Row or Cell (or the content the Table draws in a cell) here, any other part in PartPanel. */
export function TablePartPanel({ selection, controlsSlot }: { selection: PartSelection; controlsSlot: HTMLElement }) {
  const part = useSyncExternalStore(selectedPartStore.subscribe, selectedPartStore.get, selectedPartStore.get);
  const resolved = part && part.owner.src === selection.src && part.element.isConnected ? part : null;
  const name = selection.part?.name;
  const tablePart = name === TABLE_PARTS.row || name === TABLE_PARTS.cell;
  const cell = resolved ? tableCellOf(resolved.element) : null;
  if (name === TABLE_PARTS.row) return resolved ? <DataRowPanel selection={selection} part={resolved} /> : <Finding name={name} />;
  if (cell && cell.src === selection.src) return <CellPanel selection={selection} part={resolved!} cell={cell} />;
  if (tablePart) return <Finding name={name} />;
  return <PartPanel selection={selection} controlsSlot={controlsSlot} />;
}

function Finding({ name }: { name: string }) {
  return <p className={`studio-inspector__empty ${typographyStyles["Body/Small/Regular"]}`}>Finding {name} on the canvas…</p>;
}

/** The header of a Table part: its Figma name, where it is, and a way back to the Table. */
function PartHeader({ selection, title, where }: { selection: PartSelection; title: string; where: string }) {
  return (
    <header className="studio-inspector__head-block">
      <div className="studio-inspector__title-row">
        <span className="studio-inspector__kind-icon" aria-hidden="true"><Icon name="icon-cube-line" size={16} /></span>
        <Heading level={2} textStyle="Body/Small/Bold" className="studio-part__title">
          {title}
          <span className={`studio-part__owner ${typographyStyles["Body/Small/Regular"]}`}>{` · ${where}`}</span>
        </Heading>
      </div>
      <div className="studio-part__links">
        {/* zen-allow-compact-button: quiet links under the part name in a dense tool panel, like PartPanel's */}
        <Button appearance="flat" level="primary" size="xs" startIcon="icon-corner-left-up-line" className="studio-inspector__src" onClick={() => studioStore.setState({ selection: withoutPart(selection) })}>
          Select {selection.name}
        </Button>
        {/* zen-allow-compact-button: the Table's file:line reference, as on an element's Design tab */}
        <Button appearance="flat" level="primary" size="xs" startIcon="icon-code-02-line" className="studio-part__code" aria-label={`Show ${shortSrc(selection.src)} in the Code tab`} onClick={() => studioStore.setState({ inspectorTab: "code" })}>
          {shortSrc(selection.src)}
        </Button>
      </div>
    </header>
  );
}

const headerText = (column: TableColumnInfo | null) => (column && typeof column.header === "string" && column.header.trim() ? column.header.trim() : column?.id ?? "Column");

/** A row field's editor: text, number or a switch, by its rendered value. */
function ValueField({ label, value, disabled, onSet }: { label: string; value: unknown; disabled: boolean; onSet: (value: EditValue) => void }) {
  if (typeof value === "boolean") return <ToggleButton aria-label={label} size="sm" checked={value} disabled={disabled} onCheckedChange={(next) => onSet({ kind: "boolean", value: next })} />;
  if (typeof value === "number") return <NumberControl label={label} value={value} fallback={undefined} disabled={disabled} onSet={(next) => onSet({ kind: "number", value: next })} />;
  return <TextControl label={label} value={fieldText(value) ?? ""} fallback={undefined} disabled={disabled} onSet={(next) => onSet({ kind: "string", value: String(next) })} />;
}

/** The row's own data (op setDataField { field } on the Table): where the Table reads its rows. */
function rowOp(cell: { row: number; rowKey: string | null; item: unknown }, field: string[], value: EditValue): EditOp {
  return { op: "setDataField", field, row: cell.row, ...(cell.rowKey !== null ? { rowKey: cell.rowKey } : {}), rowFields: rowFieldsOf(cell.item), value };
}

/* ───────────── The Table's selection and editing as written (Figma Table/Cell/Default State=Selected · State=Edit) ───────────── */

/** A boolean prop of the Table as written: on or off, or the reason it is code the Studio leaves alone. */
function booleanProp(table: SourceElement | null, name: string): { on: boolean; reason?: string } {
  const written = attr(table, name);
  if (!written) return { on: false };
  if (written.kind === "true") return { on: true };
  if (written.kind === "expression" && /^(true|false)$/.test((written.value ?? "").trim())) return { on: written.value!.trim() === "true" };
  return { on: false, reason: `${name}={${written.value ?? "…"}} is code; edit it there` };
}
const booleanOps = (name: string, on: boolean): EditOp[] => [on ? { op: "setProp", name, value: { kind: "boolean", value: true } } : { op: "removeProp", name }];
const listCode = (ids: string[]) => `[${ids.map((id) => JSON.stringify(id)).join(", ")}]`;

/** The rows selected as written — the useState list behind `selectedIds`, else `defaultSelectedIds` — and how the next list is written. */
function writtenSelection(table: SourceElement | null): { ids: string[]; write: (ids: string[]) => EditOp[] } | { reason: string } {
  const controlled = attr(table, "selectedIds");
  if (controlled) {
    if (controlled.state && Array.isArray(controlled.state.value)) {
      return { ids: controlled.state.value, write: (ids) => [{ op: "setStateInit", name: "selectedIds", value: { kind: "expression", code: listCode(ids) } }] };
    }
    return { reason: `selectedIds={${controlled.value ?? "…"}} is code; edit the selection there` };
  }
  const initial = attr(table, "defaultSelectedIds");
  let ids: string[] = [];
  if (initial) {
    try {
      const parsed: unknown = JSON.parse(initial.value ?? "");
      if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) throw new Error("not a list of strings");
      ids = parsed as string[];
    } catch {
      return { reason: `defaultSelectedIds={${initial.value ?? "…"}} is code; edit it there` };
    }
  }
  return { ids, write: (next) => [next.length ? { op: "setProp", name: "defaultSelectedIds", value: { kind: "expression", code: listCode(next) } } : { op: "removeProp", name: "defaultSelectedIds" }] };
}

/** The ops that select or deselect a row as written: Selected also turns the Checkbox column (`selectable`) on. Null with why when the selection is code. */
function selectionOps(table: SourceElement | null, rowKey: string | null, on: boolean): EditOp[] | { reason: string } {
  if (!rowKey) return { reason: "This row has no key (getRowId)" };
  const selection = writtenSelection(table);
  if ("reason" in selection) return selection;
  const next = on ? [...new Set([...selection.ids, rowKey])] : selection.ids.filter((id) => id !== rowKey);
  const checkbox = booleanProp(table, "selectable");
  if (on && checkbox.reason) return { reason: checkbox.reason };
  return [...(on && !checkbox.on ? booleanOps("selectable", true) : []), ...selection.write(next)];
}

const STATE_LABELS = { default: "Default", selected: "Selected", edit: "Edit" };

/* ───────────── Data-Row ───────────── */

function DataRowPanel({ selection, part }: { selection: PartSelection; part: PartHit }) {
  const table = useElement(selection.src);
  const editable = useEditable();
  const tr = part.element as HTMLTableRowElement;
  const first = tr.querySelector("td.zen-table__cell:not(.zen-table__select)");
  const cell = first ? tableCellOf(first) : null;
  const index = tr.parentElement ? bodyRows(tr.parentElement).indexOf(tr) : -1;
  const item = cell?.item;
  const fields = item && typeof item === "object" ? Object.entries(item as Record<string, unknown>).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)) : [];
  const rows = table?.tableRows;
  const locked = !editable || !rows?.editable;
  // Figma State of the row's cells (Selected: the Table's selection as written) and the Table's Checkbox and Editable.
  const live = ((cell?.table ?? tableFiberOf(tr))?.memoizedProps ?? {}) as { selectable?: boolean; editable?: boolean };
  const selectedNow = tr.dataset.selected === "true";
  const checkbox = booleanProp(table, "selectable");
  const rowEditable = booleanProp(table, "editable");
  const selectionWrite = selectionOps(table, cell?.rowKey ?? null, !selectedNow);
  const setState = (next: string) => {
    if ("reason" in selectionWrite || (next === "selected") === selectedNow) return;
    void edit(table, selectionWrite, `Row ${index + 1}: ${STATE_LABELS[next as keyof typeof STATE_LABELS] ?? next}`);
  };
  return (
    <div className="studio-inspector__panel">
      <PartHeader selection={selection} title="Data-Row" where={`row ${index + 1} of ${selection.name}`} />
      <InspectorSection title="Primitives/Table/Data-Row" note="State is this row's; Checkbox and Editable are the Table's (every row).">
        <InspectorRow label="State" name="row-state" hint={"reason" in selectionWrite ? selectionWrite.reason : undefined}>
          <EnumControl label="State" value={selectedNow ? "selected" : "default"} fallback="default" disabled={!editable || "reason" in selectionWrite} options={["default", "selected"]} labels={STATE_LABELS} onSet={setState} />
        </InspectorRow>
        <InspectorRow label="Checkbox" name="selectable" hint={checkbox.reason ?? "Figma Table/Cell/Header Type=Checkbox: a checkbox column, rows select"}>
          <ToggleButton aria-label="Checkbox" size="sm" checked={Boolean(live.selectable)} disabled={!editable || Boolean(checkbox.reason)} onCheckedChange={(next) => void edit(table, booleanOps("selectable", next), `${selection.name}: Checkbox ${next ? "on" : "off"}`)} />
        </InspectorRow>
        <InspectorRow label="Editable" name="editable" hint={rowEditable.reason ?? "Figma Cell State=Edit on every value cell: text, numbers, badges and tags edit in place"}>
          <ToggleButton aria-label="Editable" size="sm" checked={Boolean(live.editable)} disabled={!editable || Boolean(rowEditable.reason)} onCheckedChange={(next) => void edit(table, booleanOps("editable", next), `${selection.name}: Editable ${next ? "on" : "off"}`)} />
        </InspectorRow>
      </InspectorSection>
      <InspectorSection title="Row data" note={rows && !rows.editable ? rows.reason : rows?.file ? `Written in ${shortSrc(rows.file)}` : undefined}>
        {cell && fields.length ? fields.map(([key, value]) => (
          <InspectorRow key={key} label={key} labelTitle={key} name={`row-${key}`}>
            <ValueField label={key} value={value} disabled={locked} onSet={(next) => void edit(table, [rowOp(cell, [key], next)], `Row ${index + 1}: ${key}`)} />
          </InspectorRow>
        )) : <p className={`studio-inspector__empty ${typographyStyles["Body/Small/Regular"]}`}>This row has no text, number or on/off fields</p>}
      </InspectorSection>
    </div>
  );
}

/* ───────────── Cell ───────────── */

function CellPanel({ selection, part, cell }: { selection: PartSelection; part: PartHit; cell: TableCellHit }) {
  const table = useElement(selection.src);
  const editable = useEditable();
  const column = cell.columnDef;
  const header = headerText(column);
  const written = column?.cell ? writtenContent(cell) : null;
  const content = useElement(written);
  // A Badge or Tag cell's own Badge / Tag (its label is there).
  const innerChild = content?.children.find((child) => child.kind === "element");
  const inner = useElement(content && innerChild?.kind === "element" ? `${content.file}:${innerChild.loc}` : null);
  const drawn = !column?.cell;
  const kind = drawn ? (column?.content ?? "text") : contentOfWritten(content);
  const shape = drawn && column ? columnShape(table, column.id) : null;
  const columnLocked = !editable || (drawn ? !shape || "reason" in shape : !content);
  const title = part.name === TABLE_PARTS.cell ? "Cell" : part.name;
  const where = `row ${cell.row + 1} · ${header} · ${selection.name}`;

  /** Writes fields of the column (a column without `cell`): null removes one. */
  const setColumn = (fields: Record<string, EditValue | null>, label: string) => {
    if (!shape || "reason" in shape || !column) return;
    const ops: EditOp[] = Object.entries(fields).map(([key, value]) => ({ op: "setField", name: "columns", index: shape.index, key, value }));
    void edit(table, ops, `${header} column: ${label}`);
  };
  const setContent = (next: string) => {
    if (drawn) {
      setColumn({ content: next === "text" ? null : { kind: "string", value: next } }, `Content → ${CONTENT_LABELS[next] ?? next}`);
      return;
    }
    if (!content || !CONTENTS.includes(next as Content)) return;
    const code = contentCode(next as Content, content, inner, header);
    if (code) void edit(content, [{ op: "replaceElement", code }], `${header} column: Content → ${CONTENT_LABELS[next]}`);
  };
  const bold = drawn ? Boolean(column?.bold) : Boolean(content && attr(content, "bold") && !/\{\s*false\s*\}/.test(attr(content, "bold")!.raw));
  const setBold = (next: boolean) => {
    if (drawn) setColumn({ bold: next ? { kind: "boolean", value: true } : null }, `Bold ${next ? "on" : "off"}`);
    else if (content) void edit(content, [next ? { op: "setProp", name: "bold", value: { kind: "boolean", value: true } } : { op: "removeProp", name: "bold" }], `${header} column: Bold ${next ? "on" : "off"}`);
  };
  const align = column?.align ?? "left";
  const columnShapeForAlign = column ? columnShape(table, column.id) : null;
  const setAlign = (next: string) => {
    if (!columnShapeForAlign || "reason" in columnShapeForAlign) return;
    void edit(table, [{ op: "setField", name: "columns", index: columnShapeForAlign.index, key: "align", value: next === "left" ? null : { kind: "string", value: next } }], `${header} column: Align ${next}`);
  };

  // The row's fields, offered for Subtext and the media (a column without `cell`).
  const rowFields = cell.item && typeof cell.item === "object" ? Object.entries(cell.item as Record<string, unknown>).filter(([, value]) => typeof value === "string" || typeof value === "number").map(([key]) => key) : [];
  const caption = drawn ? column?.captionField ?? null : content ? attr(content, "caption")?.value ?? attr(content, "caption")?.raw ?? null : null;
  const setCaption = (next: string) => {
    if (drawn) setColumn({ captionField: next === "" ? null : { kind: "string", value: next } }, next ? `Subtext from ${next}` : "Subtext off");
    else if (content) {
      const param = paramOf(column);
      void edit(content, [next ? { op: "setProp", name: "caption", value: { kind: "expression", code: `${param}.${next}` } } : { op: "removeProp", name: "caption" }], `${header} column: ${next ? `Subtext ${param}.${next}` : "Subtext off"}`);
    }
  };

  // The media field: one of the row's fields, or a new one (`photo`, `icon`) the rows take when a value is given.
  const newMedia = MEDIA.has(kind) && !rowFields.includes(kind === "icon" || kind === "dock-icon" ? "icon" : "photo") ? (kind === "icon" || kind === "dock-icon" ? "icon" : "photo") : null;
  const mediaFields = [...rowFields, ...(newMedia && column?.mediaField !== newMedia ? [newMedia] : []), ...(column?.mediaField && !rowFields.includes(column.mediaField) && column.mediaField !== newMedia ? [column.mediaField] : [])];
  const rowsLocked = !editable || !table?.tableRows?.editable;

  // Figma State: Selected is the row's selection as written; Edit is `edit: "<type>"` on the column (every row of it).
  const selectedNow = cell.tr.dataset.selected === "true";
  const tableEditable = Boolean((cell.table.memoizedProps as { editable?: boolean } | null)?.editable);
  const cellEditable = cell.td.dataset.editable === "true" || Boolean(column?.edit);
  const state = selectedNow ? "selected" : cellEditable ? "edit" : "default";
  const writtenEdit = shape && !("reason" in shape) ? fieldOf(shape.shape, "edit") : undefined;
  /** The ops that put the column's cells in Edit (on) or back (off), or why the Studio cannot. */
  const editOps = (on: boolean): EditOp[] | { reason: string } => {
    if (on === cellEditable) return [];
    if (!on && tableEditable) return { reason: "Editable is on for the whole Table: turn it off on the Data-Row" };
    if (!drawn) return { reason: "The column's cells are code (cell): give it edit in the code" };
    if (!shape || "reason" in shape || !column) return { reason: shape && "reason" in shape ? shape.reason : "The column is not written in the list" };
    if (writtenEdit && writtenEdit.kind !== "string" && writtenEdit.kind !== "boolean") return { reason: "The column's edit is code; edit it there" };
    if (on) {
      const type = tableEditorTypeFor(column, tableData(cell.table).rows);
      if (!type) return { reason: "A checkbox or toggle cell is a control already" };
      return [{ op: "setField", name: "columns", index: shape.index, key: "edit", value: { kind: "string", value: type } }];
    }
    return [{ op: "setField", name: "columns", index: shape.index, key: "edit", value: null }];
  };
  const stateOps = (next: string): EditOp[] | { reason: string } => {
    const ops: EditOp[] = [];
    if ((next === "selected") !== selectedNow) {
      const selection = selectionOps(table, cell.rowKey, next === "selected");
      if ("reason" in selection) return selection;
      ops.push(...selection);
    }
    if (next !== "selected") {
      const editing = editOps(next === "edit");
      if ("reason" in editing) return editing;
      ops.push(...editing);
    }
    return ops;
  };
  const stateHint = (["default", "edit", "selected"] as const).map((next) => (next === state ? null : stateOps(next))).find((result) => result && "reason" in result) as { reason: string } | undefined;
  const setState = (next: string) => {
    const ops = stateOps(next);
    if ("reason" in ops) { inspectorStatus.set("negative", ops.reason); return; }
    if (ops.length) void edit(table, ops, `${header} column, row ${cell.row + 1}: State ${STATE_LABELS[next as keyof typeof STATE_LABELS] ?? next}`);
  };
  const valueRows: ReactNode[] = [];
  if (drawn && column && cell.item && typeof cell.item === "object") {
    const record = cell.item as Record<string, unknown>;
    const fields: Array<[string, string | undefined]> = [["Label", column.field ?? column.id], ["Subtext", column.captionField], [MEDIA.has(kind) ? (kind === "icon" || kind === "dock-icon" ? "Icon" : "Picture") : "", column.mediaField]];
    for (const [label, key] of fields) {
      if (!label || !key) continue;
      const set = (next: EditValue) => void edit(table, [rowOp(cell, [key], next)], `${header}, row ${cell.row + 1}: ${label}`);
      // An Icon or Dock Icon cell's icon name: Figma's icon swap; an Avatar or Photo cell's picture: its image fill (on a
      // page you made; example code keeps a text field). A row without the field gets it (data-source.mjs).
      const text = typeof record[key] === "string" || record[key] === undefined;
      const value = typeof record[key] === "string" ? (record[key] as string) : undefined;
      const field = <ValueField label={label} value={record[key]} disabled={rowsLocked} onSet={set} />;
      valueRows.push(
        <InspectorRow key={key} label={label} labelTitle={key} name={`value-${key}`}>
          {label === "Icon" && text
            ? <IconControl label={label} value={value} fallback={undefined} disabled={rowsLocked} onSet={(next) => set({ kind: "string", value: next })} />
            : label === "Picture" && text
              ? <PhotoControl label={label} value={value} disabled={rowsLocked} people={kind === "avatar"} onSet={(next) => { const code = pictureCode(table?.tableRows?.file ?? parseSrc(selection.src)?.file ?? "", next); if (code) set(code); else inspectorStatus.set("negative", UPLOAD_ONLY_LOCAL); }} onClear={value ? () => set({ kind: "string", value: "" }) : undefined} />
              : field}
        </InspectorRow>,
      );
    }
  }
  if (!drawn && content) valueRows.push(...writtenValues(content, inner, cell, editable, header));

  return (
    <InspectorFileContext.Provider value={parseSrc(selection.src)?.file ?? null}>
    <div className="studio-inspector__panel">
      <PartHeader selection={selection} title={title} where={where} />
      <InspectorSection title="Table/Cell/Default" note="A column shows one kind of data: Content, Align, Bold and Subtext change every row of this column.">
        <InspectorRow label="Content" name="content">
          {kind === "actions" || kind === "custom"
            ? <span className={typographyStyles["Body/Small/Regular"]}>{CONTENT_LABELS[kind]}</span>
            : <EnumControl label="Content" value={kind} fallback="text" disabled={columnLocked} options={[...CONTENTS]} labels={CONTENT_LABELS} onSet={setContent} />}
        </InspectorRow>
        <InspectorRow label="Align" name="align" hint={columnShapeForAlign && "reason" in columnShapeForAlign ? columnShapeForAlign.reason : undefined}>
          <EnumControl label="Align" value={align} fallback="left" disabled={!editable || !columnShapeForAlign || "reason" in columnShapeForAlign} options={["left", "right"]} labels={{ left: "Left", right: "Right" }} onSet={setAlign} />
        </InspectorRow>
        <InspectorRow label="State" name="cell-state" hint={stateHint?.reason ?? "Selected: this row (the Table's selection). Edit: this column, every row, edits in place"}>
          <EnumControl label="State" value={state} fallback="default" disabled={!editable} options={["default", "edit", "selected"]} labels={STATE_LABELS} onSet={setState} />
        </InspectorRow>
        <InspectorRow label="Open-Button" name="onOpen" hint="Its click is code: the column's onOpen">
          <ToggleButton aria-label="Open-Button" size="sm" checked={Boolean(column?.onOpen)} disabled />
        </InspectorRow>
      </InspectorSection>
      {LABELLED.has(kind) ? (
        <InspectorSection title={CONTENT_COMPONENTS[kind]}>
          <InspectorRow label="Bold" name="bold">
            <ToggleButton aria-label="Bold" size="sm" checked={bold} disabled={columnLocked} onCheckedChange={setBold} />
          </InspectorRow>
          <InspectorRow label={kind === "text" ? "Caption" : "Subtext"} name="caption" hint={drawn ? undefined : caption ? `caption={${caption}}` : undefined}>
            {drawn
              ? <EnumControl label="Subtext" value={caption ?? ""} fallback="" disabled={columnLocked} options={["", ...rowFields]} labels={{ "": "None" }} onSet={setCaption} />
              : <EnumControl label="Subtext" value={captionField(caption, column) ?? ""} fallback="" disabled={columnLocked} options={["", ...rowFields]} labels={{ "": "None" }} onSet={setCaption} />}
          </InspectorRow>
          {drawn && MEDIA.has(kind) ? (
            <InspectorRow label={kind === "icon" || kind === "dock-icon" ? "Icon field" : "Picture field"} name="mediaField">
              <EnumControl label="Media field" value={column?.mediaField ?? ""} fallback="" disabled={columnLocked} options={["", ...mediaFields]} labels={{ "": "None", ...(newMedia ? { [newMedia]: `${newMedia} (new)` } : {}) }} onSet={(next) => setColumn({ mediaField: next ? { kind: "string", value: next } : null }, next ? `Media from ${next}` : "No media field")} />
            </InspectorRow>
          ) : null}
        </InspectorSection>
      ) : null}
      <InspectorSection title={`Value · row ${cell.row + 1}`} note={drawn && table?.tableRows && !table.tableRows.editable ? table.tableRows.reason : undefined}>
        {valueRows.length ? valueRows : <p className={`studio-inspector__empty ${typographyStyles["Body/Small/Regular"]}`}>This cell shows no value the row writes as data</p>}
      </InspectorSection>
      {shape && "reason" in shape ? <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{shape.reason}</p> : null}
    </div>
    </InspectorFileContext.Provider>
  );
}

/** The parameter name a column's `cell` calls its row (`(member) => …`), read from the rendered function. */
function paramOf(column: TableColumnInfo | null): string {
  const source = typeof column?.cell === "function" ? Function.prototype.toString.call(column.cell) : "";
  return /^\s*(?:async\s*)?\(?\s*([A-Za-z_$][\w$]*)/.exec(source)?.[1] ?? "row";
}

/** The row field a written `caption={row.email}` reads ("email"), or null. */
function captionField(caption: string | null, column: TableColumnInfo | null): string | null {
  if (!caption) return null;
  const match = new RegExp(`^${paramOf(column).replace(/[$]/g, "\\$")}\\.([A-Za-z_$][\\w$]*)$`).exec(caption.trim());
  return match?.[1] ?? null;
}

/** The written content's values that come from the row (its label child, its caption…): each edited where the row is written. */
function writtenValues(content: SourceElement, inner: SourceElement | null, cell: TableCellHit, editable: boolean, header: string): ReactNode[] {
  const rows: ReactNode[] = [];
  const table = cell.src ? parseSrc(cell.src) : null;
  const target = (holder: SourceElement) => ({ row: cell.row, ...(cell.rowKey !== null ? { rowKey: cell.rowKey } : {}), rowFields: rowFieldsOf(cell.item), ...(table && table.file === holder.file ? { table: table.loc } : {}) });
  const holders = [content, ...(inner ? [inner] : [])];
  for (const holder of holders) {
    let index = -1;
    for (const child of holder.children) {
      if (child.kind === "text" && !child.value.trim()) continue;
      index += 1;
      if (child.kind !== "expression" || !child.dataSource) continue;
      const source = child.dataSource;
      const at = index;
      const value = liveValue(cell, holder, "children");
      rows.push(
        <InspectorRow key={`${holder.loc}:child:${at}`} label="Label" hint={source.editable ? undefined : `${child.raw.replace(/^\{\s*|\s*\}$/g, "")}: ${source.reason ?? "computed in the code"}`}>
          <ValueField label="Label" value={value} disabled={!editable || !source.editable} onSet={(next) => void edit(holder, [{ op: "setDataField", child: at, ...target(holder), value: next }], `${header}, row ${cell.row + 1}: Label`)} />
        </InspectorRow>,
      );
    }
    for (const prop of holder.attributes) {
      if (prop.kind !== "expression" || !prop.dataSource || !["caption", "title", "label", "description"].includes(prop.name)) continue;
      const source = prop.dataSource;
      const label = prop.name === "caption" ? "Subtext" : prop.name[0].toUpperCase() + prop.name.slice(1);
      rows.push(
        <InspectorRow key={`${holder.loc}:prop:${prop.name}`} label={label} hint={source.editable ? undefined : `${prop.value}: ${source.reason ?? "computed in the code"}`}>
          <ValueField label={label} value={liveValue(cell, holder, prop.name)} disabled={!editable || !source.editable} onSet={(next) => void edit(holder, [{ op: "setDataField", prop: prop.name, ...target(holder), value: next }], `${header}, row ${cell.row + 1}: ${label}`)} />
        </InspectorRow>,
      );
    }
  }
  return rows;
}

/** What the written element renders in this row for a prop (children: its text), read from the cell on the canvas. */
function liveValue(cell: TableCellHit, holder: SourceElement, prop: string): unknown {
  const src = `${holder.file}:${holder.loc}`;
  const fiber = writtenFibers(cell).find((candidate) => srcOf(candidate) === src);
  if (!fiber) return "";
  const value = (currentFiber(fiber).memoizedProps ?? {})[prop];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return prop === "children" ? hostsOf(currentFiber(fiber)).map((host) => host.textContent ?? "").join("") : "";
}
