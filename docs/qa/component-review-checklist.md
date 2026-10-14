# Component review checklist

Use this when reviewing a new or changed component in `src/components/<Name>/`. Each item is a yes/no question.
**[gate]** means `npm run qa`, `npm test` or a harness already checks it: confirm the run passed rather than
re-checking by hand. Everything else needs a reviewer's eyes.

Related: definition of done (`AGENTS.md` §B, `docs/component-usage-rules.md`), the QA loop
(`docs/qa/build-qa-process.md`), tiers (`AGENTS.md` §C).

---

## 1. Figma parity and design tokens

- [ ] JSDoc cites the Figma node (file `9nZv4uW2LT21yuHabMTCh1`) and the tokens it uses.
- [ ] Every variant, size and state in the Figma component set exists in code, and nothing exists that Figma lacks. **[gate]** `node tools/figma-contract/run-all.mjs`
- [ ] Colours, spacing, radii, shadows and type come only from `--zen-*` tokens; raw values appear only as `var()` fallbacks. **[gate]** `npm run style:check`
- [ ] No invented token. A missing token goes to the designer (`BACKLOG.md`), not into the CSS.
- [ ] Text uses the text styles (`src/styles`), not ad-hoc `font-size` / `line-height`.
- [ ] Dark mode and Comfortable density render correctly. **[gate]**
- [ ] Container borders, content colours and background layers follow `docs/component-usage-rules.md` §6–§9.

## 2. Accessibility (WCAG 2.2 AA + WAI-ARIA APG)

**Semantics**
- [ ] The root is the right native element (`<button>`, `<a>`, `<input>`, `<dialog>`, `<ul>`…) before any `role`.
- [ ] A `role` is only added when no native element fits, and it follows the APG pattern exactly (required children, owned elements, states).
- [ ] No interactive element nested inside another (button in a link, link in a button).
- [ ] Headings inside the component don't hard-code a level that breaks the page outline (let the consumer pick, e.g. an `as`/`level` prop).

**Names, states, relationships**
- [ ] Every control has an accessible name: visible `<label>`, `aria-labelledby`, or `aria-label` for icon-only controls.
- [ ] Icon-only actions also show their name as a tooltip (rule §12).
- [ ] States are exposed: `aria-expanded`, `aria-selected`, `aria-checked`, `aria-pressed`, `aria-current`, `aria-invalid`, `aria-busy`, `aria-disabled` as the pattern requires.
- [ ] Help and error text are linked with `aria-describedby`; errors are announced (live region or focus move).
- [ ] IDs used for ARIA come from `useId()`, never hard-coded strings (two instances on a page must not collide).
- [ ] Decorative icons/images are `aria-hidden="true"` / `alt=""`; meaningful ones have text.
- [ ] Built-in strings (e.g. "Close", "Clear", "Loading") come from `useZenLabels()` with en and vi keys in `_shared/labels.ts`.

**Keyboard and focus**
- [ ] Everything reachable and operable by keyboard alone, with the APG key map (Arrow keys, Home/End, Enter/Space, Escape, type-ahead where expected). **[gate]** `npm run platform:behaviour`
- [ ] Composite widgets (tabs, menus, listboxes, radio groups, grids) use roving `tabIndex` or `aria-activedescendant`: one Tab stop.
- [ ] Focus is always visible; a removed outline has a replacement ring with ≥ 3:1 contrast. **[gate]** harness
- [ ] Overlays (Dialog, BottomSheet, SidePanel modal) trap focus, close on Escape, restore focus to the trigger, and make the background inert.
- [ ] Popovers/menus close on outside click and Escape, and return focus correctly.
- [ ] No positive `tabIndex`. No focusable element inside `aria-hidden` content.
- [ ] `disabled` vs `aria-disabled`: if the control must stay discoverable (e.g. has a tooltip explaining why), it uses `aria-disabled` and blocks the action itself.

**Perception**
- [ ] Text contrast ≥ 4.5:1 (3:1 for large text); UI component and state contrast ≥ 3:1. **[gate]** contrast check
- [ ] Information is never conveyed by colour alone (errors have an icon or text, status has a label).
- [ ] Target size ≥ 24×24 px (44×44 on touch-first components).
- [ ] Works at 200% zoom and 320 px width without loss of content or horizontal scroll (text truncation has a way to read the full text).
- [ ] Respects `prefers-reduced-motion` via `--zen-motion-movement`; no layout-property animation. **[gate]** `motion/*` rules
- [ ] No axe violations added to the baseline. **[gate]** `npm test -- tests/smoke`

## 3. Security

