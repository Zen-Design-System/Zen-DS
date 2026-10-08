import { createContext, useContext } from "react";

/**
 * What an AppShell tells the Sidebar inside it, however deep (a Sidebar wrapped in an app component included): the rail
 * state the shell owns (`collapsed`, undefined when the Sidebar keeps its own), `expand` for the rail's Search button,
 * and `drawer` while it renders in the navigation drawer (always expanded, no collapse control). Internal: AppShell
 * provides it, Sidebar reads it.
 */
export interface SidebarShellState {
  collapsed?: boolean;
  expand?: () => void;
  drawer?: boolean;
}

export const SidebarShellContext = createContext<SidebarShellState | null>(null);

export const useSidebarShell = () => useContext(SidebarShellContext);
