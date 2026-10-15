// A catalog entry's props in short form, for a prompt (`level?: primary|accent|…`). Shared by the catalog builder
// (catalog.index.json) and the composer (tier 2 of the prompt). No imports.

export function compactType(schema, catalog, depth = 0) {
  if (!schema || depth > 3) return "any";
  if (schema.$ref) return schema.$ref.split("/").pop();
  if (schema["x-kind"] === "action") return `action(${(schema.params ?? []).map((p) => `${p.name}: ${p.type}`).join(", ")})`;
  if (schema["x-kind"] === "node") return schema["x-icon"] ? "icon|node" : "node";
  if (schema["x-kind"] === "element") return "element";
  if (schema["x-kind"] === "icon") return "icon";
  if (schema["x-kind"] === "date") return "date";
  if (schema.enum) return schema.enum.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join("|");
  if (schema.anyOf) return schema.anyOf.map((s) => compactType(s, catalog, depth + 1)).join(" | ");
  if (schema.type === "array") return `${compactType(schema.items, catalog, depth + 1)}[]`;
  if (schema.type === "object") return schema.properties ? `{ ${Object.keys(schema.properties).join(", ")} }` : "object";
  if (schema.type) return schema.type;
  return "any";
}

/** One line per prop of a catalog entry: `name?: type = default — description`. */
export function compactProps(entry, catalog, { descriptions = false } = {}) {
  return Object.entries(entry.props).map(([name, schema]) => {
    const fallback = schema.default !== undefined ? ` = ${JSON.stringify(schema.default)}` : "";
    const description = descriptions && schema.description ? ` — ${schema.description}` : "";
    return `${name}${schema["x-required"] ? "" : "?"}: ${compactType(schema, catalog)}${fallback}${description}`;
  });
}

/** A shared type of the catalog (`$defs`) in the same short form: `SelectFieldOption { value: string, label: node, … }`. */
export function compactDef(name, catalog) {
  const schema = catalog.$defs?.[name];
  if (!schema) return `${name}: any`;
  if (schema.type === "object" && schema.properties) {
    const required = new Set(schema.required ?? []);
    return `${name} { ${Object.entries(schema.properties).map(([field, s]) => `${field}${required.has(field) ? "" : "?"}: ${compactType(s, catalog)}`).join(", ")} }`;
  }
  return `${name}: ${compactType(schema, catalog)}`;
}

/** The shared types an entry's props mention (one level), for the prompt. */
export function defsOf(entry, catalog) {
  const names = new Set();
  const visit = (schema, depth = 0) => {
    if (!schema || depth > 4) return;
    if (schema.$ref) { names.add(schema.$ref.split("/").pop()); return; }
    if (schema.items) visit(schema.items, depth + 1);
    if (schema.anyOf) schema.anyOf.forEach((s) => visit(s, depth + 1));
    if (schema.properties) Object.values(schema.properties).forEach((s) => visit(s, depth + 1));
  };
  Object.values(entry.props).forEach((schema) => visit(schema));
  return [...names].filter((name) => catalog.$defs?.[name]);
}
