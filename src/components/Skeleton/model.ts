/*
 * Skeleton's framework-free part (the web core, src/core): lines, sizes, shapes and the class a skeleton carries. React's
 * SkeletonText, SkeletonHeading and SkeletonShape and the Vue port all draw from it (tools/code-languages/vue-parity.mjs).
 */

export const skeletonTextLines = [1, 2, 3, 5] as const;
export const skeletonHeadingSizes = ["small", "medium", "large"] as const;
export const skeletonShapes = ["rectangle", "pill", "round", "square"] as const;
export const skeletonShapeSizes = ["2xsmall", "xsmall", "small", "medium", "large"] as const;
/** Short (canonical) or long Figma spelling — both render the same. */
export type SkeletonHeadingSize = "sm" | "md" | "lg" | "small" | "medium" | "large";
export type SkeletonShape = (typeof skeletonShapes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type SkeletonShapeSize = "2xs" | "xs" | "sm" | "md" | "lg" | "2xsmall" | "xsmall" | "small" | "medium" | "large";

/** The root's class: the part's own, plus the pulse while `animated` (CSS turns it off for reduced motion). */
export const skeletonClass = (base: string, animated: boolean) => [base, animated ? "zen-skeleton--animated" : ""].filter(Boolean).join(" ");

/** One key per bar of a SkeletonText: at least one, a fraction rounds down. */
export const skeletonTextBars = (lines: number) => Array.from({ length: Math.max(1, lines) }, (_, index) => index);
