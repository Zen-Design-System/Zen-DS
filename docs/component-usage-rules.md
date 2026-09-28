# Zen DS component usage rules

These cross-component rules apply to every example, playground, template and product screen built with Zen DS. Per-component Do/Don't guidelines live in [`docs/guidelines/`](guidelines/README.md), which is generated from `tools/usage-guard/guidelines.source.mjs`.

**Harness:**
- `npm run usage:check` enforces the machine-checkable rules on `src/platform`, `src/components` (TSX and CSS) and `src/styles`. Pass paths to check other files, e.g. an app: `node tools/usage-guard/check-usage.mjs "$PWD/src"`.
- `npm run usage:rules` lists the rules as JSON.
- `npm run usage:selftest` proves each rule fires on `fixtures/bad.tsx` and stays quiet on `fixtures/good.tsx`.
- `npm run guidelines:check` fails when the generated guidelines are stale.

## Definition of done for a component

A component is finished only when:
1. It matches Figma.
2. It has a guideline entry (purpose, when to use / not, Figma→React, Do, Don't, accessibility, content, references).
3. Every detectable Do/Don't is a harness rule, with fixtures, and the self-test passes.

See `skills/zen-component-usage/SKILL.md`.

## 1. Button hierarchy

| Level | Use it for | Frequency |
| --- | --- | --- |
| **Primary** | The one main CTA of a surface (Save, Publish, Create account). | Common |
| **Tertiary** | Everything else: Cancel, Undo, Reset, toolbar actions, "Mark all as read". | **Most common** |
| **Secondary** | A secondary highlight: an action that must stay visible but is *not* the main CTA (e.g. a pressed toggle in a toolbar). | Rare |
| **Accent** | A **promoted** CTA: upsell, marketing or onboarding moments that need extra pull. | Rare |
| Danger / Danger-Subtle | Destructive actions (Delete, Discard). | As needed |

- Default pairing is **Tertiary + Primary** (dialogs, forms, cards).
- Secondary needs a reason. In code, add `zen-allow-secondary: <reason>` in a comment right above the element, or the harness fails.

## 2. Filters are chips, never buttons

Any control that chooses a filter, sort order, scope, status, owner or period is a **Chip (variant="advanced")** with `popoverItems`. Do not use a Button (of any level) or a Segmented control for this.

- Single choice: `dropdown`, `select={Boolean(value)}`, `onClearSelection`.
- Multiple choice: `selectionMode="multiple"`, `selectionCount`, `popoverMultiple`.
- Segmented is for switching **views/sections** (grid ↔ list, Inbox ↔ Mentions), not for filtering data.

## 3. Inputs: Read-only instead of Disabled

- Text, Select, Date, Number, Text-Area, Autocomplete, Rich-Text and Heading inputs expose **Read-only** only. Read-only shows the committed value, drops the fill, and uses a 1px `Border/Neutral/Subtle` border with `Neutral/Strongest` text.
- **Search** has no Disabled state either — hide or omit it instead.
- Read-only Select and Date keep their chevron and calendar affordances but never open. Read-only Number hides its steppers.

## 4. Popover items with a caption

- A captioned item never uses the 20px avatar. `theme: "avatar-small"` with a `caption` renders **Avatar Small (32px)**, centred on both lines. `PopoverItem` enforces this automatically when you pass `photoSrc`.
- Pass images through `photoSrc`/`photoAlt` rather than your own `<Avatar>` or `<img>`. The item then picks the Figma size for each theme: Avatar Small 20/32, Avatar Big 40, Photo Small 20, Photo Big 32.

## 5. Badge

- The remove affordance is `icon-x-circle-solid` (12px on XSmall/Small, 16px on Medium), wired through `remove` + `onRemove`.

## 6. Container borders: Subtle for actionable, Pale for non-actionable

This rule is about the **border of a closed container**: a stroke or inset ring that encloses a box on all sides (card, panel, tile, field, chip, button, popover-like frame). The token says whether the box can be acted on. Pick it by that alone, never by how strong you want the line to look.

| The container is… | Border token | States |
| --- | --- | --- |
| **Actionable**: the user can click, tap, focus, type into, drag or select it | `Color/Border/Neutral/Subtle/*` → `--zen-color-border-neutral-subtle-default` | `…-subtle-hover`, `…-subtle-pressed`; selected → `Color/Border/Active/*` |
| **Non-actionable**: it only groups or frames content | `Color/Border/Neutral/Pale/Default` → `--zen-color-border-neutral-pale-default` | none (it has no interaction states) |

**Actionable containers** respond to input themselves. Examples:
- Buttons (Tertiary border), Chips, Tags, Segmented items, Checkbox and Radio marks.
- Form fields: Text, Select, Date, Number, Text-Area and Search. This includes **Read-only** fields, which stay focusable and selectable.
- Clickable cards and rows (a radio card, a selectable list tile, a picker tile), and drop zones.

**Non-actionable containers** are structure or decoration. Examples:
- Static cards, panels, surfaces, callout or empty-state frames, and preview wells.
- Logo or info tiles that are not clickable.

### Not covered: use Subtle or Pale as the design needs

- **Lines that are not the border of a closed container.** This covers dividers and separators, toolbar separators between button groups, table/list row rules, the Tab baseline, the Sidebar tree-line, and single-edge rules such as a section `border-top` or an Accordion Divider rule. `Divider` Color=Default (Pale), Medium (Subtle) and High (Solid) are all allowed.
- **Strokes around media**: avatars, visuals, photos, illustrations, graphics and image thumbnails. For example, the Avatar Photo 1px Subtle hairline.

### Dividers and dashed strokes

- `Divider` has several levels (Default = Pale, Medium = Subtle, High = Solid). **Default is Pale**. Use it unless the design calls for more.
- **Dashed lines and dashed strokes step up to `Border/Neutral/Subtle`.** A dash has less ink than a solid line, so Pale is too faint. This holds for a dashed divider, a dashed container (empty state, drop zone) and a Read-only field's dashed stroke. It overrides the static-container → Pale rule.

### Decide in four questions

1. Is it dashed? → **Subtle** (at least).
2. Is it a line or a single edge rather than a stroke around a closed box, or is it a stroke around media? → the container rule does not apply. A divider defaults to Pale; otherwise follow Figma.
3. Does the box itself (not its children) have a click, change, focus or drag handler, or is it a form control? → **Subtle**.
4. Otherwise it is a static box → **Pale**. A static box that holds actionable children is still Pale; the children bring their own Subtle borders.

### Rules

- Use the component's own border token when it exists (`Button-Tertiary/Border/Default`, `Chip-Secondary/Border/Default`, `Tag/Border/*`, `Checkbox/Border/*`, `Radio-Button/Border/*`, `Segmented-Item-Secondary/Border/*`). They all alias `Neutral/Subtle`. Write raw `--zen-color-border-neutral-*` only in custom compositions.
- Do not put Pale around a box the user can act on: it reads as disabled or static.
- Do not put Subtle around a static box: it falsely signals interactivity.
- Hover and pressed feedback exists only on actionable containers (`Subtle/Hover`, `Subtle/Pressed`). Never hover a Pale container border.
- Disabled actionable containers use `Color/Border/Disabled`, not Pale.

```css
/* ✅ static panel (closed box, not clickable) */
.panel { box-shadow: inset 0 0 0 1px var(--zen-color-border-neutral-pale-default); }
/* ✅ clickable card (closed box, actionable) */
.card--selectable { box-shadow: inset 0 0 0 1px var(--zen-color-border-neutral-subtle-default); }
.card--selectable:hover { box-shadow: inset 0 0 0 1px var(--zen-color-border-neutral-subtle-hover); }
/* ✅ not covered: a divider line or an avatar stroke may use either token */
.list__row + .list__row { box-shadow: inset 0 1px 0 var(--zen-color-border-neutral-subtle-default); }
/* ✅ dashed empty state: dashed steps up to Subtle */
.empty-state { border: 1px dashed var(--zen-color-border-neutral-subtle-default); }
/* ❌ dashed divider left at Pale (too faint) */
.divider--dashed { border-top: 1px dashed var(--zen-color-border-neutral-pale-default); }
/* ❌ static panel framed with Subtle */
.panel--static { border: 1px solid var(--zen-color-border-neutral-subtle-default); }
```

## 7. Content colours (text and icons): the level depends on the family

Text and icons share `Color/Content/*`. Choose the **family** first, then the **level** (Strongest · Base · Light) by role.

### Neutral families: Neutral, Inverse, On-Black-Overlay, On-White-Overlay
The three levels map to the three text roles:

| Level | Role | Use for |
|---|---|---|
| `…-strongest` | Primary | titles, headings, main content, values, primary icons |
| `…-base` | Secondary | body copy, descriptions, secondary icons |
| `…-light` | Tertiary | captions, meta, helper text, timestamps, quiet icons |

### Colour families: Accent, Info, Positive, Negative, Warning, Support/*
- `…-strongest` and `…-base` are **regular text**: the Primary and Secondary levels, placed on the same colour's **Subtle** background (subtle Badge, Tag, Alert, callout).
- `…-light` is a **highlight**: text or icons that must stand out, such as status icons, a success or error hint, a ± delta, or a highlighted keyword. Don't use it for body copy.
- Colour families have no Tertiary text role.

### Lights group: colours that reference Sky, Mint, Yellow or Zen
These colours have similarly low contrast. Today the group contains:
- **Accent**, which references Zen.
- **Warning**, which references Yellow.
- **Support/Yellow**.

Any family whose tokens resolve to the Sky, Mint, Yellow or Zen scales joins the group automatically; the harness derives the group from `tokens.css`.
- Text is **Base at most**: use `-strongest` or `-base`, never `-light`.
- `-light` is allowed **only for icons**.
- Golden is not in the group.

### Not covered
- Text on a **Solid** colour fill uses `Content/On-Colors`, or `On-Brights` on Lights-group solids.
- Disabled, placeholder and link text use `Content/Disabled`, `Content/Placeholder` and `Content/Hyperlink/*`.

### Decide in three questions
1. Is the text on a Solid fill? → On-Colors or On-Brights.
2. Is it a neutral family? → Strongest, Base or Light by role (Primary, Secondary, Tertiary).
3. Is it a colour family? → Strongest or Base for text on Subtle; Light only for a highlight or an icon. If the family is in the Lights group (Sky, Mint, Yellow or Zen), text never uses Light.

```css
/* ✅ warning callout: icon Light, text Base */
.callout--warning { --callout-icon: var(--zen-color-content-warning-light); color: var(--zen-color-content-warning-base); }
/* ✅ neutral card: title Strongest, description Base, meta Light */
.card__title { color: var(--zen-color-content-neutral-strongest); }
.card__meta  { color: var(--zen-color-content-neutral-light); }
/* ❌ Lights-group text at Light */
.notice--warning { color: var(--zen-color-content-warning-light); }
/* ❌ colour Light as body copy */
.callout__body { color: var(--zen-color-content-info-light); }
```

Harness rules:
- `content/lights-no-light-text` (error)
- `content/title-is-strongest` (warn)
- `content/colour-light-is-highlight` (warn)

Details are in `docs/guidelines/content-colors.md`.

## 8. Background layers: Canvas → Surface → other colours → Container → Popover

Every background belongs to one of five layers, bottom to top. Pick the token by the layer, not by the look. Full guideline: [background-layers](guidelines/background-layers.md).

1. **Canvas** is always the bottom layer: the page colour. Most designs use `canvas-default`; designs that want a white page use `canvas-alt`. Components never paint Canvas.
2. **Surface** is for cards and containers on the Canvas. Choose `surface-default` or `surface-alt` to suit the page style.
   - On a **`canvas-flat`** page, top and bottom navigation containers use **`surface-flat`**, so the bar and the page stay seamless in both light and dark mode. `surface-flat` is not for cards.
3. **Other colours** are component fills (Neutral/Subtle, Support/*, Solid, states) on top of Surface or Canvas.
4. **Container** is only for Modal/Dialog, Modal/Forms and Bottom-Sheet panels.
5. **Popover** is the top layer: popovers, menus, tooltips, pickers, flyouts and toasts.

Harness (`npm run usage:check`): `layer/root-is-canvas`, `layer/canvas-is-page`, `layer/surface-flat-is-navigation`, `layer/container-is-modal`, `layer/popover-is-overlay`.

## 9. No drop shadow on Subtle, Pale or Surface-Alt surfaces

A surface filled with a **Subtle**, **Pale** or **Surface-Alt** background never casts a drop shadow. Tinted and alt fills already separate the surface from what is behind it; adding an elevation shadow makes it read as a raised control and muddies the layer order (§8).

| Background | Drop shadow (outer `box-shadow`, `--zen-style-*-shadow`) | Allowed |
| --- | --- | --- |
| `*-subtle-*`, `*-pale-*`, `active-*-subtle`, `support-*-pale/subtle`, `subtle-disabled` | ❌ | a 1px ring (`0 0 0 1px`), inset shadows |
| `surface-alt` | ❌ | a 1px Pale ring |
| `surface-default`, solid, ghost, container, popover | ✅ as designed | — |

- **Scope:** only outer shadows. Inset effects (for example `Effect/Input` on fields) and 0 0 0 Npx rings are borders, not elevation, so they stay.
- **Components beat Figma here.** Figma still pairs some tinted fills with `Shadow/Action/*`: Checkbox and Radio unselected, Chip in some themes, Tag State=Error, and Button Tertiary in the themes where it is Neutral/Subtle. The code drops those shadows.
- **Theme-aware:** when a component background token aliases a tinted token in a theme, the token build emits `<token>-shadow-off: 0 0 #0000` for that theme. Components write `box-shadow: var(<background token>-shadow-off, <shadow>)`, so the shadow disappears only where the fill is tinted.

```css
/* ✅ tinted panel: no elevation */
.filters { background: var(--zen-color-background-neutral-pale-default); box-shadow: 0 0 0 1px var(--zen-color-border-neutral-pale-default); }
/* ✅ component shadow guarded by its background */
.zen-chip { box-shadow: var(--zen-chip-shadow-off, var(--zen-style-shadow-action-tertiary-shadow)); }
/* ❌ pale fill with a drop shadow */
.hint { background: var(--zen-color-background-neutral-pale-default); box-shadow: var(--zen-style-shadow-bottom-level-1-shadow); }
```

Harness (`npm run usage:check`): `surface/no-shadow-on-tinted` (error).

## 10. Back uses a chevron on mobile and tablet

A "go back / up a level" action on mobile and tablet uses the left **chevron** (`icon-chevron-left-line-medium`), never a left arrow (`icon-arrow-left-*`, `icon-arrow-narrow-left-*`). The chevron is the platform back affordance, and arrows mean moving content ("Move left", "Previous column").

- **Applies to:** the Top Navigation `leading` Back action, and any Button / IconButton labelled "Back", "Go back", "Quay lại" or "Trở lại".
- **Not covered:** arrows that move content or step through items (carousel, "Move to the left column"). Those keep the arrow, and Pagination and Date Picker keep their own previous controls.

```tsx
// ✅
<TopNavigation title="Invoice #1024" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />
// ❌
<TopNavigation title="Invoice #1024" leading={{ icon: "icon-arrow-left-line", label: "Back", onClick: back }} />
```

Harness (`npm run usage:check`): `navigation/back-chevron` (error). Suppress a deliberate case with `zen-allow-back-arrow: <reason>`.

## 11. Surface on Canvas/Alt needs a border

`canvas-alt` (the white page) and `surface-default` resolve to the **same colour** in every mode: white in light, `dark-neutral-2` in dark. A Surface/Default card, panel or section placed on a Canvas/Alt page therefore has no edge of its own and must carry a **closed border**.

| Page | Box background | Required |
| --- | --- | --- |
| `canvas-alt` | `surface-default` | a closed border: `0 0 0 1px` Border/Neutral/**Pale** when static, **Subtle** when actionable (§6) |
| `canvas-alt` | `surface-alt` | nothing extra (the colour separates it) |
| `canvas-default` / `canvas-flat` | `surface-default` | as designed |

- **A shadow does not count.** Elevation alone reads as a smudge on white, and it disappears in dark mode, so the border is required even when the box also has a shadow.
- **Navigation bars** (Top/Bottom Navigation, Sidebar) are not boxes on the page; they keep their own separators.
- Card: use `theme="border"` on a Canvas/Alt page, or `surface="alt"`.

```css
/* ✅ white page, framed white card */
.app-shell--white .note-card { background: var(--zen-color-background-surface-default); box-shadow: 0 0 0 1px var(--zen-color-border-neutral-pale-default); }
/* ✅ or a surface-alt card */
.app-shell--white .note-card { background: var(--zen-color-background-surface-alt); }
/* ❌ same colour, only a shadow */
.app-shell--white .note-card { background: var(--zen-color-background-surface-default); box-shadow: var(--zen-style-shadow-bottom-level-1-shadow); }
```

Harness (`npm run usage:check`): `layer/surface-on-canvas-alt-border` (error) for authored CSS; the Platform audit (`npm run platform:audit`) checks rendered pages with `surfaces`. Suppress a deliberate case with `zen-allow-surface-on-canvas-alt: <reason>`.

## 12. Icon-only actions show their name as a tooltip (1s hover)

Every action or button that shows only an icon also shows its name as a tooltip:

- **Hover:** it appears after **1s** (`TOOLTIP_HOVER_DELAY`). Within 600ms of another tooltip closing, the next one opens without waiting (moving along a toolbar or rail).
- **Keyboard focus:** it appears **at once** on `:focus-visible`.
- **Touch:** it never appears.
- **Dismiss:** Escape, pointer-down, blur or scroll closes it.
- The text is the control's `aria-label`. It repeats the accessible name, so it is not wired as `aria-describedby`.

How:

- `IconButton` does this by default. Its `tooltip` prop defaults to `aria-label`; pass text for a longer hint.
- Pass `tooltip={false}` only when a visible label sits right beside the button.
- Top/Bottom Navigation actions, Toast/Alert Banner/Inline Message close, Search clear, Tag/Badge remove, icon-only Input slots and the Sidebar collapse/rail have it built in.
- A custom icon-only control uses the hook and portals the tooltip, with no wrapper element:

```tsx
const tip = useIconTooltip(label);
<button aria-label={label} {...tip.bind({ onClick })}>…</button>
{tip.tooltip}
```

- An explicit `<Tooltip>` around a control silences the built-in one, so there are never two.

Harness (`npm run usage:check`):

- `icon-button/tooltip` (warn) flags `tooltip={false}`; allow with `zen-allow-no-tooltip: <reason>`.
- `button/icon-only-raw` (warn) flags a raw `<button>` whose only content is an `<Icon />` without `useIconTooltip`.
