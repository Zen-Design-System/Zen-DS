# Session log — 2026-09-28 · Build → QA → Deliver gate

Session "Quy trình kiểm tra Component build". The user asked for a process that guarantees spacing (gap, padding),
corner radius, tokens (right rule, right role), style and typography whenever a component, playground or example is
built, with QA always run after building and before delivering; then added that it must notice problems *while
building* — typography and content hierarchy, whether the component works, whether the UX is good enough. They chose
to enable both hooks.

## What exists now

| Piece | Where | What it does |
| --- | --- | --- |
| Style guard | `tools/style-guard/check-styles.mjs` (+ `selftest.mjs`, fixtures, `baseline.json`) | 15 token rules on CSS and TSX inline styles: `spacing/token`, `spacing/role`, `radius/token`, `radius/role`, `type/token`, `type/mixed-style` (validated against the real text-style token sets, so Body/Code passes), `type/token-role`, `type/derived`, `type/visual-heading`, `type/raw-heading`, `color/token` (platform CSS + inline; components stay with usage-guard), `color/role`, `color/role-fill`, `shadow/token`, `size/slot-token`. Suggests the token for each raw value. Whole repo in 0.25 s. |
| Runtime quality checks | `tools/platform-audit/quality-checks.mjs`, wired into `audit.mjs` behind `--quality` / `--density` | `scale` (text not matching any Zen text style; example markup off the spacing/radius/colour tokens of the current modes), `roles`, `hierarchy` (h1 ≠ Heading/1, heading smaller than body, overlay title not h2), `rhythm` (flat title/description, title not Strongest, visual headings, > 7 text styles, non-concentric corners, double inset), `density` (Compact vs Comfortable: content outgrowing Zen boxes, new overflow/size/edge errors). Also run in the playground sweep and on overlays opened by `--smoke`. Baseline `tools/platform-audit/quality-baseline.json`. |
| Behaviour probes | `tools/platform-audit/behaviour.mjs` (built by a subagent), `npm run platform:behaviour` | Focus ring, keyboard reach, pointer-only clickables, APG keys (tabs, menu button, dialog trap/Escape/focus return, slider, switch, disclosure, combobox), dead clicks, hover feedback. Baseline `behaviour-baseline.json`. |
| Gate | `tools/qa/run.mjs` (`npm run qa`, `qa:quick`), `tools/qa/lib.mjs` | Scope from the session ledger (or `--pages`, `--files`, `--since`, `--all`); file → page mapping (component folder, example map key / enclosing example function, playground branch, `pe-*` class users, app-layer `pages` map; core components add a representative page set). Steps: static · runtime (1512+390, smoke, quality, density; dark) · behaviour · coverage matrix · contact sheets. Report `.qa/reports/*.md` with a Vietnamese delivery summary. |
| Hooks | `Zen-CodeBase/.claude/settings.json` → `tools/qa/hooks/post-edit.mjs`, `stop-gate.mjs` | PostToolUse (Edit/Write/Bash): record the file + pages in `.qa/sessions/<session>.json`, brief the spec on the first touch of a component (Figma node, guideline, harness rules), lint the file with style-guard + usage-guard and block on new errors. Bash edits count only for changed files the command names. Stop: hold the turn until a full passing run after the last edit and its contact sheets were Read; a second stop with no change ends the turn with a note to the user (no loops). |
| Process | `skills/zen-build-qa/SKILL.md`, `docs/qa/build-qa-process.md` (Vietnamese), `Zen-CodeBase/.claude/skills/zen-build-qa`, `Zen-CodeBase/.claude/agents/zen-ux-reviewer.md` | Spec card → build → gate → UX rubric on screenshots (+ fresh-eyes reviewer agent for new components) → deliver with the summary. |

Also: `audit.mjs` now re-audits a page when an HMR reload from another session destroys the page mid-check (it
crashed a full run); `npm test` runs in the gate when components changed; AGENTS.md section C, HANDOFF "Gates",
CHANGELOG 0.4.0 › Quality, pointers in `skills/zen-platform-qa` and `skills/zen-component-usage`.

## Verification

- `npm run style:selftest` ✓ (15 rules, bad/good fixtures); style-guard baseline 389 findings in 32 files.
- Hook pipe tests: non-UI file ignored; clean edit → context only; violating edit → block with token suggestions;
  Bash edit naming the file recorded, unnamed changed file ignored; Stop: dirty → block, repeat → user note, notified →
  silent, passed but sheets unseen → block, sheets Read → allowed. Live-fire sentinel confirmed the hook runs in
  sessions (removed afterwards).
- First real run (`npm run qa -- --pages=card`, 20 s): caught `.pe-plan__price { gap: 6px }` and three plan names
  styled Subheading without being headings (Pricing plans). Trial runs on 16 pages found Top Navigation example text
  at 16/normal (`.pe-text`), bulk-action text tracking off Body/Extra, Sidebar demo titles that are not headings,
  Sidebar list rows and Metric outgrowing their boxes at Comfortable.
- A peer ran `npm run qa -- --all` and fixed the errors on 23 pages; another peer's run of `platform:behaviour` found a
  real Dialog focus bug (fixed on `feat/vibe-ready`) and a NumberField stepper false positive (sent back to the
  behaviour author: steppers next to a spinbutton are exempt per APG).
- Dogfood: Pricing plans plan names `<Text textStyle="Heading/Subheading" as="strong">` → `<Heading level={3}>` (card
  titles are h3 Subheading); the live hook recorded the edit, `npm run qa` passed (card: runtime 0/0, dark 0/0,
  behaviour clean), both contact sheets reviewed. The 390 sheet showed the sticky platform topbar stamped over a tall
  card, so `shoot.mjs` now pins `.official-topbar/.official-sidebar/.platform-toc` while shooting.
- Final full gate on button + dialog: PASS in 82 s with every step (static, runtime 1512+390+dark, behaviour, coverage,
  4 sheets).

## Baselines at the end of the day

| Baseline | Findings | Notes |
| --- | --- | --- |
| `tools/style-guard/baseline.json` | 376 in 32 files (from 389; peers fixed 12, the dogfood 1) | platform.css ~180, Chat ~65 |
| `tools/platform-audit/quality-baseline.json` | 52 (50 rhythm warnings, 2 accepted `scale`: Sidebar small-density "Kaiz" 10/13.3 = Figma's 5/6) | peers fixed the errors on 23 pages with `qa --all` |
| `tools/platform-audit/behaviour-baseline.json` | 127 on 37 pages: 98 deadclick (warn), 26 focus, 3 apg | 6 hand-verified real bugs → follow-up task |

Behaviour probes, real bugs still open (hand-verified by the author): Popover selected option has no visible focus;
SidePanel "Docked inspector" Width NumberField locked (`onValueChange={() => undefined}`); DatePicker "Birthday"
month nav dead (controlled `month`, no handler); inputs in an error state lose their focus ring (dialog, form, input,
inline-message, templates); Chat desktop: Escape from React/More returns focus to the bubble, not the trigger;
Button "Confirm a destructive action" Cancel and Toast "Dismiss" do nothing. Fixed by peers during the runs: Dialog
focusing a disabled primary, AppShell drawer without a Tab trap, Chat `aria-haspopup="menu"` opening a dialog/listbox,
Reactions sheet without a Tab trap, listbox triggers whose ArrowDown jumped to the page TOC.

Bash edits: when the Bash result carries no `changedFiles` (it depends on the permission mode), the hook now records
UI files the command names and that changed in the last two minutes, if the command writes (`sed -i`, `open(…,'w')`,
`writeFile`, `>`, `cp`, `mv`, `git apply|checkout|restore`…). `--files=` / `--since=` remain the fallback.

## Open items

- Burn down the baselines page by page; `--baseline-update` after each fix (two follow-up tasks were offered to the
  user: the 6 behaviour bugs, and the style-guard debt).
- `quality-checks` MODE selector: after the `data-tone` rename (feat/vibe-ready) only real mode scopes match.
- Consider making `--quality` default in `platform:audit` now that the quality baseline is small (52, all warnings but
  2 accepted items).

## HeadingField: single-line and multiline variants (session "Figma contract button suites")
- User asked for both variants, chosen per case. `HeadingField` gains `multiline` (default `false`) and
  `onValueChange(value)`. Figma: Input/Heading 694:13062 Status=Inputted-Multi-Line (Container FILL/HUG, text wraps
  at the root width).
- `multiline` renders `<textarea rows=1>` with the same `.zen-heading-field__native` class (Heading/1–3, the −8px
  Spacing/Padding/XSmall pad, Corner-Radius/Base, Neutral/Subtle hover/focus). The height is set to `scrollHeight` on
  every value, size, status and width change (ResizeObserver) and after `document.fonts.ready`. Enter never adds a line
  break (consumer `onKeyDown` runs first; IME composition keeps its Enter). Pasted line breaks become spaces
  (execCommand insertText, setRangeText fallback).
- Types: `HeadingFieldProps` is a union — `{ multiline?: false } & <input> attributes | { multiline: true } &
  <textarea> attributes`; the ref is `HTMLInputElement | HTMLTextAreaElement`. A boolean `multiline` still type-checks
  (discriminant decomposition), so pass `onValueChange` rather than element-specific `onChange` when it is dynamic.
  Props are destructured in the parameter so react-docgen keeps the defaults.
- Platform: the Input playground's heading type now shows Heading Size (H1–H3), Multi-line and Read-only only (Size,
  Label, Help Text and Error did nothing for it) and prints a HeadingField code sample; "Compose announcement" uses
  `multiline`. Guideline (input): use/api/do/a11y lines on when to choose multiline.
