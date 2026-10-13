# Zen screen rules, in Figma terms

The rules Zen's designers check a screen against. They summarise `component-usage-rules.md` (the code-side wording,
with the reasons) and the lessons of screens built with AI in Zen files. Variable names are those of the Zen file
(`figma-tokens.md`).

## 1. Surfaces: one pairing per screen

Backgrounds stack in five layers, bottom to top: **Canvas → Surface → other colours → Container → Popover**. Pick the
variable by the layer, never by the look.

Pick the **Canvas** first; it decides the navigation, the boxes and the elevation (the user's theme set on
◆ Performance, Theme-01 … 08, 2026-10-13). Box = Card, List-Box, Metric-Card, Chart-Card (their nested Card is exposed)
and a standalone chart (Bar, Donut, Radial, Heatmap): one `Theme`, `Surface` and `Color` vocabulary for all of them.

| Canvas (light / dark) | Header, top bar | Sidebar, bottom bar | Boxes | Shadow |
| --- | --- | --- | --- | --- |
| `Canvas/Default` (#f7f7f7 / #121212) | on the canvas (top bar `Type=Alt` = Surface/Alt) | on the canvas, or a Surface/Default panel | `Theme=Flat` or `Shadow` (Surface=Default); `Border` allowed | only all together: Sidebar `Shadow=Yes` (bottom bar Shadow/Top/Level-1), every box `Theme=Shadow`, standalone charts Shadow/Bottom/Level-1 |
| `Canvas/Alt` (#ffffff / #1c1c1c) | on the canvas (top bar `Type=Default` = Surface/Default) | on the canvas | `Pale`, `Semi-Pale` (any `Color`), `Border` (Surface=Default + Pale border), or `Flat` with `Surface=Alt` | none |
| `Canvas/Flat` (#ffffff / #121212) | on the canvas (Surface/Flat) | on the canvas (Surface/Flat) | `Pale`, `Semi-Pale`, or `Border` with `Surface=Flat` | none |
| Inside a Modal, Side-Panel or Bottom-Sheet | — | — | `Theme=On-Container` | none |

- "On the canvas" = no fill (desktop Sidebar: the Placeholder fill hidden) or the Surface of the canvas's colour in both
  modes: Canvas/Default ↔ Surface/Alt, Canvas/Alt ↔ Surface/Default, Canvas/Flat ↔ Surface/Flat. A bar on Surface/Default
  over Canvas/Flat melts in light but turns into a #1c1c1c block in dark.
- Why the boxes: Surface/Alt equals Canvas/Default (boxes vanish), Surface/Default equals Canvas/Alt (needs the Pale
  border), Surface/Default equals Canvas/Flat in light (use Pale / Semi-Pale or a bordered Surface=Flat box).
- One family per screen (Flat, Border, Pale or Semi-Pale); colours may vary inside Pale / Semi-Pale (KPI hues).
  Gradient / Solid are highlight widgets, one per row.
- Library gaps until the designer adds them (override by variable, never raw): Side-Bar/Master/Basic has no background
  variant, Top-Navigation/Mobile has no Flat type, Bottom-Navigation has no surface choice and carries an unstyled
  shadow (remove it unless the screen is elevated).

- Container is only for Modal/Dialog, Modal/Forms and Bottom-Sheet panels; Popover only for popovers, menus,
  tooltips, pickers and toasts.
- No drop shadow on a Subtle, Pale or Surface-Alt fill, and none at all on Canvas/Alt or Canvas/Flat. A white box on a
  white page needs a border; a shadow alone does not count.
- What is not a box sits straight on the canvas: a form, a Table, a Segmented with its caption, an Empty-State.

## 2. Spacing: one ladder, picked by the relationship

Components own their inner padding and gap; never change them. Between elements, the relationship picks the step:

| Relationship | Variable | px |
| --- | --- | --- |
| Pieces of one inline item: icon + text, a Badge beside a title, a cluster of Tags | `Spacing/Gap/2XSmall` | 4 |
| A thing and its label or description; controls in one toolbar row (Chips, icon buttons, Search) | `Spacing/Gap/XSmall` | 8 |
| A group acting as one: text buttons side by side, choices in a group | `Spacing/Gap/Small` | 12 |
| Blocks inside one surface (header → body → actions), stacked form fields, toolbar → table, cards in a grid | `Spacing/Gap/Medium` | 16 |
| Columns of a layout, groups inside one surface | `Spacing/Gap/Large` | 24 |
| Sections of a page (the Content slot's sections) | `Spacing/Gap/XLarge` | 32 |

- Page margins come from Breakpoint & Grids: `Margin-Comfortable` (24 desktop) and `Margin-Compact` (20 phone);
  a phone section steps down to Large.
- The gap between groups is always at least one step larger than the gap inside them. Siblings are spaced by the
  parent's gap, never by empty frames or nudged positions.
- A pair that belongs together sits tight (2XSmall); separate groups get Large.
- Surfaces use `Card-padding-medium` / `Card-padding-small`; a strip inside a surface (toolbar, summary, footer) has
  `Spacing/Padding/Small` above and below and the surface's own side inset.

## 3. Component choice

| Need | Zen component | Not |
| --- | --- | --- |
| The main action of an area | `Button/Main` Level=Primary, one per area; the default pair is Tertiary + Primary | two Primaries side by side |
| Other actions (Cancel, Export, toolbar) | `Button/Main` Level=Tertiary; icon-only: `Button/Icon-Main` with a Tooltip | Secondary without a reason (it is rare); Accent outside upsell or onboarding |
| Destructive action | Level=Danger or Danger Subtle | a red-painted Primary |
| Filter, sort, scope, status, owner, period | `Chip/Advanced` (with its popover), in the header's `Type=Control-Bar` row | a Button or a Segmented |
| Switching views or sections | `Segmented` or `Tab-Bar` | Chips |
| Search | `Search/Default` | a Text-Field with a magnifier |
| A list of people, items, approvals, settings | `Component/List-Box` holding `List-Item` rows | a Card with hand-made rows |
| Tabular data | Table cells (`Table/Cell/*`, `Primitives/Table/*`) on the canvas, full width | a Table inside a Card (unless it is a dashboard widget) |
| A number that matters (KPI) | `Metric-Card` / `Primitives/Metric/*` | a Card with big text |
| Status | `Badge` (short state) or `Tag` (removable label) | coloured text |
| Free text (notes, brief, description) | `Input/Text-Area` | a Text-Field |
| A date | `Input/Date-Field` (calendar icon, dd/mm/yyyy) | a Text-Field |
| A choice from a list | `Input/Select-Field`, `Input/Autocomplete-Field` | a Chip in a form |
| Details of a record | `Description List` in a Card | label/value text pairs |
| Long grouped settings (a permission matrix) | one `Accordion/Text` per group (title "Group · N items", first open) | stacked tables |
| Feedback after an action | `Toast-Message`; on the page: `Inline-Message`, `Alert-Banner` | a coloured box |
| Nothing to show | `Empty-State` | an empty table |
| Loading | `Skeleton/*` | a spinner over the page |
| A record's side details | `Side-Panel` | a Modal for reading |
| Confirm or a short form | `Modal/Dialog`, `Modal/Forms` | a Side-Panel |
| Back on phone and tablet | the left chevron in `Top-Navigation/Mobile` | an arrow |

Pick each component's guideline (`guidelines/<slug>.md`) before placing it.

## 4. Patterns that went wrong before (check them every time)

- **Header control bar.** Filters, the period picker and the search sit in the header's `Type=Control-Bar` row, not
  in the content. A period picker is a Chip/Advanced, never a Button.
- **Sidebar selection.** Every page shows its current row with `Select=Yes`. A selected child opens its parent group
  (children visible, chevron up), and child rows carry no icon. Child rows (`Level=Child`) go in a gap-0 `Child` frame
  after the parent row, as Zen's HR-Platform sidebar does. Check the selection on every frame, not only the new one.
- **Tables.** On the canvas and full width. Inside a surface (Card, Accordion, Side-Panel, Modal) the last row has no
  bottom stroke. A table row's ⋯ gets a state frame with its popover open. An editable cell holding a value sets its
  nested input to `State=Typing`.
- **Solid by default** in tables and metrics: the Avatar in an Avatar-Cell and the Dock-Icon of a Metric-Card use
  `Background=Solid`; their icon or initials then take On-Colors from the variant (never paint them).
- **Side-Panel content.** Group it like a phone settings screen: a kicker over each block, blocks with
  `Theme=On-Container` (Card or List-Box), people as List-Items, the header through the panel's Header-Contents slot
  with a 44px Dock-Icon, the body set to fill so Actions sit at the bottom, and content ending above them.
- **Grouped lists (settings, profile).** Phone: a Surface-Alt screen, each group a white List-Box under its kicker
  (kicker → block XSmall, group → group Large), no border or shadow. Desktop: one Card per group, or a Heading/4
  section over a bordered list.
- **Text colours** (`Color/Content/*`): pick the family, then the level by role. Neutral: Strongest for titles,
  headings, values and primary icons; Base for body copy and descriptions; Light for captions, helper text,
  timestamps and list group kickers (Body/Small/Bold). Colour families (Accent, Positive, Negative, Warning, Info,
  Support): Strongest/Base as text on their own Subtle background, Light only as a sparing highlight (a status, an
  error under a field, a ± delta). Emphasise with weight, quiet with the level, never with opacity or a bigger size.
- **Icon-only actions** have a Tooltip (it shows after 1 s of hover).

- **Card shadows.** A row or section frame you add around Shadow cards (Metric-Card, Card, Chart-Card) must not clip:
  `createAutoLayout()` turns Clip content on, and the cards' shadows were cut on a dashboard (user, 2026-10-13). The
  page pattern's own frames leave room (Body padding); your frames must not take it away.

## 5. Checklist after the audit passes (look at the screenshot)

- One clear main action per area; the eye lands on the title, then the main content.
- Left edges line up: the header, the content and every section share one margin.
- The spacing ladder holds: nothing cramped, nothing floating; groups read as groups.
- Nothing clipped (layers or shadows: every frame you added has Clip content off, the audit's `bounds/shadow-clipped`
  is 0), nothing overflowing its parent, no crushed or badly wrapped text, no truncated
  label that matters.
- Real copy everywhere, in one language and one tone; numbers formatted the same way (dates, currency, units).
- Light mode first; if the brief asks for dark, switch the Mode Colors (Semantic) mode on the frame and check again.
