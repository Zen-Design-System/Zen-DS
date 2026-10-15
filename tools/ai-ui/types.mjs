// Type text (react-docgen output in docs/api/*.json) → a JSON-Schema subset the AI UI runtime validates against
// (src/ai-ui/validate.mjs) and other tools can read (Zod, Ajv). Node only: shared aliases that docs/api does not
// declare (ZenScaleInput, ContentTone, the typography style names, `(typeof list)[number]`) are read from the TypeScript
// source with @babel/parser, as tools/usage-guard/check-unions.mjs does.
//
//   const schema = typeSchema('"sm" | "md" | number', ctx) → { anyOf: [{ enum: ["sm", "md"] }, { type: "number" }] }
//   x-kind marks what JSON cannot say: node (ReactNode: text or an element), element (ReactElement only), icon
//   (an IconName), date (ISO string → Date), action (a handler the spec binds with { "$action": … }).
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { EXCLUDED_TYPE_RE } from "./catalog.config.mjs";

/* ── text helpers (as tools/studio/compile-api-build.mjs) ────────────────────────────────────────────────────────── */

/** Splits `text` at its top-level `separator` (brackets, generics and strings nest; an arrow's `>` closes nothing). */
export function splitTop(text, separator) {
  const parts = [];
  let depth = 0, quote = "", start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote) { if (char === quote && text[index - 1] !== "\\") quote = ""; continue; }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if ("(<[{".includes(char)) depth++;
    else if (")]}".includes(char) || (char === ">" && text[index - 1] !== "=")) depth--;
    else if (depth === 0 && text.startsWith(separator, index)) { parts.push(text.slice(start, index)); start = index + separator.length; }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
const unparen = (text) => { let t = text.trim(); while (t.startsWith("(") && t.endsWith(")") && splitTop(t.slice(1, -1), "|").length >= 1 && balanced(t.slice(1, -1))) t = t.slice(1, -1).trim(); return t; };
function balanced(text) { let depth = 0; for (const char of text) { if ("(<[{".includes(char)) depth++; else if (")]}>".includes(char)) depth--; if (depth < 0) return false; } return depth === 0; }

/** `(a: A) => R` when the whole type is one arrow; null otherwise. */
export function arrowOf(type) {
  const text = unparen(type);
  if (!text.startsWith("(")) return null;
  const parts = splitTop(text, "=>");
  if (parts.length !== 2 || splitTop(text, "|").length !== 1) return null;
  const params = splitTop(parts[0].slice(1, -1), ",").map((param) => {
    const m = /^(?:\.\.\.)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/.exec(param.trim());
    return m ? { name: m[1], optional: Boolean(m[2]), type: m[3].trim() } : { name: param.trim(), optional: false, type: "unknown" };
  });
  return { params, returns: parts[1].trim() };
}

/* ── TypeScript source resolver ──────────────────────────────────────────────────────────────────────────────────── */

