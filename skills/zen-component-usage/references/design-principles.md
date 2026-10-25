# Design principles for Zen screens: colour and composition

**These are principles, not rules.** The rules (`docs/component-usage-rules.md`, the Figma screen rules,
`npm run usage:check`, the Figma audit) say what is wrong. This file helps you choose among the options the rules leave
open, and explains why a screen that passes every check can still look off. Nothing here is machine-checked, and a line
here does not become a check on its own.

- When the brief, a Zen template or the designer's own edit chooses differently, follow them and say why in the report.
- When a principle seems to fight a rule, the rule wins. The principle is then a reason to ask, not to override.
- The same principles hold in code, in Zen Studio and in Figma. Names are given both ways where they differ (Card
  `theme="subtle"` = Figma Card `Theme=Subtle`).

Sources: Zen's own decisions (dated below); Apple HIG (Color, Layout); Material 3 (colour roles, canonical layouts);
IBM Carbon (Color); Shopify Polaris and Atlassian (colour communicates); the Radix colour scale; APCA; WCAG 2.2;
Gestalt and NN/g on visual hierarchy. Zen's measurements: `docs/research/colour-balance-rule-2026-10-17.md` in the
Zen DS repo.

## 0. Start from the screen's job

Before you pick a colour or a box, answer three questions in one line each:

1. **The job.** Who uses the screen, the one main action, the one thing to read first. For a whole product, list its
   screens from `product-patterns.md` and each screen's states and flow from `ux-principles.md` §0.
2. **The mood.** It picks the modes before any colour:
   - data work (dashboards, admin): Compact density, Typography Dashboard, calm, neutral;
   - a consumer app: Comfortable density, Typography Mobile, more imagery and colour;
   - marketing: Typography Popular, big type, one hero.
3. **What must carry meaning.** The main action, the selection, statuses, data series, one promoted thing. That list
   is your colour budget. Everything not on it starts neutral.

## 1. Colour carries meaning; everything else is neutral

- **Colour is a signal.** Every non-neutral colour on a screen should answer "what does this tell me?": this is the
  action, this is selected, this failed or is done or is waiting, this is series B, this is the one thing we promote.
  Apple: use colour sparingly. Carbon: the neutral greys dominate, one colour is for action, other colours are used
  sparingly and on purpose.
- **The fewer colours, the louder each one.** Seven hues read as noise even when each one is "allowed".
- **Same meaning, same colour**, on the screen and across the flow. Don't give the brand colour to static text that
  then looks tappable. If red means an error on this screen, a decorative tag should not be red.
- **Never colour alone.** A status also has an icon, a label or a shape: a Badge says "Overdue", it is not just red
  (WCAG 1.4.1).

## 2. Proportion: a calm field, a structure, an accent

Use 60-30-10 as a sanity check of the whole screenshot, not as a quota:

| Share | What it is | In Zen |
| --- | --- | --- |
| about 60% | the field | Canvas and Surface |
| about 30% | the neutral structure | Surface/Alt, Neutral Subtle fills, text, dividers, Tertiary buttons |
| about 10% | the colour | Brand/Accent and supporting hues: selection, the hero, status, the promoted action |

Zen measured its own screens. The good ones keep the coloured area well under 10%. The busy ones failed on the
**number of decorative hues**, not on area: avatars, Dock-Icons and category Badges that each took their own hue. So
count the hues before you measure area.

In Component Theme `Neutral - S1` the Primary button is black. That is intended: the brand then shows only in the
selection and the hero, which keeps it meaningful.

## 3. One lead colour, a few supporting hues

- **Brand/Accent leads** (user, 2026-10-17): bands, the hero, the selected state, a promoted CTA.
- **Supporting hues** (`Support/*`: Blue, Cyan, Violet, Orange, Golden…) support on small parts: category icons, a
  streak Badge, initials, chart series. Keep them smaller, and never more saturated, than the lead.
- **Budget by context, not by a number** (user, 2026-10-17: no fixed cap). A calm dashboard usually needs the lead
  and one or two supporting hues. A playful consumer home can carry more, as long as each hue still means something.
- **Siblings share a colour.** A row of Dock-Icons, the Progress bars of a list of cards, category Badges without a
  legend: one hue, or neutral. Give each sibling its own hue only when the hue encodes something the screen explains
  (a legend, a status, a person). Avatar initials without a photo take one hue per person (user, 2026-10-17).
