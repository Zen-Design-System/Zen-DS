# Zen Design System

React, TypeScript and Storybook implementation of the Zen design foundations and components.

## Commands

```bash
npm install
npm run tokens:build
npm run tokens:check
npm run styles:build
npm run styles:check
npm run icons:build
npm run icons:check
npm run storybook
npm run dev
```

## Platform preview

The Vite app at `http://127.0.0.1:5173/` mirrors the Codebase Platform template from the official Figma file. The cover title uses the supplied TASA Explorer font; the platform UI uses the generated Zen typography and token contracts. Component pages use the existing Chip/Popover playground to select one preview at a time; the code surface uses the platform-only JetBrains Mono asset.

The platform sidebar maps the current Storybook pages as follows:

| Platform entry | Storybook source |
| --- | --- |
| Overviews | `Foundations/Overview` |
| Design Tokens | `Foundations/Collections` plus each of the 11 collection detail pages |
| Typography | `Foundations/Styles/Text Styles` |
| Iconography | `Foundations/Iconography` |
| Button (Main + Icon) | `Components/Button/Main` plus Figma `Button/Icon-Main` |
| Chip/Pill (Normal, Advanced, Number-only) | `Components/Chip` |
| Sidebar | `Components/Sidebar` |
| Input (Text, Text Area, Select, Date, Autocomplete, Number, Richtext) | `Components/Input` |

`Installation` and `Avatar` are template entries ready for their next content pass. Component pages use the shared Codebase Platform frame with the five token-mode chips plus segmented view control; foundation/token pages use the same frame with the segmented control only, matching their Figma frames. All pages use the 400px hero and centered intro; Search remains the shared `Search` component on its own page, and navigation remains the reusable `Sidebar` component. The platform starts with `Zen / Light / Neutral-S1 / Compact / Rounded / Medium / Dashboard`. See the [Figma → platform workflow](docs/figma-to-platform-workflow.md) and [template lock](docs/platform-template-lock.md) before changing the shell or component pages.

## Foundation status

The repository contains the complete 11-collection Figma variable export with 2,367 variables, 36 local Text Styles, the generated CSS/TypeScript contracts, the Foundations overview, and searchable Storybook references. The SVG icon pipeline includes 1,592 imported icons and a typed React primitive. `Button` (Main + Icon) is the first implemented component pilot. See [token architecture](docs/token-architecture.md), [Text Style architecture](docs/text-style-architecture.md), [icon architecture](docs/icon-architecture.md), [icon import report](docs/icon-import-report.md), [Button Main](docs/button-main.md), and the [Figma audit](docs/figma-audit.md).

Component implementation order:

1. Confirm the three icon source anomalies in `docs/icon-import-report.md`.
2. Define any required icon aliases or deprecations.
3. Validate Button (Main + Icon) visually against Figma and lock the shared public API.
