import type { PlatformPage } from "../PlatformExamples";
import type { PlatformShellSettings } from "../PlatformTemplate";

/*
 * Zen Studio contracts shared by every studio module and by the dev-server plugin (tools/studio). Spec:
 * docs/research/zen-studio-spec-2026-10-02.md. Keep this file free of runtime imports.
 */

/** Canvas tools: Select (V) picks layers, Hand (H) pans, Interact (I) uses the examples like a real app. */
export type StudioTool = "select" | "hand" | "interact";

/** Admin edits source through the dev server; Viewer inspects read-only. Default admin. */
export type StudioRole = "admin" | "viewer";

/** World → screen: screenX = worldX * zoom + x, screenY = worldY * zoom + y (x/y in canvas-viewport pixels). */
export type StudioViewport = { x: number; y: number; zoom: number };

/** Token modes applied to the canvas content (the frames), not to the Studio chrome. */
export type StudioPreviewSettings = PlatformShellSettings;

/** A frame on the board. Ids are stable per page: "playground", "docs", "document", "example:<n>". */
export type StudioFrameKind = "playground" | "example" | "docs" | "document";
/** "auto" = the rule width; a number = px, a toolbar preset (390…1440) or a free width dragged on the frame's right edge. */
export type StudioFrameWidth = "auto" | number;
export type StudioFrameOverride = { width?: StudioFrameWidth; theme?: "light" | "dark" };

/**
 * A selected JSX element. `src` is the data-zen-src value "<file>:<line>:<column>" (line 1-based, column 0-based,
 * Babel's convention) that the dev-server plugin writes on every JSX element of the platform source.
 */
export type StudioNodeRef = {
  src: string;
  /** Component display name ("Button", "Stack") or the host tag ("div"). */
  name: string;
  frameId: string | null;
  /** ComponentPreview id of the playground panel that contains it, when inside a playground. */
  panelId: string | null;
  /** Which DOM instance, when one JSX element renders several times (.map). */
  instance: number;
};

/**
 * An internal part of the selected JSX element (deep select, read-only): a component the element renders inside itself
 * (SidebarItem, InputLabel…) or one of its DOM nodes. `path` leads from the element's DOM nodes to the part's first DOM
 * node: [index among the element's top-level DOM nodes, then child-element indices]. Recomputed after re-renders.
 */
export type StudioPartRef = { path: number[]; name: string };

/** `src` stays the annotated JSX element (the owner) when `part` names one of its internal parts. */
export type StudioSelection = { kind: "frame"; frameId: string } | ({ kind: "node"; part?: StudioPartRef } & StudioNodeRef);

export type StudioLeftTab = "pages" | "layers" | "assets";
export type StudioInspectorTab = "design" | "code" | "prototype";

/**
 * One changed region of an edit, on whole lines: at char offset `start` of the text before the edit, `removed` became
 * `inserted`. `above` and `below` are the unchanged lines around it (2–12, grown until the hunk is unique; see
 * makePatch in history.ts): on a file changed elsewhere, undo and redo apply a hunk only where its lines occur exactly
 * once. `ambiguous`: look-alikes remained at record time, so it applies only to the exact recorded text (a hunk
 * without the flag, from an older Studio, counts as ambiguous).
 */
export type StudioEditHunk = { start: number; removed: string; inserted: string; above: string; below: string; ambiguous?: boolean };

/** The change an edit made: its hunks in file order (an edit that also synced its example snippet has two). */
export type StudioEditPatch = { hunks: StudioEditHunk[] };

/** One applied source edit, for undo/redo and the "changed lines" marks in the code view. */
export type StudioEditRecord = {
  file: string;
  label: string;
  /** sha1 of the whole file before and after the edit (after an undo or redo, of the texts that step wrote and found). */
  hashBefore: string;
  hashAfter: string;
  patch: StudioEditPatch;
  /** 1-based inclusive line range of the change in the text after the edit. */
  changed: { from: number; to: number };
  at: number;
};

