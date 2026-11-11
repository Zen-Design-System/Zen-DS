# Session log — 2026-11-11

## Studio: chart colours suggested from Primary (tier S)

User: "tôi muốn có tính năng tự gợi ý bản màu cho chart ở đây khi tôi đổi màu brand".

- `project-theme.mjs` `suggestedChart(primaryHex)`: Zen's sectors 3–7 (Cyan, Violet, Yellow, Orange, Green Soft) as hue
  turns from Zen pink, turned by the Primary's hue; each sector takes the nearest support family at least 0.12 OKLab
  from the Primary, Gray and the sectors before it; Brown left out. Zen gives Zen's palette back (selftest).
  `chartFollowsPrimary(theme)`: the chart is the suggestion or Zen's untouched palette.
- `ProjectSetup.tsx` Color: a Primary change also sets the chart while it follows; otherwise a wand button
  ("Suggest from Primary") beside Chart colors. Note says 3–7 are suggested while they follow.
- Tests: project-theme selftest +44 checks; E2E row S-14.

## Studio chrome tab labels to 4.5:1 (tier XS; worktree recursing-bohr-20f0bd)

User chose "Nhãn tab Studio lên 4.5:1" (BACKLOG-user-and-later P3, UX review 2026-10-27 §5; line closed). The four
chrome strips (`.studio-left__tabs`, `.studio-inspector__tabs`, `.studio-project-setup__tabs`, `.studio-theme-preview__tabs`)
set `--zen-tab-content-default` to Content/Neutral/Base on their wrapper (inspector.css, project.css); the library Tabs
are unchanged. Measured unselected labels (Playwright, 1512): light 3.79 / 3.74 → 8.18 / 7.94, dark 6.56 / 7.10 →
11.29 / 12.80. Not changed: the Inspector's Segmented controls (iOS · Android at 3.79:1) are property fields, not tabs.
