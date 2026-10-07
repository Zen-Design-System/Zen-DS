# Zen Studio: Position (constraints), Effects and Corner radius. Spec (2026-10-03)

**Owner.** Session "Slot Component phân biệt", Phase 2 (docs/research/studio-slots-spec-2026-10-03.md:136-140).
**Status.** Spec only; nothing is built.
**Save as.** `docs/research/studio-position-effects-radius-spec-2026-10-03.md`.

**Inputs**
- Four read-only research reports:
  - Figma UI3 help text, saved in `scratchpad/phase2/figma/*.txt`.
  - The live Figma file `9nZv4uW2LT21yuHabMTCh1`.
  - A repo map.
  - A Studio inspector map.
- Three proposals: P1 Figma-literal, P2 CSS-native, P3 rules-first.

**Line numbers.** They were read on 2026-10-03 between 13:45 and 14:30. Peers are editing `Layout.tsx`, `layout.css`, `select/resize.ts`, `ResizeLayer.tsx` and `canvas/StudioCanvas.tsx` today. Re-grep before every edit.

---

## 0. Judge's scores and how the synthesis was built

Scores are 1–5. Figma parity is weighted ×2 because of the user's decision of 2026-10-03.

| Criterion | P1 Figma-literal | P2 CSS-native | P3 Rules-first |
|---|---|---|---|
| **Figma parity ×2** | **5**: Plugin-API names; Position-first panel; inline constraints block; styled effect rows; usage captions | **2**: constraints are implied by which insets are set, unlike Figma's explicit constraint; `centerX` boolean; shadow and blur split across two props, unlike one style per layer | **4**: explicit constraints, alignment row, diagram. "+" silently removes the border, and Canvas/Alt shadows are blocked by a heuristic, neither of which Figma does |
| **Token fidelity to the Figma file** | **5**: `effectStyle` values are the exact Figma style names; the "offset 0 + padding token" idiom is mapped | **3**: `shadow="bottom-1"` drops the style names; inset `0` is a new pseudo-token | **4**: levels map to the right styles, but values are renamed (`level-1`, `top-level-1`) |
| **API simplicity and consistency** with sizing (`width`/`height`/`alignSelf` are CSS names with Figma values, sizing.ts:13-17) and AGENTS.md:41-45 ("what AI agents guess") | **2**: `layoutPositioning`, `horizontalConstraint` and `topLeftRadius` break the `radius`/`paddingX` family style | **3**: the most guessable, but `top={0}` is a number while `width={240}` means px (sizing.ts:13); the new `ZenInset` type becomes a readonly editor (propSchema.ts:200-207) | **4**: `position`, `constraintX/Y`, `inset*` and `radiusTopLeft` fit the family. But `position: "auto"` is not a CSS keyword (ActionBar uses `static`, ActionBar.tsx:7), and `data-pos` is an odd abbreviation |
| **Harness, elevation and radius rules** | **4**: CSS gating on the fill; 10 rules; audit extension | **4**: good rules; the only one to spot the `align-self` leak; adds a Canvas/Alt shadow audit | **5**: CSS gating plus a selftest of the gating; per-corner concentric audit; one-elevation-per-screen; a focus-order warning; a Luxury caption |
| **Peer-session risk** | **3**: asks the peer to split its Appearance section; makes every in-flow sibling relative | **3**: same sibling rule; leans on SizingSection's private-writer fallback | **4**: per-component prop filter (keeps ActionBar `position`); refuses the global sibling rule; separate CSS files |
| **Weighted total (/30)** | 24 | 17 | **25** |

**Winner:** P3, narrowly.

**Grafted from P3**
- The API skeleton: `position`, `constraintX/Y`, `inset*`, `radiusTopLeft…`.
- Box-only effects gated by the fill in CSS, plus a selftest of that gating.
- The harness breadth and the a11y warning.
- `Shadow/Top` as the default for a bottom-pinned box.
- The Luxury caption.
- Filtering new props per gated component only.

**Grafted from P1**
- `effectStyle` holding Figma style names. Precedent: Text's `textStyle?: TypographyStyleName` (Text.tsx:19), used as `"Body/Base/Regular"` (Text.stories.tsx:12).
- The Studio anatomy: Position first; toggle in the X/Y slot; settings popover; picker grouped by style folder; usage captions; warning copy.
- Writing four radius values into the existing var, with no CSS change.
- Corner props on Image.
- The write tables.

**Grafted from P2**
- The self-alignment reset.
- Canonical corner normalisation.
- Keeping the geometry when toggling, by turning fill into stretch.
- The Canvas/Alt shadow audit.
- The "parent hugs nothing" warning.

**Corrections none of the proposals got right**
1. **`:where(.zen-stack…):has(> …)` is not zero-specificity.** `:has()` adds the specificity of its argument (P1). The whole selector must sit inside `:where()`.
2. **Column stacks force `align-self: stretch` on every child** (layout.css:11, specificity 0,3,0). So do `alignSelf` (layout.css:93-96) and row-fill (layout.css:99). An absolute primitive needs a reset at specificity 0,4,0 or higher. Only P2 noticed this.
3. **P1 and P2's paint-order rule** makes every in-flow sibling relative. Only siblings *after* an absolute layer need it. That shrinks the re-anchoring risk (BACKLOG.md:648) while still making the "background media first" pattern work (Logistic hero #6091:22189).
4. **`SelectFieldOption` has `disabled` but no `caption`** (Input.tsx:436). So the reason Scale is unavailable goes into the option label; it cannot be tooltip-only (spec l.104/129).
5. **Image defaults to `radius = "md"`** (Image.tsx:99). An unset corner on Image falls back to md, not to 0.
6. **P3's `layout/absolute-for-flow` would false-positive** on the video player, where every child is absolute. It is dropped.

---

## 1. User decisions recap

| # | Decision (2026-10-03) | How this spec lands it |
|---|---|---|
| D1 | Studio controls behave as close to Figma as possible | UI3 section order, controls, copy and gestures are copied (§2). Each deviation is listed with its reason. |
| D2 | Constraints: absolute position, Left/Right/Left & right/Center/Scale × Top/Bottom/Top & bottom/Center/Scale, including auto-layout children with absolute position | `position="absolute"` + `constraintX/Y` + `inset*`. Scale is listed but unavailable in v1 (Q1). |
| D3 | Editable Effects (drop shadow, inner shadow, layer blur, background blur) only through Figma Effect styles or shadow tokens; add, remove, toggle | `effectStyle` on Box, one style per layer as in Figma. Add, remove and switch. The toggle is a session eye (Q2). Inner shadow exists only in Effect/Input (fields) and no style has a layer blur, so both are named in the picker footer rather than offered. |
| D4 | Corner radius: one value + independent corners, on radius tokens that follow the radius mode | `radius` + `radiusTopLeft/TopRight/BottomRight/BottomLeft` on Box and Image. px are read from the computed token, so they follow `[data-radius]`. |
| D5 | New library props allowed, token-only (no free px, no colours) | Insets use `ZenPadding`; effects use the 9 style names; corners use `ZenCornerRadius`. No percentages, signed offsets, raw shadows or blur radii. |
| D6 | Auto-layout controls belong to the inspector owner; W/H/min/max/alignSelf belong to the sizing session | This phase does not touch `sizing.ts`, `layout.css`, SizingSection or the Layout section. It only removes dead sizing props inside its own gestures (§4.1). |
| — | Superseded lines | Inspector spec l.154 ("no new component props") and l.356 ("absolute position / ignore auto layout: no API") no longer apply to these three areas. Tell the inspector owner (§5). |

