# Session log 2026-11-23

## Dark glass: white rim and grey corners (tier S, Bug session)

The user reported (with a screenshot of Bottom Navigation floating-glass on a dark phone Screen in Studio): "Darkmode
glass vẫn còn bị trắng". Branch `zen/fix/glass-dark-frame-theme-20261123`. Two causes:

- **White rim.**
  - "Frame theme: Dark" puts `data-theme` on `.studio-frame`, outside any ZenProvider. `useLiquidGlass` re-attaches
    only when `useZen().theme` changes, so the light map kept its light-mode strength. The dark rule's
    `--zen-liquid-glass-light: 0.05` was never read again (1b95b5c5 fixed the ZenProvider path only).
  - Fix: `_shared/liquid-glass.ts` keeps one MutationObserver on `data-theme` attributes. A change on an element around
    an attached glass schedules its redraw.
  - Test: `tests/interaction/liquid-glass.test.tsx`. It waits past the ResizeObserver's first callback; without the fix
    it fails.
- **Grey corners.**
  - The progressive blur under the floating bar is drawn past the frame's rounded clip, square, with the light board
    blurred in: corner 64 vs 31 grey on a dark Screen.
  - Fix: `builder.css` gives a Screen on the board that holds a `.zen-progressive-blur` a mask, which makes it the
    backdrop root.
  - Result, measured on a private Studio server (the user approved the browser run; Giám sát was not reachable): the
    corners are 31, round, as the top ones.
- **Gate (`qa --isolated`): PASS.**
  - Studio E2E: 462 works, 0 broken.
  - Vitest: 98/98.
  - Figma contracts, platform audit and dark mode audit: 0 errors.
  - 12 contact sheets opened: no glass on those pages, nothing changed.
- `npm run build` ✓.
- **Play (user: "chạy prototype vẫn lỗi darkmode của glass").**
  - Play's Dark mode sets `data-theme` on `.studio-player`, also a plain element; the user's Studio runs main, without
    this fix.
  - Checked on this branch, private server: after "Dark mode" in the Play bar the pill's light is redrawn at 0.05.
  - The device's bottom corners stay dark: the stage takes the played mode.
