/* The App Shell's Layout examples, one docs page per section of Figma ◇ Master-Layout · Example (15902:109717). They
   were all on the App Shell page, 49 finished apps on one page (user 2026-11-02: "cân nhắc tách example appshell ra page
   riêng cho đỡ nặng"); the App Shell page keeps the A · compositions and the shell's behaviours. Each page lists its
   examples in examples/pages/<id>.tsx and sits under App Shell in the docs navigation (PlatformApp's
   componentNavigation, which the gate and the platform audits read for their page list). */

export const appShellLayoutPageIds = ["app-shell-desktop", "app-shell-mobile", "app-shell-expressive", "app-shell-consumer", "app-shell-smart-home"] as const;
export type AppShellLayoutPage = (typeof appShellLayoutPageIds)[number];

export const appShellLayoutPages: Record<AppShellLayoutPage, { title: string; description: string }> = {
  "app-shell-desktop": {
    title: "Desktop layouts",
    description: "Desktop apps built on App Shell, by domain: a storefront under a top bar, a rail with list and detail, analytics, a workspace editor, docs, a focus flow, and the Grid layout of a dashboard and a level inside an HR app (Figma sections B and G).",
  },
  "app-shell-mobile": {
    title: "Mobile layouts",
    description: "Phone apps built on App Shell's mobile parts, by domain: a tab-bar hub, a wallet under a hero band, a feed, media with a bottom sheet, a stacked detail with an Action bar, a focus flow and a greeting home (Figma section C).",
  },
  "app-shell-expressive": {
    title: "Expressive layouts",
    description: "Consumer phone apps where App Shell's band carries the mood: a Display hero, a welcome screen, a companion home, a greeting over colour tiles and a colour band with a sheet (Figma section D).",
  },
  "app-shell-consumer": {
    title: "Consumer layouts",
    description: "Everyday consumer apps on App Shell: delivery, a shop and its product list, onboarding, an AI home, discover and one big number (Figma section E).",
  },
  "app-shell-smart-home": {
    title: "Smart home layouts",
    description: "One house through twelve phone screens on App Shell: the home and a room, then one device per screen (speaker, robot vacuum, light, climate, camera, door lock, TV, blinds), energy and scenes (Figma section F).",
  },
};
