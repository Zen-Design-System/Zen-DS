import { createContext, useContext, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { ZenPortalProvider } from "../../../components/Portal";
import { ZenProvider } from "../../../components/Provider";
import { useStudio } from "../store";
import "./shell.css";

/*
 * The Studio chrome's token modes: Component Theme Neutral-S7, Compact, Typography Dashboard, the chrome light/dark.
 * Each chrome region (toolbar, side panels, canvas overlays) is its own scope instead of one provider around the app:
 * tokens.css re-resolves the component theme for every [data-theme] under a [data-component-theme] ancestor, so an
 * S7 ancestor would leak into the canvas previews. Overlays of the chrome portal into one shared chrome portal root.
 */

export const ChromePortalContext = createContext<HTMLElement | null>(null);

export const chromeModes = { componentTheme: "neutral-s7", density: "compact", typography: "dashboard" } as const;

type ChromeScopeProps = Omit<HTMLAttributes<HTMLElement>, "style"> & { as?: ElementType; className?: string; children?: ReactNode; inert?: boolean };

export function ChromeScope({ as = "div", className, children, ...rest }: ChromeScopeProps) {
  const theme = useStudio((state) => state.chromeTheme);
  const portal = useContext(ChromePortalContext);
  return (
    <ZenProvider
      {...rest}
      as={as}
      className={["studio-chrome", className].filter(Boolean).join(" ")}
      theme={theme}
      componentTheme={chromeModes.componentTheme}
      density={chromeModes.density}
      typography={chromeModes.typography}
      brand="zen"
      breakpoint="desktop"
      paint={false}
      portal={false}
      syncDocument={false}
    >
      <ZenPortalProvider container={portal}>{children}</ZenPortalProvider>
    </ZenProvider>
  );
}

/** The data-* modes of the chrome, for plain elements (the chrome portal root). */
export function useChromeAttributes() {
  const theme = useStudio((state) => state.chromeTheme);
  return { "data-brand": "zen", "data-theme": theme, "data-component-theme": chromeModes.componentTheme, "data-density": chromeModes.density, "data-typography": chromeModes.typography, "data-breakpoint": "desktop" } as const;
}