/** A source write the Studio made (an edit, undo or redo), with the whole file before and after it. */
export type StudioWrite = { file: string; before: string; after: string; kind: "edit" | "undo" | "redo" };

export type StudioState = {
  page: PlatformPage;
  /** A builder page kept in this browser (Studio builder GĐ2: "?page=local:<id>"), shown instead of `page`; else null. */
  localPage: string | null;
  collection: string | null;
  tool: StudioTool;
  role: StudioRole;
  /** Colour mode of the Studio chrome (panels, toolbar). `preview.theme` (the canvas) always changes with it (shell/modes.ts setStudioTheme). */
  chromeTheme: "light" | "dark";
  preview: StudioPreviewSettings;
  /** Last viewport per page key (`page` or `design-tokens/<collection>`). */
  viewports: Record<string, StudioViewport>;
  selection: StudioSelection | null;
  leftTab: StudioLeftTab;
  inspectorTab: StudioInspectorTab;
  /** Frame being shown full screen (Present), or null. */
  presenting: string | null;
  /** Per page key, per frame id. */
  frameOverrides: Record<string, Record<string, StudioFrameOverride>>;
  undo: StudioEditRecord[];
  redo: StudioEditRecord[];
  /** Narrow windows: which side panel is open as a drawer. */
  drawer: "left" | "right" | null;
  /** Side panel widths (px, resizable) and whether the panels show at all (⌘\ hides the UI, like Figma). */
  panels: { left: number; right: number; ui: boolean };
};

/* ───────────── Dev-server API (tools/studio/vite-plugin-zen-studio.mjs) ───────────── */

export const STUDIO_API = "/__zen-studio";
/** Write requests carry this header; the server refuses writes without role admin. */
export const STUDIO_ROLE_HEADER = "x-zen-studio-role";
/** Write requests also carry the dev server's per-start token from GET /ping (pages on other origins cannot read it). */
export const STUDIO_TOKEN_HEADER = "x-zen-studio-token";

/**
 * GET /source answers the file's effective text: its admin draft when it has one, else the disk. `hash` is always the
 * sha1 of `content`. Drafted files add `draft: true`, `base` (the disk text when the draft started), `baseHash` (sha1 of
 * `base`) and `diskHash` (sha1 of the disk now, null when the file is gone from disk); the draft is stale when
 * `diskHash !== baseHash` (another session or editor changed the file since).
 */
export type SourceFile = { file: string; content: string; hash: string; draft?: boolean; base?: string; baseHash?: string; diskHash?: string | null };

export type SourceAttr = {
  name: string;
  /** string: name="…"; true: shorthand `name`; expression: name={…}; spread: {...rest} (name is "…"). */
  kind: "string" | "true" | "expression" | "spread";
  /** The string value (kind string) or the expression source without braces (kind expression). */
  value?: string;
  /** The attribute exactly as written. */
  raw: string;
  line: number;
  /** An object or array literal written in place (`leading={{ … }}`, `trailing={[{ … }]}`): its fields, edited by op setField. */
  shape?: AttrShape;
  /**
   * A bare identifier that reads `const [name, setName] = useState(<literal>)` in an enclosing function: its initial state,
   * which op setStateInit edits (the binding, and so the component's behaviour, stays).
   */
  state?: { name: string; value: string | number | boolean; line: number };
  /**
   * What an expression attribute (not a literal, not `state`) reads, from the identifiers at its root (dev server,
   * 2026-10-05): `bound-state` reads a useState value of an enclosing function directly or through a local const
   * (`selected={active === id}`: the component's own interaction, never replaced by a literal); `loop-bound` reads a
   * .map/.flatMap callback parameter (one element renders every row: `rows` is how many when the array is a literal or a
   * same-file const); `bound-value` reads anything else (props, data, imports: `status={one.online}`), which a fixed value
   * may replace. The Studio builder plan's WP-C extends this set (data-const, data-import, …).
   */
  origin?: { kind: "bound-state" | "loop-bound" | "bound-value"; reads: string[]; rows?: number };
  /** Where the value is written as data, and whether op setDataField can edit it there (tools/studio/data-source.mjs). */
  dataSource?: DataSource;
};

