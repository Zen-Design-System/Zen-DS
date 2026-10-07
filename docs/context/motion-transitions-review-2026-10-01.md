# Motion and transitions review (2026-10-01)

Research only: no code was changed. This file is the only output. It answers "research upgrading the component
transition and interaction animations". Inventory was done with grep over `src/components/**/*.css|*.tsx`;
external values come from the sources listed in section 2, and anything not fetched is marked "(not verified)".

## TL;DR

- Zen already has a small motion foundation: `src/components/Motion/motion.css` defines 3 durations
  (120/200/280ms) and 3 curves (standard, emphasized, exit). `usePresence` holds a `data-state="closing"` phase
  for exit animations. Dialog, ModalForm, SidePanel, BottomSheet, AppShell drawer and Toast animate in and out
  with a reduced-motion fallback. That is a good base.
- But the foundation is only half adopted. 18 of 29 `transition` declarations and about 9 `animation`
  declarations use raw values: 100/120/140/160/240/260/280/300ms and 1.6s, with `ease`, `ease-out`,
  `ease-in-out`, and a fourth curve `cubic-bezier(0.2, 0.8, 0.2, 1)`. The tokens are not in `tokens.css`,
  `generated.ts`, the Tokens pages or Figma.
- The biggest UX gaps are on the most-used surfaces. **Popover, Menu, Select-style dropdowns** appear and
  vanish instantly. **Tooltip** fades in but has no exit. **Tabs** underline and **Segmented** selection jump
  with no slide. **Checkbox/Radio** have no motion at all.
- Several animations move layout properties: Sidebar `width` + `flex-basis`, Progress `width`, DatePicker
  `height`, Accordion `grid-template-rows`. The Sidebar one already causes a known QA-probe flake (BACKLOG P3).
- The recommendation is to consolidate first and add motion second. Promote 5 durations and 4 curves to real
  tokens and replace the raw values. Then add enter/exit to Popover, Menu and Tooltip, sliding indicators to
  Tabs and Segmented, and micro-motion to the choice controls. Springs, View Transitions and list motion stay
  P3 and opt-in.

## 1. What exists today

### 1.1 Foundation

| Item | Where | State |
|---|---|---|
| `--zen-motion-duration-fast/base/slow` = 120/200/280ms | `src/components/Motion/motion.css:4-6` | Code-only. Not in `tokens.css`, `generated.ts` or Figma (`tokens/source/figma.collections.json` has no motion collection) |
| `--zen-motion-ease-standard` `cubic-bezier(0.2, 0, 0, 1)` | motion.css:7 | Same as Material 3 "standard" |
| `--zen-motion-ease-emphasized` `cubic-bezier(0.16, 1, 0.3, 1)` | motion.css:8 | Strong decelerate, close to Fluent `decelerateMax` and M3 `emphasizedDecelerate` |
| `--zen-motion-ease-exit` `cubic-bezier(0.4, 0, 1, 1)` | motion.css:9 | Accelerate. Equal to M3 "legacy accelerate" |
| Keyframes `zen-motion-fade-in/out`, `zen-motion-scrim-in/out` | motion.css:11-15 | Scrims animate `background-color`, not `opacity` (correct: it does not fade the panel) |
| Reduced motion: all three durations become `0ms` | motion.css:16-18 | This only affects rules that use the tokens. Raw-value rules need their own `@media` blocks (they have them) |
| `usePresence(open, exitMs)` | `src/components/Motion/usePresence.ts` | Timer-based. Exit ms is hard-coded again in each consumer (Dialog 160, SidePanel 200/160, AppShell 200, BottomSheet 200). Reduced motion skips the wait |
| Loading of motion.css | Imported by usePresence, ToastStack, AppShell | Chat, AiChat, Chart, BottomNavigation and TopNavigation use the vars but rely on someone else loading the file. Their `var()` fallbacks differ (`ease`, `ease-out`, `ease-in`) |
| Guards | style-guard accepts the `--zen-motion-` namespace. usage-guard `motion/reduced-motion` (warn) | The usage-guard rule only checks `animation:`. It does not check `transition:`, and nothing flags raw durations or curves |

