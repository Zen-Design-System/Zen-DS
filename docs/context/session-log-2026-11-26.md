# Session log — 2026-11-26

## CI: Platform audit runs light and dark as two jobs (tier XS, branch zen/ci/platform-audit-split-20261126)

Asked by the user through the supervisor ("ok sửa cả hai việc nhỏ đi"): the one audit job ran light, then dark, and
came near its 45-min limit (main: 32–37 min on 2026-11-24/26; #427 was cancelled twice).

- Measured from main's logs: setup 2 min, light 16–21 min, dark 16–17 min. Light is the longer one because pages that do
  not answer in 180 s at loading (dialog, ai-chat, search, image, calendar, visually-hidden: a different page each run)
  cost 3 min each before they pass in a new browser.
- `.github/workflows/ci.yml`: one `platform-audit` job with a `light` / `dark` matrix (`fail-fast: false`), each with its
  own dev server; checks are now "Platform audit (light)" and "Platform audit (dark)" (main has no branch protection, so
  no required check by that name). Limit 35 min per job (about 18–23 min expected).
- Not done: why those pages stall at loading. The retry already passes them; noted for the supervisor.

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
