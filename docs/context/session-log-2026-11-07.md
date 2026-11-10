# Session log — 2026-11-07

## Studio: the Frame tool draws a plain frame (tier S)

User: "tôi vẫn không tạo frame 1 cách bình thường được mà nó tự nhảy theo thiết bị … khi user vẽ frame nên mặc định là
frame bình thường, trừ khi user chọn kích thước màn hình, hoặc tích vào checkbox đây là screen".

Cause: `frameMove.ts` gave a dragged frame `device: deviceFor(width)` — under 600 px a phone Screen (iOS/Android bars,
mobile layout, phone modes), under 1024 a tablet. A click already made a desktop frame.

- Dialect: `<Screen frame>` marks a plain frame; `frameCode({ plain })` writes it on `device="desktop"`; validation
  refuses `frame` with a value or on a phone/tablet. Runtime Screen drops the prop (never on the DOM).
- `frameMove.ts`: drag and click → `addFrame(…, { plain: true, name: "Frame", empty: true })`.
- `FramePanel.tsx`: section "Frame" for a plain frame with a "This is a screen" checkbox (on → device by width, off →
  `frame` + desktop, layout removed; one edit each); a plain frame hides Device, Tablet layout, the app-frame parts
  and the Breakpoints section. A screen size preset removes `frame`.
- `FrameChrome.tsx`: no breakpoint view switch on a plain frame (`shape.plain` from BuilderBoard).
- Paste on the empty canvas (`boardPaste.ts`) keeps the device by width (not drawn).
- Tests: builder selftest +4 checks; E2E row B-63 (375-wide drag → plain frame, no bars; checkbox → phone; ⌘Z).
- Gate: `npm run qa -- --isolated` PASS, Studio E2E 459/459 (B-63 recorded in matrix.baseline.json).

## Studio: pull prototype variables from Figma (W-52 B4, tier M)

Approved: doc `docs/research/studio-prototype-variables-2026-10-31.md` §7 (2026-10-31), B4 "Pull (tuỳ chọn)"; picked by
the supervisor 2026-11-07. Spec card: doc §4.1. Plugin unchanged (the pull runs through use_figma, not the plugin).

- `figma-pull.mjs figmaReadCode`: a reaction keeps its actions together (`actions`: Set variable with its
  VariableData, Conditional with its blocks, several actions; one Navigate/Open/Close/Back stays the flat shape); a
  layer's `varBind` (characters, Visible, an instance's bound component properties, the nested text that shows its
  words); a hidden layer whose Visible is bound is read; the frame's `variables` (every variable named, plus the rest of
  a "Prototype · …" collection, default mode). Found on the way and fixed: the root frame's own reactions (a Screen's
  After delay) were never read from Figma.
- `pageFromFigma`: `vars` (names in words → camelCase, FLOAT from 32 bits, colour/alias/modes noted), bindings
  (`{vars.x}`, `hidden={!vars.x}`, `prop={vars.x}`; a Figma property through the set's mapping, a variant whose Figma
  options differ from the code's noted), `figma-proto.mjs protoOfReaction(reaction, names)` for `actions` (else-if →
  nested `proto.if`, an empty first block → the opposite condition, NEGATE / VAR_MODE_LOOKUP / Set variable mode noted).
- Update from Figma: `figma-diff.mjs` counts `{vars.x}` as words (labels show `vars.x`), `mergeFigma` returns `declare`
  (variables the merge reads that the page lacks); `figmaUpdate.ts` sends them as op `replaceElement` `vars`
  (arrange.mjs, as pasteCode): one edit, one undo step.
- Tests: figma-pull selftest +15 (B3 round trip, second push/pull identical, a Figma-made frame, live fixture),
  figma-diff +5, arrange +1. Live: QA frame with the plugin's own calls in the Zen file (page 15872:3), read with the
  minified reader (6 readers stubbed, 25 KB) → `fixtures/figma-proto-vars.json`; frame and collection removed after.
- Gate (2026-11-10, after the Mac slept through the first run): `npm run qa -- --isolated --files=<12 files>` PASS,
  Studio E2E 459/459 (SE-12 on retry); `npm run build` ✓. No E2E row added (the pull runs outside the Studio).
