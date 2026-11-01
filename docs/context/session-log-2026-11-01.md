# Session log 2026-11-01

## Studio Project setup: Corner radius tiles (tier S; user 2026-11-01: "Phần này xấu quá")

Branch zen/fix/studio-radius-tiles-20261101 (walk session).
- The tile drew a cropped card corner at Base radius. Rounded and Smooth share Base 12, so they looked the same; the
  picture was cut at its right and bottom edges.
- First try, a card holding a button: the user still found it ugly. Three styles were rendered with real tokens
  (Corner, Button, Card); the user picked Corner.
- `project.css`: one corner line (top and left border in accent), rounded as `--zen-corner-radius-action-medium`
  capped at `--zen-corner-radius-xlarge` (Rounded's pill → 20). `zen-allow-radius-role`: it pictures a button's corner.
  The selected tile's ring is accent (Component theme shares the tile).
- Gate `--isolated`: PASS, Studio E2E 451 works · 0 broken. Two runs in between failed on timeouts only: the Mac slept
  on battery (pmset log 19:18–19:40); `--failed` re-runs passed.
