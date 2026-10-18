import { createContext, useContext } from "react";

/** `desktop`: the pattern's desktop structure (the shell is 1024px or wider) · `drawer`: narrower, without mobile parts:
 *  the header with a menu button, the Sidebar in a modal drawer · `mobile`: narrower, with mobile parts (phones and iPad
 *  portrait): Pattern/AppShell/Mobile. */
export type AppShellLayout = "desktop" | "drawer" | "mobile";

export interface AppShellContextValue {
  /** Which structure the shell draws now. */
  layout: AppShellLayout;
  /** Whether the Sidebar is collapsed to its icon rail (desktop). */
  sidebarCollapsed: boolean;
  /** Collapses the Sidebar to its rail or expands it again (desktop). */
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Collapses an expanded Sidebar, expands a collapsed one. */
  toggleSidebar: () => void;
  /** Whether the navigation drawer is open (drawer and mobile layouts). */
  navOpen: boolean;
  /** Opens the navigation drawer (drawer and mobile layouts), e.g. from a BottomNavigation More. */
  openNav: () => void;
  /** Closes the navigation drawer; focus returns to the button that opened it. */
  closeNav: () => void;
}

export const AppShellContext = createContext<AppShellContextValue | null>(null);

/**
 * The nearest AppShell's layout and navigation state, or null outside one. For a navigation of your own: read
 * `sidebarCollapsed` to draw its rail, or call `closeNav()` after a route change the drawer did not see.
 */
export function useAppShell(): AppShellContextValue | null {
  return useContext(AppShellContext);
}

/** What the shell tells its AppShellHeader (internal): which toggle the top row starts with and its state. */
export interface AppShellChrome {
  toggle: "collapse" | "menu" | null;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  sidebarId: string;
  navOpen: boolean;
  openNav: () => void;
  registerHeader: (element: HTMLElement | null) => void;
}

export const AppShellChromeContext = createContext<AppShellChrome | null>(null);
