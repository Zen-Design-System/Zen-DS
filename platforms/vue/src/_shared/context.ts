import { computed, inject, type ComputedRef, type InjectionKey } from "vue";
import { resolveZenLabels, type ResponsiveBreakpoint, type ZenLabels } from "@zen-ds/core";

/*
 * The ZenProvider context (React: components/_shared/zen-context.ts). The Vue ZenProvider comes with the second wave;
 * until then every component reads the defaults outside a provider, as React does: English labels, en-US.
 */
export interface ZenContextValue {
  theme?: "light" | "dark";
  breakpoint?: ResponsiveBreakpoint;
  locale?: string;
  /** Built-in component text for `locale`, with the providers' overrides. */
  labels?: ZenLabels;
}

export const zenContextKey: InjectionKey<ZenContextValue> = Symbol("zen");

/** The nearest provider's modes, or null outside any provider. */
export const useZen = (): ZenContextValue | null => inject(zenContextKey, null);

const defaultLabels = resolveZenLabels();
/** Built-in UI text of Zen components for the nearest provider's locale (English outside any provider). */
export function useZenLabels(): ComputedRef<ZenLabels> {
  const zen = useZen();
  return computed(() => zen?.labels ?? defaultLabels);
}
