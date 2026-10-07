# Session log — 2026-09-27

## Full platform QA pass (all component pages, mobile first)

Request: audit and QA every component page (playgrounds, examples), fix all bugs (especially mobile), compare with Figma, research and add examples, and save the process as a workflow in the skill, harness and guide.

### Tools
- `tools/platform-audit/audit.mjs` (`npm run platform:audit`, `platform:audit:full`, `--dark`):
  - DOM, a11y, overflow, contrast and targets checks;
  - a playground sweep;
  - smoke clicks on example buttons.
- New `tools/platform-audit/shoot.mjs` (`npm run platform:shoot -- <page> [--title --click --width --dark]`):
  - card screenshots plus a contact sheet per page;
  - `--compose` for Figma vs platform (output lands in `.platform-shots/`, which is gitignored).

### Component fixes
Earlier in this pass:
- Icon: per-instance SVG ids.
- DatePicker: blank days are aria-hidden, and the panels stack at 560px or narrower.
- Segmented: the option takes `aria-label`.
- Small-control 24px hit areas: Tag, Badge, AlertBanner, InlineMessage, Toast, Search, Input.
- Pagination: optional pages collapse at 480px or narrower, and the bar wraps.
- AlertBanner: a Medium banner puts its action on a new line at 480px or narrower.
- BottomNavigation: Figma selection defaults, a glass pill, and idle Strongest.
- BottomSheet: initial focus goes to the sheet.
- Chat:
  - conversation list per Figma 6331:34480, including call states, 40px avatars and the unread dot;
  - composer: "Aa", emoji, label;
  - `margin-top:auto` thread anchoring.
- AiChat: `sm` action buttons.
- Checkbox: indeterminate shows the mark.
- Progress: `scale="quota"`.
- Tabs: `fullWidth` makes items equal width.

Today:
- `ChatMessage failed/onRetry` shows "Not delivered · Retry" (role=status).
- bottom-sheet.css: vertical actions use `flex: 0 0 auto`. `flex: 1` collapsed them to about 20px in a column.
- bottom-sheet.css: `.zen-bottom-sheet__body > .zen-input-field { align-self: stretch }`. Fields hugged their content in the flex column, because input-field is `align-self: start` for grids.

### Example fixes
- Progress code sample had a duplicated `scale="quota"`.
- The Progress guideline "Do" visual (Storage 92%) lacked `scale="quota"` and rendered green.
- "2 address needs fixing" now uses `plural()`.
- Removed the duplicate Segmented "Icon-only view switch"; "View switcher" covers it with `aria-label`.

### New examples
- Mobile: Chat "Failed to send", AI Chat "Error and retry", Chart "No data yet", Bottom Sheet "Long content".
  - The Figma ❖ Chat (389 text layers) and ❖ AI-Chat pages have no failure or retry state, confirmed by a read-only use_figma search.
  - These states are therefore composed from existing Figma components: a Negative Caption line with a Retry button, InlineMessage Negative, and EmptyState. They follow common messaging patterns (iMessage/WhatsApp "Not delivered", assistant "Try again").
- Desktop: Button "Mobile footer CTA", Card "Pricing plans", List Item "Grouped sections", Chip "Mobile filter row".

### Harness (99 rules) and guidelines
- New rules:
  - `progress/quota-scale`
  - `segmented/icon-only-needs-name`
  - `color-selector/token-values`
  - `icon/size-token` (a non-token `size="small"` rendered a huge SVG)
  - `copy/plural-count`
  - CSS `layout/scroll-anchor-flex-end`
- `button/filter-is-chip` was extended to cover "Filters"/"All filters" labels and filter icons.
- The fixtures were extended; the selftest passes.
- Guidelines were updated for button, chip, segmented, checkbox, tabs, progress, alert-banner, pagination, card, list-item, color-selector, icon, badge, bottom-navigation, bottom-sheet, chat and ai-chat, plus the keyboard map.

### Docs and skills
- `docs/qa/platform-audit.md`: the QA workflow, the list of known visual failure modes, accepted warnings and Figma-side issues.
- `docs/guides/example-patterns.md`: coverage matrix, mobile and desktop patterns, copy, composition, a11y, CSS naming, code samples.
- Skills:
  - `skills/zen-platform-qa` is new.
  - `zen-component-usage` gained an example-authoring section.
  - `zen-figma-component-audit` gained screenshot parity and stale-contract re-extraction.

### Handed to peers (not edited here)
- ListItem title lacked `white-space: nowrap`, so titles wrapped instead of truncating. Fixed by the Sidebar session.
- Table right-aligned cells wrapped ("4.2 / MB"). Fixed by the Sidebar session; these cells are now nowrap and the table scrolls.
- AiChatField placeholder wrapped in narrow columns. Fixed by "Tiếp tục công việc": the placeholder is now a one-line truncating overlay (aria-hidden; the textarea keeps its aria-label). Verified at 390.
- Setting `nowrap` on the ListItem title made `.zen-list` (min-width:auto) push stages wider, causing 11 overflow errors at 390px. `.zen-list { min-width: 0 }` was added by the Sidebar session; the re-audit is clean.
- The new `PlatformPhone` (device presets, scaling, Dynamic Island) drew the status bar over the Top Navigation. "Tiếp tục công việc" fixed it: Top/Bottom Navigation, Bottom Sheet and the Chat composer now pad by `--zen-safe-area-*`. Verified with platform:shoot at 390.
- A stray `}` in `TopNavCollapseExample` (PlatformMobileShowcases.tsx:36, from a concurrent edit) made Vite return 500 for every page importing the mobile examples. Fixed; tsc and the mobile-page audit are clean.
- Emoji false positives in the audit contrast check were fixed in `audit.mjs`. `shoot.mjs --dark` now clicks the platform "Dark mode" toggle.

