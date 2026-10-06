# Session log 2026-10-05

## Studio text alignment like Figma (session "Text align controls Studio tool", tier S)
User: "Các control align của text trong Studio tool nên làm giống figma". Figma UI3 Typography › Alignment: icon-only
Align left / center / right + Align top / middle / bottom (vertical only matters on fixed-height text); Justified sits in
Type settings.
- `PropField.tsx` `TextAlignControl` (Segmented sm, icon-only, icon-align-left/center/right-line, 1 s name tooltips);
  editor kind `text-align` (`propSchema.ts`), given to Text/Heading `align` by `DesignPanel` `textSpec`; row "Alignment"
  right under Style (Figma order). Unset shows the computed alignment (`textInfo.ts` `RenderedText.align`, also for an
  empty text); a click on it writes nothing.
- `text.css`: `.zen-text[data-align="start"] { text-align: start; }` (start had no CSS; no repo code writes it).
- Checks: tsc; Studio on its own 5180 (drafts per port): center/right write + canvas follows, reset removes the prop and
  the draft, inherited centre (parent style probe) shows Center as default, tooltip "Align center".
- First left for later (Backlog P3), then built below: vertical alignment, Justified, host text alignment.
- Follow-up approved ("đồng ý"): Truncate text + Max lines. Editor kind `truncate` (`textSpec`; `state` = a boolean
  useState it reads), PropField early return: switch row + `LinesControl` (NumberField min 1; stepper commits at once,
  typing on Enter/blur/arrow release). Checked on 5180: card.tsx:100 `truncate={2}` → on · 2; + → `{3}`; 1 → `truncate`;
  off → removed; back to the saved file (no draft). Playground `useState(false)` → on writes `useState(true)`, Max lines
  locked at 1 with "Bound to the on/off state {truncate}: one line when on"; switched back.
- Follow-up approved ("Làm hết nhé"): vertical alignment, Justified, host text alignment.
  Library: Text/Heading extend LayoutSizingProps (height/minHeight/maxHeight → layoutSizing; layout.css already had
  `.zen-text` height rules; inline Text turns inline-block for data-h too), `align` + "justify", `verticalAlign` →
  `data-valign` (text.css `align-content` + `-webkit-box-pack`); types TextAlign / TextVerticalAlign; guidelines:build.
  Studio: icon map + justify/top/middle/bottom (PropField); "Vertical" row (textSpec, textProps); `alignmentHint`
  (textInfo: valign, room = lines × line height vs box, inline); new `inspector/HostTextAlignment.tsx` (style textAlign /
  alignContent via setProp expression or setField; reset removes the key or the style); resize.ts: Text height handles
  + corners. Checked on 5180: playground Text H 120 → Vertical note gone, middle centres (31/31 px), Justified; drafts
  discarded. description-list.tsx:94 `<span>` → `style={{ textAlign: "center" }}`, + `alignContent: "end"`, resets back to
  `<span>Discount</span>` (no draft). `board/Present.tsx` tsc error belongs to session "Dark/light mode sync".
- Peers told: "Studio builder tool planning", "Token màu cho content/chữ/icon" (text.css). Backup:
  backups/zen-ds-before-studio-text-align-20261005-022418.tar.gz.

## Studio Properties grouped like Figma (session "Mở lại port preview", tier M)
User: "Tổ chức lại theo nhóm như Figma. Cái nào của nested nào. Cái nào thuộc component bị tắt boolean rồi thì không hiện"
(TopNavigation Properties screenshot). Figma read (use_figma, 12014:45167): variants Type/Margin/Device; booleans Top-bar,
Top-Leading, Top-Heading-Text, Top-Trailing, Expand-Heading, Expand-Trailing, Control-Bar, Status-Bar; nested
Top-Heading-Text (Sub) and Main-Heading-Text (H1–H3) exposed, Top-Trailing/Header-Trailing hold Trailing-Slot.
- `inspector/propGroups.ts`: own props, Figma booleans (a prop's presence: on = text / data-slot add / slot picker, off =
  removeProp or removeItem), nested groups with `when` conditions on rendered props; `GroupedProperties.tsx` renders them
  (fields, ObjectProperties per group, nested instances per prop); `nestedInstances.ts` = NestedProperties logic split out.
- items.mjs `removeAttribute`: an attribute alone on its line before `/>` goes with the line break (insert → remove is
  byte-identical; items selftest 13).
- Checks: tsc, Studio selftest (+ propGroups 12), browser `?ui=studio`: example groups/toggles, Expand-Trailing on/off
  (file back to disk), Top-Heading-Text off hides its group (undone), playground computed toggles read-only.
- Peers: "Nested boolean không hoạt động" owns nestedInstances write/valueFor + PropField; "Library component React code"
  edits TopNavigation (max 3 trailing) and dataSlots/registry — its live edits broke one audit run (HMR smoke errors).
- Backup: backups/studio-before-prop-groups-20261005-002855.tar.gz.

## TopNavigation slots re-read from Figma; three actions per Trailing-Slot (session "Library component React code", tier M)

User: "Đọc lại component top navigation trong Figma để kiểm tra chỗ nào có slot, bổ sung hết vào studio".
- **Figma scan** (live 9nZv4uW2LT21yuHabMTCh1, read-only `use_figma`): Top-Navigation/Mobile 12014:45167 (20 variants) has one SLOT
  property, Control-Slot#12014:37 (Control-Bar › Control-Slot, 390×48, no limits, no preferred). Its nested
  `.Primitives/Mobile/Top-Navigation/Trailling` 12013:39571 (Style Default · Liquid Glass · Flat) owns Trailing-Slot#12013:15
  (maxChildren 3, preferred-only), used twice per variant: Navigator-bar › Top-Trailing (12013:39653) and Expand-Heading ›
  Header-Trailing (12014:44753). Leading (variants Avatar/Action) and Heading-Text (INSTANCE_SWAP Leading-Swap) are not slots.
  All three slots were already in the Studio (Slots section listed Control-Slot, Top-Trailing, Header-Trailing).
- **Gaps → user's answers (AskUserQuestion):** limits (Figma 3/3, code 2/1) → "Cả hai tối đa 3 như Figma"; Control-Slot empty
  ghost covering the large title → fix now; Trailing-Slot's 7 preferred keys pointed outside the file (Nav-Slot/Action, the
  default content, not among them) → I fix it in Figma.
- **Component:** `TopNavigation.tsx` MAX_ACTIONS = 3 (bar, ActionsRoom, search fold −1), GROUP_ACTIONS = 2 for `trailingGroup`;
  `largeTitleAction?: TopNavigationAction | TopNavigationAction[]` (titleActions, Header-Trailing draws 3; a folded root puts them
  first). CSS: Header-Trailing takes the Trailing-Slot gaps (8 / Flat 20); bar grid sides `minmax(max-content, 1fr)` so three
  Tertiary actions (180px > half of 390) never overlap a long title (the title ellipsizes; centred as before while both fit).
- **Harness/docs:** `top-navigation/max-two-trailing` → `max-three-trailing` (allow `nav-trailing`; also > 3 large-title
  actions), fixtures bad/good, guidelines.source, Do/Don't visual (3 = Do, 4 = Don't: the fourth is never drawn), rule R9 in
  top-navigation-mobile-rules-2026-10-01.md, `guidelines:build`.
