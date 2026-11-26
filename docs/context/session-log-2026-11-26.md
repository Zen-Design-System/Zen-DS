# Session log — 2026-11-26

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
