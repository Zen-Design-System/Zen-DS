# Figma variable import report

- Import date: 2026-09-21
- Source: 11 JSON files exported from Figma
- Destination: `tokens/source/figma/`
- Import mode: read-only; no Figma changes

## Result

| Check | Result |
| --- | ---: |
| Collections | 11/11 |
| Variables | 2,356/2,356 |
| Duplicate token names | 0 |
| CSS-name collisions | 0 |
| Missing mode values | 0 |
| Missing alias targets | 0 |
| Circular aliases | 0 |
| Values incompatible with declared type | 0 |

## Difference from the 2026-09-08 audit

The earlier MCP audit found 2,342 variables. The JSON export contains 2,356, an increase of 14 variables.

| Collection | Audit | Export | Difference |
| --- | ---: | ---: | ---: |
| Global Colors | 1,152 | 1,152 | 0 |
| Global Dimensions | 33 | 33 | 0 |
| Base Colors (Project) | 322 | 329 | +7 |
| Mode Colors (Semantic) | 402 | 407 | +5 |
| Component Theme | 108 | 109 | +1 |
| Component Size | 186 | 186 | 0 |
| Spacing | 22 | 22 | 0 |
| Corner Radius | 25 | 25 | 0 |
| Emphasis Level | 5 | 6 | +1 |
| Breakpoint & Grids | 9 | 9 | 0 |
| Typography Configuration | 78 | 78 | 0 |
| **Total** | **2,342** | **2,356** | **+14** |

Mode names also changed in the newer export:

- Component Theme now includes `Neutral - S3` and uses spaced names such as `Neutral - S1`.

## Intentional mode cleanup

After import, the runtime source was narrowed to the modes used by Zen DS:

- Base Colors (Project): retained `Zen`; removed `Chat`, `VT`, and `Ecom-Demo`.
- Typography Configuration: retained `Dashboard`, `Popular`, and `Mobile`; removed `Ecom-Demo`.

The original exported files remain outside the repository at `/Users/vuduong/Documents/Zen-Variables/`, so the removed modes can be recovered if needed.

## Generated artifacts

- `src/styles/tokens.css`: CSS custom properties for every collection and mode.
- `src/tokens/generated.ts`: typed token references and collection contracts.
- `src/tokens/catalog.generated.json`: full Storybook token catalog.
- `src/styles/typography.css`: text-style classes from the available Figma text-style snapshot.

Aliases are emitted as CSS custom-property references. For example:

```css
--zen-spacing-padding-medium: var(--zen-dm-16);
```

They are not flattened to literal values, so changes continue to flow from primitive to semantic and component layers.