- **Studio:** `dataSlots.ts` form `list` (one object or an array), Top-Trailing/Header-Trailing max 3; `dataItems.ts`,
  `actions.ts`, `ops.ts`, DataSlotBlock, DataItemPanel follow it; server `items.mjs` op flag `list` (insert/duplicate beside one
  object → `[object, item]`), +1 selftest case (14). Control-Slot `ghostAnchor: { selector: ":scope", place: "after" }`
  (`slotGhostAnchor` reads `:scope` as the root) and Figma property `Control-Slot#12014:37`; SlotLayer puts such a ghost's tag
  below the strip (`data-place="below"`, slots.css).
- **Figma write (user-approved):** Trailing-Slot preferred = [Nav-Slot/Action 6340:42675]; maxChildren 3 and preferred-only kept;
  all 43 Trailing-Slots report no limitViolations.
- **Checks:** tsc; usage selftest (168 rules); guidelines:check; `node tools/studio/selftest.mjs`; palette selftest 1240 + `--deep`;
  Vitest navigation 11/11 (5 new: 3 drawn / 4th dropped, list largeTitleAction, object still works, long title clear of 3
  Tertiary actions at 390, short title centred); Studio `?page=top-navigation`: Header-Trailing add → duplicate → add (3 drawn,
  "3 of 3"), then Discard (file unchanged); ghost at 216–232 under the header (216), tag 234–250. `npm run qa` PASS twice (known
  Modal-screen placeholder contrast ⚠, Backlog P3 2026-10-04).
- Peers: "Mở lại port preview" agreed (owns inspector/propGroups.ts, uses both data slots); quiet window held for its gate.
- Backups: backups/zen-ds-before-topnav-three-actions-20261005-003903.tar.gz (+ …-slots-css-20261005.tar.gz).

## TopNavigation notification dot position (tier XS, session 89453e99, user report)
- Figma (live, read-only): Noti 6085:44062 = 8×8, 2px Outside stroke Border/Inverse, at x 26 · y 10 of the 44px
  Wrapper in every Nav-Slot/Action style (Default, Flat 12012:36257) and Nav-Slot/Visual. That is top 10 / right 10, the icon's top-right corner.
- Code had top/right 6px (Flat 8px). `.zen-top-nav__dot` now uses `--zen-navigation-action-icon-spacing-{vertical,horizontal}-padding`
  (10px). The Flat override was removed (the Flat button is still 44px with a −10px margin).
- Measured in the browser: Default 10/10, Flat 10/10, dot corner = icon corner (0,0). `npm run qa` PASS. The known
  Modal-screen placeholder contrast ⚠ is already in the Backlog.
- Backup: backups/zen-ds-before-topnav-dot-20261005-011147.tar.gz. Peer "Dual action trên top navigation Figma" was told (no overlap).

## TopNavigation dual action follows the bar style (session "Dual action trên top navigation Figma", tier S)

- Figma: Nav-Action/Icon-Main 6085:33688, Liquid-Glass 12015:46174 and Icon-Overlay 6085:33284 have `Trailing-Icon` +
  `Trailing-Icon-Src` (one pill, 92×44: padding 10, two 24px icons 24 apart); Icon-Flat 6085:32944 has none. The Button
  inside `.Primitives/Mobile/Top-Navigation/Trailling` is an exposed instance, so the boolean is always on Figma's panel.
- Code before: `trailingGroup` always drew a Tertiary pill (wrong on liquid-glass / overlays / compact), grouped the
  root's large-title action with the first trailing one and dropped a third action. Studio hid the prop below two
  trailing actions and the playground had one action and no control, so the user could not switch it on.
- TopNavigation.tsx: `trailingItems()` builds Trailing-Slot items (lead actions, then the pair, then the rest; ≤ 3
  items, Search takes one); the pair only for non-flat styles; ActionsRoom reserves the same items.
  top-navigation.css: `.zen-top-nav__group[data-style=glass|glass-dark]` = the single glass action's fill, rims, shadow
  and blur; halves tint neutral-flat (glass) / inverse-flat (glass-dark); pressed Tertiary half drops the inset border.
- Playground: "Grouped trailing" toggle adds More beside Notifications and sets `trailingGroup` (its `trailing` is now a
  conditional, so Studio shows it as computed in the playground).
- Studio: `propGroups.ts` `PropEntry.warn` + conditions `maxItems` / `oneOf`; `GroupedProperties.tsx` renders
  `.studio-group__warning` under the field (nested.css). Trailing group always shows, warns with one action or a
  compact type. propGroups selftest 14/14.
- Measured: pill 92×44, halves 44; liquid-glass bg rgba(255,255,255,.7) + blur 2px; liquid-overlay bg glass black,
  content white; compact = 3 flat buttons, no group. Guideline API row updated, guidelines rebuilt.
- Backup: backups/zen-ds-before-topnav-dual-action-20261005-011351.tar.gz.

## Studio edits keep component behaviour (session "Library component React code", tier M)

User: "Các component vẫn giữ đúng behavior của nó dù có chỉnh sửa variant và bật tắt boolean". Probe (jsx-source applyOps): a boolean
off wrote `collapsed={false}` (TopNavigation's scroll fold needs `collapsed === undefined`) and `disabled={false}`; "Checked" on an
uncontrolled Checkbox wrote `checked` (locked: `checked ?? internal`); state bound to useState read "Bound to {…}". 20 state props
have a defaultX twin in api.generated.json. User chose "Sửa trạng thái ban đầu" (AskUserQuestion).
- Server `tools/studio/jsx-source.mjs`: describeElement adds `SourceAttr.state { name, value, line }` for a bare identifier reading
  `const [x, setX] = useState(<literal>)` in an enclosing function (nearest binding wins; params/other declarations shadow); op
  `setStateInit { name, value }` replaces the literal (quotes kept) and syncs the snippet's copy of the declarator. +9 selftest checks.
- Client `inspector/writePlan.ts` (pure, shared with nested writes and builder WP-C): displayValueOf / planPropWrite / planPropReset /
  stateTwinOf / isTwinRow; DesignPanel FieldApi routes valueFor/setProp/removeProp through it, hides defaultX rows, alreadyApplied
  knows setStateInit. An unset boolean twin defaults to false (Toggle documents none).
- Canvas: Fast Refresh keeps state, so `board/remount.ts` (epoch store) remounts the frame after the edited file's vite:afterUpdate
  (2s fallback); StudioFrame keys its children by the epoch. (Found by peer "Nested boolean không hoạt động".)
- Checks: tsc; studio selftest 2288; `tests/interaction/studio-write-plan.test.ts` 8/8; Vitest 28/28; Studio `?page=toggle` "Show
  completed": Checked row editable (was Bound), on → `useState(true)` in code and snippet, canvas shows Done tasks, interact-mode
  click still toggles; Discard restored the file; remountFrame replaced the frame's DOM. `npm run qa -- --pages=toggle` PASS (plain
  `npm run qa`: "Page mapping" ✗ for Studio-only files, as HANDOFF notes).
