
## List Item from Figma, second sync (session "List Item padding/gap adjustment", 2026-10-06)

User: "Tôi mới update lại trong Figma lần nữa. Update lại List Item từ Figma" ("Lần này sẽ dễ dàng hơn"). Backup:
`../backups/zen-ds-before-listitem-figma-sync2-20261006-001433.tar.gz` (174 files). Replaces the 2026-10-05 sync
(8px × Margin-Comfortable rows), which had not been committed.

- **Figma (use_figma, 4080:11700):** all ten variants padding 0 (no Device difference any more, Interactive=No · Mobile
  no longer matters); the Interactive-Background moved inside the Wrapper: absolute, x/y −12, 399×64 around a 375×40
  content row, stretch constraints, Corner-Radius/Base, fills Neutral/Flat Default/Hover/Pressed, Active/Neutral/Subtle.
  Chat/Conversation-List/List-Item instance: padding 0/16 (Margin-Compact sides), fill 12px outside → 4px from the row edge.
  Demo page "My Leaves" list (14730:79268) is stale (List padding 12/0, gap 2) — Backlog.
- **Component:** list-item.css — rows `padding: 0 var(--zen-list-inset, 0)`, fill `inset: −fill-y (inset − fill-x)`
  with `--zen-list-item-fill-x/-y` (Padding/Small) so a composition can tune it (Chat reactors sets fill-y 0 because its
  rows pad 12 vertically); hit area = the fill; List gap Medium, Large with clickable rows; bleed removed from List,
  Card, Dialog, SidePanel, BottomSheet, Layout. JSDoc, stories, harness text, guideline source, usage rules §15, brief.
- **Platform CSS:** stage List frame and `.platform-list-preview` pad Margin-Comfortable all round (radius Base + MC − 12);
  `.zen-card.pe-list-card` rule and every `pe-list-card` class removed; pth/pgv bleed lines removed; search and
  list-item scroll panes span the card padding and pad it back (+ Padding/Small above/below).
- **Examples:** mechanical recipe swap (phone blocks `radius="xl" padding="lg"`, desktop `radius="2xl" padding="xl"`),
  then a 12-agent workflow (6 fixers × page groups + 6 adversarial reviewers, a temporary geometry probe (removed
  afterwards) + contact sheets): phone lists put in the screen margin (`Box paddingX="lg" paddingY="sm"`,
  sm keeps the first fill clear of an overlay bar), Layers over photos bars padding md, templates (Mobile list Orders,
  HrShell / EmptyError side-panel lists `Box paddingY="sm"`, HR Home groups lg), stale comments rewritten, code strings
  aligned with renders where they show list containers. Probe after: 0 flush rows, 0 clipped/overlapping fills (the 25
  remaining flags are scrolled content, chip/segmented siblings, scroll panes). Review leftovers → Backlog (P3).
- **Studio Detach:** rows get no padding unless a deprecated inset; bleed note and helpers removed; selftest 2068 ✓.
- **Gate:** `npm run qa -- --only=<49 pages> --files=…` → 2 fit errors on Toggle › Show completed at 390 Comfortable
  (desktop box padding xl left the captions 8px short) → block `radius="xl" padding="lg"`, kicker lg; re-run
  `--only=toggle` PASS. Other warnings pre-existing (avatar outline, templates rhythm, card/accordion rhythm, button
  ladder + visual-heading on a Studio-detached row, known dead-click false positives).

## Breakpoint token, List Item without Device, List Box (session "List Item padding/gap adjustment", 2026-10-06 night)

User: "1. Update breakpoint tokens 2. Update lại List Item lần nữa (Không còn phân desktop mobile) 3. … Update lại Box theo
component Box có cấu trúc này (14922:75297). Dùng chung cho Mobile và Desktop. Chỉ khác value của Tokens ở các mode."
Mid-turn: "các gap giữa các item của interactive và none interactive nên đồng bộ", "Update luôn primitive của List Item".
Backup: `../backups/zen-ds-before-listbox-tokens-20261006-013637.tar.gz` (144 files).

- **Tokens:** `Breakpoint & Grids.json` → `tokens/source/figma/breakpoint-grids.json`; one new token
  `Interactive-List-Item-Radius` (Desktop Corner-Radius/Base, Tablet + Mobile Large) → `--zen-interactive-list-item-radius`;
  tokens:build (2,200 → generated), tokens:check clean.
- **Figma List-Item 4080:11700:** Device property removed (5 variants: State × Interactive); padding 0; Interactive-Background
  x/y −12 with corners bound to Interactive-List-Item-Radius. Primitives: Info-Content Content slot gap 3XSmall (Title →
  Subtitle 2px); Slot-Actions gap Small with Medium Icon-Flat (unchanged). ❖ Box page is gone; the box is
  **Component/List-Box 14922:75297** (on the List-Item page): Surface/Default, Corner-Radius/2XLarge, Container-Slot →
  Header (Card-padding-medium top/sides, XSmall bottom, gap Medium) · Body-Slot (Card-padding-medium, gap Large, List-Item
  instances) · Footer (Card-padding-medium, gap Medium); variants Header Yes/No × Footer Yes/No.
