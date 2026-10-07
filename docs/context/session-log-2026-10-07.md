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
