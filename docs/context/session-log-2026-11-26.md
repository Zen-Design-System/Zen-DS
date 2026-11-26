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

## Typography tab: text styles set by hand, letter spacing (tier M, Bug session)

User: "Phần chỉnh Type trong setting thiếu chỉnh letter spacing và cho chỉnh typescale tuỳ ý. Tab Type nên đổi thành
Typography". Asked: per step, as Figma (the user's pick). Branch `zen/feat/studio-type-scale-steps-20261126`, from main
f0c1985f.

- **Model (`tools/studio/project-theme.mjs` + `.d.mts`).**
  - `theme.type.scale = { base, ratio, steps? }`: `steps[token]` holds `{ size?, lineHeight?, letterSpacing? }` set by
    hand.
  - `typeSteps` keeps known steps only, within `TYPE_STEP_LIMITS` (size 4–240, line height 4–320, letter spacing ±20
    px); whole px, letter spacing to 0.01.
  - `projectTypeScale` puts a step's own values over what base and ratio make (`madeTypeScale`). `TYPE_SCALE_STEPS` is
    the token order. theme.css writes them as before.
- **UI (`project/ProjectSetup.tsx`).**
  - The tab is "Typography".
  - With Custom, a "Text styles" section lists every step: its name, then size, line height and letter spacing
    (`ScrubNumberField`, the inspector's scrub fields, icons for each), on one grid `minmax(0, 1fr) 52px 52px 60px
    24px`.
  - A step with its own values is named in the strongest tone and has a "Back to the scale" button. A value set back
    to the made one is no longer the step's own.
- **Preview (`project/ThemePreview.tsx`).** A text style's numbers read "size / line height · letter spacing" when it
  has some letter spacing.
- **E2E.** S-13's locators now say Typography. FW-299 is new: set Heading 1, read the draft and the preview, Back to
  the scale, saved steps.
- **Tests.** project-theme selftest: 2107 checks, 8 new.