### 1.2 Per-component inventory

Legend: T = token, R = raw value. "RM" = has a `prefers-reduced-motion` block.

| Component | What animates | Duration / curve | T/R | Exit | RM |
|---|---|---|---|---|---|
| Dialog / ModalForm | scrim bg; panel opacity + translateY(12px) scale(.96) | in 280 emphasized; out **160** exit | in T, out R | yes (usePresence 160) | yes |
| SidePanel | scrim; slide; non-modal "nudge" | in 280 emphasized; out 200 exit; nudge-out **160** | mostly T | yes | yes (`!important`) |
| BottomSheet | scrim; translateY(100%); drag snap transform | in 280 / out 200; drag 200 standard | T | yes | yes |
| AppShell drawer | scrim; drawer in/out; content fade | in 280 / out 200; fade-out **160** | mostly T | yes | yes |
| Toast | row `grid-template-rows` 0fr→1fr + toast opacity/translate/scale | in 280 emphasized / out 200 exit | T | yes (row collapses) | yes |
| Tooltip (+ Sidebar flyout tooltip) | opacity | **.12s ease-out** | R | **none** | yes |
| Popover | nothing | — | — | **none** | — |
| Menu (dropdown, portalled) | nothing | — | — | **none** | — |
| Sidebar | collapse `width` + `flex-basis`; chevron transform; submenu in | **160 ease**; submenu **160 ease-out** | R | no | yes |
| TopNavigation | border, opacity, bg; folding search in | 120 standard; search-in 120 emphasized | T | via usePresence | yes |
| Accordion | chevron rotate; panel `grid-template-rows` 0fr→1fr; clip keyframe | **200 / 240 `cubic-bezier(0.2,0.8,0.2,1)`** | R | collapse = same transition | yes |
| DatePicker | viewport `height` (JS-measured) + view-in keyframe; rAF loop | **280 / 260 `cubic-bezier(0.2,0.8,0.2,1)`** | R | no | yes (CSS + JS) |
| Button | bg, border, shadow, color | **120 ease** | R | — | yes |
| Chip | bg, border, shadow | **120 ease** | R | — | **no** (colour only, so WCAG-safe) |
| Input | bg, border, shadow | **120 ease** | R | — | **no** (colour only) |
| Card (interactive), ListItem, Uploader, Slider thumb | bg / shadow | **120 ease** | R | — | yes |
| Toggle | track bg; dot transform + bg | **120 ease / 140 ease** | R | — | yes |
| Rating | color + transform | **100 ease** | R | — | yes |
| Progress | bar `width` | **.3s ease** | R | — | yes |
| Table | opacity | **120 ease** | R | — | yes |
| Chat / AiChat / ChatReply | composer transforms, hold menu, filter, fades; reply flash | 120/200/280 T; flash **1.6s** | mostly T | partly | yes |
| Skeleton | pulse | **1.6s ease-in-out infinite** | R | — | yes |
| Chart, BottomNavigation | bg / color | 120 standard | T | — | yes |
| Tabs, Segmented, Checkbox, RadioButton, Search, Stepper, Pagination, Tag, Badge, InlineMessage, AlertBanner | nothing | — | — | — | — |

### 1.3 Findings

1. **Two parallel systems.** Tokens are used by the newer overlay work (Sep 2026). The older control-level
   transitions still use `120ms ease`. Distinct durations in use: 100, 120, 140, 160, 200, 240, 260, 280,
   300ms and 1.6s. Distinct curves in use: 3 tokens plus `ease`, `ease-out`, `ease-in-out`, `ease-in` (as a
   fallback), and `cubic-bezier(0.2,0.8,0.2,1)`. Expand/collapse alone has 4 timings (Accordion 240,
   DatePicker 260/280, Sidebar 160, Toast 280/200).
