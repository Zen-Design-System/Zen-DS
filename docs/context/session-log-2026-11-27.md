# Session log 2026-11-27

## Project settings tabs hug their labels (tier S, Bug session)

User: "Kích thướt tab kì quá" (screenshot of General · Color · Typography · Style). Branch
`zen/fix/studio-settings-tabs-hug-20261127`, from main ab673f64.

- **Cause.** The settings tab bar used Tabs `fullWidth` (each item `flex: 1 1 0`). With "Type" four equal items fitted;
  #434 renamed it "Typography", wider than a quarter of the panel, so its selected fill closed on the text while Color
  and Style had room to spare.
- **Fix (`project/ProjectSetup.tsx`).** No `fullWidth`: the items hug their labels, as Figma's Tab-Bar and the preview's
  own tab bar beside it.
- **Measured** on a private server (Giám sát's GO 00:45): each tab 8px inline padding both sides (General 64, Color 49,
  Typography 89, Style 47), on General and on Typography selected. Shots `tabs-General.png`, `tabs-Typography.png`.
- **Gate `npm run qa -- --isolated --files=ProjectSetup.tsx` PASS:** static steps, Studio E2E 467 works · 0 broken in 5
  shards (B-27, PT-48 loaded twice, a Chromium load cut). User: "CI xanh thì merge luôn".

## Typography as the Figma plugin: the table always shows, a group nudge, every style in the preview (tier M, Bug session)

User, after #435: "chưa thấy trên studio" (the table showed only on Custom), then "cho thanh kéo chọn nhóm để kéo như
plugin", "luôn hiện như plugin figma", "hiện đủ các style bên phần preview" / "hiện tại mới hiện tới Display 1". Branch
`zen/feat/studio-type-styles-nudge-20261127`, from main 9cde4c85.

- **Model (`tools/studio/project-theme.mjs` + `.d.mts`).**
  - `shippedTypeScale(mode)`: Dashboard, Popular and Mobile's 17 steps, read from Typography Configuration
    (`tokens/source/figma/typography-configuration.json`; Dashboard's Heading 1 is 28 / 36 / -0.84, not the formula's
    32 / 40 / -0.76).
  - A scale's `from` (one of `TYPE_SCALE_MODES`): its made values are that mode's until base or ratio change.
    `normalizeTheme` keeps a known one and names an unknown one.
- **UI (`project/ProjectSetup.tsx`).**
  - The Text styles section always shows: a shipped mode's own values, or the custom scale's. A value set on a
    shipped mode makes the scale Custom with `from` that mode, so nothing else moves. Custom picked from the list
    starts the same way. Base or ratio typed drop `from`.
  - The plugin's nudge (Typeface › Target + slider): Styles (All, Display, Heading, Body; no Button, the scale has no
    button step) and a SliderField −2 … +2 % of each size. It moves the group's letter spacing live from where the drag
    started. It springs back to 0 when let go (pointer up, key up, focus back after typing).
  - Base and ratio are SliderFields (user via Giám sát: "phần scale có thể cho kéo hoặc điền bằng inline slider"): drag,
    type or arrow keys; the scale updates live.
  - The settings' `change(next, live)`: a drag's later values replace the present one, so a drag is one undo step
    (`dragTo`; `letGo` on pointer up, key up, focus back after typing).
- **Preview (`project/ThemePreview.tsx`).** Every step: Display-Extra/1–3 and Display/2, /4 joined the list.
- **E2E.** FW-300 (new): Dashboard's values in the table, the preview from Display-Extra/1, a value → Custom from
  Dashboard, the Heading nudge (live, back to 0, Display 1 kept), one Undo, ratio → 1.15 by
  arrow key and back by one Undo, saved `from: dashboard`. FW-299: back to the
  scale is Dashboard's 28 / -0.84; saved with `from`. project-theme selftest: 2120 checks (10 new).
- **Measured** on a private server (GO 02:41): Dashboard's table 65 / 72 / -2.88 … 9 / 12 / 0; Custom keeps them;
  Base 14 px and Ratio 1.14 as slider fields; no field cuts its value; the preview lists Display-Extra/1 … Subheading.
- **Gate `npm run qa -- --isolated --files=…` PASS:** static steps, Studio E2E 468 works · 0 broken in 5 shards (B-25,
  PT-15, PT-38 loaded twice, a Chromium load cut). User (via Giám sát): merge on green CI.

## DockIcon's Theme has a control again (tier S, Bug session)

User: "Dock Icon tại sao không chỉnh được theme?" (a DockIcon `theme="indigo"` selected in "AI Chat – Home Desktop").
Branch `zen/fix/studio-dock-icon-theme-20261127`, from main ecd2268a.

- **Cause.** `dockIconThemes` has 25 members (neutral, accent, 18 support colours, inverse, on-color, pale, surface,
  emoji). `scripts/build-api.mjs` spells out unions up to `MAX_EXPANDED_UNION` = 24, so the API docs name the type
  `DockIconTheme`. `propSchema.editorFor` had a branch for the other long named lists (ContentTone, ShapeFill,
  ShapeStroke), none for this one: no control for DockIcon `theme` or Metric's two DockIconTheme props.
- **Fix (`inspector/propSchema.ts`).** `DockIconTheme` / `(typeof dockIconThemes)[number]` → an enum of
  `dockIconThemes`, as ContentTone.
- **E2E FW-301** (new, inspector group; Giám sát's GO 12:23): DockIcon `theme` Indigo, MetricCard `iconTheme` Blue and
  Metric `iconTheme` Green show in their controls, and Teal writes teal for each. Without the fix the row breaks (no
  Theme control): checked with the change stashed.
- **Gate `npm run qa -- --isolated --files=…` PASS:** static steps, Studio E2E 469 works · 0 broken in 5 shards (FW-301,
  B-24, B-48, PT-25, PT-48 loaded twice, a Chromium load cut). User: "ok, CI xanh thì merge luôn".
