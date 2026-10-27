/*
 * Where an instance's property lands in the Properties section (the UX review 2026-10-27 §2.8, §7 item 7): Content ·
 * Look · Behavior · Advanced, derived from the API JSON (name, TypeScript type, JSDoc) and the Figma read (a variant, a
 * layer boolean). Figma shows an instance's variants, booleans, texts and swaps; a Zen component has up to 37 props, so
 * the Design tab groups them, Content and Look open, Behavior and Advanced folded (GroupedProperties.tsx). The spec
 * card with the rules and the Metric card / Button / Table placements: docs/context/session-log-2026-10-27.md.
 *
 * Pure: no React, no store (node src/platform/studio/inspector/propCategories.selftest.mjs imports it directly).
 */

export type PropCategory = "content" | "look" | "behavior" | "advanced";

/** The groups in panel order; `open`: shown open when the instance is selected (the others fold, with a count of what is set). */
export const PROP_CATEGORIES: ReadonlyArray<{ key: PropCategory; label: string; open: boolean }> = [
  { key: "content", label: "Content", open: true },
  { key: "look", label: "Look", open: true },
  { key: "behavior", label: "Behavior", open: false },
  { key: "advanced", label: "Advanced", open: false },
];

/** What the categoriser reads of a prop: the API JSON's name, type and description. */
export type PropFacts = { name: string; type: string; description?: string };

/** Where the prop comes from in the Figma read: a variant (Type, Size…), a layer boolean (Trend, Hint…), or code only. */
export type PropHint = "variant" | "toggle" | "code";

/** Props whose place the rules would get wrong, by component. */
const OVERRIDES: Readonly<Record<string, Readonly<Record<string, PropCategory>>>> = {
  // Figma's State variant (Default · Hover · Pressed · Focused · Disabled) is a look, as in its instance panel.
  Button: { state: "look" },
  IconButton: { state: "look" },
  // What the Table does with its rows: selection, sorting, editing.
  Table: { bulkActions: "behavior", sort: "behavior" },
  // How a number reads (a formatter or a preset) is not content.
  MetricCard: { format: "advanced" },
  Metric: { format: "advanced" },
};

const ADVANCED_NAMES = /^(?:aria-|data-)|^(?:id|idPrefix|name|as|href|target|rel|role|tabIndex|htmlFor|form|locale|currency|format|formatter|getRowId|headingLevel|seriesLabel|anchorRef|popoverPortal|portal|className|style|ref|key|autoComplete|inputMode|pattern|method|action|encType|download|lang|dir|type|linkAs|noValidate|maxLength|accept)$/;
const LOOK_BOOLEANS = /^(?:fullWidth|bordered|borderless|striped|dense|compact|inverse|flat|rounded|elevated|inline|wrap|noWrap|truncate|block|fill|outlined|raised|shadow|dividers?|hugContents|fitContent|stretch|square|circle|pill|sticky)$/;
const CONTENT_BOOLEANS = /^(?:show|hide|with|has)[A-Z]/;
/** A boolean that draws a layer (a Chip's Dropdown chevron, a Metric's dot): Figma's layer boolean, whether or not the
 *  Figma read maps it. */
const LAYER_BOOLEANS = /^(?:dropdown|chevron|arrow|icon|avatar|badge|counter|hint|dot|caption|image|thumbnail|divider|metricColor)$/;
const BEHAVIOUR_ENUMS = /^(?:sort|edit|mode|trigger|interaction|validation|closeOn|selection)/i;
/** Selection and open state, whatever its type (ids, keys, an index): what the component does, not what it shows. */
const BEHAVIOUR_NAMES = /^(?:default)?(?:selected|current|active|open|expanded|checked|pressed|focused)(?:[A-Z]\w*)?$/i;
/** A look by name when the type says nothing (a type alias such as DockIconTheme). */
const LOOK_NAMES = /^(?:theme|color|tone|variant|size|shape|radius|emphasis|density|appearance|level|surface|spacing|elevation|align|justify|direction|orientation|placement|position|side)$|(?:Theme|Color|Tone|Size|Shape|Radius|Align|Background|Spacing)$/;
const CONTENT_NUMBERS = /^(?:value|count|total|amount|progress|percent(?:age)?|rating|score|index|page|pages)$/;
const BEHAVIOUR_NUMBERS = /^(?:min|max|step|delay|duration|timeout|limit|threshold|debounce|interval|maxLength|minLength)$/;
const LOOK_NUMBERS = /^(?:columns|span|rowSpan|gap|lines|maxLines|width|height|size|ratio|aspectRatio|opacity|strokeWidth|thickness|level)$/;
const ADVANCED_WORDS = /screen readers?|accessible name|assistive/i;

/** Splits a TypeScript union at the top level ("a" | Foo<"b" | "c"> | (x: y) => z). */
function members(type: string): string[] {
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
  return parts.filter((part) => part && part !== "undefined" && part !== "null");
}

/** The plain type: a per-breakpoint Responsive<X> edits X. */
const plain = (type: string) => /^Responsive<([\s\S]+)>$/.exec(type.trim())?.[1] ?? type.trim();

const isStringLiteral = (member: string) => /^"[^"]*"$|^'[^']*'$/.test(member);
const isNumberLiteral = (member: string) => /^-?\d+(?:\.\d+)?$/.test(member);

/** The category of a prop, by the rules of the spec card (first that holds). */
export function propCategory(component: string, prop: PropFacts, hint?: PropHint): PropCategory {
  const own = OVERRIDES[component]?.[prop.name];
  if (own) return own;
  if (hint === "toggle") return "content";
  if (hint === "code") return "advanced";
  const type = plain(prop.type);
  const parts = members(type);
  const enumType = parts.length > 0 && parts.every(isStringLiteral);
  const booleanType = parts.length > 0 && parts.every((part) => part === "boolean" || part === "true" || part === "false");
  if (hint === "variant") return booleanType ? booleanCategory(prop.name) : "look";
  if (parts.some((part) => /=>/.test(part))) return "advanced";
  if (ADVANCED_NAMES.test(prop.name) && !(prop.name === "type" && enumType)) return "advanced";
  if (prop.description && ADVANCED_WORDS.test(prop.description)) return "advanced";
  if (booleanType) return booleanCategory(prop.name);
  if (BEHAVIOUR_NAMES.test(prop.name)) return "behavior";
  if (enumType) return BEHAVIOUR_ENUMS.test(prop.name) ? "behavior" : "look";
  // A number, or a number with a word beside it (span: number | "full").
  if (parts.length > 0 && parts.some((part) => part === "number" || isNumberLiteral(part))) {
    if (CONTENT_NUMBERS.test(prop.name)) return "content";
    if (BEHAVIOUR_NUMBERS.test(prop.name)) return "behavior";
    if (LOOK_NUMBERS.test(prop.name)) return "look";
    return "content";
  }
  if (LOOK_NAMES.test(prop.name)) return "look";
  return "content";
}

function booleanCategory(name: string): PropCategory {
  if (LAYER_BOOLEANS.test(name)) return "content";
  if (LOOK_BOOLEANS.test(name)) return "look";
  if (CONTENT_BOOLEANS.test(name)) return "content";
  return "behavior";
}

/** The label of a category. */
export const categoryLabel = (key: PropCategory) => PROP_CATEGORIES.find((category) => category.key === key)?.label ?? key;
