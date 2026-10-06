import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactElement, type ReactNode, type Ref, type RefObject } from "react";
import { ZenPortal } from "../Portal";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Checkbox } from "../Checkbox";
import { Popover } from "../Popover";
import { Tag } from "../Tag";
import { Icon, type IconName } from "../Icon";
import { VisuallyHidden } from "../VisuallyHidden";
import { renderIcon } from "../_shared/icon";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./table.css";
import "../Icon/core";

export type TableAlign = "left" | "right";
export type TableSortDirection = "asc" | "desc";
export interface TableSort { columnId: string; direction: TableSortDirection }

export interface TableColumn<T> {
  id: string;
  /** Figma Table/Cell/Header Label (All-Caps/S, Content/Neutral/Light). */
  header: ReactNode;
  /** Figma Align: numbers, amounts and actions align right. */
  align?: TableAlign;
  /**
   * CSS width, e.g. "120px" or "40%". A fixed length is the column's fixed width, like a Figma FIXED cell: a narrow
   * container scrolls the table sideways instead of squeezing the column and wrapping its values. A percentage stays
   * a share of the table. Leave the main column (name, title) without a width so it fills the rest (Figma FILL).
   */
  width?: string;
  /** Figma Type=Sort: the header becomes a sort button (chevron-selector-vertical). */
  sortable?: boolean;
  /** Figma Icon: a 12px leading icon before the header label — an icon name or an icon element. */
  icon?: IconName | ReactElement;
  /** Cell content for a row; use the Table* cell primitives or any component. */
  cell: (row: T, index: number) => ReactNode;
  /** Makes the column's cells editable in place (Figma Table/Cell/Default State=Edit · Editabled-Cell). */
  edit?: TableCellEditor<T>;
  /** Figma Open-Button: an XSmall Tertiary "Open" button on the right of the cell while its row is hovered. */
  onOpen?: (row: T) => void;
  /** Label of the Open button (default: the locale's "Open"). */
  openLabel?: ReactNode;
}

type TableEditorBase<T> = {
  placeholder?: string;
  /** Return an error message to keep the cell in Edit and flag it; commit is blocked until it passes. */
  validate?: (value: string, row: T) => string | undefined | null;
  /** Row-level lock (e.g. archived rows). */
  disabled?: (row: T) => boolean;
  "aria-label"?: string;
};
/** In-place editor for a column: text / number (input), select (Popover list) or tags (Editabled-Cell Data=Yes). */
export type TableCellEditor<T> =
  | (TableEditorBase<T> & { type?: "text" | "number"; value: (row: T) => string; onCommit: (row: T, value: string) => void;
      /** Text only: Shift+Enter inserts a line break (Enter still saves). */
      multiline?: boolean })
  | (TableEditorBase<T> & { type: "select"; value: (row: T) => string; options: Array<{ value: string; label: ReactNode }>; onCommit: (row: T, value: string) => void })
  | (Omit<TableEditorBase<T>, "validate"> & { type: "tags"; value: (row: T) => string[]; onCommit: (row: T, value: string[]) => void; suggestions?: string[] });

/**
 * Standard HTML attributes (`id`, `data-*`, `style`…) go to the root element; `aria-labelledby` and
 * `aria-describedby` name and describe the `<table>` itself, like `aria-label`.
 */
