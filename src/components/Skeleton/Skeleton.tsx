import type { CSSProperties, Ref } from "react";
import { scaleKey } from "../_shared/scale";
import { skeletonClass, skeletonHeadingSizes, skeletonShapeSizes, skeletonTextBars, type SkeletonHeadingSize, type SkeletonShape as SkeletonShapeKind, type SkeletonShapeSize } from "./model";
import "./skeleton.css";
import { dataAttributes } from "../_shared/data-attributes";

export { skeletonHeadingSizes, skeletonShapes, skeletonShapeSizes, skeletonTextLines, type SkeletonHeadingSize, type SkeletonShapeSize } from "./model";
/** Declared here so the type and the SkeletonShape component share the name (index.ts exports it as SkeletonShapeKind). */
export type SkeletonShape = SkeletonShapeKind;

interface SkeletonBaseProps {
  /** Pulse while loading (off for reduced motion). */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Forwarded to the root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}

const classes = (base: string, animated: boolean, className?: string) => [skeletonClass(base, animated), className].filter(Boolean).join(" ");

export interface SkeletonTextProps extends SkeletonBaseProps {
  /** Figma No. of line: 1 · 2 · 3 · 5 (any positive number works). */
  lines?: number;
}

/** Figma Skeleton/Body-Text (1556:17566): 8px rounded bars, gap 8; the last of several lines is 40px shorter. */
export function SkeletonText({ lines = 3, animated = true, className, style, ref, ...rest }: SkeletonTextProps) {
  return (
    <span {...dataAttributes(rest)} ref={ref} className={classes("zen-skeleton-text", animated, className)} style={style} aria-hidden="true">
      {skeletonTextBars(lines).map((index) => <span key={index} className="zen-skeleton__bar" />)}
    </span>
  );
}

export interface SkeletonHeadingProps extends SkeletonBaseProps {
  /** Figma Size: Large 32 · Medium 24 · Small 16 high. Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: SkeletonHeadingSize;
}

/** Figma Skeleton/Heading-Text (1556:17593): a single rounded bar (Large 99px, Medium/Small 70px wide by default). */
export function SkeletonHeading({ size: sizeProp = "md", animated = true, className, style, ref, ...rest }: SkeletonHeadingProps) {
  const size = scaleKey(sizeProp, skeletonHeadingSizes);
  return <span {...dataAttributes(rest)} ref={ref} className={classes("zen-skeleton-heading", animated, className)} data-size={size} style={style} aria-hidden="true" />;
}

export interface SkeletonShapeProps extends SkeletonBaseProps {
  shape?: SkeletonShape;
  /** Figma Size: Large 48 · Medium 40 · Small 32 · XSmall 24 · 2XSmall 20 high. Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: SkeletonShapeSize;
}

/** Figma Skeleton/Shapes (1556:17525): Rectangle/Square Corner-Radius/Base, Pill/Round fully rounded. */
export function SkeletonShape({ shape = "rectangle", size: sizeProp = "md", animated = true, className, style, ref, ...rest }: SkeletonShapeProps) {
  const size = scaleKey(sizeProp, skeletonShapeSizes);
  return <span {...dataAttributes(rest)} ref={ref} className={classes("zen-skeleton-shape", animated, className)} data-shape={shape} data-size={size} style={style} aria-hidden="true" />;
}