- **When a screen feels busy, demote in this order:**
  1. fills that show an amount, not a status (Progress, Slider);
  2. icon containers repeated in a list;
  3. category Badges and Tags that have no legend;
  4. brand-coloured secondary actions (they become Tertiary or Flat Neutral).

  Keep the colour of the main action, the selection, status, chart series and the hero.

**Choosing the supporting hues.**

- **Neighbours of the lead on the colour wheel** (analogous hues) feel calm and belong together.
- **The opposite hue** (complementary) makes one point of contrast. Keep it small: a single highlight, never an area.
- **Warm hues come forward, cool hues recede.** A warm supporting hue beside a cool lead competes with it, so keep it
  smaller still.
- **Keep the step equal.** Zen's ramps are tuned per step, so two hues at the same step (both Subtle, or both Solid)
  weigh about the same. A Solid of one hue next to a Subtle of another makes the Solid shout.

## 4. Pair a fill with its content by the step

Every Zen colour family is a ramp of roles, like the Radix scale's twelve steps: tints for backgrounds (Pale, Subtle,
with Hover and Pressed above them), borders (Pale, Subtle), the Solid (the purest colour, with its hover), and content
(Strongest, Base, Light). Pair them by step:

| Fill | Emphasis | Content on it | Typical use |
| --- | --- | --- | --- |
| Canvas, Surface | none | Neutral Strongest / Base / Light | almost everything |
| Pale tint | quiet | Neutral, or the colour's Strongest / Base | white pages: Card Pale, KPI tiles |
| Subtle | noticeable | the colour's Strongest / Base; its Light only for an icon or a highlight | Badge, Tag, callout, Card Subtle on Canvas/Default |
| Solid | loud | On-Colors (On-Brights on bright hues), Inverse on Neutral Solid, On-Accent on Accent Solid | Primary button, Dock-Icon Solid, one stand-out widget, a band |

Why it works this way:

- **Emphasis follows importance.** The more saturated the fill, the fewer of them: one Solid stand-out per row, one
  hero per screen.
- **A small Solid beats a big tint.** An Accent Solid Dock-Icon beside Neutral text reads more clearly than a large
  tinted card with coloured text. Concentrate colour in small marks that mean something.
- **A tint depends on its ground.** A Pale tint fades into the grey Canvas/Default, so colour on that canvas is Subtle;
  Pale belongs on white (Canvas/Alt, Canvas/Flat) and on imagery (user, 2026-10-17).
- **Bright hues need dark content.** Yellow, Sky, Mint, Golden and Warning carry On-Brights on their Solid. The Lights
  group (Accent, Warning, Support/Yellow) never takes its Light level for text.
- **One element, one family.** A blue icon in a green Badge mixes two meanings.

## 5. Contrast: design with the levels, judge with APCA

- **Zen judges contrast with APCA**, not with rigid WCAG ratios (user, 2026-10-19). The High Contrast mode serves the
  people who need more. Every On colour is the ramp's APCA pick (white on Accent/Solid is about Lc 60, as intended), so
  never rework a brand pair to reach a WCAG ratio.
- **Rough APCA targets** (absolute Lc), to orient yourself rather than to gate:

  | Lc | For |
  | --- | --- |
  | 90 | long reading |
  | 75 | body text |
  | 60 | other content text |
  | 45 | large or bold headings, fine icons |
  | 30 | placeholder, disabled text, non-text marks |
  | under 15 | invisible to many people |

- **Contrast breaks when a token leaves home**: Light text on a colour's Subtle fill, Neutral content on a colour
  Solid, Base text on a photo. Check the pairing (§4) before you check a number.
- **Contrast is a hierarchy lever.** Strongest, Base and Light are the second way to rank text, after size and weight.
  Quiet text with the level, never with opacity: opacity changes with every background.

## 6. Dark mode, themes and brands are the same design

