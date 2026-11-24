import { inject, type InjectionKey } from "vue";

/*
 * What the AppShell tells the chrome inside it (React: AppShell/context.ts AppShellChromeContext). The Vue AppShell
 * (wave 3) provides it; outside one, parts read null and follow the provider's breakpoint.
 */
export interface AppShellChrome {
  /** The drawer layout on a phone (the shell narrower than 744): a page header's trail gives way to Back (§17). */
  phone: boolean;
}

export const appShellChromeKey: InjectionKey<() => AppShellChrome | null> = Symbol("zen-app-shell-chrome");

/** The nearest AppShell's chrome, read at render time; null outside one. */
export function useAppShellChrome(): () => AppShellChrome | null {
  return inject(appShellChromeKey, () => null);
}