- Peers: "Nested boolean không hoạt động" (nestedInstances.ts, PropField.tsx, propSchema.ts, api.ts hash fix) and "Studio builder
  tool planning" (WP-C) reuse writePlan/remount; told "free".
- Backup: backups/zen-ds-before-studio-keep-behavior-20261005-011306.tar.gz.

## TopNavigation grouped trailing actions + Studio drag/group (same session, user-approved, tier M)

- User: choose which actions share the pill, drag actions to reorder, drop one onto another to group. Chosen via
  AskUserQuestion: API = `group?: string` per action (runs next to each other share a pill); drag on canvas + Slots.
- Component: `TopNavigationAction.group`; `trailingItems()` builds runs (`trailingGroup` deprecated = first two when no
  action names a group); flat (compact) never pairs. Harness `max-three-trailing` counts places (good fixture added).
  Migrated: PlatformChatHeader, top-navigation example (+ code string), playground (`group: "alerts"`), removed no-op
  `trailingGroup={false}` in link.tsx (2) and app-shell.tsx.
- Server (`tools/studio/items.mjs`): `groupItem {index, with}` (moves beside the target's whole group on the side it
  came from; target's group name or a fresh slug of its label), `ungroupItem {index}` (in place at a group's end, else
  after the group), `moveItem regroup: "drop" | "tidy"`, removeItem tidies; computed groups refused. `groupedText()`
  inserts `group` after `label` (own line when fields are one per line), removes it with one comma. slots.mjs hashed
  map + selftest SLOT_OPS updated; client ops.ts types + isUnknownSlotOp.
- Client: `DataSlot.groups`, `itemGroup()` / `groupRuns()`; `editDataItem` verbs drop / group / ungroup (arrows send
  regroup "tidy"); `edit/itemDrag.ts` (edge 30% = before/after line, middle = outline + "Group with …"); SelectionLayer
  arms it after choosePart and on the selected host; DataSlotBlock: purple bracket on grouped rows, pressRow drag
  (data-drop before/after/onto), link buttons; DataItemPanel: group with before/after, take out; propGroups
  `trailingGroup` warns "Deprecated…".
- Verified on a private Studio server (5180): ungroup, canvas drop-onto (named `video-call`), Slots row reorder, add +
  canvas drag out of a group (both fields removed, code clean); draft discarded after. 5173 needs a restart for the ops.
- Backup: backups/zen-ds-before-topnav-action-groups-20261005-013805.tar.gz.

## Chat composer radius → Corner-Radius/2XLarge (XS)
- `chat.css` `.zen-chat-composer__field`: `border-radius: 20px` (raw, zen-allow-raw-radius) → `var(--zen-corner-radius-2-xlarge, 24px)`
  (Rounded/Smooth 24px, Standard 20px, Luxury 2px). At one line (40px high) the browser clamps it to a 20px pill; multi-line = 24px.
- Gate PASS (.qa/reports/2026-10-04T18-56-56-1c7e4092.md); the one ⚠ is the known chat@1512 Hana Kim deadclick (Backlog P3).
- Figma Chat-Control not touched. Backup: backups/zen-ds-before-chat-composer-radius-20261005-015618.tar.gz.

## Studio builder tool planning — plan + GĐ0 Studio E2E harness

- User asked for the Studio to work like a builder tool (every feature correct) and, later, a builder for new
  user pages saved locally. Research: 3 Explore agents (feature inventory, architecture, builder tools), 2 Plan agents,
  `editability-audit.mjs` (66% of 17,628 written props literal), live `?ui=studio` probe.
- AskUserQuestion: storage in both places (repo + deployed docs), locked props = edit at source + "Set fixed value"
  (state-bound ones follow the keep-behaviour rule), fix Studio first, prototype in builder v1.
- Plan approved: `docs/research/studio-builder-plan-2026-10-05.md` (GĐ0 + GĐ1 approved; GĐ2–5 need a spec + OK).
- GĐ0 built: `tools/studio/e2e/` (run.mjs, lib/{server,api,source,studio,matrix}.mjs, 9 scenario groups, fixtures,
  selftest, README), `src/platform/examples/e2e/StudioSaveFixture.tsx`, `npm run studio:e2e` / `studio:selftest`,
  QA gate hooks (tools/qa/lib.mjs `uiKind` "studio", run.mjs steps). Backup `backups/studio-gd0-e2e-20261005-015118.tar.gz`.
- Baseline 42 works / 23 broken in ~110 s. Real bugs the harness found beyond the plan's list: ⌘C after a canvas click
  does nothing (copy event targets `.studio-selection__capture`, clipboard.ts onCanvas), ⌘/ dead after a hot update of
  the example file (works after a reload), context menu 2/13 items off screen, two quick toggles race (I-03, flaky).
- Harness lessons: page.mouse.click ignores `modifiers`; "Used in" renders file and `:line` as two nodes; shorthand
  attrs are kind "true"; old DOM shares locs with new text (seed marker); peers' tools/studio edits restart the server
  (new token → re-ping).

## Content tones for text and icons (session "Token màu cho content/chữ/icon")

- User: the Studio Edit panel limited text/icon colours. Cause: Text/Heading `tone` had 12 values (Neutral ×3, five
  families at Base only, Inverse Strongest, On-Colors, Disabled, Inherit) of 90 Color/Content tokens; Icon had no colour prop.
