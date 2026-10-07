// Which src/components folder exports each value (Button → "Button", Stack → "Layout"): slot ops import inserted
// components by folder. Node only (it reads the disk); the plugin caches it, and the Studio builder's browser engine gets
// the same map built ahead (GĐ2). Moved out of slots.mjs so the edit engine itself has no Node imports.
import fs from "node:fs";
import path from "node:path";
import { parseSource } from "./jsx-source.mjs";
import { byCodePoint, patternNames } from "./slots.mjs";

/** Value names a module exports (types left out); `export * from` followed into the folder's files. */
function valueExports(file, seen) {
  if (seen.has(file)) return [];
  seen.add(file);
  let ast = null;
  try { ast = parseSource(fs.readFileSync(file, "utf8")); } catch { return []; }
  if (!ast) return [];
  const out = [];
  for (const statement of ast.program.body) {
    if (statement.type === "ExportNamedDeclaration" && statement.exportKind !== "type") {
      const declaration = statement.declaration;
      if (declaration?.type === "FunctionDeclaration" || declaration?.type === "ClassDeclaration" || declaration?.type === "TSEnumDeclaration") { if (declaration.id) out.push(declaration.id.name); }
      if (declaration?.type === "VariableDeclaration") declaration.declarations.forEach((item) => { const names = new Set(); patternNames(item.id, names); out.push(...names); });
      for (const specifier of statement.specifiers) {
        if (specifier.type !== "ExportSpecifier" || specifier.exportKind === "type") continue;
        out.push(specifier.exported.type === "StringLiteral" ? specifier.exported.value : specifier.exported.name);
      }
    }
    if (statement.type === "ExportAllDeclaration" && statement.exportKind !== "type" && !statement.exported) {
      const base = path.resolve(path.dirname(file), statement.source.value);
      const next = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")].find((candidate) => fs.existsSync(candidate));
      if (next) out.push(...valueExports(next, seen));
    }
  }
  return out;
}

/** Every value src/components/<Folder>/index.ts exports → its folder (the plugin caches it; restart to refresh). */
export function componentModulesFrom(root) {
  const base = path.join(root, "src/components");
  const out = new Map();
  let folders = [];
  try {
    folders = fs.readdirSync(base, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.name.startsWith("_")).map((entry) => entry.name).sort(byCodePoint);
  } catch {
    return out;
  }
  for (const folder of folders) {
    const index = ["index.ts", "index.tsx"].map((name) => path.join(base, folder, name)).find((candidate) => fs.existsSync(candidate));
    if (!index) continue;
    for (const name of valueExports(index, new Set())) if (!out.has(name)) out.set(name, folder);
  }
  return out;
}
