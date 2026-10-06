# Top Navigation on phones: behaviour rules and phone-example audit (2026-10-01)

Research for the example polish pass. The session that owns `src/platform/examples/**` applies it. Nothing in the code
was changed. Platform snapshot: 2026-10-01, 15:18–15:21 (+07): 57 pages scanned, 77 phones on 52 of them. Six pages
were being edited during the snapshot (ai-chat, chart, color-selector, bottom-sheet, rating, bottom-navigation):
re-run the snippet under R18 on those pages before changing them.

How the findings were gathered:
1. Code: `TopNavigation.tsx`, `top-navigation.css`, the guideline and API JSON, `PlatformPhone.tsx`, and the guidelines
   of the components used next to it.
2. Figma: the live file `9nZv4uW2LT21yuHabMTCh1`, read as data with `use_figma` (the set, its primitives, and every
   instance in ◆ Social, ◆ Finance and ◆ Logistic).
3. Platform conventions: sources at the end.
4. Rendered phones: a Playwright probe of every `.platform-phone` (header props, rows, scroll height, scroll to the
   bottom), plus a static scan of the second screens.
5. Two behaviour probes: a screen swap (G1) and keyboard focus under the header (G2).

## Update 2026-10-02: decisions and fixes since the audit

- **G1 fixed:** a fold that unmounts and mounts again is measured again. Keys per screen (R2) are still good, because each
  screen opens at the top. Test: `tests/interaction/navigation.test.tsx`.
- **G2 fixed:** PlatformPhone pads the screen's scroll by the header's pinned part (`scroll-padding-top`). The guideline
  tells apps to do the same.
- **G4, user: match Figma.** A root (large title, no leading) hides the navigator-bar row while the large title shows
  (Figma Top-bar=false).
  - Its trailing actions sit at the right of the large-title row.
  - Once the title folds, the bar title shows in that same row and the actions stay put.
  - A root header is now 114px (status + 64), not 178, so the 1.5× lists of Section 3 need about one row fewer.
  - `topBar` forces the row on (iOS layout) or off.
- **G5 fixed with G4:** `largeTitleAction` sits first in the trailing slot on such roots, so it stays in reach once the
  title folds. R3's "never use largeTitleAction" no longer applies.
- **G6, user: a status banner always sits under the Top Navigation.** New prop `banner` takes a Small AlertBanner, edge
  to edge, pinned under the bar and the control bar, and never scrolls away.
- **R10 changed:** `.platform-phone` previews the mobile breakpoint tokens, and lists keep the default inset (20px).

## Findings in short

- **The large title almost never folds.** 40 phones open on a large-title root. Only 3 follow the scroll
  (`scrollRef`): the Top Navigation playground, "Collapse on scroll" and the Orders template. 1 folds when the scroll
  passes 24px (Typography). The other 36 never fold: the 178px header stays still while the list moves under it.
- **Lists are too short.** 43 phones show a list or feed. Only 9 are tall enough (content ≥ 1.5× the visible area) to
  show any scroll behaviour.
- **The same kind of screen gets different headers:**
  - 8 tab roots use a compact bar with no large title, and 1 uses a PageHeader.
  - 1 pushed screen uses the Default type.
  - 6 pushed or create screens have no Back or Close, and 1 Back only writes a note.
  - The Search control bar folds in 2 places and stays fixed in 1.
- **Footers are built 3 ways:** `ActionBar` (8 examples), the platform `.pe-phone-cta` div (10), and page-local footer
  classes (3).
- **The probes found two defects** (Section 5):
  - G1: a reused scroll-linked TopNavigation stops folding after root → child → root.
  - G2: a focused row can sit under an overlaid header.

## What Zen already has (use it as is; add no props)

- **Bar layout** (`TopNavigation.tsx`, `docs/guidelines/top-navigation.md`):
  - A 64px bar: leading · centred title (Body/Extra/Bold) · at most 3 trailing actions (2 until 2026-10-05). A fourth
    action is dropped without warning.
  - `largeTitle`: the large title (Figma Expand-Heading), 64px, h1 in Heading/1.
  - `controlBar`: a 48px slot. The bar pads the status bar itself (`--zen-safe-area-top`).
- **`scrollRef`** (the `useScrollFold` hook):
  - The large title, and a Search control bar that has `searchAction`, slide under the bar as the content scrolls (1:1).
  - The bar title fades in once ≤ 10px of the large title is left.
  - A scroll that stops half-way settles open or closed, but only when the scroll room is at least the fold height.
  - Once the scroll passes the fold (`data-scrolled`), the opaque types (default, alt, compact, compact-alt) show a
    Border/Neutral/Pale rule.
  - Covered parts are inert, and the settle jumps without animation under reduced motion.
  - The header must overlay the scroller: `sticky` as its first child, or positioned over it (PlatformPhone
    `headerOverlay`).
- **Control bar:** `searchAction` folds the Search into the first trailing slot (it counts toward the 2). A Segmented
  or Tabs control bar stays pinned and moves up with the fold.
- **Other props:** `collapsed` (set by hand; it overrides `scrollRef`), `sticky`, `headingLevel`, the identity title
  (`titleLeading`, `subtitle`, `onTitleClick`, `titleLabel`), `trailingGroup`, and `margin` (comfortable 20 / compact
  16). `largeTitleAction` slides under the bar with the title and is inert while folded.
- **Types:** default · alt · default-blurring · alt-blurring · liquid-glass · default-overlay · liquid-overlay ·
  compact · compact-alt · compact-overlay. Their actions are 44px Tertiary circles, Flat icons or Liquid-Glass circles.
- **Harness rules:** `navigation/back-chevron` (error), `top-navigation/max-three-trailing` (was `max-two-trailing`),
  `top-navigation/search-folds-to-action` (only checked when `collapsed` is set) and `segmented/control-bar-full-width`.
