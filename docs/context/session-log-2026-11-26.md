# Session log 2026-11-26

## Status colors of the project's own (tier M, Bug session)

User via Giám sát: "Phần status color trong setting màu dự án cho phép thêm màu mới vào chứ k chỉ chọn màu có sẵn,
hoặc cho chỉnh từ chính màu hiện tại". Branch `zen/feat/studio-status-custom-colors-20261126`, from main 8c920f53.

- **Model (`tools/studio/project-theme.mjs` + `.d.mts`).**
  - `theme.status[role]` is a shipped ramp's name (as before) or `{ hex }` (`StatusSource`, `statusSource`). A hex
    that is a shipped ramp's step 9 becomes that name.
  - `projectPalettes().status`: an alias for a name, or a ramp generated as the Primary's (`generateExpectedPalette`
    against the Neutral's dark background). `lc` is white text (Content/On-Colors) on step 9 by APCA.
  - `projectThemeCss` and `projectBaseValues` write the generated steps (light, dark, alpha) or the alias, so
    theme.css, the Variables window, the Figma export, the phone and the preview all take a colour of the project's
    own with no other change.
  - Old projects (names only) write the same CSS as before.
- **UI (`project/ProjectSetup.tsx`).**
  - Each status role is one row of the panel's grid (`minmax(0, 1fr) 112px`, as the chart sectors): the ramp select
    ("Custom" while it holds a colour of its own) and a ColorField with the picker.
  - The ColorField opens on the role's current colour.
  - The section notes "White text hard to read on <role> · Lc n" for a colour of its own below Lc 60.
- **Tests.**
  - project-theme selftest: 2102 checks, 11 new: kept / folded to a name / bad value / generated ramp / CSS / Figma
    values / old project unchanged.
  - Studio E2E: FW-298 (new, shell group, so the gate runs it).
- **Gate (`qa --isolated`): PASS.** Studio E2E: 464 works, 0 broken, FW-298 included. `npm run build` ✓.
- FW-299 and FW-300 are unused; they go back to Giám sát.
