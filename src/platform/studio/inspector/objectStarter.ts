/*
 * Adding an object to an unset object prop (EmptyState `secondaryAction` "Not set"; BACKLOG "Studio object props, next
 * steps"): the starting object a "+" writes, read from the prop's type as api.generated.json spells it. Only an object
 * literal type whose required fields all take a written value: text (`label: ReactNode`, `title: string`) gets the
 * prop's words ("Secondary action"), a number 0, a boolean false. A required handler or a named type gives null (no
 * "+"): the code has to say what it does. Once written, Object properties edits it field by field. No imports, so the
 * node selftest (objectStarter.selftest.mjs) loads it directly.
 */

/** "secondaryAction" → "Secondary action". */
const words = (name: string) => {
  const text = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** The fields of an object literal type (`{ label: ReactNode; onClick?: () => void }`), comments left out; null otherwise. */
export function objectTypeFields(type: string): Array<{ name: string; optional: boolean; type: string }> | null {
  const body = type.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (!body.startsWith("{") || !body.endsWith("}")) return null;
  const inner = body.slice(1, -1);
  const fields: Array<{ name: string; optional: boolean; type: string }> = [];
  let depth = 0;
  let start = 0;
  const parts: string[] = [];
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];
    if ("{([<".includes(char)) depth += 1;
    else if ("})]>".includes(char) && inner[index - 1] !== "=") depth -= 1;
    else if ((char === ";" || char === ",") && depth === 0) { parts.push(inner.slice(start, index)); start = index + 1; }
  }
  parts.push(inner.slice(start));
  for (const part of parts) {
    const match = /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+?)\s*$/.exec(part);
    if (match) fields.push({ name: match[1], optional: Boolean(match[2]), type: match[3] });
    else if (part.trim()) return null;
  }
  return fields;
}

/** The object a "+" writes for `prop` of `type` (code, one line), or null when the type cannot start from values. */
export function objectStarter(prop: string, type: string): string | null {
  const fields = objectTypeFields(type);
  if (!fields || !fields.length) return null;
  const written: string[] = [];
  for (const field of fields.filter((item) => !item.optional)) {
    const kinds = field.type.split("|").map((part) => part.trim());
    if (kinds.some((kind) => /=>/.test(kind))) return null;
    if (kinds.some((kind) => kind === "ReactNode" || kind === "string")) written.push(`${field.name}: ${JSON.stringify(words(prop))}`);
    else if (kinds.includes("number")) written.push(`${field.name}: 0`);
    else if (kinds.includes("boolean")) written.push(`${field.name}: false`);
    else {
      const literal = kinds.find((kind) => /^"[^"]*"$/.test(kind));
      if (!literal) return null;
      written.push(`${field.name}: ${literal}`);
    }
  }
  return written.length ? `{ ${written.join(", ")} }` : "{}";
}

/**
 * A named object type's body (`interface EmptyStateAction { label: ReactNode; … }` → `{ label: ReactNode; … }`) from the
 * API docs' type definitions; null for anything else (an interface that extends another: its inherited fields are not
 * written there).
 */
export function namedTypeBody(name: string, types: Readonly<Record<string, string>>): string | null {
  const definition = types[name]?.trim();
  if (!definition) return null;
  const match = new RegExp(`^(?:export\\s+)?(?:interface\\s+${name}\\s*|type\\s+${name}\\s*=\\s*)(\\{[\\s\\S]*\\})\\s*;?$`).exec(definition);
  return match ? match[1] : null;
}