export interface TableProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The root element (the scroll box around the `<table>`). */
  ref?: Ref<HTMLDivElement>;
  columns: TableColumn<T>[];
  /** The items, one row each. */
  rows?: T[];
  /** @deprecated Use rows (same meaning). */
  data?: T[];
  /** A stable, unique id per row (selection, editing, React keys). Default: the row's `id` field, else its position —
   * pass it when rows have no `id`, or selection and edits stay on the position when rows are sorted or filtered. */
  getRowId?: (row: T) => string;
  /** Names the table (required for screen readers when there is no visible caption). */
  "aria-label"?: string;
  /** Visible caption above the table. */
  caption?: ReactNode;
  /** Figma Type=Checkbox header + a checkbox cell per row. */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  sort?: TableSort | null;
  onSortChange?: (sort: TableSort | null) => void;
  /** Rendered in a full-width row when `rows` is empty (e.g. an EmptyState). */
  empty?: ReactNode;
  /**
   * Rows that open something (a detail page, a Side Panel, a dialog): the whole row is the click target, keyboard focus
   * reaches each row and Enter or Space opens it; buttons, links, checkboxes and fields inside the row keep their own
   * clicks. For read-only rows — an editable table opens a row with its column's `onOpen` button instead.
   */
  onRowClick?: (row: T) => void;
  className?: string;
}

type ActiveCell = { row: string; col: string };
/** A row's `id` (or `key`) field, else `row-<position>`. */
function defaultRowId(row: unknown, position: number | undefined): string {
  const own = row !== null && typeof row === "object" ? ((row as { id?: unknown }).id ?? (row as { key?: unknown }).key) : undefined;
  return typeof own === "string" || typeof own === "number" ? String(own) : `row-${position ?? -1}`;
}
const isPrintable = (event: KeyboardEvent) => event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

/** Floating layer for the editor's Popover and error bubble, portalled (ZenPortal: <body> or the theme scope) so the table's scroll box
 * (overflow: auto) cannot clip it; the Popover still anchors to the cell through useAnchoredPosition. */
function EditorLayer({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  // mousedown inside the layer must not blur the cell input (that would commit before a suggestion is picked).
  return <ZenPortal><div className="zen-table-editor__layer" onMouseDown={(event) => event.preventDefault()}>{children}</div></ZenPortal>;
}

/** Viewport rect of the editing cell, kept in sync on scroll and resize (for the fixed error bubble). */
function useRect(ref: RefObject<HTMLElement | null>, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!active) { setRect(null); return undefined; }
    const update = () => { if (ref.current) setRect(ref.current.getBoundingClientRect()); };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [ref, active]);
  return rect;
}

/** How an edit ended: `refocus` returns focus to the cell (keyboard); a click elsewhere leaves focus where it landed. */
type EditEnd = { refocus: boolean };

/** The State=Edit field (Neutral/Pale fill, 2px Focus/Neutral/Solid underline) that overlays the cell. Interaction
 * follows Notion's database cells: one click edits, text grows to show long values, Enter saves (Shift+Enter adds a
 * line), Escape leaves and keeps what was typed, select/tags open a searchable list at once, Enter picks the top
 * match or creates the typed tag. */