- **Platform:** `PlatformPhone` is a 390×844 screen with a 50px status bar and a 28px home indicator. It takes
  `header`, `footer`, `headerOverlay`, `screenRef`, `canvas` and `statusBar`. `usePhoneScreen()` gives `go(selector,
  change)`, which moves focus into the next screen, and `scrollTop()`.
- **Components used next to it:**
  - BottomNavigation: 3–5 roots, no hide-on-scroll. "Scroll to top when the current tab is tapped again" is wired in
    each example through `onValueChange`.
  - BottomSheet: `inline` inside the phone; has its own header with Close; `size="max"` scrolls its body.
  - ActionBar: `position="static"` in the phone footer; it clears the home indicator itself.
  - Segmented: `fullWidth` in the control bar.

**Figma** (live file, read as data):
- **The set:** `Top-Navigation/Mobile` 12014:45167, on page ❖ Top-Navigations (Mobile) 510:39633. Its variants are
  Device=Mobile × Margin (Comfortable, Compact) × Type (Default, Alt, Default-Bluring, Alt-Bluring, Default-Overlay,
  Liquid Glass, Liquid-Overaly, Compact, Compact-Alt, Compact-Overlay): 20 variants, each 390×178. Booleans:
  Status-Bar, Top-bar, Top-Leading, Top-Heading-Text, Top-Trailing, Expand-Heading, Expand-Trailing, Control-Bar
  (+ the Control-Slot slot).
- **Heading primitive** (`.Primitives/Heading-Text/Basic` 4060:17984): H1 (Heading/1), H2 (Heading/2), H3
  (Heading/3), Sub (Body/Extra/Bold + Caption/Regular). Booleans: Capline, Subheading, Badges, Dropdown, Leading.
- **Leading and trailing primitives:** Leading 12012:39316 offers Avatar Large/Small (visual), Default, Flat and
  Liquid Glass (action). Trailing 12013:39571 offers Default, Flat and Liquid Glass.
- **Template screens** (43 instances):
  - ◆ Social "Chats" root: Expand-Heading on, Top-bar off, Expand-Trailing on, with Bottom navigation.
  - ◆ Social conversations: Top-bar on, Expand off, Back chevron, title "DAS Team" with the line "Active 2h ago", no
    Bottom navigation.
  - ◆ Finance roots "Cards" and "Statistics": Expand on, Top-bar off. "Statistics" has a Control-Bar with
    Weeks · Months · Years. Home has an Avatar Large leading.
  - ◆ Logistic child screens: Liquid Glass Back and a title Dropdown ("Trong nước ▾"). One detail screen has a large
    heading with a Capline and a Badge.

## 1. Decision table: situation → Top Navigation

The source keys ([T], [SF], [UI1]…) are listed at the end.

| Situation | TopNavigation | Scroll | Title (heading) | Actions and companions | Zen API · sources |
| --- | --- | --- | --- | --- | --- |
| **Tab root** (list, feed, dashboard, settings) | `type="default"` (`alt` on `canvas="alt"`). `title` = `largeTitle` = the tab's noun. No leading (a Home root may show the user's Avatar). | `scrollRef` + PlatformPhone `headerOverlay screenRef` | Heading/1 h1 → Body/Extra/Bold h1 once folded | ≤ 2 `trailing` (New, Notifications + `dot`), never `largeTitleAction`. BottomNavigation footer when the app has 3–5 roots. | Props `largeTitle`, `scrollRef`. Guideline: large title only on top-level screens. [T] "large title transitions to a standard title as people begin scrolling". [UI1]. [MDC] large flexible bar collapses on scroll. Figma ◆ Social "Chats", ◆ Finance "Cards". |
| **Child / detail** (pushed) | `type="compact"` (`compact-alt` on Alt). `title` only (≤ 24 characters; IDs allowed). Leading: the Back chevron. | `scrollRef`. Nothing folds; the Pale rule appears as soon as content runs under the bar. | Body/Extra/Bold h1; content headings from h2 | ≤ 2 Flat trailing actions (Share; More → action BottomSheet). The main action sits in an ActionBar footer. | Guideline: pushed screens use the bar title; Back is a chevron. [T] "Use the standard Back and Close buttons". [UI2] `never`. [UI4] scroll edge. [TC] `scrolledContainerColor`. Figma ◆ Social conversation. |
| **Search-led list** (a root whose job is finding) | Tab root + `controlBar={<Search …/>}` + `searchAction={{ label, onClick }}`. At most 1 other trailing action. | The fold is the large title + Search (116px). The folded Search becomes a Search action at the top right. Scrolling up or tapping it brings the bar back and focuses the field. | as Tab root | Filter Chips stay in the content. The result count goes in an aria-live line. | Prop `searchAction`; harness `search-folds-to-action`. [UI3] "search bar collapses into the navigation bar". [SF] top placement as a toolbar button, "consider pinning it to the top toolbar when scrolling". [NN] partly persistent headers. iOS 26 prefers bottom search on iPhone [SF]; Zen keeps the top placement HIG allows, so there is one pattern. |
| **Media / hero** (photo or video viewer) | `type="liquid-overlay"` (or `default-overlay`; `compact-overlay` for flat icons). `title` = the item name. Leading: Close `icon-x-medium-line` when opened full-screen from a grid, Back when pushed. | None: the media does not scroll | Body/Extra/Bold on the gradient | ≤ 2 glass trailing actions (Favourite; Share → action BottomSheet). PlatformPhone `canvas="media" statusBar="light"`. | Guideline: overlay types only on media, never on plain surfaces. [SH] full-screen modal for "videos, photos, or camera views". Figma Default-Overlay / Liquid-Overaly. |
| **Filter / control bar** | `controlBar` = Segmented `fullWidth` (2–5 one-word views) or Tabs `fullWidth` | Pinned under the bar; it moves up with the fold and never folds away. | as its screen | Filters, sort and scope are a Chip row (Advanced chips) in the first content block, not in the control bar. Options wider than the phone → a Chip row. | Prop `controlBar` (pinned). segmented.md Do; harness `segmented/control-bar-full-width`. [SF] scope bar. [MDC] scroll flags. Figma ◆ Finance "Statistics". |
| **Selection mode** (picking several rows) | The same TopNavigation: `collapsed` while selecting, `title` = the count ("3 selected"), leading Close `icon-x-medium-line` "Cancel selection", trailing ≤ 2 bulk icon actions. | `scrollRef` stays. `collapsed` pins the compact bar for the mode, not for the scroll. | The count title is the h1 | More bulk actions → action BottomSheet. Close and Escape leave the mode. The count is announced. | Props `collapsed` ("Collapsed by hand"), `title`, `leading`, `trailing`. [MDC] contextual action bar: close icon, "1 selected", actions. No Zen example yet (G7). |
| **Modal screen** (compose, create, full-screen filters) | `type="compact"`. `title` = the task ("New review", "Filters"). Leading: Close `icon-x-medium-line`. | `scrollRef` | Body/Extra/Bold h1 | No Save or Done in the bar: the Primary is in an ActionBar footer. Close asks first when there are unsaved changes. A short single task → BottomSheet, which has its own header and no TopNavigation. | Guideline Don't: Save in the bar and again at the bottom. Brief §3c: every create screen has a way out. [SH] Cancel on the leading edge, confirm unsaved changes (Zen moves Done to the footer Primary). action-bar.md. |
| **Form screen** (a pushed create or edit step, sign-in) | `type="compact"`. `title` = the form name. Leading: Back when pushed, Close when modal. The first sign-in or onboarding step has no leading. | `scrollRef` | Body/Extra/Bold h1; field groups h2 | `<Form>` + ActionBar footer: vertical with the Primary on top, or horizontal for a Decline · Accept pair. | form.md, action-bar.md (phones); brief §3c |
| **Conversation** (person, group, AI) | Person or group: `type="default" margin="compact"`, identity (`titleLeading` Avatar lg, `subtitle` = presence, `onTitleClick`), Back, `trailingGroup` (audio + video). AI assistant root: `type="compact"`, bar title, trailing New chat. | `scrollRef`. The thread starts at the bottom, so the rule shows while older messages sit under the bar. | Identity or bar title = h1. Never a large title. | ChatComposer or AiChatField in the footer | Guideline Do: conversation header. Figma ◆ Social "DAS Team · Active 2h ago". |