- **Code:** list-item.css — List gap Large for every row (user: same gap static/interactive), fill + hit radius
  `--zen-interactive-list-item-radius`, contents gap 3XSmall, new `.zen-list-box*`; ListItem.tsx — `ListBox` (header,
  footer, children = body, `as` div|section, ref) + JSDoc; index export; guideline source (API rows, Do), tagsFor ListBox;
  usage rules §15 + example brief: grouped-list blocks are `<ListBox>`; platform list frames = List-Box tokens.
- **Examples:** every `Box surface radius xl padding lg` / `radius 2xl padding xl` block of rows → `<ListBox>` (14 pages,
  render + code strings); desktop labels that sat above a box moved into `header` (Toggle › Show completed, Avatar ›
  Switch workspace) so label and rows share Card-padding-medium on every device; List Item page: Grouped notifications,
  Pending invites, Long file names are ListBoxes with header/footer; layout › Elevated panel boxes stay Box (they show Box
  elevation); search scroller height counts Gap/Large.
- **Slots (user: "Đừng bỏ qua các Slot của nó"):** Studio slot registry — ListItem `children` = Figma Contents#6331:289
  (content, column, own gap; no List/ListBox/overlays, no controls in a clickable row), ListBox `header` = Header-Slot
  (ghost before the body), `children` = Body-Slot (always mounted, own gap), `footer` = Footer-Slot (ghost after the body);
  palette item "List box" + preferred items per slot; detach COMPONENT_FOLDER; component-properties.json List-Item page
  re-read (Device gone, List-Box set added); figma-props map ListBox Header/Footer → toggles of header/footer, Device
  dropped from ListItem; figmaProps.generated.ts rebuilt (54 components). palette selftest --deep 1299 ✓, Studio
  selftest 2068 ✓, Studio E2E 71/1 (baseline).
- **Gate:** `--only=<56 pages>` PASS (report 2026-10-05T18-47-25), then `--pages=list-item` with the Studio files PASS
  (2026-10-05T19-08-18); sheets reviewed (list-item, templates, dialog, popover, card, button, chat). Warnings pre-existing.

## List Item 4th sync + examples into Figma (session "List Item padding/gap adjustment", 2026-10-06 night)

User: "Update lại List-Item, đọc bổ sung thêm Tokens Breakpoint. Update gap của Body-Slot của Box lên 2px", then
"Sau khi xong update Example ngược vào Figma cho List Item. Dùng Component và variables Figma tương ứng nhé".
Backup: `../backups/zen-ds-before-listitem-sync4-20261006-024258.tar.gz` (174 files).

- **Figma (live):** List-Item variants pad Spacing/Padding/Small top/bottom, 0 sides (row 64 high with a 40 avatar); the
  Interactive-Background is the row's height and 12px past it sideways. List-Box Body-Slot: padding
  List-Container-Vertical-Padding (new Breakpoint & Grids token: Small desktop, XSmall tablet/mobile) × Card-padding-medium,
  gap 3XSmall. Breakpoint collection now 11 variables.
- **Tokens:** `List-Container-Vertical-Padding` added to `tokens/source/figma/breakpoint-grids.json` (read from the live
  file; no export attached), tokens:build → 2,201, tokens:check clean.
- **Code:** list-item.css rows `padding: Small × inset`, fill-y 0 (fill inset 0 vertically), hit area −12px; List gap
  3XSmall; `.zen-list-box__body` padding `--zen-list-container-vertical-padding` × card padding, gap 3XSmall. Chat
  reactors' row-padding override removed (now equal to the default). JSDoc, guideline source, harness text, usage rules
  §15, brief, Studio Detach (`paddingY sm`, selftest 2068 ✓). Platform list frames pad the List-Box body tokens.
- **Examples:** fill-clearance spacing from the previous spec reverted (kicker → rows sm → xs on dock-icon, link, search,
  badge, action-bar, page-header, HR Home/Tasks); phone list wrappers `paddingY sm → xs` (17 sites, = mobile
  List-Container-Vertical-Padding); chat panes and search/list-item scrollers drop their 12px vertical padding; Layers over
  photos bars `paddingX md paddingY 2xs`; "no padding of their own" comments now say "at the sides" (32 files).
  Probe: 0 flush rows, 0 clipped fills; remaining flags are known false positives.
- **Figma examples:** ❖ List-Item page › Body › "Examples" (14975:621) with five cards built from components and
  variables: People directory (Card ×2, Search, Chip/Advanced, List-Item rows, Avatar photos from existing image
  hashes, Description List, Dock-Icon + Badge rows, Button/Main), Pending invites (List-Box Header+Footer, Icon-Flat
  actions), Long file names (List-Box, icon-media-file 40px = Image-Size/Medium), Grouped notifications (2 List-Box with
  Header-Slot titles, Badge New), Settings on a phone (390 frame in Breakpoint & Grids › Mobile, Top-Navigation Alt,
  List-Box groups). Fills/paddings/radii bound to variables, text in local text styles (Inter). Notes: the List-Box master
  has a FIXED height (instances need Hug) and its Header/Footer slots centre their content (examples override to left).

