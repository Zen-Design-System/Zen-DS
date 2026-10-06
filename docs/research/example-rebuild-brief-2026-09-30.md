# Example rebuild brief (2026-09-30)

The user's call: rebuild **every platform example from scratch**, with the same bar as the template rebuild
(`docs/research/template-rebuild-brief-2026-09-30.md`). Each example must read like a screen or a part of a screen from a
real, shipped product, and it teaches the reader how to use one Zen component in that product. Earlier examples are
only a checklist of what was covered: don't copy their code, copy or layout.

Read, in this order:
1. This brief.
2. `docs/guides/example-patterns.md` (coverage matrix, mobile and desktop patterns, interactions, copy).
3. For each component you use: `docs/guidelines/<slug>.md` (Do/Don't, props, keyboard, a11y) and, for the page you build,
   the family section of `docs/research/ui-patterns-and-rules-2026-09-30.md` (A1–A18) plus B1–B7.

## 1. The product world

- **Đìzai Studio** is a 48-person product studio in Ho Chi Minh City and Hanoi (the company of the HR templates). It
  builds products for clients and runs its own work in Zen: projects, tasks, files, reviews, invoices, the team.
- **The signed-in user is Alex Duong** (Design Lead). **Today is Wednesday, Sep 30, 2026, 10:30 am.**
- Shared data and formatters live in `src/platform/examples/data.ts` (read-only): people (some with photos, the rest
  initials Avatars with a steady theme), projects with clients (Phin & Co, Lumen Bank, Mekong Freight, Hanoi Book Fair,
  Saola Outdoor), tasks, files, invoices, activity, status → Badge theme maps and `formatDate`, `formatRange`,
  `formatRelative`, `formatDue`, `formatMoney`, `formatCompactMoney`, `formatBytes`, `initials`. Copy what you need
  into local state so the demo works. Need more? Define it at the top of your page file; don't edit `data.ts`.
- **Another domain only when the use case needs it** (a shop checkout, a bank transfer, a delivery tracker, a
  consumer app on a phone). Then use one believable company, e.g. the studio's clients: Phin & Co (coffee chain and its
  loyalty app), Lumen Bank, Mekong Freight. Never "Acme", "Lorem", "User 1", "Item A".
- Money is USD with currency formatting. Tables and details never abbreviate; charts and KPI tiles may ("$20.5K").

## 2. What a page's examples must cover

- **4–6 examples per page** (up to 8 for a big component such as Dialog, Table, Metric, Chat), each teaching one thing,
  no two teaching the same thing. Together they cover the matrix in `example-patterns.md` §1: main use case, states
  (empty, error, loading, disabled or read-only, success), combination with other Zen components, an edge case (long
  text, many items, 0 or 1 item, narrow width), **mobile** (inside `PlatformPhone`, touch) and keyboard / a11y. Skip a
  row only with a reason you can state.
