import { createContext, useContext } from "react";

/**
 * What a Sidebar tells the AppShell around it (`register`): whether it can collapse to its rail, its own `collapsed`, and
 * whether it owns the rail (its own `onCollapsedChange`, which `request` calls). The shell reads it instead of the
 * element it was given, so a Sidebar wrapped in an app component, a Stack or a Studio component collapses as one passed
 * straight in does.
 */
export interface SidebarRegistration {
  canCollapse: boolean;
  /** The Sidebar's own `collapsed` prop, as written (undefined when it has none). */
  collapsed?: boolean;
  /** Whether the Sidebar has its own `onCollapsedChange`: then it owns the rail and keeps its header control. */
  owns: boolean;
  /** Calls the Sidebar's own `onCollapsedChange` (the shell's toggle and `useAppShell()` go through it). */
  request: (collapsed: boolean) => void;
}

/**
 * What an AppShell tells the Sidebar inside it, however deep (a Sidebar wrapped in an app component included): the rail
 * state the shell owns (`collapsed`, undefined when the Sidebar keeps its own), `expand` for the rail's Search button,
 * `register` for the Sidebar beside the page, and `drawer` while it renders in the navigation drawer (always expanded,
 * no collapse control, never registered). Internal: AppShell provides it, Sidebar reads it.
 */
export interface SidebarShellState {
  collapsed?: boolean;
  expand?: () => void;
  drawer?: boolean;
  /** AppShell collapse="sidebar": the Sidebar draws the collapse control in its header and it calls this (the shell's rail). */
  toggleHere?: (collapsed: boolean) => void;
  /** Tells the shell what the Sidebar is; returns the call that takes it back (on unmount or a change). */
  register?: (registration: SidebarRegistration) => () => void;
  /** The Sidebar's Theme and Density when it sets none: Figma Layout=Grid draws Patterns/Sidebar Theme=Border,
   *  Density=Small (AppShell `pattern="grid"`); unset elsewhere. */
  theme?: "border";
  density?: "small";
}

export const SidebarShellContext = createContext<SidebarShellState | null>(null);

export const useSidebarShell = () => useContext(SidebarShellContext);