## Card → ListBox for List-Item containers (2026-10-06, session "List Item padding/gap adjustment")

User: "check every example and playground using List Item: instead of Card use Box" → clarified "List Box only for the
things that contain List-Items; every other component keeps Card", and the phone Details (a Description List in a
ListBox) "should be a Card".
- Rule applied: a Card whose content is one List of ListItem rows (+ optional title/search/filters → `header`,
  buttons/pagination/footnote → `footer`, EmptyState/Skeleton in place of the list → body) became `<ListBox>`. Cards where
  rows are one section among Tabs / Description List / forms / Stepper / Table, and Card's own page, stay Cards.
- Reverted to `Card theme="flat"`: ListBoxes holding non-rows (avatar Details, layout task details, app-shell project
  details + notification toggles, toggle phone settings).
- Inventory: 75 Card-with-ListItem renders in 38 example pages (+ 7 in templates); the 15 in `src/platform/appLayer/*`
  are dead example code (Backlog) and were left. Six background agents converted the example pages from a shared brief;
  this session did avatar, layout, toggle, app-shell, the templates (Settings sign-in, Detail activity, Dashboard
  activity, HR Home waiting/who's out/holiday; Dashboard Active projects keeps its Card: a Table on desktop) and the List
  Item playground (now a real `<ListBox>`; `.platform-list-preview` only sets the width).
- Backups: `../backups/zen-ds-before-card-to-listbox-20261006-033734.tar.gz`, `…-extra-20261006-033936.tar.gz`.

## Phone frames in Comfortable + Mobile; Present's own modes (2026-10-06, tier S/M)

- User: "Các component size mặc định trong example của Mobile nên là ở mode Comfortable và Typography mặc định luôn là
  Mobile. Cho đổi mode riêng khi play present."
- `PlatformPhone.tsx`: new `density` prop (default `comfortable`) → `data-density` on `.platform-phone` beside the existing
  `data-typography="mobile"`; both yield to `PlatformPhoneModesContext` (exported, empty outside Present). Covers the
  50 example pages, the phone playgrounds and the Typography page; the docs chips / Studio canvas modes no longer reach a
  phone (as Typography already did). The templates page already wrapped phones in `density="comfortable"`.
- Studio Present: `Present()` keeps `own` modes (component theme, size, typography, radius, emphasis, contrast) that
  hold across ‹ › and reset when `presenting` is null; `PresentLayer` detects a phone in the stage (layout effect) and
  seeds Comfortable + Mobile, else the canvas modes; the phone gets only the picked density/typography through the
  context. `PresentBar` takes `modes` / `onModeChange` (caption "this presentation only"); `PreviewModeFields` takes
  optional `values` / `onChange` (the toolbar Modes popover unchanged). Light/dark stays the Studio's.
- Checked in the browser (own server 56201): classic List Item phone comfortable/mobile on a compact platform (Avatar
  Medium 48 vs 40); Present opens comfortable/mobile; Compact + Dashboard picks apply in Present only (canvas phone stays
  comfortable/mobile, h1 28px), hold across ‹ ›, reset after Exit. No console errors. tsc clean.
- Docs: example-patterns §2 "Khung máy", example-rebuild brief; CHANGELOG Changed. Backup
  `../backups/zen-ds-before-phone-comfortable-present-modes-20261006-035411.tar.gz`.

## DescriptionList: row actions per row, like iOS (session "Description List copy icon")

- User: "Description List vẫn còn rất weird khi lúc có icon copy lúc không đi chung sẽ làm layout lệch" (screenshot:
  Inline Message › Verify a domain, Type/Host without Copy, Value with Copy), then "Nghiên cứu thêm xem iOS làm thế nào".
- Cause: `description-list.css` gave the whole list a shared `auto` action column (subgrid) as soon as one row had an
  action, so rows without one ended short of the edge under an empty column.
- iOS: `UIListContentConfiguration.valueCell()` puts the value next to the label, trailing, inside each cell; an
  accessory (`accessoryType` / `accessoryView`, "on the right side of the cell") belongs to its cell, so only that row's
  content gets shorter (Settings › General › About mixes chevron rows and plain rows; plain values sit on the trailing
  margin). iOS has no inline copy icon in system lists: press and hold a value → Copy. Figma's
  `.Primitives/Description-List/Item` (14859:78890) is the same: Row = Content (Term · Value fill) + Action (hidden when off).
- Fix: each item is its own grid (`fit-content(50%) minmax(0,1fr)`, `+ auto` only with `data-action`), column gap moved
  onto the item; the list is one column. Stacked and divider/emphasis rules unchanged. Guideline (guidelines.source.mjs
  "Row action" + first Do) rewritten, `guidelines:build`. Measured at 1512 (own server 5176): Verify a domain Type/Host
  end at the list edge 1372, Copy icon 1372; Copy payment details all values 1340 / icons 1372 (as before); receipts on edge.
- Backup `backups/zen-ds-before-dl-per-row-action-20261006-040407.tar.gz`.

## Default pairing: Canvas/Default + flat Surface/Default (session "Canvas và surface mặc định", 2026-10-06)

User: "Tất cả example nếu không có điều kiện phối canvas và surface theo rule, mặc định nên là nền canvas-default,
surface-default (không border)", reference = Card › Workspace plan; goal: one mood AI can learn as the default.
- Rule: usage rules §16 (+ pointer in §8); brief §3 "One mood" / §3 Layers line / §5 Layers; example-patterns §3
  (pricing = Card Flat); skill zen-component-usage step 5; AGENTS.consumer rule 7; guideline source Card (use, do,
  pricing) + Background layers (do) → guidelines:build.
- platform.css: `.pe-card__stage` background Neutral/Pale → Canvas/Default; `[data-screen]` stage drops
  `background: none` (same canvas); bare-List auto-box drops its Pale border; `.pth-outline` drops its ring.
- Inventory by a DOM probe (classic UI, every page): framed/shadowed opaque boxes per example with host, phone/shell,
  data-zen-src. 40 on-stage hits → flat; phones, AppShells, clickable/choice cards (card, dock-icon, radio-button),
  the selected card, Uploader file items and chart tooltips kept.
- Edits: scratch script (line + content verified, atomic) changed 81 lines in 27 pages (render + `code` strings whose
  render was already flat: badge, date-picker, description-list, layout, toggle, card pricing/header actions, metric
  Studio overview, menu Task card); ChartCard drops `theme` (flat default); search split Box drops `border="pale"`.
  menu (Projects, Open tasks), text (Open tasks), visually-hidden (Skip link) list Cards → ListBox (the List Item
  session had reserved them; it closed before the stage change). PlatformTypographyHierarchy page cards → flat.
- Contact-sheet pass: segmented Grid or list view `Card theme="pale"` (grey on the grey stage) → flat; copy that
  still said Border fixed (chart Finance dashboard, card Workspace plan + Settings section, segmented/tabs comments);
  clickable Flat renders card Browse projects and dock-icon Choose a project type → Border (their code said Border; §16
  clickable condition). Gates: 36-page isolated PASS (.qa/reports/2026-10-05T21-21-58-7b329fe8.md), re-runs PASS.
- Coordination: waited for the List Item gate and the Mobile Comfortable gate (56201) before writing src; a
  guidelines:build at 03:51 touched the generated JSON during the List Item gate (told the peer).
- Backups: `../backups/zen-ds-before-example-canvas-{docs-20261006-035010,src-20261006-041815,listbox-20261006-042121}.tar.gz`.
- Follow-ups (BACKLOG P3): §16 audit check, playground stages, phone screens, elevation in two shells, Card Flat hover.

## ListBox `theme` (2026-10-06, session "List Item padding/gap adjustment")

User: "add elevation props to ListBox — Shadow, Pale, Border, default Flat".
- `ListBox theme` = Card's Figma Theme minus Semi-Pale, same tokens (`data-tone`; shadow-bottom-level-1-shadow, inset
  Pale ring, Support/Neutral/Pale + overlay blur); `listBoxThemes` / `ListBoxTheme` exported; `ListBox.stories.tsx`;
  List Item playground gets a "Box theme" chip; guideline API/Do/Don't + usage rules §15 (non-row blocks → Card flat)
  and §16 table (ListBox theme per condition); Studio picks the prop up from api.generated.json (no Figma property).
