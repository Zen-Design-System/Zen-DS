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

## Session "Bug" · Liquid Glass white rim in dark mode (tier S; user screenshot: "Liquid Glass ở darkmode bị trắng")

- Cause: the glass rims are Liquid-Glass/White-Overlay (70 % / 40 % white in both modes) and _shared/liquid-glass.ts
  draws the GLASS light white at 80 % in both modes; Figma's GLASS light barely lifts a dark fill (Floating-Glass
  9017:42257 in dark: canvas 16, fill 31–35, lit rim 52, far rim 47; in light the rim is ~254).
- Fix: in dark mode the Normal glass (BottomNavigation Floating-Glass pill + Glass action, TopNavigation Liquid Glass
  action + group, AiChatField Liquid Glass) takes Border/Neutral/Pale + Border/Popover/Subtle rims and
  `--zen-liquid-glass-light: 0.05`, which liquid-glass.ts reads as a factor on the drawn light; the hook re-attaches on a
  provider theme switch. Light mode and the Black-Overlay glass keep their rims.
- Measured (Chromium, bottom pill column, dark): before lit rim 225 · sheen 118→36 · far rim 194; after 61 · 36→32 · 51.
  Light unchanged (rim 255).
