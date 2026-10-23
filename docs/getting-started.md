# Getting started with Zen DS

How to install `@zen-ds/react` in a React app and set it up correctly. AI agents: read
[`AGENTS.consumer.md`](../AGENTS.consumer.md) first; this page is the detail behind it.

## Install

`@zen-ds/react` is a licensed package. It is served only by the Zen registry, `https://npm.dizai.studio/`, to
companies with an active licence; it is not on the public npm registry. Before the first install, point the `@zen-ds`
scope at the registry (once per project) and sign in with your Zen account (once per developer).

**Seats.** A licence has a number of seats: its owner and the team members the owner adds in the Zen account, oldest
first. Each developer signs in as themselves and needs a seat. CI does not take a seat: it signs in with the licence
key (see CI below).

### 1. Point the `@zen-ds` scope at the registry (once per project)

Add this line to the `.npmrc` in your app's root folder and commit it, so teammates and CI use it too:

```ini
@zen-ds:registry=https://npm.dizai.studio/
```

Only `@zen-ds/*` packages come from the Zen registry; everything else still comes from your usual registry. Without
this line npm finds an old public `@zen-ds/react` (0.1.0) on npmjs.com and installs that instead.

### 2. Sign in with your Zen account (once per developer)

```bash
npm login --registry=https://npm.dizai.studio/ --scope=@zen-ds
```

npm prints a sign-in link and opens it in your browser (press Enter if it asks). Sign in with Google, using the Google
account of the Zen account your licence owner added to the team (Google is the only way in). npm then prints
`Logged in to scope @zen-ds on https://npm.dizai.studio/`. The link works once, for 10 minutes.

