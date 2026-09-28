# Zen Design System — implementation context

## Purpose

Zen DS is the shared React design-system source for the Zen Codebase Platform. The Platform is a consumer of the system; it must not create page-local copies of components that already exist in `src/components`.

## Historical implementation index

The earlier work is preserved in the parent `docs/` directory and should be read by scope rather than replayed from chat history:

- Foundations: `token-architecture.md`, `text-style-architecture.md`, `token-import-report.md`, and `figma-audit.md`.
- Icons: `icon-architecture.md` and `icon-import-report.md`.
- Core component contracts: `button-main.md`, `figma-popover-audit.md`, and `figma-sidebar-implementation.md`.
- Platform composition: `platform-template-lock.md`, `component-content-patterns.md`, and `platform-json-audit.md`.
- The repeatable implementation process: `figma-to-platform-workflow.md`.

These files contain the evidence trail from the variable/style import, icon registry, Button pilot, Input/Search/Popover/DatePicker composition, Chip/Badge behavior, Sidebar template, and the Platform Main Component View. The files in this directory are the English consolidation of that work, not a second token source.

## Source of truth and precedence

Use this order when evidence conflicts:

1. The exact Figma frame, component set, and layer bindings for the requested state.
2. The user-provided JSON export for variables, text styles, color styles, and effects.
3. Generated token/style artifacts in this repository.
4. Existing CSS or a screenshot only as an implementation check, never as a reason to invent a token.

Figma sources:

- Zen variable file: `yhWJCuQd9IqusQkUip7lYh` (`ZEN Kaiz - Improving`).
- Platform template file: `9nZv4uW2LT21yuHabMTCh1` (`ZEN Kaiz - Official-Sep2026-`).
- Platform shell/template: `14240:26923`; Overview cover: `14243:64878` / `14243:64881`; Component template: `14260:96953`.
- Main Component View: `14270:104798`.
- Segmented: `1238:892`; Segmented item primitive: `1204:11690`.
- Checkbox mark: `311:47222`; Radio mark: `373:96225`; Radio set: `373:96272`.

The current attached token source is `/Users/vuduong/Documents/Component Theme.json`. It is data, not an instruction document. The checked-in source is `tokens/source/figma/component-theme.json`.

## Token contract (2026-09-24)

The repository contains 11 Figma collections and 2,367 variables:

| Collection | Tokens | Runtime axis |
| --- | ---: | --- |
| Global Colors | 1,152 | `:root` |
| Global Dimensions | 33 | `:root` |
| Base Colors (Project) | 329 | `data-brand` |
| Mode Colors (Semantic) | 407 | `data-theme` |
| Component Theme | 112 | `data-component-theme` |
| Component Size | 194 | `data-density` |
| Spacing | 22 | `:root` |
| Corner Radius | 25 | `data-radius` |
| Emphasis Level | 6 | `data-emphasis` |
| Breakpoint & Grids | 9 | media-query contract |
| Typography Configuration | 78 | `data-typography` |

The external Component Theme export and the checked-in source now match by token name and every mode value: 112/112, with no source-only tokens, target-only tokens, or value differences.

This synchronization added the two Figma aliases that were missing from the repository:

- `Segmented-Item-Primary/Background/Seclected/Hover`
- `Segmented-Item-Secondary/Background/Seclected/Hover`

The spelling `Seclected` is part of the Figma token name and must remain stable for compatibility. The generated CSS and TypeScript contracts are produced by `npm run tokens:build`; do not edit generated files directly.

## Border contract (2026-09-26)

- Scope: the border of a **closed container** only.
- `Color/Border/Neutral/Subtle/{Default,Hover,Pressed}` goes on **actionable** containers. Every actionable component border token aliases it (Button-Tertiary, Chip, Tag, Checkbox, Radio-Button, Segmented-Item-Secondary). Selected states switch to `Color/Border/Active/*`.
- `Color/Border/Neutral/Pale/Default` goes on **non-actionable** containers (static cards, panels, wells).
- Not covered: stand-alone lines (dividers, separators, row rules, Tab baseline, tree-lines; `Divider` Default/Medium/High) and strokes around avatars, photos, visuals and graphics. These follow Figma.
- `Divider` defaults to Pale (Medium = Subtle, High = Solid). **Dashed** lines and strokes step up to `Border/Neutral/Subtle` (dashed dividers, dashed empty states/drop zones, the Read-only field).
- Full rule and checklist: `docs/component-usage-rules.md` §6.