- **Title:** what the example teaches, in product words, sentence case, 1–4 words ("Invite by email", "Unsaved
  changes"). **Description:** 1–2 sentences that are true of the behaviour: the situation and the choice it shows.
- **`code`:** copyable source that matches the render: the real API, the same names, the props that matter, short.
  No pseudo-API. If the render uses local state, the code shows the state and handlers.

## 3. Layout of the example cards (user rules)

- **A page-like desktop example takes a whole row: `wide: true`.** Anything that looks like a page or a large part of
  one (a PageHeader, a toolbar over a Table, a settings form, a dashboard strip, a split view, a Sidebar next to
  content) is one row, never split into the two-column grid (user, 2026-09-30).
- A whole desktop screen also sets `screen: true`: the card then fills edge to edge (no inset, no framed container, the
  page on the stage's Canvas/Default) and offers Full screen (`example-patterns.md` §3, "Màn hình desktop có nút Full
  screen").
- **One mood: Canvas/Default + flat Surface/Default (user, 2026-10-06).** The stage is Canvas/Default; a box on it is
  Surface/Default with no border and no shadow (Card `theme="flat"`, MetricCard `theme="flat"`, ChartCard, ListBox).
  Only a condition changes that: a Sidebar screen (elevation follows the Sidebar), a white page or phone screen (§11
  border or `surface="alt"`), a Surface inside a Surface (Pale border), a clickable card (`theme="border"`), the
  selected card. Usage rules §16; reference Card › Workspace plan.
- Small, single-component examples (a Badge row, a Tooltip, a Toggle list) stay in the grid.
- Mobile examples sit in `PlatformPhone` (`../../PlatformPhone`) with a TopNavigation header and a footer when there is a
  CTA; never `screen`. The frame renders in the phone modes (Typography Mobile, Component size Comfortable; 2026-10-06),
  whatever the docs chips say; only the Studio's Present changes them, for that presentation.
- Inside an example, lay out with Zen `Stack` / `Grid` / `Box` (`../../../components/Layout`), not ad-hoc divs with inline
  styles. Width limits go on the component, not on the row.

## 3b. Spacing ladder (user rule, 2026-10-01: one logic everywhere, never "each place its own")

Components own their inner spacing (Figma tokens): never override a component's padding or gap. Between elements,
the **relationship** picks the step, and the same relationship gets the same step on every page. The ladder comes from
what Zen's components and the Figma Master-Layout already use:

| Relationship between elements | Stack / Grid `gap` | Token | Where Zen already does it |
| --- | --- | --- | --- |
| Pieces of one inline item: icon + text, a Badge beside a title, a cluster of Tags or Badges | `2xs` | Gap/2XSmall 4 | Tag & Label rows, Autocomplete tags |
| A thing and its own label or description: label → control, heading → its supporting line, kicker → its list; controls in one toolbar row (Chips, IconButtons, a Search beside Chips) | `xs` | Gap/XSmall 8 | Input outside-field gap, PageHeader title → description |
| Siblings acting as one group: text Buttons side by side, choices in a group (FormFieldset spaces its checkboxes and radios itself) | `sm` | Gap/Small 12 | FormActions, PageHeader actions, ActionBar, FormFieldset options |
| Blocks inside one surface: header group → body → actions of a card or panel; form fields stacked in a form; toolbar → table; cards in a grid or stack | `md` | Gap/Medium 16 | Dialog / SidePanel body (Modal/Forms fields), AppShell regions |
| Columns of a layout (form columns, main ↔ aside, two panes) and groups inside one surface (settings groups in a card or panel) | `lg` | Gap/Large 24 | Form two-column `column-gap`, row choices |
| Sections of a page or screen (PageHeader → first section, section → section) | `xl` | Gap/XLarge 32 | Master-Layout Body › Content |

Padding:
- A page or screen body: `Margin-Comfortable` (24) on desktop, `Margin-Compact` (20) on a phone. Example cards inherit
  the docs (viewport) breakpoint since 2026-10-02, and a phone frame (`PlatformPhone`) is always `mobile`; the
  margins are still set explicitly so a screen reads the same at every docs width: a phone body uses `padding="lg"` /
  `paddingX="lg"` (Padding/Large = 20 = Margin-Compact) and a desktop page body `padding="xl"` (Padding/XLarge = 24 =
  Margin-Comfortable). Note the two scales differ: padding `lg` is 20, gap `lg` is 24.
- A surface is a Card with `spacing` (small 16 · medium 24), not a Box with its own padding. Content inside a surface
  keeps the surface's inset, so a List's text lines up with the Card title (static rows sit in the card padding; a list
  of interactive rows runs to the card edge and its rows' own Margin-Comfortable padding, 24px desktop · 20px mobile like
  the Card's, lines them up).
- A strip inside a surface (toolbar, summary line, footer bar): block padding `sm` (12) and the surface's own
  horizontal inset, so its edges line up with the content above and below.

Rules:
1. Hierarchy steps up: the gap between groups is always at least one step larger than the gap inside them. Two levels
   of one view never share a gap.
2. Only these six steps. `3xs` and `2xl`+ belong to component internals (text pairs, empty-state illustration) and
   hero spacing, not to example layout.
3. Siblings are spaced by the parent's `gap`, never by margins; no px values; CSS only through `--zen-spacing-*` and
   the margin tokens.
4. On a phone the ladder is the same, except page sections step down to `lg` (24) inside the Margin-Compact body.

## 3c. One style per job across pages (from the batch A review, 2026-10-01)

- **Titles inside an example.** The example card's own title is an h3, so a card or object title inside the preview
  (an invoice, a project, a panel) is `<Heading level={4} textStyle="Heading/Subheading">`. A section header on the
  stage is an h4 in Heading/4, or a kicker (Body/Small/Bold, tone light). Values and record numbers
  ("INV-2026-0143") take the same style on every page. Screen examples (PageHeader or a large title) keep their h1.
- **Forms.** Every example with fields and a submit is a `<Form>` with its buttons in `<FormActions>`: Enter submits;
  desktop puts Tertiary then Primary on the right; under 480px both stack full width, Primary on top. No left-hugging
  Primary outside a Form.
- **Grouped lists read as groups (user, 2026-10-02: flat kicker + rows on one white screen is hard to read).** A
  settings, preferences, profile or account screen with several groups is an inset grouped list:
  - Phone: `PlatformPhone canvas="alt"` + TopNavigation `type="alt"` (compact-alt on child screens); each group is a
    white `<ListBox>` (Figma Component/List-Box, 2026-10-06: Card-padding-medium 20px sideways and
    List-Container-Vertical-Padding 8px above and below on a phone, Corner-Radius/2XLarge, rows Gap/3XSmall; the same
    component on desktop, where its tokens give 24px / 12px), with the kicker in `<Box paddingX="lg">`
    so it lines up with the row text; kicker → block `xs`, group → group `lg`, body `padding="lg"`. No border, no
    shadow (white on Surface-Alt).
  - Desktop: each group is its own Card (title in Heading/Subheading) or a section with a Heading/4 header over a
    bordered List; never a long run of rows under thin kicker labels on one surface.
  - Example: Toggle › Phone settings.
- **Status captions follow the status:** a Done task shows when it finished, not "2 days overdue" (`formatDue` only for
  open work).
- **Every enabled Primary does something visible:** if validation blocks it, move focus to the first invalid value and
  announce the error.
- **A create or edit screen on a phone has a way out:** Back (chevron) or Close, asking before it drops changes.
- A surface on the stage is flat Surface/Default on Canvas/Default (§3 "One mood", usage rules §16): MetricCard and Card
  `theme="flat"`, no border and no shadow unless a condition there asks for one.

## 4. Content rules (apply everywhere)

- **Lines and overflow:** titles, labels, errors and notifications never truncate; titles wrap to 2 lines at most.
  Buttons, chips, tabs, badges, menu items and nav items stay on 1 line. Table number, date and status cells never
  wrap. Anything ellipsized is readable in full (tooltip or the detail it opens).
- **Dates:** month names ("Oct 12, 2026", "Oct 12 – Oct 14, 2026"). Timestamps follow the ladder: Just now · 13 minutes
  ago · 10:30 am · Yesterday at 10:30 am · Friday at 10:30 am · Sep 14 at 10:30 am · Sep 14, 2025 (`formatRelative`).
- **Wording:** sentence case everywhere. Buttons are a verb plus a noun in 1–3 words, no "please", "successfully" or
  "!". Toasts are an object plus a past-tense verb ("Invoice sent") with one verb action (Undo, View). Counts use
  `plural()` from the Text component (harness `copy/plural-count`).
- **Status:** one vocabulary per domain, always a Badge (never a Tag or coloured text): Tasks To do · In progress ·
  In review · Done; Projects Planning · Active · On hold · Completed; Invoices Draft · Sent · Paid · Overdue (theme maps
  in `data.ts`).
- **Numbers:** right-aligned with their headers; the same decimals throughout a column.
- **Empty states:** "No [things] yet" on first use, "No [things] match" when filtered; one-sentence caption, one verb CTA.
- **No guide text** inside the preview: no "click / press / try", no hint notes; a status line starts empty and shows
  real product copy after an action.

## 5. Component rules (house rules; the harness checks many)

- **Compose only existing Zen components**, as designed: never invent components, variants or props (read
  `docs/guidelines/index.json`, then the slug file). Import from `../../../components/<Name>` (paths below are relative to `examples/pages/`).
- **Buttons:** one Primary per surface; Tertiary is the common action; Secondary is rare (needs `zen-allow-secondary`);
  Accent only for a promoted CTA; Danger for irreversible actions. Small buttons never stretch.
- **Filters, sort, scope, status and owner pickers are `Chip variant="advanced"`**, never a Button or Segmented.
  Segmented switches views (Secondary by default). On a phone, options wider than the screen become a single-choice
  Chip row, not a sliding Segmented.
- **Leading visuals:** item, category and status icons are Dock Icons; people are Avatars. One group, one leading size
  (Avatar Medium beside Dock Icon Medium). A bare Icon only inline with text or inside controls.
- **Metrics:** MetricCard / Metric, never Card + Heading + number by hand.
- **A Table that is not a widget sits straight on the page** (user, 2026-10-01): a table that is the page's content or
  a section of it (a list page, "Invoices", a toolbar over a table) gets no Card, no Box or other container and no
  Surface fill; it lies on the page background under its h2 / toolbar. Only a table that is a **widget** (a dashboard
  tile with its own title and a few rows, next to other widgets) goes in a Card.
- **Lists:** List + ListItem; whole-row click for rows that open something. **Tables:** Table with the Table* cell
  primitives; `onRowClick` for read-only rows that open a detail; column `onOpen` only for editable tables.
- **Inputs:** always a visible label. Read-only for values to read or copy; Disabled (Text, Select, Date, Number,
  Text-Area, Search) only while something else blocks the field, with the reason in help text. Autocomplete and
  Rich-Text have no Disabled. Phones: inputs Medium or larger, Toggle Large.
- **Sizes:** Tabs and other sized components use Medium by default on desktop and phones; Small only in a genuinely
  narrow component space (a dense table toolbar, a side panel header), never by habit (user, relayed 2026-10-01).
  Tabs, Segmented and (since 2026-10-01, user-approved) Chip default to Medium: drop an explicit `size="small"` /
  `"sm"` unless the space is that narrow. Chip rows grow 32 → 40px: check wrapping at 390.
- **Phone screens with a list scroll for real:** a phone example that shows a list has enough rows to scroll, so the
  Top Navigation, sticky headers and sheets show their behaviour (Top Navigation behaviour rules: §5b).
- **Overlays:** Dialog / ModalForm / SidePanel / BottomSheet / Menu / Popover as their guidelines say. Destructive and
  irreversible → negative Dialog; undoable → act, then a Toast with Undo. Pick-one in a Bottom Sheet = List + ListItem
  Selected. Back on phones is `icon-chevron-left-line-medium`.
- **Icons:** only real names from `src/icons/generated` (check before use). Icon-only actions are IconButtons with an
  aria-label (the tooltip comes for free).
- **Layers and borders:** Canvas → Surface → Container → Popover. Surface on Canvas/Default is flat (no border, no
  shadow, §16); Surface on Canvas/Alt, a phone screen or another Surface needs a Pale border; closed containers: Subtle border if actionable, Pale if static. No drop shadow on tinted fills. Nested radii are
  concentric (outer = inner + gap). Wrappers around avatars or buttons use the same size token, never px.
- **Typography:** text styles only from tokens (`typographyStyles` or `<Text textStyle>` / `<Heading>`). Inside an
  example card the card owns the title, so a section in the example uses a kicker header or Heading/4; numbers use the
  Metric styles.

## 5b. Phone screens: Top Navigation behaviour and list length (2026-10-01)

Follow `docs/research/top-navigation-mobile-rules-2026-10-01.md` (researched by the template session at the user's
request): Section 2 rules R1–R18, Section 3 length, and Section 4, which gives the verdict and the exact change for
every audited phone (find your page's rows). In short:
- **R1 wire the scroll:** TopNavigation `scrollRef={screenRef}` + PlatformPhone `headerOverlay screenRef={screenRef}`,
  so large titles fold. No onScroll / scroll-driven `collapsed`, no inner `.pe-phone-scroll`. Exempt: media viewers,
  chat (until PlatformChatHeader passes scrollRef).
- **R2 one key per screen:** `<PlatformPhone key={openId ?? "root"}>`.
- **R3/R7 header by situation:** large title only on tab roots (default, or alt on an Alt canvas); child, modal and
  form screens use compact (compact-alt on Alt). Never `largeTitleAction` in examples.
- **R5** a Search control bar always gets `searchAction`; **R6** the control bar holds a fullWidth Segmented/Tabs or a
  Search only, filters stay a Chip row in the content.
- **R8** every pushed screen has a Back that really navigates; modal screens a Close that asks before dropping changes.
- **R14** re-tapping the current bottom tab scrolls to the top. **R15** footers are `ActionBar position="static"` in
  the PlatformPhone footer, never page-local footer classes. **R17** no maxHeight/height on phones.
- **R10 correction (2026-10-01):** docs phones still resolve desktop margin tokens (PlatformPhone sets
  `data-typography="mobile"` but no `data-breakpoint="mobile"`), so `inset="compact"` (20) only lines up in the docs;
  on a real phone it gives 16 and sits 4px off the bar, where the default inset (Margin/Comfortable = 20) aligns. Don't
  add `inset="compact"` purely for alignment. Proposed fix, waiting for the user: PlatformPhone sets the mobile
  breakpoint, then every phone keeps the default inset.
- **Length:** a list or feed screen is ≥ 1.5× the visible height (≈ 14 two-line rows under a large title, 13 with a
  control bar, 12 with a bottom bar or footer, 15 under a compact bar), with believable Đìzai rows, no fillers. Exempt:
  choice lists, carts and receipts, forms, empty/loading/error, chat threads, media. Check with the R18 snippet.

## 6. Interactions (nothing is locked)

Every visible control does something visible (`example-patterns.md` §3b): filters and search really filter, sorting
sorts, a row opens its detail, Create adds a row and shows a Toast, Approve / Decline change status and Undo restores
it, Cancel and Dismiss do their job and leave a way back ("Show message again"). Controlled props always come with
their handler. Chat examples use `useChatDemo()` (`../../chatDemo`). Actions that would leave the demo (Share, Export)
open `DemoFieldDialog` (`../../PlatformDemoActions`) or confirm with a Toast. No dead clicks, no empty handlers.

## 7. The technical contract

- One file per page: **`src/platform/examples/pages/<page-id>.tsx`**, exporting
  `export const page: PlatformPage = "<page-id>";` and `export const examples: ExampleDef[] = [...]`
  (`import type { ExampleDef } from "../types"`, `import type { PlatformPage } from "../../PlatformExamples"`).
  `registry.ts` finds the file by itself and the page shows only these examples.
- Optional CSS: `src/platform/examples/pages/<page-id>.css`, imported by your file; class prefix `.px-<page-id>-`;
  colours, spacing, radii and type only through `--zen-*` tokens (the style guard checks it).
- **Never edit shared files:** `PlatformShowcases.tsx`, `PlatformMobileShowcases.tsx`, `PlatformExamples.tsx`,
  `platform.css`, `data.ts`, `registry.ts`, components, templates, tools. If you need a change there, report it.
- **Import graph:** never import `PlatformShowcases`, `PlatformMobileShowcases` or `PlatformAppLayer` (cycles break
  HMR). From `examples/pages/` you may import `../../../components/*`, `../../PlatformPhone`, `../../PlatformChatHeader`,
  `../../chatDemo`, `../../PlatformDemoActions`, `../../PlatformMedia`, `../../PlatformMobileData`,
  `../../PlatformChatDesktopShowcases` (ThreadHeader), `../data`, `../types`, `../../../tokens/typography.generated`,
  and `import type { PlatformPage } from "../../PlatformExamples"`.
- Other sessions edit this repo at the same time; templates (`src/templates/**`) are being rebuilt: don't touch them.

## 8. Definition of done (per page)

1. `npx tsc --noEmit -p .` has no error in your files.
2. `node tools/usage-guard/cli.mjs src/platform/examples/pages/<page>.tsx` and
   `node tools/style-guard/check-styles.mjs src/platform/examples/pages/<page>.*` are clean (no new `zen-allow-*` unless
   justified in the comment).
3. Screenshots of the build (dev server http://localhost:5173): `node tools/platform-audit/shoot.mjs <page>` and
   `node tools/platform-audit/shoot.mjs <page> --width=390`; open the contact sheets
   (`.platform-shots/<page>-1512.png`, `<page>-390.png`) and check alignment, hierarchy, spacing rhythm, one leading
   size per group, no overflow or clipping, page-like examples on their own row.
4. Every interaction tried once (a quick Playwright pass or `--click="Button name"` shots).
5. The code reads well as a copyable example: data at the top, short intent comments, no dead code.

## 9. Final check (user, 2026-10-01: after every session is done, one last pass over all examples)

Every example passes all six, judged on the 1512 and 390 shots, the code and a click-through:
1. **Aesthetics:** calm hierarchy, exact alignment, the spacing ladder, nothing cramped, clipped or floating; the page
   reads as one designed set, not 43 separate experiments.
2. **Layer elevation:** Canvas → Surface → Container → Popover, each layer in its place (`docs/component-usage-rules.md`
   §8, §9, §11): a Surface on Canvas or Surface-Alt has a Pale border; no drop shadow on tinted fills; overlays float
   in the Popover layer; a non-widget Table sits on the page with no container; nested radii are concentric.
3. **One style:** the same job looks the same on every page (titles, record numbers, forms and their actions, status
   Badges, empty states, phone headers and footers, sizes Medium by default).
4. **One behaviour:** the same interaction behaves the same everywhere (row click opens a detail, destructive →
   negative Dialog, undoable → Toast with Undo, filters filter, phone Top Navigation folds, Back navigates, re-tap
   scrolls to top).
5. **Clear context:** each example is a believable moment in a real product (who, what, why), not a component specimen
   with filler data; the title and description say what it teaches.
6. **Complete interaction:** every control works and shows its result; the component's own behaviours (keyboard,
   focus, states, motion) are visible in at least one example of its page.
