import api from "../../api.generated.json";
import { zenComponents } from "../builder/engine";
import { contentTones } from "../../../components/_shared/contentTone";
import { normalizeScale, zenScale, type ZenScaleInput } from "../../../components/_shared/scale";
import { iconNames } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { DataSource, SourceAttr } from "../types";
import { extendsClauses, inheritedProps, omitOf, ownerOf } from "./inheritedProps";

/*
 * Inspector property schema (spec §6): the generated API docs (src/platform/api.generated.json) give each component's
 * props and TypeScript types; this module maps a type to an editor and a source attribute to a value state.
 */

export type ApiProp = { name: string; type: string; required: boolean; default: string | null; description: string; deprecated: string | null };
export type ApiComponent = { name: string; extends?: string | null; props: ApiProp[] };

export type PropEditor =
  | { kind: "enum"; options: string[] }
  | { kind: "number-enum"; options: number[] }
  | { kind: "boolean" }
  | { kind: "string"; numeric?: boolean }
  | { kind: "number" }
  /** A ReactNode prop: plain text is editable, anything else is read-only. */
  | { kind: "node" }
  | { kind: "typography" }
  | { kind: "icon" }
  /** An icon that can also be switched off (`boolean | IconName`, `IconName | false`): Figma's boolean plus its instance
   *  swap in one row. */
  | { kind: "icon-toggle" }
  /** A picture (Avatar / AppShellAccount / Image `src`): the photo picker on a page you made (controls/PhotoControl.tsx). */
  | { kind: "photo" }
  /** Text / Heading `align` in the Text section: Figma's icon-only Align left / center / right (never from editorFor). */
  | { kind: "text-align"; options: string[] }
  /** Text / Heading `truncate` (boolean | number) in the Text section: Figma's Truncate text switch plus Max lines. `state`
   * names the boolean useState it reads (a playground), whose type takes no line count. */
  | { kind: "truncate"; state?: string }
  | { kind: "readonly" };

export type PropSpec = { name: string; type: string; description: string; defaultValue: Literal | null; editor: PropEditor };

export type Literal = string | number | boolean;

/** The value a prop has in the source. */
export type PropValue =
  | { state: "literal"; value: Literal; raw: string }
  /** An expression: `live` is what the element renders with now, `origin` what the expression reads (the dev server's
   * SourceAttr.origin), which decides whether a fixed value may replace it (bound-value, loop-bound) or not (bound-state). */
  | { state: "bound"; expression: string; raw: string; live?: unknown; origin?: SourceAttr["origin"]; dataSource?: DataSource }
  /** Not written as an attribute, but the element spreads props ({...rest}) that may set it: `live` is what it renders
   * with now (the fiber's props). Read-only, so an edit never overrides what the spread (a playground) feeds in. */
  | { state: "spread"; via: string; live: unknown }
  | { state: "unset" };

const components = new Map<string, ApiComponent>();
/** Component name → the docs slug its API entry is filed under ("ListItem" → "list-item", "Stack" → "layout"). */
const componentSlugs = new Map<string, string>();
for (const [slug, entries] of Object.entries(api as Record<string, ApiComponent[]>)) {
  for (const entry of entries) {
    if (components.has(entry.name)) continue;
    components.set(entry.name, entry);
    componentSlugs.set(entry.name, slug);
  }
}

/** The generated API entry of a component, by display name ("Button", "Stack"); null for host elements. */
export function componentSchema(name: string): ApiComponent | null {
  return components.get(name) ?? null;
}

/** The docs slug of a Zen component ("Avatar" → "avatar"); whether a page exists for it is the caller's check. */
export function componentSlug(name: string): string | null {
  return componentSlugs.get(name) ?? null;
}

/** The layout primitives (and a detach's output): Box, Stack, Grid, Container, Text, Heading. */
export const layoutPrimitives = new Set(["Box", "Stack", "Grid", "Container", "Text", "Heading"]);

/** What a selected JSX element is: a Zen component, a layout primitive, a local (capitalised, not in the API) component
 * or a host element. */
export type NodeKind = "zen" | "primitive" | "local" | "element";

export function nodeKind(name: string): NodeKind {
  if (!/^[A-Z]/.test(name)) return "element";
  if (layoutPrimitives.has(name)) return "primitive";
  // A library export without an API page (ZenPortal: react-docgen does not read it) is still the library's.
  return componentSchema(name) || zenComponents.has(name) ? "zen" : "local";
}

