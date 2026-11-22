import type { ParitySpec } from "../../../parity";

export default {
  Link: {
    base: { href: "/settings/billing", children: "Billing settings" },
    cases: [
      { external: true, href: "https://status.zen.design", children: "Status page" },
      { external: true, children: "https://status.zen.design/incidents/2026-11-22" },
      { external: true, children: "Docs" },
      { external: true, children: { $: "strong", children: "Docs" } },
      { tone: "inherit", visited: true },
      { target: "_blank", rel: "author" },
      { as: "button", type: "button", href: undefined, children: "Open" },
      { class: "footer-link", "aria-current": "page" },
    ],
  },
} satisfies ParitySpec;