/**
 * Where an expression's value is written as data (dev server, tools/studio/data-source.mjs, plan WP-C): a `.map` row of a
 * literal list (`row`: the list is `source`, the field `path`), a data const or import read by path (`data`), state,
 * a condition or other code. `editable`: op setDataField can write the value there (`file`: where, maybe data.ts);
 * otherwise `reason` says why it stays read-only.
 */
export type DataSource = {
  kind: "row" | "data" | "state" | "conditional" | "expression" | "literal" | "unknown";
  editable: boolean;
  source?: string;
  path?: string[];
  file?: string;
  reason?: string;
  /** Client only (the inspector): which row of the list the selected instance renders, for the edit and its note. */
  row?: number;
};

/** A field of an object literal: a plain literal, an expression as written, or a spread (`key` "…"). */
export type ShapeField =
  | { key: string; kind: "string"; value: string }
  | { key: string; kind: "boolean"; value: boolean }
  | { key: string; kind: "number"; value: number }
  | { key: string; kind: "expression" | "spread"; value: string };

export type ObjectShape = { type: "object"; fields: ShapeField[] };
/** An array item that is not an object literal (a string, an expression, a spread). */
export type ValueShape = { type: "value"; kind: ShapeField["kind"]; value: string | number | boolean };
export type AttrShape = ObjectShape | { type: "array"; items: Array<ObjectShape | ValueShape> };

export type SourceChild =
  /** `expression`: written as a string literal ({"…"}, {'…'}, {`…`} without ${}); setText keeps that form. */
  | { kind: "text"; index: number; value: string; expression?: boolean }
  | { kind: "element"; name: string; loc: string }
  | { kind: "expression"; raw: string; dataSource?: DataSource };

export type SourceElement = {
  file: string;
  /** "<line>:<column>" of the opening tag. */
  loc: string;
  name: string;
  /** 1-based lines of the whole element (opening tag to closing tag). */
  startLine: number;
  endLine: number;
  attributes: SourceAttr[];
  children: SourceChild[];
  /** typographyStyles["…"] keys used in its className. */
  typography: string[];
  /**
   * Whether op "wrap" takes the element where it sits (dev server, since 2026-10-03): false with a reason for an element a
   * component clones (an attribute value such as Menu's trigger, Tooltip's child…), HTML nesting a <div> would break,
   * or docs chrome. The tag, props and the file's own Box are checked by the op itself.
   */
  wrap?: { ok: boolean; reason?: string };
  /** Char offsets of the element in the file's text (without a BOM): its exact code for ⌘C (dev server, 2026-10-03). */
  range?: { start: number; end: number };
  /**
   * The saved file's version of each attribute the draft changed (GET /element on a drafted file, 2026-10-05): the
   * attribute as saved, or null when the saved element does not write it. Lets a reset put a binding back
   * (`status={one.online}` after a fixed value) and a presence toggle restore what it removed.
   */
  savedAttributes?: Record<string, SourceAttr | null>;
  hash: string;
};

export type EditValue =
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "number"; value: number }
  | { kind: "expression"; code: string };

/**
 * A useState value inserted code reads (`name` and `set` + Name): `initial` is a literal, `type` built-in type words
 * (`string[]`). The server declares it in the enclosing component (tools/studio/slots.mjs stateFor).
 */
export type StateDecl = { name: string; initial: string; type?: string };