npm stores a token in your user `~/.npmrc` (not the project's), valid for 365 days. The registry re-checks it on every
request: it stops working when the subscription ends or the owner removes you from the team. Run `npm login` again
after renewing, or once a year.

### 3. Install

```bash
npm install @zen-ds/react react@^19 react-dom@^19
```

With pnpm, the same `.npmrc` and `npm login` work as they are. Yarn 2 or later ignores `.npmrc`: put the scope in
the project's `.yarnrc.yml`, sign in once with `npm login` as in step 2, and copy the token from your `~/.npmrc`
(the `//npm.dizai.studio/:_authToken=…` line) into your user `~/.yarnrc.yml`, never the project's:

```yaml
# .yarnrc.yml in the project
npmScopes:
  zen-ds:
    npmRegistryServer: "https://npm.dizai.studio/"
```

```yaml
# ~/.yarnrc.yml (yours only)
npmScopes:
  zen-ds:
    npmAuthToken: "<the token>"
```

Peer dependencies: `react` and `react-dom` 19. The package is ES modules with TypeScript declarations. Every
component file starts with `"use client"`, so React Server Component frameworks import it from client components.

### CI and Docker builds

CI signs in with the **licence key**: the ID of your company's licence, as shown with the licence in your Zen account
(15 lowercase letters and digits). Treat it like a password: never commit it, never paste it into an issue or a chat.
Get a CI token once, on your machine, into a throwaway config so it does not replace your own sign-in:

```bash
npm login --registry=https://npm.dizai.studio/ --scope=@zen-ds --auth-type=legacy --userconfig=./ci-token.npmrc
#   Username: a name for this CI (e.g. github-actions)   Password: the licence key   Email: anything
```

Copy the token from the `//npm.dizai.studio/:_authToken=…` line of `ci-token.npmrc` into a CI secret named
`ZEN_DS_NPM_TOKEN`, then delete the file. A licence has up to 3 CI tokens: getting a fourth retires the oldest, so
give each pipeline its own and replace one only when you mean to. (npm keeps a spinner turning at the password
prompt; it is waiting for you. Paste the key and press Enter.)

The CI job writes the token line into its own user `~/.npmrc` before installing. Do not put the token line in the project's `.npmrc`, not even as `${ZEN_DS_NPM_TOKEN}`: the project file
wins over each developer's own sign-in, and on a machine without the variable every install fails with `E401`
(`npx zen-ds doctor` flags it). In GitHub Actions:

```yaml
- run: echo "//npm.dizai.studio/:_authToken=${ZEN_DS_NPM_TOKEN}" >> ~/.npmrc
  env:
    ZEN_DS_NPM_TOKEN: ${{ secrets.ZEN_DS_NPM_TOKEN }}
- run: npm ci
```

In a Dockerfile, mount the token as a build secret rather than a build argument, so it does not end up in an image
layer:

```dockerfile
# syntax=docker/dockerfile:1
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=secret,id=zen_npm_token \
    echo "//npm.dizai.studio/:_authToken=$(cat /run/secrets/zen_npm_token)" > /root/.npmrc \
    && npm ci && rm /root/.npmrc
```

Build it with `docker build --secret id=zen_npm_token,env=ZEN_DS_NPM_TOKEN .`. Replace the token before it expires
after 365 days.

### When the install fails

| npm says | Why | What to do |
| --- | --- | --- |
| `every seat of your licence is taken` (in the browser, on `npm login`) | All seats are held by the owner and earlier team members | Ask the licence owner to remove someone or buy more seats |
| `sign in with Google: this account has no google sign-in linked` (in the browser) | Your Zen account was made with a password or email code | Sign in to your Zen account once with Google (same email), then `npm login` again |
| `this account has no Zen DS licence` (in the browser) | You signed in with an account that is not on the team | Sign in with the account the owner added, or ask them to add you |
| `E401` … `invalid or inactive licence key` (on `npm login --auth-type=legacy`) | Wrong key, or the licence is not active | Copy the key again from your Zen account; check that the subscription is active |
| `E401` `Unable to authenticate, your authentication token seems to be invalid` | Not signed in on this machine, the token is over 365 days old, the CI token is missing, or the project's `.npmrc` has an `_authToken` line | Step 2 again, or set `ZEN_DS_NPM_TOKEN`; remove any token line from the project's `.npmrc` |
| `E403` … `license is not active` | The subscription ended or was suspended | Renew it; the old token works again within 5 minutes |
| `E403` … `no longer a member of this licence` | The owner removed you from the team | Ask the owner to add you again, then step 2 |
| `E403` … `CI token was replaced by a newer one` | A fourth CI token was made for the licence | Get a new CI token (CI above) and update `ZEN_DS_NPM_TOKEN` |
| `E403` … `token is from an older sign-in` | A token from before personal sign-in (October 2026) | Step 2 again (CI: get a new CI token) |
| `E404` for `@zen-ds/…` on registry.npmjs.org, or version `0.1.0` installed | The `.npmrc` scope line is missing | Step 1, then `npm install @zen-ds/react@latest` |
| `E503` … `license service unavailable` | The licence service is briefly unreachable | Try again in a few minutes |

Your licence terms are in `LICENSE.md`, which ships with the package. Questions: zen.tool@dizai.studio.

## Entry points

| Import | What it is |
| --- | --- |
| `@zen-ds/react` | Components, hooks, `typographyStyles`, `IconName`, `preloadIcons` |
| `@zen-ds/react/styles.css` | Import once: Inter font, tokens, text styles, effects, all component CSS (or the style entries below) |
| `@zen-ds/react/styles/<Component>` | Instead of `styles.css`: only the CSS one component needs, e.g. `@zen-ds/react/styles/Dialog` (see "Load only the CSS you use") |
| `@zen-ds/react/styles/base.css` | The shared base alone: Inter font, tokens, text styles, effects (pages that use the tokens without components) |
| `@zen-ds/react/reset.css` | Optional page reset (margins, box-sizing, Canvas background, Figma-matching text rendering) |
| `@zen-ds/react/tokens` | Typed map of every Figma variable: `tokens["Color/Background/Surface/Default"]` |
| `@zen-ds/react/icons/names` | `iconNames` (all 1,598) and the `IconName` type, without SVG data |
| `@zen-ds/react/icons/all` | Registers every icon up front (docs, icon pickers). Apps usually skip it |

## Load only the CSS you use

`styles.css` holds every component. An app that renders a few of them can import their style entries instead, one per
component, named as you import it from `@zen-ds/react`:

```tsx
// src/main.tsx, instead of import "@zen-ds/react/styles.css"
import "@zen-ds/react/styles/Button";
import "@zen-ds/react/styles/Dialog";
import "@zen-ds/react/styles/InputField";
```

- Each entry loads the shared base (font, tokens, text styles, effects), the CSS of `ZenProvider` (every app renders
  it), and the CSS of its component and of every component it renders (Dialog brings Button's). The bundler loads each file once, however many entries name it.
- A Button-only app loads 34 KB of CSS (gzip) instead of 96 KB; most of what is left is the tokens
  (`npm run verify:package` measures both).
- Use either `styles.css` or entries, not both. Add an entry when you start rendering a new component;
  `npx zen-ds doctor` names every component you import from `@zen-ds/react` whose CSS no entry loads.
- Keep `styles.css` when the app renders components it never imports by name (AI UI, a CMS choosing components at
  runtime).
- Entries are CSS imported from JavaScript, so they need a bundler that loads CSS (Vite, webpack, Next.js), as
  `styles.css` does. The components' own JavaScript imports no CSS, so server rendering and tests are unchanged.

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

- Page frame: `AppShell` (a `pattern` from Figma Pattern/AppShell: the Sidebar with its rail toggle, `header={<AppShellHeader leading actions main={<PageHeader …/>} />}`
  sticky above the Body, panes; under 1024px the phone pattern with `topNavigation` + `bottomNavigation`, or the drawer) around the page content (the Body pads it).
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
| `npx zen-ds init` | Adds the `@zen-ds` registry line to `.npmrc`, the Zen section to AGENTS.md (and `@AGENTS.md` to CLAUDE.md) and registers the `zen-ds` MCP server in `.mcp.json`. Idempotent. |
| `npx zen-ds doctor` | Checks the setup: dependency, React 19, `styles.css` import, `ZenProvider`, no deep imports, optional AI/ESLint wiring. |
| `npx zen-usage [paths]` | The usage harness: every Zen component your files import, against the Do/Don't rules (unknown icon names, missing labels, vague button text, wrong levels…). `--json` for tools; `--css` also checks your stylesheets (`npx zen-ds check` runs it with `--css`). |
| `@zen-ds/react/eslint` | The same rules in the editor: `export default [...config, zen.configs.recommended]` (`zen.configs.standalone` without a JSX parser). |
| `zen-ds-mcp` | MCP server: `get_setup`, `list_components`, `get_component`, `search_icons`, `get_tokens`, `list_templates`, `get_template`, `check_usage`, and `map_figma_component` (Figma component name + variant properties → Zen JSX, checked by the harness; a local stand-in for Figma Code Connect, which needs a Figma Organization plan). |

## Fonts

- `styles.css` (and `styles/base.css`) loads Inter (variable, normal + italic, WOFF2: about 360 + 400 KB) from `./fonts/` inside the package;
  the bundler copies the files, and a page only downloads the italic file when it shows italic text.
- Code text uses the Dev font-family token (JetBrains Mono). Load that font yourself if you show code.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| No styles at all | `import "@zen-ds/react/styles.css"` once, in the app entry |
| One component unstyled with style entries | Import its entry, `import "@zen-ds/react/styles/<Component>"`; `npx zen-ds doctor` lists the missing ones |
| Dialog/Toast/Tooltip light inside a dark region | Render them inside the region's `ZenProvider` (its portal keeps the modes) |
| Page background stays light in dark mode | Use `reset.css`, or keep the outermost `ZenProvider` painting (`paint` default on) |
| An icon is blank | Check the name (TypeScript lists the valid ones); `npx zen-usage` and the dev-mode warning suggest the closest names |
| Built-in labels are English in a Vietnamese app | Set `locale="vi"` on the root `ZenProvider` |
| A Popover never shows | Popovers are closed by default: pass `open` and `onOpenChange` |
