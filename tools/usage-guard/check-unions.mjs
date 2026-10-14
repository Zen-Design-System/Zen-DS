// Documented unions vs the TypeScript source (backlog batch 9, user 2026-10-07; part of `npm run guidelines:check`).
//
// docs/api lists a prop's values as a literal union ("sm" | "md") or names an alias whose declaration it records
// (types: { BadgeTheme: 'type BadgeTheme = "accent" | …' }). Both come from react-docgen through scripts/build-api.mjs,
// which once dropped the members of `(typeof dockIconThemes)[number]`. This check resolves the same prop again straight
// from the source with @babel/parser — string-literal unions, type aliases (same file or a relative import),
// `(typeof list)[number]` over `as const` arrays (spreads included) and unions of those — and reports any documented
// union that differs from it. A prop it cannot resolve (an HTML attribute, a generic, a mapped type) is skipped.
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

const parsed = new Map();
function moduleOf(file) {
  if (parsed.has(file)) return parsed.get(file);
  let ast = null;
  try {
    ast = parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["typescript", "jsx"] });
  } catch {
    ast = null;
  }
  const info = { file, aliases: new Map(), interfaces: new Map(), arrays: new Map(), imports: new Map() };
  for (const statement of ast?.program.body ?? []) {
    const node = statement.type === "ExportNamedDeclaration" && statement.declaration ? statement.declaration : statement;
    if (node.type === "TSTypeAliasDeclaration") info.aliases.set(node.id.name, node.typeAnnotation);
    else if (node.type === "TSInterfaceDeclaration") info.interfaces.set(node.id.name, node);
    else if (node.type === "VariableDeclaration") {
      for (const decl of node.declarations) {
        let init = decl.init;
        if (init?.type === "TSAsExpression" || init?.type === "TSSatisfiesExpression") init = init.expression;
        if (decl.id.type === "Identifier" && init?.type === "ArrayExpression") info.arrays.set(decl.id.name, init);
      }
    } else if (statement.type === "ImportDeclaration" && statement.source.value.startsWith(".")) {
      for (const spec of statement.specifiers) {
        if (spec.type === "ImportSpecifier") info.imports.set(spec.local.name, { from: statement.source.value, name: spec.imported.name ?? spec.imported.value });
      }
    }
  }
  parsed.set(file, info);
  return info;
}

function resolveImport(info, name) {
  const target = info.imports.get(name);
  if (!target) return null;
  const base = path.resolve(path.dirname(info.file), target.from);
  const file = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")].find((candidate) => fs.existsSync(candidate));
  if (!file) return null;
  let mod = moduleOf(file);
  // Follow one `export … from` hop (component index files).
  if (!mod.aliases.has(target.name) && !mod.arrays.has(target.name)) {
    const source = fs.readFileSync(file, "utf8");
    const re = new RegExp(`export\\s*(?:\\*|\\{[^}]*\\b${target.name}\\b[^}]*\\})\\s*from\\s*["'](\\.[^"']+)["']`, "g");
    for (const match of source.matchAll(re)) {
      const next = path.resolve(path.dirname(file), match[1]);
      const nextFile = [`${next}.ts`, `${next}.tsx`, path.join(next, "index.ts")].find((candidate) => fs.existsSync(candidate));
      if (!nextFile) continue;
      const nextMod = moduleOf(nextFile);
      if (nextMod.aliases.has(target.name) || nextMod.arrays.has(target.name)) { mod = nextMod; break; }
    }
  }
  return { mod, name: target.name };
}

/** The string values of an `as const` array (spreads of other arrays included), or null. */
function arrayValues(info, name, depth = 0) {
  if (depth > 6) return null;
  const array = info.arrays.get(name);
  if (!array) {
    const imported = resolveImport(info, name);
    return imported ? arrayValues(imported.mod, imported.name, depth + 1) : null;
  }
  const out = [];
  for (const element of array.elements) {
    if (element?.type === "StringLiteral") out.push(element.value);
    else if (element?.type === "SpreadElement" && element.argument.type === "Identifier") {
      const inner = arrayValues(info, element.argument.name, depth + 1);
      if (!inner) return null;
      out.push(...inner);
    } else return null;
  }
  return out;
}

