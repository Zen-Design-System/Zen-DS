#!/usr/bin/env node
/**
 * Machine-readable props API for every public component, extracted from the TSX source with react-docgen.
 * Used by tools/usage-guard/build-guidelines.mjs, which writes (and --check verifies):
 *   docs/api/<slug>.json            full API per guideline slug (name, type, required, default, description, deprecated)
 *   docs/guidelines/index.json      one compact line per prop ("size?: sm|md|lg = md") next to the Do/Don't
 *   docs/guidelines/<slug>.md       a Props table per component
 *   src/platform/api.generated.json the Props table on each platform page
 *
 * Types are made readable for agents: `(typeof buttonSizes)[number]` becomes `"2xs" | "xs" | …`, and aliases of small
 * literal unions (`ChipSize`) are expanded. Big unions (IconName: 1,598 names) keep their name.
 *
 *   node scripts/build-api.mjs    print a summary (the files are written by `npm run guidelines:build`)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { builtinImporters, builtinResolvers, parse } from "react-docgen";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentsDir = path.join(root, "src/components");
const MAX_EXPANDED_UNION = 24;

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(target);
  return /\.tsx?$/.test(entry.name) && !/\.(stories|test)\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [target] : [];
});

/** `export const sizes = ["sm", "md"] as const` and `export type Size = (typeof sizes)[number]` / `"a" | "b"`. */

/** Props an `export type <Name>Props = … Omit<Base, "a" | "b"> …` alias gets from a Base declared in the same file. */
function omittedBaseProps(source, file, name, own, literals) {
  const start = source.indexOf(`export type ${name}Props =`);
  if (start < 0) return [];
  const head = source.slice(start, source.indexOf("{", start) < 0 ? undefined : source.indexOf("{", start));
  const out = [];
  for (const match of head.matchAll(/Omit<(\w+),\s*((?:"[^"]*"\s*\|?\s*)+)>/g)) {
    const base = match[1];
    if (!new RegExp(`(?:type|interface)\\s+${base}\\b`).test(source)) continue;
    const omitted = new Set([...match[2].matchAll(/"([^"]*)"/g)].map((key) => key[1]));
    let probe = [];
    try {
      probe = parse(`${source}\nexport function ZenApiProbe(props: ${base}) { return <div {...props} />; }\n`, { filename: file, resolver: new builtinResolvers.FindExportedDefinitionsResolver(), importer: builtinImporters.fsImporter });
    } catch {
      probe = [];
    }
    const doc = probe.find((entry) => entry.displayName === "ZenApiProbe");
    for (const [prop, info] of Object.entries(doc?.props ?? {})) {
      if (omitted.has(prop) || own.has(prop)) continue;
      own.add(prop);
      const { description, deprecated } = splitDeprecated(info.description);
      out.push({ name: prop, type: typeText(info.tsType ?? info.flowType, literals), required: Boolean(info.required), default: null, description, deprecated });
    }
  }
  return out;
}

function collectLiterals(files) {
  const arrays = new Map();
  const aliases = new Map();
  // Array bodies first, then resolved with their spreads (`["neutral", ...dockIconSupportColors, "emoji"]`), so a union
  // built from another const array keeps every member.
  const bodies = new Map();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/(?:export\s+)?const\s+(\w+)\s*=\s*\[([^\]]*)\]\s*as\s+const/g)) bodies.set(match[1], match[2]);
  }
  const resolve = (name, seen = new Set()) => {
    if (arrays.has(name)) return arrays.get(name);
    const body = bodies.get(name);
    if (body === undefined || seen.has(name)) return [];
    seen.add(name);
    const values = [...body.matchAll(/"([^"]*)"|'([^']*)'|\.\.\.\s*(\w+)/g)].flatMap((token) => (token[3] ? resolve(token[3], seen) : [token[1] ?? token[2]]));
    if (values.length) arrays.set(name, values);
    return values;
  };
  for (const name of bodies.keys()) resolve(name);
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/export\s+type\s+(\w+)\s*=\s*\(typeof\s+(\w+)\)\[number\]\s*;/g)) aliases.set(match[1], { array: match[2] });
    for (const match of source.matchAll(/export\s+type\s+(\w+)\s*=\s*((?:\s*\|?\s*"[^"]*")+)\s*;/g)) {
      const values = [...match[2].matchAll(/"([^"]*)"/g)].map((value) => value[1]);
      if (values.length) aliases.set(match[1], { values });
    }
  }
  return { arrays, aliases };
}

