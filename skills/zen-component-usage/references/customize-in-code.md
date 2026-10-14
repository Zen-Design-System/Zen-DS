# Customize a Zen component in code (and in Studio) without forking it

A copied or restyled component stops following Zen: token, mode and density changes skip it, the harness cannot check
it, and Studio cannot map it to its Figma set. Customize through what the component exposes, in this order.

## 1. The ladder

| Step | What you use | Example |
| --- | --- | --- |
| 1. Props | The variant props (`size`, `theme`, `level`, `state`), the API vocabulary (`value` / `defaultValue` / `onValueChange`, `checked`, `selected`, `open` / `onOpenChange`) | `<Button level="tertiary" size="sm">` |
| 2. Layout props | A prop that changes the anatomy, when the component has it | `<InputField layout="inline">` (label inside the field) |
| 3. Slots | `leading` / `trailing` (an icon name or any node), `children`, `title`, `actions`, render props | `<InputField leading={<ColorSwatch color={hex} />}>` |
| 4. Composition | Zen components inside Zen layout: `Stack` / `Grid` / `Box` with token gaps and paddings | a property panel: groups as `<Stack gap="xs">`, joined with `gap="none"` and Dividers |
| 5. A prop on the owner | When several screens need it, the owner component gets a prop (user approval: it is new API) | `layout="inline"` added to the Input family |
| 6. A new component built from Zen parts | When nothing composes it, a new component that reuses the existing ones | ColorField = the Input shell + ColorSwatch + ColorPicker (Slider, SelectField, ColorSelector inside) |

Never: a page-local copy of a component; CSS that reaches into a component's classes from an app; raw colours, px
spacing or font settings (tokens only, raw values only as `var()` fallbacks); `overrides` in app code (it is Zen
Studio's, harness `api/overrides-studio-only`).

## 2. Fix spacing at its owner

When a spacing problem shows up inside one component only, the fix belongs to that component, not to a new generic
prop: the Accordion's Title → Contents gap is 12 (one step above the 8 between the rows inside), so the rows go
straight in as `<Stack gap="xs">`. Ask before adding layout API for a one-component need.

## 3. Values have one format

Components that hold a value take and return one format: ColorField and ColorPicker a hex string (`"#1F6FEB"`,
harness `color-picker/hex-value`), DateField `MM/DD/YYYY` text plus `onDateChange(Date)`. Store what the component
returns; never feed it a colour name, `rgb()` or a token.

## 4. In Zen Studio

- Studio renders the code components: a code change reaches Studio by itself; the palette offers each component folder
  (`slots/palette.ts`, its selftest requires every folder).
- The Properties panel shows Figma's properties for a component when `tools/studio/figma-props.map.mjs` maps its set
  (`docs/figma-contracts/component-properties.json` must hold the set: capture it with `figma-props-read.js`).
- Only presentational components detach into frames; interactive ones (fields, pickers, overlays) stay components
  (`tools/studio/detach.mjs` INTERACTIVE).
- After changing a component's props, regenerate Studio's files (`compile-api-build`, `nested-layers-build`,
  `part-props-build`, `figma-props-build`, `variant-sets-build`, `library-keywords-build`) and run `npm run studio:selftest`.

## 5. Where the rules are

- Per component: `docs/guidelines/<slug>.md` (Do / Don't, props, keyboard, a11y).
- Screen rules, spacing ladder and borders: `docs/component-usage-rules.md`.
- The Figma side of the same ladder: `skills/zen-figma-design/references/customize-without-detach.md`.
