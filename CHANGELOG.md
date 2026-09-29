# Changelog

All notable changes to Zen DS. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[SemVer](https://semver.org/) (0.x: minor bumps may break).

How to maintain it:

- Add a line under **Unreleased** whenever a change touches the public API (`src/index.ts`), a component's look or
  behaviour, a house rule, a harness rule or a QA gate.
- Keep lines short and user-facing. The details (causes, measurements, test names) belong in
  `docs/context/session-log-<date>.md`.
- On release, rename **Unreleased** to the version and date, bump `package.json`, and start a new empty Unreleased
  section.

## [0.4.0] — Unreleased

Vibe-code readiness, part 2: one API vocabulary, localised labels and tooling for AI agents (branch
`feat/vibe-ready`). Renamed props stay as deprecated aliases that keep working (the harness warns); no component API was
removed (four unused colour ramps were, see Removed).

### Added
- **Language:** `<ZenProvider locale="vi">` translates every built-in label of every component (close/dismiss,
  pagination, search and pickers, rich-text toolbar, chat, uploads, screen-reader names) and date formats; built in:
  `en`, `vi`. `labels={{ … }}` overrides single strings; `useZenLabels()`, `useZenLocale()`, `zenLabels`.
- **One API vocabulary** (the names agents guess from Radix/MUI), with the old names kept as deprecated aliases:
  - `size` on every component takes the short scale (`xs sm md lg xl`) or the Figma spelling (`xsmall small medium
    large xlarge`); both render identically.
  - value controls: `value` / `defaultValue` / `onValueChange` (Tabs, Segmented, Rating, OpinionScale, NpsScale,
    Slider, ColorSelector; InputField, TextAreaField, SelectField and Search add `onValueChange(value)`).
  - boolean controls: `checked` / `defaultChecked` / `onCheckedChange` (Checkbox, RadioButton, Toggle).
  - selection: `selected` (Chip, Card).
  - icon props take an icon name (`icon="icon-plus-line"`) or a node (IconButton, Button, Tabs, Breadcrumbs, Sidebar,
    EmptyState, Stepper, SidePanel…).
  - `headingLevel` on EmptyState, Dialog/ModalForm and SidePanel; `EmptyStateAction.level`; SelectField
    `placeholder`; DatePicker `onOpenChange`; HTML attribute and `ref` pass-through on Table, Badge, Card, List,
    ListItem, EmptyState, Stepper.
- **Spellings from other libraries** are accepted (deprecated aliases unless noted; the harness warns apps):
  - overlays (Dialog, ModalForm, SidePanel, BottomSheet): `isOpen`, and `onClose` (not deprecated), called with every
    close request next to `onOpenChange(false)`. `open` is optional: a mounted overlay without it is shown, so
    `{show && <Dialog … />}` works.
  - Button `leftIcon` / `rightIcon`; Badge `color`; Toast, AlertBanner and InlineMessage
    `status="success | error | warning | info"` (→ positive, negative, warning, info).
  - icons that only come in sizes take their plain name too: `icon-search-line`, `icon-x-line`,
    `icon-chevron-left-line`, `icon-chevron-right-line` draw the Medium cut (valid `IconName`s; generated from the
    icon set, so new sized icons get one automatically).
- **Tooling for AI agents and editors:**
  - `npx zen-usage` — the usage harness for apps (checks only components imported from the package; `--json`).
  - `@zen/design-system/eslint` — the same rules in ESLint (`zen/usage`, `zen/usage-warn`; `configs.recommended`,
    `configs.standalone`).
  - `@zen/design-system/usage` — `checkSource()` for tools.
  - `zen-ds-mcp` — MCP server: setup, component docs, icon/token search, templates, `check_usage`,
    `map_figma_component` (Figma instance → Zen JSX).
  - `npx zen-ds init | doctor | check`.
- **Harness rules:** `icon/unknown-name` (suggests the closest real names, and knows other sets' words: close → x,
  gear → settings), `icon-button/needs-action`, `api/deprecated-prop`, `layout/use-stack` and `text/use-text` (the
  last three in apps only), `empty-state/way-out-tertiary`, `table/actions-flat`, `heading/h1-is-heading-1`; size
  rules read both spellings; in apps, raw elements next to Zen imports are checked too.
- **HeadingField `multiline`:** long titles wrap and the field grows with them (Figma Inputted-Multi-Line); Enter adds
  no line break and pasted line breaks become spaces. One line stays the default, for short names. HeadingField also
  reports `onValueChange(value)`.
- **Token modes from the 2026-09-28 Figma variables:** Component Theme `neutral-s4` (`componentTheme="neutral-s4"`) is
  Neutral-S1 with outlined inputs (Surface fill, Subtle border, no inner shadow), plus the token
  `Input/Border/Disabled` for a disabled field's border. Emphasis `light` (`emphasis="light"`)
  uses lighter weights (400–500) and 1px active strokes. Both are in the docs platform topbar and Storybook.
- **Docs platform:** Segmented has a phone example, "Period switch on a phone". Its four periods (This week · This
  month · This quarter · This year) are wider than the 390px screen, so the default Secondary Segmented keeps its full
  labels and scrolls sideways; an empty week shows an EmptyState. The page now has 4 examples, with states and mobile.
- **App Shell, the Figma HR-Platform pattern (◇ Master-Layout):**
  - Collapse to the icon rail from a toggle at the start of the top bar. It shows whenever the shell has a top bar
    (`sidebarToggle={false}` hides it); `sidebarCollapsed` / `defaultSidebarCollapsed` / `onSidebarCollapsedChange`
    hold the state. A Sidebar with its own `onCollapsedChange` keeps its header control instead.
  - `AppShellAction`: a top-bar icon action with an unread dot or count (99+), read out as “Notifications, 12 new”.
    `AppShellAccount`: the avatar button that opens the account Menu.
  - New slots:
    - `banner`: a full-width AlertBanner that stays in view.
    - `aside`: a docked SidePanel. It docks only while the page keeps at least 744px beside it; otherwise it opens as
      the modal panel.
    - `floatingAction`: one floating button bottom-right. The end of the page keeps room for it, so it never covers
      the last row.
  - `useAppShell()` gives your own controls the layout, the rail state and the drawer.
- **Docs platform:** the App Shell page has a new playground and 7 examples: HR workspace, Admin app, Collapsed rail,
  Drawer in a narrow shell, Banner, Flat canvas and Phone app. The four desktop templates use the new top bar:
  Breadcrumbs or a Search, notifications and the account menu.

### Fixed
- Overlays (Dialog, ModalForm, SidePanel, BottomSheet) no longer move focus back to their first field when the parent
  re-renders with an inline `onOpenChange` handler: the focus trap re-ran on every render, so typing in a second
  field of a controlled form jumped to the first one.
- A Dialog whose primary action starts disabled (Send, waiting for a valid email) now moves focus inside, to the first
  control that can take it; focus used to stay on the opener.
- `zen-ds-mcp` rejects unknown, missing or mistyped arguments; a misspelt `check_usage` argument used to come back as
  an empty, clean-looking answer.
- Templates follow their guidelines: Sidebar `selectedId`, Search `onValueChange`, two-letter avatar initials, and an
  h1 on the mobile detail screen. Docs: `locale` really switches the built-in labels; ToastStack is only for hosts
  outside a ZenProvider.
- Toggle exposed its hidden checkbox next to the switch (axe nested-interactive); Popover and ChatReactorsPanel
  lists without accessible names; the rich-text ⌘K shortcut no longer depends on the English label; SelectField
  `onBlur` fires; a consumer `aria-describedby` on fields is merged, not overwritten; `useFormState` accepts
  `interface` value types.
- Button and IconButton match Figma at every size, including the Smooth/Standard/Luxury Corner Radius modes: the focus
  ring follows each size's Action/Focus radius (every size used Medium's); IconButton is a circle with a circular
  ring in every radius mode; Flat IconButton Secondary rests on Neutral/Light, and Danger/Positive stay Light on hover
  and turn Base when pressed.
