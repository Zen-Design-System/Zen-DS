# Designing in a Zen Figma file

This project designs screens in Figma with the Zen Design System, through the Figma MCP server (`use_figma`).
These instructions apply to every agent (Claude, ChatGPT/Codex, others) that reads or changes the Figma file.

## Before any change in Figma

1. Read `skills/zen-figma-design/SKILL.md` in full and follow it. It lists the references to read and when.
2. Load Figma's own `figma-use` skill before every `use_figma` call (and `figma-generate-design` before a visible
   change).
3. Read the file first (read-only): its pages, its Zen variables and styles, and where the Zen components come from.
   Pin every target by its node id; never guess one.

## The rules in short

- Only Zen components; change them only through their properties and slots. Never detach, never paint inside an
  instance, never re-set an icon swap to the value it already has.
- Every colour, gap, padding and radius you author is bound to a Zen variable; every text uses a Zen text style;
  every shadow a Zen effect style.
- Auto layout for everything that stacks or sits side by side; the Zen spacing ladder picks each gap.
- One surface pairing per screen (Canvas/Default with flat Surface boxes unless a rule picks another), one Primary
  button per area, filters as Chip/Advanced in the header's control bar, tables on the canvas.
- Real content in the brief's language; real states (Inputted, Pressed, Disabled) instead of look-alikes.

## Done means

For every screen you touched: `skills/zen-figma-design/harness/zen-figma-audit.js` (run with `use_figma`) reports
0 errors, every warning is fixed or explained, and a screenshot was reviewed against
`skills/zen-figma-design/references/screen-rules.md`. Report each screen's name, node id and audit result.
