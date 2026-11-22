# @zen-ds/vue

Zen for Vue 3 (Code view P3, plan `docs/research/code-languages-plan-2026-10-03.md` §3.C, §12). Native Vue components
that render the same markup, classes and `data-*` attributes as `@zen-ds/react`, so the same `styles.css` draws them.
Not published yet: the package builds and ships once the user approves a release.

## How it stays the same as React

- **One web core.** The logic both frameworks need (sizes, levels, what a root renders for a set of props, labels, icon
  data) lives once, framework-free, in `src/core` (a component's `model.ts` beside its React file, re-exported by
  `src/core/index.ts`). Components here import `@zen-ds/core` (a path alias to it) and never copy it.
- **DOM parity.** `npm run vue:parity` renders every case of each component's `<Name>.parity.ts` with
  `react-dom/server` and Vue's server renderer and compares the HTML, plus a case per union member and boolean the props
  docs list. It also checks the API: every React prop is a Vue prop, emit or slot, and no Vue prop is invented.
  `-- --write` records the matching components in `code-language.json`, which the docs' Code view reads.
- **Types.** `npm run vue:check` runs parity, the core's boundary check and `vue-tsc` (TypeScript 5) on the package.

## The React API in Vue

| React | Vue |
| --- | --- |
| `children` | the default slot |
| a node prop (`startIcon`, `leading`, `tooltip`) | a slot of the same name; an `IconName` prop also takes the name as a string (`start-icon="icon-plus-line"`) |
| `onRemove`, `onClose`… (component events) | emits: `@remove`, `@close` |
| DOM events and attributes (`onClick`, `disabled`, `aria-*`, `data-*`, `id`) | attributes and listeners on the root (`@click`, `disabled`) |
| `className`, `style` | `class`, `style` (merged with the component's own) |
| `ref` to the root element | a template ref's `$el` |
| `as={RouterLink}` | `:as="RouterLink"` |

Prop names stay the same (`theme`, `level`, `leadingIcon`; templates may write them kebab-case). Deprecated aliases
(`variant`, `color`, `leftIcon`) and Zen Studio's `overrides` are not ported.

## Waves

`waves.json` lists each wave's React folders and components. W1 (the 23 stateless folders) is P3; W2 and W3 are P4.
A component is listed as ready only when its parity is 100%.
