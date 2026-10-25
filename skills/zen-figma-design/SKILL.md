---
name: zen-figma-design
description: Design or edit screens in a Figma file built on the Zen Design System (a file that uses the Zen library, or a copy of the Zen file) through the Figma MCP server's use_figma. Only Zen components, variables and text styles; Zen's screen rules; the Zen audit after every screen. Use for vibe design, mockups, new screens or flows, and fixes in a Zen Figma file.
---

# Zen Figma design

The goal is a screen a Zen designer accepts without fixing it: built only from Zen components and tokens, laid out by
Zen's rules, with real content, and checked by the audit before the next screen starts.

Files in this skill:

| File | Read it |
| --- | --- |
| `references/screen-rules.md` | before the first screen: layout, surfaces, spacing ladder, component choice |
| `references/design-principles.md` | before the first screen, and when a screenshot passes the audit but looks off: colour pairing and balance, hierarchy, composition (principles for judgement, not rules) |
| `references/responsive-principles.md` | when a screen has more than one width (desktop, tablet, phone): responsive and adaptive layout, what to keep, what to move (principles, not rules) |
| `references/product-patterns.md` | when you read a brief into a screen list: the screens a product family usually needs, what earns trust, what to avoid, which Zen template to start from (principles, not rules) |
| `references/ux-principles.md` | when you plan each screen's states and flow: loading, empty, failed, done; forms; navigation and Back; access (WCAG 2.2); touch and motion (principles, not rules) |
| `references/figma-components.md` | to find a component set and its exact property names and values |
| `references/figma-tokens.md` | to pick a colour, spacing, radius variable or a text/effect style |
| `references/figma-gotchas.md` | before writing `use_figma` code that touches instances |
| `references/customize-without-detach.md` | before you change how a Zen component looks or build a new one from Zen parts: the ladder (props → nested props → slots → allowed overrides → wrap → ask), value layers, composition rules |
| `references/guidelines/<component>.md` | for each component you place: "Use it for", "Use something else for", Do/Don't (the Props part is the React API) |
| `references/component-usage-rules.md` | the full Zen rules the screen rules summarise |
| `harness/zen-figma-audit.js` | after every screen: run it with `use_figma` (§4) |
| `references/audit-rules.md` | how to fix each audit finding |

## 1. Before the first change

1. **Load Figma's own skills.** `figma-use` before every `use_figma` call, and `figma-generate-design` before a visible
   change (with the Figma plugin: `/figma-use`; without it, the MCP resource `skill://figma/figma-use/SKILL.md`). This
   skill adds Zen's rules on top of them; where they differ, this skill wins for Zen files.
2. **Pin the target.** The file key from the URL (`figma.com/design/<fileKey>/…`), the page, and the frame ids
   (`node-id=12-34` → `12:34`). Never guess a node id.
3. **Read the file (read-only).** Pages; local variable collections (a Zen file has Mode Colors (Semantic), Spacing,
   Corner Radius, Breakpoint & Grids, Component Size, Component Theme, Typography Configuration); text and effect
   styles; and where the Zen components live:
   - a copy of the Zen file: local sets on the `❖ …` pages, patterns on `◇ Master-Layout`, templates on `◆ …`;
   - a file that uses the Zen library: `get_libraries` lists it ("ZEN Kaiz (Official-Sep2026)" is the official one).
     Scope `search_design_system` with `includeLibraryKeys: [<that key>]`: other libraries reuse Zen's names (forks),
     and an unscoped search mixes them.
   In the Zen file every component set, variable and style carries a description written from Zen's rules (what it
   is, when to use it, what to use instead, its properties): read it before you place or bind something. The
   🔤 Typography page's Content-Hierarchy section is the heading and text-style ladder.
4. **Read the brief into a screen list.** For each screen: who uses it, the one main action, the data it shows, the
   states it needs (empty, loading, error, an open menu or dialog). Reference the source app's features, not its look.
   `references/product-patterns.md` lists what a product family usually needs (name a missing screen in the report,
   do not build it unasked) and `references/ux-principles.md` §0–§1 which states and flows each screen plans for.
5. **Plan the design** (`references/design-principles.md` §0): the mood (Component Size and Typography modes), what
   must carry colour (the colour budget), the focal point, and, for more than one width, the canonical layout and how
   it folds (`references/responsive-principles.md` §3). These are judgement calls; the audit does not check them.

## 2. Hard rules (an audit error or a designer's rejection when broken)

- **Only Zen components.** Every control, card, list, table, header and navigation is an instance of a Zen set. A
  visual Zen does not have (a timeline, a custom chart) is a local component with auto layout built from variables,
  never loose rectangles. Never detach an instance.
