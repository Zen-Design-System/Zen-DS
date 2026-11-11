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
