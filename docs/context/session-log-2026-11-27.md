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
