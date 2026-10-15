// The Studio MCP's tools (spec docs/research/studio-mcp-canvas-2026-10-15.md §5; M0 2026-10-15, M1 2026-10-16): names,
// descriptions, input schemas and annotations, defined once, whatever carries them (the dev server's MCP endpoint now,
// the embedded Zen Agent later). Every tool here runs in the open Studio tab (src/platform/studio/mcp/tools.ts): the
// server only relays the call. Pure data, no Node imports.

/** A layer id on a page made in the Studio: stable across edits (tools/studio/doc.mjs). */
const ID = { type: "string", description: "A layer id from get_tree (\"n…\"): it stays the same across edits, moves and undo." };

const PROP_VALUE = {
  description: "A string, number or boolean is written as that literal (level: \"secondary\", disabled: true, gap: 8); null removes the prop.",
  anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }],
};

/** What the JSX of insert / replace / create_page may hold: the page dialect (tools/studio/dialect.mjs). */
const JSX = {
  type: "string",
  description: [
    "One JSX element in the Studio page dialect: Zen components only (their imports are added for you; no HTML tags,",
    "no style or className, no spreads, no fragments: group with Stack / Grid / Box), props written as literals",
    "(strings, numbers, booleans, and lists or objects of them), a component in a slot prop (leading={<Avatar name=\"Ava\" />}),",
    "mock data as {mock.field} or {mock.people.map((person) => <ListItem title={person.name} />)}, interactions as",
    "onClick={proto.navigate(\"screen-2\")}. Look up props and tokens with the zen-ds MCP (get_component, search_icons).",
  ].join(" "),
};

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const READ = { readOnlyHint: true, openWorldHint: false };
const NONE = { type: "object", properties: {}, additionalProperties: false };

/** The tools `batch` runs (writes on the open page; layout is one undo step). */
export const BATCH_TOOLS = ["update", "insert", "replace", "move", "duplicate", "delete", "wrap", "unwrap"];

