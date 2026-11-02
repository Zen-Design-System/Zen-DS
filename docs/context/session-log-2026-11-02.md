# Session log 2026-11-02

## Session "docs-chrome-b5" · Popover Search focus ring (tier S; user 2026-11-02)

- Ask: "Thêm focus ring cho ô Search trong Popover." It answers the P3 question from the B5 gate (behaviour warning
  on popover@1512: Figma Search/Popover 1604:27401 draws Focused/Typing with Input/Border/Popover-Search, transparent
  except in Neutral-S7, so only the caret showed focus).
- `search.css`: the popover Focused/Typing rule keeps Figma's 1px Popover-Search border and adds Search/Default's 3px
  OUTSIDE ring, Color/Focus/Neutral/Subtle (was `box-shadow: none`). It fits the Popover's 4px padding (the Popover
  clips with overflow hidden) and the Sidebar's 8px.
- Removed the question from `BACKLOG-user-and-later.md`.
