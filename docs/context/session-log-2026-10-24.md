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

## Backlog triage · "Backlog (plan before opening sessions)" (tier XS, docs only; started by the progress session)
- All 53 entries checked against main 545216b6: grep, the named files, git history, and two read-only Figma variable
  reads (Bubble-Chat-Others-Business is Surface/Default in all nine modes; Popover-Search is still NaN in S1–S6).
- 10 done, 2 stale, 3 duplicates of archived entries, 25 partly done (rewritten to what is left), 13 still open
  (5 kept as written, 8 merged into group entries). 48 originals archived with their verdict, text unchanged.
- Left: 35 entries under 7 owner groups (business, Studio, components, designer, platform, tooling, design check);
  4 P2: the LICENSE review, the registry's user steps, ModalForm `header={false}` without a name (a11y), and the
  contrast/targets baseline seeding. "## Open items" untouched; nothing P1-urgent found. No work started.
- User "Giao 35 mục theo đề xuất": the Designer entry moved to QUESTIONS.md / .vi.md as the 2026-10-24 designer batch.

## Session B · platform-audit `clip` check and self-test (tier S; Tooling 2a + 2b, user "Theo đề xuất", handed over by chart-contract-suites)

- **2a `clip`** (`tools/platform-audit/quality-checks.mjs` controlClip, wired in audit.mjs like `fit`: `--quality`,
  error, baselined). It reports three cases:
  - a control (button, link, tab, option, input…) cut off by an `overflow: hidden | clip` or `contain: paint` ancestor
    (> 2px);
  - a control wholly past that edge while a sibling control of the same parent shows;
  - a control whose visible middle is under another element of the example (elementFromPoint, the window scrolled to it
    and back).

  Not reported: scroll containers, a device frame's bottom edge, a group hidden as a whole, floating layers and scrims,
  invisible hit areas, the docs chrome, and a bar over the scroll container the control scrolls in.
- **2b** `tools/platform-audit/selftest.mjs` (`npm run platform:audit:selftest`, gate harness list, CI):
  - fixtures with the real tokens.css and typography.css in headless Chromium, no dev server;
  - each kind, with a clean twin: scale, roles, hierarchy, rhythm, ladder, fit, card-gap, legend-column, outline,
    outline-h1/-start/-card/-siblings, clip (10 fixtures);
  - pageChecks is cut out of audit.mjs by its top-level braces (the script runs when imported).
- **Gate bug fixed:** tools/qa/run.mjs ERROR_KINDS missed `counts` (an error since 2026-10-15), and `card-gap` and
  `legend-column` (since 10-16), so the gate passed them as warnings. The self-test now checks that the list equals
  audit.mjs SEVERITY's errors.