**Standing rules this work must keep**
- No outer shadow on Subtle, Pale or Surface-Alt (§9, component-usage-rules.md:192-215).
- A Surface on Canvas/Alt needs a closed border; a shadow never counts (§11, :233-257).
- Elevation follows the Sidebar.
- Border rule.
- Concentric radius.
- Density-safe token slots.
- 1 s tooltips on icon-only controls.
- Examples never lock interactions, and carry no guide text.
- Scope lock.
- Backup before code changes.
- HANDOFF + CHANGELOG on finish.

---

## 2. Figma behaviour copied, and deliberate deviations

| Figma UI3 (source) | Zen Studio |
|---|---|
| **Panel order** Position → Layout → Appearance → Fill → Stroke → Effects (help 360039956914, 360040667874) | Position (new, mounted before Layout) → Layout (peer) → Appearance (peer: surface, border, radius per spec l.200) → **Effects** (new) → Properties. Splitting Appearance into Fill/Stroke is a *suggestion* to the peer, not a dependency. |
| **Alignment row**: 6 buttons, ⌥A/H/D/W/V/S; one layer aligns to its parent (360039956914) | Same 6 icons. Enabled for absolute layers only. In-flow layers show the row disabled, with a visible hint (Figma greys position for auto-layout children). Canvas ⌥ shortcuts come in v1.1. |
| **X/Y** from the parent's top-left; greyed for auto-layout children | X/Y are always **read-only, measured** (from the parent's border box, which is Figma's frame bounds). Deviation: editing happens through edge insets, because CSS writes the pinned edge, not X. |
| **Ignore auto layout**: a button next to X/Y, only for children of an auto-layout frame; the layer keeps its visual position; the parent re-hugs as if the child were gone; no Hug/Fill (360040451373; forum 84705, 50035) | Toggle in the X/Y row's 24 px slot. It keeps the visual position and size (§4.1 writes). Deviation: Figma turns Fill into Fixed px; Zen turns a filling axis into Left & right (or Top & bottom) on tokens, so no px is written. |
| **Constraints**: inline block with a diagram (outer and inner square, 4 arms, 2 centre ticks) and two dropdowns; Shift+click for both edges; default Left/Top; blue dotted lines on the canvas (360039957734) | Same diagram (64×64, the AlignmentBox height, spec l.173), two SelectFields, Shift+click, default Left/Top, and a ConstraintLayer with dashed lines. Always shown for absolute layers; no "Constraints" toggle, because only absolute layers have constraints in Zen. |
| **Center** keeps its offset from the centre; **Scale** keeps percentages | Center is exact centring with no offset (that would need signed tokens). Scale appears disabled as "Scale (needs %)" (Q1). |
| **Corner radius**: single field, "Mixed" when corners differ, Independent corners, TL→TR→BR→BL tab order (forum 9468), ←/→ nudges, no smoothing on tokens (360050986854) | Same. Deviations: (a) the 4 fields expand **inline** instead of opening the 2026 details panel. ScaleField already opens a listbox popover, so a popover inside a popover would be a focus-trap risk, and the panel's only other control (smoothing) has no token. (b) No smoothing. |
| **Effects**: "+" adds a Drop shadow immediately; style picker (Apply styles, grouped by folder, search, list/grid); styled row has no per-effect editing, a detach option and **no eye**; settings icon; hover preview in the type menu (360041488473, 360040316193, forum 56332) | "+" applies a context default immediately. The picker is grouped by folder (`Shadow / Bottom`, `Shadow / Top`, `Effect`). The row shows swatch, name, read-only settings popover and Remove. No detach, because detaching would produce free values. Eye: session eye (Q2). Hover preview in v1.1. |
| **Stacking**: auto layout "Last on top" (31289464393751) | CSS paints positioned boxes above in-flow ones. Fixed for later siblings by the paint rule (§3.1); an earlier absolute layer already paints correctly. |
| **Strokes** never move layout | Box `border` is a real 1 px border (layout.css:36-38), so CSS insets sit 1 px inside Figma's. Documented, not compensated. |

---

## 3. DS API (token-only)

### 3.1 Position and constraints on Stack, Grid and Box

**Files**
- New `src/components/Layout/position.ts` + `position.css`, imported by `position.ts` (same pattern as `sizing.ts:10`).
- `sizing.ts` and `layout.css` are not touched; the sizing session owns them.

```ts
// src/components/Layout/position.ts
import "./position.css";
import { paddingValue, type ZenPadding } from "../_shared/scale";

export const layoutPositions = ["static", "absolute"] as const;          // Figma layoutPositioning AUTO | ABSOLUTE; CSS keywords as ActionBar (ActionBar.tsx:7)
export type LayoutPosition = (typeof layoutPositions)[number];
export const layoutConstraintsX = ["left", "right", "left-right", "center"] as const;  // Figma MIN | MAX | STRETCH | CENTER (SCALE: Q1)
export type LayoutConstraintX = (typeof layoutConstraintsX)[number];
export const layoutConstraintsY = ["top", "bottom", "top-bottom", "center"] as const;
export type LayoutConstraintY = (typeof layoutConstraintsY)[number];

export interface LayoutPositionProps {
  /** Figma "Ignore auto layout". "absolute" takes the element out of its parent's flow and pins it to the parent Stack, Grid,
   *  Box or Card with constraintX/constraintY; siblings, gap and the parent's Hug ignore it. Default "static" (in flow). */
  position?: LayoutPosition;
  /** Figma horizontal constraint, read only with position="absolute": left (default) · right · left-right (stretches
   *  between the two offsets; width is ignored) · center (exact centre, offsets ignored). */
  constraintX?: LayoutConstraintX;
  /** Figma vertical constraint: top (default) · bottom · top-bottom · center. */
  constraintY?: LayoutConstraintY;
  /** Offset from the parent's left edge on Spacing/Padding (none … 4xl). Read only when constraintX pins the left edge
   *  (left, left-right). Default none (flush). Badges and status dots are component props, never insets. */
  insetLeft?: ZenPadding;
  /** Offset from the right edge (right, left-right). */  insetRight?: ZenPadding;
  /** Offset from the top edge (top, top-bottom). */     insetTop?: ZenPadding;
  /** Offset from the bottom edge (bottom, top-bottom). */ insetBottom?: ZenPadding;
}

export function layoutPosition(p: LayoutPositionProps) {                  // same {attributes, vars} shape as layoutSizing (sizing.ts:68-73)
  if (p.position !== "absolute") return { attributes: {}, vars: {} };      // unset or static renders nothing (sizing contract)
  const x = (layoutConstraintsX as readonly string[]).includes(p.constraintX!) ? p.constraintX! : "left";
  const y = (layoutConstraintsY as readonly string[]).includes(p.constraintY!) ? p.constraintY! : "top";
  const v = (t?: ZenPadding) => paddingValue(t) ?? "0px";                 // all four always written → a nested absolute child never inherits (own(), Layout.tsx:13-14)
  return {
    attributes: { "data-position": "absolute", "data-constraint-x": x, "data-constraint-y": y },
    vars: { "--zen-layout-inset-top": v(p.insetTop), "--zen-layout-inset-right": v(p.insetRight),
            "--zen-layout-inset-bottom": v(p.insetBottom), "--zen-layout-inset-left": v(p.insetLeft) },
  };
}
```