- **Change instances only through their properties** (`setProperties`, variant values from figma-components.md) and
  their slots. Never paint, resize or restyle a layer inside an instance; size the instance itself. Never set an
  INSTANCE_SWAP property to the value it already has (the icon loses the variant's colour).
- **Everything you author is bound:** fills and strokes to Mode Colors (Semantic) variables, gaps and paddings to
  `Spacing/Gap/*`, `Spacing/Padding/*` or the Breakpoint margins, radii to `Corner-Radius/*`, text to a Zen text style,
  shadows to a Zen effect style. No raw hex, px or font settings; no primitive ramps (`Light/Neutral/3`, `dm-16`).
- **Auto layout everywhere** something stacks or sits side by side. Absolute positioning only for overlays that float
  (a popover on a state frame, a floating action).
- **Theme by Canvas.** The page's Canvas picks the navigation, the boxes and the elevation (screen-rules §1): bars and
  headers match the canvas, boxes take the Theme / Surface / Color allowed for it, and shadows are all-or-nothing
  (only on Canvas/Default). The audit's `theme/*` rules check it.
- **One colour mode per screen.** Only the screen frame sets Light or Dark; never a component, card or layer inside it.
  A dark widget is Card `Solid` / `Neutral` (`Background/Neutral/Solid`) with Inverse content tokens (screen-rules §1).
- **Content follows its Solid fill.** Neutral Solid → Inverse, Accent Solid → On-Accent, other colour solids →
  On-Colors (On-Brights on Yellow, Sky, Mint, Golden). Pick Metric-Tile `Content`, Metric-Trend `Content` and Dock-Icon /
  Badge `Theme` to match (screen-rules §1, audit `theme/on-solid-content`).
- **No shadow is ever cut.** Frames made with `createFrame()` / `createAutoLayout()` clip their content by default, so
  set `clipsContent = false` on every frame you add (rows, sections, toolbars, wrappers) unless it must hide something;
  a Shadow card's shadow reaches past the card (about 8px below, 4px aside). Check every screen with the audit's
  `bounds/shadow-clipped`; `absoluteRenderBounds` cannot show it (it is already cut by the clip).
- **Every component by its own rules.** Before you place a component, read its `references/guidelines/<component>.md`
  ("Use it for", "Use something else for", Do / Don't) and its Figma description. Then pick its level, size and state
  by those rules, never by how it looks. The ones that go wrong most:
  - **Button roles** (component-usage-rules §1, audit `button/*`):

    | Level | Use |
    | --- | --- |
    | Primary | one per screen, the main CTA |
    | Tertiary | every other action, the default |
    | Secondary | only a pressed toggle that stays on, such as a device's power while it is on |
    | Accent | only a promoted CTA: onboarding, upsell |

  - **Button pairs and sizes:**
    - A pair is Tertiary + Primary, with Primary last.
    - On a phone footer, Primary goes on top with at most one Tertiary below; alternative sign-ins never sit as two
      Secondary buttons.
    - A full-width button is Medium or larger; Small buttons hug their label.
  - **Buttons in context:**
    - Buttons on a photo are `Button/Overlay` or `Button/Icon-Overlay`.
    - The ⋮ / ⋯ more menu floating in a card's corner is `Button/Icon-Flat`, never a bordered Icon-Main: Zen's Card
      Sub-Action (Small, Secondary, `icon-dots-vertical-line`). Put it in a `Wrapper` frame 20×20 with width and
      height bound to `Element-Size/Popular/Base` (centred, no clip), as the Card does: the 32px button bleeds 6px each
      side and the row keeps the icon's size. Only the more menu is flat: other icon actions in a card (a device's
      power, a stepper, playback, call) keep their `Button/Icon-Main` role, and a ⋮ in a page header or toolbar is
      Icon-Main Tertiary (audit `button/in-card-flat`, `button/in-card-wrapper`; user 2026-10-17, narrowed 2026-10-18:
      "Button in card flat chỉ dành cho button ở floating ở góc cho hành động more").
    - A button sits at least `Spacing/Gap/XSmall` (8) from the heading, label or button beside it: "a thing and its
      control" and "controls in one toolbar row" are the XSmall rung. `Gap/2XSmall` (4) only joins one inline item (an
      icon and its text, a Badge beside a title). Audit `spacing/control-gap` (user 2026-10-17: "chữ và button sát quá").
    - Labels name the outcome: never "OK", "Submit" or "Yes".
  - **Not a button:** switching views is Segmented or Tabs; choosing a filter, sort or scope (an address, a period) is
    a Chip; Back is `icon-chevron-left-line-medium`.
  - **Toolbar Search:** a Search beside Chips, buttons or a view switch in one row is at most 240 wide on tablet and
    desktop screens: Fixed 240, or Fill with a max width of 240, never stretched across the toolbar. A phone Search
    (Shape=Rounded) fills its row; the `Type=Control-Bar` row of `Primitives/Dashboard/Header` has its Search Fixed 240
    (user 2026-10-25: "ở control bar thì tối đa là 240"). Audit
    `search/toolbar-width` (user 2026-10-24: "thanh search trên tool bar tối đa nên để rộng 240").
  - **List rows, badges, the desktop header** (user 2026-10-24, the task page):
    - A List-Item leads with a `Dock-Icon` (Size Medium, Background Subtle), an Avatar or a thumbnail, never a bare
      icon instance ("các list item hạn chế dùng icon không. Thường nên dùng dock icon"; audit
      `list-item/leading-dock-icon`).
    - A priority Badge leads with `icon-flag-03-solid` (`.Task/Priority`); a status Badge keeps Leading-Icon on (the
      dot or an icon per state); a workflow step is `Badge-Status`. Badges in Table cells too (audit
      `badge/status-priority-icon`).
    - Priority has one palette: Urgent and High `Red`, Medium `Yellow`, Low `Neutral`, each led by `icon-flag-03-solid`;
      Property-Field priority icons take tone Negative / Warning / Neutral (audit `priority/palette`).
    - When you build a screen, give a status Metric-Card's Dock-Icon Background Solid in the colour of what it counts:
      total Accent, in progress Blue, overdue Red, done Green ("metric card dùng dock icon solid"). The designer may
      change it; no audit check (the user 2026-10-25).
    - A popover that picks a person shows each person's avatar: Popover items Theme Avatar Small with the photo, or
      the initials Avatar ("popover để chọn nếu là người thì nên có avatar"; no audit check: names are not
      detectable, check it on the screenshot).
    - A desktop `Header/AppShell` never shows an empty top row: Breadcrumbs or a Search on the left, a Search in the
      centre (≤ 400) when it helps, help, notifications (`Header/Action-Item` with its count) and the account Avatar
      last on the right; or Top-Header off for a Main-only header (audit `app-shell/top-row-filled`).
  - **Navigation icons:** in a Bottom-Navigation the selected item shows the solid icon and every other item the line
    icon of the same family (audit `navigation/icon-style`). Never set a solid icon on every screen's Home; pick tab
    icons that have both styles.
  - **Colour:** Brand / Accent is the screen's main colour: bands, the hero and the selected state. Other hues may
    support it on smaller parts (category icons, a streak badge, initials), never lead it.