- Tests: `tests/interaction/controls.test.tsx` (single-line onValueChange; multiline grows past two lines at 240px with
  nothing hidden and Enter adds no break; pasted line breaks → spaces). Figma contract `input-heading.mjs` renders
  Inputted-Multi-Line with `multiline`: 432/432 (the textarea matches the Figma node 60/60).
- QA note: the Build-QA ledger records a Bash edit only when the Bash result reports `changedFiles` and the command
  names the file. This session's python-heredoc edits (Input.tsx, PlatformExamples/Showcases) were not recorded, so
  the gate ran with `npm run qa -- --files=…`. Fixed by the QA owner (~15:40): the hook now also records a Bash command
  that writes a named UI file changed in the last 2 minutes, and files without recorded edit ranges no longer report
  old findings as "on the lines you changed".

## Style-guard debt burn-down (session "Burn down Zen style-guard token debt")

The user asked to burn down `tools/style-guard/baseline.json` one component or file at a time, checking the live
Figma node (file `9nZv4uW2LT21yuHabMTCh1`) for the token it binds, with no visual change unless the old value was wrong.
Each batch: `visual-diff capture` before → edit → capture after + `compare` → `npm run qa -- --pages=…` (sheets
opened) → `npm run style:check` shows 0 new → `--baseline-update`.

**Batch 1 — 376 → 362 findings (32 → 24 files).** Visual diff: 76 of 82 panels identical; the 6 changed panels are
the two Figma corrections below. `npm run qa` PASS on the 8 pages (contrast warnings on avatar initials and the
"Acme workspace" swatch preview and the coverage notes are pre-existing).

