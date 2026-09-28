# Zen Design System — guide for AI agents building apps

You are writing UI with `@zen/design-system` (React 19, TypeScript). Read this file first; it is short on purpose.
Everything it points to ships inside the package: `node_modules/@zen/design-system/…`.

## 1. Set up once

```tsx
// src/main.tsx
import { createRoot } from "react-dom/client";
import "@zen/design-system/styles.css"; // tokens, text styles, Inter font and every component
import "@zen/design-system/reset.css"; // optional page reset for a new app
import { ZenProvider } from "@zen/design-system";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <ZenProvider theme="system">
    <App />
  </ZenProvider>,
);
```

- `ZenProvider` sets the token modes, paints the page Canvas and hosts the overlay portal. Phone apps:
  `<ZenProvider typography="mobile" density="comfortable">`. Every mode and value: `docs/getting-started.md`.
- Language: `<ZenProvider locale="vi">` translates every built-in label (Close, Next page, "3 results", toolbar and
  screen-reader names) and date formats; built in: `en`, `vi`. Override single strings with
  `labels={{ close: "…" }}`; a component prop (`closeLabel`, `placeholder`, `aria-label`) still wins.
- Once per app: `npx zen-ds init` adds this guide to your AGENTS.md / CLAUDE.md and registers the `zen-ds` MCP server
  in `.mcp.json`; `npx zen-ds doctor` checks the setup (styles import, ZenProvider, React 19).
- Never set `data-theme` / `data-density` or the page background yourself, and never hard-code dark colours.
- Dialog, SidePanel, BottomSheet, Toast, Tooltip and Popover render into the provider's portal automatically.

## 2. Pick the component before writing JSX

