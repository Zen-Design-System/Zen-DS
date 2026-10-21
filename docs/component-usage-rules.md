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

## 3. Inputs: Read-only and Disabled

- **Read-only** is for a value people may read or copy but not change. It shows the committed value, drops the fill, and uses a 1px dashed `Border/Neutral/Subtle` border with `Neutral/Strongest` text. Every input has it.
- **Disabled** (Figma `State=Disabled`, Field-Only 374:103464) exists on Text, Select, Date, Number and Text-Area, and on **Search**, which is a Field-Only instance. Use it only while something else blocks the field (a toggle, a plan, a permission, a running sync) and say why in the help text. It keeps the fill, uses `Input/Border/Disabled`, turns the label, value, placeholder and slot icons `Content/Disabled`, and locks Leading/Trailing pickers (Active=No). Number steppers are disabled; Search hides its clear button and shortcut hint.
- Autocomplete, Rich-Text and Heading have no Disabled in Figma: use Read-only (harness: `input/no-disabled` on Autocomplete and Rich-Text).
- Read-only and Disabled Select and Date keep their chevron and calendar affordances but never open. Read-only Number hides its steppers.

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

In code, Text, Heading and Icon take the token as `tone`, spelled as its path: `Content/Support/Blue/Light` →
`tone="support-blue-light"`, `Content/On-White-Overlay/Base` → `"on-white-overlay-base"`. Neutral drops its name
(`strongest` · `base` · `light`), a single resting token drops `/Default` (`hyperlink`, `on-accent`). Every resting token
has a tone; Hover, Pressed, Visited and Placeholder stay with the components that change state. Older names still work:
`primary`/`secondary`/`tertiary`, `accent` = `accent-base` (also info, positive, negative, warning), `inverse` =
`inverse-strongest`. An Icon without a tone keeps its parent's colour.

### Neutral families: Neutral, Inverse, On-Black-Overlay, On-White-Overlay
The three levels map to the three text roles:

| Level | Role | Use for |
|---|---|---|
| `…-strongest` | Primary | titles, headings, main content, values, primary icons |
| `…-base` | Secondary | body copy, descriptions, Body/Small meta, secondary icons |
| `…-light` | Tertiary | Caption text (always Light), helper text, timestamps, list group headers (Body/Small/Bold kickers), quiet icons |

Titles and headings are Strongest, with one exception: a list group header is a kicker label in Body/Small/Bold and
the Light tone (user decision 2026-10-03: Light is 3.7:1 on Surface and Surface-Alt, above Apple's 3:1 for bold text;
about 7:1 in dark mode), one heading level below the nearest heading above. Group labels inside a Menu, Popover, Select or
Listbox are labels, not headings. Emphasise with weight; use tone to quiet secondary text, never a bigger size.

### Colour families: Accent, Info, Positive, Negative, Warning, Support/*
- `…-strongest` and `…-base` are **regular text**: the Primary and Secondary levels, placed on the same colour's **Subtle** background (subtle Badge, Tag, Alert, callout).
- `…-light` is a **highlight**, used sparingly: short text or icons that must stand out, such as status icons, help or error text under a field, a condition ("Not delivered", "Expires in 5 days"), a ± delta, or a highlighted keyword. Don't use it for body copy. Only the Lights group below never takes Light for text.
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
- `heading/h1-is-heading-1` (error): a content h1 (the title shown large) is at least Heading/1: Heading/1, or a larger
  Display / Display-Extra style on an emphasis page (a home, a welcome), never a smaller style; only the TopNavigation
  compact bar title keeps its bar style (Body/Extra/Bold).
- `heading/title-not-light` (warn): h1–h3 titles never take Light; only a Body/Small/Bold group header uses Base.

Details are in `docs/guidelines/content-colors.md`. The heading ladder (levels, styles, the h1 rule) is on the
platform's Typography › Content hierarchy page and in `docs/guidelines/text.md`.

## 8. Background layers: Canvas → Surface → other colours → Container → Popover

Every background belongs to one of five layers, bottom to top. Pick the token by the layer, not by the look. Full guideline: [background-layers](guidelines/background-layers.md).

