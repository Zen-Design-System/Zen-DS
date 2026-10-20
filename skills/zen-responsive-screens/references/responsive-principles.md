# Responsive and adaptive principles for Zen screens

**These are principles, not rules.** The desktop-to-phone mapping and its rules are §17 of the usage rules
(`docs/component-usage-rules.md`; `references/component-usage-rules.md` in the Figma AI kit) and the
`zen-responsive-screens` skill; the harness and the Figma audit check those. This file is the thinking behind them, for
the decisions they leave open: how a layout should change with the space, what to keep, what to move. Nothing here is
machine-checked. When the brief, a Zen template or the designer's own edit chooses differently, follow them and say
why in the report.

Sources: Material 3 and Android (window size classes, canonical layouts, adaptive navigation); Microsoft Windows
(responsive design techniques); Apple HIG (Layout: size classes, safe areas, Dynamic Type); WCAG 2.2 (1.4.4 Resize
Text, 1.4.10 Reflow, 1.4.12 Text Spacing, 2.5.8 Target Size); intrinsic web design (container queries, breakpoints
set by the content). Colour and composition: `design-principles.md` (in the repo: `skills/zen-component-usage/references/`;
in the Figma AI kit it sits next to this file).

## 1. Two tools: responsive and adaptive

- **Responsive:** one layout whose content flows with the space: it resizes, wraps and reflows. It is cheap and keeps
  the layouts consistent, so it is the default.
- **Adaptive:** a different structure at a breakpoint: a component is replaced, panes are rearranged. Use it when
  flowing is no longer enough: the navigation, a list beside its detail, a table that must become a list.
- **Zen does both.** Tokens, Stack, Grid and the components' sizing are responsive. AppShell's chrome is adaptive: the
  Sidebar beside the page, then a drawer, then the phone's TopNavigation and BottomNavigation.
- **Take the cheapest technique that works** (Microsoft's ladder):

  | Technique | What changes | Zen example |
  | --- | --- | --- |
  | Reposition | where a part sits | page actions move from the header to the phone's footer ActionBar |
  | Resize | margins and sizes | `margin-comfortable` is 24 on desktop and 20 on a phone |
  | Reflow | the number of columns, the flow | Grid `columns={{ mobile: 1, desktop: 3 }}`, a row that wraps |
  | Show / hide | how much secondary detail shows | table columns, metadata, the labels of secondary icon buttons |
  | Replace | the component | Sidebar → BottomNavigation, a Popover → a BottomSheet |
  | Re-architect | the panes and the screens | list and detail side by side → two screens with Back |

  Every step down the ladder costs consistency between the layouts. Whatever you choose, keep one set of parts and
  move each part to its place (the `zen-responsive-screens` skill, §1).

## 2. Decide by the space you have, not by the device

- **Zen's size classes:** Mobile under 744, Tablet from 744 to 1023, Desktop from 1024 (ZenProvider
  `breakpoint="auto"` sets the layout tokens by them). The design frames are 390 × 844, 744 × 1133 and 1512 × 982
  (Breakpoint & Grids). They sit close to Material 3's window classes (compact under 600, medium to 839, expanded to
  1199, large to 1599, extra-large from 1600) and to Apple's compact and regular widths.
- **A size class is the room the UI has, never "is this a tablet".** Split view, a resized window, a foldable or a
  docked side panel change it while the app runs. Android says size classes are explicitly not for isTablet logic.
- **Orientation is a hint at most.** A phone in landscape is wide but short (compact height): two panes and tall fixed
  bars do not fit there. Zen's tablet follows its orientation (user, 2026-10-18): portrait takes the phone structure
  (Top and Bottom navigation), landscape the desktop structure. AppShell decides by its own width; its JSDoc gives
  the current thresholds.
- **A component adapts to its own width.** AppShell measures itself; Grid `stackBelow` stacks by the Grid's width, not
  the page's. A card in a 360px SidePanel should look like the phone card, not the desktop one. In CSS that is a
  container query; in Figma, Fill with a min and max width.
- **Breakpoints come from the content.** Put a local breakpoint where the content breaks (a label wraps badly, a Chip
  row no longer fits, a table loses its key column), not at a device width.

## 3. Pick a canonical layout and know how it folds

| Layout | Use it for | Wide | Narrow |
| --- | --- | --- | --- |
| List and detail | items whose detail stands on its own (inbox, orders, people) | the list at a fixed width, the detail filling the rest | the list, then the detail on its own screen with Back; the selection is kept |
| Supporting pane | main content plus content that means something only beside it (comments, properties, filters) | main about two thirds, the pane about one third; a SidePanel docks while the page keeps 744 beside it | the pane becomes a BottomSheet or a modal SidePanel, opened by a control |
| Feed | many equal items (products, posts, cards) | more columns (Grid `minColumnWidth` fits as many as the width allows) | one column; a featured item spans the row |
| Dashboard (Zen) | summary numbers and one main view | a KPI row, the main chart or table, a side list | KPIs two up or in a scrolling row, then the main view, then the lists |
| Form or record | reading or editing one thing | a readable column (cap its width) with an aside for help or a summary | one column; the Primary in a footer ActionBar |