export const kindLabel = (kind: NodeKind) => ({ zen: "Zen component", primitive: "Layout primitive", local: "Local component", element: "HTML element" })[kind];

/** Sentence-case labels for props whose camelCase name reads badly; anything else falls back to propLabel's split. */
const propLabels: Record<string, string> = {
  paddingX: "Horizontal padding",
  paddingY: "Vertical padding",
  rowGap: "Row gap",
  columnGap: "Column gap",
  minColumnWidth: "Min column width",
  minWidth: "Min width",
  maxWidth: "Max width",
  minHeight: "Min height",
  maxHeight: "Max height",
  alignSelf: "Align in parent",
  gutter: "Page margin",
  textStyle: "Text style",
  id: "ID",
  "aria-label": "Accessible name",
  readOnly: "Read-only",
};

/** Labels that depend on the component: the same prop name means different things ("sticky" pins FormActions to the
 * bottom but TopNavigation to the top). */
const componentPropLabels: Record<string, Record<string, string>> = {
  FormActions: { sticky: "Pin to bottom", inset: "Side inset" },
  TopNavigation: { sticky: "Pin to top" },
};

/** Components whose `as` picks the HTML element they render (a list of tags); elsewhere (Link, ZenProvider) it takes a
 * component, so it reads "Render as". */
const asElementComponents = new Set(["Box", "Stack", "Grid", "Container", "Text", "Heading", "Card", "ListItem", "VisuallyHidden"]);

/** A prop's label in sentence case ("minColumnWidth" → "Min column width"), scoped by component when the name is
 * ambiguous; names that are not camelCase identifiers (data-*) stay as written. */
export function propLabel(name: string, component?: string): string {
  const scoped = component ? componentPropLabels[component]?.[name] : undefined;
  if (scoped) return scoped;
  if (name === "as") return component && !asElementComponents.has(component) ? "Render as" : "HTML element";
  const known = propLabels[name];
  if (known) return known;
  if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) return name;
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A label inside a sentence ("Reset horizontal padding"): lower-cases the first letter unless it starts an acronym. */
export const inSentence = (label: string) => (/^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label);

/** The option a value stands for: itself, or the option with the same scale step ("small" → "sm" in ["sm", "md"]). */
export function matchOption(value: string, options: readonly string[]): string {
  if (options.includes(value)) return value;
  const step = longToShort(value);
  return options.find((option) => longToShort(option) === step) ?? value;
}

/** Props the inspector never edits: children, handlers, styling escape hatches, React internals. */
export function isSkippedProp(name: string) {
  return name === "children" || name === "className" || name === "style" || name === "ref" || name === "key" || name === "data-zen-src" || /^data-studio-/.test(name) || /^on[A-Z]/.test(name);
}

export const typographyKeys = Object.keys(typographyStyles);
export const allIconNames: readonly string[] = iconNames;
const scaleShort: readonly string[] = zenScale;
const longToShort = (value: string) => normalizeScale(value as ZenScaleInput) as string;

