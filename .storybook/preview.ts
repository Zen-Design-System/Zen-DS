import type { Preview } from "@storybook/react-vite";
import "../src/styles/fonts.css";
import "../src/styles/reset.css";
import "../src/styles/tokens.css";
import "../src/styles/typography.css";
import "../src/styles/style-effects.css";
import "../src/styles/foundations.css";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    docs: {
      codePanel: true,
      controls: { sort: "requiredFirst" },
    },
    a11y: { test: "todo" },
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: "Semantic color mode",
      defaultValue: "light",
      toolbar: {
        icon: "mirror",
        items: ["light", "dark"],
      },
    },
    density: {
      description: "Component density",
      defaultValue: "comfortable",
      toolbar: {
        icon: "component",
        items: ["compact", "comfortable"],
      },
    },
    componentTheme: {
      description: "Component color theme",
      defaultValue: "neutral-s1",
      toolbar: {
        icon: "paintbrush",
        items: ["neutral-s1", "brand-s1", "neutral-s2", "brand-s2", "neutral-s3"],
      },
    },
    typography: {
      description: "Typography configuration",
      defaultValue: "dashboard",
      toolbar: {
        icon: "paragraph",
        items: ["dashboard", "popular", "mobile"],
      },
    },
    radius: {
      description: "Corner radius mode",
      defaultValue: "rounded",
      toolbar: {
        icon: "circlehollow",
        items: ["rounded", "smooth", "standard", "luxury"],
      },
    },
    emphasis: {
      description: "Emphasis level",
      defaultValue: "medium",
      toolbar: {
        icon: "bold",
        items: ["medium", "strong"],
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.theme = context.globals.theme;
      document.documentElement.dataset.density = context.globals.density;
      document.documentElement.dataset.componentTheme = context.globals.componentTheme;
      document.documentElement.dataset.typography = context.globals.typography;
      document.documentElement.dataset.radius = context.globals.radius;
      document.documentElement.dataset.emphasis = context.globals.emphasis;
      return Story();
    },
  ],
};

export default preview;