0. With the MCP server connected (`zen-ds`, see `npx zen-ds init`): `list_components` (pick), `get_component`
   (props, types, Do/Don't), `search_icons`, `get_tokens`, `get_template`, `check_usage`, and `map_figma_component`
   (a Figma instance's name + properties → Zen JSX) — faster than reading files.
1. `docs/guidelines/index.json` — every component: `purpose`, `use`, `avoid` (choose by these), `import`, compact
   `props` (`size?: sm|md|lg = md`), `do`, `dont`, harness `rules`.
2. `docs/guidelines/<slug>.md` — the full page: Do/Don't, **Props** tables, object **Types**, keyboard, accessibility.
3. `docs/api/<slug>.json` — the same props as JSON (type, required, default, description, deprecated).

`index.json` is large (~180 KB): query one component instead of reading it whole, or scan `llms.txt` (every component
with its purpose, 13 KB) first.

```bash
node -e 'const { components } = require("./node_modules/@zen/design-system/docs/guidelines/index.json"); console.log(JSON.stringify(components.find((c) => c.slug === process.argv[1]), null, 1))' table
```

Props are strict literal unions: let TypeScript autocomplete values instead of guessing names from other libraries.

## 3. Rules that go wrong most often

1. **Buttons:** one `level="primary"` per surface (the main action); `tertiary` for everything else; `secondary` is
   rare; `accent` only for a promoted action; `danger` for irreversible ones. Labels name the outcome
   ("Save changes"), never "OK" / "Submit".
2. **Filters, sort, scope, status and owner pickers** are `<Chip variant="advanced">`, never a Button or Segmented.
3. **Fields** always have a `label`; they have `readOnly`, not `disabled` (Search has no disabled state either);
   `placeholder` shows an example value, not the label; errors go in `error`.
4. **Icon-only actions** are `<IconButton aria-label="Add member" icon="icon-plus-line" />` (the name shows as a
   tooltip). Never `<button><Icon /></button>`.
5. **Compose, don't rebuild:** rows → `List` + `ListItem`; tiles → `Card`; data → `Table`; nothing to show →
   `EmptyState`; inline feedback → `InlineMessage`; page-level notice → `AlertBanner`; separators → `Divider`;
   counts → `BadgeCounter`; files → `FileIcon`; term → value facts and totals → `DescriptionList`; pictures →
   `Image` / `Thumbnail`; a phone footer CTA → `ActionBar`; screen-reader-only text → `VisuallyHidden`.
6. **Overlays are controlled:** `open` + `onOpenChange` on Dialog, SidePanel, BottomSheet and Popover (the first
   three also call `onClose` on every close request). A Popover is closed by default. Actions are objects:
   `primaryAction={{ label: "Delete project", onClick }}`.
7. **Background layers:** the page is Canvas (ZenProvider paints it); cards and panels are Surface; modals and
   sheets are Container; floating menus are Popover. Components never paint Canvas.
8. **Borders:** a closed box that is clickable uses `--zen-color-border-neutral-subtle-default`, a static box
   `--zen-color-border-neutral-pale-default`; dashed lines are at least Subtle.
9. **Text colour** comes from tokens: `--zen-color-content-neutral-strongest` (primary text), `-base`
   (secondary), `-light` (tertiary). No hex values.
10. **Copy and counts:** pluralise ("1 file", "3 files"); Toggle labels name the setting; Toast titles ≤ 60
    characters and never a question; Tabs hold 2–7 items, Segmented 2–5; no Pagination under 3 pages.
11. **Structure:** no Dialog inside a Dialog, no Accordion inside an Accordion, no Tooltip on a disabled control.
12. **Mobile:** Back is `icon-chevron-left-line-medium` (never an arrow); on an icon-only TopNavigation Back the
    label is "Back", while PageHeader's visible Back names the destination ("Invoices"); footer CTAs go in an `ActionBar` (Large,
    full width, Primary on top, clears the home indicator); filter chips sit in one horizontally scrolling row and
    open a `BottomSheet type="action"`.

## 4. API facts that save a round trip

| Component | Shape |
| --- | --- |
| Button | `level`, `size` (`2xs`…`xl`, default `md`), `appearance` (`main`/`flat`/`overlay`), `startIcon`/`endIcon`: an icon name (`"icon-plus-line"`) or a node |
| IconButton | `icon="icon-plus-line"` (a name, or any node such as `<Icon name size />`) + `aria-label`; default level `tertiary` |
| Icon | `name` (type `IconName`, autocompletes), `size` token (`2xs`…`3xl`, `base` = 20px) or px number, `title` when meaningful |
| Fields | `InputField`, `SelectField` (`options: { label, value }[]`), `TextAreaField`, `NumberField`, `DateField`, `AutocompleteField`, `RichTextField`: `label`, `helpText`, `error`, `readOnly` |
| Field values | `value` + `onValueChange={(value) => set(value)}` on `InputField`, `TextAreaField`, `SelectField`, `Search`, `NumberField` (`number \| null`) and `RichTextField` (`html, text`); the native `onChange(event)` also works on text fields. `DateField`: `onDateChange(date)`; `AutocompleteField`: `onChange(string[])`; `SelectField placeholder` shows until a value is picked |
| Value controls | `value` / `defaultValue` + `onValueChange(value)` on Tabs (`items: { id, label, icon? }[]`), Segmented (`options: { id, label }[]`, default `level="secondary"`), Rating, Slider, ColorSelector (the old `onChange` still works but is deprecated) |
| Checkbox / RadioButton / Toggle | `checked` / `defaultChecked` + `onCheckedChange(checked)`; Toggle and Checkbox need `label` (or `aria-label`) |
| Selected state | `selected` on Chip, Card, Tabs/Segmented items, List and Popover items (Chip `select` and Card `active` are deprecated aliases) |
| Dialog / SidePanel / BottomSheet | `open`, `onOpenChange`, `title`, `primaryAction`, `secondaryAction` |
| Table | `columns: { id, header, cell: (row) => node, sortable?, align? }[]`, `rows`, `getRowId`, `sort` + `onSortChange`, `empty` |
| Pagination | `page` + `onPageChange` + `pageCount` (default numbered theme); with `theme="inline"` or `"manually"`: `total` + `pageSize` (+ `onPageSizeChange`) and a range label |
| List / ListItem | `<List><ListItem title caption leading trailing onClick or href /></List>`. Rows line up with padded containers by themselves (Card, Dialog, SidePanel, a `Stack`/`Box` with `padding`); on a bare page they keep the page margin |
| EmptyState | `title`, children (the caption), `icon`; `primaryAction={{ label, onClick }}` is the next step (Primary); a way out such as "Clear filters" is `secondaryAction` alone (Tertiary); `illustration={false}` inside tables and cards |
| Sidebar | `sections: { label?, items: { id, label, icon, active? }[] }[]`, `onItemClick`, `logo`, `productName` |
| Toast | `const { toast } = useToast(); toast({ title: "Invite sent", action? })` (ZenProvider hosts the stack). Neutral for everyday confirmations (sent, saved, copied); `type: "positive"` only when success is the news (a payment went through); keep the title ≤ 60 characters and put details in `children` |
| Filter chip | `<Chip variant="advanced" dropdown selectionMode="multiple" selected={picked.length > 0} selectionCount={picked.length} popoverMultiple popoverItems={options.map((o) => ({ ...o, selected: picked.includes(o.id) }))} onPopoverSelect={(item) => toggle(item.id)} onClearSelection={() => setPicked([])}>Status</Chip>` (single choice: drop `selectionMode`/`popoverMultiple`, mark one item `selected`). Toolbar: Search fills its container, so give it a Grid column: `<Grid columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }} align="center"><Search …/><Stack direction="row" gap="xs" wrap>{chips}</Stack></Grid>` |
| Layout | `Stack` (`direction`, `gap`, `align`, `justify`, `wrap`), `Grid` (`columns` as a count, a track list like `"2fr 1fr"` for main + aside, or `{ mobile, tablet, desktop }`; `minColumnWidth`), `Box` (`padding`, `surface`, `border`, `radius`), `Container` (`maxWidth`). Spacing values: `2xs` 4 · `xs` 8 · `sm` 12 · `md` 16 · `lg` 24 · `xl` 32 |
| Text | `<Heading level={1} textStyle="Heading/3">` (a real h1–h6), `<Text tone="base" textStyle="Body/Small/Regular">` (default `p`; `as="span"` inline); `truncate`; `plural(n, "file")` |
| Page frame | `<AppShell sidebar={<Sidebar …/>} header={<Search …/>} headerActions={<IconButton …/>}>` (a drawer below 1024px) + `<Container><PageHeader title description actions breadcrumbs back tabs /></Container>`. PageHeader has no outer margin: `<Container><Stack gap="lg" paddingY="lg"><PageHeader …/>…</Stack></Container>`, as in the templates |
| Forms | `const form = useFormState({ initialValues, validate, onSubmit })`, then `<Form form={form}>` with `<InputField label="Email" {...form.field("email")} />`, `{...form.selectField("role")}`, `{...form.checkboxField("terms")}`; `<FormActions><Button level="tertiary">Cancel</Button><Button level="primary" type="submit">Save changes</Button></FormActions>`; in a ModalForm pass `onSubmit={form.handleSubmit}`. Let TypeScript infer the values from `initialValues`; if you name them, use a `type` alias (an `interface` turns the field names into `never`) |
| Row / object actions | `<Menu trigger={<IconButton appearance="flat" level="primary" aria-label="Actions for Ava" icon="icon-dots-horizontal-line" />} align="end" items={[{ id, label, icon, onSelect }, { type: "separator" }, { id, label, danger: true, onSelect }]} />` (actions only; values are picked with SelectField or a filter Chip) |
| Links | `<Link href="/billing">Billing settings</Link>`; `external` for other sites; `as={RouterLink} to="/x"` for your router; Sidebar items take `href` and the Sidebar `selectedId` |
| Facts and totals | `<DescriptionList items={[{ term: "Subtotal", description: "$176.00" }, { term: "Total", description: "$190.08", emphasis: true }]} />` (a real `dl`; `layout="stacked"` for long values; one `emphasis` row; row `action`) |
| Footer actions | `<ActionBar primaryAction={{ label: "Add to cart", onClick }} secondaryAction={{ label: "Save for later", onClick }} />`: sticky, Large and full width on phones (Primary on top); `direction="horizontal"` + `summary` on desktop edit pages |
| Pictures | `<Image src alt ratio="16:9" />` (keeps its frame while loading, placeholder on error); `<Thumbnail src alt="" size="md" />` in list rows; people use `Avatar` |
| Screen-reader text | `<VisuallyHidden>Actions</VisuallyHidden>` for icon-only headers and context; `<VisuallyHidden role="status">` for announcements |

Every `size` prop takes the short scale (`2xs` `xs` `sm` `md` `lg` `xl`) **or** the Figma spelling (`xsmall` `small`
`medium` `large` `xlarge`); both render the same, and the docs list the short one first. Each component supports its
own subset (Tabs: `sm`/`md`; Avatar: `2xs`…`3xl`), so check its props. Icon is the exception: its scale has `base`
(20px) between `sm` and `md`.

## 5. Templates

Complete, type-checked screens built only from Zen components live in `src/templates/` (shipped in the package):
AdminListTemplate (list + filters + table + invite form), DetailTemplate (invoice: PageHeader with Back and tabs, main +
aside, totals, payment form), DashboardTemplate, SettingsFormTemplate, SignInTemplate, MobileListTemplate (phone list +
filter sheets), MobileDetailTemplate (phone order: Stepper, Thumbnails, totals, ActionBar) and EmptyErrorTemplate.
Start a new screen by copying the closest one, then replace its sample data. They show the intended composition
(AppShell + Container + PageHeader + Stack/Grid) better than any rule.

## 6. Icons

- `import { Icon } from "@zen/design-system"`, then `<Icon name="icon-home-03-line" />`. Names follow the Figma layers,
  so they are not fully regular: `icon-home-03-line`, `icon-search-medium-line` (size before style),
  `icon-chevron-left-line-medium` (size after). The four that only come in sizes also take their plain name
  (`icon-search-line`, `icon-x-line` for close, `icon-chevron-left-line`, `icon-chevron-right-line`: the Medium cut).
  Otherwise never guess: search with the MCP `search_icons` tool or `iconNames`; `zen-usage` flags an unknown name
  and suggests the closest real ones.
- Icon props (IconButton `icon`, Button `startIcon`/`endIcon`, Tabs/Breadcrumbs/Sidebar item `icon`, EmptyState,
  Stepper, SidePanel…) take the name directly: `icon="icon-trash-line"`.
- List or search names without loading SVGs: `import { iconNames } from "@zen/design-system/icons/names"`.
- Icons used by Zen components draw immediately; others load on first use (an empty box for one frame).
  `preloadIcons(["icon-rocket-line"])` avoids that, and `import "@zen/design-system/icons/all"` registers all 1,598.

## 7. Layout, text and styling

- Build structure with components, not CSS: `AppShell` + `Container` + `PageHeader` for the page, `Stack` and `Grid`
  for arrangement, `Box` for plain panels, `Card` for clickable tiles, `Text` / `Heading` for copy (they reset margins
  and use the content colours). A new screen should need little or no custom CSS.
- If you must write CSS, use tokens only:
  - spacing: `var(--zen-spacing-gap-xsmall)` … `var(--zen-spacing-gap-2-xlarge)`, `var(--zen-spacing-padding-medium)`;
  - page margin and gutter (follow the breakpoint): `var(--zen-margin-comfortable)`, `var(--zen-gutter)`;
  - radius: `var(--zen-corner-radius-large)`;
  - colour: `var(--zen-color-background-surface-default)`, `var(--zen-color-content-neutral-base)`.
- Raw text styles exist as classes (`typographyStyles["Heading/2"]`), but prefer `Heading`/`Text`: raw `h1`/`p`
  elements keep the browser's default margins.
- Typed token names for CSS-in-JS: `import { tokens } from "@zen/design-system/tokens"`, e.g.
  `tokens["Spacing/Padding/Large"]` is `"var(--zen-spacing-padding-large)"`.

## 8. Check your work

- `tsc --noEmit` with `strict`; fix every error rather than casting to `any`.
- `npx zen-usage` (the usage harness; `--json` for tools) checks every Zen component your files import against the
  rules above; fix every ✗, and read each ⚠. The MCP `check_usage` tool does the same for one file's source.
  In the editor: `import zen from "@zen/design-system/eslint"` → `export default [...config, zen.configs.recommended]`.
  A deliberate exception gets a comment `zen-allow-<allow>: <reason>` right above the element.
- `npx zen-ds doctor` checks the setup once.
- Look at the result in the browser in both light and dark, and at 390px width for mobile screens.
