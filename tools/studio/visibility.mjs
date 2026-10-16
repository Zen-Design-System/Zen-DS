// Hidden layers and hidden slots on a builder page (user, 2026-10-16: "tắt ẩn các element như trong Figma"; spec
// docs/research/responsive-header-spec-2026-10-16.md P1.2). Two Studio-only props, as Figma's two kinds of visibility:
//   hidden        on any layer (Figma's eye): `hidden` (every layout) · `hidden="mobile"` · `hidden="desktop"` (one layout
//                 only, Primer's responsive `hidden`). The canvas keeps the layer (Layers lists it, dimmed) and draws it
//                 nowhere; export and Figma push leave it out on the layouts it is hidden on.
//   hiddenSlots   on a component: the slot props switched off (Figma's slot boolean, Nav-Trailing-Block=false). The
//                 component draws without them and their layers stay in the page, so switching one back on brings them back.
// No imports: the Studio client, the renderer, compile and push read it.

export const HIDDEN_PROP = "hidden";
export const HIDDEN_SLOTS_PROP = "hiddenSlots";
/** The layouts a layer can be hidden on alone (screen-chrome.mjs SCREEN_LAYOUTS). */
export const HIDDEN_LAYOUTS = ["mobile", "desktop"];
/** Props a builder page writes for the Studio only: never passed to a component, never exported. */
// phoneLinked: a Screen's phone parts that follow its desktop header (responsive-header.mjs).
export const STUDIO_ONLY_PROPS = new Set([HIDDEN_PROP, HIDDEN_SLOTS_PROP, "phoneLinked"]);

/** The literal value of a `hidden` prop (dialect Value or plain value) → true | "mobile" | "desktop" | null. */
export function hiddenValueOf(value) {
  const plain = value && typeof value === "object" && "kind" in value ? (value.kind === "literal" ? value.value : undefined) : value;
  if (plain === true) return true;
  return HIDDEN_LAYOUTS.includes(plain) ? plain : null;
}

/** Whether a layer with this `hidden` value is hidden on `layout` ("mobile" | "desktop"; undefined: a frame with no layout). */
export function hiddenOn(value, layout) {
  const hidden = hiddenValueOf(value);
  if (hidden === true) return true;
  return hidden !== null && hidden === layout;
}

/** The slot props a `hiddenSlots` value switches off (dialect Value or plain value) → string[]. */
export function hiddenSlotsOf(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === "string");
  if (value.kind === "literal" && Array.isArray(value.value)) return value.value.filter((entry) => typeof entry === "string");
  if (value.kind === "array") return value.items.filter((item) => item.kind === "literal" && typeof item.value === "string").map((item) => item.value);
  return [];
}

/** The words for a `hidden` value, as the Layers menu and the Inspector say it. */
export function hiddenLabel(value) {
  const hidden = hiddenValueOf(value);
  return hidden === true ? "Hidden" : hidden === "mobile" ? "Hidden on mobile" : hidden === "desktop" ? "Hidden on desktop" : "Visible";
}

/**
 * `node` (a dialect element: parsePage or a document) as drawn on `layout`: hidden layers and switched-off slots left
 * out, the Studio-only props gone. Export (compile.mjs) and Figma push draw this. A prop left with nothing goes.
 */
export function pruneHidden(node, layout) {
  if (hiddenOn(node.props[HIDDEN_PROP], layout)) return null;
  const off = new Set(hiddenSlotsOf(node.props[HIDDEN_SLOTS_PROP]));
  const value = (entry) => {
    if (entry.kind === "element") { const next = pruneHidden(entry.node, layout); return next ? { ...entry, node: next } : null; }
    if (entry.kind === "fragment") { const children = entry.children.map(child).filter(Boolean); return children.length ? { ...entry, children } : null; }
    if (entry.kind === "array") return { ...entry, items: entry.items.map(value).filter(Boolean) };
    if (entry.kind === "object") return { ...entry, fields: Object.fromEntries(Object.entries(entry.fields).map(([key, field]) => [key, value(field)]).filter(([, field]) => field)) };
    return entry;
  };
  const child = (entry) => {
    if (entry.kind === "element") return pruneHidden(entry, layout);
    if (entry.kind === "map") { const next = pruneHidden(entry.node, layout); return next ? { ...entry, node: next } : null; }
    return entry;
  };
  const props = {};
  for (const [name, entry] of Object.entries(node.props)) {
    if (STUDIO_ONLY_PROPS.has(name) || off.has(name)) continue;
    const next = value(entry);
    if (next) props[name] = next;
  }
  return { ...node, props, children: node.children.map(child).filter(Boolean) };
}
