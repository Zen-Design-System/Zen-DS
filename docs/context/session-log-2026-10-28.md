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

## Session "Bug" · A component dropped on the empty canvas (tier S; user: "Vẫn chưa cho kéo component ra canvas trống như figma")

- Assets drag over the board outside every frame said "Drop it into a frame" (edit/assets/assets.ts). Now, on a page
  you made, boardDropAt gives the board place and the drop goes to builder/boardPaste.ts dropOnBoard, sharing Paste
  here's frameOnBoard (Giám sát: "gom chung logic với boardPaste.ts"): floatAt(code, 0, 0) in a new empty "Frame N"
  of 390 × 300, then, once rendered, setFrameBoxes to the floating layer's offset size (100 a side at least) and
  squashEdits(2) so one ⌘Z takes both; the join only when the fit sits right on the add (a quick ⌘Z in between leaves
  nothing to join). addFrame now resolves to the new frame's id (callers took a boolean: FramePresets keeps one).
- Still refused there: an App shell (a whole page: an empty Screen), and a component page's board.
- E2E (ids from Giám sát): B-55 Button → Frame N at 0, 0, fitted, one ⌘Z; B-56 Top navigation → its own frame;
  B-57 App shell refused, nothing written. The dnd campaign's "on the board, outside every frame" place expects the
  new frame now (it waits for the fit before judging and ⌘Z).

