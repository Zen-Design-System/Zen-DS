# Template rebuild brief (2026-09-30)

The user's call: rebuild every template from Zen's own components, text styles and tokens and from our research
(`docs/research/ui-patterns-and-rules-2026-09-30.md`). The Figma HR-Platform frames are a **moodboard only**: mood,
density and information architecture. Don't measure them or copy their literal copy, typos or instance overrides.
The goal is the highest UI/UX bar: templates that read as screens from a real, shipped product.

## 1. The product world

**Đìzai Studio** is a 48-person product studio in Ho Chi Minh City and Hanoi. It runs its people operations on a Zen
HR workspace: Home, Time Off, Expenses and Workbench (tasks).
- The signed-in user is **Alex Duong** (Design Lead, approver for the Design team). Their photo is `hr/assets/account-photo.jpg`, the workspace logo `hr/assets/workspace-logo.png`.
- **Today is Wednesday, Sep 30, 2026.** All dates are relative to it (upcoming leave in October, the last three months
  of claims, Q3 closing).
- Names are a realistic mix: Vietnamese (Bao Nguyen, Chi Tran, Duy Le, Em Pham, Gia Pham, Hana Kim, Minh Anh Vo…) and
  a few international colleagues. Photos exist only for Alex, so everyone else is an initials Avatar with a steady
  theme per person.
- Money is USD, with currency formatting ("$1,280.40"). Tables and details never abbreviate ("$12,000", not "12k").
  Charts and KPI tiles may ("$20.5K").
- The generic templates (Admin list, Detail/Invoice, Dashboard, Settings, Sign in, Empty & error, Mobile list, Mobile
  detail) keep their own domain, but they share the same visual language and quality bar. Use one believable
  company per template, not "Acme".

## 2. Visual direction (from the moodboard)

- Calm and airy: a soft Canvas with white Surface cards, generous spacing and large radii. One Primary action per
  surface, and a few friendly accents: emoji Dock Icons for leave kinds, pastel status Badges, the Zen assistant.
- **Layers:** Canvas → Surface (sidebar, cards, tables on a surface) → Container → Popover. Put a Pale border on Surface
  over Canvas/Surface-Alt. Never put a drop shadow on tinted fills.
- **HR shell** (`hr/HrShell.tsx`): Home shows the icon rail; a module shows its Sidebar with Back and the module name.
  The top bar carries Breadcrumbs, the Pro badge, Settings, the Inbox count and the account. Keep this API
  (module, page, crumbs, onNavigate, aside) and `HrRouterContext`, because App Shell › HR workspace links the pages
  through it.
- **Typography:**
  - One h1 per screen (PageHeader, Heading/1).
  - Section h2 in Heading/4; card titles in Heading/Subheading.
  - Numbers in Metric styles. Text styles only from tokens, never raw sizes.

## 3. Content rules (from the research; apply everywhere)

- **Lines and overflow:**
  - Titles, labels, errors and notifications never truncate. Titles wrap to 2 lines at most.
  - Buttons, chips, tabs, badges, menu items and nav items stay on 1 line.
  - Table number, date and status cells never wrap. Tables with fixed-width columns scroll sideways in a narrow frame.
  - Anything ellipsized must be readable in full, through a tooltip or the detail it opens.
- **Dates:** month names ("Oct 12, 2026", "Oct 12 – Oct 14, 2026"). Timestamps follow the ladder: Just now ·
  13 minutes ago · 10:30 am · Yesterday at 10:30 am · Friday at 10:30 am · Sep 14 at 10:30 am · Sep 14, 2025.
- **Casing and wording:**
  - Sentence case everywhere.
  - Buttons are a verb plus a noun in 1–3 words, with no "please", "successfully" or "!".
  - Toasts are an object plus a past-tense verb ("Leave request sent"), with one verb action (Undo, View).
- **Status:** one vocabulary per domain, always a Badge (never a Tag or coloured text). Leave: Pending · Approved ·
  Declined · Cancelled. Claims: Draft · Submitted · Approved · Paid · Rejected. Tasks: To do · In progress · In review ·
  Done.
- **Numbers:** right-aligned with their headers; the same decimals throughout a column.
- **Empty states:** "No [things] yet" on first use and "No [things] match" when filtered. The caption is one sentence
  and there is one verb CTA.

## 4. Component rules (house rules; the harness checks many)

- **Compose only existing Zen components** (read `docs/guidelines/index.json`, then `docs/guidelines/<slug>.md`).
  Never invent components, variants or props. Wrap with Stack/Grid/Box/Container, no ad-hoc markup.
- **Metrics:** MetricCard / Metric; `variant="title-highlight"` gives the moodboard's title-on-top tile.
- **Lists:** List + ListItem. Tables: Table with the Table* cell primitives. Use `onRowClick` for read-only rows that
  open a detail (SidePanel); the column `onOpen` is only for editable tables.
- **Leading visuals:** item and category icons are Dock Icons; people are Avatars. Within one group, every leading
  visual has the same size (Avatar Medium beside Dock Icon Medium).
- **Row actions and filters:**
  - Whole-row click for rows that open something. A clickable Card holds no other controls.
  - Filters are Chip advanced; bulk actions go in an ActionBar or Menu.
  - Destructive, irreversible actions use a negative Dialog. Undoable actions act first, then offer a Toast with
    Undo.
- **Forms:** ModalForm or SidePanel for creating and editing, using `useFormState` validation. Inputs are Medium or
  larger on phones, Toggle Large on phones.
- **Icons:** only real icon names (`src/icons/generated`). Icon-only buttons carry an aria-label; IconButton gives the
  tooltip.
- **Interactions:** every visible control does something visible:
  - Filters and search really filter, and sorting sorts.
  - A row opens its detail. Create adds a row and shows a Toast.
  - Approve and Decline change status, and Undo restores the previous state.
  - There are no dead clicks and no guide text ("click here") in the UI.
- **Responsive:** 1512 is the design width. The docs preview is about 1160 wide and full screen is the whole window.
  At 390 the AppShell switches to its drawer. Metric grids use intrinsic columns
  (`repeat(auto-fit, minmax(min(100%, Npx), 1fr))`) with no 3+1 orphans. Nothing overflows its box at 390.

## 5. Data

- The HR templates share one typed module: `src/templates/hr/data.ts`. It holds people, teams, leave kinds and
  balances, leave requests, public holidays (VN, SG, US, UK, DE), expense claims and categories, budgets, tasks and
  spaces, plus the formatters (`formatDate`, `formatRange`, `formatRelative`, `formatMoney`, `formatDays`) and the
  status → Badge theme maps.
- Each template copies what it needs into local state, so the demo interactions work. Templates must not import from
  `src/platform`; they ship as copyable source.
- Keep each template's exported component name and file name, since templates.tsx and shellScreens.tsx import them.

## 6. Definition of done (per template)

1. The file type-checks (`npx tsc --noEmit -p .`). `node tools/usage-guard/cli.mjs <file>` and
   `node tools/style-guard/check-styles.mjs` are clean for it, with no new `zen-allow-*` unless justified.
2. Shots of our build look right: `node tools/platform-audit/shoot.mjs templates --title="<Title>" --width=1512` and
   `--width=390`. Check alignment, hierarchy, spacing rhythm, no overflow and one leading size per group.
3. Every interaction was tried once in a quick Playwright pass.
4. The code reads well as a copyable example: short intent comments, no dead code, and data at the top or in
   `data.ts`.
