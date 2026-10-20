---
name: zen-responsive-screens
description: Make one Zen screen work on desktop and on phones — turn the desktop header (AppShell top bar, Sidebar, PageHeader / DashboardHeader rows) into the phone's TopNavigation and BottomNavigation by Zen's mapping, in code, in Zen Studio or in a Zen Figma file. Use when a page needs a mobile version, a template must run on phones, a desktop and a phone frame of the same screen disagree, someone asks where a header element goes on mobile, or a UI must adapt across widths (responsive and adaptive layout principles).
---

# Zen responsive screens

A page that runs on desktop and on phones keeps **one set of parts and moves each one to its place**. The mapping
table and the rules are `docs/component-usage-rules.md` §17; read it first. This skill is the procedure.

For the decisions the mapping leaves open (responsive or adaptive, which canonical layout and how it folds, what to
drop when the space shrinks, touch versus pointer, text that must flex), read `references/responsive-principles.md`.
It holds principles, not rules: nothing checks them, and the brief or the designer may choose otherwise.

## 1. Read the desktop screen as parts

List what the desktop screen has, by part (not by pixel):

| Part | Where it is |
| --- | --- |
| Destinations | Sidebar items (and its brand, footer rows) |
| Where am I | Breadcrumbs (top bar `header`) or PageHeader `back` |
| Title | PageHeader `title` in AppShell `sections` (Figma Header/Dashboard Type=Main) |
| Page actions | PageHeader `actions`: one Primary, Tertiary, Danger |
| Global actions | `headerActions`: notifications, settings, help, plan Badge, the account |
| Find and filter | top bar Search, Control-bar row (Search + filter Chips), PageHeader `tabs` |
| Bottom | `floatingAction`, `footer` ActionBar, `banner`, `aside` |

## 2. Decide the screen's kind

- **Root**: a Sidebar destination (no `back`, Breadcrumbs of one item or none) → `TopNavigation type="default"`,
  `largeTitle` = `title` = the page title, BottomNavigation shown, the account avatar in `leading`.
- **Child**: Breadcrumbs of two or more items, or `back` → `type="compact"`, `leading` = the Back chevron
  (`icon-chevron-left-line-medium`) to the parent crumb, `title` only, no BottomNavigation.
- **Modal or form**: `type="compact"`, `leading` = Close (`icon-x-medium-line`), the Primary in an ActionBar footer.

Situations beyond these (search-led list, media, selection mode, conversation) follow the decision table in
`docs/research/top-navigation-mobile-rules-2026-10-01.md` §1.

## 3. Move every part (§17's table) and count the trailing places

1. Destinations → BottomNavigation: up to 5 one to one; more than 5 → the first 4 + More (the full list in a sheet).
   Labels match the Sidebar's; a root's title matches its tab label.
2. Title → `largeTitle` (root) or `title` (child). Description and meta → the first block of the content.
3. Page actions → Primary: "+" trailing on a list root, ActionBar footer on a detail or form. Tertiary / Danger → More.
4. Global actions → notifications: a trailing action with `dot`; the rest → More or the account sheet; the account →
   `leading` avatar on a root.
5. Find and filter → `controlBar` (Search + `searchAction`, or Tabs / Segmented `fullWidth`); filter Chips → a
   scrolling Chip row at the top of the content.
6. Count: at most **3 trailing places**, a folded Search action included. Over budget → keep by priority (Search, "+",
   notifications) and put the rest in ⋯ More (an action BottomSheet).
7. Check nothing was lost: every desktop action is in the bar, More, the footer, the account sheet or the More tab.

## 4. Build it where you work

**Code (React).** Give AppShell both sets; the shell picks by its width (under 744px it draws `topNavigation` and
`bottomNavigation` instead of the top bar and `sections`; the Sidebar still opens as the drawer):

```tsx
<AppShell sidebar={…} header={…} headerActions={…} sections={<PageHeader title="Expenses" … />}
  topNavigation={<TopNavigation title="Expenses" largeTitle="Expenses" leading={…} trailing={[…]} />}
  bottomNavigation={<BottomNavigation value="expenses" items={[…]} />}>
```

Put the page title in `sections`, never in the content, or the phone shows two h1s (harness
`app-shell/page-header-in-sections`, `app-shell/top-navigation-title`). Run `npm run usage:check`.

**Zen Studio.** A Screen's phone parts (its Top and Bottom Navigation) are drawn from its desktop AppShell by this
mapping and stay **linked to desktop**: change the desktop title, actions or Sidebar rows and they follow. Edit a part
on the phone and it becomes your own; **Reset to desktop** (Screen section) links it again. The export writes them as
the AppShell's `topNavigation` / `bottomNavigation`. To keep a layer on one layout only, use **Hide on mobile / Hide on
desktop** (the layer's menu), not delete.

**Figma.** Build the phone frame next to the desktop one: a 390-wide frame (Breakpoint & Grids Mobile, Component Size
Comfortable) with `Top-Navigation/Mobile` (Top-Leading, Top-Heading-Text or Expand-Heading, Top-Trailing with at most
3 `Nav-Slot/Action`, Control-Bar) and `Bottom-Navigation/Mobile/*` on roots. Move the parts by §17; turn off the
booleans of parts the screen does not have (Top-Leading on a root without an account, Expand-Heading on a child)
instead of leaving default content. Then run the Zen audit (`skills/zen-figma-design` §4) on both frames.

## 5. Check

- [ ] One h1 on each layout; the phone's is the TopNavigation title.
- [ ] Titles and labels are the same words on both layouts.
- [ ] ≤ 3 trailing places; Back is the chevron; no Primary in the bar of a detail or form screen.
- [ ] Every desktop header action reachable on the phone; one way to create.
- [ ] Desktop 1512, tablet 744 and phone 390 screenshots look right (`npm run qa` takes 1512 + 390 shots).
- [ ] The widths in between hold too (360, 600, 900, 1280; responsive-principles §9), and the wide layout shows more
      instead of only stretching.

Worked examples: `references/worked-examples.md`.
