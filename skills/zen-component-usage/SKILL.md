---
name: zen-component-usage
description: Compose screens, examples or templates with Zen Design System components correctly, following each component's Do/Don't guidelines and passing the usage harness. Also defines the "definition of done" for new components (guidelines + harness rules). Use whenever writing JSX with Zen components or finishing a new component.
---

# Zen component usage

Zen components have written usage rules. Follow them when you **use** components, and extend them when you **build** one.

## When composing UI with Zen components

1. Read `docs/guidelines/index.json` (compact) or the relevant `docs/guidelines/<component>.md` before choosing a component. Check the "Use something else for" list first: picking the right component matters more than configuring it.
2. Apply the house rules that most often go wrong:
   - **Buttons:** Primary = the one main CTA; Tertiary for everything else; Secondary is rare (a justified highlight); Accent only for promoted CTAs; Danger for irreversible actions.
   - **Filters, sort, scope, status and owner pickers** are `Chip variant="advanced"`, never a Button or Segmented.
   - **Inputs** have Read-only, not Disabled; Search has no Disabled either. Every field has a label.
   - **Background layers**: page = Canvas (`canvas-default`, or `canvas-alt` for a white page); cards on it = Surface (`surface-default`/`-alt`); top/bottom nav on a `canvas-flat` page = `surface-flat`; Modal/Bottom-Sheet = Container; floating overlays = Popover. Components never paint Canvas.
   - **Popover items** take `photoSrc` (the item sizes the avatar); captioned items use Avatar ≥ Small (32px).
   - **Container borders** (a stroke around a closed box): `Border/Neutral/Subtle` (+Hover/Pressed) when the box is actionable (buttons, chips, tags, fields incl. Read-only, clickable cards/tiles); `Border/Neutral/Pale` when it is static (panels, static cards, wells). A static box holding actionable children stays Pale. Lines that are not a closed container's border (dividers, separators, row rules, tree-lines) and strokes around avatars/photos/visuals/graphics are not covered: follow Figma. `Divider` defaults to Pale. Any **dashed** line or stroke steps up to `Border/Neutral/Subtle`. See `docs/component-usage-rules.md` §6.
   - **Content colours (text & icons)** share `Color/Content/*`. Neutral families (Neutral, Inverse, On-Black/White-Overlay): Strongest = Primary text, Base = Secondary, Light = Tertiary. Colour families (Accent, Info, Positive, Negative, Warning, Support/*): Strongest/Base for normal text on that colour's Subtle background; Light only for highlighted text or icons. Lights group (families referencing Sky, Mint, Yellow or Zen; today Accent, Warning, Support/Yellow): text is Base at most, never Light (Light only for icons). Text on Solid fills uses On-Colors/On-Brights. See `docs/component-usage-rules.md` §7.
   - **Copy and counts:** button labels name the outcome (never "OK"/"Submit"); Toggle labels name the setting, never "On"; Tabs 2–7, Segmented 2–5; no Pagination under 3 pages; Toast titles ≤ 60 characters and never a question; placeholders show an example, not the label.
   - **Icon-only actions** show their name as a tooltip after 1s of hover (at once on keyboard focus, never on touch). IconButton does it by default (`tooltip` defaults to `aria-label`); never hand-build `<button><Icon/></button>`, and use `useIconTooltip(label).bind()` for custom controls. See `docs/component-usage-rules.md` §12.
   - **Structure:** no Dialog inside a Dialog, no Accordion inside an Accordion, no tooltip on a disabled control or with interactive content.
   - **Component CSS:** colours only through `--zen-*` tokens (raw values only as `var()` fallbacks); removing a focus outline needs a replacement ring; every animation has a `prefers-reduced-motion` fallback.
3. Run `npm run usage:check` and fix every ✗. Suppress a finding only when the rule truly does not apply, with a comment `zen-allow-<allow>: <reason>` directly above the element.

## When writing Platform examples or playgrounds

Examples are copied into products, so they must model correct usage. Follow `docs/guides/example-patterns.md`:

1. **Coverage matrix** per component: the primary real use case; states (empty, error, loading, disabled/read-only, success); composition with other DS components; edge cases (long text, many items, narrow width, 0/1 items); a mobile example in `PlatformPhone` (390px) for anything used on phones; keyboard/a11y. Check for duplicates before adding one; keep the richer example.
2. **Mobile patterns:** Back is the chevron `icon-chevron-left-line-medium`, never an arrow (harness `navigation/back-chevron`); footer CTAs are `lg` full width with Primary on top; filter chips sit in one horizontally scrolling row and open an Action `BottomSheet` (not a Popover); long reading content uses `BottomSheet size="max"` with vertical actions; chat threads anchor to the bottom with `margin-top:auto`; failures keep the content and offer Retry (`ChatMessage failed/onRetry`, AI: Negative `InlineMessage` + Try again); an empty chart shows `EmptyState illustration={false}` with the action that creates data.
3. **Copy:** counts use a plural helper (`plural(n, "item")`, harness `copy/plural-count`); labels name the outcome; real data, formatted values; the description matches what the example really does.
4. **Composition:** List/ListItem for rows (never `div` + Text + Badge), EmptyState, FileIcon + `fileIconFormatOf`, Chip advanced for filters, BadgeCounter for counts, token swatches in ColorSelector, `scale="quota"` for usage-against-limit bars, Icon sizes from the token scale only.
5. **Platform CSS:** example classes are `pe-*`; grep `src/platform/platform.css` for the name first (a reused `.pe-summary` once broke a layout); tokens only; titles are Strongest.
6. **Verify:** run `npm run qa` (the Build-QA gate in `skills/zen-build-qa`: static gates, style tokens, text styles and content hierarchy, Comfortable density, dark, behaviour, coverage, screenshots) and open the contact sheets the gate asks for. DOM checks cannot see a squashed button or an oversized icon.

For a full audit of every page, use the `zen-platform-qa` skill.

## When building or changing a component (definition of done)

A component is done only when all of these hold:
1. It matches Figma (see the `zen-figma-component-audit` skill).
2. It has a guideline entry in `tools/usage-guard/guidelines.source.mjs` covering purpose, use / use-something-else, Figma→React, Do, Don't, accessibility, content and references (Material 3, Carbon, Polaris, WAI-ARIA APG, NN/g). Regenerate with `npm run guidelines:build`. This writes `docs/guidelines/*.md`, `index.json` and `src/platform/guidelines.generated.json`, which the component's Platform page renders as its "Usage guidelines" section (Do / Don't, accessibility, harness rules). If the page id differs from the slug, map it in `slugFor` in `src/platform/PlatformGuidelines.tsx`; if the component has new JSX tags, add them to `tagsFor` in `build-guidelines.mjs`. Add 1–2 visual Do/Don't pairs (real components + one-line captions) to `src/platform/PlatformGuidelineVisuals.tsx`. The file opts out of the harness because its Don't previews are deliberately wrong. Keep Don't previews valid HTML: no interactive elements nested inside buttons.
3. Every Do/Don't that is detectable in JSX has a harness rule in `tools/usage-guard/check-usage.mjs`, with `id`, `components`, `severity` (error = must never ship; warn = needs judgement), `allow`, `guideline` and `summary`.
4. Each new rule has a violating case in `tools/usage-guard/fixtures/bad.tsx` (with an `expect:` marker) and correct usage in `fixtures/good.tsx`. `npm run usage:selftest` must pass.
5. `npm run usage:check` and `npm run guidelines:check` pass.

Keep statements short, imperative and testable. They are read by people and parsed by agents.