## 2. Behaviour rules every phone example shares

"Phone" means a `PlatformPhone` in an example, a playground or a template. Each rule ends with its test.

- **R1 Wire the scroll.** Every TopNavigation over a scrolling screen gets `scrollRef={screenRef}`, and its PlatformPhone
  gets `headerOverlay screenRef={screenRef}`. No `collapsed` driven by the scroll, no `onScroll`, no inner scroller
  (`.pe-phone-scroll`). Exempt: `canvas="media"` viewers, and chat threads until G8. *Test:* every phone matches
  `[data-header-overlay="true"] .zen-top-nav[data-scroll-linked="true"]`; `examples/pages` contain no `onScroll=`.
- **R2 One key per screen.** An example that swaps screens inside one PlatformPhone keys the PlatformPhone per screen
  (`key={openId ?? "root"}`). The TopNavigation then measures its fold again (probe G1), and the new screen opens at the
  top. Keying only the TopNavigation leaves the child at the list's scroll offset. *Test:* open a row, Back, scroll down
  → `data-collapsed="true"`.
- **R3 Large title only on roots.** A screen has `largeTitle` exactly when it has no leading Back or Close; pass `title`
  with the same noun. Examples never use `largeTitleAction`: it cannot be reached once the title folds (G5); only the
  playground shows it. *Test:* static check of the props.
- **R4 The fold belongs to the component.** Past the fold: `data-collapsed="true"`,
  `.zen-top-nav__title[data-visible="true"]` and `data-scrolled="true"` (the Pale rule on opaque types, the progressive
  blur on the others); back at the top, all three clear. No example CSS targets `.zen-top-nav*`, and no example draws
  its own divider under the header. *Test:* the snippet under R18.
- **R5 Search folds into an action.** A Search in `controlBar` comes with `searchAction`. Its `onClick` scrolls the
  phone to the top and focuses the field once it is no longer inert (copy `openSearch` from "Collapse on scroll"). At
  most 1 other trailing action. *Test:* scrolled down, `.zen-top-nav__search` exists; a click gives `scrollTop` 0 and
  focus in the Search input.
- **R6 Pinned control bars.** Only Segmented (`fullWidth`, 2–5 one-word options) or Tabs (`fullWidth`) go in the
  control bar. Filters, sort and scope are a Chip row in the first content block. *Test:* `controlBar={<Search`,
  `<Segmented` or `<Tabs` only.
- **R7 Type by situation** (Section 1). Roots `default` (`alt` on `canvas="alt"`); child, modal and form screens
  `compact` (`compact-alt` on Alt); conversations `default` + `margin="compact"` + identity; media an overlay type with
  `canvas="media" statusBar="light"`. Glass and blurring types only on the Top Navigation page. *Test:* `largeTitle` ⇒
  default or alt; a leading Back or Close ⇒ compact or compact-alt, unless identity or overlay.
- **R8 Way back, way out.** Pushed: `leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () =>
  screen.go(rowSelector, close) }}`, so focus lands on the row the user came from. Modal: `icon-x-medium-line`, label
  "Close", asking before it drops changes. Every Back really navigates; an end state ("Order placed") keeps a way out.
  *Test:* harness `navigation/back-chevron`; after Back, `document.activeElement` is inside the parent list.
