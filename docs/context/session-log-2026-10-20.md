# Session log 2026-10-20

## Use as mask ⌃⌘M + Box `mask` (Session A, branch `zen/feat/studio-use-as-mask-20261020`)

The last F9 item (plan decision 6). B does not build Box `mask` and agreed that A writes it in its Layout (diff sent to B
before shipping; B's conventions: JSDoc cites Figma, tokens-only CSS, a guideline row, the pull read in its own function).
- Library: `Layout/mask.tsx` `useBoxMask` reads the first layer as drawn (a Shape's drawing path, else its box with its
  computed corners; its offset, CSS rotate and scale) into an inline `<clipPath>` the Box points at
  (`clip-path: var(--zen-box-mask)`); the mask layer is `visibility: hidden` (Figma's mask draws nothing). Re-measured
  after every render and on resize. Vitest `tests/interaction/box-mask.test.tsx` (3). Shape page example (a photo in a
  star). Guideline row, API docs, AI UI catalog regenerated.
- Studio: `maskSelection` (edit/groupLayers.ts): 2+ layers → `groupSelection(…, { mask: true })` (the bottom one, first in
  the code, is the mask); a mask group or its mask → removeProp mask. ⌃⌘M (Ctrl+Alt+M elsewhere, `shell/modKey.ts`
  isMaskKey) in figmaKeys; menu Use as mask (several) / Remove mask; Quick actions; shortcuts list (also the missing
  ⌘G / ⇧H / boolean / Flatten rows). Layers: "Mask group" (unnumbered, as Figma), the mask layer with the contrast icon.
- Figma: push marks the group frame `mask` (named Mask group); plugin 3f0cf52 sets isMask on its first layer (and takes
  it off a Zen frame without mask); pull `maskOf` reads isMask, `maskProps` gives the Box `mask` when the bottom layer
  is the mask, and notes a mask higher up. Selftests push 328, pull 103, layer-meta 15. E2E FW-127.