- **Real states, not look-alikes.** A field that shows a value is `State=Inputted` (Default and Focused are the empty
  placeholder look); a menu's open trigger is `State=Pressed` (Chip/Advanced: `Press`), not Focused; a disabled control
  is `State=Disabled` with a reason in its help text. Pick nested states before calling something a library gap.
- **Real content.** Copy in the brief's language, real names, numbers, dates and statuses; no lorem ipsum, no "Title",
  "Label" or default component text left on screen.
- **Keep Zen's layer names** (`Actions`, `Primary`, `Icon-Wrapper`, `Leading`…). Name the frames you add by what they
  are (`Filters`, `Orders table`, `Summary`), never "Frame 12".

## 3. Build a screen

1. **Start from Zen's frame.**
   - Desktop: an instance of `Patterns/Pages/Density-Medium` (1512 × 982; booleans Sidebar, Side-Panel,
     Floating-Actions; your content goes in its `Content` slot). The sidebar is `Patterns/Sidebar/Density-Medium`
     (or `Side-Bar/Master/*`), and every page shows its own row selected.
   - The page header is `Header/Dashboard` with `Primitives/Dashboard/Header` rows in its `Sections` slot:
     `Type=Main` (Heading/1 title + page actions), `Type=Control-Bar` (search, filters, period, view switch),
     `Type=Navigation` (breadcrumbs, notifications, the account).
   - Phone: a 390-wide frame in the Mobile mode of Breakpoint & Grids and the Comfortable mode of Component Size, with
     `Top-Navigation/Mobile` and, for top-level screens, `Bottom-Navigation/Mobile/*`.
   - A phone version of a desktop screen: move each header part to its phone place by
     `references/component-usage-rules.md` §17 (Breadcrumbs → Back on a child, its icon `icon-chevron-left-line-medium`
     and never a left arrow (§10, audit `navigation/back-chevron`), the title → Expand-Heading on a root,
     at most 3 `Nav-Slot/Action` in Top-Trailing, the rest in a ⋯ Bottom-Sheet, the account avatar in Top-Leading,
     the Sidebar's first 4 rows + More in Bottom-Navigation) and turn off the booleans of parts the screen lacks.
   - Before a screen like one of Zen's templates (`◆ HR-Platform`, `◆ Finance`, `◆ Social`, `◆ Logistic`,
     `◆ Ecommerce`), read that template's frame and copy its structure, not only its parts.