export type EditOp =
  | { op: "setProp"; name: string; value: EditValue }
  | { op: "removeProp"; name: string }
  /** Attribute `name` reads a useState(<literal>) (SourceAttr.state): `value` becomes that initial state. */
  | { op: "setStateInit"; name: string; value: EditValue }
  /** Writes a prop's (or an expression child's) value where the data holds it: a `.map` row's item, a data const (WP-C). */
  | { op: "setDataField"; prop?: string; child?: number; row?: number; value: EditValue }
  /**
   * One field of the object literal written in attribute `name` (`leading={{ … }}`), or of its `index`-th item when it is
   * an array literal (`trailing={[{ … }]}`): `value` replaces or appends the field, null removes it (SourceAttr.shape).
   */
  | { op: "setField"; name: string; index?: number; key: string; value: EditValue | null }
  /** Replace the index-th text child (as listed in SourceElement.children). */
  | { op: "setText"; index: number; value: string }
  /** Swap a typographyStyles["from"] key for "to" in the element's className. */
  | { op: "setTypography"; from: string; to: string }
  /**
   * Give the element's className typographyStyles[value]: its uses switch to value, or one is added (the file gains the
   * typographyStyles import when it has none). null removes every use (the className too when nothing is left).
   */
  | { op: "setTextStyle"; value: string | null }
  /**
   * Detach a presentational component instance into Zen primitives (Box/Stack/Text… with token props), Figma-like.
   * `measured` = token keys the client read from the rendered instance for the plan's slots (GET /detach-plan); a
   * "padding" slot whose sides differ is sent as `<key>X` / `<key>Y`.
   * `instance` = the row to detach alone: its index in the `.map` result (the K of `(index as number) === K`).
   */
  | { op: "detach"; measured?: Record<string, string>; instance?: number }
  /**
   * Wrap the element in a Layout primitive (Figma's Frame selection): `<tag …props>element</tag>`, props formatted like
   * setProp (never `key` or `children`; the element's `key` moves to the wrapper). The file gains the tag in its Layout
   * import. Must be the request's only op; the answer's `wrapped.loc` is the wrapper, to select it. The client sends "Box".
   * `with`: the opening-tag locs of more layers of the same JSX parent, wrapped together in source order (Frame selection /
   * Add auto layout on a multi-selection; tools/studio/README.md "Wrap several layers").
   */
  | { op: "wrap"; tag: "Box" | "Stack" | "Grid"; props: Record<string, EditValue>; with?: string[] }
  /**
   * A one-layer wrap undone (the Studio's Ignore auto layout off on a Box it made float): the Box, Stack or Grid that
   * holds exactly one element is replaced by it, the wrapper's props going with it (its `key` back onto the element). Must
   * be the request's only op; the answer's `unwrapped.loc` is the element, to select it.
   */
  | { op: "unwrap" }
  /*
   * Content slots (docs/research/studio-slots-spec-2026-10-03.md "Source ops", tools/studio/slots.mjs). Each must be the
   * request's only op. insertChild is sent on the slot's host (or the slot's only Stack/Grid); the others on the element.
   */
  /**
   * Add one JSX element (`code`: a palette snippet, lines after the first indented from column 0) to the element's
   * `prop` slot (omitted: children) before `index` in SourceElement.children (omitted: at the end). `wrap`: the slot's
   * current content and the new element go into `<tag …props>` (gap-less slots). `requires: ["toast"]`: the enclosing
   * component gains `const { toast } = useToast();`. `state`: it gains `const [name, setName] = useState(initial);`
   * per entry, under fresh names (the code is renamed to match). The answer's `inserted.loc` is the new element.
   */
  | { op: "insertChild"; code: string; prop?: string; index?: number; wrap?: { tag?: "Stack" | "Grid" | "Box"; props?: Record<string, EditValue> }; requires?: ("toast" | "media")[]; state?: StateDecl[] }
  /** Remove the element (its lines, the attribute that holds it, or the `&&` around it); `hash` required. Answer: `removed`. */
  | { op: "removeElement" }
  /** The element's source again right after it; the answer's `inserted.loc` is the copy. */
  | { op: "duplicateElement" }
  /** Swap with the previous / next element sibling in the same JSX parent; the answer's `moved.loc` is where it is now. */
  | { op: "moveElement"; to: "prev" | "next" }
  /**
   * Drag in auto layout (Figma): the element goes into the JSX element at `parent` ("line:col"), before the child at
   * `before` / after the one at `after` (neither: last), same file; `copy` leaves it in place (⌥-drag). `hash`
   * required. Answer: `moved.loc`, or `inserted.loc` for a copy (tools/studio/arrange.mjs).
   */
  | { op: "moveTo"; parent: string; before?: string; after?: string; copy?: boolean; replace?: string }
  /**
   * ⌘V of code (another file, or after a cut), sent on the element it goes into: one JSX element, before / after /
   * replacing the child at that loc (none: last). Names it reads must exist there or be Zen components (imported), or
   * the names of `state` (an Assets item: declared as insertChild does). `hash` required. Answer: `inserted.loc`
   * (tools/studio/arrange.mjs).
   */
  | { op: "pasteCode"; code: string; before?: string; after?: string; replace?: string; state?: StateDecl[] }
  /**
   * A multi-selection in one file, one edit: every element at `locs` removed, duplicated (each copy after it) or given
   * the same setProp / removeProp `ops`. `hash` required. Answer: `removed`, `inserted.loc` (first copy) or `updated`.
   */
  | { op: "many"; action: "remove" | "duplicate" | "setProps"; locs: string[]; ops?: EditOp[] }
  /** Figma "Delete contents": empty the host's `prop` slot (omitted: children); `hash` required. Answer: `cleared`. */
  | { op: "clearSlot"; prop?: string }
  /** Figma "Reset slot": the host's `prop` slot (omitted: children) back to the saved file; `hash` required. Answer: `reset`. */
  | { op: "resetSlot"; prop?: string };

