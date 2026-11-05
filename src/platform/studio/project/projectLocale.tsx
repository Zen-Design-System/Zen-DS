import { useContext, useMemo, type ReactNode } from "react";
import { resolveZenLabels } from "../../../components/_shared/labels";
import { ZenContext, type ZenContextValue } from "../../../components/_shared/zen-context";
import { DEFAULT_LOCALE } from "../../../../tools/studio/project-theme.mjs";

/*
 * A project's language on its frames (project.json `locale`, tools/studio/project-theme.mjs PROJECT_LOCALES): what
 * ZenProvider's `locale` gives the components inside (Intl dates through useZenLocale, the built-in labels through
 * useZenLabels), as context only. No element of its own, so the canvas world and Play's device keep their DOM: the
 * element that holds the frames takes `lang` itself. US English needs none (the components' own default), so a page in
 * it renders exactly as before. Never around a root ZenProvider (ExampleCard's, in Present): it would stop being the
 * root (its toast queue, breakpoint "auto"); that provider takes `locale` itself. The Studio's chrome sets en-US
 * (ChromeScope), so a bar inside this scope stays English.
 */
export function LocaleScope({ locale, children }: { locale: string; children: ReactNode }) {
  const parent = useContext(ZenContext);
  const same = locale === (parent?.locale ?? DEFAULT_LOCALE);
  const value = useMemo<ZenContextValue | null>(() => (same ? null : { ...parent, locale, labels: resolveZenLabels(locale, parent?.labelOverrides) }), [same, parent, locale]);
  return value ? <ZenContext.Provider value={value}>{children}</ZenContext.Provider> : children;
}
