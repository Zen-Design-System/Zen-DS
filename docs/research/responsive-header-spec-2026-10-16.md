# Header: Figma-style slot editing and the desktop ⇄ mobile pattern (2026-10-16)

Owner: session "Header chỉnh sửa và responsive design". Status: **approved 2026-10-16** (decisions in §3); worked on
branch `zen/feat/responsive-header-20261016`. Research: four read-only reports (Studio editability, live Figma read of `9nZv4uW2LT21yuHabMTCh1`, the code's
desktop → mobile behaviour, other design systems), summarised here.

The user (2026-10-16): headers cannot be edited freely as in Figma, where they are Slots (add / remove elements); a
page made from a template cannot be edited; elements cannot be hidden as in Figma; desktop and mobile are not
compatible — the desktop header has no pattern that turns it into the mobile Top Navigation. Add the rule pattern and a
skill for it.

## 1. Findings

### 1.1 Figma (the source of truth)

- **Primitives/Dashboard/Header** (4122:33402) changes content only through SLOTs — Leading-Slots, Center-Slots,
  Trailing-Slots, Action-Slots, Control-Slots, Header-Text, Custome-Elements — and shows or hides each block with a
  BOOLEAN: Nav-Center-Block, Nav-Trailing-Block, Actions, Search, Controls, Subheading, Child-Heading. No TEXT or
  INSTANCE_SWAP properties. No slot has preferred values or limits.
- **Header/Dashboard** (4122:34662): one Sections SLOT stacking the rows; ◇ Master-Layout (4122:41886) always has it.
- **Top-Navigation/Mobile** (12014:45167): booleans Status-Bar, Top-bar, Top-Leading, Top-Heading-Text, Top-Trailing,
  Expand-Heading, Expand-Trailing, Control-Bar; Control-Slot SLOT. The Trailing primitive's Trailing-Slot has
  `maxChildren: 3`, preferred-only `Nav-Slot/Action`. Leading is variants (Action / Visual avatar), not a slot. The set's
  description: large title on roots, compact title on pushed screens, Back = left chevron, more than 3 actions go into
  a ⋯ Bottom-Sheet, Control-Bar = Search / Segmented / Tab-Bar, desktop chrome = Sidebar + Header/Dashboard.
- **No screen exists at both sizes** (HR-Platform, Ecommerce, Performance are desktop only; Social, Finance, Logistic
  mobile only) and no header has a Breakpoint variant. The mobile screens show: account → avatar in Leading (Finance
  12030:72811, Logistic 5613:1146); notifications → trailing icon; root title → Expand-Heading H1; pushed screens → Back +
  compact title, 1–2 trailing actions (Social 6353:69678); a segment switch → Control-Slot (Finance 9474:58283).
- Breakpoints (frames 6816:53241…): Desktop 1512, Tablet 744, Mobile 390; margins 24 / 24 / 20.

### 1.2 Studio: why a template's header is not editable

| # | Cause | Where |
| --- | --- | --- |
| A | A prop of a page made in the Studio holds **one** element. Adding a second layer to a slot that holds one element (`header={<Search/>}`, `headerActions={<AppShellAccount/>}`, a single PageHeader action) writes a fragment, which the page refuses ("Not written: the page would break"). Only a slot already holding a Stack takes more. | `slots.mjs` joinInProp ~1314; `dialect.mjs` ~349; `registry.ts` insertTargetFor ~757 |
| B | **Hide = delete.** A slot switch off removes the prop and its content; on writes generic default code (a Search, `AppShellAccount "Khoa Dang"`), not the template's. Builder pages pass no base to `describeSlots`, so nothing is remembered. No eye per layer (only Effects have one). | `localApi.ts:93`; `GroupedProperties.tsx`; `FramePanel.tsx:98-110`; `screen-frame.mjs`; `screen-chrome.mjs:74-85` |
| C | Registry gaps: DashboardHeader `leading` (Leading-Slots) and `children` (Custom) and AppShell `banner` are not slots; the Screen section lacks `headerCenter` and `banner`. | `registry.ts:500-596`; `screen-chrome.mjs:60` |
| D | AppShell and PageHeader switches show code names, not Figma's (Leading-Slots, Nav-Trailing-Block, Actions…); a canvas click never selects the AppShell or its bar. | `figma-props.map.mjs`; `clickTarget.ts:116-122` |

