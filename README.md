# Zen Design System

React 19 + TypeScript components, design tokens and icons generated from the Zen Figma library
(file `9nZv4uW2LT21yuHabMTCh1`), plus the Codebase Platform docs site.

- **Documented components** (Button, inputs, Table, Dialog, Sidebar, Chat, Chart, layout, text, app shell…), each with
  Do/Don't guidelines, generated props docs and machine-checked usage rules.
- **Foundations:** 2,179 Figma variables in 7 mode axes (theme, component theme, density, radius, emphasis,
  breakpoint, typography), 36 text styles, 18 effect styles, 1,598 icons.
- **AI-ready:** agents building apps start at [`AGENTS.consumer.md`](AGENTS.consumer.md) (shipped with the package);
  [`llms.txt`](llms.txt) indexes every doc. Agents working on the design system itself read `AGENTS.md` (repo only).

## Use it in an app

`@zen-ds/react` is licensed per company and served by the Zen registry. Once per project, add the scope line to the
app's `.npmrc`; once per developer, sign in with your licence key (any username, the key as password):

```bash
echo "@zen-ds:registry=https://npm.dizai.studio/" >> .npmrc
npm login --registry=https://npm.dizai.studio/ --scope=@zen-ds --auth-type=legacy
npm install @zen-ds/react react@^19 react-dom@^19
```

```tsx
import "@zen-ds/react/styles.css";
import { Button, ZenProvider } from "@zen-ds/react";

<ZenProvider theme="system">
  <Button level="primary">Save changes</Button>
</ZenProvider>;
```

Full setup (CI tokens, install errors, modes, dark mode, mobile, icons, fonts): [docs/getting-started.md](docs/getting-started.md).
Per-component docs: [docs/guidelines/](docs/guidelines/README.md) and [docs/api/](docs/api).

## Develop (repo only)

The sections below are for working on the design system in its repo; their links don't exist in the installed package.

```bash
npm install
npm run dev              # Codebase Platform at http://localhost:5173
npm run storybook        # Storybook at http://localhost:6006
npm run build            # library (dist/) + platform (dist-platform/)
```

| Check | Command |
| --- | --- |
| Types | `npx tsc --noEmit -p .` |
| Usage rules | `npm run usage:selftest` · `npm run usage:check` |
| Guidelines + props docs | `npm run guidelines:build` · `npm run guidelines:check` |
| Tokens / styles / icons | `npm run tokens:check` · `npm run styles:check` · `npm run icons:check` |
| Figma parity | `node tools/figma-contract/run-all.mjs` |
| Platform QA | `npm run platform:audit` · `npm run platform:shoot -- <page>` |
| Package | `npm run verify:package` (packs, installs into a temp app, type-checks, builds, checks budgets) |

Adding or changing a component: follow the definition of done in [AGENTS.md](AGENTS.md#b-building-or-changing-a-component).

## Architecture notes (repo only)

[Token architecture](docs/token-architecture.md) · [Text styles](docs/text-style-architecture.md) ·
[Icons](docs/icon-architecture.md) · [Usage rules](docs/component-usage-rules.md) ·
[Figma → platform workflow](docs/figma-to-platform-workflow.md) · [Platform template lock](docs/platform-template-lock.md) ·
[QA](docs/qa/platform-audit.md) · [Session logs](docs/context/README.md)

## License

Commercial. Use of Zen DS requires an active licence from Dizai Studio; see [LICENSE.md](LICENSE.md).