/**
 * What GET /__zen-studio/detach-plan?file&loc&name[&instances=N][&lists=N] answers for an element: whether it can be
 * detached and what to measure. `instances` = how many times the element renders in its frame (more than one outside a
 * `.map` is refused); `lists` = how many distinct lists that `.map` renders (more than one is refused).
 */
export type DetachPlan =
  | {
      ok: true;
      component: string;
      /** Inside a `.map` callback: the edit needs `instance` and replaces only that row. */
      repeated: boolean;
      /** For a `.map` row: the element the callback returns (the row's root), to find the row among its siblings. */
      mapRow?: { loc: string; name: string } | null;
      /** Values the client measures on the rendered instance (CSS selector inside the instance root, what to read). */
      slots: Array<{ key: string; kind: "gap" | "padding" | "paddingX" | "paddingY" | "textStyle" | "tone" | "radius"; selector: string }>;
    }
  | { ok: false; reason: string };

/** `shared`: the person confirmed a structural edit in shared code (plan WP-B2); the server refuses it with code "confirm" until then. */
export type EditRequest = { file: string; loc: string; name: string; ops: EditOp[]; hash?: string; shared?: boolean };

/**
 * Whether an edit was carried into the file's hand-written example snippets (template literals of `code:`
 * properties). Present only when the file has such snippets and the edit changed something. `reason` (when not synced)
 * is a short sentence for "Snippet not updated: <reason>", e.g. "the example snippet does not show this code (<Stack>)",
 * "this code appears in more than one snippet (…)", "this code appears more than once in the snippet (…)".
 */
export type StudioSnippetSync = { synced: boolean; reason?: string };

/**
 * `hash`/`hashBefore`/`before`/`after` are of the file's effective text (draft or disk). `draft`: the edit went into the
 * file's admin draft (nothing on disk changed; POST /save writes it). Absent or false: it was written to disk (a server
 * without drafts, or a draft that matched the disk again and was dropped).
 */
export type EditResponse =
  | { ok: true; file: string; hash: string; hashBefore: string; before: string; after: string; changed: { from: number; to: number }; snippet?: StudioSnippetSync; detached?: { component: string; loc: string; approximations: string[] }; wrapped?: { loc: string }; unwrapped?: { loc: string }; inserted?: { loc: string }; moved?: { loc: string }; removed?: true; cleared?: true; reset?: true; draft?: boolean }
  | { ok: false; code: "stale" | "not-found" | "forbidden" | "invalid"; error: string }
  /** A structural edit in shared code waits for the person's yes: `uses` files import it (`users`: the first few). */
  | { ok: false; code: "confirm"; error: string; uses?: number; users?: string[] };

