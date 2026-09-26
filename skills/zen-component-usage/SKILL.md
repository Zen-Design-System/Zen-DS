---
name: zen-component-usage
description: Compose screens, examples or templates with Zen Design System components correctly, following each component's Do/Don't guidelines and passing the usage harness. Also defines the "definition of done" for new components (guidelines + harness rules). Use whenever writing JSX with Zen components or finishing a new component.
---

# Zen component usage

Zen components have written usage rules. Follow them when you **use** components, and extend them when you **build** one.

## When composing UI with Zen components

1. Read `docs/guidelines/index.json` (compact) or the relevant `docs/guidelines/<component>.md` before choosing a component. Check the "Use something else for" list first: picking the right component matters more than configuring it.
2. Apply the house rules that most often go wrong:
   - **Buttons:** Primary = the one main CTA; Tertiary for everything else; Secondary is rare (a justified highlight); Accent only for promoted CTAs; Danger for irreversible actions.
   - **Filters, sort, scope, status and owner pickers** are `Chip variant="advanced"`, never a Button or Segmented.
   - **Inputs** have Read-only, not Disabled (Search is the exception). Every field has a label.
   - **Popover items** take `photoSrc` (the item sizes the avatar); captioned items use Avatar ≥ Small (32px).
3. Run `npm run usage:check` and fix every ✗. Suppress a finding only when the rule truly does not apply, with a comment `zen-allow-<allow>: <reason>` directly above the element.

## When building or changing a component (definition of done)

A component is done only when all of these hold:
1. It matches Figma (see the `zen-figma-component-audit` skill).
2. It has a guideline entry in `tools/usage-guard/guidelines.source.mjs` covering purpose, use / use-something-else, Figma→React, Do, Don't, accessibility, content and references (Material 3, Carbon, Polaris, WAI-ARIA APG, NN/g). Regenerate with `npm run guidelines:build`. This writes `docs/guidelines/*.md`, `index.json` and `src/platform/guidelines.generated.json`, which the component's Platform page renders as its "Usage guidelines" section (Do / Don't, accessibility, harness rules). If the page id differs from the slug, map it in `slugFor` in `src/platform/PlatformGuidelines.tsx`; if the component has new JSX tags, add them to `tagsFor` in `build-guidelines.mjs`. Add 1–2 visual Do/Don't pairs (real components + one-line captions) to `src/platform/PlatformGuidelineVisuals.tsx`. The file opts out of the harness because its Don't previews are deliberately wrong. Keep Don't previews valid HTML: no interactive elements nested inside buttons.
3. Every Do/Don't that is detectable in JSX has a harness rule in `tools/usage-guard/check-usage.mjs`, with `id`, `components`, `severity` (error = must never ship; warn = needs judgement), `allow`, `guideline` and `summary`.
4. Each new rule has a violating case in `tools/usage-guard/fixtures/bad.tsx` (with an `expect:` marker) and correct usage in `fixtures/good.tsx`. `npm run usage:selftest` must pass.
5. `npm run usage:check` and `npm run guidelines:check` pass.

Keep statements short, imperative and testable. They are read by people and parsed by agents.
