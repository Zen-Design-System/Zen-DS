# Token architecture

Zen DS treats the Figma file as the design source and the repository as the runtime contract.

## Layers

```text
Primitive → Semantic → Component → React component
```

- Primitive tokens hold raw palettes and dimensions.
- Semantic tokens describe UI intent and may switch by mode.
- Component tokens map semantic intent onto a component contract.
- React components consume component or semantic tokens, never raw Figma values.

## Mode axes

Modes remain independent to avoid a Cartesian product of every theme combination.

| Axis | Figma modes | Runtime representation |
| --- | --- | --- |
| Color mode | Light, Dark | `data-theme` |
| Density | Compact, Comfortable | `data-density` |
| Brand | Zen | `data-brand` (reserved; currently one mode) |
| Shape | Rounded, Smooth, Standard, Luxury | `data-radius` |
| Component theme | Neutral - S1, Brand - S1, Neutral - S2, Brand - S2, Neutral - S3, Neutral - S4 | `data-component-theme` |
| Emphasis | Medium, Strong, Light | `data-emphasis` |
| Breakpoint | Desktop, Tablet, Mobile | Media queries |
| Typography | Dashboard, Popular, Mobile | `data-typography` |

## Source files

- `tokens/source/figma.collections.json` records all 11 collections, modes and counts.
- `tokens/source/figma/*.json` contains the complete alias-preserving export for all 11 collections.
- `tokens/source/figma.used.json` remains a node snapshot used for the text-style references not included in the variable exports.
- `src/styles/tokens.css` and `src/tokens/generated.ts` are generated variable outputs.
- `src/styles/typography.css` and `src/tokens/typography.generated.ts` expose resolved Figma text styles as reusable class contracts.

The source export is intentionally separate from generated runtime tokens. Aliases such as `{dm-16}` are emitted as CSS custom-property references instead of being flattened to `16px`.

## Naming

Figma paths map to kebab-case CSS custom properties:

```text
Spacing/Padding/Medium
→ --zen-spacing-padding-medium
```

Names remain stable even if the resolved value changes.

## Current synchronization status

The repository holds 11 collections and 2,176 variables (last sync 2026-09-29). The Figma export has 192 more: the
VT, Chat, Brand-Ananas and Neutral-Ananas ramps, which the repo leaves out at the user's request. The current `Component Theme` export has 113 tokens in 6 modes and `Component Size` has 194 tokens. Validation confirms there are no duplicate names, missing mode values, missing alias targets or alias cycles.
