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

## Session "Bug" · Play: the list over the Top Navigation, the Bottom Navigation mid-screen (tier S; user screenshot: "lỗi scroll khi thiết kế xong mở play … đè lên trên top navigation")

- The page (quan-ly-task, Screen "iPhone 1"): Liquid Glass Top Navigation, Floating Glass Bottom Navigation, and a List
  in a Box at position absolute (top 178, height 683) that runs past the 844px Screen.
- Over the bar: a plain ListItem's wrapper is relative with z-index 1 (the row only isolates when interactive), the
  same layer as .studio-builder-screen__top (sticky, z-index 1) and later in the tree, so the rows painted over the bar.
  builder.css: .studio-builder-screen__content is `isolation: isolate`, one layer under the bars (Figma draws fixed
  layers above what scrolls); canvas and export get it too (same picture there, nothing overlapped the bars at rest).
- Mid-screen: the absolute Box's overflow scrolls the page but never grows the Screen, so its sticky bars stopped at
  its 844px foot. runtime.tsx useAbsoluteOverflow (Play / Present only): the Screen's min-height takes the lowest edge
  of its absolute layers (rect top + scrollHeight, or offsetHeight when the layer clips), skipping layers pinned to the
  bottom / centre / both edges (they move with the height), re-measured on resize, tree changes and image loads.
- E2E PT-30 (id from Giám sát): without the fix the bar stood 516px above the device's foot; without the isolation the
  Back button's point hit the DockIcon; with both, Bottom Navigation at the foot (0px) and Back on top.

