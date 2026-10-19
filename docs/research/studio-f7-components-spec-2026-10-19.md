# Studio F7 · Components like Figma — spec card (Session B, 2026-10-19)

Plan `docs/research/studio-figma-design-parity-2026-10-18.md` §5 F7: local component sets and variants (Combine as
variants), properties (variant, boolean, text, instance swap, slot) with defaults and preferred values; overrides
inside a local instance; nested local instances drawn and exposed; Create multiple components; Push changes to main /
Restore main; description and link; Assets › Local shows sets with their properties. Tier L.

Today (F1 base): `<Component id name>` around one layer (⌥⌘K), `<Use of overrides?>` an instance, ⌥⌘B detach, Go to main,
rename, swap, delete; push writes COMPONENT / INSTANCE (`local`), the plugin builds them.

## 1. Page dialect (tools/studio/dialect.mjs + renderPage + figma push / pull)

| Figma | Zen page | Notes |
| --- | --- | --- |
| Component set | `<ComponentSet id name description? link?>` around its variants | rendered as Figma's set frame: a wrap row of the variants, purple dashed outline on the canvas only |
| Variant | `<Component id name variant={{ Size: "Small", State: "Default" }}>` inside a set | the set's variant properties = the union of its variants' keys; each value list in variant order |
| Component properties | `properties={{ Label: { type: "text", default: "Save" }, "Show icon": { type: "boolean", default: true }, Icon: { type: "swap", default: "icon-plus-line", preferred: [...] }, Content: { type: "slot" } }}` on the set (or a lone Component) | defaults; `preferred` for swaps (Figma's preferred values) |
| Property bound on a layer | `data-prop-text="Label"` (Text), `data-prop-visible="Show icon"` (any layer), `data-prop-swap="Icon"` (an Icon's `name`, or a nested `<Use>`'s `of`), `data-prop-slot="Content"` (a Stack whose layers an instance fills) | layer-meta style: data-*, never exported to app code |
| Instance | `<Use of="button" variant={{ Size: "Small" }} props={{ Label: "Cancel", "Show icon": false }} overrides={{ "<layer path>": { … } }}>` | `of` names a set or a component; overrides by layer name path (F1 `data-name` / automatic names) |
| Nested instance exposed | `properties={{ …, "Avatar": { type: "nested", of: "avatar" } }}` | an instance's nested local instances listed under its properties (Figma's Expose nested instances) |
| Description, link | `description`, `link` on Component / ComponentSet | shown in the Inspector header and Assets |

Push: ComponentSet → COMPONENT_SET of COMPONENTs named "Size=Small, State=Default"; properties → componentPropertyDefinitions
(VARIANT / BOOLEAN / TEXT / INSTANCE_SWAP / SLOT), bound layers → componentPropertyReferences; Use → INSTANCE with
`setProperties`. Pull reads them back (round trip in figma-push.selftest). The Zen plugin importer: set creation
(`figma.combineAsVariants`), addComponentProperty, references.

## 2. Studio (Figma's gestures and words)

- **Combine as variants** (several mains selected → menu / Actions / right panel button): one `<ComponentSet>` around them,
  each a variant with a property `Property 1 = Variant1…` (Figma's defaults), renamable in the panel.
- **Add variant** (+ on a set, as Figma's): duplicates the last variant with the next value.
- **Create multiple components** (several layers selected): each its own `<Component>` in one edit.
- **Right panel of a main / set**: Component properties section (Figma UI3): + menu Variant / Boolean / Text / Instance
  swap / Slot; each row: name, type icon, default; edit / delete. Selecting a layer in a main: its "Apply component
  property" buttons beside Visibility (boolean), the text content (text), an icon (swap).
- **Instance panel**: the component's properties first (variant selects, boolean toggles, text fields, swap pickers,
  slot fills), nested exposed instances' properties; Reset all changes; Go to main component; Detach instance;
  **Push changes to main** (an instance's overrides written into the main) and **Restore** (main's values back).
- **Assets › Local**: sets with their variants and properties; click / drag places an instance with defaults.
- **Description and link**: header rows of a main / set; shown as the instance's tooltip in Assets.

## 2b. Where it lands (files)

| Piece | File | Notes |
| --- | --- | --- |
| Dialect | `tools/studio/dialect.mjs` (shared; targeted edits) | `ComponentSet` in BUILDER_NAMES; `localComponents` returns sets and variants; `checkComponents` validates ids, variant values, property types, bindings, `<Use variant props>` |
| Canvas | `src/platform/studio/builder/render/renderPage.tsx` | a set draws as Figma's set frame; an instance picks its variant and fills its properties; nested local instances draw (a cycle guard by id) |
| Code export | `tools/studio/compile.mjs` | one function per set (variant props → a switch) or main; properties become the function's props; instances pass them |
| Figma | `tools/studio/figma-push.mjs` (+ pull), the Zen plugin importer | COMPONENT_SET + componentPropertyDefinitions + references; INSTANCE setProperties |
| Studio | `edit/localComponents.ts`, `inspector/ComponentSection.tsx`, `inspector/DesignPanel.tsx`, `shell/CanvasMenu.tsx` + `edit/quick/commands.ts` (shared, small) | Combine as variants, Add variant, Create multiple components, properties, instance properties, Push changes / Restore |
| Assets › Local | `edit/assets/**` (Session C's) | asked of C, or C's OK for a small mount |

Ships as F7a (dialect, canvas, export, push / pull, properties and variants, instance panel, Combine / Add variant /
Create multiple, description and link) and F7b (overrides inside an instance and what an instance puts in a slot,
Push changes / Restore, nested exposed instances, Assets › Local), each its own PR. A slot property is defined and bound
in F7a (push makes Figma's slot); filling it from an instance is content inside the instance, so it goes with overrides.

## 3. Checks

Dialect selftests (sets, variants, properties, bindings, refusals), render selftests, figma-push / pull round trips,
plugin test on the mock, words lint, E2E FW-70…79 (Combine as variants, Add variant, add a boolean / text / swap
property, instance switches each, Push changes / Restore, Create multiple components, Assets › Local), full Studio E2E,
gate.

## 4. Open questions (decide while building; the user only if a Figma behaviour cannot map)

- Variant property order and value order: Figma keeps definition order; the dialect keeps first-seen order.
- A variant missing a property value (Figma shows it as empty): allowed, Studio warns.
