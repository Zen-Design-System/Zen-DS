import { Fragment, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { dataAttributes } from "../_shared/data-attributes";
import { TableText } from "../Table";
import { typographyStyles } from "../../tokens/typography.generated";
import "./sheet-table.css";

/**
 * One column of a SheetTable (Figma Table/Sheet: a Table/Cell/Header over Table/Sheet/Cell instances, page ❖ Table
 * 1595:2631, doc frame 17100:7996).
 */
export interface SheetTableColumn<T> {
  id: string;
  /** Figma Table/Cell/Header Label (All-Caps/S, Content/Neutral/Light). */
  header: ReactNode;
  /**
   * CSS width, e.g. "18%" or "160px". Give the name and value columns a width and leave the long one (a description,
   * an action) without one so it takes the rest (Figma FILL).
   */
  width?: string;
  /**
   * The cell's content for a row (Figma Table/Sheet/Cell's Content slot): `TableText` for words (bold for the row's
   * name), `SheetCode` for code (a prop, a type, a signature), `SheetKeys` for a shortcut. It wraps; nothing is cut.
   * Without it the column draws its `content` from the row's `field`.
   */
  cell?: (row: T, index: number) => ReactNode;
  /** What the column's cells draw when there is no `cell` (default `text`): the row's `field` as words (a Text-Cell),
   *  as code (SheetCode) or as a shortcut (SheetKeys, "Shift + Tab / Tab"). */
  content?: SheetTableContent;
  /** The row field the cell draws (default: the column's id). */
  field?: string;
  /** Text content in Body/Base/Bold, for the row's name. */
  bold?: boolean;
}

/** Figma Table/Sheet/Cell Content: Primitives/Table/Cell/Text-Cell, .Primitives/Table/Sheet/Code or Key chips. */
export const sheetTableContents = ["text", "code", "keys"] as const;
export type SheetTableContent = (typeof sheetTableContents)[number];

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root element, the scroll box. */
export interface SheetTableProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The root element (the scroll box around the `<table>`). */
  ref?: Ref<HTMLDivElement>;
  columns: SheetTableColumn<T>[];
  /** The items, one row each. */
  rows: readonly T[];
  /** A stable, unique id per row (React keys). Default: the row's `id` field, else its position. */
  getRowId?: (row: T, index: number) => string;
  /** Names the sheet for screen readers when there is no visible `caption` (or use `aria-labelledby`). */
  "aria-label"?: string;
  /** Visible caption above the sheet (Heading/4), which also names it. */
  caption?: ReactNode;
  /**
   * The narrowest the columns may get, a CSS length (e.g. "680px"): a narrower container scrolls the sheet sideways
   * instead of squeezing its columns into a word per line. Leave it unset for two short columns.
   */
  minWidth?: string;
  /** Rendered in a full-width row when `rows` is empty (e.g. "No keyboard shortcuts"). */
  empty?: ReactNode;
  className?: string;
}

/** A column's cell for a row: its `cell`, else the row's `field` drawn as its `content`. */
function cellOf<T>(column: SheetTableColumn<T>, row: T, index: number): ReactNode {
  if (column.cell) return column.cell(row, index);
  const value = row !== null && typeof row === "object" ? (row as Record<string, unknown>)[column.field ?? column.id] : undefined;
  if (value === undefined || value === null || value === "") return null;
  const words = String(value);
  if (column.content === "code") return <SheetCode>{words}</SheetCode>;
  if (column.content === "keys") return <SheetKeys value={words} />;
  return <TableText bold={column.bold}>{words}</TableText>;
}

const rowIdOf = (row: unknown, index: number) => {
  const own = row !== null && typeof row === "object" ? (row as { id?: unknown }).id : undefined;
  return typeof own === "string" || typeof own === "number" ? String(own) : `row-${index}`;
};

/**
 * Figma Table/Sheet (page ❖ Table, doc frame 17100:7996; cell set Table/Sheet/Cell 17100:8027): reference rows whose
 * text runs long — props and their types, API signatures, keyboard shortcuts, token values. Each row grows with its
 * content from a Table/Cell/Size minimum, aligned to the top, so every line is read; a Table keeps one-line rows and
 * cuts long text (user rule 2026-10-13). Header: Table/Cell/Header (Table/Header/Size, All-Caps/S, Content/Neutral/
 * Light). Cells: Spacing/Padding/Small × Medium, Table-Cell/Background/Default, a 1px Border/Neutral/Pale rule under
 * every row but the last (Divider=No). Static: no sorting, selection or row clicks — those rows belong in a Table.
 */
