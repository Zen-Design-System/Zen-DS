# Session log 2026-11-02

## AppShell collapse icon (session Bug, tier S)

- User: "một số example appshell bị lỗi size icon button thu gọn sidebar", then "hình như tất cả đều lỗi … có thể lỗi từ chính appshell".
- Figma (use_figma, 9nZv4uW2LT21yuHabMTCh1): every Header/AppShell variant's Collapse (16243:290464) is a Button/Icon-Flat
  Small 32 whose Leading-Icon is 20×20, bound to Element-Size/Popular/Base; the set's own Small variant has the 16px
  Button/Icon-Size/Small. Code drew `IconButton size="sm"`, so the toggle glyph was 16 in every AppShell (the Sidebar's own
  toggle, `.zen-sidebar__collapse`, was already 20).
- Fix: `app-shell.css` sets `--zen-button-icon-size: var(--zen-element-size-popular-base)` on the toggle's button (menu
  toggle too: same wrapper). Test: tests/interaction/app-shell.test.tsx checks 32×32 button, 20×20 glyph.
- The user's other ask, AppShell examples on a page of their own, went to session "Docs platform chrome → Figma B5".