- User choices (AskUserQuestion): widen `tone` with token-path slugs, old names as aliases; resting colours only (no
  Hover/Pressed/Visited/Placeholder/Overlay-Inverse Disabled); add `tone` to Icon (default = parent's colour).
- Built: `_shared/contentTone.ts` (93 values = 81 tones + 12 aliases, groups, token var/name), `_shared/content-tone.css`
  (Text strongest keeps no rule so components can still recolour a default Text), Text/Heading/Icon use it.
  build-api names long string unions by their alias (`ContentTone`, also `FlagName`); Studio editorFor maps it to an enum,
  ToneControl groups by family + search, swatches paint inline; detach maps every token back to a tone.
- Harness: content/lights-no-light-text (Text/Heading) also reads `tone`; fixtures added. A JSX check for
  content/colour-light-is-highlight was removed again (user: Light text is fine, sparingly, for help/error text and
  conditions; only the Lights group is banned). Light on white: Negative/Red 5.06, Info/Blue 4.87, Positive/Green 3.97,
  Orange 3.69, Teal 3.64, Cyan 3.52, Golden 3.49, Accent 3.50, Warning/Yellow 2.31. Docs: guidelines source (text, icon, content-colors), usage rules §7.
- Verified: tsc, usage:selftest (168), studio:selftest, tests/content-tone.test.tsx 4/4, Studio picker probe on 5180.
- Backup: backups/zen-ds-before-content-tones-20261005-022125.tar.gz.


## Studio builder tool planning — GĐ1 first block (Gate, WP-A, WP-B1, part of WP-B2)

- Backups: `backups/studio-wpa-*`, `studio-wpb1-*`, `studio-wpb2-*`, `studio-gate-inspector-*` (2026-10-05 02:05–02:30).
- Fixed (E2E rows): S-02 chrome portal now a fixed full-window layer (studio.css), S-04 fit = all frames
  (StudioCanvas fitRect + viewport fit; dead viewportToFit/READABLE_ZOOM removed), S-07 phone toolbar (layout.ts
  PHONE_QUERY, Toolbar, ModesMenu compact, DraftsControls "phone"), SE-07 Layers empty search, K-02/K-04
  (StudioApp TEXT_FIELD + inspectorControl), K-07 (clipboard.ts clipboardFocus), K-10 (quick/commands.ts), ST-03/04/05
  (CanvasMenu targets + anchor shift + list max-height; SelectionLayer onContextMenu), I-13 (slots.mjs propsOnly +
  multi.ts structural flag), ST-10 (slots.mjs stateHookRemovals + namedImportRemoval, 5 selftest cases), ST-11 (runMove
  expectRender), G-01..03 (gate.ts, ReadOnlyChip, Inspector status), focus ring → Focus/Neutral (12 CSS uses), Quick
  actions blur.
- Harness: rows retry once on a fresh page; group open retries once; baseline 59/7, `flaky` I-03.
- Not done (Backlog): B2 shared-code confirmation. Peers in parallel: Nested boolean (PropField/propSchema/api.ts/
  jsx-source), Library (writePlan.ts, setStateInit), Text align, Token màu, Dark/light + Present bar.

## Studio: one light/dark + Present controls (session "Dark/light mode sync và UI present", tier S)
User: "Khi đổi dark/light trên platform/studio thì example và playground nên đổi theo để dễ nhìn. Trong play/present nên
có chỗ đổi các mode. Button thu gọn lúc present nên làm UI/UX tốt hơn". The classic docs already used one theme; the Studio
kept `chromeTheme` (chrome) and `preview.theme` (canvas) apart.
- `shell/modes.ts` `setStudioTheme` / `toggleStudioTheme`: chrome + canvas Mode together. Callers: toolbar sun/moon and
  the phone brand-menu item (labels "Dark mode" / "Light mode"), Quick actions, Modes › Mode (`ModesMenu.tsx`
  `PreviewModeFields`, shared with Present). `store.ts` initialState: `preview.theme` follows a stored `chromeTheme`.
  Frame theme overrides stay as they were.
- Present: `board/PresentBar.tsx` (new) replaces `FullScreenExitButton` in `board/Present.tsx`: bottom-centre pill like
  the canvas zoom pill (ChromeScope modes): title · light/dark (writes the frame's override when it has one, else
  setStudioTheme) · Modes (panel above: 5 modes, Mode left to the button) · Exit (`aria-label` "Exit full screen" kept for
  E2E O-03, Esc kbd hint). Auto-hide 2.5 s after the last pointer move; held while the pointer is within 16 px of the bar,
  focus is inside or the panel is open (a hidden bar takes no pointer events, so hover is read from the last position).
  The dialog itself takes focus on open (no ring on a control the user did not pick; `zen-allow-focus-ring`), Escape
  skips leaving while `.studio-present-bar__panel` is open. z-index 26: a full-screen screen card is 25 (it hid the bar
  at first), the example's overlay portal 30. Stage padding: 24 top, 72 bottom (room for the bar).
- Checks: tsc, style/usage guards, browser on 5173 (light↔dark toolbar + Modes row + Present button change chrome, world
  and Present; panel open/Escape order; phone 390 = 3 icon/compact controls). A presented screen lost its full-window
  layout after peers' hot updates remounted the card (pre-existing, Backlog P3).
- Peer told: "Studio builder tool planning" (Toolbar/ModesMenu/commands hunks kept). Backup:
  backups/zen-ds-before-studio-theme-present-20261005-022624.tar.gz.

## Studio builder tool planning — GĐ1 second block (WP-C server, WP-F, ST-03 settle)

- WP-C server: `tools/studio/data-source.mjs` (originOf / originsOf / dataFieldEdit; follows .map rows incl. `.slice(n)`,
  same-file consts, imports, member items, factory calls by param name; refuses filter/sort, state, computed) +
  `data-source.selftest.mjs` (12 cases, in `studio:selftest`). Plugin: `dataSource` on attributes and expression
  children (NOT `origin`, which jsx-source now owns for nested booleans — briefly clobbered ~02:39–02:46, peer told),
  `editData` for op setDataField (draft of the data file), `isDataFile` in draftable/resolveFile. types.ts: DataSource,
  SourceAttr.dataSource, SourceChild.dataSource, EditOp setDataField.
- WP-F: textEdit.ts `dataMatch`/`writtenProps` (component fiber's props, not its root host's) + `rowAt` → setDataField
  (DA-02 ✓); TextEditor key. Overlays: portal children pointer-events none outside Interact, `data-picking` during
  SelectionLayer.pick, picker `hostsOf` crosses a portal when only a <template> marker shows, `frameOfFiber`,
  `rendersPortal` keeps overlay owners in Layers (O-02 ✓).
- ST-03 flake: the context menu grew after opening (late Detach caption); ResizeObserver re-measure + rAF resize event
  (avoids React's flushSync-in-commit warning); the row waits for the menu to settle.
- Baseline 61/5; gate PASS.

## Full-screen bar shared + Present prev/next + HMR fix (same session, user approved the 3 Backlog lines, tier S)
- `PlatformFullScreen.tsx` `FullScreenBar` (+ `FullScreenBarDivider`) replaces `FullScreenExitButton`: bottom-centre pill
  (CSS `.platform-fullscreen-bar*` in platform.css, the old `.platform-fullscreen-exit` rule removed), title (hidden on
  phones) · caller controls · Exit + Esc kbd (`aria-label` "Exit full screen" kept). Auto-hide 2.5 s; held by the pointer
  within 16 px, `:focus-visible` inside (mouse users who opened full screen keep focus on Exit without holding it) and
  `hold`; `fullScreenEscapeOwners` gains `.platform-fullscreen-bar__panel`. Used by ExampleCard and appLayer Panel.
- Studio `PresentBar.tsx` now composes FullScreenBar in ChromeScope (its own pill CSS left board.css); ‹ n / N ›
  (`data-present-step`, disabled at the ends) via `presentFrame.ts` `stepPresent`; the stepping button keeps focus in the
  next frame (`stepFocusFor(frameId)`, read not consumed: Strict Mode runs the mount effect twice). ← / → in Present.tsx
  only when the focus is on the layer, body or a bar button and no overlay/panel is open.
- HMR fix: ExampleCard `presented` prop → `data-fullscreen`, replacing Present's one-off setAttribute.
- Checks: tsc, guards; browser 5173: Studio 1→6 by → and ›, focus kept, ends disabled, ← from the bar; classic button page
  card + App Shell playground: bar, auto-hide, Esc returns focus, Enter path keeps the bar (focus-visible). Gate
  `--pages=button,app-shell,templates,chat` (the shared files map to no page by themselves): all static ✓, Studio E2E 62/4
  (O-03, S-03 work), one ✗ behaviour apg on app-shell "Narrow window" "Open navigation" — the example's own menu button
  opens nothing on click either, not from this change (Backlog P2 with the run's other example-content ⚠). Backup:
  backups/zen-ds-before-fullscreen-bar-20261005-025644.tar.gz.

## Studio nested booleans that really work (session "Nested boolean không hoạt động", tier M)

User (4th report): "Các nested boolean vẫn k hoạt động. Hãy nghiên cứu đưa plan làm và chỉ deliver sau khi test nó đã hoạt động".
Research (4 agents: live Figma inventory, static audit of 1,016 nested instances, write-path review, Playwright probe of 17
pages) → plan GĐ1–GĐ4, all approved (AskUserQuestion). Enabled toggles wrote correctly when clicked once, slowly; what
broke them in use: a quick 2nd click refused as stale (snapped back), the Nested section unmounting after every write,
stale sibling locs ("moved in the source"), templates/app-shell full-reloading 2–4× per click (appLayer import cycle),
a 15-module HMR chain, off writing `={false}` and ` />` residue (draft never clean); plus 675 nested booleans never listed
(JSX in consts, helpers, local components, other files, Table column cells) and bound booleans with no switch.
- GĐ1 reliability: `api.ts` rebases an edit refused as stale because of the Studio's own earlier prop-level write (newest
  matching write, `<Name` checked at the loc, chain cleared on Discard) and re-sends once; `nestedInstances.ts` queues
  nested writes and follows their locs through writes; DesignPanel re-plans a queued 2nd click from a fresh element read;
  `writePlan.ts`: on → removed when the default is true; jsx-source removeProp joins ` />` back (round trip = saved text);
  Icon `decorative` and defaultX twins hidden from nested rows; Fast Refresh boundaries (board/presentFrame.ts,
  edit/quick/state.ts, examples/pageExamples.ts + registry.ts own `getPageExamples`, PlatformPopoverContent.tsx);
  appLayer cycle broken (appLayer/playgroundParts.tsx, `keepOnHotUpdate` for group data exports).
- GĐ2 listing by fiber ownership (`nestedInstances.ts`): an element belongs to the owner prop whose value holds its
  data-zen-src; render-function/data props (Table columns) → that prop or "Content"; children = slot content (excluded);
  "Written in <file>:<line> · N on canvas" for JSX outside the owner.
- GĐ3 bound booleans: server `SourceAttr.origin` (bound-state · loop-bound · bound-value; state wins over a loop) and GET
  /element `savedAttributes`; PropField shows a switch + `{expr}` chip for data bindings (hint "applies to all N rows"),
  writes a fixed value (to the defaultX twin when there is one), Restore puts the saved binding back.
- GĐ4 TopNavigation group toggles (GroupedProperties): ON restores the saved prop (op resetSlot) instead of a placeholder;
  an item add keeps the host selected (`editDataItem` keepHost).
- Checks: tsc; `node tools/studio/selftest.mjs` 2311 + slots 1792; vitest studio-write-plan 12/12; `npm run studio:e2e
  -- --only=inspector --no-retry` 3/3 runs 11 works (I-03 two quick toggles now works; I-10/I-11 are WP-C, broken in the
  baseline) and a full run 61 works / no regressions; production `vite build` keeps the examples (registry fix after review).
  Browser on :5176: Table cells listed (TableMedia, Badge), two toggles 120 ms apart both land, on→off leaves no draft,
  Conversation header `status={one.online}` off → Restore → draft gone; templates/app-shell toggles keep the window.
- Adversarial review fixed before delivery: rebase across structural writes, rebase after Discard, own bound switch
  reading no live props, state-reading .map rows offered a fixed value, twin left after Restore, owner pin for nested JSX
  written elsewhere.
- Regression probe (17 pages + templates, 228 toggles) then fixed: a prop the saved file writes, switched off and on,
  came back elsewhere (reordered draft) → `writePlan.savedWrite` puts the saved attribute back (op resetSlot) for own
  and nested rows (not in playgrounds); a nested write refused as stale after a structural owner edit re-reads and
  re-sends once. With WP-C (peer "Studio builder tool planning") landing the same night, a data-bound nested boolean
  follows the own rows: `setDataField` on the row this instance renders when the data is editable, else a fixed value.
- Missing-classes check (11 samples, all six formerly missing classes + negatives): all listed under the right prop with
  "Written in …", writes on the nested element's own line, drafts clean; children and nested-of-nested stay unlisted.
  Fixed from it: SelectionLayer no longer undoes a write's remap while the canvas still shows the old line (owner moved
  by a nested edit above it), and the Nested list keeps its groups when the selection is only moved.
- Bound/group check: GĐ4 TopNavigation toggles 6/6 (Top-Leading Avatar, "New review", both call actions with their
  toast hook, fresh items keep the host selected); state-bound and playground rows read-only. Fixed from it: Restore now
  puts the saved attribute back where it was (`restoreStep`: twin removal, then resetSlot) so the draft goes away;
  values from custom hooks (`useFormState`) count as state (server `readsState`).
- Pre-existing, logged: frame Discard misses edits outside the frame's JSX; Control-Bar switch only opens the picker;
  app-shell.tsx Narrow window drawer locked by a saved `navOpen={false}` (not this session's; `qa --all` ✗); example
  pages remount on every Studio write (interaction-reached views reset).
- Backups: backups/studio-before-nested-boolean-fix-20261005-015103.tar.gz (+ -inspector-css, -fieldapi,
  server-origin-saved-attrs, a5-fast-refresh-boundaries, studio-a4-applayer-cycle, studio-before-saved-attr-origin*,
  studio-before-registry-build-fix, studio-before-designpanel-replan, studio-before-review-fixes,
  studio-before-frame-discard-chain, studio-before-own-live-repeats, studio-before-e2e-baseline-i03 — all 20261005).

## Studio builder tool planning — GĐ1 WP-E (Figma properties → Inspector)

- Read 45 ❖ pages with use_figma (read-only, parallel batches of ~11): 143 public sets → `docs/figma-contracts/component-properties.json`.
  Script kept as `tools/studio/figma-props-read.js`.
- `tools/studio/figma-props.map.mjs`: 53 components (TopNavigation stays hand-written), each Figma property → code prop /
  bool variant / toggle (presence) / skip with a reason; `trust` for DockIcon theme (react-docgen misses the spread colours).
- `tools/studio/figma-props-build.mjs` (+ `--check` in studio:selftest) → `inspector/figmaProps.generated.ts`
  (123 props, 22 toggles, 0 errors). `propGroups.ts` `groupsFromFigma` (variants own, booleans, then swaps/texts in
  `after`; swap rows `when` their toggle is set), `entryLabel`; `componentGroups.ts`; DesignPanel uses it (2 lines);
  GroupedProperties shows the Figma label. propGroups selftest 14 → 178 checks. E2E I-14 ✓. Gate PASS.

## Studio builder tool planning — GĐ1 WP-D part 1 (Appearance + Effects)

- Spec: docs/research/studio-position-effects-radius-spec-2026-10-03.md §3.2–3.3, §4.2–4.3 (built as specified, v1).
- New `src/platform/studio/appearance/`: `appearanceModel.ts` (canonical corner writes, effect availability / default /
  warnings; selftest 19 checks, in studio:selftest), `AppearanceSection.tsx` (Appearance, CornerRadiusField,
  EffectsSection), `appearance.css` (swatch on --zen-style-* shadow tokens; size token --zen-element-size-popular-small).
- DesignPanel: `appearanceSpecs` out of Properties, two mounts (backup `backups/studio-wpd-designpanel-*`).
- E2E group `appearance` (AP-01 corners, AP-02 effect add/hide/show/remove, AP-03 warning fix); fixture gains a Box.
- Not done (WP-D): Card read-only effect row, live hover preview, Effect settings popover (manifest layers), ScaleField,
  Grid columns, Alignment v2, ConstraintLayer (built in part 2, below).

## Studio builder tool planning — GĐ1 WP-D part 2 (ConstraintLayer)

- Spec §4.4. New `src/platform/studio/position/ConstraintLayer.tsx` + `constraint-layer.css`: for a selected floating
  Stack/Grid/Box, dashed lines from the offsetParent's padding edge to each pinned edge (along the layer's centre line),
  pills "right · sm · 12" beside them (token from the rendered props, px measured through the zoom, rounded to 0.5),
  centre ticks + "center" pills, the parent's owner outline. Pills step aside for the name tag and `.studio-resize__pill`.
  Same measure loop as SlotLayer. Mount: one line in `canvas/StudioCanvas.tsx` (backup `backups/studio-wpd-constraints-*`).
- E2E AP-04 (fixture: a floating Box in the slot fixture's box). Baseline 67 works / 4 broken (I-10, I-11, DA-03 wait
  for PropField; ST-02 is GĐ3). `npm run qa` PASS. Screenshots checked for right/top and center/center.
- Backlog: the slot "+" chip covers the size pill on a selected small Box (P3).
- WP-C client still waits for session "Nested boolean không hoạt động" to free PropField.tsx / propSchema.ts (asked).

## Studio builder tool planning — GĐ1 WP-C client (data editor + Set fixed value)

- PropField / propSchema freed by session "Nested boolean không hoạt động" (03:40); their switch block, fixableBinding,
  restore/repeats kept; `bound-state` wins over a .map row (no data edit). Backup `backups/studio-wpc-client-*` (+ `-types-*`).
- propSchema: bound PropValue carries `dataSource`; `dataEditable()`, `dataSourceLabel()` ("people.bao.role in data.ts").
- PropField: data branch (control showing `live`, note) and "Set fixed value" branch (BoundValue + flat sm Button), both
  non-boolean, before the plain bound row. inspector.css `.studio-inspector__bound-fix`.
- DesignPanel: `dataRow` (rowOf), valueFor adds `dataSource.row`, setProp → op setDataField when dataEditable (status
  error when the row is unclear), send() keeps the element file's hash when a data edit wrote another file.
- types.ts: `DataSource.row?` (client only).
- E2E: fixture `cond-const` (condition on a const); I-11 asserts no fixed value on the state condition, then fixes the
  const one to "primary". I-10, I-11, DA-03 now work: baseline 70 works / 1 broken (ST-02, GĐ3). `npm run qa` PASS.

## Studio builder tool planning — GĐ1 WP-D ScaleField (redesign spec Phase 2)

- New `src/platform/studio/inspector/controls/`: `scale.ts` (scaleOfType from the documented type, scaleLabel "md · 16",
  stepKey; selftest 8 checks, added to `studio:selftest`), `ScaleField.tsx` (Zen SelectField; ↑/↓ pending + one commit
  on keyup/blur; ⌫/Delete reset when written; unset shows the measured rendered step, e.g. paddingX ← padding),
  `hostContext.ts` (DesignPanel provides `sourceHost(selection)`).
- PropField enum → ScaleField when `scaleOfType(spec.type)`; AppearanceSection drops the now-redundant px hint (kept for Mixed).
- E2E I-15 (sm · px, held ↑ = one edit / one ⌘Z, ⌫ reset keeps the layer); `pickOption` takes a RegExp (I-06, AP-01).
  Baseline 71 works / 1 broken. `npm run qa` PASS. Backups `backups/studio-wpd-scale-pkg-*` (+ wpc-client for PropField).
- Not in v1 (spec Phase 2 extras): typeahead "14" → nearest token, scrub (Phase 7).

## TopNavigation: trailing groups off for Flat actions in the Studio (same session, tier S)
User: "Behavior action trailing group không áp dụng cho action dạng flat"; AskUserQuestion → "Flat không nhóm" (Figma's
Icon-Flat has no trailing icon; TopNavigation already ignored `group` on the compact types).
- `slots/dataSlots.ts`: `groups` may be a test of the owner's props; TopNavigation trailing = not compact*; `groupsOffNote`;
  `slotGroups(slot, props)`. `slots/dataItems.ts` `slotGroupsAt(owner, slot)` (rendered props). Used instead of
  `slot.groups` in `edit/itemDrag.ts` (no "onto" drop), `slots/actions.ts` (op `group` refused with the note; moveItem
  without regroup), `slots/DataSlotBlock.tsx` (no bracket/link; note when items carry a group), `inspector/DataItemPanel.tsx`
  (no group buttons; "Group X draws no pill here" note). `inspector/propGroups.ts` trailing entry warns on compact;
  `GroupedProperties.tsx` now prints warnings for list/object props too.
- Playground (`PlatformMobilePlaygrounds.tsx`): Grouped trailing hidden on the compact types (`pair = grouped && !flat`).
- Checks: tsc, Studio selftests; node check of slotGroups for all 7 types; Studio on 5173 (chat example, Type → compact
  as a draft: buttons gone, notes and warning shown, canvas drag onto the middle reorders; draft discarded); classic
  playground toggle hidden on compact. palette.selftest's MAX_ACTIONS regex is stale (pre-existing, Backlog P3).
  Backups: backups/zen-ds-before-flat-no-group-20261005-140756.tar.gz, …-props-20261005-141510.tar.gz.

## Backlog batches 1–3 (same session; user: "Xử dần các phần backlog đi", tier S each)
- Batch 1: app-shell.tsx StudioApp lost `defaultSidebarCollapsed={false}` `navOpen={false}` `defaultNavOpen` (navOpen locked
  the drawer; Narrow window › Open navigation works, Enter and click); palette.selftest MAX_ACTIONS regex follows
  `trailingItems(…)`; AGENTS.consumer.md rule 3 + Fields row (`disabled` back, not Autocomplete/RichText); guidelines
  bottom-sheet use/do + chip phone line → List + ListItem for one choice. Found already fixed: RichTextField nested form,
  Toast after Undo, AGENTS.md DoD step 3. Gate --pages=app-shell,bottom-sheet,chip PASS.
- Batch 2: Sidebar roots `<aside>` → `<nav>`; build-api resolves `...spread` in `as const` arrays (only dockIconThemes) →
  iconTheme/theme list 22 members (only dock-icon + metric docs changed); ModalForm Escape found already fixed. Gate
  --pages=sidebar,app-shell,metric,dock-icon PASS (Vitest 27/27, audit 0 new).
- Batch 3: PlatformSidebarBrand logo inline SVG in currentColor from union.svg?raw; ListItem button row aria-current
  instead of aria-pressed (+ guideline a11y line); app-shell "Activity, new" deadclick analysed as a probe-order artifact
  (Backlog note). Backups: backups/zen-ds-before-backlog-batch{1,2,3}-*.tar.gz.
- Batch 4: SelectField trigger aria-labelledby "<label> <trigger>" (hidden `-name` span for aria-label-only); DatePicker
  useLayoutEffect on open → applied value's month; Time-Picker fields md when device mobile (`DatePickerTimePicker`
  `device`). Already fixed: Avatar initials name, Badge remove label, Search filter popup attrs, Segmented icon tooltip,
  DatePicker day names, DateField min/max + focus-on-error. Tests (+2) fail without the fix. Gate --pages=input,date-picker
  PASS (contracts 3 suites, Vitest 29/29).
