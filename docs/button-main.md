# Button (Main + Icon)

`Button` was the first component built through the Figma-to-code workflow. The platform page keeps the two Figma component sets together: `Button/Main` and `Button/Icon-Main`. Usage rules and the generated props table live in [guidelines/button.md](guidelines/button.md).

## React API

```tsx
<Button level="primary" size="md">
  Button
</Button>

<Button
  level="accent"
  size="lg"
  startIcon={<Icon name="icon-plus-line" decorative />}
  endIcon={<Icon name="icon-arrow-right-line" decorative />}
>
  Create item
</Button>

<IconButton
  aria-label="Add item"
  level="accent"
  icon={<Icon name="icon-plus-line" decorative />}
/>
```

### Properties

| React property | Figma property | Values |
| --- | --- | --- |
| `children` | `Text` | React content |
| `size` | `Size` | `2xs`, `xs`, `sm`, `md`, `lg`, `xl` |
| `level` (`variant` is a compatibility alias) | `Level` | `primary`, `accent`, `secondary`, `tertiary`, `danger`, `danger-subtle`, `positive`, `positive-subtle`, `surface` |
| `startIcon` | `Leading-Icon` and `Leading-Icon-Src` | React node |
| `endIcon` | `Trailing-Icon` and `Trailing-Icon-Src` | React node |
| `disabled` | `State=Disabled` | Native button attribute |

### Button/Icon-Main properties

| React property | Figma property | Values |
| --- | --- | --- |
| `icon` | `Icon-Src` | React node; use the shared `Icon` primitive |
| `size` | `Size` | `2xs`, `xs`, `sm`, `md`, `lg`, `xl` |
| `level` / `variant` | `Level` | Same levels as `Button/Main` |
| `state` | `State` | `default`, `hover`, `pressed`, `focused`, `disabled` |
| `aria-label` | Accessible name | Required when the icon has no visible text |

`Hover`, `Pressed`, and `Focused` remain native interaction states implemented with `:hover`, `:active`, and `:focus-visible`. They are not public React properties. The default native `type` is `button` to prevent accidental form submission.

## Foundation mapping

- Height, horizontal padding, label padding and gap use `Component Size / Button` variables.
- Icon dimensions use the Figma `Component Size / Button / Icon-Size/*` variables. The compact mapping is 28px (XL), 20px (L/M/S), 12px (XS/2XS); icon-only container padding is 16px (XL/L), 12px (M/S), and 8px (XS/2XS).
- Labels use the generated composite Figma Text Styles `Button-Label/XS` through `Button-Label/XL`; those styles resolve through the corresponding Typography variables.
- Font weight uses `Emphasis / Font-Weight / Semi-Bold`.
- Shape uses `Corner-Radius / Action` for the selected Button size.
- Primary, Accent and Tertiary use the available `Component Theme / Button` variables.
- Secondary, Danger and Positive levels use semantic Mode Color variables because dedicated component-theme variables are not present in the export.
- Disabled, hover, active and focus-visible styling uses the matching semantic state variables.
- `IconButton` reuses the Button level/state token contract and adds only the Figma icon-only container primitive. Its frame, slot size and padding follow the `Button/Size`, `Button/Icon-Size/*` and `Button/Spacing/*` bindings above; it is not a second styling system.

## Paint matrix gate

The exported Figma JSON is the source of truth for each level/state; background
and content are audited independently. In particular:

| Set / level | Default, hover, pressed content | Disabled background | Disabled content |
| --- | --- | --- | --- |
| Main / Primary, Accent, Danger, Positive | Their dedicated content token (`Button-*` or `On-Colors`) | `Color/Background/Solid-Disabled` | `Color/Content/Inverse/Strongest` |
| Main / Danger Subtle, Positive Subtle | Light; pressed switches to Negative/Positive **Base** | `Color/Background/Subtle-Disabled` | `Color/Content/Disabled` |
| Overlay / Inverse | `Color/Content/Neutral/Strongest` | `Color/Background/Inverse-Disabled` | `Color/Content/On-Black-Overlay/Disabled` |
| Overlay / White | global `Black` | `Color/Background/White-Disabled` | `Color/Content/On-Black-Overlay/Disabled` |
| Overlay / White Overlay, Black Overlay | global `White` | `Color/Background/White-Disabled` / `Inverse-Disabled` | `Color/Content/On-Black-Overlay/Disabled` |

The label and the shared `Icon` primitive must resolve the same computed
content color. Any future button token change must update this matrix and run a
browser assertion for the changed default/hover/pressed/disabled branches.

The Storybook toolbar exposes color mode, component theme, density, typography configuration, radius and emphasis so the Button can be reviewed against every variable collection mode.
