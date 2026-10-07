# Code view in other languages: Vue, Svelte, HTML, Swift, Flutter (plan, 2026-10-03)

Status: **plan only, waiting for the user's decisions (§8)**. Nothing is built. Each phase in §6 needs its own approval
(Scope lock).

## 1. Where we are

- **Code view.** `src/platform/PlatformCode.tsx` lists React · Vue · Svelte · HTML · Swift · Flutter. Any language other
  than React prints a two-line `// <Language> — Coming Soon` comment, and Copy copies that comment. In Zen Studio,
  `PlatformCode` hands the code to `studio.renderCode` (`CodeView`, tsx) and shows no language picker. The Code tab's
  Snippet (`studio/inspector/CodePanel.tsx`) has no picker either.
- **Snippets.** There are 44 playground snippets (`<PlatformCode code=…>`), built as template strings from the
  playground's state, mostly in `PlatformExamples.tsx` and `appLayer/*`. There are also 306 example `code:` strings in
  `src/platform/examples/pages/*.tsx`. Those are app code with hooks, handlers and `.map`.
- **What each language already has:**

  | Language | Exists today |
  | --- | --- |
  | HTML + CSS | `dist/styles.css` + `reset.css`. Every component renders `zen-*` classes and `data-*` attributes. `ZenProvider` modes are attributes on `<html>`: `data-theme`, `data-brand`, `data-component-theme`, `data-density`, `data-radius`, `data-emphasis`, `data-breakpoint`, `data-typography`. Icons are inline SVG built from the generated path data. So markup plus CSS already looks right without React. Only the behaviour is missing. |
  | Vue / Svelte | Nothing. |
  | Swift | `platforms/swift` (`ZenTokens`: tokens, text styles, mode resolver, parity vectors). It has never been compiled. Swift 6.0.3 is installed on this Mac. No shadows, no components. |
  | Flutter | `platforms/flutter` (`zen_tokens`). It has never been compiled. The Flutter SDK is **not installed** here. No shadows, no components. |

- **How interactive the components are.** This is a rough count of hooks and listeners in each component's `.tsx`:

  | Group | Count | Components |
  | --- | --- | --- |
  | Stateless | 23 | AlertBanner, Avatar, Badge, Button, ColorSelector, Divider, DockIcon, EmptyState, FileIcon, Icon, InlineMessage, Layout, Link, ListItem, MetricWidget, Motion, PageHeader, Portal, Progress, Skeleton, Stepper, Text, VisuallyHidden |
  | Light (some state or keyboard) | 24 | Accordion, ActionBar, AiChat, BottomNavigation, BottomSheet, Breadcrumbs, Card, Checkbox, DescriptionList, Flag, Image, Pagination, Provider, RadioButton, Rating, Search, Segmented, SidePanel, Slider, Tabs, Tag, Toggle, TopNavigation, Uploader |
  | Heavy (overlays, focus management, editors) | 14 | AppShell, Chart, Chat, Chip, DatePicker, Dialog, Form, Input, Menu, Popover, Sidebar, Table, Toast, Tooltip |

## 2. Principles

1. **React stays the reference.** A language shows real code for a component only when that component's port exists
   and passes the parity gate. API names stay the same on every platform (skill `zen-ds-port-platform` §3). Ports
   never invent props.
2. **One CSS contract for the web.** Vue, Svelte and HTML render the same markup and classes as React. The visuals
   then come from the same `styles.css`, and a DOM diff checks parity mechanically instead of by eye.
3. **Every snippet compiles.** Every snippet the docs show must type-check in its own language, the way the React
   snippets are TSX today.
4. **Honest UI.** When a language is not ready for a component, the code area says so in visible text and points to
   what works today (HTML markup or React). It never shows a "Coming Soon" comment dressed as code, and it never shows
   a dead option.
5. **Generated, not written six times.** One source (the React snippet) feeds an emitter for each language.

## 3. Architecture

### A. Snippet model and emitters (`src/platform/code/`)

- Parse the React snippet with `@babel/parser`. It is already a dependency. The docs load it lazily, only when someone
  picks a language other than React.
- The parse yields a neutral tree:
  - `imports`
  - elements `{ component, props, children }`, where a prop is one of: string, number, boolean, enum, icon name, node,
    handler or expression.
- There is one emitter per language: `vue.ts`, `svelte.ts`, `swift.ts`, `dart.ts`. Each emitter reads the port's
  mapping manifest. For every component the manifest gives:
  - the package import
  - the component's name
  - how children, the label, slots, events and the controlled value map