- Workflow `listbox-theme-sweep` (4 sweep + 4 adversarial verify + 1 critic, 0 corrections): 99 rendered ListBoxes;
  shadow beside default Sidebars (app-shell Studio app ×2, alert-banner Payment failed ×3, breadcrumbs Top bar trail ×6,
  sidebar RowCard default canvas, Dashboard/Detail/Settings templates, HR Home ×3), border on Canvas/Alt shells
  (app-shell Search in the top bar; RowCard on Alt/Flat canvases — the Card branch is gone), the rest flat.
- Gate PASS (`.qa/reports/2026-10-06T05-06-59-da70cad0.md`), 28 browser tests; sibling-Card mismatches → BACKLOG.
- Backup: `../backups/zen-ds-before-listbox-theme-20261006-114538.tar.gz`.

## Sidebar/Default-Width 240 / 260 (session "Canvas và surface mặc định", 2026-10-06 midday)

User: "Đổi giá trị các token Sidebar-Default-Width mode Compact là 240, Comfortable là 260" (was 260 / 280).
- `tokens/source/figma/component-size.json` → `tokens:build` (tokens.css 3567/3766, native packages) → tokens:check clean.
- Sidebar fallbacks `var(--zen-sidebar-default-width, 260px)` → 240px (sidebar.css ×2, platform.css ×5).
- The docs pinned `--zen-sidebar-default-width: 260px` on `.official-platform` (+ `[data-brand="zen"]`) and the Studio
  board (`.studio-world, .studio-doc__page, .studio-portal-root, .studio-present`), so examples never showed the token.
  Asked the user: "Docs nav theo token luôn" → all pins removed; docs rail = token (240 Compact, 260 Comfortable).
- Verified in the browser pane: docs nav + Sidebar playground 240 (Compact) / 260 (Comfortable). Gotcha: with the pane
  hidden the Sidebar's 0.2s width transition does not advance, so a reading right after a density switch shows the old
  width; measure with `transition: none`.