2. **Exit timing is inconsistent.** Dialog exits in 160ms, BottomSheet and SidePanel in 200ms, and the AppShell
   content fade in 160ms. 160 is not a token, and each value also lives in a TS timer, so a token change would
   silently desync the unmount timer.
3. **Missing enter/exit on the most frequent overlays.** Popover, Menu and dropdowns (Input/Search/Select
   options) pop with no transition. Tooltip has an enter fade only. This is the most visible gap compared with
   Radix/shadcn, Fluent and Material, which all animate menus.
4. **No indicator motion.** Tabs draws the underline as a per-tab `::after` (`tabs.css:57`) and Segmented paints
   the selected item's background (`segmented.css:13`). The selection jumps, so the eye loses the "from → to"
   cue that a sliding indicator gives.
5. **Layout-property animation.** Sidebar animates `width` and `flex-basis` over 160ms. This reflows the whole
   page each frame and is the documented cause of the behaviour-probe misclick (BACKLOG "Behaviour probe clicks
   during a layout transition"). Progress animates `width`, and DatePicker animates `height` from JS. Accordion
   and Toast use `grid-template-rows` 0fr→1fr. That is the accepted cross-browser technique, but it is still
   layout work.
6. **Reduced motion means "no motion at all".** Tokens drop to `0ms`, and most files set `animation: none`.
   WCAG 2.3.3 targets *motion* (movement, scaling). Opacity and colour are explicitly outside it, so Zen
   removes more than it has to and loses useful feedback (for example, overlays cut in and out instantly).
7. **The guard covers half the risk.** `motion/reduced-motion` only matches `animation:`. A new
   `transition: transform …` with no RM block would pass. Chip and Input have no RM block, which is fine because
   they are colour-only, but nothing distinguishes the two cases.
8. **Good patterns worth keeping.** These are the scrim-as-background keyframes, the emphasized-in /
   accelerate-out split, the Toast row collapse that lets neighbours slide up, the Accordion clip released after
   opening (focus rings are not cut), and the JS-side RM checks in DatePicker, ChatReply and TopNavigation.

## 2. External references (checked 2026-10-01)

| System | Durations | Curves | Take-away for Zen | Source |
|---|---|---|---|---|
| Material 3 | short1–4 = 50/100/150/200; medium1–4 = 250/300/350/400; long1–4 = 450–600; extra-long 700–1000ms | standard `(0.2,0,0,1)`; standard decel `(0,0,0,1)`; standard accel `(0.3,0,1,1)`; emphasized decel `(0.05,0.7,0.1,1)`; emphasized accel `(0.3,0,0.8,0.15)` | Zen's standard already matches M3. Exits shorter than enters. M3 Expressive moved to spring "motion schemes" (not verified: m3.material.io did not render) | [androidx MotionTokens.kt](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/MotionTokens.kt) |
| IBM Carbon | fast-01 70 (button/toggle), fast-02 110 (fades), moderate-01 150, moderate-02 240 (expansion), slow-01 400, slow-02 700 (dimming) | productive: standard `(0.2,0,0.38,0.9)`, entrance `(0,0,0.38,0.9)`, exit `(0.2,0,1,0.9)`; expressive: `(0.4,0.14,0.3,1)` / `(0,0,0.3,1)` / `(0.4,0.14,1,1)` | Two moods: **productive** for routine UI (Zen's dashboards) and **expressive** only for big moments | [carbondesignsystem.com/elements/motion](https://carbondesignsystem.com/elements/motion/overview/) |
| Fluent 2 | 50/100/150/200/250/300/400/500 (ultraFast…ultraSlow) | decelerateMax `(0.1,0.9,0.2,1)`, decelerateMid `(0,0,0,1)`, accelerateMid `(1,0,1,1)`, easyEase `(0.33,0,0.67,1)` and more | Principles: functional, natural, consistent, appealing. Requires a no-motion alternative | [fluent2 motion](https://fluent2.microsoft.design/motion), [durations.ts](https://raw.githubusercontent.com/microsoft/fluentui/master/packages/tokens/src/global/durations.ts), [curves.ts](https://raw.githubusercontent.com/microsoft/fluentui/master/packages/tokens/src/global/curves.ts) |
| Shopify Polaris | 0–500 in 50ms steps, plus 5000 | ease `(0.25,0.1,0.25,1)`, ease-in `(0.42,0,1,1)`, ease-out `(0.19,0.91,0.38,1)`, ease-in-out, linear | Ships **keyframe tokens** (fade-in, appear-above/below, pulse, spin). Zen's `zen-motion-*` keyframes are the same idea | [polaris motion.ts](https://raw.githubusercontent.com/Shopify/polaris/main/polaris-tokens/src/themes/base/motion.ts) |
| Apple HIG / SwiftUI | Springs, not durations: `.smooth` (bounce 0), `.snappy` (~0.15), `.bouncy` (~0.3), ~0.5s perceptual duration | Spring physics | Springs make interruptible motion (toggle thumb, indicators) feel natural (not verified: from prior knowledge) | — |
| Radix / shadcn | — | — | `data-state="open|closed"` plus a Presence wrapper that keeps the node mounted until `animationend`. Zen's usePresence is the same pattern, but timer-driven (not verified: from prior knowledge) | — |

**Web platform options**

| Feature | What it gives Zen | Support |
|---|---|---|
| `@starting-style` + `transition-behavior: allow-discrete` on `display`/`overlay` | CSS-only enter *and* exit for native `[popover]`/`<dialog>`, no presence hook | Baseline "newly available" Aug 2024 ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style)). Support for the `overlay` property outside Chromium is not verified. Only useful if Zen moves overlays to native popover/dialog. They are portalled React nodes today |
| `interpolate-size: allow-keywords` / `calc-size()` | Animate `height: auto` directly | **Chromium only**, "Limited availability" per [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size). Progressive enhancement only, so keep the `grid-template-rows` technique |
| View Transitions (same-document) | Crossfade or morph between DOM states: tab content, list reorder, card → panel "container transform", platform page navigation | Supported in Chrome and Safari per [MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API). Firefox status was not shown on the fetched page (not verified) |
| `linear()` easing | Spring-like curves in plain CSS | Shipped in all three engines in 2023 (not verified on this pass). Generate the points with a tool; never hand-write them |
| WCAG 2.3.3 Animation from Interactions (AAA) | Motion triggered by interaction must be disableable unless essential. **Colour, blur and opacity changes are not "motion"**. Technique C39 = `prefers-reduced-motion` | [W3C Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) |

## 3. Recommendations

### 3.1 Proposed motion token set

Keep the existing names (they are already shipped and used in about 40 places) and extend them. Do not rename
to `--zen-motion-easing-*`.

| Token | Value | Use |
|---|---|---|
| `--zen-motion-duration-xfast` (new) | `80ms` | Press/release, checkmark/dot, tooltip exit, small overlay exit |
| `--zen-motion-duration-fast` | `120ms` | Hover/colour/opacity state changes, tooltip enter, focus-adjacent fades |
| `--zen-motion-duration-base` | `200ms` | Small movement: indicators, toggle thumb, chevrons, popover/menu enter, large-overlay exit |
| `--zen-motion-duration-slow` | `280ms` | Large enter: dialog, sheets, side panel, drawer, toast, accordion expand |
| `--zen-motion-duration-xslow` (new, P3) | `400ms` | View transitions / container transform only |
| `--zen-motion-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | On-screen movement and state changes (replaces `ease`) |
| `--zen-motion-ease-emphasized` | `cubic-bezier(0.16, 1, 0.3, 1)` | Things entering the screen |
| `--zen-motion-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Things leaving the screen |
| `--zen-motion-ease-linear` (new) | `linear` | Progress, loops, opacity-only crossfades |
| `--zen-motion-ease-spring` (new, P3, optional) | `linear(…)` generated from a spring with bounce ≈ 0.1–0.15 and ≤ 3% overshoot | Toggle thumb, Tabs/Segmented indicator, press release |

Rules to write into the guideline:

- **Exit = one step shorter than enter**: slow → base, base → fast, fast → xfast.
- Productive by default. Emphasized or spring only for entering surfaces and the thumb/indicator.
- Animate only `transform`, `opacity`, `background-color`, `color`, `border-color`, `box-shadow`. Use
  `grid-template-rows` for expand/collapse. Do not animate `width`, `height`, `top`/`left` or `margin`.
- Loops (Skeleton pulse 1.6s, ChatReply flash 1.6s) stay as named component constants on the allowlist. They are
  not part of the scale.

**Reduced-motion mapping (proposed).** Instead of zeroing everything, drive keyframe distances from custom
properties and neutralise only movement:

- `--zen-motion-distance` (for example 12px) → `0`, and `--zen-motion-scale-from` (.96) → `1`.
- Overlay enter/exit becomes an opacity crossfade at `fast`.
- Indicators jump, with the colour fading at `fast`. Accordion opens instantly and the content fades in.
- Skeleton pulse and flashes stay off. Colour transitions stay on.

This matches WCAG 2.3.3, which excludes opacity and colour, and Fluent's "no-motion alternative". It needs
`usePresence` to stop relying on "RM ⇒ unmount now" (see P2-4).

### 3.2 P1: consolidate (low risk, mostly mechanical)

| # | Change | Components | Effect | Risk | Effort |
|---|---|---|---|---|---|
| P1-1 | Move motion tokens from `Motion/motion.css` into the token pipeline: a code-owned source such as `tokens/source/motion.json` → `tokens.css` + `generated.ts` + a "Motion" Tokens page. Add `xfast` and `linear`. Keep the RM override in `tokens.css` | foundation | Tokens are always loaded (fixes the Chat/Chart/BottomNav fallback drift), documented and discoverable by AI/MCP | Low. Token-build change (see memory "token sync gotchas") | S–M |
| P1-2 | Replace the 18 raw `transition` and ~9 raw `animation` values with tokens. `120ms ease` → `fast standard`; Toggle 140 → `base standard`; Rating 100 → `fast`; Tooltip `.12s ease-out` → `fast standard`; Accordion 200/240 + DatePicker 260/280 `cubic-bezier(.2,.8,.2,1)` → expand `slow standard`, collapse `base exit`; Progress `.3s ease` → `slow standard`; Sidebar 160 → `base standard`; Dialog/SidePanel/AppShell 160ms exits → `base` (big surfaces) per the exit rule | Button, Chip, Input, Card, ListItem, Uploader, Slider, Toggle, Rating, Tooltip, Sidebar, Accordion, DatePicker, Progress, Table, Dialog, SidePanel, AppShell | One rhythm across the DS. Visually near-identical (deltas ≤ 40ms, `ease` vs standard) | Low. Visual-diff baselines barely change because screenshots are static | S |
| P1-3 | Add **enter/exit to Popover, Menu and dropdown surfaces** with the existing pattern: `usePresence` + `data-state`. Enter `base emphasized` = opacity 0→1 + `translateY(∓4px)` + `scale(.98)`, with `transform-origin` on the anchor side. Exit `fast exit` = opacity only. Pointer events off while closing | Popover, Menu, Input/Search option lists, DatePicker popover, ColorSelector | Largest perceived-quality gain. Matches Radix/Fluent/M3 | Medium. Exclusive-popover logic (`useExclusivePopover`) and focus return must wait for, or ignore, the closing phase | M |
| P1-4 | Tooltip exit: `xfast` opacity. Keep the 1s show delay (memory rule) and make hide immediate on Esc | Tooltip, useIconTooltip, Sidebar flyout | Removes the hard cut | Low | S |
| P1-5 | Guards: (a) `motion/raw-duration` and `motion/raw-easing` (warn) for `transition`/`animation` in `src/components` not using `--zen-motion-*`, with an allowlist for loops; (b) extend `motion/reduced-motion` to `transition:` that includes `transform`/`translate`/`scale`/`rotate`/size properties; (c) `motion/layout-property` (warn) for transitions on `width|height|top|left|margin|flex-basis` | usage-guard + guideline doc | Keeps P1-2 from regressing. Fits the "every component ships rules" definition of done | Low | S |

### 3.3 P2: upgrade interactions

| # | Change | Components | Pattern | Risk | Effort |
|---|---|---|---|---|---|
| P2-1 | **Sliding Tabs indicator** | Tabs (`indicator` variant) | One `.zen-tabs__indicator` element. Tabs.tsx measures the selected tab (offsetLeft/width, ResizeObserver) into `--zen-tabs-indicator-x/-w`. Transition `transform` (translateX) and `width` (a 2px bar, negligible cost) at `base standard`. Keep the per-tab `::after` as the SSR/first-paint and RM fallback | Low–Medium. Overflow-scrolling tabs, RTL, density changes | M |
| P2-2 | **Sliding Segmented thumb** | Segmented | Same measure approach. The thumb sits under the labels, and the label colour swaps at `fast`. Primary uses a solid #111 thumb with inverted text, so the text colour must switch mid-slide or at the end | Medium. Needs a design decision on mid-slide text colour | M |
| P2-3 | **Choice-control micro-motion** | Checkbox, RadioButton, Toggle | Checkbox: check icon `scale(.6)→1` + opacity at `xfast standard` (or stroke-draw if the icon is a path). Radio: dot scale 0→1. Toggle: thumb `translate` at `base` (spring in P3) | Low | S |
| P2-4 | **usePresence driven by `animationend`** with a safety timeout read from `getComputedStyle(el).animationDuration`. Remove the hard-coded 160/200 in TSX | Dialog, SidePanel, BottomSheet, AppShell, TopNavigation, plus P1-3 consumers | One source of truth for timing. Enables the softer RM mapping (crossfade instead of unmount) | Medium. Needs tests for nested animations bubbling `animationend` (filter on `event.target === node`) | S–M |
| P2-5 | **Sidebar collapse without width animation** | Sidebar / AppShell | Option A: keep `width` but use `base` and an `inert`/settled flag that the probe waits on. Option B: animate the rail with `transform` + `clip-path` and switch the content column once at the end. Option C: View Transition on collapse (P3) | Medium–High. Layout-wide | M |
| P2-6 | **Press feedback** (optional) | IconButton, DockIcon, interactive Card, Chip | `:active` → `scale(.97)` at `xfast`, release at `base` (spring later). No scale on text Buttons in dense toolbars | Low technically. **Design decision** | S |
| P2-7 | **Accordion polish** | Accordion | Keep `grid-template-rows` (cross-browser). Add content opacity 0→1 at `fast`, delayed ~40ms on expand. Optionally `@supports (interpolate-size: allow-keywords)` for `height:auto` in Chromium. Not required | Low | S |
| P2-8 | **Progress without width** | Progress | `transform: scaleX()` with `transform-origin: left` (`right` in RTL), or keep `width` (cheap) and just tokenize | Low | S |

### 3.4 P3: expressive and opt-in

| # | Change | Notes |
|---|---|---|
| P3-1 | **Spring curve token** via `linear()` for Toggle thumb, indicators and press release | Generate with a spring tool (bounce ≈ 0.1–0.15). Never hand-type. Keep the duration token, because `linear()` needs one |
| P3-2 | **List item add/remove** | Generalise the Toast row technique into shared keyframes `zen-motion-collapse-in/out` (grid-rows 0fr↔1fr + fade) plus usePresence for rows. Use in Table rows, ListItem, Uploader file list, Chat messages |
| P3-3 | **Toast stacking upgrade** | Today each toast is a full row. Options: Sonner-style collapsed deck that expands on hover/focus, swipe-to-dismiss on touch. **Design decision** |
| P3-4 | **View Transitions** for platform page navigation, Tabs panel content crossfade, card → SidePanel "container transform" (M3/Fluent pattern) | Behind a feature check (`document.startViewTransition`). Platform first, components later. Uses `xslow` |
| P3-5 | **Native popover/dialog + `@starting-style`** | Only if overlays move off React portals to `popover`/`<dialog>` (top layer, light-dismiss for free). Larger refactor; out of scope for motion alone |

### 3.5 Figma counterpart

- Figma variables can hold **durations** as FLOAT numbers. A "Motion" collection with one mode
  (`duration/xfast` … `duration/xslow` = 80 … 400) can mirror the code tokens and be scoped to nothing (or
  documentation only).
- **Easing curves cannot be variables.** Document them on a Figma "Foundations / Motion" page with three
  things: (a) a table of name → `cubic-bezier(...)` → usage; (b) a small prototype per curve, using
  Smart Animate with "Custom bezier" set to the same four numbers so designers can feel it; (c) a note that code
  is the source of truth.
- If the file uses Figma's newer animation/timeline features, check whether named animation styles can carry a
  curve. That would be the closest equivalent (not verified).
- In the repo, motion is **code-owned** like the platform tokens: the token build merges it, and the
  Figma-to-code sync must not delete it.

### 3.6 Suggested order (once approved)

P1-1 → P1-2 → P1-5 → P1-3/P1-4 → P2-4 → P2-1/P2-2/P2-3 → the rest. Per the proportional-process rule,
P1-1/P1-2 are a token-level change plus a mechanical sweep with the `qa --files=` fast path. P1-3 and the P2
items are component changes that need the full build-QA gate, guideline DO/DON'T updates and a Figma note.

## 4. Decisions for the user

1. **Reduced motion:** keep today's "everything off", or switch to "movement off, crossfade and colour stay" (the
   WCAG-aligned option)?