- HeadingField reports its real height again (40/36/32 for H1–H3): the input's pad collapsed through the root and
  made the field report 16px taller.
- Docs platform: every icon-only button in the examples does something (27 had no action). Sidebar "+" actions create
  the team, teamspace, project or workspace and open it; Workspace settings opens its page (a menu in the playground);
  Share copies the link; toolbar Align left toggles and Insert link confirms; Duplicate confirms in its tooltip. The
  code samples show the same handlers.
- Keyboard focus stays visible. Popover options (Select, Menu, Chip lists) show the 3px Focus/Accent ring inside the
  row: on the selected option focus changed nothing, because Selected, Flat/Hover and Flat/Pressed are the same
  alpha. An invalid field keeps its Negative border and adds the 3px focus ring; it used to look exactly like its
  resting error state (WCAG 2.4.7).
- Chat (desktop): Escape in a React or More menu returns focus to the button that opened it. After one keyboard
  opening from the message, every later menu sent focus to the message. More opened with Enter on its button now
  takes focus, and Escape on the button of an open menu closes it.
- Docs platform examples no longer lock interactions: SidePanel "Docked inspector" Width steps with ↑/↓ and +/−;
  DatePicker "Birthday" pages through months; Button "Confirm a destructive action" Cancel closes the dialog (focus
  goes to "Delete project…"); Toast "Inline confirmations" Dismiss hides the toast ("Show message again") and Upgrade
  confirms.
