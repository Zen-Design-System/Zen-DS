# AI UI — the runtime layer for UI a model composes

A person types or says what they want; a model answers with **a UI spec**: JSON that names Zen components and their props.
The app validates and lints the spec, renders it with the real components, and keeps the person's choices in a shared
state the conversation can read and change. The model writes no code, no CSS and no colours: only components and props
from the catalog, so the token system, the usage rules and the accessibility of every component hold at run time.

Branch `zen/feat/ai-ui-runtime-20261014` (2026-10-14). What exists, where, and the decisions still open are below. The
platform page **Patterns › AI UI** (`npm run dev`, `?page=ai-ui`; `src/platform/examples/pages/ai-ui.tsx`) shows it at work
inside Zen AI with a deterministic composer standing in for the model.

## Files

| Path | What |
| --- | --- |
| `docs/ai-ui/catalog.json` | **Tier 2.** 133 public components: props as a JSON-Schema subset (`x-kind` for what JSON cannot say), defaults, descriptions, controlled-pair `bindings`, `requiredActions`, `status`, `chrome`, `excluded` (with the reason), per-slug `guidelines` (Do / Don't, harness rule ids), shared `$defs`. ~720 KB: a server reads it; a prompt gets one component's entry at a time. |
| `docs/ai-ui/catalog.index.json` | **Tier 1** for the prompt: one line per component (name, status, purpose, prop names), ~55 KB. |
| `docs/ai-ui/composer-rules.md` | The prompt pack: the spec format, the rules that go wrong most often (`AGENTS.consumer.md` §3), how to get the per-component Do / Don't. ~6 KB. |
| `docs/ai-ui/spec.schema.json` | JSON Schema (2020-12) of a spec document, for Ajv, Zod or another validator. Not shipped in the package (1 MB); the runtime validates against `catalog.json`. |
| `tools/ai-ui/build-catalog.mjs` | Generates the four files from `docs/api/*.json`, `docs/guidelines/index.json`, the Figma contracts and `AGENTS.consumer.md`. `npm run ai-ui:build` · `npm run ai-ui:check` (CI). |
| `tools/ai-ui/catalog.config.mjs` | The decisions: excluded props, chrome components, status overrides, HTML attributes admitted per `extends`, binding aliases, auto-bound props. |
| `tools/ai-ui/types.mjs` | Type text → schema; shared aliases (`ZenScaleInput`, `ContentTone`, text style names) read from the TypeScript source. |
| `src/ai-ui/` → `@zen-ds/react/ai-ui` | `spec.mjs` (helpers, ids), `validate.mjs`, `print.mjs` (spec → the React it renders), `ops.mjs` (edits by node id), `markdown.mjs`, `render.tsx` (`<AiUi>`), `catalog.ts` (types). The `.mjs` modules run in Node and the browser alike; `.d.mts` beside them type them. |
| `tools/ai-ui/lint.mjs` → `@zen-ds/react/ai-ui/lint` | `lintSpec` / `checkSpec`: the usage harness on a spec (Node, where the model composes). |
| `tools/ai-ui/compose.mjs` → `@zen-ds/react/ai-ui/compose` | `composeUi` / `composeEdit`: the prompt in two tiers, the model call (the app's function), parse → validate → lint → feedback until clean. `tools/ai-ui/compact.mjs` formats props for prompts. |
| `mcp/server.mjs` | `get_catalog` and `check_spec` tools beside the existing nine. |
| `tools/ai-ui/selftest.mjs`, `tests/ai-ui/` | `npm run ai-ui:selftest` (no browser) · `npm test -- tests/ai-ui` (renderer, every catalog component from a spec, the 600 / 390 px column). |

## The spec

```json
{
  "version": 1,
  "data": { "services": [{ "value": "cut", "label": "Haircut" }], "slots": [{ "value": "09:00", "label": "09:00" }] },
  "state": { "when": { "service": "cut" } },
  "root": {
    "type": "Stack", "id": "root", "props": { "gap": "lg" },
    "children": [
      { "type": "Heading", "id": "title", "props": { "level": 3 }, "children": ["Book an appointment"] },
      { "type": "SelectField", "id": "service", "props": { "label": "Service", "options": { "$ref": "services" }, "value": { "$state": "when.service" } } },
      { "type": "ChipGroup", "id": "slot", "props": { "aria-label": "Time", "options": { "$ref": "slots" }, "value": { "$state": "when.slot" } } },
      { "type": "Button", "id": "book", "props": { "level": "primary", "onClick": { "$action": "book", "args": { "when": { "$state": "when" } } } }, "children": ["Book"] }
    ]
  }
}
```

- A **node** is `{ type, id?, pending?, props?, children? }`. `type` is a catalog component; `id` makes the node addressable
  (ops, state, actions) and is required on interactive nodes (a warning otherwise). Children are strings, nodes or markers.
- **Markers** (the only non-JSON-literal values): `{ "$ref": "slots" }` reads `data` (`item.label` inside a `$map`);
  `{ "$state": "when.time" }` binds a prop to the shared state; `{ "$action": "book", "args": {…} }` names what a handler
  does; `{ "$map": "slots", "as": "slot", "node": {…} }` repeats a node per item (child position only);
  `{ "$pending": "text" | "heading" | "shape" }` and `"pending": true` on a node draw a Skeleton while content loads.
- **Built-in actions:** `setState` (`path`, `value`), `open` / `close` (`id` of an overlay node), `toast`, `navigate`,
  `link`. Every action, built-in or not, reaches the app through `onAction`.
- A prop's value is JSON of its type (`catalog.json` → `components[Name].props[prop]`): literals, enums, objects, arrays,
  nested nodes where the prop is a `node` or `element`, an ISO string where it is a `date` (the renderer makes the Date).

Full rules for the composing model: `composer-rules.md`.

## Runtime

```ts
import { AiUi, validateSpec, applyOps, markdownToSpec, assignIds } from "@zen-ds/react/ai-ui";
import { checkSpec } from "@zen-ds/react/ai-ui/lint";            // Node
import catalog from "@zen-ds/react/ai-ui/catalog.json";

const { ok, validation, lint } = checkSpec(spec, catalog);        // validateSpec + the usage harness; errors carry path, code, hint
<AiUi spec={spec} catalog={catalog} data={fetched} onAction={run} onStateChange={(state, change) => tell(model, change)} />
const next = applyOps(spec, [{ op: "setProp", id: "book", name: "level", value: "accent" }]);   // "make it accent"
```

- **Validation** (`validateSpec(spec, catalog, options)`): unknown or chrome component, excluded or unknown prop, enum, type,
  required prop or field, action on a value prop, `$map` in a prop, duplicate or missing id, depth and size. Each problem:
  `{ severity, code, path, message, hint? }`; hints name the nearest component, prop or value. Options: `chrome`,
  `experimental`, `requireIds`, `strictData`, `maxNodes`, `maxDepth`.
- **Lint** (`lintSpec`): the spec printed as the React it renders (`toJsx`) and checked by the usage harness in app mode;
  findings map back to node ids. Node only (the rules read the icon list from disk).
- **Renderer** (`<AiUi>`): components from the library (or a `registry`); `$ref` from `data` (default `spec.data`); state
  controlled (`state` + `onStateChange`) or kept inside (`defaultState` / `spec.state`). A catalog **binding pair**
  (`value` + `onValueChange`, `checked` + `onCheckedChange`, `open` + `onOpenChange`, `page`, `range`…) is bound to the
  path the spec gives (`$state`), or, for `value`, `checked`, `open`, `page`, `range`, `expanded`, `selected`, to
  `state[<id>].<prop>` when the spec sets neither prop nor handler — so every pick reaches the conversation
  (`onStateChange`, `onEvent`). A required handler the spec leaves out (AiChatField `onSubmit`, TableBulkAction `onClick`)
  emits an action of that name. Every element gets `data-ai-ui-id` where the component forwards HTML attributes.
- **Ops** (`applyOps`): `setProp`, `removeProp`, `setText`, `setChildren`, `insertChild`, `removeNode`, `replaceNode`,
  `moveNode`, `setData`, `setState`; pure, by id, with `OpError` codes. Re-rendering the edited spec keeps the state.
- **Markdown** (`markdownToSpec`): headings → `Heading` (h1 of an answer renders as level 2), paragraphs → `Text` with
  `**bold**`, `*em*`, `` `code` `` and `[links](url)` as nested `Text` / `Link`, lists → `List` + `ListItem`, pipe tables →
  `Table`, fenced code → `Text as="code"`, quotes → light `Text`, rules → `Divider`.

## Composing with a model (server)

`@zen-ds/react/ai-ui/compose` is the loop the handoff asked for, provider-agnostic: the app passes `model`, a function
`({ system, messages }) => Promise<string>` over whatever API it uses.

```ts
import { composeUi, composeEdit } from "@zen-ds/react/ai-ui/compose";

const answer = await composeUi({ prompt, catalog, model, data: { slots }, state: shared });
// answer.ok · answer.text · answer.spec (ids assigned, validated, linted) · answer.components · answer.attempts
const edit = await composeEdit({ prompt: "make it accent", spec: answer.spec, state: shared, catalog, model });
// edit.kind: "ops" | "state" | "spec" | "text" · edit.spec (the ops applied) · edit.state (a state change to apply)
```

- **Two tiers in the prompt.** `composeUi` first asks the model to pick at most 8 components from tier 1 (`tier1`: one
  line each, ~41 KB with prop names), then composes with tier 2 of the picked ones (`tier2`: props with types, defaults
  and descriptions, shared types, bindings, Do / Don't; Stack, Text, Heading and Button always there in brief). Pass
  `components` to skip the pick, `pick: false` to compose from tier 1 in one call. `buildSystemPrompt` gives the prompt
  alone (the rules come from `composer-rules.md`).
- **The loop.** Each reply is parsed (`extractJson` tolerates fences and prose), ids are assigned, the spec is validated
  and linted (`judge`); a rejected one goes back as a numbered list of problems with paths and hints (`feedbackFor`) until
  it is clean or `maxAttempts` (3) is spent. `attempts` keeps every round for the metrics the handoff names (valid-spec
  rate, time to first UI). A reply with `text` and no `spec` is a prose answer.
- **Follow-ups.** `composeEdit` sends the spec on screen, its components' tier 2 and an ops reference; the model answers
  with `ops` (applied with `applyOps`, then judged), a `state` change, a new `spec`, or text only.
- **Data.** `data` is described to the model by shape (keys and a sample item), never pasted in full; the spec reads it
  with `$ref`, so the model cannot invent values.
- **MCP.** `zen-ds-mcp` has `get_catalog` (tier 1, or one component's tier 2) and `check_spec` (validation + lint of a
  spec) so an agent in Claude Code, Cursor or Cowork can compose and check specs with the same contract.

## Catalog rules

- **Public** = the components a guideline lists under `props` in `docs/guidelines/index.json` (parts such as
  `DatePickerItem` are not). Documented twice (DateField) counts once.
- **Excluded props** (`excluded` on each entry says why): `className`, `style`, `overrides`, `ref`, `key`, `state` (the
  Figma visual state; `disabled` is the one static toggle), deprecated aliases, refs, element types, CSS, and functions that
  return something (formatters, cell renderers). HTML attributes the props list omits are admitted per `extends`:
  `aria-*` everywhere; `disabled`, `onClick` on buttons; `disabled`, `readOnly`, `required`, `placeholder`, `name`,
  `autoComplete`, `inputMode`, `min`, `max`, `step`, `maxLength` on fields. `value` / `defaultValue` (and `checked`) are
  written out from their `on<X>Change` handler when react-docgen left them out.
- **Status:** `stable` = documented and smoke- and conformance-tested (every public component); `verified` = a Figma parity
  suite or capture covers the component's folder (41 today; by file name, see open decisions); `experimental` = a required
  prop has no JSON form (`unavailable` names it: ChatReactorsPanel `glyph`, ZenPortalProvider `container`), or set in
  `catalog.config.mjs`. Experimental components fail validation unless `{ experimental: true }`.
- **Chrome:** AppShell, Sidebar, TopNavigation, BottomNavigation, DashboardHeader, PageHeader, ZenProvider, Container stay
  in the catalog for whole-screen composition and fail validation inside a conversation unless `{ chrome: true }`.

## Findings (2026-10-14)

- Every public, non-experimental component renders from a spec its catalog entry describes (tests/ai-ui/catalog.test.tsx,
  120 components; 13 skipped: parts that need their parent, experimental, fixtures without a JSON form).
- In a 600 px and a 390 px column the booking form and the charts fit; a 4-column `Table` needs ~608 px and scrolls
  sideways inside its own box (`.zen-table` has `overflow-x: auto`), so the column itself never overflows.
- `data-ai-ui-id` does not reach the DOM on components that keep their HTML attributes to themselves (the Skeletons).

## Open decisions (user / designer)

1. **`verified` is a heuristic** on Figma contract file names; confirm the 41 or list them in `STATUS_OVERRIDES`.
2. **Spec format:** this tree, or A2UI / json-render? The tree keeps Studio's dialect shape (element / props / children,
   refs, maps); an exporter to A2UI can be written on top if a native renderer is needed.
3. **Narrow Table:** keep the sideways scroll in a chat column, or a compact mode that folds columns (needs Figma)?
4. **Prose:** fenced code renders as `Text as="code"` (no mono style or code block component); a Prose / CodeBlock
   component needs Figma.
5. **Chat reactions:** `ChatReactorsPanel.glyph` is a formatter; give it a JSON form if reactions should be composable.