### Final checks
- tsc passes.
- usage:check and usage:selftest pass (100 rules).
- guidelines:check passes (49 components).
- figma-contract run-all is green.
- platform:audit:full (1512/1024/390 + smoke, 147 runs): error-free except the transient top-navigation@390 overflow from the PlatformPhone rewrite, which is clean on re-run with playground and smoke.
- Dark run: clean after the `.zen-list` fix.

### Accepted / Figma-side
- Palette contrast: white on Solid Accent/Positive/Support; initials on solid Avatars; BottomNavigation Default idle labels (Content/Placeholder, 1.92:1).
- ~~FileIcon `Format=Photo` in Figma is a copy of PDF.~~ Fixed in Figma and re-synced (see below).

## FileIcon re-sync with the updated Figma `icon-media-file` (5727:22537)

The designer updated the set, and a read-only use_figma export shows that 5 of the 10 formats changed:
- **Doc, PDF, Photo:** new rounded-square base, the same as Music/Sound/Record, instead of the folded-corner page. New glyphs; Photo (6220:58285) now has its own image glyph instead of the PDF copy.
- **Video, Music:** new glyphs.
- **Zip, Sheet, Sound, Record, Figma:** unchanged.
- Colours are unchanged: Base = Content/Support/<tone>/Light (Figma: Background/Support/Violet/Solid), glyph = Content/On-Colors. Photo stays Red.

Method:
- Hash each exported SVG path in Figma and in `fileIconData.ts`.
- Rewrite only the paths that differ, then confirm all 10 formats hash-equal to Figma.

Verified:
- tsc passes.
- Rendered all 10 formats next to a Figma screenshot of the set; they match.
- The Uploader row `hero-banner.png` now shows the Photo icon.

## TopNavigation trailing spacing: Comfortable vs Compact (Figma 12014:45167)

A read-only Figma inspection covered all 20 variants plus the `.Primitives/Mobile/Top-Navigation/Trailling` primitive.

- **Gap between trailing actions** (Trailing-Slot) depends on the action Style, not on Margin:
  - Default/Glass 44px buttons: `Navigation-Mobile/Top/Action-Button-Gap` = 8.
  - Flat 24px icons, used by Type=Compact, Compact-Alt and Compact-Overlay: `Action-Icon-Gap` = 20.
  - Both values are the same in every mode.
- **Margin** only changes the side padding:
  - Comfortable: `Margin-Comfortable` → Spacing/Padding/Large = 20 on Mobile (24 on Tablet/Desktop).
  - Compact: `Margin-Compact` → Spacing/Padding/Medium = 16 on Mobile (20 on Tablet/Desktop).
- **Bug fixed:** the code used `--zen-margin-compact` for Comfortable. That token follows `data-breakpoint`, so at the mobile breakpoint Comfortable collapsed to 16, the same as Compact.
  - Comfortable now uses `--zen-spacing-padding-large`.
  - Trailing gaps now use `--zen-navigation-mobile-top-action-button-gap` / `-action-icon-gap` instead of 20px and spacing-gap-xsmall.
- **Verified:**
  - Bar, large-title and leading icon positions equal Figma for Default/Compact × Comfortable/Compact at both the root and mobile breakpoints (for example Compact/Compact: bar x350, large-title x350, leading x16; icon gap 20).
  - usage:check passes; audit of top-navigation, chat and bottom-sheet is clean.
- **Tooling:** `platform:shoot --compose` labels may now contain "=" (the split is on the last "=").

## BottomNavigation: progressive blur, bottom-up (Figma 9017:26239 / 9017:42257)

The Figma root of Floating and Floating-Glass has a BACKGROUND_BLUR PROGRESSIVE effect:
- radius 24, startRadius 0;
- startOffset y=0 (top), endOffset y=1 (bottom);
- it sits under the transparent → Surface gradient.

The Default bar has no blur. The code had a uniform `backdrop-filter: blur(12px)` on the wrapper; it now mirrors the TopNavigation progressive blur:
- `<span.zen-bottom-nav__progressive>` holds 5 `<i>` layers masked `linear-gradient(0deg, …)` in 20% bands, each `blur(var(--zen-bottom-nav-blur) / √5)`, where `--zen-bottom-nav-blur` is 12px (Figma radius ≈ 2 × CSS).
- The wrapper no longer sets backdrop-filter, so it is not a backdrop root.

Verified with a high-contrast pattern under the bar: sharp at the top edge, fully blurred at the bottom; with the layers off, the pattern stays sharp. tsc, usage:check and the audit (bottom-navigation, bottom-sheet, chat at 1512 + 390 with smoke) pass.

## TopNavigation: Search control bar folds into a trailing Search action

User request: when the control bar is a Search, collapsing on scroll adds a Search action at the top right, and it disappears when the search bar returns on scroll up.

- `TopNavigation.searchAction?: { onClick, label = "Search", icon = "icon-search-medium-line" }`. With a `controlBar` and `collapsed`:
  - the control bar is not rendered;
  - the Search action renders first in the trailing slot, with the type's action style, and `.zen-top-nav__search` enter/exit (fade + scale, `usePresence` 120ms, reduced-motion fallback);
  - it counts toward the two trailing actions.
  - Without searchAction, behaviour is unchanged.
- The "Collapse on scroll" example tapping Search scrolls the list back to the top and focuses the field once the bar is back. The playground passes searchAction when Control bar is on.
- Harness:
  - `top-navigation/max-two-trailing` counts searchAction.
  - New `top-navigation/search-folds-to-action` (warn): collapsed + Search controlBar without searchAction.
  - Fixtures added.
- Guideline: api row plus Do/Don't.
- Verified flow: expanded (bar, no action) → scrolled (bar folded, Search + New message) → scrolled up (bar back, action gone) → tap Search (top, field focused).
- tsc, selftest (103 rules), guidelines check, and the top-navigation audit (1512 + 390 with smoke) all pass.

## Rule: icon-only actions show their name as a tooltip after 1s hover

User rule: "các action, button nào chỉ dùng icon thì nên có tooltip khi hover 1s".