/** Exported interfaces and type aliases by name → declaration text (comments dropped, whitespace collapsed). */
function collectDeclarations(files) {
  const declarations = new Map();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/export\s+(interface|type)\s+(\w+)/g)) {
      const name = match[2];
      if (name.endsWith("Props") || declarations.has(name)) continue;
      let index = match.index + match[0].length;
      let depth = 0;
      let end = -1;
      for (; index < source.length; index += 1) {
        const char = source[index];
        if (char === "{" || char === "(" || char === "<" || char === "[") depth += 1;
        else if (char === "}" || char === ")" || char === ">" || char === "]") {
          if (char === ">" && source[index - 1] === "=") continue; // arrow `=>`
          depth -= 1;
          if (depth === 0 && match[1] === "interface" && char === "}") { end = index + 1; break; }
        } else if (char === ";" && depth === 0 && match[1] === "type") { end = index; break; }
      }
      if (end < 0) continue;
      const text = source.slice(match.index, end)
        .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/\s+/g, " ").replace(/^export\s+/, "").trim();
      declarations.set(name, { text, file: path.relative(root, file) });
    }
  }
  return declarations;
}

const BUILTIN_TYPES = new Set(["ReactNode", "ReactElement", "CSSProperties", "MouseEvent", "KeyboardEvent", "ChangeEvent", "FocusEvent", "PointerEvent", "FormEvent", "HTMLElement", "HTMLDivElement", "HTMLButtonElement", "HTMLAnchorElement", "HTMLInputElement", "Record", "Partial", "Omit", "Pick", "Array", "Promise", "Date", "IconName", "RefObject", "ElementType", "ComponentProps", "T"]);

/** Named types a slug's props mention (and the types those mention, two levels deep), with their declarations. */
function typesFor(components, declarations, literals) {
  // `(typeof buttonLevels)[number]` inside a declaration reads as its literal union.
  const readable = (text) => text.replace(/\(typeof\s+(\w+)\)\[number\]/g, (whole, name) => {
    const values = literals.arrays.get(name);
    return values && values.length <= MAX_EXPANDED_UNION ? union(values) : whole;
  });
  const found = new Map();
  const visit = (text, depth) => {
    for (const [name] of String(text).matchAll(/\b[A-Z]\w*\b/g)) {
      if (BUILTIN_TYPES.has(name) || found.has(name) || !declarations.has(name)) continue;
      found.set(name, readable(declarations.get(name).text));
      if (depth < 2) visit(declarations.get(name).text, depth + 1);
    }
  };
  for (const component of components) for (const prop of component.props) visit(prop.type, 0);
  return Object.fromEntries([...found].sort(([a], [b]) => a.localeCompare(b)));
}

const union = (values) => values.map((value) => JSON.stringify(value)).join(" | ");

function typeText(tsType, literals) {
  if (!tsType) return "unknown";
  let text = tsType.raw ?? (tsType.name === "literal" ? tsType.value : tsType.name);
  if (tsType.name === "union" && !tsType.raw && tsType.elements) text = tsType.elements.map((element) => typeText(element, literals)).join(" | ");
  text = String(text).replace(/\(typeof\s+(\w+)\)\[number\]/g, (whole, name) => {
    const values = literals.arrays.get(name);
    if (!values) return whole;
    if (values.length <= MAX_EXPANDED_UNION) return union(values);
    // A long string list (contentTones: 93 tones) reads as the type named after it (ContentTone).
    return [...literals.aliases].find(([, alias]) => alias.array === name)?.[0] ?? whole;
  });
  const alias = literals.aliases.get(text.trim());
  if (alias) {
    const values = alias.values ?? literals.arrays.get(alias.array);
    if (values && values.length <= MAX_EXPANDED_UNION) return union(values);
  }
  text = text.replace(/\s+/g, " ").trim();
  // A long literal union is almost always an imported alias (IconName) that react-docgen inlined: name it instead.
  const members = text.split("|").map((member) => member.trim()).filter(Boolean);
  if (members.length > MAX_EXPANDED_UNION && members.every((member) => /^"[^"]*"$/.test(member))) {
    const set = new Set(members.map((member) => member.slice(1, -1)));
    for (const [name, alias] of literals.aliases) {
      const values = alias.values ?? literals.arrays.get(alias.array);
      if (values && values.length === set.size && values.every((value) => set.has(value))) return name;
    }
    return `string (one of ${set.size} values)`;
  }
  return text;
}

function splitDeprecated(description = "") {
  const match = description.match(/@deprecated\b\s*([\s\S]*)$/);
  if (!match) return { description: description.trim(), deprecated: null };
  return { description: description.slice(0, match.index).trim(), deprecated: match[1].trim() || "Deprecated." };
}

/** `export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {` → the extends clause, as written. */
function extendsOf(source, name) {
  const match = source.match(new RegExp(`interface\\s+${name}Props\\s+extends\\s+([^{]+)\\{`));
  if (match) return match[1].replace(/\s+/g, " ").trim();
  // `type XProps = Shared & Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { … }`: keep the HTML part.
  const alias = source.match(new RegExp(`type\\s+${name}Props\\s*=\\s*([^;]+);`));
  const html = alias?.[1].split("&").map((part) => part.replace(/\s+/g, " ").trim()).filter((part) => /HTMLAttributes|HTMLProps/.test(part));
  return html?.length ? html.join(" & ") : null;
}