1. **Canvas** is always the bottom layer: the page colour. Most designs use `canvas-default`; designs that want a white page use `canvas-alt`. Components never paint Canvas.
2. **Surface** is for cards and containers on the Canvas. Choose `surface-default` or `surface-alt` to suit the page style.
   - On a **`canvas-flat`** page, top and bottom navigation containers use **`surface-flat`**, so the bar and the page stay seamless in both light and dark mode. `surface-flat` is not for cards, except Figma's Card Border × Surface=Flat: a Card `theme="border" surface="flat"` on that page (and the `on-container` card inside an overlay).
3. **Other colours** are component fills (Neutral/Subtle, Support/*, Solid, states) on top of Surface or Canvas.
4. **Container** is only for Modal/Dialog, Modal/Forms and Bottom-Sheet panels.
5. **Popover** is the top layer: popovers, menus, tooltips, pickers, flyouts and toasts.

When nothing picks the pairing, use Canvas/Default with flat Surface/Default boxes (no border, no shadow): §16.

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
| `canvas-flat` | `surface-flat` (Card `theme="border" surface="flat"`) | the Pale border (Figma Card Border × Surface=Flat) |

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

## 13. Spacing between elements: one ladder, picked by the relationship

User rule (2026-10-01): spacing between UI elements follows one logic everywhere, never "each place its own".
Components own their inner padding and gap (Figma tokens); never override them. Between elements, the relationship
picks the step, and the same relationship gets the same step on every screen:

| Relationship | Stack / Grid `gap` | Token |
| --- | --- | --- |
| Two lines of one compact item: a name or value and the caption right under it (a stat over its label, a row's name over its meta line, a person's name over their email) | `3xs` | Gap/3XSmall 2 |
| Pieces of one inline item: icon + text, a Badge beside a title, a cluster of Tags or Badges | `2xs` | Gap/2XSmall 4 |
| A thing and its label or description (label → control, heading → supporting line, kicker → list); controls in one toolbar row (Chips, IconButtons, Search) | `xs` | Gap/XSmall 8 |
| A group acting as one: text Buttons side by side, choices in a group | `sm` | Gap/Small 12 |
| Blocks inside one surface (header → body → actions), stacked form fields, toolbar → table, a control row (Chips, Segmented, Tabs, Search) → the content it controls, cards in a grid | `md` | Gap/Medium 16 |
| Columns of a layout, groups inside one surface | `lg` | Gap/Large 24 |
| Sections of a page (Figma Master-Layout Body › Content) | `xl` | Gap/XLarge 32 |

- Page and screen bodies use the margin tokens (Margin-Comfortable 24 on desktop, Margin-Compact 20 on phones) through
  Container / AppShell.
- **Phone sections** (user rule 2026-10-17) are spaced by `--zen-layout-mobile-section-gap` (Figma Component Size
  `Layout-Mobile/Section-Gap`): Compact 24, Comfortable 32, never less. The domain picks the Component Size and
  Typography modes, and the section gap follows them. Groups inside a section keep their own ladder step.
- A surface is a Card with `spacing` (small 16, medium 24); content inside keeps the surface's inset. A strip inside a
  surface (toolbar, summary, footer) has `sm` block padding and the surface's horizontal inset.
- The gap between groups is always at least one step larger than the gap inside them. Siblings are spaced by the
  parent's gap, never by margins or px.
- Accordion: Title → Contents is the Accordion's own gap (Medium and Large `sm` 12, XLarge `md` 16), one step more than
  the `xs` 8 between rows inside it (user rule 2026-10-14). Put the rows straight in as `<Stack gap="xs">`; never pad
  them to move them off the title.
- Rows of one group sit in their own Stack; a panel of groups stacks them with `gap="none"`, so a rule (Divider, the
  Accordion's divider) has the same space above and below. Property panel: rule → title 16, title → first row 12,
  rows 8, last row → rule 16.
- Checked by the audit's `ladder` warning (`audit.mjs --quality`, run by `npm run qa`). It reads the rendered gaps of
  Stack, Grid and example markup and reports two things:
  - a gap that is not one of the seven steps of the current density (`2xl`, `3xl`, `giant`, padding tokens, px; `3xs`
    joined the ladder on 2026-10-19, the user: Figma spaces two lines of one compact item 2 apart);
  - peer groups laid out alike whose own gap is wider than the gap between them.
  A heading or toolbar above one group is a label → content relationship and is not compared.

### Touch targets on phones and tablets

User rule 2026-10-17: "Đang làm cho mobile nên có rule về vùng chạm tối thiểu để làm spacing cho an toàn".

- Every control on a touch screen has a 44 × 44px hit area. The sources:
  - Apple HIG asks for 44pt, and Zen's mobile Nav-Action is 44.
  - Material asks for 48dp.
  - WCAG 2.5.8 sets 24px as the floor; 2.5.5 asks for 44.
- A control drawn smaller keeps the rest of its 44px as free space: no other control may sit inside it.
  - A Small Chip or Button (32 high) needs 6px free above and below.
  - A 24px Toggle needs 10px.
- Between two neighbouring controls, the gap is at least what each lacks of 44 on that side:
  - two Small Chip rows → 12;
  - a Small Chip above a Medium Button (40) → 8;
  - two Small IconButtons side by side → 12.
- The ladder still picks the step. On touch screens, take the larger of the ladder step and this minimum.
- A control row (Chips, Segmented, Tabs, Search) and the content it controls are blocks (`md` 16), never a label pair
  (`xs` 8): a Chip row is not the heading of the cards under it.
- Checked in Figma by the Zen audit: `touch/target-spacing` (error) and `spacing/controls-to-content` (warning).

## 14. A Table that is not a widget needs no container

User rule (2026-10-01): a Table that is the page's content or a section of it (a list page, a section under its h2, a
toolbar over a table) sits straight on the page background: no Card, Box or other container and no Surface fill.
Only a table that is a widget (a dashboard tile with its own title and a few rows, beside other widgets) goes in a Card.

User rule (2026-10-03): such a table also spans the page width, with no max width. A page whose content is (or holds a
section that is) a non-widget Table uses `<Container maxWidth="full">`, not the default `lg` (1280 px), so the table
fills the main area at every window width; the gutter stays. Widen the whole page's Container, not only the table
section, so every block keeps the same left edge. Content that needs a readable width keeps its own cap (PageHeader
description 72ch, EmptyState 320 px, toolbar Search 320 px). Widget tables, detail pages whose table sits in a Card
beside an aside, forms (`sm`/`md`) and dashboards (`lg`) keep their width.

## 15. Grouped lists read as groups

User rule (2026-10-02): a screen with several groups of rows (settings, preferences, profile, account) is an inset
grouped list, never thin kicker labels over one long run of rows on a single white surface.
- Phone: the screen is Surface-Alt (`canvas="alt"`, TopNavigation `type="alt"`); each group is a white Surface block
  with its kicker header above it, aligned with the row text. Kicker → block `xs`, group → group `lg`. No border or
  shadow: white on Surface-Alt already separates them. The block never pads the rows (2026-10-06, Figma List-Item:
  every row, Interactive=Yes or No, pads Padding/Small 12px above and below, none at the sides; a clickable row's fill
  covers its height and hangs 12px past it sideways):
  - each block is a `<ListBox>` (Figma Component/List-Box, 2026-10-06: one component for every device, only the tokens
    change by mode): Corner-Radius/2XLarge 24px, body padding Card-padding-medium sideways (20px on a phone, 24px on
    desktop) and List-Container-Vertical-Padding above and below (8px / 12px), rows Gap/3XSmall apart. The fill sits 8px
    (phone) / 12px (desktop) from every edge, concentric with Interactive-List-Item-Radius (Large 16px on a phone, Base
    12px on desktop); kicker `Box paddingX="lg"` on a phone (20px), `paddingX="xl"` on desktop (24px);
  - blocks that are not List-Items (a DescriptionList, labelled Toggles) take a `<Card theme="flat">` (user rule
    2026-10-06: ListBox is only for List-Item rows); its Card-padding-medium and 2XLarge corner match the ListBox, so
    every group on the screen still shares one inset and one corner.
  - on the Surface-Alt screen the ListBox stays `theme="flat"` (the default): white on Surface-Alt needs no frame.
- Desktop: one Card per group (Heading/Subheading title) or a Heading/4 section over a bordered List.

## 16. Default pairing: Canvas/Default + flat Surface/Default

User rule (2026-10-06): when no rule below picks the pairing, an example sits on **Canvas/Default** and its containers
are **Surface/Default with no border and no shadow**. Every example then shares one mood, so code copied from any of
them looks like the same product, and an AI building a screen with no other brief starts here. Reference: Card ›
Workspace plan (the pricing cards).

- The example stage paints Canvas/Default (`.pe-card__stage` in platform.css), desktop `screen` cards, playground stages
  and phone screens (`PlatformPhone` by default) included. The audit warns on a Surface/Default box on it with a border or
  a shadow (`roles`, quality-checks.mjs; phones and shells are not checked yet). A page
  inside an example never paints its own white background.
- Boxes on it: Card `theme="flat"`, MetricCard `theme="flat"`, ChartCard (flat by default), `ListBox` (flat by default), or a
  `Box surface="surface"` without `border`. White on Canvas/Default separates the box in light and dark mode, so it
  needs no frame.
- What is not a box sits straight on the canvas: a Segmented and its caption, a form, a Table (§14), an EmptyState.

Conditions that pick something else win over the default:

| Condition | Pairing |
| --- | --- |
| A screen with a Sidebar (AppShell, templates) | Elevation follows the Sidebar: the default Sidebar on Canvas/Default takes Card `theme="shadow"` and ListBox `theme="shadow"`; a white Canvas/Alt with an Alt or Flat Sidebar takes bordered cards and ListBox `theme="border"` |
| A white page: Canvas/Alt, or a white phone screen (`PlatformPhone canvas="surface"`; phone screens default to Canvas/Default since 2026-10-07 and then follow this section) | §11: a Pale border (Subtle when actionable; ListBox `theme="border"`) or `surface="alt"`; grouped lists on a Surface-Alt phone screen follow §15 (flat ListBox) |
| A Card or ListBox inside a Modal (Dialog, ModalForm), a SidePanel or a BottomSheet (user rule 2026-10-12; harness `card/on-container-in-overlay`, `listbox/on-container-in-overlay`) | `theme="on-container"`: Surface/Flat on the panel's Container fill (white on light grey in light mode, dark-neutral-1 on dark-neutral-2 in dark), no border, no shadow |
| A Surface box inside another Surface (a card in a card or in a ListBox) | Same colour, so it takes the Pale border (§6; ListBox `theme="border"`), or a Surface-Alt / Pale fill |
| A clickable card (`onClick`, choice tiles) | `theme="border"`: the Subtle stroke and its Hover/Pressed are the affordance (§6); Flat has no hover state |
| The selected card | `selected` (2px Card/Border/Active) on whatever theme the card has |
| An example whose subject is a Card theme or a white page | The theme it demonstrates |

```tsx
// ✅ no condition: grey canvas, white flat cards
<Grid columns={{ mobile: 1, desktop: 3 }} gap="md">
  <Card as="section" theme="flat" aria-labelledby={titleId}>…</Card>
</Grid>
// ❌ a frame or an elevation nothing asks for
<Card theme="border">…</Card>          // on the stage: no white page, no Surface behind it
<MetricCard theme="shadow" … />        // no Sidebar sets the screen's elevation
```

Not machine-checked yet; the brief (`docs/research/example-rebuild-brief-2026-09-30.md` §3) and
`docs/guides/example-patterns.md` §3 repeat it for example authors.

## 17. One page, two layouts: the desktop header becomes the phone's Top Navigation

User rule (2026-10-16; spec `docs/research/responsive-header-spec-2026-10-16.md`, skill
`skills/zen-responsive-screens`). A page that runs on desktop and on phones keeps **one set of parts and moves each
one to its place**. Nothing is dropped: every action the desktop header offers is reachable on the phone.

| Layout | Width (`useZen().breakpoint`) | Chrome |
| --- | --- | --- |
| Desktop | ≥ 1024 | AppShell's `pattern` (Figma Pattern/AppShell/Desktop): the Sidebar, panes, `header={<AppShellHeader …/>}` (Figma Header/AppShell: the top row and the Main row) |
| Mobile | < 1024 with mobile parts (an upright iPad too) | AppShell `topNavigation` + `bottomNavigation` or `actionBar` (Figma Pattern/AppShell/Mobile, Top-Navigation/Mobile, Bottom-Navigation, Action-Bar/Mobile): they replace the header; the Sidebar still opens as the drawer (`useAppShell().openNav()`) |
| Drawer | < 1024 without mobile parts | The header; the Sidebar opens as a drawer from the Menu button |

**The screen's kind picks the bar** (top-navigation-mobile-rules §1): a **root** (a Sidebar destination: no `back`,
Breadcrumbs of one item or none) is `type="default"` with `largeTitle` and the BottomNavigation; a **child** (Breadcrumbs
of two or more, or `back`) is `type="compact"` with the Back chevron and the bar `title`, without the BottomNavigation;
a **modal or form** screen has Close and its Primary in an ActionBar footer.

| Desktop part | On the phone |
| --- | --- |
| Sidebar items | BottomNavigation from the top-level rows in order (group titles and sub-rows skipped): up to 5 map one to one; more than 5 → the first 4 + More (the full list in a sheet) |
| Sidebar brand, footer rows (Settings), collapse toggle | the account sheet or More, never the bar |
| Breadcrumbs | root: none · child: Back chevron to the parent crumb (§10). AppShellHeader's top row and PageHeader do this themselves under 744 (the drawer layout, or a mobile breakpoint) |
| PageHeader `title` | root: `largeTitle` and `title` (the folded bar) · child: `title` |
| PageHeader `description`, `meta` | the first block of the content |
| PageHeader `tabs` | `controlBar`: Tabs or Segmented `fullWidth` |
| PageHeader Primary | a list root: a trailing "+" action labelled as the button · a detail or form: ActionBar footer |
| PageHeader Tertiary and Danger buttons | ⋯ More → an action BottomSheet (Danger last) |
| Top bar Search | a list root: `controlBar` Search + `searchAction` · elsewhere: a Search trailing action |
| Notifications (`AppShellAction`) | root: a trailing action with `dot` (a count becomes the dot) · child: none (a child's trailing holds only that screen's actions) |
| Other `AppShellAction`s, the plan Badge | root: ⋯ More or the account sheet · child: none |
| Account (`AppShellAccount` + Menu) | root: the avatar in `leading`, opening the account menu as an action BottomSheet · child: none (Back holds `leading`) · none when the BottomNavigation has a Profile tab |
| Control-bar row: Search + filter Chips | `controlBar` Search; the Chips → a scrolling Chip row at the top of the content |
| `floatingActions`, a task's ActionBar | stay: the floating actions hide on scroll; the ActionBar becomes AppShell `actionBar` (Figma Bottom=Actions) |
| `sidePanel` (SidePanel) | a pushed screen or a BottomSheet `size="max"` |
| `banner` | TopNavigation `banner` |

Rules:

1. **Three trailing places** (Figma Trailing-Slot holds 3; a `searchAction` takes one once the Search folds). By
   priority: the Search action, "+" (a root), notifications, ⋯ More. With more candidates than places, More takes the
   last place and holds the rest (with a `dot` when an item in it has one).
2. **Every desktop header action is reachable on the phone**: in the bar, More, the footer, the account sheet or the
   More tab. A part meant for one layout only is hidden on the other on purpose (Studio: Hide on mobile / desktop; code:
   the breakpoint from `useZen()`), never lost in the mapping.
3. **One h1.** The page title lives in the AppShellHeader's `main` (never in the content), so the phone hides that
   PageHeader and the TopNavigation title is the h1 (top-navigation-mobile-rules R12).
4. **Same words.** `title` / `largeTitle` = the PageHeader title; a root's title = its BottomNavigation label (R13); a
   trailing action's label = the desktop button's.
5. **One way to create.** The Primary becomes "+" or the Action bar, never both; a `floatingActions` "+" counts as that way.

```tsx
<AppShell
  sidebar={<Sidebar aria-label="Main" selectedId="expenses">…</Sidebar>}
  header={
    <AppShellHeader
      leading={<Search aria-label="Search" placeholder="Search expenses" />}
      actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={4} /><Menu trigger={<AppShellAccount name="Khoa Dang" />} items={account} /></>}
      main={<PageHeader title="Expenses" actions={<Button level="primary">New expense</Button>} />}
    />
  }
  topNavigation={
    <TopNavigation title="Expenses" largeTitle="Expenses" leading={<AppShellAccount name="Khoa Dang" onClick={openAccount} />}
      trailing={[{ icon: "icon-plus-line", label: "New expense" }, { icon: "icon-bell-01-line", label: "Notifications", dot: true }]}
      controlBar={<Search aria-label="Search" placeholder="Search expenses" />} searchAction={{ onClick: focusSearch }} />
  }
  bottomNavigation={<BottomNavigation value="expenses" items={[home, expenses, approvals, cards, more]} />}
>
  …
</AppShell>
```

Zen Studio draws a Screen's phone parts from its desktop AppShell by this table: they stay linked to the desktop until
you edit them on the phone (Reset to desktop links them again), and the export writes them as the AppShell's
`topNavigation` / `bottomNavigation`. Harness: `app-shell/page-header-in-main`, `app-shell/top-navigation-title`
and the TopNavigation rules (`top-navigation/*`).

## 18. A count is a BadgeCounter

A number that counts something and stands on its own (unread messages, items in a section or folder, filters applied,
pages in a list, variables in a group) is a **BadgeCounter** (Figma Badge-Counter): the round pill whose min width
equals its height, Neutral Subtle beside a label, capped at "99+" and hidden at zero. Never a `Badge` holding a number,
never bare text beside the label. A count inside a sentence ("3 files", "12 of 40") stays text.

- **Applies to:** `Badge` children that are a number or a count expression, and a `span` / `Text` whose class names a
  count and that holds only a number or a count expression.
- User rule 2026-10-18: "Luôn ghi vào harness và rule là các badge dùng số đếm luôn dùng badge counter".

```tsx
// ✅
<BadgeCounter value={items.length} size="xs" theme="neutral" background="subtle" />
// ❌
<Badge size="small">{items.length}</Badge>
<span className="panel__count">{items.length}</span>
```

Harness (`npm run usage:check`): `badge/count-uses-counter` and `badge/count-text-uses-counter` (errors). Figma audit
(`skills/zen-figma-design`): `badge/count-uses-counter` on a Badge instance whose label is a number.

## 19. A list that closes a phone page is an open section

User rule 2026-10-21: "nếu list-box (hoặc danh sách các list item) nằm cuối trang ở mobile thì không bỏ vào list box mà
đưa thành 1 danh sách nối thành 1 section giống trong example Finance trong Figma", and "cuối trang nghĩa là bên dưới nó
không nằm trong grid của các widget, mà là 1 danh sách độc lập liệt kê như task, transaction".

On a phone, the list that ends the page (transactions, tasks, activity, courses, doctors: rows that run on and scroll
with the page) is not a `ListBox`. It joins the page as one open section, as Figma's `◆ Finance` Transactions
(4595:17267):

- **Title row:** the section's heading (Figma Heading/4, `<Heading level={2} textStyle="Heading/4">`; a kicker when the
  screen's other sections use kickers) with its See all `Link` at the end (underlined text, not a button: the ListItem
  guideline).
- **Rows:** a `<List>` of `ListItem`s straight on the screen's Canvas, at the page margin: the AppShell body pads
  Margin/Comfortable already; on a bare `PlatformPhone` screen wrap the section in `<Box paddingX="lg">`. Title row →
  rows `md` (Figma: Padding/Medium under the heading); a kicker keeps its `xs`. Rows keep their own 12px; a clickable row's fill hangs 12px past
  them, 8px from the screen edge (Figma's Interactive-Background, 374 on a 390 screen).
- **What stays boxed:** a list in a grid or row of widgets (a dashboard tile beside other tiles), a list inside a Card,
  sheet, dialog or panel, a list with more content after it, and grouped lists (§15: settings, profile, several groups
  each under its kicker). Desktop and tablet keep the ListBox.

```tsx
// ✅ the last section of a phone screen (inside AppShell: the body already pads the page margin)
<Stack as="section" gap="md" aria-labelledby={transactionsId}>
  <Stack direction="row" justify="between" align="center" gap="xs">
    <Heading level={2} id={transactionsId} textStyle="Heading/4">Transactions</Heading>
    <Text as="span" textStyle="Body/Base/Medium"><Link href="/transactions" tone="inherit">See all</Link></Text>
  </Stack>
  <List aria-labelledby={transactionsId}>{rows}</List>
</Stack>
// ❌ the same list closing the phone screen in a box
<ListBox as="section" aria-labelledby={transactionsId} header={titleRow}><List aria-labelledby={transactionsId}>{rows}</List></ListBox>
```

Harness (`npm run usage:check`): `listbox/closing-list-on-phone` (error) on a ListBox in a `PlatformPhone` or a Studio
`<Screen device="phone">` with nothing after it, outside any Grid, row Stack or box, and not a §15 group. Figma audit
(`skills/zen-figma-design`): `list-box/closing-list-on-phone` on a phone screen's last List-Box.