- **Tooltip:**
  - New `useIconTooltip(label, { placement, delay })`: `bind()` merges pointer and focus handlers into the trigger, and `tooltip` portals a fixed-position TooltipSurface through ZenPortal. It adds no wrapper element, so layout is unchanged.
  - Timing: 1s on hover, at once on focus-visible, never on touch. Escape, pointer-down, blur and scroll close it.
  - A 600ms warm window opens the next tooltip without waiting.
  - `<Tooltip>` now defaults to `TOOLTIP_HOVER_DELAY` (1000, was 400) and provides a context that silences built-in tooltips inside it (no doubles).
- **Built in:**
  - `IconButton` (`tooltip` defaults to aria-label).
  - `TopNavigationActionButton` (placement bottom), which also covers the BottomSheet close and the ChatComposer actions.
  - BottomNavigation unlabelled items and the action/FAB (`TipButton`).
  - Toast, AlertBanner and InlineMessage close; Search clear; Tag and Badge remove; icon-only Input leading/trailing slots.
  - Sidebar collapse and rail, done by the Sidebar session.
  - Chat: Send uses `useIconTooltip("Send")`, added by the Sidebar session. Emoji goes through TopNavigationActionButton; the picker "+" and the desktop hover-toolbar are IconButtons. Hover-verified: Send, Add emoji, Add attachment.
- **Harness:**
  - `icon-button/tooltip` (warn): `tooltip={false}`.
  - `button/icon-only-raw` (warn): a raw `<button>` whose only child is `<Icon/>`.
  - Fixtures added; selftest passes (107 rules).
- **Docs:** guidelines for button (api/do/dont) and tooltip (do); `docs/component-usage-rules.md` §12; the zen-component-usage skill; memory `zen-icon-tooltip-rule`.
- **Verified:**
  - IconButton: nothing at 500ms, shown at 1200ms, warm neighbour instant, focus instant, Escape closes; an AI Chat Tooltip-wrapped IconButton shows exactly one.
  - Hover sweep: one correct tooltip each on Toast, AlertBanner, InlineMessage, Tag, Badge, TopNav, BottomNav, BottomSheet, Card, Pagination and Search clear.

## Icons: phone + mobile updated from the designer's SVGs

- `icons/source/icon-phone-line.svg` and `icon-phone-solid.svg` were overwritten with the new handset glyphs.
- `icon-mobile-line.svg` and `icon-mobile-solid.svg` were added (a device outline with a home dot; solid = filled body with a knocked-out dot).
- `npm run icons:build` now generates 1594 icons (was 1592), all monochrome with `currentColor`; `icons:check` passes. The four paths match the source SVGs byte-for-byte.
- The "Mobile kit" project examples in PlatformShowcases and PlatformExamples now use `icon-mobile-line` instead of the phone handset.
- tsc and usage:check pass; audit of card and chat is clean.

## Icons: building / mail / navigator batch

- Added `icon-building-03-solid`, `icon-mail-read-line`, `icon-mail-read-solid`, `icon-navigator-line` and `icon-navigator-solid`.
- Already present and byte-identical, so unchanged: `icon-building-03-line`, `icon-compass-line`, `icon-mail-01-line`, `icon-mail-01-solid`.
- Removed the stray `icons/source/icon-building-03-line-1.svg`: it was byte-identical to the new solid, misnamed, and unused. A backup is in the session scratchpad.
- `icons:build` generates 1598 icons, all monochrome with `currentColor`; `icons:check` passes. The mail-read clipPath is kept, and Icon makes its ids unique per instance.
- All 9 rendered and checked at 64px and 20px; tsc passes.

## ChatCall: no Secondary button (Figma 6349:59813)

- The call card action was `Button appearance="main" level="secondary"`. Figma Chat/Bubble/Call uses:
  - Social: `Button/Overlay` Level=Inverse, Small, FILL ("Call back" · "Call Back" · "Call Again");
  - Business: `Button/Flat` Level=Primary, Small, only on In-Missed ("Call Back") and Out-Missed ("Send Voice"). Previously Business had no button at all.
- Code now matches:
  - `businessCallAction` label map;
  - `zen-allow-small-full-width` with the Figma reason on the FILL button;
  - a Don't line in the chat guideline.
- "Tiếp tục công việc" removed a lowercase `actionLabel="Call back"` override from the desktop example.
- Verified against Figma screenshots (Social In/Out-Missed, Business In-Missed); tsc, usage:check, guidelines:check and the chat audit (1512 + 390 with smoke) pass.
- Found while doing this: usage:check doesn't scan component JSX, so it missed this. Running it on src/components shows 8 findings, including Input's Autocomplete "Add" as Main Secondary. These went to the owners, with a proposal to scan components by default.
- Follow-up: the main session made usage:check scan `src/components/**/*.tsx` by default (stories excluded; 116 files; clean at 107 rules). Tags inside block comments are skipped, and `tabIndex={0}` / `role="button"` triggers are accepted.

## Chat examples: no locked interactions

User rule: "Các interaction của component chat nên thực hiện được ở tất cả example tương ứng. Không nên khoá."

- **Inventory before:**
  - Mobile: 17 messages, only 2–3 interactive; photos 0/2; 12 no-op handlers.
  - Playground: 0/2.
  - Desktop: 7 no-ops (file/photo open, call back, picker +, send).
- **Shared `useChatDemo()`** in `src/platform/chatDemo.tsx`:
  - `act(id, side, { kind, text, author, reply })` gives the message id, the Figma hold/hover set via `chatHoldActionsFor`, and reactions.
  - Reply → the composer's reply bar (`composerReply`) → the sent quote (`takeReply`).
  - Delete really hides the message; Copy writes to the clipboard; Call back.
  - Card, composer and header helpers.
  - `<ChatDemoNote/>` status line.
  - The main session later made "+" open the built-in ChatEmojiPicker and switched to chatReactionGlyph.
- **Wired:**
  - Mobile: Support, Group media, Hold to react, Failed to send; ConversationList items mark read/select. Composers were added where Reply needs one.
  - Chat playground.
  - Desktop: Messenger, Business, Group media, and Reply to any message (ids r1–r4 and its flow kept).
  - Thread-header IconButtons.