/** Names a component folder's index.ts makes public (`export *` → every definition of that file). */
function publicNames(folder, docsByFile) {
  const index = path.join(folder, "index.ts");
  if (!fs.existsSync(index)) return new Set();
  const source = fs.readFileSync(index, "utf8");
  const names = new Set();
  for (const match of source.matchAll(/export\s+\*\s+from\s+["']\.\/([^"']+)["']/g)) {
    const base = path.join(folder, match[1]);
    const file = [`${base}.tsx`, `${base}.ts`, path.join(base, "index.ts")].find((candidate) => fs.existsSync(candidate));
    for (const doc of docsByFile.get(file) ?? []) names.add(doc.displayName);
  }
  for (const match of source.matchAll(/export\s*\{([^}]*)\}\s*from/g)) {
    for (const part of match[1].split(",")) {
      const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

/**
 * @param {Record<string, string[]>} tagsFor  guideline slug → JSX tags it documents (from build-guidelines.mjs)
 * @returns {{ bySlug: Map<string, object>, components: Map<string, object>, unassigned: string[] }}
 */
export function buildApi(tagsFor) {
  const files = walk(componentsDir);
  const declarations = collectDeclarations(files);
  // names.ts holds IconName (1,598 names): big unions resolved by react-docgen are mapped back to their alias name.
  const literals = collectLiterals([...files, path.join(root, "src/icons/generated/names.ts")]);
  const docsByFile = new Map();
  const components = new Map();

  for (const file of files) {
    if (!file.endsWith(".tsx")) continue;
    const source = fs.readFileSync(file, "utf8");
    let docs = [];
    try {
      docs = parse(source, { filename: file, resolver: new builtinResolvers.FindExportedDefinitionsResolver(), importer: builtinImporters.fsImporter });
    } catch {
      docs = [];
    }
    docsByFile.set(file, docs);
    for (const doc of docs) {
      if (!doc.displayName || !/^[A-Z]/.test(doc.displayName)) continue;
      const props = Object.entries(doc.props ?? {}).map(([name, prop]) => {
        const { description, deprecated } = splitDeprecated(prop.description);
        return {
          name,
          // react-docgen cannot type props that only come from an extended HTML interface (e.g. `type` on Button).
          type: typeText(prop.tsType ?? prop.flowType, literals),
          required: Boolean(prop.required),
          default: prop.defaultValue?.value ?? null,
          description,
          deprecated,
        };
      });
      // react-docgen drops the members of `Omit<LocalType, keys>` in an intersection (TextAreaField, NumberField): probe
      // each such same-file base with a throwaway component and add its props, minus the omitted keys and own ones.
      for (const extra of omittedBaseProps(source, file, doc.displayName, new Set(props.map((prop) => prop.name)), literals)) props.push(extra);
      const { description, deprecated } = splitDeprecated(doc.description);
      components.set(doc.displayName, {
        name: doc.displayName,
        file: path.relative(root, file),
        description,
        deprecated,
        extends: extendsOf(source, doc.displayName),
        props,
      });
    }
  }

  const exported = new Set();
  for (const entry of fs.readdirSync(componentsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) for (const name of publicNames(path.join(componentsDir, entry.name), docsByFile)) exported.add(name);
  }

  const bySlug = new Map();
  const assigned = new Set();
  for (const [slug, tags] of Object.entries(tagsFor)) {
    const primary = components.get(tags[0]);
    const sameFile = primary ? [...components.values()].filter((component) => component.file === primary.file).map((component) => component.name) : [];
    const names = [...new Set([...tags, ...sameFile])].filter((name) => components.has(name) && exported.has(name));
    if (!names.length) continue;
    names.forEach((name) => assigned.add(name));
    const slugComponents = names.map((name) => components.get(name));
    bySlug.set(slug, {
      $comment: "Generated from the TSX source by scripts/build-api.mjs (react-docgen). Do not edit.",
      slug,
      import: `import { ${names.join(", ")} } from "@zen/design-system";`,
      components: slugComponents,
      types: typesFor(slugComponents, declarations, literals),
    });
  }
  const unassigned = [...exported].filter((name) => components.has(name) && !assigned.has(name)).sort();
  return { bySlug, components, unassigned };
}

/** One compact line per prop for index.json: `size?: "sm" | "md" = "md"` (deprecated props are marked). */
export function compactProps(component) {
  // Literal unions without quotes (`size?: sm|md|lg = md`); props only known from the HTML attributes are skipped.
  const short = (text) => text.replace(/"([^"]*)"/g, "$1").replace(/\s*\|\s*/g, "|");
  return component.props.filter((prop) => prop.type !== "unknown").map((prop) => {
    const type = short(prop.type);
    const fallback = prop.default === null ? "" : ` = ${short(prop.default)}`;
    const line = `${prop.name}${prop.required ? "" : "?"}: ${type.length > 220 ? `${type.slice(0, 217)}…` : type}${fallback}`;
    return prop.deprecated ? `${line} (deprecated)` : line;
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { components } = buildApi({});
  const props = [...components.values()].reduce((sum, component) => sum + component.props.length, 0);
  console.log(`${components.size} components, ${props} props. Files are written by \`npm run guidelines:build\`.`);
}