/** Splits a TypeScript union at the top level ("a" | Foo<"b" | "c"> | (x: y) => z). */
export function splitUnion(type: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let index = 0; index < type.length; index++) {
    const char = type[index];
    if (quote) {
      if (char === quote && type[index - 1] !== "\\") quote = "";
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") quote = char;
    else if ("(<[{".includes(char)) depth++;
    else if (")>]}".includes(char)) depth--;
    else if (char === "|" && depth === 0) {
      parts.push(type.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(type.slice(start).trim());
  return parts.filter(Boolean);
}

const stringLiteral = (member: string) => /^"([^"]*)"$/.exec(member)?.[1] ?? /^'([^']*)'$/.exec(member)?.[1] ?? null;

/** Scale members (`ZenScaleInput`, `Exclude<ZenScaleInput, "3xs" | "3xsmall">`, `ZenScale`) → short spellings. */
function scaleMembers(member: string): string[] | null {
  if (member === "ZenScaleInput" || member === "ZenScale") return [...scaleShort];
  const exclude = /^Exclude<\s*ZenScale(?:Input)?\s*,\s*(.+)>$/.exec(member);
  if (exclude) {
    const removed = new Set(splitUnion(exclude[1]).map((part) => stringLiteral(part)).filter((value): value is string => Boolean(value)).map(longToShort));
    return scaleShort.filter((step) => !removed.has(step));
  }
  return null;
}

/** Type string → editor (string-literal unions, scales, booleans, text styles, icons, plain values). */
export function editorFor(type: string): PropEditor {
  const members = splitUnion(type);
  if (members.some((member) => member === "keyof typeof typographyStyles" || member === "TypographyStyleName")) return { kind: "typography" };
  if (members.includes("IconName")) return members.some((member) => member === "boolean" || member === "false" || member === "true") ? { kind: "icon-toggle" } : { kind: "icon" };
  // The long Color/Content tone list (Text, Heading, Icon) is named in the API docs instead of spelled out.
  if (members.includes("ContentTone") || members.includes("(typeof contentTones)[number]")) return { kind: "enum", options: [...contentTones] };
  if (members.includes("(typeof headingLevels)[number]") || members.includes("HeadingLevel")) return { kind: "number-enum", options: [1, 2, 3, 4, 5, 6] };
  const literals: string[] = [];
  let allLiteral = true;
  for (const member of members) {
    const literal = stringLiteral(member);
    const scale = literal === null ? scaleMembers(member) : null;
    if (literal !== null) literals.push(literal);
    else if (scale) literals.push(...scale);
    else allLiteral = false;
  }
  if (allLiteral && literals.length) {
    // Both spellings of a size ("sm" | "small"): offer the short one.
    const present = new Set(literals);
    const options = [...new Set(literals)].filter((value) => {
      const short = longToShort(value);
      return short === value || !present.has(short);
    });
    return { kind: "enum", options };
  }
  if (members.every((member) => /^-?\d+(\.\d+)?$/.test(member))) return { kind: "number-enum", options: members.map(Number) };
  if (members.includes("boolean")) return { kind: "boolean" };
  if (members.every((member) => member === "string" || member === "(string & {})" || stringLiteral(member) !== null)) return { kind: "string" };
  if (members.length === 2 && members.includes("number") && members.includes("string")) return { kind: "string", numeric: true };
  if (members.length === 1 && members[0] === "number") return { kind: "number" };
  if (members.some((member) => member === "ReactNode")) return { kind: "node" };
  if (type === "unknown") return { kind: "string" };
  return { kind: "readonly" };
}

/** The documented default ("\"md\"", "2", "true") as a value. */
export function parseDefault(value: string | null): Literal | null {
  if (value == null || value === "") return null;
  const literal = literalOf(value);
  return literal === undefined ? null : literal;
}

/** A source expression that is a plain literal ("x", 'x', `x`, 12, true) → its value; undefined otherwise. */
export function literalOf(expression: string): Literal | undefined {
  const code = expression.trim();
  if (code === "true") return true;
  if (code === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(code)) return Number(code);
  const quoted = /^"((?:[^"\\]|\\.)*)"$/.exec(code) ?? /^'((?:[^'\\]|\\.)*)'$/.exec(code) ?? /^`([^`$\\]*)`$/.exec(code);
  if (quoted) {
    try {
      return code.startsWith("\"") ? (JSON.parse(code) as string) : quoted[1].replace(/\\(.)/g, "$1");
    } catch {
      return quoted[1];
    }
  }
  return undefined;
}

/** How a prop is set in the source: a literal, an expression (bound), through a spread, or not at all. `live` holds the
 * props the element renders with (for a prop a spread may set). */
export function valueOf(attributes: SourceAttr[], name: string, live?: Record<string, unknown>): PropValue {
  const attr = attributes.find((attribute) => attribute.kind !== "spread" && attribute.name === name);
  if (!attr) {
    const spreads = attributes.filter((attribute) => attribute.kind === "spread");
    return spreads.length ? { state: "spread", via: spreads.map((spread) => spread.raw).join(", "), live: live?.[name] } : { state: "unset" };
  }
  if (attr.kind === "true") return { state: "literal", value: true, raw: attr.raw };
  if (attr.kind === "string") return { state: "literal", value: attr.value ?? "", raw: attr.raw };
  const literal = literalOf(attr.value ?? "");
  if (literal !== undefined) return { state: "literal", value: literal, raw: attr.raw };
  return { state: "bound", expression: attr.value ?? "", raw: attr.raw, live: live?.[name], ...(attr.origin ? { origin: attr.origin } : {}), ...(attr.dataSource ? { dataSource: attr.dataSource } : {}) };
}

