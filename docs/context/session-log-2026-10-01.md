# Session log — 2026-10-01

## Motion research, Top Navigation gradients, Liquid Glass, AiChatField (session "Add audit check for text overflowing its box", tier S)

User: "1. Nghiên cứu nâng cấp các transition interaction cho các component. 2. Kiểm tra lại gradient của các Top
Navigation trên mobile đúng với design chưa. 3. Hiệu ứng liquid Glass chưa chạy đúng. 4. Update AI chat field … cho
touch/click vào cả khung để type". Ownership checked first: "Component library review và fixes" owns the TopNavigation
scroll fold (kept intact) and one ai-chat.css rule (kept); "Disable input và search từ Figma" is rebuilding the example
pages and asked for a one-line notice when this lands.

1. **Motion research** (one agent, read-only): `docs/context/motion-transitions-review-2026-10-01.md`. Motion tokens exist
   only in `Motion/motion.css`; about half the transitions use raw values; Popover/Menu/Tooltip exits and the Tabs/Segmented
   indicator have no motion. P1–P3 proposal and 6 decisions for the user. Nothing implemented.
2. **Top Navigation gradients** (live Figma 12014:45167, 10 types): stops, direction and progressive blur (10 → 5px, 20 →
   10px) matched; the gradient paint opacity 0.8 was missing. Fixed with `color-mix(… 80%, transparent)` on the opaque stop
   (overlays black 40%, Compact-Overlay 48%).
3. **Liquid Glass**: the docs' phone frame put `clip-path` on its header and footer, which makes them backdrop roots in
   Chromium, so the glass and the progressive blur sampled nothing (shown by screenshots with and without it). Removed;
   the blur layers already round their own corners (corners checked in a headless shot). Glass then matched to the Figma
   effect styles: Liquid-Glass/Normal (GLASS frost 4, light −45°/0.8, shadow 0 4 24 −8) → blur 2px + a light rim + its
   shadow (TopNavigation glass actions incl. glass-dark, which had no shadow; AiChatField Liquid Glass, was 24px);
   Glass-Floating (frost 8) → blur 4px (Bottom Navigation pill and action, was 8px + saturate 1.4). Refraction, depth and
   dispersion have no CSS equivalent (an SVG displacement filter would work in Chromium only): left as a decision.
4. **AiChatField** (Figma 12074:16888, 12 variants): layout, paddings, text styles and the Long-Typing layout already
   matched. New: the form is the hit area (mousedown keeps the caret, click focuses the prompt with the caret at the end;
   buttons keep their action); `cursor: text`. Probe: a click or tap on the padding focuses the textarea, a click on + is
   the button. Kept on purpose: the 1px focus ring that replaces the textarea's removed outline (Figma Focused shows only
   the caret). Liquid Glass now keeps its glass shadow when focused.
   Follow-up ("cập nhật vùng bấm của chọn model"): the live Figma AI Model is a 36px pill (Button/Spacing/Small 8/8,
   Corner-Radius/Action/Small, Neutral/Flat); code had the bare label (padding 0, comment from the older capture), so a
   press beside it typed into the prompt. Now 133×36 like Figma; a click in its padding opens the model button.

## Topbar Typography chip did nothing in narrow windows (session "Zen Plugin Neutral color contrast", tier XS)
- Bug: below 1024px `.official-topbar__controls` was `overflow-x: auto` (so overflow-y auto too); every chip's Popover
  renders inline and was clipped by that one-row scroll box. The chip opened (chevron up) but its menu was invisible.
  Seen in the app's 367px browser pane; at 1512 the chip works, and a sweep of all 45 component pages showed previews
  follow it (only phone frames stay Mobile, by design).
- Fix (`platform.css`, ≤1024px): the trailing group is `display: contents`; the light/dark toggle stays on the
  breadcrumb row and the controls take a full-width wrapping row. Checked at 367/800/1024/1512: menu visible, Mobile
  applied (button label 14→16px); 800 and 1024 keep one chip row; pages without chips unchanged (72px bar).
- QA: `npm run qa` ✓. With `--pages=button,typography`: 3 ✗ APG dialog-focus errors at button@1512 in other sessions'
  examples (Page actions, Delete a file), under concurrent HMR reloads: not this change (≤1024px CSS); in BACKLOG.
- Backup: `Zen-CodeBase/backups/zen-ds-before-topbar-chip-wrap-20261001-152248.tar.gz`.

## Mobile behaviour, Top Navigation rules, UX interaction pass (session "Component library review và fixes", tier M)

- **User asks (2026-10-01):**
  - Make the mobile examples behave the same way, after a deep study of Top Navigation on phones.
  - Use longer lists on phones.
  - Tabs, Segmented and Chip default to medium.
  - Re-check the UX interactions.
  - Later: "Xử luôn G1 và G2".
