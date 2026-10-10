# Zen Studio — Slots (2026-10-03)

Owner: session "Slot Component phân biệt". Research: seven read-only reports (server, client, examples, slot inventory,
live Figma scan, insert palette, Figma slot UX), summarised here. The main Studio spec is
`docs/research/zen-studio-spec-2026-10-02.md`; the inspector redesign is `docs/research/studio-inspector-redesign-2026-10-03.md`.

## User decisions

- **Playground = main component.** A component's Figma slots stay EMPTY in its playground (`PlaygroundSlot`). That
  empty slot is where elements and components go; the playground source is never filled.
- **Example = instance.** Inside examples (and templates), slot content can be added, removed and edited freely. The
  main component (`src/components/**`) is never touched.
- **Figma parity.** Controls behave as close to Figma's native slots as possible (UI3 + Slots GA, 2026-06).

## Figma behaviour we copy

- A slot is a component property bound to a frame. Slot edits live on the instance; the main component never changes.
- Canvas: hovering or selecting a slot component outlines each slot (dashed). An empty slot shows a "+" to add.
- Right sidebar: each slot property row has "Add instances" (a picker, preferred items first); a modified slot can be
  reset or emptied.
- Instance edits allowed: add, delete, duplicate (⌘D), reorder, edit inserted layers. Not allowed: the slot frame's
  own layout (padding, gap, flow) — that belongs to the main component.
- Limits and "preferred only" warn; they never block (Figma staff, 2026-08-05).

## Model

| Layer | Example | Studio |
| --- | --- | --- |
| Main component | `src/components/Card/*` | never annotated, never edited; its internals stay read-only "Parts" |
| Instance | `<Card …>` in `examples/pages/*.tsx` or `src/templates/**` | props edit that line |
| Slot content | `children`, `side={…}`, `leading={…}` | free: insert, remove, duplicate, move, edit |
| Playground slot | `<PlaygroundSlot name="Content slot" />` | shown as an empty named slot; no insert |

Editable slot files: `src/platform/examples/pages/*.tsx` and `src/templates/**/*.tsx`. Everything else (playgrounds in
`PlatformExamples.tsx` / `PlatformMobilePlaygrounds.tsx`, shared helpers such as `PlatformDemoActions.tsx` used by 19
pages, appLayer) refuses structural ops with a visible reason.

## Slot registry (`src/platform/studio/slots/registry.ts`)

Studio-side data only. Named "content slots" (the word "slot" already means DetachPlan slots and the inspector bridge
slots). v1 entries, from the live Figma scan (native SLOT properties) and the code:

| Component | Prop | Figma slot | Kind | Container | Mounts empty | Flow / gap |
| --- | --- | --- | --- | --- | --- | --- |
| Card | children | Content `6643:0` | content | `.zen-card__content` | yes | column, none → wrap 2+ in `<Stack gap="md">` |
| Dialog | children | Custom (BOOLEAN frame) | content | `.zen-dialog__custom` | no (ghost after `.zen-dialog__content`) | block, none → wrap |
| ModalForm | children | Main-Contents `4080:0` | content | `.zen-modal-form__body` | no | column, md |
| ModalForm | side | Side-Content `4267:15` | content | `.zen-modal-form__side` | no; only layouts 1-3 / half-half / 3-4 | column, md |
| ModalForm | top | Top-Custom-Slot `12048:15` | content | `.zen-modal-form__top` | no | column, md |
| SidePanel | children | Contents `4083:122` | content | `.zen-side-panel__body` | no | column, md |
| BottomSheet | children | Contents `4060:0` | content | `.zen-bottom-sheet__body` | yes; not `type="action"` | column, md |
| Accordion | children | Contents `4035:8` | content | `.zen-accordion__content` | yes | block, none → wrap |
| TabPanel | children | — | content | `.zen-tab-panel` | yes | block |
| ChartCard | children | (Card Content) | content | `.zen-chart-card__body` | yes | column, md |
| ListItem | leading | Leading | atom (max 1) | `.zen-list-item__leading` | no | — |
| ListItem | trailing | Slot-Actions `4060:8` | atom group | `.zen-list-item__trailing` | no | row |
| Stack, Grid, Box | children | (auto-layout frame) | layout | root | yes | own props |
| PageHeader | breadcrumbs | (Header Type=Navigation › Leading-Slots `4122:33333`) | content, max 1, Breadcrumbs | `.zen-page-header__breadcrumbs` | no (ghost before the title row) | block, none |
| PageHeader | meta | — | content, Badge · AvatarStack | `.zen-page-header__meta` | no | row, own |
| PageHeader | tabs | — | content, max 1, Tabs | `.zen-page-header__tabs` | no (ghost at the end) | block, none |
| Screen (builder page) | header | (Header Type=Custom `6034:46170`) | content | `.studio-builder-screen__header` | no; not on a phone | block, none → wrap |

