import type { PageNode, PageTree, PageValue } from "../render/renderPage";

/*
 * The Popover option of a layer that takes a click (user 2026-10-28, answers 2026-10-30: every clickable layer, Options
 * only, Sample or the page's mock, in the Design and the Prototype tab). On: the layer's On click opens an Overlay that
 * holds a Zen Popover (`proto.open("popover-1")`; the Popover sits by the layer in Play, as Figma's Manual overlay by its
 * trigger); a Chip keeps its own popover (`popoverItems`). Its rows are the Popover's items: Sample rows written in place
 * ("Option 1"…), or the first rows of a list of `export const mock`, each field a mock reference
 * (`label: mock.people[0].name`), so the data stays where it is written. Pure: protoModel's tree types only, so
 * popoverModel.selftest.mjs runs it in Node.
 */

/** How many rows a Popover takes, and how many a new one starts with. */
export const POPOVER_ROWS = { min: 1, max: 12, start: 4 } as const;
/** The trigger the Popover option writes (Figma's On click). */
export const POPOVER_TRIGGER = "onClick";
/** Components whose popover is their own prop (no Overlay): Chip's `popoverItems`. */
export const OWN_POPOVER: Readonly<Record<string, string>> = { Chip: "popoverItems" };
/** Layers that take a click but are frames (layout, Figma's frames): the option shows on component layers only. */
const FRAME_LAYERS = new Set(["Board", "Screen", "Overlay", "Section", "Slice", "Stack", "Grid", "Box", "Shape", "Popover", "PopoverItem"]);

/** Does the Popover option show on this layer: it takes a click (`triggers`, protoTriggers.triggersOf) and is not a frame. */
export const takesPopover = (name: string, triggers: readonly string[]) => !FRAME_LAYERS.has(name.split(".")[0]) && (Boolean(OWN_POPOVER[name]) || triggers.includes(POPOVER_TRIGGER));

/** Where a Popover's rows come from: Sample rows (their labels), or the first `rows` of a mock list with the fields each
 *  row shows (label, caption, picture). */
export type PopoverData =
  | { kind: "sample"; labels: string[] }
  | { kind: "mock"; list: string; rows: number; label: string; caption?: string; image?: string };

/** A list of the page's mock that can fill a Popover: objects with a text field. `path`: its place in `mock`
 *  ("people", "team.members"); `fields`: the text fields, `images`: the fields that hold a picture; `ids`: every row has
 *  an `id` (the rows' ids are then references too). */
export type MockList = { path: string; count: number; fields: string[]; images: string[]; ids: boolean };

const IMAGE_FIELD = /photo|avatar|image|picture|src|img/i;
const IMAGE_VALUE = /^(zen-media:|https?:|data:image\/|\/)/;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** The mock's lists of objects (one level of nesting), in written order. */
export function mockLists(mock: Record<string, unknown> | null | undefined): MockList[] {
  const lists: MockList[] = [];
  const visit = (value: unknown, path: string[]) => {
    if (Array.isArray(value)) {
      const rows = value.filter(isRecord);
      if (!rows.length || rows.length !== value.length) return;
      const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
      const text = (key: string) => rows.some((row) => typeof row[key] === "string" || typeof row[key] === "number");
      const images = keys.filter((key) => rows.some((row) => typeof row[key] === "string" && (IMAGE_FIELD.test(key) || IMAGE_VALUE.test(String(row[key])))));
      const fields = keys.filter((key) => key !== "id" && text(key) && !images.includes(key));
      const ids = rows.every((row) => typeof row.id === "string" || typeof row.id === "number");
      if (fields.length) lists.push({ path: path.join("."), count: rows.length, fields, images, ids });
      return;
    }
    if (isRecord(value) && path.length < 2) for (const [key, inner] of Object.entries(value)) visit(inner, [...path, key]);
  };
  if (mock) for (const [key, value] of Object.entries(mock)) visit(value, [key]);
  return lists;
}

/** The field a row's label reads first: a name, title or label, else the list's first text field. */
export const labelField = (list: MockList) => list.fields.find((field) => /^(name|title|label|text)$/i.test(field)) ?? list.fields[0];

/** The rows a mock list starts with: all of it, at most the Popover's max. */
export const mockRows = (list: MockList) => Math.min(list.count, POPOVER_ROWS.max);

/** Sample labels: "Option 1"… (the labels already written keep their words; new rows take the next number). */
export function sampleLabels(count: number, kept: readonly string[] = []): string[] {
  const rows = Math.max(POPOVER_ROWS.min, Math.min(POPOVER_ROWS.max, Math.round(count)));
  return Array.from({ length: rows }, (_, index) => kept[index] ?? `Option ${index + 1}`);
}

