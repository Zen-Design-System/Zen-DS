// The user-decidable settings of the AI UI catalog (tools/ai-ui/build-catalog.mjs). Everything else in the catalog is
// derived from docs/api/*.json, docs/guidelines/index.json and the Figma contracts; change a decision here, then run
// `npm run ai-ui:build`.

/**
 * Props a generated UI may never set, by name. Styling escape hatches (className, style, overrides) would let a model
 * leave the token system; refs and keys belong to React; `state` is the Figma visual state a design shows, never
 * something a running UI sets (Disabled is the one static toggle, through `disabled`). A documented `id` prop stays: it
 * is the component's own data (SidebarMenuItem), not the DOM attribute (which react-docgen never lists).
 */
export const EXCLUDED_PROP_NAMES = new Set(["className", "style", "overrides", "ref", "key", "state", "dangerouslySetInnerHTML"]);

/** Type names whose props are excluded wherever they appear (refs, element types, CSS, DOM nodes). */
export const EXCLUDED_TYPE_RE = /\b(Ref|RefObject|MutableRefObject|ElementType|ComponentType|CSSProperties|HTMLElement|Element|SVGSVGElement|ZenFormApi|FormApi)\b/;

/**
 * Page chrome: components that frame an app, not content a conversation generates. They stay in the catalog (an app may
 * compose a whole screen) but are rejected inside a chat with `validateSpec(spec, catalog, { chrome: false })`.
 */
export const CHROME_COMPONENTS = new Set(["ZenProvider", "AppShell", "Sidebar", "SidebarItem", "SidebarSection", "TopNavigation", "BottomNavigation", "DashboardHeader", "PageHeader", "ZenPortalProvider", "ZenPortal", "Container"]);

/**
 * Status overrides: `stable` (documented, smoke- and conformance-tested) is the default for every public component;
 * `verified` is added when a Figma contract suite covers it; set `"experimental"` here to keep a component out of a
 * runtime catalog (`validateSpec` rejects it unless `{ experimental: true }`).
 */
export const STATUS_OVERRIDES = {};

/** Handler names that pair with a prop without following the `on<Prop>Change` spelling. */
export const BINDING_ALIASES = { selectedIds: "onSelectionChange", value: "onValueChange", checked: "onCheckedChange" };

/**
 * HTML attributes admitted on components whose props extend the DOM attributes (react-docgen lists the component's own
 * props only). `when` matches the `extends` text; an `Omit<…, "name">` in it drops that attribute again.
 */
const action = (type) => ({ "x-kind": "action", params: [{ name: "event", type, json: false }] });
const stringOrNumber = { anyOf: [{ type: "string" }, { type: "number" }] };
export const HTML_ATTRIBUTES = [
  { when: /HTMLAttributes/, props: { "aria-label": { type: "string" }, "aria-labelledby": { type: "string" }, "aria-describedby": { type: "string" } } },
  { when: /ButtonHTMLAttributes/, props: { disabled: { type: "boolean" }, onClick: action("MouseEvent<HTMLButtonElement>") } },
  {
    when: /(Input|Textarea|Select)HTMLAttributes/,
    props: {
      disabled: { type: "boolean" }, readOnly: { type: "boolean" }, required: { type: "boolean" }, placeholder: { type: "string" }, name: { type: "string" },
      autoComplete: { type: "string" }, inputMode: { enum: ["none", "text", "decimal", "numeric", "tel", "search", "email", "url"] },
      maxLength: { type: "number" }, min: stringOrNumber, max: stringOrNumber, step: stringOrNumber,
    },
  },
];

/** Controlled props the renderer binds to shared state by node id even when the spec does not mention them (so what the person picks reaches the conversation). */
export const AUTO_BIND_PROPS = new Set(["value", "checked", "open", "page", "range", "expanded", "selected"]);
