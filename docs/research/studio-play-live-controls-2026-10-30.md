# Play: choice controls act live (W-52 phase A) — spec card, 2026-10-30

Walk finding W-52 ([studio-prototype-walk-2026-10-29.md](studio-prototype-walk-2026-10-29.md) §4 item 8), approved by
the user on 2026-10-30 as "A first, B later". **A** (this card): Zen's choice controls act in Play with no setup.
**B** (later, its own design doc): page variables, Set variable, props bound to variables (Figma's model). Not here:
B, W-51 (smart animate, easing), W-58 (chained actions, validation). Screen states (`state` on Screen) are not needed.

**The failing case.** A phone Screen has a Chip "Date" that opens a Bottom Sheet listing time ranges; "Any time" carries
the ✓. Picking "Last 3 months" in Play left the ✓ on "Any time" and the chip still read "Date".

## 1. What acts live

Tier M. One store: `PlayLive` (`builder/proto/runtime.tsx`), the shown Screen's live state that Filter table and Change
step already use, gains `controls` (a value by the layer's place) and the page's `choices` (below). Everything the page
writes is the **start**; Play overrides it while it runs.

| Component (index.json name) | In Play | Start from the page |
| --- | --- | --- |
| **ListItem**, a choice group: ≥ 2 ListItem siblings of one parent (List, Stack…) where one row is drawn picked (`selected`, or a trailing check Icon) | A press moves the pick: `selected` and the ✓ (the trailing check Icon) go to the pressed row. The row's own action (Close overlay…) still runs | The row drawn picked |
| **Chip**, a choice group: ≥ 2 Chip siblings, exactly one drawn selected, none with a popover, Filter table or Open overlay | One-of: the pressed chip is selected, the others not (W-55) | The selected chip |
| **Chip** whose On click opens an Overlay holding a ListItem choice group | Shows the picked row's title and turns Selected; × (Advanced) or picking the start row again gives back its own words | Its own words and look |
| **Toggle** (Switch), **Checkbox** | Toggles; kept while the Screen shows | `checked` / `defaultChecked` |
| **RadioButton** siblings of one parent | One-of: the pressed one checks, the others uncheck | The checked one, else none |
| **Segmented**, **Tabs** | The pressed segment / tab is the value (a Tabs' panels follow) | `value` / `defaultValue` |
| **InputField**, **TextAreaField**, **Search** | Keep the typed text | `value` / `defaultValue` |

A control's own prototype action still runs (a Search's Filter table, a Tabs' per-item Navigate to): Play listens beside it.

Not live in A: **Menu** (its items are actions, with no ✓ to move); Chip `popoverItems` already keep their pick
themselves (PT-43); **BottomNavigation** (a tab that does not navigate would look like it did); rows drawn from the page
data (`mock.x.map`, one place for every row) become uncontrolled and act on their own, but are not remembered when an
overlay reopens; layers inside a component instance (`<Use>`) stay as drawn.

## 2. How the Chip learns the label

From the page, not the DOM: `choicesOf(tree)` (`protoModel.ts`) finds each ListItem choice group and, for each Chip
whose `onClick` is `proto.open("<overlay>")` (a string target), the groups inside that Overlay frame. While a group's
pick is not its start row, the Chip shows that row's `title` (a literal string; otherwise only Selected) and is
Selected. Picking the start row again, or the chip's ×, gives the start back.

## 3. What resets

- **Navigate to / Back**: the next Screen (a new visit) starts as drawn — the same rule as Filter table and Change step.
- **Restart**: everything starts as drawn (Figma resets on restart).
- **Close and reopen an overlay** on the same Screen: kept (the ✓ stays where it was picked).

## 4. What does not change

The canvas and the page code. Play state lives in React state only and is never written to the `.zen.tsx` file; the
canvas, Present and the exports draw the page as written. Open on phone (DevicePlay) shares the flow, so it acts the same.

## 5. Checks

E2E (`tools/studio/e2e/scenarios/prototype.mjs`): the W-52 case (pick moves the ✓, the chip reads the range, Restart
gives back "Date"), a Toggle and a Segmented that act and reset on Restart. `protoModel.selftest.mjs` covers
`choicesOf`.
