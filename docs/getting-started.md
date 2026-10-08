# Getting started with Zen DS

How to install `@zen-ds/react` in a React app and set it up correctly. AI agents: read
[`AGENTS.consumer.md`](../AGENTS.consumer.md) first; this page is the detail behind it.

## Install

The package is built locally for now (no registry yet). From the Zen DS repo:

```bash
npm run pack:local
```

That writes `dist-pack/zen-design-system-<version>.tgz`. In your app:

```bash
npm install /path/to/Zen-DS/dist-pack/zen-design-system-0.3.0.tgz
```

Peer dependencies: `react` and `react-dom` 19. The package is ES modules with TypeScript declarations. Every
component file starts with `"use client"`, so React Server Component frameworks import it from client components.

## Entry points

| Import | What it is |
| --- | --- |
| `@zen-ds/react` | Components, hooks, `typographyStyles`, `IconName`, `preloadIcons` |
| `@zen-ds/react/styles.css` | Required, import once: Inter font, tokens, text styles, effects, all component CSS |
| `@zen-ds/react/reset.css` | Optional page reset (margins, box-sizing, Canvas background, Figma-matching text rendering) |
| `@zen-ds/react/tokens` | Typed map of every Figma variable: `tokens["Color/Background/Surface/Default"]` |
| `@zen-ds/react/icons/names` | `iconNames` (all 1,598) and the `IconName` type, without SVG data |
| `@zen-ds/react/icons/all` | Registers every icon up front (docs, icon pickers). Apps usually skip it |

## The app root: `ZenProvider`

```tsx
import "@zen-ds/react/styles.css";
import "@zen-ds/react/reset.css";
import { ZenProvider } from "@zen-ds/react";

<ZenProvider theme="system">
  <App />
</ZenProvider>;
```

Zen's tokens are Figma variables with several **modes**. `ZenProvider` writes each mode as a `data-*` attribute that
`styles.css` reads. Unset props inherit: the page defaults are the first value in each row.

| Prop | Attribute | Values (default first) | When to change it |
| --- | --- | --- | --- |
| `theme` | `data-theme` | `light` · `dark` · `system` | `system` follows the OS; a toggle sets `light`/`dark` |
| `componentTheme` | `data-component-theme` | `neutral-s1` · `neutral-s2` · `neutral-s3` · `neutral-s4` · `neutral-s5` · `neutral-s6` · `neutral-s7` · `brand-s1` · `brand-s2` | Brand-coloured component styling; `neutral-s4` is `neutral-s1` with outlined inputs (Surface fill, Subtle border); `neutral-s5` fills inputs with Neutral/Subtle and no border; `neutral-s6` is `neutral-s4` with filled Tertiary buttons and Secondary chips; `neutral-s7` is `neutral-s5` with a Pale focused field |
| `density` | `data-density` | `compact` · `comfortable` | `comfortable` for touch-first or marketing layouts |
| `radius` | `data-radius` | `rounded` · `smooth` · `standard` · `luxury` | Corner-radius personality |
| `emphasis` | `data-emphasis` | `medium` · `strong` · `light` | Heavier (`strong`) or lighter (`light`) font weights and active strokes |
| `breakpoint` | `data-breakpoint` | `auto` (root) · `desktop` · `tablet` · `mobile` | `auto`: < 744px mobile, < 1024px tablet. Drives page margin, gutter, modal and card padding |
| `typography` | `data-typography` | `dashboard` · `popular` · `mobile` | `mobile` for phone apps, `popular` for marketing pages |
| `contrast` | `data-contrast` | `standard` · `high` · `system` | `high` (Global Colors mode Zen-High-Contrast) raises Subtle control borders to 3:1 and placeholders and Light text to 4.5:1, keeping every step-9 colour; `system` follows the OS Increase Contrast setting |
| `brand` | `data-brand` | `zen` | — |
| `locale` | `lang` | any BCP 47 tag | Sets the content language and the built-in labels: `en` and `vi` are built in, other tags fall back to English (see Language) |

Other props:

- `paint` (default `true`): Canvas background, primary text colour and the Zen font on the provider.
- `syncDocument`: also writes the modes on `<html>`, so `reset.css` paints the whole page and anything portalled to
  `<body>` follows them. It defaults to on for the outermost provider that paints.
- `portal` (default `true`): overlays opened inside render into the provider, so they keep its modes.
- `as`: the root element.

**Regions.** Nest a provider to switch part of the page, for example a dark hero:
`<ZenProvider theme="dark">…</ZenProvider>`. When a nested provider only changes typography or density inside a card,
pass `paint={false}` so it doesn't paint Canvas.

`useZen()` returns the resolved modes (for example to pick chart colours for dark mode).

**Toasts.** The outermost provider hosts the toast stack: `const { toast } = useToast(); toast({ title: "Invite sent" })`
(Neutral for everyday confirmations; `type: "positive"` when success is the news). `toastPlacement` moves the stack
(bottom-center by default).

## Building screens

- Page frame: `AppShell` (Sidebar with a rail toggle, a sticky top bar with `header` / `headerActions`, a drawer when the shell is under 1024px) around a
  `Container` whose first child is a `PageHeader`.