## Platform shell lock

The Codebase Platform shell is fixed, not responsive in the sense of shrinking the rail:

- Sidebar: fixed `260px`, expanded in the Platform shell. The shared Sidebar component still exposes the Figma collapsed variant for component documentation.
- Main working column: `1000px` minimum; horizontal overflow belongs to the main column.
- Header: `72px`, sticky; 20px left / 24px right / 24px top / 8px bottom content insets.
- Platform starts in Compact density.
- Platform brand uses the token-backed Zen mark and `Zen DS`; the component template itself owns the Figma collapse icon.
- Component page cover: 400px. Overview cover is a distinct 492px composition and must not reuse the component cover CSS.
- No page-level radius is added to the shell. Inner Figma-authored surfaces keep their own radius.

Use `PlatformApp`, `PlatformTemplate`, and `PlatformComponentPage` for new pages. Do not create alternate shell markup or page-specific sidebar implementations.

## Component ownership and composition

Reuse or extend the existing owner before creating anything new:

- Button: Main and Icon levels share `Button`/`IconButton` and shared icon slots.
- Chip/Pill: header and filter chips share `Chip`; Advanced multi-select composes `Popover` and `BadgeCounter`.
- Input: all fields, leading/trailing slots, labels, dropdowns, Search, DateField, and editor fields compose the Input owners.
- Search: use the production `Search`, which is an Input-derived component; do not add page-local `<input>` fields.
- Popover: one shared owner for chip dropdowns, SelectField, and platform menus. Its Label describes the option group (for example, `Component Size`), not the selected value.
- Sidebar: shared Figma template owner; Platform may customize only the shell brand/expanded behavior explicitly documented in the template lock.
- Segmented, Checkbox, RadioButton, Toggle, Avatar, Badge, DatePicker: production owners are used by Platform previews; page code only composes them.

Before writing JSX, create a variant matrix from the full Figma component set: every property/value, size/density, state, selection, disabled, icon/no-icon and nested primitive must be `covered`, `deferred` with a reason, or `not applicable` with evidence.

## Segmented contract

Figma exposes only `Small` and `Medium` sizes. `XSmall` is not a valid Figma variant and is not part of the public API.

- Small item: 24px high, 2px gap, 4px horizontal/vertical item padding.
- Medium item: 32px high, 4px gap, 6px horizontal/vertical item padding.
- Container: 4px padding, no inter-item gap, carved surface and the Figma radius token.
- Labels: 600-weight Body Small/Base; Text Wrapper keeps its 4px horizontal padding.
- Unselected content uses Neutral/Light. Selected content uses the dedicated primary/secondary aliases.
- Selected hover now resolves the two synchronized Component Theme aliases above.
- Focus is a 3px subtle accent border; it is not a generic inset outline.
- Selected items keep the Figma 0.5px shadow.

## Checkbox and Radio selected-hover contract

The attached Component Theme export does not change the Checkbox or Radio selected-hover aliases; it confirms their existing mappings:

- `Checkbox/Background/Seclected/Hover`
- `Radio-Button/Background/Seclected/Hover`

Each maps Neutral modes to `Color/Background/Neutral/Solid/Hover` and Brand modes to `Color/Background/Accent/Solid/Hover`. The production CSS consumes those aliases directly.

