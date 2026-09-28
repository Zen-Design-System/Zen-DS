import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { typographyStyles } from "../../tokens/typography.generated";
import "./visually-hidden.css";

export const visuallyHiddenElements = ["span", "div", "p", "label", "legend", "a", "h1", "h2", "h3", "h4", "h5", "h6"] as const;
export type VisuallyHiddenElement = (typeof visuallyHiddenElements)[number];

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  /**
   * Element to render. Default span: inline, so it is valid inside buttons, links and table headers. Use div or p for a
   * block, h2–h6 for a heading that names a region only screen readers need, label (with htmlFor) for a hidden field
   * label, and a (with href and focusable) for a skip link.
   */
  as?: VisuallyHiddenElement;
  /**
   * Shows the content while it, or a link or button inside it, has focus: a Surface pill (Body/Base/Medium, Subtle
   * ring) at the top-start corner of the nearest positioned ancestor, above the page. Use it for skip links. Default false.
   */
  focusable?: boolean;
  /** With `as="a"`: the link target, e.g. "#main". */
  href?: string;
  /** With `as="label"`: the id of the control it labels. */
  htmlFor?: string;
  /** The text for assistive technology (and for the visible pill while a focusable one has focus). */
  children?: ReactNode;
}

/**
 * Content for assistive technology only. It is clipped to a 1px box (no layout impact) but stays in the accessibility
 * tree, so screen readers read it and in-page search finds it. Use it to name icon-only table headers, add context to
 * repeated links ("Read more about …"), announce status (role="status") and build skip links (`focusable`).
 * No Figma node: this is an accessibility primitive with no visual design until a focusable one receives focus.
 *
 *   <VisuallyHidden>Actions</VisuallyHidden>
 *   <VisuallyHidden as="a" href="#main" focusable>Skip to main content</VisuallyHidden>
 */
export const VisuallyHidden = forwardRef<HTMLElement, VisuallyHiddenProps>(function VisuallyHidden(
  { as: Element = "span", focusable = false, className, children, ...rest },
  ref,
) {
  return (
    <Element
      {...rest}
      ref={ref as never}
      className={["zen-visually-hidden", focusable ? typographyStyles["Body/Base/Medium"] : undefined, className].filter(Boolean).join(" ")}
      data-focusable={focusable ? "true" : undefined}
    >
      {children}
    </Element>
  );
});