- **Research:** `docs/research/top-navigation-mobile-rules-2026-10-01.md`.
  - Contents: a decision table, rules R1–R18, a length rule (≥ 1.5× the phone's height, about 14 rows) and an audit
    of all 77 phones.
  - Only 3 phones folded and only 9 of 43 lists could scroll.
  - The examples session took R1–R18 into its brief §5b and is applying them to its rows.
- **Component fixes:**
  - **G1 (P1):** a TopNavigation fold that unmounts and remounts is measured again. The fold node is state, so
    `useScrollFold` re-runs. Test: `tests/interaction/navigation.test.tsx`, which fails on the old code.
  - **G2:** PlatformPhone sets `scroll-padding-top` = header − fold (`--platform-phone-header-pinned`). Probe: a focused
    row ended at −10..50px under the bar before, and at 267px after. A guideline a11y line tells apps to do the same.
  - **Chip** defaults to md.
- **Playgrounds** (`PlatformMobilePlaygrounds.tsx`):
  - Search filters, with an Empty State and Clear search.
  - The Search action scrolls up and focuses the field.
  - Sort orders the list.
  - Bottom Navigation tabs are roots with a large title, and a re-tap scrolls to the top.
  - The Bottom Sheet backdrop is a Projects root.
  - The Chart range switch shows only on the line chart.
- **Phone examples:**
  - Typography › Master screen uses `scrollRef`.
  - Typography › Child screen and Text › Mobile typography get a real 14-order root, shared data in
    `src/platform/phoneOrders.ts`.
- **Templates and App layer:** 4 agents ran the UX pass on 15 templates and the App layer pages; see CHANGELOG
  "UX interaction pass". HrShell's Zen AI "+" and microphone now work.
- **Backlog** (new group "From the UX interaction pass…"):
  - P1: Escape in a ModalForm closes the form over an open Select or DatePicker.
  - Decisions under Open items: PlatformPhone breakpoint tokens, G4, G6.
- **Gate:** see the final run in HANDOFF. Backups: `backups/mobile-playgrounds-ux-20261001-1520.tar.gz`,
  `backups/g1-g2-topnav-phone-20261001-1710.tar.gz`, `backups/hrshell-ai-field-20261001-1915.tar.gz`.

## Decisions applied: EmptyState compactTitle and motion P1 (session "Add audit check for text overflowing its box", tier L)

User: "Làm như các khuyến nghị trước" (1A–5A, P1 as one batch, no refraction filter, EmptyState option A, commit once at
the end: "đợi xong hết commit 1 lần", so the two earlier local commits were undone with a mixed reset, tree untouched).
Peers asked first: "Component library review và fixes" and "Disable input và search từ Figma" freed every file touched.

- **EmptyState `compactTitle`** (8A): Body/Extra/Bold title for a Card you title yourself; guideline api/a11y rows, an
  `InTitledCard` story, docs regenerated.
- **P1-1 tokens:** `tokens/source/motion.json` (code-owned) → `build-tokens.mjs` writes a Motion `:root` block (+ xfast
  80ms, linear, `--zen-motion-movement` 1 → 0 under reduced motion) into tokens.css and `motionTokens`/`motionRules` into
  generated.ts; kept out of the Figma catalog so counts, native packages and coverage stay as they were. Design Tokens
  page: a Motion section. Figma: documentation-only FLOAT collection Motion (VariableCollectionId:14726:3, 4 durations,
  no scopes, descriptions carry the curves).
- **P1-2 sweep:** 60 exact replacements in 22 component CSS files (26 raw values; loops kept); reduced-motion blocks
  moved from "everything off" to 1A (moving keyframes scaled by the movement factor, slides crossfade, colour fades
  stay). Exits one step shorter, timers aligned: Dialog 200 (was 160), standard SidePanel 120. usePresence keeps
  unmounting at once under reduced motion (the behaviour probes rely on it; an animationend exit is P2).
- **P1-3/4:** every floating `.zen-popover` fades in (4px slide from the anchor, 2% scale, Base Emphasized); Popover and
  Menu keep the surface for a Fast exit (inert meanwhile), which covers every Popover consumer. Tooltip and
  useIconTooltip fade out at XFast; Escape still hides at once.
- **P1-5 rules:** `motion/token-only`, `motion/no-layout-animation`, extended `motion/reduced-motion` (+ fixtures,
  selftest 156 rules); 4 deliberate exceptions carry `zen-allow-*`; 0 motion warnings in components and platform.
  audit.mjs / behaviour.mjs inject a freeze stylesheet, since reduced motion no longer zeroes durations.
- **Later the same night (session "Component library review và fixes"):**
  - `.platform-phone` got the mobile breakpoint tokens: the user approved it in the examples session, and that session
    made the change. My phones went back to the default inset. Measured: title, kicker and rows all at 20px.
  - The stage-list rule in platform.css now skips lists inside phones, screen cards and painted Boxes. This fixed 25
    edge errors.
  - App Shell `Frame` wraps its app in ZenProvider `breakpoint="auto"`, so HR pages at 390 use their phone layouts.
  - Typography dates now read "Oct 14 – Oct 16, 2026".
  - Gate 23 (`.qa/reports/2026-10-01T17-31-26-a36170e7.md`): every static check and all 15 Vitest suites pass.
    Two audit findings and four layout dialog APG findings remain. Each one was re-checked clean on a fresh load and
    sits in the examples session's live edits (HMR) or the intermittent HR Home smoke run (Backlog P3).
