---
name: zen-component-usage
description: Compose screens, examples or templates with Zen Design System components correctly, following each component's Do/Don't guidelines, Zen's design principles (colour pairing and balance, hierarchy, composition, responsive layouts) and passing the usage harness. Also defines the "definition of done" for new components (guidelines + harness rules). Use whenever writing JSX with Zen components, generating a UI with Zen, or finishing a new component.
---

# Zen component usage

Zen components have written usage rules. Follow them when you **use** components, and extend them when you **build** one.

The rules say what is wrong. To choose well among the options they leave open, use the design principles:
`references/design-principles.md` (colour pairing and balance, hierarchy, composition) and
`skills/zen-responsive-screens/references/responsive-principles.md` (responsive and adaptive layouts). They are
principles, not rules: no harness checks them, and the brief, a template or the designer may choose otherwise.

## When composing UI with Zen components

0. **Plan the screen before the JSX** (design-principles §0): its job, its mood (density and Typography mode), what
   must carry colour, the focal point, and how it changes across widths. Then build structure → spacing → type →
   colour → effects, in that order.
1. Read `docs/guidelines/index.json` (compact) or the relevant `docs/guidelines/<component>.md` before choosing a component. Check the "Use something else for" list first: picking the right component matters more than configuring it.
2. Apply the house rules that most often go wrong:
   - **Buttons:** Primary = the one main CTA; Tertiary for everything else; Secondary is rare (a justified highlight); Accent only for promoted CTAs; Danger for irreversible actions.
   - **Filters, sort, scope, status and owner pickers** are `Chip variant="advanced"`, never a Button or Segmented.
   - **List rows** (user rule 2026-10-24): a ListItem's `leading` is a `<DockIcon icon size="md" background="subtle" />`, an Avatar or a thumbnail, never a bare icon name (harness `list-item/leading-dock-icon`).
   - **Status and priority badges** (user rule 2026-10-24) keep a leading icon: priority leads with `leading="icon-flag-03-solid"` (Figma `.Task/Priority`), a status keeps its dot or an icon per state (never `leadingIcon={false}`), a workflow step is a `BadgeStatus`; a Table badge column gets its icons from a `cell` with `<Badge leading>` (on a Studio page: `overrides` `"Row[id]/col/Badge": { leadingIcon: true, leading }`) (harness `badge/status-priority-icon`, `table/badge-column-icon`).
   - **Priority palette** (user rule 2026-10-24): Urgent and High `red`, Medium `yellow`, Low `neutral`, each led by `icon-flag-03-solid`, on Badges and as PropertySelect tones negative / warning / neutral (harness `priority/palette`).
   - **Metric Dock Icons** (user rule 2026-10-24): a MetricCard's Dock Icon is `iconBackground="solid"` in the colour of what it counts — total `accent`, in progress `blue`, overdue `red`, done `green`; never Neutral Subtle on a status card (harness `metric/dock-icon-by-meaning`).
   - **Desktop header** (user rule 2026-10-24): an AppShellHeader's top row is never empty: Breadcrumbs or a Search on the left, a Search in the centre (≤ 400) when it helps, help, notifications (AppShellAction `count`) and the account Menu last on the right; a Main-only header uses `collapse="sidebar"` (harness `app-shell/top-row-filled`).
   - **Toolbar Search** (user rule 2026-10-24): a Search beside filters or buttons in one row is at most 240px wide: `<Box width="fill" maxWidth={240}>` around it, or a Grid column `minmax(0, 240px)`. Search is width 100%, so it otherwise stretches across the toolbar. A phone Search (`shape="rounded"`) fills its row; DashboardHeader's Control-Bar sizes its own (harness `search/toolbar-width`, audit kind `toolbar-search`).
   - **Inputs**: Read-only for a value to read or copy; Disabled (Text, Select, Date, Number, Text-Area, Search) only while something else blocks the field, with the reason in help text. Autocomplete and Rich-Text have no Disabled. Every field has a label.
   - **Background layers**: page = Canvas (`canvas-default`, or `canvas-alt` for a white page); cards on it = Surface (`surface-default`/`-alt`); top/bottom nav on a `canvas-flat` page = `surface-flat`; Modal/Bottom-Sheet = Container; floating overlays = Popover. Components never paint Canvas.
   - **Popover items** take `photoSrc` (the item sizes the avatar); captioned items use Avatar ≥ Small (32px).
   - **Container borders** (a stroke around a closed box): `Border/Neutral/Subtle` (+Hover/Pressed) when the box is actionable (buttons, chips, tags, fields incl. Read-only, clickable cards/tiles); `Border/Neutral/Pale` when it is static (panels, static cards, wells). A static box holding actionable children stays Pale. Lines that are not a closed container's border (dividers, separators, row rules, tree-lines) and strokes around avatars/photos/visuals/graphics are not covered: follow Figma. `Divider` defaults to Pale. Any **dashed** line or stroke steps up to `Border/Neutral/Subtle`. See `docs/component-usage-rules.md` §6.
   - **Content colours (text & icons)** share `Color/Content/*`. Neutral families (Neutral, Inverse, On-Black/White-Overlay): Strongest = Primary text, Base = Secondary, Light = Tertiary. Colour families (Accent, Info, Positive, Negative, Warning, Support/*): Strongest/Base for normal text on that colour's Subtle background; Light only for highlighted text or icons. Lights group (families referencing Sky, Mint, Yellow or Zen; today Accent, Warning, Support/Yellow): text is Base at most, never Light (Light only for icons). Text on Solid fills uses On-Colors/On-Brights. See `docs/component-usage-rules.md` §7.
   - **Copy and counts:** button labels name the outcome (never "OK"/"Submit"); Toggle labels name the setting, never "On"; Tabs 2–7, Segmented 2–5; no Pagination under 3 pages; Toast titles ≤ 60 characters and never a question; placeholders show an example, not the label.
   - **Icon-only actions** show their name as a tooltip after 1s of hover (at once on keyboard focus, never on touch). IconButton does it by default (`tooltip` defaults to `aria-label`); never hand-build `<button><Icon/></button>`, and use `useIconTooltip(label).bind()` for custom controls. See `docs/component-usage-rules.md` §12.
   - **Structure:** no Dialog inside a Dialog, no Accordion inside an Accordion, no tooltip on a disabled control or with interactive content.
   - **Forms in overlays** (user rule 2026-10-21): a Dialog is a notice or a quick confirm, with one field at most. A data-entry form of two or more fields is a `ModalForm` on desktop and tablet, its actions in a row (never `actionsDirection="vertical"`), and a `BottomSheet` on a phone. Keep a ModalForm's `side` column no taller than the form, so no empty band opens under the actions. Harness: `dialog/form-uses-modal-form`, `modal-form/actions-horizontal`, `modal-form/not-on-phone`.
   - **Component CSS:** colours only through `--zen-*` tokens (raw values only as `var()` fallbacks); removing a focus outline needs a replacement ring; every animation has a `prefers-reduced-motion` fallback.
3. To make a component look or behave differently, climb the ladder in `references/customize-in-code.md` (props → layout props → slots → composition → a prop on the owner → a new component from Zen parts); never fork or restyle one.
4. Run `npm run usage:check` and fix every ✗. Suppress a finding only when the rule truly does not apply, with a comment `zen-allow-<allow>: <reason>` directly above the element.

## When writing Platform examples or playgrounds

Examples are copied into products, so they must model correct usage. Follow `docs/guides/example-patterns.md`:

1. **Coverage matrix** per component: the primary real use case; states (empty, error, loading, disabled/read-only, success); composition with other DS components; edge cases (long text, many items, narrow width, 0/1 items); a mobile example in `PlatformPhone` (390px) for anything used on phones; keyboard/a11y. Check for duplicates before adding one; keep the richer example.
2. **Mobile patterns:** Back is the chevron `icon-chevron-left-line-medium`, never an arrow (harness `navigation/back-chevron`); footer CTAs are `lg` full width with Primary on top; filter chips sit in one horizontally scrolling row and open an Action `BottomSheet` (not a Popover); long reading content uses `BottomSheet size="max"` with vertical actions; chat threads anchor to the bottom with `margin-top:auto`; failures keep the content and offer Retry (`ChatMessage failed/onRetry`, AI: Negative `InlineMessage` + Try again); an empty chart shows `EmptyState illustration={false}` with the action that creates data. A page that runs on desktop and phones maps its desktop header to the phone's TopNavigation by `docs/component-usage-rules.md` §17 (skill `skills/zen-responsive-screens`).
3. **Copy:** counts use a plural helper (`plural(n, "item")`, harness `copy/plural-count`); labels name the outcome; real data, formatted values; the description matches what the example really does.
4. **Composition:** List/ListItem for rows (never `div` + Text + Badge), EmptyState, FileIcon + `fileIconFormatOf`, Chip advanced for filters, BadgeCounter for counts, token swatches in ColorSelector, `scale="quota"` for usage-against-limit bars, Icon sizes from the token scale only.
5. **One mood (default pairing):** the stage is Canvas/Default and every box on it is flat Surface/Default, no border and no shadow (Card and MetricCard `theme="flat"`, ChartCard, ListBox). Use a border or a shadow only when a condition asks for it: a Sidebar screen (elevation follows the Sidebar), a white page or phone screen (§11), a Surface inside a Surface, a clickable card (`theme="border"`), the selected card. See `docs/component-usage-rules.md` §16; reference Card › Workspace plan.
6. **Platform CSS:** example classes are `pe-*`; grep `src/platform/platform.css` for the name first (a reused `.pe-summary` once broke a layout); tokens only; titles are Strongest.
7. **Verify:** run `npm run qa` (the Build-QA gate in `skills/zen-build-qa`: static gates, style tokens, text styles and content hierarchy, Comfortable density, dark, behaviour, coverage, screenshots) and open the contact sheets the gate asks for. DOM checks cannot see a squashed button or an oversized icon. Then ask the screenshot the questions of design-principles §9 (squint, count the hues, greyscale, the other modes): no gate asks them.

For a full audit of every page, use the `zen-platform-qa` skill.

## When building or changing a component (definition of done)

A component is done only when all of these hold:
1. It matches Figma (see the `zen-figma-component-audit` skill).
2. It has a guideline entry in `tools/usage-guard/guidelines.source.mjs` covering purpose, use / use-something-else, Figma→React, Do, Don't, accessibility, content and references (Material 3, Carbon, Polaris, WAI-ARIA APG, NN/g). Regenerate with `npm run guidelines:build`. This writes `docs/guidelines/*.md`, `index.json` and `src/platform/guidelines.generated.json`, which the component's Platform page renders as its "Usage guidelines" section (Do / Don't, accessibility, harness rules). If the page id differs from the slug, map it in `slugFor` in `src/platform/PlatformGuidelines.tsx`; if the component has new JSX tags, add them to `tagsFor` in `build-guidelines.mjs`. Add 1–2 visual Do/Don't pairs (real components + one-line captions) to `src/platform/PlatformGuidelineVisuals.tsx`. The file opts out of the harness because its Don't previews are deliberately wrong. Keep Don't previews valid HTML: no interactive elements nested inside buttons.
3. Every Do/Don't that is detectable in JSX has a harness rule in `tools/usage-guard/check-usage.mjs`, with `id`, `components`, `severity` (error = must never ship; warn = needs judgement), `allow`, `guideline` and `summary`.
4. Each new rule has a violating case in `tools/usage-guard/fixtures/bad.tsx` (with an `expect:` marker) and correct usage in `fixtures/good.tsx`. `npm run usage:selftest` must pass.
5. `npm run usage:check` and `npm run guidelines:check` pass.

Keep statements short, imperative and testable. They are read by people and parsed by agents.