- Batch 5: Menu clamp when it fits neither edge; Popover autoFocus preventScroll; DialogAction type/form (ModalActions);
  DateField datePickerActions → onApply; platform.css Inter fallbacks. Tests (+3; Menu test fails on the old code).
  Browser: menu 390 menus inside; Switch workspace scrollY unchanged.
- Batch 6 (user: "theo thứ tự"): Chip `popoverPortal` (layerRef in light dismiss, anchorRef=button); PageHeader mobile order
  via custom properties (row display: contents, titles flex none, actions order 1 + 4px offset, tabs order 2); Checkbox/Radio
  border = Figma token (asked); cycle PlatformExamples ↔ PlatformMobilePlaygrounds broken (PlaygroundSlot → playgroundParts;
  Tarjan scan script in the session scratchpad); Button dialogs focus OK at 1512. Tests moved to
  tests/interaction/backlog-fixes-2026-10-05.test.tsx (Menu, SidePanel, Chip, PageHeader; PageHeader fails on old CSS).

## Backlog decisions (same session; user answered the P1/P2 list)
- Verified done, closed: PlatformPhone data-breakpoint mobile (margin 20 inside vs 24 outside), ExampleCard inherits the
  breakpoint, MetricCard title-highlight in 5 HR templates, dark alphas + Dark/Gray/1 #121212 in tokens (10-03 sync).
