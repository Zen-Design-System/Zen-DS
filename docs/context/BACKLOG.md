# Backlog and open items

Moved out of `HANDOFF.md` on 2026-09-29 (text unchanged). A session that finds a bug or follow-up appends ONE line under
"## Backlog" here (priority + pointer), mentions it in its report, and stops (Scope lock, `AGENTS.md`).
Read this file only when picking up work or logging a follow-up.

## Open items

- **Zen-High-Contrast, next steps (prototype in code since 2026-10-05; user: keep step 9, no new tokens):**
  - Decided (user, 2026-10-05, after crisp crops at 2.2 / 2.5 / 3:1): Subtle borders stay 3:1 in HC. Chip, Checkbox,
    Radio, Tertiary button, Segmented and Tag share Border/Neutral/Subtle, so they cannot differ.
  - Done (user "Có", 2026-10-05): the overlay placeholders follow Content/Placeholder to alpha 9 (live Figma had it).
  - Done (2026-10-05 evening, export "Zen-Variables 2"): Global Colors now carries the Zen-High-Contrast mode, which
    equals the algorithm on all 960 values; build-tokens takes Figma's mode and tokens:check verifies it. The Mint ramp
    was synced in the same export and matches the live file (Mint/9 #40E7AD). The native packages carry the second mode
    as data (resolver default Zen); mapping it to iOS accessibilityContrast / Flutter highContrast is still open.
  - Done (user "Có", 2026-10-05): Color Scales › Create Variables › Sync High Contrast in the plugin (toast with the
    result); in the plugin's next build (the Lục Thạch session integrates and builds overnight).
  - Known by decision: text on step-9 Solid fills (Avatar initials, Accent button text) stays under 4.5:1 in HC.

- Push or open a PR for `claude/zen-ds-0.4.0`: waiting on the user.
- `server.host: true` for LAN access: waiting on the user.
- Code view in other languages (Vue, Svelte, HTML, Swift, Flutter; today "Coming Soon"): plan
  `docs/research/code-languages-plan-2026-10-03.md`, waiting on the user's decisions in its §8 (web strategy, which
  languages and in what order, the dropdown until then). Examples get every language too (user, 2026-10-03; §4, P2b).
  Nothing built.
- Figma inconsistencies to report to the designer are the `figmaExceptions` in `tools/figma-contract/suites/`:
  Button Surface blur/hover, Overlay rings on Disabled, Icon-Main shadows, the IconButton ring radius, Input/Heading
  H3 at 44px.