2. **Token naming and ownership:** extend `--zen-motion-duration-*` / `--zen-motion-ease-*` (recommended), and
   accept a code-owned `tokens/source/motion.json` plus a FLOAT "Motion" collection in Figma for durations?
3. **Personality:** productive-only (no overshoot anywhere), or allow a subtle spring (≤ 3% overshoot) on
   Toggle, Tabs and Segmented indicators?
4. **Press feedback:** add `scale(.97)` on press for IconButton/DockIcon/Card/Chip, or stay colour-only like
   Material state layers?
5. **Segmented Primary thumb:** when the dark thumb slides, should the label colour invert at the midpoint or at
   the end?
6. **Scope:** approve P1 as one batch (consolidation + Popover/Menu/Tooltip enter-exit + guards) before any P2
   work? It goes into BACKLOG until approved, per the scope-lock rule.

## 5. Not checked

- Atlassian and GitHub Primer motion docs, Radix Presence source, Apple HIG motion page and SwiftUI spring
  values. The rows for these are from prior knowledge and marked "not verified".
- The m3.material.io motion pages did not render; M3 values come from the androidx token source. M3 Expressive
  spring "motion schemes" are not verified.
- Exact browser versions for View Transitions (Firefox), `linear()`, and the `overlay` property. Re-check MDN
  compat tables before relying on them.
- Whether `dist` ships one combined CSS file or per-component CSS. This decides how real the motion.css loading
  risk in 1.1 is for consumers.
- JS-driven motion beyond grep hits: DatePicker rAF loop internals, BottomSheet drag physics, Chat scroll
  behaviour, and `scroll-behavior: smooth` usage.
- Platform (`src/platform`) motion beyond the 3 RM blocks seen. Templates. Figma prototypes (no Figma calls were
  made).
- Runtime behaviour: nothing was run in a browser. Durations and curves come from source only.
