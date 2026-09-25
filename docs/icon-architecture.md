# Icon architecture

## Source of truth

Figma remains the visual source of truth. Export every icon as SVG into `icons/source/`. Nested folders are supported and become part of the generated kebab-case name.

Examples:

- `icons/source/Action/Add.svg` becomes `action-add`.
- `icons/source/Navigation/Arrow Left.svg` becomes `navigation-arrow-left`.

Do not edit files in `src/icons/generated/` directly. They are replaced by `npm run icons:build`.

## Generation flow

1. Recursively find SVG files in `icons/source/`.
2. Reject active or unsafe SVG content such as scripts and event handlers.
3. Preserve each asset's `viewBox`, falling back to numeric width and height when needed.
4. Convert a single explicit paint to `currentColor` so normal UI icons inherit text color.
5. Preserve multiple explicit paints for multicolor assets.
6. Generate the typed registry and a machine-readable manifest.

Generated outputs:

- `src/icons/generated/iconData.ts`
- `src/icons/generated/icon-manifest.json`

## React API

```tsx
import { Icon } from "./components/Icon";

<Icon name="action-add" size="base" decorative />
<Icon name="navigation-arrow-left" size={20} title="Back" />
```

`size` accepts `2xs`, `xs`, `sm`, `base`, `md`, `lg`, `xl`, `2xl`, `3xl`, a pixel number, or any CSS length. Named sizes map to the `Component Size / Element-Size / Popular` variables and therefore respond to the active Compact or Comfortable density mode. `base` is the default.

| Icon size | Element Size variable | Compact | Comfortable |
| --- | --- | ---: | ---: |
| `2xs` | `Popular/2XSmall` | 12 | 12 |
| `xs` | `Popular/XSmall` | 12 | 16 |
| `sm` | `Popular/Small` | 16 | 20 |
| `base` | `Popular/Base` | 20 | 24 |
| `md` | `Popular/Medium` | 24 | 28 |
| `lg` | `Popular/Large` | 28 | 32 |
| `xl` | `Popular/XLarge` | 36 | 40 |
| `2xl` | `Popular/2XLarge` | 44 | 48 |
| `3xl` | `Popular/3XLarge` | 52 | 56 |

Icons without a title are decorative by default. Meaningful standalone icons need a `title` or an accessible label and `decorative={false}`. Icon-only buttons must put the accessible name on the button itself.

## Validation

Run:

```bash
npm run icons:build
npm run icons:check
npm run build-storybook
```

The Iconography story is the review surface for search, names, scale, and color behavior before icons are consumed by Button/Main.
