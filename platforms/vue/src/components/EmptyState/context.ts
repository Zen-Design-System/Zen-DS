import type { InjectionKey } from "vue";
import type { EmptyStateHeadingLevel } from "@zen-ds/core";

/**
 * Provided by a titled card (ChartCard) around its content, with the level of the card title (React:
 * EmptyStateCardContext). An Empty State inside takes the next level, the Body/Extra/Bold title style and size `sm`.
 * Internal: kept out of EmptyState.ts so the package index does not export it.
 */
export const emptyStateCardKey: InjectionKey<EmptyStateHeadingLevel | undefined> = Symbol("zen-empty-state-card");
