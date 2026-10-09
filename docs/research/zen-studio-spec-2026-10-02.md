# Zen Studio — the docs platform as a canvas tool (spec, 2026-10-02)

User request (2026-10-02, Vietnamese, paraphrased): the platform UI is ugly and its UX weak. Turn it into a **tool**:
a FigJam-like canvas (zoom in/out, pan) where an **admin** clicks directly on any element of a playground or example
and edits text style, spacing, alignment, component variants…; the change is **written to the source code at once**.
The code view looks like git (line numbers, full syntax colours). Playground properties are complete and nested
components can be selected, like Figma. Built with the Zen library itself in **Component Theme Neutral-S7, Component
Size Compact, Typography Dashboard** ("S7-compact-dashboard"). Examples still render as today; desktop examples keep a
full-screen preview; desktop playgrounds are no longer squeezed (frames take their real width). Only admins edit; the
default role is admin.

## 0. Ground rules

- React 19, Vite 8, TypeScript (tsc via `npx tsc --noEmit -p .`). Import Zen components from `../../components/<Name>`
  (relative to `src/platform/studio/...`). Never import `@zen/design-system` inside `src/platform`.
- All studio code lives in `src/platform/studio/**` and `tools/studio/**`. Do **not** edit other files unless your task
  says so. Other Claude sessions edit this repo at the same time: never rewrite shared files.
- Contracts already written (read them first, do not change their shape without telling the integrator):
  `src/platform/studio/types.ts`, `src/platform/studio/store.ts`, `src/platform/studio/bridge.ts`.
- CSS: tokens only (`--zen-*`), no raw px for spacing/radius/type/colour/shadow except `var()` fallbacks and
  structural sizes (panel widths, 1px hairlines, canvas maths). The style guard runs on every edit
  (`node tools/style-guard/check-styles.mjs <file>`); a justified exception carries `/* zen-allow-<rule>: reason */`
  within the 4 lines above. Studio CSS classes start with `studio-`. Each module imports its own CSS file.
- Text: use `typographyStyles[...]` classes (`src/tokens/typography.generated`) or Zen `Text`/`Heading`, never raw
  font sizes. The chrome runs in Typography Dashboard.
- Accessibility: every icon-only button is a Zen `IconButton` (it has the 1 s name tooltip) with `aria-label`; panels
  are landmarks (`aside`/`nav`/`main` with labels); the canvas has `role="application"` with an
  `aria-roledescription="canvas"` and keyboard shortcuts work without a mouse.