2. **Lay out the content** in the Content slot by screen-rules.md: one surface pairing, the spacing ladder, tables on
   the canvas, grouped lists in List-Box, the list that closes a phone screen open as `◆ Finance` Transactions (no
   List-Box), one Primary button per area.
3. **Fill it** with real content and pick every component's variant and state on purpose.
4. **Add the states** the brief needs as separate frames next to the screen (a copy of the page-pattern instance with
   the state applied: open menu, dialog, empty, error, loading with Skeleton).
5. **QA before done** (§4 and §5): audit until it reports 0 errors, take one screenshot, and walk the QA checklist
   below. Fix, re-audit, and only then start the next screen. Audit every frame you touched, not only the new one
   (a sidebar or header change reaches the others).

### QA checklist (every screen, before you call it done)

1. **Audit:** 0 errors. Each warning is fixed, or its reason is written down for the report. The audit includes the
   `button/*` roles, `navigation/back-chevron`, `theme/*` pairing and `bounds/*`.
2. **Component rules:** for every component on the screen, its level, size and state match its guideline (the "Every
   component by its own rules" bullet in §2). Check especially:
   - count the Primary buttons;
   - every Secondary is an on toggle;
   - every Accent is a promoted CTA;
   - view switches are Segmented or Tabs, filters and scopes are Chips;
   - buttons on photos are Overlay;
   - the footer order is right;
   - on phones and tablets, every control keeps a 44px hit area (two Small Chip rows or buttons ≥ 12 apart), and a
     control row sits ≥ 16 above the content it controls (screen-rules §2, audit `touch/target-spacing`,
     `spacing/controls-to-content`);
   - a phone Body's gap is Component Size `Layout-Mobile/Section-Gap` (24 Compact, 32 Comfortable);
   - the screen still works in the other Component Size and Typography mode: switch them and look.
3. **Colour:** Brand / Accent leads; supporting hues stay small; status colours sit only on status elements.
4. **Screenshot review** (`get_screenshot`, which also renders emoji): hierarchy, alignment, nothing cut or covered by
   the navigation, real copy, no default component text. Then ask it the questions of design-principles.md §9
   (squint, count the hues and say what each means, greyscale, the other modes, push the data, break it on purpose,
   walk it as a user): every state ux-principles.md §1 asks for has its frame.
5. **Report** what is left and why (§5). A screen with an audit error, or a component used against its rule, is not
   done.

Write in retry-safe batches (a section or a screen per `use_figma` call), return the ids you create, and keep one
screenshot after composition and one after a fix (figma-use rule 5).

## 4. The audit (harness)

`harness/zen-figma-audit.js` is a read-only Plugin API script. Run it with `use_figma`: send the whole file as `code`,
after setting `ROOT_IDS` to the screens to check (or leave it empty to check the current selection). It returns JSON:

```json
{ "checked": ["Orders (12:34)"], "errors": 3, "warnings": 2, "counts": { "spacing/unbound": 2, "…": 1 },
  "findings": [{ "rule": "spacing/unbound", "severity": "error", "id": "12:40", "name": "Filters",
                 "path": "Orders › Content", "detail": "itemSpacing 12" }] }
```

- Fix every `error`. For each `warning`, fix it or tell the user why it stays (a deliberate exception).
- `references/audit-rules.md` says how to fix each rule. Re-run until `errors` is 0; it shows at most 25 findings per
  rule, so a long list shrinks as you fix.
- The audit cannot judge taste. After it passes, check the screenshot for hierarchy, alignment, rhythm and copy.

## 5. Report

Tell the user, per screen: the frame name and id, the audit result (errors 0, warnings left and why), the
components used, anything the library lacked (and what you built locally instead), and open questions for the
designer. Do not call a screen done while the audit reports errors or an item of the QA checklist (§3) is open.

**A slip the user catches becomes a rule** (user 2026-10-17: "từ đây về sau bổ sung nguyên tắc. Luôn làm đúng không
lại sai"). In the same turn:
- fix it on every screen it touches, not only the one shown;
- write the principle into this skill (§2, screen-rules or the usage rules);
- add an audit check when a script can see it (with its row in references/audit-rules.md);
- rerun the full QA (audit, checklist, a screenshot of every screen) before reporting.

The same class of mistake must not come back.
