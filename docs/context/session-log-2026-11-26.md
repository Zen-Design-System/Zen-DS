# Session log — 2026-11-26

## CI: Platform audit runs light and dark as two jobs (tier XS, branch zen/ci/platform-audit-split-20261126)

Asked by the user through the supervisor ("ok sửa cả hai việc nhỏ đi"): the one audit job ran light, then dark, and
came near its 45-min limit (main: 32–37 min on 2026-11-24/26; #427 was cancelled twice).

- Measured from main's logs: setup 2 min, light 16–21 min, dark 16–17 min. Light is the longer one because pages that do
  not answer in 180 s at loading (dialog, ai-chat, search, image, calendar, visually-hidden: a different page each run)
  cost 3 min each before they pass in a new browser.
- `.github/workflows/ci.yml`: one `platform-audit` job with a `light` / `dark` matrix (`fail-fast: false`), each with its
  own dev server; checks are now "Platform audit (light)" and "Platform audit (dark)" (main has no branch protection, so
  no required check by that name). Limit 35 min per job (about 18–23 min expected).
- Not done: why those pages stall at loading. The retry already passes them; noted for the supervisor.

## Status colors of the project's own (tier M, Bug session)

User via Giám sát: "Phần status color trong setting màu dự án cho phép thêm màu mới vào chứ k chỉ chọn màu có sẵn,
hoặc cho chỉnh từ chính màu hiện tại". Branch `zen/feat/studio-status-custom-colors-20261126`, from main 8c920f53.

- **Model (`tools/studio/project-theme.mjs` + `.d.mts`).**
  - `theme.status[role]` is a shipped ramp's name (as before) or `{ hex }` (`StatusSource`, `statusSource`). A hex
    that is a shipped ramp's step 9 becomes that name.
  - `projectPalettes().status`: an alias for a name, or a ramp generated as the Primary's (`generateExpectedPalette`
    against the Neutral's dark background). `lc` is white text (Content/On-Colors) on step 9 by APCA.
  - `projectThemeCss` and `projectBaseValues` write the generated steps (light, dark, alpha) or the alias, so
    theme.css, the Variables window, the Figma export, the phone and the preview all take a colour of the project's
    own with no other change.
  - Old projects (names only) write the same CSS as before.
- **UI (`project/ProjectSetup.tsx`).**
  - Each status role is one row of the panel's grid (`minmax(0, 1fr) 112px`, as the chart sectors): the ramp select
    ("Custom" while it holds a colour of its own) and a ColorField with the picker.
  - The ColorField opens on the role's current colour.
  - The section notes "White text hard to read on <role> · Lc n" for a colour of its own below Lc 60.
- **Tests.**
  - project-theme selftest: 2102 checks, 11 new: kept / folded to a name / bad value / generated ramp / CSS / Figma
    values / old project unchanged.
  - Studio E2E: FW-298 (new, shell group, so the gate runs it).
- **Gate (`qa --isolated`): PASS.** Studio E2E: 464 works, 0 broken, FW-298 included. `npm run build` ✓.
- FW-299 and FW-300 are unused; they go back to Giám sát.

## Play's stage: the opposite of the page, or a colour the page picks (tier S, branch zen/fix/play-stage-black-20261126)

User (through Giám sát): "Phần prototype khi chạy cả dark/light mode nền nên là đen để nổi phần UI lên". Then, to this
session, while the first version (always Background/Black/Solid) was in the gate: "hoặc có thể cho ngược lại. dark thì nền
prototype là nền sáng, light thì nền tối. nền cho phép user chỉnh sửa bằng picker". The gate was stopped and the slot
handed back; the black version never shipped.

- Before: Play's stage was `.studio-present`'s Canvas/Default in Play's mode, light grey (247/255) round a light page.
- Default now: Background/Neutral/Solid in Play's mode, #121212 round a light page, #FDFDFD round a dark one, whatever the
  chrome (the Zen Studio menu's Dark mode stays UI only).
- Picker: Prototype tab, nothing selected, "Prototype settings" (Figma's place). Then the user (through Giám sát, after the
  session was archived by mistake and reopened): "Nền prototype cho chọn bằng picker tự do không chỉ chọn token". So two
  rows, as Figma's fill row: Background, a free ColorField with its colour picker (typed hex or picked; Auto as its
  placeholder, `inspector/rowFields.tsx RowColorField`), and Variable, the Studio's SwatchControl on the Color/Background
  tokens that paint opaque (flat, subtle, pale, overlay ones would show the Studio through Play); Neutral / Solid is Auto.
  Header `prototypeBackground` holds a `#RRGGBB` or a fill key (`pageModel.ts` + selftest, `setPagePrototypeBackground`
  outside ⌘Z as the canvas background), `proto/prototypeBackground.ts`, Player.tsx `--studio-play-stage`.
- On the stage: Player.tsx reads the painted colour into `data-stage` (dark / light). Dark: the device frame and an
  unframed viewport box take a 1px Border/Overlay/Subtle edge, the grips Background/White-Overlay, dark scrollbars. Light:
  the black bezel shows as it is, grips Black-Overlay. `:where()` keeps board.css's Info-blue hover and drag on top. In Auto
  the device paints Canvas/Default under its Screens.
- Present of an example frame keeps the page's Canvas: it sets the example straight on the page, no box of its own.
- Met on the way and fixed: an unframed fixed device has rounded corners, and the Bottom Navigation's progressive blur
  greyed them with the stage's colour. #425's mask (the Screen as its blur's backdrop root) now covers Play's device too.
- E2E FW-296 (the default: opposite of the page, chrome Light and Dark) and FW-297 (Auto at first; a variable and a typed
  hex are written in the header and Play paints them round a light and a dark page, its stage side following; Neutral /
  Solid goes back to Auto).
- Runs (Giám sát's slot 17:54, private :5289): stage 247 → 18 round a light page (chrome Light and Dark), 18 → 253 round a
  dark page, #F4D35E painted as rgb(244, 211, 94) on its light side; the unframed corners clean. FW-296 and FW-297 work
  (FW-296's first version failed on main's CSS); prototype group 66/66, no retries; baseline records both.
- Gate `npm run qa -- --isolated --files=…` PASS: static steps, Studio E2E 465 works · 0 broken in 5 shards, no retries.
  `npm run build` passes.

## Theme preview: a card with a picture is two frames (tier S, Bug session)

User: "Card preview trong setting dự án ảnh và card border đang không đồng tâm".
- **First fix:** picture radius = card radius − card padding. It gave a square picture: Small card 16 − 16 = 0.
- **Options shown:** A (square picture), B (card at XSmall spacing) and C (full-bleed picture top).
- **User's rule:** "padding ảnh và padding text khác nhau. chia làm 2 frame. frame chứa ảnh padding để bo góc đồng tâm.
  Padding text thì như card. Bổ sung guide này vào skill".

Branch `zen/fix/studio-preview-card-concentric-20261126`, on main f0c1985f.

- **`project/ThemePreview.tsx` + `project.css`.** The picture cards (Cards "Track your trips", "Gain control"; the
  Website hero) are two frames:
  - the card pads nothing (`__media-card`);
  - `__media` pads the picture by Card-padding-xsmall, and its radius is `calc(var(--zen-card-radius) -
    var(--zen-card-padding-xsmall))` (`CARD_MEDIA`);
  - `__media-text` keeps `--zen-card-padding`;
  - the hero's grid takes gap none: the frames' paddings space it.
- **Measured** on a private server (rounded, compact): picture radius = card radius − 8. Cards: 16 → 8, text frame 16.
  Hero: 24 → 16, text frame 24.
- **Skills.** The rule is in `zen-component-usage/SKILL.md` (design rules), `zen-figma-design/references/
  screen-rules.md` (beside the concentric rule) and `zen-build-qa/SKILL.md` (radius checks).
- Gate `npm run qa -- --isolated --files=…` PASS: static steps, Studio E2E 463 works · 0 broken in 5 shards (B-33,
  PT-57 loaded twice, a known Chromium load cut). Merged origin/main 73493bf1 (#430, #431): CHANGELOG and this log keep
  both sides, main's first.