- Docs platform: the 22 locked interactions that `interaction/no-noop-handler` and
  `interaction/controlled-needs-handler` listed now work (`usage:check`: 0 warnings). The code samples show the same
  handlers.
  - Button "Mobile footer CTA": the Deliver to, Arrives and Pay with rows open Action sheets that change the address,
    speed (and the total) or the card. "Save for later" confirms on its button.
  - Table "Invoices with pagination": the page-size Chip picks 5, 10 or 20 rows.
  - Chart "Budget allocation": the range regroups the budget by department, category or project.
  - Chart Card chevrons open a report Side Panel.
  - AI Chat "Long prompt" sends and answers (Stop works).
  - "Quick create": the bottom bar switches tabs.
  - List rows in the Sidebar, Search, mobile and playground examples select.
- Docs platform: actions passed with no handler at all now do something visible (96 found by the harness changes
  below; code samples show the handlers).
  - Phone Back buttons go up to a parent screen whose row comes back (focus moves to the new screen); Top Navigation
    New message, Upload, Share, Notifications and Settings open sheets; Like toggles; Close viewer goes to the album.
  - Share, Invite, New project, New task, Compose and Continue with email open a one-field dialog that confirms;
    Export and Duplicate confirm with a toast; Publish toggles; Sidebar footer items open their pages.
  - KPI ⋯ and "View failed payments" open the numbers in a report Side Panel; Table Edit changes a member's role;
    AI answers' Copy confirms in place; truncated names and annotation pins pin their tooltip on click.
  - Templates: Dashboard Export, New project and Notifications work; the Admin list and Detail sidebars select.
  - Playground actions show which handler ran under the preview.
- Top Navigation: a trailing action whose label changes (a count clearing, Like → Unlike) keeps keyboard focus; the
  actions were keyed by label, so the button was remounted.
- Figma details found while moving component CSS to tokens:
  - Rating emoji: Heading/4 in its 32px slot (was 24px).
  - Slider: the Medium thumb shadow is Shadow/Neutral/Strong (was Base).
  - Chat: the status line (time · Seen) is Gap/2XSmall (was 6px).
  - Avatar: focus rings take each size's radius, so they are right in the Luxury mode.
  - Color Selector swatches and the Dialog and SidePanel header icons grow in Comfortable, as in Figma.
  - DatePicker: range ends follow the radius mode.
  - Docs platform: the topbar chips use the Shadow/Action/Tertiary effect with its backdrop blur, and example gaps and
    paddings that were off the scale (6, 10 and 20px) snap to the nearest Gap or Padding token.
- Segmented no longer squeezes its labels into each other when its options are wider than the container. On a phone,
  Templates › "Empty & error states" read "404 No resultsFirst useLoad failed". It now scrolls sideways like Tabs:
  there is no scrollbar, the segments keep their width, and the selected segment scrolls into view. `fullWidth` still
  splits the width equally.
- Segmented now scrolls the selected segment fully into view inside a scaled container too, such as the docs
  platform's phone preview. The scroll used to stop short by the scale, so the last segment stayed a few pixels clipped.
- No more dead clicks in components: a Number-only Chip without `onClick` or `selected` is a static count; with
  `showActions`, DatePicker picks are a draft that Submit applies through the new `onApply(value, range)` and Cancel
  drops (`onCancel`; new `range` / `defaultRange`, harness `date-picker/actions-need-apply`); RichTextField keeps its
  own undo history, so Undo / Redo are disabled with nothing to undo or redo and never undo another field; the quote
  of a deleted Chat message is plain text.
