# Session log 2026-10-17

## Overlay buttons: Level=Inverse Subtle (user: "Thêm 1 button inverse subtle cho các button Overlay", then "thêm trong Figma rồi update lại trong studio") — tier M
- Figma `9nZv4uW2LT21yuHabMTCh1`, page ❖ Button: Button/Overlay 1026:8747 (+25, rows 20–24 of its grid, which had 5
  empty rows) and Button/Icon-Overlay 291:41855 (+30, rows 24–29). Each variant is a clone of the same Size × State
  Inverse variant (refs copied back: Leading/Trailing-Icon visible + swap, Text; icon set: Leading-Icon-Src), then:
  Container fill Background/Inverse/Subtle/Default·Hover·Pressed (Focused = Default), Disabled Background/Inverse-Disabled;
  label + icon Vector Content/Inverse/Strongest, Disabled Content/Inverse/Disabled; Effect/Overlay (blur) on every state
  of both sets (Icon-Overlay Inverse/White carry Shadow/Action/Basic; a translucent fill takes the blur as White/Black
  Overlay do); no gradient ring; Focus-Ring unchanged (Focus/Accent/Solid). Tree signature = the source variant except
  the icon set's effect binding. Level option order is Inverse · White · White Overlay · Black Overlay · Inverse Subtle
  (the API cannot reorder options). Set descriptions' Level line updated (`tools/figma-docs/component-descriptions.mjs`).
- Disabled content is Content/Inverse/Disabled, not On-Black-Overlay/Disabled as the other overlay levels: it flips with
  the mode like the Inverse/Subtle fill and Inverse-Disabled background (dark mode = dark ink on a light surface).
- Code: `inverse-subtle` in `buttonLevels` / `buttonOverlayLevels`, one rule in `button.css`, playgrounds on the Button
  page, paint matrix row in `docs/button-main.md`, Level line in the guideline source; regenerated docs/api,
  docs/guidelines, docs/ai-ui.
- Studio: Level option added to `docs/figma-contracts/component-properties.json` for both sets, then
  `figma-props-build.mjs` + `variant-sets-build.mjs` (Properties panel + Main component frame). Library keys are per set,
  so Studio → Figma import needs only the library publish.
- Contracts: `button-text.json` / `button-icon.json` patched with the new variants through `tools/figma-kit` (fetch +
  patch; live `__HASHES` ✓ for both sets). `lock --check` also failed on two sets this change did not touch (Segmented
  1204:11690, uncommitted patch of the session below; Dashboard header 4122:33402, contract committed without `lock`):
  `lock` rebuilt, ✓ 94 sets. Suites: Button/Overlay 9000/9000, Icon-Overlay 5940/5940 (3 modes). Gate: `npm run qa --
  --isolated --files=…` PASS (Button page + representative pages, dark, behaviour, 69 browser tests).
- Open: `studio:selftest` stops at `library-keys check` on 4 chart Sector sets with no key yet (another session's
  2026-10-17 chart work), not this change; the rest of the chain passes. Publish the Zen library so other files see the level.
