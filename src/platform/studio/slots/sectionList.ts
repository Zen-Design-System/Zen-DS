import type { ObjectShape, ShapeField, SourceElement } from "../types";
import type { DataSlot } from "./dataSlots";

/*
 * A nested data slot as Figma's slot holds it (Sidebar Body-Content; user, 2026-10-10: "Figma không phân biệt content
 * section hay content không … chỉ khác có section title hay không"): one flat list of Section-Title and Menu-Item
 * instances. The code keeps groups (`sections[n]`: its label and other fields, and its `items`); in the list a title
 * opens a group, and rows before the first title make an untitled one. Structural edits write the whole list back at
 * once (op setItems), so titles and rows move, merge and go as freely as in Figma.
 *
 * Pure: type-only imports.
 */

export type SectionEntry =
  /** A group's title row: the group's own fields (label, action…), without its list. */
  | { kind: "title"; group: number; fields: ShapeField[] }
  /** A row: its fields, its group and its place in that group's list. */
  | { kind: "item"; group: number; index: number; fields: ShapeField[] }
  /** A divider row (DataSlot `grouped`: Menu `{ type: "separator" }`). */
  | { kind: "separator"; fields: ShapeField[] };

/**
 * The slot's titles and rows in order; [] when the prop is not written; null when the code builds the list (a const, a
 * spread, a computed list): the Studio cannot write it back.
 */
export function sectionEntries(element: SourceElement, slot: DataSlot): SectionEntry[] | null {
  if (!slot.nested && !slot.grouped) return null;
  const attr = element.attributes.filter((candidate) => candidate.kind !== "spread" && candidate.name === slot.prop).at(-1);
  if (!attr) return [];
  const shape = attr.kind === "expression" && !attr.shapeVia ? attr.shape : undefined;
  if (shape?.type !== "array") return null;
  if (slot.grouped) return groupedEntries(shape.items, slot.grouped);
  const out: SectionEntry[] = [];
  for (const [group, holder] of shape.items.entries()) {
    if (holder.type !== "object" || holder.fields.some((field) => field.kind === "spread")) return null;
    const list = holder.fields.find((field) => field.key === slot.nested);
    const items = list?.kind === "expression" ? list.shape : undefined;
    if (list && (items?.type !== "array" || items.items.some((item) => item.type !== "object"))) return null;
    const own = holder.fields.filter((field) => field.key !== slot.nested);
    // Every group starts with its title row but the untitled top group (Figma: rows before the first Section-Title).
    if (group > 0 || own.length) out.push({ kind: "title", group, fields: own });
    (items?.type === "array" ? items.items : []).forEach((item, index) => out.push({ kind: "item", group, index, fields: (item as ObjectShape).fields }));
  }
  return out;
}

type Grouped = NonNullable<DataSlot["grouped"]>;
const typeOf = (fields: readonly ShapeField[], grouped: Grouped) => {
  const field = fields.find((candidate) => candidate.key === grouped.typeKey);
  return field?.kind === "string" ? field.value : null;
};

/** Menu-like lists: items, separators and groups (a title, then the group's own items and separators) in order. */
function groupedEntries(items: ReadonlyArray<ObjectShape | { type: "value" }>, grouped: Grouped): SectionEntry[] | null {
  const out: SectionEntry[] = [];
  for (const [top, entry] of items.entries()) {
    if (entry.type !== "object" || entry.fields.some((field) => field.kind === "spread")) return null;
    const kind = typeOf(entry.fields, grouped);
    if (kind === grouped.separator) { out.push({ kind: "separator", fields: entry.fields }); continue; }
    if (kind !== grouped.group) { out.push({ kind: "item", group: -1, index: top, fields: entry.fields }); continue; }
    const list = entry.fields.find((field) => field.key === grouped.list);
    const inner = list?.kind === "expression" ? list.shape : undefined;
    if (list && (inner?.type !== "array" || inner.items.some((item) => item.type !== "object"))) return null;
    out.push({ kind: "title", group: top, fields: entry.fields.filter((field) => field.key !== grouped.list) });
    (inner?.type === "array" ? inner.items as ObjectShape[] : []).forEach((item, index) => {
      out.push(typeOf(item.fields, grouped) === grouped.separator ? { kind: "separator", fields: item.fields } : { kind: "item", group: top, index, fields: item.fields });
    });
  }
  return out;
}