A template page itself is fine: `snapshot.ts` walks through HrShell and writes the header as plain JSX in the AppShell
props (several elements wrapped in a row Stack).

### 1.3 Code: desktop → mobile today

- **AppShell** below 1024px swaps the collapse toggle for a Menu button (drawer) and wraps the bar onto more rows. On a
  phone it keeps the desktop bar: no title, no Back, full Breadcrumbs, every action. It never renders a TopNavigation.
- **PageHeader** on mobile only reorders (description first, Primary first); actions wrap, never fold into ⋯;
  Breadcrumbs never become Back. Next to a TopNavigation it makes a second h1.
- **Studio** keeps two independent sets per Screen: the root AppShell (desktop) and `topNavigation` /
  `bottomNavigation` (mobile), seeded once from the title. Nothing derives one from the other; template pages get no
  `topNavigation`; the phone layout drops `sections` but keeps a PageHeader written in the content (two h1). Export and
  Figma push emit one layout.
- **Rules:** `top-navigation-mobile-rules-2026-10-01.md` (R1–R18) is phone-only. The mapping exists only as prose in
  the AppShell "Phone app" example. `app-shell.md` contradicts itself on phones (lines 11 vs 16).

### 1.4 Other systems

Primer PageHeader is the closest model: every part takes `hidden={{ narrow, regular, wide }}`; Breadcrumbs / back
become a ParentLink on narrow; a hidden trailing action reappears in the overflow. Polaris rolls secondary actions into
one menu; Material 3 caps compact app bars at 2 trailing icons + overflow, uses a navigation bar on compact; Apple
collapses a sidebar app into a stack with Back and keeps ≤ 5 tabs; Atlassian folds search into an icon and utilities
into More. Shared principle: **no action is dropped — it moves** (trailing, overflow, footer, tab).

## 2. Proposal

### P1 · Studio: headers edit like Figma slots (bug fixes)

1. **A slot holds a row of layers.** Adding a second layer to a one-element slot wraps both in the slot's own row
   (a row Stack with the slot's Figma gap) instead of a fragment; Layers folds that row so the slot shows its layers
   directly, as Figma's slot does. Same for move and paste. (Alternative: let props hold several elements — more
   Figma-like in the code too, but touches the dialect, renderer, compile and push.)