const modules = new Map();
function moduleOf(file) {
  if (modules.has(file)) return modules.get(file);
  let ast = null;
  try { ast = parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["typescript", "jsx"] }); } catch { ast = null; }
  const info = { file, aliases: new Map(), arrays: new Map(), objects: new Map(), imports: new Map(), reexports: [] };
  for (const statement of ast?.program.body ?? []) {
    const node = statement.type === "ExportNamedDeclaration" && statement.declaration ? statement.declaration : statement;
    if (node.type === "TSTypeAliasDeclaration") info.aliases.set(node.id.name, node.typeAnnotation);
    else if (node.type === "VariableDeclaration") {
      for (const decl of node.declarations) {
        let init = decl.init;
        if (init?.type === "TSAsExpression" || init?.type === "TSSatisfiesExpression") init = init.expression;
        if (decl.id.type !== "Identifier") continue;
        if (init?.type === "ArrayExpression") info.arrays.set(decl.id.name, init);
        if (init?.type === "ObjectExpression") info.objects.set(decl.id.name, init);
      }
    } else if (statement.type === "ImportDeclaration" && statement.source.value.startsWith(".")) {
      for (const spec of statement.specifiers) if (spec.type === "ImportSpecifier") info.imports.set(spec.local.name, { from: statement.source.value, name: spec.imported.name ?? spec.imported.value });
    } else if ((statement.type === "ExportNamedDeclaration" || statement.type === "ExportAllDeclaration") && statement.source?.value.startsWith(".")) {
      info.reexports.push(statement.source.value);
    }
  }
  modules.set(file, info);
  return info;
}
const resolveFile = (base) => [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")].find((candidate) => fs.existsSync(candidate));

/** Where `name` (an alias, an `as const` array or an object) is declared, starting from `file` and following imports and re-exports. */
function declaring(file, name, seen = new Set()) {
  if (!file || seen.has(file) || seen.size > 24) return null;
  seen.add(file);
  const info = moduleOf(file);
  if (info.aliases.has(name) || info.arrays.has(name) || info.objects.has(name)) return info;
  const imported = info.imports.get(name);
  if (imported) { const found = declaring(resolveFile(path.resolve(path.dirname(file), imported.from)), imported.name, seen); if (found) return found; }
  for (const source of info.reexports) { const found = declaring(resolveFile(path.resolve(path.dirname(file), source)), name, seen); if (found) return found; }
  return null;
}

/** The literal members of an `as const` array (strings and numbers; spreads followed), or null. */
function arrayValues(info, name, depth = 0) {
  const owner = declaring(info.file, name);
  const array = owner?.arrays.get(name);
  if (!array || depth > 6) return null;
  const out = [];
  for (const element of array.elements) {
    if (element?.type === "StringLiteral") out.push(element.value);
    else if (element?.type === "NumericLiteral") out.push(element.value);
    else if (element?.type === "SpreadElement" && element.argument.type === "Identifier") { const inner = arrayValues(owner, element.argument.name, depth + 1); if (!inner) return null; out.push(...inner); }
    else return null;
  }
  return out;
}

/** The literal members of a type node (unions, aliases, `(typeof list)[number]`, `keyof typeof object`), or null. */
function literalsOf(info, node, depth = 0) {
  if (!node || depth > 8) return null;
  switch (node.type) {
    case "TSLiteralType": return node.literal.type === "StringLiteral" || node.literal.type === "NumericLiteral" ? [node.literal.value] : null;
    case "TSUnionType": { const out = []; for (const member of node.types) { if (member.type === "TSUndefinedKeyword") continue; const values = literalsOf(info, member, depth + 1); if (!values) return null; out.push(...values); } return out; }
    case "TSParenthesizedType": return literalsOf(info, node.typeAnnotation, depth + 1);
    case "TSIndexedAccessType": {
      const object = node.objectType.type === "TSParenthesizedType" ? node.objectType.typeAnnotation : node.objectType;
      return object.type === "TSTypeQuery" && object.exprName.type === "Identifier" && node.indexType.type === "TSNumberKeyword" ? arrayValues(info, object.exprName.name, depth + 1) : null;
    }
    case "TSTypeOperator": {
      // keyof typeof object → the object's keys
      if (node.operator !== "keyof" || node.typeAnnotation.type !== "TSTypeQuery" || node.typeAnnotation.exprName.type !== "Identifier") return null;
      const owner = declaring(info.file, node.typeAnnotation.exprName.name);
      const object = owner?.objects.get(node.typeAnnotation.exprName.name);
      return object ? object.properties.map((p) => (p.key?.type === "StringLiteral" ? p.key.value : p.key?.type === "Identifier" ? p.key.name : null)).filter((k) => k !== null) : null;
    }
    case "TSTypeReference": {
      if (node.typeName.type !== "Identifier" || node.typeParameters) return null;
      const owner = declaring(info.file, node.typeName.name);
      return owner?.aliases.has(node.typeName.name) ? literalsOf(owner, owner.aliases.get(node.typeName.name), depth + 1) : null;
    }
    default: return null;
  }
}

/** Shared aliases a component file uses without importing them by name (its props name a type built on them). */
const SHARED_TYPE_FILES = {
  ZenScaleInput: "src/components/_shared/scale.ts", ZenScale: "src/components/_shared/scale.ts", ZenScaleLong: "src/components/_shared/scale.ts",
  ZenGap: "src/components/_shared/scale.ts", ZenPadding: "src/components/_shared/scale.ts", ZenRadius: "src/components/_shared/scale.ts",
  ContentTone: "src/components/_shared/contentTone.ts", TypographyStyleName: "src/tokens/typography.generated.ts",
};

function ownerOf(file, name, root) {
  const owner = declaring(file, name);
  if (owner) return owner;
  const shared = SHARED_TYPE_FILES[name];
  return shared ? declaring(path.resolve(root ?? process.cwd(), shared), name) : null;
}

/** Members of a named type in `file`'s reach, by the TypeScript source; null when it is not a closed literal union. */
export function sourceLiterals(file, name, root) {
  const owner = ownerOf(file, name, root);
  if (!owner) return null;
  if (owner.aliases.has(name)) return literalsOf(owner, owner.aliases.get(name));
  return arrayValues(owner, name);
}

/** The source text of a type alias (`type GridTracks = number | string` → "number | string") and its file, or null. */
export function sourceAliasText(file, name, root) {
  const owner = ownerOf(file, name, root);
  const node = owner?.aliases.get(name);
  if (!node) return null;
  try { return { text: fs.readFileSync(owner.file, "utf8").slice(node.start, node.end), file: owner.file }; } catch { return null; }
}

/** Literal members of a type expression written in text (`keyof typeof typographyStyles`, `(typeof headingLevels)[number]`) resolved from `file`. */
export function sourceLiteralsOfText(file, text) {
  try {
    const ast = parse(`type __T = ${text};`, { sourceType: "module", plugins: ["typescript"] });
    const decl = ast.program.body[0];
    return decl?.type === "TSTypeAliasDeclaration" ? literalsOf(moduleOf(file), decl.typeAnnotation) : null;
  } catch { return null; }
}

/* ── type text → schema ──────────────────────────────────────────────────────────────────────────────────────────── */

const BUILTIN_ANY = /^(unknown|any|T|object|{}|never)$/;
const ACTION_RETURNS = /^(void|Promise<void>|unknown|Promise<unknown>|boolean | void|void \| boolean)$/;

/**
 * @param {string} type        the prop's or field's type text
 * @param {{ types: Record<string, string>, file: string, defs: Record<string, object>, root: string, seen?: Set<string> }} ctx
 *   `types`: the docs/api declarations by name; `file`: the component's source (for aliases docs/api leaves out);
 *   `defs`: the catalog's shared `$defs`, filled with every named object type met.
 * @returns {object | null}    the schema, or null when the type is not something a generated UI may write
 */
export function typeSchema(type, ctx) {
  const text = stripComments(type);
  if (!text) return null;
  if (EXCLUDED_TYPE_RE.test(text) && !/ReactElement|ReactNode/.test(text)) return null;
  const members = splitTop(text.replace(/^\|\s*/, ""), "|").map(unparen);
  if (members.length > 1) return unionSchema(members, ctx);
  return memberSchema(members[0] ?? text, ctx);
}

function unionSchema(members, ctx) {
  const literals = [];
  const others = [];
  let nullable = false, node = false, icon = false, element = false;
  for (const member of members) {
    if (/^(null|undefined)$/.test(member)) { nullable = true; continue; }
    if (member === "ReactNode") { node = true; continue; }
    if (member === "ReactElement" || /^ReactElement</.test(member)) { element = true; continue; }
    if (member === "IconName") { icon = true; continue; }
    if (/^(true|false)$/.test(member)) { literals.push(member === "true"); continue; }
    const literal = /^"([^"]*)"$/.exec(member) ?? /^'([^']*)'$/.exec(member);
    if (literal) { literals.push(literal[1]); continue; }
    if (/^-?\d+(\.\d+)?$/.test(member)) { literals.push(Number(member)); continue; }
    const schema = memberSchema(member, ctx);
    if (schema === null) continue;
    if (schema.enum) { literals.push(...schema.enum); continue; }
    others.push(schema);
  }
  if (node) {
    // ReactNode admits text, booleans and elements already; an icon name is text. Other shapes beside it (CardSubAction |
    // ReactNode) stay as alternatives.
    const schema = { "x-kind": "node" };
    if (icon) schema["x-icon"] = true;
    if (literals.length) schema["x-values"] = literals;
    const out = others.length ? { anyOf: [schema, ...others] } : schema;
    return nullable ? { ...out, "x-nullable": true } : out;
  }
  const out = [];
  if (literals.length) out.push({ enum: [...new Set(literals)] });
  if (icon) out.push({ type: "string", "x-kind": "icon" });
  if (element) out.push({ "x-kind": "element" });
  out.push(...others);
  if (!out.length) return nullable ? { type: "null" } : null;
  const schema = out.length === 1 ? out[0] : { anyOf: out };
  return nullable ? { ...schema, "x-nullable": true } : schema;
}