- Arrangement: `Stack` and `Grid` with the spacing scale (`gap="md"`, `columns={{ mobile: 1, desktop: 2 }}`, or
  `columns={{ mobile: 1, desktop: "2fr 1fr" }}` for a main column and an aside); `Box` for plain panels, `Card` for
  clickable tiles. Copy: `Heading` and `Text`.
- Forms: `useFormState` + `Form` + `FormActions`; custom controls go in `FormField`, groups in `FormFieldset`.
- Content: `DescriptionList` for facts and totals, `Image` / `Thumbnail` for pictures, `ActionBar` for a sticky footer
  of actions (the phone CTA), `VisuallyHidden` for screen-reader-only text.
- Templates: `src/templates/*.tsx` in the package are complete screens (admin list, detail page, dashboard, settings,
  sign-in, mobile list, mobile detail, empty and error states). Copy the closest one and replace its data.

## Dark mode

Use `theme="system"`, or keep the choice in state:

```tsx
const [theme, setTheme] = useState<"light" | "dark">("light");
<ZenProvider theme={theme}>
  <IconButton aria-label="Toggle dark mode" icon={<Icon name={theme === "dark" ? "icon-sun-line" : "icon-moon-01-line"} />}
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")} />
</ZenProvider>;
```

Every colour token has a dark value. Only use `var(--zen-color-…)` tokens in your CSS, never hex values.

## Mobile apps

- `<ZenProvider typography="mobile" density="comfortable">` (touch targets, mobile text scale).
- Use `TopNavigation`, `BottomNavigation` and `BottomSheet`. Back is `icon-chevron-left-line-medium`.
- Footer CTAs go in an `ActionBar`: `size="lg"` full-width buttons with Primary on top, above the home indicator.
- Padding respects `env(safe-area-inset-*)`.

## Icons

- `<Icon name="…" />` accepts any of the 1,598 names (the `IconName` type autocompletes).
- Icons that Zen components use draw synchronously. Every other icon is fetched from a small lazy bucket the first time
  it renders, and its box keeps the icon size meanwhile.
- `preloadIcons([...])` at start-up removes that first empty frame; `import "@zen-ds/react/icons/all"` bundles
  them all.
- `registerIcons({ "my-logo": { viewBox, content, colorMode: "monochrome" } })` adds your own SVGs.

## Language

- `<ZenProvider locale="vi">` sets `lang`, date formats (DatePicker months and weekdays) and every built-in label of
  every Zen component: close and dismiss buttons, pagination ("Trang sau", "3 kết quả"), search and pickers, the
  rich-text toolbar, chat and upload controls, screen-reader names. Built in: `en` (default) and `vi`; `vi-VN` uses `vi`.
- `labels={{ close: "Tắt" }}` overrides single strings; nested providers inherit the locale and stack overrides.
  Another language: pass every label (`import { zenLabels } from "@zen-ds/react"` shows the shape).
- A component's own prop (`closeLabel`, `placeholder`, `aria-label`, `searchPlaceholder`…) still wins for one-off
  wording. Your own copy (titles, button labels) is yours to translate.

## Tooling for editors and AI agents

| Tool | What it does |
| --- | --- |
| `npx zen-ds init` | Adds the Zen section to AGENTS.md (and `@AGENTS.md` to CLAUDE.md) and registers the `zen-ds` MCP server in `.mcp.json`. Idempotent. |
| `npx zen-ds doctor` | Checks the setup: dependency, React 19, `styles.css` import, `ZenProvider`, no deep imports, optional AI/ESLint wiring. |
| `npx zen-usage [paths]` | The usage harness: every Zen component your files import, against the Do/Don't rules (unknown icon names, missing labels, vague button text, wrong levels…). `--json` for tools; `--css` also checks your stylesheets. |
| `@zen-ds/react/eslint` | The same rules in the editor: `export default [...config, zen.configs.recommended]` (`zen.configs.standalone` without a JSX parser). |
| `zen-ds-mcp` | MCP server: `get_setup`, `list_components`, `get_component`, `search_icons`, `get_tokens`, `list_templates`, `get_template`, `check_usage`, and `map_figma_component` (Figma component name + variant properties → Zen JSX, checked by the harness; a local stand-in for Figma Code Connect, which needs a Figma Organization plan). |

## Fonts

- `styles.css` loads Inter (variable, normal + italic, WOFF2: about 360 + 400 KB) from `./fonts/` inside the package;
  the bundler copies the files, and a page only downloads the italic file when it shows italic text.
- Code text uses the Dev font-family token (JetBrains Mono). Load that font yourself if you show code.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| No styles at all | `import "@zen-ds/react/styles.css"` once, in the app entry |
| Dialog/Toast/Tooltip light inside a dark region | Render them inside the region's `ZenProvider` (its portal keeps the modes) |
| Page background stays light in dark mode | Use `reset.css`, or keep the outermost `ZenProvider` painting (`paint` default on) |
| An icon is blank | Check the name (TypeScript lists the valid ones); `npx zen-usage` and the dev-mode warning suggest the closest names |
| Built-in labels are English in a Vietnamese app | Set `locale="vi"` on the root `ZenProvider` |
| A Popover never shows | Popovers are closed by default: pass `open` and `onOpenChange` |
