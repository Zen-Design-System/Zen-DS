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
