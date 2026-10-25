# UI/UX Pro Max skill — evaluation and integration plan (2026-10-26)

Status: **evaluation done; P1–P5 approved by the user on 2026-10-26 without G4** ("Bỏ G4. Phần đó nghiên cứu sau":
the data-view principles are a later study).

The user's ask (2026-10-26): research folding the "UI/UX Pro Max" skill into Zen's skills, which generate UI for both
Figma and Zen Studio; evaluate the skill first.

Source: `ui-ux-pro-max-skill-main.zip` from the user (v2.15.0, NextLevelBuilder, MIT,
github.com/nextlevelbuilder/ui-ux-pro-max-skill). Read in a scratch folder; nothing from it is in the repo.

## 1. What it is

| Part | Size | What it does |
| --- | --- | --- |
| `ui-ux-pro-max` skill | SKILL.md 214 lines; `quick-reference.md` 256 lines (10 categories, ~180 rule ids); `pro-rules.md` 117 lines (native-app rules + a pre-delivery checklist) | A priority table (Accessibility → Touch → Performance → Style → Layout → Type/Colour → Animation → Forms → Navigation → Charts) and a search workflow |
| Search tool | `search.py`, `core.py`, `design_system.py` (Python, stdlib only, local, no network) | BM25 keyword search over CSVs; `--design-system` returns a pattern, a style, a 16-role hex palette, a font pairing, effects and anti-patterns; `--persist` writes `design-system/<slug>/MASTER.md`; dials `--variance`, `--motion`, `--density` |
| Data | 13 CSVs + 22 stack CSVs, 2.6 MB | products 192 · ui-reasoning 192 · colour palettes 192 (hex) · styles 88 (50 active) · font pairings 74 + Google Fonts 1,935 · landing patterns 34 · charts 25 · UX guidelines 119 · app-interface 32 · GSAP presets 17 · icons 105 (Phosphor) · React performance 45 |
| Six sibling skills (claudekit) | `design`, `design-system`, `ui-styling`, `brand`, `banner-design`, `slides` | Logos, CIP and icons through external image APIs (keys needed), shadcn + Tailwind, HTML slides, banners, brand voice |
| `stack/` | an agent + `design-audit.mjs` | A design-review agent: Playwright at 375 / 768 / 1024 / 1440 / 1920, seven phases (flows, responsive, polish, WCAG, robustness, code, content), findings with evidence |
| CLI, gallery | 23 MB in all | Installs the skill into 20+ agents; a style gallery site |

## 2. Test runs (what the generator returns for Zen-like briefs)

| Query (`--design-system`) | Pattern | Palette | Fonts |
| --- | --- | --- | --- |
| "HR management internal dashboard" | Feature-Rich Showcase: Hero › feature grid › social proof › CTA (a landing page) | teal, note "Education teal + course amber + grade green" | Cormorant Garamond / Crimson Pro ("academia, victorian, leather") |
| "project task management SaaS dashboard" | Product Demo + Features (a landing page) | teal + orange | Plus Jakarta Sans |
| "fintech banking mobile app" | Trust & Authority + Conversion | gold primary + purple | IBM Plex Sans |
| "e-commerce fashion store" | Feature-Rich Showcase | green + urgency orange | Cormorant / Montserrat |

A focused query does well: `"form error validation summary" --domain ux` returns a focusable error summary with
correct ARIA (WCAG 2.2, GOV.UK pattern), then two shorter rows.

Data profile: every product type carries a landing pattern, and 90 of the 192 are a Feature-Rich or Hero pattern
(the generator leads with it even when the product also has a dashboard style); 14 of the 192 product types are near
Zen's domains (no HR platform, no task app); 80 of the 119 UX guideline rows are one-liners.

## 3. Evaluation