(2026-10-10, user: "breadcrumb nên là slot cho phép thêm item vào", "Header page cũng nên là slot để custom được header
tuỳ use case".) A prop that is a content slot shows in Properties as a switch (Figma's boolean showing the layer), never
a text field: on puts the slot's one component in at once (Breadcrumbs, a Tab bar) or opens the picker, off removes the
prop; the content is edited in the Slots section (Breadcrumbs' own Item-List adds items).

Host rules (warn-first, the usage harness enforces at Save): a clickable Card/ListItem hides Actions and Inputs
(`card/clickable-no-nested-controls`); Dialog hosts deny nested overlays and primary buttons (actions are props);
Accordion denies Accordion; BottomSheet/PlatformPhone force Toggle `size="lg"`, inputs ≥ md; ModalForm hides Toggle.

## Insert palette

**Free since 2026-10-04 (user: "những gì cho user sửa thì nó nên tự do k giới hạn").** Every DS component can be
inserted. A host rule never hides an item: it moves the item to the picker's last section, "Not recommended here",
with a short reason as its caption (the full reason is the item's title and description), and the item still inserts.
The status line then says "Not recommended: …", and the usage harness reports the finding at Save. Only code that
cannot be written stays hidden, with the reason in the picker's caption: actions and stateful items outside any
component (no place for their hooks), and Image outside the example pages (platformMedia).

Groups (Figma "preferred first"): Preferred for this slot · Text · Actions · Navigation · Data display · Charts ·
Feedback · Inputs · Overlays · Layout · Page · Chat · Not recommended here. The Assets tab lists the same items by
group. Each item is a canonical snippet with required props and real copy from `examples/data.ts` (Phin & Co, Loyalty
app, Bao Nguyen…), never "click/try" hints. `palette.selftest.mjs --deep` writes every item into every host slot where
it has no warning and runs tsc, the usage harness and the style guard on the result, expecting 0 findings
(1,396 items in 26 host slots on 2026-10-04).

- Original set: Heading (level = host + 1, `textStyle="Heading/Subheading"`), Paragraph, Caption, Button, Primary
  button, Button row, IconButton, Link, Avatar, Badge, Tag group, DockIcon, List + ListItem, DescriptionList,
  Metric / MetricCard, Card, ProgressBar, InlineMessage, EmptyState, InputField, TextAreaField, SelectField, Checkbox,
  Toggle, Radio group, Stack, Grid, Divider, Accordion.
- Added 2026-10-04:
  - Menu (IconButton trigger).
  - Tabs + TabPanels (state), Segmented (uncontrolled; `fullWidth` on phones and in sheets), Breadcrumbs,
    Pagination (state), Stepper.
  - AvatarStack, Icon, FileIcon, Flag, RatingDisplay, Table (inline rows and columns), Image (platformMedia).
  - ChartCard + LineChart, LineChart, StackBarChart.
  - AlertBanner, Skeleton.
  - Search, Chip row (single choice, state), DateField, DatePicker (inline), NumberField, AutocompleteField,
    RichTextField, Slider, Rating, NpsScale (state), ColorSelector (state), FileUpload.
  - Dialog, ModalForm, SidePanel and BottomSheet, each with the Button that opens it (state); Tooltip on an IconButton.
  - PageHeader (h2), TopNavigation (Back chevron), BottomNavigation (state), Sidebar (state), AppShell (state),
    ActionBar.
  - ChatThread + ChatMessage (named author, reactions), ChatComposer, AiChatThread + AiChatField.
- Not offered: Provider, Portal, Motion and VisuallyHidden (infrastructure); Toast (an action's `toast(…)` shows one);
  Popover (the primitive under Menu, Select and Chip, which needs an anchor ref).

Handlers: never `() => {}` (`interaction/no-noop-handler`). Action items use `onClick={() => toast({ title: "…" })}`
and declare `requires: ["toast"]`; the server adds `const { toast } = useToast();` to the enclosing component and the
`useToast` import. Inputs go in uncontrolled where the component allows it. A controlled item declares
`state: [{ name, initial, type? }]`: the server adds `const [name, setName] = useState(initial);` to the enclosing
component (with the toast hook, in one block), under a fresh name (`open2` when `open` or `setOpen` is spelled anywhere
in the file), renames the code to match, and imports `useState` from "react". An item with state is not copied into
the example's code snippet; the status says so. Image declares `requires: ["media"]`: the server imports
`platformMedia` from `../../PlatformMedia` in example pages and refuses it in templates. JS built-ins (Date, Math,
Intl…) may be read.

## Source ops (server, `tools/studio/slots.mjs`)

One op per request = one undo record, through drafts. Each returns the usual `/edit` answer plus the fields below.

- `insertChild { code, prop?, index?, wrap?, requires? }` — on the parent (loc/name = the parent element).
  `prop` omitted = children; `index` = position in `SourceElement.children` to insert before, omitted = end.
  A self-closing parent is expanded. A slot prop that is absent or `null`/`undefined`/`false` becomes `prop={code}`;
  one element becomes a fragment `<>old new</>`; a fragment takes the child; anything else (an identifier, a call, a
  conditional) is refused ("Its content comes from {expr}"). `wrap: { tag: "Stack", props }` puts the existing children
  and the new one in the wrapper (gap-less slots). `code` must parse as one JSX element, with no `data-zen-src`, no
  raw U+2028/9, and no free identifiers except importable component names and `toast`. Imports are added with
  `importEdits` (relative per-folder in examples, `@zen/design-system` in templates). Answer: `inserted: { loc }`.
- `removeElement {}` — on the element. JSX child: whole-line removal. Attribute value: the attribute goes. `&&` right
  side: the whole container. Ternary branch: becomes `null`. Array item: item + comma. Refused: a function/return/
  variable/`render` root, a `.map` callback root ("remove the row in its data"), `PlaygroundSlot`, docs chrome, the only
  child of a component whose `children` is required. Component imports left unused by the removal are dropped.
  Answer: `removed: true`.
- `duplicateElement {}` — the element's source again right after it (a prop's single element becomes a fragment). Same
  refusals as remove. Answer: `inserted: { loc }` (the copy).
- `moveElement { to: "prev" | "next" }` — swaps with the previous/next non-text sibling inside the same JSX parent.
  Answer: `moved: { loc }`.

- `clearSlot { prop? }` — Figma "Delete contents" (user, 2026-10-03): on the host; empties the slot. Children: every
  child goes (`<Card …></Card>` becomes `<Card … />` when nothing is left); a prop slot: the attribute goes. Refused when
  the component requires `children`. Component imports left unused are dropped. Answer: `cleared: true`.
- `resetSlot { prop? }` — Figma "Reset slot" (user, 2026-10-03): the slot's content goes back to the SAVED file (the
  main component's slots are empty in code, so "default content" for an example means its last saved source). The
  host is found in the saved text by mapping its line through the draft↔disk diff; its slot content (and the imports
  it needs) replaces the draft's. Nothing to reset when the file has no draft or the slot is unchanged. Answer:
  `reset: true`. `GET /element` marks `childrenModified` and per attribute `modified` when the file has a draft, so the
  inspector can show Figma's "Modified" tag.

Guards (all ops): annotated + editable slot file (above), not inside docs chrome or a playground range
(`frame-scope.mjs` `ownerOf`), parent does not hold a `PlaygroundSlot`, `hash` required for remove/move. Inside a
`.map` callback the edit changes every row: allowed, the client confirms first ("Add to all 14 rows?").

Example snippets (`code:` literals): best effort, exactly-once anchors (removed element's source; previous sibling or
the parent's opening tag for an insert). Otherwise `snippet: { synced: false, reason }` and the status says so.

`GET /element` gains, per attribute whose value holds JSX, `elements: [{ name, loc }]` (fragments flattened), per
expression child `elements` + `form: "map" | "and" | "ternary" | "other"`, and `selfClosing`.

### Content written as code (2026-10-09, user: "mọi thao tác bên Studio phải thoải mái tự do như Figma")

- **Blocks move:** an element shown by a child's code (`{open && <X />}`, `{a ? <X /> : <Y />}`, `{rows.map((row) =>
  <X />)}`) moves with that whole `{…}` among its siblings: moveElement and moveTo (`childUnitAt`); a drag checks the
  names the block reads (`open`, `rows`) where it lands.
- **A `.map` row is its data:** removeElement / duplicateElement / moveElement with `row` (the row of the list the
  instance renders, `rowOf`) on the element a `.map` callback returns (describeSlots marks it `row: true`) take that
  item out of, copy it in, or swap it with the item before / after it in the list the `.map` reads, where the list is
  written (`dataRowEdit` in data-source.mjs: inline, a const, an import such as examples/data.ts, a `useState` start
  value — the frame then starts again; `.slice(n)` shifts the row). The copy follows the item and its `key={item.x}`
  field gets a value no row has (`ava-copy`, `…-copy-2`, text "Ava Chen copy", the next number); a key built in code,
  `.filter` / `.sort` before the `.map`, a spread or a lazy initializer are refused with the reason. No repeat
  confirmation (one row changes); the copy, or the moved row, is selected (Move up / Down in the menu and on the
  keyboard are offered by the row's place in its list). Anything inside a row edits the JSX for every row, as before;
  the Slots section's "Each row" layer and a drag move the whole `{rows.map(…)}` block.
- **Slots that show a const:** `prop={name}` / `{name}` where `const name = <JSX>` is in the file (`constJsx`): insert
  joins that JSX (a fragment when it was one element), duplicate makes a fragment of two there, removing its whole JSX
  removes the const (with its comment lines) and every `prop={name}` / `{name}` that shows it; refused when the code also
  reads it elsewhere, when the file exports it, and (insert) when a module-level const would need an action or state.
  describeSlots names it (`const`), and the Slots section says "Written in name: every place that shows it changes too".
  A const shown as `{name}` in several places (both branches of a ternary) moves where the selected one is: moveElement
  `parent` names the element that lists it.
- **Props that hold code:** an insert into `prop={open ? <A /> : null}`, `prop={renderActions()}` or `prop={name}` (not
  JSX) keeps the code and adds the element beside it: `prop={<>{code}<New /></>}`. Icon props (`icon`, `…Icon`) take one
  icon and refuse it.
- **Measure:** `node tools/studio/slot-audit.mjs` (content forms per slot) and `--ops` / `--op=<op>` (every op in memory,
  what is refused and why).

## Client (`src/platform/studio/slots/*`)

- **SlotsSection** `{ api, selection, element }` (mounted by the inspector owner after Properties). One block per slot:
  name (Figma name) · caption (`Empty` / `1 layer` / `3 layers`, `Stack · 3 layers` when the content is one layout
  frame) · `+` IconButton "Add to {Slot}" (opens the picker). Content rows (InspectorItem): click selects, trailing trash
  IconButton "Remove {Name}". A "Modified" tag when the slot differs from the saved file, and a "More actions for
  {Slot}" menu: Reset slot (caption "Back to the saved file", disabled with a visible caption when unchanged) and
  Clear contents (danger, caption "Removes N layers · ⌘Z to undo"). `.map`/conditional children show as rows that move as a block; a `.map` row's own Remove edits its data. Playground: caption
  "Empty in the component · add content in an example" and a flat "Show examples" button; no `+`. Layout primitives
  show the same block titled "Children". Overlay content (portalled, not pickable on the canvas) is edited from these
  rows.
- **InsertPicker**: Zen Popover with search and grouped PopoverItems; hidden groups explained in one visible caption.
  Insert target: an empty or gap-ful slot takes the item directly; a gap-less slot holding one Stack/Grid inserts into
  that frame; a gap-less slot holding one other element wraps both in `<Stack gap="md">`. After the write the new
  element is selected.
- **RemoveAction** `{ selection, element, editable }`: Button tertiary sm `icon-trash-line` "Remove" beside Detach,
  caption "Removes it from this example · ⌘Z to undo" (or "…from all N rows"); hidden for viewers / read-only.
- **SlotLayer** (canvas overlay): the selected instance's slots outlined dashed in Border/Accent/Solid with a name tag;
  a `+` chip at the slot's end edge (anchored to a sibling or the component edge when the slot does not mount empty);
  playground `.platform-slot` tagged "{Name} · empty in the component".
- **Keys** (Figma): ⌫/Delete remove · ⌘D duplicate · move with the Layers/inspector controls; Escape/Enter unchanged.
- **Context menu**: Add to {Slot}… · Duplicate ⌘D · Move up / Move down · Remove ⌫ (danger, last).
- **Layers**: a `slot` row kind between a slot component and its children ("Content", dashed-frame icon, "Empty" meta).
- Copy: "Added Button to Card › Content · Draft · ⌘S to save" · "Removed Badge · ⌘Z to undo" ·
  "Example code not updated: …" when the snippet did not sync.

## Phase 2 (same owner, after Slots)

Constraints (absolute position + Left/Right/Left&Right/Center/Scale × Top/Bottom/…), Effects (shadow/elevation from the
Figma Effect styles, add/remove) and Corner radius (one value + per-corner, ScaleField from the inspector owner), with
new token-only Layout props. Separate spec.
