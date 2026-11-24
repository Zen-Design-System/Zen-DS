import type { ParitySpec } from "../../../parity";

const noop = () => {};

export default {
  AlertBanner: {
    // The playground: Default theme, Medium, the theme icon, an action and the close control.
    base: { children: "Scheduled maintenance on Sunday, 02:00–03:00.", action: { label: "Details", onClick: noop }, onClose: noop },
    cases: [
      { $label: "no action, no close", action: undefined, onClose: undefined },
      { $label: "small hides the action", size: "sm", theme: "warning" },
      { leading: false },
      { leading: "icon-star-01-solid", theme: "info" },
      { leading: { $: "Icon", name: "icon-check-line", size: "sm" } },
      { $label: "leading text", leading: "!" },
      { closeLabel: "Hide the notice" },
      { theme: "negative", children: { $: "strong", children: "We couldn't sync your latest changes." } },
      { theme: "positive", size: "small", onClose: undefined },
      // Only data-* reach the root; the component's own data-tone / data-size win.
      { class: "page-banner", id: "dropped", style: { marginTop: "8px" }, "data-testid": "banner", "data-tone": "ignored", "aria-live": "off" },
    ],
  },
} satisfies ParitySpec;