- **Verified:**
  - All 8 chat example cards plus the playground: every message holdable, hold layer opens, Reply bar, quote sent, Delete removes, status line updates.
  - Photos/file open, call back, header call, composer mic, desktop hover toolbar and Business file all respond.
  - No page errors; audit of chat and top-navigation (1512 + 390 with smoke) is clean.
- **Harness:** `chat/no-locked-interaction` (warn): no-op handlers on Chat components, and a ChatMessage with no hold/hover/reactions; code-sample template strings are skipped. Fixtures were updated; selftest passes (109 rules).
- **Docs and memory:** chat guideline Do; `docs/guides/example-patterns.md` §3b; memory `zen-examples-no-locked-interactions`.

## Chat top navigation (◆ Social 6353:69678)
- TopNavigation (additive): `subtitle` · `titleLeading` · `onTitleClick` · `titleLabel` → left-aligned identity (48 visual, Body/Extra/Bold + Caption/Regular Light, gap 2, padding 8/4); `trailingGroup` → the two trailing actions share one Tertiary pill 92×44 (`.zen-top-nav__group`, flat halves `data-style="flat-group"`).
- ChatAvatarGroup `size="large"` (48 frame, 32px avatars).
- New platform helper `src/platform/PlatformChatHeader.tsx` (Default · compact margin · back chevron · identity · grouped call pill) used by the mobile chat playground and the Support / Media / Hold-to-react / Failed examples.
- Verified: bar 64, back 44, identity 48, pill 92×44; hold 12/12, mobint 16/16, peer mobparity 119/119 (the group check must skip `[data-size=large]`); tsc, usage, selftest, guidelines green.

## Chat avatars: real photos + initials, no silhouette placeholders

- The user approved downloading 6 Unsplash portraits: `src/assets/media/avatar-{ava,bao,chi,duy,emi,finn}.webp`, 160×160 webp cropped to faces, about 8 KB each, credited in CREDITS.md.
- `mobilePeople` is now typed `ChatPerson`:
  - Ava, Bao, Chi, Duy, Emi and Finn have photos;
  - Gia (teal) and Hana (purple) are initials people;
  - the SVG silhouette generator is gone.
- New `avatarOf(person)` helper.
- Chat.tsx: ChatReadList and ChatAvatarGroup render initials for people without a photo; they showed "?" before.
- Examples now mix both cases:
  - the Inbox Design-team group (Chi + Gia) and a Hana row;
  - Group media: Gia's message and a read list with Gia/Hana;
  - Desktop messenger: 3 photos + 2 initials.
- Chat page: 71 avatars = 52 photos + 19 initials, 0 silhouettes, 0 "?". tsc and usage:check pass; the chat audit has no contrast findings.

## Breadcrumbs synced to Figma (4031:20161 · Item/Slot 4031:20158 · Item 292:43787)
- Item/Slot: item and chevron separator touch (gap 0); Item-List gap 3XSmall 2 between slots (was 2 + 2).
- Master Hover: the whole item takes Neutral/Flat/Hover; the Icon-Wrapper has no fill (the old Inverse/Solid wrapper is gone from Figma). Guideline "don't" updated.

## List in a Card: padding + chevron
- `.zen-card.pe-list-card` vertical padding 12 → 4 (Padding/2XSmall): rows already pad 12, so content now sits 16 from every card edge and the hover fill 4 from every edge (Settings links, Grouped sections, Drill-down…).
- List drill-down chevrons: the filled caret `icon-chevron-right-01-line` → the line chevron `icon-chevron-right-line-small` in ListItem examples, code samples and guideline visuals (Sidebar flyout chevron left to its owner).
- Follow-up: the list card is now derived from the row's hover fill — `--zen-list-inset: Padding/Small + Padding/2XSmall`, padding-block Padding/2XSmall, `--zen-card-radius: Corner-Radius/XLarge` (outer = inner Large + 4; concentric in Rounded 20/16 and Standard 16/12). ListItem guideline Do added.

## Chat: press the reactions pill to see who reacted

- Figma has no frame for this (only Reaction-Bar and Reaction/Emoji Static/Interactive/Status), so it is composed from DS parts following Messenger / WhatsApp / Slack.
- `ChatReaction.by?: ChatPerson[]`. When the pill knows who reacted (or you reacted), ChatReactions renders a button ("Reactions: …. Show who reacted", aria-haspopup=dialog) that opens the new `ChatReactorsPanel` (`src/components/Chat/ChatReactors.tsx` + `chat-reactors.css`):
  - Mobile: a Bottom Sheet "Reactions", portalled into `[data-zen-overlay-root]` with `inline` like the hold layer.
  - Desktop: a Popover anchored to the pill and portalled via ZenPortal, so the thread's scroll box never clips it; it still flips.
  - Tabs by emoji ("All 3 · 👍 2 · ❤️ 1"); List-Item rows (photo or initials · name · emoji); the "You" row reads "Tap to remove" and calls onReact(undefined).
  - The pill stops only pointerdown, contextmenu and Enter/Space/ContextMenu/Shift+F10, so it never starts hold-to-react and Escape still closes the panel.
- Examples:
  - `by` data in Group media, Hold to react (Ava ❤️ your message), desktop Group media, the desktop messenger and the playground.
  - Hold to react got 10 earlier messages so it scrolls (238px overflow).
  - useChatDemo counts your reaction on top of `by`.
- Harness: `chat/reactions-name-people` (warn: literal reactions without `by`; code samples skipped); fixtures added; selftest passes (110 rules).
- Guideline: chat api "Who reacted", a Do and an a11y line.
- Verified:
  - The mobile sheet opens inside the phone and tabs filter; desktop popover shows 4 rows, fully visible, Escape closes it.
  - The pill doesn't open the hold layer, and a long press on the bubble still does.
  - The "You" row removes your reaction.
  - Chat audit (1512 + 390 with smoke) is clean.
