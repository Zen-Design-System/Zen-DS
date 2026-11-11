# Session log — 2026-11-11

## Studio chrome tab labels to 4.5:1 (tier XS; worktree recursing-bohr-20f0bd)

User chose "Nhãn tab Studio lên 4.5:1" (BACKLOG-user-and-later P3, UX review 2026-10-27 §5; line closed). The four
chrome strips (`.studio-left__tabs`, `.studio-inspector__tabs`, `.studio-project-setup__tabs`, `.studio-theme-preview__tabs`)
set `--zen-tab-content-default` to Content/Neutral/Base on their wrapper (inspector.css, project.css); the library Tabs
are unchanged. Measured unselected labels (Playwright, 1512): light 3.79 / 3.74 → 8.18 / 7.94, dark 6.56 / 7.10 →
11.29 / 12.80. Not changed: the Inspector's Segmented controls (iOS · Android at 3.79:1) are property fields, not tabs.
