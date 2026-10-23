# Session log 2026-10-24

## Session C · Prototypes pushed to Figma (tier M; BACKLOG P3, user-approved via the progress session)

Branch `zen/feat/push-prototype-20261024` from main 1b9a9cd0; plugin `studio-import` dcd3af3 + 6490d95. User, verbatim: "Cho C
(đang rảnh) làm luôn P3 'Push Overlays and prototype actions to Figma': push mọi Screen và Overlay thành frame, kèm
reaction Navigate / Open / Close overlay / Back."
- Push: `figmaPackage` writes `frames` for every Screen, Screen state and Overlay (`figmaFromPage` takes `frame`; an
  Overlay's frame hugs, no canvas or height; a page of one Overlay draws it, so Copy for Figma on an Overlay frame works
  now). The old notes ("only the first Screen", "Overlays not pushed", "interactions not pushed") are gone; what Figma
  has no reaction for is named per action, and an action on a part with no layer of its own is counted.
- `tools/studio/figma-proto.mjs` (new): action ↔ reaction both ways, Motion tokens (120/200/280 ms, Emphasized curve;
  the push selftest compares them with tokens/source/motion.json), Overlay settings as hand-step notes, ACTION_LAYERS
  for Dialog, Side Panel and Bottom Sheet buttons (read in the Zen file; the sheet's two are both "Button/Main", so
  its path is a list of names, plugin layerAt takes one; checked live).
- Plugin: `place` → `placeFrame` per frame, side by side, then `applyReactions` (setReactionsAsync, nested layers too);
  `existingRoot(pkg, part)` keeps a whole page's frames (`set = page`) apart from ⌘C copies and reuses the old
  whole-page frame for the first Screen; a copy's reaction finds the page's frames on the page.
- Pull: the reader reads `reactions` (destination by the frame id the import kept); `pageFromFigma` writes `proto.*`
  back, the frame's After delay as the Screen's `onDelay`; a Dialog button's reaction goes into its action prop when the
  page has one. Native paste: an Overlay root hugs; interactions are a note (the plugin's import carries them).
- Live in the Zen file (QA page, removed): the real importer (unrelated parts stubbed) placed 3 frames 120 px apart,
  the Overlay 440×212 hugging; Invite → Open overlay (Dissolve 0.2 s, CUSTOM_CUBIC_BEZIER); the Dialog's Primary →
  Close overlay; imported again: 0 created, reactions kept. The reader read back Push right 0.28 s, While hovering and
  After delay 1.5 s.
- Tests: push 467 (+16), pull 135, native 150 (+1), plugin `npm test` (multi-frame, legacy frame, ⌘C copy, removed
  reaction, missing destination); E2E HO-16 (new, Export › Figma of HTML_PAGE; id from Giám sát).
