# Zen screen rules, in Figma terms

The rules Zen's designers check a screen against. They summarise `component-usage-rules.md` (the code-side wording,
with the reasons) and the lessons of screens built with AI in Zen files. Variable names are those of the Zen file
(`figma-tokens.md`).

## 1. Surfaces: one pairing per screen

Backgrounds stack in five layers, bottom to top: **Canvas → Surface → other colours → Container → Popover**. Pick the
variable by the layer, never by the look.

Pick the **Canvas** first; it decides the navigation, the boxes and the elevation (the user's theme set on
◆ Performance, Theme-01 … 08, 2026-10-13). Box = Card, List-Box, Metric-Card, Chart-Card (their nested Card is exposed):
one `Theme`, `Surface` and `Color` vocabulary for all of them. A chart (`Chart/*`) draws no surface of its own: it sits
in a Chart-Card's (or a Card's) Content slot, and the box takes the theme.

| Canvas (light / dark) | Header, top bar | Sidebar, bottom bar | Boxes | Shadow |
| --- | --- | --- | --- | --- |
| `Canvas/Default` (#f7f7f7 / #121212) | on the canvas (top bar `Type=Alt` = Surface/Alt) | on the canvas, or a Surface/Default panel | `Theme=Flat` or `Shadow` (Surface=Default); `Border` allowed | only all together: Sidebar `Shadow=Yes` (bottom bar Shadow/Top/Level-1), every box `Theme=Shadow`, standalone charts Shadow/Bottom/Level-1 |
| `Canvas/Alt` (#ffffff / #1c1c1c) | on the canvas (top bar `Type=Default` = Surface/Default) | on the canvas | `Pale` (any `Color`), `Border` (Surface=Default + Pale border), or `Flat` with `Surface=Alt` | none |
| `Canvas/Flat` (#ffffff / #121212) | on the canvas (Surface/Flat) | on the canvas (Surface/Flat) | `Pale`, or `Border` with `Surface=Flat` | none |
| Inside a Modal, Side-Panel or Bottom-Sheet | — | — | `Theme=On-Container` | none |

- "On the canvas" = no fill (desktop Sidebar: the Placeholder fill hidden) or the Surface of the canvas's colour in both
  modes: Canvas/Default ↔ Surface/Alt, Canvas/Alt ↔ Surface/Default, Canvas/Flat ↔ Surface/Flat. A bar on Surface/Default
  over Canvas/Flat melts in light but turns into a #1c1c1c block in dark.
- Why the boxes: Surface/Alt equals Canvas/Default (boxes vanish), Surface/Default equals Canvas/Alt (needs the Pale
  border), Surface/Default equals Canvas/Flat in light (use Pale or a bordered Surface=Flat box).
- One family per screen (Flat, Border or Pale); colours may vary inside Pale (KPI hues).
- No gradient boxes (user, 2026-10-14: the Card Gradient and hue Semi-Pale variants are deleted; Semi-Pale Neutral stays
  only until code drops it): colour is Pale. One widget per row may stand out with `Theme=Solid` or a
  `Support/<Hue>/Subtle` fill.
- A dark widget is `Theme=Solid, Color=Neutral`: `Background/Neutral/Solid` with its content in the Inverse tokens
  (Content/Inverse, Border/Inverse, Button `Level=Inverse`). Never set a colour mode on a component, a card or any layer
  inside a screen to make it dark or light: the screen frame's Light/Dark mode is the only mode switch (user,
  2026-10-14).
- Content on a Solid fill takes the fill's own family (user, 2026-10-17: "Inverse là nằm trên nền neutral solid,
  content phải dùng inverse tokens"; audit `theme/on-solid-content`):
  - `Background/Neutral/Solid` → `Content/Inverse/*`, Dock-Icon and Badge `Theme=Inverse`, Metric-Tile and
    Metric-Trend `Content=Inverse`. An On-Color (White-Solid) chip there turns white-on-white in Dark mode.
  - `Background/Accent/Solid` → `Content/On-Accent/*`, Metric-Tile `Content=On-Accent`.
  - Any other Support, Positive, Negative or Info Solid → `Content/On-Colors`, Metric-Tile `Content=On-Color`.
    Yellow, Sky, Mint, Golden and Warning are bright: `Content/On-Brights`, Metric-Tile `Content=On-Bright`.
  - On Accent and colour solids, Dock-Icons and Badges are `Theme=On-Color`, and Metric-Trend is `Content=On-Color`.
    Never Neutral content on a colour solid, even a light one.
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
| Blocks inside one surface (header → body → actions), stacked form fields, toolbar → table, a control row (Chips, Segmented, Tabs, Search) → the content it controls, cards in a grid | `Spacing/Gap/Medium` | 16 |
| Columns of a layout, groups inside one surface | `Spacing/Gap/Large` | 24 |
| Sections of a page (the Content slot's sections) | `Spacing/Gap/XLarge` | 32 |

- Page margins come from Breakpoint & Grids: `Margin-Comfortable` (24 desktop) and `Margin-Compact` (20 phone).
- **Phone sections:** bind the Body's gap (the frame that stacks the sections under the Top-Navigation) to Component
  Size `Layout-Mobile/Section-Gap`: Compact 24, Comfortable 32, never less (user rule 2026-10-17; audit
  `spacing/section-gap`).
  - The domain picks the Component Size and Typography modes, so a screen must hold up in each: bind sizes and gaps,
    let text wrap or truncate, and keep rows that may grow scrollable.
  - A Body longer than the screen sits in a screen set to scroll vertically, with the bars fixed.
  - A Chip row wider than the screen scrolls horizontally, with 2px block padding for the Chips' shadow.
- The gap between groups is always at least one step larger than the gap inside them. Siblings are spaced by the
  parent's gap, never by empty frames or nudged positions.
- A pair that belongs together sits tight (2XSmall); separate groups get Large.
- **Touch targets (phone and tablet screens).** Every control keeps a 44 × 44 hit area, so a smaller one keeps the
  rest as free space.
  - The gap between two neighbouring controls is at least what each lacks of 44 on that side:
    - Small Chip rows or Small buttons (32) → 12, `Spacing/Gap/Small`;
    - a 32 next to a 40 → 8;
    - a 24 Toggle next to a 32 → 16.
  - Take the larger of this and the ladder step.
  - A control row (Chips, Segmented, Tabs, Search) → the content it controls is `Spacing/Gap/Medium` (16) or more.
  - Audit: `touch/target-spacing`, `spacing/controls-to-content`.
- Accordion: Title → Contents is the Accordion's own gap (Medium and Large `Spacing/Gap/Small` 12, XLarge 16), one step
  more than the 8 between the rows inside it (user rule 2026-10-14). Put the list frame (gap `Spacing/Gap/XSmall`)
  straight in the Contents slot; never pad it to move it off the title.
- Rows of one group go in their own list frame; a panel of groups stacks those frames with gap 0, so a rule (Divider,
  Accordion Divider) always has the same space above and below. Property panel: rule → title 16, title → first row
  12, rows 8, last row → rule 16.
- Nested corners are concentric: inner radius = outer radius − the inset between them (a swatch 10px inside a 12px
  field → 2, `Corner-Radius/2XSmall`; a picker area 12px inside a 16px popover → 4, `Corner-Radius/XSmall`).
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
| Search | `Search/Default`; on phone screens prefer `Shape=Rounded` (a pill; recommended, not required) | a Text-Field with a magnifier |
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

### Learned from the designer's own edits (◇ Master-Layout · Variants, 2026-10-17)

The user rebuilt parts of the generated screens by hand. These are their choices; do the same from the start.

- **A titled section is one frame.**
  - The Section-Header (Heading/4 + Button/Flat Small) and its content sit in one vertical frame with
    `Spacing/Gap/Medium`. A Chip row and the list it filters belong together the same way.
  - Only the sections are children of the Body, spaced by `Layout-Mobile/Section-Gap`. A header that is a Body
    sibling of its own content gets the section gap between them, which reads as two sections.
- **Overlays on a photo** (a heart, a badge, a brand panel, thumbnails, a LIVE tag) sit in a `Wrapper` auto-layout
  frame whose padding is a token (`Spacing/Padding/XSmall` for a button or badge at a corner, `Spacing/Padding/Small`
  for a panel or a thumbnail row). The wrapper is pinned to its corner by constraints, never placed by raw x/y.
- **Card spacing by width:**
  - full-width content cards and two-column cards: `Spacing=Medium`;
  - three-or-more-up tiles (climate, macros): `Spacing=Small`.
- **A device's power** on a detail screen is a `Toggle-Button` XLarge at the start of the status row, with the status
  value block aligned to the end (`counterAxisAlignItems = MAX`).
  - A control that cannot be switched from here shows the Toggle-Button `State=Disabled` (a lock's status).
  - In a grid card, power is a small `Button/Icon-Main` XSmall in the card's bottom row (`SPACE_BETWEEN`, aligned to
    the bottom).
- **Steppers** (− value +) use `Button/Icon-Main` Small Tertiary; the value carries the weight.
- **On a Solid colour band**, a view switch is `Segmented Level=White-Overlay`.
- **A row of shortcut Dock-Icons** (a shop's quick actions) is all `Background=Solid`: the first or main one in
  Accent, the others in supporting hues (Orange, Violet, Cyan, Golden). A row of cards that each lead with a
  Dock-Icon (scenes) keeps Subtle icons, with the main card's icon Accent Solid.
- **A hero action on a Brand Pale stage** (unlock) can be a large `Button/Icon-Main` Surface: white on pale, with an
  Accent label under it.
- **Imagery** is generous: device and product photos fill their card's picture area (108 in a two-column card, about
  260 on a detail screen).
- **The floating Bottom-Navigation's action** is the main create action ("+") unless the screen's job says
  otherwise.

## 5. Checklist after the audit passes (look at the screenshot)

- One clear main action per area; the eye lands on the title, then the main content.
- Left edges line up: the header, the content and every section share one margin.
- The spacing ladder holds: nothing cramped, nothing floating; groups read as groups.
- Nothing clipped (layers or shadows: every frame you added has Clip content off, the audit's `bounds/shadow-clipped`
  is 0), nothing overflowing its parent, no crushed or badly wrapped text, no truncated
  label that matters.
- Real copy everywhere, in one language and one tone; numbers formatted the same way (dates, currency, units).
- Light mode first; if the brief asks for dark, switch the Mode Colors (Semantic) mode on the frame and check again.