/**
 * Whether a switch may give a bound boolean a fixed value (Figma: a nested boolean is always switchable). Only for an
 * expression that reads no state of the component (`status={one.online}`, a prop, data): replacing state
 * (`selected={active === id}`) would stop the component reacting, so that stays read-only. A playground's bindings are
 * its controls (`boundHint`) and stay read-only too.
 */
export function fixableBinding(value: PropValue, boundHint?: string): value is Extract<PropValue, { state: "bound" }> {
  return value.state === "bound" && !boundHint && (value.origin?.kind === "bound-value" || value.origin?.kind === "loop-bound");
}

/**
 * Whether the value can be edited where its data is written (op setDataField, plan WP-C): the dev server follows it to a
 * literal (a `.map` row's item, a data const, examples/data.ts). Never for a value that also reads state (the keep-behaviour
 * rule: state wins, `origin` bound-state) nor for a playground's controls.
 */
export function dataEditable(value: PropValue, boundHint?: string): value is Extract<PropValue, { state: "bound" }> & { dataSource: DataSource } {
  return value.state === "bound" && !boundHint && Boolean(value.dataSource?.editable) && value.origin?.kind !== "bound-state";
}

/** Where a data-edited value is written, for its row's note: "crew[0].name in host-page.tsx", "people.ava.role in data.ts". */
export function dataSourceLabel(source: DataSource, row?: number): string {
  const fields = (source.path ?? []).map((key) => `.${key}`).join("");
  // A list written in place of names (`[people.ava, people.bao]`) names the row's item itself.
  const items = source.kind === "row" ? /^\[\s*([\w$.]+(?:\s*,\s*[\w$.]+)*)\s*,?\s*\]$/.exec(source.source ?? "")?.[1].split(/\s*,\s*/) : undefined;
  // A prop of a component of the file: written where it is used.
  if (source.kind === "param") return `<${source.component ?? "the component"}>'s ${[source.prop, ...(source.path ?? [])].filter(Boolean).join(".")} where it is used`;
  // A Table cell's row: the value as the cell reads it, and which row.
  if (source.kind === "cell") return `${source.source ?? "the row"}${row !== undefined ? ` (row ${row + 1})` : ""}${source.file ? ` in ${source.file.split("/").pop()}` : ""}`;
  const where = source.kind !== "row" ? source.source ?? "data" : items?.[row ?? 0] ? `${items[row ?? 0]}${fields}` : `${source.source ?? "data"}[${row ?? 0}]${fields}`;
  return source.file ? `${where} in ${source.file.split("/").pop()}` : where;
}

/**
 * valueOf for the inspector: a prop the element's spreads do not feed (not among the props it renders with:
 * `{...avatarOf(person)}` sets theme and src, never status, background or shape) is the element's own, so it reads as
 * unset and stays editable, as in Figma. The server writes a new attribute in front of the first spread, so a spread
 * that feeds it later still wins (a playground's controls). Until the live props are read, a spread keeps it read-only.
 */
export function ownValueOf(attributes: SourceAttr[], name: string, live: Record<string, unknown> | undefined): PropValue {
  const value = valueOf(attributes, name, live);
  return value.state === "spread" && live && !Object.prototype.hasOwnProperty.call(live, name) ? { state: "unset" } : value;
}

/** Boolean HTML attributes the element props types carry; the generated API lists only a component's own props. */
const htmlBooleans: Record<string, string[]> = {
  ButtonHTMLAttributes: ["disabled"],
  InputHTMLAttributes: ["disabled", "required", "readOnly"],
  SelectHTMLAttributes: ["disabled", "required"],
  TextareaHTMLAttributes: ["disabled", "required", "readOnly"],
  FieldsetHTMLAttributes: ["disabled"],
};

/**
 * The boolean HTML attributes a component inherits through its `extends` clause (ButtonHTMLAttributes → disabled), also
 * through another component's props (Toggle extends ToggleButtonProps, NumberField's Omit<InputFieldProps, …>), minus
 * Omit<…> keys and the props it declares. A component that fixes the input type (Omit "type": a switch) gets no
 * readOnly, which only text inputs honour.
 */
