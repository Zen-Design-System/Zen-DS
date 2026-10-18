/*
 * The Variables window's model (pure, erasable TypeScript: variablesModel.selftest.mjs imports it directly). Figma's
 * Local variables table for one collection: its groups tree, the rows (a header before each group, then its
 * variables) filtered by group, search and type, and the values as the cells show them (aliases followed).
 */

export type VariableType = "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
export type VariableValue = string | number | boolean;
export type Variable = { name: string; type: VariableType; valuesByMode: Record<string, VariableValue> };
export type Collection = { file: string; name: string; modes: string[]; tokens: Variable[]; hash?: string; draft?: boolean };
export type Entry = { variable: Variable; collection: Collection };

export const TYPE_LABEL: Readonly<Record<VariableType, string>> = { COLOR: "Color", FLOAT: "Number", STRING: "String", BOOLEAN: "Boolean" };

export const aliasOf = (value: unknown): string | null => (typeof value === "string" ? /^\{(.+)\}$/.exec(value)?.[1] ?? null : null);
export const shortName = (name: string) => name.slice(name.lastIndexOf("/") + 1);
export const groupOf = (name: string) => (name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : "");

/** Every variable of every collection by name. */
export function indexOf(collections: readonly Collection[]): Map<string, Entry> {
  const index = new Map<string, Entry>();
  for (const collection of collections) for (const variable of collection.tokens) index.set(variable.name, { variable, collection });
  return index;
}

/** The value `name` shows in `mode`, aliases followed (into another collection: its mode of that name, else its first). */
export function resolved(index: ReadonlyMap<string, Entry>, name: string, mode: string, seen: Set<string> = new Set()): VariableValue | null {
  const entry = index.get(name);
  if (!entry || seen.has(name)) return null;
  seen.add(name);
  const modes = entry.collection.modes;
  const own = modes.includes(mode) ? mode : modes[0];
  const value = entry.variable.valuesByMode[own];
  const target = aliasOf(value);
  return target ? resolved(index, target, mode, seen) : value ?? null;
}

export type GroupNode = { path: string; label: string; depth: number; count: number };

/** A collection's groups as Figma's tree: every "/" prefix of its names, in order of first use, with its variable count. */
export function groupsOf(collection: Collection): GroupNode[] {
  const nodes = new Map<string, GroupNode>();
  for (const variable of collection.tokens) {
    const parts = variable.name.split("/").slice(0, -1);
    for (let depth = 0; depth < parts.length; depth += 1) {
      const path = parts.slice(0, depth + 1).join("/");
      const node = nodes.get(path) ?? { path, label: parts[depth], depth, count: 0 };
      node.count += 1;
      nodes.set(path, node);
    }
  }
  // Depth-first: a group, then the groups inside it (as the tree reads), keeping first-use order among siblings.
  const children = new Map<string, GroupNode[]>();
  for (const node of nodes.values()) {
    const parent = node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "";
    children.set(parent, [...(children.get(parent) ?? []), node]);
  }
  const out: GroupNode[] = [];
  const walk = (parent: string) => { for (const node of children.get(parent) ?? []) { out.push(node); walk(node.path); } };
  walk("");
  return out;
}

export type Row = { kind: "group"; path: string } | { kind: "variable"; variable: Variable };

const fold = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

/**
 * The table's rows: the variables in `group` ("" = all) and below it, whose name holds every word of `query`, of
 * `type` (null = any), group by group as the groups tree reads (Figma's sections: one header per group, all its
 * variables under it, in their own order), whatever order the source file writes them in (user, 2026-10-17: Brand/1,
 * Brand-Alpha/1, Brand/2… showed "Light / Brand" twice).
 */
export function rowsOf(collection: Collection, { group = "", query = "", type = null }: { group?: string; query?: string; type?: VariableType | null } = {}): Row[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const rank = new Map(groupsOf(collection).map((node, index) => [node.path, index]));
  const shown = collection.tokens.filter((variable) => {
    if (group && variable.name !== group && !variable.name.startsWith(`${group}/`)) return false;
    if (type && variable.type !== type) return false;
    return !words.length || words.every((word) => fold(variable.name).includes(word));
  });
  // A stable sort: the variables of one group keep the order they are written in.
  const ordered = shown.map((variable, index) => ({ variable, index, at: rank.get(groupOf(variable.name)) ?? -1 })).sort((a, b) => a.at - b.at || a.index - b.index);
  const rows: Row[] = [];
  let last: string | null = null;
  for (const { variable } of ordered) {
    const path = groupOf(variable.name);
    if (path !== last) { rows.push({ kind: "group", path }); last = path; }
    rows.push({ kind: "variable", variable });
  }
  return rows;
}

/** "#RRGGBB" / "#RRGGBBAA" → the hex without alpha and the opacity in % (0–100). */
export function colorParts(value: unknown): { hex: string; alpha: number } | null {
  const match = typeof value === "string" ? /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(value) : null;
  if (!match) return null;
  return { hex: `#${match[1].toUpperCase()}`, alpha: match[2] ? Math.round((parseInt(match[2], 16) / 255) * 100) : 100 };
}

/** A hex and an opacity % → the file's spelling: "#RRGGBB" when opaque, else "#RRGGBBAA". */
export function colorWith(hex: string, alpha: number): string {
  const clean = hex.replace(/^#/, "").toUpperCase();
  const a = Math.max(0, Math.min(100, Math.round(alpha)));
  return a >= 100 ? `#${clean}` : `#${clean}${Math.round((a / 100) * 255).toString(16).padStart(2, "0").toUpperCase()}`;
}

/** A free name for a new `type` variable in `group`: "Color/Content/New colour", numbered when taken. */
export function newName(group: string, type: VariableType, taken: ReadonlySet<string>): string {
  const base = `${group ? `${group}/` : ""}New ${TYPE_LABEL[type].toLowerCase()}`;
  let name = base;
  for (let n = 2; taken.has(name); n += 1) name = `${base} ${n}`;
  return name;
}

/** What a value of `self` (a `type` variable) may alias: every variable of that type but itself and those reading it. */
export function aliasOptions(index: ReadonlyMap<string, Entry>, type: VariableType, self: string): Entry[] {
  const reaches = new Map<string, boolean>();
  const readsSelf = (name: string, trail: Set<string>): boolean => {
    if (name === self) return true;
    const known = reaches.get(name);
    if (known !== undefined) return known;
    if (trail.has(name)) return false;
    trail.add(name);
    const entry = index.get(name);
    const result = Boolean(entry && Object.values(entry.variable.valuesByMode).some((value) => { const next = aliasOf(value); return next ? readsSelf(next, trail) : false; }));
    reaches.set(name, result);
    return result;
  };
  return [...index.values()].filter((entry) => entry.variable.type === type && entry.variable.name !== self && !readsSelf(entry.variable.name, new Set()));
}
