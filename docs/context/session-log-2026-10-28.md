# Session log 2026-10-28

## Session "Bug" · Input error focus ring (tier XS; user screenshot: "phần focus lúc lỗi này đổi phần neutral focus qua negative")

- input.css "Error + focus" (code-only: Figma has no Error-Focused state): the 3px outside ring on an invalid field is
  now --zen-color-focus-negative-subtle (light negative-alpha-4, dark too) instead of focus-neutral-subtle; the Negative
  border stays. One rule; Select/Textarea/date fields share .zen-input-field. style:check ✓.

## Session "Bug" · Device bezel blur (tier XS; user screenshot: "Vẫn còn lỗi blur viền thiết bị")

- Play / Present draw the device as a rounded, overflow-clipped, transform-scaled box over a black bezel; Chromium does
  not clip a backdrop-filter to those rounded corners, so the Top Navigation's blur / progressive blur hazed the bezel at
  the top corners. board.css adds clip-path: inset(0 round var(--studio-device-screen-radius)) on the framed viewport.
- Proof: a Chromium repro (scaled rounded screen + the real 6-layer progressive blur) went from 3403 / 5272 smeared
  pixels inside the corner to 0 at device scales 0.8 and 1. Gate (--isolated, board.css): PASS, Studio E2E 403 works ·
  0 broken (AP-02 passed only on retry, after #341's fix).