- [ ] No `dangerouslySetInnerHTML` with any value a consumer can pass. Allowed only for build-time generated, trusted markup (as in `Icon` and `Flag`), with a comment saying where the markup comes from.
- [ ] Props that become URLs (`href`, `src`, `action`, `formAction`) don't execute `javascript:` / `data:` URLs from untrusted input; document the expectation in JSDoc or sanitise.
- [ ] `target="_blank"` (e.g. `Link external`) always sets `rel="noopener noreferrer"`.
- [ ] No `eval`, `new Function`, string `setTimeout`, or inline event-handler strings.
- [ ] User content is rendered as text (React children), never concatenated into HTML, CSS (`style` built from user strings) or selectors.
- [ ] File inputs (`Uploader`) treat `accept` as a hint only; the component never reads file contents itself, and any preview made with `URL.createObjectURL` is revoked on unmount/remove.
- [ ] No secrets, tokens, internal URLs or `console.log` of user data in shipped code.
- [ ] Rest props spread onto DOM (`{...rest}`) can't override security-relevant attributes set by the component (spread first, then the component's own `rel`, `type`, `role`).
- [ ] `<button>` inside forms sets `type` explicitly so it doesn't submit by accident.
- [ ] No new runtime dependency without review (license, size, maintenance, known CVEs: `npm audit`).

## 4. React quality (React 19)

**API design** (`AGENTS.md` §B "API conventions")
- [ ] Props follow the house names: `value`/`defaultValue`/`onValueChange`, `checked`/`defaultChecked`/`onCheckedChange`, `selected`, `open`/`onOpenChange`, `size` through `scaleKey()`, icons through `renderIcon()`.
- [ ] Supports both controlled and uncontrolled use; switching between them doesn't happen silently (one hook for it, no state that drifts from the prop).
- [ ] Renamed props stay as `@deprecated` aliases and the harness warns (`api/deprecated-prop`).
- [ ] Accepts `className` and passes remaining DOM props to the root element; merges `className`/`style` instead of replacing them.
- [ ] `ref` reaches the root DOM node. New components take `ref` as a prop (React 19); `forwardRef` only where existing code already uses it.
- [ ] Every prop has a type and JSDoc (props docs are generated). Union string literals, not `string`, for variants.
- [ ] No `any`; no non-null `!` without a reason. **[gate]** `npx tsc --noEmit -p .`
- [ ] Exported from `src/index.ts`; types exported too.

**Rendering and hooks**
- [ ] Rules of Hooks hold: no hooks in conditions or loops; effects list every dependency (no silenced `exhaustive-deps`).
- [ ] No derived state copied into `useState`; compute it during render.
- [ ] Effects only sync with external systems (DOM, listeners, timers, observers) and clean up everything they start.
- [ ] Event listeners on `window`/`document` are added once and removed on unmount; `ResizeObserver`/`IntersectionObserver` disconnected.
- [ ] List keys are stable IDs, never array index for reorderable or filterable lists.
- [ ] Stable callbacks/objects where they feed effects or memoised children; no `useMemo`/`useCallback` sprinkled where it buys nothing.
- [ ] No reading `window`, `document`, `localStorage` during render (SSR safe); use effects or `useSyncExternalStore`.
- [ ] Works under `StrictMode` (double effects, double render) without duplicate listeners, toasts or requests.
- [ ] Context values are memoised so providers don't re-render every consumer on each render.
- [ ] Overlays render through the Provider's portal (`Portal`) and still work with nested overlays.
- [ ] No large component re-renders on every keystroke/scroll where a ref or `useDeferredValue` would do.

## 5. Code quality

- [ ] File layout: `src/components/<Name>/{Name.tsx, name.css, index.ts, Name.stories.tsx}`.
- [ ] Reuses `_shared` helpers (`scale.ts`, `icon.tsx`, `overlay.ts`, `status.ts`, `slots.ts`, `contentTone.ts`) instead of re-implementing them.
- [ ] CSS classes follow the `zen-<name>__<part>--<modifier>` naming; no global selectors, no `!important` without a `zen-allow-*` reason.
- [ ] Deliberate exceptions to a harness rule carry `zen-allow-<allow>: <reason>` right above.
- [ ] No dead code, commented-out code, unused props or leftover debug output.
- [ ] Functions small enough to read; no copy-pasted blocks between variants.
- [ ] Comments explain *why*, not *what*; density matches neighbouring components.
- [ ] Bundle: icons from lazy buckets, no import of `src/platform` or `src/foundations` from the library.

## 6. Tests and docs (definition of done)

- [ ] Smoke test + axe baseline cover the component. **[gate]** `npm test`
- [ ] Interaction tests for keyboard, controlled/uncontrolled, and every bug fixed (`tests/interaction/`).
- [ ] Size spellings tested (`tests/scale.test.tsx`) if it takes `size`.
- [ ] Storybook story with every variant and state.
- [ ] Platform page: nav entry, ≥ 4 examples, 1–2 Do/Don't visuals, `.platform-*` CSS.
- [ ] Guideline entry in `tools/usage-guard/guidelines.source.mjs` and JSX tags in `build-guidelines.mjs`. **[gate]** `npm run guidelines:check`
- [ ] Harness rules with an `expect:` case in `fixtures/bad.tsx` and a clean case in `fixtures/good.tsx`. **[gate]** `npm run usage:selftest`
- [ ] Contact sheets (1512 / 390, light / dark) opened and looked at: no text flush to an edge, no stretched small button, no oversized icon.
- [ ] CHANGELOG line (Unreleased) for user-facing changes.

---

## Reviewer sign-off

| Area | Reviewer | Result |
| --- | --- | --- |
| Figma + tokens | | |
| Accessibility | | |
| Security | | |
| React + code | | |
| Tests + docs | | |
