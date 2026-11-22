import { typographyStyles } from "../../tokens/typography.generated";

/*
 * VisuallyHidden's framework-free part (the web core, src/core): the elements it renders and its class, shared by
 * React's VisuallyHidden and the Vue port.
 */

export const visuallyHiddenElements = ["span", "div", "p", "label", "legend", "a", "h1", "h2", "h3", "h4", "h5", "h6"] as const;
export type VisuallyHiddenElement = (typeof visuallyHiddenElements)[number];

/** A focusable one shows as a Body/Base/Medium pill while it has focus. */
export const visuallyHiddenClass = (focusable: boolean) => ["zen-visually-hidden", focusable ? typographyStyles["Body/Base/Medium"] : undefined];
