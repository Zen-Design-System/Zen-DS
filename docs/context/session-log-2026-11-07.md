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