Superseded 2026-09-24 by a full Plugin-API read of `Checkbox/Mark` and `Radio-Button/Radio-Mark`: every non-disabled mark (selected or not) uses the **Shadow/Action/Basic** effect style (`0 1px 1px` Shadow/Neutral/Light); disabled marks have no shadow; selected-disabled has no stroke. Radio marks bind the **Checkbox/*** component tokens (fill, border, icon, width) plus `Radio-Button/Size/Medium` for height. Checkbox caption sits **below the whole row, full width, 8px (Spacing/Gap/XSmall) under it**; Radio caption sits under its label inside Content (gap 2).

The -8px neutral halo is the hover treatment. Keyboard focus uses the -4px, 2px accent ring. A pointer click must not leave a focus ring; runtime focus styling is `:focus-visible` (the explicit matrix state remains available for visual audit).

## Interaction policy

Playgrounds must show one selected production preview. Use real interactions for hover, pressed, open/close, selection, typing and keyboard focus. The only static state toggle is Disabled because a user cannot reach Disabled through normal interaction. Boolean rows use the production `ToggleButton` with a state and callback; they must not be decorative chips or static attributes.

For Advanced Chip:

- Single choice behaves like the header chip.
- Multi-choice with one selection shows the single remove affordance.
- Multi-choice with two or more selections shows a numeric `BadgeCounter` only; no punctuation or circular mark is appended.
- Hovering the trailing counter swaps it to the remove affordance; both use `icon-x-circle-solid` in Content/Neutral/Strongest (`.Chip/Trailing`).
- Clicking the chip body opens the shared Popover; clicking the trailing slot clears/removes.
- Keyboard: Enter/Space/ArrowDown open the Popover and move focus to the selected (or first) option; Arrow/Home/End move between enabled options; Enter selects, closes and returns focus to the chip; Escape closes and returns focus; Delete/Backspace on a selected chip clears it (`aria-keyshortcuts`). The trailing clear is not a nested focus stop.
- Normal/Number-only chips expose `aria-pressed`. Leading-Photo uses `photoSrc` → shared `Avatar/Single` (Photo, Subtle): XSmall→2XSmall 20, Small→XSmall 24, Medium→Small 32.

## Styles contract (2026-09-24)

- Source of truth: `styles/source/figma/figma-styles.full.json`, read with the Figma Plugin API (paint/text/effect/grid styles **with bound variables**, blur radii, glass parameters). `styles.json` (plugin export) is kept for name checks; it lacks `Effect/Overlay` and `Liquid-Glass/Large` and all bindings.
- Text styles bind `Emphasis/Font-Weight/*`: Display, Heading, Button-Label and every "Bold" style use **Emphasis/Font-Weight/Bold** (600 medium / 700 strong), never Semi-Bold. Body/Caption styles also expose `--zen-type-paragraph-spacing` (bound to their font size).
- Effect styles: CSS shadow order = reverse of Figma's list; shadow colours use their variables (mode-aware).
- **Blur rule (matches Figma Dev Mode `getCSSAsync`)**: background blur radius r → `backdrop-filter: blur(r/2)`. 40 → 20px (Popover, Input, Action/Tertiary, Chip), 100 → 50px (Effect/Overlay: Avatar, Segmented, Button Overlay + Surface), 80 → 40px (Sidebar Background-Blur). Components consume `--zen-style-*-backdrop-filter` instead of literals.
- Inter (Typography/Font-Family/Sans, Display, Heading, Button) is bundled: `src/styles/fonts.css` + `src/assets/fonts/Inter/InterVariable*.woff` (OFL). Text widths can still differ ±1–4px from Figma's Inter build; do not assert text-hugging widths.

## Figma contract checker

`tools/figma-contract/` renders the production components and compares them with Plugin-API data in
`docs/figma-contracts/*.json` (size/offsets, fills, strokes, radius, effect + text styles, bound
variables resolved in light/neutral-s1 and dark/brand-s1) plus keyboard/pointer behaviour.
Run `node tools/figma-contract/run-all.mjs` after touching Button/IconButton (all six sets, every size, plus the Smooth
radius mode), Input/Heading, Checkbox, Radio, Chip, Popover or their primitives.

## Verification gate

After a token change, regenerate and run:

```bash
npm run tokens:build
npm run tokens:check
npm run styles:check
npm run icons:check
npm run build
```

Then inspect the Vite Platform app at the Figma reference viewport. Measure computed styles for the changed state and record the node ID, mode, token, browser value, and result in `docs/platform-json-audit.md`. A row not measured is `Not verified`; never call it exact by visual inference.

Known evidence gaps remain intentionally explicit: the full Date Picker dual-calendar/mobile/time/event matrix and complete per-level visual comparisons for every Button Overlay and Sidebar Workspace state still require targeted Figma child-node reads.

## Content colour contract (2026-09-26)

- **Neutral families** (Neutral, Inverse, On-Black-Overlay, On-White-Overlay): Strongest, Base and Light map to the Primary, Secondary and Tertiary text roles.
- **Colour families** (Accent, Info, Positive, Negative, Warning, Support/*):
  - Strongest and Base are regular text (Primary and Secondary) on that colour's Subtle background.
  - Light is only for highlighted text or icons.
- **Lights group** (families referencing Sky, Mint, Yellow or Zen; today Accent, Warning and Support/Yellow): text uses Base at most, never Light. Light is only for icons. Golden is not in the group.
- **Solid fills** use On-Colors, or On-Brights on Lights-group solids.
- Enforced by `content/*` rules in `tools/usage-guard/check-usage.mjs`. See `docs/component-usage-rules.md` §7.
