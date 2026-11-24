import type { ParitySpec } from "../../../parity";

// The base icon is a core icon (the playground's icon-colors-line loads lazily, which React SSR cannot wait for).
// DockIconTheme is a named type, so the generated matrix does not reach its members: one case per theme and background.
const themes = ["neutral", "accent", "blue", "bronze", "brown", "crimson", "cyan", "golden", "green", "indigo", "mint", "orange", "pink", "plum", "purple", "red", "sky", "teal", "violet", "yellow", "inverse", "on-color", "pale", "surface", "emoji"] as const;

export default {
  DockIcon: {
    base: { icon: "icon-home-03-line", emoji: "🎨", theme: "accent", size: "medium", background: "solid" },
    cases: [
      ...themes.map((theme) => ({ theme })),
      ...themes.map((theme) => ({ theme, background: "subtle" })),
      { label: "Design tokens" },
      { theme: "emoji", emoji: undefined, $label: "emoji theme, default glyph" },
      { theme: "emoji", emoji: { $: "strong", children: "🚀" } },
      { icon: undefined, $label: "default icon" },
      { size: "2xl", label: "Projects", theme: "blue", background: "subtle" },
      { class: "row-mark", style: { opacity: 0.5 }, id: "mark", title: "dropped", "data-testid": "dock", "data-size": "ignored" },
    ],
  },
} satisfies ParitySpec;
