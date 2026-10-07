# UI patterns and content rules for Zen DS examples (research)

Date: 2026-09-30. Status: **proposal only, nothing implemented** (scope lock: every item in section 4 needs the user's OK).
Scope: (1) how real products show each component family, so Zen example cards can mirror them; (2) testable content and
layout rules (1 line vs 2 lines, truncation, casing, numbers, "which component only"), with Zen coverage and a way to
detect each one.

How the sources were read:
- **Shopify Polaris**: `polaris.shopify.com` now 301-redirects to `shopify.dev` (web components), so the guidance was
  read from the doc sources in the Polaris GitHub repo (same text the site used). Links below point there.
- **Carbon, Primer**: read from their public doc sources on GitHub (carbon-website, primer/design); links point to the
  live Carbon pages and to the Primer sources.
- **Apple HIG**: read from the HIG JSON behind developer.apple.com. **Atlassian, NN/g, WCAG, Cloudscape, Codex,
  PatternFly**: read directly. **Material** and **Spectrum** pages render client-side; their claims come from search
  excerpts and are marked "(excerpt)" in the source list.
- **Mobbin**: returns 403 / needs login, so nothing was read there. Real-product evidence comes instead from the
  public design systems of shipped products: Shopify admin (Polaris), GitHub (Primer), Jira (Atlassian), IBM Cloud
  (Carbon), AWS console (Cloudscape). Section 6 has a short manual Mobbin lookup list.

Zen citations: `docs/guidelines/<slug>.md:<line>` (generated from `tools/usage-guard/guidelines.source.mjs`, so guideline
edits go into that source), harness rule ids from `tools/usage-guard/check-usage.mjs`, runtime kinds from
`tools/platform-audit/audit.mjs` / `quality-checks.mjs`.

Legend for the rules tables: **Zen status**: COVERED (cited) · PARTIAL · NEW · CONFLICT (Zen differs on purpose or by
Figma). **Detection**: GUIDE (guideline line only) · STATIC (usage-guard rule on JSX) · RUNTIME (platform-audit, DOM).

---

## 0. Executive summary

1. The shipped products agree on one shape per family. Zen already follows most of it: index table = identifier
   column + status badges + right-aligned amounts + bulk bar + filters + pagination; empty state = "what is empty" +
   one verb CTA; toast = past-tense outcome + one verb action. The biggest gaps are in **content rules that can be
   measured** (lines, truncation, casing, dates), not in components.
2. **Line limits are the main missing rule set.** Zen states them for some elements only (dialog title ≤ 1 line,
   list title truncates, help text 1 line, toast title ≤ 60 chars). There is no single matrix covering every element,
   and nothing checks line counts at runtime. Section B1 proposes one matrix with 30 elements.
3. **Titles never truncate; controls and metadata may.** Carbon names what must never truncate: page headers, titles,
   labels, errors, notifications. Polaris says the same of page titles. So titles wrap (1 line target, 2 max) and
   controls (button, chip, tab, menu item, sidebar item) stay on 1 line. Codex has the same split: wrap for content,
   ellipsis where equal height matters.
4. **Every ellipsis needs a way back to the full text**: a tooltip on hover *and* focus, or a detail view that the row
   opens. Truncate only when at least 4 characters stay visible (Carbon, PatternFly). Zen has the principle
   (`text.md:77`) but no check. The existing `fit` audit catches overflow *without* an ellipsis, not an ellipsis
   without a way back.
5. **Tables**: right-align numbers *and their headers*, use tabular figures, keep decimals the same within a column,
   put units in the header, and never centre columns (Polaris, Primer). Zen covers alignment and units. **Zen's Table
   cells do not set `tabular-nums`** (only Metric, Progress and DescriptionList do). That is a small component gap.
6. **Dates and numbers need a house format.** Examples should write "Jul 20, 2026" or "Jul 20 at 4:34 pm", never
   "07/20/26", and follow the Polaris relative-time ladder ("Just now" → "13 minutes ago" → "Yesterday at 10:30 am").
   Tables and detail views show "12,000", not "12 k"; chart axes and KPI tiles may abbreviate. Zen has no date rule
   today.
7. **"Which component only" is mostly settled in Zen** (filter → Chip, count → BadgeCounter, status → Badge,
   destructive → Dialog). Three rules would add real value:
   - **Undoable actions get a Toast with Undo, not a confirmation Dialog** (NN/g, Apple).
   - **Status words on a Tag or Chip → Badge** (can be detected statically).
   - **Compare records → Table, open records → List, browse mixed items → Cards** (Polaris, NN/g).
8. **Real-product scenarios beat specimens.** Several Zen examples read like variant galleries: Card "Surfaces",
   Metric "Sizes", Tabs "Icons and badges", Dock-icon "On color", Divider "Labelled separator". Real systems pin each
   example to a named product task instead ("Orders", "Customers", "Delete customer?"). Proposal: one shared demo
   dataset (orders, customers, employees, invoices, tasks) plus a status-word vocabulary, reused by every example.
9. **Detection is cheap.**
   - Static: a `copy/label-length` rule (word caps per component), `copy/sentence-case`, `badge/status-not-tag`,
     `dialog/no-are-you-sure`, `copy/date-format`.
   - Runtime: two new audit kinds, `lines` (max lines per selector via line-box count) and `truncation` (ellipsized
     text with no tooltip or title, or fewer than 4 visible characters). Both are baselined like the existing kinds.
10. **Decision points** where the outside world and Zen differ (section 5):
    - Polaris uses **Tabs for saved views** (All · Open · Unpaid); Zen says filtering → Chip.
    - Zen table headers are All-Caps while Polaris and Carbon use sentence case. This is Figma-driven, so no change.
    - Polaris DataTable **wraps** long cells while Zen truncates. The proposal splits this by table type.
    - Zen toasts with an action close after 8 s, while Polaris asks for ≥ 10 s and Spectrum never auto-dismisses
      actionable toasts.

---

## A. Canonical patterns per component family

Each table: scenario (domain · data shape · states) · source · what the Zen example card should show · Zen components.
"Existing" names the current Zen example that already covers it (from `src/platform/PlatformShowcases.tsx` and
`PlatformMobileShowcases.tsx`). "Rewrite" and "New" are proposals.

### A1. Tables / index tables

Real products agree on this shape:
- One human-readable identifier column first, in bold ([NN/g tables][nng-tables]).
- Status as text badges; amounts right-aligned with tabular figures.
- Row click opens the record. Checkboxes lead to a bulk bar with 1–2 promoted actions and the rest in ⋯.
- Filters sit above the table; pagination beyond 50 rows ([Polaris IndexTable][pol-it]).

Analytic tables (reports) are a separate type. They wrap long text, add a totals row, and don't link rows
([Polaris DataTable][pol-dt]).

| # | Scenario (domain · data · states) | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Orders index** (commerce): Order "#1020" (bold) · Date "Jul 20 at 4:34 pm" · Customer · Total "$969.44" (right) · Payment badge (Paid / Partially paid / Refunded) · Fulfillment badge (Unfulfilled / Fulfilled). Selection → bulk bar "Create shipping labels" + ⋯ Add tags / Remove tags. States: loading, filtered-empty, selected across pages. | [Polaris IndexTable example][pol-it-ex], [Polaris IndexTable][pol-it] | Rewrite "Bulk selection" into this canonical card: Search "Search orders" + Chips Status · Payment · Date, selectable rows, `onRowClick` opens a SidePanel, bulk actions in PopoverBulkAction, Pagination footer "1 - 50 of 1,284 orders". | Table, TableText bold, TableBadges, Search, Chip advanced, PopoverBulkAction, Pagination, SidePanel |
| 2 | **Employee directory** (HR, same domain as the templates): Name (Avatar + role caption) · Department · Location (Flag + country) · Start date "Mar 3, 2024" · Status (Active / On leave / Onboarding). Read-only, sortable by name and start date. | [NN/g tables][nng-tables] (identifier first; one record in a non-modal panel) | Rewrite "Sortable members": read-only, whole-row click → SidePanel profile (no hover Open, per house rule), sort on Name and Start date, status Badge. | Table, TableMedia (Avatar Small with caption), Flag, TableBadges, SidePanel |
| 3 | **Sales by product report** (analytics): Product · SKU · Net quantity · Net sales (USD) · totals row; long product names wrap; same decimals per column; units in the header. | [Polaris DataTable][pol-dt], [Primer DataTable][pri-table] | New (after deciding on a totals row, see 5): a report table with no row click and no selection. Totals can go in a DescriptionList under the table until Table has a summary row. | Table, DescriptionList (totals), Heading h2 Heading/4 |
| 4 | **Inventory inline edit** (commerce/ops): SKU (read-only) · Name · Qty (number editor, right) · Location (select) · Tags. | Zen existing; [Atlassian dynamic table][ads-table] (edit via row ⋯ for complex tables) | Existing "Inline edit · inventory": keep. Only editable tables show the hover Open. | Table edit columns, onCommit |
| 5 | **Invoices with pagination** (billing): Invoice · Customer · Issued "Jul 2, 2026" · Due · Amount (USD) · Status (Paid / Overdue / Draft). Page size chip; filters kept across pages. | [Polaris Pagination][pol-pagination], [Carbon table][cds-table] | Existing "Invoices with pagination": check the date format and the header "Amount (USD)" (units in the header, `table.md:162`). | Table, Pagination Inline, Chip |
| 6 | **Table states in one card**: loading (skeleton rows), first-run empty ("No invoices yet" + Create invoice), filtered-empty ("No invoices match" + Clear filters), load error ("Invoices couldn't load" + Try again). | [Primer DataTable][pri-table] (skeleton placeholders), [Cloudscape empty states][cs-empty], [Primer empty states][pri-empty] | Existing "Empty result" and Skeleton "Table rows" cover two states. New: the error state as InlineMessage Negative above the table, not an EmptyState (`empty-state.md` routes errors there). | Skeleton, EmptyState illustration={false}, InlineMessage |

### A2. Lists / resource lists

Consensus: a list is for items people **open**, and a table is for records they **compare**. List items have a name,
one line of meta and an optional trailing shortcut ([Polaris ResourceList][pol-rl]). List items have 1, 2 or 3 lines
and truncate past that ([Material lists][m2-lists]). Keep item text succinct to avoid truncation
([Apple lists][hig-lists]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Customers** (commerce): Avatar + "Mae Jemison" + caption "Decatur, USA · 3 orders"; sort "Newest update"; whole-row click. | [Polaris ResourceList][pol-rl] | New: the canonical resource list. Bulk selection goes to a Table, because Zen forbids a checkbox on a clickable row (`list-item/clickable-row-toggle`). | List, ListItem onClick, Avatar, Chip advanced (Sort) |
| 2 | **Notifications inbox** (collaboration): unread bold title, 1-line preview, trailing "2h", groups Today / Earlier, "Mark all as read". | [NN/g indicators/notifications][nng-ivn] | Existing "Inbox" / "Grouped sections": check that previews clamp at 1 line and the time is not a heading. | List, ListItem, BadgeCounter, section h2 kicker |
| 3 | **Settings links** (any app): DockIcon + title + caption + chevron. | [Polaris app settings layout][pol-settings-layout] | Existing "Settings links": keep. | List, ListItem, DockIcon |
| 4 | **Recent activity in a card**: title names the subset ("Popular products this week"), at most 5 rows, a "View all" link in the card. | [Polaris ResourceList][pol-rl] (name the subset when not all items show) | New: a card with a short list and a title that says it is a subset. | Card Border, List inset auto, Link |
| 5 | **Pending invites**: email + "Invited 2 days ago", trailing Resend / Revoke. | Zen existing | Existing "Trailing actions": keep; Revoke removes the row with Undo toast. | ListItem trailing IconButton flat md, Toast |
| 6 | **Edge states**: 0 items (EmptyState), 1 item, a 60-character name (title truncates and the full name appears on open), loading (Skeleton "Loading list"). | [Material lists][m2-lists] | One "Long names and empty list" card, or fold it into #1. | ListItem, EmptyState, Skeleton |

### A3. Cards

Consensus from the [Polaris card layout][pol-cardlayout]:
- A card has header, body and footer, and the title describes its purpose.
- Header actions are tertiary icon buttons with a tooltip. CTAs that move the task forward sit in the footer, one
  primary per card ([Polaris Card][pol-card]).

[NN/g][nng-cards] adds that cards suit browsing mixed content, and that lists or tables work better for search and
comparison.

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Settings section** (app settings): left column title + one-line description; right card of grouped toggles. | [Polaris app settings layout][pol-settings-layout] | Existing "Privacy cards" / "Notification settings" (Toggle): align to this 2-column shape on desktop, stacked on phone. | Grid, Card Border, Toggle, Divider |
| 2 | **Record detail secondary cards**: "Customer" (name, email, address; Edit icon with tooltip), "Tags". | [Polaris resource details layout][pol-details-layout], [Polaris card layout][pol-cardlayout] | New: an order detail right column. Header action = IconButton flat + tooltip. No CTA in the header. | Card, DescriptionList, IconButton |
| 3 | **Selectable project / template cards** | Zen existing, [NN/g cards][nng-cards] | Existing "Selectable project cards": keep. | Card active, aria-pressed |
| 4 | **Pricing plans** | Zen existing | Existing: keep. | Card Border, Badge, Segmented |
| 5 | **Upsell / announcement** (not a banner) | [Polaris Banner][pol-banner] (banners not for marketing; use a callout card) | Existing InlineMessage "Custom visual" / "Upgrade prompt": keep them as the only upsell pattern. | InlineMessage custom |
| 6 | **Specimen cleanup** | — | Card "Surfaces" (all five themes) is a variant gallery. Move it to the playground or guideline visual, or reframe it as "Widgets on Canvas vs Canvas/Alt". Card "Stat cards" duplicates Metric "KPI cards": merge (dedupe rule, `example-patterns.md` §1). | — |

### A4. Metrics / KPI tiles

Consensus: every number needs comparison context. Colour is not for magnitude, and bars or lines beat gauges and pies
([NN/g dashboards][nng-dash]). A dashboard serves monitor, investigate and be informed
([Cloudscape dashboard][cs-dash]). Zen already covers format, comparison text, ≤ 4 per row and one hero
(`metric.md:91–106`).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Sales overview** (commerce): Total sales "$12,480.20" +8.2% · Orders "318" +4% · Conversion rate "2.1%" −0.3 pt · Returning customers "27%"; one period for all ("vs. previous 7 days"); range 7D / 30D / 90D. | [NN/g dashboards][nng-dash] | Rewrite "KPI cards" onto the shared dataset. Every tile uses the same comparison period. Range switch = Segmented (Chip row on phone). | MetricCard ×4, Segmented, ChartCard |
| 2 | **HR headcount**: Headcount "248" +6 this quarter · Attrition "4.1%" · Open roles "12" · Out today "9". | [Cloudscape dashboard][cs-dash] | New or reuse in the HR templates (MetricCard, not Card + Heading, per house rule). | MetricCard, DockIcon themes |
| 3 | **Service health** | Zen existing, [Carbon status indicators][cds-status] | Existing: keep. Status colour carries meaning, and at most one Solid tile needs action. | Metric, DockIcon Solid |
| 4 | **Worrying trend with guidance**: "Refund rate 6.4% +2.1 pt" + InlineMessage "Refunds doubled for Product X · View orders". | [NN/g dashboards][nng-dash] | Existing "Metric with context": check it links to the evidence. | MetricCard, InlineMessage |
| 5 | **Tile states**: loading (Skeleton), no data yet (value "—", caption "No sales yet"), error per tile ("Couldn't load" + Try again). | [Primer loading][pri-loading] | New: one "Tile states" card (the loading case exists in Skeleton "Loading dashboard"). | MetricCard, SkeletonShape, InlineMessage |
| 6 | **Specimen cleanup** | — | Metric "Sizes" is a size gallery. Move it to the playground, or reframe it as a hero metric + three supporting metrics. | — |

### A5. Empty states

Consensus:
- The title says what is empty. First-run titles invite the action; filter results say "No matches" and offer
  **Clear filters**. Always offer an action ([Cloudscape][cs-empty], [Polaris][pol-empty]).
- The empty state replaces the element and never leads to a dead end ([Carbon][cds-empty]).
- The body is 1–2 sentences and the CTA 1–2 words ([Atlassian][ads-empty]).
- In an error, the text summarises the problem and the action leads to a fix ([Primer][pri-empty]).
- Say plainly whether content is loading, failed or empty ([NN/g][nng-empty]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **First run, full page**: "No invoices yet" · "Create an invoice and send it in minutes." · Create invoice (Primary) + Import (Tertiary). | [Polaris empty state][pol-empty], [Primer blankslate][pri-blankslate] | Existing "First run": check the copy pattern and that there is one Primary. | EmptyState (illustration) |
| 2 | **Filtered to nothing inside a table/card**: "No orders match" · "Try another status or date." · Clear filters (Tertiary). | [Cloudscape empty states][cs-empty] | Existing "Filtered to nothing": keep; `empty-state/way-out-tertiary` already enforces it. | EmptyState illustration={false} |
| 3 | **Search with no results**: echo the query ("No results for “tokns”"), offer Clear search. | Zen `empty-state.md`, [Primer][pri-empty] | Existing "No search results": keep. | EmptyState, Search |
| 4 | **No permission**: "You don't have access to Payroll" · Request access. | Zen existing | Existing: keep. | EmptyState |
| 5 | **All done / cleared**: "You're all caught up" (inbox zero). No CTA, or "View archived". | [Atlassian empty state][ads-empty] (empty state vs blank slate) | New (small): the celebratory variant is missing. | EmptyState illustration={false} |
| 6 | **Error is not an empty state**: "Invoices couldn't load" → InlineMessage Negative + Try again (not EmptyState). | [Cloudscape][cs-empty], Zen `empty-state.md` (use something else) | Shown in A1 #6 and in AI Chat "Error and retry". | InlineMessage |

### A6. Toasts, banners, inline messages

Consensus:
- Toast = short outcome of the user's own action, noun + past-tense verb, ≤ 3 words where possible. One action that is
  also available elsewhere (Undo, View, Retry), never Cancel, Dismiss or OK. At least 10 s when it has an action
  ([Polaris toast][pol-toast]).
- Toasts and inline notifications stay within two lines ([Carbon][cds-notif]).
- Banner placement follows scope: page → top of the page, section → inside the card, element → next to it
  ([Polaris banner][pol-banner]).
- One banner per page ([Primer banner][pri-banner]).
- Never auto-dismiss critical messages ([Atlassian flag][ads-flag]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Saved**: "Product updated" (Neutral, no action). | [Polaris toast][pol-toast] | Existing "Project published": check the noun + verb, no "successfully" and no period. | useToast |
| 2 | **Undo**: "3 orders archived · Undo". | [Polaris toast][pol-toast], [NN/g confirmation][nng-confirm] | Existing "Undo delete": keep. The model for undoable destructive actions. | Toast action, List |
| 3 | **Background result**: "Export ready · View". | Zen existing | Existing "Export ready": keep. | Toast |
| 4 | **Page-level condition**: "Payment failed. Update your card to keep your plan." + Update payment. | [Polaris banner][pol-banner] (1–2 sentences, how to resolve) | Existing "Page-level notice": keep. | AlertBanner Medium |
| 5 | **Section context inside a card or dialog**: "This discount can't be combined with free shipping." | [Polaris banner][pol-banner] (placement), [Primer notification messaging][pri-notif] | Existing "Context above a form": keep. Add one inside a Dialog, after an action, instead of closing the dialog. | InlineMessage |
| 6 | **Connectivity**: "Internet disconnected" (rare negative toast), or a persistent banner while offline. | [Polaris toast][pol-toast] | Existing "Connection status": keep as the banner. The negative toast is only for 3-word, non-critical errors. | AlertBanner, Toast |

### A7. Dialogs / modals

Consensus:
- Title = verb + noun statement or question ("Delete customer?", "Discard unsaved changes?"), never "Are you sure you
  want to…". At most two footer buttons, and a tertiary only when it needs the modal's context. Body puts the most
  critical information first ([Polaris modal][pol-modal]).
- Use specific button labels, and prefer undo over confirming every delete ([NN/g confirmation][nng-confirm]).
- Avoid alerts for common undoable actions; button titles are 1–2 words; include Cancel for destructive actions
  ([Apple alerts][hig-alerts]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Delete customer?** "This permanently deletes Jaydon Stanton and 3 saved addresses. Orders stay." · Cancel / Delete customer (danger). | [Polaris modal][pol-modal], [NN/g confirmation][nng-confirm] | Existing "Destructive confirmation": check the verb match and that the consequence is stated. | Dialog theme negative, Button danger |
| 2 | **Discard unsaved changes?** · Keep editing / Discard changes. | [Polaris modal][pol-modal] | Existing "Unsaved changes": keep. | Dialog |
| 3 | **Edit email address** (one field + help: "Notification emails will be sent to this address."). | [Polaris modal][pol-modal] | Existing "Form · Basic": check the title is verb + noun. | ModalForm basic |
| 4 | **Delete workspace "Acme"** with type-to-confirm. | Zen `dialog.md:117` | New or fold into #1: the high-impact variant (a guideline exists, no example seen). | Dialog, InputField |
| 5 | **Anti-pattern pair**: deleting one row needs no dialog → delete + Undo toast. | [Apple alerts][hig-alerts], [NN/g confirmation][nng-confirm] | Guideline visual (Do/Don't) rather than an example. | Toast, Dialog |

### A8. Side panels / sheets

Consensus: view or edit one record in a non-modal panel next to the list, not a modal
([NN/g tables][nng-tables]). Sheets are brief, occasional tasks and not navigation ([Apple sheets][hig-sheets]).
Details pages put status and meta in a secondary column ([Polaris details layout][pol-details-layout]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Employee profile from a table row** (read-only; Message = Primary, Edit = Tertiary). | [NN/g tables][nng-tables] | Existing (templates): must open from a whole-row click. | SidePanel modal, DescriptionList, Avatar Large |
| 2 | **All filters**: "All filters (3)" chip → panel with grouped options, Apply / Clear all. | [Polaris filters][pol-filters] | Existing "Filters" (Chip → SidePanel): keep. | Chip advanced aria-haspopup="dialog", SidePanel small |
| 3 | **Edit project**: form in one column, Cancel / Save, unsaved guard. | Zen `side-panel.md:72` | New or existing. The guard Dialog is the one allowed dialog from a panel. | SidePanel, InputField, Dialog |
| 4 | **Phone equivalents**: Sort by (List + ListItem selected), Filters, Share sheet. | Zen house rule | Existing Bottom Sheet examples: keep. | BottomSheet, List |

### A9. Tabs / segmented

Consensus:
- Tab labels: 1–2 words, one row, sections of the same kind of content, never steps ([NN/g tabs][nng-tabs]). Polaris
  labels are usually one word, read as if the page noun follows ("All", "Open", "Unfulfilled")
  ([Polaris tabs][pol-tabs]).
- Content-switcher labels are nouns of 2–3 words; ellipsis + tooltip if too long ([Carbon switcher][cds-switcher]).
- Segmented: at most ~5 segments on iPhone, nouns, no mix of text and icons ([Apple][hig-segmented]); 2–5 text or up
  to 6 icon-only segments ([Primer][pri-segmented]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Record detail sections**: Overview · Activity 12 · Files 3 · Settings. | [NN/g tabs][nng-tabs] | Rewrite Tabs "Icons and badges" (specimen) into this scenario, under a PageHeader. | Tabs Indicator, BadgeCounter, PageHeader tabs |
| 2 | **Settings page** | Zen existing | Existing: keep. | Tabs, TabPanel |
| 3 | **View switcher** List / Grid (icon-only with names). | [Primer segmented][pri-segmented] | Existing "View switcher": keep. | Segmented |
| 4 | **Chart range** 7D · 30D · 90D · 12M → phone Chip row. | [Apple segmented][hig-segmented] | Existing "Metric period switch" / "Period filter on a phone": keep. | Segmented, Chip normal |
| 5 | **Inbox · Mentions** with counters. | Zen existing | Existing "Tabs with counters": keep. | Segmented + BadgeCounter |

### A10. Chips / filters

Consensus:
- Promote only the 2–3 most-used filters. Show the value alone when it is clear ("Fulfilled") and add the category
  when ambiguous ("High risk"). The query field names the object ("Filter orders") ([Polaris filters][pol-filters]).
- Material has four chip types (assist, filter, input, suggestion); filter labels are nouns or adjectives
  ([Material chips][m3-chips]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Orders toolbar**: Search "Search orders" · Status · Payment · Date · All filters (n) · Clear all. | [Polaris filters][pol-filters] | Existing "Filter bar": check it promotes ≤ 3 dimensions and puts the rest behind "All filters". | Search, Chip advanced, SidePanel, Button tertiary |
| 2 | **Assignee / people filter** | Zen existing | Existing "People filter": keep. | Chip advanced + Avatar items |
| 3 | **Onboarding interests** (select topics). | [Material chips][m3-chips] | Existing "Selectable topics": keep. | Chip normal aria-pressed |
| 4 | **AI prompt suggestions** | [Material chips][m3-chips] (suggestion) | Existing AI Chat block: keep. | Chip normal + icon |
| 5 | **Mobile filter row + Sort sheet** | Zen house rule | Existing "Mobile filter row": keep. | Chip, BottomSheet |

### A11. Forms / inputs

Consensus:
- Labels: nouns, 1–3 words, sentence case, no colon. Placeholder is never the label ([Primer forms][pri-forms],
  [Carbon forms][cds-forms]).
- Mark the minority, optional or required ([Carbon forms][cds-forms]).
- Validate when the person leaves the field, not before ([Polaris text field][pol-textfield]).
- Show the error next to the field and keep the input ([NN/g errors][nng-errors]).
- One save per page; don't mix auto-save and explicit save ([Primer saving][pri-saving]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Checkout details** (address, phone with country). | Zen existing | Existing: keep; check label word counts. | InputField, SelectField, Flag leading |
| 2 | **Add employee** (HR): Full name · Work email · Department · Start date · Manager. | [Primer forms][pri-forms] | Existing "Form · 1-3 with preview" could be re-themed onto the HR dataset. | ModalForm 1-3, DateField, AutocompleteField |
| 3 | **Workspace settings** (explicit save, one Save). | [Primer saving][pri-saving] | Existing "Workspace settings": keep. | Form, ActionBar |
| 4 | **Sign-up with rules** | Zen existing | Existing "Sign-up form": keep. | InputConditions |
| 5 | **Submit with errors** → summary + inline errors + focus on the first. | [NN/g errors][nng-errors] | Existing "Form error summary": keep. | InlineMessage, error text |

### A12. Navigation: sidebars and top bars

Consensus:
- Drawer or sidebar for 5+ destinations, labels short and in sentence case, grouped by section
  ([Material drawer][m3-drawer]).
- Tab-bar labels are single words where possible ([Apple tab bars][hig-tabbars]).
- Toolbar titles stay under ~15 characters ([Apple toolbars][hig-toolbars]).
- Header links are nouns, not verbs ([Carbon UI shell][cds-shell]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Admin shell**: Home · Orders 12 · Products · Customers · Analytics · Marketing; Settings / Help in the footer; top bar Search + account. | [Polaris index layout][pol-index-layout], [Material drawer][m3-drawer] | Existing "Workspace + members" / App Shell: align labels to 1–2 word nouns with counters only where actionable. | AppShell, Sidebar, Search, BadgeCounter |
| 2 | **Mobile root**: large title "Inbox" + Bottom navigation 4 destinations. | [Apple tab bars][hig-tabbars] | Existing "Tabbed app": keep. | TopNavigation large, BottomNavigation |
| 3 | **Mobile child**: compact title "Order #1020", Back chevron. | [Apple toolbars][hig-toolbars] | Existing "Collapse on scroll": check the collapsed title ≤ 24 chars (`top-navigation.md:110`). | TopNavigation compact |
| 4 | **Collapsed rail + flyout** | Zen existing | Existing: keep. | Sidebar rail, SidebarSubMenu |

### A13. Page headers

Consensus ([Polaris page][pol-page], [Polaris index layout][pol-index-layout]):
- An index page's title is the object type in plural ("Orders"), and titles are not truncated.
- Breadcrumbs appear when the page has a parent. Creating the resource is the primary action, top right.
- Secondary actions may drop the noun when it is the page's object ("Export", "Import").
- Object pages offer previous/next.

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Index**: "Orders" · Export, Import (Tertiary) · Create order (Primary). | [Polaris page][pol-page] | Existing Breadcrumbs "Page header" / App Shell: align to this. | PageHeader, Button |
| 2 | **Detail**: Back "Orders" · "#1020" + meta Badges (Paid · Unfulfilled) · Refund, Edit, ⋯ · prev/next. | [Polaris page][pol-page], [Polaris details layout][pol-details-layout] | New detail header example (or template). | PageHeader, Badge, Menu, IconButton |
| 3 | **Settings**: "Notifications" + one-sentence description, no Primary in the header (save at the bottom). | [Primer saving][pri-saving] | Existing settings examples: check. | PageHeader, Form |
| 4 | **Long title at 390 px** wraps to 2 lines, never ellipsis. | [Polaris page][pol-page], [Carbon overflow][cds-overflow] | Edge-case card or fold into #2. | PageHeader |

### A14. Pagination

Consensus: paginate lists of more than 25 items ([Polaris pagination][pol-pagination]) and resource lists and index
tables past 50 ([Polaris IndexTable][pol-it]). On mobile, load more near the end instead. Carbon puts the
items-per-page choice in the bar ([Carbon pagination][cds-table]). Zen covers the ≥ 3 pages rule and the range copy
(`pagination.md:76,84`).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | Table footer "1 - 50 of 1,284 orders" + page size. | [Polaris IndexTable][pol-it] | Existing "Table footer": keep. | Pagination Inline |
| 2 | Search results (numbered). | Zen existing | Existing: keep. | Pagination |
| 3 | Audit log (type a page). | Zen existing | Existing: keep. | Pagination Manually |
| 4 | Mobile feed: "Load more" / auto-load, no page numbers. | [Polaris pagination][pol-pagination] | New (small) or a guideline visual. | Button tertiary, Skeleton |

### A15. Avatars

Consensus: alt text is the person's name, or "" when the name is shown next to it; size follows importance
([Polaris avatar][pol-avatar]). Zen covers the max-5 stack and initials (`avatar.md:61`).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | Assignee in a table cell (24 px, or 32 px with a caption). | Zen `table/media-size-by-subtext` | Covered in A1 #2. | TableMedia |
| 2 | "Shared with" stack of 5 + "+3". | Zen existing | Existing "Shared with": keep. | AvatarStack |
| 3 | Workspace switcher (square avatars). | Zen existing | Existing: keep. | Avatar square |
| 4 | Presence: "Team online now" (dot + text equivalent). | Zen `avatar.md` | Existing "Presence": give it a product title and a text status. | Avatar status |

### A16. Badges / tags

Consensus:
- Badge labels: one word, two for partial states, in the past tense ("Paid", "Refunded", "Partially fulfilled"), from
  a fixed vocabulary ([Polaris badge][pol-badge]).
- Lozenges carry workflow status, system state, priority and permission. They are non-interactive and sentence case;
  use Tags for descriptive metadata ([Atlassian lozenge][ads-lozenge]).
- Tags stay under ~20 characters and never wrap ([Carbon tag][cds-tag]).
- Status indicators combine shape, colour and text, with no more than 5–6 kinds per view ([Carbon status][cds-status]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | **Order status vocabulary**: Paid · Pending · Partially paid · Refunded · Voided / Fulfilled · Unfulfilled · Partial. | [Polaris badge][pol-badge] | New shared vocabulary map (status → theme) used by the Table, Badge and templates. | Badge Subtle |
| 2 | **Employee status**: Active · On leave · Onboarding · Offboarding. | [Atlassian lozenge][ads-lozenge] | Same map, HR domain. | Badge |
| 3 | **Priority** Urgent · High · Medium · Low. | Zen existing | Existing "Priority labels": keep. | Badge + icon |
| 4 | **Deployment** Live · Building · Failed. | Zen existing | Existing "Deployment status": keep. | Badge |
| 5 | **Keywords / recipients in a field** | [Carbon tag][cds-tag], [Primer token][pri-token] | Existing Tag examples: keep; "+3" overflow once the field can't grow. | Tag, AutocompleteField |

### A17. Progress / loading

Consensus ([Primer loading][pri-loading]):
- Under 1 s: no indicator. 1–3 s: indeterminate. 3–10 s: determinate. Over 10 s: a background task.
- Show items as they load.

Progress bars are not for page loads; use skeletons ([Polaris progress][pol-progress]).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | Storage quota "38.2 of 50 GB". | Zen existing | Existing: keep. | ProgressBar status quota |
| 2 | Setup checklist "3 of 5 steps". | Zen existing | Existing: keep. | ProgressBar, List |
| 3 | File uploads with one failure + Retry. | Zen existing | Existing "File uploads": keep. | FileUpload |
| 4 | **Long export as a background task** → "Export ready · View" toast. | [Primer loading][pri-loading] | New link-up: progress in an inline row, then a toast. | ProgressBar, Toast |

### A18. Charts

Consensus: each chart answers one question; test with 1–2 points and with 100+ points; watch sparse and spiky data
([Polaris data visualizations][pol-dataviz]). Prefer length and position (bars, lines); colour is not for magnitude
([NN/g dashboards][nng-dash]). Zen covers 4–12 points and ≤ 7 series (`chart.md:17`).

| # | Scenario | Source | What Zen should show | Zen components |
| --- | --- | --- | --- | --- |
| 1 | Sales over time (line) + range switch. | [NN/g dashboards][nng-dash] | Existing "Dashboard tile" / "Range switch": keep. | ChartCard, LineChart, Segmented |
| 2 | Budget allocation (stacked bars + legend). | Zen existing | Existing: keep. | StackBarChart |
| 3 | No data yet. | Zen existing | Existing: keep. | ChartCard + EmptyState |
| 4 | **Sparse data**: 1–2 points ("First sale on Jul 20"). | [Polaris data visualizations][pol-dataviz] | New edge-case card. | LineChart |
| 5 | **Spiky data**: one outlier week. | [Polaris data visualizations][pol-dataviz] | New edge-case card (or a playground toggle). | LineChart |

---

## B + C. Rules, sources, Zen status, detection

### B1. Lines and overflow per element (the "1 line vs 2 lines" matrix)

Principle (sources: [Carbon overflow][cds-overflow], [Codex content overflow][codex-overflow],
[Polaris page][pol-page]): **content wraps; controls whose height must match their siblings stay on one line and
ellipsize; titles, labels, errors and notifications never truncate.** Carbon says it plainly:
"Truncation should not be used on page headers, titles, labels" ([Carbon overflow][cds-overflow]).

Runtime line count (proposed `lines` kind): `lines = Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))`,
or count `Range.getClientRects()` rows for inline text. Ellipsis check: `scrollWidth > clientWidth && text-overflow === "ellipsis"`.

| ID | Element | Max lines · overflow | Source | Zen status | Detection |
| --- | --- | --- | --- | --- | --- |
| L1 | Page title (h1, PageHeader, large title) | 1 target, **2 max, wrap, never ellipsis** | [Polaris page][pol-page] ("Not be truncated"), [Carbon overflow][cds-overflow] | NEW (`page-header.md:71` covers casing only) | RUNTIME: h1 outside the compact bar has lines ≤ 2 and no ellipsis |
| L2 | Compact bar title (phone child screen) | 1 line, ellipsis allowed, ≤ ~24 chars | [Apple toolbars][hig-toolbars] (< 15 chars), Zen | COVERED `top-navigation.md:110` (CSS ellipsis) | STATIC: literal `title` on compact TopNavigation > 24 chars (warn) |
| L3 | Section heading (h2) | 1 target, wrap, never ellipsis | [Carbon overflow][cds-overflow] | NEW | RUNTIME (same as L1) |
| L4 | Card title | ≤ 2 lines, wrap; meta 1 line (ellipsis) | [Polaris card layout][pol-cardlayout], [Carbon overflow][cds-overflow] | PARTIAL `card.md:86` ("one line of meta"), no title limit | RUNTIME |
| L5 | Dialog title | 1 line desktop, may wrap to 2 on phone, never ellipsis | [Primer dialog][pri-dialog] (titles may wrap), [Apple alerts][hig-alerts] (short titles) | COVERED `dialog.md:134` (≤ 1 line). Proposal: allow 2 on phone | RUNTIME |
| L6 | Dialog body (confirmation) | ≤ 3 lines; consequence first | [Polaris modal][pol-modal], [Apple alerts][hig-alerts] (avoid scrolling alerts) | PARTIAL (`dialog.md:134` "states the consequence") | RUNTIME (warn) |
| L7 | Side panel / sheet title | 1 target, 2 max, never ellipsis | [Carbon overflow][cds-overflow] | NEW (`side-panel.md:85` covers naming only). Bottom-sheet title ellipsizes in CSS: CONFLICT to review | RUNTIME |
| L8 | List item title | 1 line, ellipsis; full text on open or tooltip | [Material lists][m2-lists] (excerpt), [Apple lists][hig-lists] | COVERED `list-item.md:24,75` | RUNTIME `truncation` (T2) |
| L9 | List item caption | ≤ 2 lines, then clamp | [Material lists][m2-lists] (max three lines per item) | PARTIAL `list-item.md:75` ("may wrap to a second line", no clamp) | RUNTIME lines ≤ 2 |
| L10 | Table column header | 1–2 words; **wrap to 2 lines, then truncate + tooltip** | [Carbon table][cds-table], [Primer table][pri-table] | PARTIAL `table.md:162` (short nouns); CSS `table.css:22` nowrap | STATIC: literal `header` > 3 words (warn) |
| L11 | Table identifier / primary cell | 1 line in index tables (row opens detail); **wrap ≤ 2** in report tables (shared prefixes become identical when truncated) | [Polaris DataTable][pol-dt], [Primer table][pri-table] | CONFLICT/PARTIAL `table.md:148` (always truncate) | GUIDE (split by table type) |
| L12 | Table text cell (secondary) | 1 line, ellipsis + tooltip, or the detail view shows it | [Primer table][pri-table] (truncation as last resort + tooltip) | PARTIAL `table.md:148` (detail view) | RUNTIME `truncation` |
| L13 | Table number / date / status cell | 1 line, **never wrap, never truncate** (widen the column) | [Polaris DataTable][pol-dt] | PARTIAL: right-aligned cells nowrap (`table.css:6`); dates and badges not stated | RUNTIME: numeric/date cells lines = 1 and no ellipsis |
| L14 | Button label | 1 line, never wrap; shorten instead of truncating; 1–3 words | [Material buttons][m2-buttons] (excerpt), [Apple alerts][hig-alerts] (1–2 word titles) | COVERED `button.md:75` (1–3 words); CSS nowrap + ellipsis | STATIC `copy/label-length`; RUNTIME: ellipsized button label = warn |
| L15 | Chip label | 1 line, ellipsis + tooltip past ~20 chars | [Codex overflow][codex-overflow] (chips ellipsize), [Carbon tag][cds-tag] (< 20 chars) | PARTIAL (CSS ellipsis, `chip.md:112` wording only) | RUNTIME `truncation`; STATIC literal > 20 chars |
| L16 | Badge | 1 line, 1–2 words, **no truncation** (a non-focusable truncated label can't be read) | [Polaris badge][pol-badge], [Atlassian lozenge][ads-lozenge] | COVERED `badge.md:72` (words); CSS ellipsis exists | STATIC: literal > 2 words; RUNTIME: ellipsized badge = warn |
| L17 | Tag (value in field) | 1 line, ≤ 24 chars, ellipsis + tooltip on hover **and focus** | [Carbon tag][cds-tag] | COVERED `tag.md:54` | RUNTIME `truncation` |
| L18 | Tab label | 1 line, 1–2 words; overflow scrolls, never shrinks the text | [NN/g tabs][nng-tabs] ("usually be 1-2 words"), [Material tabs][m-tabs] (excerpt) | PARTIAL `tabs.md:92` ("short labels") | STATIC `copy/label-length` (≤ 2 words) |
| L19 | Segmented label | 1 line, 1–2 words; fullWidth ellipsizes | [Carbon switcher][cds-switcher], [Apple segmented][hig-segmented] | COVERED `segmented.md:78` | STATIC `copy/label-length` |
| L20 | Menu / popover item | 1 line, ellipsis + tooltip | [Carbon menu][cds-menu] | COVERED `menu.md:57`, `popover.md:127` (no tooltip mention: PARTIAL) | RUNTIME `truncation` |
| L21 | Breadcrumbs | **1 line, never wraps**: collapse middle items, truncate long labels with tooltip | [Carbon breadcrumb][cds-breadcrumb], [NN/g breadcrumbs][nng-breadcrumbs] | PARTIAL (`maxItems`, CSS label ellipsis; "never wraps" not stated) | RUNTIME: breadcrumb list height = 1 line |
| L22 | Sidebar / nav item | 1 line, 1–2 words, ellipsis + tooltip for user-named items (projects, workspaces) | [Material drawer][m3-drawer] (excerpt), [Apple tab bars][hig-tabbars] | COVERED `sidebar.md:94,116` (tooltip not stated) | RUNTIME `truncation` |
| L23 | Toast | Title 1 line (2–4 words); description ≤ 1 line; whole toast ≤ 2 lines | [Polaris toast][pol-toast] ("Not go over 3 words"), [Carbon notification][cds-notif], [Material snackbar][m-snackbar] (excerpt) | COVERED `toast.md:85` + `toast/concise` (≤ 60 chars) | RUNTIME lines; STATIC (W5) |
| L24 | Inline message / alert banner | Title 1 line; body 1–2 sentences, ≤ 2 lines | [Carbon notification][cds-notif], [Polaris banner][pol-banner] | COVERED `inline-message.md:72`, `alert-banner.md:67` | RUNTIME lines |
| L25 | Empty state | Title 1 line (2 on phone), caption 1 sentence (≤ 2 lines), CTA 1–3 words | [Atlassian empty state][ads-empty], [Cloudscape][cs-empty] | COVERED caption `empty-state.md:66`; title lines NEW | STATIC: caption with > 1 sentence terminator; RUNTIME lines |
| L26 | Input label | 1 line, 1–3 words, no colon | [Carbon forms][cds-forms], [Primer forms][pri-forms], [Carbon dropdown][cds-dropdown] | PARTIAL `input.md:352` (nouns) | STATIC `copy/label-length` + trailing ":" |
| L27 | Help text / error text | Help 1 line; error ≤ 2 lines, a sentence with the fix | [NN/g errors][nng-errors] | COVERED `input.md:326,352` | RUNTIME lines |
| L28 | Tooltip | ≤ ~80 chars, no interactive content | [Apple buttons][hig-buttons] (brief phrase) | COVERED `tooltip.md:62` + `tooltip/short` | — |
| L29 | Metric | Label 1 line (noun); value 1 line, never truncated; trend 1 line | [NN/g dashboards][nng-dash] | PARTIAL `metric.md:106` (nouns) | RUNTIME lines + no ellipsis on `.zen-metric__value` |
| L30 | Description list value | Wraps, never truncated | [Primer table][pri-table] (wrap preferred) | COVERED `description-list.md:77` | — |

### B2. Truncation mechanics

| ID | Rule (testable) | Source | Zen status | Detection |
| --- | --- | --- | --- | --- |
| T1 | Truncate only when ≥ 4 characters stay visible and ≥ 3 are hidden; otherwise wrap or widen. | [Carbon overflow][cds-overflow], [PatternFly truncate][pf-truncate] | NEW | RUNTIME: visible chars ≈ clientWidth / average glyph width (measure "0" width) ≥ 4 |
| T2 | Every ellipsized string can be read in full: tooltip on hover **and** keyboard focus (or a `title` for non-focusable text), or the row opens a detail view with the full value. | [Carbon tag][cds-tag], [Primer truncate][pri-truncate], [Codex overflow][codex-overflow] | COVERED as principle `text.md:77`; no check | RUNTIME `truncation`: ellipsized element with no `title`, no `aria-describedby` tooltip and no clickable row ancestor → warn |
| T3 | Never truncate: page/section/dialog/panel titles, form labels, errors, validation, notifications, badges. | [Carbon overflow][cds-overflow], [Polaris page][pol-page], [Atlassian lozenge][ads-lozenge] | NEW (one consolidated line in `text.md`) | RUNTIME (subset of `truncation` by selector) |
| T4 | Truncate in the **middle** for IDs, file names and URLs where the end matters ("Q3-report…-final.pdf"). | [Polaris grammar][pol-grammar], [PatternFly truncate][pf-truncate] | NEW (Text has line/lines only) | GUIDE (component support = P3) |
| T5 | Wrap by default; ellipsize only where equal heights matter (button groups, chips, selects, rows). | [Codex overflow][codex-overflow] | NEW (principle) | GUIDE |
| T6 | Use the ellipsis character "…", never "...". | [Polaris grammar][pol-grammar] | NEW (Zen copy already uses "…") | STATIC `copy/ellipsis-char`: string literal with "..." in JSX text/props (code samples excluded) |
| T7 | Don't shrink or abbreviate labels to fit (tabs, segmented); scroll, switch component, or wrap. | [Material tabs][m-tabs] (excerpt), Zen | COVERED `segmented.md` (Don't abbreviate) | — |

### B3. Casing and wording

| ID | Rule (testable) | Source | Zen status | Detection |
| --- | --- | --- | --- | --- |
| W1 | Sentence case for titles, buttons, labels, tabs, badges, menu items, headers, nav items. | [Polaris grammar][pol-grammar], [Atlassian lozenge][ads-lozenge], [Material drawer][m3-drawer] (excerpt) | COVERED `text.md:86`, `button.md:104`, `page-header.md:71`; not enforced | STATIC `copy/sentence-case`: literal `title`/`label`/`header`/children of Button, Tab, Chip, Badge, MenuItem, SidebarItem where ≥ 2 non-initial words ≥ 3 letters start uppercase; allowlist of proper nouns (Zen, Figma, product names, people) |
| W2 | Buttons and menu items: verb first (+ noun), 1–3 words, no articles ("Add menu item", not "Add a menu item"), no end punctuation. | [Polaris button][pol-button], [Polaris action list][pol-actionlist] | COVERED `button.md:75`, `menu.md:106`; articles/punctuation NEW | STATIC: 2nd word ∈ {a, an, the}; trailing [.!] |
| W3 | A page's secondary actions may drop the noun when it is the page's object ("Export" on Orders); ambiguous verbs keep it ("Cancel order"). | [Polaris page][pol-page] | NEW nuance to `button.md:75` | GUIDE |
| W4 | Destructive confirmations: title = verb + object as a question ("Delete customer?"), **never "Are you sure…"**; the primary repeats the verb. | [Polaris modal][pol-modal], [NN/g confirmation][nng-confirm] | COVERED `dialog.md:115`; not enforced | STATIC `dialog/no-are-you-sure` (title literal /^are you sure/i) + `dialog/verb-matches-action` (theme negative: first word of title = first word of primary label) |
| W5 | Toast: object + past-tense verb ("Order archived"); no "successfully", no end period; action = one verb (Undo, View, Retry), never Cancel / Dismiss / OK / Got it. | [Polaris toast][pol-toast], [Carbon notification][cds-notif] (no period in titles) | COVERED tense `toast.md:105`; rest NEW | STATIC: extend `toast/concise` (/successfully/i, trailing ".", action label ∈ banned list) |
| W6 | Status badges: 1 word (2 for partial states), past tense or adjective, from one vocabulary per domain. | [Polaris badge][pol-badge] | PARTIAL `badge.md:72` | GUIDE + shared vocabulary (E2) |
| W7 | Filter chip value: alone when unambiguous ("Fulfilled"); add the category when not ("High risk"). | [Polaris filters][pol-filters] | PARTIAL `chip.md:112` | GUIDE |
| W8 | Search placeholder names the object ("Search orders"). | [Polaris filters][pol-filters] | COVERED `search.md:71,91` | — |
| W9 | Empty-state title: "No [objects] yet" (first run) / "No [objects] match" or "No results for “q”" (filtered); no end punctuation; caption is one sentence with a period. | [Cloudscape empty states][cs-empty], [Atlassian empty state][ads-empty] | COVERED `empty-state.md` Do + Content | STATIC: EmptyState `title` literal ending in "." (warn) |
| W10 | Form labels: nouns, 1–3 words, no colon; mark only the minority (optional or required). | [Carbon forms][cds-forms], [Primer forms][pri-forms] | COVERED minority `form.md:58`; words/colon NEW | STATIC `copy/label-length` + `input/label-no-colon` |
| W11 | Tabs, segmented and nav labels are nouns, not verbs. | [Apple segmented][hig-segmented], [Carbon UI shell][cds-shell] | COVERED `tabs.md` Content, `segmented.md:97`, `sidebar.md:116` | — |
| W12 | No "please", "thank you" or exclamation marks in system messages. | [Cloudscape empty states][cs-empty] | NEW | STATIC: /\bplease\b\|!$/i in title/label literals (warn) |
| W13 | Link text names the destination ("Order #001", not "Order" or "Learn more"). | [Polaris banner][pol-banner], [Atlassian section message][ads-section] | COVERED `link/vague-text` | — |

### B4. Numbers, dates, alignment

| ID | Rule (testable) | Source | Zen status | Detection |
| --- | --- | --- | --- | --- |
| N1 | Right-align numbers **and their headers**; left-align text; never centre a column. | [Polaris DataTable][pol-dt], [Primer table][pri-table] | COVERED `table.md:132`; header follows `align` in CSS | STATIC `table/numeric-align`: column whose `id`/`header` matches /amount\|total\|price\|qty\|quantity\|count\|balance\|salary\|cost\|revenue\|%/i without `align: "right"\|"end"`; RUNTIME: numeric cell text with `text-align` ≠ end |
| N2 | Tabular figures in numeric columns (`font-variant-numeric: tabular-nums`). | [Primer table][pri-table] | PARTIAL: Metric, Progress and DescriptionList have it; **Table cells don't** | RUNTIME: right-aligned cells' computed `font-variant-numeric`; fix = component change (P2) |
| N3 | Units and currency in the header, not repeated per cell (unless a column mixes units). | [Polaris DataTable][pol-dt] | COVERED `table.md:162` | GUIDE |
| N4 | Same number of decimals within a column. | [Polaris DataTable][pol-dt] | NEW | RUNTIME: numeric cells in one column with differing decimal counts |
| N5 | Thousands separators; don't abbreviate in tables or detail views ("12,000", not "12 k"). Chart axes and KPI tiles may abbreviate ("$23.4K") when the exact value is reachable (tooltip or detail). | [Polaris grammar][pol-grammar] | PARTIAL `chart.md:94` (abbreviations only) | STATIC: literal /\d\s?[kK]\b/ inside Table cell data (warn) |
| N6 | Dates use the month name, never numerals only, no ordinals: "Dec 11, 2024", "January 23–April 1". | [Polaris grammar][pol-grammar] | NEW | STATIC `copy/date-format`: string literals in `src/platform/**` matching /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/ or rendered ISO dates |
| N7 | Timestamps follow one ladder: Just now · 13 minutes ago · 10:30 am · Yesterday at 10:30 am · Friday at 10:30 am · Aug 14 at 10:30 am · Aug 14, 2016. Date and time are joined by "at". | [Polaris grammar][pol-grammar] | NEW | GUIDE (+ optional demo helper, P3) |
| N8 | Empty cells: pick one convention (blank by default, or "—" read as "None"). | [Primer table][pri-table] | NEW (decision) | GUIDE |
| N9 | Counts agree with their noun. | Zen | COVERED `copy/plural-count` | — |
| N10 | Values arrive formatted (currency, %, units). | Zen | COVERED `metric/formatted-value`, `example-patterns.md` §4 | — |

### B5. Touch targets and size

| ID | Rule (testable) | Source | Zen status | Detection |
| --- | --- | --- | --- | --- |
| S1 | Pointer targets ≥ 24×24 CSS px, or spaced so a 24 px circle doesn't overlap a neighbour; inline links exempt. | [WCAG 2.5.8][wcag-258] | COVERED `audit.mjs` `targets` (mobile), `example-patterns.md` §6 | — |
| S2 | On phones, primary touch controls (buttons, rows, chips, nav items) are ≥ 44 px tall (Apple 44×44 pt default; Material 48 dp). | [Apple accessibility][hig-a11y], [Material chip spec][mdc-chip], [NN/g touch targets][nng-touch] (~1 cm) | PARTIAL `mobile/full-size-controls` (Toggle, inputs), Bottom Sheet 48 px rows | RUNTIME (390 px): button / `[role=tab]` / `.zen-list-item` / `.zen-chip` height < 44 → warn |
| S3 | Space between targets matters as much as size. | [Apple accessibility][hig-a11y] | NEW | RUNTIME: gap < 8 px between two < 44 px targets (warn) |

### B6. Which component, and only that one

| ID | Situation → only component | Not | Source | Zen status | Detection |
| --- | --- | --- | --- | --- | --- |
| C1 | Status of a record → **Badge** (text + semantic theme) | Tag, Chip, coloured text, a dot alone | [Atlassian lozenge][ads-lozenge], [Polaris badge][pol-badge], [Carbon status][cds-status] | COVERED `tag.md`, `badge.md:63`, `table.md:149`; not enforced | STATIC `badge/status-not-tag`: Tag/Chip whose literal label ∈ status vocabulary (Paid, Pending, Active, Failed, Draft, Overdue…) and Chip without onClick/selected |
| C2 | Count → BadgeCounter | Badge with a number | Zen | COVERED `badge/count-uses-counter` | — |
| C3 | Filter / sort / scope → Chip advanced | Button, Segmented | [Polaris filters][pol-filters] | COVERED `button/filter-is-chip` | — |
| C4 | Value inside a field → Tag | Badge | [Carbon tag][cds-tag] | COVERED `tag.md` | — |
| C5 | 2–5 views of the same content → Segmented; > 5 or long labels → Tabs / Select | — | [Apple segmented][hig-segmented], [Primer segmented][pri-segmented] | COVERED `segmented/option-count` | — |
| C6 | 2–7 sections of a page → Tabs; steps → Stepper | Tabs for steps | [NN/g tabs][nng-tabs] | COVERED `tabs/item-count`, `tabs.md` | — |
| C7 | Irreversible destructive action → Dialog (negative) | SidePanel, Toast | [NN/g confirmation][nng-confirm] | COVERED `side-panel/not-for-confirmations`, `dialog/negative-uses-danger` | — |
| C8 | **Undoable** destructive action (archive, delete one row) → act + Toast with Undo | Confirmation Dialog | [NN/g confirmation][nng-confirm], [Apple alerts][hig-alerts] | PARTIAL (`toast.md` "prefer Undo") → NEW line in `dialog.md` | GUIDE |
| C9 | Transient result of the user's action → Toast; persistent page condition → AlertBanner; section context → InlineMessage; one field → error text | Toast for errors to fix | [Atlassian section message][ads-section], [Primer notification][pri-notif], [NN/g indicators][nng-ivn] | COVERED (toast, alert-banner, inline-message guidelines) | — |
| C10 | Critical or error messages don't auto-dismiss | Auto-dismissing negative toast | [Atlassian flag][ads-flag] | NEW (component behaviour; P2) | RUNTIME/unit test on ToastStack |
| C11 | Details of one record from a list → SidePanel | Dialog | [NN/g tables][nng-tables] | COVERED `side-panel.md` Use it for | — |
| C12 | Loading: < 1 s nothing; layout known → Skeleton; 1–3 s indeterminate; > 3 s determinate progress; > 10 s background task + toast | Spinner on every fetch | [Primer loading][pri-loading], [Polaris progress][pol-progress] | PARTIAL `skeleton.md` Don't | GUIDE |
| C13 | Compare records on ≥ 3 attributes → Table; open items (title + one meta) → List; browse mixed items → Cards | Cards as a list replacement | [Polaris ResourceList][pol-rl], [Polaris DataTable][pol-dt], [NN/g cards][nng-cards] | PARTIAL `card.md` ("Rows of comparable data → Table") | GUIDE |
| C14 | Metrics → MetricCard / Metric | Card + Heading + number | Zen house rule | COVERED (house rule, `metric.md`) | STATIC idea: Card containing Heading + a Text with a formatted number (P3) |
| C15 | Item / category icons → DockIcon | Bare Icon beside Avatars | Zen house rule | COVERED (house rule) | — |
| C16 | Setting with immediate effect → Toggle; in a form submitted later → Checkbox | Toggle inside a submitted form | [NN/g toggle][nng-toggle] | COVERED `form/toggle-outside-form` | — |
| C17 | 5+ destinations → Sidebar; 3–5 phone roots → BottomNavigation | Tabs for app navigation | [Material drawer][m3-drawer], [Apple tab bars][hig-tabbars] | COVERED `bottom-navigation/destinations`, `sidebar.md` | — |
| C18 | Marketing / upsell → InlineMessage custom (callout) | AlertBanner | [Polaris banner][pol-banner] | PARTIAL (`inline-message.md` custom) → NEW line in `alert-banner.md` | GUIDE |
| C19 | Card header actions → flat IconButton + tooltip; CTAs in the card footer; item actions on the item | CTA in the card header | [Polaris card layout][pol-cardlayout] | NEW (`card.md`) | GUIDE |
| C20 | Destructive menu items last, after a divider | Mixed in | [Carbon overflow menu][cds-overflowmenu] | COVERED `menu.md:107` | — |

### B7. Counts and limits

| ID | Rule | Source | Zen status | Detection |
| --- | --- | --- | --- | --- |
| K1 | ≤ 1 Primary per surface | [Polaris card][pol-card], [Polaris modal][pol-modal] | COVERED `button/one-primary`, `page-header/one-primary` | — |
| K2 | Dialog footer: 2 buttons (+ a tertiary only if it needs the dialog's context, never to dismiss) | [Polaris modal][pol-modal] | COVERED `dialog.md` Do | — |
| K3 | Promoted filters ≤ 3; the rest behind "All filters" | [Polaris filters][pol-filters] | PARTIAL (`example-patterns.md` §3 "All filters") | STATIC: > 3 Chip advanced siblings without an "All filters" chip (warn) |
| K4 | Promoted bulk actions ≤ 2; the rest in ⋯ | [Polaris IndexTable][pol-it] | PARTIAL `popover/bulk-action-limit` (6) | GUIDE |
| K5 | ≤ 5–6 kinds of status indicator per view | [Carbon status][cds-status] | NEW | RUNTIME: distinct Badge theme count per example > 6 (warn) |
| K6 | ≤ 2 badges per row; ≤ 4 KPI tiles per row; ≤ 5 avatars per stack | Zen | COVERED `badge.md:65`, `metric.md:98`, `avatar.md:61` | — |
| K7 | ≤ 3 groups in a toolbar | [Apple toolbars][hig-toolbars] | NEW (editor toolbars) | GUIDE |
| K8 | One banner per page | [Primer banner][pri-banner] | COVERED `alert-banner.md` Don't | — |
| K9 | Paginate lists past 25–50 items (or ≥ 3 pages) | [Polaris pagination][pol-pagination] | COVERED `pagination/worth-paging` | — |

---

## 4. Prioritised proposals (for the user to approve; nothing is implemented)

Tier sizes follow AGENTS.md §C (proportional process). Guideline lines go into `tools/usage-guard/guidelines.source.mjs`
(the `.md` files are generated). New harness rules go into `tools/usage-guard/check-usage.mjs`, each with a
`zen-allow-*` escape and a selftest fixture. Runtime kinds go into `tools/platform-audit/quality-checks.mjs` as
warnings, with a seeded baseline like `outline-*`.

### P1: highest value, low risk

Guideline lines:
- **G1 · Text overflow matrix.** One table in `text.md` (principle + B1 rows L1–L30 + T1–T3, T5). Each component
  guideline gets one line pointing to its row. It closes the "1 line vs 2 lines" question in one place.
- **G2 · Dialog.**
  - "Don't confirm what Undo can reverse: act, then offer Undo in a Toast" (C8).
  - "Never title a confirmation 'Are you sure…'" (W4).
- **G3 · Dates and numbers.** In `text.md` and `example-patterns.md` §4, add N5–N8: month-name dates, the timestamp
  ladder, no "12 k" in tables, one empty-cell convention. Decide N8 first.
- **G4 · Table types.** In `table.md`: an index table (rows open, ids truncate at 1 line) vs a report table (no row
  click, long text wraps ≤ 2 lines, totals). This resolves L11 against Polaris DataTable.

Harness rules (static, warn):
- **H1 `copy/label-length`.** Word caps from literal labels: Button ≤ 3, MenuItem ≤ 3, InputField label ≤ 3,
  Tab / Segmented option / Badge / Sidebar item ≤ 2, Table `header` ≤ 3, Chip ≤ 20 chars. Code samples are skipped,
  as the existing rules do. Allow: `zen-allow-label-length`.
- **H2 `copy/sentence-case`.** From W1, with a proper-noun allowlist. Allow: `zen-allow-title-case`.
- **H3 `badge/status-not-tag`.** From C1: a status word on a Tag, or on a static Chip.
- **H4 `dialog/no-are-you-sure` + `dialog/verb-matches-action`.** From W4.

Runtime audit (warn, baselined):
- **R1 `lines`.** A selector → max-lines map from B1:
  - h1 ≤ 2; card and panel titles ≤ 2; dialog title ≤ 1 (≤ 2 at 390 px).
  - Toast title 1, toast description 1; inline-message title 1; empty-state title ≤ 2.
  - List caption ≤ 2; input help 1; breadcrumbs 1.
  - Buttons, chips, tabs, badges and menu items: 1.
- **R2 `truncation`.** From T1–T3: an ellipsized element with no way to read it in full, fewer than 4 visible
  characters, or truncation on a never-truncate selector (titles, labels, errors, badges).

Example rewrites (move toward real-product scenarios, keep existing interactions):
- **E1 · Table.**
  - "Bulk selection" → **Orders** index (A1 #1).
  - "Sortable members" → **Employee directory** (A1 #2).
  - Add the load-error state (A1 #6).
- **E2 · Shared demo dataset + status vocabulary.**
  - Extend `PlatformPaginationData.tsx` / `PlatformMobileData.ts` with orders, customers, employees, invoices and
    tasks: real-looking names (Vietnamese mix), money, and dates in the N6/N7 format.
  - Add one status → Badge theme map per domain (A16).
  - All table, list, metric and badge examples read from it.
- **E3 · Specimen → scenario.** These titles and descriptions read like variant galleries; check them on screenshots.
  Then either move each to the playground or guideline visuals, or rename it to a product task:

  | Current example | Proposed product task |
  | --- | --- |
  | Card "Surfaces" | move to playground or guideline visual |
  | Card "Stat cards" | merge into Metric "KPI cards" |
  | Metric "Sizes" | move to playground |
  | Tabs "Icons and badges" | "Issue detail sections" |
  | Divider "Labelled separator" | "Sign in: or continue with" |
  | Dock-icon "On color" | check on screenshot |
  | Slider "On media" | "Video player volume" |
  | Avatar "Presence" | "Team online now" |
  | Stepper "Upload / Validate / Publish / Icon steps / Ordered / Paid" | consolidate into 4–5 flows: Checkout, Order tracker, Import wizard, Onboarding, Error and recovery |

### P2: medium value, or needs a component change (approval + Figma check first)

- **Components:**
  - `tabular-nums` on right-aligned Table cells (N2).
  - Toast: action toasts ≥ 10 s ([Polaris][pol-toast]); negative toasts don't auto-dismiss (C10,
    [Atlassian][ads-flag]); today `ToastStack.tsx:61` uses duration + 3 s.
  - Clamp the ListItem caption at 2 lines (L9).
  - Review the Bottom Sheet title ellipsis against T3 (L7).
- **Static rules:**
  - `table/numeric-align` (N1 heuristic).
  - `copy/date-format` (N6).
  - `copy/ellipsis-char` (T6).
  - Extend `toast/concise` (W5).
  - `input/label-no-colon` (W10).
  - `filters/promoted-limit` (K3).
- **Runtime:**
  - `numeric-cells`: alignment, tabular figures, same decimals (N1, N2, N4).
  - Phone targets ≥ 44 px (S2) as a warning, separate from WCAG `targets`.
- **Guideline lines:**
  - Loading timing ladder (C12).
  - Compare → Table / open → List / browse → Cards (C13).
  - Upsell = InlineMessage custom, not AlertBanner (C18).
  - Card header vs footer actions (C19).
  - Filter chip ambiguity (W7).
  - No "please" or "!" (W12).
  - ≤ 5–6 status kinds per view (K5).
- **Examples:**
  - Metric "KPI cards" on the shared dataset with one comparison period (A4 #1).
  - "Tile states" (A4 #5).
  - Order detail PageHeader + secondary cards (A3 #2, A13 #2).
  - A report table (A1 #3, after the totals decision).

### P3: nice to have

- Middle truncation in `Text` (T4).
- A demo-only `formatRelative()` helper that implements the N7 ladder.
- Per-example metadata `{ scenario, states: [...] }` plus an audit of the coverage matrix in `example-patterns.md` §1
  (which pages lack empty, error or loading).
- A static hint for hand-built metric cards (C14).
- Chart edge cases: sparse and spiky data (A18 #4–5).
- "All caught up" empty state (A5 #5).
- Mobile "Load more" (A14 #4).
- A manual Mobbin pass using section 6.

---

## 5. Decision points (outside world vs Zen; no change proposed without the user)

1. **Saved views.** Polaris shows list views ("All · Open · Unfulfilled · Unpaid") as Tabs ([Polaris tabs][pol-tabs]).
   Zen says filtering → Chip (`tabs.md`, `chip.md`). Options:
   - (a) keep Chips;
   - (b) allow Tabs only for *named, saved* views, with Chips for ad-hoc filters.
2. **Table header casing.** Zen headers use the All-Caps/S style (Figma, `table.md:24`); Polaris and Carbon use
   sentence case. Keep the style, but write the source strings in sentence case so H2 stays valid and screen readers
   read words, not letters.
3. **Wrap vs truncate in tables.** Polaris DataTable and Primer prefer wrapping; Zen truncates. G4 splits the rule by
   table type.
4. **Toast timing with an action.** Zen: 5 s, or 8 s with an action. Polaris: ≥ 10 s. Spectrum: actionable toasts
   don't auto-dismiss ([React Spectrum toast][rsp-toast], excerpt).
5. **Totals row.** Zen Table has no summary row. The options are (a) DescriptionList under the table or (b) a Figma
   primitive. Never invent one in code.
6. **Primer places Cancel to the right of Submit** ([Primer saving][pri-saving]). Zen keeps Primary last on the right
   (`button.md`), which matches Polaris and Apple. No change; noted so nobody copies Primer here.

---

## 6. Manual Mobbin lookup list (Mobbin blocks automated reads)

Search Mobbin (web + iOS) for these screens and compare them with the Zen example next to each name:

| Look up | Compare with |
| --- | --- |
| Shopify admin "Orders" and "Order details" | A1 #1, A13 #2 |
| Linear "Issues" list and issue detail tabs | A2, A9 #1 |
| Stripe "Payments" table and payment detail panel | A1, A8 #1 |
| Notion database table | A1 #4 |
| Airbnb filters sheet | A10 #5 |
| Revolut / Monzo transaction list with dates | N7 |
| Slack or Gmail "all caught up" empty state | A5 #5 |
| GitHub pull request list with state labels | A16 |
| Google Analytics or Shopify "Analytics" KPI row | A4 #1 |

Record for each: lines per title and caption, where ellipsis appears, date format, and the status words used.

---

## 7. Sources

Polaris doc sources (GitHub, Shopify/polaris, `polaris.shopify.com/content/…`):

[pol-it]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/tables/index-table.mdx
[pol-it-ex]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/pages/examples/index-table-with-bulk-actions.tsx
[pol-dt]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/tables/data-table.mdx
[pol-rl]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/lists/resource-list.mdx
[pol-badge]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/feedback-indicators/badge.mdx
[pol-banner]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/feedback-indicators/banner.mdx
[pol-toast]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/internal-only/toast.mdx
[pol-modal]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/internal-only/modal.mdx
[pol-empty]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/layout-and-structure/empty-state.mdx
[pol-page]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/layout-and-structure/page.mdx
[pol-card]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/layout-and-structure/card.mdx
[pol-cardlayout]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/patterns/card-layout/index.mdx
[pol-tabs]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/navigation/tabs.mdx
[pol-filters]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/selection-and-input/filters.mdx
[pol-pagination]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/navigation/pagination.mdx
[pol-avatar]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/images-and-icons/avatar.mdx
[pol-progress]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/feedback-indicators/progress-bar.mdx
[pol-button]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/actions/button.mdx
[pol-actionlist]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/lists/action-list.mdx
[pol-grammar]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/content/grammar-and-mechanics.mdx
[pol-index-layout]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/patterns/resource-index-layout/variants/default.mdx
[pol-details-layout]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/patterns/resource-details-layout/variants/default.mdx
[pol-settings-layout]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/patterns/app-settings-layout/variants/default.mdx
[pol-dataviz]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/design/data-visualizations.mdx
[pol-textfield]: https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/selection-and-input/text-field.mdx

Carbon (IBM):

[cds-overflow]: https://carbondesignsystem.com/patterns/overflow-content/
[cds-table]: https://carbondesignsystem.com/components/data-table/usage/
[cds-notif]: https://carbondesignsystem.com/components/notification/usage/
[cds-status]: https://carbondesignsystem.com/patterns/status-indicator-pattern/
[cds-empty]: https://carbondesignsystem.com/patterns/empty-states-pattern/
[cds-tag]: https://carbondesignsystem.com/components/tag/usage/
[cds-switcher]: https://carbondesignsystem.com/components/content-switcher/usage/
[cds-breadcrumb]: https://carbondesignsystem.com/components/breadcrumb/usage/
[cds-forms]: https://carbondesignsystem.com/patterns/forms-pattern/
[cds-dropdown]: https://carbondesignsystem.com/components/dropdown/usage/
[cds-menu]: https://carbondesignsystem.com/components/menu/usage/
[cds-overflowmenu]: https://carbondesignsystem.com/components/overflow-menu/usage/
[cds-shell]: https://carbondesignsystem.com/components/UI-shell-header/usage/

Primer (GitHub), doc sources in primer/design:

[pri-table]: https://github.com/primer/design/blob/main/content/components/data-table.mdx
[pri-segmented]: https://github.com/primer/design/blob/main/content/components/segmented-control.mdx
[pri-banner]: https://github.com/primer/design/blob/main/content/components/banner.mdx
[pri-blankslate]: https://github.com/primer/design/blob/main/content/components/blankslate.mdx
[pri-dialog]: https://github.com/primer/design/blob/main/content/components/dialog.mdx
[pri-token]: https://github.com/primer/design/blob/main/content/components/token.mdx
[pri-truncate]: https://github.com/primer/design/blob/main/content/components/truncate.mdx
[pri-loading]: https://github.com/primer/design/blob/main/content/ui-patterns/loading.mdx
[pri-notif]: https://github.com/primer/design/blob/main/content/ui-patterns/notification-messaging.mdx
[pri-forms]: https://github.com/primer/design/blob/main/content/ui-patterns/forms/overview.mdx
[pri-saving]: https://github.com/primer/design/blob/main/content/ui-patterns/saving.mdx
[pri-empty]: https://github.com/primer/design/blob/main/content/ui-patterns/empty-states.mdx

Atlassian (Jira/Confluence):

[ads-lozenge]: https://atlassian.design/components/lozenge/usage
[ads-flag]: https://atlassian.design/components/flag/usage
[ads-section]: https://atlassian.design/components/section-message/usage
[ads-empty]: https://atlassian.design/foundations/content/designing-messages/empty-state
[ads-table]: https://atlassian.design/components/dynamic-table/usage

Apple Human Interface Guidelines:

[hig-a11y]: https://developer.apple.com/design/human-interface-guidelines/accessibility
[hig-alerts]: https://developer.apple.com/design/human-interface-guidelines/alerts
[hig-segmented]: https://developer.apple.com/design/human-interface-guidelines/segmented-controls
[hig-tabbars]: https://developer.apple.com/design/human-interface-guidelines/tab-bars
[hig-toolbars]: https://developer.apple.com/design/human-interface-guidelines/toolbars
[hig-lists]: https://developer.apple.com/design/human-interface-guidelines/lists-and-tables
[hig-buttons]: https://developer.apple.com/design/human-interface-guidelines/buttons
[hig-sheets]: https://developer.apple.com/design/human-interface-guidelines/sheets

Material (pages render client-side; claims from search excerpts unless noted):

[m2-lists]: https://m2.material.io/components/lists
[m-snackbar]: https://m2.material.io/components/snackbars
[m-tabs]: https://m1.material.io/components/tabs.html
[m2-buttons]: https://m2.material.io/components/buttons
[m3-chips]: https://m3.material.io/components/chips/guidelines
[m3-drawer]: https://m3.material.io/components/navigation-drawer/guidelines
[mdc-chip]: https://github.com/material-components/material-components-android/blob/master/docs/components/Chip.md

NN/g, W3C and others:

[nng-tables]: https://www.nngroup.com/articles/data-tables/
[nng-empty]: https://www.nngroup.com/articles/empty-state-interface-design/
[nng-confirm]: https://www.nngroup.com/articles/confirmation-dialog/
[nng-tabs]: https://www.nngroup.com/articles/tabs-used-right/
[nng-ivn]: https://www.nngroup.com/articles/indicators-validations-notifications/
[nng-toggle]: https://www.nngroup.com/articles/toggle-switch-guidelines/
[nng-cards]: https://www.nngroup.com/articles/cards-component/
[nng-errors]: https://www.nngroup.com/articles/error-message-guidelines/
[nng-breadcrumbs]: https://www.nngroup.com/articles/breadcrumbs/
[nng-dash]: https://www.nngroup.com/articles/dashboards-preattentive/
[nng-touch]: https://www.nngroup.com/articles/touch-target-size/
[wcag-258]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
[codex-overflow]: https://doc.wikimedia.org/codex/latest/style-guide/content-overflow.html
[pf-truncate]: https://www.patternfly.org/components/truncate/design-guidelines
[cs-empty]: https://cloudscape.design/patterns/general/empty-states/
[cs-dash]: https://cloudscape.design/patterns/general/service-dashboard/
[rsp-toast]: https://react-spectrum.adobe.com/react-spectrum/Toast.html

Readable URL list (same links, for tools that drop reference definitions):
- Polaris: https://github.com/Shopify/polaris/tree/main/polaris.shopify.com/content (components/…, content/grammar-and-mechanics.mdx, patterns/…)
- Carbon: https://carbondesignsystem.com/patterns/overflow-content/ · https://carbondesignsystem.com/components/data-table/usage/ · https://carbondesignsystem.com/components/notification/usage/ · https://carbondesignsystem.com/patterns/status-indicator-pattern/ · https://carbondesignsystem.com/patterns/empty-states-pattern/ · https://carbondesignsystem.com/components/tag/usage/
- Primer: https://github.com/primer/design/tree/main/content (components/data-table.mdx, ui-patterns/loading.mdx, ui-patterns/forms/overview.mdx)
- Atlassian: https://atlassian.design/components/lozenge/usage · https://atlassian.design/components/flag/usage · https://atlassian.design/foundations/content/designing-messages/empty-state
- Apple: https://developer.apple.com/design/human-interface-guidelines/accessibility · …/alerts · …/segmented-controls · …/toolbars
- NN/g: https://www.nngroup.com/articles/data-tables/ · https://www.nngroup.com/articles/confirmation-dialog/ · https://www.nngroup.com/articles/tabs-used-right/ · https://www.nngroup.com/articles/empty-state-interface-design/
- WCAG 2.5.8: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Codex: https://doc.wikimedia.org/codex/latest/style-guide/content-overflow.html · PatternFly: https://www.patternfly.org/components/truncate/design-guidelines · Cloudscape: https://cloudscape.design/patterns/general/empty-states/

Local copies of the fetched doc sources were kept in the session scratchpad (not in the repo); every claim above links its public URL.
