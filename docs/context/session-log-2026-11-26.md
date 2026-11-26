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
