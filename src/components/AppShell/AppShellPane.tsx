import { useId, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { typographyStyles } from "../../tokens/typography.generated";

/** Figma Pane Theme, renamed with Card on 2026-10-21: Flat → Default, Border × Surface=Flat → Flat-Border. */
export const appShellPaneThemes = ["shadow", "default", "border", "flat-border", "pale", "subtle", "on-container", "canvas"] as const;
export type AppShellPaneTheme = (typeof appShellPaneThemes)[number];
export const appShellPaneSurfaces = ["default", "alt"] as const;
export type AppShellPaneSurface = (typeof appShellPaneSurfaces)[number];

export interface AppShellPaneProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "children"> {
  /** Figma Title (Heading/3, Content/Neutral/Strongest, one line, cut with "…"): the pane's heading and its region name. */
  title?: ReactNode;
  /** Heading level of the title. Default 2: a pane sits beside the page's h1. */
  headingLevel?: 2 | 3 | 4;
  /**
   * Figma Action: one icon action at the end of the header, usually
   * `<IconButton appearance="flat" level="secondary" size="sm" …>` (a 20px glyph with a 32px hit area).
   */
  action?: ReactNode;
  /**
   * Figma Theme (Card's Neutral themes): `shadow` Surface + Shadow/Bottom/Level-1 (default) · `default` the Surface
   * alone (`flat` until 2026-10-21) · `border` Border/Neutral/Pale · `flat-border` Surface/Flat inside that line, on a
   * Canvas/Flat page (Border × Surface=Flat until 2026-10-21) · `pale` Support/Neutral/Pale · `subtle`
   * Support/Neutral/Subtle (both with the Overlay blur) · `on-container` Surface/Flat, for a pane on a container ·
   * `canvas` no fill, for reading layouts (Docs).
   */
  theme?: AppShellPaneTheme;
  /** Figma Surface for the default and border themes: `default` Surface/Default · `alt` Surface/Alt. */
  surface?: AppShellPaneSurface;
  /** Figma Pane-Content: the pane's body (a List, a tree, filters, a summary). */
  children?: ReactNode;
  /** Figma instance overrides by layer. Written by Zen Studio; app code sets the props. */
  overrides?: NestedOverrides;
  /** The root `<section>` element. */
  ref?: Ref<HTMLElement>;
}

/**
 * Figma .Primitives/AppShell/Pane (16254:1099): a side pane of Pattern/AppShell/Desktop (List-Detail's list, Workspace's
 * and Docs' leading and trailing panes, Focus' summary). Corner-Radius/XLarge (none on Canvas); Pane-Header pads
 * Margin-Compact at the top and sides and Spacing/Padding/XSmall below, Spacing/Gap/XSmall between the title and the
 * action, which sits at the top of the title's line (Figma re-read 2026-10-26); Pane-Content pads Spacing/Padding/XSmall
 * with Spacing/Gap/XSmall between its rows. The AppShell sizes it (`leadingPane`, `trailingPane`).
 */
export function AppShellPane({ title, headingLevel = 2, action, theme = "shadow", surface = "default", children, className, overrides, ref, ...rest }: AppShellPaneProps) {
  const nest = useNested(overrides);
  const titleId = `zen-pane-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const Heading = `h${headingLevel}` as const;
  const hasHeader = Boolean(title || action);
  return (
    <section {...rest} ref={ref} className={["zen-app-shell-pane", className].filter(Boolean).join(" ")} data-tone={theme} data-surface={surface} aria-labelledby={title ? titleId : rest["aria-labelledby"]}>
      {hasHeader ? (
        <div className="zen-app-shell-pane__header">
          {title ? <Heading id={titleId} className={`zen-app-shell-pane__title ${typographyStyles["Heading/3"]}`}>{title}</Heading> : null}
          {action ? <span className="zen-app-shell-pane__action">{nest.slot(action)}</span> : null}
        </div>
      ) : null}
      <div className="zen-app-shell-pane__content">{nest.slot(children)}</div>
    </section>
  );
}