```css
/* position.css. Figma "Ignore auto layout" + constraints (position.ts). Only primitives carrying data-position="absolute" are
   touched, so ActionBar (action-bar.css:23-24) and Stepper (stepper.css:13-49) data-position never match. */
/* The JSX parent is the frame. The whole selector sits in :where() (0 specificity), so a parent's own sticky, fixed or absolute
   position wins. Card is already relative (card.css:5). */
:where(:is(.zen-stack, .zen-grid, .zen-box):has(> :is(.zen-stack, .zen-grid, .zen-box)[data-position="absolute"])) { position: relative; }
/* Layer order (Figma auto layout "Last on top"): an in-flow sibling AFTER an absolute layer paints above it. 0 specificity. */
:where(:is(.zen-stack, .zen-grid, .zen-box)[data-position="absolute"] ~ :not([data-position="absolute"])) { position: relative; }
:is(.zen-stack, .zen-grid, .zen-box)[data-position="absolute"] { position: absolute; }
/* (0,4,0) beats the column stretch (layout.css:11) and alignSelf/row fill (layout.css:93-99), all (0,3,0).
   auto = CSS 2.1 abspos sizing: Hug unless both edges of an axis are pinned. */
:is(.zen-stack, .zen-grid, .zen-box)[data-position="absolute"][data-constraint-x][data-constraint-y] { align-self: auto; justify-self: auto; }

/* P = :is(.zen-stack, .zen-grid, .zen-box)[data-position="absolute"]   (written out in the file; 0,3,0 with the constraint) */
P[data-constraint-x="left"]       { left: var(--zen-layout-inset-left); }
P[data-constraint-x="right"]      { right: var(--zen-layout-inset-right); }
P[data-constraint-x="left-right"] { left: var(--zen-layout-inset-left); right: var(--zen-layout-inset-right); width: auto; } /* beats data-w fixed/hug (0,2,0), layout.css:57-59 */
/* Centre without transform: transform/translate would create a stacking context and a containing block for fixed descendants. */
P[data-constraint-x="center"]     { left: 0; right: 0; margin-inline: auto; }
P[data-constraint-x="center"]:not([data-w="fixed"]) { width: fit-content; }
P[data-constraint-y="top"]        { top: var(--zen-layout-inset-top); }
P[data-constraint-y="bottom"]     { bottom: var(--zen-layout-inset-bottom); }
P[data-constraint-y="top-bottom"] { top: var(--zen-layout-inset-top); bottom: var(--zen-layout-inset-bottom); height: auto; }
P[data-constraint-y="center"]     { top: 0; bottom: 0; margin-block: auto; }
P[data-constraint-y="center"]:not([data-h="fixed"]) { height: fit-content; }  /* block-axis fit-content already relied on: layout.css:60 */
```

**Wiring in `Layout.tsx`** (a shared file; agree an edit window with the sizing session)
- `StackProps`, `GridProps` and `BoxProps` extend `LayoutPositionProps`.
- Destructure the 7 props next to sizing: l.60, l.120, l.179.
- `const position = layoutPosition(…)`.
- Spread `position.attributes` next to `sizing.attributes` (l.75, l.135, l.191).
- Add `...position.vars` inside `withVars` (l.76, l.144, l.196).
- Export the types from `src/components/Layout/index.ts`.

**How the behaviour falls out of CSS**
- `gap`, `fillChildren`, `justify` and Grid cells ignore out-of-flow children with no extra code; Figma does the same.
- `spacing.ts:96` already skips absolute children.
- In a Grid, an auto-placed absolute child uses the grid's padding box.
- Offsets are measured from the containing block's padding box. Figma also ignores the parent's padding for absolute children.

**Mapping to and from Figma**

| Zen | Figma |
|---|---|
| `position="absolute"` | `layoutPositioning: ABSOLUTE` |
| `constraintX` left / right / left-right / center | MIN / MAX / STRETCH / CENTER |
| `insetLeft="sm"` on a Left pin | X = 12 |

- Figma cannot bind x/y (`VariableBindableNodeField` has no x/y), so Figma→code snaps px to the padding ladder.
- Figma's tokenised idiom is "absolute frame at offset 0 whose padding is the token" (Modal Close #12048:10078, Card Sub-Action #6664:21686, Floating-Actions #6040:72809). It maps to `inset*` none + Box `padding`. Both forms are valid.
- Off-ladder offsets (1, 3, 5, 10, −2, −4) and overhangs occur only inside components (focus rings, hover bleed, status and notification dots). They stay component props.

**Scope of position**
- In v1: Stack, Grid and Box only.
- Not in v1: Text, Heading and library components. Wrap them in a Box, which is the `select/resize.ts:4-19` precedent; a Studio "Wrap in Box" action comes in v1.1.
- Out of scope: ActionBar keeps its own `position` (sticky/fixed/static); FormActions keeps `sticky` + `inset`.

### 3.2 Effects on Box: `effectStyle`

```ts
// src/components/Layout/effects.ts (new; imports ./effects.css)
export const boxEffectStyles = [
  "Shadow/Bottom/Level-1", "Shadow/Bottom/Level-2", "Shadow/Bottom/Level-3", "Shadow/Bottom/Level-4",
  "Shadow/Top/Level-1", "Shadow/Top/Level-2", "Shadow/Top/Level-3", "Shadow/Top/Level-4",
  "Effect/Overlay",
] as const;
export type BoxEffectStyle = (typeof boxEffectStyles)[number];
/** data-effect-style value = kebab(name) = the generated .zen-effect-* suffix (style-effects.css:98-127). */
export const effectStyleKey = (s?: BoxEffectStyle) =>
  s && (boxEffectStyles as readonly string[]).includes(s) ? s.toLowerCase().replace(/\//g, "-") : undefined;
// BoxProps:
/** Figma effect style. The whole style is the token, one per layer as in Figma (textStyle precedent). Drop shadows
 *  (Shadow/Bottom|Top/Level-N) render only on surface="surface", never on Subtle, Pale or Surface-Alt (§9), and a shadowed
 *  surface takes no border (elevation follows the Sidebar). Level-1 is the Card and Sidebar elevation; Top levels cast upward
 *  for bottom-pinned bars. Effect/Overlay is the background blur for translucent fills (surface subtle | pale). */
effectStyle?: BoxEffectStyle;
```

```css
/* effects.css: 9 explicit rules. Each selector carries its own fill, so §9 and "a shadow needs a surface" cannot render.
   Only --zen-style-* vars, so style-guard shadow/token passes (check-styles.mjs:102). */
.zen-box[data-surface="surface"][data-effect-style="shadow-bottom-level-1"] { box-shadow: var(--zen-style-shadow-bottom-level-1-shadow); }
/* …bottom-level-2…4, top-level-1…4 (style-effects.css:26-41) */
.zen-box:is([data-surface="subtle"], [data-surface="pale"])[data-effect-style="effect-overlay"] { backdrop-filter: var(--zen-style-effect-overlay-backdrop-filter); }
```