| File | Figma | Change |
| --- | --- | --- |
| accordion.css | Container itemSpacing Gap/Medium (239:10693) | `--zen-accordion-header-gap` drives the trigger gap and the content's right inset (icon + gap), so the gap token is never used as padding |
| breadcrumbs.css | Item-List does not wrap (4031:20264) | wrapped rows sit Gap/2XSmall apart (was Padding/2XSmall; same 4px) |
| link.css | code-only | `zen-allow-raw-spacing`: the external glyph's 0.2em gap scales with the inherited font |
| color-selector.css | swatch = Padding/XSmall around Popular/Small (4952:853) | size is a calc of those tokens: 32px Compact, grows in Comfortable like Figma |
| rating.css | `.Primitives/Rating/Emoji` (1536:25750): Heading/4 in a dm-32 slot | **fix**: the emoji was 24px/1; now the Heading/4 token set, slot `var(--zen-dm-32)` |
| slider.css | Slide-Dot (6455:2135) local drop shadows, colours bound | `zen-allow-raw-shadow` citing the node; **fix**: Medium thumb shadow is Shadow/Neutral/**Strong** (code had Base) |
| stepper.css | Focus-Ring absolute 36px at −6 (1625:4827) | `zen-allow-raw-spacing`: the 6px margin is the ring overhang |
| avatar.css | Stack itemSpacing −8/−4 (364:92561); square Focus-Ring radius per size (223:8784…) | negated Gap/XSmall and Gap/2XSmall; `--zen-avatar-focus-radius` per size (Base … Giant) replaces `max(radius + 4px, Base)` — same in Rounded, right in Luxury |

Seen in Figma, left for a follow-up (not style-guard debt): the Medium slider thumb keeps its drop shadow on hover in
Figma (code replaces it with the hover ring), and the Small thumb has no shadow when disabled (code keeps it).

## Example actions, Inter WOFF2 and the branch commit (session "Đánh giá Zen DS hiện tại (fork)")

The user approved the three follow-ups offered after the vibe-ready status check: clean up the 27
`icon-button/needs-action` warnings, ship the fonts as WOFF2, and commit everything to a separate branch (no push).

**27 icon-only buttons with no action** (`PlatformShowcases.tsx` 14, `PlatformExamples.tsx` 11, `appLayer/navigation.tsx`
2). Each now does something visible; no `() => undefined`:
- Sidebar examples:
  - "New team" creates a team with you in it and opens its page. "New teamspace" adds an empty teamspace whose page
    shows an EmptyState.
  - "Add workspace" creates and selects a workspace. "Workspace settings" opens a settings page (a DescriptionList
    under "General").
- Sidebar playground: it has no ZenProvider, so no toasts.
  - "New project" and "Add workspace" add and select items.
  - "Workspace settings" is a Menu trigger with New workspace and Hide/Show workspace rail.
- Other examples:
  - Media card Share copies the link and shows a toast.
  - The Divider toolbar's Align left is a pressed toggle, like the marks; Insert link confirms with a toast.
  - The Tooltip playground's Duplicate switches the tooltip to "Layer duplicated" for 1.5 s (the copy-feedback
    pattern).
- Code samples (Bulk-Action, Tooltip, Media card, Workspace, Teamspaces, Toolbar hints, Toolbar groups) show the same
  handlers.
- The two `navigation.tsx` hits are Menu triggers chosen by a ternary, which the rule's `<Menu trigger={<IconButton`
  exemption cannot see. They carry `zen-allow-no-action` with that reason.
- `usage:check`: 175 files, 140 rules, 0 warnings (was 27).

**Inter WOFF2.** No converter was installed (no fontTools, brotli, woff2_compress or npm package), and downloading
one needs the user's go-ahead. So a WOFF→WOFF2 encoder was written with Node's built-in zlib + Brotli; it is kept in
the fork session's scratchpad, not the repo.
- Every table keeps the null transform (glyf/loca version 3), so the decoded font is table-for-table the WOFF1's sfnt.
  The round trip is byte-identical on all 19 tables.
- Chromium (the Google woff2 decoder that WebKit and Firefox also use) loads both files. There are 0 metric
  differences across 30 checks (6 weights × 5 strings, Vietnamese included), and screenshots are pixel-identical at
  the same position.
- Sizes: normal 459,880 → 366,548 B, italic 500,860 → 404,520 B (−20%).
- `src/styles/fonts.css` points at the `.woff2` files, and the `.woff` files are removed (they stay in git history).
  `dist/fonts` holds only woff2. `verify:package` passes: CSS 63.2 KB gz, Button-only JS 73.3 KB gz.
- The official Inter release WOFF2 (glyf transform) would be ~10% smaller still, but fetching it needs a download
  approval.

**Hygiene:** `/.out/` (ad-hoc debug screenshots at the repo root) is gitignored.

**Batch 2 — 362 → 350 findings (24 → 19 files).** Visual diff on dialog, side-panel, table, uploader, toast, form,
templates and chat (1512 + 390): all panels identical (a first toast@390 capture died on an HMR reload and a 5 px blip
on form did not repeat; both re-captured identical). `npm run qa` PASS on the 5 pages; the cramped 390 Table columns
and the squeezed "Docked inspector" are pre-existing.

| File | Figma | Change |
| --- | --- | --- |
| dialog.css | Icon-Wrapper hugs the icon, Element-Size/Popular/2XLarge (10153:7695); Close = Button/Size/Small in a Padding/Large frame (12048:10078) | icon sized with the token (grows in Comfortable); ModalForm title clearance = close + Padding/Large − Modal-Padding + Gap/Medium (44px on desktop as before, 48px where Modal-Padding is 20) |
| side-panel.css | `.Primitives/Modal/Header`; Modal Close-Container = Padding/2XSmall around the Popular/Base Wrapper (1558:1463) | icon token as Dialog; heading clearance = Popular/Base + 2 × Padding/2XSmall + Gap/Medium |
| table.css | Editabled-Cell (1603:23274): one Body/Base line, Table/Cell/Size, 2px underline; Open (1603:18563) hugs "Open" at 56px, absolute | growing text editor centres one Body/Base line-height; `zen-allow-raw-spacing` on the Open-button clearance |
| uploader.css | Right Side: 16px icons, gap Small | hit-area overhang = (icon − 2XS button) / 2 at the end and (Body/Base line − 2XS button) / 2 top/bottom |
| toast.css | code-only stack | `--zen-toast-stack-gap` (Gap/XSmall); each row carries half of it |

**Batch 3 — 350 → 281 findings (19 → 13 files).** Sidebar, TopNavigation, BottomNavigation, BottomSheet, AiChat and
Chart. The before capture was taken after the edits by swapping the pre-edit files back in (reverse replacements,
round-trip checked, 69 baseline findings reproduced) and restoring them; visual diff on the 6 pages + chat + templates
(1512 + 390): 105/106 panels identical, the 106th (a Copy button blip) identical on re-capture. `npm run qa` PASS;
its contrast warnings (avatar initials on colour fills, "?" project avatars in Bottom Navigation "Labels + accent
action") and 20px-tall target warnings in phone previews are pre-existing.

| File | Figma | Change |
| --- | --- | --- |
| sidebar.css | Collapse = Button/Size/Small in a Popular/Base Wrapper at −6 (5974:20596/7); workspace Focus-Ring 3px OUTSIDE stroke (4233:5946) | `--zen-sidebar-collapse-bleed` = (Popular/Base − Button/Small) / 2 for the three −6px margins; collapsed footer button Padding/XSmall; workspace trigger hover bleed = ±Padding/3XSmall·2XSmall; `zen-allow` for the Small-Density 5/6 logo text (derived type) and the ring's Large + 3px outer radius |
| top-navigation.css | Top-Heading-Text Padding/XSmall × 2XSmall (12014:44793); Main-Heading-Text Bar-Padding-H1…H3; Nav-Action/Icon-Main (6085:34010): Navigation-Action/Size, Navigation-Action/Icon padding, Corner-Radius/Rounded, Top/Icon-Size | all bound to those tokens; flat action margin = (Icon-Size − Action/Size) / 2; h2 heading takes Bar-Padding-H2 (12; the 64px row still centres it) |
| bottom-navigation.css | Items (9017:26130) Padding/2XSmall + Rounded, container gap 3XSmall, Bottom/Icon-Size; CTA/Action/pill/dot Rounded | tokens; the action/FAB icons use the fixed Bottom/Icon-Size although Figma binds Button/Icon-Size/Medium (mobile nav stays fixed) |
| bottom-sheet.css | sheet Corner-Radius/3XLarge top corners (4059:14162); Header-Trailing/Search/Action Body/Items on Padding·Gap/2XSmall | tokens; icon→label gap = Gap/Small − row Gap/XSmall; `zen-allow-slot-size` for the fixed 24/16px icons (Figma's Popular/Base and XSmall resolved in the Comfortable mobile frames) |
| ai-chat.css | Chat-Field Corner-Radius/Giant (12074:16884), Input-Text Padding/3XSmall, AI Model gap 2XSmall, AI bubble Padding/3XSmall | tokens; long prompt inset = Padding/Small + 3XSmall; `zen-allow` on the code-only thinking dots' 6px gap |
| chart.css | X label Wrapper Rounded (4388:8501), column Padding/3XSmall, legend dot 12px + Gap/2XSmall (6643:73387), labels Label/Small | tokens; `zen-allow` on the 36/28px tooltip and X-label lanes |

Figma differences seen in passing (not style-guard debt, left for a follow-up): stack-bar columns are Corner-Radius/
Small on all corners in Figma (code: XSmall, top corners only); see also the Slider note under batch 1.

**Batch 4 — 281 → 263 findings (13 → 9 files).** Platform files: `PlatformMobileShowcases.tsx` and
`PlatformMobilePlaygrounds.tsx` phone screens use Padding/XSmall · Large · XLarge and Gap tokens inline (the two Bottom
Sheet screens whose sections were 20px apart, off the gap scale, now use Gap/Large 24 — the only visual change, 4
panels); `appLayer/content.css` home indicator radius Rounded + `zen-allow-colour-role` (a solid OS glyph like
PlatformPhone; Figma's System/Bottom-Indicator 308:46297 is a 6% Background/Neutral/Subtle bar — left for the user
to decide), `.pac-thumbs` Padding/2XSmall; `zen-allow-raw-heading` on the two playground `Panel` titles (platform
chrome with the platform typography; reported to the style-guard owner as a false positive). Visual diff 66/70
identical; `npm run qa` PASS (the `interaction/no-noop-handler` warnings in PlatformMobileShowcases are pre-existing
and belong to the behaviour-bug session).

**Commit (user request).** The whole Zen-DS tree was committed as one commit on the new local branch
`claude/zen-ds-0.4.0`, on top of `eafb0de`. It is not pushed, and `main` is unchanged. The branch prefix `claude`
comes from the user's app setting.
- Before committing: no secrets or tokens in tracked or untracked files; `.qa/`, `.platform-shots/` and `/.out/` are
  ignored; `tsc`, `usage:selftest` (144), `guidelines:check` (61) and `style:selftest` pass.
- Peers: "Burn down" and "Quy trình kiểm tra" were stable. "Fix 6" was mid-batch; it had said a mid-batch commit
  compiles and only its log and baselines may lag.

## Behaviour-probe bugs: 6 fixes and 4 harness rules (session "Fix 6 functional/UX bugs found by behaviour probes")

The user asked to fix, at their owner, the six hand-verified bugs that `npm run platform:behaviour` had recorded as
pre-existing debt in `tools/platform-audit/behaviour-baseline.json`, to make each recurring bug class a harness rule,
and to refresh the baseline entries of the pages that come out clean. All six were reproduced first with
`behaviour.mjs --pages=… --no-baseline` (11 pages).

| # | Bug | Cause | Fix |
| --- | --- | --- | --- |
| 1 | Popover: the selected option "Last updated" shows no focus | `.is-selected` (Active/Neutral/Subtle), focus (Flat/Hover) and selected focus (Flat/Pressed) all resolve to neutral-alpha-3, light and dark | `popover.css`: every `.zen-popover__item:focus-visible` draws `outline: 3px solid var(--zen-color-focus-accent-solid); outline-offset: -3px` (inside the row: the list scrolls and clips). The hover rule no longer sets `outline: 0` (0,3,0 would beat the ring on a hovered focused row); the no-op `.is-selected:focus-visible` rule is gone |
| 2 | SidePanel "Docked inspector": Width ignores ↑/↓ and + | `value={320} onValueChange={() => undefined}` | `useState<number \| null>(320)`; the canvas card's caption shows the width ("Selected layer · 320 px wide") |
| 3 | DatePicker "Birthday": Previous/Next do nothing | controlled `month={new Date(1995, 5, 1)}` with no handler (DatePicker has no `defaultMonth`) | month kept in state with `onMonthChange`; `onValueChange` instead of the deprecated `onChange`; the empty line reads "No birthday set" (it was instruction text); code sample updated |
| 4 | Invalid fields lose their focus ring (dialog, form, input, inline-message, templates) | `input.css` listed the error states and their `:focus-within` in one rule with `box-shadow: none`: focus changed nothing | the resting error rule is unchanged; a separate `:focus-within` rule adds the Focused state's `0 0 0 3px Border/Active/Neutral/Subtle` ring and keeps the Negative border. Covers every `.zen-input__control` field (text, textarea, select, date, number) |
| 5 | Chat "Desktop messenger": Escape in React / More returns focus to the bubble | `menuFromKeys` (set when Enter / Shift+F10 / the Menu key opens More from the bubble) was never reset, so every later toolbar menu behaved as bubble-opened | toolbar open/close requests go through `changeHoverMenu`, which clears the flag |
| 6 | Button "Confirm a destructive action": Cancel does nothing; Toast "Inline confirmations": Dismiss does nothing | no `onClick`; `onClose={() => {}}` (and `onClick: () => {}` on Upgrade) | Button: phases closed / confirm / deleting / deleted. Cancel closes and "Delete project…" (Danger) reopens; Undo returns to closed. Focus moves as with a dialog, only after a click: Cancel and Undo go to the trigger, the trigger goes to Cancel, a finished delete goes to Undo. Toast: Dismiss hides the toast and "Show message(s) again" restores; Upgrade swaps the warning for a dismissable positive "Storage upgraded"; focus moves to the restore button or the new toast's control |

Fix 5 exposed a latent bug, which a peer's `npm run qa` reported as a new `apg` finding: "More actions: Escape does not
close the listbox". Opened from its own button, More left focus on the button, and the toolbar's `stopPropagation` hid
Escape from the Popover's document listener, so the list could not be closed from the button. The flag used to be
stuck at `true` after the first bubble opening, which hid it. Now a keyboard-activated toolbar button (click
`detail === 0`) opens More with `autoFocus`, and Escape on the button of an open menu closes it (focus stays there).

### Making it stick

- **Harness (usage-guard, 140 → 144 rules):**
  - `interaction/no-noop-handler` (warn): a no-op `on…` prop (`() => {}`, `() => undefined`, `() => null`) on any Zen
    component except the ones `chat/no-locked-interaction` covers, and `on…: () => {}` inside `action`,
    `primaryAction`, `secondaryAction`, `actions` or `items`. It skips code samples, stories and `onReplace`
    (`uploader/no-noop-replace`).
  - `interaction/controlled-needs-handler` (warn): a controlled prop without its change handler. The pairs are read
    from docs/api: prop P with `on<P>Change` whose first argument has P's type, plus `onChange` for value/checked and
    `onClose` for open. Popover `open` stays with `popover/controlled-close`. It skips bare, `true` and `false` values,
    `x ? true : undefined` pins (a peer's Tooltip case), readOnly/disabled fields, spreads and stories. It checks code
    samples, because readers copy them.
  - `focus/state-parity` (CSS, error): a focus selector whose resting selector sits in the same rule. The resting
    selector is the focus selector with the focus pseudo and its `:not(…)` guards removed and one `:is()` expanded.
    Figma focus previews (`[data-state=focused|typing]`) are not resting states.
  - `focus/selected-fill-only` (CSS, warn): a fill-only `:focus` rule on an item that has a filled selected state and
    no ring anywhere in the file.
  - Fixtures in `bad`/`good` `.tsx`/`.css` and `consumer/App.tsx` (app mode and ESLint agree). Both CSS rules have 0
    hits on the 76 stylesheets and catch the old popover.css and input.css.
- **Tests:** `tests/interaction/focus.test.tsx`, 4 tests:
  - the Popover selected option draws the ring;
  - an invalid field adds the ring and keeps its border;
  - Chat keyboard menus: the bubble menu returns to the bubble; React / More take focus, close on Escape and return
    to their buttons;
  - a mouse-opened More closes on Escape from its button.
- **Guidelines:** popover a11y (ring), input a11y (the error state keeps the ring), date-picker dont (`month` without
  `onMonthChange`), chat a11y (focus return); `docs/guides/example-patterns.md` §3b (controlled + handler, dismiss
  and cancel do their job, the two rules).

### Verification

- Probes after the fixes: all 13 target findings are gone. `node tools/platform-audit/behaviour.mjs --pages=<the 11
  pages>` (no flag) printed "No new findings" (36 known, exit 0, no dev-server disturbance). `--baseline-update` then
  wrote 112 keys: 15 removed (the 13 above, plus the peer's Media card Share and the Toast Upgrade dead click), 0 added,
  0 changed.
- `npm run qa -- --pages=popover,side-panel,date-picker,button,toast,chat,dialog,form,input,inline-message,templates,card,list-item,pagination`
  PASSED: static (tsc, style-guard 0 new, usage-guard 0 in my edits, both selftests, guidelines, Figma contracts, full
  Vitest), runtime 0 errors, dark 0 errors, behaviour 0 new. Report `.qa/reports/2026-09-28T13-05-11-3e60e3e2.md`.
- The runtime warnings and coverage notes were all there before:
  - contrast on avatar initials BN/CT;
  - small targets on chat reactions / call action and the input label tooltip;
  - mobile / states coverage.
- All 28 contact sheets were opened. States the sheets do not show were shot separately:
  - Button "Confirm a destructive action" after Cancel, at 1512 and 390;
  - Toast "Inline confirmations" after Dismiss (1512, 390) and after Upgrade;
  - "Docked inspector".
- Focus states were screenshotted in light and dark with a scratch script: the selected option's pink ring, and an
  invalid field's red border plus ring.
- Scratch Playwright check of the live Chat page, 11 steps: bubble menu → bubble; React / More take focus, close on
  Escape and return to their buttons; bubble menu again → bubble. Passed 6 runs in a row. One earlier failure was an
  HMR reload from a concurrent edit.
- A second `npm run qa` ran after the last example edit (the shorter inspector caption) on date-picker, side-panel,
  button and pagination. It PASSED: 0 errors and 0 warnings in runtime, dark and behaviour; its 8 sheets were opened.
- `behaviour.mjs --checks=focus,keyboard` on all 61 pages found no new findings (15 known), so the Popover and Input
  focus changes moved nothing elsewhere.
- `npm run mcp:selftest`: its "check_usage passes a named IconButton" sample used `onClick={() => {}}`, which the new
  no-op rule reports. The sample is now `onClick={addMember}` (the case is about the name, not the handler). 9 tools
  pass.

### Open

- Read-only fields still show no focus indicator (warn "while read-only": dialog "File", inline-message "Custom
  domain", side-panel "Email", tooltip "Share link", visually-hidden). Out of the six; the user was asked.
- The 22 warnings the interaction rules surfaced (pre-existing):
  - 13 `ListItem onClick={() => undefined}` rows (PlatformShowcases, PlatformMobileShowcases, PlatformMobilePlaygrounds);
  - ChartCard `onOpen` no-ops ×3; BottomNavigation `onValueChange` and AiChatField `onSubmit` no-ops;
  - ChartCard `range` without `onRangeChange` (mobile Budget Allocation + its sample);
  - Pagination inline `pageSize` without `onPageSizeChange` ("Table footer": the page-size chip picks nothing; + its sample).
- Figma: Popover/Item has no Focus state and the Input family has no Error+Focused state. Ask the designer to confirm
  the code choices above.
- `.zen-input__control` has a 120 ms transition with no reduced-motion fallback. This predates the batch; the tests
  wait for the end state.
- "Docked inspector" is squeezed at 390 (noted before by the style-debt session).

**Batch 5 — platform.css, 263 → 134 findings (9 → 8 files; platform.css 129 → 0).** 26 dead lines removed
(`.platform-example-page__header*`, `.platform-sidebar-matrix*`, `.platform-sidebar-demo__*`,
`.platform-example-panel--sidebar`, `.platform-input-grid*`, `.platform-placeholder`: referenced nowhere in src, tools,
scripts or examples, and present since `eafb0de`). Tokens where the value is on the scale; the platform code view,
the install commands, `.pg code`, the ref keys/code and `.platform-example-panel pre` now carry the Body/Code set the
Zen-Platform typography block already forced on most of them. Figma-verified corrections: the topbar chips use the
Shadow/Action/Tertiary effect style + its backdrop blur (code had a 0.5px blur); overview card hover takes
Bottom/Level-2. Platform-chrome snaps (off-scale, no Figma source): the install commands 13/20 → Body/Code 12/16; token
links Body/Base + Body/Small with Padding/Small × Medium (were 13/11px, 14px); `.pgv-note` Body/Small (13px);
`.pg code` padding 4 / radius XSmall (5/6px); `.pg-arrow` 4px and `.pg-verdict` 8px (6px); ref keys padding 4 (6);
modal side list indent Padding/Large (18); overview intro under 620px is the full Heading/2 set and pads Small (10);
the overlay demo backdrop uses the Global greys `dark-gray-3 → dark-gray-8`. `zen-allow` with reasons: the Overview
cover and page heroes (Figma raw TASA Explorer 120px, 30px gaps, 37×34 logo, 20% black divider — nodes cited), the
syntax-theme hues, page end spaces (120/96px), the tooltip room in Do/Don't stages, the 8px rule dot centring, the
PlatformPhone device chrome (iOS status bar, island, home indicator, device radii) and three picture areas. Visual
diff over all 686 panels: 568 identical; the rest are the topbar chip shadow seen through the sticky topbar in the
captures, the 8 installation panels (Body/Code), and three known flaky blips (Copy icon, form 5px, a Bottom Sheet
filter dot). Token links, overview intro/cover, Button guidelines and the installation page checked in element
screenshots at 1512 and 390. `npm run qa` PASS on 10 pages.

**Batch 6 — 134 → 120 findings (8 → 4 files; 12 here, 2 more in PlatformShowcases.tsx by a peer's edit).** Popover badge-tone trailing slot min width = Element-Size/Popular/Base
(the base slot token); Input leading/trailing picker hover plate = ±Padding/2XSmall × Padding/XSmall (was 4 × 6px;
now the Breadcrumbs plate convention — Figma's Leading-Trailing primitive 373:101815 has no plate; hover-only change);
DatePicker range ends round with the day's Corner-Radius/Action/Small (455:33517; same in Rounded, follows the other
radius modes), the event dot centres with `inset-inline: 0; margin-inline: auto` instead of a −2px margin, wheels pad
Padding/Medium, the viewport's focus-ring room is ±Padding/2XSmall; PlatformExamples pagination stack gap Gap/Small.
The behaviour-bug session's `.zen-popover__item:focus-visible` ring and the input error-state focus rule are kept.
Visual diff 75/76 identical (the 76th is a pagination anti-alias blip that repeats across edits but is stable across
three unchanged captures). `npm run qa` PASS on 12 pages (static incl. Figma contracts and Vitest).

**Batch 7 — Chat, 120 → 40 findings (4 → 1 file; chat.css, chat-reply.css, chat-reactors.css 80 → 0).** Bubble radii
are Corner-Radius/XLarge (Social) and Large (Business) with the XSmall tail corner; the Business bubble/card lifts and
the reaction-status lift are local Figma effects with Color/Shadow colours, so they carry `zen-allow-raw-shadow` with the
nodes (6349:59476, 6323:1394, Chat/Reaction/Status/No). Reaction-Bar (6182:55704): its raw 15px emoji gap carries
`zen-allow-raw-spacing`; the emoji boxes are Element-Size/Popular/Large with the glyph at Font-Size/Heading-2 and 100%
line height; the emoji panel cell is `--zen-chat-emoji-cell` (Popular/XLarge) and its search field uses the Input
Small size and spacing tokens. The status line (time · Seen) is Gap/2XSmall, as in Figma — **the only visual change**
(6 → 4px). The mobile composer keeps its fixed 40px field (padding 10/0/10/14, radius 20 = half the height) with one
`zen-allow-raw-spacing zen-allow-raw-radius` comment, since Figma's Input/Spacing/Medium would grow it in Comfortable.
chat-reply.css: the reply tuck uses Gap/2XSmall, the quote radius Large, the thumbs Image-Size/Small·Medium, the
composer-reply inset = Padding/XSmall + (Navigation-Action/Size − Button/Size/Small) / 2. chat-reactors.css: emoji slot
Popular/Medium with Font-Size/Heading-4.
- **Regression caught by the gate:** the first `npm run qa -- --pages=chat` failed with 8 density errors. Moving the
  composer's IconButton overhang to tokens let the Comfortable (48px) Button overflow the 40px field. Fix: the field's
  vertical padding is `--zen-chat-field-pad-y`, and the Button (not the fixed 44px Nav-Action) only eats that padding
  (`margin-block: calc(-1 * var(--zen-chat-field-pad-y))`), so at Comfortable the field grows instead of overflowing.
- Visual diff (chat + list-item, 1512 + 390): 29 of 32 panels identical; the 3 changed are the status-line gap above.
  `npm run qa -- --pages=chat` PASS (1 step with pre-existing warnings), both sheets opened.

**Batch 8 — PlatformShowcases.tsx, 40 → 0 findings (the baseline is now empty: 376 → 0).** The file was released by the
locked-interactions session. Inline styles on the scale became tokens (popover-like icon picker: Gap·Padding/2XSmall and
the Popover's Corner-Radius/Large; Avatar workspace rows Gap/Small, Padding/XSmall, Radius/Base; skeleton and pricing
surfaces Radius/Large; the Tabs phone card Radius/XLarge; the mobile filter count Padding 2XSmall/Large/XSmall).
Overrides that restated the Stack or `.pe-row` gap were dropped (Search results, Accordion titles); `padding: "12px 0"`
became `paddingY="sm"`. Off-scale values snapped (**the visual changes**): Chip "Counters" 10 → Gap/Small 12, Rating
"Review summary" bars 6 → Gap/XSmall 8, Skeleton "Loading dashboard" cards 10 → 12, Stepper "Error and recovery"
20 → Gap/Medium 16, Metric "Sizes" 20 → 16, Toggle "Feature flags" rows 10 → Padding/Small 12 (like Divider "Settings
rows"). Headings: the Bulk-selection table title, the Filter panel title and the vertical Stepper panel title are
`<Heading level={4} textStyle="Heading/4">` under the example card's h3 (same look; the Filter title's wrapper is a div
now); the code samples mirror their renders (`<Heading level={1}>` page header, the Filter, Stepper, pricing plan and
grouped-list headings). `zen-allow` with reasons: the two prices (`visual-heading`: a value), the Workspace preview name
(it echoes the field), the Slider live-preview line height (relative to the slider's size) and the Tooltip annotation
gradient (a stand-in picture).
- Visual diff (23 pages, 1512 + 390): 249 of 268 panels identical. The 19 changed are the six snaps above, their grid
  neighbours at 1512 (the row height follows the taller panel), and five panels directly below a resized panel at 390
  (6–72 px of anti-aliasing; stable across a re-capture, not in the 1512 captures where the panel above kept its size).
- `npm run qa` PASS on the 23 pages (static, runtime, dark, behaviour 0 new); all 46 sheets opened. Its static step
  skipped style/usage-guard because the edits went through a script, so both ran by hand: style-guard 0 findings,
  usage-guard 0 warnings (175 files, 144 rules). The warnings (avatar-initial contrast, 20px mobile chips, the 12px input
  label tooltip, example coverage) are pre-existing.
- The empty baseline also records the locked-interactions session's two tokenised paddings in ButtonMobileFooterExample
  (its section below notes it did not run `--baseline-update`; they already dropped out at the batch 6 refresh).

**Final check — `npm run qa -- --all` (61 pages), because core Popover/Input and platform.css changed.** Static,
runtime (0 errors) and dark (0 errors) passed. Behaviour failed on one finding: action-bar "One set of actions, two
widths": Tab navigation raised "Cannot access 'option' before initialization", with the page hot-updated mid-run. The
Zen-Variables tokens sync regenerated tokens.css at about 22:12, and a peer edited PlatformTemplate.tsx during the run.
- Cause: an import cycle, appLayer/shared.tsx → ../PlatformExamples + ../PlatformTemplate → … → appLayer/content.tsx,
  which imports `option` from shared.tsx. An HMR update re-evaluates the modules mid-render (a TDZ error). A fresh load
  is fine: `behaviour.mjs --pages=action-bar` found no error-level finding, and `npm run qa -- --pages=action-bar`
  PASSED.
- The behaviour probes and 1512/390 shots after 22:12 carry the new tokens. All 114 sheets were reviewed: the 23
  batch-8 pages from their own run, and the other 34 from this one. Nothing my batches touched regressed.
- Pre-existing issues seen in passing:
  - Templates "Empty & error states" at 390: the Segmented labels collide ("No resultsFirst useLoad failed"). It is the
    same in the batch-2 captures; a follow-up task was offered.
  - Tables clip at 390, and "Docked inspector" is squeezed (already known).

## Locked interactions: the 22 interaction-rule warnings (session "Wire the 22 interaction-rule warnings")

The user asked to wire the 22 pre-existing warnings of `interaction/no-noop-handler` and
`interaction/controlled-needs-handler` so that something visible happens (example-patterns §3b), code samples included.
The work ran in three batches; after each one: `npm run qa -- --pages=…` with every contact sheet opened, then
`behaviour.mjs --pages=…` (no new lines) and `--baseline-update`. `npm run usage:check`: 22 → 0 warnings.

| Where | Was | Now |
| --- | --- | --- |
| Button "Mobile footer CTA" | Deliver to / Arrives / Pay with `onClick={() => undefined}` | Each row (now with a chevron) opens an Action BottomSheet with `selectedId`: Deliver to (Home / Office), Delivery speed (Standard Thu 2 Oct $10 · Express Tue 30 Sep $18), Pay with (Visa 4242 / Mastercard 8210 / Cash on delivery). The captions, Shipping, Total, "Place order · $…" and the "Order placed" date follow the choice. Escape or a pick returns focus to the row |
| Same example, "Save for later" | no handler (a baseline dead click; the sample already said `onClick={saveForLater}`) | Confirms on the button: check icon + "Saved for later". An InlineMessage at the top was tried and dropped: by then the list is scrolled down to the rows, so it was out of view |
| Sidebar: ShellAgenda (Calendar in three shells), Collapsed rail "Starred" | no-op rows | Selected state, like ShellInbox |
| Search "Search with scope" | no-op result rows | Selected state |
| Table "Invoices with pagination" | inline `pageSize={5}`, no `onPageSizeChange` | `pageSize` in state, `pageSizeOptions={[5, 10, 20]}`, a change goes back to page 1. The warning was on this example; Pagination "Table footer" (the earlier log's label) already had the handler |
| Mobile lists: ProjectList (Bottom nav "Tabbed app" Search tab, "Labels + accent action"), Top nav "Control bar", Bottom nav "Tabbed app" Profile, Bottom sheet "Share sheet", "Filters", "Full-height with search" (rows inside the sheet) | no-op rows | Selected state. ProjectList avatars had `alt=""` and drew "?"; `alt={p.title}` gives initials (ZW, BR…), like the playground's ScreenList |
| Bottom sheet "Quick create" | BottomNavigation `value="home" onValueChange={() => undefined}` | Tab in state |
| Playground ScreenList (Top nav, Bottom nav, Bottom sheet playgrounds) | no-op rows | Selected state |
| AI Chat "Long prompt" | `onSubmit={() => undefined}` | The field sits in an `AiChatThread`: sending adds the prompt, a thinking bubble (900 ms), then the answer (a team summary for the default prompt, a generic draft otherwise). `busy` + Stop end it with "Stopped before the answer was ready." The field stays mounted, keeps focus and empties. Visible change: at 1512 the field now sits in the thread's 800px column, as in the AI Chat playground (it was full width) |
| Chart "Dashboard tile", "Budget allocation", ChartPlayground | `onOpen={() => undefined}` | New `ChartReportPanel` (exported from PlatformMobileShowcases): a modal SidePanel with a Table of the numbers behind the chart and a bold Total row. Revenue: Jan–Jun, total $30,200. Budget: year total per group, total $78,000. Playground: the range's points or the departments |
| Chart "Budget allocation" | `range="dept"`, no `onRangeChange` | View in state. `budgetViews` groups the same $78K by Department (budgetSeries), Category (Salaries, Software, Hardware, Travel, Events) or Project (Web app, Mobile app, Design system, Brand refresh). Every quarter keeps its total, so the scale does not jump. The aria-label follows the view |

Code samples updated: Mobile footer CTA (row + sheet + total), Invoices with pagination, Long prompt, Dashboard tile
(SidePanel + Table), Budget allocation (view state). Descriptions updated where the behaviour changed. Two raw inline
paddings on lines I touched in ButtonMobileFooterExample are tokens now.

### Verification

- `npx tsc --noEmit -p .` clean after every batch; `npm run usage:check` 0 warnings (175 files, 144 rules).
- Batch A (button, sidebar, search, table):
  - `npm run qa` PASS twice (the second run after the Save-for-later change): `.qa/reports/2026-09-28T14-08-29-…` and
    `…14-14-32-32aafd22.md`. The gate added skeleton from the ledger.
  - behaviour: no new findings (12 known).
  - baseline 112 → 105: my 5 keys, plus Sidebar "Add workspace" and "Workspace settings", which a peer fixed earlier
    without a refresh.
- Batch B (top-navigation, bottom-navigation, bottom-sheet):
  - qa PASS (`…14-21-25-…`, then `…14-26-16-…` after the avatar fix).
  - behaviour: no new findings (10 known).
  - baseline 105 → 98.
- Batch C (ai-chat, chart):
  - qa PASS (`…14-39-29-32aafd22.md`).
  - behaviour: chart and ai-chat have 0 known findings now.
  - baseline 98 → 94.
- Baseline total: 112 → 94, removals only (0 added, 0 changed). Each update was diffed against a copy taken just before.
- All contact sheets opened (42). Scratch Playwright flows covered what sheets cannot show:
  - Sheets: each one opens, picks and closes on Escape, and focus returns to its row. Express makes the total $329.90.
  - Page size 10 → 10 rows, "1 - 10 of 42"; Next → 11–20.
  - Row selection; the Quick create tab moves.
  - Long prompt: the answer arrives, focus stays in the field, Stop works.
  - Reports: open with focus on "Close panel"; Escape returns focus to "Open report".
  - Budget legend and aria-label follow the view.
  - No page errors.

### Kept warnings (all pre-existing, same counts before and after)

- Contrast:
  - Avatar initials on brown / green / orange / teal (2.70–2.93:1) in ScreenList and ProjectList; before the fix they
    were "?" glyphs;
  - BottomNavigation accent labels, 1.92:1;
  - Sidebar "Workspace + members" "A", 2.93:1.
- Small targets at 390: Control bar segmented items (72×20), the Glass over media icon button, the Share sheet /
  Long content `sm` buttons.
- The AI field hides its model chip under 480px (`@media` in the component).
- Coverage ⚠ on every page (existing matrix gaps).

### Open

- 22 dead-click keys remain on these 9 pages. They are actions passed with no handler at all, which the no-op rule
  cannot see:
  - TopNavigation trailing and leading actions: Back, Upload, Like, Share, Settings…;
  - the BottomNavigation "Create" action;
  - Sidebar footer items;
  - Media card Edit / Duplicate, Empty state "Import from Figma", Table row Edit.
  A harness rule for "an action object or icon button with no handler" would list them.
- "Full-height with search": the Search in the sheet does not filter the settings list.
- `style:check --baseline-update` not run for the two tokenised paddings. The style-debt session, which is editing
  PlatformShowcases.tsx now, owns that baseline.

## Token sync: Zen-Variables.zip (session "Zen-Variables tokens update")

The user sent `~/Desktop/Zen-Variables.zip`: four Figma variable exports, dated 2026-09-28 14:59. They are Global
Colors, Component Theme, Emphasis Level and Typography Configuration. Each was copied verbatim (plus a trailing newline)
into `tokens/source/figma/{global-colors,component-theme,emphasis-level,typography-configuration}.json`.

| Collection | Tokens | Modes | Added | Removed | Changed |
| --- | --- | --- | --- | --- | --- |
| Global Colors | 1,152 → 1,152 | Zen | 0 | 0 | 4 values (below) |
| Component Theme | 112 → 113 | 5 → 6 (+ `Neutral - S4`) | `Input/Border/Disabled` | 0 | 0 in the existing modes (token order changed) |
| Emphasis Level | 6 → 6 | 2 → 3 (+ `Light`) | 0 | 0 | 0 |
| Typography Configuration | 78 → 78 | unchanged | 0 | 0 | 75 values (Dashboard and Mobile; Popular unchanged) |

- The total goes from 2,367 to 2,368. `tokens:check` is clean: 0 duplicates, missing modes, missing aliases or cycles.
- The Global Colors changes are all Light greys at step 11:
  - `Light/Gray/11`: #606060 → #4F4F4F;
  - `Light/Gray-Alpha/11`: #0000009F → #000000B0;
  - `Light/Neutral-Ananas/11`: #59645D → #49554E;
  - `Light/Neutral-Ananas-Alpha/11`: #001106A6 → #001107B6.
- Neutral-S4 differs from Neutral-S1 in 11 tokens:
  - Input fills use Surface/Default.
  - Input borders use Border/Neutral/Subtle (Default and Hover).
  - The Input inner shadows are transparent.
  - `Input/Border/Disabled` is Color/Border/Disabled; it is transparent in S1–S3.
  - Chip-Secondary selected uses the Active/Neutral/Subtle fill, the Subtle border and the Secondary border weight.
- Emphasis Light: Bold 500, Semi-Bold 450, Medium 450, Regular 400; both active strokes are 1px.

### Consumers (token → where → before/after)

- **Grey/11.** `Light/Neutral(-Alpha)/11` feeds the following, all value changes that need no wiring:
  - Color/Content/Neutral/Base (Light); On-White-Overlay/Base; Inverse/Base (Dark);
  - Background/Neutral/Solid/Hover, Border/Neutral/Solid/Hover and Black-Solid/Hover. Those feed the Button
    Primary/Accent hover, the selected-hover of Chip, Checkbox, Radio, Toggle, Segmented and DatePicker, and
    Tab/Content/Hover.
  - Neutral-Ananas/11 has no consumer.
- **Typography.** Every `zen-type-*` class and every direct `--zen-typography-*` use; value changes only.
  - The platform chrome's Zen-Platform block in platform.css is a separate mode that this export does not contain, so it
    is untouched.
- **`Input/Border/Disabled`.** Wired in `src/components/Input/input.css`, on the disabled field:
  `--zen-input-field-border: var(--zen-input-border-disabled)`.
  - Before, the field kept Input/Border/Default.
  - S1–S3 look the same (both transparent). S4 shows the Color/Border/Disabled outline.
  - No Disabled variant was added (house rule: inputs use Read-only).
- **`Neutral - S4`.** The generated selector is `[data-component-theme="neutral-s4"]`. Wired into:
  - `zenComponentThemes` (ZenProvider);
  - `PlatformShellSettings` and the topbar chip (PlatformTemplate);
  - the Storybook toolbar;
  - the provider API line in `guidelines.source.mjs` (then `guidelines:build`);
  - the getting-started table.
- **Emphasis `Light`.** Wired into the same places: `zenEmphases`, topbar, Storybook, docs.
  - `src/foundations/TokenTableView.tsx` labelled any "Light"/"Dark" mode as "… Colors", so the Emphasis tab read
    "Light Colors". The suffix now applies only in a Light + Dark collection.

### Text-style snapshots

`styles:build` failed after the sync. `build-text-styles.mjs` checks the resolved Dashboard size and tracking in
`styles/source/figma/text-styles.json` against the Dashboard variables, and they no longer matched.

- All 36 text styles bind Typography variables. The resolved numbers were therefore re-derived from the bound
  variables with a scratch script; the round-trip formatting is identical, so the diffs show only values.
  - `text-styles.json`: 31 values.
  - `figma-styles.full.json`: 50 values (fontSize, lineHeight, letterSpacing, paragraphSpacing).
  - `styles.json`: 44 values.
- This is not a re-export. A fresh Styles export should confirm the values.
- `styles:build` and `styles:check` pass.

### HeadingField and the Figma contract

After the sync, `run-all` failed on two suites:

- `.Chip/Trailing`: the XSmall badge's Caption label, 12 vs 16.
- Input/Heading: root 32 vs 28, Container 48 vs 44, and the placeholder text.

The fixes:

- **HeadingField height.** Figma binds the root height to Input/Size/Heading-H1–H3 in every single-line status. That
  is Component Size, unchanged: 40/36/32 in Compact, 44/40/36 in Comfortable. Figma fixes the Container at that
  +16 and centres the text.
  - Code used the text's line box instead, which only matched while the Heading line heights equalled those sizes.
  - `input.css` now gives the single-line input
    `min-height: calc(var(--zen-input-size-heading-hN) + 2 × Padding/XSmall)`. It is min-height, so a taller Mobile
    line box grows the field instead of clipping.
  - The `multiline` textarea still hugs its text, as Figma's Inputted-Multi-Line does.
- **Placeholder text exception.** In `suites/input-heading.mjs` it is now pinned to the new Heading/1–3 size and
  tracking (28/25/22px, −0.56/−0.5/−0.44px).
- **"Stale capture" exceptions**, not Figma inconsistencies:
  - `suites/chip-trailing.mjs`: the Caption badge label (captured at line height 12).
  - `suites/input-heading.mjs`: the Inputted-Multi-Line hugged heights (captured at 40/36/32).
  - Re-capture `checkbox-radio-chip-popover.json` and `input-search.json`, then drop them.
- All suites are green again.

### Docs

- `figma.collections.json`: counts, modes and the sync note.
- `design-system-context.md`: the table and the 2026-09-28 notes.
- `token-architecture.md`: the mode axes and the counts.
- `getting-started.md` and the README count.
- CHANGELOG:
  - Added: the new modes.
  - Changed: typography/colour and the HeadingField height.
  - The Fixed line about the HeadingField line box was reworded.
- HANDOFF: the Tokens line and the re-capture open item.
- `guidelines:build` regenerated `docs/api` and the guidelines. It also picked up a peer's in-progress rule,
  `interaction/action-without-handler`; that peer reruns it when done.

### Gates

- **`npm run qa -- --all`** (61 pages; report `.qa/reports/2026-09-28T15-25-59-f6051f48.md`). Every static gate
  passed: tsc, style/usage guard, selftests, guidelines, Figma contracts, `npm test`, tokens/styles checks. The
  behaviour probes had 0 findings. The audit found 3 errors, all fixed:
  - **Sidebar small-density "Kaiz" badge.** This is baselined debt: Body/Small ×5/6 = 10/13.33, which Figma scales.
    Its message changed only because the "nearest" styles are now caption-bold 11/16 and label-small-bold 9/12.
    The two keys in `tools/platform-audit/quality-baseline.json` were re-keyed to the new message.
  - **Layout "Title and actions row" at 390, Comfortable.** Button labels lost their negative tracking, so the pair
    grew about 5px and overflowed by 3.3px. The actions Stack now wraps (`src/platform/appLayer/layout.tsx`, the
    example and its code). The peer that wires those examples was told.
- The 94 warnings are all known: avatar-initial contrast (2.70–2.93:1) and small targets (chat reactions, input label
  tooltip, Glass over media). Every one is in earlier reports.
- **Contact-sheet review** (all 1512 and 390 sheets of the verify run, plus button, templates and typography from the
  `--all` run):
  - Card "Surfaces" broke "Theme=shadow" mid-word at 1512: Caption is now 11px, in 100px tiles. The fix is
    `.pe-card-grid--surfaces` minmax 100 → 120px in `platform.css`.
  - Nothing else looked off: headings, button labels, inputs and templates all read well at the new sizes.
- **Verify runs:**
  - `npm run qa -- --pages=sidebar,layout,design-tokens,typography,input,overviews` (+ the representative set):
    **PASS**, audit 0 errors.
  - `npm run qa -- --pages=card`: **PASS**, 0 errors and 0 warnings, dark included.
- **Build:**
  - Library: `vite build --config vite.lib.config.ts`, then lib CSS and types (CSS 64.0 KB gz), then the platform
    `vite build`.
  - The generators were not re-run, so the shared dev server did not reload; they had already run after the last
    source edit.
  - `npm pack --ignore-scripts` then `verify:package --no-pack`: Package OK (all 19 checks).
- **Browser checks** in this session's preview:
  - Neutral-S4: input fill #FFFFFF, border Subtle, `--zen-input-border-disabled` #EFEFEF; Chip-Secondary selected
    tokens resolve.
  - Emphasis Light: Bold 500, Medium 450, Regular 400, stroke 1px.
  - Typography gallery: Display/1 45/52, Heading/1 28/36, Heading/3 22/28, Caption 11/16, Label/Small 9/12,
    Button-Label/M 14/20, 0 tracking.
  - The Component Theme and Emphasis token pages show the new modes.

## Segmented overflow: Templates › "Empty & error states" at 390px (session "Fix Segmented label collision in Empty & error template")

### Symptom

- At 390 the template's Segmented (404 · No results · First use · Load failed) read "404 No resultsFirst useLoad
  failed" (`.platform-shots/templates-390.png`).
- The visual-diff captures from earlier the same day show the same thing, so it predates the style-guard work.

### Cause: Segmented, not the template

- The four segments need 313px in Compact and 329px in Comfortable. The template's column at 390 is 236px, because
  the platform frames it with card and stage padding. A real phone at 390 has about 358px, so it would fit there.
- `.zen-segmented` had `max-width: 100%; overflow: hidden`, and its items had `min-width: 0` with the default
  `flex-shrink: 1`. The items therefore shrank below their labels ("No results" went from 87 to 65px).
- Outside `fullWidth`, the labels are nowrap with no ellipsis, so each one ran into the next segment.
- Any hugging Segmented narrower than its options did this. The visual diff found two more:
  - The Segmented playground at 390, with icons on: the leading icons were squeezed away. "Tokens" kept only a dot.
  - Chart "Budget allocation": the labels touched each other.

### The pattern chosen: sideways scroll

- The DS already scrolls option strips on a phone:
  - Tabs: `overflow-x: auto; scrollbar-width: none`.
  - The chip filter row (`docs/guides/example-patterns.md`): scrolls sideways, no scrollbar.
- Figma: the Segmented container hugs and clips (`clip: true`, HUG). Its description says 2–5 options and "more than 5
  → Select/Dropdown". It says nothing about narrow widths.
  - The live file could not be read: no Figma MCP in this session. The data comes from
    `docs/figma-contracts/segmented-toggle-badge-avatarstack.json`.
- Options rejected:
  - Shorter labels: they would have to lose 77px, and Comfortable adds 16px more. "404 / Empty / New / Error" loses
    the meaning.
  - A Select on narrow widths: no Zen component switches components by width. It would also put a matchMedia hook in
    a template that promises "only Zen components".
  - `fullWidth`: four equal shares of 236px cut three labels down to "No r…".

### Change

- `segmented.css`:
  - The container gets `overflow-x: auto; overflow-y: hidden; scrollbar-width: none` and
    `::-webkit-scrollbar { display: none }`. The items get `flex-shrink: 0`.
  - `fullWidth` and the Top Navigation control bar still set `flex: 1 1 0` and ellipsize; their rules override the
    shrink.
  - No new tokens and no raw values.
- `Segmented.tsx`: a layout effect scrolls the selected segment into view inside the group.
  - It runs when the selected element changes, including on mount, and only when the group overflows.
  - It keeps the 2XSmall padding as the inset.
  - It does not call `scrollIntoView`, which would scroll the page too.
- The template is unchanged: 4 options with one- or two-word labels are within the guideline.
- Guideline (`guidelines.source.mjs` → `guidelines:build`):
  - an "Overflow (code only)" row;
  - a Do: elsewhere on a phone, keep the full labels and let it scroll; use `fullWidth` only when every label fits
    its share;
  - a Don't: never abbreviate or shrink the labels; past 5 options or long labels, switch to Tabs or SelectField;
  - an a11y line.
- Test, `tests/interaction/controls.test.tsx` "Segmented scrolls sideways…", in a 200px column:
  - the group scrolls;
  - every item has scrollWidth ≤ clientWidth;
  - no two items overlap;
  - the selected last item is in view.
  - Checked: the assertion fails when the old CSS is injected.

### Verification

- `npm run qa -- --pages=templates,segmented`:
  - Passed: tsc, style-guard (0 new), usage-guard, guidelines in sync, figma-contract, `npm test`.
  - Audit 1512 + 390 with smoke, quality and density: 0 errors. Dark: 0. Behaviour: 0.
  - The first run's usage self-test failure came from a peer's in-progress rule `interaction/action-without-handler`
    flagging `fixtures/good.tsx`. The peer fixed it, and the rerun is **PASS**
    (`.qa/reports/2026-09-28T16-00-26-63bcc004.md`). All four contact sheets were opened and reviewed.
  - ⚠ Example coverage for segmented is from before this fix: 3 examples, no states or mobile example.
- Visual diff before/after on segmented, templates, chart, top-navigation, alert-banner, card, metric, action-bar and
  image, at 1512 and 390:
  - 110 panels identical, 4 changed, all at 390, all fixes: the template, the Segmented playground, Chart "Expense
    trends" (5px overflow) and Chart "Budget allocation".
  - Nothing changed at 1512, in the Top Navigation control bar or in `fullWidth`.
- Component Size set to Comfortable in the platform topbar:
  - 1512: 329px, no overflow.
  - 390: 236px wide with 329px of content. Items at x = 4 / 55 / 147 / 228, no overlap, no page overflow.
  - Selecting "Load failed" scrolls it fully into view (right edge 4px inside); "404" scrolls back to 0.

### Open

- **No overflow hint.** In Comfortable at 390, the fourth segment starts exactly at the edge, so nothing shows that
  there are more.
  - Tabs and the chip rows behave the same way.
  - Figma has no fade or peek spec. This is a question for the designer (HANDOFF open items).
- **The audit missed the overlap.** The overflow sat inside `overflow: hidden`, which the audit skips as clipped.
  - A quality check for text wider than its own box without an ellipsis would catch this class of bug.
  - Owner: "Quy trình kiểm tra Component build".

## Handler-less actions: `interaction/action-without-handler` and the wiring (session "Catch and wire handler-less example actions")

The user asked for a harness rule that lists actions passed with no handler at all (which `interaction/no-noop-handler`
cannot see), and for the examples it lists to be wired so each action does something visible (example-patterns §3b),
code samples included. After the rule landed, a peer relayed the user's change of cadence: wire every page first, then
run one full `npm run qa` and the behaviour probes at the end (instead of after each batch).

### The rule

- `interaction/action-without-handler` (warn, `repoOnly`: judges the repo's examples, playgrounds, templates and
  fixtures, never apps and never `src/components`; code samples and stories are skipped):
  - a `Button` or raw `<button>` without `onClick` / `href` / `to` / `form` / `type="submit"` (or a pointer handler).
    Spreads, `disabled` / `loading` pinned on, `aria-disabled` / `aria-hidden`, and Menu triggers pass (a Button
    anywhere inside `trigger={…}`, a ternary included, or a variable used as `trigger={t}`).
  - an action object without `onClick` (or `onSelect` / `href` / `to` / a spread / `type: "submit"`) in TopNavigation
    `leading` / `trailing` / `largeTitleAction`, TopNavigationActionButton `action`, BottomNavigation `action`,
    EmptyState and ActionBar `primaryAction` / `secondaryAction`, AlertBanner / InlineMessage / Toast `action`,
    Card / MetricCard `subAction`, AiChatBubble `actions`, AiChatBlock `suggestions`, and ModalActions without
    `onDefault`. The list was checked against docs/api: every prop whose type carries `onClick?`.
  - pressable `items` whose list has no handler: Menu `onSelect`, Breadcrumbs `onNavigate` (the last crumb is the
    current page), Sidebar / SidebarSubMenu `onItemClick` (literal entries without `href`); BottomSheet `type="action"`,
    Popover and BottomNavigation (without `value`) whatever the list holds, since their entries cannot carry a handler.
  - documented defaults pass: Dialog, ModalForm, SidePanel and BottomSheet actions without `onClick` close the overlay
    (ModalActions `onDefault`).
- Code samples are found with a template-aware scan (`templateText`), not the backtick count: a sample nested in a
  playground's generated code (`${flag ? `<IconButton …>` : ""}`) counts as a sample too.
- IconButton stays with `icon-button/needs-action`. That rule had a false negative: it treated any `${…}` in the
  attributes as an opaque code sample, so live IconButtons with template-literal labels (`aria-label={`Edit ${name}`}`)
  were never checked. It now treats `${…}` / `…` as opaque only inside a code sample: 6 dead IconButtons surfaced
  (List item "Trailing actions" Resend, Table "Sortable members" Edit, Tooltip "Image annotations", three playgrounds).
- engine.mjs: JSX checks get `file`; `repoOnly` rules are skipped in app mode (CLI `--consumer`, ESLint plugin, MCP
  `check_usage`). **Fixed a scanner bug:** a glob in a string (`accept="image/*"`) opened a `/* … */` "comment" that hid
  every tag up to the next `*/` from all rules — 70 lines of PlatformShowcases.tsx (the Uploader examples), which hid a
  no-op `onRemove`, and two cases in fixtures/good.tsx. A comment now opens only after whitespace or punctuation.
- Fixtures: 6 `expect:` cases in bad.tsx, 9 clean cases in good.tsx (handlers, a Dialog secondary without onClick, a
  Menu trigger, a Breadcrumbs href, a Sidebar footer button, a submit, a pinned-disabled Button, a code sample). The
  existing cases for other rules got handlers (23 in bad.tsx, 17 in good.tsx) so they stay about their own rule.
- `npm run usage:selftest` 145 rules ✓, `npm run mcp:selftest` ✓, guidelines rebuilt (the rule shows in 17 guideline
  tables); `docs/guides/example-patterns.md` §3b.

### The wiring

`npm run usage:check`: 96 findings (89 action-without-handler, 6 needs-action, 1 no-op) → 3 (the platform chrome, below).

| Area | Now |
| --- | --- |
| Top navigation (mobile) | Collapse on scroll: New message opens a compose sheet; Send starts the conversation on top. Home with avatar: the bell opens Notifications and clears the dot; Settings opens a settings sheet. Over media: Close goes back to the album (a photo reopens the viewer), Share opens a share sheet, Like toggles. Control bar: Back goes up to Drive (its Files row returns), Upload opens a source sheet and adds the file on top |
| Bottom navigation / sheet | Floating: the Create pick confirms a draft on top of the feed. Labels + accent: Create opens New project; the project lands on top, opened. Long content: Back goes up to the cart |
| AI chat | Copy writes the answer to the clipboard and confirms in place (check, "Copied") in Streaming, Feedback and Error; the playground's suggestions ask, Copy / Edit / thumbs / Regenerate work ("More actions" left the playground: it is not in the component's documented actions) |
| Phone Back (Button "Mobile footer CTA", Chip "Mobile filter row", Text "Mobile typography") | goes up to a parent screen (Cart, Explore, Orders) whose row comes back; focus lands on the new screen's control (`usePhoneScreen()`) |
| Sidebar | Footer Settings / Help / Templates / Trash open their pages (aria-current); New project creates and opens a project; New page adds an untitled private page; Share, Invite, Invite people, Message and New task open a one-field dialog; ShellDoc Copy link confirms, Share opens a dialog |
| Desktop examples | Export and Duplicate confirm with a toast; Share / Invite / New project / Compose / Continue with email open `DemoFieldDialog`; Publish toggles (Unpublish); Reserve → Change dates; Upgrade storage → 100 GB; Plan picker CTA switches the plan (its caption then says "Your plan", the CTA reads "Current plan" and focus returns to its radio); Manage plan and Open file open details; View plans upgrades (then Manage plan); KPI ⋯ and View failed payments open the numbers in a report Side Panel; Table Edit opens a role dialog; Resend confirms in the caption; App launcher tiles open a summary; truncated names and annotation pins pin their tooltip on click; Label variants' action copies; Delete workspace asks in a Negative dialog and can be restored; Uploader Cancel stops the upload and offers it again |
| Breadcrumbs "In-page sections" | the crumbs move between sections (the instruction line under it is gone) |
| Templates | Dashboard Export / New project (a ModalForm; the project lands in Top projects) / Notifications; Admin list and Detail page sidebars select |
| Playgrounds | each action logs the handler it ran under the preview; the Button/IconButton specimen is `zen-allow` (the component being configured) |

- Components: **TopNavigation** keys trailing actions by position, so a label that changes (a count clearing, Like →
  Unlike) no longer remounts the button and drops focus (the behaviour probe caught it on "Home with avatar").
- Platform helpers: `DemoFieldDialog` (`src/platform/PlatformDemoActions.tsx`), `usePhoneScreen()`
  (`PlatformPhone.tsx`), `useFocusAfter()` and `ShellFooter` / `ShellFooterPage` (PlatformShowcases.tsx),
  `useCopyAction()` (PlatformMobileShowcases.tsx).
- Playground toasts: a playground panel has no ToastProvider (each example card has its own ZenProvider), so
  `useToast()` there throws — App Shell and Page Header playgrounds crashed until they used in-place changes.

### Verification

- Cadence: batches 1–4 (mobile · PlatformShowcases · app layer, Typography and templates · playgrounds) were checked with
  tsc, `usage:check`, `style:check` and read-only behaviour probes while wiring; the full gate ran once at the end, as
  the user decided (relayed by "Đánh giá Zen DS hiện tại (fork)").
- The mid-way probes caught three bugs before the gate: the TopNavigation focus drop above; the App Shell and Page
  Header playgrounds crashing on `useToast()`; and "Collapse on scroll" Search, whose action did nothing while the bar
  was already expanded (it now focuses the field). A scratch Playwright load check of the 32 touched pages then found
  no page errors.
- `npx tsc --noEmit -p .` clean · `npm run usage:check` 96 → 3 warnings · `npm run usage:selftest` 145 rules ✓ ·
  `npm run mcp:selftest` 9 tools ✓ · `npm run style:check` 0 new · `npm run guidelines:build` + `guidelines:check` ✓.
- `npm run qa -- --pages=<31 touched pages>` **PASS** (`.qa/reports/2026-09-28T15-57-41-4f86a2e6.md`): static incl.
  Figma contracts and Vitest; runtime 1512 + 390 with smoke, quality and density 0 errors; dark 0 errors; behaviour
  0 new (7 known). All 62 contact sheets opened. States the sheets do not show were shot and opened: Drive and the
  album after Back / Close, the Notifications sheet, the Invite dialog, the KPI report panel, the Sidebar Trash page,
  the Delete workspace dialog.
- Two small edits after that run (a playground code-sample string; "4 persons" → "4 people" in App Shell / Page
  Header) → `npm run qa -- --pages=list-item,page-header,app-shell` **PASS**
  (`.qa/reports/2026-09-28T16-27-09-4f86a2e6.md`), its 6 sheets opened.
- `node tools/platform-audit/behaviour.mjs --pages=<the 31 pages>`: "No new findings" (7 known). With
  `--baseline-update`: 94 → 24 keys, **70 removed (all deadclick), 0 added, 0 changed** (diffed against a copy taken
  just before); deadclick keys 75 → 5.
- Kept warnings, all pre-existing classes: avatar-initial contrast (2.70–2.93:1) in ScreenList, ProjectList, the Bottom
  Sheet and List Item playgrounds; BottomNavigation accent labels (1.92:1); Sidebar "A" (2.93:1); Dock Icon "On color"
  (2.59:1); the small Alert Banner (2.93:1); 20px mobile chips, the Control-bar segments, the Glass icon button and
  the Share sheet / Long content `sm` buttons; the 12px input-label tooltip; example-coverage gaps.

### Open

- Platform chrome (not examples): "Download Figma" (overview + sidebar footer) and "Feedback" have no destination; the
  rule keeps them as its 3 warnings until the user gives the URLs.
- Dead clicks that are component behaviour, not missing handlers:
  - Chip "Counters": a number-only Chip renders a `<button>` with nothing to do.
  - DatePicker "Report period": with `showActions`, Cancel and Submit both only `close()`; inline there is nothing to
    close, and DatePicker has no `onApply` / `onCancel` to tell them apart.
  - Input "Compose announcement": the editor bar's Redo is enabled with an empty history.
  - Chat "Reply to any message": the quote only scrolls to the original; no feedback when it is already in view (Chat
    owners).
