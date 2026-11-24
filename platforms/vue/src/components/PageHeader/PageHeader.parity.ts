import type { ParitySpec } from "../../../parity";

const actions = [{ $: "Button", level: "tertiary", children: "Export" }, { $: "Button", level: "primary", children: "Invite member" }];
const back = { label: "Projects", onClick: () => undefined };

export default {
  PageHeader: {
    base: { title: "Team members", description: "12 members · Design workspace" },
    slots: ["breadcrumbs", "actions", "meta", "trailing", "tabs"],
    cases: [
      { actions },
      { actions, trailing: { $: "IconButton", icon: "icon-share-01-line", "aria-label": "Share" } },
      { trailing: { $: "IconButton", icon: "icon-dots-horizontal-line", "aria-label": "More" }, $label: "trailing alone" },
      { eyebrow: "Settings" },
      { eyebrow: "Settings", breadcrumbs: { $: "nav", "aria-label": "Breadcrumb", children: "Workspace / Members" }, $label: "breadcrumbs win over the eyebrow" },
      { meta: { $: "Badge", theme: "green", size: "sm", children: "Active" } },
      { childTitle: "Design team" },
      { childTitle: { $: "em", children: "Design team" }, title: { $: "span", children: "Members" } },
      { tabs: { $: "div", role: "tablist", children: "Overview" } },
      { back },
      { back, breadcrumbs: { $: "nav", children: "Workspace / Members" } },
      { headingLevel: 2, description: undefined },
      { eyebrow: { $: "strong", children: "Billing" } },
      { id: "top", class: "sticky", "data-testid": "header", "aria-label": "Page header" },
    ],
  },
} satisfies ParitySpec;
