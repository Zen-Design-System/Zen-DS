import unionSvg from "../assets/figma/sidebar/union.svg?raw";
import { Icon } from "../components/Icon";

/* The Zen wordmark (Figma Union 78.9×24) drawn inline in currentColor: an <img> of the file keeps its #111 fill and
   disappears on a dark Sidebar. The paths come from the asset itself, so it stays the one source. */
const wordmarkViewBox = /viewBox="([^"]+)"/.exec(unionSvg)?.[1] ?? "0 0 78.9004 24";
const wordmarkPaths = [...unionSvg.matchAll(/<path([^>]*)\/>/g)].map((match) => ({
  d: /\sd="([^"]+)"/.exec(match[1])?.[1] ?? "",
  evenOdd: /fill-rule="evenodd"/.test(match[1]),
}));

/**
 * Figma's sample branding for the Sidebar examples: the Zen wordmark, the collapsed Zen mark and the "Kaiz" product
 * badge. The Sidebar itself ships no product branding; apps pass their own `logo` / `logoCollapsed` / `productName`.
 */
export const figmaSidebarBrand = {
  logo: (
    <svg viewBox={wordmarkViewBox} fill="currentColor" aria-hidden="true" focusable="false">
      {wordmarkPaths.map((path, index) => <path key={index} d={path.d} fillRule={path.evenOdd ? "evenodd" : undefined} clipRule={path.evenOdd ? "evenodd" : undefined} />)}
    </svg>
  ),
  logoCollapsed: <Icon name="icon-zen" size={28} decorative />,
  productName: "Kaiz",
};
