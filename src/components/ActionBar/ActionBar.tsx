import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { Button, type ButtonLevel } from "../Button";
import "./action-bar.css";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export const actionBarPositions = ["sticky", "fixed", "static"] as const;
export type ActionBarPosition = (typeof actionBarPositions)[number];
export const actionBarDirections = ["vertical", "horizontal"] as const;
export type ActionBarDirection = (typeof actionBarDirections)[number];
export const actionBarSurfaces = ["default", "alt", "none"] as const;
export type ActionBarSurface = (typeof actionBarSurfaces)[number];

/** A button the ActionBar renders itself (Large when vertical, Medium when horizontal), in the right order. */
export interface ActionBarAction {
  /** Button label: a verb that names the outcome ("Add to cart", "Save changes"), never "OK" or "Submit". */
  label: ReactNode;
  onClick?: () => void;
  /** Defaults: primaryAction → primary, secondaryAction → tertiary. Use danger for an irreversible primary. */
  level?: ButtonLevel;
  /** Only while a precondition is unmet; say why nearby (the summary is a good place). */
  disabled?: boolean;
  /** A leading icon node, e.g. <Icon name="icon-shopping-cart-line" decorative />. */
  startIcon?: ReactNode;
  /** "submit" submits the form the bar sits in (or the form named by `form`). Default "button". */
  type?: "button" | "submit";
  /** The id of the form to submit when the bar sits outside it. */
  form?: string;
}

export interface ActionBarProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * sticky (default): stays at the bottom of the scrolling area while the content above scrolls, and settles at the end
   * of it. fixed: pinned to the bottom of the viewport; an invisible spacer of the bar's height keeps the end of the page
   * reachable. static: in the flow, e.g. the last row of a card.
   */
  position?: ActionBarPosition;
  /**
   * vertical (default, phones and narrow panels): full-width stacked buttons, Primary on top. horizontal (desktop): the
   * summary at the start, buttons hug their labels at the end, Tertiary then Primary; when the bar itself is narrower
   * than 480px the summary takes its own row and the buttons split the next one (the Bottom-Sheet dual footer).
   */
  direction?: ActionBarDirection;
  /**
   * default: Surface/Default with a Pale (Border/Neutral/Pale) top rule. alt: Surface/Alt with the same rule. none: no
   * fill and no rule, for a static bar inside a container that already has one. Never a drop shadow.
   */
  surface?: ActionBarSurface;
  /** The one main action (level primary). Rendered first (top) when vertical and last (end) when horizontal. */
  primaryAction?: ActionBarAction;
  /** One alternative (level tertiary), next to the primary: below it when vertical, before it when horizontal. */
  secondaryAction?: ActionBarAction;
  /** Context for the actions: a total, a selection count or a status line. Above the buttons when vertical, at the start when horizontal. */
  summary?: ReactNode;
  /**
   * Custom actions (Buttons, in visual order: Primary first when vertical, last when horizontal). With primaryAction /
   * secondaryAction they sit on the side away from the Primary.
   */
  children?: ReactNode;
}

function actionButton(action: ActionBarAction, fallbackLevel: ButtonLevel, size: "md" | "lg") {
  return (
    <Button key={fallbackLevel} appearance="main" level={action.level ?? fallbackLevel} size={size} disabled={action.disabled} startIcon={action.startIcon} type={action.type ?? "button"} form={action.form} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

/**
 * The footer bar that holds a screen's main actions: the mobile footer CTA (Large, full width, Primary on top) and the
 * sticky action row of desktop detail and edit pages (Tertiary · Primary at the end). Surface/Default with a
 * Border/Neutral/Pale top rule, padding Spacing/Padding/Small × Margin/Comfortable, and a bottom padding that clears the
 * device safe area (`--zen-safe-area-bottom`, else `env(safe-area-inset-bottom)`).
 *
 *   <ActionBar primaryAction={{ label: "Add to cart", onClick: add }} secondaryAction={{ label: "Save for later", onClick: save }} />
 */
export const ActionBar = forwardRef<HTMLDivElement, ActionBarProps>(function ActionBar(
  { position = "sticky", direction = "vertical", surface = "default", primaryAction, secondaryAction, summary, children, className, ...rest },
  ref,
) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [spacer, setSpacer] = useState(0);
  const [narrow, setNarrow] = useState(false);
  const setRef = useCallback((node: HTMLDivElement | null) => {
    barRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }, [ref]);
  // A fixed bar leaves the flow: an in-flow spacer of its height keeps the last content from hiding underneath it.
  useIsomorphicLayoutEffect(() => {
    const element = barRef.current;
    if (position !== "fixed" || !element) { setSpacer(0); return undefined; }
    const update = () => setSpacer(element.offsetHeight);
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [position]);
  // A horizontal bar in a narrow window or panel splits its buttons over the width instead of wrapping them one by one.
  useIsomorphicLayoutEffect(() => {
    const element = barRef.current;
    if (direction !== "horizontal" || !element || typeof ResizeObserver === "undefined") { setNarrow(false); return undefined; }
    const update = () => setNarrow(element.clientWidth > 0 && element.clientWidth < 480);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [direction]);

  const size = direction === "vertical" ? "lg" : "md";
  const primary = primaryAction ? actionButton(primaryAction, "primary", size) : null;
  const secondary = secondaryAction ? actionButton(secondaryAction, "tertiary", size) : null;
  const named = Boolean(rest["aria-label"] || rest["aria-labelledby"]);
  return (
    <>
      {position === "fixed" ? <div className="zen-action-bar-spacer" style={{ height: spacer }} aria-hidden="true" /> : null}
      <div
        role={named ? "group" : undefined}
        {...rest}
        ref={setRef}
        className={["zen-action-bar", className].filter(Boolean).join(" ")}
        data-position={position}
        data-direction={direction}
        data-narrow={direction === "horizontal" && narrow ? "true" : undefined}
        data-surface={surface}
      >
        {summary ? <div className="zen-action-bar__summary">{summary}</div> : null}
        <div className="zen-action-bar__actions">
          {direction === "vertical" ? <>{primary}{secondary}{children}</> : <>{children}{secondary}{primary}</>}
        </div>
      </div>
    </>
  );
});