| Criterion | Score /5 | Why |
| --- | --- | --- |
| UX knowledge (accessibility, forms, navigation, touch, charts, motion) | 4 | Broad, cites WCAG 2.2, Apple HIG and Material; the new rows are precise, the older ones terse |
| Fit for app screens (Zen's job: dashboards, HR, finance, tasks) | 2 | Landing-page bias: three of the four app briefs above came back as landing patterns |
| Compatibility with Zen's rules | 1 visual · 4 UX | Hex palettes, Google font pairings, 50 visual styles (glass, neumorphism, brutalism…), Phosphor / Lucide icons, GSAP snippets, Tailwind / shadcn each break a Zen hard rule (only Zen components, tokens, text styles and icons; never invent a token). Contrast in WCAG 2 ratios, Zen judges with APCA |
| Relevance of the search | 2 | Keyword matching misroutes: an internal HR dashboard got an education palette and Victorian serifs |
| Token cost | 2 | ~590 lines of skill text plus search output per call, overlapping Zen's own docs: the agent reads two sources that disagree |
| Safety and licence | 4 | The search runs locally on the standard library; MIT (keep the notice if text is copied). The `design` skill sends prompts to external image APIs: not needed |
| Maintenance | 2 | Python, catalog refresh jobs upstream; a copy in Zen drifts |

**Verdict.** Do not install it beside Zen's skills (repo, Figma AI kit or Studio agent). An agent that follows it
picks a palette, a font pairing and a visual style, which is exactly what a Zen screen must not do, and its landing
bias fits Zen's app screens poorly. Its value is the UX layer. Take that as Zen-owned principles, in Zen's words,
each mapped to the Zen component that implements it.

## 4. What Zen already covers

| UI/UX Pro Max | Zen owner |
| --- | --- |
| One primary CTA per screen | Button roles (`component-usage-rules.md` §1, Figma audit `button/*`) |
| 44px touch targets, 8px between them | Figma QA "44px hit area", audit `touch/target-spacing` |
| Chart type by data, no pie over 5 slices | `docs/guidelines/chart.md` (14 charts, Use / Use something else; Donut 2–7) |
| Toasts auto-dismiss in 3–5 s | ToastStack `duration` 5000, +3 s with an action, paused on hover / focus |
| Undo, unsaved-changes guard, confirm destructive | Dialog, ActionBar and Chat guidelines |
| Semantic colour tokens, dark mode, contrast | `design-principles.md` §1–§6 (APCA) |
| Hierarchy, white space, line length, restraint | `design-principles.md` §8 |
| Breakpoints, adaptive navigation | `responsive-principles.md`, rules §17 |
| Reduced motion, transform-only animation | `--zen-motion-*` tokens, harness `motion/*` |
| Icon-only buttons need a name | IconButton tooltip / `aria-label` (rules §12) |
| Bottom navigation ≤ 5 | Sidebar's first 4 rows + More |
| Empty, loading and error states | Figma skill §3.4 (state frames), `design-principles.md` §8 "Content first" |

## 5. Gaps worth taking (adapted, never copied)

- **G1 Screen-level UX that no single component owns.**
  - Forms: validate on blur; after a failed submit with several errors, a focusable summary at the top links to each
    field and the inline errors stay; long forms keep a draft; never ask again for what the flow already has (WCAG
    3.3.7); sign-in accepts paste and password managers (3.3.8).
  - Feedback: work over about a second shows a Skeleton; a timeout says what failed and offers Retry; a finished
    action confirms itself; bulk or destructive actions offer Undo.
  - Navigation: Back restores scroll, filters and input; every key screen has its own URL; after a route change focus
    moves to the main heading; destructive items (Delete account, Sign out) sit apart; one navigation pattern per
    level; a destination that is not available says why.
  - Accessibility 2.2: sticky headers, ActionBars and toasts never cover the focused control (2.4.11); every drag has
    a click or keyboard alternative (2.5.7); help sits in the same place on every page (3.2.6); desktop pointer
    targets are at least 24px (2.5.8).
  - Touch: swipe actions show an affordance and have a visible alternative; controls stay clear of safe areas.
- **G2 A robustness pass** (the design-review agent's phase 5): long names and numbers, 0 / 1 / many items, a slow
  network, the largest text size, Vietnamese strings (longer than English). For `design-principles.md` §9 and the
  Studio Play walk.
- **G3 Brief → screen plan per product family**, from the products' "Key considerations" and the reasoning
  "Anti-patterns", for the families Zen serves (HR, finance and banking, e-commerce, logistics, social, CRM,
  analytics and operations, projects and tasks, healthcare, education, booking, AI assistant): the screens each needs,
  its trust cues, what to avoid, mapped to Zen's templates (◆ HR-Platform, Finance, Social, Logistic, Ecommerce) and
  components. No styles, colours or fonts.
- **G4 Data views** (deferred by the user 2026-10-26, a later study): from the chart rows, only what `chart.md` lacks
  (the chart's key insight as its description, a table as the accessible fallback, aggregate above about 1,000
  points).

**Not taken:** styles, palettes, fonts, icons, GSAP motion, stack guides, landing patterns (Zen has no marketing
components; revisit if Studio gets landing templates), the design-system generator and MASTER.md (Zen tokens and
Studio projects / themes own that), the dials (Zen: Component Size and Typography modes), the Python search, the six
claudekit skills, the CLI.

## 6. Integration (approved 2026-10-26, without G4)

Principles, not rules: no new harness rule or audit check (a check later needs its own approval).

| Step | File | What |
| --- | --- | --- |
| P1 | `skills/zen-component-usage/references/ux-principles.md` (new, ~130 lines) | G1 in Zen's words; each item names the Zen component or prop that does it and the Zen rule that already covers part of it; sources (WCAG 2.2, Apple HIG, Material 3, GOV.UK) and a credit to UI/UX Pro Max (MIT) for the selection |
| P2 | `skills/zen-component-usage/references/product-patterns.md` (new, ~100 lines) | G3 |
| P3 | `design-principles.md` §9 | G2 as 3–4 more questions |
| P4 | `zen-component-usage` SKILL step 0–1; `zen-figma-design` files table, §1.4 (brief → screen list) and QA checklist; `tools/ai-kit/kit.mjs` `KIT_SOURCES.principles` and the kit's README / AGENTS | Figma: the AI kit ships the two new files next to the design principles |
| P5 | `tools/studio/agent/prompt.mjs` | Studio: five short lines in Zen Agent's frozen prompt (states, forms, navigation, robustness). The agent reads no principles file today; a zen-ds MCP tool that serves them would be a new feature (separate approval) |

Checks after P1–P5: `npm run ai-kit:check`, `npm run mcp:selftest` (unchanged tools), Studio agent prompt test if one
exists, and the scoped `npm run qa`.
