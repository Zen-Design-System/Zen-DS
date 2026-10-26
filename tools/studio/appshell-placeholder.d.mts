// Types for appshell-placeholder.mjs (Figma's AppShell placeholders, ◇ Master-Layout 16254:1057).
export type AppShellPlaceholderPattern = "sidebar" | "list-detail" | "top-bar" | "workspace" | "docs" | "focus" | "grid";
export type AppShellPlaceholderCollapse = "header" | "sidebar" | "none";
export type AppShellPlaceholderTop = "bar" | "band" | "band-sheet" | "media";
export type AppShellPlaceholderBottom = "tab-bar" | "floating" | "actions" | "none";
export declare const APPSHELL_COPY: Readonly<Record<"label" | "workspace" | "master" | "child" | "heading" | "secondary" | "mainAction" | "emptyTitle" | "emptyCaption" | "block" | "paneTitle" | "stepTitle" | "stepCaption" | "saveExit" | "search" | "mobileHeading" | "hero" | "backdrop" | "button" | "account" | "banner", string>>;
export declare const APPSHELL_MEDIA: Readonly<{ logo: string; account: string }>;
export declare const APPSHELL_DESKTOP_VARIANTS: ReadonlyArray<{ name: string; pattern: AppShellPlaceholderPattern; collapse: AppShellPlaceholderCollapse }>;
export declare const APPSHELL_MOBILE_VARIANTS: ReadonlyArray<{ name: string; device: "phone" | "tablet"; top: AppShellPlaceholderTop; bottom: AppShellPlaceholderBottom }>;
export type AppShellPlaceholderOptions = {
  /** The call an action makes from a label expression (`"Main Action"`, `item.label`), or null for no handler. */
  act?: (label: string) => string | null;
  /** The pictures' attribute values (`"zen-media:…"` quoted, or `{logo}`). */
  media?: { logo: string; account: string };
};
export declare function appShellParts(options?: AppShellPlaceholderOptions): {
  block: (label?: string, height?: number, radius?: "lg" | "md") => string;
  logo: string;
  sidebar: (options?: { footer?: number; brand?: boolean }) => string;
  crumbs: string;
  /** A root page's trail: Master alone (two crumbs make a child screen). */
  rootCrumbs: string;
  actions: (options?: { notifications?: "count" | "dot" | "none" }) => string;
  main: string;
  tabs: string;
  search: string;
  focusActions: string;
  body: (options?: { size?: "sm" | "md" }) => string;
  pane: (options?: { title?: string; theme?: string; surface?: "default" | "alt"; action?: boolean; height?: number }) => string;
  progress: string;
  floatingActions: string;
  banner: string;
  sidePanel: string;
  topNavigation: (options?: { top?: AppShellPlaceholderTop }) => string;
  hero: string;
  backdrop: string;
  bottomNavigation: (options?: { bottom?: AppShellPlaceholderBottom }) => string;
  actionBar: string;
};
export declare function appShellPlaceholderCode(options?: AppShellPlaceholderOptions & {
  pattern?: AppShellPlaceholderPattern;
  collapse?: AppShellPlaceholderCollapse;
  /** Draw the desktop parts (default true); false: a phone-only shell. */
  desktop?: boolean;
  /** false: the Sidebar without Figma's sample workspace switcher (a page's own AppShell). */
  brand?: boolean;
  /** true: a root page's trail (Master alone) in the header's top row. */
  root?: boolean;
  mobile?: { top?: AppShellPlaceholderTop; bottom?: AppShellPlaceholderBottom } | null;
}): string;
export declare function componentsOf(code: string): string[];