- When a snippet holds anything the emitter cannot map, that language reports "not translatable" for the snippet. A
  half-translated snippet is never shown.
- HTML is not an emitter. It comes from the rendered specimen (B).
- Here is what the emitters would produce. The real API is whatever each port defines:

  ```text
  React    <Button level="primary" size="sm" startIcon="icon-check-line">Button</Button>
  Vue 3    <Button level="primary" size="sm" start-icon="icon-check-line">Button</Button>
  Svelte 5 <Button level="primary" size="sm" startIcon="icon-check-line">Button</Button>
  SwiftUI  ZenButton("Button", level: .primary, size: .sm, startIcon: .iconCheckLine)
  Flutter  ZenButton(label: 'Button', level: ZenButtonLevel.primary, size: ZenButtonSize.sm, startIcon: ZenIcons.iconCheckLine)
  ```

  Events map like this: `onClick` becomes `@click` (Vue), `onclick` (Svelte), an `action:` closure (SwiftUI) and
  `onPressed` (Flutter). A controlled `value` + `onChange` pair becomes `v-model`, `bind:value`, a `Binding`, and
  `value` + `onChanged`.

### B. HTML + CSS

- **Source.** The snippet is the live specimen's DOM (the playground preview row), cleaned up:
  - `data-zen-src` is removed.
  - React ids become stable, readable ids, and the `aria-labelledby` / `aria-controls` pairs that point at them are
    kept.
  - The markup is pretty-printed.
  - Icons stay inline SVG. Another option is to publish `dist/icons/sprite.svg` and emit `<use href>` (decision
    later).
- **Header.** The snippet starts with `<link rel="stylesheet" href="…/styles.css">` and shows the mode attributes on
  `<html>`.
- **Interactive components.** HTML shows the markup of the current state, plus a visible note: "Opening, closing and
  keyboard need JavaScript: use React (or the Vue/Svelte package when it is ready)."
- **The CSS contract.** Once HTML snippets ship, class names become public API. A generated
  `docs/api/css-contract.json` lists, for each component, the classes, `data-*` attributes and custom properties its
  markup uses. A check fails when one of them disappears without a CHANGELOG `Breaking (markup)` line.

### C. Web ports: Vue 3 and Svelte 5 (`platforms/vue`, `platforms/svelte`)

- **Packages.** `@zen/design-system-vue` and `@zen/design-system-svelte`. Each takes `@zen/design-system` as a peer
  dependency for `styles.css`, the tokens and the icon data.
- **A framework-free core.** The pure logic React uses moves to `src/core/`, so the ports import it instead of copying
  it:
  - labels (`resolveZenLabels`)
  - `layoutSizing`
  - DatePicker date math
  - formatters
  - keyboard maps
  - positioning

  Each move is a refactor, and the visual diff must show 0 changed panels.
- **Parity gates.** These are the "done" bar for each component:
  1. **DOM parity.** Take a prop matrix: the enum props from `api.generated.json` × the playground defaults. Render it
     with `react-dom/server` and with the port's SSR renderer. The normalised HTML must be identical.
  2. **Behaviour.** The component's `tests/interaction` cases are ported with Testing Library for Vue and for Svelte.
  3. **Types.** Every emitted playground snippet compiles (`vue-tsc` / `svelte-check`) in a generated fixture project.
- **Waves.**
  1. W1: the 23 stateless components.
  2. W2: the 24 light ones.
  3. W3: the 14 heavy ones, Popover first, because Menu, Select, DatePicker, Tooltip and Chip build on it.

### D. Native ports: SwiftUI and Flutter (`platforms/swift`, `platforms/flutter`)

- **Step 0.** Compile and test the token packages. `swift test` runs on this Mac. Flutter needs the SDK (install it,
  or use CI). Then add effects (shadows) to `scripts/build-native-tokens.mjs`.