- Gate: token scope diffs tokens.css against HEAD (1106 uncommitted properties from earlier syncs) and picks ~every
  page; ran `--only=` the Sidebar pages + representative ones instead.
- Figma still 260 / 280 (live file is read-only here): HANDOFF Tokens line says keep 240/260 on the next sync.
- Backups: `../backups/zen-ds-before-sidebar-width-20261006-121553.tar.gz`, `…-platform-20261006-121758.tar.gz`.

## Sidebar rail: mark always centred (session "Sidebar rail align", 2026-10-06, tier S)

User (screenshot of HR · Public holidays, rail collapsed from the top bar): "Kiểm tra alignment sidebar khi thu gọn.
Đảm bảo luôn align center". Backup: `backups/zen-ds-before-sidebar-rail-align-20261006-122211.tar.gz`.

- **Cause:** with a custom `brand`, SidebarPanel ignored `logoCollapsed`, and the rail CSS contains the brand
  (`contain: inline-size`), so its box was 28px (HR, `width: 100%`) or 0px (Dashboard/Settings/Detail/AdminList) and
  the mark overflowed from its start: Avatar +2.0px (HR, 32px mark) and +12.0px (templates, 24px mark) right of the
  items' centre line, the workspace name clipped beside it. Items, Search and footer were already at 0.
- **Fix (`Sidebar.tsx`):** collapsed + `logoCollapsed` → the default brand's rail mark replaces the custom brand (no
  collapse control, as the brand has none). JSDoc of `brand` / `logoCollapsed` says so.
- **Fallback (`sidebar.css`, every collapsed variant):** a custom brand's root becomes a centred one-item flex row; its
  other children are visually hidden (1px clip, like the footer labels), so the name stays in the a11y tree.