function TableCellEditorView<T>({ editor, row, initial, align, onDone, onMove }: {
  editor: TableCellEditor<T>;
  row: T;
  /** Seed for a text/number edit started by typing a character (replaces the value) or Backspace (""). */
  initial?: string;
  align: TableAlign;
  onDone: (end: EditEnd) => void;
  onMove: (direction: 1 | -1) => void;
}) {
  const t = useZenLabels();
  const type = editor.type ?? "text";
  const original = type === "tags" ? "" : String((editor.value as (row: T) => string)(row) ?? "");
  const [text, setText] = useState(() => initial ?? original);
  const [tags, setTags] = useState<string[]>(() => (type === "tags" ? [...(editor.value as (row: T) => string[])(row)] : []));
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const errorId = useId();
  const done = useRef(false);
  const rect = useRect(fieldRef, Boolean(error));
  const autosize = () => { const el = inputRef.current; if (el instanceof HTMLTextAreaElement) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } };
  // Focus + caret at the end on open; list editors open their Popover after mount (the cell ref must exist first).
  useEffect(() => {
    const input = inputRef.current;
    if (input) { input.focus(); const end = input.value.length; input.setSelectionRange(end, end); autosize(); }
    if (type === "select" || type === "tags") setOpen(true);
  }, [type]);

  // Keep the newest tag and the input in view when the chips overflow the cell.
  const tagsRef = useRef<HTMLSpanElement>(null);
  useEffect(() => { const box = tagsRef.current; if (box) box.scrollLeft = box.scrollWidth; }, [tags.length]);
  const finish = (end: EditEnd) => { done.current = true; onDone(end); };
  const check = (value: string) => {
    if (type === "number" && value.trim() !== "" && !Number.isFinite(Number(value.replace(/,/g, "")))) return t.enterNumber;
    return type === "tags" || type === "select" ? null : (editor as TableEditorBase<T>).validate?.(value, row) ?? null;
  };
  /** Saves and ends the edit; returns false (and shows the error) when validation fails. */
  const commit = (end: EditEnd, then?: () => void) => {
    if (done.current) return true;
    if (type === "tags") {
      const extra = text.trim() && !tags.includes(text.trim()) ? [text.trim()] : [];
      (editor.onCommit as (row: T, value: string[]) => void)(row, [...tags, ...extra]);
    } else if (type !== "select") {
      const message = check(text);
      if (message) { setError(message); return false; }
      if (text !== original) (editor.onCommit as (row: T, value: string) => void)(row, type === "number" ? text.replace(/,/g, "").trim() : text);
    }
    finish(end); then?.();
    return true;
  };
  const revert = (end: EditEnd) => finish(end);

  // ── select: a searchable list opens at once (Notion select); Enter picks the top match.
  if (type === "select") {
    const options = (editor as { options: Array<{ value: string; label: ReactNode }> }).options;
    const current = original;
    const textOf = (label: ReactNode) => (typeof label === "string" || typeof label === "number" ? String(label) : "");
    const visible = options.filter((option) => textOf(option.label).toLowerCase().includes(query.trim().toLowerCase()) || option.value.toLowerCase().includes(query.trim().toLowerCase()));
    const currentLabel = options.find((option) => option.value === current)?.label ?? current;
    const pick = (value: string) => { if (value !== current) (editor.onCommit as (row: T, value: string) => void)(row, value); finish({ refocus: true }); };
    return (
      <div ref={fieldRef} className="zen-table-editor" data-align={align} data-type="select" onMouseDown={(event) => { event.preventDefault(); setOpen(true); }}>
        <span className={`zen-table-editor__value ${typographyStyles["Body/Base/Medium"]}`}>{currentLabel}</span>
        <Icon name="icon-chevron-up-line" decorative />
        <EditorLayer>
          <Popover className="zen-table-editor__popover" open={open} anchorRef={fieldRef} autoFocus search searchPlaceholder={t.searchOptions} searchValue={query} onSearchChange={setQuery}
            align={align === "right" ? "end" : "start"} style={{ minWidth: fieldRef.current?.offsetWidth }} emptyState={t.noOptionMatches(query)}
            onKeyDown={(event) => {
              if (event.key === "Escape") { event.preventDefault(); finish({ refocus: true }); return; }
              if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") { event.preventDefault(); if (visible[0]) pick(visible[0].value); }
              if (event.key === "Tab") { event.preventDefault(); const direction = event.shiftKey ? -1 : 1; finish({ refocus: true }); onMove(direction); }
            }}
            onOpenChange={(next) => { if (!next && !done.current) revert({ refocus: false }); setOpen(next); }}
            items={visible.map((option) => ({ id: option.value, label: option.label, selected: option.value === current }))}
            onSelect={(item) => pick(item.id)} />
        </EditorLayer>
      </div>
    );
  }

  // ── tags: chips + input in the cell and a suggestion list below it (Notion multi-select).
  const allSuggestions = type === "tags" ? (editor as { suggestions?: string[] }).suggestions ?? [] : [];
  const needle = text.trim().toLowerCase();
  const suggestions = allSuggestions.filter((item) => !tags.includes(item) && item.toLowerCase().includes(needle));
  const canCreate = type === "tags" && needle !== "" && !tags.some((tag) => tag.toLowerCase() === needle) && !allSuggestions.some((item) => item.toLowerCase() === needle);
  const addTag = (value: string) => { const next = value.trim(); if (next && !tags.includes(next)) setTags((list) => [...list, next]); setText(""); inputRef.current?.focus(); };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Escape leaves the cell and keeps what was typed (Notion); an invalid value is reverted instead of trapping focus.
    if (event.key === "Escape") { event.preventDefault(); if (!commit({ refocus: true })) revert({ refocus: true }); return; }
    if (event.key === "Tab") { event.preventDefault(); const direction = event.shiftKey ? -1 : 1; commit({ refocus: true }, () => onMove(direction)); return; }
    if (type === "tags" && event.key === "ArrowDown" && (suggestions.length || canCreate)) {
      event.preventDefault();
      document.querySelector<HTMLElement>(".zen-table-editor__layer .zen-popover__item:not(:disabled)")?.focus();
      return;
    }
    if (event.key === "Enter") {
      if (type === "text" && event.shiftKey && (editor as { multiline?: boolean }).multiline) return; // new line
      event.preventDefault();
      if (type === "tags" && needle) { addTag(suggestions[0] ?? text); return; }
      commit({ refocus: true });
      return;
    }
    if (type === "tags" && event.key === "Backspace" && !text && tags.length) { event.preventDefault(); setTags((list) => list.slice(0, -1)); }
  };
  const inputProps = {
    className: `zen-table-editor__input ${typographyStyles["Body/Base/Medium"]}`,
    value: text,
    placeholder: editor.placeholder ?? (type === "tags" ? t.addTag : undefined),
    "aria-label": editor["aria-label"],
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    onChange: (event: { target: { value: string } }) => { setText(event.target.value); if (error) setError(null); if (type === "tags") setOpen(true); requestAnimationFrame(autosize); },
    onKeyDown,
    // Clicking another cell or outside the table saves and leaves focus where the click landed.
    onBlur: (event: { relatedTarget: EventTarget | null }) => {
      if (event.relatedTarget instanceof Node && document.querySelector(".zen-table-editor__layer")?.contains(event.relatedTarget)) return;
      // Focus moving to a control inside this editor (a tag's remove button) is not leaving the cell.
      if (event.relatedTarget instanceof Node && fieldRef.current?.contains(event.relatedTarget)) return;
      if (!done.current && !commit({ refocus: false })) revert({ refocus: false });
    },
  };
  return (
    <div ref={fieldRef} className="zen-table-editor" data-align={align} data-type={type} data-invalid={error ? "true" : undefined}
      onMouseDown={(event) => {
        // Keep the caret in the input while pressing a tag's remove button (or the empty cell area); the click still fires.
        const target = event.target as HTMLElement;
        if (target === event.currentTarget || target.closest(".zen-table-editor__tags")) { event.preventDefault(); inputRef.current?.focus(); }
      }}>
      {type === "tags" ? <span ref={tagsRef} className="zen-table-editor__tags">{tags.map((tag, index) => <Tag key={`${tag}-${index}`} remove removeLabel={t.removeItem(tag)} onRemove={() => { setTags((list) => list.filter((_, i) => i !== index)); inputRef.current?.focus(); }}>{tag}</Tag>)}</span> : null}
      {type === "text"
        ? <textarea ref={(node) => { inputRef.current = node; }} rows={1} {...inputProps} />
        : <input ref={(node) => { inputRef.current = node; }} inputMode={type === "number" ? "decimal" : undefined} aria-autocomplete={type === "tags" ? "list" : undefined} aria-expanded={type === "tags" ? open : undefined} onFocus={() => { if (type === "tags") setOpen(true); }} {...inputProps} />}
      {type === "tags" && (suggestions.length || canCreate) ? (
        <EditorLayer>
          <Popover className="zen-table-editor__popover" open={open} anchorRef={fieldRef} align={align === "right" ? "end" : "start"} label={needle ? undefined : t.suggestions} style={{ minWidth: fieldRef.current?.offsetWidth }}
            onOpenChange={(next) => { setOpen(next); if (!next) inputRef.current?.focus(); }}
            items={[
              ...suggestions.map((item) => ({ id: item, label: item })),
              ...(canCreate ? [{ id: "__create__", label: t.createOption(text.trim()), leading: <Icon name="icon-plus-line" decorative /> }] : []),
            ]}
            onSelect={(item) => addTag(item.id === "__create__" ? text : item.id)} />
        </EditorLayer>
      ) : null}
      {error && rect ? (
        <EditorLayer>
          <span id={errorId} role="alert" className={`zen-table-editor__error-tooltip ${typographyStyles["Caption/Medium"]}`} style={{ top: rect.bottom + 4, left: rect.left + 16 }}>{error}</span>
        </EditorLayer>
      ) : null}
    </div>
  );
}