- **AppShell:**
  - Clicking a Sidebar section title or its "+" no longer closes the navigation drawer; picking a page does, and
    focus moves to the page instead of back to the menu button.
  - The drawer always shows the whole Sidebar, never its rail or collapse control. It gains a Close button, the page
    behind it is inert, and it animates out.
  - The skip link no longer changes the URL, so hash routers keep working.
  - The sticky top bar no longer paints over the host page's own sticky header (the docs topbar showed it).
  - In a narrow frame the examples no longer squeeze the page to a few pixels next to the Sidebar.

### Changed
- **Content hierarchy (2026-09-29, researched against 15+ design systems and WCAG):** every page and phone screen keeps
  exactly one h1 (a compact TopNavigation bar title is the h1 in its bar style, also while collapsing);
  `<Heading level>` defaults follow the ladder (2 → Heading/4, 3 → Subheading, 4 → Body/Extra/Bold); Accordion takes
  `headingLevel` (its triggers sit inside headings); an EmptyState inside a ChartCard steps below the card title; group
  labels in Menu, Popover and Select are labels, not headings; phone examples render in the Mobile typography mode. The
  hierarchy checks accept list-group kickers and h1/h2 overlay titles and no longer flag the TopNavigation bar h1.
- **Typography and colour from the 2026-09-28 Figma variables:** Dashboard and Mobile text styles have new sizes, line
  heights and tracking (Dashboard: Heading/1 28/36, Heading/3 22/28, Display/1 45/52, Caption 11/16, Label/Small 9;
  button labels are no longer tracked tighter); Popular is unchanged. In Light mode `Color/Content/Neutral/Base` text
  and the Neutral Solid hover fills are darker (Gray/11).
- HeadingField keeps its Figma height (Input/Size/Heading-H1–H3: 40/36/32, Comfortable 44/40/36) and centres the
  heading text in it; it used to take the text's line box, which is now smaller.
- Component variant attributes are `data-tone` (was `data-theme`), and Sidebar density is `data-sidebar-density`
  (was `data-density`): those names are the token mode attributes, and every variant element used to re-declare the
  component-theme variables. Styling hooks that targeted `[data-theme=…]` on a component must switch to `[data-tone=…]`.
- Inter ships as WOFF2 instead of WOFF: 771 KB instead of 960 KB for both files (normal 367 KB, italic 405 KB). The
  font tables are unchanged, so text renders pixel-identically.
- **Tokens from the 2026-09-29 Figma exports:** in component theme Neutral - S4, a selected Secondary chip now looks
  like Neutral - S1: a Surface fill with its shadow, and the solid active border at the Primary active weight (it was a
  Subtle fill with a thin Subtle border, no shadow). Small input fields match Medium ones: `Corner-Radius/Input/Small`
  is 12 / 12 / 8 / 2 px in Rounded / Smooth / Standard / Luxury (was 8 / 8 / 4 / 2).
- **Global Colors step 3 (2026-09-29 Figma export):** step 3 of every colour ramp and its Alpha twin moved (79 values;
  no token added, removed or renamed). It is a little darker in Light and a little lighter in Dark, so the Subtle
  fills, Pale borders, pressed states and disabled borders built on it read slightly stronger.
- **Dark Gray step 9 (2026-09-29 Figma export):** Dark/Gray/9 is #929292 (was #656565) and Dark/Gray-Alpha/9 is
  #FFFFFF8B (was #FFFFFF5C), from the Zen Plugin's Dark Neutral step 9. In Dark mode the Neutral solid (e.g. the
  neutral Progress circle's done ring) and `Color/Content/On-Black-Overlay/Light` are lighter; Light is unchanged.
- **Matched to the live Figma file (2026-09-29):**
  - Checkbox, Radio Button, Toggle and Table cell captions use Caption/Regular 11/16 (was Body/Small/Regular 12/16).
  - Toggle tracks size from the dot plus Spacing/Padding/3XSmall on each side.
  - Chat text bubbles keep Spacing/Gap/3XSmall between the message and its time, and cap the text at 220 / 516px
    (Mobile / Desktop).
  - Search in a popover (`variant="popover"`) keeps a 1px Input/Border stroke in every state (Input/Border/Hover on
    hover, 1px instead of 2px) and draws no focus ring. The stroke is transparent in every theme except Neutral - S4.
  - Table trend badges use the trend-up-01 / trend-down-01 / minus icons. The in-place editor pads 12 × 16, keeps
    XSmall between its tags and the input, and draws its underline inside the cell.
  - Segmented Medium badges get Spacing/Padding/3XSmall on each side.