2. **Hide, don't delete.** A per-layer eye (Layers, ⇧⌘H) that keeps the layer in the page and skips it when drawing;
   slot booleans (Actions, Search, Nav-Trailing-Block, Top-Trailing…) and the Screen section use it, so switching back
   on restores the template's content. Hidden layers are left out of the code export and the Figma push on the layouts
   they are hidden on (a Figma pull still skips hidden Figma layers). The layer menu also says **"Hide on mobile" /
   "Hide on desktop"** (Primer's `hidden`): each Screen draws and exports its own layout without them.
3. **Registry and names:** DashboardHeader `leading` and `children`, AppShell `banner` become slots; Screen section adds
   Center (headerCenter) and Banner; AppShell / PageHeader switches use Figma's names; a click on the top bar selects
   the bar (DashboardHeader Navigation) so its slots are one click away.

### P2 · Rules, guideline and skill: the desktop ⇄ mobile header pattern

`docs/component-usage-rules.md` §17 (short) + `skills/zen-responsive-screens/` (SKILL.md + `references/header-mapping.md`),
linked from `zen-component-usage`, `zen-figma-design` (AI kit) and `AGENTS.consumer.md`; guideline entries for AppShell,
PageHeader, DashboardHeader, TopNavigation (and the `app-shell.md` contradiction fixed).

**Layouts.** Desktop ≥ 1024: AppShell (Sidebar docked). Tablet 744–1023: AppShell with the drawer. Mobile < 744:
TopNavigation + BottomNavigation (Zen breakpoints, `useZen().breakpoint`).

**Screen kind decides the bar.** Root (a Sidebar destination: no `back`, Breadcrumbs ≤ 1 item) → `type="default"`,
`largeTitle` = title, BottomNavigation shown. Child (Breadcrumbs ≥ 2 or `back`) → `type="compact"`, Back chevron to the
parent, bar `title`, no BottomNavigation. Modal / form → Close, Primary in the ActionBar footer (R15).

| Desktop part | Mobile | Rule |
| --- | --- | --- |
| Sidebar items | BottomNavigation (3–5 roots); more than 5 → 4 + More (the full list in a sheet) | `bottom-navigation/destinations` |
| Sidebar brand, collapse toggle | — (in the More / account sheet) | |
| Breadcrumbs | root: —; child: Back chevron to the parent crumb | R8, `navigation/back-chevron` |
| PageHeader `title` | root: `largeTitle` (+ `title` for the fold); child: `title` | one h1 (R12), noun ≤ 24 chars (R13) |
| PageHeader `description`, `meta` | first block of the content | |
| PageHeader `tabs` | `controlBar` Tabs / Segmented `fullWidth` | R6 |
| PageHeader Primary | root list: trailing "+" action (label = the button's); detail / form: ActionBar footer | R15 |
| PageHeader Tertiary / Danger | ⋯ More → action BottomSheet (Danger last) | Figma: > 3 → ⋯ |
| Top bar Search | list root: `controlBar` Search + `searchAction`; elsewhere a Search trailing action | R5 |
| Notifications (AppShellAction) | trailing action with `dot` | R9 |
| Other AppShellActions, plan Badge | ⋯ More or the account sheet | |
| Account (AppShellAccount + Menu) | root: avatar in Top-Leading (Figma Finance / Logistic), opens the account sheet; dropped when a Profile tab exists | |
| Control-bar row: Search + Chips | `controlBar` Search; Chips → a scrolling Chip row at the top of the content | R6 |
| `floatingAction`, `footer` | stay (FAB hides on scroll; ActionBar `lg` full width) | |
| `aside` SidePanel | a pushed screen or BottomSheet `size="max"` | |
| `banner` | TopNavigation `banner` | |

**Trailing budget: 3 places** (Figma Trailing-Slot max 3). Priority: Search action (when folded) → "+" (root) →
notifications → ⋯ More, which takes the last place and holds everything else. **Every desktop header action stays
reachable on mobile** (trailing, ⋯, footer, account sheet, More tab); nothing is silently dropped.

### P3 · Library: one AppShell for both layouts

`AppShell topNavigation={…} bottomNavigation={…}`: below 744px the shell draws them instead of its top bar, drawer and
`sections` (the TopNavigation holds the h1); tablet and desktop unchanged. Templates (HrShell, Dashboard, AdminList,
Detail) pass them, so code pages become responsive with explicit, editable JSX (no hidden magic). Definition of done for
a new API (docs, examples ≥ 4, harness, tests). Harness candidates: `app-shell/mobile-header` (an AppShell page with a
page title and no `topNavigation`), `app-shell/top-navigation-title` (titles match), `app-shell/page-header-in-sections`
(a PageHeader in the content would sit beside the bar on phones).

### P4 · Studio: the mobile header follows the desktop one

`tools/studio/responsive-header.mjs` (pure, selftest on HR Home, Dashboard, Expenses) applies §P2 to a Screen's
AppShell and writes `topNavigation` / `bottomNavigation`. A Screen's mobile parts are **linked to desktop** (a desktop
title or action change updates them) until edited on mobile, which makes that part an override with **Reset to desktop**,
as Figma's instance overrides. Template pages and a device switch get the derived parts; export writes the P3 AppShell;
Figma push draws Top-Navigation/Mobile with the matching booleans.

## 3. Status

- **Done 2026-10-16** (branch `zen/feat/responsive-header-20261016`): P2 (usage rules §17, skill
  `zen-responsive-screens`), P1 (fragment props, `hidden` / `hiddenSlots` in `tools/studio/visibility.mjs`, Layers eye,
  ⇧⌘H, new slots, Figma names) and, asked mid-session, New page › Empty page. A click on the top bar's empty area already
  selected the AppShell, so P1.3's last point needed no change. E2E B-38…B-41.
- **Next:** P3 + P4 on a follow-up branch.

## 4. The user's decisions (2026-10-16)

- **Order:** P2 (the contract) → P1 → P3 + P4.
- **P1.1:** a prop holds several layers for real (a fragment value on pages made in the Studio: dialect, renderer,
  compile, push and pull), not an automatic row Stack.
- **Account on mobile:** the avatar in Top-Leading on root screens, opening the account sheet; dropped when the
  BottomNavigation has a Profile tab.
- **Sidebar with more than 5 items:** the first 4 + More (the full list in a sheet); the 4 can be changed on mobile.