- **Design in Light, then switch the mode** (Figma: the screen frame's Mode Colors mode; code: ZenProvider `theme`).
  The tokens flip and your decisions should hold. If something works in only one mode, the pairing was wrong: a bar on
  Surface/Default over Canvas/Flat melts into the page in light and turns into a dark block in dark.
- **In dark, layers show by getting lighter, not by shadows** (Carbon: each layer one step lighter). A box separated
  only by its shadow disappears.
- **Solids feel louder in dark.** When a screen has several Solids, look at the dark screenshot first.
- **One colour mode per screen.** A dark widget is Card `Solid` / `Neutral` with Inverse content, never a dark mode set
  on a card or a layer.
- **Component Theme and Brand modes change what Primary looks like.** Design so the screen still has a lead colour
  when Primary is black: the selection and the hero carry the brand.

## 7. Data colours

- **Series take the chart palette in order** (Figma: the "Color Chart Sector/…" styles). Order is importance: the
  series that matters most takes the first colour.
- **Distinct hues** for unrelated series; **one hue in steps** for an ordered amount (low to high); **neutral** for
  "other", targets and past periods.
- **The chart owns the colour.** Keep the card around a multi-series chart neutral: a coloured Card theme fights the
  series.
- **Status in data is a spot, not a wash.** Highlight the one bar that is over budget, not the whole chart.

## 8. Composition: hierarchy first, decoration last

Work in this order: structure (where things go), spacing (what belongs together), type (what is read first), colour
(what means something), and effects (borders, shadows) last. A problem usually starts one step earlier than where it
shows: a screen that "needs more colour" often needs more space or a clearer type scale.

- **One focal point per view.** The eye lands on the title, then the main content, then the main action. When two
  things compete, demote one (size, weight, level or colour) instead of boosting the other.
- **Hierarchy levers, strongest first:** position (top, leading edge), size, weight, contrast level, colour, then
  decoration. Use as few as you need: a title differs by size and weight, meta by level and size (Light, Body/Small),
  a value by weight.
- **Three levels per region** are usually enough: primary (a title or a value), secondary (the body), tertiary (meta).
  A region that needs a fourth level usually holds two groups.
- **Let space do the grouping** (Gestalt):
  - *Proximity*: the spacing ladder expresses relationships; the gap inside a group is smaller than the gap around it.
  - *Similarity*: things that act alike look alike (the same component, size and variant).
  - *Common region*: draw a box only when space is not enough. A box is a strong signal, so every extra Card costs
    attention.
  - *Alignment*: one left edge for the header, the content and every section.
  - *Reading order*: top-leading to bottom-trailing; an F pattern for scanning data, a Z pattern for a sparse hero.
- **Restraint.** Use fewer containers, borders, colours, type sizes and icon styles than you first think; each one you
  add makes the others mean less. Before you add a border, a shadow, a colour or a divider, try more space.
- **White space is structure.** Start generous and tighten; a cramped screen reads as a complicated one.
- **Rhythm.** Repeated items share size and spacing (a grid of equal cards). Break the rhythm only to say something:
  one featured card, a larger item in a feed.
- **An emphasis budget per area:** one Primary button, one Solid stand-out, one hero. When everything is emphasised,
  nothing is.
- **A shell drawn in lines keeps its boxes flat.** AppShell `pattern="grid"` (Figma Layout=Grid) separates its Sidebar
  and header with Pale lines instead of surfaces, so the page builds from Boxes and Flat Cards on the grey Canvas
  (MetricCard, ChartCard, ListBox keep `theme="default"`, the Flat of before 2026-10-21). Give `theme="subtle"` only to a metric card that should stand
  out (◇ Master-Layout Rule 16823:85229, user 2026-10-21).
- **Content first.** Real data at realistic lengths (long names, large numbers, an empty list), then the empty,
  loading and error states. They are part of the design.
- **Progressive disclosure.** Show what the job needs now. Details go to a SidePanel, an Accordion, a More menu or the
  next screen.
- **Reading comfort.** Lines of long text hold about 45 to 75 characters: cap the column instead of stretching it.
  Body text is never lighter than Base. Centre at most two lines.

## 9. Look at the screenshot before you call it done

These are questions, not checks:

- **Squint.** What do you see first, second and third? Is that the order of the job?
- **Count the hues.** Can you say what each one means?
- **Look in greyscale.** Does the hierarchy still hold? If it falls apart, colour was doing the work of size, weight or
  space.
- **Compare with a Zen template.** Does the screen feel like the same product: one mood, one surface pairing?
- **Switch the modes.** Dark, Comfortable density and the other Typography mode: does the screen still hold?
- **Push the data.** The longest name, the largest amount, a Vietnamese label next to its English one; 0, 1 and many
  items; a value missing. Does anything cut, wrap badly or jump?
- **Break it on purpose.** A slow load, a failed save, no network, no permission: does each show its state
  (`ux-principles.md` §1) and keep what the person typed?
- **Walk it as a user.** From the way in to the way out, by mouse, by keyboard and on a phone: can the job be done,
  and does Back return to the same place?

For states, forms, navigation and access, read `ux-principles.md`; to plan the screens of a product from its brief,
`product-patterns.md` (both next to this file). For layouts across widths, read `responsive-principles.md` (in the repo: `skills/zen-responsive-screens/references/`;
in the Figma AI kit it sits next to this file).
