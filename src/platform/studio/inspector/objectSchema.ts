import { useEffect, useState } from "react";
import { editorFor, splitUnion, type PropEditor, type PropSpec } from "./propSchema";

/*
 * Fields of the object types a prop takes (TopNavigation's `leading: TopNavigationAction | ReactNode`, `trailing:
 * TopNavigationAction[]`, `searchAction: { onClick: () => void; label?: string; … }`), so the inspector can edit an
 * object or array literal written in place field by field (op setField). The declarations come from the generated API
 * docs (docs/api/<slug>.json `types`), loaded per component when one is selected.
 */

export type FieldSpec = PropSpec & { optional: boolean };
export type ObjectSchema = { typeName: string; fields: FieldSpec[] };
export type ApiTypes = Record<string, string>;

const typeModules = import.meta.glob<ApiTypes | undefined>("../../../../docs/api/*.json", { import: "types" });
const loaded = new Map<string, Promise<ApiTypes>>();

function loadTypes(slug: string): Promise<ApiTypes> {
  let promise = loaded.get(slug);
  if (!promise) {
    const load = typeModules[`../../../../docs/api/${slug}.json`];
    promise = load ? load().then((types) => types ?? {}, () => ({})) : Promise.resolve({});
    loaded.set(slug, promise);
  }
  return promise;
}

/** The type declarations of a component's API page; {} until loaded (and for a slug without any). */
export function useApiTypes(slug: string | null): ApiTypes {
  const [state, setState] = useState<{ slug: string | null; types: ApiTypes }>({ slug: null, types: {} });
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    void loadTypes(slug).then((types) => { if (alive) setState({ slug, types }); });
    return () => { alive = false; };
  }, [slug]);
  return state.slug === slug ? state.types : {};
}

/** Splits a type at its top-level `separators` (an arrow's `=>` never closes a bracket, unlike splitUnion's count). */
function splitTop(body: string, separators: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let index = 0; index < body.length; index++) {
    const char = body[index];
    if (quote) {
      if (char === quote && body[index - 1] !== "\\") quote = "";
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") quote = char;
    else if ("(<[{".includes(char)) depth++;
    else if (")]}".includes(char) || (char === ">" && body[index - 1] !== "=")) depth--;
    else if (separators.includes(char) && depth === 0) {
      parts.push(body.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(body.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** The members of an object type: `interface X { … }`, `type X = { … }` or an inline `{ … }`. */
function membersOf(declaration: string): Array<{ name: string; type: string; optional: boolean }> {
  const open = declaration.indexOf("{");
  const close = declaration.lastIndexOf("}");
  if (open < 0 || close <= open) return [];
  const out: Array<{ name: string; type: string; optional: boolean }> = [];
  for (const member of splitTop(declaration.slice(open + 1, close), ";,")) {
    const match = /^(?:readonly\s+)?("[^"]+"|'[^']+'|[A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/.exec(member);
    if (!match) continue;
    out.push({ name: match[1].replace(/^["']|["']$/g, ""), type: match[3].trim(), optional: Boolean(match[2]) });
  }
  return out;
}

const isObjectDeclaration = (declaration: string) => /^(?:export\s+)?(?:interface\s+\w+|type\s+\w+(?:<[^=]*>)?\s*=\s*\{)/.test(declaration);

/** An alias of plain values (`type ButtonLevel = "primary" | …`, `type GridTracks = number | string`) → its union. */
function expandAliases(type: string, types: ApiTypes): string {
  return splitUnion(type).map((member) => {
    const declaration = types[member];
    const rhs = declaration ? /^(?:export\s+)?type\s+\w+\s*=\s*([\s\S]+?);?\s*$/.exec(declaration)?.[1] : undefined;
    return rhs && !rhs.trim().startsWith("{") ? rhs.trim() : member;
  }).join(" | ");
}

/** A field's editor: from its type, or from the aliases it names when the type alone gives none. */
function fieldEditor(type: string, types: ApiTypes): PropEditor {
  const direct = editorFor(type);
  if (direct.kind !== "readonly") return direct;
  const expanded = expandAliases(type, types);
  return expanded === type ? direct : editorFor(expanded);
}

/** Fields the inspector never offers: handlers and other functions, ids and keys (the code's own wiring). */
const skippedField = (name: string, type: string) => /^on[A-Z]/.test(name) || name === "id" || name === "key" || /^\(.*\)\s*=>/.test(type);

/**
 * The object type a prop takes as an object (`want: "object"`) or as array items (`"array"`): TopNavigationAction for
 * `TopNavigationAction | ReactNode` and for `TopNavigationAction[]`; an inline `{ … }` type too. null when none is known.
 */
export function objectSchemaOf(propType: string, types: ApiTypes, want: "object" | "array"): ObjectSchema | null {
  for (const raw of splitTop(propType, "|")) {
    let member = raw.replace(/^readonly\s+/, "").trim();
    const array = /^(?:Array|ReadonlyArray)<([\s\S]+)>$/.exec(member) ?? /^([\s\S]+)\[\]$/.exec(member);
    if (Boolean(array) !== (want === "array")) continue;
    if (array) member = array[1].trim().replace(/^\(([\s\S]*)\)$/, "$1");
    for (const candidate of array ? splitTop(member, "|") : [member]) {
      if (candidate.startsWith("{")) return { typeName: "", fields: fieldsOf(candidate, types) };
      const name = /^([A-Za-z_$][\w$]*)(?:<[\s\S]*>)?$/.exec(candidate)?.[1];
      const declaration = name ? types[name] : undefined;
      if (name && declaration && isObjectDeclaration(declaration)) return { typeName: name, fields: fieldsOf(declaration, types) };
    }
  }
  return null;
}

function fieldsOf(declaration: string, types: ApiTypes): FieldSpec[] {
  return membersOf(declaration)
    .filter((member) => !skippedField(member.name, member.type))
    .map((member) => ({ name: member.name, type: member.type, description: "", defaultValue: null, editor: fieldEditor(member.type, types), optional: member.optional }));
}
