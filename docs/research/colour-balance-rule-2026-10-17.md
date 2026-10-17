# Colour balance on one screen — research and rule proposal (2026-10-17)

Trigger: on ◇ Master-Layout · Variants the user switched D1's progress bars from Accent to Neutral and asked for a
harness rule: when a screen uses too many colours, some elements should fall back to neutral.

Status: proposal. Nothing is built yet; the questions at the end decide the thresholds.

## What other systems say

- **60-30-10** (interior design, widely reused for UI): about 60% dominant neutral, 30% secondary surface, 10% accent.
- **Material 3, colour roles**: Primary is for the few high-emphasis components (main action, active state). Tertiary
  accents are used sparingly. Most of the screen sits on surface roles.
- **Apple HIG, Color**: use colour sparingly, keep one key colour for interactivity, and never give one colour two
  meanings on a screen.
- **IBM Carbon, Color**: a mostly neutral UI. Colour is reserved for interaction and for status (support colours).
- **Shopify Polaris and Atlassian**: colour communicates, it does not decorate. The more colours a screen uses, the
  less each one means.

The rule these share: **colour carries meaning**. Meaning here is the main action, the selection or active state,
a status (error, success, warning), a data series, or one hero. Anything decorative stays neutral.

## Measured on our own screens (Figma, 2026-10-17)

The script walked every visible paint and followed variable aliases down to the primitive palette, which gives the
real hue (Button-Primary in Neutral-S1 resolves to black, so it counts as neutral). Weighted area: Solid 1, Subtle
0.5, Pale 0.25. Photos and illustrations are left out.

| Screen | Hue families (non-neutral) | Who carries them |
| --- | --- | --- |
| D1 Display Hero | Brand · Violet · Cyan (3) | 2 Dock-Icons in 2 hues, streak Badge |
| D4 Greeting + tiles | Brand · Violet · Cyan · Teal (4) | number tiles, Badges, Dock-Icon, avatar initials |
| C1 Tab-bar Hub | Orange · Blue · Violet · Yellow (4) | 2 stat Dock-Icons, course avatars |
| C7 Greeting Home | Brand · Blue · Brown · Grass · Orange · Violet · Tomato (7) | Avatar/Stack (3 hues), Dock-Icons, to-do avatars |
| B2 Rail + List-Detail | Violet · Blue · Grass · Orange · Cyan · Pink · Teal (7) | one hue per avatar initial |
| B3 Top-bar Analytics | Brand · Cyan · Violet · Yellow · Grass · Tomato (6) | chart series (allowed), trend Badges, notification dot |
| A1 / A3 Sidebar workspace | 8 hues | team tag Badges, KPI Dock-Icons, table avatars |

Two findings:

1. **Area is almost never the problem.** Coloured area stays under 10% of the screen. The exceptions are the
   intended heroes (D5's Solid band, B3's Hero card).
2. **The count of decorative hues is the problem.** Avatar initials, Dock-Icons in a list and category Badges each
   take their own hue. In a list of five people that gives five colours that mean nothing. The progress bars the user
   changed are the same kind of element: a decorative accent repeated across cards.

## Proposed rules (Figma audit first, then the platform's runtime audit)

All four are **warnings**. Colour balance is a matter of taste, so a designer can keep an exception and say why.

1. **`color/hue-budget`**: one screen uses at most **3 non-neutral hue families**: the brand/accent plus 2
   supporting hues. Some colours do not count against the budget:
   - status colours on status components (error/success/warning Badge, Inline-Message, Alert, Trend, notification dot);
   - data series inside a Chart;
   - one hero per screen (a Solid band or a Hero Metric-Card);
   - photos and illustrations.

   When a screen goes over budget, the finding lists each hue, the elements that use it, and the elements to change
   first (rule 3).
2. **`color/repeat-one-hue`**: siblings of one component in one list, row or grid (avatars, Dock-Icons, Progress-Bars,
   category Badges) use **one hue, or neutral**. The exception is a hue that encodes meaning the screen also shows
   (a legend, a status). Mixed hues across siblings → warning. This catches B2, C1 and C7.
3. **`color/decorative-neutral`**: when a screen is over budget, these elements go to Neutral first, in this order:
   1. Progress-Bar, Progress-Circle and Slider fills that show amount, not status (the user's D1 change);
   2. avatar-initial backgrounds (Neutral Subtle, or the photo when there is one);
   3. Dock-Icon and icon containers repeated in lists (Neutral Subtle, or one hue for the whole list);
   4. category Badges and Tags with no legend (Neutral);
   5. brand-coloured secondary actions (Tertiary or Flat Neutral).

   These keep their colour: the one primary action, selection and active states, status, chart series and the hero.
4. **`color/accent-area`**: the weighted coloured area (Solid 1, Subtle 0.5, Pale 0.25) stays at or under **10%** of the
   screen, the hero excluded. Above 20% the warning is stronger: the screen has no calm area left.

### Where each rule runs

- **Figma audit** (`skills/zen-figma-design/harness/zen-figma-audit.js`): all four run over the paints of the screen,
  inside instances too, because a component's own colour is part of the balance. They reuse the alias-to-primitive
  hue resolver from this study.
- **Code**: the platform's runtime audit (`tools/platform-audit`, quality pass) reads computed colours, maps them back
  to `--zen-color-*` families through `tokens.css` and runs rules 1, 2 and 4 per example and template.
  `usage-guard` can only add a static hint, for example a `ProgressBar tone="accent"` inside a mapped list.
- **Guideline**: add a "Colour budget" section to `docs/guidelines/content-colors.md` (source
  `tools/usage-guard/guidelines.source.mjs`) with the demotion order.

## Questions for the user

1. Budget: 3 hues (brand + 2), or a stricter 2?
2. Does a full-bleed hero band (D5) sit outside the budget, as proposed?
3. Avatar initials: Neutral by default everywhere, or one hue per person only when a photo is missing?
4. Warning everywhere, or an error in the templates (`◆` pages and `src/templates`) only?

## Answers (user, 2026-10-17)

1. Budget: no strict number; it depends on the context (so `color/hue-budget` stays a soft warning with no fixed cap).
2. A full-bleed hero band counts against the budget (no hero exemption).
3. Avatar initials: one hue per person when there is no photo.
4. Warnings everywhere (Figma and code), not errors in the templates.
