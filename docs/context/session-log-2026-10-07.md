# Session log 2026-10-07

## Studio builder GĐ3 · M2: Quick insert (session "Studio builder tool planning", tier M)

- `builder/library/QuickInsert.tsx`: a module-level open flag (openQuickInsert / closeQuickInsert), ⇧I in StudioApp's
  shift branch (not while an example is in use), mounted with the Studio dialogs. Search (variant popover) as a
  combobox over a listbox (aria-activedescendant), ↑/↓ wrap, Enter → insertAsset (same target as Assets), Esc / outside
  pointerdown close and give the canvas the focus back; max 40 results. A pointer move counts only when the pointer
  really moved (Chromium sends one when the list changes under a still pointer, which stole the keyboard's focus).
- `preview.ts` (itemCode: palette code, toasts → proto.toast, platformMedia inlined; previewPageText: a one-Screen
  page importing the item's components) and `ItemPreview.tsx` (engine parsePage, lenient: values a page cannot hold
  are dropped; Dialog / ModalForm / SidePanel / BottomSheet forced `open={false}`; a ZenPortalProvider inside the
  inert pane; 400px stage scaled to fit; canvas preview modes). Found by LB-06: ModalForm opened with `open` dropped
  and its focus trap took the focus from the search field.
- target.ts `describeTarget` ("Into Stack · <frame>" / "After <layer>"); GROUP_ICON moved to catalog.ts (Assets and
  Quick insert); Shortcuts dialog rows ⇧I and P. The panel uses the Popover surface (translucent background + its
  blur + Popover/Subtle outline; `zen-allow-popover-layer`, it floats). Search: a 3-letter token must equal a
  guideline keyword ("thẻ" no longer lists a dozen items through "theme"); selftest 78.
- E2E LB-05 (⇧I, Enter into the selected Stack), LB-06 (↓, real preview, Esc no change), LB-07 (example page,
  nothing selected; reopens the host page first: the rows before leave a builder page open). build-check gains a
  Quick insert step (13/13). Gate PASS, 106 works / 0 broken.

## Studio builder GĐ3 · M3: icons, photos, icon swap, zen-media (session "Studio builder tool planning", tier M)

- `library/iconSearch.ts` (pure): iconGlyphs (line/solid of one drawing = one glyph; a cut-only drawing takes medium;
  940 glyphs), searchIcons (AND over tokens: word 60/45 +10 first word, synonym 50 +10 on the name's first word +5 for
  the row's first word, typo 35 / 45 on the first word; ties shorter name, A–Z), searchPhotos (alt + key words).
  `iconSynonyms.ts` EN + VI → icon-name words (and photo alt words). Selftest `iconSearch.selftest.mjs` 39 (in
  studio:selftest; synonym words checked against the icon names and PlatformMedia.tsx's alt texts). Its first run
  showed the tie problem (annotation-x before x-close for "đóng"), hence the first-word and row-order bonuses.
- `media.ts`: LIBRARY_PHOTOS (viewer, mountainRoad, site[0–5], feed[0–7] under file-name keys), resolveMedia,
  photoCode (builder page: `src="zen-media:<key>"`; example: platformMedia.<path>, pasteCode adds the import).
  renderPage resolves `zen-media:` on every prop value (canvas, Play, previews).
- `edit/assets/assets.ts`: `Insertable` (label, root, code(file), refusal, state, icon) for palette items, icons and
  photos; insertItem (canEdit; an icon with an Icon selected → setProp name, one undo step), dropAsset / pressAsset take
  Insertables; insertAsset(item) kept.
- AssetsPanel: Segmented Components · Icons · Photos (sized to its labels: full width cut "Components"), Icons grid of
  IconButtons (Line / Solid, 240 at most, swap hint, plural count), Photos grid (2 columns). Quick insert: groups
  Components (20) · Icons (12) · Photos (6) for a query, components only when empty; "Swap the selected Icon" line;
  icon / photo previews without the engine.
- E2E LB-08 (Icons "xoá" → trash, added), LB-09 (swap to heart, one Icon, ⌘Z), LB-10 (Photos "cà phê" → zen-media,
  the canvas img loads this build's URL), LB-11 (Quick insert "đóng" → an x Icon), LB-12 (example page: platformMedia +
  import). build-check gains a photo + Icon step (the photo loads site-cafe-<hash>.webp). Gate PASS 111 / 0. I-11
  timed out once with --no-retry after the library group (2/2 alone): Backlog P3 next to I-15.

## Studio builder GĐ4 spec (session "Studio builder tool planning", tier XS)

- Read-only survey of the Inspector against Figma's instance panel (an Explore agent, file:line evidence in the spec
  §2): Figma order for 55 / 151 components with code option labels; icon swap without preferred values; no component
  swap in ReactNode props; nested instances booleans only, one level; no Reset all overrides; no Hug/Fill/Fixed on
  instances in the Inspector; Detach refused on builder pages. Figma capture: 144 sets (VARIANT 269, BOOLEAN 144,
  SLOT 59, INSTANCE_SWAP 36, TEXT 24); figma-props-read.js keeps no preferredValues.
- Spec `docs/research/studio-builder-instance-spec-2026-10-07.md` (M1 panel parity + Reset all, M2 swaps, M3 nested
  props + one undo step across owner and nested, M4 sizing + Detach on builder pages; Q1 sizing approach, Q2 swap the
  whole layer, Q3 preferred values from Figma, Q4 what Reset all keeps). Waiting for the user's OK.

## Studio builder GĐ4 M1 (session "Studio builder tool planning", tier M)

- User approved the GĐ4 spec: Q2 Swap instance via Quick insert, Q3 preferred icons read from Figma, Q4 Reset all keeps
  the content. Q1 (sizing) asked "which is friendlier?": answered (b) is cleaner in Layers and code but an L library
  change; proposed (a) wrap in a Stack + fold the wrapper in Layers, unwrap on Hug, move/delete it with the instance.
  Recorded in the spec §8, to settle before M4.
- Figma option names: generated rows carry `options` (code value → Figma name; a set by its last path part); PropField
  `optionLabels` → EnumControl lists Figma's options first in Figma order (`figmaOptions`, matchOption maps md ↔ medium),
  code-only options last. MixedProperties uses the same names and labels.
- Coverage: 15 more Figma sets mapped (70 components). `inheritedProps.ts` adds props a component takes from another
  component's props type (`extends` clause, or ALIAS_EXTENDS for type aliases build-api does not read: NumberField,
  TextAreaField; BadgeCounter's leadingIcon is set by the component and left out); shared by propSchema and
  figma-props-build; selftest 11 (ALIAS_EXTENDS matched against the source).
- BACKLOG 306–310: nested groups in the map (`nested`: Label from Primitives/Input/Label, Help-Text from code props
  until the Figma set is read in M2), object toggles (`on: { code }` → setProp expression; the object's row shows only
  while set), editor `icon-toggle` (switch + picker; off writes false, on resets to the default).
- Reset all overrides: `resetAll.ts` (design editors, fixed values only, KEEP value/open/type/as/headingLevel…, required
  props kept), DesignPanel header ↺ (zen instances), one runPlan of every planPropReset; selftest 12.
- E2E `instance` IN-01…IN-06 (fixture frame "E2E instance"); the rows that picked "primary"/"sm" now pick the Figma
  names; IN-04/05 wait for the switch to flip (layer switches read the rendered props, ~0.3–0.5 s after the source).
  build-check step 6: "Primary" + Reset all + 2× ⌘Z. Full matrix 117 works except the known flaky I-15 (3/5 alone).

## Studio builder GĐ4 M2 (session "Studio builder tool planning", tier M)

- Figma read (use_figma, read-only, 4 parallel calls; one call of 25 sets timed out at 60 s): every INSTANCE_SWAP's
  default and preferred-value count. Preferred values hold the whole icon set (1,569–3,534; Chat bubble 4), so the
  user picked "Figma's default + the icons this file uses" over a hand-written list. Stored in component-properties.json
  (`default`, `preferred`, `swapRead`); figma-props-read.js reads them from now on.
- figma-props-build: swap rows carry `default` (an icon name); toggles `on: { swap: "<Src prop>" }` start from it (Button
  Leading/Trailing → icon-plus-line); Slider's Icon boolean skipped (its icon-toggle row switches it).
- IconControl: grouped popover (Default in Figma · Used in this file · All icons) when not searching; the file's icons
  come from studioApi.source via InspectorFileContext (iconSuggestions.ts pure, selftest 5).
- Server op `replaceElement { code, state? }` (arrange.mjs replacePlan, slot op, hash required): the code takes the
  element's place in a child, a prop value, a .map row; key kept; names as pasteCode; unused imports go; cloning `only`
  respected. arrange.selftest +4 cases (36).
- Client: slots `swapSlotLayer` (⇄ menu on atom-slot rows, palette items of accepts.only), `swapSelection` + assets
  `swapItem` / `swapTarget`, Quick insert mode "swap" (quickInsertState.ts; header ⇄, canvas menu "Swap instance…"),
  SlotConfirm verb "swap".
- E2E IN-07…IN-11 (fixture: Badge with a heart icon, ListItem with an Avatar), build-check 15 steps (Swap instance on
  the production engine, 135.5 KB).
- I-14 (WP-E) expected the old fixed Leading-Icon (icon-check-line); it now expects Figma's default (icon-plus-line). Caught by the gate's full matrix.

## Studio builder GĐ4 M3 (session "Studio builder tool planning", tier M)

- Nested instances: `nestedRows(name)` builds a nested component's rows from its Figma groups (own variants with option
  names, text toggles such as Button Leading-Icon, then swaps / texts / booleans), else its design props (choices,
  switches, icons); NestedInstanceGroup renders fields (PropField with optionLabels / defaultIcon) and toggles, `when`
  read on the nested hit's props. Before: booleans only.
- useNestedInstances takes a nullable element and is read once in DesignPanel (`nested` prop to GroupedProperties and
  NestedProperties; `sourceOf(item)` added).
- Reset all overrides: nested instances written inside the owner in its file join; one request `many` setProps with
  `opsByLoc` (arrange.mjs manyPlan: each loc its own setProp / removeProp list; selftest case 37). Elsewhere-written
  nested instances (shared code) are left alone. Tooltip counts the nested ones.
- E2E IN-12 (Avatar in Leading: Shape · Size · Theme · Background · Status · Focus; Size › Large writes the nested
  Avatar), IN-13 (Reset all: ListItem `selected` + nested Avatar `size` in one edit, one ⌘Z). Fixture ListItem gains
  `selected` and an Avatar `size`. Full matrix in 3 chunks: 124 works; build-check 15/15 (engine 135.6 KB).

## Studio builder GĐ4 M4 (session "Studio builder tool planning", tier M)

- User settled Q1: "(a) wrap in a Stack + 3 fixes"; and asked to fix the flaky I-15 in its test (waits for `sm · N`
  before ⌫).
- W / H for an instance: `select/instanceSizing.ts` (store the canvas publishes), ResizeLayer measures it (written mode,
  else crossFits → Fill / Hug) and plans `set` with planResize (typed px: `corner` so never fullWidth), `planFill`,
  `planHugAxis` (resize.ts: Hug unwraps a Studio wrap Stack that sizes nothing else, op unwrap). `write(…, keep)`
  keeps the instance selected inside a new Stack; an unwrap selects it where the Stack was; WrapRecord `inverse` /
  `keep` make ⌘Z / ⇧⌘Z re-select it. Inspector: `inspector/InstanceSizeGroup.tsx` (SizeField from SizingSection, new
  `onInput`) in the Layout section of Zen instances.
- The Stack follows: Layers fold it into the instance's row (`isStudioWrap`, alias, `data-wrapped`); `studioWrapOf`
  (slots/actions.ts, from the source: `stackTagBefore` + studioWrapper) makes remove / duplicate / move (actions.ts) and
  stepLayer / moveLayer (edit/arrange.ts) act on the Stack and select the instance inside (`insideWrap`);
  moveAvailability reads the Stack's siblings.
- Detach on builder pages: `tools/studio/browser-detach.mjs` (lazy chunk, 16.6 KB gzip; engine 136.9 KB with
  jsx-source split into its own chunk), `loadDetach`, `localDetachPlan`; detach.mjs `pageLayout` turns the recipes'
  inline styles into Layout props on *.zen.tsx (max-content → width="hug", flex 1 → Fill) and refuses the rest
  (EmptyState, DescriptionList). Selftests: detach page cases, engine-iso graph of browser-detach.
- E2E IN-14…IN-17 (128 rows); build-check 17 steps (detach chunk on its own; Detach on the build).
