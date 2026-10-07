# Zen Studio dev-server plugin

`vite-plugin-zen-studio.mjs` lets Zen Studio (the canvas tool in `src/platform/studio`) map what you click back to the
JSX that rendered it and edit that JSX in place. It runs on the dev server only (`apply: "serve"`). Spec:
`docs/research/zen-studio-spec-2026-10-02.md` §8. Since 2026-10-03 admin edits are **drafts** (§4): nothing reaches the
files on disk until an admin presses Save; Discard drops them.

```ts
// vite.studio.config.ts (and later vite.config.ts): list it BEFORE @vitejs/plugin-react.
plugins: [zenStudio(), react()],
```

| File | What |
| --- | --- |
| `vite-plugin-zen-studio.mjs` | The two Vite plugins: `zen-studio:annotate` (with the draft `load` hook) and `zen-studio:api` |
| `jsx-source.mjs` | Pure functions (no fs, no server): `annotate`, `describeElement`, `applyOps` (ops `wrap` and `unwrap` included, §2), `changedRange`, `sha1`, `isAnnotatedFile`; imports `src/platform/studio/cloning.json` (what wrap refuses) |
| `detach.mjs` | Pure "Detach component" recipes (§3): `detachPlan`, `detachEdits` (used by `applyOps` op `detach`), `detachSlots`; `importEdits`, `pathTo`, `piece`, `UNIT` (also used by op `wrap`) |
| `slots.mjs` | Pure slot ops (§2 "Slots"): `applySlotOp` (used by `applyOps` ops `insertChild`, `removeElement`, `duplicateElement`, `moveElement`, `clearSlot`, `resetSlot`), `describeSlots` / `withSlots` (GET /element), `mapLine` (diff.ts's, for resetSlot), `requiredFromApi` (read once by the plugin); `slots.selftest.mjs` |
| `component-modules.mjs` | `componentModulesFrom(root)` (Node only: reads src/components; the plugin caches it) |
| `posix.mjs`, `sha1.mjs` | The engine's path and hash helpers without Node, so the engine runs in the browser (builder GĐ2); `engine-iso.selftest.mjs` checks no engine module imports Node |
| `dialect.mjs` | Builder page dialect (`*.zen.tsx`): `parsePage` (neutral tree), `validateDialect`, `newPageText`; `dialect.selftest.mjs`; the engine on local pages: `builder.selftest.mjs` |
| `browser-engine.mjs` (+ `.d.mts`) | What the Studio loads lazily for builder pages (`src/platform/studio/builder/engine.ts`) |
| `browser-detach.mjs` (+ `.d.mts`) | The detach recipes for builder pages, a lazy chunk of their own (`loadDetach`); loading it registers op `detach` with the engine. On a `*.zen.tsx` page the recipes' inline styles become Layout props (`detach.mjs` pageLayout) or the detach is refused |
| `shared-code.mjs` | WP-B2: `importersOf` (who imports a shared file), `PLAYGROUND_FILES` |
| `drafts.mjs` | Pure admin-draft bookkeeping (§4): `nextDraft`, `planSave` / `rebaseDraft` (the hunks of `src/platform/studio/history.ts`), `followDisk`, `changedLines`, `draftInfo`, `serializeDrafts` / `parseDrafts` |
| `frame-scope.mjs` | Save and Discard per canvas frame (§4): `frameRanges` (what a frame owns), `lineChanges`, `ownChanges`, `splitDraft` (a frame's changes with the imports they need); `frame-scope.selftest.mjs` |
| `editability-audit.mjs` | `node tools/studio/editability-audit.mjs` (`--json`, `--class=<name>`): which written props of Zen components the inspector cannot edit, by class (object/array literals, data consts, loop-bound, bound, conditional, spreads…), over every annotated file (2026-10-04) |
| `selftest.mjs` | `node tools/studio/selftest.mjs`: tests the pure functions (and runs style-guard/usage-guard, then `tsc` with the repo's tsconfig, on detach outputs through temporary files in `src/platform/examples/drafts`), exits 1 on a failure |
| `vite-plugin-zen-studio.d.mts` | Types for tsc |

## 1. Annotate

Every JSX opening element in an annotated file gets `data-zen-src="<file>:<line>:<column>"` right after its tag name
(line 1-based, column 0-based, as Babel counts them, ignoring a leading BOM). Components that spread their props put it
on the DOM; the Studio reads it from the React fibers either way.

- Annotated files: `src/platform/**/*.tsx` and `src/templates/**/*.tsx`, except `src/platform/studio/**` and the docs
  chrome (`PlatformApp`, `PlatformTemplate`, `PlatformCode`, `PlatformFullScreen`, `PlatformPhone`,
  `PlatformReference`, `PlatformGuidelines`). Ids with a query (`?raw`) are skipped, so code samples stay clean.
- Skipped elements: fragments (`<>`, `Fragment`, `React.Fragment`), elements that already carry `data-zen-src`, and all
  JSX inside docs chrome: a function (declaration, expression or arrow, also through `export`, `const x =`,
  `memo(…)`/`forwardRef(…)`) whose leading comment contains `zen-studio-chrome` (ExampleCard, ComponentPreview,
  ExamplePage, the Playground* controls). `/edit` refuses elements inside such functions (403 `forbidden`, "docs chrome").
- Parsed with `@babel/parser` (`jsx`, `typescript`, error recovery); a file that does not parse is left untouched.
  `magic-string` keeps the source map. Skipped under Vitest (`process.env.VITEST`).

## 2. Endpoints (`/__zen-studio/*`, JSON)

| Request | Answer |
| --- | --- |
| `GET /ping` | `{ ok, root, writable, token, drafts: true }` (token: null unless the Host is localhost/127.x/[::1]) |
| `GET /source?file=<rel>` | `{ file, content, hash }` for any file under `src/`; a drafted file answers its draft plus `draft: true, base, baseHash, diskHash` (§4) |
| `GET /element?file=<rel>&loc=<line:col>` | `SourceElement` (attributes, children, typography keys, line range, `wrap: { ok: true }` or `{ ok: false, reason }`: whether op `wrap` takes it where it sits; slots: `selfClosing`, per attribute holding JSX `elements: [{ name, loc }]` + `form`, per expression child `elements` + `form`; with a draft also `childrenModified`, per JSX attribute `modified`, `modifiedProps`, `newSinceSave`, and `savedAttributes`: the saved file's version of every attribute the draft changed, or null (2026-10-05); every expression attribute without `state` carries `origin: { kind: bound-state · loop-bound · bound-value, reads, rows? }`, what it reads (2026-10-05)), 404 `not-found` |
| `GET /detach-plan?file=<rel>&loc=<line:col>&name=<tag>[&instances=<n>][&lists=<n>]` | `DetachPlan`: `{ ok: true, component, repeated, mapRow?, slots }` or `{ ok: false, reason }` (§3) |
| `POST /edit` `{ file, loc, name, ops, hash? }` | `{ ok, file, hash, hashBefore, before, after, changed, snippet?, detached?, wrapped?, unwrapped?, inserted?, moved?, removed?, cleared?, reset?, draft }` (into the draft) |
| `POST /write` `{ file, content, expectHash }` | `{ ok, hash, draft }` (undo / redo, into the draft) |
| `GET /drafts` | `{ ok, drafts: DraftInfo[] }`: `{ file, baseHash, diskHash, stale, changedLines: { added, removed }, updatedAt }` |
| `POST /frame-drafts` `{ frames: [{ id, locs }] }` | `{ ok, frames: { [id]: { changes, added, removed, files } }, outside: { changes, files } }` (§4; any role, token) |
| `POST /save` `{ files? }` or `{ frame: { locs } }` | `{ ok, saved: [{ file, hash, rebased?, partial? }], conflicts: [{ file, conflict: true, reason }], harness: { ok, findings } }` |
| `POST /discard` `{ files? }` or `{ frame: { locs } }` | `{ ok, discarded: string[], partial? }` |

Errors are `{ ok: false, code, error }` with status 400 `invalid`, 403 `forbidden`, 404 `not-found`, 409 `stale`
(405 a wrong method, 408 a body that stalls over 10 s, 413 a body over 8 MB, 503 a queued write that takes over 10 s).

Guards. Every route: a request with an `Origin` header must come from the server's own origin (Origin host = Host);
Vite's CORS headers are stripped from these answers, so a page on another port can neither read `/ping`'s token nor
write. `/edit`, `/write`, `/save` and `/discard` also need a loopback Host, `x-zen-studio-role: admin`,
`x-zen-studio-token: <token from /ping>` (403 with `reason: "token"` when missing or from an earlier server start: the
client pings again and retries once) and `content-type: application/json`. `GET /drafts` needs the loopback Host and
the token, any role (a Viewer shows that admin drafts are on the canvas); so does `POST /frame-drafts` (plus a JSON body). The file must be an annotated file, named by its exact real path: the
path is resolved with `fs.realpathSync.native`, and a symlink or a differently-cased spelling (APFS) is refused.
`/edit` also refuses when the element at `loc` is not named `name` or `hash` differs (409 `stale`); `/write` refuses
when the file's hash is not `expectHash` (both hashes are of the effective text, §4). Bodies are read and parsed before the write queue (a slow or abandoned upload
never blocks other writes; a client that hung up before its turn is skipped). Writes are serialised and atomic (temp
file in the same folder, then rename) and keep the file's BOM, line endings and indentation. An edit that changes
nothing (the same value again) writes nothing.

Ops (applied back to front on the element at `loc`):

- `setProp` replaces the attribute, or appends it after the last attribute: on its own line with the same indent when
  the attributes are one per line, else after a space. Strings → `name="v"` (or `name={"v"}` when the value has `"`,
  `\`, `{`, `}`, a line break, an HTML entity, or an invisible or control character, written as `\u00a0`-style escapes), `true` → `name`, `false` → `name={false}`, numbers → `name={n}`,
  expressions → `name={code}` (must parse as one expression).
- `removeProp` removes the attribute: the whole line when it sits alone; after other code on its line, with the
  spaces before it; at the start of a line with more code after it, with the spaces after it, or (when it ends the tag)
  the line break before it, unless the line above ends in a `//` comment.
- `setField { name, index?, key, value }` (2026-10-04) edits one field of the object literal written in attribute
  `name` (`leading={{ icon, label }}`), or of its `index`-th item when it is an array literal (`trailing={[{ … }]}`);
  `as const` / `satisfies` / parentheses are looked through. A value replaces the field (in the quote it was written with;
  a shorthand `{ icon }` becomes `icon: …`) or appends it in the object's layout (inline after `, `, or on its own line
  with the same indent, keeping a trailing comma); `null` removes it with its comma (`{}` when it was the only one).
  Spreads and other fields stay as written. `SourceAttr.shape` lists the fields `describeElement` saw (one level deep);
  the inspector's `ObjectProperties` reads the field types from `docs/api/<slug>.json` `types`.
- `setText` replaces the n-th text child (numbered as `SourceElement.children` lists them, fragments flattened; a
  `{"…"}` or ``{`…`}`` literal child counts as text, `expression: true`, and keeps its form). JSX text keeps the spelling
  of what did not change (entities such as `&amp;`/`&nbsp;`, line breaks); new invisible characters are written as
  entities (`&nbsp;`, `&#x200B;`); text with `{ } < >`, an entity, a line break or edge spaces becomes `{"…"}`.
- `setTypography` swaps the key inside `typographyStyles["…"]` in the className (unknown keys, and keys with quotes,
  `$`, braces or line breaks, are refused; refused outright when typography.generated.ts cannot be read).
- `setTextStyle { value }` gives the className `typographyStyles[value]`: existing uses switch to it, else one is added
  (`className={…}`, a template placeholder, a list/`cx` item, or `[E, …].filter(Boolean).join(" ")`), importing
  `typographyStyles` when the file has no binding; `null` removes every use (tidied; the attribute when nothing is left;
  the import with the file's last use). Needs `{ typographyKeys, file }` from the plugin.
- Strings never carry a raw U+2028/U+2029 (Babel counts them as line breaks): they are written as `\u2028` escapes;
  an expression holding one is refused.
- `wrap { tag, props }` (alone in its request): the element goes inside `<tag …props>` (see "Wrap" below); the answer
  carries `wrapped: { loc }`, the wrapper's opening tag in the new text.
  `with: ["<line>:<column>", …]` adds sibling layers of the same file (see "Wrap several layers" below).
- `unwrap {}` (alone): a Box, Stack or Grid holding one element is replaced by it (see "Unwrap" below); the answer
  carries `unwrapped: { loc }`, the element's opening tag in the new text.
- `detach { measured?, instance? }` (alone in its request): §3.
- `insertChild { code, prop?, index?, wrap?, requires? }`, `removeElement {}`, `duplicateElement {}`, `moveElement { to }`,
  `moveTo { parent, before?, after?, copy?, replace? }`, `pasteCode { code, … }`, `replaceElement { code, state? }`, `many { action, locs, ops? }`,
  `clearSlot { prop? }`, `resetSlot { prop? }` (each alone in its request): slot content, see "Slots" below.
- `insertItem { prop, code, index?, single?, requires? }`, `removeItem { prop, index? }`, `duplicateItem { prop, index }`,
  `moveItem { prop, index, to }` (each alone, on the host, hash required; `items.mjs`, 2026-10-04): the objects of a
  data slot or any list prop written as an array literal (`trailing={[{ icon, label, onClick }]}`), or the one object of
  an object prop (`single`). Insert takes one object literal (no free names but `toast`, which brings the useToast hook,
  and JS built-ins); an absent or nullish prop becomes `prop={[code]}`. Removing the only item, or an object prop, takes
  the attribute (a required prop keeps `[]`). A duplicate gets fresh `id` / `value` / `key` strings (`"a"` → `"a-2"`).
  Answer: `item: { prop, index }` (where it is now) and `updated` / `removed`. Same refusals as the slot ops
  (playgrounds, docs chrome, files outside examples and templates); example snippets follow on the host's copy.

Wrap (Figma's Frame selection, ⌥⌘G; `{ op: "wrap", tag: "Box", props: { padding: { kind: "string", value: "md" } } }`):

- `tag` is `Box` (what the Studio sends), `Stack` or `Grid`; `props` (optional, an object) are formatted like
  `setProp` values, in the given order; `key` and `children` are refused. The element's own `key` moves to the
  wrapper, so a `.map` row keeps its key on the element the callback returns.
- An element that starts its line gets the wrapper's tags on lines of their own, one level deeper (lines inside a
  string or template literal and blank lines are kept as they are; a long or multi-line prop list goes one prop per
  line). Elsewhere (after `return`, `=>`, `?`, in an attribute value, inline in text) both tags go around it inline.
- The tag joins the file's import from the Layout folder (also a spelling such as `../components/Layout/index`) or
  from `@zen/design-system`, else a new import line, sorted as detach writes them (`@zen/design-system` in templates
  and in files that already import it). A file whose own `Box` is something else is refused ("rename it before
  wrapping"); one that imports Zen's already gets no import change.
- Refused: docs chrome (403 `forbidden`), a `loc` that is not a JSX element's opening tag (404 `not-found`, e.g. a
  fragment or text), another op in the same request, and places where the HTML parser would not keep a `<div>`
  (React's DOM-nesting errors): around a table or select part (`<tr>`, `<td>`, `<option>`…), directly inside
  `<table>`/`<tbody>`/`<tr>`/`<select>`…, inside a paragraph (`<p>`, `<Text>` as p, also through `<span>`,
  `<strong>`… in between), and inside an `<svg>` (below any `<foreignObject>`), where a `<div>` does not render.
  Further inside an attribute value nothing of that is refused (where it renders is unknown).
- Refused too (400 `invalid`, "<IconButton> is the Menu's trigger, which Menu clones; resize the Menu instead."): an
  element a component clones or checks by type, since the wrapper would take the cloned props (id, ARIA, ref,
  handlers, size) or fail the check. One list, shared with the Studio client: `src/platform/studio/cloning.json`
  (from a grep of `src/components` for `cloneElement`, `Children.only`/`Children.map`, `isValidElement` and
  `child.type ===`; each entry says why and gives the reason). `props`: the value of Menu `trigger` and AppShell
  `sidebar`/`aside`; any other attribute's value is wrapped, inline in the attribute (a ListItem's `trailing` Badge).
  `parents`: the child of `Tooltip` ("keeps its size inside a Tooltip, which clones it; change it in code"),
  `FormField`, `FormActions` (Buttons only, also inside a fragment, an `[ … ]` or a `.map` callback's result, as its
  `Children.map` reaches them: "FormActions sizes its Buttons (Large when stacked); resize the FormActions instead")
  and `ChatMessage` (`ChatPhotos`/`ChatCall`, which it reads by type: "is a ChatMessage body, which ChatMessage reads
  by type; change it in code"). Always through `{…}`, a `?:` branch, either side of `||`/`??`, the
  right of `&&` and TS casts. A reason never says to give the element its own size: it points at the owner or at the
  code. Its siblings, the component itself and elements further inside are wrapped. Tooltip, FormField and
  ChatMessage clone or read a sole child: a child with a sibling that renders reaches them in an array and is wrapped
  (whitespace with a line break, which JSX drops, and `{/* comments */}` are no siblings; a space on the tag's own
  line is a `" "` child). `"anywhere": true` (ChatMessage, with its `only`): `ChatPhotos`/`ChatCall` are only ever
  ChatMessage bodies, so they are refused in any position. A body a helper returns outside the owner's JSX
  (`chat.tsx` `bodyOf()` returns them from a `switch`) is out of the source's sight: the Studio client's runtime check
  guards it (the React fibers: the nearest component above the element is a listed owner that gets it as its child),
  and this server too where `anywhere` is set. `GET /element` answers the same verdict as `wrap` (with the nesting
  and docs-chrome refusals), so the client can tell before it sends the op. The server reads the list at start:
  restart it after editing the JSON.
- `wrapped.loc` is the element's old position (moved down when an import line was added above it, or when the
  snippet above it grew), so the client can select the new wrapper; `changed` is the wrapper's lines.
- The example snippet that shows the element is wrapped the same way when the element's old code occurs exactly once
  in it (whitespace-tolerant), on the snippet's own lines and indentation, with `` ` `` and `${` kept escaped:
  `snippet: { synced: true }`, else `{ synced: false, reason }` and the source change stands alone.

Unwrap (a one-layer wrap undone: the Position section's Ignore auto layout off on the Box a layer floats in, 2026-10-04;
`{ op: "unwrap" }`, `applyUnwrap`):

- Alone in its request, on a Box, Stack or Grid whose children are exactly one JSX element and blank text (a comment,
  an expression or a second layer: 400 `invalid` with the reason; another tag: "Only a Box, Stack, Grid can be
  unwrapped").
- The wrapper's tags and props go; an element that starts its line moves out by the indentation it had over the
  wrapper (lines inside a string or template literal keep theirs); the wrapper's `key` goes back onto the element when
  it has none. The tag leaves the file's import when nothing else reads it. Wrap then unwrap gives the exact text back.
- `unwrapped.loc` is the element's opening tag (the wrapper's old place, moved up when an import line went); the
  example snippet is unwrapped the same way when the wrapper's code occurs exactly once in it.

Wrap several layers (Figma's Frame selection ⌥⌘G / Add auto layout ⇧A on a multi-selection, 2026-10-03;
`{ op: "wrap", tag: "Stack", props: { direction: …, gap: … }, with: ["14:6", "18:6"] }`, `applyWrapMany`):

- `loc`/`name` is one selected element, `with` the opening-tag locs of the others in the same file (at most 100). An
  empty `with`, or one naming only the element, is a single wrap.
- Every layer must be a child of one JSX parent (an element or a fragment): the element itself, or the `{…}` around it
  through `( )`, a condition (`&&`, `||`, `??`, `?:`: the whole condition moves) or a TS cast. Refused (400 `invalid`,
  with a reason naming the layer): a `.map` row, an array item, a prop's value, what code returns, layers of
  different parents, one layer inside another, and every single-wrap refusal for any of them (cloning.json, HTML
  nesting). Docs chrome is 403 `forbidden`.
- In source order. Adjacent layers (only whitespace and `{/* comments */}` between) are wrapped where they stand: on
  lines of their own one level deeper, or inline with both tags around them. Layers that are not adjacent move up into
  the wrapper after the first run, each with its lines; what sat between stays. This needs the first run and each
  moved layer on lines of their own, else it is refused with "select the layers between them too". Keys stay on
  their elements.
- `wrapped.loc` is the first layer's old place (the wrapper); one request is one undo step. The example snippet follows
  when the same region (first to last layer) occurs once in it with the same children, wrapped or moved by the same
  rules; else `{ synced: false, reason }`.

Slots (`slots.mjs`; spec docs/research/studio-slots-spec-2026-10-03.md "Source ops"; Figma's slot editing on an instance):

- Only example pages (`src/platform/examples/pages/*.tsx`) and templates (`src/templates/**`) take these ops; other
  files (the playgrounds live in `PlatformExamples.tsx` / `PlatformMobilePlaygrounds.tsx`), docs chrome, a top-level
  `*Playground` declaration and a parent holding a `<PlaygroundSlot>` answer 403 `forbidden` with the reason. An
  example's own `if (step === "…")` screens stay editable. `removeElement`, `moveElement`, `clearSlot` and
  `resetSlot` need `hash`.
- `insertChild` is sent on the parent. `index` is a position in `SourceElement.children` (fragments flattened): the
  new element goes before that child (inside its fragment), omitted = after the last one. A self-closing parent opens.
  `prop` names a prop slot instead of `children`: absent, `null`, `undefined` or `false` → `prop={code}`; one element →
  a fragment with both; a fragment takes it; anything else is refused ("Its content comes from …"). `wrap: { tag:
  "Stack" | "Grid" | "Box", props }` puts the slot's content and the new element in the wrapper (gap-less slots).
- `code` is one JSX element: no `data-zen-src`, no raw U+2028/U+2029, no names but Zen components and `toast`. Its
  line endings follow the file; its lines are re-indented where it lands (tabs in a tab-indented file). Components
  join their folder's import (`@zen/design-system` in templates), found in every `src/components/*/index.ts` (read
  once by the plugin). `toast` reuses Zen's toast in scope (the `useToast()` binding, a parameter typed as a
  function), else the nearest enclosing component gets `const { toast } = useToast();` as its first statement
  (refused in an arrow without a body, outside a component, and when another `toast` (a prop, state, variable) is
  in scope).
- `removeElement`: a JSX child goes with its line(s) (and detach's `zen-detached` marker); an attribute value takes the
  attribute; `cond && <X/>` the whole condition; a ternary branch becomes `null` (the whole condition when both are
  empty); an array item goes with its comma. Refused: a function's root, a `.map` row ("remove the row in its
  data"), a variable or object value, `PlaygroundSlot`, the only child of a component that requires children, a
  required prop (`src/platform/api.generated.json`). Component imports left unused go too, and a `useToast()` hook
  left unused (an inserted action's). Answer: `removed: true`.
- `duplicateElement`: the element again right after it (a prop's or a condition's single element becomes a
  fragment); a keyed element is refused. `moveElement { to: "prev" | "next" }` swaps it with the previous / next
  non-text sibling of the same parent, re-indented. Answers: `inserted: { loc }` (the new element or the copy),
  `moved: { loc }`; `changed` leaves the import lines out.
- `moveTo { parent, before?, after?, copy? }` (drag in auto layout, `arrange.mjs`, 2026-10-03): the element goes into
  the JSX element at `parent` ("line:col", same file), before the child at `before` / after the one at `after` (a loc of
  that child, or of an element inside it: a `.map` row or a condition's element names the whole `{…}` child; neither:
  last); a self-closing layout parent (Stack, Grid, Box, Container, Card, Form parts, host tags) opens. `copy: true`
  leaves the original (⌥-drag; a keyed element is refused). Only an element's children move (a prop value, a condition,
  a `.map` row's root and a function's root are refused with where they sit); not into itself; every name it reads must
  mean the same at the new place (`bindingOf`: a row's `item`, another example's state are refused); cloning.json
  parents (Tooltip, FormField, ChatMessage) neither give up nor take a child, FormActions takes Buttons only; a block
  never lands in text (Text, Heading, Button, Link, p, span…). The `zen-detached` marker moves with its element. Answer
  `moved: { loc }` (`inserted` for a copy); the snippet is not synced (reason given). Test: `node tools/studio/arrange.selftest.mjs`.
  `replace: <loc>` (with `copy`): the copy takes that child's place and the child goes (⇧⌘R paste to replace; its
  imports left unused go too).
- `pasteCode { code, before?, after?, replace? }` (⌘V of code from another file, after a cut, or text from elsewhere;
  `arrange.mjs`), on the element it goes into (same placing and refusals as `moveTo`): `code` is one JSX element (no
  fragment, no `data-zen-src`); a name it reads must exist where it lands (`bindingOf`), else be a Zen component (joins
  the imports as an insert's do), `toast` (the component gains `useToast()`) or a global (Math, Date, Intl…). Answer
  `inserted: { loc }`. `GET /element` answers `range: { start, end }` (char offsets, BOM left out) so the client copies
  the exact code.
- `replaceElement { code, state? }` (Swap instance, GĐ4 M2; `arrange.mjs` replacePlan), on the element it replaces:
  `code` (one JSX element, a palette item's code) takes its place wherever it is written (a child, a prop's value such
  as `leading={<Avatar />}`, a `.map` row, what a function returns); the element's `key` goes onto the new one; names
  as `pasteCode` (Zen components imported, `toast`, `state`); components left unused leave the imports; a parent that
  clones its children (cloning.json `only`) takes only those. Hash required. Answer `inserted: { loc }`.
  `code` may hold several sibling elements (layers copied together): they land in order at that place; the answer is the
  first one's loc.
- `many { action: "remove" | "duplicate" | "setProps", locs, ops? }` (a multi-selection, `arrange.mjs`), on any one of
  the layers (one file): every element at `locs` is removed (as removeElement, unused imports go), duplicated (each
  copy right after it, as duplicateElement) or given the same `setProp` / `removeProp` `ops` (applied bottom-up), in one
  edit and one undo step. An element inside another listed one goes with it; edits that would overlap (a condition or a
  list holding two of them) are refused. Answer `removed: true`, `inserted: { loc }` (the first copy) or `updated: true`.
- `clearSlot { prop? }` (Figma "Delete contents"), on the host: every child goes (elements, expressions, text and
  comments) and `<X …>…</X>` becomes `<X … />` (a multi-line opening tag keeps its layout; `/>` goes where the file's
  other multi-line self-closing tags put it); a prop slot loses its attribute. Refused: an empty slot ("Nothing to
  clear"), required children or a required prop. Unused component imports (and a `useToast()` hook left unused) go.
  Answer: `cleared: true`.
- `resetSlot { prop? }` (Figma "Reset slot"), on the host: the slot as the saved file has it. The plugin passes
  `base` = the disk text when the file has a draft. The host is found there by pairing the draft's JSX elements with
  the disk's (identical ones first, then by the elements they hold, then per slot under a paired parent, the line diff
  `mapLine` last), so siblings that open alike stay apart through moves, removes and inserts; its children (from the
  end of its attributes to its closing tag) or its prop (in its saved place and layout) come back re-indented, with
  the Zen imports they need as the disk writes them and the `useToast()` hook their actions need.
  Refused: no draft or an unchanged slot ("Nothing to reset: this slot matches the saved file."), an element new
  since the save ("remove it instead"). Answer: `reset: true`. `GET /element` (with a draft) adds
  `childrenModified`, `modified` per JSX attribute, `modifiedProps` (each prop with JSX or code that differs, one the
  draft removed included) and
  `newSinceSave`; a nested change also marks the ancestors' children (their source holds it).
- Inside a `.map` callback an edit changes every row: allowed (the client confirms first).
- The example snippet follows on exactly-once anchors (the element's own code; the previous sibling or the parent's
  opening tag for an insert; the host's copy for clear and reset, its whole code else its opening tag). A reset gives
  that copy the saved snippet's content (a snippet that shows the host's children but not the host: its line changes
  among them are undone). A wrap, a new prop value and a fragment made for a copy are not copied (`synced: false`).

Example snippets follow the edit: when the file has `code:` template literals (the hand-written example code), each
changed opening tag or text is looked up there by its old code (whitespace-tolerant). If it occurs exactly once in
exactly one snippet, it is replaced by the new code (on one line, or re-indented to the snippet), with `` ` `` and
`${` escaped. All changes or none; the answer says `snippet: { synced: true }` or `{ synced: false, reason }`
(no `snippet` when the file has no snippets).

The result must parse at least as well as the original, or the edit is refused (`invalid`).

## 3. Detach component (`detach.mjs`, op `{ op: "detach", measured?, instance? }`)

Figma's Detach instance, at source level: a presentational component instance becomes Zen layout primitives with token
props (`Box`, `Stack`, `Text`, `Heading`) plus the atoms it renders as leaves (`Icon`, `Avatar`, `DockIcon`, `Button`,
`IconButton`, `Divider`, `MetricTrend`, `EmptyStateIllustration`), so the Studio's spacing and text-style editors work
on the result. The op must be the edit's only op; the edit is one undo record (⌘Z restores the component exactly).

- **Components**: Card, ListItem, MetricCard, Metric, EmptyState, DescriptionList, InlineMessage, Badge, Tag. Each
  recipe mirrors the component's TSX and CSS (cited in `detach.mjs`): structure, gap/padding/radius tokens, text styles,
  tones, surfaces. Attribute values are kept verbatim (`title={task.title}`, ``caption={`…`}``, `leading={<DockIcon/>}`,
  children); `key`, `ref`, `as`, `aria-*`, `data-*`, `className`, `id`… go to the new root. A comment written above a
  passed-through attribute moves with it; any other comment of the element the output would drop (beside a re-read
  prop, inside a rebuilt `items` value) leads the root's props. A value the component shows only when truthy keeps
  that guard (`c ? count : null` → `{c && count ? … : null}`). DescriptionList terms and values are `Text as="div"`
  (a value may be a Stack); Tag keeps its fill (Neutral/Ghost = `surface="surface"`).
- **Refused** (plan `ok: false` with the reason; edit 400 `invalid`): interactive instances (Card/ListItem with `onClick`,
  `href` or `selected`; Badge/Tag with `remove`/`onRemove`, Tag `onClick`; InlineMessage `onClose`; `={false}`, `={null}`
  and `={undefined}` count as off), a Badge/Tag inside a paragraph (`<p>`, `<Text>` as p: its Box is a `<div>`; inside
  other phrasing content it is an approximation), interactive components (Button, Input, Table, Dialog…), primitives
  and host elements, `{...spread}` props, props a recipe needs
  fixed but that come from an expression (Card/Badge `theme`, Metric `size`, DescriptionList rows built by a spread or a
  variable…), and names the file binds to something else (a local `Stack`, `Text` from another module).
- **Measured**: the plan's `slots` (`{ key, kind, selector }`; `selector: ""` is the instance root, else a CSS selector
  from it) are read by the client on the rendered instance and sent as `measured: { [key]: tokenKey }` (gap/padding/
  radius scale keys, `typographyStyles` keys, Text tones). Valid values replace the recipe defaults; others are ignored.
  Box roots (Card, MetricCard, InlineMessage) list `padding`, `paddingX` and `paddingY`: both axes measured and
  different give `paddingX` + `paddingY`. A divider DescriptionList has no `gap` slot (its rows carry the padding).
- **Approximations**: what a primitive cannot express is listed in `detached.approximations` (Card's shadow, colour
  fills of Badge/InlineMessage themes, Card padding that follows the breakpoint, a ListItem's row padding when the file
  does not show whether its List has clickable rows or its List inset follows the breakpoint, dl semantics, the
  DescriptionList action column…). CSS keyed on the component's classes stops applying: the dev server reads the
  rules of `src/**/*.css` that name a `.zen-*` class (`cssRules`) and passes them as `componentCss`; a compound with
  the instance's own class (`.zen-card.pe-list-card`) or its class above a component part
  (`.pe-filter-panel > .zen-card__content`) is listed with its file and line.
  Layout-critical values with no prop are inline styles (EmptyState's `min(320px, 100%)` column and 4XLarge bottom
  padding, a pill's `max-content` width, `flex: 1` on a growing column).
- **Marker**: `{/* zen-detached: <Component> · Zen Studio */}` before the element in JSX child position,
  `/* zen-detached: … */` in expression position (on its own line when the element starts its line, never between
  `return` and a line break). The output is ordinary code: style-guard and usage-guard run on it like on any example.
- **`.map` rows**: an element lexically inside a `.map` callback (`repeated: true`) needs `instance` (the 0-based row);
  only that row detaches: the element becomes `(index as number) === K ? (detached) : (original)` (the cast keeps
  TypeScript from narrowing the index, so the row's own `index === 0` stays valid), with the callback's index
  parameter (`zenIndex` is added when there is none; destructured, typed, bare and `function` callbacks and
  `filter().map()` work). Refused: nested maps, rows that render the element only sometimes (`?:`, `&&`, early
  returns), elements in a function nested in the callback, and `instance > 0` on an element outside a `.map` callback
  (it renders several times; the plan says so too when the client passes `instances=<n>`). The plan's `mapRow`
  (`{ loc, name }` of the element the callback returns, `null` for a fragment) lets the client find the row's list (its
  rendered siblings); a `.map` that runs in several places (a render prop per table row) is refused when the client
  passes `lists=<n>` > 1: "This list repeats in N places; detaching a row would change each of them".
- **Imports**: the names the output uses join the file's import of their module (merged in code-point order, type
  specifiers last, one-per-line lists kept), or a new import line sorted among the component imports. Templates (and
  any file that already imports it) use `@zen/design-system`, platform files `../components/<Folder>` relative paths.
  The component's own specifier (and DescriptionItem's) goes when nothing uses it any more.
- **Answer**: `detached: { component, loc, approximations }`, `loc` = the new root element in the new text (the
  detached branch for a `.map` row). Example snippets are not rewritten (`snippet: { synced: false, reason }`).

## 4. Admin drafts (`drafts.mjs`, 2026-10-03)

Admins edit drafts; viewers stay read-only. Nothing reaches the disk until `POST /save`; `POST /discard` drops drafts.
Drafts live on the dev server, so every browser using that server sees them until they are saved or discarded.

- **Store**: per repo-relative real path `{ base, baseHash, content, updatedAt }`; `base` is the disk text when the
  draft started. Kept in memory and in `node_modules/.cache/zen-studio/drafts-<port>.json` (one file per dev server, so
  5173 and 5180 never overwrite each other's drafts), written atomically after every change, deleted when no draft is
  left, restored when the server starts listening (a missing file = no drafts; an unreadable one is moved aside as
  `drafts-<port>.unreadable-<ms>.json`; entries with a wrong base hash or a path that is not an annotated file are
  dropped; a draft that equals the disk by then is dropped). Under Vitest there are no drafts.
- **Effective text** = the draft, else the disk. `/source`, `/element`, `/detach-plan`, `/edit` and `/write` read it, and
  `/edit` / `/write` check their hashes against it and write the draft, never the disk. A draft whose content equals
  the disk again, or its own base (every edit undone), or that the disk caught up with is dropped (`draft: false`).
- **Canvas**: the `load` hook (`zen-studio:annotate`, `enforce: "pre"`) returns a drafted file's draft for its module id
  (ids with a query such as `?raw` read the disk), so the annotate transform and `@vitejs/plugin-react` compile the
  draft. Every draft change reloads the file's modules (`environments.client.reloadModule`, else
  `server.reloadModule`, else a full reload), like an HMR update.
- **Disk changes** (another session, an editor; also files changed while the server was down, at restore): in the write
  queue the draft follows the disk (`followDisk`): its hunks are re-applied on the new text, which becomes its base, so
  the canvas shows both. Only when they collide does the draft stay as it was, `diskHash ≠ baseHash` marking it stale
  (Save then rebases or reports the conflict).
- **Save** (one write queue with the edits): per draft, the disk already holding it = nothing to write; the disk still
  at `baseHash` = write the draft; otherwise rebase: the draft's hunks (`makePatch(base, content)` of
  `src/platform/studio/history.ts`, imported at run time so Vite's config bundler neither bundles nor watches it) are
  applied to the disk with the undo/redo rules (`locateHunks`: each hunk, its lines above and its lines below must occur
  exactly once, line-aligned), else `{ conflict: true, reason }` and the draft stays. Writes are atomic (temp + rename),
  and the draft is cleared only after its write, so a reader never sees the old disk text in between. Then `node tools/style-guard/check-styles.mjs
  --json <files>` and `node tools/usage-guard/check-usage.mjs <files>` run on the saved files (outside the queue, 60 s
  limit): `harness.ok` = neither reports an error; `findings` = their errors (✗) and warnings (⚠), one line each
  (`✗ src/…/button.tsx:84 icon-button/needs-name — <IconButton> has no aria-label.`). Nothing saved = not run.
- **Discard**: drops the drafts (all, or `files`) and reloads their modules from disk. The Studio always names the
  files it listed (Save all, Discard all, ⌘S), so a draft another admin starts meanwhile is never written or dropped
  unseen; `{}` (every draft) stays for scripts.
- **Per frame** (`frame-scope.mjs`): a canvas frame (an example card, a playground) sends the `data-zen-src` lines its
  DOM renders. Each line belongs to its module-level declaration (an example component, a helper it renders), to its
  element inside an array (the `examples` list), or to the top-level `if (page === "…")` branch of a function (the
  platform playgrounds); an example object whose `render` shows a declaration in scope joins it (its synced `code`
  snippet). The draft's line changes (LCS, unmerged) inside those ranges are the frame's; import lines join only when
  its changes need them (greedy: the subset that leaves the fewest missing or unused imports among the names the draft
  imports differently). `/frame-drafts` counts each frame's changes and those no listed frame owns (`outside`, only
  Save all writes them). `/save { frame }` writes base + the frame's changes (both rebased first when the disk
  changed) and keeps the rest as the draft on top of the new disk (`partial: true`); `/discard { frame }` drops the
  frame's changes from the draft (`partial`: files that keep one).

## Checks

```sh
node tools/studio/selftest.mjs     # pure functions + detach (style-guard/usage-guard on its outputs) + wrap + drafts (rebase fuzz) + history + frame-scope + slots
node tools/studio/slots.selftest.mjs   # slot ops alone (tsc, style-guard and usage-guard on realistic outputs through src/platform/examples/drafts)
curl -s http://127.0.0.1:5180/__zen-studio/ping
curl -s -H "x-zen-studio-token: <token from ping>" http://127.0.0.1:5180/__zen-studio/drafts
curl -s "http://127.0.0.1:5180/__zen-studio/detach-plan?file=src/platform/examples/pages/card.tsx&loc=<line:col>&name=Card"
```