- **R9 Actions.** At most 3 trailing actions, and at most 3 beside the large title (`largeTitleAction`, one or a list):
  Figma's Trailing-Slot (`.Primitives/Mobile/Top-Navigation/Trailling` 12013:39571) takes 3 in both Top-Trailing and
  Header-Trailing. A folded `searchAction` takes a slot, and the component drops a fourth without warning. Every icon
  has a label; unread = `dot` + the count in the label ("Notifications, 3 new"); `trailingGroup` only for the audio +
  video pair (one pill, two halves); an action with nothing to do stays in place, `disabled`. *Test:*
  `top-navigation/max-three-trailing`. *Changed 2026-10-05 (user: "Cả hai tối đa 3 như Figma"); it was 2 in the bar and
  1 beside the large title.*
- **R10 Edges line up.** `margin` comfortable (20px), except the conversation identity (compact, 16px). Lists straight
  on the screen use `inset="compact"`, so rows start at 20px; with the default inset they start at 24px (measured on
  "Settings on a phone" and in the playgrounds). Other blocks use `paddingX="lg"`. *Test:* the large-title text and the
  first row's leading item both start at x = 20.
- **R11 The frame owns the status bar and safe areas.** No status-bar or home-indicator spacer in example CSS; the
  header slot holds only the TopNavigation; `statusBar="light"` only over media or an overlay type. *Test:* no
  `safe-area` in `examples/pages/*.css` once R15 is done; `header` is a single `<TopNavigation>`.
- **R12 One h1.** The large title while it shows, otherwise the bar or identity title; content headings start at h2
  (kicker or Heading/4). *Test:* exactly one level-1 heading in the phone, before and after scrolling.
- **R13 Titles.** Nouns, sentence case. Bar titles ≤ 24 characters ([T]: under 15 when possible), on one line. A root's
  large title equals its BottomNavigation label. *Test:* string length;
  `largeTitle === items.find((i) => i.id === value).label`.
- **R14 Bottom navigation.** Only on roots. Tapping the current tab again scrolls it to the top (`screen.scrollTop()` in
  `onValueChange`), so the large title opens again. It stays on pushed screens of the same tab and hides only under a
  modal screen ([TB]). *Test:* `onValueChange` calls `scrollTop`.
- **R15 One footer component.** The main action is `ActionBar position="static"` in the PlatformPhone `footer`
  (`primaryAction` / `secondaryAction`) and never also in the bar. No `.pe-phone-cta`, no page-local footer classes.
  *Test:* grep `pe-phone-cta|px-[a-z-]+-footer` finds nothing.
- **R16 Sheets.** `BottomSheet inline` inside the phone; its scrim covers the bar, which does not change while a sheet is
  open. One sheet at a time; long content uses `size="max"`. *Test:* every `<BottomSheet` in a phone has `inline`.
- **R17 Same frame size.** No `maxHeight` or `height` on example phones: every phone is 390×844 at one scale, which
  Section 3 assumes. *Test:* grep finds neither on example phones.
- **R18 Code matches the render.** When the render uses them, the `code` sample shows `headerOverlay screenRef`,
  `scrollRef`, `searchAction` and the screen `key`. *Test for R4 and Section 3* (browser console on `?page=<id>`, one log
  per phone):

```js
for (const ph of document.querySelectorAll(".platform-phone")) {
  const s = ph.querySelector(".platform-phone__screen"), nav = ph.querySelector(".zen-top-nav"), cs = getComputedStyle(s);
  const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const ratio = +((s.scrollHeight - pad) / (s.clientHeight - pad)).toFixed(2);
  s.scrollTo({ top: s.scrollHeight }); await new Promise((r) => setTimeout(r, 600));
  console.log(ph.closest(".pe-card")?.querySelector("h3")?.textContent ?? "Playground", { ratio,
    rows: s.querySelectorAll(".zen-list-item").length, linked: nav?.dataset.scrollLinked === "true",
    folded: nav?.dataset.collapsed === "true", rule: nav?.dataset.scrolled === "true",
    searchAction: !!nav?.querySelector(".zen-top-nav__search") });
  s.scrollTo({ top: 0 });
}
```

## 3. Long enough to preview

**Rule.** A phone screen whose content is a list or feed must be at least 1.5× as tall as its visible area. Lists and
feeds here include people, files, tasks, orders, notifications, conversations, settings, photos and cards. Measure on
`.platform-phone__screen`: `(scrollHeight − paddings) / (clientHeight − paddings)`. Row counts below are for
iPhone 15 with mobile type:

| Header and footer | Visible area | Rows of 72px (2-line ListItem) | Rows of 92px (3-line) |
| --- | --- | --- | --- |
| Large title | 666 | 14 | 11 |
| Large title + control bar (Search, Segmented) | 614 | 13 | 10 |
| Large title + BottomNavigation or ActionBar / footer | 569–582 | 12 | 10 |
| Compact bar | 730 | 15 | 12 |
| Compact + Tabs control bar or ActionBar | 633–678 | 13–14 | 11 |

15 two-line rows pass under every header. Kicker headers, cards and charts on the screen count toward the 1.5×.

**Why 1.5×:**
1. **The fold needs room.** It only finishes when the scroll room is at least the fold height: 64px for a large title,
   116px with a Search, 124px in the template's comfortable density. Today 25 large-title roots have no scroll room at
   all, and 4 more have less room than their fold. With less room:
   - `settle()` gives up without closing (`TopNavigation.tsx`, `if (top > room()) return`);
   - the Search action never appears (it needs `folded`);
   - the Pale rule never shows (it needs y > fold).