- Closed by decision: Motion ideas, Avatar solid colours (keep; harness still warns).
- Sidebar item theme default neutral (Figma Menu-Item Theme default Neutral, captures datepicker-sidebar.json).
- QA: tools/qa/isolated-server.mjs + `--isolated` / fallback when 5173 is down (smoke: 3.4 s start); post-edit
  "Shared file" warning via lib.recentOtherEdits; AGENTS.md session paragraph.
- isolated-server.mjs runs Vite in a child process (`--serve`, READY line, stops on SIGTERM / stdin end): in-process,
  the gate's spawnSync screenshot step blocked the server's event loop and shoot.mjs timed out (0 sheets). Gate
  `--isolated --pages=sidebar` PASS with sheets; port 5200 freed after.
- Figma ↔ code differences gathered for the user/designer: docs/research/figma-code-differences-2026-10-05.md
  (12 decisions, 14 Figma-file fixes).
- User 2026-10-05 (later): Avatar solid warning = green/teal/orange/cyan initials (rule avatar/solid-initials-contrast);
  Checkbox border kept ("WCAG đã lỗi thời"); Table checkbox column kept 48; Actions column → 5 TableActions IconButtons
  sm → md. `zen-ds audit` built (tools/zen-audit/{audit,app-checks}.mjs; quality-checks regionSel; axe contrast
  opt-in; reload retry; package files; docs). Smoke: docs templates/button pages at 1440/390 → findings listed, report
  written.