**Decisions**
- **Spread token, not `-unclipped`.**
  - Box elevation must look identical to Card (card.css:19) and Sidebar.
  - Figma renders spread only on clipped, filled frames (build-style-manifest.mjs:17-20). So a Box with a shadow corresponds to a Figma frame with Clip content on; the docs say so. See Q3.
- **Box only.** Stack and Grid have no fill. The Card family already expresses this through `theme`.
- **Excluded styles**

  | Style | Reason |
  |---|---|
  | Effect/Container, Effect/Popover | Reserved for layers 4 and 5 (check-usage.mjs:919-924) |
  | Effect/Input | The only inner shadow; for fields |
  | Shadow/Action/* | For controls |
  | Neo-Brutalism | Unused anywhere |
  | Glass-Floating, Liquid-Glass/* | GLASS has no CSS (style-effects.css:61,130,135) |
  | Remote Background-Blur (Sidebar #4233:5939) | Not in the repo |
  | Layer blur | No style has one |

- **Round trip.** Raw Figma effects that use no style do not round-trip; for example Floating-Actions #6040:72809 (DS 28@0,12 + 8@0,4). The fix is a Figma effect style, not a Zen value. Log it to the Backlog.

### 3.3 Corner radius: per corner on Box and Image, with no CSS change

```ts
// src/components/_shared/corners.ts (new file; consumed by Box and Image only, so the tier stays M)
export interface CornerRadiusProps {
  /** One corner on the Corner-Radius tokens (Figma topLeftRadius bound per corner); follows the radius mode.
   *  A set corner wins over `radius`, as paddingX wins over padding. */
  radiusTopLeft?: ZenCornerRadius; radiusTopRight?: ZenCornerRadius; radiusBottomRight?: ZenCornerRadius; radiusBottomLeft?: ZenCornerRadius;
}
export const cornerRadiusPropNames = ["radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft"] as const;
export function cornerRadiusValue(radius: ZenCornerRadius | undefined, c: CornerRadiusProps) {
  const k = [c.radiusTopLeft, c.radiusTopRight, c.radiusBottomRight, c.radiusBottomLeft];
  if (k.every((v) => v === undefined)) return radiusValue(radius);
  return k.map((v) => radiusValue(v ?? radius) ?? "0px").join(" ");                  // TL TR BR BL (CSS = Figma order)
}
```

**Wiring**
- Box: `"--zen-box-radius": own(cornerRadiusValue(radius, corners))` (Layout.tsx:195). layout.css:31 reads it as `border-radius`, which accepts a 4-value list.
- Image: `"--zen-image-radius": cornerRadiusValue(radius, corners)` (Image.tsx:105). Because `radius` is already defaulted to `"md"` (Image.tsx:99), unset corners stay md. image.css:9/43 and the `::after` `inherit` work unchanged.
- Nothing else reads either var. Only layout.css:31 and image.css:9/43 do (grep 2026-10-03).

**Canonical form** (what Studio writes and the importer emits)

| Shape | Written as |
|---|---|
| All four corners equal | `radius` only |
| Otherwise | `radius` plus only the corners that differ from it |

Examples:
- Chat tail: `radius="xl" radiusBottomRight="xs"`.
- Sheet top: `radiusTopLeft="3xl" radiusTopRight="3xl"`.
- Range start: `radiusTopLeft="sm" radiusBottomLeft="sm"`.

This covers every non-uniform shape in the file: Bottom-Sheet #4059:14162, Chat #6323:1354, Date-Picker #455:33498, Logistic #5466:2426.

**Not offered**
- giant and xgiant (Q6).
- `action-*` and `input-*` tokens, which are reserved by `radius/role` (check-styles.mjs:82).
- Smoothing: there is no token, and `corner-shape` is Chromium-only.
- Card and Thumbnail corners: their radius is fixed by `spacing` and `shape`.

### 3.4 Where the props live

| Component | New props |
|---|---|
| Stack, Grid | `position`, `constraintX`, `constraintY`, `insetTop/Right/Bottom/Left` |
| Box | the props above + `effectStyle` + `radiusTopLeft/TopRight/BottomRight/BottomLeft` |
| Image | `radiusTopLeft/TopRight/BottomRight/BottomLeft` |
| Card, MetricCard, ChartCard | none. Studio shows their theme effect read-only |
| Avatar status, nav dots, Card subAction | none; they stay component props |

### 3.5 Docs (definition of done, AGENTS.md §B)

**JSDoc** on every prop, as above. `npm run guidelines:build` then regenerates:
- `docs/api/layout.json` and `image.json`;
- `src/platform/api.generated.json`;
- `docs/guidelines/*.md` and `index.json`;
- `llms.txt`.

**`tools/usage-guard/guidelines.source.mjs`**
- **layout (l.666-678): api rows, plus do and don't.**
  - Do: pin a media overlay with `position="absolute" constraintX="right" insetRight="sm"`.
  - Do: put background media first and the content after it.
  - Do: lift a Surface panel on Canvas/Default with `effectStyle="Shadow/Bottom/Level-1"` and no border.
  - Do: round only the top corners of top media to the container radius.
  - Don't: use absolute for what `gap`, `justify` or `alignSelf` can do.
  - Don't: place status dots, badges or Card sub-actions by hand.
  - Don't: put a shadow on a tinted fill or on Canvas/Alt.
  - Don't: write `style={{ top }}`.
- **background-layers:** a Box `effectStyle` row.
- **card (l.386-396):** "Card shadow = Box Shadow/Bottom/Level-1; a clickable panel is a Card".

**Hand-written**
- `AGENTS.consumer.md:103` layout row, and §7 l.142-155.
- `Layout.stories.tsx`: Position, Effect style and Corners stories.
- `src/platform/examples/pages/layout.tsx`, four examples. All interactions must work; no guide text.
  - "Pinned overlay": photo, corner action Right/Top `sm`, caption bar Left & right/Bottom.
  - "Background media": absolute media first, content after.
  - "Elevated panel".
  - "Sheet top corners".

**Figma-to-code mapping tables**, for constraints, effect style and per-corner radius:
- in the `zen-ds-figma-to-code` skill (user-level plugin);
- in `skills/zen-component-usage` if it covers Layout.

### 3.6 Harness

**usage-guard JSX rules** (check-usage.mjs; uses the `literal`/`has`/`parent()` helpers at l.489 and l.614-618). Each rule gets an `expect:` case in `fixtures/bad.tsx` and a clean case in `good.tsx`.

| id | sev | Trigger | Message |
|---|---|---|---|
| `layout/constraint-needs-absolute` | warn | `constraintX/Y` or `inset*` without `position="absolute"` | "Constraints do nothing until the layer ignores auto layout." |
| `layout/inset-not-read` | warn | An inset on an edge the constraint doesn't read (e.g. `insetRight` with left or center) | "insetRight is ignored while pinned left; set constraintX=\"right\" or \"left-right\"." |
| `layout/absolute-fill` | error | absolute + `width` or `height` `"fill"` | "Fill doesn't apply to an absolute layer; pin left-right / top-bottom." |
| `layout/stretch-ignores-size` | warn | left-right + `width`; top-bottom + `height` | "Width is ignored while pinned left and right." |
| `layout/absolute-align-self` | warn | absolute + `alignSelf` | "Align in parent does nothing on an absolute layer." |
| `layout/absolute-parent` | warn | `parent()?.tag` not Stack/Grid/Box/Card (skipped when there is no parent) | "Measured from the nearest positioned ancestor, not <X>; wrap the content in a Box." |
| `box/effect-needs-surface` | error, allow `tinted-shadow` | Drop-shadow `effectStyle` with `surface` ≠ `"surface"` | Tinted: "No outer shadow on Subtle, Pale or Surface-Alt (§9)." None: "A shadow needs surface=\"surface\"." (JSX twin of `surface/no-shadow-on-tinted`, l.903-910, which can't see attribute pairs) |
| `box/blur-needs-tint` | warn | `Effect/Overlay` without surface subtle or pale | "Background blur does nothing behind an opaque fill." |
| `box/shadow-no-border` | warn, allow `elevation` | Drop-shadow `effectStyle` + `border` | "A shadowed surface takes no border (elevation follows the Sidebar)." |
| `radius/redundant-corners` | warn | Box or Image: all four corners equal, a corner equals `radius`, or `radius` + all four corners | "Use radius" / "radius is overridden on every corner." |

**Selftests and runtime checks**
- **Effects selftest:** a CSS assertion that every drop-shadow `[data-effect-style]` selector in `effects.css` carries `[data-surface="surface"]`, and that the overlay rule carries subtle or pale.
- **Position selftest** (`position.selftest.mjs`):
  - `layoutPosition()` is inert unless absolute;
  - it writes four vars;
  - it falls back to left/top for invalid constraint values.
- **Runtime audit (part of the radius definition of done):** `tools/platform-audit/quality-checks.mjs:255` reads only `borderTopLeftRadius`. Make it compare each corner with the child inset near that corner, and skip `[data-radius="luxury"]`, where every step is 2 px.

**Approval-gated harness work (Q5)**
- `audit.mjs:235 surfaces`: a Box shadow whose backdrop is Canvas/Alt is an error; a shadow beside an alt or flat Sidebar is a warning.
- A new `layer/one-elevation-per-screen` (warn).
- A style-guard `position/token` warning for raw `top/right/bottom/left/inset`, scoped to `src/platform/examples/**` and `src/templates/**`.

### 3.7 Tests

**`tests/interaction/layout-position.test.tsx`** (new; sibling of `layout-sizing.test.tsx`)
- Computed `left/right/top/bottom/width` for each constraint.
- `center` with and without a fixed width.
- Left-right overrides `width`.
- A nested absolute child does not inherit insets.
- A column-Stack child is not stretched (the l.11 reset).
- A Card parent is the containing block.
- Paint order: `elementFromPoint` hits the later in-flow sibling, not the earlier absolute media.
- Effect gating: no shadow on pale, surface-alt or none; no blur on surface.
- Per-corner radii on Box; Image unset corners stay md.
- Unset props render no `data-position`, `data-effect-style` or extra vars.

**Other suites**
- `npm run usage:selftest` and `npm run style:selftest`.
- `npm run guidelines:check`.
- Tier-M contract re-capture through `npm run qa`. Phases A and B must show 0 changed panels on existing pages, because every new prop is unset there.

---

## 4. Studio UI

### 4.0 Shared plumbing

**Files** (self-contained folders with barrels, following `slots/index.ts:7-22`)
- `src/platform/studio/position/{PositionSection.tsx, ConstraintsDiagram.tsx, ConstraintLayer.tsx, positionModel.ts, positionModel.selftest.mjs, position.css, index.ts}`
- `src/platform/studio/effects/{EffectsSection.tsx, effectsModel.ts, effectsModel.selftest.mjs, effects.css, index.ts}`
- `src/platform/studio/radius/{CornerRadiusField.tsx, radiusModel.ts, radiusModel.selftest.mjs, index.ts}`
- The models are pure functions from intent to `EditOp[]`, in the `sizingModel` style.

**Contract**
- Every section takes `LayoutGroupProps {api, specs, component, host}` (fieldApi.ts:21-29).
- Each is keyed by `data-zen-src` and gated by `hasPosition` / `hasEffects` / `hasCorners(component)`, in the style of SizingSection l.50-58.
- Each exports a prop-name set: `positionPropNames`, `effectPropNames`, `cornerPropNames`.
- DesignPanel l.610 filters these from Properties **only for gated components**, so ActionBar keeps its own `position` row.

**Writes**
- Every compound gesture is **one `api.apply(ops, label, optimistic)`**, which means one POST and one undo step. `apply` returns the queued response (DesignPanel `send`, l.556-586; spec l.389).
- Do **not** clone SizingSection's private writer (l.200-270) a third time.
- Single-prop gestures may use `setProp`/`removeProp`.

**Interim behaviour (no dependency)**
- After `guidelines:build`, the new props appear in Properties as enum rows. `ZenPadding`, `ZenCornerRadius` and the literal unions are expanded by `scaleMembers`/`editorFor` (propSchema.ts:165-207).
- So the API is editable before any section ships. Each section takes its props over as it lands.

**Labels** (`propLabels`, propSchema l.77-100, sentence case)

| Prop | Label |
|---|---|
| `position` | "Position" |
| `constraintX` | "Horizontal constraint" |
| `constraintY` | "Vertical constraint" |
| `insetLeft` | "Left offset" (and so on per edge) |
| `effectStyle` | "Effect style" |
| `radiusTopLeft` | "Top left radius" (and so on per corner) |

**States, shared by all three sections** (spec l.148-152)

| State | Display |
|---|---|
| unset | The effective value in Content/Neutral/Base |
| literal | Content/Neutral/Strongest |
| bound | Code pill (`icon-code-01-line`, expression in Body/Code, live value); read-only; one note per section ("Set in code" or `boundHint`) |
| spread | `icon-lock-01-line` "Set by {...props}"; read-only |
| viewer (`api.disabled`) | Disabled; values still show |
| not applicable | Section hidden |

Geometry is identical across all states (spec l.428).

### 4.1 Position section (title "Position", mounted between DesignPanel l.756 and l.766)

**Visibility**
- Shown for any selected element that has a parent in the example (not the frame root).
- The "Ignore auto layout" toggle appears only for Stack, Grid or Box whose JSX parent is a Stack, Grid, Box or Card.
- For a library component the section shows the Align row (disabled) and X/Y read-only, with the hint "Only Stack, Grid and Box can ignore auto layout." The "Wrap in Box" action comes in v1.1.

**Layout**

```
Position
[⇤][⇹][⇥] [⤒][⇳][⤓]                              Align toolbar: icon-align-left-01-line, -horizontal-centre-01-line,
                                                  -right-01-line, -top-01-line, -vertical-center-01-line, -bottom-01-line
[X  24      ][Y  16      ]            [⧉]        measured px, read-only (.studio-sizing__pair, sizing.css:8-11); slot toggle
Placed by the parent's auto layout.               Caption hint, in flow only ("Placed by the page flow." under Box/Card)
┌────────┐ [Horizontal  Left and right ▾]         absolute only: 64×64 diagram + two SelectField sm
│ ┌────┐ │ [Vertical    Bottom         ▾]
│ └────┘ │
└────────┘
[L  sm    12 ▾][R  sm    12 ▾]        [ ]        Horizontal offsets: 1 field, 2 fields (stretch) or read-only "Centered"
[B  xs     8 ▾]                       [ ]        Vertical offsets
Snapped to tokens: left sm · 12 (was 13 px).      transient Caption, aria-live=polite, cleared on the next gesture
```

**Toggle**
- IconButton xs `icon-transform-line` (check it visually; fallback `icon-pin-02-line`), `aria-pressed`.
- aria-label and 1 s tooltip: "Ignore auto layout" when the parent is a Stack or Grid; "Absolute position" when the parent is a Box or Card.
- Keys: Space/Enter.

**Align row**
- xs flat IconButtons with roving focus (←/→). Tooltips read "Align left · ⌥A" and so on.
- Absolute layers only. On a stretched axis that axis's three buttons are disabled; the diagram and select already show "Left and right".

**Diagram**
- Parts: outer square in Border/Neutral/Subtle; inner square in Background/Neutral/Pale; four arms and two centre ticks.
- Colours: idle arms Content/Neutral/Placeholder, hover Base, selected in the AlignmentBox v2 accent (spec l.227).
- Click an arm or a centre tick to set that axis. Shift+click the opposite arm to get Left and right / Top and bottom.
- Pointer-only, `tabindex=-1`, `aria-hidden`. The selects are the keyboard path (spec l.156).

**Constraint selects**
- SelectField sm "Horizontal": Left · Right · Left and right · Center · **Scale (needs %)**, the last one disabled.
- "Vertical": Top · Bottom · Top and bottom · Center · **Scale (needs %)**, disabled.
- The reason sits in the option label, because `SelectFieldOption` has no caption (Input.tsx:436).
- Keys: Alt+↓ and typeahead.

**Offset fields**
- ScaleField on `scale="padding"` (spec l.239, l.391). The leading text glyph L/R/T/B doubles as the future scrub handle; the trailing token px is read from the computed token.
- Keys (ScaleField): ↑/↓ step and commit on keyup; Shift steps the full scale; ⌫ resets to none; Esc reverts; Alt+↓ opens.
- If ScaleField has not landed, use SelectField sm with "sm · 12" option labels behind the same `onPick`, and swap later. Never build a parallel picker.
- Tab order: toggle → Align → Horizontal → Vertical → offset fields.

**Measuring**
- Containing block = `host.offsetParent`, using its padding box: rect ÷ `getViewport().zoom`, minus `clientLeft/clientTop` (SizingSection l.109-111; ResizeLayer l.627-631 for differently scaled frames).
- Snapping: `keyForPx(paddingOptions, px)` (spacing.ts:270-274), nearest step; ties go to the smaller step; above 48 px clamps to `4xl` and says so.

**Gestures and writes** (one `apply` each; picks write what the user picks, spec l.437)

| Gesture | Ops |
|---|---|
| Toggle on | `position="absolute"`. Per axis: if the layer spanned the content box (±1 px), or has `width`/`height="fill"`, set `constraintX="left-right"` (Y: top-bottom) with both insets snapped and remove `width`/`height` fill. Otherwise set `insetLeft`/`insetTop` = snap(measured), omitted when it snaps to none. Remove `alignSelf`. Show the snap note. |
| Toggle off | Remove `position`, `constraintX`, `constraintY` and every written `inset*`. The layer returns to its DOM slot, as in Figma. |
| Constraint change (select or diagram) | Set the constraint. Set each newly read inset to the snapped measured distance. Remove insets that are no longer read. To left-right: also remove `width` and say "Width now follows the parent." To center: remove that axis's insets and say "Centered; Zen has no offset from the centre." The layer keeps its place except for snapping. |
| Align (absolute) | Set that axis's constraint to left/center/right (top/center/bottom) and remove that axis's insets (edge = 0, as Figma aligns to the parent). |
| Offset pick / ⌫ | `setProp inset<Edge>` / `removeProp inset<Edge>` |
| Warning action | As listed below |

**Warnings** (`.studio-inspector__note[data-tone=warning]` + action, spec l.191; shown only when the source writes the dead combination)

| Copy | Action |
|---|---|
| "Constraints do nothing until the layer ignores auto layout." | Remove · Ignore auto layout |
| "Right offset is ignored while pinned Left." | Remove |
| "Fill doesn't apply to an absolute layer." | Pin left and right |
| "Width is ignored while pinned Left and right." | Remove width |
| "Align in parent does nothing on an absolute layer." | Remove |
| "Pinned to {Card}, the nearest positioned parent." | info only; shown when `offsetParent` ≠ the JSX parent |
| "The parent now hugs nothing. Give it a size." | info only; shown when every child is absolute and the parent has no fixed or fill size on that axis |
| "This layer sits on top but comes first in reading order. Move it after the content." | info only; shown when an absolute layer with focusable descendants precedes in-flow siblings (WCAG 1.3.2 / 2.4.3) |

### 4.2 Effects section (title "Effects", after Appearance and before Properties)

**Gate**
- Box: editable.
- Card, MetricCard, ChartCard: one read-only row from a static map.
  - `theme="shadow"` → Shadow/Bottom/Level-1.
  - `pale` / `semi-pale` → Effect/Overlay.
  - border / flat → no row.
  - The row carries the caption "From Card theme · Shadow", a lock in the slot, and Button flat xs "Edit theme" (zen-allow-compact-button, spec l.164). The button focuses the Properties row `data-prop="theme"`.
- Other components: section hidden in v1.

**Header actions**
- IconButton xs `icon-dots-grid-line` "Apply effect style" opens the picker.
- IconButton xs `icon-plus-line` "Add effect" is shown only while no style is applied (one style per layer).

**Row**

```
Effects                                     [⣿ Apply effect style] [+ Add effect]
[⚙][▣ Shadow/Bottom/Level-1          ]  [👁] [−]
```

- **Settings:** `icon-sliders-02-line` "Effect settings" opens a read-only Popover titled "Effect settings".
  - It lists the manifest layers in Figma order (`style-manifest.json` `effectStyles`, about l.2290), for example "Drop shadow · X 0 · Y 4 · Blur 8 · Spread −4 · Shadow/Neutral/Base" and "Background blur · 50".
  - Footer: "Effect styles are tokens: edit them in Figma, then run the style sync."
- **Style button:** a 16 px swatch painted with the real rule, plus the Figma name in Body/Small/Regular. It opens the picker. With focus, ↑/↓ step the level within the same folder and commit on keyup.
- **Eye** (Q2, recommended default): `icon-eye-line` / `icon-eye-off-line`, "Hide effect" / "Show effect".
  - Off removes `effectStyle` and keeps a ghost row with a dimmed swatch and the caption "Hidden. Hidden effects aren't saved in code."
  - On writes the style back.
  - The remembered value lives in the Studio session per `data-zen-src` and is gone after a reload.
- **Slot:** `icon-minus-line` "Remove effect". ⌫ on the focused row does the same.

**Picker** (Popover listbox using ScaleField row anatomy)

| Group | Rows | Captions |
|---|---|---|
| Shadow / Bottom | Level-1…4 | Type caption "3 drop shadows" (from the manifest); usage: Level-1 "Card and Sidebar elevation", Level-2 "Raised on hover" |
| Shadow / Top | Level-1…4 | Type caption; usage: Level-2 "Bottom sheets" |
| Effect | Overlay | "Background blur 50" |

- Disabled rows carry the reason in the row caption:

  | Condition | Disabled rows | Caption |
  |---|---|---|
  | Surface is subtle, pale or surface-alt | Drop shadows | "Not on a tinted fill" |
  | Surface is unset or none | Drop shadows | "Needs the Surface fill". Row action "Add with Surface fill" writes `surface="surface"` + the style in one apply. |
  | Surface is surface, surface-alt or none | Overlay | "Needs a Subtle or Pale fill" |

- Footer: "Inner shadow (Effect/Input), Container, Popover, Action and Glass styles belong to their components. Zen has no layer-blur style."
- Live canvas preview on row hover comes in v1.1, through a transient `data-effect-style` on the host. Hovering never writes (spec l.150).

**"+" (Figma adds a drop shadow at once)**

| Context | Applies |
|---|---|
| `surface="surface"` and `constraintY="bottom"` | Shadow/Top/Level-1 |
| `surface="surface"` | Shadow/Bottom/Level-1 |
| `surface` subtle or pale | Effect/Overlay |
| `surface` unset or none | Disabled; note "Effects need a fill." + Button "Add with Surface fill" |
| `surface="surface-alt"` | Disabled; note "Surface-Alt takes no effect: no shadow on a tinted fill, and blur needs a translucent fill." |

**Warnings** (with actions)

| Copy | Action |
|---|---|
| "No drop shadow on Subtle, Pale or Surface-Alt fills." | Remove |
| "A shadow needs the Surface fill." | Remove · Use Surface |
| "Background blur does nothing behind an opaque fill." | Remove |
| "A shadowed surface takes no border (elevation follows the Sidebar)." | Remove border |
| "On Canvas Alt, Surface boxes use a Pale border, not a shadow." | Use border (one apply: `border="pale"` + remove `effectStyle`) |

- The Canvas/Alt warning is a runtime check: `effectsModel` walks up to the first opaque background and compares its computed colour, as `audit.mjs` `surfaces` does. It warns and never blocks, because the detection is a heuristic.
- The flat/alt-Sidebar context check comes in v1.1.

### 4.3 Corner radius field (`studio/radius/CornerRadiusField.tsx`)

**Mounting**
- The Appearance owner mounts it in their "Corner radius" row (spec l.200, l.332).
- Until Appearance exists, PropField routes `scaleFor === "radius"` to it (spec l.387, l.397). Otherwise the corner props stay as enum rows in Properties.
- Card: read-only "From Card spacing · 2xl 24", which is a suggestion to the Appearance owner.

**Layout**

```
Corner radius  [◜ xl          20 ▾]  [⛶]             ScaleField scale="radius"; slot icon-scan-line "Independent corners" (aria-pressed)
               [TL lg   16 ▾][TR lg   16 ▾]          inline 2×2; opens when pressed or when any corner prop is written
               [BL none  0 ▾][BR none  0 ▾]          DOM order TL→TR→BR→BL (Figma tab order), placed by CSS grid
Luxury radius: every step is 2 px.                     Caption, only under [data-radius="luxury"]
```

**Values shown**
- px come from the computed `--zen-corner-radius-*` in the host's `[data-radius]` scope; effective corners come from computed `border*Radius`.
- The token is always taken from the written prop, never reverse-mapped from px, because in Luxury every step is 2 px.
- Image px are read from `.zen-image__frame`.

**Uniform field when corners differ**
- Shows "Mixed", with the trailing range "8–24".
- Writes nothing until the user picks a value.
- The concentric hint ("Outer = item radius + gap") goes in the tooltip.

**Corner fields**
- aria-labels "Top left radius" and so on.
- An unset corner shows the inherited token in the default tone, with the tooltip "From corner radius · xl".

**Writes** (canonical form, §3.3)

| Gesture | Ops |
|---|---|
| Uniform pick k | One apply: `radius=k` + remove each written corner |
| Uniform ⌫ | One apply: remove `radius` + written corners |
| Corner pick k | If all four effective corners now equal k: one apply, `radius=k` + remove all corners. Else if k equals the effective `radius`: remove that corner. Else set that corner. |
| Corner ⌫ | Remove that corner (falls back to `radius`) |
| Toggling the view | No write |

### 4.4 Canvas affordances

**`ConstraintLayer`** (in v1)
- Mounted after SlotLayer at StudioCanvas l.313.
- Copies SlotLayer's loop (l.165-230): `measure`/`schedule` with a settle window, `canvasApi.onChange`, `onSourceUpdate`, capture-phase scroll, a throttled MutationObserver and a ResizeObserver. The host is resolved with `slots/dom.ts:14 selectedHit`.
- For a selected absolute layer:
  - Dashed 1 px lines in the selection colour from the containing block's padding edge to each pinned edge, along the layer's centre line.
  - Pills in the `areaLabel` format "left · sm · 12" (spacing.ts:333-339), styled like `.studio-selection__spacing-label`.
  - Center: a centre-axis tick and a "center" pill.
  - The parent gets the dashed owner outline (`data-kind="owner"`).
- `pointer-events: none` and `aria-hidden`.

**Resize** (resize owner)
- `resize.ts`/`ResizeLayer` assume flow layout (resize.ts:4-19, 240, 283, 289, 307).
- Request: on `[data-position="absolute"]` never wrap, and hide handles on a stretched axis.
- v1.1: on a stretched axis, an edge drag edits that edge's inset, snapped to the padding ladder.

**Later**
- v1.1:
  - hoverBus emphasis of the matching line when hovering an arm or select row (spec l.399; hoverBus lands in inspector Phase 7, l.413);
  - ⌥A/H/D/W/V/S on the canvas, checked against AlignmentBox W/A/S/D;
  - canvas arrow keys step the pinned inset one ladder step (Shift: two), committed on keyup.
- v2:
  - drag-to-move with token snapping;
  - radius handles ("white circles with blue borders", ⌥ for one corner, snapping to tokens).

---

## 5. File ownership and coordination

| Path | Owner | Phase 2 change |
|---|---|---|
| `src/components/Layout/{position,effects}.{ts,css}`, `src/components/_shared/corners.ts`, `studio/{position,effects,radius}/**` | Phase 2 (new files) | Create |
| `src/components/Layout/Layout.tsx` | Shared; the sizing session edited it at 10:01 | About 12 lines: `extends`, destructure, spreads, radius var. Ask first and agree a window. |
| `src/components/Layout/layout.css`, `sizing.ts`; `inspector/SizingSection.tsx`, `sizingModel.ts` | Sizing session | **No change** |
| `src/components/Image/Image.tsx`, `src/components/Layout/index.ts` | Unclaimed | Corner props; type exports |
| `inspector/DesignPanel.tsx`, `PropField.tsx`, `propSchema.ts` | Studio owner, handing to the inspector owner (spec l.3, l.389) | Ask them to: land `FieldApi.apply` (returns the response); filter the three prop sets per gated component (l.610); add the Position mount (l.756-766) and Effects mount (after Appearance); add labels (l.77-100); route `scaleFor==="radius"` to CornerRadiusField |
| `inspector/controls/ScaleField.tsx`, Appearance section, hoverBus | Inspector owner ("Cloud migration feasibility") | Consume only; the Appearance "Corner radius" row mounts CornerRadiusField |
| `canvas/StudioCanvas.tsx` | Phase 2 owner (slots, l.313) | One mount line for ConstraintLayer |
| `select/resize.ts`, `ResizeLayer.tsx` | Resize/sizing owner, still changing ("Round 3") | Absolute-child branch (§4.4) |
| `tools/usage-guard/{check-usage,guidelines.source}.mjs` + fixtures; `tools/platform-audit/quality-checks.mjs` | Shared harness | The 10 rules, guideline rows, per-corner concentric check |
| `src/platform/examples/pages/layout.tsx`, `Layout.stories.tsx`, `AGENTS.consumer.md` | Docs | Examples, stories, row |

**SendMessage before any edit** (peer etiquette; no message implies approval)
1. **Inspector owner:**
   - l.154 and l.356 are superseded for position, effects and radius (D2–D5);
   - request `apply`, the mounts, the per-component filter and the labels;
   - CornerRadiusField will be mounted in their Appearance row;
   - suggest (optionally) splitting Appearance into Fill/Stroke to mirror UI3.
2. **Sizing/resize owner:**
   - the Layout.tsx edit window;
   - Position gestures remove `width`/`height` fill and `alignSelf` when they become dead;
   - the absolute branch in resize.
3. **Studio owner:** DesignPanel lines until the hand-off.

**Process**
- Back up every touched file to `backups/*.tar.gz` before the first edit, and report the path.
- Re-grep line numbers before editing.
- Update `docs/context/HANDOFF.md` and `CHANGELOG.md` at the end of each phase.

---

## 6. Phased delivery (AGENTS.md §C tiers)

**Status 2026-10-04:** Phase C is built (`src/platform/studio/position/**`) except the canvas ConstraintLayer (§4.4,
Backlog). Two changes from §4.1: Ignore auto layout is offered for any layer (Stack, Grid, Box on their own props;
anything else floats in a Box, and off removes that Box again with server op `unwrap`), and on turning it on each axis
is pinned to the nearer edge (or Center / Left and right) instead of always Left / Top, so the layer moves least on the
token ladder.

| Phase | Tier | Contents | Depends on | Gate |
|---|---|---|---|---|
| 0 | — | The three messages; confirm `apply` and the mount points; backups | — | Replies on record |
| A. Library position | M | `position.ts`/`.css`; Layout.tsx wiring; JSDoc; rules 1–6 + fixtures; position selftest; interaction tests (§3.7); "Pinned overlay" + "Background media" examples; guidelines and api regen | Layout.tsx window | `npm run qa` scoped to layout, contract re-capture with 0 changed panels elsewhere; `usage:selftest`; `guidelines:check` |
| B. Library effects + corners | M | `effects.ts`/`.css`; `_shared/corners.ts`; Box + Image wiring; rules 7–10; effects-gating selftest; per-corner concentric audit; "Elevated panel" + "Sheet top corners" | A merged (same files) | As A, plus `style:check` and image suites |
| C. Studio Position + ConstraintLayer | M | §4.1, §4.4 v1; positionModel selftest | `apply`; ScaleField (or the SelectField interim) | Gesture QA as spec l.428-429: toggle, select or ↑×5 → 1 POST and 1 undo; hover and Esc → 0 POST. Widths stable at 280/320/480. Light and dark screenshots. `npm run qa`. |
| D. Studio Effects | S | §4.2 including the session eye (if Q2 = yes); effectsModel selftest | B; `apply` for the two compound actions | As C |
| E. Corner radius field | S | §4.3; radiusModel selftest | B; ScaleField; Appearance row or PropField route | As C, plus Luxury and Standard mode screenshots |
| F. Approval-gated (Q3, Q5, Q6) | S each | `clip` prop; runtime audits; style-guard inset rule; migrate the 4 overlay examples (button.css:9-16 → button.tsx:291-305; slider.css:21-22; tooltip.css:21-23; uploader.css:3-11); Card `theme="shadow" surface="alt"` fix (card.css:12,19) | User OK | Per change |
| v1.1 | S each | Canvas ⌥ shortcuts and arrow nudges; hover preview; hoverBus emphasis; read-only rows for component-owned effects (Dialog, Popover, BottomSheet, Sidebar via a computed `boxShadow` probe); "Wrap in Box"; actionable concentric hint; flat/alt-Sidebar context warning; stretched-axis resize edits insets | C–E | — |
| v2 | — | Drag-to-move with token snapping; radius handles; Scale / negative insets / sticky and fixed position types if approved; multi-select align and distribute | — | — |

**Out of scope (no placeholders drawn)**
- Rotation and flip.
- z-index.
- RTL logical sides.
- Center offsets.
- Breakpoint-alias insets such as Margin-Comfortable.
- Position on Text, Heading or library components.
- Effects on Stack, Grid or Image.
- Multiple effects per layer.
- Detaching or editing individual effects.
- Inner shadow and layer blur on Box.
- Corner smoothing.

---

## 7a. User answers (2026-10-03)

- Q1 Scale: listed but disabled, "Scale (needs %)" with its reason visible.
- Q2 Effect eye: session eye (hiding removes the prop, a ghost row keeps it until reload).
- Q3 Clip content: yes, Box `clip?: boolean` in Phase B, with a Studio "Clip content" toggle.
- Q4 Negative insets: no (default; every overhang belongs to a component).
- Q5 Approved extras: (a) runtime audits (shadow on Canvas/Alt, one elevation per screen), (b) the style-guard raw-inset
  rule in examples and templates, (c) migrate the 4 overlay examples, (d) fix Card `theme="shadow" surface="alt"`.
- Q6 giant / xgiant radius: not now (default).

## 7. Open questions for the user (real decisions only)

1. **Scale constraint.** It needs percentages, which are not tokens. Figma uses it only inside components: Color-Selector ring #4952:857, Progress-Bar #1536:176.
   - Recommended: keep it listed but disabled ("Scale (needs %)") in v1.
   - Alternative: a fraction enum later (¼, ⅓, ½, ⅔, ¾ of the parent), which is a new pseudo-token scale.
2. **Effect "toggle".** Figma has no eye on styled rows, and every Zen effect is a style.
   - Recommended: a session eye. Hiding removes the prop and keeps a ghost row until reload.
   - Alternatives: no eye (strict Figma parity); a persisted hidden prop (not recommended, because it ships dead code).
3. **Clip content.** Should Box get `clip?: boolean` (`overflow: clip`) in Phase B?
   - It is needed so full-bleed absolute media inside a radiused Box keeps its corners. Examples clip with raw CSS today (button.css:9, HrTasksTemplate.tsx:420).
   - It also makes the spread-shadow choice principled.
   - Recommended: yes.
4. **Negative insets (overhang).** Should Box offer `"-xs"`… insets, written as `calc(-1 * var(token))`?
   - Recommended: no. Every overhang in the file belongs to a component: focus rings, hover bleed, status and notification dots.
5. **Scope-lock approvals.**
   - (a) Runtime audits: shadow on Canvas/Alt, and one elevation per screen.
   - (b) style-guard raw-inset rule in examples and templates.
   - (c) Migrate the 4 overlay examples to the new props as the proof set.
   - (d) Fix Card `theme="shadow" surface="alt"`, which paints a shadow on Surface-Alt and so violates §9.
   - Recommended: a, c, d yes; b to the Backlog.
6. **`giant` / `xgiant` in `ZenCornerRadius`** (scale.ts:63). The tokens exist (32/36 in Rounded) and are used by Modal and AI-chat. Adding them is a tier-L `_shared` change.
   - Recommended: not now. No Box use needs them.