const quote = (text: string) => JSON.stringify(text);
const slug = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** A mock path as code: "people" → mock.people, a key that is not a name → mock["…"]. */
const mockPath = (path: string, row: number, field: string) => `mock${[...path.split("."), String(row), field].map((key) => (/^\d+$/.test(key) ? `[${key}]` : /^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${quote(key)}]`)).join("")}`;

/** The items code of a Popover (or a Chip's `popoverItems`). Sample: an id from each label ("option-1"); mock: every
 *  field a reference into the list, its id the row's own `id` when it has one. */
export function popoverItemsCode(data: PopoverData, list?: MockList): string {
  if (data.kind === "sample") {
    const ids = new Set<string>();
    const items = data.labels.map((label, index) => {
      let id = slug(label) || `option-${index + 1}`;
      while (ids.has(id)) id = `${id}-${index + 1}`;
      ids.add(id);
      return `{ id: ${quote(id)}, label: ${quote(label)} }`;
    });
    return `[${items.join(", ")}]`;
  }
  const rows = Math.max(POPOVER_ROWS.min, Math.min(data.rows, list?.count ?? data.rows, POPOVER_ROWS.max));
  const items = Array.from({ length: rows }, (_, index) => {
    const fields = [
      `id: ${list?.ids ? mockPath(data.list, index, "id") : quote(`${slug(data.list.split(".").at(-1) ?? "row")}-${index + 1}`)}`,
      `label: ${mockPath(data.list, index, data.label)}`,
      ...(data.caption ? [`caption: ${mockPath(data.list, index, data.caption)}`] : []),
      ...(data.image ? [`photoSrc: ${mockPath(data.list, index, data.image)}`] : []),
    ];
    return `{ ${fields.join(", ")} }`;
  });
  return `[${items.join(", ")}]`;
}

/** A ref value's mock path and row ("mock.people[2].name" → { list: "people", row: 2, field: "name" }), else null. */
function refOf(value: PageValue | undefined): { list: string; row: number; field: string } | null {
  if (value?.kind !== "ref" || value.root !== "mock" || value.path.length < 3) return null;
  const field = value.path.at(-1)!;
  const row = Number(value.path.at(-2));
  return Number.isInteger(row) ? { list: value.path.slice(0, -2).join("."), row, field } : null;
}

/** Where the rows of a written items value come from (the Popover's `items`, a Chip's `popoverItems`): mock when every
 *  row's label is the same list's field, row by row from the first; else Sample with each row's label. Null when the
 *  value is not a list of rows written in the page (code of its own, a whole mock list). */
export function popoverDataOf(value: PageValue | undefined): PopoverData | null {
  if (value?.kind !== "array") return null;
  const rows = value.items.map((item) => (item.kind === "object" ? item.fields : null));
  if (rows.some((row) => !row)) return null;
  const labels = rows.map((row) => refOf(row!.label));
  const first = labels[0];
  if (first && labels.every((ref, index) => ref && ref.list === first.list && ref.field === first.field && ref.row === index)) {
    const fieldOf = (name: string) => { const ref = refOf(rows[0]![name]); return ref && ref.list === first.list ? ref.field : undefined; };
    return { kind: "mock", list: first.list, rows: rows.length, label: first.field, caption: fieldOf("caption"), image: fieldOf("photoSrc") };
  }
  return { kind: "sample", labels: rows.map((row) => { const label = row!.label; return label?.kind === "literal" && (typeof label.value === "string" || typeof label.value === "number") ? String(label.value) : ""; }) };
}

/** The Popover an Overlay holds (its first layer), else null. */
export const popoverIn = (overlay: PageNode | null | undefined): PageNode | null => {
  const first = overlay?.children.find((child): child is PageNode => child.kind === "element");
  return first && first.name === "Popover" ? first : null;
};

/** The code of a new Overlay holding a Popover with `items` (a pick closes it). `title`: the frame's name. */
export function popoverOverlayCode(id: string, title: string, items: string): string {
  return [`<Overlay id=${quote(id)} title=${quote(title.replace(/[{}<>]/g, ""))}>`, `  <Popover items={${items}} onSelect={proto.close()} />`, "</Overlay>"].join("\n");
}

/** The Overlay the layer's On click opens when it holds a Popover: { id, overlay, popover }; else null. */
export function popoverOpenedBy(tree: PageTree | null, node: PageNode, trigger = POPOVER_TRIGGER): { id: string; overlay: PageNode; popover: PageNode } | null {
  const value = node.props[trigger];
  if (value?.kind !== "proto" || value.action !== "open" || typeof value.args[0] !== "string") return null;
  const id = value.args[0];
  const overlay = (tree?.board?.children ?? []).find((child): child is PageNode => child.kind === "element" && child.name === "Overlay" && child.props.id?.kind === "literal" && child.props.id.value === id);
  const popover = popoverIn(overlay);
  return overlay && popover ? { id, overlay, popover } : null;
}

/** How many layers of the page open the Overlay `id` (every `proto.open("id")`, per-item targets included). */
export function openersOf(tree: PageTree | null, id: string): number {
  let count = 0;
  const value = (entry: PageValue | undefined): void => {
    if (!entry) return;
    if (entry.kind === "proto") {
      const target = entry.args[0];
      if (entry.action === "open" && (target === id || (target && typeof target === "object" && Object.values(target as Record<string, unknown>).includes(id)))) count += 1;
    } else if (entry.kind === "array") entry.items.forEach(value);
    else if (entry.kind === "object") Object.values(entry.fields).forEach(value);
    else if (entry.kind === "element") node(entry.node);
    else if (entry.kind === "fragment") entry.children.forEach(child);
  };
  const child = (entry: PageNode["children"][number]) => { if (entry.kind === "element") node(entry); else if (entry.kind === "map") node(entry.node); };
  const node = (entry: PageNode) => { Object.values(entry.props).forEach(value); entry.children.forEach(child); };
  if (tree?.board) node(tree.board);
  return count;
}

/** The popover id a new one takes ("popover-1", "popover-2"…), free among the page's frames. */
export function freePopoverId(tree: PageTree | null): string {
  const taken = new Set((tree?.board?.children ?? []).map((child) => (child.kind === "element" && child.props.id?.kind === "literal" ? String(child.props.id.value) : "")));
  for (let n = 1; ; n += 1) if (!taken.has(`popover-${n}`)) return `popover-${n}`;
}