- Peer suites: mobint ✓, mobparity 119/119, scrollmedia 258/258, chatdesk 35/35 (updated copy), replyflow OK with NODE_PATH. hold.mjs presses the first "others" message, which is now scrolled under the header after the thread was lengthened; the script needs to target `[data-message-id="tokens"]`, and the behaviour itself was verified.

## Form · Half-Half: colour uses ColorSelector
- ModalFormWorkspaceExample: the Segmented colour picker → ColorSelector (8 Support/*/Solid swatches: indigo, blue, teal, green, orange, red, pink, purple), driving the preview Avatar theme; code sample updated. Verified click + arrow keys.

## Sidebar examples: Flat variant + realistic content
- New "Flat · knowledge base" example (`SidebarFlatExample`): Canvas/Flat page + `background="flat"`, sidebar Search filtering titles/page text/sub-pages (EmptyState when nothing matches), Favorites, Teamspaces with in-place children and a section action, Private pages, Templates/Trash/Settings footer; pages are real docs (Breadcrumbs as the eyebrow, sections, sub-page List in a pe-list-card).
- Shared page bodies for every shell: `ShellInbox` (6 messages, unread badges), `ShellAgenda` (4 meetings with attendees), `ShellDoc` (+ `ShellPage crumbs`), `ShellInvoices` (Billing table).
- Projects flyout: Calendar, Onboarding doc, a Teams section (+ action, counters) with team pages, real Inbox/Calendar/Docs/Reports pages. Workspace: Billing page with invoices, credit-card icon, per-page descriptions. Collapsed: Calendar agenda, Starred list, Inbox on the focus page, 4 reports with last-week/target values.
- Verified by click-through screenshots; `platform:audit --pages=sidebar --smoke` at 1512/1024/390: no errors (the pre-existing "A" green workspace avatar contrast warning remains).
- Sidebar search slot (Basic): `.zen-sidebar__search` gets the body inline inset (padding 0 XSmall, field width 100%) so the field lines up with the menu items (16/8); Small-Density and collapsed rules unchanged. Also fixes the docs-site sidebar search.
- Sidebar app shells (`.pe-shell--tall`) are now fixed to the viewport (clamp 520 / 100dvh−120 / 760): the Sidebar fills the height and scrolls its menu between the search and the pinned footer; the page scrolls on its own. Stacked (≤620px) shells grow again.

## Platform typography: Zen-Platform letter-spacing re-synced
- Checked rendering: bundled Inter 4 text widths match Figma within its round-up of text boxes (Label 35.2→36, Workspace 104.5→105), font-optical-sizing none + grayscale AA already in reset.css — no browser issue.
- Cause: the `.official-platform[data-typography]` override (Figma mode "Zen-Platform") only had Display-1…4; Figma now also loosens Heading-1…4 and Subheading (-0.8 / -0.7 / -0.6 / -0.5 / -0.36 vs Dashboard -0.96 / -0.84 / -0.72 / -0.6 / -0.54). Added the 5 values; platform chrome H2 24px now -0.6px, H3 20px -0.5px. Component previews keep their own data-typography.

## Desktop chat: lines only where they separate
- `.pe-chat-desktop`: kept the window Pale frame (static closed container); the list/thread split is now a vertical `<Divider>` (grid 320 · auto · 1fr, horizontal when stacked ≤760); `ThreadHeader` renders a `<Divider decorative>` under the header; removed list border-right, header border-bottom and the composer border-top. Audit chat 1512/1024/390 --smoke: no errors.

## Button states vs Figma (Tertiary Disabled report)
- Bug: Tertiary Disabled kept Shadow/Action/Tertiary (drop shadow + 20px backdrop blur) because the level rule overrides `.zen-button:disabled` at equal specificity. Figma Button/Main + Icon-Main Tertiary Disabled: transparent fill, Color/Border/Disabled, no effects. Fixed with a tertiary-disabled reset.
- New contract suites `tools/figma-contract/suites/button-main.mjs` / `button-icon-main.mjs` (Level × State, Medium, both modes) against `docs/figma-contracts/button.json` (read-only `use_figma` extraction, template + diffs). `check.mjs` gained opt-in `fxIgnoreInset` / `fxBackdrop`. Removing the fix makes the suite fail on exactly this bug.
- The suites found three more code bugs, now fixed:
  - Button/Main Pressed carried a shadow on every level (a merged selector list); Figma Main Pressed has none (Icon-Main keeps Basic).
  - Tertiary Pressed kept the blur.
  - Icon-Main Danger/Positive Secondary Pressed icon used Light instead of Base.
- Recorded as figmaExceptions (Figma-side inconsistencies, reported):
  - Surface blur differs between Main and Icon-Main.
  - Main Surface Hover binds Surface/Pressed.
  - Icon-Main Danger Disabled drops the Basic shadow the other solid levels keep.
  - Icon-Main Positive Secondary Pressed binds Positive/Flat/Pressed (lighter than Hover).
  - Icon-Main Primary Pressed icon = Content/Default vs Main Content/Pressed.
- Gates: tsc, usage:check, figma-contract run-all (all suites + 25 interactions), audit button/icon-button 1512/390 --smoke + --dark: clean.

## Overlays in examples use the preview typography (Dashboard)
- Bug: `.official-portal-root` (where ZenPortal renders Dialog, Side Panel, Toast, Tooltip, Popover, desktop reactions) sits inside `main.official-platform`, so overlays inherited the shell's Zen-Platform overrides: Dialog title TASA Explorer -0.6px, Side Panel title TASA -0.5px, avatar initials TASA.
- Fix: the portal root carries `data-typography={settings.typography}`. Measured Dialog Heading-3: Dashboard Inter -0.72px, Popular 28px -0.84px, Mobile 26px -0.78px, so it follows the chip.
- Guard: audit.mjs `typography` check (error level; one finding per overlay/preview; also runs after smoke clicks). Negative-tested: without the fix, dialog@1512 --smoke fails 9 examples and side-panel 5.
- Docs: qa/platform-audit.md, guides/example-patterns.md §7, skill zen-platform-qa, memory zen-platform-ux-decisions.

## Zen-Platform typography from the Figma export
- `.official-platform[data-typography]` in platform.css regenerated from `~/Desktop/Typography Configuration.json` (mode Zen-Platform): all 78 variables (families, sizes, line-heights, letter-spacings) instead of 11 hand-copied ones. Chrome now: H2 24px −0.48px, H3 20px −0.4px (TASA Explorer). Previews/portal root keep their own data-typography. usage + audit (breadcrumbs, sidebar, chat) clean.
- Housekeeping slip: while cleaning my own stray `Zen-DS/undefined/zp.css`, I also removed three scratch screenshots another script had written to that folder (desktop-popover2.png, phone-0.png, phone-1.png); they were untracked test outputs.

## Chat desktop hover fixes
- Reactions pill hover (chat-reactors.css): Surface/Hover is a 1% translucent tint, so the pill went see-through over the bubble ("pushed under"); now Neutral/Flat/Hover tint over opaque Surface.
- Hover toolbar on reacted bubbles (chat.css): removed the stale `data-reacted` top offset (−12px); the toolbar lives in __content, so 50% is the bubble centre. Offset now 0 for reacted and plain. chatdesk 35/35, hold 12/12.

## Chat-Control re-synced with Figma (6182:56819, Device × State)
- Desktop actions are now Button/Icon-Flat Medium: IconButton flat primary, 40px, icon 20, with its own 1s tooltip. The bar is 56 high like Figma; it was 44px Nav-Actions with a 60px bar. Mobile keeps the Nav-Action 44/24.
- Field text is Body/Base/Medium (was Regular). The caret is Color/Background/Active/Accent/Solid. State=Focused no longer restyles the field: the white fill and 1px ring are gone, matching Figma, where Focused only adds the Accent cursor. The field gets the Effect/Input backdrop blur.
- Send is Neutral/Strongest like every other action (was Accent).
- Kept: replyTo / data-replying / Escape, and the mobile Send useIconTooltip.
- Verified:
  - measured desktop bar 56, actions 40/20, weight 500, caret accent, blur 20px;
  - Figma-vs-code composite (Desktop Default/Typing, Mobile Default);
  - peer suites replyflow OK, chatdesk 35/35, mobparity 119/119;
  - audit chat/ai-chat 1512/1024/390 --smoke clean;
  - tsc, usage, guidelines rebuilt (Composer API row updated).

## Chat examples adapted per device (mobile phone vs desktop window)
- Audit of every chat example:
  - Mobile examples: phone, mobile thread/composer (bubble ≤ 244 = 220 text, photos 260).
  - Desktop examples: `.pe-chat-desktop`, desktop thread/composer (bubble ≤ 540 = 516 text, photos 400, hover toolbar).
- Fixed (component):
  - Desktop ChatMessage no longer opens the MOBILE hold layer (Chat/Mobile/Bubble/Overlay) on long-press / right-click / Shift+F10.
  - On desktop, right-click / Shift+F10 / Menu / Enter on the focused bubble opens the Hover toolbar's More menu (React when there is no More). The keyboard moves focus into the menu and Escape returns it to the bubble.
  - Desktop text is selectable again (no data-holdable). ChatHoverActions takes a controlled open state.
- Fixed (examples):
  - "Conversation list" (Figma 375px mobile rows) now sits in the phone under a compact TopNavigation "Chats", with a status line. It used to be a bare 568px list.
  - Chat playground Device=Desktop now uses the desktop examples' window: ThreadHeader with Button/Icon-Flat actions, no composer line, up to 760 wide, scrolls at ≤620. It used to be a 443px box with a composer border and no header. It also shows a desktop hint.
  - Removed the dead `.platform-chat-desktop` CSS.
- Guard: audit.mjs `device` check (error level; also after smoke clicks). Negative-tested: the bare list is flagged. The Do line is in the chat guidelines, and example-patterns §3 + qa doc are updated.
- Verified:
  - desktop right-click menu = Forward · Copy · Delete; Shift+F10 focuses the first item; Escape returns to the bubble;
  - mobile long press still opens the hold layer;
  - chatdesk 35/35, mobparity 119/119, replyflow OK, hold.mjs OK;
  - audit chat/ai-chat 1512/1024/390 --smoke clean.

## Chat hover popovers always on top
- Bug (user): with a bubble's React / More popover open, hovering another message painted that message over the popover. Cause: the popovers rendered inside the message; the hover rule (`> .zen-chat-message:is(:hover, :focus-within)` z 4, higher specificity) overrode the open message's z 5, so the later hovered message won the tie.
- Fix: both menus render through ZenPortal (z-index 1000, like the who-reacted popover). The open message keeps z 5 over hovered neighbours.
- Found while verifying, fixed in useAnchoredPosition: a portalled surface has a static <body> offsetParent, but CSS resolves top/bottom against the initial containing block. Flipped (bottom-based) popovers were measured from the body's full height and landed about 7,500px off screen. The origin now uses -scrollY/-scrollX and the documentElement client size in that case.
- Guard: audit.mjs --smoke `layer`. After a click opens a floating Popover, it hovers beside and below it and fails if anything paints over it. Negative-tested: 6 hits in Desktop support without the fix.
- Incident: the negative test's backups `Chat.bak` / `chat.bak` collided on the case-insensitive APFS, and the restore wrote chat.css over Chat.tsx (17:01). Chat.tsx was restored at ~17:03 from ~/.claude/file-history @v13 (16:10) plus the portal edit; the Sidebar session verified it. Lesson recorded in memory.
- Verified:
  - popovers portalled and on top of a hovered neighbour;
  - a flipped menu sits 4px above More;
  - Shift+F10 / Escape focus, the "+" emoji panel and Forward all work;
  - tsc clean; figma-contract all green;
  - audit chat/popover/search/input/date-picker/table/top-navigation/sidebar/chip/button at 1512/390 --smoke clean;
  - chatdesk 35/35, mobparity 119/119, replyflow, hold 12/12.
- Desktop chat: long bubbles pushed the Hover toolbar out of the thread. Desktop rows now reserve `--zen-chat-hover-room` (3 × Button/Small + gap = 104px) on the free side (you: inline-start, others: inline-end), so bubbles wrap first. Toolbar stays inside at 1512 and 1100; chatdesk 35/35.
- Reactions popover rows (chat-reactors.css): the hover/selected fill bled 4px past the row (list inset 8 → fill −4) and was cropped by the popover edge. Now list inset XSmall 8 (content 12 from the edge, aligned with the label) and the fill covers the row box (inset 0) with Corner-Radius/Base 12 = popover Large 16 − 4 padding (concentric).
- Follow-up from the new `layer` smoke check (reported by the fork session): at 390, the Sidebar WorkspaceHeader switcher popover was clipped by `.zen-sidebar__workspace-main` / `.pe-shell` overflow:hidden, so the card behind showed through. It is now portalled via ZenPortal with z-index 1000. Audit sidebar 1512/390 --smoke is clean.
- Desktop group media: removed the standalone ChatReactionPicker under the thread (read as a stray popover). Chi's message keeps static reactions (heart ×3 · like); reacting happens from the hover toolbar. Removed `.pe-chat-desktop__picker` CSS, updated description + code sample.

## Reactions Bottom Sheet: fixed half-screen height (mobile)
- User: the who-reacted sheet jumped when switching tabs (sheet heights 292 → 246 → 200). ChatReactorsPanel's mobile BottomSheet now gets `zen-chat-reactors__sheet`: height = 50% of the screen. The overlay padding (safe-area top + 12) is added back to 100% before halving. The list scrolls inside, and when there are tabs they stay sticky at the top (body padding-top moves onto the tabs). With no tabs, the body keeps its 20px padding. The desktop Popover is unchanged.
- Verified:
  - 350/350/350 in a 699px phone;
  - with a 17-row list, the tabs stay pinned at 0 and the body scrolls;
  - usage passes; chatdesk 35/35; hold 12/12.
- Notes:
  - The chat@390 smoke `edges` errors (the visible desktop "Opening … photos" note, 5px from the window edge) belong to the in-progress note-hiding change in "Tiếp tục công việc"; they were told.
  - A one-off `layer` hit did not reproduce in 2 re-runs.
  - mobparity's 5 "picker" checks now fail only because the standalone ChatReactionPicker was removed from "Desktop group media" (user request, another session). Open a picker first, or treat them as expected.

## Comfortable density: fixed px slots around token-sized content
- Scan (compact vs comfortable, 44 pages; scratchpad density.mjs) found slots hard-coded in px while their content follows Component Size tokens. Tokenised: Checkbox/Radio mark (checkbox/radio size), Chat avatar column (Image-Size/XSmall — the 8px avatar→bubble gap now holds: 24/8 → 32/8), TopNav identity leading (Image-Size/Large), DatePicker header (Button/Small), Sidebar workspace rail/tiles/action slot/default mark (Image-Size/Medium, rail = tile + 28, panel keeps 272). Rescan clean; figma-contract run-all green; usage clean.

- Breadcrumbs re-read from the live Figma file (9nZv4uW2LT21yuHabMTCh1, page ❖ Breadcrumbs 291:43327). The Item is now
  20px, hugs its content and has no padding or fill. Master shows the icon (20px) directly: no 28px Icon-Wrapper, gap XSmall.
  Hover is an absolute Hover-Base plate (Neutral/Flat/Hover, radius Small) that bleeds past the item without moving
  the layout: Sub −8/−4, Master −4 left / −8 right / −4 vertical. Code: `.zen-breadcrumb::before` carries the plate,
  which also serves as the 28px pointer target and focus ring; the list gets 4px block padding so the bleed is never clipped.
  Measured at 1512: master 20h, icon 20, plate −4/−4/−8/−4, sub plate −8/−4, Flat/Hover rgba(1,1,1,.063), separator 20 Neutral/Light.
  The 2026-09-26 note about the Master Icon-Wrapper (Inverse fill, radius 6/8) is obsolete.

## "Why doesn't h1 use Heading 1?"
- Scan of every h1 on 53 platform pages:
  - The page-hero h1 (48 pages) and the Overviews cover h1 are the platform's hero title. Figma Codebase Platform (14240:26923) draws it as TASA Explorer Black 120px, line-height 86% (78% on the cover), tracking −2% (−4% on the cover), with no text style bound. The code matches that, so it is deliberate: the tag is the page outline, the look is the hero.
  - TopNavigation's large title (h1 · Heading/1) is correct in previews. In the guideline Do/Don't stages (`.pg-example__stage`, no data-typography) it rendered in the shell's Zen-Platform typography (TASA Explorer, −0.64px). Fixed: the stage takes the preview typography via PlatformTypographyContext (now Inter −0.96px = Heading/1).
- Guard: the audit `typography` check now also covers `.pg-example__stage` / `.platform-guideline-visual`. Full audit at 1512 (61 page runs): clean.

## Button + Input/Heading vs Figma (handoff steps 1–2, Claude Code)
- Recovered state first: the Cowork handoff session's 20:31 writes (stale copies of the files it worked on; nothing else in
  the tree has that mtime) had overwritten `tools/figma-contract/cases.tsx` and `suites/button-*.mjs`,
  dropping the Medium-only Button suites (and their reported figmaExceptions) and the fork's `open` pins on the 4 Popover
  cases (Popover/Default, Search, Manual-Add-New and interactions were red). Pins restored; exceptions re-derived from
  the old suites (recovered from session 069c5be2's transcript) and re-checked against the new data (identical at Medium).
- `_button-shared.mjs` maps all six sets at every Size × Level × State: stroke = inset box-shadow ring (`strokeVia: "shadow"`,
  `fxIgnoreInset`, `fxBackdrop`), Focus-Ring is a root-level sibling (only on Focused) → `::before`, text buttons assert
  heights/offsets (XLarge: its 96px min width instead of the centred label's x), a `withIcons` case checks the icon slots
  (Figma's hidden icons keep stale x/y, so size + colour only), a third mode uses Corner Radius = Smooth.
- `check.mjs`: per-mode `radius`; `strokeVia: "mask"` + gradient paints (Overlay's 1px ring, stops compared exactly);
  `fillVia: "caret"`; figmaExceptions may pin `code`; the stroke alignment note no longer leaks into comparisons.
- Code fixes (button.css): Focus-Ring radius per size (Action/Focus-<Size>, 2XSmall → XSmall; was Focus-Medium everywhere);
  icon-only Container = Corner-Radius/Rounded on every size with a Rounded ring (user chose "circle + circular ring" over
  Figma's Focus-<Size> ring, which only matches Action/<Size>); Icon-Flat Secondary rests on Content/Neutral/Light,
  Danger/Positive stay Light on hover and use Base when pressed (were Neutral/Base and Strongest).
- Recorded Figma inconsistencies (code keeps one rule): Main Surface blur only on Pressed/Disabled, Main Surface Hover
  binds Surface/Pressed; Icon-Main Surface never blurs, Danger Disabled drops Basic shadow, 2XSmall Tertiary Disabled alone
  has Basic shadow, Positive Secondary Pressed binds Positive/Flat/Pressed, Primary Pressed icon keeps Content/Default;
  Overlay gradient ring: text White Overlay Disabled and XSmall Black Overlay Default/Disabled drop it, Icon-Overlay Black
  Overlay Disabled drops it; icon sets bind the ring to Focus-<Size> (pinned: code draws 1000px).
- Input/Heading (694:13062): the handoff's bug (sizes mapped to input sizes) was not in the code — HeadingField has used
  Heading/1–3 since v0.2.0. New suite `input-heading.mjs` (21 variants × 2 modes) found the input's −8px pad collapsing
  through the root (root 56/52/48, input not overhanging) → `.zen-heading-field { display: flow-root }`. Exceptions: five H3
  statuses use a 44px Container (−6) though padding binds 8; Chrome forces `line-height: initial` on input::placeholder
  (measured: same glyph rows as typed text). Open: Figma Inputted-Multi-Line wraps, a native input cannot.
- Negative tests: removing each fix fails its suite. Gates: run-all 23 suites + 25 interactions, tsc, usage:selftest (134),
  usage:check, platform:audit button/input 1512+390 --smoke + --dark and chat 1512 --smoke: no errors (input@390 keeps the
  pre-existing 12px label-tooltip target warning). Screens: button/input sheets, Editor toolbar in Rounded/Smooth/Luxury.

## h1 in example UIs is always Heading/1
- User: "Why doesn't h1 use Heading 1" (inside the example UIs). Figma ◇ Master-Layout (1128:29541) styles the page title as Heading/1.
- Code was off in two places:
  - PageHeader styled its h1 Heading/3 (md) / Heading/2 (lg).
  - Several examples/templates used `<Heading level={1} textStyle="Heading/3">`: appLayer layout/text, SignInTemplate. The navigation example used an h2 Heading/3 page title, and the Breadcrumbs "Page header" used a span Heading/3 while its code sample showed `<h1>`.
- Fix:
  - PageHeader: the title style follows headingLevel (1 → Heading/1, 2 → Heading/2) and the `size` prop is removed (it only chose the style); DashboardTemplate, the playground and the "Overview page" example were updated.
  - The examples/templates now use `<Heading level={1}>`.
  - Heading JSDoc.
  - Harness `heading/h1-is-heading-1` (error): a level 1 Heading / Text as="h1" / raw h1 with any other style. Fixtures added; selftest 135.
  - Guidelines text + page-header updated; guidelines/API rebuilt.
- Verified: all 20 h1 in example UIs (7 pages) are Heading/1; tsc 0; usage pass; audit of the affected pages at 1512/390 --smoke clean; templates contact sheet looked at.

## Typography › Content hierarchy (heading ladder per page type, with examples)
- Research:
  - Apple HIG (Typography: text styles form the hierarchy, emphasis via weight/"bold trait", 17pt default / 11pt minimum; Toolbars: large title at the root, collapsing to the standard title on scroll, short titles; VoiceOver: titles and headings drive navigation; SwiftUI accessibilityHeading(_:) iOS 15+).
  - Figma: Header/Dashboard Level=Master (Heading/1 title, Child-Heading, SubHeading Body/Base/Regular); ◆ HR-Platform (Heading/4 sections, Heading/Subheading card titles, Display/4 values, Body/Base row titles, Caption meta); ◆ Social (Heading/1 "Chats", Body/Base/Medium names, Caption times); Top-Navigation/Mobile (Heading/1 large title + Body/Extra/Bold bar title).
- No font sizes changed (user: "Lưu ý không sửa font size").
- Typography page:
  - New "Content hierarchy" section: a ladder table (desktop master/child, phone master/child, overlays) and 8 outline rules.
  - 5 examples, each with a live Outline readout: Master page · desktop, Child page · desktop, Master screen · phone (the large title folds into the bar title on scroll), Child screen · phone (the compact bar title names it, content from h2), Emphasis inside a level.
  - Files: src/platform/PlatformTypographyHierarchy.tsx (new) and `.pth-*` CSS.
- ChartCard: new `headingLevel` (default 3; the style stays Heading/Subheading). DashboardTemplate's Revenue card now uses h2, which fixes the only outline skip site-wide.
- Guard: audit `outline` (error) checks each example / playground preview: at most one h1, no skipped level going down, no heading larger than its parent. Full audit 1512/390: 122 runs clean.
- Docs: Text & Heading guideline Do/Don't, ChartCard API row, qa/platform-audit.md, example-patterns §7.
- Finding, not fixed (component owner): TopNavigation unmounts the large-title h1 when collapsed, so a scrolled master screen has no heading for assistive tech (the bar title is a div).
