import type { ParitySpec } from "../../../parity";

const noop = () => {};

export default {
  InlineMessage: {
    // The playground: Info, title and caption, the close control, no action.
    base: { theme: "info", title: "Invites expire after 7 days", children: "Resend the invite from Members if a teammate missed it.", onClose: noop },
    cases: [
      { $label: "theme omitted (neutral)", theme: undefined },
      { $label: "caption only", title: undefined },
      { $label: "title only", children: undefined },
      { action: { label: "Learn more", onClick: noop } },
      { $label: "no close", onClose: undefined, action: { label: "Learn more" } },
      { icon: false },
      { icon: { $: "Icon", name: "icon-check-line", size: "sm" } },
      { theme: "custom", icon: { $: "img", src: "/figma.png", alt: "", loading: "lazy" } },
      { title: { $: "strong", children: "Invites" }, children: [{ $: "span", children: "Resend it from " }, { $: "a", href: "/members", children: "Members" }] },
      { closeLabel: "Hide the tip" },
      { theme: "warning", title: "", children: "Storage almost full." },
      // Only data-* reach the root; the component's own data-tone wins.
      { class: "form-hint", id: "dropped", style: { marginTop: "8px" }, "data-testid": "hint", "data-tone": "ignored" },
    ],
  },
} satisfies ParitySpec;