- **HrShell:** module Sidebars pass `logoCollapsed={workspaceMark}` (shared with Home's rail) → 88px rail like Home.
- **Measured (classic UI, 1512):** all 11 collapsed rails on Templates — mark offset 0.00px, visible items 0.00px; HR
  rails 88px, generic templates 84px; expanded headers unchanged (name + email shown).
- **Test:** `tests/interaction/app-shell.test.tsx` "Sidebar rail mark" (logoCollapsed replaces a brand; fallback
  centres the first element and hides the name visually). Guideline: Sidebar Do line on `logoCollapsed`.
- **Spec card:** header padding Margin/Compact (20px) and gap Gap/Medium (16px) unchanged; mark 32px (Avatar Small) or
  28px default logo; no new tokens.
- **Follow-up (user screenshot, "Fix lỗi"):** HR · Home's Sidebar, opened by the top-bar toggle, had an empty 68px
  header (only `logoCollapsed`, no `brand`/`logo`) and an icon-only Apps. HrShell now shares `workspaceBrand` and
  `appsButton` (`<button><Icon/><span>Apps</span></button>`; the rail hides the span and shows the 1s tooltip, so the
  own `useIconTooltip` went). Measured: rail 88px, mark/footer 0.00px off centre, one "Apps" tooltip; expanded 240px,
  header "Đìzai Studio / hello@dizai.studio", avatar x = item icon x. Backup
  `backups/zen-ds-before-hr-home-brand-20261006-124326.tar.gz`.

## Zen Studio Design panel UI3 (session "Canvas và surface mặc định", 2026-10-06 midday)

User: the Design properties are not design friendly (many text sizes; controls hidden behind "Set fixed value");
refactor after Lunagraph; dividers between property sections; Design/Code and Pages/Layers/Assets tabs like Figma;
keep the height (not cramped). Decisions asked and answered (all recommended): edit bound values in place, group by
prop name, compact header. Spec + measurements: `docs/research/studio-design-panel-ui3-2026-10-06.md`.
- Lunagraph measured on lunagraph.com (DOM probe): one 11px size, 26px fields, 1px section dividers, Styles/Props/Code
  text tabs on a grey fill; Props tab = name column + control column.
- Code: `PropField.tsx` (editorFor shared by literal and bound-fixable values; StaticField; icon picker in a field frame;
  "None" for an unset node), `Section.tsx` (BoundMark, Body/Small hints/notes/meta), `autoGroups.ts` (new, + labelInGroup),
  `DesignPanel.tsx` (compact header, grouped sections, no bound note), `DetachAction.tsx` / `slots/RemoveAction.tsx`
  (`compact`), `Inspector.tsx` + `StudioApp.tsx` (Tabs subtle), `inspector.css` / `shell/shell.css` (static field, ƒ,
  header, tab bars, sm button labels Button-Label/XS); Caption → Body/Small and Body/Base → Body/Small in 19 panel files.
- E2E I-11 rewritten (control instead of "Set fixed value"); inspector/shell/select groups 29/29.
- Before/after: MetricCard in HR · My leaves (scratch shoot.mjs via tools/studio/e2e/lib/studio.mjs).
- Backups: `../backups/zen-ds-before-studio-design-panel-20261006-123953.tar.gz`, `…-type-scale-20261006-124811.tar.gz`.

## Sidebar sections without a title (session "Khoảng trống Report và Settings", 2026-10-06 afternoon)

User (screenshot of Dashboard's Sidebar): the gap between Reports and Settings needs a section title or a divider, or
the lone item joins the list above; then "check the other Sidebars too". Tier S.
- Cause: a `SidebarSection` without `label` after the first one renders only the 16px `.zen-sidebar__items` gap.
- Scan of every `sections` array in `src/` (templates, platform examples, appLayer, stories, Studio palette): four
  untitled later groups. Fixed: `DashboardTemplate`, `DetailTemplate`, `EmptyErrorTemplate` (Settings alone → last item
  of the main list); `hr/HrShell` `railSections` (second group → `label: "Modules"`, as App Shell › HR workspace
  already names it). The rail is always collapsed on desktop (titles hidden, gap 0), but AppShell's phone drawer clones
  it with `collapsed: false`, where the gap showed.
- Not changed, asked the user: titled one-item groups — `navigation.tsx` Link/router example "Workspace › Settings",
  `alert-banner.tsx` "Workspace › Billing", `shellScreens.tsx` People "Settings › Roles & access".
- Backup `../backups/zen-ds-before-sidebar-sections-20261006-125440.tar.gz`.

## Emoji faded in alpha text (session "Emoji mờ trong text alpha", 2026-10-06, tier XS)
- User: emoji in HR Home leave captions looked faded — Content/Neutral/Base is an alpha token and colour emoji take it.
- Fix: `templates/hr/HrHomeTemplate.tsx` leaveCaption returns a fragment with the emoji in
  `<Text as="span" textStyle="Body/Small/Regular" tone="strongest">`; `appLayer/shellScreens.tsx` HrPhoneExample
  Leave balance terms the same (kindEmoji/kindLabel). Precedent: ChatReactors' opaque emoji span.
- Probe (scratch Playwright, every page at 1512): emoji text nodes with alpha < 1 → only templates (fixed) and the chat
  docs description (Backlog). `npm run qa` PASS (warnings pre-existing: rhythm/outline on templates, behaviour timeout).
- Backup `../backups/zen-ds-before-emoji-opaque-20261006-125158.tar.gz`.


## Studio: Grid column resize + honest grid gaps (session "Search spacing collapse bug", 2026-10-06)

User (screenshot, HrLeaveTypesTemplate.tsx:251): dragging Search narrower left a large empty space but the spacing still
read 12 and could not be collapsed. Cause: Search sits in `Grid columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }}`;
the drag wrapped it in `Stack width={240}` while the column stayed 320, and SpacingLayer measured the "gap" item to item
(92px) but labelled the 12px token. Backup: `../backups/zen-ds-before-grid-column-resize-20261006-125002.tar.gz`.

- New `src/platform/studio/select/gridTracks.ts` (split/parse px tracks, columnsSource per breakpoint, columnsOp,
  DOM gridLayout/soleColumn) + `gridTracks.selftest.mjs` (36 checks, in `studio:selftest`).
- `resize.ts` AxisRule `column` + `withColumn`, plan writes the Grid (`ResizePlan.grid`); `ResizeLayer.tsx` probes the
  cell (`gridCell`), waits for the Grid's source, previews `grid-template-columns`, pill "(Grid column 1)", Fill mode.
- `spacing.ts` grid gaps from the used tracks (`gridGaps`, up to the last occupied track; packed grids only), `free`
  areas for a Zen Grid's sole-item px columns, `fitColumn`; `SpacingLayer.tsx` free tint (Warning subtle) + popover
  "Fit column to content"; `select.css`.
- Verified on a private server (5176, drafts only, discarded): Browser pane (drag → chips follow, free area + Fit) and
  Playwright probes: two quick drags (280 → 240, one ⌘Z each, no draft after two), Search not wrapped, chip gap 12.00,
  string `columns="…"` (My expenses), grid strips on 2-col, auto-fit with an empty track, 4×2 card grid.
- Not done (Backlog): a drag on an item with a Fixed width in a px column still writes that width (the edit API writes
  one element per request); the user's 5173 draft (Stack 240 in the 320 column) is untouched: ⌘Z it, or select the Grid
  and use Fit column to content.

## HR Tasks priority flags → Light (session "Search spacing collapse bug", 2026-10-06)

User (screenshot, Priority column "Medium" flag): the icon should use Light. `templates/hr/data.ts` taskPriorityMeta
tones negative/warning/info → negative-light/warning-light/info-light (Low stays neutral light); `HrTasksTemplate.tsx`
PriorityFlag renders `<Icon tone>` instead of an Icon inside `<Text tone>` (content/lights-no-light-text is about text;
Light is the icon level). Backup `../backups/zen-ds-before-priority-flag-light-20261006-133550.tar.gz`.

## Studio canvas chrome as in Figma (session "UI layout adjustments", 2026-10-06)

User (3 screenshots): the tip should be an icon without its label; the tools should float at the bottom like Figma; the
zoom pill should be smaller and float top-right. Backups `../backups/studio-before-canvas-chrome-layout-20261006-163425.tar.gz`
and `…-b-20261006-163846.tar.gz` (StudioApp.tsx).
- New `canvas/CanvasTools.tsx` (role toolbar "Tools", class `studio-canvas-tools`, bottom-centre by auto margins) and
  `canvas/CanvasChrome.tsx` (zoom + tools + tip); `Toolbar.tsx` lost the tools group (coordinated with "Xóa các divider",
  who removed the toolbar dividers at the same time); `CanvasStatus` = one "?" IconButton (tooltip = the tool's hint,
  click = shortcuts), hint kept in VisuallyHidden `#studio-canvas-status` (canvas aria-describedby); `ZoomControls`
  top-right, then (user's pick) only the XSmall "35% ▾" menu; − + fit stay in the menu and on their keys.
- First version left the pills inside `.studio-viewport` (isolated): the examples' overlay layer (z 20) covered them and
  E2E O-02 (Select while a Dialog is open) timed out. Fix: StudioApp mounts CanvasChrome after `.studio-portal-root`;
  `.studio-canvas-area[data-world-fullscreen]` hides the pills. `overlays.mjs` selectTool targets the canvas toolbar.
- Checked: `studio:e2e --only=overlays,shell` 10/10; Browser pane 1024 + 375 + dark; tooltip shows the hint.


## Studio toolbar: dividers removed (session 00ab2a58, XS)
- User: "Bỏ các divider này đi, nhìn rối". Removed the 3 `Divider`s in `studio/shell/Toolbar.tsx`; the
  `.studio-toolbar__divider` rule in `shell.css` became a 4px `margin-inline-start` at group starts (Undo via
  `.studio-toolbar__group-start`, `.studio-drafts`), so groups sit 8px apart vs 4px inside (spacing ladder).
- `studio.css` doc-mode selector no longer names the divider. Backup: `backups/zen-ds-before-toolbar-dividers-20261006-163422.tar.gz`.
- Coordinated with "UI layout adjustments" (tools → canvas pill, same files) and "Studio builder" (inspector, untouched).
- `npm run qa` PASS; Browser pane 1512: 0 separators in the toolbar.

## Studio builder plan · GĐ1 rest: Layout section (session "Studio builder tool planning", tier M)

User: "Làm các phần còn lại GĐ1". Redesign spec (docs/research/studio-inspector-redesign-2026-10-03.md) Phases 3, 4, 6.
Backup `backups/studio-gd1-layout-20261006-164055.tar.gz`.
- New `inspector/layoutModel.ts` (+ selftest 29, in `studio:selftest`): flowOps, alignView/cellOps/lane ops/autoOps/crossOps/
  baselineOps, gapOps/gapAutoOps, uniformPadding(Ops), relink, columns modes/breakpoints (setField), layoutWarnings.
- New `inspector/LayoutSection.tsx` (DesignPanel's inline LayoutSection + AlignmentGrid removed; mount keyed by selection,
  gets attributes + host); `controls/AlignmentBox.tsx` (bars, ghost, lanes, W/A/S/D/X/B/⌫, focus kept after a key
  gesture), `controls/ColumnsField.tsx` (Auto-fit/Count/Tracks, breakpoint Segmented, Same on every breakpoint),
  `controls/controls.css`; ScaleField gains `extras` (gap Auto), `leading`, `placeholder` (Mixed); PropField exports
  NumberControl; inspector.css drops the old .studio-align rules.
- Bound/spread values keep their PropField rows (edit-in-place rules of the UI3 session untouched).
- E2E: fixture GridFixture (frame 5), group `layout` L-01…L-08; baseline 79 works / 1 broken (ST-02). `npm run qa` PASS.
  Real-page probe (layout.tsx Container, FormActions): sections render, no page errors.
- Not done: Alt+pick / scrub (Phase 7), sticky moved into Layout (stays in Properties), Container max width on a
  ScaleField (5 named widths stay a select).

## Studio builder plan · GĐ1 rest: WP-B2 shared code + a DesignPanel race (session "Studio builder tool planning")

Backups `backups/studio-b2-shared-20261006-172228.tar.gz`, `backups/studio-designpanel-race-*`.
- Server: `tools/studio/shared-code.mjs` (PLAYGROUND_FILES, importersOf; selftest 4, in `studio:selftest`); `slots.mjs`
  `isSharedFile` + `sharedRefusal` (code "confirm") in applySlotOp; `jsx-source.mjs` applyOps passes `shared`, wrap/unwrap
  ask too; plugin passes `body.shared`, answers 409 `{ code: "confirm", uses, users }` (`sharedUsers` scans src/platform +
  src/templates, drafts included). slots selftest guard cases and arrange "many" case updated (1793 / 32 pass).
- Client: `types.ts` EditRequest.shared, EditResponse "confirm"; `sharedConfirm.ts` store (a yes per file per page
  load); `api.ts` sendEdit asks then resends; `shell/SharedConfirm.tsx` (Dialog theme warning = alertdialog) mounted in
  StudioApp next to SlotConfirm; `slots/actions.ts` `isSharedFile` widens canStructurallyEdit.
- Race found by AP-02 in the gate: a click right after a write landed but before the re-read was planned from stale
  attributes and dropped. DesignPanel `readEdits` + `stale()`: such a click is replanned from a fresh read.
- E2E ST-12 (StudioSaveFixture.tsx as the shared file: asks naming uploader.tsx, Cancel = no draft, yes = duplicate,
  no second question). Baseline 80 works / 1 broken. `npm run qa` PASS.

## Studio builder GĐ2 · M1: pages made in the Studio (session "Studio builder tool planning", tier L)

Spec `docs/research/studio-builder-pages-spec-2026-10-06.md` approved (Q1 gitignored folder, Q2 mock.map, Q3 blank +
device, Q4 per milestone). Backups `backups/studio-gd2-m1-*`.
- Engine without Node: `posix.mjs`, `sha1.mjs` (= node:crypto), `component-modules.mjs` (moved out of slots.mjs);
  `engine-iso.selftest.mjs` (no Node import in the 10 engine modules; shims = Node). `@babel/parser`, `magic-string` now
  direct devDependencies (lock updated offline).
- `dialect.mjs` (parsePage → neutral tree, validateDialect, newPageText, jsxText as Babel) + selftest 21; engine on
  local files: `isSlotFile`/`isAnnotatedFile`/`isDataFile` accept `local:<id>.zen.tsx`; insertChild allows `proto`
  (builder import gains it) and refuses hooks; `builder.selftest.mjs` 15 (insert/import, setProp, remove, mock row
  setDataField, proto).
- Client `src/platform/studio/builder/`: engine.ts (lazy browser-engine.mjs), localApi.ts (source/element/edit/write like
  the plugin), store/pageStore.ts, render/renderPage.tsx, proto/runtime.tsx (Board, Screen device modes, Overlay with
  its own portal), BuilderBoard.tsx (StudioFrame per Screen/Overlay, notifySourceUpdate after a render), NewPageDialog.tsx.
- Wiring: api.ts routes local files + LOCAL_SERVER; store localPage (+ session), pageKey 3rd arg, canEdit; gate local;
  navigation readLocation/openLocalPage/breadcrumbs; StudioApp canvas branch; frames.ts screen/overlay helpers; slots
  gates; picker nameOf data-zen-name (local only) + notifySourceUpdate; sourceDrafts skips local locs; PagesPanel My
  pages; PagePanel / Inspector footer / Toolbar crumbs local-aware; palette `builder` + `builderCode`; Assets codeOf.
- E2E group `builder` B-01…B-06; baseline 86 works / 1 broken. `npm run qa` PASS.

## Studio builder GĐ2 · M2: manage pages, folder mirrors (session "Studio builder tool planning", tier L)

Spec `docs/research/studio-builder-pages-spec-2026-10-06.md` §3 2c, §5 M2. Cloud container; Studio code is committed
(10b1b91), so git holds the originals (no tarball backup).
- Server: `tools/studio/pages-folder.mjs` (list / read / write / trash; id regex, no links, 2 MB, validateDialect
  before a write, atomic write, trash = move to `.zen-studio/trash/<id>-<stamp>.zen.tsx`; selftest 9). Plugin routes
  GET /pages (token), POST /pages/write + /pages/trash (admin + token); any request path containing `/.zen-studio/`
  is refused (the folder is never served as a file, `/@fs/` included). `ZEN_STUDIO_PAGES_DIR` moves the folder (the E2E
  server uses `node_modules/.cache/zen-studio/e2e-pages-<port>/pages`, emptied before and after). `.gitignore`
  `/.zen-studio/`.
- Client pure rules `builder/store/pageModel.ts` (header title rewrite, slug, id from a file name, cyrb53 hash,
  revision and Trash rules, `planSync`; selftest 32). `pageStore.ts` v2: IndexedDB version 2 with stores `revisions`
  (index page, 50 per page, one per 2-minute burst of edits or per rename/restore/import/folder change) and
  `settings`; `trashedAt` (30 days, purged on first list), rename / duplicate / import / trash / restore /
  deleteForever; a mirror interface with per-page ordered writes and `syncMirror` (folder wins a conflict, the
  browser's text kept as a revision; a page gone from the folder goes to the Trash; sync records name their mirror so a
  new folder gets pushed rather than trashed). `store/mirrors.ts`: dev mirror (api.ts `pages()` / `pageWrite()`) or a
  File System Access folder (handle in IndexedDB, Reconnect after a reload), `startPageMirror()` from StudioApp.
- UI `builder/MyPages.tsx`: My pages header (New page, options menu: Import, Trash, Sync, Link/Unlink folder), storage
  line, row menu (Rename, Duplicate, Export file, Version history, Move to Trash), Rename / Version history / Trash
  dialogs; changes need Admin. PagesPanel uses it (its ↑/↓ handler now ignores keys from menus and dialogs, which bubble
  through React portals). BuilderBoard says where the page is kept and offers Restore for a trashed page.
- Bug found by B-10 and fixed: the import handler read the input's live FileList after clearing it.
- E2E group `builder` B-07…B-13 (folder file, rename, duplicate, export → import byte for byte + invalid file refused,
  Trash → restore with the folder's trash, version history restore, a folder edit synced). Not covered by E2E: Link
  folder (File System Access has no headless picker; M4 checks the build).
