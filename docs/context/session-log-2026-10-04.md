# Session log 2026-10-04

## Studio nested booleans under spreads (session "Boolean trong nested không hoạt động", tier S)

User: "Các boolean trong nested vẫn không hoạt động" (follow-up to 2026-10-03 "Boolean lồng nhau trong Studio").

- **Cause:** `valueOf` (`inspector/propSchema.ts`) returns `spread` (read-only) for every prop that is not written on an
  element with a spread. Platform examples write Avatars as `<Avatar size="md" {...avatarOf(person)} />` (77 nested
  elements with a spread in src/platform). The spread feeds theme/src/alt/children, never status/focus, but Status and
  Focus were disabled in Nested instances and in Properties. The ListItem playground worked because its Avatar has no
  spread, which is why the 2026-10-03 check passed.
- **Fix:**
  - `booleanValueOf`: a boolean that is not an own key of the rendered props reads as unset and stays editable. It is
    used by `NestedProperties` (every group) and by `DesignPanel.valueFor` for the boolean specs. Other prop kinds are
    unchanged (Backlog P2).
  - `tools/studio/jsx-source.mjs` `setPropEdits(…, beforeSpread)`: setProp ops insert a new attribute in front of the
    first spread (inline, or on its own line with the spread's indent). A spread that feeds the prop wins, so an edit
    never overrides a playground's controls. `addTextStyleEdits` (className) still appends.
  - The spread note says "…read-only here, except booleans it does not set."
- **Checks:**
  - `node tools/studio/selftest.mjs`: 2190 checks pass. "setProp: after a spread" was replaced by 4 cases (before a
    spread, the first of two spreads, a spread on its own line, a written prop stays in place).
  - `tsc` is clean. `npm run qa -- --pages=list-item` passes; both contact sheets reviewed (classic page, unchanged).
  - In `?ui=studio` (list-item, People directory example), the nested Avatar's Status went from disabled to on:
    POST /edit took 104 ms, and all 14 rows showed the dot after 0.7 s. The draft line was
    `<Avatar size="md" status {...avatarFor(row)} />`. Reset removed it.
  - With the Avatar selected directly, Focus turned on for all 14 rows.
  - In the playground, ListItem `Selected` stays locked (fed by `{...(listInteractive ? {selected…} : {})}`), while the
    nested Status, Focus and Disabled work.
  - Every test edit was undone; no draft of this session is left.
- **Found, then fixed in the follow-up below:** any Studio write to `PlatformExamples.tsx` reloaded the whole page (the
  file was no Fast Refresh boundary), so the inspector jumped to the top after each toggle on a playground.
- Backup: `backups/studio-before-nested-spread-booleans-20261004-000644.tar.gz`.

### Follow-up: both Backlog P2 items (user: "có")

- **All prop kinds under a spread:** `booleanValueOf` became `ownValueOf` (`propSchema.ts`). `DesignPanel.valueFor` now
  uses it for every prop. The spread note reads "Set through {…}: the props it sets are read-only here."
  `alreadyApplied` counts a removeProp as done when the state is `spread` too. On the Avatar under
  `{...avatarFor(row)}`, Size, Background, Shape, Status and Focus are editable, while Theme, Src and Alt (fed by the
  spread) are locked. Shape → square wrote `shape="square"` in front of the spread and all 14 rows changed; Reset went
  back to the saved file. In the ListItem playground, Title lines is now editable and Selected stays locked.
- **Playground reload:** `PlatformExamples.tsx` exported `isPlatformComponentPage`, a lowercase function that nothing
  imports, so React Fast Refresh could not accept the module. Vite reloaded the page on every Studio
  `reloadModule`. The function was removed. Toggling the nested IconButton Disabled in the playground then showed after
  0.47 s with no reload: a window marker survived, the inspector node stayed the same and scrollTop stayed at 698.
  Undo behaved the same way.
- **Gate:** `npm run qa -- --pages=list-item` PASS (sheets unchanged). The usage-guard ⚠ at PlatformExamples.tsx:728 is
  pre-existing and logged in the Backlog as P3.
- Backup: `backups/studio-before-spread-props-and-hmr-20261004-002417.tar.gz`.

## Card structure vs Figma (session "Card structure Figma mismatch", tier S)
- User: "Cấu trúc card bị sai so với figma" (Card playground with Sub-Action). Figma 6643:51021, all 20 variants:
  Content SLOT Fill (230 − 2×24 = 182), Sub-Action FRAME absolute (constraints MAX/MIN, padding = Card-padding),
  Wrapper 20×20 (Popular/Base), Button/Icon-Flat Small Secondary (icon fill Content/Neutral/Light), icon 1460:13 =
  icon-dots-vertical-line. Figma MetricCard (6643:63883) confirms the content runs under the action (297 = 345 − 48).
- Code had `padding-inline-end: 20+8px` on the content; peer "Component List Item refactor" changed it at 00:25 to a
  first-row reserve and handed card.css over; that reserve failed the gate ([scale] 28px not a padding token), so it is
  removed (Figma-exact). Card.tsx default trigger → level secondary + ⋮ (`zen-allow-secondary` citing 6664:21688).
- Overlap probe (DOM text/controls vs the 32px button) on card, badge, metric, side-panel @1512/390: 0 overlaps.
- Example Menu triggers (8 sites) tried, reverted byte-exact (harness rule) → BACKLOG P2; slot corners → BACKLOG P3.
- Guideline Card API row updated + guidelines:build. Behaviour ✗ (Browse projects dialog) was HMR from peers: rerun
  `behaviour.mjs --pages=card` clean. Backup: `backups/zen-ds-before-card-subaction-figma-20261004-002748.tar.gz`.

## Slot "+" is Accent (session d79b3590, tier XS)
- User: "button + để add element vào slot nên là accent button để dễ thấy hơn".
- `studio/slots/SlotLayer.tsx` canvas chip: IconButton Main primary → accent; `SlotsSection.tsx` inspector add: Flat
  primary → accent. Both carry `zen-allow-accent` (button/accent-is-promoted).
- Verified in the Studio (Card › Browse projects, Card selected): chip bg Accent rgb(255 102 212) + white icon; inspector
  flat accent icon. `npm run qa -- --pages=card` PASS (studio chrome maps to no page; 2 Card concentric ⚠ pre-existing).
- Backup: `backups/zen-ds-before-slot-add-accent-20261004-005707.tar.gz`.

## DatePicker: All day hover clipped + mobile primitives check (same session, tier S)
- User: the All day Checkbox hover is clipped. Cause: `.zen-date-picker__viewport` overflow hidden with a 4px inset;
  the Checkbox hover halo is `inset: -8px` (checkbox.css:10). Fix: `switching` state set in switchView, cleared on the
  view's animationend / the viewport's height transitionend; CSS clips only `[data-switching="true"]`.
  Headless check: clip during switch, cleared after 292/318ms (reduced motion 154/171ms), rest = visible.
- Figma mobile set read (no code yet, scope question to the user): `.Primitives/Mobile-Date-Picker/Item` 9921:3283
  (Size=Medium only, 40×40 root, Container Fill × 40 with aspect lock, Body/Base/Medium, Action/Small, event dot
  constraint bottom 4px), Date-Picker/Mobile 9923:3576 (Bottom Sheet; days fill 1/7 of 350 → 50×50; Header 40: month +
  year Heading/Subheading at start, Back/Next Icon-Main Small Tertiary at end; header→table gap XLarge (single) /
  XSmall (multiple, months stacked); weekday row Body/Small/Medium; footer Bottom-Sheet Actions or Footer-Actions
  9923:2791), `.Primitives/Date-Picker` 9923:2323 (sheet heading options). Backup:
  `backups/zen-ds-before-datepicker-clip-20261004-005722.tar.gz`.
- User approved "Primitives mobile" + "auto by breakpoint". Built `device` on DatePicker / DatePickerItem /
  DatePickerHeader (type `DatePickerDevice`, exported). Resolution: prop, else inline && nearest `data-breakpoint`
  (PlatformPhone sets only the attribute) ?? ZenProvider breakpoint === mobile; popover stays desktop. CSS: root/panel
  100%, grid `repeat(7, minmax(0, 1fr))`, day `aspect-ratio: 1` + Body/Base tokens, panel gap XLarge (dual: panels
  column gap Medium, panel gap XSmall), mobile header label first (Heading/Subheading, start-aligned, height Button/Size/
  Small), no hidden nav slots. Playground Device chip + `.platform-date-picker-inline[data-device=mobile]` 350px.
  Measured: playground mobile 350 wide, days 50×50, header 270+32+32 (+2×8); phone example days fill the screen.
  Guideline: Device API row + a Do line. Backups: `backups/zen-ds-before-datepicker-mobile-20261004-011427.tar.gz`
  (DatePicker already holds the clip fix; the original is in the -clip- backup).

## Studio slots: every component, rules warn (session "Giới hạn component trong slot", tier M)
- User asked why the slot picker limits components; then: "những gì cho user sửa thì nó nên tự do k giới hạn", chose
  both parts (warn instead of hide + every component). Memory: zen-studio-free-editing.
- Client: `slots/palette.ts` paletteFor returns every item plus `warnings[id]` ({ short, reason }); hidden only when the
  code cannot be written (toast/state outside a component, Image outside example pages). `paletteSections` adds "Not
  recommended here" last. InsertPicker shows the short reason as caption, full reason as title/aria-description; the
  insert status adds "Not recommended: …". 44 new items (73 total), groups Navigation, Charts, Overlays, Page, Chat;
  `state` / `requires: ["media"]` on items; ops + types carry `state`; Assets click/drop and clipboard pass it.
- Server: `tools/studio/slots.mjs` componentHook (shared by toast and state), stateEntries / stateFor (fresh names,
  AST rename, literal-only initial, built-in `type`), moduleImportEdits (useState from react, platformMedia from
  ../../PlatformMedia, example pages only), JS built-ins allowed; `arrange.mjs` pasteCode takes `state` and media.
- Checks: palette selftest 1223 ✓ incl. `--deep` (1396 items × 26 hosts: tsc, usage, style 0); slots selftest 1761 ✓
  (+ state/media block); arrange 31 ✓; studio selftest 2190 ✓; tsc ✓. Studio on :5180: picker in a clickable card
  lists controls under "Not recommended here"; inserting Dialog into Card › Card header actions wrote
  `const [shareOpen, setShareOpen] = useState(false)` in InvoiceSide, reused its toast, the button opens the dialog;
  draft discarded (card.tsx on disk unchanged).
- Backlog: unused useState after removing a stateful item; ⌘V of stateful items across files; state shared in .map
  rows; Popover (needs a ref). Backup: `backups/zen-ds-before-slot-palette-free-20261004-010750.tar.gz`.

## Metric › Summary above a table: Overdue icon in sync (same session, tier S)
- User: "Bất đồng bộ" on Outstanding / Overdue / Paid. Overdue used `iconBackground={overdue > 0 ? "solid" : "subtle"}`
  while its two peers are Subtle. Now all three are Subtle (colour alone tells them apart); live + code string +
  description updated (metric.tsx:356, 692, 683). Other Solid Dock-Icons in examples are lone hero metrics (kept).
  Backup: `backups/zen-ds-before-metric-overdue-subtle-20261004-014005.tar.gz`.

## Zen Studio: Ignore auto layout / Position section (session "Cho phép edit element floating", tier M)
- User: "Cho phép edit chọn element, component nào floating (ignore auto layout)". Built spec Phase C
  (`docs/research/studio-position-effects-radius-spec-2026-10-03.md` §4.1) minus the canvas ConstraintLayer (Backlog).
- Client `src/platform/studio/position/**`: `positionModel.ts` (pure; snap to the padding ladder, ties smaller, past
  4xl clamped; pin = Fill or span-with-a-sibling-that-spans → stretch, centred → center, else nearer edge;
  constraint / align / unfloat ops) + selftest (32, chained into `node tools/studio/selftest.mjs`); `PositionSection.tsx`
  (Align row, measured X/Y, toggle in the 24px slot, constraint diagram + selects with "Scale (needs %)" disabled, one
  offset row per pinned edge, warning/info notes); `float.ts` (isFloatWrapper, unwrapFloat). DesignPanel mounts it
  above Layout and leaves Stack/Grid/Box position props out of Layout/Properties (ActionBar keeps its own `position`).
- Any non-Stack/Grid/Box layer floats in a Box: `wrapInBox` (new export in `select/wrapSelection.ts`, same write,
  selection and undo handling as ⌥⌘G with given props/label). Off on that Box (selected, or from the layer inside it)
  = new server op `unwrap` (`tools/studio/jsx-source.mjs applyUnwrap`: one element + blank text only, key back,
  dedent, import dropped when unused, snippet synced) → wrap then unwrap restores the exact text (selftest round trips
  incl. .map rows, template literals, CRLF+BOM, snippets; 2254 checks).
- Found in the browser (port 64736, drafts only, nothing saved): the tallest item of a row "spanned" its row and was
  stretched, so the row shrank under it → `shared` (another in-flow sibling spans too) now gates stretch; two token
  names were wrong in position.css (border-neutral-subtle-default, content-placeholder) → every var checked against
  tokens.css. Verified: Badge in PageHeader meta (pinned-to-outer note), Tasks header Stack (Left and right → bottom
  via diagram → Align vertical centres → off), Status Chip (right + top in a Box, child view "Select Box", off from the
  child, ⌘Z restores Chip + selection); every off left no draft (text identical to disk).
- Backup: `backups/zen-ds-before-studio-position-20261004-014802.tar.gz`. Peer "Giới hạn component trong slot" agreed;
  its three selftests (slots, arrange, palette) pass after the change.

## AppShell: same layout on the canvas as in Present (same session, tier S)
- User (screenshots): "Phần preview và play không giống nhau" — Studio app on the canvas showed the menu button and no
  Sidebar; Present showed the Sidebar. Cause: `useElementSize` read `getBoundingClientRect()` (after the canvas's
  transform scale), so 1440 × 0.52 < 1024 → drawer; `useStackedHeader` mixed scaled widths with `clientWidth`.
- Fix (`src/components/AppShell/AppShell.tsx`): sizes from `offsetWidth/offsetHeight`; the top-bar fit check divides
  rendered widths by the header's scale. New interaction test: a 1440px shell under `scale(0.5)` stays "sidebar"
  (13/13 pass). Checked in Studio at 75 %, 52 % and 24 %: every AppShell frame keeps its Sidebar.
- Backup: `backups/zen-ds-before-appshell-zoom-measure-20261004-122503.tar.gz`.

## Global Colors sync from the Zen Plugin Dark-contrast revision (session "Kiểm tra tương phản dark mode step 1 và 2", tier XS)

User: "Update tokens" with `Downloads/Global Colors.json` (2026-10-04 12:12, mode Zen; matches the plugin algorithm 1152/1152).

- `tokens/source/figma/global-colors.json`: 420 values (210 solid, 210 Alpha); names and order unchanged, the 192 VT/Chat/Ananas
  variables stay out. synchronizationNote and CHANGELOG updated; `npm run tokens:build` (2179 tokens, 795 vectors).
- `tests/smoke/axe-baseline.json`: Link `color-contrast` removed — fixed by the new tokens (old tokens still pass with it).
- Gate: tokens:check, tokens:native:check, Vitest 27/27, Figma contracts 23/23. `qa --files` fails only on
  `[playground] layout@390: Cannot access 'option' before initialization` — Layout files are another session's uncommitted work.
- Not committed: the tree holds other sessions' uncommitted edits (tokens.css, figma.collections.json, CHANGELOG).

## Toast stack show/hide + phone alignment (session "Kiểm tra stack hiện và ẩn toast", tier S)
- User: "Kiểm tra lại stack hiện và ẩn toast. Hiện tại nhìn hơi weird" + "fix luôn lỗi canh lề của toast trên mobile".
- Causes found (ToastStack.tsx, toast.css): exit clipped the row (`overflow: hidden`) while it shrank → toast sliced,
  shadow cropped; the gap lived in clip padding → closing row stopped at 8px then jumped; top placement: the entering
  toast hung over its neighbours; the timer effect re-armed every toast on any change → all toasts left together;
  `justify-items: center` made the clip shrink-to-fit → toasts hugged their text (Figma symbols are 648 fixed);
  width `100vw - 32px` + 20px bottom/right (right placement on a phone: 12px left, 20px right); every docs example card
  is an outermost ZenProvider with its own ToastProvider → several fixed stacks at the same spot overlapped.
- Fix: fixed stacks portal into a shared `.zen-toast-layer` per placement + portal container (ref-counted), inset
  Margin/Comfortable + safe area, max 648, margin-inline auto (no translateX); toasts fill the width, gap = half margin
  on each toast + trimmed stack edges; enter hangs off the outer end (`align-items: end` at the top); exit = toast-out
  Fast, then row-out Base (standard) delayed Fast, row removed on `animationend` (600ms fallback; reduced motion keeps
  a 1ms row-out); per-toast clocks (remaining time survives pause and other toasts; a replaced item restarts); toasts
  `position: relative` + top layer column-reverse so an inner stack's new toast slides out from behind the outer one.
- Verified with Playwright scrubbing (scratch scripts): desktop 1512 three toasts 648 wide, 8px apart, 24px from the
  bottom; 390 all 342 wide at 24/24 (docs portal has no data-breakpoint → desktop margin; apps get 20); timers
  8.4/9.4/10.5s for clicks at 0/1/2s; hover 3s → 11.3s; phone example toast edges = list rows; two stacks in one layer,
  bottom and top.
- Backup: `backups/zen-ds-before-toast-stack-20261004-123550.tar.gz`.

## Studio empty states with illustration (session "Tool empty state illustrations", tier S)
- User: "Các empty state của tool nên dùng illustration". Removed `illustration={false}` from the four Studio panel
  empty states: CodePanel (icon-code-02-line), LayersPanel (icon-layers-three-01-line), PagesPanel (new icon-search-line;
  it had no icon, so it would have drawn the default user-circle), AssetsPanel (icon-search-line).
- Figma Empty-State has one illustration size (240px, 6085:25816); it fits both panels (right 320px, left 272px).
- Verified in Studio on :5173 (1512×900): Code tab, Pages + Assets no-match searches. Layers' empty state is only
  reachable on a tabbed page without annotations; same component and panel width as Pages.
- Gate: static ✓ (style, usage, guidelines, tsc); "Page mapping" ✗ is the known Studio limitation (HANDOFF).
- Backup: backups/zen-ds-before-studio-empty-illustrations-20261004-124356.tar.gz. Follow-up in BACKLOG (P3).
- Not changed: in-popover "no match" rows (text style, icon picker, Quick actions, Insert picker) stay text.

## Studio code view language badge (session "Library component React code", tier S)

User: "Nên hiện tên ngôn ngữ ở phần view code của studio". The header already said "TSX" (grey Caption, left in a
snippet, after the path in Source) and read like a title. The user picked "React · TSX" + a small Badge (AskUserQuestion).

- `studio/code/CodeView.tsx`: `LANGUAGE_LABELS.tsx` = "React · TSX" (TS/CSS/JSON/Shell unchanged); new export
  `CodeLanguageBadge` (Badge xs neutral subtle, no dot) replaces `codeLanguageLabel`; the header always renders: title only
  when passed, then the badge, then the actions (`margin-inline-start: auto` in code.css). The region's name is "React · TSX code".
- `studio/code/SourcePanel.tsx`: the loading/error header uses the badge too.
- Spec §7 notes the badge. Backup: `backups/zen-ds-before-code-language-badge-20261004-182413.tar.gz`.
- Checks: `?page=button` Studio, Code tab: Snippet, Source and the wide view show the badge (11px/16px 500, #FDFDFD on an 8.6%
  white tint over #121212). `npm run qa` PASS; its 11 dark contrast ⚠ are on design-tokens (unrelated, Backlog P3).

## Studio: editability audit (B1) + object/array props (B2) (session "Component List Item refactor", tier M)

User: nested booleans "không bật tắt được" (TopNavigation mobile); approved "Làm B1+B2 trước".

- B1 `tools/studio/editability-audit.mjs`: 96 annotated files, 7,307 Zen elements, 17,628 written props, 66% literal.
  Locked by class: object-literal 518 · array-of-objects 269 (both fixed by B2) · data-const 86 · data-expression 1,195 ·
  loop-bound 897 · bound-value 1,854 · conditional 336 · render-function 43 · spread 351; 450 nested instances have a bound prop.
- B2 server (`jsx-source.mjs`): `SourceAttr.shape` (object fields / array items, one level) + op `setField { name, index?,
  key, value|null }` (replace in its quote, append inline or own-line, remove with its comma). 26 new selftests (2,279 pass).
- B2 client: `inspector/objectSchema.ts` (lazy `docs/api/<slug>.json` types → fields, aliases such as ButtonLevel expanded),
  `inspector/ObjectProperties.tsx` (groups in Properties; optional booleans switched off are removed), `PropField`
  `resettable` (required fields have no reset), `types.ts` (AttrShape, setField), DesignPanel wiring, `nested.css` header.
- Verified in Studio (:5173, Conversation header TopNavigation): Dot on → `dot: true` + red dot; off → field removed;
  Label → "Video chat"; icon picker → icon-bell-01-line; draft discarded after. EmptyState: Primary action group with Label
  + Level enum. `npm run qa -- --pages=top-navigation,empty-state` PASS; 4 ⚠ contrast on Top Navigation's Modal screen
  placeholders (not touched here) → Backlog.
- Backups: backups/studio-object-fields-20261004-183652.tar.gz, backups/studio-object-fields-propfield-20261004-225535.tar.gz.
- Not done (proposed): add an object to an unset prop / add-remove list items; data consts (B2+); B3–B5.


## Zen Studio UX/UI audit (same session, read-only)
- User: "Kiểm tra lại hết UX và UI của studio xem đã tối ưu và đẹp nhất chưa". ux-ui-audit probes + Playwright
  scripts on `?ui=studio` (8 viewports, light/dark, Admin/Viewer); nothing edited in src.
- Report: `docs/research/studio-ux-audit-2026-10-04.md` (8 major, 4 a11y, 11 notes). Backlog block added (P1 zoom
  menu off-screen, P1 focus ring 2.42:1). Ruled out after checks: Tab trap (a script artefact), native canvas
  scroll on focus (0,0 in 4/4).

## Studio value inputs one text step smaller (session "Component List Item refactor", tier XS)

User: "Cho font size của value input trong studio nhỏ lại 1 cấp" → chose option 1 (Studio only; Input has no size below Small,
and every size but XLarge uses Body/Base/Medium). `inspector/inspector.css`: `.studio-inspector .zen-input__native,
.zen-select__trigger` → Body/Small/Medium tokens (12px/16px, weight 500); fields stay Small (32px). Probe: 12px inside the
inspector, 14px outside. `npm run qa -- --pages=top-navigation` PASS (known Modal-screen contrast ⚠; a peer's app-shell draft).
Backup: backups/studio-value-font-20261004-232115.tar.gz. Open question (not done): library `InputContent` uses
Body/Small/Medium for Small while the field uses Body/Base/Medium — check Figma (Backlog P3).


## Studio data slots: TopNavigation Top-Trailing like Figma (session "Mở lại port preview", tier M)
User: in Figma Top-Navigation's trailing is a slot (add/remove/change elements); the Studio showed nothing for the
selected action. Cause: code takes `trailing: TopNavigationAction[]` (data), the button is an internal part (read-only)
and the Studio slot registry knew JSX slots only. User chose "Slot dữ liệu trong Studio" (keep the API).
- Server `tools/studio/items.mjs` (wired in slots.mjs: SLOT_OPS/HOST_OPS, hash, ITEM_HELPERS; plugin forwards `item`,
  `updated`): insertItem / removeItem / duplicateItem / moveItem. Test `items.selftest.mjs` (12 cases) in selftest.mjs.
- Client: `slots/dataSlots.ts` (TopNavigation trailing = Top-Trailing max 2, largeTitleAction = Header-Trailing; Figma
  12013:39653 / 12014:44753), `slots/dataItems.ts` (canvas item = part whose props hold the item object; source items from
  SourceAttr.shape), `slots/DataSlotBlock.tsx` in SlotsSection, `editDataItem` in actions.ts (host remapped with
  hostLocAfter: the useToast line moves it), `inspector/DataItemPanel.tsx` in PartPanel (item fields via ObjectProperties
  `only`, move/duplicate/remove; banner for parts inside an item), StudioApp ⌘D / ⌫ on an item. Control-Slot (`controlBar`)
  added to registry.ts as an atom slot with `ghostFlow: "column"` (SlotLayer). ObjectProperties `selection`: generic list
  Move/Remove/"Add item" (copy of the last; fresh id/value) = the Backlog P2 list-items part.
- Checks: tsc; `node tools/studio/selftest.mjs` (2279 + slots 1761 + items 12); palette selftest 1243 (+ data-slot checks)
  and `--deep` (1396 items in 26 host slots); browser in `?ui=studio`: duplicate, move, ⌫ remove, + add (useToast added and
  removed), Segmented "Add item" (`unread-2`, snippet synced) then remove — the example file is byte-identical after.
  `npm run qa -- --pages=top-navigation` PASS (known Modal-screen contrast ⚠).
- Incidents: a raw U+2028 in items.mjs made one dev-server restart fail (fixed; restarted 5173 by hand), and for about a
  minute `slots/index.ts` exported DataSlotBlock before the file existed.
- Backup: backups/studio-before-data-slots-20261004-233225.tar.gz. Follow-ups: 4 lines in BACKLOG (same session).