function memberSchema(member, ctx) {
  const text = unparen(member);
  if (!text) return null;
  const literal = /^"([^"]*)"$/.exec(text) ?? /^'([^']*)'$/.exec(text);
  if (literal) return { enum: [literal[1]] };
  if (/^-?\d+(\.\d+)?$/.test(text)) return { enum: [Number(text)] };
  if (text === "true" || text === "false") return { enum: [text === "true"] };
  if (text === "string" || text === "(string & {})" || text === "string & {}") return { type: "string" };
  if (text === "number") return { type: "number" };
  if (text === "boolean") return { type: "boolean" };
  if (text === "Date") return { type: "string", "x-kind": "date" };
  if (text === "ReactNode") return { "x-kind": "node" };
  if (text === "ReactElement" || /^ReactElement</.test(text)) return { "x-kind": "element" };
  if (text === "IconName") return { type: "string", "x-kind": "icon" };
  if (text === "null") return { type: "null" };
  if (text === "undefined" || text === "void") return null;
  if (BUILTIN_ANY.test(text)) return {};
  if (/^string\[\]$/.test(text)) return { type: "array", items: { type: "string" } };
  const list = /^(.+)\[\]$/.exec(text)?.[1] ?? /^(?:ReadonlyArray|Array)<(.+)>$/.exec(text)?.[1];
  if (list) { const items = typeSchema(list, ctx); return items === null ? null : { type: "array", items }; }
  const handler = /^(?:Mouse|Keyboard|Focus|Change|Form|Pointer|Touch|Drag|Clipboard|Composition|UI|Wheel|Animation|Transition|React)?EventHandler(?:<.*>)?$/.exec(text);
  if (handler) return { "x-kind": "action", params: [{ name: "event", type: text, json: false }] };
  const arrow = arrowOf(text);
  if (arrow) {
    if (!ACTION_RETURNS.test(arrow.returns)) return null; // a formatter or renderer: not something a spec can hold
    return { "x-kind": "action", params: arrow.params.map((param) => ({ name: param.name, type: param.type, json: jsonParam(param.type, ctx) })) };
  }
  const record = /^(?:Readonly<|Partial<)*Record<([^,]+),\s*(.+?)>+$/.exec(text);
  if (record) {
    const value = typeSchema(record[2], ctx);
    if (value === null) return null;
    const keys = record[1].trim() === "string" ? null : typeSchema(record[1], ctx);
    if (keys?.enum) return { type: "object", properties: Object.fromEntries(keys.enum.map((key) => [String(key), value])), required: [], additionalProperties: false };
    return { type: "object", additionalProperties: value };
  }
  if (text.startsWith("{") && text.endsWith("}")) return objectSchema(text.slice(1, -1), ctx);
  const partial = /^Partial<(.+)>$/.exec(text);
  if (partial) { const inner = typeSchema(partial[1], ctx); return inner && inner.type === "object" ? { ...inner, required: [] } : inner; }
  const exclude = /^(Exclude|Extract)<([^,]+),\s*(.+)>$/.exec(text);
  if (exclude) {
    const base = typeSchema(exclude[2], ctx), other = typeSchema(exclude[3], ctx);
    if (base?.enum && other?.enum) return { enum: base.enum.filter((value) => (exclude[1] === "Exclude") !== other.enum.includes(value)) };
    return base;
  }
  const generic = /^([A-Z]\w*)<.*>$/.exec(text);
  const name = generic ? generic[1] : /^[A-Z]\w*$/.test(text) ? text : null;
  if (name) return namedSchema(name, ctx);
  // `keyof typeof typographyStyles`, `(typeof headingLevels)[number]` and other expressions the source can answer.
  const values = ctx.file ? sourceLiteralsOfText(ctx.file, text) : null;
  if (values) return { enum: values };
  return {};
}

