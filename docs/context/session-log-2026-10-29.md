# Session log 2026-10-29

## Studio prototype walk (docs only)

- User: "plan testing lớn, tự tạo project, màn UI, tự nối prototype từng bước trên studio … rút ra khuyết điểm", then
  "test với nhiều case phức tạp và ui phức tạp hơn".
- Walked by hand in the Browser pane on a private server (:5281, worktree `studio-prototype-walk-20261029`, AuthGate
  off locally via `VITE_ZEN_LOCAL_WALK`, not committed): project "Phòng khám An Tâm", a 4-Screen phone page + Dialog,
  templates Mobile list · Orders, Mobile detail · Order, Admin list (desktop, 8 overlays).
- Report: `docs/research/studio-prototype-walk-2026-10-29.md` (+ 11 screenshots). ~50 findings; fixes in §4 wait for the
  user (BACKLOG-user-and-later). Test data lives only in that worktree's `.zen-studio/` and the pane's :5281 storage.
- Method limits: pane hidden (stale screenshots, checked by DOM/page file), clipboard-read denied (paste untested).