2. **Room to see the behaviour.** 1.5× leaves about half a screen (300–360px, 4–5 rows) after the fold. That is enough
   to watch rows run under the bar, to stop half-way and see the settle, and to scroll back and see the title return.
   This is the iOS behaviour ([T]) and Material's exit-until-collapsed ([CA]).
3. **It tests the bars too.** The ActionBar, the BottomNavigation and the sheets only show their behaviour when content
   moves under or over them.
4. **Real lists are longer than a screen.** The studio has 14 people. Inbox, file and settings lists run past a
   screen in real apps.

**Data.**
- Copy rows into page-local data (brief §1). `data.ts` has 14 people, 10 tasks, 6 projects, 6 files, 5 invoices and
  6 activity items.
- Add believable Đìzai Studio rows. No "Item 7", no copied rows, no `Array.from` fillers. Keep a real sort order (by
  date or name).
- Photo grids can use the 14 distinct landscape photos in `PlatformMedia` (8 feed + 6 site).

**Exceptions (don't add rows).**
- Choice lists (radio, Segmented, sheet options with 2–7 choices).
- Cart, order and receipt lines.
- Forms; empty, loading and error states (a skeleton shows one screenful).
- Chat threads, whose length is part of the story.
- Media viewers.

R1 still applies to these screens. When they don't scroll, nothing folds, as with a short list on a real phone.

## 4. Audit of every phone (snapshot 15:18–15:21)

**Verdict codes:** OK = no change · W = wire the scroll (R1) · K = one key per screen (R2) · L·n = lengthen the list
to ≥ n rows (`L` alone = reach 1.5×, Section 3) · T = change the header (spelled out in the row) · B = add a way back or
out (R8) · F = footer → ActionBar (R15) · S = add `searchAction` (R5) · R14 = tapping the current tab scrolls to the
top · P = blocked by a shared platform file · D = needs a user or designer decision. **Header:** LT = large title.
**Scroll:** *static* = the header stays put and nothing folds; *linked* = `scrollRef` is wired. **Content:** rows on
the first screen · height ÷ visible area.

| # | Page › example | Header today | Scroll | Content | Footer, sheets | Verdict | Change needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | typography › Master screen · phone | root default LT "Chats", 1 trailing | folds at 24px (inner scroller) | 14 · 1.78 | sheet | W, P | Drop `collapsed`, `onScroll` and `.pe-phone-scroll`; wire R1. Platform file, BACKLOG P3. |
| 2 | typography › Child screen · phone | child compact "Order #1042", Back, Share | static | 2 · 1.00 | — | W, B, K, P | Back only writes a note. Give it a real Orders root (LT, ≥ 14 rows) and use `screen.go`. |
| 3 | button › Approve on a phone | child compact "Leave request" + Back; root LT "Time off" | static | 1 · 1.00 | page footer `px-button-footer` | W, K, L14, F | Time off root ≥ 14 requests. Decline · Approve → horizontal ActionBar. |
| 4 | chip › Filters on a phone | root default LT "Team" | static | 5 · 1.00 | 2 sheets | W, L14 | All 14 people unfiltered; the Chip row stays the first content block. |
| 5 | input › Time off on a phone | root LT "Time off" (no `title`) → child compact form + Back | static | 2 · 1.00 | ActionBar | W, K, L12, T | Pass `title="Time off"`. ≥ 12 past requests under the balance. |
| 6 | search › Search on a phone | root LT "Files" + Search control bar | static | 13 · 1.68 | sheet | W, S | Add `searchAction` ("Search files", scroll up + focus). |
| 7 | segmented › Control bar on a phone | root LT "Team" + Segmented control bar | static | 14 · 1.73 | — | W | — |
| 8 | segmented › Periods on a phone | root LT "Hours" + Chip row | static | 3 · 1.00 | — | W, L14 | The period's time entries ≥ 14 rows. |
| 9 | toggle › Phone settings | root LT "Settings" | static | 4 toggles in 2 groups · 1.00 | — | W, L | Reach 1.5× with more groups (Notifications, Privacy, Storage). |
| 10 | avatar › Profile photo | compact "Profile", no leading | static | 1 · 1.00 | 2 sheets | T, W | It is a root: default + `title` = `largeTitle` "Profile". |
| 11 | checkbox › Offline projects | root LT "Downloads" | static | 5 checkboxes · 1.00 | `.pe-phone-cta` | W, L, F | Reach 1.5× (≈ 12 projects, page-local); ActionBar. |
| 12 | radio-button › Delivery slot | child compact + Back; root LT "Delivery" | static | slot choices · 1.00 | `.pe-phone-cta` | W, K, F | The choice list stays short (exception); ActionBar. |
| 13 | badge › Status on a phone | root LT "Tasks" | static | 10 · 1.31 | 2 sheets | W, L14 | Add 4 page-local tasks. |
| 14 | popover › Sort on a phone | root LT "Files", `maxHeight={560}` | static | 6 · 1.00 | sheet | W, L14 | Drop `maxHeight` (R17); 8 more page-local files. |
| 15 | tag › Members on a phone | compact "New group", no leading | static | form · 1.00 | `.pe-phone-cta`, 2 sheets | B, W, F | A create screen: Close (`icon-x-medium-line`) that asks first; ActionBar. |
| 16 | date-picker › Schedule a review | child compact "New review" + Back; root LT "Reviews" | static | form 1.22; short root | ActionBar | W, K, L14 | Reviews root ≥ 14 rows. |
| 17 | tabs › Profile on a phone | child compact "Chi Tran" + Back + Tabs bar; root LT "Design team" | static | 4 · 1.00 | — | W, K, L14 | First tab ≥ 14 rows; root → "People" (all 14). |
| 18 | progress › Loyalty stamps | root LT "Rewards" | static | 3 + card · 1.00 | `.pe-phone-cta` | W, L12, F | Recent visits ≥ 12; ActionBar. |
| 19 | dialog › Withdraw on a phone | child compact "Annual leave" + Back; root LT "Time off" | static | detail; short root | page footer `px-dialog-footer` | W, K, L14, F | Root ≥ 14 requests; ActionBar. |
| 20 | accordion › Mobile order summary | compact "Checkout", no leading | static | 2 · 1.00 | `.pe-phone-cta` | B, W, F | Add the parent Cart screen (as in the slider page) and Back; ActionBar. |
| 21 | alert-banner › Offline on a phone | root LT "My tasks" + Sync; AlertBanner in the header slot | static | 3 · 1.00 | — | D, W, L14 | The banner breaks R11 and the fold (G6). Decide where it goes, then wire R1. |
| 22 | pagination › Mobile list | root LT "Exhibitors", `screenRef` for page turns | static | 6 per page · 1.00 | — | W, L14 | Page size ≥ 14; add `headerOverlay` to the existing `screenRef`. |
| 23 | skeleton › Detail screen | root LT "Tasks" → child compact + Back | static | 4 · 1.00 | — | W, K, L14 | Tasks root ≥ 14 once loaded. |
| 24 | toast › On a phone | root LT per tab + BottomNavigation | static | 4 · 1.00 | BottomNavigation (default) | W, L12, R14 | ≥ 12 offers; `onValueChange` also calls `screen.scrollTop()`. |
| 25 | divider › Mobile receipt | compact "Receipt", no leading | static | receipt | `.pe-phone-cta` | B, W, F | A pushed receipt: parent + Back (or Close if modal); ActionBar. |
| 26 | empty-state › No access | child compact + Back; root LT "Files" | static | short root | — | W, K, L14 | Files root ≥ 14. |
| 27 | inline-message › Timesheet on a phone | root LT "Timesheet" | static | 5 · 1.04 | page footer | W, L12, F | ≥ 12 entries; ActionBar. |
| 28 | slider › Points at checkout | child compact "Checkout" + Back; root LT "Cart" | static | cart lines | ActionBar | W, K | The cart stays short (exception). "Start new order" is the way out after paying. |
| 29 | stepper › Pickup order | root LT "Order A-248" | static | 2 · 1.00 | `.pe-phone-cta` | T, W, K, F | An order is a child: compact "Order A-248" + Back to an Orders root (≥ 14). |
| 30 | card › Choose on a phone | compact "Checkout", no leading | static | 2 cards | ActionBar | B, W | Back to a parent Cart, or Close. |
| 31 | dock-icon › Spending on a phone | root LT "Spending" → child compact "Payment" + Back | static | 7 · 1.07 | — | W, K, L14 | ≥ 14 payments. |
| 32 | list-item › Settings on a phone | root LT "Settings" → children compact + Back | static | 5 · 1.00 | — | W, K, L14 | ≥ 14 settings in kicker groups; `inset="compact"` (R10). |
| 33 | table › Narrow screen | root LT "Team hours" | static | 5 table rows · 1.00 | ActionBar | W, L | Reach 1.5× (≈ 12 timesheets). |
| 34 | color-selector › Project colour | child compact "Brand refresh" + Back; root LT "Projects" | static | short root | — (being edited) | W, K, L14 | Projects root ≥ 14 (8 page-local). |
| 35 | metric › Drill in on a phone | root LT "My numbers" → child compact + Back | static | 5 cards · 1.35 | — | W, K, L | Reach 1.5× (one more card row or a short activity list). |
| 36 | rating › Rate your order | child compact + Back; root LT "Orders" | static | form; short root | ActionBar | W, K, L14 | Orders root ≥ 14. |
| 37 | uploader › Attach on a phone | compact "Sick leave", no leading | static | form | `.pe-phone-cta` | B, W, F | Back (from Time off) or Close; ActionBar. |
| 38 | ai-chat › Assistant on a phone | compact "Zen AI" root; New chat once started | static | thread | AiChatField dock | W | Reuse its `screenRef` as `scrollRef` + `headerOverlay` (being edited). |
| 39 | bottom-navigation › Playground | compact "Home", no large title | static | 14 · 1.56 | BottomNavigation | T, W, R14, P | Root pattern: default, `largeTitle` = tab label (`PlatformMobilePlaygrounds.tsx`). |
| 40 | bottom-navigation › Root destinations | root LT per tab | static | 5 · 1.00 | BottomNavigation | W, L12 | Projects and Inbox tabs ≥ 12 rows. |
| 41 | bottom-navigation › Action in the bar | root LT per tab | static | 5 · 1.00 | BottomNavigation + action, sheet | W, L12 | Expenses ≥ 12. |
| 42 | bottom-navigation › Floating with create | root LT per tab | static | 8 · 1.04 | floating BottomNavigation, sheet | W, L12 | ≥ 12 tasks. |
| 43 | bottom-navigation › Glass over photos | none (full-bleed media root) | — | photo | floating-glass | OK | Media root, exempt from R1. |
| 44 | bottom-navigation › Labels in a brand app | root LT per tab | static | 3 · 1.00 | BottomNavigation (accent), sheets | W, L12 | Menu tab ≥ 12 drinks. |
| 45 | bottom-sheet › Playground | compact "Zen website" + 1 trailing, no leading | static | 14 · 1.51 | sheet | T, W, P | Backdrop as a root (default, LT) or a working Back. |
| 46 | bottom-sheet › File actions | root LT "Files" | static | 5 · 1.00 | sheet | W, L14 | ≥ 14 files. |
| 47 | bottom-sheet › Pick one | root LT "Settings" | static | 3 · 1.00 | 3 sheets | W, L14 | The settings list ≥ 14 rows (the sheet options stay short). |
| 48 | bottom-sheet › Log time | root LT "Timesheet" + Log time | static | 5 · 1.00 | sheet | W, L14 | ≥ 14 entries. |
| 49 | bottom-sheet › Filters | root LT "Tasks" | static | 8 · 1.04 | sheet | W, L14 | ≥ 14 tasks. |
| 50 | bottom-sheet › Terms to accept | root LT "Rewards" | static | intro | `.pe-phone-cta`, sheet | W, F | ActionBar. |
| 51 | chart › Hours on a phone | root LT "My hours" (canvas) | static | chart + 4 · 1.16 | — | W, L | Reach 1.5× (the month's entries under the chart). |
| 52 | chat › Playground | conversation identity, Back, call pair | static | 11 messages · 1.49 | composer | P | `PlatformChatHeader` must pass `scrollRef` first (G8). |
| 53 | chat › Hold to react | conversation | static | 9 messages | composer | P | Same as 52. |
| 54 | chat › Chats inbox | root LT "Chats" → conversation | static | 10 · 1.16 | — | W, K, L14, P | 4 more real conversations; thread as 52. |
| 55 | chat › Not delivered | conversation | static | 6 messages | composer | P | Same as 52. |
| 56 | chat › First message | conversation, empty thread | static | 0 (by design) | composer | P | Same as 52. |
| 57 | chat › Customer support | conversation (canvas) | static | 6 messages | composer | P | Same as 52. |
| 58 | top-navigation › Playground | root LT + Back + trailing + `largeTitleAction` | linked | 14 · 1.56 | — | P | Shows every prop (exempt from R3). Rows start at 24px: `inset="compact"` (R10). |
| 59 | top-navigation › Root and detail | root LT "Projects" → child compact + Back + Copy link | static | 6 · 1.00 | — | W, K, L14 | ≥ 14 projects (8 page-local). |
| 60 | top-navigation › Collapse on scroll | root LT "People" + Search fold + Invite | linked | 14 · 1.73 | sheet | OK | The reference implementation. |
| 61 | top-navigation › Home with notifications | root alt LT "Home", Avatar, bell with dot | static | 5 in 2 cards · 1.00 | sheet | W, L | Reach 1.5× (e.g. a "Due this week" card). |
| 62 | top-navigation › Inbox control bar | root LT "Inbox" + Segmented + 1 trailing | static | 7 (92px) · 1.13 | — | W, L10 | ≥ 10 notifications. |
| 63 | top-navigation › Conversation header | identity + Back + call pair; root LT "Messages" | static | 4 messages; root 3 rows | composer, sheet | W, K, L14 | Messages root ≥ 14 conversations. |
| 64 | top-navigation › Over photos | root LT "Moodboard" → liquid-overlay viewer + Close | static | 8 photos in 3 columns · 1.00 | sheet | W, K, L | 14 distinct photos in 2 columns (≈ 1.8×). |
| 65 | layout › Mobile screen | root LT "Tasks" (canvas), New task, no `title` | static | 4 + 2 cards · 1.00 | sheet | W, T, L | Pass `title`; reach 1.5×. |
| 66 | text › Mobile typography | child default "Order #1042" + Back; root LT "Orders" | static | 2 · 1.00 | — | T, W, K, L14 | Child → `type="compact"`; Orders root ≥ 14. |
| 67 | link › Mobile sign-in | compact "Sign in" (first step); Back on later steps | static | form | `.pe-phone-cta` | W, F | ActionBar. |
| 68 | menu › Mobile row menu | compact "Files" root | static | 4 · 1.00 | — | T, W, L14 | Root pattern (default, LT "Files"); ≥ 14 files. |
| 69 | description-list › Receipt in a bottom sheet | compact "Orders" root | static | 5 · 1.00 | sheet | T, W, L14 | Root pattern; ≥ 14 orders. |
| 70 | action-bar › Print shop on a phone | compact "Prints" root → detail compact + Back | static | 6 · 1.00 | ActionBar on detail | T, W, K, L14 | Root pattern; ≥ 14 prints. |
| 71 | action-bar › Filters on a phone | modal compact "Filters" + Close; parent compact "Prints" | static | form | ActionBar | T, W | The filter screen is right; its parent "Prints" → root pattern. |
| 72 | image › Photo feed on a phone | compact "Explore" root (canvas) | static | 5 cards · 2.48 | — | T, W | Root pattern (LT "Explore"); length is fine. |
| 73 | visually-hidden › Unread counts on a phone | compact "Inbox" root | static | 4 · 1.00 | — | T, W, L14 | Root pattern; ≥ 14 conversations. |
| 74 | form › Mobile checkout | compact "Checkout", no leading | static | form · 1.31 | submit inside the form | B, W, F | Back or Close; "Place order" → ActionBar. |
| 75 | app-shell › Phone app | no TopNavigation (PageHeader in the content) + BottomNavigation | — | 2 + card | BottomNavigation | T, W, L12, R14 | TopNavigation root per tab in the phone header instead of PageHeader. |
| 76 | templates › Mobile list · Orders | sticky LT + Search fold | linked (sticky) | 6 (92px) · 1.16 | sheet | L10 | ≥ 10 orders (template owner). |
| 77 | templates › Mobile detail · Order | sticky compact + Back + Share | static | 1.98 | ActionBar, 3 sheets | W | Add `scrollRef` to the sticky bar (template owner). |

Not counted: the Top Navigation guideline visuals (static images), `examples/drafts/*` (never rendered),
the phone examples in `PlatformShowcases.tsx` and `PlatformMobileShowcases.tsx` (replaced by `examples/pages`), and the
ActionBar "One set of actions, two widths" demo (a width frame, not a phone).

**Totals:** OK 2 · W 68 · K 22 · L 47 · T 14 · B 7 · F 14 · S 1 · R14 3 · P 11 · D 1.

## 5. Gaps: Backlog candidates (not changes)

The owners come from HANDOFF and the 2026-10-01 log. "Component library review và fixes" owns the scroll fold.

- **G1 · P1 · The fold stops after a screen swap** (`useScrollFold`, TopNavigation).
  - Cause: the ResizeObserver only watches the fold that existed when the effect ran.
  - Probe on one TopNavigation instance with `scrollRef`:

    | Screens shown (no key) | Fold at y = 300 | `data-collapsed` |
    | --- | --- | --- |
    | Root | 64px | true |
    | Root → child → root | 0px | not set: never folds again |
    | Same swap with a key | 64px | true |

  - Fix to consider: run the effect again when the fold appears or goes. Until then: R2.
- **G2 · P2 · Focus can sit under an overlaid header** (PlatformPhone screen: `scroll-padding-top: auto`).
  - Probe: in "Collapse on scroll", a row focused while scrolled sits at 60–132px. The folded header covers 0–114px,
    and the browser does not scroll it clear.
  - If the row is fully covered, this fails WCAG 2.2 SC 2.4.11 ([WCAG]).
  - Fix to consider: `scroll-padding-top` = the header's visible height in PlatformPhone, plus a line in the guideline
    for apps.
- **G3 · P3 · The harness misses scroll-linked bars.** `top-navigation/search-folds-to-action` only checks
  `collapsed`. A `scrollRef` bar with a Search and no `searchAction` passes.
- **G4 · Decision · Figma Top-bar=false has no code equivalent.** The ◆ Social and ◆ Finance roots show only the large
  title and its action. In code the 64px bar row always renders, so roots are 64px taller than in Figma and their
  actions sit in the bar row (the iOS layout).
- **G5 · P3 · `largeTitleAction` cannot be reached once the title folds.** Figma's folded state shows the action in
  Top-Trailing. Fix to consider: move it into the trailing slot while folded, as `searchAction` does.
- **G6 · Decision · No slot for a status banner under the bar** ("Offline on a phone"). `controlBar` is documented for
  Search, Segmented and Tabs only. Options: document a Small AlertBanner as a control bar, or let banners scroll with
  the content.
- **G7 · P3 · Figma features without props:**
  - Large title: Capline, Subheading and Badges (the ◆ Logistic detail "Mã vận đơn · K1241256788 · Chờ lấy").
  - Bar title: Dropdown (◆ Logistic "Trong nước ▾").
  - No selection-mode API: count title + Close + bulk actions are a recipe only.
  - No hero header that turns from overlay to opaque as the content scrolls.
- **G8 · P2 · Platform · `PlatformChatHeader` does not pass `scrollRef` on.** Chat phones cannot follow R1 until it
  does (a shared file: its owner changes it).
- **G9 · P3 · Docs:**
  - `example-patterns.md` §2 still tells every phone to use `type="compact"` and the `.pe-phone-cta` footer: update it
    to R7 and R15.
  - The guideline cites HIG "Navigation bars", which now redirects to "Toolbars".
  - The bottom-navigation guideline does not say that tapping the current tab scrolls to the top (R14).
- **G10 · P3 · Old phone examples left behind.** The phone examples in `PlatformMobileShowcases.tsx` and the
  `PlatformShowcases.tsx` phones are overridden by `examples/pages` and never render (`ChartReportPanel` is still used).

## Sources

- [T] Apple HIG, Toolbars (the iOS 26 HIG folds navigation bars into it): https://developer.apple.com/design/human-interface-guidelines/toolbars
- [SF] Apple HIG, Search fields (bottom search in Mail, Settings and Notes; top in Wallet): https://developer.apple.com/design/human-interface-guidelines/search-fields
- [TB] Apple HIG, Tab bars (keep the tab bar visible; Music minimizes it on scroll): https://developer.apple.com/design/human-interface-guidelines/tab-bars
- [SH] Apple HIG, Sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- [UI1] UIKit `prefersLargeTitles`: https://developer.apple.com/documentation/uikit/uinavigationbar/preferslargetitles
- [UI2] UIKit `largeTitleDisplayMode`: https://developer.apple.com/documentation/uikit/uinavigationitem/largetitledisplaymode-swift.enum
- [UI3] UIKit `hidesSearchBarWhenScrolling`: https://developer.apple.com/documentation/uikit/uinavigationitem/hidessearchbarwhenscrolling
- [UI4] UIKit `scrollEdgeAppearance`: https://developer.apple.com/documentation/uikit/uinavigationbar/scrolledgeappearance
- [CA] Android, Compose app bars (pinned, enterAlways, exitUntilCollapsed): https://developer.android.com/develop/ui/compose/components/app-bars
- [MDC] Material Components, Top app bar (lift on scroll, scroll flags, contextual action bar, flexible bars): https://github.com/material-components/material-components-android/blob/master/docs/components/TopAppBar.md
- [TC] Compose `TopAppBarColors.scrolledContainerColor`: https://kotlinlang.org/api/compose-multiplatform/material3/androidx.compose.material3/-top-app-bar-colors/
- [M3] Material 3 app bars (rendered with JavaScript; its limit of 3 trailing actions on mobile came from SAP Fiori's M3 usage page, seen only in search results): https://m3.material.io/components/app-bars/guidelines
- [NN] NN/g, "Sticky Headers: 5 Ways to Make Them Better" (2021): https://www.nngroup.com/articles/sticky-headers/
- [WCAG] Understanding SC 2.4.11 Focus Not Obscured (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- Zen: `src/components/TopNavigation/TopNavigation.tsx`, `docs/guidelines/{top-navigation,bottom-navigation,bottom-sheet,search,segmented,action-bar}.md`, `src/platform/PlatformPhone.tsx`, `docs/research/example-rebuild-brief-2026-09-30.md` §3–§5, Figma 12014:45167 · 4060:17984 · 12012:39316 · 12013:39571.