- Background layers: Studio chrome panels = Surface/Default; the canvas = Canvas/Default with a dot grid; frames are
  Surface (the example's own Canvas inside); popovers/menus = Zen Popover/Menu.

## 1. Entry and modes

- `src/main.tsx` (integration step, not builders): `?ui=classic` → classic `PlatformApp`; `?ui=studio` → `StudioApp`;
  default: `navigator.webdriver ? classic : studio`. The QA gate (Playwright) keeps the classic DOM.
- While building: `npx vite --config vite.studio.config.ts` serves `http://127.0.0.1:5180/studio.html?page=button`
  (entry `src/platform/studio/dev-entry.tsx` renders `StudioApp`). Launch config name: `zen-studio-5180`.
- URL: `?page=<id>&collection=<slug>` exactly like the classic app (history entries per page, `popstate`).
- State: `studioStore` / `useStudio` in `store.ts` (persists view state in sessionStorage because a source edit can
  trigger a full reload; role, chrome theme and preview modes in localStorage).

## 2. Layout (desktop ≥ 1024px; 100vh, no page scroll)

```
┌ Toolbar 48px ─────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ Zen Studio ▾ │                          Components / Button                     │ Modes ▾  ☀/☾  ↶ ↷ │ Admin ▾ │
├ Left 272px ───────┬ Canvas ────────────────────────────────────────────────────────┬ Inspector 320px ──┤
│ Tabs: Pages|Layers│ dot grid, pan/zoom world                        (100% ▾)         │ Tabs: Design|Code │
│ Search pages ⌘K   │  Button (board title, eyebrow, description)                      │ …                 │
│ Get started       │  ┌ Playground ──────────────────┐  ┌ Docs ─────────────┐         │                   │
│  Overviews        │  │ panel: Button / Main          │  │ Keyboard, API,    │         │                   │
│  Installation     │  │ panel: Button / Flat …        │  │ Props, Guidelines │         │                   │
│ Foundation …      │  └───────────────────────────────┘  └───────────────────┘         │                   │
│ Components A–Z    │  Examples                                                         │                   │
│                   │  [frame][frame][frame 1440 screen………………]                         │                   │
│                   │                      ( ▸ ✋ ☝ )                            (?)   │                   │
└───────────────────┴────────────────────────────────────────────────────────────────┴───────────────────┘
```

- Chrome root: `ZenProvider` with `componentTheme="neutral-s7" density="compact" typography="dashboard"
  theme={chromeTheme}` (paint on). Panels: Surface/Default with a Pale hairline border between panel and canvas.
- Narrow (< 1024px): side panels become drawers (`state.drawer`), opened from toolbar buttons; scrim; Escape closes.
- Canvas content (the world) carries the **preview** modes (`state.preview`: theme, componentTheme, density,
  typography, radius, emphasis) as `data-*` attributes plus `data-brand="zen"`, exactly as the classic
  `.official-platform` did, so examples render identically. Portalled overlays of the examples go to a portal root
  outside the world (unscaled) that carries the same preview modes: `<div class="official-portal-root studio-portal-root"
  data-theme … data-typography>` inside a `ZenPortalProvider container={…}` (import from `../../components/Portal`).
  The class `official-portal-root` must stay: examples and full-screen code look for it.
- `PlatformTypographyContext` (from `../PlatformTemplate`) must be provided with `preview.typography` around the world.

## 3. Canvas

- World transform: `translate(x, y) scale(zoom)`, `transform-origin: 0 0` on `.studio-world`; zoom 0.02–4.
  Dot grid background on the viewport whose spacing/offset follows the viewport (CSS custom properties).
- Gestures: wheel/trackpad scroll pans; Ctrl/⌘ + wheel (and trackpad pinch, which arrives as ctrl+wheel) zooms around
  the cursor; Space + drag, middle-button drag and the Hand tool pan; dragging empty canvas with Select pans too.
  In Interact, wheel over a scrollable element inside a frame scrolls that element (when it can still scroll that
  way), otherwise pans.
- Keys (ignored while typing in an input/textarea/contenteditable or in a Zen popover): V select, H hand, I interact,
  ⌘/Ctrl + = zoom in, ⌘/Ctrl + − zoom out, ⌘/Ctrl + 0 or Shift+0 → 100%, Shift+1 zoom to fit all, Shift+2 zoom to
  selection, Escape → select parent (then frame, then nothing), Enter → first child, ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z
  redo, F → present the selected frame (full screen).
- Canvas chrome floats as in Figma (2026-10-06, user): the zoom pill top-right, only the percentage and its menu
  (XSmall; − + and fit live in the menu and on their keys), the tools Select V · Hand H · Interact I bottom-centre,
  and the tip as one "?" icon bottom-right (its tooltip is the current tool's hint, a click opens Keyboard shortcuts;
  the hint text stays visually hidden as the canvas's aria-describedby). The zoom menu:
  Zoom in, Zoom out, Zoom to fit, Zoom to selection, 50%, 100%, 200%.
- On first visit to a page: fit the board's first row (playground + docs) to the viewport width, zoom ≤ 1, top-left
  aligned with 48px margin. The viewport per page is saved (`setViewport(pageKey, …)`) and restored.

## 4. Board and frames (`renderComponentPage` in the bridge)

`ExamplePage` (PlatformExamples.tsx) calls `bridge.renderComponentPage({ page, eyebrow, title, description,
playground })` in the Studio. The board renders, in world coordinates (CSS layout inside the world, no absolute
positioning per frame):

1. **Board title**: eyebrow (Caption), title (Heading/1 at world scale), description (Body/Base) — max 720px.
2. Row 1: **Playground frame** (`frameId "playground"`) + **Docs frame** (`"docs"`, width 880: `ComponentKeyboard`,
   `ComponentApi`, `ComponentProps` from `../PlatformReference`, `ComponentGuidelines` from `../PlatformGuidelines`, each
   for `page`).
   - Playground frame width: 1440 for `app-shell`, `sidebar`, `table`, `page-header`, `side-panel`, `chart`,
     `top-navigation`, `templates`; 1200 for `dialog`, `date-picker`, `popover`, `input`, `metric`, `card`; else 960.
     The frame override (`state.frameOverrides[pageKey].playground.width`) replaces it.
   - Inside: the `playground` node. Each `ComponentPreview` panel in it has `data-studio-panel=<id>`; the active one
     (`bridge.activePanel`) gets an accent outline. Its controls (`PlaygroundControls`) and code (`PlatformCode`)
     portal into the inspector slots; inline they render nothing. So the specimen gets the whole frame width.
3. Row 2: **Examples section** title "Examples" + count, then one frame per example from `getPageExamples(page)`
   (`../PlatformShowcases`), `frameId "example:<index>"`, label = example title. Body: `<ExampleCard bare title
   description code wide screen>{example.render()}</ExampleCard>` (keeps the example's own theme switch, `.pe-card`
   hooks and stage). Widths: `screen` → 1440, `wide` → 1200, else 640; phone examples (`PlatformPhone`) fit content
   (width: max-content). Flex-wrap rows with 64px gaps; the section is 2944px wide (two 1440 frames + gap).
4. Non-component pages (Overviews, Installation, Design Tokens and its collections, Typography, Iconography) are NOT on
   the canvas (user decision, 2026-10-02): they render as a normal scrolling page in the canvas area
   (`doc/DocumentPage.tsx`), in the preview modes, with no zoom, tools, Layers tab or Inspector.

Frame chrome (Figma-like): the frame **name label** sits above the frame's top-left (Caption/Medium, Content/Neutral/Base;
accent when selected); clicking it selects the frame. On hover or selection a small frame toolbar appears above the
top-right corner: width preset menu (Auto · 390 · 768 · 1024 · 1280 · 1440), theme (light/dark for that frame),
**Present** (full screen, `F`), and for examples Copy code. Frame body: Surface/Default, 1px Pale border,
Corner-Radius Large; selected → 2px accent outline outside.

Present (full screen): `state.presenting = frameId`. Renders the frame's content again in a fixed full-viewport layer
outside the world at 100% (an example: `ExampleCard bare` + `render()`; the playground: not re-rendered — instead the
world drops its transform via `.studio-world:has([data-fullscreen="true"])` so the existing App Shell playground
full-screen keeps working). One floating "Exit full screen" pill top-centre (`FullScreenExitButton` look); Escape
exits unless an overlay owns it (`fullScreenEscapeOwners` from `../PlatformFullScreen`). Focus returns to the
Present button.

## 5. Selection (Select tool)

- Every JSX element in the platform example/playground source carries `data-zen-src="<file>:<line>:<col>"` (added by
  the dev-server plugin at transform time; components that spread props put it on the DOM too). Picking walks **React
  fibers**: DOM node → its fiber (`__reactFiber$…` key) → up `.return` until a fiber whose `memoizedProps["data-zen-src"]`
  is set. That fiber's type name (component `displayName`/`name`, forwardRef/memo unwrapped, or host tag) is the layer
  name; its host DOM nodes (descendant host fibers until the first host level) give the outline rectangle (union).
- In Select, a transparent capture layer covers the viewport: pointer events never reach the examples (no hover, no
  focus, no clicks); `document.elementsFromPoint` finds what is under the cursor.
- Click selects the deepest annotated element under the cursor (Figma's ⌘-click). Hover shows a 1px accent outline
  and a name tag; selection shows a 2px accent outline with a name tag ("Button" + `button.tsx:84`) and, for layout
  components (Stack/Grid/Box/Container/Form…), the gap and padding areas tinted. Shift+click toggles multi-select only
  for display (editing applies to the primary). Double-click on text selects the text's element and focuses its
  Content field in the inspector.
- Escape → parent annotated element (then the frame, then nothing); Enter → first annotated child.
- A JSX element rendered several times (`.map`) highlights all instances (thin) and the clicked one (thick); the inspector
  says "Shared by N instances — edits change all".
- Clicking inside a playground panel also makes that panel active (`activePanel`), so its playground properties show.
- Outlines are drawn in a screen-space overlay (`position: absolute` over the canvas viewport) and follow pan/zoom,
  scrolling inside frames, resizes and HMR re-renders (rAF loop while visible, ResizeObserver/MutationObserver).
- After a source edit the page re-renders (HMR or a full reload): the selection is restored by its `src` (+instance).

Layers panel (left, tab "Layers"): the annotated tree of the current page, grouped by frame (Playground, Docs,
Examples…, Document), each node "Name" with a component/element icon and indentation; expand/collapse chevrons;
hover highlights on canvas; click selects and scrolls the canvas to it if off-screen. Large trees: render lazily
(expand on demand), never more than ~500 rows at once.

Nested instances (added 2026-10-03): a double-click on a selected component first selects the nested instance written in
the source under the cursor (the Avatar in a ListItem's leading, covered by the row's click target), editable; the
inspector also lists the booleans of those nested instances under Properties (`inspector/NestedProperties.tsx`).

Nested parts (added 2026-10-02, read-only): ⌘/Ctrl+click, or a double-click on a selected component with no nested
instance under the cursor, selects the internal part under the cursor (an internal Zen component such as SidebarItem or InputLabel, else the host element),
stored as `selection.part = { path, name }` with `src` = the annotated owner (`select/parts.ts`). The inspector's
PartPanel shows its props, text style, layout, size and colours with the matching tokens, and says which owner prop
drives it. Since 2026-10-09 (user: "nested Modal action phải cho phép tôi sửa button direction như trong Figma") a part's
props that its owner passes on unchanged are edited there, like Figma's exposed nested instance properties: ModalActions'
Direction writes the Dialog's or ModalForm's `actionsDirection` (Properties section, the part's Figma name when its
component has a Figma map). Which props: `tools/studio/part-props-build.mjs` reads the component sources into
`inspector/partProps.generated.ts` (owner → part → part prop → owner prop), composed through the components between
them (`inspector/partForwarding.ts`). Everything else on a part stays read-only. Layers lists them lazily under a "Parts" folder. Docs scaffolding
(ComponentPreview, PlaygroundControls…, ExampleCard, ExamplePage) is transparent: never a layer or a selection.

Undo safety (added 2026-10-02): records are context hunks (`history.ts`): 2–12 unique lines above and below each
change. When the file still has the recorded hash, a hunk applies at its offset; otherwise only where its context is
unique, never on a look-alike; else the record is dropped with a status. Tests: `node src/platform/studio/history.selftest.mjs`.

## 6. Inspector (right)

Tabs **Design** | **Code** (Zen `Tabs`, small).

**Nothing selected:** Page section (title, description), *Preview modes* (Theme, Component Theme incl. Neutral-S5/S6/S7,
Component Size, Typography, Corner Radius, Emphasis — Zen `SelectField` rows, the same list as the classic topbar
`shellControlDefinitions`), Frames list (click to select/zoom).

**A frame selected:** name, kind, width preset (Segmented or Select), theme, Present button, and for examples its
description and Copy code.

**A node selected (Design):**
1. Header: component name, `file:line` link (opens Code tab at that line), instance note, a role note for viewers
   ("View only — switch to Admin to edit").
2. **Playground properties** (only when the node is inside the active playground panel): the portal target
   (`bridge.controlsSlot`) — the playground's own controls, restyled as inspector rows (label left 96px, control right).
3. **Properties**: generated from `src/platform/api.generated.json` (`{ [pageSlug]: [{ name, extends, props: [{ name,
   type, required, default, description, deprecated }] }] }`) by component name. Skip deprecated props, `children`,
   function props (`on*`), `className`, `style`, `ref`, `key`. Editors by type:
   - string-literal union → `Segmented` (≤ 4 short options) or `SelectField`;
   - `boolean` → `ToggleButton`/`Toggle`;
   - `string` → `InputField` (commit on Enter/blur), `number` → `NumberField`;
   - `ZenScaleInput` and spacing props → select of `none, 2xs, xs, sm, md, lg, xl, 2xl, 3xl, 4xl` (as the type allows);
   - `keyof typeof typographyStyles` / `TypographyStyleName` → text-style select grouped by family (keys of
     `typographyStyles`);
   - `IconName | ReactNode` → icon picker (Search + list of names from `src/icons/generated` names export) writing the
     name string;
   - anything else (objects, ReactNode, functions) → read-only "{…}" chip with the source expression.
   The current value comes from the source (`GET /element`): a literal shows as the value; an expression (e.g.
   `level={level}` in a playground) shows as "Bound to {level}" read-only with a hint that the playground property
   controls it; an unset prop shows its default dimmed.
4. **Layout** (Stack, Grid, Box, Container, Form…): direction (Segmented with icons), gap (scale select), align and justify
   (a 3×3 alignment grid like Figma's, mapped to align/justify), wrap, padding/paddingX/paddingY. These are the same props
   as in Properties, grouped here instead.
5. **Text** (every element that renders text): `Text`/`Heading`: textStyle, tone, align, as/level; host text elements
   (p, span, label, li, h1–h6…, or a div/td with direct text): a grouped Text style picker that adds, swaps or removes a
   `typographyStyles["…"]` class (ops `setTextStyle` / `setTypography`; the import is added when missing), showing the
   inherited style when none is set; Zen components whose text comes from their own props (Button, Chip, Badge,
   ListItem…): read-only "Text style comes from <Component> · size …" with a jump to that prop.

On the canvas (Figma-like, added 2026-10-03): the gap and padding areas of a selected Stack/Grid/Box/Form/FormFieldset/
FormActions/Card are hit areas: hover shows a label ("gap · md · 16"), click opens the spacing scale right there
(`select/SpacingLayer.tsx`, `select/spacing.ts`); left/right → paddingX, top/bottom → paddingY, Alt → padding;
bound values are read-only; host elements show their spacing read-only.
6. **Content**: each text child (`SourceChild kind text`) as an InputField/TextArea (op `setText`).
Every change: `POST /__zen-studio/edit` with `{ file, loc, name, ops }` and header `x-zen-studio-role: admin`; push the
returned record to `state.undo` (clear `redo`), show a small toast-free status ("Saved to button.tsx:84 · ⌘Z to undo")
in the inspector footer. Viewer role: every control is disabled.

**Code tab:** the git-style code view of the selected node's file, scrolled to and highlighting the element's lines
(`startLine…endLine`), with the last edit's changed lines marked (+ added / − removed, unified-diff style). Above it,
for a playground panel: "Snippet" (the playground's live code, portal `bridge.codeSlot` → `bridge.renderCode`); for an
example frame: its `code` string. Header: file path, line range, Copy, "Open in VS Code" (`vscode://file/<root>/<file>:<line>`,
root from `GET /ping`), wrap toggle.

## 6b. Detach component (added 2026-10-03, user decisions)

Like Figma's Detach instance: the selected instance of a PRESENTATIONAL component (Card, ListItem, MetricCard, Metric,
EmptyState, DescriptionList, InlineMessage, Badge, Tag) is rewritten in the source as Zen primitives (Box/Stack/Grid/
Text/Heading with token props, Zen atoms such as Icon, Avatar, DockIcon, Button kept as leaves), so the spacing and
text-style editors can change it. Interactive instances (onClick/href/selected, removable, onClose) and interactive
components are refused with a reason. The output is marked `zen-detached: <Component> · Zen Studio` and checked by the
normal harness. One edit = one undo record (⌘Z restores the component exactly). Inside a `.map` only the selected row
is detached: `(index as number) === K ? (detached) : (original)`, keeping the row's data expressions; nested maps and
lists that repeat in several places are refused. UI: Inspector "Detach" button, ⌥⌘B, canvas context menu; the client
measures the instance (token keys) and the server recipe (tools/studio/detach.mjs) writes the code; approximations
(e.g. Box has no shadow) are listed in the status. API: `GET /__zen-studio/detach-plan?file&loc&name&instances=N`,
`POST /edit` op `detach { measured, instance }` → `detached { component, loc, approximations }`.

## 7. Code view (git-like)

`CodeView({ code | file, language: "tsx"|"ts"|"css"|"json"|"bash", highlight?: [from,to], changes?: {added: number[],
removed: Array<{after: number, lines: string[]}>}, startLine?, maxHeight? })`:
- Always dark (wrap in `data-theme="dark"`), monospace (the token family the classic `.platform-code` uses).
- The header always names the language with a Badge (xs, neutral subtle, no dot): "React · TSX", "TypeScript", "CSS",
  "JSON", "Shell"; it follows the title (file path) or stands alone in a snippet (2026-10-04, user).
- Gutter with right-aligned line numbers (not selectable), sticky while scrolling sideways; highlighted range with an
  accent-subtle row tint and a 2px accent bar in the gutter; added lines Positive subtle tint + "+", removed lines
  Negative subtle tint + "−" with their old text.
- Full syntax colours for TSX/TS: comments, strings, template literals (and `${}`), numbers, keywords, booleans/null,
  JSX tag names (components vs host tags in different colours), JSX attribute names, punctuation, types
  (capitalised identifiers in type positions), function calls, object keys; CSS: selectors, properties, values,
  `var(--…)`, at-rules; JSON keys/values. Colours from Content tokens (Accent, Info, Positive, Negative, Warning,
  Support…) resolved in dark mode; follow the content-colour roles (Base/Strongest for text).
- Large files: render only the visible window (virtualised rows, fixed row height) or ±80 lines around the highlight
  with "Show all N lines".
- Copy button (copies the whole snippet or the highlighted range when a range is set).
The classic `PlatformCode` is untouched; inside the Studio, `bridge.renderCode(code)` renders `CodeView` (tsx).

## 8. Dev-server API (`tools/studio/vite-plugin-zen-studio.mjs`, `apply: "serve"`)

Plugin `zenStudio()` = two parts:
1. **Annotate** (`enforce: "pre"`, transform): files under `src/platform/**/*.tsx` (except `src/platform/studio/**`,
   `PlatformApp.tsx`, `PlatformTemplate.tsx`, `PlatformCode.tsx`, `PlatformFullScreen.tsx`, `PlatformPhone.tsx`,
   `PlatformReference.tsx`, `PlatformGuidelines.tsx`) and `src/templates/**/*.tsx`; never ids with a `?` query
   (`?raw`). Parse with `@babel/parser` (`jsx`, `typescript`); for each JSX opening element except fragments
   (`<>`, `Fragment`, `React.Fragment`) insert ` data-zen-src="<rel>:<line>:<col>"` right after the tag name with
   `magic-string` (keep the source map). Skip when `process.env.VITEST`.
2. **Endpoints** (`configureServer` middleware, JSON):
   - `GET /__zen-studio/ping` → `PingResponse`.
   - `GET /__zen-studio/source?file=<rel>` → `SourceFile` (only files under `src/`).
   - `GET /__zen-studio/element?file=<rel>&loc=<line:col>` → `SourceElement` (404 `not-found`).
   - `POST /__zen-studio/edit` `EditRequest` → `EditResponse`. Rules: header role must be `admin` (403 forbidden);
     file must be an annotated file; the element at `loc` must have name `name` (409 `stale` otherwise); if `hash` is
     given and differs, 409 `stale`. Ops: `setProp` replaces an existing attribute or appends one after the last
     attribute, matching the element's formatting (own line + same indent when attributes are one per line, else a
     space); strings → `name="v"` (or `name={"v"}` when it has `"`, `\`, `{`, `}` or a newline), true → shorthand
     `name`, false → `name={false}`, numbers → `name={n}`, expressions → `name={code}`. `removeProp` removes the
     attribute and its whitespace (a whole line when it sits alone). `setText` replaces the trimmed text of a JSXText
     child, keeping its surrounding whitespace; text with `{ } < >` becomes `{"…"}`. `setTypography` swaps the string
     literal key inside `typographyStyles[...]` within the className attribute. Apply ops back to front, write the
     file atomically (write temp + rename), return before/after content and the changed line range.
   - `POST /__zen-studio/write` `WriteRequest` → `WriteResponse` (undo/redo; refuses when the current hash differs).
   - Hash = sha1 hex of the file content.
- `tools/studio/jsx-source.mjs` holds the pure functions (parse, locate by loc, describe, apply ops) so
  `tools/studio/selftest.mjs` (`node tools/studio/selftest.mjs`) can test them without a server.
- `tools/studio/vite-plugin-zen-studio.d.mts` declares `export function zenStudio(): import("vite").Plugin[]` for tsc.

## 9. Roles

`state.role` (default `admin`), switched in the toolbar's account menu (Admin — can edit source · Viewer — view only).
Viewers can select and inspect, never edit (controls disabled, write calls never sent). Editing also needs the dev server
(`import.meta.env.DEV` and `GET /ping` ok); in a static build the Studio is read-only and says so in the inspector.

## 9b. Drafts and Save (added 2026-10-03, user decisions)

- "Vai trò admin sẽ cho phép Save bản vừa edit lại": edits are **drafts** on the dev server until Save (only admins
  edit, save or discard; viewers see that drafts are shown). Drafts survive a server restart and follow disk changes
  (rebased on top; a collision stays stale). Plugin details: `tools/studio/README.md` §4.
- "Phần save/discard nên nằm ngay frame chứa example đó. Phần trên header nên là Save All": a frame with unsaved
  changes shows "● N changes · Discard · Save" at its toolbar's right end and a dot after its name; Save/Discard there
  cover only that frame's changes (`tools/studio/frame-scope.mjs`). The toolbar shows "● Unsaved · N files ▾" (the
  file list, Discard per file, Discard all, a note on changes outside this page's frames) and **Save all** (⌘S). Save
  all and Discard all act on the files they listed. Save runs style-guard + usage-guard on what it wrote.

## 10. Done means

- `npx tsc --noEmit -p .` clean; `node tools/style-guard/check-styles.mjs` and `node tools/usage-guard/check-usage.mjs`
  clean on the studio files; `node tools/studio/selftest.mjs` passes.
- On 5180: every page renders on the canvas; pan/zoom/fit work; Select picks nested elements in playgrounds and
  examples; editing a Button `level` in an example file changes the file and the canvas; undo restores it; the code view
  shows line numbers, colours and the changed lines; Present opens desktop examples full screen; Interact uses examples
  normally; light and dark chrome; 1440 and 1024 widths.
- Classic UI at `?ui=classic` unchanged.
