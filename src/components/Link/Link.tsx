import { type AnchorHTMLAttributes, type ComponentPropsWithRef, type ElementType, type ReactElement, type ReactNode, type Ref } from "react";
import { Icon } from "../Icon";
import { VisuallyHidden } from "../VisuallyHidden";
import { useZenLabels } from "../_shared/zen-context";
import { externalLabelParts, linkModel, type LinkTone, type LinkUnderline } from "./model";
import "./link.css";
import "../Icon/core";

export { linkTones, linkUnderlines, type LinkTone, type LinkUnderline } from "./model";

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "color"> {
  /** Destination URL. Required unless `as` renders a router link that takes its own destination prop (e.g. `to`). */
  href?: string;
  /**
   * Opens the destination in a new tab: adds `target="_blank"`, `rel="noopener noreferrer"`, a trailing external-link icon
   * and a visually hidden “(opens in a new tab)” (in the locale's language), so the change of context is visible and announced. Use it for other
   * sites (docs, status pages, help centres), not for pages of the same app.
   */
  external?: boolean;
  /**
   * When the underline shows: `hover` (default; also on keyboard focus) for standalone links, `always` for links inside
   * running text so they never rely on colour alone, `none` only where the context already says it is a link
   * (a navigation list). Defaults to `always` when `tone="inherit"`.
   */
  underline?: LinkUnderline;
  /**
   * Colour: `hyperlink` (default) uses Content/Hyperlink Default, Pressed while pressed and Visited (see `visited`);
   * `inherit` takes the surrounding text colour (footers, captions, legal lines) and is underlined by default.
   */
  tone?: LinkTone;
  /**
   * Show the Content/Hyperlink/Visited colour once the destination has been visited. Default false: in-app links keep one
   * colour; turn it on for content links people scan repeatedly (search results, articles, docs). `hyperlink` tone only.
   */
  visited?: boolean;
  /**
   * Element or router component rendered instead of `<a>`, e.g. `as={RouterLink} to="/settings"` (React Router,
   * Next.js Link). Every other prop, the ref included, is forwarded to it.
   */
  as?: ElementType;
  /** The link text. Name the destination (“Billing settings”), never “click here”. The font comes from the surrounding Text. */
  children?: ReactNode;
  /** Ref to the rendered `<a>` element (or to the `as` component's element). */
  ref?: Ref<HTMLAnchorElement>;
}

/** `<Link as={C}>`: Link's own props plus every prop the rendered component accepts (a router link's `to`, `replace`…). */
export type PolymorphicLinkProps<C extends ElementType = "a"> = Omit<LinkProps, "as" | "ref"> & { as?: C } & Omit<ComponentPropsWithRef<C>, Exclude<keyof LinkProps, "ref"> | "as">;

/** Link's call signature: `as` decides which extra props (and which ref type) are accepted. */
export type LinkComponent = {
  <C extends ElementType = "a">(props: PolymorphicLinkProps<C>): ReactElement | null;
  displayName?: string;
};

/** The label followed by the external-link glyph. A text label keeps its last word and the glyph on one line (Chrome breaks
 *  before an inline SVG even after a word joiner); very long last words (URLs) may still wrap, so they are left alone. */
function withExternalGlyph(children: ReactNode) {
  const glyph = <span className="zen-link__external" aria-hidden="true"><Icon name="icon-link-external-line" size="1em" decorative /></span>;
  if (typeof children !== "string") return <>{children}{glyph}</>;
  const parts = externalLabelParts(children);
  if (!parts) return <>{children.trimEnd()}{glyph}</>;
  return <>{parts.lead}<span className="zen-link__keep">{parts.last}{glyph}</span></>;
}

/**
 * An inline link in the Content/Hyperlink colours (Default · Pressed · Visited). It inherits the font of the text around
 * it, so place it inside a `<Text>` or any line of copy. Links navigate; actions on the page are Buttons.
 *
 *   <Text>Invoices are in <Link href="/settings/billing">Billing settings</Link>.</Text>
 *   <Link href="https://status.zen.design" external>Status page</Link>
 *   <Link as={RouterLink} to="/projects">All projects</Link>
 */
export const Link = function Link({ as: Element = "a", href, external = false, tone = "hyperlink", underline = tone === "inherit" ? "always" : "hover", visited = false, target, rel, className, children, ref, ...rest }: LinkProps) {
  const t = useZenLabels();
  return (
    <Element
      {...rest}
      ref={ref}
      href={href}
      {...linkModel({ external, tone, underline, visited, target, rel })}
      className={["zen-link", className].filter(Boolean).join(" ")}
    >
      {external ? (
        <>
          {withExternalGlyph(children)}
          <VisuallyHidden>{` ${t.opensInNewTab}`}</VisuallyHidden>
        </>
      ) : children}
    </Element>
  );
  // Typed as LinkComponent so `as` brings its own props (`as={RouterLink} to="/x"`).
} as unknown as LinkComponent;
