# Session log 2026-10-14

## Studio: icon picker on nested icons (session "Studio toggles + click", branch zen/fix/studio-toggles-click, tier S)

- Asked to explain round-3 item 3 (icon suggestions), the picker was measured on a Dashboard-template page: the Revenue
  card's DockIcon showed "Default in Figma" (1) and "All icons" (200 of 1598) only. Cause: `TablePartPanel` rendered
  `PartPanel` without `InspectorFileContext`, so `useFileIcons` had no file. Fix: the part panel gets the owner's file
  (`parseSrc(selection.src).file`); the picker now shows "Used in this file" (12). Gate: `npm run qa -- --isolated
  --files=src/platform/studio/table/TableCellPanel.tsx`.
- "Recent" and "Related" groups (proposal, not built) wait for the user's go.