export function SheetTable<T>({ ref, columns, rows, getRowId = (row, index) => rowIdOf(row, index), "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, caption, minWidth, empty, className, ...rest }: SheetTableProps<T>) {
  return (
    <div {...rest} ref={ref} className={["zen-sheet-table", className].filter(Boolean).join(" ")}>
      <table className="zen-sheet-table__table" style={minWidth ? { minWidth } : undefined} aria-label={caption ? undefined : ariaLabel} aria-labelledby={ariaLabelledBy} aria-describedby={ariaDescribedBy}>
        {/* Table titles are Heading/4, as on Table. */}
        {caption ? <caption className={`zen-sheet-table__caption ${typographyStyles["Heading/4"]}`}>{caption}</caption> : null}
        <colgroup>
          {columns.map((column) => <col key={column.id} style={column.width ? { width: column.width } : undefined} />)}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col" className="zen-sheet-table__header">
                <span className={typographyStyles["All-Caps/S"]}>{column.header}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty ? <tr className="zen-sheet-table__row"><td className="zen-sheet-table__cell" colSpan={columns.length}>{empty}</td></tr> : null}
          {rows.map((row, index) => (
            <tr key={getRowId(row, index)} className="zen-sheet-table__row">
              {columns.map((column) => (
                <td key={column.id} className="zen-sheet-table__cell">
                  <div className="zen-sheet-table__content">{cellOf(column, row, index)}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Figma .Primitives/Table/Sheet/Code (17100:8013): a code value in a SheetTable cell — a prop name, a type union, a
 * signature, a default. Body/Code/Regular in Content/Neutral/Strongest; it wraps, never cuts.
 */
export function SheetCode({ ref, children, ...rest }: {
  /** Forwarded to the root `<code>` element. */
  ref?: Ref<HTMLElement>;
  /** The code, as plain text. */
  children: ReactNode;
}) {
  return <code {...dataAttributes(rest)} ref={ref} className={`zen-sheet-code ${typographyStyles["Body/Code/Regular"]}`}>{children}</code>;
}

/**
 * Figma .Primitives/Table/Sheet/Key (17100:8015): one keyboard key (Tab, Shift, →, Esc) as a chip — Element-Size/Popular/
 * Base minimum, Spacing/Padding/2XSmall sides, Corner-Radius/2XSmall, Background/Neutral/Pale with a Border/Neutral/Pale
 * ring and a 2px foot, Body/Code/Regular in Content/Neutral/Strongest.
 */
export function SheetKey({ ref, children, ...rest }: {
  /** Forwarded to the root `<kbd>` element. */
  ref?: Ref<HTMLElement>;
  /** The key's name, as printed on it ("Shift", "Tab", "→"). */
  children: ReactNode;
}) {
  return <kbd {...dataAttributes(rest)} ref={ref} className={`zen-sheet-key ${typographyStyles["Body/Code/Regular"]}`}>{children}</kbd>;
}

/** The words between keys that SheetKeys draws as separators (not as keys). */
const SEPARATOR = /^\s*(\+|\/|then)\s*$/;

/**
 * A shortcut written as text — "Shift + Tab / Tab", "G then I" — as SheetKey chips with their separators between them:
 * Spacing/Gap/2XSmall apart, the separators in Body/Small/Regular, Content/Neutral/Light (Figma Table/Sheet Keyboard
 * example). `+` joins keys pressed together, `/` separates alternatives, `then` a sequence.
 */
export function SheetKeys({ ref, value, ...rest }: {
  /** Forwarded to the root `<span>` element. */
  ref?: Ref<HTMLSpanElement>;
  /** The shortcut: keys joined by " + ", " / " or " then ". */
  value: string;
}) {
  const parts = value.split(/(\s*[+/]\s*|\s+then\s+)/).filter((part) => part.trim());
  return (
    <span {...dataAttributes(rest)} ref={ref} className="zen-sheet-keys">
      {parts.map((part, index) => (
        <Fragment key={index}>
          {SEPARATOR.test(part)
            ? <span className={`zen-sheet-keys__separator ${typographyStyles["Body/Small/Regular"]}`}>{part.trim()}</span>
            : <SheetKey>{part.trim()}</SheetKey>}
        </Fragment>
      ))}
    </span>
  );
}
