import type { PropSpec } from "./propSchema";

/*
 * Properties groups for a component without Figma groups (Design panel UI3, user 2026-10-06): its props split into a few
 * titled sections with a divider between them, as Figma and Lunagraph show a component's properties, instead of one long
 * list. A prop goes to the first group that claims it; object props get a section each (DesignPanel).
 */

export type AutoGroup = { id: string; title: string; specs: PropSpec[] };

/** What the element says (copy and data): the named text props, then any other text or node prop. */
const CONTENT = /^(label|title|subtitle|heading|value|description|caption|text|placeholder|message|eyebrow|helpText|help|hint|alt|name|content|meta|summary|unit|prefix|suffix|count|total|amount|percent|status)$/i;
/** The icon, emoji or picture it shows, and how. */
const ICON = /icon|emoji|avatar|image|photo|logo|illustration|media|thumbnail|flag/i;
/** What it lets people do. */
const ACTIONS = /action|button|cta|href|link|menu|onOpen|openLabel/i;
/** How it looks: variant-like props (a choice, a type scale, an alignment), or named for their look. */
const APPEARANCE = /size|variant|theme|level|appearance|background|tone|surface|spacing|radius|shape|color|emphasis|density|width|height|align/i;

const rules: { id: string; title: string; claims: (spec: PropSpec) => boolean }[] = [
  { id: "content", title: "Content", claims: (spec) => CONTENT.test(spec.name) },
  { id: "icon", title: "Icon", claims: (spec) => spec.editor.kind === "icon" || spec.editor.kind === "icon-toggle" || ICON.test(spec.name) },
  { id: "actions", title: "Actions", claims: (spec) => ACTIONS.test(spec.name) },
  { id: "appearance", title: "Appearance", claims: (spec) => ["enum", "number-enum", "typography", "text-align"].includes(spec.editor.kind) || APPEARANCE.test(spec.name) },
  { id: "state", title: "State", claims: (spec) => spec.editor.kind === "boolean" || spec.editor.kind === "truncate" },
  { id: "text", title: "Content", claims: (spec) => spec.editor.kind === "string" || spec.editor.kind === "node" },
];

/**
 * A row label inside its group, without the group's own word ("Icon theme" → "Theme" under Icon), as Figma shortens a
 * nested layer's properties; the row's tooltip keeps the prop's full name.
 */
export function labelInGroup(label: string, group: AutoGroup): string {
  const prefix = `${group.title} `.toLowerCase();
  if (group.id === "properties" || !label.toLowerCase().startsWith(prefix) || label.length <= prefix.length) return label;
  const rest = label.slice(prefix.length);
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/** The order sections show in: what it looks like first (Figma lists variants first), then what it says and holds. */
const order = ["appearance", "content", "icon", "state", "actions", "more"];

/**
 * The groups of `specs`, in panel order. One group (or five props or fewer) stays one "Properties" list: splitting a
 * short list only adds headers.
 */
export function autoGroups(specs: PropSpec[]): AutoGroup[] {
  if (specs.length <= 5) return specs.length ? [{ id: "properties", title: "Properties", specs }] : [];
  const byId = new Map<string, AutoGroup>();
  for (const spec of specs) {
    const rule = rules.find((candidate) => candidate.claims(spec));
    const id = rule ? (rule.id === "text" ? "content" : rule.id) : "more";
    const title = rule ? (rule.id === "text" ? "Content" : rule.title) : "More";
    const group = byId.get(id) ?? byId.set(id, { id, title, specs: [] }).get(id)!;
    group.specs.push(spec);
  }
  const groups = order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  return groups.length > 1 ? groups : [{ id: "properties", title: "Properties", specs }];
}
