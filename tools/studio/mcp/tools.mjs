// The Studio MCP's tools (spec docs/research/studio-mcp-canvas-2026-10-15.md §5, M0): names, descriptions, input schemas
// and annotations, defined once, whatever carries them (the dev server's MCP endpoint now, the embedded Zen Agent later).
// Every tool here runs in the open Studio tab (src/platform/studio/mcp/runtime.ts): the server only relays the call.
// Pure data, no Node imports.

/** A layer id on a page made in the Studio: stable across edits (tools/studio/doc.mjs). */
const ID = { type: "string", description: "A layer id from get_tree or get_studio_state (\"n…\"): it stays the same across edits, moves and undo." };

const PROP_VALUE = {
  description: "A string, number or boolean is written as that literal (level: \"secondary\", disabled: true, gap: 8); null removes the prop.",
  anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }],
};

export const TOOLS = [
  {
    name: "get_studio_state",
    title: "Studio state",
    description: [
      "What the person has open in Zen Studio right now: the page (a page made in the Studio, or a component page),",
      "its frames (Screens and Overlays with their ids, devices and places), the selected layers, the preview modes, and",
      "whether this tab can be edited. Call it first, and again when the person says \"this\", \"the selected\" or \"here\".",
    ].join(" "),
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_tree",
    title: "Layer tree",
    description: [
      "The layers of the open page as an indented outline: one line per layer with its component, id (#n…), the props",
      "written on it and its text. Without `id` it starts at the frame holding the selection (or the whole page when",
      "nothing is selected). Read it before update, and again after an error that says a layer is gone.",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: {
        id: { ...ID, description: "Start at this layer (a frame's or any layer's id); default: the selected frame." },
        depth: { type: "integer", minimum: 1, maximum: 20, description: "Levels below the start to list (default 8)." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "update",
    title: "Update a layer",
    description: [
      "Changes one layer on the canvas as the person would in the Inspector: its props (variant, size, icon, text props,",
      "layout props such as gap or padding) and its text. The change shows at once and is one ⌘Z step for the person.",
      "Use the prop names and values of the Zen component (zen-ds get_component). The answer is the layer as it is now.",
      "A refused change says why: read the reason, try another way, never repeat the same call.",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: {
        id: ID,
        props: { type: "object", additionalProperties: PROP_VALUE, description: "Props to set (or remove with null), by the component's prop names." },
        text: { type: "string", description: "The layer's own text (a Button's label, a Text's words): replaces its first text." },
      },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_screenshot",
    title: "Frame picture",
    description: [
      "A PNG of one frame of the open page as the canvas draws it (preview modes included), to check the result by eye.",
      "Pictures cost many tokens: take one after a set of changes, not after every call.",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: { id: { ...ID, description: "The frame (or a layer inside it); default: the frame holding the selection, else the first frame." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

export const TOOL_NAMES = new Set(TOOLS.map((tool) => tool.name));

/** What tools/list answers: the definitions without anything only the Studio reads. */
export const listedTools = () => TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations }));