## Content/Placeholder → Neutral-Alpha/9 (session 2984c6e6, tier XS)

- User: "Update tokens màu Content-placeholder sang neutral-alpha-9 cho cả light và dark". Live Figma already had /9 (use_figma read).
- `mode-colors-semantic.json` Color/Content/Placeholder Light/Dark step 8 → 9; synchronizationNote sentence; overlay Placeholder tokens left at 8.
- tokens:build → only 2 lines of tokens.css + catalog + Swift/Dart data changed. Backup `backups/zen-ds-before-content-placeholder-alpha9-20261005-191249.tar.gz`.
- Contrast on Surface: Light 1.92 → 3.32:1, Dark 3.39 → 5.48:1 (Disabled stays /8, Neutral/Light /10).
- Gate 1: Vitest ✗ = fixed Dark color-contrast for AiChatField + InputContent → `ZEN_UPDATE_AXE=1 npm test -- tests/smoke` (diff: only those 2 entries; backup `…axe-baseline-placeholder-20261005-191430`).
- Gate 2 (fast path, 56 pages): contracts 23/23, Vitest ✓, 0 contrast findings; Dark ✗ = React createRoot console error on text@1512-dark (HMR noise) → `npm run qa -- --only=text --isolated` PASS.
- 12 contact sheets (390) reviewed: placeholders fine. New Backlog P3: Table at 390 cuts the Assignee column.

## Global Colors re-sync + Zen-High-Contrast prototype (session 28eea406, user-approved)

- Global Colors.json (Downloads, 18:49): 235 values in Cyan/Grass/Blue/Bronze (2–12), Orange, Zen (step 9 too), VT/Chat/Ananas
  dropped; colour recipe → gate fast path PASS (report 2026-10-05T11-52-10), 12 sheets fine. Backup
  `backups/zen-ds-before-global-colors-sync-20261005-185130.tar.gz`.
- HC rules (user): step 9 never moves, no new tokens, on-tokens unchanged; raise only borders/text steps. `scripts/high-contrast.mjs`
  (plugin helpers copied byte-identical: OKLCH, gamut map, WCAG, APCA, generateAlphaScale) → 151 of 960 values; build-tokens
  appends `[data-contrast="high"]`, `[data-contrast="standard"]`, `:where([data-contrast])` (brand aliases re-declared:
  custom properties resolve where declared). Role warnings: overlay placeholders stay on alpha 8, Overlay border default on 4.
- Placeholder → alpha 9 (peer f31cbd) taken in: neutral text floors on 9–11, alpha 8 (disabled) kept.
- axe color-contrast, 14 pages Light: ~880 failing nodes → ~40 (white initials on step-9 Avatars, docs code view); Dark ~0 both.
  Comparison sheets (scratchpad hc-compare-*.png) shown to the user.
- Docs: Contrast chip (classic), Studio Modes + Present panel, `?contrast=high`, `shoot.mjs --contrast=high` (files -hc).
- Targets: Input label tooltip button gets the 24px ::after; audit.mjs + zen-audit app-checks apply WCAG 2.5.8 spacing exception.
- Plugin (`zen-ds-figma-plugin-main`): ZenHighContrast block + syncHighContrastMode/refreshHighContrastMode after every Global
  Colors write (Update passes its allVariables), handler `sync-high-contrast`, tests/high-contrast-mode.test.js (parity with
  Zen-DS), color-algorithm-update modes assertion; npm test exit 0; not built (peer builds). Backup
  `backups/zen-ds-before-high-contrast-mode-20261005-193458.tar.gz` in the plugin.
- User: the comparison shots were low quality and chip borders looked heavy → crisp 2×/3× crops of Chip, Checkbox,
  Button, Tag at HC floors 2.2 / 2.5 / 3:1 (Light + Dark); the six Subtle-border components share one token. User kept 3:1.
