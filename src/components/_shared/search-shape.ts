import { createContext } from "react";

/**
 * The shape a container gives the Searches inside it that set none (user 2026-10-17: a phone's built-in search is
 * Rounded by default, and a Search can still say `shape="default"`). TopNavigation's control bar, BottomSheet's
 * search and an AppShell on a phone (its mobile structure, or the drawer under tablet width; user 2026-10-21) provide
 * `rounded`; everywhere else a Search keeps `default`.
 */
export const SearchShapeContext = createContext<"default" | "rounded" | undefined>(undefined);
