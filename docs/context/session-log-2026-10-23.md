# Session log 2026-10-23

## Shape examples: coverage (tier S; gate finding with no owner, assigned by Giám sát)

Branch zen/fix/shape-examples-coverage-20261023 from main e07ae5ae. BACKLOG "P3 · Shape examples: coverage (2026-10-17,
gate ④)": the page had 9 examples and no states, edge cases, phone or keyboard / a11y example.
- `src/platform/examples/pages/shape.tsx` (now `keepOnHotUpdate`, as example-patterns §8), three examples:
  - **A seat map with labelled marks** (states + keyboard / a11y): four seats, each a labelled ellipse (role img), its
    number aria-hidden; Segmented buttons pick the seat, taken seats disabled there and drawn as outlines (form and
    words, not colour alone); a role="status" line.
  - **Arc and star at the edge of their range**: Sweep 0 % (nothing drawn, the box kept), Ratio 96 %, a 16-tip star
    at Ratio 10 % and 0 % (no fill area left: a centred stroke).
  - **Onboarding art on a phone**: PlatformPhone, TopNavigation compact-alt with Back, ActionBar Next / Skip / Start
    collecting (a toast, then step 1), each screen's art in a 240 × 200 free frame, Accent leading.
- BACKLOG line removed; CHANGELOG line.
- Gate finding met on the way, fixed at its owner: usage:check warned interaction/action-without-handler on
  DesignPanel.tsx:696, a `// … (<Button>Save</Button>)` comment (#219). engine.mjs skipped block comments only; it now
  skips line comments too (never after ":" or a quote, so a URL stays code). Fixtures: the comment case in good.tsx, a
  tag after "https://" still caught in bad.tsx. usage:check 0 warnings.
- Static: tsc, usage:selftest, usage:check, style:check, guidelines:check, ai-ui:check, ai-kit:check, mcp:selftest,
  tokens:check: all exit 0.
