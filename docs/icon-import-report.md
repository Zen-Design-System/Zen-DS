# Icon import report

Generated from the SVG files in `icons/source/`.

## Import summary

| Check | Result |
| --- | ---: |
| SVG source files | 1,592 |
| Generated icons | 1,592 |
| Monochrome icons | 1,592 |
| Multicolor icons | 0 |
| Files with `viewBox` 0 0 20 20 | 1,592 |
| Files with another `viewBox` | 0 |
| Unsafe SVG files | 0 |
| Duplicate generated names | 0 |
| Duplicate SVG IDs across files | 0 |

The 120 files containing `clipPath` definitions are still monochrome. White paint inside `<defs>` is structural clipping data and is excluded from visible-color classification.

## Naming inventory

| Suffix | Count |
| --- | ---: |
| `-line` | 927 |
| `-solid` | 659 |
| Other naming patterns | 6 |

Prefix usage is not fully consistent: 1,585 files use `icon-`, while seven use `ic-`:

- `ic-dataflow-04-line` / `ic-dataflow-04-solid`
- `ic-figma-line`
- `ic-inbox-01-line` / `ic-inbox-01-solid`
- `ic-stars-02-line` / `ic-stars-02-solid`

The six exceptions are:

- `icon-chevron-right-line-small`
- `icon-chevron-right-line-medium`
- `icon-zen`
- `icon-building-03-line-1`
- `icon-chevron-left-line-small`
- `icon-chevron-left-line-medium`

## Review items

1. `icon-dotpoints-line` and `icon-dotpoints-solid` contain identical SVG content. Confirm whether Solid should have distinct artwork or whether one name should become an alias.
2. `icon-building-03-line-1` uses a numeric duplicate suffix. Confirm its canonical name before components consume it.
3. Confirm whether the seven `ic-` names should be normalized to the otherwise dominant `icon-` prefix.
4. There are 282 icon families without both Line and Solid variants. This may be intentional, but component documentation should not imply every icon supports both styles.

`icon-dot-number-line` has been updated to the standard 20 by 20 canvas. The remaining review items remain faithful to the exported Figma source until confirmed.
