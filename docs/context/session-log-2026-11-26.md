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

## Theme preview: a card with a picture is two frames (tier S, Bug session)

User: "Card preview trong setting dự án ảnh và card border đang không đồng tâm".
- **First fix:** picture radius = card radius − card padding. It gave a square picture: Small card 16 − 16 = 0.
- **Options shown:** A (square picture), B (card at XSmall spacing) and C (full-bleed picture top).
- **User's rule:** "padding ảnh và padding text khác nhau. chia làm 2 frame. frame chứa ảnh padding để bo góc đồng tâm.
  Padding text thì như card. Bổ sung guide này vào skill".

Branch `zen/fix/studio-preview-card-concentric-20261126`, on main f0c1985f.

- **`project/ThemePreview.tsx` + `project.css`.** The picture cards (Cards "Track your trips", "Gain control"; the
  Website hero) are two frames:
  - the card pads nothing (`__media-card`);
  - `__media` pads the picture by Card-padding-xsmall, and its radius is `calc(var(--zen-card-radius) -
    var(--zen-card-padding-xsmall))` (`CARD_MEDIA`);
  - `__media-text` keeps `--zen-card-padding`;
  - the hero's grid takes gap none: the frames' paddings space it.
- **Measured** on a private server (rounded, compact): picture radius = card radius − 8. Cards: 16 → 8, text frame 16.
  Hero: 24 → 16, text frame 24.
- **Skills.** The rule is in `zen-component-usage/SKILL.md` (design rules), `zen-figma-design/references/
  screen-rules.md` (beside the concentric rule) and `zen-build-qa/SKILL.md` (radius checks).
