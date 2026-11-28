# @zen-ds/vue

Zen for Vue 3 (Code view P3, plan `docs/research/code-languages-plan-2026-10-03.md` §3.C, §12). Native Vue components
that render the same markup, classes and `data-*` attributes as `@zen-ds/react`, so the same `styles.css` draws them.

## Install

From the licensed registry, as `@zen-ds/react` (`npx zen-ds init` adds the `@zen-ds` line to `.npmrc`):

```bash
npm install @zen-ds/vue
```

```ts
// main.ts
import "@zen-ds/vue/styles.css"; // once; "@zen-ds/vue/reset.css" after it is an optional page reset
```

```vue
<script setup lang="ts">
import { Button, Stack } from "@zen-ds/vue";
</script>

<template>
  <Stack direction="row" gap="sm">
    <Button level="primary" start-icon="icon-plus-line" @click="save">Save changes</Button>
  </Stack>
</template>
```

Vue 3.5+ is a peer dependency. Wave 1 ships today (`waves.json`); the rest of the library follows in later waves.

## The package build

`npm run vue:build` writes `dist/`: one ES module per source file, the web core they import under `dist/core` (the
`@zen-ds/core` alias resolves inside this repo only, so the core ships inside the package), declarations from tsc on
TypeScript 5, and `@zen-ds/react`'s `styles.css`, `reset.css` and fonts as they are (it runs `npm run build:lib` first).
`npm run vue:verify-package` packs it into `dist-pack/vue/`, installs it in a throwaway app
(`examples/vue-consumer-smoke`) and checks exports, that only `vue` lies outside the package, `vue-tsc` with
`skipLibCheck: false`, a `vite build` held to its budgets, and `renderToString` in Node. CI runs it on every pull
request; a `vue-vX.Y.Z` tag publishes (`.github/workflows/release.yml`, job `publish-vue`).

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
| `onRemove`, `onClose`… (component events) | `@remove`, `@close`: an emit, or a Function prop where React shows a part only when the handler is given (the close button) |
| DOM events and attributes (`onClick`, `disabled`, `aria-*`, `data-*`, `id`) | attributes and listeners on the root (`@click`, `disabled`) |
| `className`, `style` | `class`, `style` (merged with the component's own) |
| `ref` to the root element | a template ref's `$el` |
| `as={RouterLink}` | `:as="RouterLink"` |

Prop names stay the same (`theme`, `level`, `leadingIcon`; templates may write them kebab-case). Deprecated aliases
(`variant`, `color`, `leftIcon`) and Zen Studio's `overrides` are not ported.

## Waves

`waves.json` lists each wave's React folders and components. W1 (the 23 stateless folders) is P3: 39 of 39 ready;
MetricCard and ToggleListItem render a later wave's component (Card, Toggle) and wait for it (`waits`). W2 and W3 are P4.
A component is listed as ready only when its parity is 100%. React contexts are provide/inject keys read at render time
(`_shared/context.ts`, `card-content.ts`, `app-shell-chrome.ts`); their providers come with their components.

## In the docs' Code view

`src/platform/code/vue.ts` writes a snippet's Vue from its React code (plan §12, part 3); it reads `code-language.json`
for what the package exports and each component's props, emits and slots. `npm run vue:check` translates every example
whose components are all here and type-checks them with vue-tsc.