- Overlay Placeholder → alpha 9 (user "Có"): live Figma already had /9 for On-White/On-Black-Overlay (use_figma read 22:17);
  mode-colors-semantic.json 4 values, sync note and the peer's CHANGELOG line amended (their log line above stays as
  history). Live file check: Global Colors already holds Zen-High-Contrast (plugin build 19:51); its values match the
  algorithm on every ramp whose Zen values match the repo. Only Mint differs: live Mint/9 #26E8A4 vs repo #04CDA1 (newer
  than the 18:49 export); left for the next sync (Backlog).
- Plugin "Sync High Contrast" (user "Có"): main.js onMenuSyncHighContrast + result toast; code.js handler posts the result
  (no figma.notify); shared block re-pasted with Canvas/Surface fallbacks (collection-identity docs had no Gray ramp →
  TypeError, caught). npm test 35/35. index.html menu item waits for the Lục Thạch session (their agent rewrites index.html).

## Zen-Variables 2 sync + Sky/Mint/Bronze/Golden themes (session "Cập nhật Zen Variables tokens", evening)
- Export `~/Downloads/Zen-Variables 2/` (Global Colors + Mode Colors (Semantic)), diffed by script, 192 VT/Chat/Ananas dropped.
  Global Colors: mode Zen-High-Contrast added (151 values ≠ Zen; equals scripts/high-contrast.mjs on all 960), Mint +
  Mint-Alpha 46 values (Mint/9 #04CDA1 → #40E7AD; live file read matches). Semantic: +20 Support Sky/Mint (appended, export order).
- Manifest: Global Colors modes + codeAxis data-contrast, semantic 427, export 2,199, sync note. tokens:build/check/native ✓.
- Text/Heading/Icon tones support-sky-* / support-mint-* (content-tone test: every Content token has a tone; Light lines
  carry zen-allow-lights-light-text like Yellow).
- Live Figma (use_figma read): Avatar/Single, Badge, Badge-Counter have Sky, Mint, Bronze, Golden; Dock-Icon Sky, Mint,
  Bronze. Bindings: Solid Support/<c>/Solid + On-Brights (Sky, Mint) / On-Colors (Bronze, Golden); Dock-Icon always
  On-Colors; Subtle Support/<c>/Subtle + Strongest text, Light icon. Added to avatarThemes, badgeThemes, dockIconSupportColors + CSS.
- Follow-ups in BACKLOG (Golden initials contrast rule, Dock-Icon Sky/Mint white icons, stale Badge contracts).
  Backups: backups/zen-ds-before-{token-sync-hc,content-tone-sky-mint,avatar-badge-dock-themes}-20261005-*.tar.gz.
- Mint "Cập nhật luôn": live Mint changed again after 22:20 (Mint/9 #26E8A4 → #40E7AD); hashes of all 4 Mint groups matched
  the repo: session 9907f1 had already synced the evening export at 22:34 (incl. Figma's HC mode, = algorithm). My merge
  was a no-op and a rebuild gives the same tokens.css; CHANGELOG HC line amended, Backlog plugin-button item closed.
- Gate: first `npm run qa` FAIL only on pages the gate flagged as hot-reloaded mid-run (bottom-sheet / description-list focus
  return, chart createRoot); `npm run qa -- --isolated` PASS (report .qa/reports/2026-10-05T15-59-34-d40dcf19.md), 12 sheets
  reviewed, warnings are known debt (Backlog). Not run: `--all` (the _shared edit is 6 tone names, not logic).

## List Item from Figma + examples re-padded (session "List Item padding/gap adjustment", 2026-10-05 late)

User: "Update List Item từ Figma và sau đó rà lại các example dùng List Item để adjust lại padding, gap của chúng trên UI
example và pattern." Backup: `../backups/zen-ds-before-listitem-figma-sync-20261005-231427.tar.gz` (170 files).

- **Figma (read with use_figma, 4080:11700):** both Interactive variants now pad Spacing/Padding/XSmall 8 ×
  Spacing/Padding/XLarge (Desktop) / Margin-Comfortable (Mobile, explicit Breakpoint mode Mobile = 20). Interactive-
  Background x = 16 desktop / 12 mobile, full height, Corner-Radius/Base. Wrapper gap Medium, Info-Content gap 2XSmall
  (unchanged). The List-Item-Example 14730:76349 is gone from the file. Interactive=No · Mobile (14838:76584) has no
  explicit Breakpoint mode, so it renders 24 in Figma (Backlog: ask). Chat/Conversation-List/List-Item (6331:35340) is a
  List-Item instance at 8/16, matching code (`--zen-list-inset` 16).
- **Component:** list-item.css — one row box for every row; fill inset `MC − XSmall`; hit area −8px; List gap 3XSmall for
  any rows; bleed for every List without `inset`. JSDoc, stories, harness rule text (list-item/inset-not-padding),
  guideline source (Interactive/State/List rows + a Don't about Stack gaps), usage rules §15, example brief §3c, Chat
  guideline "8/16". Container comments (Card/Dialog/SidePanel/BottomSheet/Layout) now say "A List runs to the edge".
- **Platform CSS:** stage List frame, `.platform-list-preview` and `.zen-card.pe-list-card` use `MC − XSmall` for every
  list (radius Base + 16 desktop / + 12 phone); `.pth-page` / `.pth-screen` set `--zen-list-bleed`.
- **Examples (geometry probe over 52 pages × 1512/390: content inset vs painted container, overflow, sibling text):**
  65 desktop flags → 19 (the rest are false positives from the sibling heuristic, scroll panes, or Backlog items).
  Phone boxes of clickable rows `xl/xs` → `2xl/sm` (stepper, bottom-sheet, dialog, layout, list-item); phone boxes of
  static rows `xl/md` → `2xl/sm` + kickers `md` → `lg` (action-bar, app-shell, avatar, bottom-navigation, chart,
  date-picker, inline-message, input); same-screen non-row blocks → `2xl/lg` (app-shell Notifications, avatar Details);
  desktop boxes → `3xl/md` (layout ElevatedList, app-shell Studio, avatar ×2, toggle) with kickers `paddingX="xl"`;
  list-only Cards + `pe-list-card` (alert-banner ×5, menu ×2, sidebar RowCard, text, visually-hidden, page-header,
  app-shell ×2, link when it has rows); top-navigation Home cards: `pe-list-card` removed + spacing md (titles were at 0);
  search result scrollers run to the card edge (`--zen-list-bleed: 0`, max-height for 56px rows, paddingY 2xs);
  standalone rows wrapped in a List (date-picker, divider, color-selector); tabs loading rows are ListItems.
  Templates: Settings › Sign-in and Detail › Activity cards → `Box surface radius 2xl paddingY {phone ? sm : md}
  effectStyle Shadow/Bottom/Level-1`. Code snippets follow the renders. Stale "no padding of their own" comments rewritten.
- **Studio Detach:** `listRowBox` → `{ x: inset, y: "xs" }` for every row; `bleedingList` = any List without inset;
  rowParent/listRows/rowKind/IN_PLACE removed; selftest cases rewritten (2077 checks pass).