export const TOOLS = [
  /* ── read ── */
  {
    name: "get_studio_state",
    title: "Studio state",
    description: [
      "What the person has open in Zen Studio right now: the page (a page made in the Studio, or a component page), its",
      "frames (Screens and Overlays with ids, devices and places), the selected layers, the preview modes, and whether",
      "this tab can be edited. Call it first, and again when the person says \"this\", \"the selected\" or \"here\".",
    ].join(" "),
    inputSchema: NONE,
    annotations: READ,
  },
  {
    name: "list_pages",
    title: "Studio pages",
    description: "The pages made in the Studio in this browser (id, title, folder, last change), the open one marked. open_page opens one.",
    inputSchema: NONE,
    annotations: READ,
  },
  {
    name: "get_tree",
    title: "Layer tree",
    description: [
      "The layers of the open page as an indented outline: one line per layer with its component, id (#n…), the props",
      "written on it and its text. Without `id` it starts at the frame holding the selection (or the whole page when",
      "nothing is selected). Read it before changing layers, and again after an error that says a layer is gone.",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: {
        id: { ...ID, description: "Start at this layer (a frame's or any layer's id); default: the selected frame." },
        depth: { type: "integer", minimum: 1, maximum: 20, description: "Levels below the start to list (default 8)." },
      },
      additionalProperties: false,
    },
    annotations: READ,
  },
  {
    name: "get_node",
    title: "One layer",
    description: "One layer in detail: every prop as written (with its kind), its text, its slots and layers, its parent and place, and whether it can be wrapped in auto layout.",
    inputSchema: { type: "object", properties: { id: ID }, required: ["id"], additionalProperties: false },
    annotations: READ,
  },
  {
    name: "get_code",
    title: "Layer code",
    description: "The page's code (TSX in the Studio dialect), or one layer's JSX with `id`. For handoff or to copy a layer's exact JSX into replace.",
    inputSchema: { type: "object", properties: { id: { ...ID, description: "One layer; default: the whole page." } }, additionalProperties: false },
    annotations: READ,
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
    annotations: READ,
  },

  /* ── write (each call is one ⌘Z step for the person; refused changes say why) ── */
  {
    name: "update",
    title: "Update a layer",
    description: [
      "Changes one layer as the person would in the Inspector: its props (variant, size, icon, text props, layout props",
      "such as gap or padding) and its text. Use the Zen component's prop names and values (zen-ds get_component).",
      "The answer is the layer as it is now. A refused change says why: read the reason, try another way, never repeat the same call.",
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
    annotations: { ...WRITE, idempotentHint: true },
  },
  {
    name: "insert",
    title: "Add layers",
    description: "Adds a layer (with everything inside it) into a parent layer: at `index` among the parent's layers (default: last), or into a slot prop with `prop`. Answers the new layer's id and its outline.",
    inputSchema: {
      type: "object",
      properties: {
        parent: { ...ID, description: "The layer it goes into (a Stack, a Card, a frame's content…)." },
        jsx: JSX,
        index: { type: "integer", minimum: 0, description: "Its place among the parent's layers, as get_tree lists them (0 = first); default: last." },
        prop: { type: "string", description: "A slot prop of the parent to put it in (leading, actions…) instead of its children." },
      },
      required: ["parent", "jsx"],
      additionalProperties: false,
    },
    annotations: WRITE,
  },
  {
    name: "replace",
    title: "Replace a layer",
    description: "Puts new JSX in a layer's place (another component, or the same one rebuilt). get_code gives a layer's current JSX to start from.",
    inputSchema: { type: "object", properties: { id: ID, jsx: JSX }, required: ["id", "jsx"], additionalProperties: false },
    annotations: { ...WRITE, destructiveHint: true },
  },
  {
    name: "move",
    title: "Move a layer",
    description: "Moves a layer into `parent` (another auto layout, or the same one to reorder) at `index` among its layers (default: last).",
    inputSchema: {
      type: "object",
      properties: { id: ID, parent: ID, index: { type: "integer", minimum: 0, description: "Its place among the parent's layers after the move (0 = first); default: last." } },
      required: ["id", "parent"],
      additionalProperties: false,
    },
    annotations: WRITE,
  },
  {
    name: "duplicate",
    title: "Duplicate a layer",
    description: "Adds a copy of the layer right after it. Answers the copy's id.",
    inputSchema: { type: "object", properties: { id: ID }, required: ["id"], additionalProperties: false },
    annotations: WRITE,
  },
  {
    name: "delete",
    title: "Delete a layer",
    description: "Removes a layer and everything inside it (a frame too). The person can bring it back with ⌘Z.",
    inputSchema: { type: "object", properties: { id: ID }, required: ["id"], additionalProperties: false },
    annotations: { ...WRITE, destructiveHint: true },
  },
  {
    name: "wrap",
    title: "Add auto layout",
    description: "Wraps layers that sit side by side in one parent into a new Stack (or Grid / Box), as Figma's Frame selection. Answers the wrapper's id.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: ID, minItems: 1, description: "The layers to wrap, all in the same parent." },
        tag: { enum: ["Stack", "Grid", "Box"], description: "The wrapper (default Stack)." },
        props: { type: "object", additionalProperties: PROP_VALUE, description: "The wrapper's props (direction: \"horizontal\", gap: \"small\"…)." },
      },
      required: ["ids"],
      additionalProperties: false,
    },
    annotations: WRITE,
  },
  {
    name: "unwrap",
    title: "Remove auto layout",
    description: "Replaces a Stack, Grid or Box that holds one layer with that layer.",
    inputSchema: { type: "object", properties: { id: ID }, required: ["id"], additionalProperties: false },
    annotations: WRITE,
  },
  {
    name: "batch",
    title: "Several changes",
    description: [
      "Runs several write tools in order as ONE undo step; prefer it for building or restyling a section. Each op is",
      "{ tool, args } with tool one of update, insert, replace, move, duplicate, delete, wrap, unwrap. An op may name what",
      "it adds with `as` (\"card\"), and later ops use \"$card\" wherever an id goes. When one op is refused, the ones before",
      "it are taken back and the answer says which op failed and why.",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: {
        ops: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          items: {
            type: "object",
            properties: {
              tool: { enum: BATCH_TOOLS },
              args: { type: "object", description: "The tool's arguments, as when calling it alone." },
              as: { type: "string", pattern: "^[A-Za-z][\\w-]*$", description: "A name for the layer this op adds or returns, for \"$name\" in later ops." },
            },
            required: ["tool", "args"],
            additionalProperties: false,
          },
        },
      },
      required: ["ops"],
      additionalProperties: false,
    },
    annotations: { ...WRITE, destructiveHint: true },
  },
  {
    name: "create_page",
    title: "New page",
    description: "Makes a new page in the Studio with one Screen (on `device`, with the app frame unless `chrome` is false) and opens it. Answers its layers.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 80 },
        device: { enum: ["desktop", "tablet", "phone"], description: "Default desktop." },
        chrome: { type: "boolean", description: "The app frame (sidebar, top bar, page header) on the Screen; default true." },
      },
      required: ["title"],
      additionalProperties: false,
    },
    annotations: WRITE,
  },
  {
    name: "add_frame",
    title: "Add a frame",
    description: "Adds a Screen (or an Overlay) to the open page, after the others or at x / y. Answers its id.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { enum: ["screen", "overlay"], description: "Default screen." },
        title: { type: "string", maxLength: 80 },
        device: { enum: ["desktop", "tablet", "phone"], description: "Default: the page's first Screen's." },
        x: { type: "number" },
        y: { type: "number" },
      },
      additionalProperties: false,
    },
    annotations: WRITE,
  },

  /* ── view (changes what the person sees, not the page) ── */
  {
    name: "select",
    title: "Select layers",
    description: "Selects layers on the canvas, as the person's click would (the first one shows in the Inspector). Use it to show the person what you mean.",
    inputSchema: { type: "object", properties: { ids: { type: "array", items: ID, minItems: 1 } }, required: ["ids"], additionalProperties: false },
    annotations: { ...READ, readOnlyHint: false, idempotentHint: true },
  },
  {
    name: "focus",
    title: "Zoom to a layer",
    description: "Selects a layer or frame and zooms the canvas to it.",
    inputSchema: { type: "object", properties: { id: ID }, required: ["id"], additionalProperties: false },
    annotations: { ...READ, readOnlyHint: false, idempotentHint: true },
  },
  {
    name: "open_page",
    title: "Open a page",
    description: "Opens a page made in the Studio (an id from list_pages) in the person's tab.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
    annotations: { ...READ, readOnlyHint: false, idempotentHint: true },
  },
];

export const TOOL_NAMES = new Set(TOOLS.map((tool) => tool.name));

/** What tools/list answers: the definitions without anything only the Studio reads. */
export const listedTools = () => TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations }));