function inheritedBooleans(schema: ApiComponent, depth = 0): string[] {
  if (depth > 3) return [];
  const own = new Set(schema.props.map((prop) => prop.name));
  const out: string[] = [];
  for (const clause of extendsClauses(schema)) {
    const { base, omitted } = omitOf(clause);
    const html = /^(\w+HTMLAttributes)</.exec(base)?.[1];
    const parent = ownerOf(base);
    const names = html ? (htmlBooleans[html] ?? []).filter((name) => !(name === "readOnly" && omitted.has("type")))
      : parent && parent !== schema.name && componentSchema(parent) ? inheritedBooleans(componentSchema(parent)!, depth + 1) : [];
    for (const name of names) if (!own.has(name) && !omitted.has(name) && !out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * Editable props of a component, in API order (deprecated, children, handlers, className/style/ref/key skipped), then
 * the props it takes from another Zen component's props type (inheritedProps.ts: NumberField's label, size…), then the
 * boolean HTML attributes it inherits (disabled, required, readOnly), which Figma shows as boolean properties too.
 */
/** Props that take a picture (user, 2026-10-10: "Avatar không bỏ ảnh vào được"): a photo picker, not a text field. */
const PHOTO_PROPS: Readonly<Record<string, string>> = { Avatar: "src", AppShellAccount: "src", Image: "src" };

export function propSpecs(name: string): PropSpec[] {
  const schema = componentSchema(name);
  if (!schema) return [];
  const own = [...schema.props, ...inheritedProps(schema, componentSchema)]
    .filter((prop) => !prop.deprecated && !isSkippedProp(prop.name) && !/^\(.*\) => /.test(prop.type))
    .map((prop): PropSpec => ({ name: prop.name, type: prop.type, description: prop.description, defaultValue: parseDefault(prop.default), editor: PHOTO_PROPS[name] === prop.name ? { kind: "photo" } : editorFor(prop.type) }));
  const inherited = inheritedBooleans(schema).filter((prop) => !own.some((spec) => spec.name === prop)).map((prop): PropSpec => ({ name: prop, type: "boolean", description: `The HTML ${prop} attribute (inherited).`, defaultValue: false, editor: { kind: "boolean" } }));
  return [...own, ...inherited];
}

/** The props a component requires (its own and inherited ones): Reset all overrides never removes them. */
export function requiredProps(name: string): Set<string> {
  const schema = componentSchema(name);
  if (!schema) return new Set();
  return new Set([...schema.props, ...inheritedProps(schema, componentSchema)].filter((prop) => prop.required).map((prop) => prop.name));
}

/** An editor for an attribute the API docs do not list (host elements, aria-*, data-*), from its source value. */
export function attributeSpec(attr: SourceAttr): PropSpec {
  const literal = attr.kind === "true" ? true : attr.kind === "string" ? attr.value ?? "" : literalOf(attr.value ?? "");
  const editor: PropEditor = typeof literal === "boolean" ? { kind: "boolean" } : typeof literal === "number" ? { kind: "number" } : typeof literal === "string" ? { kind: "string" } : { kind: "readonly" };
  return { name: attr.name, type: "", description: "", defaultValue: null, editor };
}

/** Components laid out by the Layout block (Figma auto layout) instead of the Properties list. */
export const layoutComponents = new Set(["Stack", "Grid", "Box", "Container", "Form", "FormFieldset", "FormActions"]);
export const layoutProps = new Set(["direction", "gap", "rowGap", "columnGap", "align", "justify", "wrap", "padding", "paddingX", "paddingY", "columns", "minColumnWidth", "maxWidth", "gutter", "inset"]);

/** Whether a component's prop belongs in the Layout block. maxWidth is scoped by component: Container's is the token
 * width (sm…full); Stack/Grid/Box's is px sizing, which stays with the other sizing props. Box's clip is Figma's Clip content. */
export function isLayoutProp(component: string, name: string) {
  if (name === "maxWidth") return component === "Container";
  // Figma's Clip content sits in the Layout section, under Padding (spec 2026-10-09 §3).
  if (name === "clip") return component === "Box";
  return layoutProps.has(name);
}
/** Text and Heading props shown in the Text block. */
export const textComponents = new Set(["Text", "Heading"]);
export const textProps = new Set(["textStyle", "tone", "align", "verticalAlign", "as", "level", "truncate"]);

/** "Body/Small/Medium" → "Body"; used to group text styles. */
export const typographyFamily = (key: string) => key.split("/")[0];
