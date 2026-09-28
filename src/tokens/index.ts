/**
 * `@zen/design-system/tokens` — typed access to the Figma variables.
 *
 *   tokens["Color/Background/Surface/Default"]  // "var(--zen-color-background-surface-default)"
 *   typographyStyles["Heading/4"]               // class name for the Heading/4 text style
 *
 * Prefer components (Text, Stack, Box…) over raw tokens; use these for the rare custom CSS-in-JS value.
 */
export { tokenCollections, tokens, type TokenCollectionName, type TokenName } from "./generated";
export { typographyStyles, type TypographyStyleName } from "./typography.generated";