/** `expectHash` is checked against the effective text; the content goes into the draft (`draft: true`), as /edit. */
export type WriteRequest = { file: string; content: string; expectHash: string };
export type WriteResponse = { ok: true; hash: string; draft?: boolean } | { ok: false; code: "stale" | "forbidden" | "invalid"; error: string };

/**
 * `token` is null when the page was not opened on a loopback host (then the Studio is read-only). `drafts`: this server
 * keeps admin edits as drafts until POST /save (absent on servers that write every edit to disk).
 */
export type PingResponse = { ok: true; root: string; writable: boolean; token: string | null; drafts?: boolean };

/* ───────────── Admin drafts (GET /drafts, POST /save, POST /discard; admin role + token + same origin) ───────────── */

/**
 * One file with an unsaved admin draft. `stale`: the disk changed since the draft started (`diskHash !== baseHash`;
 * Save then rebases the draft's hunks onto the disk, or reports a conflict). `changedLines`: added/removed line counts
 * of the draft against its base. `updatedAt`: ms epoch of the last draft change.
 */
export type DraftInfo = { file: string; baseHash: string; diskHash: string | null; stale: boolean; changedLines: { added: number; removed: number }; updatedAt: number };

/**
 * GET /__zen-studio/drafts (token + same origin, the role header sent as for writes). Any role may read it: a Viewer
 * shows "Unsaved admin drafts are shown" from it; only Save and Discard need role admin.
 */
export type DraftsResponse = { ok: true; drafts: DraftInfo[] } | { ok: false; code: "forbidden" | "invalid"; error: string };

/**
 * POST /__zen-studio/save and /discard: `files` omitted = every draft; or `frame` (not both): only the changes that
 * canvas frame owns (its DOM's data-zen-src locs, "src/…/button.tsx:84:6"), with the import lines they need.
 */
export type DraftFilesRequest = { files?: string[]; frame?: { locs: string[] } };

/**
 * A draft Save wrote to disk: `hash` = sha1 of the disk now; `rebased`: the disk had changed and the hunks were rebased;
 * `partial` (a frame's Save): the file keeps a draft with its other changes.
 */
export type SavedDraft = { file: string; hash: string; rebased?: boolean; partial?: boolean };
/** A draft Save could not write (kept as a draft): `reason` is a short sentence ("the disk changed the same lines"). */
export type DraftConflict = { file: string; conflict: true; reason: string };

/**
 * POST /__zen-studio/save. `harness` = style-guard + usage-guard on the saved files: `ok` when both are clean,
 * `findings` one line each ("button.tsx:84 spacing/token-only …"); not run (ok, no findings) when nothing was saved.
 */
export type SaveResult =
  | { ok: true; saved: SavedDraft[]; conflicts: DraftConflict[]; harness: { ok: boolean; findings: string[] } }
  | { ok: false; code: "forbidden" | "invalid"; error: string };

/** POST /__zen-studio/discard: the files whose drafts were dropped (`partial`, a frame's Discard: files that keep a draft). */
export type DiscardResult = { ok: true; discarded: string[]; partial?: string[] } | { ok: false; code: "forbidden" | "invalid"; error: string };

/** The draft changes one canvas frame owns: change blocks, their lines, the files (import lines not counted). */
export type FrameDraft = { changes: number; added: number; removed: number; files: string[] };

/**
 * POST /__zen-studio/frame-drafts { frames: [{ id, locs }] } (token, any role): each frame's changes, and the changes no
 * listed frame owns (`outside`: only Save all writes them).
 */
export type FrameDraftsResponse = { ok: true; frames: Record<string, FrameDraft>; outside: { changes: number; files: string[] } };