The first three are Material 3's canonical layouts; the dashboard and form rows are Zen's common screens.

## 4. Navigation follows the width; the destinations stay the same

- **Phone:** BottomNavigation (up to 5 destinations, or the first 4 and More) with a TopNavigation. **Desktop and
  landscape tablet:** the Sidebar, which collapses to its rail. Material says the same: a bar on compact windows, a
  rail from medium, an expanded rail or a drawer on large ones.
- **The same destinations, labels, order and icons on every layout**; only their container changes. Someone who
  learned the app on the desktop finds everything on the phone.
- **One way to create per layout:** a "+" in the bar or the floating action, not both.

## 5. When the space shrinks, rank the parts; never lose a function

- **Rank every part before you start:** must have (the job), should have (it helps), nice to have (context). A
  narrower layout removes from the bottom of the list:
  1. decorative imagery and secondary metadata;
  2. the labels of secondary icon buttons (the tooltip and the accessible name stay);
  3. secondary actions, which move into More (an action BottomSheet).
- **Hide presentation, never capability.** Every action and every piece of information on the desktop is reachable on
  the phone. WCAG 1.4.10 asks the same at 320 CSS px: no loss of information or function, and no scrolling in two
  directions except for content that needs it, such as a data table.
- **On a wide screen, use the space to save navigation** (Microsoft): the detail beside the list, the summary beside
  the form, more metadata in the table's columns.
- **Don't stretch.** A reading column stays around 45 to 75 characters and a card keeps a sensible maximum width. Extra
  width becomes columns, panes or margin.

## 6. Keep the user's place

- **A size change keeps the state.** Rotating, resizing, folding or splitting keeps the selection, the scroll position,
  the open tab and any draft. When list and detail fold into one pane, the open detail stays on screen, with Back to the
  list.
- **Overlays fold too, with the same content in the same order.** A desktop Popover is often a BottomSheet on the
  phone (filter Chips open an action BottomSheet). A Dialog holding a long form becomes a full-height sheet.

## 7. Adapt to the input, not only to the width

- **Touch** (a coarse pointer):
  - a 44 × 44 hit area for every control, with room between neighbours (screen rules §2);
  - the main actions within thumb reach: a footer ActionBar or the floating action;
  - nothing that only hover reveals: a row action that appears on hover needs a visible ⋯ on touch.
  Decide this with the `(hover: hover)` and `(pointer: coarse)` media features, not with the width: a laptop with a
  touch screen is wide and touchable.
- **Pointer:** denser layouts are fine (Compact density), hover may reveal secondary actions, and tooltips show after
  one second.
- **Keyboard:** the same order and the same shortcuts at every width; nothing only a mouse can reach.
- **Density and type follow the domain and the input:** Compact with Typography Dashboard for desktop data work,
  Comfortable with Typography Mobile for touch-first phones. A screen should hold in both: bind sizes to tokens, let rows
  grow, never fix a height around text.

## 8. Let the content flex

- **Text wraps by default.** Truncate only secondary text that can be read another way (a tooltip, the detail
  screen). Titles, prices, statuses and errors are never cut silently.
- **Respect the reader's text settings.** Text at 200% (WCAG 1.4.4), wider spacing (1.4.12) and Dynamic Type must not
  clip anything: no fixed heights around text. Widths in `ch` grow with the Typography mode, so keep them in `ch`
  instead of turning them into px.
- **Tables on phones: decide by the task.**
  - When people compare across columns, keep the table, with a horizontal scroll inside its own region.
  - When people look up one record, turn the rows into ListItems with two or three key fields.
- **Images:** keep the subject's aspect ratio, and crop for the narrow layout instead of shrinking the text over an
  image.
- **Fixed bars cost height.** On a short screen (a phone in landscape), a top bar, a control bar and a footer leave
  little room for content: let the control bar scroll away with the content.
- **Safe areas:** backgrounds may run under the status bar and the home indicator; content and controls stay inside
  the safe area.

## 9. Look at the widths in between

- **Check the reference widths** (390, 744, 1024, 1512) **and the widths between them** (360, 600, 900, 1280).
  Layouts break between breakpoints, not on them.
- **Check the edges:** 320 wide (reflow), a phone in landscape, 200% text, dark, Comfortable density.
- **How:** `npm run qa` shoots 1512 and 390; take other widths with `npm run platform:shoot -- <page> --width=<px>`. In
  Figma, resize the frame (Fill and Hug should carry it) and set the frame's Breakpoint & Grids and Component Size
  modes. In Zen Studio, switch the Screen between desktop and phone.

Questions to ask of every layout:

- Does each width tell the same story in the same order?
- Is anything reachable on only one layout?
- Does the wide layout use its space to show more, or does it only stretch?