- **Dark Alpha steps (2026-09-29 Figma export):** 69 Dark Alpha values at steps 1–9 are now bright hues at low alpha
  (most were near-opaque dark colours), e.g. Dark/Teal-Alpha/5 #003F37F5 → #00FFDB2F; step 3 moved in Orange, Yellow,
  Golden and Mint. In Dark mode the Subtle fills and borders built on them (Warning InlineMessage and Badge; orange,
  yellow and golden Avatar, Badge and DockIcon; the orange and yellow Progress ring) let the surface under them show
  through: on the canvas they look almost the same, on a lighter surface slightly lighter. Gray and Light are unchanged.
- **Dark ramps (2026-09-29, fourth Figma export):** steps 1–8 of the Dark colour ramps are a touch lighter (at most
  4/255 per channel), with small matching Alpha adjustments; Light is unchanged. In Dark mode the canvas is #121212
  (was #0F0F0F) and Surface/Default #191919 (was #1B1B1B), so surfaces stand out from the canvas a little less and
  rely more on their border; Neutral text is slightly brighter (Gray/12 #FDFDFD, Gray/11 #D5D5D5).
  - Breadcrumbs: 4px between an item and its chevron, 8px between items (was 0 and 2).
- **AppShell:**
  - The top bar follows Figma Header Type=Navigation: 72px on desktop (Margin-Comfortable above, Spacing/Padding/XSmall
    below), 8px between the toggle and the Breadcrumbs, and 12px between actions. It was 64px, centred.
  - The header content (Breadcrumbs, Search) takes a row of its own when it does not fit beside the toggle and the
    actions. A top-bar Search stops at 400px (Figma Center-Slots).
  - A collapsed rail keeps the same 24px gutter to the page as the expanded Sidebar.
  - `layout="auto"` follows the shell's own width instead of the viewport, so a shell in a split view, iframe or preview
    frame gets the drawer when it is narrower than 1024px.
  - The drawer renders next to the shell instead of in the portal: fixed to the viewport in an app, or to a preview
    frame that sets `contain: layout`.
  - A shell inside a scrolling frame can fill it by setting `--zen-app-shell-height`.
  - Templates Detail and Settings put Breadcrumbs in the top bar; the Detail page drops its PageHeader Back.

### Removed
- **Colour ramps VT, Chat, Brand-Ananas and Neutral-Ananas (2026-09-29):** 192 Global Colors primitives are gone, in
  Light and Dark and with their Alpha twins, e.g. `--zen-light-vt-9` and `--zen-dark-chat-3`. No Zen token or component
  used them. Global Colors now has 960 variables and the library 2,176.

### Quality
- **Proportional process (2026-09-29):** a tier table (XS/S/M/L) in AGENTS.md decides how much planning, QA and
  logging a change gets. `npm run qa` now checks only what changed since the session's last pass (token edits → the
  pages that use them), with `--only=` and `--keep-going`; static gates run only for what you edited and stop the run
  early on a ✗; the Stop hook asks for at most 12 new contact sheets and lets a turn end while a run is still going.
  `figma-console-extract.js` works in `use_figma` as is and adds `__HASHES(ids)`. A token-only change takes a fast
  path (tokens:check, the consumers' Figma suites, contrast and fit on the consumer pages; no behaviour, smoke or
  TypeScript): 7 pages in 138 s instead of 256 s. New label keys check only the components that read them, and
  `--all` is reserved for changes every page renders.
- Browser tests (Vitest, Chromium): every component renders in light and dark with an axe baseline that only
  shrinks; size spellings render identically; interaction tests for Menu, Dialog, Tooltip, useToast, Table,
- **Gate: parallel contract suites (2026-09-30):** every contract run builds its harness in its own folder
  (`tools/figma-contract/.out/<suite>-<pid>`); a shared one let concurrent suites load each other's cases, and 18 of 23
  failed on a token change. The gate runs 4 suites at a time (`ZEN_QA_SUITES`, one by one under `--serial`), and a
  token sync takes the fast path by itself: `tokens.css` written by `npm run tokens:build` no longer needs `--files`.
  Pagination, Accordion, Form and ZenProvider. CI workflow for every gate. Pixel-level visual diff tool for the
  docs platform.
- **Build-QA gate** (`npm run qa`; skill `skills/zen-build-qa`; `docs/qa/build-qa-process.md`): one command after
  every component, playground or example change, scoped to the files the session edited. It runs the static gates,
  the new **style guard** (`npm run style:check`: 15 rules for spacing, radius, typography, colour roles, shadows and
  slot sizes in CSS and inline styles), runtime checks for text styles, content hierarchy, token scale, concentric
  corners and Comfortable density (`platform:audit --quality --density`), dark mode, **behaviour probes**
  (`npm run platform:behaviour`: focus ring, keyboard reach, APG keys, dead clicks, hover), example coverage and
  1512/390 screenshots. Claude Code hooks lint every edit at once and hold a turn until the gate passed and its
  screenshots were opened. Pre-existing findings are baselined; only new ones fail.
- Figma contract suites for all six Button sets (every size × level × state) and Input/Heading. The checker also
  verifies radius bindings in a second Corner Radius mode, gradient strokes, and exceptions pinned to the value code
  renders.
- Harness rules from the behaviour probes: `interaction/no-noop-handler` (a no-op handler on any Zen component,
  action objects included), `interaction/controlled-needs-handler` (a controlled prop without its change handler,
  e.g. `month` without `onMonthChange`), and for CSS `focus/state-parity` (a focus selector in the same rule as its
  resting state) and `focus/selected-fill-only` (focus drawn only as a fill on an item whose selected state is a
  fill). Interaction tests for the focus fixes: `tests/interaction/focus.test.tsx`.
- Harness rule `interaction/action-without-handler` (repo examples, playgrounds and templates; apps are not judged):
  a Button or `<button>` without `onClick` / `href` / `type="submit"`, an action object (`leading`, `trailing`,
  `action`, `primaryAction`, `subAction`, `actions`, `suggestions`…) without `onClick`, and pressable `items` whose
  list has no `onSelect` / `onNavigate` / `onItemClick` / `onValueChange`. Documented defaults pass (Dialog, ModalForm,
  SidePanel and BottomSheet actions close the overlay; a Menu opens from its trigger). `icon-button/needs-action` now
  also checks IconButtons whose label is a template literal, and the usage scanner no longer reads a glob such as
  `accept="image/*"` as the start of a comment (it hid the code after it from every rule).
- Style-guard debt is paid off: `tools/style-guard/baseline.json` went from 376 findings in 32 files to 0.
  - Component CSS binds the token that the live Figma node binds.
  - Platform CSS and example inline styles use the Spacing, Corner-Radius, typography and shadow tokens.
  - Deliberate exceptions carry a `zen-allow-<rule>` reason that cites the Figma node.
  - With an empty baseline, every finding is new, so the gate reports it.
- Runtime check `fit` (`platform:audit --quality`, so `npm run qa`): text wider than its own box with no ellipsis and
  no scroll, which runs into its neighbours or is cut off. It also looks inside `overflow: hidden` ancestors, which the
  `overflow` check skips, so the Segmented that read "404 No resultsFirst use" on 2026-09-28 is now caught. With
  `--density` it also runs at Comfortable. The 24 findings already on the platform are baselined. `audit.mjs` also
  gains `--baseline-update=<kinds>` (seed one kind without touching the others) and `--css=<file>` (re-create a fixed
  bug to prove that a check catches it).
- App Shell harness rules:
  - `app-shell/primary-in-top-bar`: a Primary or Accent Button in `header` / `headerActions`.
  - `app-shell/nested`: an AppShell inside another.
  - `app-shell/breadcrumbs-once`: Breadcrumbs both in the top bar and in the PageHeader.
  - `app-shell/forced-layout`: apps only, `layout="sidebar" | "drawer"`.
  - Interaction tests in `tests/interaction/app-shell.test.tsx` (11) cover the rail toggle, the drawer (focus, Tab,
    Escape, Close, section title, choosing a page), the shell width, the skip link, the count in the accessible name
    (en/vi), the account Menu and `useAppShell`.

## [0.3.0] — Unreleased

This covers the uncommitted working tree on top of commit `eafb0de` ("Udated", 2026-09-26). `package.json` already says
0.3.0. Details are in `docs/context/session-log-2026-09-26.md` (09-26 → 09-28) and `session-log-2026-09-27.md`.

### Added — components

- **Layout and content:**
  - Divider
  - InlineMessage
  - EmptyState
  - Stepper
  - Slider
  - Card
  - DockIcon
  - List + ListItem
  - Table: sort, select, in-place editor with text/number/select/tags cells
  - DescriptionList
  - ActionBar
  - Image
  - VisuallyHidden
- **Input and feedback:**
  - Rating, RatingDisplay, OpinionScale, NpsScale
  - ColorSelector
  - Metric, MetricTrend, MetricCard
  - Uploader: FileUpload and UploaderFileItem
  - SidePanel: Standard and Modal
  - ToastStack
  - FileIcon: 10 formats from Figma `icon-media-file`
- **Mobile and conversation:**
  - TopNavigation
  - BottomNavigation
  - BottomSheet
  - Chat kit: thread, bubbles, file/call/photo cards, reactions, hold-to-react, reply, composer, conversation list,
    hover actions, avatar group, emoji picker
  - AiChat, with a thinking indicator
- **Chart:** Line, Stack bar, Card.
- **Motion:** motion tokens (`--zen-motion-duration-*`, `--zen-motion-ease-*`), shared keyframes, `usePresence`.
  SidePanel, Dialog, ModalForm and Toast animate in and out, with a reduced-motion fallback.
- **RichTextField:** rebuilt on Figma Input/Richtext. `RichTextEditorBar`, `RichTextCommand`, `RichTextBlockType` and
  `richTextBlockTypes` are exported.

### Added — props and API

- **Chat:**
  - `ChatThread device` ("mobile" | "desktop"): text max 220 or 516.
  - `ChatMessage`: `holdActions`, `onHoldAction`, `reaction`, `onReact`, `onMoreReactions`.
  - `ChatReactionPicker onMore`. Without it, "+" opens the built-in emoji picker. `ChatReactionKind` accepts any emoji.
  - `AiChatBubble`: `thinking`, `thinkingLabel`.
- **Mobile navigation:**
  - `BottomNavigation backdrop`: "surface" (default) or "none" for glass over media.
  - TopNavigation Search control bar folds into a trailing Search action.
- **Controls:**
  - `Segmented fullWidth`.
  - `Chip`: `onPopoverCreate` and `popoverCreateLabel` (Manual-Add-New).
  - `AutocompleteField`: `onCreate` and `createLabel`.
  - `PopoverItem control="checkbox"` (multi-select).
- **Metric:** `iconTheme`, `iconBackground`, `iconEmoji`.
- **Uploader:** `extended` prop and single-file mode.
- **Sidebar:** `SidebarSubMenu` flyout, `onSubMenuClose`.
- **Input:** `InputLabel labelId`. The label info tooltip is now a real `<button>`.
- **Density:** Component Size mode (`data-density` compact/comfortable) applies to every token-sized component.

### Added — package and composition layer (vibe-code readiness, part 1)

- Installable library: ESM with preserved modules, `.d.ts`, one `styles.css` (+ optional `reset.css`), `exports` map,
  React 19 peer dependency; the docs platform is no longer part of the package.
- Icons: 96 core icons render synchronously, the rest load from 256 lazy buckets; `icons/all`, `icons/names`,
  `registerIcons`, `preloadIcons`.
- `ZenProvider` (token modes, Canvas, portal root, toasts via `useToast()`).
- Props API generated from the TypeScript sources (`docs/api`, compact props in `docs/guidelines/index.json`),
  `AGENTS.md`, `AGENTS.consumer.md`, `llms.txt`, `docs/getting-started.md`.
- Composition layer: Stack, Grid, Box, Container, Text, Heading, Link, Menu, AppShell, PageHeader, Form +
  useFormState, VisuallyHidden, DescriptionList, ActionBar, Image/Thumbnail; eight page templates in `src/templates`.
- Defaults: IconButton `tertiary`, Popover closed, Sidebar without product branding and with an `aria-label` prop.

### Changed

- **Segmented:**
  - The default level is `secondary`.
  - The selected item has no hover.
- **Chip:**
  - A Chip owns a Popover only with `popoverItems` or `onPopoverCreate`. `dropdown` alone is just the chevron.
  - The caller's `aria-haspopup` and `aria-expanded` are kept.
- **Popover Item:** synced to Figma 829:20006.
  - Selected uses Active/Neutral/Subtle.
  - Avatar Small is always 32px.
  - Label and Subtext truncate to one line (a deliberate deviation from Figma).
- **Table:**
  - The `caption` is Heading/4.
  - An edit that ends refocuses the cell without a ring.
- **Figma parity passes** (size and spacing) on Chat, AiChat, TopNavigation, BottomNavigation, BottomSheet, Uploader,
  Breadcrumbs, SidePanel close and Input Read-only. Read-only fields draw a real 2/2 dashed stroke.
- **Close and dismiss buttons** are Flat Primary everywhere.
- **Shadows:**
  - Popover, Tooltip, DatePicker and the Sidebar flyout use the `-shadow-unclipped` effect (spread 0, as Figma renders
    them).
  - Subtle, Pale and Surface-Alt fills lose their outer drop shadow (house rule §9, theme-aware `-shadow-off` tokens).
- **Theme scope:** component themes follow nested `[data-theme]` scopes (build-tokens selectors).
- **Icons:** named icon sizes (`--zen-icon-size-*`) and Popover rows now follow density.

### Fixed

- **Modals:**
  - The modal Tab trap (Dialog, ModalForm, SidePanel, BottomSheet) let focus escape past roving-tabindex items.
  - Opening a Dialog whose Primary is disabled left focus outside it; Dialog now focuses its first field.
  - The AppShell drawer did not trap Tab.
- **Chat:**
  - Popup triggers announce the popup they open (listbox or dialog).
  - React and More return focus when they close.
- **Popover:** a selected item had no visible keyboard focus.
- **Pagination:** on phones it stays on one line in Comfortable density.
- **AI Chat:** answer actions wrap instead of overflowing.

- Chat File and Call text crop.
- Mobile filter row: Sort opened a stray empty Popover.
- Search example padding.
- SidePanel stretched fixed-size visuals (the Row details avatar).
- Bottom-nav blur bleeding over the device bezel.
- Reactions tab emoji rendered faded.
- ModalForm still animated under reduced motion.
- Card and Popover context menus opened far from their button.
- The Table tags cell couldn't remove a tag.
- Input Leading/Trailing slots clipped wide content.
- Sidebar workspace avatars were not square.
- Slider was not flush at 0.
- Scrims faded the panel inside them.

### Harness, QA and docs

- **Usage harness** (`tools/usage-guard`): 24 → **135 rules**.
  - Now scans CSS and `src/components/**/*.tsx`.
  - Every rule has bad/good fixtures.
- **House rules** in `docs/component-usage-rules.md` §1–§12, including:
  - §6 borders
  - §7 content colours
  - §8 background layers
  - §9 no shadow on tinted fills
  - §10 back chevron
  - §11 Surface on Canvas/Alt needs a border
  - §12 icon tooltip after 1s
- **Platform audit** (`npm run platform:audit`): `surfaces`, `edges` and `sizes` checks at error level. With
  `--smoke` they also run after every example click.
- **Guidelines:** generated for all 49 slugs, with Do/Don't visual pairs and Keyboard and API tables.

### Platform (docs site only, not part of the package)

- **Navigation and layout:**
  - Page history and deep links.
  - Responsive drawer.
  - Nav search (⌘K).
  - Sticky "On this page" pill rail with ↑/↓ section jumps.
- **Examples:**
  - At least 4 per component.
  - Example cards are equal height (subgrid) with Heading/4 titles.
  - Desktop chat examples.
  - Paginated examples carry real data.
  - Examples that are a whole desktop screen (`screen: true`) have a **Full screen** button. This covers the Sidebar
    shells, desktop chat, the docked SidePanel, desktop typography pages, App Shell and the desktop templates. Overlays
    keep working in full screen, and Escape leaves it.
- **Device simulator:** iPhone 15, iPhone 15 Pro Max and iPad, with status bar, safe areas and bezel.
- **Media:** real photos and video in `src/assets/media`; credits are in `CREDITS.md`.
- **Typography:** platform typography from `Typography Configuration.json` (platform only, not in the Zen docs).

## [0.2.0] — 2026-09-26

- Components aligned with the live Figma file `9nZv4uW2LT21yuHabMTCh1`: commit "Zen DS v0.2.0: align components with
  live Figma".
- Checkbox hover on selected and disabled boxes.
- Accordion, AlertBanner, Pagination, Skeleton and Toast, with platform pages and stories (commit `eafb0de`).
- History up to here is in `docs/context/session-log-2026-09-24.md` and `-09-25.md`.
