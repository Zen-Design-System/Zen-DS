# Text Style architecture

The source of truth for local Figma Text Styles is `styles/source/figma/text-styles.json`. It currently contains all 35 local Text Styles from `ZEN Kaiz (Official-Sep2026)`.

The export contains family, named font weight, font size, letter-spacing value and unit, and text case. It does not contain line-height. The generator therefore connects every style to the matching Typography Configuration variables for family, size, line height and letter spacing, and to Emphasis Level for font weight.

The Storybook display also derives a relative tracking percentage with `letterSpacingPx / fontSizePx × 100`. For example, `-0.32px` at `16px` displays as `-2%`, while the generated CSS continues to use the original mode-aware pixel variable.

Run:

```bash
npm run tokens:build
npm run styles:build
npm run styles:check
```

Generated outputs:

- `src/styles/typography.css`
- `src/tokens/typography.generated.ts`
- `src/styles/generated/text-style-manifest.json`

The build validates that the exported Figma family, size and pixel letter spacing match the Dashboard mode of the linked variables. A mismatch fails generation instead of silently producing a divergent style.

Figma `PIXELS` letter spacing remains connected to the mode-aware Typography variable. A future `PERCENT` value will be converted to `em` in the generated CSS.

`Body/Code/Bold` is the known exception in the source: its exported font name is JetBrains Mono Regular, while its semantic style name and existing variable binding require Bold emphasis. The generator follows the semantic Bold contract.