- For the designer (found on 2026-09-29 through the Figma connector): text styles Heading/2, Heading/3 and
  Caption/* still cache the old `paragraphSpacing` (28 / 24 / 10), although it is bound to Font-Size (25 / 22 / 11).
  Code follows the variable. Re-apply the styles in Figma to refresh them.
- For the designer (Figma parity update, 2026-09-29; code keeps its current behaviour until answered):
  - **Toggle caption (P2):** the set 1526:5703 overrides Subtext to Caption/Regular 11/16 in all 24 variants, but the
    primitive `.Primitives/Toggle/Content` 1526:5945 says Body/Small/Regular 12/16. Code follows the set, like
    Checkbox, Radio and the Table cells. Fix the primitive?
  - **Segmented (P2):** Item Medium / Secondary / Selected (and the set's Item-1) binds Tag/Background/Default, while
    Small binds Segmented-Item-Secondary/Background/Seclected/Default. Same in light, different in dark. Code uses the
    Segmented token. Also: code has a Disabled state Figma lacks; the `*/Seclected/Hover` and Secondary Border tokens
    are now unbound; the set description lists props it does not have; should focus stack with the selected shadow?
  - **Input / Search Disabled (2026-09-30):** Search/Default and Search/Popover have no State=Disabled; code derives it
    from the Field-Only instance they are built on (Field-Only State=Disabled + Leading-Trailing Active=No). Add the
    variant, or confirm. Number-Align-Left/Center State=Disabled still draw their steppers as Button State=Default
    (code disables them). Autocomplete (View-Only) and Rich-Text have no Disabled: intended?
  - **Search/Popover:** the designer made all 30 variants consistent on 2026-09-29 (a 1px INSIDE Container stroke,
    no ring); code follows. Still open: the set description lists props that do not exist, and the Hover stroke
    weight of Field-Only and Search/Default is no longer bound to Emphasis/Border-Weight/Active/Primary (code keeps
    the binding there). The set now sits in a frame with an explicit Component Theme mode, so its previews resolve
    in that mode.
  - **Checkbox / Radio:** Checkbox/Text centres the mark on label + caption (Radio top-aligns; code top-aligns both);
    Checkbox/Text has a dead Caption prop and a root gap on a single child; neither set says what colour a Disabled
    caption is (code: Content/Disabled).
  - **Chat bubbles:** the Text-You Social background blur (40) sits on an opaque fill and does nothing; the Mobile
    variants carry the Hover actions toolbar, but mobile uses hold-to-react.
  - **Table cells:** Badge-Cell and Tag-Cell items do not wrap in Figma (code wraps); two-line and action cells do not
    fit Table/Cell/Size 52 (code rows grow to 63–64px); Edit state stroke alignment, Control-Cell wrappers and a few
    descriptions are inconsistent.
  - **Breadcrumbs:** the root's 3XSmall gap has a single child and never renders; there is no current-page state and
    no collapse (…) item.
  - **DatePicker (2026-09-29):** In-Range-Hover fills the Container with Color/Background/Inverse/Solid/Default and
    leaves `Date-Picker-Item/Background/Seclected-In-Range/Hover` unused (code follows the component). The Header
    Date-Container is Corner-Radius/Small at rest and Base on Hover/Focused (the rest state has no fill, so only Base
    is ever seen).
  - **Toggle:** the `Seclected` typo in its variables; Toggle-Button binds Segmented tokens and has an effect on an
    empty frame.
  - **Typography (2026-09-29 review, decision 6):** Display/4 values (32/36/40) are larger than the Heading/1 page title
    (28/32/36) in every mode, so card grids of values outrank the title. Keep, or limit Display/4 to one hero value per
    view (Heading/2–3 in grids)? Related: the AiChat greeting (h2 in Heading/1), the MetricWidget large value
    (Heading/1) and the ModalForm title (Heading/2, 25px next to a 28px page h1) blur "Heading/1 = the page title".
  - **Chip S3:** the selected Secondary chip keeps a Subtle border at the Secondary weight on a faint tint (selection
    contrast about 1.15–1.3:1), unlike "Selected → Color/Border/Active/*". Should S3 switch?
- For the designer (App Shell, 2026-09-29; code keeps its current behaviour until answered):
  - **Rail width:** the HR-Platform rail (Patterns/Density/Comfortable/Sidebar/No) is 80px wide, with a 72px surface and
    an 8px inset on the left only. The Side-Bar/Master/Basic Expand=No master is 84px, with a 68px surface and an 8px
    inset on both sides. Code follows the master.
  - **Sidebar pattern Shadow=No** (6040:67524): a Surface/Default sidebar without Shadow/Bottom/Level-1. No Sidebar
    `background` gives it today.
  - **No spec for narrow shells:** Figma draws the top bar and the drawer on desktop only. Code puts the top-bar
    content on its own row under 744px and adds a Close button beside the drawer (APG modal dialog).
  - **Floating-Actions** (6040:72809) uses a local effect (0 12 28 and 0 4 8 −4, Neutral/Base), not an Effect style.
  - **Action-Item has no open state:** when Notifications opens its panel (`aria-expanded="true"`) the button looks the
    same. Should it take a selected or pressed look?
- Density tokens that no component uses yet (Badge 2xsmall is now the AppShellAction count; `global-control-bar`
  places the drawer's Close button):
  - Tag small
  - Segmented xsmall
  - `sidebar-small-width`
  - `dashboard-header` (80/88): the HR-Platform top bar measures 72 (24 + 40 + 8); ask the designer which one the
    dashboard header should use.
  - `navigation-action-margin`
- Deliberately fixed sizes, which do not follow density:
  - Mobile Top/Bottom Nav, Bottom Sheet and the Chat mobile composer
  - 2xs buttons
  - the Radio dot
  - Progress and Slider icons
  - hit-area slots
- Known Figma issue: FileIcon Format=Photo was a copy of PDF. Check whether the designer's re-sync fixed it.
- Figma vs code differences seen during the style-guard burn-down, not fixed (ask the designer or decide):
  - Slider: in Figma the Medium thumb keeps its drop shadow on hover (code swaps it for the ring), and the Small thumb
    has no shadow when disabled (code keeps it).
  - Chart: stack-bar columns are Corner-Radius/Small on all corners in Figma (code: XSmall, top corners only).
  - Bottom Navigation: Figma binds the action and FAB icons to Button/Icon-Size/Medium; code keeps the fixed
    Bottom/Icon-Size, because the mobile nav does not follow density.
  - appLayer phone home indicator: Figma's System/Bottom-Indicator (308:46297) is a 6% Background/Neutral/Subtle bar,
    while code draws a solid OS glyph (`zen-allow-colour-role`).
  - Raw values in Figma kept as `zen-allow`: the Chat Reaction-Bar's 15px emoji gap (6182:55704), and Business bubble
    and card shadows that are local effects rather than an Effect style.
- Figma has no Focus state for Popover/Item and no Error+Focused state for the Input family. Code draws the 3px
  Focus/Accent ring inside the option, and keeps the error border plus the Focused ring on an invalid field. Confirm
  both with the designer.
- Figma `Control-Bar/Select-Item` (9021:27379) has Default / Hover / Selected only. Code draws a disabled item with
  Content/Disabled: the whole bar of a Read-only RichTextField, and since 2026-09-29 Undo / Redo with nothing to undo
  or redo. Ask the designer for a Disabled state.
- Scrolling strips show no overflow hint. Since 2026-09-28 a Segmented wider than its container scrolls sideways,
  like Tabs and the chip filter row: no scrollbar, no edge fade.
  - When a segment boundary lands on the edge, nothing shows that there are more. Example: Templates › "Empty & error
    states" at 390 in Comfortable.
  - Figma has no fade or peek spec. Ask the designer; if the answer is yes, add it once for Tabs, chip rows and
    Segmented.
- Read-only fields show no focus indicator (behaviour warn "while read-only": dialog, inline-message, side-panel,
  tooltip, visually-hidden). Waiting on the user: give them the error state's fix, or keep them as they are.
- Dead clicks: none left in `tools/platform-audit/behaviour-baseline.json` (deadclick 75 → 5 on 2026-09-28, 5 → 0 on
  2026-09-29; 24 → 19 keys). The 96 handler-less actions were wired on 2026-09-28 (session log "Handler-less
  actions"); the last 5 were component behaviour, fixed on 2026-09-29 (session log "The last 5 dead clicks"):
  - Chip: a Number-only chip without `onClick` or `selected` is a static count (`<span>`).
  - DatePicker: with `showActions` picks are a draft; `onApply(value, range)`, `onCancel`, `range` / `defaultRange`.
  - RichTextField: its own undo history; Undo / Redo are disabled with nothing to undo or redo.
  - Chat: the quote of a deleted message is plain text. The other quotes already flashed the original; the Chat
    owners' sessions were not running, so the change stayed inside `ChatReplyQuote`.
- Platform chrome: "Download Figma" (overview + sidebar footer) and "Feedback" have no destination, so
  `interaction/action-without-handler` keeps them as its 3 warnings. Waiting on the user for the URLs.
- Scratch tests written before the vibe-ready landing may still select component variants by `[data-theme=…]`.
  Those now use `data-tone`, so re-check such selectors before trusting a failing scratch test.
- ~~appLayer has an import cycle~~ done 2026-10-05 (session "Nested boolean không hoạt động"): the playground helpers
  moved to `appLayer/playgroundParts.tsx` and the group data exports keep their identity (`keepOnHotUpdate`), so a
  template or app-shell edit is a Fast Refresh. Adding or removing a page/example still reloads once (by design).
  Old notes: `appLayer/shared.tsx` imported `../PlatformExamples` and `../PlatformTemplate`, and
  `content.tsx` imports `option` from `shared.tsx`.
  - A hot update while a probe runs (another session editing) can throw "Cannot access 'option' before
    initialization" in `behaviour.mjs`.
  - Re-run the page: a fresh load is clean.
  - Moving the shared helpers (`option`, `Panel`) into a leaf module would end it. The owner is "Đánh giá Zen DS hiện
    tại" (appLayer).
- The work is committed on the local branch `claude/zen-ds-0.4.0` (see Current state); `main` is still `eafb0de`. Cut a
  release (0.3.0 + 0.4.0) when the user asks, using CHANGELOG.md.
- Phone decisions from the Top Navigation research (2026-10-01, `docs/research/top-navigation-mobile-rules-2026-10-01.md`):
  - **PlatformPhone tokens: decided 2026-10-01.** The user approved it in session "Disable input và search từ Figma":
    `.platform-phone` now sets `data-breakpoint="mobile"`, and R10 became "keep the default inset". Phone rows, kicker
    headers and the bar all sit on 20px.
  - **G4: done 2026-10-02 (user: match Figma).** Roots hide the empty top-bar row (Top-bar=false). Code always draws the 64px row, so roots are 64px
    taller than Figma.
  - **G6: done 2026-10-02 (user: always under the Top Navigation).** TopNavigation `banner` now covers where the
    "Offline on a phone" banner sits once the title folds. `controlBar` documents Search, Segmented
    and Tabs only, so there is no slot for a banner under the bar.

## Backlog (plan before opening sessions)
- **P3 · Grid column resize follow-ups (2026-10-06, session "Search spacing collapse bug"):** (1) an item with a Fixed
  width (a Studio wrap Stack `width={240}`) that is alone in a px Grid column still edits its own width on a drag, which
  can leave free space again; resizing the column and clearing that width needs one request touching two elements
  (server op). (2) Double-click (Hug) on a column item does nothing ("drag the edge"): could write the track as `auto`.
  (3) No E2E row for the column drag / Fit yet (probe scripts were ad hoc).
- **P3 · Emoji in alpha text (2026-10-06, session "Emoji mờ trong text alpha"):** (1) proposed harness/audit check:
  a colour emoji in text whose colour has alpha < 1 (Neutral Base/Light, captions, DescriptionList terms) — wrap it in
  an opaque span; (2) proposed DS helper (e.g. an inline `Emoji` primitive) so apps need not know the trick;
  (3) `examples/pages/chat.tsx:912` docs description "sends a 👋" renders at alpha .69; (4) `appLayer/shell.tsx:463`
  "Phone app" (HrPhoneExample) does not render on the App Shell page — `examples/pages/app-shell.tsx` wins; dead or meant?
- **P3 · Sidebar section titles (2026-10-06, session "Khoảng trống Report và Settings"):** (1) proposed harness rule
  `sidebar/untitled-section`: a `sections` entry after the first without `label` (renders a bare 16px gap); fixtures
  in `tools/usage-guard/fixtures`. (2) Titled one-item groups await the user's call (merge or keep):
  `appLayer/navigation.tsx` "Workspace › Settings", `examples/pages/alert-banner.tsx` "Workspace › Billing",
  `appLayer/shellScreens.tsx` "Settings › Roles & access".
- **P3 · Sidebar rail follow-ups (2026-10-06, found by "Sidebar rail align", not changed):** (1) App Shell example
  screens (`src/platform/appLayer/shellScreens.tsx` People/Time off/Settings, `shell.tsx`) pass `brand` without
  `logoCollapsed`: their rails are 84px (fallback, centred) vs 88px on the Modules screen. (2) HR module rails turn
  the `search` slot (Back + module title) into a magnifier "Search" button that only expands the panel: a Back
  chevron (or nothing) would match what the slot holds.
- **P3 · Card → ListBox leftovers (2026-10-06):** (1) done 2026-10-06 by session "Canvas và surface mặc định": the
  screen stage is Canvas/Default and the 4 list Cards (menu Projects + Open tasks, text Open tasks, visually-hidden
  Skip link) are ListBoxes; sidebar RowCard on Alt/Flat canvases stays a Card.
  (2) done 2026-10-06: ListBox `theme` (flat · shadow · pale · border, user-approved); the examples and templates pick it
  by §16. Open: Figma Component/List-Box has no Theme property (code mirrors Card's Theme) — add it to the master?
  Found by the theme sweep (not changed, scope lock): sibling Cards that disagree with their screen's ListBox theme —
  app-shell StudioApp Home MetricCards flat beside shadow ListBox (~244); alert-banner Billing Card border (~134) and
  breadcrumbs Top bar trail Card border (~201) on shadow screens; sidebar.tsx `cardLook` (default → border, alt → flat +
  surface alt) for the settingsList Cards. layout.tsx Elevated panel: `ElevatedList` is a hand-built box of rows (Box
  surface + List) whose render (Sidebar background="flat", no effectStyle, MetricCards flat) disagrees with its
  description and code string (default Sidebar, Shadow/Bottom/Level-1) — candidate for `<ListBox theme="shadow">`. (3) Mixed pairs: done
  2026-10-06 (the tabs Overview Card and segmented Billing Card are flat now, like the ListBoxes beside them).
- **P3 · Figma List-Box master (2026-10-06):** variants have a FIXED height (instances with fewer rows keep empty space
  until set to Hug) and Header-Slot / Footer-Slot centre their content, while code left-aligns header text and footer
  actions; ask the user whether the master should hug and align left.
- **P3 · List Item follow-ups (2026-10-06, session "List Item padding/gap adjustment"):** (1) Box padding is not
  breakpoint-aware, so desktop boxes of rows (`padding="xl"`, 24px) keep 24px on a 390px window where the page margin
  is 20px; (2) the Demo page's List composition (14730:79268, "My Leaves") still has the old List padding (12 top/bottom,
  0 sides, gap 2): with the new master its rows touch the frame sides and the fills overlap — update it in Figma;
  (3) BottomSheet body pads Margin-Compact, 16px on phones, so a clickable row's fill sits 4px from the sheet edge
  (Pick one, Sort by, template sheets); padding phone sheets 20px (title, search, body, footer) would give 8px — a
  component decision; (4) Card keeps radius 24px on phones while row blocks are `radius="xl"` 20px (Chart › Hours on a
  phone): Card radius xl on phones would match and be concentric with the fill; (5) Chat conversation rows keep the
  component's 16px inset (Figma Margin-Compact) while phone titles sit at 20px; (6) App Shell › Studio app's list block
  is a Studio-detached Box (24px fixed) next to Cards that pad 20px on phones; (7) code strings that differ from their
  render, seen by the review but not about lists: badge › Invoice status, menu › Keyboard and shortcuts, list-item ›
  Grouped notifications and layout › Main column / Centred (Card theme border vs flat), layout › Elevated panel (prose
  says shadow, render is flat), stepper / date-picker / pagination / rating snippets that leave out their List rows;
  avatar › Who's online status row sits on the card edge while the rows are inset.
  Gate warnings seen on these pages, not from this change: action-bar.tsx:404/519 trailing button size xs
  (list-item/trailing-button-medium); avatar › Profile photo has no h1 (outline-h1/start); app-shell › Search in the top
  bar "Activity, new" and chat › First message "Audio call" dead clicks; button.tsx:403 Heading/2 Text on a Studio-detached
  row (type/visual-heading) and its 2px Stack gap (ladder); list-item › Pending invites Revoke flagged as a dead click but
  works (3 → 2 rows + toast).
- **P3 · Sky/Mint/Bronze/Golden themes, follow-ups (2026-10-05, session "Cập nhật Zen Variables tokens"):** (1) Avatar
  Golden Solid has white initials at 2.58:1 (Bronze 3.38:1): add `golden` to `avatar/solid-initials-contrast` (today
  green|teal|orange|cyan) and to the avatar guideline Don't; (2) Figma Dock-Icon Solid Sky, Mint (and Yellow) draw white
  icons (On-Colors, 1.6–1.8:1) while Avatar/Badge use On-Brights there: ask whether Figma should switch to On-Brights;
  (3) the Badge and Badge-Counter contracts (`segmented-toggle-badge-avatarstack.json`, 102 of 126 variants) predate the
  four themes, `avatar-single.json` holds only the Photo/Neutral subset, and no suite reads them: re-capture with
  tools/figma-kit when a suite is written.
- **P3 · TopNavigation groups follow-ups (2026-10-05, session "Dual action trên top navigation Figma"):** (1) Header-Trailing
  (`largeTitleAction`) takes no `group` yet; (2) Figma's pill holds two, nothing warns at three in one group (a harness
  rule or a Studio drop warning); (3) Studio E2E rows for drag/group (gestures sent to "Studio builder tool planning");
  (4) the 5173 dev server needs a restart before the Studio item ops `groupItem` / `ungroupItem` work there.
- **P3 · Input Small text style vs Figma (2026-10-04):** `InputContent` uses Body/Small/Medium for Small, but `fieldTextStyle` (Input.tsx) gives every field but XLarge Body/Base/Medium; check the Figma Input Small content style and align one of them.
- **P2 · Studio object props, next steps (2026-10-04):** after B2 (`setField`): adding an object to an unset prop
  (EmptyState `secondaryAction` "Not set"), editing `prop={CONST}` data held by a
  same-file const (86 props, `editability-audit.mjs --class=data-const`). Then B3 (nested non-boolean props), B4 (override
  for loop-bound/bound/conditional props, 3,087), B5 (tests per class). Add/remove/reorder list items: done 2026-10-04 by
  session "Mở lại port preview" (`tools/studio/items.mjs`, ObjectProperties `selection`/`only`, DataItemPanel).
- **P3 · Top Navigation Modal screen placeholder contrast (2026-10-04):** `npm run qa` warns `[contrast] top-navigation@1512/390`
  "Choose a reviewer" / "Choose a slot" 1.92:1 (SelectField placeholders); seen while gating the Studio B2 change, which does not
  touch that page.
- **P3 · Design Tokens dark nav contrast (2026-10-04):** `npm run qa` dark audit warns 11× `[contrast] design-tokens@1512-dark`
  "page: <section>" 1.38:1 (Global Colors … Typography Configuration); first seen after the 2026-10-04 Global Colors
  Dark-contrast sync, not from the Studio code view change that ran the gate. Check the classic token-page nav text in Dark.
- **P3 · Empty State guideline vs Studio (2026-10-04):** the Search guideline says `illustration={false}` "in narrow
  panels such as sidebars and pickers", but the user wants the Studio tool's empty states illustrated (done for Code,
  Layers, Pages, Assets). Decide: Studio-only exception, or update the guideline (`guidelines.source.mjs` Search + Empty
  State "Drop the illustration inside lists…"). Also: Assets "No components match" says "clear the search" but has no
  Clear search action (Pages has one).
- **P2 · DatePicker Date-Picker/Mobile composition (2026-10-04):** the mobile primitives are built (`device`); not built:
  the Bottom Sheet picker of Figma 9923:3576 (Heading + Close, Cancel / OK), Variant=Multiple's scrolling stacked months
  with one sticky weekday row (`.Primitives/Date-Picker` 9923:2323 Option 2, "Clear dates"), Footer-Actions 9923:2791
  (price + Primary), and a DateField that opens it on phones instead of the desktop popover.
- ~~**P3 · Flaky test (2026-10-04):** `tests/scale.test.tsx` › Rating size spellings fails now and then.~~ Done 2026-10-04:
  Rating previews stars on pointerenter and the test browser's pointer stayed where an earlier test left it; the scale
  test now renders inside `pointer-events: none` (static DOM compare). Full suite 3× green (489 tests).
- **P3 · Code Connect for Description List (blocked, 2026-10-04):** Figma answers "You need a Dev or Full seat on an
  Organization or Enterprise plan to use Code Connect" for this account. Once a seat is available: map
  `Description List` 14859:79180 (Layout → `layout`, Items slot → `items`) and `.Primitives/Description-List/Item`
  14859:78890 (Term → `term`, Value → `description`, Emphasis → `emphasis`, Action/Action Button → `action`) with
  `.figma.ts` templates (the repo has no figma.config.json yet).
- **P2 · Card Sub-Action Menu triggers in examples (2026-10-04):** a node `subAction` (a Menu) still uses IconButton
  flat **primary** ⋯, while Figma and the Card default are flat **Secondary** ⋮: card.tsx:172/585, badge.tsx:100/411,
  metric.tsx:159/532 (level only), appLayer/navigation.tsx:466/852. Switching trips `button/secondary-justified` (also
  in the code strings). Needs the user's call: exempt flat IconButtons from the rule, `zen-allow-secondary` per site, or
  a Card `subAction={{ label, items }}` that renders the Menu with the Figma trigger.
- **P3 · Card playground slot corners:** `.platform-slot` (radius Base 12px) inside a Small Card (16px, inset 16px) is
  not concentric ([rhythm] card@1512/390), new since the slot fills the card width (platform.css:817).
- **P2 · App Shell examples (checked 2026-10-03 after the List Item refactor; none caused by it):**
  - Home "Due this week" is a Box detached from a Card in Zen Studio (`zen-detached`), so its padding is a fixed
    Padding/XLarge (24px); at the mobile breakpoint the MetricCards above pad 20px (Card padding follows the
    breakpoint) and the list content sits 4px inside them (Studio app, Narrow window, Banner).
  - Phone app › Profile: the two Toggles in Notifications don't stretch, so their switches sit mid-block instead of at
    the right edge; the Account kicker (`Group`) is tone="light" while the Notifications kicker is tone="base"
    (kickers are Body/Small/Bold Base).
  - Notification rows (desktop Notifications page, phone Notifications) carry "New" but open nothing (static rows).
  - Phone Notifications: after the bell opens the screen, focus lands on Back and its tooltip covers the first row.
- **P3 · Accordion `contentWidth` follow-ups (2026-10-03, session 2dd655b9):** (1) a Content width control in the
  Accordion playground (Figma has the property since 2026-10-03); (2) the audit's [rhythm] concentric check measures
  insets inside scaled phones (accordion@390 reports 8 + 5 for 8 + 8).
- ~~**P2 · List Item on phones (designer decision, 2026-10-03):** interactive rows put their text at Padding/XLarge
  24px while phone page margins are 20px.~~ Done 2026-10-03: Figma List-Item gained Device=Desktop/Mobile (Mobile binds
  Margin-Comfortable, 20px); code pads Margin-Comfortable by breakpoint. Left: tablet Margin-Comfortable is 24px while
  Card/Modal padding is 20px, so tablet rows sit 4px inside a Card's content (Figma has no Tablet device).
- **P3 · List Item follow-ups (session "Component List Item refactor"):** EmptyError skeleton rows are static (0 / Gap/Medium
  16px) while the loaded rows are interactive (12px × 24px), so the list shifts when loading ends; a few static rows
  still carry Studio-written `selected={false}` (app-shell, action-bar, button); toggle.tsx "Show completed" snippet shows a
  Card while the JSX is a detached Box. Pre-existing NEW warnings seen in the gate, not from the list change: tooltip@390
  inline link targets (Exact time, Long file names), top-navigation/input "Choose a …" placeholder contrast 1.92:1,
  accordion@390 concentric corner, button "Chi Tran" styled Heading/4 without a heading + a 2px Stack gap (Hand off when
  ready), templates rhythm/outline-siblings.

The user's rule since 2026-09-29 (also in `AGENTS.md`, "Scope lock"):
- **Studio multi-select follow-ups (2026-10-03, session "Chọn nhiều element vào container"):**
  - P3 · Marquee (drag) selection on the canvas; Shift+click in Layers toggles like ⌘ instead of Figma's range select.
  - P3 · Delete / ⌘D / Move on a multi-selection (now one layer only, with a status line) and mixed-value property editing.
  - P3 · Escape on a multi-selection selects the primary's parent; Figma selects the layers' common parent.
  - P3 · Wrap's snippet sync needs the example's `code:` to show the same region; most example snippets differ ("Example code not updated").
- **Studio nested booleans follow-ups (2026-10-03, session "Boolean lồng nhau trong Studio"):**
  - P3 · Props inherited from another Zen props type are not listed (build-api lists own props only): AvatarStack extends AvatarProps (no status/focus), BadgeCounter extends BadgeProps (no leadingIcon), MetricCard, Skeleton*; `propSchema.ts` only adds inherited HTML booleans.
  - P3 · Nested instances show booleans only; Figma also exposes a nested instance's variants and text — ask before widening.
  - ~~P3 · A nested element passed through a variable (`leading={avatar}`) is not listed~~ done 2026-10-05 (fiber ownership).
- **Studio nested booleans, after the 2026-10-05 fix (session "Nested boolean không hoạt động"):**
  - P2 · Figma-model gaps (fits builder WP-E): Input Label {Optional, Tooltip-Icon, Action} / Help-Text {Icon,
    Character-Limitation} groups; presence switches (Figma boolean = prop present) for components other than
    TopNavigation (ListItem Leading/Trailing, Button icons, EmptyState CTA, InlineMessage/Toast Action/Close, Toggle
    Subtext…); props typed `boolean | IconName | ReactNode` get the icon editor so true/false can't be switched (Dialog
    icon, AlertBanner leading, characterLimit); handler-backed booleans (onClose) are hidden.
  - P2 · `scripts/build-api.mjs` drops intersection types: TextAreaField and NumberField list no label/helpText/label*
    props, so Studio shows none of them.
  - P3 · Server `origin`: bindingOf ignores for-of/for-in/catch bindings; custom hooks returning state read as
    bound-value (a switch could fix their value); loop-bound `rows` is the innermost loop's length.
  - P3 · setProp after an attribute with a trailing `// comment` moves the comment; removeProp then leaves it on its own line.
  - P3 · Control-Bar switch ON only opens the slot picker when the saved file has no control bar (no write until a pick).
  - P3 · Non-component exports left in component modules (Toolbar `revealSection`, ShortcutsDialog `openShortcuts`,
    ZoomControls `modKey`): an edit to those modules cascades; FramePanel.tsx and frames.ts could import
    board/presentFrame directly so Present.tsx can drop its re-export.
  - P3 · A bound switch reads `false` for one render until DesignPanel's live props arrive.
  - P2 · Frame toolbar Discard (`tools/studio/frame-scope.mjs` frameRangesOf) misses edits whose JSX lives outside the
    frame's own JSX (a column const, a helper, a local component, hrDemo/HrShell): the frame shows no change and no
    Discard; only the toolbar's file-level Discard removes them. Nested groups now expose such edits ("Written in …").
  - P3 · Presence switch off → on in a playground (resetSlot refused there) re-adds the prop at the end of the tag, so a
    reordered draft remains (PlatformMobilePlaygrounds.tsx title).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1):** the three lines removed; Narrow window › Open navigation opens the drawer (Enter and click). Was: P2 · `src/platform/examples/pages/app-shell.tsx:288-291` (untracked; saved 01:38 on 2026-10-05, not by this session)
    has `defaultSidebarCollapsed={false}` `navOpen={false}` `defaultNavOpen` on the StudioApp AppShell: `navOpen={false}`
    locks the drawer, so "Narrow window" › "Open navigation" does nothing (`npm run qa -- --all` behaviour ✗ [apg]).
    Needs the user's call (remove the three lines).
  - P2 · Any Studio write to an example page remounts its examples (the page's `examples` export is not a Fast Refresh
    boundary): a view reached by interaction (Conversation › Back → Messages) jumps back to its first screen and the
    selected nested element disappears. The appLayer fix (`keepOnHotUpdate`) shows the way for example pages.
  - P3 · `origin` cannot see state that reaches a prop through a render-function parameter (Table cell
    `checked={feature.on}` with rows from useState): it reads bound-value, so a fixed value is offered and locks the toggle.
  - P3 · The "a fixed value applies to all N rows" hint counts every rendered instance (5 frames for
    PlatformChatHeader), not only .map rows.
  - P3 · Frame Save/Discard: `frameLocs` reads DOM data-zen-src only, which Zen components (TopNavigation, Avatar) do
    not forward, so their edits count as "outside" the frame (same fix area as the frame Discard item above).
  - P3 · (observed in `npm run qa`, file unchanged since 2026-10-04) list-item › Pending invites › "Revoke invite for
    an.vu@…" reported as a dead click.
  - P3 · While a nested instance is selected, hover still outlines the outer layer that covers it (ListItem's click target).
  - ~~P2 · Enum/text props under a spread stay read-only~~ done 2026-10-04 (`ownValueOf`, user: "có").
  - ~~P2 · Studio edits to `PlatformExamples.tsx` reload the whole page~~ done 2026-10-04 (dead `isPlatformComponentPage` removed).
  - P3 · (2026-10-04) Canvas resize and spacing handles still treat any prop not written on an element with a spread as read-only (`select/resize.ts`, `select/spacing.ts` call `valueOf` without live props); the inspector unlocks the ones the spread does not feed. Only 1 layout primitive in platform/templates has a spread today.
  - P3 · (2026-10-04, pre-existing) `PlatformExamples.tsx:728` Sidebar playground workspace Avatar: white initials on Solid green (usage-guard `avatar/solid-initials-contrast`).
- **Studio Design tab: remaining items (2026-10-03; session "Cloud migration feasibility"; spec docs/research/studio-inspector-redesign-2026-10-03.md):**
  - **Approved phases still to do:**
    - ~~Phase 2: ScaleField~~ ✅ 2026-10-05 (Studio builder session, `inspector/controls/ScaleField.tsx`, E2E I-15); left
      for later: typeahead "14" → nearest token, scrub (Phase 7).
    - ~~Phase 3 Flow/Padding, Phase 4 Alignment v2, Phase 6 Grid columns~~ ✅ 2026-10-06 (Studio builder session,
      `inspector/LayoutSection.tsx`, E2E L-01…L-08).
    - Phase 7: polish, Appearance surface/border.
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row ST-06):** **P2 · Canvas right-click menu still says "Detach component"** for non-detachable types. It should use
    isDetachableType and the label "Detach instance" (shell/CanvasMenu.tsx, Platform session).
  - **P3 · Two "Children" labels:** the Size group's fillChildren row and the Slots section title both say
    "Children" on Stack/Grid/Box.
  - **P3 · Public exports read as "Local component":** PopoverBulkAction*, ZenPortal are missing from
    api.generated.json.
  - **P3 · Missing name tooltip:** a truncated node name in the header has no full-name tooltip.
  - **P3 · No runner for detachable.selftest.mjs:** no test runner includes it.
  - **P3 · Unchecked dark / Comfortable / 280px:** no screenshot pass of the inspector in dark mode, Comfortable
    density or at 280px.
  - **P3 · Small Detach button:** the option-B Detach is `sm` full width and carries `zen-allow-small-full-width`.
    Decide whether to keep it or use md.
