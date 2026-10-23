# Session log — 2026-10-24

## Session B · platform-audit `clip` check and self-test (tier S; Tooling 2a + 2b, user "Theo đề xuất", handed over by chart-contract-suites)

- **2a `clip`** (`tools/platform-audit/quality-checks.mjs` controlClip, wired in audit.mjs like `fit`: `--quality`,
  error, baselined). It reports three cases:
  - a control (button, link, tab, option, input…) cut off by an `overflow: hidden | clip` or `contain: paint` ancestor
    (> 2px);
  - a control wholly past that edge while a sibling control of the same parent shows;
  - a control whose visible middle is under another element of the example (elementFromPoint, the window scrolled to it
    and back).

  Not reported: scroll containers, a device frame's bottom edge, a group hidden as a whole, floating layers and scrims,
  invisible hit areas, the docs chrome, and a bar over the scroll container the control scrolls in.
- **2b** `tools/platform-audit/selftest.mjs` (`npm run platform:audit:selftest`, gate harness list, CI):
  - fixtures with the real tokens.css and typography.css in headless Chromium, no dev server;
  - each kind, with a clean twin: scale, roles, hierarchy, rhythm, ladder, fit, card-gap, legend-column, outline,
    outline-h1/-start/-card/-siblings, clip (10 fixtures);
  - pageChecks is cut out of audit.mjs by its top-level braces (the script runs when imported).
- **Gate bug fixed:** tools/qa/run.mjs ERROR_KINDS missed `counts` (an error since 2026-10-15), and `card-gap` and
  `legend-column` (since 10-16), so the gate passed them as warnings. The self-test now checks that the list equals
  audit.mjs SEVERITY's errors.