/** A title row's name: its label, else that it has none (a group the code leaves untitled). */
export const titleOf = (entry: Extract<SectionEntry, { kind: "title" }>) => {
  const label = entry.fields.find((field) => field.key === "label");
  return label?.kind === "string" && label.value.trim() ? label.value : "Untitled section";
};

const KEY = /^[A-Za-z_$][\w$]*$/;
const fieldCode = (field: ShapeField) => (field.kind === "spread"
  ? `...${field.value}`
  : `${KEY.test(field.key) ? field.key : JSON.stringify(field.key)}: ${field.kind === "string" ? JSON.stringify(field.value) : String(field.value)}`);
const objectCode = (fields: readonly ShapeField[]) => (fields.length ? `{ ${fields.map(fieldCode).join(", ")} }` : "{}");

/** The list back as one array literal (a title opens a group, rows before any title an untitled one); null when empty. */
export function sectionsCode(entries: readonly SectionEntry[], slot: DataSlot): string | null {
  if (slot.grouped) return groupedCode(entries, slot.grouped);
  if (!slot.nested) return null;
  const groups: Array<{ fields: readonly ShapeField[]; items: Array<readonly ShapeField[]> }> = [];
  for (const entry of entries) {
    if (entry.kind === "title") groups.push({ fields: entry.fields, items: [] });
    else {
      if (!groups.length) groups.push({ fields: [], items: [] });
      groups[groups.length - 1].items.push(entry.fields);
    }
  }
  if (!groups.length) return null;
  const key = KEY.test(slot.nested) ? slot.nested : JSON.stringify(slot.nested);
  const lines = ["["];
  for (const group of groups) {
    const head = group.fields.map(fieldCode).join(", ");
    const open = `  { ${head}${head ? ", " : ""}${key}: [`;
    if (!group.items.length) { lines.push(`${open}] },`); continue; }
    lines.push(open);
    for (const item of group.items) lines.push(`    ${objectCode(item)},`);
    lines.push("  ] },");
  }
  lines.push("]");
  return lines.join("\n");
}

/** Menu-like lists back as code: rows before any title at the top level; a title opens a group that takes what follows. */
function groupedCode(entries: readonly SectionEntry[], grouped: Grouped): string | null {
  if (!entries.length) return null;
  const key = KEY.test(grouped.list) ? grouped.list : JSON.stringify(grouped.list);
  const lines = ["["];
  let open = false;
  const close = () => { if (open) lines.push("  ] },"); open = false; };
  for (const entry of entries) {
    if (entry.kind === "title") {
      close();
      const head = entry.fields.map(fieldCode).join(", ");
      lines.push(`  { ${head}${head ? ", " : ""}${key}: [`);
      open = true;
    } else lines.push(`${open ? "    " : "  "}${objectCode(entry.fields)},`);
  }
  close();
  lines.push("]");
  return lines.join("\n").replace(/: \[\n {2}\] \},/g, ": [] },");
}

/** The fields of a new row's code (DataSlot newItem: a flat `{ id: "…", label: "…", icon: "…" }` literal). */
export function rowFields(code: string): ShapeField[] {
  const out: ShapeField[] = [];
  for (const match of code.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false)/g)) {
    const [, key, raw] = match;
    if (raw.startsWith('"')) out.push({ key, kind: "string", value: JSON.parse(raw) as string });
    else if (raw === "true" || raw === "false") out.push({ key, kind: "boolean", value: raw === "true" });
    else out.push({ key, kind: "number", value: Number(raw) });
  }
  return out;
}

/** A copy of a row with fresh string `id` / `value` / `key` (React keys stay unique), as the item ops' duplicateItem. */
export function freshRow(fields: readonly ShapeField[], taken: ReadonlySet<string>): ShapeField[] {
  return fields.map((field) => {
    if (field.kind !== "string" || !["id", "value", "key"].includes(field.key)) return field;
    const base = field.value.replace(/-\d+$/, "");
    let n = 2;
    while (taken.has(`${base}-${n}`)) n += 1;
    return { ...field, value: `${base}-${n}` };
  });
}
