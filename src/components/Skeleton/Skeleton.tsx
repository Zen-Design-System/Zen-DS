import type { CSSProperties } from "react";
import "./skeleton.css";

export const skeletonTextLines = [1, 2, 3, 5] as const;
export const skeletonHeadingSizes = ["small", "medium", "large"] as const;
export const skeletonShapes = ["rectangle", "pill", "round", "square"] as const;
export const skeletonShapeSizes = ["2xsmall", "xsmall", "small", "medium", "large"] as const;
export type SkeletonHeadingSize = (typeof skeletonHeadingSizes)[number];
export type SkeletonShape = (typeof skeletonShapes)[number];
export type SkeletonShapeSize = (typeof skeletonShapeSizes)[number];

interface SkeletonBaseProps {
  /** Pulse while loading (off for reduced motion). */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
}

const classes = (base: string, animated: boolean, className?: string) => [base, animated ? "zen-skeleton--animated" : "", className].filter(Boolean).join(" ");

export interface SkeletonTextProps extends SkeletonBaseProps {
  /** Figma No. of line: 1 · 2 · 3 · 5 (any positive number works). */
  lines?: number;
}

/** Figma Skeleton/Body-Text (1556:17566): 8px rounded bars, gap 8; the last of several lines is 40px shorter. */
export function SkeletonText({ lines = 3, animated = true, className, style }: SkeletonTextProps) {
  return (
    <span className={classes("zen-skeleton-text", animated, className)} style={style} aria-hidden="true">
      {Array.from({ length: Math.max(1, lines) }, (_, index) => <span key={index} className="zen-skeleton__bar" />)}
    </span>
  );
}

export interface SkeletonHeadingProps extends SkeletonBaseProps {
  /** Figma Size: Large 32 · Medium 24 · Small 16 high. */
  size?: SkeletonHeadingSize;
}

/** Figma Skeleton/Heading-Text (1556:17593): a single rounded bar (Large 99px, Medium/Small 70px wide by default). */
export function SkeletonHeading({ size = "medium", animated = true, className, style }: SkeletonHeadingProps) {
  return <span className={classes("zen-skeleton-heading", animated, className)} data-size={size} style={style} aria-hidden="true" />;
}

export interface SkeletonShapeProps extends SkeletonBaseProps {
  shape?: SkeletonShape;
  /** Figma Size: Large 48 · Medium 40 · Small 32 · XSmall 24 · 2XSmall 20 high. */
  size?: SkeletonShapeSize;
}

/** Figma Skeleton/Shapes (1556:17525): Rectangle/Square Corner-Radius/Base, Pill/Round fully rounded. */
export function SkeletonShape({ shape = "rectangle", size = "medium", animated = true, className, style }: SkeletonShapeProps) {
  return <span className={classes("zen-skeleton-shape", animated, className)} data-shape={shape} data-size={size} style={style} aria-hidden="true" />;
}