function namedSchema(name, ctx) {
  if (ctx.defs[name]) return { $ref: `#/$defs/${name}` };
  if (name === "IconName") return { type: "string", "x-kind": "icon" };
  const fromSource = ctx.file ? sourceLiterals(ctx.file, name, ctx.root) : null;
  if (fromSource) return { enum: fromSource };
  const declaration = ctx.types[name];
  if (declaration) {
    const alias = /^(?:export\s+)?type\s+\w+(?:<[^=]*>)?\s*=\s*([\s\S]+)$/.exec(declaration);
    const iface = /^(?:export\s+)?interface\s+\w+(?:<[^{]*>)?\s*(?:extends\s+([^{]+))?\{([\s\S]*)\}\s*$/.exec(declaration);
    const seen = ctx.seen ?? (ctx.seen = new Set());
    if (seen.has(name)) return { $ref: `#/$defs/${name}` };
    seen.add(name);
    let schema = null;
    if (iface) {
      schema = objectSchema(iface[2], ctx);
      for (const parent of iface[1] ? splitTop(iface[1], ",") : []) {
        const base = typeSchema(parent, ctx);
        const resolved = base?.$ref ? ctx.defs[base.$ref.split("/").pop()] : base;
        if (resolved?.type === "object" && schema) { schema.properties = { ...resolved.properties, ...schema.properties }; schema.required = [...new Set([...(resolved.required ?? []), ...(schema.required ?? [])])]; }
        // A parent docs/api does not declare (ToastItem extends ToastProps): its fields are unknown, so the object stays open.
        else if (schema) schema.additionalProperties = true;
      }
    } else if (alias) {
      const body = alias[1].trim();
      const parts = splitTop(body.replace(/^\|\s*/, ""), "|").map(unparen);
      // `A & B`: one object with both sets of fields.
      if (parts.length === 1 && splitTop(parts[0], "&").length > 1) {
        const merged = { type: "object", properties: {}, required: [] };
        for (const part of splitTop(parts[0], "&")) { const s = typeSchema(part, ctx); const r = s?.$ref ? ctx.defs[s.$ref.split("/").pop()] : s; if (r?.type === "object") { Object.assign(merged.properties, r.properties); merged.required.push(...(r.required ?? [])); } }
        schema = merged;
      } else schema = typeSchema(body, ctx);
    }
    seen.delete(name);
    if (schema === null) return null;
    if (schema.type === "object" || schema.anyOf) { ctx.defs[name] = schema; return { $ref: `#/$defs/${name}` }; }
    return schema; // an enum or primitive alias is inlined
  }
  // Not in docs/api and not a literal union: a local alias the source declares (GridTracks = number | string).
  const alias = ctx.file ? sourceAliasText(ctx.file, name, ctx.root) : null;
  if (alias && !(ctx.seen ?? (ctx.seen = new Set())).has(`alias:${name}`)) {
    ctx.seen.add(`alias:${name}`);
    const schema = typeSchema(alias.text, { ...ctx, file: alias.file });
    ctx.seen.delete(`alias:${name}`);
    if (schema !== null) return schema;
  }
  return {};
}

/** `{ a: T; b?: U }` → an object schema; a member that is not writable (a ref, a renderer) is left out. */
function objectSchema(body, ctx) {
  const schema = { type: "object", properties: {}, required: [], additionalProperties: false };
  for (const member of splitTop(body, ";").flatMap((part) => splitTop(part, ","))) {
    const field = /^(?:readonly\s+)?(?:"([^"]+)"|([A-Za-z_$][\w$-]*))(\?)?\s*:\s*([\s\S]+)$/.exec(stripComments(member));
    if (!field) { if (/^\[/.test(stripComments(member))) schema.additionalProperties = true; continue; }
    const name = field[1] ?? field[2];
    const value = typeSchema(field[4], ctx);
    if (value === null) continue;
    schema.properties[name] = value;
    if (!field[3] && !/undefined/.test(field[4])) schema.required.push(name);
  }
  return schema;
}

/** Whether an action parameter of this type reaches the app as JSON (its value) or only as a marker (a DOM event). */
function jsonParam(type, ctx) {
  const text = stripComments(type);
  if (/Event\b|Element\b|Ref\b/.test(text)) return false;
  if (/^(string|number|boolean|Date|string\[\]|number\[\])$/.test(text) || /^"/.test(text)) return true;
  const schema = typeSchema(text, { ...ctx, seen: new Set() });
  return schema !== null && !("x-kind" in schema && schema["x-kind"] !== "date");
}
