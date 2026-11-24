/*
 * PageHeader's framework-free part (the web core, src/core): the Back control's data, the title's text style and when the
 * header is on a phone. React's PageHeader and the Vue port both draw from it (tools/code-languages/vue-parity.mjs).
 */

export interface PageHeaderBack {
  /** Where Back goes, named (e.g. "Projects"). */
  label: string;
  onClick: () => void;
}

/** h1 = Heading/1 (Figma ◇ Master-Layout page title), h2 = Heading/4 (the house ladder's h2). */
export const pageHeaderTitleStyle = (level: 1 | 2) => (level === 1 ? "Heading/1" : "Heading/4") as "Heading/1" | "Heading/4";

/**
 * A phone, where the trail gives way to Back (§17): the AppShell's drawer layout under 744 (`shellPhone`, when the
 * header sits in a shell), else the provider's mobile breakpoint.
 */
export const pageHeaderOnPhone = (shellPhone: boolean | undefined, breakpoint: string | undefined) => shellPhone ?? breakpoint === "mobile";