- **Full-width table pages follow-ups (2026-10-03; session "Cloud migration feasibility"; need the user's OK):**
  - **Done 2026-10-03 · examples/pages/app-shell.tsx:** Page() helper takes `maxWidth`; Projects, Invoices, People, Tasks
    and Files use "full" (+4 snippets); Home and Notifications keep lg. (The Studio draft that held it was discarded.)
  - **P3 · Harness rule:** flag a bare `<Container>` whose subtree holds a non-Card Table (new rule = new scope).
  - **P3 · HR · Home** is the only HR page still capped at lg; moving Home → a table page shifts the content edge above
    ~1500px. Decide whether app shells use one width.
  - **P3 · Wide side content:** tabs › Project sections Overview DescriptionList card, My leaves Next leave card and
    Empty/Error InlineMessage now span up to ~2250px; layout › Main column and aside: the 1/3 aside grows too (fixed
    track option). Cap them if they read too wide.
  - **P3 · Visually Hidden playground** table: the 520px stage + 64px star column cuts off the Archive column.
  - **P3 · HrPublicHolidayTemplate** section heading is `<Heading level={2}>` without textStyle Heading/4.

- A session does only the task the user approved.
- Nothing new starts without the user's explicit approval: no new session or task chip, no new rule or check, no fix
  found along the way. Another session cannot approve scope on the user's behalf.
- Every bug found and every follow-up goes here as one line, with a priority and a pointer, and is mentioned in the
  session's report. Nobody fixes it in passing.
- At the end of a working block this list is summarised as a **proposal for the next block**. The user approves what
  gets done; the approved items run as one planned batch, with fewer sessions that each own a set of files.
- Items that need a decision from the user or the designer stay under "Open items"; this list holds work.

- **From Zen Studio, the canvas tool (2026-10-02; session "Platform UI/UX redesign với canvas editor"):**
  - ~~**P2 · Classic full screen loses focus layout:**~~ Fixed 2026-10-02 by "Disable input và search từ Figma"
    (`:not([data-fullscreen="true"])`). `src/platform/platform.css` ~line 492, `.pe-card:is(:focus-within, …)`
    (specificity 0,3,0) beats `.pe-card[data-fullscreen="true"]` (0,2,0): in the classic docs a screen example's full
    screen falls back to an inline card as soon as focus enters it, so the first click on More actions / New task
    misses. The Studio's Present has its own higher-specificity rule. Fix: `:not([data-fullscreen="true"])` on the
    focus-raise rule.
  - **P3 · Studio: 0 spacing has no canvas area:** a gap/padding of `none` draws no hit area, so it is set from the
    Inspector's Layout section only (`select/spacing.ts`).
  - **P3 · Studio: outlines over scroll-clipped elements:** the selection outline and spacing tints draw over parts an
    ancestor scroll box clips (e.g. alert-banner.tsx:390 Box after Shift+2); clip to the scroll ancestor.
  - ~~**P3 · Studio: dashed owner outline warning**~~ done 2026-10-03 (zen-allow-dashed-color note).
  - **P3 · Studio detach follow-ups:** row index assumes the `.map` result renders unchanged (`.slice/.reverse/[h, ...map]`
    would pick another row; no repo case); the phrasing check for Badge/Tag looks at the nearest JSX parent only; the
    inspector status shows the snippet-not-synced note for detach only.
  - **P3 · HMR cycle in the app layer:** editing `src/platform/appLayer/*` or `src/templates/*` throws
    `Cannot access 'pages' before initialization` (PlatformAppLayer ↔ appLayer ↔ PlatformExamples cycle) and Vite
    reloads the page. The Studio survives it (state in sessionStorage) but a Studio edit there costs a full reload.
  - **P3 · Studio drafts, live push:** other browsers learn about a draft or a stale disk by the 10 s poll / focus;
    a Vite ws event (`zen-studio:drafts`) from the plugin would show it at once (verify 2026-10-03).
  - **P3 · Studio drafts and the standalone audit tools:** only `npm run qa` warns that 5173 renders unsaved drafts;
    `platform:audit`, `platform:shoot` and `visual-diff` run on 5173 without saying so (tools/platform-audit/*).
  - **P3 · Studio toolbar under ~900px:** the drafts group (Unsaved · Save all) leaves no room for the breadcrumb.
  - **P3 · New gate warnings seen 2026-10-03 (not from the phone centring, owner to triage):** placeholder contrast
    1.92:1 on "Choose a reviewer/slot" (top-navigation Modal screen) and "Choose a client" (input Create a project),
    `button.zen-input-label__tooltip` 12×12 target (input Label parts); report `.qa/reports/2026-10-03T04-58-39-47da80c2.md`.
  - **P3 · PlatformPhone scale feedback (latent):** `PlatformPhone.tsx` scales from its immediate parent's width minus
    32 and falls back to scale 1 when that room is ≤ 0, so a host sized by its content (grid/inline box around the phone)
    loops. Surfaced by the phone centring (2026-10-03, Chat playground; fixed there with a definite width). Harden: keep
    the last scale instead of 1, or measure a host whose width does not depend on the phone.
  - **P3 · Mobile templates take a full row:** `appLayer/templates.tsx` sets `wide: true` for every template, so the
    two phone templates (Mobile list · Orders, Mobile detail · Order) sit centred in a 1064px grey stage; `wide:
    !template.mobile` would put them two per row like the other phone examples (needs the user's OK).
  - **P3 · Phone on fractional pixels:** the fit box is `spec.width * scale` (e.g. 323.02px), so centred phones land on
    half pixels (1px gap differences, anti-aliasing in element screenshots); round the fit size in PlatformPhone.
  - ~~**P2 · Detach ListItem after the ListItem refactor (2026-10-03, session "Component List Item refactor"):**
    `tools/studio/detach.mjs` ListItem.build + listInset() still emit Padding/Small × the list inset.~~ Done 2026-10-03
    (session "Platform UI/UX redesign với canvas editor"): listRowBox; 156/156 rendered static rows match the DOM.
  - **P2 · Detach ListItem: default inset is now Margin/Comfortable (2026-10-03, session "Component List Item refactor",
    List-Item Device=Desktop|Mobile):** interactive rows pad Small × `var(--zen-margin-comfortable)` (24px desktop/tablet,
    20px mobile), not Padding/XLarge. `listRowBox` (tools/studio/detach.mjs) still falls back to paddingX xl with no note;
    the Studio measures the row, so detached output is right per frame (phone frame → lg), but the fallback and the
    approximation should say the default inset follows the breakpoint (like inset="comfortable"). Needs the user's OK.
  - **P3 · Detach follow-ups seen while verifying the ListItem recipe (2026-10-03):** (a) a row whose `onClick={onClick}`
    comes from a prop is refused as "interactive" although it renders static (HrHomeTemplate leaveRow); reword the
    refusal for a bare identifier. (b) Rows in portalled overlays (Dialog, modal SidePanel, AppShell aside as a modal)
    sit in `.studio-portal-root` outside the frames, so the canvas and Layers cannot select them. (c) The HMR after a
    detach resets examples with interaction state, so "Selection lost after the file changed" replaces the outcome and
    its Approximated notes. (d) Detaching or discarding in a template logs `ReferenceError: Cannot access 'pages' before
    initialization` (PlatformAppLayer.tsx:24 ↔ appLayer/templates.tsx import order). (e) `<Zen.ListItem>` (namespace
    JSX) is not found by detach ("Expected <ListItem>"). (f) 55 static ListItems need multi-step state to render and
    were checked from source only.
  - **P3 · Structural audit warnings new on 2026-10-03 (not from the colour or Detach changes; owners to triage):**
    ai-chat "Assistant on a phone" has no h1 (outline starts at h2 "What do you need, Alex?"); button "Approve on a
    phone" styles "Chi Tran" heading-4 without a Heading, and "Hand off when ready" has a 2px Stack gap (not a ladder
    step); accordion@390 "Mobile order summary" corner 16px vs trigger 8px + 5px inset; tooltip@390 "Exact time" and
    "Long file names" links are 16–20px tall targets. Report `.qa/reports/2026-10-03T15-48-37-47da80c2.md`.
  - **P3 · action-bar 390 contact sheet:** the sticky "No changes to save yet · Undo changes · Save changes" bar of
    Unsaved changes is drawn over the neighbouring cells (Two choices on a phone, Running total) in the shot.
  - **P3 · Inspector: List `inset` is @deprecated** — `inspector/propSchema.ts` still labels it "Row inset" (inspector
    owner: hide it or mark it deprecated).
  - **P3 · Board follow-ups (2026-10-03, stable layout):** a width override past the section edge overlaps the Docs
    frame and is left out of the section surface and zoom-to-fit (extend the surface / fitRect to the rendered extent
    without changing the grid track); "ResizeObserver loop completed" still fires at zoom ≤ 0.5 when frame labels crowd
    (pre-existing: defer FrameChrome's RO-path style writes to the next frame); at 1024px a toolbar inside the frame
    top opens its width menu upward off the window; after Clear contents → Reset slot → Undo ×2 on card example:5 the
    selection layer drops the selection; GET /element 404s for removed children after a slot Clear.
  - **P3 · Resize follow-ups (2026-10-03):** a fillChildren column with `height="fill"` whose own parent gives it no
    height collapses its children to 0 (needs a parent-aware rule); a column/row with only a minHeight keeps content
    heights (decide Figma parity); a px-capped component (number Chip, CSS max-width 40px) still offers width handles
    that only size its wrap Stack; after a wrapper edit, a child on the same source line keeps its old column and the
    selection drops ~2 s later; a `.map` drag previews only the pressed instance; a Hug double-click on an axis that is
    already Hug still sends one no-op edit; a dropdown Chip hides both axes (decide whether width stays).
  - **P3 · Studio wrap and child contracts:** the `wrap` op (resize of a component without a size prop) does not check
    parent/child contracts: wrapping a ListItem in List, a Tab in Tabs, menu/select items or Table parts may break the
    parent's semantics or ARIA (it already refuses table/svg/paragraph nesting). The wrap selftest runs no
    style-guard/usage-guard/tsc on its outputs (detach's does).
  - **P3 · Studio setProp/removeProp on a multi-line self-closing tag:** setting then removing a prop (e.g. `fullWidth`
    on card.tsx's Segmented) leaves `/>` on its own line instead of the original text, so the draft no longer equals the
    disk until it is discarded (found by the resize builder, 2026-10-03).
  - **P3 · Studio selftest temp files in src/:** `tools/studio/selftest.mjs` writes detach tsc samples under
    `src/platform/examples/drafts/`, so a `tsc` run in parallel fails and the 5173 watcher sees them; write them to a temp
    dir with its own tsconfig.
  - **P3 · Frame Save at mid zoom:** on hover a drafted frame adds its frame tools only when the whole toolbar fits
    above it; otherwise the tools need a selected frame (by design, so Save never jumps; revisit if it confuses).

- **From the AI Chat Field / Chat-Control update (2026-10-02; session "Cloud migration feasibility"):**
  - ~~**P2 · Token sync:** the live Figma Component Theme collection has 8 modes; the repo has 6 (no Neutral - S5, S6).~~
    Done 2026-10-02 (session "Platform UI/UX redesign với canvas editor"): Neutral - S5, S6, S7 synced from Component Theme.json.
  - **P3 · AiChatField focus ring (decision):** focus adds a 1px Border/Neutral/Subtle ring, which in S4 equals the new
    resting stroke, so only the caret changes; ChatComposer uses the standard Input ring (user-approved 2026-10-02).
    Option: give AiChatField (all three styles) the same ring. `ai-chat.css` focus-within rules.
  - **Done 2026-10-02 (user: "sửa lỗi đi") · P3 · Intermittent smoke finding on chat:** a race in the audit's smoke
    layer check, not a UI bug: it sampled a popover rect read before the mouse moved, while chat demo timers re-pinned a
    thread and the portalled popover moved with its anchor. The check now samples the popover's live rect
    (`tools/platform-audit/audit.mjs`). Verified: 6 gate-flag runs clean under load, 3 genuine-overlap CSS variants still
    flagged, all 61 pages × 1512/390 old vs new: no real overlap lost, none added. It also ends the templates@390
    "HR · Home #1" flake below (old check: 5/5, new: 0/5).
    - **Done 2026-10-02 (user: "xử lý hết lần lượt") · P3 · Smoke hardening:** pointer spot kept inside the viewport,
      on-screen part sampled, 0×0/closed popovers skipped and counted in `report.smokeStats` (one summary line,
      information only), hover-revealed toolbar buttons clicked with the pointer on their row.
  - **Done 2026-10-02 (user: "xử lý hết lần lượt") · found while fixing it:**
    - **P2 · Reaction-Bar clipped at 390:** `useAnchoredPosition` now shifts a surface that fits on neither edge of
      its anchor into the viewport (`clampAnchoredLeft`, 8px margin); surfaces that fit are placed as before.
    - **P3 · ChatThread re-pins after a programmatic scroll:** the reader's input/position are refs, focus counts as
      input, and an input while the thread is away from its end unpins it (tests: chat-thread-picker.test.tsx).
    - **P3 · Docs page jumps at 390:** `.platform-phone { overflow-anchor: none }` (measured −38px → 0).
    - **P3 · React picker refocuses on every render:** focuses once per opening (Popover merges refs inline).
    - **P3 · Smoke coverage of chat hover toolbars:** covered by the smoke hardening above.
    - **Not a bug · desktop chat windows open at scrollTop 0:** every thread opens at its end on load (13/13 at
      1512 and 390); the case seen mid-smoke was the re-pin above.
  - **Found while verifying those fixes (2026-10-02; need the user's OK):**
    - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** useMenuPlacement shifts a menu that fits on neither edge into the bounds (margin each side; test in input-popups). Was: ~~P2 · Menu cut off at 390:~~ Menu has its own `useMenuPlacement` (not the clamp): menu › Project actions #2 More
      opens at x −51 on a 390px window, labels cut ("opy link"). Same fix as `clampAnchoredLeft`.
    - **P3 · Menus at the viewport edge:** templates@390 HR cards' Settings menus open at x 2 (inside the 8px margin).
    - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** Popover autoFocus focuses with preventScroll (Switch workspace: scrollY 3316 → 3316, list on screen). Was: ~~P2 · Sidebar workspace switcher jumps the page:~~ sidebar › Switch workspace (and templates › Empty and error
      states #2) scroll the page 3250 → 602 and open the listbox off-screen (focus set before it is positioned).
    - **P3 · HR · Home Settings menu closes in the full smoke flow** (stays open alone): state left by an earlier step
      (the "Open navigation" drawer?); the smoke never samples it.
    - **P3 · Popover shift → edge hand-over jumps:** a surface shifted into view (fits on neither edge) jumps to its
      edge-aligned spot once the anchor slides far enough for an edge to fit (64–96px seen while resizing 360→424).
      Inherent to shift-then-align; a continuous hand-over would clamp from the edge the anchor moves toward.
    - **P3 · useAnchoredPosition in scaled frames:** offsets are measured in screen px but written as CSS px, so in a
      transform-scaled docs phone a surface sits slightly off its anchor (pre-existing; the clamp now uses the scale).

- **Template rebuild follow-ups (2026-10-01; brief docs/research/template-rebuild-brief-2026-09-30.md):**
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4):** DatePicker re-opens on the applied value's month (else today's; useLayoutEffect on open; test in input-popups); the focus-after-failed-submit half was already fixed (DateField opens on focus only after Tab). Was: ~~P2 · DateField:~~ the calendar opens on today's month even when the field holds a typed date in another month;
    after a failed ModalForm submit, focus lands on the first invalid DateField and its calendar covers the dialog's
    title and first fields (HR Public holidays, My leaves).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1), already fixed in Toast.tsx (the action dismisses unless `keepOpen`):** ~~P2 · Toast:~~ a Toast stays visible after its Undo is pressed (HR Expense overview, Leave types).
  - **P3 · Table:** rows of a table without onRowClick still show the hover fill (Team budgets); the
    `table/title-heading-4` rule wants Heading/4 for a Card title that heads a table, while cards use
    Heading/Subheading (Detail page used one zen-allow).
  - **P3 · HrShell:** the Approvals counter in the module sidebar is static data; it doesn't follow approvals made on
    the page.
  - **P2 · ListItem:** on a clickable row the trailing slot (a Badge) sits outside the row's button, so tapping it does
    nothing. (Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 3): the `aria-pressed` half — a button row now sets `aria-current="true"` when selected, nothing otherwise.)
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4):** the trigger is `aria-labelledby="<label> <trigger>"` ("Role Editor"; an unlabelled one reads its aria-label through a hidden span); test in input-popups. Was: ~~P2 · SelectField:~~ the trigger button's accessible name is only its value; the label points at the hidden native
    select.
  - **P2 · SidePanel in the docs frame:** at ~1160px the notifications panel of Admin list / Settings opens as a modal
    with its header cut off at the top.
  - **P3 · Phone templates:** their toasts appear at the bottom of the browser window, outside the phone frame (the
    docs ToastStack, not the template).
  - **P3 · AiChatBlock:** its greeting is an h2 in Heading/1, so a page that also has Heading/4 section h2s trips
    `outline-siblings` (HR · Home).
- **HR template audit follow-ups (2026-09-30, batch 6b; log: session-log-2026-09-30.md "Batch 6b"):**
  - ~~P1 · Sidebar collapsed Basic width~~ — done 2026-09-30 (user: "Có"): the collapsed panel HUGs its logo like
    Figma 4081:15233 (84 with the 28px logo; HR rail 88 = 8 + 72, main at 80).
  - **Waiting for design (user 2026-09-30: "Chờ thiết kế") · All Tasks Calendar / Gantt tabs:** Figma's Tab-Bar has
    List · Kanban · Calendar · Gantt but only List and Kanban frames exist; the two panels stay as they are until the
    designer draws them.
  - **Checkbox column closed 2026-10-05 (user: "Cột checkbox như code là cũng ổn" — keep 48, no drag handle).** **P2 · Table (All Tasks):** checkbox column 48 vs Figma 64 with a hover drag handle; no add-row slot (Leave Types,
    Public Holiday, Tasks build "Add New" as a data row / Stack); fill column still wraps in a narrow preview.
  - **P2 · Designer questions (Figma data kept literally):** Metric-Trend Medium badge + 24px gaps and a down arrow on
    Positive only as an instance override (Total Expenses) — add a Size to the component?; Remaining Budget
    "Bar-Quota" is raw frames (Violet on Neutral Subtle, legend dot Neutral) — make it a ProgressBar (needs Violet)?;
    Leave Types header "Type" twice, row 3 "Annual Leave" 🥵 Unpaid; Pending $229.00 vs rows $112.50; "$5.4k" vs
    "$5.4K"; Expenses/Workbench "Configurations" drawn collapsed with no children; "Hight" typo; Figma flag names
    "Uzbekista N", "andorra", "Marshall Island", "Sao Tome and Prince".
  - **P2 · Component gaps from the Tasks frames:** Box has no Support/Subtle colour surfaces (Kanban columns); Card
    Spacing Small 16/16 vs Figma ticket 12/12; ModalForm Big 960 vs 800, no action icon (Attach File), TextAreaField
    fixed 112 vs 240; PageHeader title-to-chevron gap 12 vs 8; ProgressCircle Done shows a check vs a full disc; flag
    text tone Base vs Light.
  - **P2 · Home metric row:** Figma is a masked, fading row of fixed 356px cards that runs past the edge (no carousel /
    fade primitive in code; 4 equal columns now). Dock Icon sits 28px left of Figma because Card reserves the
    Sub-Action padding.
  - **P3 · Expense Overviews at 390:** the hugging range Segmented scrolls sideways (phone rule: single-choice Chips).
  - **P2 · Narrow tables without fixed widths (pre-existing):** when a Table's min-content is wider than its box it
    both scrolls and crushes text columns to min-content (Sidebar "Projects flyout" at 390: "Token rename for Selected"
    on 4 lines, table 345 in 246). Proposal: a readable minimum for text columns (as the fixed-column tables now have,
    `--zen-table-fill-min-width`), in line with the research overflow matrix (docs/research/ui-patterns-and-rules-2026-09-30.md B1 L11–L13).
  - **Closed (user, 2026-10-05: "chữ trắng trên Avatar nền Solid: Giữ nguyên hết") — Figma's solid colours stay; the harness keeps warning.** ~~P2 · Solid Avatar initials contrast (designer question):~~ white initials on Solid Green / Orange / Teal / Accent /
    Cyan avatars measure 2.6–2.9:1 (gate warnings on avatar, list-item, sidebar, bottom-sheet playground, HR All Tasks
    Space "P"). Figma uses Content/On-Colors on these fills; needs a colour decision, not an example fix.
  - **Done 2026-10-05 (session 28eea406):** a 390 pass of all 61 pages found only the Input label tooltip (now a 24px
    hit area) and lone Tooltip-page links (exempt under WCAG 2.5.8's spacing exception, which the audits now apply); the
    chat items were gone since the 10-02 audit fix. ~~P3 · Gate target warnings (component level, pre-existing):~~ chat
    reactions 18×15, chat call action 129×20, input label tooltip 12×12 at 390.
- **Review batch 5 follow-ups (2026-09-30, items 13–17; log: session-log-2026-09-30.md "Review batch 5"):**
  - **P2 · DateField typed dates:** `onDateChange` fires only when a day is picked in the calendar, not for a typed
    MM/DD/YYYY (`Input.tsx` DateField); Side Panel › Submit leave parses `onValueChange` instead.
  - **Done 2026-10-05 (user: "Đúng"):** Sidebar item `theme` defaults to neutral at every level (Figma Menu-Item Theme default Neutral); `theme: "accent"` keeps the pink. ~~P2 · Sidebar selected child item~~ is accent-subtle (pink); Figma HR-Platform shows it neutral grey (Time Off ›
    Configurations › Leave Types).
  - **P2 · AppShell top bar at 390:** the actions wrap under the menu button (HR templates, App Shell › HR workspace).
  - **Done, verified 2026-10-05 (user: "Thử"):** MetricWidget/MetricCard `variant="title-highlight"` (Figma 7523:507049) exists and HR Home, My Leaves, My Expenses, Expense Overview and Public Holidays use it. ~~P2 · Metric has no Title-Highlight variant~~ (title on top, big number, DockIcon): HR Home, My Leaves and Expense
    Overviews compose it from Card + Heading + DockIcon.
  - **P2 · Thin examples sweep (item 13 rest):** Dialog "Form · 1-3 with preview" and ModalForm "Basic" still open from
    a one-line row; scan other overlay/trigger examples the same way (script in the session log).
  - **P3 · Sidebar with a custom `brand`** loses its own collapse control (flat canvas without a top bar must use
    logo/productName).
  - **P3 · Components seen by the template agents:** emoji DockIcon XSmall draws a 12px glyph (Figma 28px); ProgressCircle
    has no decorative mode (status read twice); ModalForm `header={false}` has no accessible name; Box has no tinted
    surfaces (Kanban column colours); Card content does not fill a stretched card; AiChatBlock greeting is an h2 (Home
    adds a hidden h1).
  - **P3 · Gate warnings left from batch 5:** coverage — App Shell "states", Visually Hidden "edge cases", Page Header
    "states / edge cases / mobile" (Action Bar keyboard/a11y was already open); rhythm — HR templates and App Shell › HR
    workspace use 8 text styles (Figma pages); the Templates page runs past the 90s behaviour budget; deadclick on
    App Shell › Flat canvas "Overviews" is not reproducible by a direct click (it switches the page) — likely the
    probe clicking after the collapse button; Dialog "Form · Half-Half" styles "Workspace name" as heading-4 without a
    heading (pre-existing); Action Bar at 390 (sheet of the shared content.tsx): "Edit page with a sticky bar"
    truncates Undo changes / Save changes and "Cart with a total" truncates the print names (pre-existing).
- **Typography outline / content hierarchy (2026-09-29):** the user approved every recommendation ("theo đề xuất");
  implemented the same day (session log, "Typography outline"). Follow-ups:
  - **Done 2026-09-30:** the Bottom Navigation and Templates screens have their h1 (Form "Mobile checkout" was already
    fixed); outline-* warnings run by default with their baseline seeded, `rhythm` re-seeded; the gate maps
    `PlatformPhone.tsx`, `PlatformTypographyHierarchy.tsx` and `PlatformMobileShowcases.tsx` helpers to their pages.
    Log: `session-log-2026-09-30.md`.
  - **P2 · Screens still without an h1 (baselined debt, found by the default-on outline check):** Chat "Desktop
    messenger", "Desktop support (Business)", "Desktop group media", "Reply to any message" (Messenger starts at h3
    "Messages"); Side Panel "Docked inspector". (Sidebar shells fixed 2026-09-30: PageHeader h1 + h2 sections.)
  - **Done 2026-10-01 (user chose option A):** EmptyState `compactTitle` gives a Card you title yourself the ChartCard
    title style (Body/Extra/Bold).
  - **P3 · Typography "Emphasis inside a level":** clicking a row that is already read does nothing (behaviour
    deadclick ⚠); let the row toggle read/unread or say so in the caption.
  - **P3:** the docs platform's own outline on the Typography page (h2 Heading/3 sections, example h1s under h3 card
    titles); ExampleCard should expose `data-screen`; a durable selftest for the quality/outline runtime checks; the
    redundant `ZenProvider typography="mobile"` wrappers around PlatformPhone; the Typography topbar chip no longer
    reaches phone frames (they default to Mobile); TopNavigation stories for the heading behaviour; the Text
    "Headings" story could label each level's default style. Review:
  `docs/context/typography-hierarchy-review-2026-09-29.md` (8 decisions, ~30 verdicts; the phone child screen has no
  h1, h2 renders in 6 styles, the enforcement misses missing h1s and errors on valid group headers).
- **Closed (user, 2026-10-05: "Motion: Đóng") — the P2 motion ideas below stay as ideas, not planned work.** **Motion (2026-10-01):** P1 is done (tokens in the pipeline, reduced motion keeps fades, Popover/Menu/tooltip
  enter and exit, raw values swept, motion rules). The user's decisions: reduced motion = movement off (1A), code-owned
  tokens + Figma Motion collection (2A), productive only, no spring (3A), colour-only press feedback (4A), the Segmented
  Primary label flips at the midpoint (5A). Review: `docs/context/motion-transitions-review-2026-10-01.md`. Next:
  - **P2:** sliding Tabs indicator and Segmented thumb (label colour flips mid-slide); Checkbox/Radio/Toggle
    micro-motion; usePresence driven by animationend (then reduced motion can fade out too); Sidebar collapse with
    transform instead of width; Accordion content fade; Progress with scaleX. Each needs the full gate.
  - **P3:** shared add/remove motion for list rows; Toast stacking (design decision; enter/exit, timers and the shared
    layer fixed 2026-10-04, a collapsed "pile" like Sonner is still open); View Transitions on the platform.
- **Process (2026-09-29):** batch A of `docs/context/process-audit-2026-09-29.md` is done (tiers in AGENTS.md §C,
  consumer-scoped QA, ledger/Stop-hook fixes, scoped static gates, Scope-lock wording, a `use_figma`-safe extractor),
  then a token fast path, label-key scoping and a narrower tier L (`--all` only for every-page changes; library
  components like AppShell stay scoped). Token sync: `skills/zen-token-sync` (the claude.ai `zen-ds-token-sync` skill is
  out of date: point it at the repo skill).
  The user chose to work with it for a few days; batches B (parallel gate), C (Figma kit, suites, live tokens) and
  D (lighter docs) wait here until needed. Batch A follow-ups:
  - **P2 · Seed the contrast/targets baseline:** `node tools/platform-audit/audit.mjs --quality --viewports=1512,390
    --baseline-update=contrast,targets` over all pages, plus a `--dark` pass (≈20 min). Until then those known
    warnings show as new.
  - **P2 · Exact sheet review:** add `Read` to the PostToolUse matcher in `Zen-CodeBase/.claude/settings.json` so a
    sheet's hash is saved when it is opened (needs the user's OK: settings), and give each run its own sheet folder
    (B3), since `.platform-shots/` is shared by sessions.
  - **P2 · Token builds run through Bash** (`npm run tokens:build`) are not recorded by post-edit, so the Stop hook does
    not ask for QA after a token change made only in `tokens/source`.
  - **P2 · Live Figma drift found by `__HASHES`:** 9 of 18 sets in `checkbox-radio-chip-popover.json` (Chip/Normal,
    Chip/Advanced, Chip/Number-Only, Popover label/item primitives …) no longer hash-match; check whether this is a
    real change or only the frame's variable mode (captures are not mode-independent until kit C1).
  - **P3 · Gate details:** baseline JSON notes and their generators (`check-styles.mjs:353`, `audit.mjs:483`) still say
    "fix these when you touch them" (Scope lock wording); token scope follows importers one level (a Button token →
    23 pages); token scope reads CSS only, not inline `var()` in TSX; `foundations.css` maps to the representative set;
    a reused pid can keep a stale "running" marker alive for up to 6 h; `--only` runs that each render part of an edit's pages never clear it (one run must cover them all, so plain `npm run qa` is simpler); edits made by scripts through Bash are often not recorded; mixed stale guidelines (own + another
    session's) fail instead of rebuilding.
- **Done 2026-10-05 (user: "Xử nốt"):** the parallel gate (static steps side by side, ZEN_QA_SHARDS audits) was already in; the last part is `npm run qa -- --isolated` (tools/qa/isolated-server.mjs: private Vite on 5200+, own cache, no watcher/HMR, no Studio drafts; also the fallback when the shared server is down). Was: ~~P1 · Faster QA.~~ Owner: "Quy trình kiểm tra Component build". On 28/9, 32 QA runs audited 419 pages one at a
  time, about 5 hours of browser time on an 11-core Mac.
  - Add `--workers=N` to `audit.mjs`, `behaviour.mjs` and `shoot.mjs`: one browser with N contexts working from a page
    queue.
  - Run the static gates concurrently in `tools/qa/run.mjs`.
  - Optionally audit a `vite build` preview on its own port, so other sessions' HMR never breaks a run.
  - Expected: 3–4× faster; `qa --all` from ~45 to ~12–15 min.
  - **Done 2026-09-30 (was P1, approved by the user):** concurrent contract suites overwrote the shared
    `tools/figma-contract/.out/harness.js` (18 of 23 failed on a token change). Each run now builds in its own folder,
    the gate runs 4 suites at a time (`ZEN_QA_SUITES`, 1 under `--serial`), and a token sync takes the fast path without
    `--files`. Log: `session-log-2026-09-30.md`.
- **Done 2026-10-05 (user: "Xử nốt"):** the post-edit hook warns "Shared file: …" when a session edits a file another session's ledger touched in the last 30 min (lib.recentOtherEdits, once per file per half hour); AGENTS.md "Working alongside other sessions" now states file areas, worktrees, one commit place and --isolated. Was: ~~P1 · Session setup.~~ Give each parallel session its own file area, and a worktree when two sessions touch the same
  files. Commit from one place, at agreed stable points. 8 of 32 QA runs on 28/9 failed, most of them because another
  session was mid-edit.
- **P2 · Narrow-width example slips** seen in the 390 contact sheets (pre-existing):
  - Templates › Sign in: the SSO button label is cut off.
  - Side Panel › "Docked inspector": the panel is clipped.
  - List Item › "Trailing actions": captions wrap to 4 lines.
  - Tables are cut off in narrow cards: Menu › "Row actions in a table" and the Sidebar shells.
  - Popover › "Selection toolbar (Bulk-Action)": at 390 the Delete action wraps to a second row (seen 2026-09-29).
- **P2 · Audit warnings kept as debt:**
  - Color Selector › "Brand colour" preview text on the White swatch 2.59:1; Dialog › "Form · Half-Half" field title
    styled Heading/4 but not a heading (rhythm) — both seen 2026-09-30, pre-existing.
  - Avatar initials contrast of 2.7–2.9:1 (List Item "BN" / "CT", Sidebar workspace "A", Bottom Sheet share/people
    avatars "DP", "DT", "HC", "RN", "PP" in light and dark, and the same people in the Top Navigation playground
    list; seen 2026-09-30).
  - **Done 2026-10-05 (see the P3 target item above).** ~~Small targets:~~ Chat reaction pills (15px tall), the Chip mobile filter row (20px), TopNavigation control-bar
    Segmented (20px; also Segmented › "Fits a phone" — Medium is already the largest size, the phone frame is scaled), the Input label tooltip button at 390 (12×12, `.zen-input-label__tooltip`; seen 2026-09-30), Bottom
    Sheet "Share sheet" / "Long content" buttons at 390 (20px tall in the scaled phone frame).
- **P2 · Example coverage gaps** (qa step ④):
  - sidebar: edge cases.
  - divider: states, edge cases, mobile.
  - side-panel, popover, dialog: mobile.
  - tooltip, list-item: states, mobile.
  - link: states.
  - card: states, edge cases, mobile.
  - action-bar: keyboard / a11y (seen 2026-09-30).
  - link: states (seen 2026-09-30).
  - page-header: states, edge cases, mobile; app-shell: states (seen 2026-09-30).
  - visually-hidden: edge cases, mobile (item 16 of the user's 2026-09-30 review list re-checks these examples).
- **Done, verified 2026-10-05:** ExampleCard's ZenProvider inherits the docs breakpoint (no `breakpoint` prop; PageHeader examples reorder at 390). ~~P2 · Example cards pin `breakpoint="desktop"`~~ (`PlatformShowcases.tsx` example card ZenProvider): responsive Grid
  columns never change in examples at 390. Layout wraps its responsive examples in `ZenProvider breakpoint="auto"`,
  Metric uses intrinsic `auto-fit` tracks / a container query. Decide at platform level (user/designer decision).
- **P3 · Top Navigation scrollRef adoption:** Typography › "Master screen · phone" (`PlatformTypographyHierarchy.tsx`
  ~161) still sets `collapsed` from an onScroll > 24 threshold; move it to `scrollRef` + `headerOverlay screenRef`.
- **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6):** the appLayer cycle was already gone; the one cycle left in src/platform (PlatformExamples ↔ PlatformMobilePlaygrounds) is broken — PlaygroundSlot moved to appLayer/playgroundParts.tsx (re-exported), MobilePlaygrounds imports the leaf; a Tarjan scan of src/platform (static + eager glob) finds no cycles. Was: ~~P2 · appLayer import cycle:~~ `appLayer/shared.tsx` ↔ `PlatformExamples` / `PlatformTemplate`. It can throw
  "Cannot access 'option' before initialization" under HMR. Move `option` and `Panel` into a leaf module (Open items
  has the detail).
- **P2 · Figma vs code differences found during the style-guard burn-down** (Open items: Slider thumb shadows, Chart
  bar corners, Bottom Navigation icon size, the phone home indicator). Fix them once the designer confirms the
  behaviour.
- **P3 · Package weight:** every app loads the whole 63 KB gz stylesheet. Consider per-component CSS entry points.
- **Done 2026-10-05:** see `zen-ds audit` (P1 above). ~~P3 · A rendered-page check for apps~~ (a blocker from the final blind trial, score 8.5).
- **P3 · Official Inter WOFF2** (with the glyf transform, about 10% smaller than today's conversion): needs the user's
  approval to download it.
- **P3 · `-shadow-off` leaks into nested component themes** (found 2026-09-29, token update): companions are emitted
  only in the modes whose fill is tinted, so a Neutral-S4 scope inside a Neutral-S3 scope inherits S3's `0 0 #0000`
  and its selected chip loses the Figma shadow. Nothing in the repo nests component themes, but `ZenProvider` allows
  it. Fix idea: `scripts/build-tokens.mjs` emits `<token>-shadow-off: initial` in the other modes.
- **P3 · Input family contracts predate the new small radius:** `docs/figma-contracts/input-search*.json` and
  `datepicker-sidebar.json` were captured when `Corner-Radius/Input/Small` was 8 / 8 / 4 / 2. No suite checks them
  yet; re-capture before building the Input suites. (2026-09-29: the DatePicker Action entry and the two
  Select-Month-Year variants are refreshed; see the DatePicker block below.)
- **P3 · Live modes that the repo does not have:** Typography Configuration `Ecom-Demo` (and `Zen-Platform`, kept in
  platform.css), Base Colors (Project) `Chat`, `VT`, `Ecom-Demo`. Global Dimensions' only mode is now named `Zen`
  (repo: `Mode 1`, no effect on CSS).
- **P3 · Badge-Counter parity:** the 2026-09-29 Chip/Trailing capture shows the Small badge's Text-Wrapper with
  Spacing/Padding/3XSmall side padding. There is no Badge contract suite yet to check the component.
- **Done 2026-10-02 · Audit tools** (user-approved): targets use the layout size and edges divide by the frame's
  scale (`audit.mjs`), so a 32px control in a 0.63 phone counts as 32px (chat@390: 3 targets → 0); the density
  snapshot skips `[inert]` content (collapsed Accordion panels); `behaviour.mjs` presses Escape again when the first one
  closed a popup inside the dialog; `shoot.mjs --timeout= --wait-until=` for a busy machine.
- **Done 2026-10-02 · DateField a11y:** the inputs session made the field an APG Date Picker Combobox (role=combobox,
  aria-haspopup="dialog", aria-expanded). `behaviour.mjs` comboFlow now checks that pattern: ArrowDown opens the
  calendar dialog, focus moves into it, and Escape closes it and returns focus to the field.
- **RESOLVED 2026-10-02 (user: "Tôi sửa luôn"; settings chips moved to a non-sticky row below 1024px) · P2 · Docs topbar at 390 covers popovers (found 2026-10-02):** the uncommitted topbar change (settings chips wrap
  instead of scrolling, CHANGELOG "Docs topbar settings chips work again below 1024px") makes the sticky topbar
  216px tall at 390. `audit.mjs --pages=popover --viewports=390 --smoke` reports "Create a label #0: layer
  official-topbar__controls paints over the open popover" in every run. Its session ("Zen Plugin Neutral color
  contrast") has ended.
- **P3 · Docs chrome off the spacing ladder (found 2026-10-02, needs a decision, tier L):** the docs shell's own
  layout in `platform.css` keeps gaps outside the ladder. The ladder pass covered templates, the app layer and
  playgrounds only.
  - Off-ladder gaps: `.official-page` and `.official-overview__content` giant 64; `.official-intro`,
    `.platform-page-template__body` and `.platform-component-sections` 3xl 48; `.pg` 2xl 40; topbar breadcrumbs and
    `.pg-refs` 3xs 2.
  - Raw values: `.official-cover__body` / `.platform-page-hero__main` 30px; `.platform-phone__levels` 7px (device chrome).
  - Every page renders these, so `npm run qa -- --all` is needed.
- **From the app-layer examples rebuild (2026-10-02, session "Add audit check…"): shared or component items, nothing
  fixed here.**
  - **Done 2026-10-02 · Full screen on `screen: true` examples:** the focus raise rule in `platform.css` is now
    `.pe-card:not([data-fullscreen="true"]):is(:focus-within, …)` (fixed by "Disable input…").
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6):** on `data-breakpoint="mobile"` the title row is display: contents and the order is title, description, actions (12px under it), tabs (custom properties in page-header.css; test). Docs phone previews still resolve desktop (P1 "Docs phones resolve desktop tokens"). Was: ~~P2 · PageHeader on phones:~~ when the actions wrap they land between the title and the description, so the one
    line that explains the title sits under the buttons (`page-header.css` 2–10). Move the description into the
    titles column or order it before the actions under the mobile breakpoint.
  - **Closed 2026-10-05 (user: "WCAG đã lỗi thời…" — keep the light border; no token change).** **Checked 2026-10-05 (backlog batch 6): code = Figma** — Checkbox/Mark and Radio-Button/Radio-Mark Default · Select=No both stroke `Checkbox/Border/Default` (#0101011D) in the captures; reaching 3:1 is a token change in Figma (designer's call, asked). **P2 · Checkbox / RadioButton unchecked outline** measures rgba(1,1,1,0.114), about 1.3:1 on white (WCAG 1.4.11
    asks 3:1 for the control boundary). Check the Figma token first.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** `DialogAction` takes `type` + `form` (SidePanel and Dialog actions; Enter in a field submits; test in input-popups). Was: ~~P2 · SidePanel `primaryAction`~~ cannot be `type="submit"` / `form` (ActionBar can), so a form in a panel calls
    `requestSubmit()` from onClick and Enter in a field does not submit.
  - **P3 · AppShell aside** assumes 440px (SIDE_PANEL_DEFAULT_WIDTH) before an aside has docked once and ignores
    SidePanel size="small" (360), so a small panel that would fit opens as an overlay.
  - **P3 · Audit `edges`** counts the focus outline of a programmatically focused `tabIndex={-1}` heading as a frame
    and reports its text as flush (`tools/platform-audit/audit.mjs`).
  - **P3 · Dead app-layer example code:** the old examples of the 12 rebuilt pages in `src/platform/appLayer/*.tsx`
    (layout, content, navigation, form, shell, shellScreens, text, panels) no longer render; the playgrounds there do.
  - **Done 2026-10-02 · Brief §3b** now says example cards inherit the docs breakpoint.
  - **P3 · Component nits seen in the second fix round:**
    - PageHeader `headingLevel={2}` renders Heading/2 (25px) next to the 28px h1; the house ladder says h2 = Heading/4.
    - EmptyState inside a Card is lopsided: no top padding, 48px at the bottom (`empty-state.css:10`).
    - FormActions in a narrow card (~424px) stack full width, and a dirty-only "Undo changes" makes the card grow.
    - The read-only TextArea still draws its resize grip.
    - Table has no selected-row cue (aria-current / Selected fill) for the row whose detail is open in a docked panel.
    - Inline DescriptionList amounts drop under their terms at 390.
- **P3 · Phone List inset:** Chip "Mobile filter row" and Button "Mobile footer CTA" keep List at its default inset
  (Margin/Comfortable 24px) while the rest of the screen sits on Margin/Compact (20px), so rows start 4px right of the
  chips and the Back chevron. `List inset="compact"` lines them up (as in the new Segmented phone example).
- **Blocked:** Code Connect needs a Figma Organization or Enterprise plan.
- **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** DateField writes the pick in DatePicker `onApply` when `datePickerActions` (Cancel/Escape keep the date; the zen-allow-date-apply exception is gone; test in input-popups). Was: ~~P2 · DateField `datePickerActions` commits on pick:~~ `handleDateChange` (onValueChange) writes the field and closes
  at once, so Cancel and Submit can never differ. Make the pick a draft and commit in the new DatePicker `onApply`
  (Cancel and Escape keep the old date). `zen-allow-date-apply` in `Input.tsx` marks the spot; session log
  2026-09-29, "The last 5 dead clicks".
- **P3 · Harness idea `chip/needs-action`:** a Normal or Advanced Chip with no onClick, `selected`, `popoverItems`,
  `onPopoverCreate` or `onClearSelection` renders a dead button; Figma says a read-only label is a Tag (Badge for
  status). 0 cases in the repo today (Chip "Counters" was Number-only, now a static count). Same session log.
- **P3 · Chat quote whose original is not in the thread** (older history not loaded): the default jump finds nothing
  and does nothing. Apps must pass `onJumpToReply` to load it; add that to the Chat guideline, or give the default a
  fallback. Chat owners ("Search popover component và Overviews").
- **P2 · Text-fit debt:** 24 findings of the new `fit` check (text wider than its box, no ellipsis, no scroll),
  baselined in `tools/platform-audit/quality-baseline.json`; table in session log 2026-09-29, "Text-fit audit check".
  - Stepper at 390: equal-share steps (`.zen-stepper__step { flex: 1 1 0; min-width: 0 }`) squeeze one-word titles,
    e.g. "WorkspaceInvite team" (Stepper, Checkout, Icon steps).
  - App Shell at 390: the desktop examples keep the sidebar open (the card sets `breakpoint="desktop"`), so `main` is
    16px wide and the PageHeader title breaks one letter per line.
  - Templates page list at 390: the trailing file name leaves the caption column ~63px wide.
  - Captions narrower than one word: Sidebar "Flat · knowledge base" (390) and List Item "Trailing actions" (390,
    Comfortable).
  - DatePicker at Comfortable (1512 and 390): "September 2026" fills the month button's padding.
- **P3 · `fit` follow-ups** for its owner "Quy trình kiểm tra Component build" (offline while it was built): review
  `textFit` and the new `audit.mjs` flags `--baseline-update=<kinds>` and `--css=<file>`. Still unchecked: a control
  that fits its own text but is cut off by an `overflow: hidden` ancestor or covered by a sibling. Examples: a
  Segmented with `flex-shrink: 0` in a clipping container would hide its last items, and at 390 the Side Panel ›
  "Docked inspector" card sits under the panel. `overflow` skips these as clipped, and `fit` does not see them.
- **From the Figma parity update of 2026-09-29** (session log, "Figma parity update"). The designer questions from
  the same run are under Open items.
  - **Actions column done 2026-10-05 (user: "dùng 40"):** the 5 `TableActions` IconButtons that forced `size="sm"` are md (40px, Figma Actions-Cell Button/Icon-Flat Medium); the Progress-cell theme part stays open. **P2 · Platform Table example vs Figma:** the Actions column uses IconButton sm (32px, 16px icons), while Figma
    Actions-Cell 1603:14291 is Button/Icon-Flat Medium (40px). The Progress column uses `theme="accent"` with no
    label; Figma Progress-Cell 4081:19726 is Theme=Neutral with its label. `PlatformExamples.tsx:2055–2080`.
  - **P2 · Contract suites for the updated components.** The fresh captures are saved in `docs/figma-contracts/`
    (`segmented-toggle-badge-avatarstack.json`, `input-search-primitives.json` for Search/Popover, and new
    `breadcrumbs.json`, `chat-bubbles.json`, `table-cells.json`), but only Checkbox and Radio have suites. The gap
    drifts fixed today would have failed a suite.
    - Add suites for Segmented (a harness kind that renders SegmentedItem inside Segmented), Search/Popover
      (a `search` kind, including a Neutral-S4 mode), Breadcrumbs (a figmaExceptions entry for the 4px list padding),
      Toggle, the Table cells and the Chat bubbles.
    - Re-add a caption x check to the Checkbox/Text suite: the nested instance no longer exposes Subtext, so only
      the primitive's offset is checked.
    - Labels render ~1px narrower than Figma's text boxes (Inter metrics); the suites need a global width tolerance.
  - **P3 · Code follow-ups found in passing** (need approval):
    - Chat: the keyboard focus ring on a bubble uses Corner-Radius/XLarge on every corner and ignores the Business
      radius and the tail corner (`chat.css:172, 175`). One-emoji reaction pills measure 28×24 against Figma's 24×24
      (Apple Color Emoji is 20px wide at 16px; `chat.css:99`, needs a design call).
    - Segmented: `:focus-visible` on a selected item replaces its Shadow/Action/Basic (`segmented.css:15–16`).
    - Table: `TableMedia` defaults to `bold = true` while every Figma media cell defaults to Bold=No (behaviour
      change, needs a decision); Photo-Cell radius (XSmall at 24px, Small at 32px) has no API or harness check;
      the text editor adds Effect/Popover over a Neutral/Pale fill when it grows (house-rule exception?); a duplicate
      `gap` in the select-editor rule (`table.css:85`).
    - Breadcrumbs: the Sub plate's bleed covers the first 4px of the chevron's hit area. (The 28px height is fixed:
      20px as in Figma since 2026-09-29.)
    - Toggle: the platform showcases still pass the deprecated `selected` / `onSelectedChange`
      (`PlatformShowcases.tsx:557–559`); its JSDoc does not cite the node ids; Figma renamed the Caption prop to
      Subtext (a `subtext` alias would be new API).

- **From the App Shell rework of 2026-09-29** (session "App Shell kiểm tra lại"; session log 2026-09-29, "App Shell"):
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 2):** both Sidebar roots are `<nav>` now (same class, data-* and aria-label). Was: ~~P1 · Sidebar landmark:~~ Sidebar renders `<aside aria-label="Main navigation">` (a complementary landmark), so an
    AppShell page has no navigation landmark (`Sidebar.tsx:380, 399`). Make it `<nav>`. The user deferred Sidebar edits
    on 2026-09-29.
  - **P2 · Sidebar reads the shell:** AppShell passes the rail state and the drawer's expanded state to a direct
    `<Sidebar>` with `cloneElement`. A wrapped Sidebar needs `useAppShell()` by hand. Letting Sidebar read an AppShell
    context would cover both.
  - **P2 · Rail group dividers:** the HR-Platform rail puts a Divider between groups. The collapsed Sidebar only hides
    section titles, so its groups run together.
  - **P3 · Sidebar headers from HR-Platform:** a workspace/account switcher header (square Avatar, name, email,
    chevron-selector) and a drill-in module header (Back chevron + Heading/4 "Time Off").
  - **P3 · Keyboard shortcut for the rail toggle:** Atlassian has an opt-in Ctrl+[ and Apple HIG asks for one. Needs a
    decision (it must not clash with ⌘B / Ctrl+B bold in editors).
  - **P3 · Notification-Dot as one primitive** (Figma 4116:21789): Sidebar items, TopNavigation actions and
    AppShellAction each draw their own dot today.
  - **P3 · Harness for dead top-bar actions:** `icon-button/needs-action` and `interaction/action-without-handler` do
    not look at AppShellAction or AppShellAccount yet.
  - **P3 · Aside in a narrow preview:** a SidePanel in `aside` becomes SidePanel's own portalled modal, so in a docs
    preview frame it covers the page rather than the frame. The drawer stays in the frame.
  - **From the UX review of the same session:**
    - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 3):** `figmaSidebarBrand.logo` is an inline SVG in currentColor built from the asset's own paths (dark Sidebar: #FDFDFD on #1C1C1C). Was: ~~P2 · The platform wordmark is invisible in dark mode:~~ `figmaSidebarBrand` in `PlatformSidebarBrand.tsx` draws
      the Zen logo as an `<img>` with a hard-coded #111. It sits on the dark Sidebar in every Sidebar and App Shell
      example. Use an inline SVG in currentColor.
    - **P3 · Rail counters:** a collapsed Sidebar hides an item's counter ("Approvals 3") without showing a Dot. This is
      a Sidebar change.
    - **P3 · PageHeader when its actions wrap:** the order becomes title → buttons → description, so the description is
      split from its title. Example cards force `breakpoint="desktop"`, so at 390 they never show the mobile order
      (Primary first).
    - **P3 · Dashboard template:** the "Recent activity" title sits outside its card while "Revenue"'s sits inside, so
      the two columns start at different heights.
    - **P3 · Behaviour probe clicks during a layout transition:** the probe clicks the next control about 25ms after
      the previous one. After "Collapse sidebar" the page is still sliding (Sidebar width transition, 160ms), so the
      first Breadcrumb is missed and reported as a dead click. Reproduced: it works after 400ms. This gives 2 ⚠ on
      templates@1512 (Admin list "Home", Detail "Invoices"). Fix in `behaviour.mjs`: wait for running transitions
      before `pointAt`. Owner: "Quy trình kiểm tra Component build".
    - **P3 · Example coverage (qa step ④):** `app-shell` has no "states" example (a loading shell, an offline
      banner, an empty notifications panel); `page-header` still lacks states, edge cases and mobile (pre-existing).
- **From the DatePicker + Breadcrumbs Figma re-read of 2026-09-29** (session "App Shell kiểm tra lại"; session log
  2026-09-29, "DatePicker radius + Breadcrumbs"):
  - **P2 · `use_figma` captures drop hidden instance children:** `use_figma` runs with
    `figma.skipInvisibleInstanceChildren = true`, so `__RUN` / `__HASHES` miss hidden nodes inside instances (the
    Breadcrumbs slot's hidden Dash, Button's hidden icons, the hidden Event dots) and report false diffs. Set it to
    `false` first (extractor + `tools/figma-contract/README.md`). The other 2026-09-29 `use_figma` captures
    (`segmented-toggle-badge-avatarstack.json`, `input-search-primitives.json`, `chat-bubbles.json`,
    `table-cells.json`) may lack those nodes; `breadcrumbs.json` is re-captured. Owner: figma-contract.
  - **P3 · Rest of `datepicker-sidebar.json`:** Header, Item, Calendar-Table and Calendar Single/Dual still hold the
    2026-09-27 hex values and miss hidden nodes inside instances (structure and bindings checked equal to live);
    Time-Picker and the mobile sets changed in Figma. Re-capture in the desktop console when the DatePicker suite is
    built.
  - **P3 · DatePicker parts with no code:** Time-Picker (460:38628, Single-Calendar's Time-Picker prop), the mobile
    date picker (9921:3283, 9923:2323, 9923:2791, 9923:3576), and Event-List with 1–4 dots and its On-Selected colour
    (510:36577); `DatePickerItem event` draws one Accent/Light dot.
  - **P3 · DatePicker sizes in px:** day cells (32 / 24) and the 224px panel are px, while Figma binds
    Select-Item/Size/Medium | Small (40 / 32 in Comfortable), so the calendar does not grow with density.

- **From the Zen Plugin Neutral 9→10 fix of 2026-09-29** (plugin repo `zen-ds-figma-plugin-main`, session "Zen Plugin
  Neutral color contrast"; the user chose to move Dark step 9, `NEUTRAL_STEP_9_10_CONTRAST = 1.16` in `src/ui/main.js`):
  - **Done 2026-09-29 (was P1): synced from the user's second `Global Colors.json`, gate PASS.** Apply the new Dark
    Neutral step 9, then sync tokens: Dark/Gray/9 goes #656565 (3.29:1) → #929292
    (6.16:1), Dark 9→10 now 1.16:1 like Light. Run the plugin's Check → Update in the live file, then
    `skills/zen-token-sync`. Consumers: `Color/Background|Border/Support/Neutral/Solid` (Dark) and
    `Color/Content/On-Black-Overlay/Light` (Dark/Neutral-Alpha/9).
  - **P2 · Light Neutral step 10 follows the raw input lightness, not step 9** (`L10_nl = L9 - 0.032`): Color Generator
    palettes get Light 9→10 anywhere from 1.08 to 1.98:1 (Slate hsl(220,10,50): 1.47; Gray at 70% makes step 10
    lighter than step 9), and Check regenerates another step 10 from the saved step 9 (Gray #828282 vs #838383).
    **Decided 2026-09-29: the user keeps Light as is, no change.** Check's ±1-per-channel tolerance treats #828282
    and #838383 as equal, so Gray is not flagged; the drift only affects new tinted palettes made in the Generator.
  - **P2 · Plugin build drops the bundled component packages:** `src/components/*.json` (Button_Main,
    Button_Icon-Main, Nav-Action_Main, Nav-Action_Icon-Main) were removed at 15:06, after the 15:00 build, so
    `npm run build` now writes a 0.5 MB `dist/code.js` without them. This session kept the rebuilt `dist/ui.html` and
    restored `dist/code.js` byte for byte, so the unbuilt 15:15 `code.js` change (check progress messages) is not in
    dist yet. Decide whether the packages come back before the next build.
- **From the Zen Plugin dark-alpha fix of 2026-09-29** (plugin `generateAlphaScale`; the user approved "all dark alphas";
  backup `backups/zen-ds-before-dark-alpha-overlay-20260929-182719.tar.gz`):
  - **Done, verified 2026-10-05:** the 2026-10-03 Global Colors sync carries them (dark alphas are lightening overlays, e.g. `--zen-dark-yellow-alpha-3: #FF7C0024`, `--zen-dark-orange-alpha-3: #FF5C002A`). ~~P1 · Apply the new dark alphas, then sync tokens:~~ dark alphas are now lightening overlays, so steps that were
    87–96% opaque become translucent: Yellow/Orange/Golden 2–7 (step 3: #2E1D00F5 → #FF81001F, #371900EE → #FF500027,
    #2C1E00F5 → #FF91001D; on Surface-Default 1.07 → 1.20–1.22:1), Mint 2–7, Cyan/Sky/Teal 5–7, Blue/Grass 6–7,
    Tomato 7, and step 1 of every accent (unused). Solids, Light alphas and real Neutral palettes are unchanged. Run
    the plugin's Check → Update in the live file, then `skills/zen-token-sync`. Consumers: the Subtle/Flat
    background and Subtle border tokens of Warning (Yellow), Info (Blue), Positive (Grass), Negative (Tomato) and the
    Support colours.
- **Done, verified 2026-10-05:** `--zen-dark-gray-1: #121212` in tokens.css (the 2026-10-03 sync). ~~P1 · Zen Plugin Neutral Dark step 1 = 7% HSL (2026-09-29):~~ `NEUTRAL_DARK_STEP_1_LIGHTNESS` 6 → 7, so Dark/Gray/1
  #0F0F0F → #121212 and every Neutral Dark step is re-solved against it (Gray/2 #1D1D1D, /9 #939393, /12 #FDFDFD);
  accent darks and alphas follow the new canvas. Run the plugin's Check → Update, then `skills/zen-token-sync`.
  Backup `backups/zen-ds-before-neutral-dark-l7-20260929-191010.tar.gz`.
- **From the examples rebuild (2026-09-30/10-01) — RESOLVED 2026-10-02 (user: "cứ xử lý hết"; CHANGELOG "Approved backlog fixes"). Kept on purpose: the Content/Placeholder colour (Figma token; Zen fields always have a visible label) and the Avatar solid colours (Figma; harness warns instead):**
  - **P2 · Example cards force `breakpoint="desktop"`** (ExampleCard's ZenProvider in `PlatformShowcases.tsx`), so
    `Grid columns={{ mobile, desktop }}` never collapses at 390; builders used `minColumnWidth` + clamp instead. The
    Search guideline's toolbar pattern (`columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }}`) fails there too.
  - **Closed (user, 2026-10-05: keep as is).** ~~P2 · Avatar solid contrast:~~ white initials on green 2.93, teal 2.70, orange 2.73, cyan 2.60 (yellow uses its
    own text) fall under 3:1 (`avatar.css` on-colors on support-*-solid). The examples' people avoid these themes.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4), all already fixed in code (Avatar names initials from alt, Badge remove "Remove <label>", Search filterHasPopup/filterExpanded, icon-only Segmented tooltip):** ~~P2 · Avatar initials have no accessible name~~ (alt is ignored without src), so AvatarStack initials read as
    "KB". **Badge remove** is always named "Remove" (guideline: "Remove <label>"; Tag uses `t.removeItem`).
  - **P2 · Search filter trailing** does not pass `aria-haspopup` / `aria-expanded`; the filter-icon target is 18×18
    at 390. **Icon-only Segmented options** have no 1s name tooltip (IconButton rule).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4): day names (full date) and DateField minDate/maxDate were already fixed; Time-Picker fields are now Medium when the DatePicker is `mobile` (new `DatePickerTimePicker` `device`).** ~~P2 · DatePicker:~~ day buttons are named "Day N" (no month/year, ambiguous in the dual calendar); Time-Picker
    inputs are Small even on phones; DateField does not pass `minDate` / `maxDate` to its calendar.
  - **P3 · Pagination:** `resultsRange` prints "of 1284 results" without thousands separators (labels.ts en/vi); the
    guideline's "jump to page" wording and Enter row do not match the Manually theme (a page-size input).
  - **P3 · Link `as="button"`** keeps the browser button background and border; a pressed **Tag** (aria-pressed) has
    no visual pressed state; SelectField placeholder "Choose a client" measured 1.92:1 (placeholder token).
  - **P3 · platform.css:767** pads and paints any bare List inside an example stage (builders wrap Lists in Card).
- **From the topbar chip fix of 2026-10-01** (session "Zen Plugin Neutral color contrast"; session log 2026-10-01):
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6):** opt-in Chip `popoverPortal` (ZenPortal layer anchored to the chip; light dismiss checks the layer; guideline line; test in tests/interaction/backlog-fixes-2026-10-05.test.tsx). Not the default: a portal inside a Dialog/Bottom Sheet would fight its focus trap and outside click. Was: ~~P2 · Chip menus are clipped in any horizontal scroll box:~~ Chip renders its Popover inline, so a chip row that
    scrolls (the phone chip-row pattern in apps) hides every menu, as the docs topbar did. A portal mode (ZenPortal +
    useAnchoredPosition with the chip as anchor, like ChatReactors) would fix it in the library; it also needs the light
    dismiss and focus return to follow the portalled surface.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6), not reproducible:** at 1512 both dialogs take focus inside (the field / the safe Cancel) and give it back to the trigger on close. Was: ~~P2 · Button page dialog focus (QA ✗ at 1512):~~ "Page actions → New task" and "Delete a file → Delete Launch
    plan.pdf": focus does not move into the modal / does not return to the trigger after close. Seen under concurrent
    HMR reloads; re-check before fixing (examples in PlatformShowcases.tsx / appLayer).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** platform.css font-family-sans/button carry system-ui … sans-serif fallbacks. Was: ~~P3 · Platform text flashes in serif while Inter loads:~~ the Zen-Platform block sets `--zen-typography-font-family-*`
    to `"Inter"` with no generic fallback, so chips and body text use the browser's default serif until the font loads.
- **From the UX interaction pass and the Top Navigation research (2026-10-01; session "Component library review và
  fixes"; research §5):**
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 2), already fixed (`Dialog.tsx` useModal returns on `event.defaultPrevented`):** ~~P1 · Escape in a ModalForm closes the whole form~~ (in progress: the user approved the fix on 2026-10-01 in
    session "Disable input và search từ Figma", which owns it). It happens while a SelectField list or a DateField
    calendar is open, and
    what was typed is lost. Cause: `Dialog.tsx` `useModal` (~l.54) ignores `event.defaultPrevented`. Seen in Empty &
    error › New project, and it affects every date form.
  - **P2 · SidePanel `standard`:** a docked panel returns no focus when it closes, and Escape works only with focus
    inside it. In docs full screen, Escape on a row exits full screen and leaves the panel open (`PlatformFullScreen`
    Escape owners).
  - **P2 · AiChatField** always renders "+", the microphone and Start voice mode, even without `onAttach` / `onVoice`,
    so they are dead clicks unless an app passes both handlers. Fix: hide them without a handler, or add a harness rule.
    Home and HrShell now pass both.
  - **Done 2026-10-02 (user: yes) · P2 · Sidebar workspace switcher (APG):** `button.zen-sidebar__workspace-trigger` (aria-haspopup="listbox") opens
    its listbox with Enter but not with ArrowDown or ArrowUp. Seen in the gate on sidebar › Switch workspace,
    2026-10-01; it is a component issue, not that example's.
  - **P2 · G8 PlatformChatHeader** does not pass `scrollRef` on, so the 6 chat phones cannot follow the scroll rule (R1).
  - **P3 · G3 harness:** `top-navigation/search-folds-to-action` checks only `collapsed`. A `scrollRef` bar with a
    Search and no `searchAction` passes.
  - **Done 2026-10-02 with G4 · P3 · G5 `largeTitleAction`** could not be reached once the title folded. Figma's folded state shows it in Top-Trailing.
  - **P3 · G7 Figma Top Navigation features without props:**
    - large-title Capline, Subheading and Badges;
    - a bar-title Dropdown;
    - a selection-mode recipe;
    - a hero header that turns opaque on scroll.
  - **P3 · G9 docs:**
    - `example-patterns.md` §2 still puts every phone on `type="compact"` and `.pe-phone-cta`.
    - The guideline's HIG "Navigation bars" link now redirects to "Toolbars".
    - The Bottom Navigation guideline lacks "tapping the current tab scrolls to the top" (R14).
  - **RESOLVED 2026-10-02 · P3 · G10:** the phone examples in `PlatformMobileShowcases.tsx` / `PlatformShowcases.tsx` are overridden by
    `examples/pages` and never render. `ChartReportPanel` is still used.
  - **P3 · Focus after removal and from toasts:** these drop focus to the page:
    - a toast's Undo or View;
    - an emptying Clear;
    - deleting a row;
    - a button that disables after use (Settings Save/Discard, SSO, Pay in full).
    A panel or sheet opened from a toast also loses its opener.
  - **P3 · Phone targets and sizes:**
    - The MetricCard breakdown chevron, the ChartCard open button and Pagination prev/next are 24px on phones.
    - FileUpload's button is 32px and has no size prop.
    - Menu and Chip popovers have no phone (sheet) mode, so templates build their own sheets.
  - **P3 · RadioButton** cannot take `data-autofocus`, so Change role focuses the first radio, not the checked one.
  - **P3 · PageHeader** on phones puts the Primary button between the title and the description.
  - **P3 · Docs frames:**
    - Toasts from phone templates appear in the docs page's stack under the phone.
    - In the 1512 card, SidePanels open as modals because the frame is too narrow to dock them.
    - A portaled ModalForm ignores the phone breakpoint, so date fields stay in 2 columns at 390.
  - **P3 · HR templates:**
    - The Zen AI floating button sits over rows while the page scrolls (AppShell already keeps room for it at the end
      of the page). On phones it covers a row's ⋯ mid-scroll: consider hide-on-scroll.
    - Team budgets still scrolls sideways at 390.
    - The "Who's out" chips wrap onto 2 lines.
    - Delete task cannot be reached on a phone.
- **From the example polish pass + its gate (2026-10-01) — RESOLVED 2026-10-01/02 (components, platform.css, data.ts, audit tools by "Add audit check…"). Still open: useChatDemo Delete has a confirm but no Undo toast yet (partly):**
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1), already fixed in Input.tsx ("Not a <form>" group, Enter confirms):** ~~P1 · RichTextField renders a `<form>`~~ (insert-link, `Input.tsx` ~l.1419): inside any `<Form>` it is a nested form
    (React error; gate ✗ on Input › Task title and notes). Fix: a `div role="group"` with Enter → confirm.
  - **Done, verified 2026-10-05 (user: "đổi qua token Mobile"):** PlatformPhone sets `data-breakpoint="mobile"`; measured inside a phone Margin/Comfortable 20 and modal padding 20 vs 24 outside. ~~P1 · Docs phones resolve desktop tokens~~ (`PlatformPhone` sets no `data-breakpoint="mobile"`): margins and
    insets differ from a real phone; decision pending (see the Top Navigation rules R10 note in the example brief).
  - **P2 · platform.css:** top-align short example stages that share a row with a taller card or phone (13 pages);
    `.pe-card__stage .zen-list` (l.769) paints a bare List as a borderless Surface; a later card's stage covers an
    open popover of the card above; `.pe-chat-desktop` min-width 560 at ≤620px cuts desktop chats at 390.
  - **P2 · data.ts (examples):** one shared monthly studio series for Metric + Chart (revenue, billable hours), one
    workspace plan (name, price per seat, seats) and one leave dataset, so pages stop carrying page-local copies.
  - **P2 · Components:** Bottom Navigation idle labels 1.92:1 (Content/Placeholder; design decision); SelectField
    placeholder 1.92:1; ChatComposer textarea and read-only inputs show no focus indicator; InlineMessage action 20px
    tall on phones; Pagination prev/next stay 24px at size sm and the range uses " - " not "–"; Accordion Box theme
    hit area and non-concentric corner; ModalForm does not focus the first invalid field (Form does); Dialog has no
    device-frame (overlay root) mode; BottomSheet has no form/submit; DatePicker `today` prop and an inline mode
    without the popover shadow; Badge remove label; AutocompleteField Create row for an already-selected value and
    Form focus for an Error tag; NpsScale/OpinionScale one-row narrow layout; Chat labels in Title Case
    (labels.ts 394–399) and a ringing Business call's bottom padding; ListItem titles may wrap to 2 lines.
  - **Done 2026-10-02 · Audit tools:** see the Done line under Backlog (phone scale, inert panels, dialog Escape, shoot
    timeout).
  - **P3 · Guidelines:** Bottom Navigation should state R14 (re-tap scrolls to top); a slot for a Small AlertBanner
    under the TopNavigation (G6).
  - **Done 2026-10-02 (smoke live-rect fix; old check 5/5, new 0/5) · P3 · Intermittent smoke finding:** "templates@390: HR · Home #1: layer zen-list-item__wrapper paints over the
    open popover" from `node tools/platform-audit/audit.mjs --pages=templates --viewports=390 --smoke`.
    - It showed up in about half the runs. Replays of the same click sequence, and a probe copy of the audit, never hit
      it.
    - The popover is absolute, z 1000, with no positioned ancestor, so it is probably state left over from an earlier
      card in the run.
    - The audit owner ("Add audit check…") is aware.
  - **P3 · rhythm "> 7 text styles in one example"** flags full screens and their overlays: App Shell Banner and HR
    workspace, the Detail, HR Home and HR Expense overview templates, and the My expenses / My leaves panels. A real page
    uses 8 styles (h1, h4, Subheading, body regular/medium/bold, small, caption). Exempt `screen: true` examples and
    templates, or raise their limit.
  - **P3 · Example coverage gaps flagged by the gate (2026-10-01):**
    - action-bar: keyboard / a11y.
    - visually-hidden: edge cases.
    - page-header: states, edge cases, mobile.
    - side-panel: mobile.
    - text: states.
    Add examples only in an approved batch.
- **From the AI-readiness re-evaluation of 2026-10-02** (session "Đánh giá khả năng AI với library hiện tại"; blind trial on
  the packed tarball + memory-vs-repo audit; session log 2026-10-02, "AI-readiness re-evaluation"). Proposal, nothing fixed:
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1):** AGENTS.consumer.md rule 3 + Fields row now say `disabled` (not Autocomplete/RichText); bottom-sheet use/do and the chip phone line now say List + ListItem for a single choice (guidelines rebuilt). The harness idea stays open (new rule needs the user's OK). Was: ~~P1 · Two doc contradictions agents follow literally:~~ AGENTS.consumer.md §3 rule 3 says fields have `readOnly`, not
    `disabled` (Disabled is back since 2026-09-30, g/input:30); g/bottom-sheet "Use Action type with `selectedId` for single
    choice" (+ AGENTS.consumer.md §3.12, g/chip) vs the house rule "pick-one = List + ListItem selected" that the templates
    follow; the trial agent picked the Action sheet. Harness idea `bottom-sheet/choice-uses-list-item`.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 2):** `scripts/build-api.mjs` resolves spreads in `as const` arrays (`dockIconThemes` was the only one), so Metric/MetricCard `iconTheme` and DockIcon `theme` list all 22 members; the `guidelines:check` union comparison stays an idea (a new check needs the user's OK). Was: ~~P1 · Props generator drops union members:~~ `iconTheme` on Metric/MetricCard is documented as neutral · accent ·
    inverse · on-color · pale · surface · emoji; the real `DockIconTheme` also has every hue (green, blue…). Check every
    `(typeof x)[number]` prop in docs/api and make `guidelines:check` compare documented unions with the TS type.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1): AGENTS.md step 3 already points at `examples/pages/<page>.tsx`; the dead example code is the separate cleanup.** ~~P1 · AGENTS.md DoD step 3~~ still sends examples to `PlatformShowcases.tsx` (dead since 2026-10-02); delete the dead
    example code (≈6,400 lines) so greps stop landing there.
  - **Done 2026-10-05 (user: "zen-ds-audit: Làm luôn"):** `npx zen-ds audit <url…> [--routes] [--viewports=1440,390] [--dark] [--out] [--strict] [--wcag-contrast]` (tools/zen-audit/audit.mjs + app-checks.mjs, quality-checks.mjs `regionSel: "body"`; axe-core when installed, its 4.5:1 color-contrast rule opt-in; screenshots + report.md/json; shipped in package `files`; AGENTS.consumer.md §8 and the `zen-ds init` AGENTS section mention it). Not ported: density (Comfortable) and the behaviour probes. Was: ~~P1 · No rendered check for apps (trial blocker since 2026-09-28):~~ `zen-ds` has init/doctor/check only. Port the
    platform audit (axe, overflow, fit, ladder, rhythm, surfaces, outline, 1440/390 light/dark shots) as `zen-ds audit <url>`.
  - **P2 · App checks are weaker than repo checks:** CSS rules run only with `zen-usage --css` (init/ACM say plain
    `zen-usage`); `interaction/action-without-handler` is repo-only; `mobile/full-size-controls` keys on PlatformPhone.
  - **P2 · Missing app patterns (trial):** switch row (ListItem + Toggle), inset-grouped List section (needed an inline
    `--zen-list-inset`), single-choice Chip group with radio semantics, profile header, Metric trend formatter, a phone
    settings template. New components/templates need the user's OK.
  - **P2 · Vietnamese:** `plural()` is English-only; `copy/plural-count` cuts words at the first non-ASCII letter
    ("phiên" → "phi") and fires under `locale="vi"`.
  - **P2 · MCP answers too big:** `get_component` 8–15 KB with Figma ids and repo notes, `get_template` 39 KB; 5 guideline
    lines cite `component-usage-rules.md §n`, which the package does not ship. Add a brief mode; drop repo-only notes.
  - **P2 · Contrast in light mode (designer decision):** Content/Neutral/Tertiary #828282 on white 3.84:1 (ListItem and
    Table captions, chart axis), Table header 3.78:1, tonal destructive Button 3.8:1; every app inherits them (axe AA).
  - **P2 · Memory-only rules → repo:** token-sync gotchas (skills/zen-token-sync points to private memory), playground empty
    slots, backup naming on APFS; 15 more rules are documented but unchecked (elevation follows Sidebar, grouped lists,
    table without container, phone Chips not Segmented…).
  - **P2 · Distribution:** `private: true`, 22 local commits not pushed, CI never ran; apps outside this Mac cannot install.
  - **P3 · Figma:** search_design_system sees 7 Zen libraries with the same names (Official-Sep2026, Kate, Starnest, Paid,
    Pokeslide, Archived, Glea); document `includeLibraryKeys` for the official key or archive the forks; published assets
    date from 2026-09-10. Stale counts in HANDOFF (49 slugs / 154 rules; now 62 / 157); `zen-usage --help` runs the check.
- P3 (2026-10-03, gate .qa/reports/2026-10-02T18-13-34-74c53b07.md, found by "Component Size tokens and corner radius", not from its change): new ⚠ outside ai-chat — Select placeholder contrast 1.92:1 ("Choose a reviewer/slot" top-navigation@1512/390, "Choose a client" input@1512/390); input@390 `button.zen-input-label__tooltip` 12×12 target; dead clicks: app-shell "Activity, new", inline-message "Copy value", uploader "Retry desert-trail-lookbook.jpg".
- P3 (2026-10-03, session "Component Theme tokens update"): re-capture the Input/Search contracts. `figma-kit status` on
  Field-Only, Text-Area, Search/Popover, Search/Default, Autocomplete-Field and Text-Field: 152 variants differ. Real
  rebindings: Focused/Typing → `Input/Border/Focus` / `Input/Border/Popover-Search` (code follows), Search/Popover Hover
  1 → 2px (code follows), Disabled → `Input/Border/Disabled`, `.Primitives/Input/Text-Area` fill/stroke now
  Input/Background/Default + Input/Border/Default. The rest are stale token values (Corner-Radius/Input/Small 8 → 12,
  Caption 10 → 11, XLarge tracking). No suite maps these strokes; use `tools/figma-kit` fetch + patch.
- P3 (same session, needs a user decision): `.zen-chat-composer__field` copies the Input focus ring with
  Color/Focus/Neutral/Solid (`chat.css:142`, guideline "standard Input focus ring"); switch it to `--zen-input-border-focus`
  so Neutral-S7 matches Input? (2026-10-03 evening: `Input/Border/Focus` is now Color/Focus/Neutral/Solid in all nine
  modes, so both already render the same; only the binding name differs.)
- P3 (same session, for the designer): ~~Neutral-S7 focus is faint by design~~ — resolved 2026-10-03 evening: the designer
  set `Input/Border/Focus` in Neutral-S7 to Focus/Neutral/Solid (export synced). Still open: `Input/Border/Popover-Search` stores "Focus/Neutral/Solid at
  opacity 0" in S1–S6, which the export writes as `#NANNANNAN`: a plain transparent value would export cleanly. Also
  `.Primitives/Input/Text-Area` Focused has a 2px Focus/Neutral/Subtle outer ring, Field-Only a 3px
  Border/Active/Neutral/Subtle one (code uses the 3px ring on both).
- P3 (2026-10-03 evening, session "Token JSON và Search component", for the designer; user chose to keep the code):
  live Field-Only (374:103464) Hover Container stroke is a fixed 2px, no longer bound to Emphasis/Border-Weight/Active/Primary
  (the contracts still bind it). Code keeps the variable (`input.css` Hover rule: Medium 2px, Strong 3px, Light 1px); only
  Strong/Light in the outlined themes (Neutral S4, S6) differ. Ask whether the unbinding was intended. Search/Default and
  Search/Popover contracts are still stale (48 + 18 variants per `figma-kit status`: Small radius 8 → 12 value, Focused/Typing
  → Input/Border/Focus / Popover-Search, Popover Hover 1 → 2px, this Hover binding); see the re-capture line above.
- P3 (2026-10-03 evening, gate .qa/reports/2026-10-03T15-03-53-5b6b7c50.md, not from its token change): new behaviour ⚠
  deadclick chat@1512 "Chats inbox" — `button.zen-list-item__wrapper` "Hana Kim …" click had no visible effect. The
  gate's first run also hit a flaky `tests/scale.test.tsx` Rating xl/xlarge mismatch (star 1 `data-filled`), green alone
  and on the rerun.
  Seen again 2026-10-05 (gate .qa/reports/2026-10-04T18-19-01-8298399d.md, TopNavigation dual action); a manual click
  on Hana Kim opens the thread with its header, so the probe likely races the open (peers' HMR running at the time). Again
  2026-10-05 (.qa/reports/2026-10-04T18-56-56-1c7e4092.md, Chat composer radius, CSS only).
- P3 (2026-10-03, gate .qa/reports/2026-10-03T08-03-04-bd171ca9.md, session "Component Theme tokens update", not from its
  change): new ⚠ on example pages — button "Approve on a phone": "Chi Tran" styled Heading/4 but not a heading; button "Hand
  off when ready": Stack gap 2px off the spacing ladder; templates HR · Home: sibling h2 titles in Heading/1 and Heading/4
  (rhythm "8 text styles" on the HR templates is already listed above).
- P3 (2026-10-03, gate .qa/reports/2026-10-03T08-38-12-bd171ca9.md, same session, not from its change): design-tokens
  dark: the 11 collection headings measure 1.29:1; card playground Spacing=small: Card corner 16 vs slot 12 + inset 16
  (not concentric; card.css was being edited by "Slot Component phân biệt" during the run); chat "First message" Audio
  call dead click; templates exceeds the 90s behaviour budget.
- P2 (2026-10-03, session "Slot Component phân biệt"): Figma file — set `Bubble-Chat-Others-Business/Background/Default`
  to Color/Background/Surface/Default in all nine Component Theme modes (repo changed at the user's request); the next
  Component Theme sync reverts it otherwise.
- P2 (same session): Studio Phase 2 UI not built yet — Effects section (session eye), CornerRadiusField (the Position
  section was built 2026-10-04, see below); waits for the inspector owner's ScaleField + `FieldApi.apply` response
  (`docs/research/studio-position-effects-radius-spec-2026-10-03.md` §4, §6 C–E). Also resize.ts: an "inset" kind for
  absolute layers (ask the resize owner).
- P2 (2026-10-04, session "Cho phép edit element floating", not from its change): behaviour ✗ on app-shell@1512 "Narrow
  window": "Open navigation" does not open with Enter and its click shows no visible effect (APG + dead click). Already
  in `.qa/reports/2026-10-03T17-00-38-710219c7.md` (00:00, before the AppShell measuring fix); fails every gate that
  includes app-shell. Probably the drawer inside `.px-app-shell-window` (overflow: clip) — needs a look.
- P2 (2026-10-04, session "Cho phép edit element floating"): Studio Position follow-ups — the canvas ConstraintLayer
  is ✅ built (2026-10-05, Studio builder session: `position/ConstraintLayer.tsx`, E2E AP-04); resize handles and
  canvas drag on a floating layer still behave as in flow (drag reorders; v2: drag-to-move snapped to tokens).
- P3 (same session): Ignore auto layout has no Quick action (⌘/) or shortcut yet, and works on one layer (not a
  multi-selection). Offsets stop at Spacing/Padding 4xl (48px), so a layer floated far from every edge jumps (the status
  says so); a larger offset scale or fractions would need the user's decision.
- P3 (same session): Card `theme="shadow"` on an inherited alt surface (page scope `--zen-card-surface`, e.g.
  `.pe-shell[data-canvas="alt"]`) still casts its shadow; only an explicit `surface="alt"` drops it (CSS cannot read the
  inherited var).
- P3 (same session): Studio slots — duplicate then clear the original makes reset treat the original as new (⌘Z works);
  remove + insert of a same-named element in one slot is matched as the same element by "Modified"; menu captions over
  240px ("Required by ChartCard — replace its content instead") need shorter copy; snippet sync for inserts is best
  effort (most hand-written snippets do not contain the inserted element's anchor).
- P3 (same session): `tools/qa/run.mjs` gained the "Layout self-test" static step (user-approved); the gate's maintainer
  should review it. AGENTS.md Commands table does not list `npm run layout:selftest` yet.
- P3 (2026-10-03, session "Figma-like editing functionality"): multi-selection follow-ups — arrow keys and dragging move
  one layer only (several: one at a time); Mixed properties cover variants and booleans (not text, number, spacing or
  text style); ⌘D on several selects the first copy only (op many answers one loc); copying layers from two files is
  refused ("one example at a time").
- P3 (2026-10-03, session "Figma-like editing functionality"): slots/palette.ts has two items labelled "Metric ·
  Value and trend" (ids metric and metric-card); the Assets tab and the slot picker show them as twins — label the
  card one "Metric card".
- **Done 2026-10-05 (Studio builder plan GĐ1, E2E row ST-11):** P3 (2026-10-03, session "Figma-like editing functionality"): Studio menu "Move up/down" (slots/actions.ts runMove) drops
  the selection after the swap: the new loc still shows the sibling until React re-renders and SelectionLayer's
  name check runs before awaitingWriteRender covers it; edit/arrange.ts stepLayer avoids it with expectRender(…, 1500).
- P3 (2026-10-03, session "Slot Component phân biệt"): Studio board reflows frames (masonry) when a frame's height changes (e.g. Clear contents then Reset slot): example frames jump columns and the selection leaves the viewport; Figma never moves frames on content edits (board/frameLayout.ts, Studio owner).
- **Done 2026-10-05 (Studio builder plan GĐ1, E2E row ST-10):** P2 (2026-10-04, session "Giới hạn component trong slot"): removing, clearing or resetting a stateful slot item (Dialog, Tabs, Chip row…) leaves its `const [x, setX] = useState(…)` behind unused; tools/studio/slots.mjs has toastHookRemovals for useToast but no state counterpart (tsc passes, no noUnusedLocals).
- P3 (2026-10-04, same session): ⌘C/⌘V of a stateful item into another file is refused (its state names are not bound there); the clipboard could carry the item's `state` like the Assets path does (edit/clipboard.ts pasteAt).
- P3 (2026-10-04, same session): a stateful item inserted into a `.map` row (Studio "Repeats N×") shares one state across the rows, so every row's Dialog opens together; per-row state needs a row component.
- P3 (2026-10-04, same session): Popover is the one DS component the slot palette does not offer (it needs an anchor `useRef`); stateFor could declare refs the way it declares useState.
- **Studio UX/UI audit (2026-10-04, session "Kiểm tra stack hiện và ẩn toast"; read-only; evidence and fixes in
  `docs/research/studio-ux-audit-2026-10-04.md`). Proposed for approval:**
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row S-02):** P1 · Zoom menu (`86% ▾`, canvas/ZoomControls.tsx) opens below the screen whenever the left panel is docked
    (1280–1920: 0/7 items visible; 1024/390 flip correctly).
  - **Done 2026-10-05 (Studio builder plan GĐ1):** P1 · Studio focus ring Focus/Accent/Solid #ff66d4 is 2.42:1 on the light canvas (SC 1.4.11 needs 3:1); 12 uses in
    src/platform/studio → Focus/Neutral like the components.
  - **Shift+1 part done 2026-10-05 (fits every frame, E2E S-04); the first-view clip is still open:** P2 · First view clips the Playground under the Inspector (1280: 80px, 1024: 64px; zoom floors at 75%); Shift+1
    "fit all" leaves the Docs frame 213px off-canvas and hides 3/8 frame labels.
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row SE-07):** P2 · Layers search with no match: blank panel + unchanged "158 layers" count (Pages/Assets have EmptyState + Clear).
  - **Done 2026-10-05 (Studio builder plan GĐ1, Popover blur):** P2 · Quick actions (⌘/) palette: rgba(255,255,255,.898) fill with no backdrop blur → canvas text shows through.
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row S-07):** P2 · Toolbar at 390: 690px of controls in 374px; Modes, theme, Undo/Redo, Role and Inspector are off-screen.
  - P2 · Two page descriptions on one screen (board ExamplePage description vs Inspector guideline purpose; 45 pages,
    9 with Figma-mapping copy) — content decision.
  - P2 · Docs on the canvas render 12–13.7px body at the default 75–86% zoom (1280–1512) — product decision
    (open Docs at 100% or a reading view).
  - P3 · Polish N1–N11 in the report (flat 56-item Pages list with one icon, triple page name, rule notes in the size
    badge, duplicated bound props, double import in Snippet, Shortcuts dialog layout, Modes subtitle, raw layer names,
    ⌘/Ctrl hint, 11px nav labels, 592px of side panels).
  - Library-wide decisions (not Studio): Tabs inactive label and Light kickers/Table headers at 3.74–3.79:1; Danger
    button text 3.74:1 (Negative/Solid + On-Colors).
- P3 (2026-10-04, session "Mở lại port preview", Studio data slots): the Layers panel lists no data-slot items (Figma shows
  the Action instances inside Trailing-Slot) and the canvas draws no outline or + chip for a data slot (SlotLayer knows
  content slots only); the Slots section and the item panel are the way in for now.
- P3 (same session): only TopNavigation is in `slots/dataSlots.ts`; other Figma slots the code takes as data (BottomNavigation
  items, ActionBar actions, Breadcrumbs items…) could join after a Figma SLOT-property check.
- P3 (same session): ⌘-click on a TopNavigation action lands on its IconSvg (the deepest part); the action itself is one
  "Select …" link (or a parent step) away. Decide whether deep select should stop at a data-slot item.
- P3 (same session): moving one of two identical list items reports "No change" (the texts swap to the same file).
- P2 (2026-10-05, session "Mở lại port preview"): Figma property groups exist for TopNavigation only
  (`src/platform/studio/inspector/propGroups.ts`). Each other component needs its Figma set read (componentPropertyDefinitions
  + which layers each boolean hides) before it gets groups; propose the order (most-used first) to the user.
- P3 (same session): switching a list toggle off (Top-Trailing with 2+ actions) removes the prop, so a useToast() line an
  inserted action brought can stay unused; one item, or an object prop, goes through removeItem and cleans it.
- P3 (2026-10-05, session "Studio builder tool planning", E2E): add harness rows for TopNavigation data-slot items (drag to reorder, drop onto another action to group, Inspector Slots `[data-item-index]` rows, "Group X with Y" / "Take X out of its group"); gestures listed by session "Dual action trên top navigation Figma". Needs a TopNavigation in `tools/studio/e2e/fixtures/host-page.tsx`.
- P3 (same session): intermittent HMR error during Studio E2E runs: `[vite] ReferenceError: Cannot access 'appLayerExamples' before initialization` then "Failed to reload /src/platform/PlatformShowcases.tsx" (import cycle PlatformShowcases ↔ appLayer). Not tied to one row (D-03/D-06 pass); the report's "Vite errors" lists it.
- P3 (same session): the QA gate owner should review the Studio hooks in `tools/qa/lib.mjs` (`uiKind` "studio", `auxKind` tools/studio, `pagesForEdit` skips studio) and `tools/qa/run.mjs` ("Studio self-tests" static step, "Studio E2E" runtime step).
- **P3 · Studio Tone picker warnings (2026-10-05, "Token màu cho content/chữ/icon"):** the picker lists all 81 tones but
  shows no inline warning for a rule the pick would break (Lights-group `*-light` on Text/Heading, colour Light on body
  copy); the harness flags it only at Save. Add a per-option "Not for text" caption like the slot palette's warnings.
- ✅ 2026-10-06 (built: `shared-code.mjs`, `SharedConfirm`, E2E ST-12) P2 (2026-10-05, session "Studio builder tool planning", plan WP-B2): structural edits in shared demo code (`PlatformDemoActions.tsx`, `chatDemo`, `PlatformChat*`) with a "used in N places" confirmation. Needs one confirmation choke point for remove / duplicate / move / insert / paste / drag / multi, and `isSlotFile` widened to annotated non-playground files; today they show disabled with the reason ("shared beyond this example").
- P3 (same session): the Studio E2E server watches the shared tree, so peers' edits to Studio files mid-run cause hot-update errors; rows retry once on a fresh page ("passed on retry" in the evidence). A run in a quiet window gives the cleanest matrix.
- **P3 · deadclick list-item@1512 "Pending invites" (2026-10-05, seen by "Token màu cho content/chữ/icon"'s gate):** the
  "Revoke invite for an.vu@dizai.studio" Button click had no visible effect (no-op handler or a race); not caused by the
  tone change, example not touched.
- **P3 · Colour Light text contrast (2026-10-05, "Token màu cho content/chữ/icon"):** on white (light mode) these Light levels
  are under 4.5:1: Positive/Green 3.97, Orange 3.69, Teal 3.64, Cyan 3.52, Golden 3.49 (Negative/Red 5.06 and Info/Blue
  4.87 pass). Small help text in them (Input success help uses positive-light) misses AA. Decide: Base for small help
  text in those families, or accept for short status lines.
- Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1) for the Open navigation part (see the app-shell line above); the example-content ⚠ below stay open. Batch 3 note: app-shell "Activity, new" is a probe-order artifact, not a dead handler — the behaviour pass clicks the Sidebar's Activity first, so the bell then opens the page already shown (from People it navigates and clears the dot); fix in the probe (reset between clicks) if it keeps flagging. Was: P2 (2026-10-05, gate .qa/reports/2026-10-04T20-04-34-28eea406.md, found by "Dark/light mode sync và UI present", not from
  its change): app-shell "Narrow window" example (`examples/pages/app-shell.tsx` `<StudioApp narrowWindow />`): the
  "Open navigation" menu button (aria-haspopup=dialog) opens nothing on click or Enter, at 1100 and 900 px windows
  (behaviour ✗ apg + ⚠ deadclick). Same run, example content: ⚠ deadclick app-shell "Activity, new", chat "Hana Kim" inbox
  row; ⚠ rhythm 8 text styles in HR templates; button "Approve on a phone" "Chi Tran" heading-4 not a heading; button
  "Hand off when ready" Stack gap 2px; templates behaviour exceeded its 90 s budget.
- P2 (2026-10-05, session "Studio builder tool planning", WP-E follow-ups, for GĐ4): option labels in Figma words (Size shows "md", Figma "Medium (Base)"; `figmaProps.generated.ts` already holds Figma option → code value) need a PropField change; nested groups (Figma layers) exist for TopNavigation only — the generated groups have none; icon-presence toggles start from a fixed icon (Button Leading-Icon → icon-check-line).
- P3 (2026-10-05, Studio builder session): on a selected Box (layout primitive with slots) the SlotLayer "+" chip sits
  on the selection's size pill ("28 × 28") below small layers, so the size is hidden (`slots/SlotLayer.tsx` chip vs
  `.studio-resize__pill`).
- P3 (2026-10-05, gate .qa/reports/2026-10-05T07-49-39-28eea406.md, backlog batch 3, not from its change): behaviour ⚠
  deadclick list-item › Pending invites "Revoke invite for an.vu@dizai.studio" is a probe artifact — by hand it removes the
  row and shows the Undo toast; the pass revoked the row above first (the list shifts, the toast may cover the next
  button). New ⚠ in the same run, not from it: card › playground Spacing=small corners (Card 16 vs platform-slot 12 + 16).
- P3 (2026-10-05, gate .qa/reports/2026-10-05T09-47-59-28eea406.md, backlog batch 6, not from its change): usage ⚠
  `src/platform/PlatformExamples.tsx:635` avatar/solid-initials-contrast (white initials on Solid green in a playground);
  the same run saw one file rendering from an unsaved Studio draft on 5173 (gone a minute later, not this session's).
- P3 (2026-10-05, seen in the 390 contact sheets of session 2984c6e6, not from its token change): Table at 390 cuts the
  Assignee column without an ellipsis — Badge › Task status ("Em I", "Alex") and Button › Page actions ("Chi Trar", "Bao Ngı").
- P3 (2026-10-06, session "Canvas và surface mặc định", usage rules §16): **audit check for the default pairing** —
  proposal, needs the user's OK and the tools/qa owner: in `tools/platform-audit/audit.mjs`, warn on a Surface/Default
  box whose backdrop is the Canvas/Default stage and that carries a closed border or a drop shadow, outside phones,
  shells, Surface-in-Surface, clickable (`data-interactive`) and selected cards. Today §16 is documented only.
- P3 (2026-10-06, same session): **playground stages** still paint Neutral/Pale
  (`.platform-example-panel--stack > .platform-input-preview`, platform.css ~369; `.platform-example-row` beside it):
  decide whether playgrounds follow §16 (Canvas/Default) like the example stages.
- P3 (2026-10-06, same session): **phone screens** paint Surface/Default (PlatformPhone), a white page, so cards in
  phones keep §11 borders (card Choose on a phone, progress Loyalty stamps, metric Drill in on a phone): decide whether
  phone examples should default to Canvas/Default too.
- P3 (2026-10-06, same session): **elevation in shells** — alert-banner Billing card (`alert-banner.tsx` ~134,
  theme border) and breadcrumbs Top bar trail card (`breadcrumbs.tsx` ~201, theme border) sit in AppShells on
  Canvas/Default: check each Sidebar's style; a shadowed Sidebar means Shadow cards (elevation follows the Sidebar).
- P3 (2026-10-06, same session): **Card Flat has no hover/pressed** when clickable (`card.css` only styles Border's
  interactive states), so clickable cards stay `theme="border"` under §16; a Flat interactive state would let them
  follow the default mood.
- P3 (2026-10-06, gate .qa/reports of session 7b329fe8, Sidebar width change, not from it): behaviour ⚠ deadclick
  `chat@1512` Chats inbox — clicking the selected "Hana Kim" Conversation-List row has no visible effect (the row is
  already open; likely a false positive, or the selected row should not re-announce).
- P3 (2026-10-06, Studio builder session, seen on a builder page; likely on examples too): undo of an Assets / clipboard insert does not go back to the previous selection (slot-picker inserts do, `slots/actions.ts` remember); a redo within ~2 s shifts the stale selection a line, and a reload then reports "Selection lost". `edit/clipboard.ts insertCode` could remember before/after like slot inserts.
