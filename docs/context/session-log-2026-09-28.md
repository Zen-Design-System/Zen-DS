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
Small on all corners in Figma (code: XSmall, top corners only); the Rating/NPS and Slider notes above.

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
