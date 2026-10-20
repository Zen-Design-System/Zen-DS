# Worked examples: desktop header → phone

Three screens from the repo's templates, mapped by `docs/component-usage-rules.md` §17.

## 1. Expenses (a list root)

Desktop (the Studio page "Expenses"): Sidebar of 7 rows (Overview, Expenses, Approvals 12, Corporate cards,
Reimbursements, Vendors, Reports) + a Settings footer row; top bar Search "Search expenses, merchants or people";
AppShellHeader `actions` Notifications (count 4) and the account menu (Khoa Dang); its `main` PageHeader "Expenses" with
a description and the page actions.

| Desktop | Phone |
| --- | --- |
| Sidebar, 7 rows | BottomNavigation: Overview, Expenses, Approvals (dot), Corporate cards, More (the other rows + Settings) |
| Breadcrumbs: none (a root) | no leading Back; `leading` = the account avatar (Khoa Dang) → account sheet |
| PageHeader "Expenses" | `largeTitle="Expenses"`, `title="Expenses"` |
| Description | the first line of the content |
| Search | `controlBar` Search + `searchAction` |
| Primary "New expense" | trailing "+" labelled "New expense" |
| Tertiary "Export" | More sheet |
| Notifications 4 | over budget: the folded Search action, "+" and More fill the 3 places, so the bell goes into More and More shows the `dot`. Without Export, the bell keeps its own place (Search, "+", bell). |

## 2. HR Home (a root with a busy top bar)

Desktop (`src/templates/hr/HrShell.tsx`): AppShellHeader `leading` Breadcrumbs "Home" (`master={false}`); `actions` =
plan Badge, Settings menu, Inbox (count), account menu with photo; the Sidebar has a Home group (Home, My profile) and Modules (People, Documents, Files,
Expenses, Time off, Workbench) plus Spaces; floating "Ask Zen AI".

| Desktop | Phone |
| --- | --- |
| Sidebar top-level rows (groups flattened, in order) | BottomNavigation: Home, My profile, People, Documents, More (the rest, Spaces, the module sub-rows) — or Home + Profile tab, then the account leaves `leading` |
| Breadcrumbs "Home" | none (one crumb = a root) |
| Title | `largeTitle` = "Home" |
| Inbox (count) | trailing action with `dot` |
| Settings menu, plan Badge | the account sheet (Settings rows, the plan) |
| Account (photo) | `leading` avatar → account sheet (unless a Profile tab is chosen) |
| Floating "Ask Zen AI" | stays (hides on scroll) |

## 3. Invoice detail (a child)

Desktop (`src/templates/DetailTemplate.tsx`): Breadcrumbs "Invoices › INV-…"; PageHeader title "Invoice …", a status
Badge in `meta`, a description, actions ⋯ (more) + Primary "Record payment", `tabs` Overview / Activity;
AppShellHeader `actions` Notifications + account.

| Desktop | Phone |
| --- | --- |
| Breadcrumbs (2 crumbs) | `type="compact"`, `leading` = Back chevron "Invoices" |
| Title | bar `title` = "Invoice …" (≤ 24 characters; IDs allowed) |
| `meta` Badge, description | the first block of the content |
| `tabs` | `controlBar` Tabs `fullWidth` |
| ⋯ actions | trailing More → action BottomSheet |
| Primary "Record payment" | ActionBar footer (a detail screen never keeps its Primary in the bar) |
| Notifications, account | not on a child screen: the root's bar has them; a child's trailing holds only this screen's actions |
| No BottomNavigation | a child screen hides it (R14) |
