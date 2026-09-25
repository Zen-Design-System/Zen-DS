# Component-page content pattern

Status: research and implementation plan for the Zen platform. Storybook remains a reference surface; the platform uses the same production components and a single, token-backed playground preview per component page.

## Evidence

- [Storybook Args](https://storybook.js.org/docs/writing-stories/args) treats each preview as a component plus a serializable argument object. Changing an argument re-renders the component; global settings are better represented as toolbar globals.
- [Storybook Source](https://storybook.js.org/docs/api/doc-blocks/doc-block-source) renders code attached to the same story rather than maintaining a separate, hand-written snippet.
- [Storybook Code panel](https://storybook.js.org/docs/writing-docs/code-panel) provides a first-class Show code/Copy code surface; it is now enabled globally and generated from the active story args.
- [MUI Button](https://mui.com/material-ui/react-button/) uses live variant examples plus an editable code surface and a separate API reference, while [shadcn Button](https://ui.shadcn.com/docs/components/base/button) keeps each variant/size example close to a copyable snippet. Zen follows this same separation: one canonical Playground, then comparison matrices and implementation details.

## Recommended content order

Every component page should use the following predictable sequence:

1. **Header** — component name, short purpose, and current status.
2. **Preview** — one canonical, non-editable default composition that demonstrates the recommended use.
3. **Playground** — the same component rendered from a typed, serializable props object. Controls edit that object; changing an option updates the rendered component immediately.
4. **Code** — a generated TSX snippet from the current playground props, with Copy. It must be derived from the same props object as the preview.
5. **Variants and states** — fixed comparison matrix for all Figma variant/property combinations, including focus and disabled states.
6. **Anatomy and tokens** — Figma property → React prop mapping, plus only the tokens directly consumed by the component.
7. **Accessibility and usage notes** — keyboard behavior, semantic requirements, and a small “do/don't” example where helpful.

## Runtime contract

```text
component registry
  ├─ typed defaultProps
  ├─ allowed controls / enum options
  ├─ render(props)              → Preview and Playground
  ├─ toCode(props)              → Code tab
  └─ figma mapping + token list  → documentation sections
```

- The registry is the platform's source of truth. It imports the production component; it does not recreate its CSS or props.
- Platform token axes (`theme`, `density`, `componentTheme`, `typography`, `radius`, `emphasis`) remain root data attributes inherited by every preview. The global topbar follows the locked Figma breadcrumb/segmented contract; a token-mode control surface can be added as a page-level playground without changing the shell.
- Playground state is local and serializable. It can later be encoded in the URL, following the same principle as Storybook args, without coupling it to Storybook.
- The code view must render the current props, not a static example. Complex UI values (such as icons) use a small explicit mapping from serializable names to React nodes.
- Platform playground controls use the existing Advanced Chip + Popover composition. They select one preview at a time; Advanced multi-select keeps the Popover open, shows the Figma Counter, and exposes the selected trailing remove affordance.
- A component page may group related Figma sets (for example Button/Main and Button/Icon), but it must not duplicate their production components or CSS.

## First implementation slice

Apply the pattern to **Button** first, keeping the two Figma sets on one page:

- Preview: primary medium `Button/Main` plus the fixed-size `Button/Icon-Main` primitive.
- Playground controls: `level`, `size`, `state`, `disabled`, `startIcon`, `endIcon`, and `children` for Main; `icon`, `aria-label`, `level`, `size`, `state`, and `disabled` for Icon.
- Code: generated `<Button ...>` snippet.
- Matrix: every Figma level × size for Main, then Icon size/level/state examples. Keep each set in its own section so the platform page remains scannable.

The platform now applies the one-preview playground pattern to Button (Main + Icon), Chip/Pill, Sidebar, Input and Search. This preserves one codebase while allowing the custom Zen platform to gradually replace Storybook's presentation layer.

## Implemented Storybook slice

- `@storybook/addon-docs` is registered in `.storybook/main.ts`; `docs.codePanel` is enabled in `.storybook/preview.ts`.
- Button/Main, Chip/Pill, Input, Sidebar and Search have an `autodocs` page, a named Playground, explicit source code, serializable icon mappings, and state/matrix stories.
- Chip/Pill's Docs page is the reference implementation: its controls, preview, Show code and Copy code are visible together, and the generated JSX reflects the current Playground contract.