/** The string-literal members of a type node, or null when it holds anything else. */
function literals(info, node, depth = 0) {
  if (!node || depth > 8) return null;
  switch (node.type) {
    case "TSLiteralType":
      return node.literal.type === "StringLiteral" ? [node.literal.value] : null;
    case "TSUnionType": {
      const out = [];
      for (const member of node.types) {
        // `undefined` adds no value; `(string & {})` keeps autocompletion open: the union is not closed, so skip it.
        if (member.type === "TSUndefinedKeyword") continue;
        const values = literals(info, member, depth + 1);
        if (!values) return null;
        out.push(...values);
      }
      return out;
    }
    case "TSParenthesizedType":
      return literals(info, node.typeAnnotation, depth + 1);
    case "TSIndexedAccessType": {
      // (typeof list)[number]
      const object = node.objectType.type === "TSParenthesizedType" ? node.objectType.typeAnnotation : node.objectType;
      if (object.type === "TSTypeQuery" && object.exprName.type === "Identifier" && node.indexType.type === "TSNumberKeyword") return arrayValues(info, object.exprName.name, depth + 1);
      return null;
    }
    case "TSTypeReference": {
      if (node.typeName.type !== "Identifier" || node.typeParameters) return null;
      const name = node.typeName.name;
      if (info.aliases.has(name)) return literals(info, info.aliases.get(name), depth + 1);
      const imported = resolveImport(info, name);
      return imported?.mod.aliases.has(imported.name) ? literals(imported.mod, imported.mod.aliases.get(imported.name), depth + 1) : null;
    }
    default:
      return null;
  }
}

/** The type annotation of `prop` in `<Name>Props` (its own members, then the interfaces it extends in the same file). */
function propType(info, interfaceName, prop, depth = 0) {
  const decl = info.interfaces.get(interfaceName);
  if (!decl || depth > 4) return null;
  for (const member of decl.body.body) {
    if (member.type === "TSPropertySignature" && (member.key.name ?? member.key.value) === prop) return member.typeAnnotation?.typeAnnotation ?? null;
  }
  for (const parent of decl.extends ?? []) {
    if (parent.expression.type === "Identifier") {
      const found = propType(info, parent.expression.name, prop, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

const documentedLiterals = (text) => {
  const members = text.replace(/\s+/g, " ").split("|").map((member) => member.trim()).filter(Boolean);
  if (!members.length || !members.every((member) => /^"[^"]*"$/.test(member))) return null;
  return members.map((member) => member.slice(1, -1));
};

/**
 * @param {Map<string, {name: string, file: string, props: {name: string, type: string}[]}>} components  buildApi().components
 * @param {Record<string, string>} types  alias name → its recorded declaration (every docs/api file's `types`, merged)
 * @returns {{ checked: number, skipped: number, mismatches: string[] }}
 */
export function checkUnions(components, types, root) {
  let checked = 0;
  let skipped = 0;
  const mismatches = [];
  for (const component of components.values()) {
    if (!component.file) continue;
    const info = moduleOf(path.join(root, component.file));
    for (const prop of component.props ?? []) {
      const type = String(prop.type ?? "");
      const alias = /^[A-Z]\w*$/.test(type) && types[type] ? types[type].replace(/^type\s+\w+\s*=\s*/, "") : null;
      const documented = documentedLiterals(alias ?? type);
      if (!documented) continue;
      const actual = literals(info, propType(info, `${component.name}Props`, prop.name));
      if (!actual) { skipped += 1; continue; }
      checked += 1;
      const want = new Set(actual);
      const have = new Set(documented);
      const missing = [...want].filter((value) => !have.has(value));
      const extra = [...have].filter((value) => !want.has(value));
      if (missing.length || extra.length) mismatches.push(`${component.name}.${prop.name}: docs ${missing.length ? `miss ${missing.map((v) => `"${v}"`).join(", ")}` : ""}${missing.length && extra.length ? "; " : ""}${extra.length ? `list ${extra.map((v) => `"${v}"`).join(", ")} the type does not have` : ""}`);
    }
  }
  return { checked, skipped, mismatches };
}