- **Components.** CSS cannot be reused here, so each component is a full port following `zen-ds-port-platform`. Parity
  has two parts:
  - a token table per state (React computed value vs the port's token)
  - snapshot or golden images, compared with the web screenshot of the same props (`zen-ux-reviewer`)
- **Phone set first.** That is what the mobile pages use: Button and IconButton, the Input family, Toggle, Checkbox,
  Radio, Segmented, Chip, List and ListItem, Avatar, Badge, Tag, TopNavigation, BottomNavigation, BottomSheet, Toast,
  Dialog, Tabs, Card, EmptyState, Skeleton and Progress. The desktop-only components (Sidebar, AppShell, Table,
  SidePanel, DatePicker range, Chart) come later, or never.
- **Snippet gate.** The emitted snippets build: `swift build` of a generated file, and `flutter analyze`.

### E. The Code view UI (classic and Studio)

- **One picker for both.** The classic `PlatformCode` and the Studio Code tab Snippet share it.
  - The choice is remembered per viewer in `localStorage` (inside try/catch).
  - The choice also goes in the URL (`?code=vue`), so a link opens with it.
- **Status per component.** A generated `src/platform/code-languages.generated.json` (from the port packages and the
  parity results) gives each language one of three states: ready · markup only (HTML on interactive components) · not
  yet.
- **Not ready.** The code area shows a short message, for example: "Vue isn't available for DatePicker yet. HTML
  markup and React are." It links to the Languages matrix. Copy is hidden in that state.
- **One highlighter.** The classic regex `highlightCode` is replaced by `studio/code/tokenize.ts`, which gains `html`,
  `vue`, `svelte`, `swift` and `dart` scanners.
- **Install per language:**
  - `npm i @zen/design-system-vue`
  - the Swift Package URL
  - `pubspec.yaml`
- **A "Languages" overview page.** It shows the generated component × language matrix.

### F. AI and docs

- `docs/api/<component>.md`, `AGENTS.consumer.md` and `llms.txt` get per-language usage blocks from the same
  emitters. The MCP `get_component` tool takes a language.
- The usage-guard harness reads TSX only. Equivalent rules for Vue and Svelte go to the Backlog.

## 4. Examples get every language too (user direction, 2026-10-03)

The user asked for examples to have every language, like the playgrounds. Examples are the code people copy most:
real screens with state, lists and actions. Without them, a language is only half useful.

**The survey** (`@babel/parser` over every `code:` in `src/platform/examples/pages/*.tsx`, 2026-10-03) found 310
snippets in 55 files. They are 17 lines at the median, 27 at p90 and 43 at most. Only **11 are pure JSX**. The rest
use:

| Feature | Snippets | Share |
| --- | --- | --- |
| an event handler (`on…={…}`) | 260 | 84% |
| a conditional (`&&` or a ternary) | 171 | 55% |
| `.map` | 119 | 38% |
| a formatter (`formatDate`, `formatMoney`, `plural`, `initials`…) | 94 | 30% |
| the shared demo data (`people`, `invoices`, `tasks`, `files`, `leaveRequests`) | 83 | 27% |
| a Zen or platform hook (`useFormState`, `useToast`, `usePhoneScreen`…) | 69 | 22% |
| `useState` | 63 | 20% |
| other React hooks | 55 | 18% |
| `.filter` / `.sort` / `.find` | 30 | 10% |

Most snippets are **excerpts**: they call handlers and state (`setDialog`, `duplicate`) that are declared elsewhere.
Today the React snippet is a hand-written string beside `render`, so it can drift from what renders, and nothing
compiles it.

So "translate only the pure-JSX examples" would cover about 4%. Examples need their own track:

1. **Portable snippets.** Each example snippet becomes a small, complete component: state + handlers + JSX, no free
   variables. People can copy it, and it can be compiled.
   - Platform-only helpers (`usePhoneScreen`, `PlatformPhone`, `DemoFieldDialog`) leave the snippets.
   - A compile gate type-checks every React snippet in a generated fixture project. Drift then shows up as an error.
   - Optional, stronger: the snippet becomes the source of the render, as a real `*.example.tsx` file shown with
     `?raw`. Then snippet and render cannot differ. It is a larger refactor of examples that were rebuilt only days
     ago.
2. **A portable React subset**, which the translator understands and a lint rule enforces on example snippets:

   | React | Vue 3 | Svelte 5 | SwiftUI | Flutter |
   | --- | --- | --- | --- | --- |
   | `useState` | `ref` | `$state` | `@State` | a field + `setState` |
   | `&&`, ternary | `v-if` / `v-else` | `{#if}` | `if` | collection-if |
   | `.map` | `v-for` | `{#each}` | `ForEach` | `for` / `.map().toList()` |
   | `.filter` / `.sort` before `.map` | `computed` | `$derived` | computed property | getter |
   | simple handlers (`() => setX(v)`, named functions) | the same | the same | the same | the same |

   An example that uses anything outside the subset is rewritten inside it. It is never shown half-translated.
3. **One demo world per language.** `examples/data.ts` is generated as data for each language (TS/JSON, Swift, Dart).
   The formatters (about 15 functions) are written once per language and share test vectors, the way the token
   vectors work, so every language prints the same dates, money and plurals.
4. **Zen hooks per port.** `useToast`, `useFormState` and the rest get their port equivalents: a Vue composable, a
   Svelte store, a SwiftUI environment value, `ZenToast.of(context)`.
5. **When an example shows a language.** All four must hold:
   - every component it uses is ported in that language;
   - the translation succeeds;
   - the snippet compiles;
   - on the web, its rendered DOM matches the React render (the same DOM-parity harness as §3C, at screen level).

   Otherwise the example says which component is missing, for example "Flutter: Table isn't ported yet". Desktop
   examples (Table, Sidebar, AppShell) will mostly stay web-only until the native ports cover those components.
6. **HTML for examples** is the static markup of the rendered example. It carries the same "needs JavaScript" note
   when the example is interactive.

## 5. Costs and risks

- **Upkeep grows with each language.** Every component change (Figma re-sync, a new prop) has to land in React and in
  every port, and the parity gate fails until it does. Five languages cost roughly five times the upkeep of today's
  component layer. So the plan recommends **only the languages real users need**.
- **HTML makes markup public API.** Renaming a class becomes a breaking change (B).
- **Toolchains.** Flutter is not installed. Swift is tested on macOS only. The ports target Vue 3 and Svelte 5 only (no
  Svelte 4).
- **Peer ownership.** `src/platform/studio/**` belongs to the session "Platform UI/UX redesign với canvas editor".
  Changes to `code/tokenize.ts` and `inspector/CodePanel.tsx` need a SendMessage to that session first.
- **Bundle.** `@babel/parser` is used by the docs only, and lazy-loaded.

## 6. Phases (each one approved on its own)

| # | Content | Tier | Done when |
| --- | --- | --- | --- |
| P1 | Code view base: a shared picker (classic + Studio), the status manifest, the honest not-ready state, the shared highlighter, the snippet parser and neutral tree (no emitter yet) | M | `npm run qa` scoped to button + 3 pages; Studio checked by hand; the parser reads 44/44 playground snippets |
| P2 | HTML + CSS for all 44 playgrounds and 310 examples, the CSS-contract check, the "markup only" note | M | Each HTML snippet pasted into a plain page with `styles.css` shows 0 changed panels against React for the stateless components |
| P2b | Portable example snippets (§4): 310 snippets made complete components, platform helpers removed, subset lint rule, React compile gate, demo data + formatters as a framework-free core with vectors | L | Every React example snippet type-checks; the subset rule passes on 310/310; 0 changed panels (the renders don't change) |
| P3 | Web core extraction + Vue W1 (23) + parity harness + Vue emitter (playgrounds and examples) | L | DOM parity 100% on W1; `vue-tsc` passes on every emitted snippet; every example whose components are all ported shows Vue |
| P4 | Vue W2 then W3 | L × 2 | Same gates |
| P5 | Svelte W1–W3 (reuses the harness and the emitter base) | L × 2 | Same gates with `svelte-check` |
| P6 | Native tokens: compile, test, add shadows | S | `swift test` ✓, `flutter test` ✓ |
| P7 | SwiftUI phone set + Swift emitter | L | Token table + snapshots; snippets build |
| P8 | Flutter phone set + Dart emitter | L | Golden tests; `flutter analyze` |
| P9 | AI and docs per language (API docs, AGENTS.consumer, llms.txt, MCP) | M | `npm run mcp:selftest`, `guidelines:check` |

The order of P3–P8 depends on the decisions below. P1 and P2 are useful whatever is chosen.

## 7. What P1 + P2 deliver on their own

They need no new package. The picker is honest. HTML + CSS works for the 23 stateless components, and markup comes
with a note for the rest. Every other language says plainly what is missing.

## 8. Decisions for the user

1. **Web strategy:**
   - **(A) Native Vue/Svelte ports on the shared CSS + DOM parity (recommended).**
   - (B) Web Components that wrap the React components. One package then serves Vue, Svelte, Angular and plain HTML,
     with exactly the same behaviour. The cost: it ships the React runtime (~45 kB gzip), offers no SSR, and props that
     take React nodes need mapping.
   - (C) Drop Vue and Svelte, and offer only HTML for the web.
2. **Which languages, and in what order.** The dropdown has five. Suggested order: HTML → Vue → Swift/Flutter for the
   phone set → Svelte. It depends on what your clients use.
3. ~~Examples: React only, or translate the pure-JSX ones.~~ **Decided 2026-10-03:** examples get every language (§4,
   phase P2b). Still open: should the snippet become the source of the render (`*.example.tsx` + `?raw`), or stay a
   string checked by the compile gate?
4. **The dropdown until then:** keep all six with honest states (recommended), or list only the ready languages.
