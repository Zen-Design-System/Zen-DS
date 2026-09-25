# Figma SVG source

Export the Figma Iconography components into this directory as SVG files.

Nested folders are supported:

```text
icons/source/
├── action/
│   ├── add.svg
│   └── delete.svg
└── navigation/
    └── arrow-left.svg
```

The generated names will be `action-add`, `action-delete`, and `navigation-arrow-left`.

Export requirements:

- Export the component itself, not a screenshot or PNG.
- Keep the original `viewBox`.
- Do not outline strokes unless the design requires it.
- Monochrome SVG paint is converted to `currentColor`.
- Multi-color SVGs, such as flags or social logos, preserve their source colors.
- File and folder names must be unique after conversion to kebab-case.

Run `npm run icons:build` after adding or changing SVG files.
