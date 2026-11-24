import type { ParitySpec } from "../../../parity";

const noop = () => {};

export default {
  EmptyState: {
    // The playground: Medium, a caption, both CTAs (its icon-folder-line is not a core icon: React SSR renders a lazy icon
    // as a Suspense fallback, so the cases draw core icons).
    base: {
      title: "No projects yet",
      children: "Projects you create or join will show up here.",
      primaryAction: { label: "Create project", onClick: noop },
      secondaryAction: { label: "Import from Figma", onClick: noop },
    },
    cases: [
      { headingLevel: 2 },
      { headingLevel: 4 },
      { headingLevel: 5, size: "sm" },
      { headingLevel: 6 },
      { compactTitle: true, headingLevel: 2 },
      { $label: "title and illustration only", children: undefined, primaryAction: undefined, secondaryAction: undefined },
      { $label: "primary only, accent", primaryAction: { label: "Create project", level: "accent" }, secondaryAction: undefined },
      { $label: "secondary only, secondary level", primaryAction: undefined, secondaryAction: { label: "Import from Figma", level: "secondary" } },
      { illustration: false },
      { illustration: { $: "img", src: "/empty.png", alt: "", width: 200, loading: "lazy" } },
      { icon: "icon-table-line" },
      { icon: { $: "Icon", name: "icon-calendar-line", size: "2xl" } },
      { title: { $: "span", children: "No projects" }, children: [{ $: "span", children: "Read " }, { $: "a", href: "/help", children: "the guide" }] },
      // Every HTML attribute reaches the root <section>.
      { class: "page-empty", id: "empty", style: { minHeight: "320px" }, "aria-label": "Projects", "data-testid": "empty" },
    ],
  },
  EmptyStateIllustration: {
    cases: [
      { icon: "icon-table-line", size: "small" },
      { icon: { $: "Icon", name: "icon-calendar-line", size: "xl" } },
      // Only data-* reach the root; its class and aria-hidden stay its own.
      { class: "dropped", style: { opacity: 0.5 }, "data-testid": "art", "aria-hidden": "false" },
    ],
  },
} satisfies ParitySpec;