/**
 * Figma Table (page 1595:2631): Primitives/Table/Header (Table/Header/Size) over Primitives/Table/Data-Row of
 * Table/Cell/Default (Table/Cell/Size; padding Small × Medium; gap XSmall; 1px bottom Border/Neutral/Pale).
 * Cells use Table-Cell/Background Default · Hover (row hover) · Selected (checked rows).
 */
export function Table<T>({ ref, columns, rows: rowsProp, data, getRowId: getRowIdProp, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, caption, selectable = false, selectedIds = [], onSelectionChange, sort, onSortChange, empty, onRowClick, className, ...rest }: TableProps<T>) {
  const t = useZenLabels();
  const rows = rowsProp ?? data ?? [];
  // Without getRowId: each row's `id` field, else its position (one lookup table per render, not a search per row).
  const positions = getRowIdProp ? undefined : new Map(rows.map((row, index) => [row, index]));
  const getRowId = getRowIdProp ?? ((row: T) => defaultRowId(row, positions?.get(row)));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const setRoot = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }, [ref]);
  const hintId = useId();
  const [editing, setEditing] = useState<(ActiveCell & { initial?: string }) | null>(null);
  const editableCols = columns.filter((column) => column.edit).map((column) => column.id);
  const canEdit = (row: T, column: TableColumn<T>) => Boolean(column.edit && !column.edit.disabled?.(row));
  /** `quiet`: focus returns to the cell after an edit (keyboard users continue from it) without the focus ring;
   * the ring comes back as soon as the user navigates on (arrows / Tab land on another cell). */
  const focusCell = (cell: ActiveCell, quiet = false) => requestAnimationFrame(() => {
    const target = rootRef.current?.querySelector<HTMLElement>(`[data-cell="${CSS.escape(`${cell.row}::${cell.col}`)}"]`);
    if (!target) return;
    if (quiet) target.dataset.quiet = "true"; else delete target.dataset.quiet;
    target.focus();
  });
  /** Next editable cell in reading order (Tab) or along an axis (arrows); skips locked cells. */
  const neighbour = (from: ActiveCell, dRow: number, dCol: number, wrap = false): ActiveCell | null => {
    const rowIds = rows.map(getRowId);
    let r = rowIds.indexOf(from.row), c = editableCols.indexOf(from.col);
    for (let guard = 0; guard < rowIds.length * Math.max(editableCols.length, 1) + 1; guard += 1) {
      c += dCol; r += dRow;
      if (wrap && c >= editableCols.length) { c = 0; r += 1; }
      if (wrap && c < 0) { c = editableCols.length - 1; r -= 1; }
      if (r < 0 || r >= rowIds.length || c < 0 || c >= editableCols.length) return null;
      const row = rows[r], column = columns.find((col) => col.id === editableCols[c])!;
      if (canEdit(row, column)) return { row: rowIds[r], col: editableCols[c] };
    }
    return null;
  };
  const onCellKeyDown = (event: KeyboardEvent<HTMLTableCellElement>, cell: ActiveCell, column: TableColumn<T>) => {
    if (event.target !== event.currentTarget) return;
    const type = column.edit?.type ?? "text";
    const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[event.key]) { event.preventDefault(); const next = neighbour(cell, ...arrows[event.key]); if (next) focusCell(next); return; }
    if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); setEditing(cell); return; }
    if ((event.key === "Backspace" || event.key === "Delete") && (type === "text" || type === "number")) { event.preventDefault(); setEditing({ ...cell, initial: "" }); return; }
    if (isPrintable(event) && (type === "text" || type === "number")) { event.preventDefault(); setEditing({ ...cell, initial: event.key }); }
  };
  const ids = rows.map(getRowId);
  const selected = new Set(selectedIds);
  const allChecked = ids.length > 0 && ids.every((id) => selected.has(id));
  const someChecked = !allChecked && ids.some((id) => selected.has(id));
  const toggleAll = () => onSelectionChange?.(allChecked ? selectedIds.filter((id) => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])]);
  const toggle = (id: string) => onSelectionChange?.(selected.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  const nextSort = (columnId: string): TableSort | null => sort?.columnId !== columnId ? { columnId, direction: "asc" } : sort.direction === "asc" ? { columnId, direction: "desc" } : null;
  const span = columns.length + (selectable ? 1 : 0);
  // Figma FIXED/FILL model: once a column has a fixed width, the others fill and the table scrolls when it runs out of room.
  const fixedColumns = columns.some((column) => fixedWidth(column.width));
  return (
    <div {...rest} ref={setRoot} className={["zen-table", className].filter(Boolean).join(" ")} data-fixed-columns={fixedColumns ? "true" : undefined}>
      {editableCols.length ? <VisuallyHidden id={hintId}>{t.editableCellHint}</VisuallyHidden> : null}
      <table className="zen-table__table" aria-label={caption ? undefined : ariaLabel} aria-labelledby={ariaLabelledBy} aria-describedby={ariaDescribedBy}>
        {/* Table titles are Heading/4. */}
        {caption ? <caption className={`zen-table__caption ${typographyStyles["Heading/4"]}`}>{caption}</caption> : null}
        <colgroup>
          {selectable ? <col className="zen-table__col-select" /> : null}
          {columns.map((column) => <col key={column.id} style={column.width ? { width: column.width } : undefined} />)}
        </colgroup>
        <thead>
          <tr>
            {selectable ? (
              <th scope="col" className="zen-table__header zen-table__select">
                <Checkbox className="zen-table__checkbox" label={<VisuallyHidden>{t.selectAllRows}</VisuallyHidden>} checked={allChecked} indeterminate={someChecked} onCheckedChange={toggleAll} />
              </th>
            ) : null}
            {columns.map((column) => {
              const sorted = sort?.columnId === column.id ? sort.direction : undefined;
              const label = (
                <>
                  {column.icon ? renderIcon(column.icon) : null}
                  <span className={`zen-table__label ${typographyStyles["All-Caps/S"]}`}>{column.header}</span>
                  {column.sortable ? <Icon name={sorted === "asc" ? "icon-arrow-up-line" : sorted === "desc" ? "icon-arrow-down-line" : "icon-chevron-selector-vertical-line"} decorative /> : null}
                </>
              );
              return (
                <th key={column.id} scope="col" className="zen-table__header" style={fixedWidth(column.width)} data-fill={fixedColumns && !column.width ? "true" : undefined} data-align={column.align ?? "left"} data-sorted={sorted ? "true" : undefined} aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : column.sortable ? "none" : undefined}>
                  {column.sortable
                    ? <button type="button" className="zen-table__sort" onClick={() => onSortChange?.(nextSort(column.id))}>{label}</button>
                    : <span className="zen-table__head">{label}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty ? <tr><td className="zen-table__empty" colSpan={span}>{empty}</td></tr> : null}
          {rows.map((row, index) => {
            const id = getRowId(row);
            const isSelected = selected.has(id);
            return (
              <tr key={id} className="zen-table__row" data-selected={isSelected ? "true" : undefined} aria-selected={selectable ? isSelected : undefined}
                data-clickable={onRowClick ? "true" : undefined} tabIndex={onRowClick ? 0 : undefined}
                // The row opens its item unless the click belongs to a control inside it, ends a text selection, or comes
                // from a portal (a Menu, Popover or Dialog opened from the row bubbles through React but is not in the row).
                onClick={onRowClick ? (event) => {
                  if (!event.currentTarget.contains(event.target as Node) || ownsClick(event.target as Element, event.currentTarget) || window.getSelection()?.toString()) return;
                  onRowClick(row);
                } : undefined}
                onKeyDown={onRowClick ? (event) => {
                  if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  onRowClick(row);
                } : undefined}>
                {selectable ? (
                  <td className="zen-table__cell zen-table__select">
                    <Checkbox className="zen-table__checkbox" label={<VisuallyHidden>{t.selectRow(index + 1)}</VisuallyHidden>} checked={isSelected} onCheckedChange={() => toggle(id)} />
                  </td>
                ) : null}
                {columns.map((column) => {
                  const cell = { row: id, col: column.id };
                  const editable = canEdit(row, column);
                  const isEditing = editable && editing?.row === id && editing.col === column.id;
                  const open = column.onOpen ? (
                    <span className="zen-table__open">{/* zen-allow-compact-button: an App Store-style "Open" pill that appears on row hover inside a 52px cell. */}<Button appearance="main" level="tertiary" size="xs" onClick={(event) => { event.stopPropagation(); column.onOpen!(row); }}>{column.openLabel ?? t.open}</Button></span>
                  ) : null;
                  if (!column.edit) return <td key={column.id} className="zen-table__cell" data-align={column.align ?? "left"} data-open={open ? "true" : undefined}>{column.cell(row, index)}{open}</td>;
                  return (
                    <td key={column.id} className="zen-table__cell" data-align={column.align ?? "left"} data-editable={editable ? "true" : "false"} data-editing={isEditing ? "true" : undefined} data-open={open ? "true" : undefined}
                      data-cell={`${id}::${column.id}`} tabIndex={editable && !isEditing ? 0 : undefined} aria-describedby={editable ? hintId : undefined}
                      // One press edits (Notion). It starts on mousedown, not click, so a layout shift caused by the previous
                      // cell saving can't swallow the click. The open editor is blurred first so it saves; interactive
                      // content inside the cell (e.g. the Open button) keeps its own click.
                      onMouseDown={editable && !isEditing ? (event) => {
                        if (event.button !== 0 || ownsClick(event.target as Element, event.currentTarget)) return;
                        event.preventDefault();
                        const active = document.activeElement as HTMLElement | null;
                        if (active && rootRef.current?.contains(active)) active.blur();
                        setEditing(cell);
                      } : undefined}
                      onKeyDown={editable && !isEditing ? (event) => onCellKeyDown(event, cell, column) : undefined}
                      onBlur={editable ? (event) => { delete event.currentTarget.dataset.quiet; } : undefined}>
                      {isEditing
                        // The original content stays (hidden) so the column width and row height never change;
                        // the editor overlays the cell.
                        ? <><span className="zen-table__cell-ghost" aria-hidden="true">{column.cell(row, index)}</span><TableCellEditorView editor={column.edit} row={row} initial={editing?.initial} align={column.align ?? "left"}
                            onDone={({ refocus }) => { setEditing((current) => (current?.row === id && current.col === column.id ? null : current)); if (refocus) focusCell(cell, true); }}
                            onMove={(direction) => { const next = neighbour(cell, 0, direction, true); if (next) focusCell(next); }} /></>
                        : <>{column.cell(row, index)}{open}</>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Anything clickable inside a cell (Tag with onClick, links, buttons, inputs, the Open button) keeps its own action;
 *  only a press on the cell itself — its padding or passive content — starts editing. */
const CELL_ACTION = "button, a[href], input, select, textarea, label, summary, [role=button], [role=link], [role=checkbox], [role=switch], [role=menuitem], [role=tab], [tabindex]:not([tabindex='-1']), [data-cell-action]";
function ownsClick(target: Element, cell: Element) {
  const hit = target.closest(CELL_ACTION);
  return Boolean(hit && hit !== cell && cell.contains(hit));
}

/** A fixed column width (Figma FIXED cell) is also the header's min-width: auto table layout treats a <col> width only
 *  as a hint and squeezes it in a narrow container, so dates and names would wrap instead of the table scrolling. */
function fixedWidth(width: string | undefined) {
  return width && !width.trim().endsWith("%") && width.trim() !== "auto" ? { minWidth: width } : undefined;
}

/** Figma Primitives/Table/Cell/Text-Cell (1603:3247): Label (Body/Base Regular or Bold, Strongest) + optional Subtext
 * (Caption/Regular 11/16, Light), gap 3XSmall — the same Subtext every Avatar/Photo/Icon/Dock cell renders. */
export function TableText({ children, caption, bold = false }: { children: ReactNode; caption?: ReactNode; bold?: boolean }) {
  return (
    <span className="zen-table-text">
      <span className={`zen-table-text__label ${typographyStyles[bold ? "Body/Base/Bold" : "Body/Base/Regular"]}`}>{children}</span>
      {caption ? <span className={`zen-table-text__caption ${typographyStyles["Caption/Regular"]}`}>{caption}</span> : null}
    </span>
  );
}

/** Figma Avatar-Cell / Photo-Cell / Basic-Icon-Cell / Dock-Icon-Cell: a visual + Text-Cell (gap Small). The visual follows
 * the Subtext: Avatar/Photo/Dock Icon XSmall 24px (Icon base 20px) without a caption, Small 32px (Icon lg 28px) with one. */
export function TableMedia({ media, children, caption, bold = true }: { media: ReactNode; children: ReactNode; caption?: ReactNode; bold?: boolean }) {
  return (
    <span className="zen-table-media">
      <span className="zen-table-media__visual">{media}</span>
      <TableText caption={caption} bold={bold}>{children}</TableText>
    </span>
  );
}

export type TableTrendDirection = "up" | "down" | "neutral";
/** Figma Trend-Cell (1603:14279): a Medium Subtle Badge — Up green with icon-trend-up-01-line, Down red with
 * icon-trend-down-01-line, Neutral grey with icon-minus-line. */
export function TableTrend({ trend, children }: { trend: TableTrendDirection; children: ReactNode }) {
  const theme = trend === "up" ? "green" : trend === "down" ? "red" : "neutral";
  const icon: IconName = trend === "up" ? "icon-trend-up-01-line" : trend === "down" ? "icon-trend-down-01-line" : "icon-minus-line";
  return <Badge size="medium" theme={theme} background="subtle" leading={<Icon name={icon} decorative />}>{children}</Badge>;
}

/** Figma Badge-Cell (1603:6158): an Items slot of Badge/Size=Medium, gap 2XSmall. */
export function TableBadges({ children }: { children: ReactNode }) {
  return <span className="zen-table-items">{children}</span>;
}

/** Figma Tag-Cell (1603:23304): an Items slot of Tag (Medium), gap 2XSmall. */
export function TableTags({ children }: { children: ReactNode }) {
  return <span className="zen-table-items">{children}</span>;
}

/** Figma Actions-Cell: icon buttons (Button/Icon-Flat Medium), gap XSmall, aligned to the cell's end. */
export function TableActions({ children }: { children: ReactNode }) {
  return <span className="zen-table-actions">{children}</span>;
}
