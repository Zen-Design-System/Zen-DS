import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ForwardedRef, type ImgHTMLAttributes, type ReactNode, type SyntheticEvent } from "react";
import { Icon } from "../Icon";
import { SkeletonShape } from "../Skeleton";
import { Text } from "../Text";
import { normalizeScale, radiusValue, scaleTokenSuffix, type ZenCornerRadius, type ZenScale, type ZenScaleInput } from "../_shared/scale";
import "./image.css";
import "../Icon/core";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export const imageRatios = ["1:1", "4:3", "3:2", "16:9", "3:4"] as const;
export type ImageRatioName = (typeof imageRatios)[number];
/** A named ratio, or width ÷ height as a number (e.g. 2.35). */
export type ImageRatio = ImageRatioName | number;
export const imageFits = ["cover", "contain"] as const;
export type ImageFit = (typeof imageFits)[number];
export type ImageStatus = "loading" | "loaded" | "error";

/** Native img attributes passed to the picture (srcSet, sizes, decoding, crossOrigin, referrerPolicy, fetchPriority, onLoad, onError…). */
type ImgAttributes = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "loading" | "width" | "height" | "children" | "className" | "style" | "placeholder">;

/** Load state of `src`: loading until the browser reports load or error (a cached image is read on mount). */
function useImageStatus(src: string | undefined, onLoad?: ImgAttributes["onLoad"], onError?: ImgAttributes["onError"]) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [result, setResult] = useState<{ src: string; status: "loaded" | "error" } | null>(null);
  const status: ImageStatus = !src ? "loading" : result?.src === src ? result.status : "loading";
  useIsomorphicLayoutEffect(() => {
    const img = imgRef.current;
    if (!src || !img || !img.complete) return;
    // Already decoded (cache) or already failed before React listened.
    setResult({ src, status: img.naturalWidth > 0 ? "loaded" : "error" });
  }, [src]);
  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => { if (src) setResult({ src, status: "loaded" }); onLoad?.(event); };
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => { if (src) setResult({ src, status: "error" }); onError?.(event); };
  return { imgRef, status, handleLoad, handleError };
}

function useMergedRef<T>(own: { current: T | null }, forwarded: ForwardedRef<T>) {
  return useCallback((node: T | null) => {
    own.current = node;
    if (typeof forwarded === "function") forwarded(node);
    else if (forwarded) forwarded.current = node;
  }, [own, forwarded]);
}

const ratioValue = (ratio: ImageRatio | undefined) => ratio === undefined ? undefined : typeof ratio === "number" ? String(ratio) : ratio.replace(":", " / ");

/** The picture, its Skeleton while loading and the neutral placeholder (image icon) when it fails. */
function ImageMedia({ src, alt, loading, fit, status, imgRef, handleLoad, handleError, imgProps }: {
  src?: string; alt: string; loading: "lazy" | "eager"; fit: ImageFit; status: ImageStatus;
  imgRef: (node: HTMLImageElement | null) => void; handleLoad: (event: SyntheticEvent<HTMLImageElement>) => void; handleError: (event: SyntheticEvent<HTMLImageElement>) => void; imgProps: ImgAttributes;
}) {
  return (
    <>
      {src && status !== "error" ? <img {...imgProps} ref={imgRef} className="zen-image__img" src={src} alt={alt} loading={loading} decoding="async" data-fit={fit} onLoad={handleLoad} onError={handleError} /> : null}
      {status === "loading" ? <SkeletonShape shape="rectangle" className="zen-image__skeleton" /> : null}
      {status === "error"
        ? <span className="zen-image__fallback" role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}><Icon name="icon-image-line" decorative /></span>
        : null}
    </>
  );
}

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "loading" | "width" | "height" | "children" | "className" | "style" | "placeholder"> {
  /** Image URL. While it is undefined (the URL is still being fetched) the Skeleton shows. */
  src?: string;
  /**
   * Required text alternative: what the picture shows, in context ("Matte black pour-over kettle, side view"). Use ""
   * only for a decorative picture that repeats text next to it; never a file name or "image of…".
   */
  alt: string;
  /**
   * Frame ratio (width : height): "1:1" · "4:3" · "3:2" · "16:9" · "3:4", or a number (2.35). The frame keeps its size
   * while loading, so nothing jumps. Unset: the picture's own ratio (4:3 while it loads or fails).
   */
  ratio?: ImageRatio;
  /** cover (default): fills the frame and crops. contain: shows the whole picture on Neutral/Pale bars (logos, documents). */
  fit?: ImageFit;
  /** Corner radius on the Zen scale (Corner-Radius): none · 2xs · xs · sm · md (default, 12) · lg · xl · 2xl · 3xl · full. */
  radius?: ZenCornerRadius;
  /** Native loading: lazy (default) waits until the picture nears the viewport; eager for the first picture on screen. */
  loading?: "lazy" | "eager";
  /** A caption under the picture (Body/Small/Regular, Content/Neutral/Base); the picture becomes a figure with a figcaption. */
  caption?: ReactNode;
  /** On the root (figure or div). */
  className?: string;
  /** On the root (figure or div). */
  style?: CSSProperties;
}

/**
 * A responsive picture in a ratio frame: Skeleton while it loads, a neutral placeholder with an image icon when it
 * fails (the alt text stays available to screen readers), and an optional figure caption. The frame is Neutral/Pale
 * with a 1px Border/Neutral/Pale inner hairline so light pictures keep their edge; radius from Corner-Radius.
 *
 *   <Image src={photo} alt="Snowy rooftops of the old town" ratio="16:9" caption="Old town, January" />
 */
export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { src, alt, ratio, fit = "cover", radius = "md", loading = "lazy", caption, className, style, onLoad, onError, ...imgProps },
  ref,
) {
  const { imgRef, status, handleLoad, handleError } = useImageStatus(src, onLoad, onError);
  const setRef = useMergedRef(imgRef, ref);
  const Root = caption ? "figure" : "div";
  const vars = { "--zen-image-ratio": ratioValue(ratio), "--zen-image-radius": radiusValue(radius) } as CSSProperties;
  return (
    <Root className={["zen-image", className].filter(Boolean).join(" ")} data-status={status} data-fit={fit} data-ratio={ratio === undefined ? undefined : "true"} style={{ ...vars, ...style }}>
      <div className="zen-image__frame">
        <ImageMedia src={src} alt={alt} loading={loading} fit={fit} status={status} imgRef={setRef} handleLoad={handleLoad} handleError={handleError} imgProps={imgProps} />
      </div>
      {caption ? <Text as="figcaption" className="zen-image__caption" textStyle="Body/Small/Regular" tone="base">{caption}</Text> : null}
    </Root>
  );
});

export const thumbnailShapes = ["rounded", "circle", "square"] as const;
export type ThumbnailShape = (typeof thumbnailShapes)[number];
/** Figma Image-Size steps: 3xs 16 · 2xs 20 · xs 24 · sm 32 · md 40 · lg 48 · xl 56 · 2xl 80 · 3xl 112 (compact density). */
export type ThumbnailSize = ZenScaleInput;

export interface ThumbnailProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "loading" | "width" | "height" | "children" | "className" | "style" | "placeholder"> {
  /** Image URL. While it is undefined the Skeleton shows. */
  src?: string;
  /** Required text alternative. "" when the row already names the item (a ListItem title, a table cell label) next to it. */
  alt: string;
  /**
   * Image-Size token: 3xs 16 · 2xs 20 · xs 24 · sm 32 · md 40 (default, a ListItem leading visual) · lg 48 · xl 56 ·
   * 2xl 80 · 3xl 112 (compact density; comfortable scales them). Tables use sm with a caption, xs without.
   */
  size?: ThumbnailSize;
  /** rounded (default: the radius steps with the size, like Avatar Square), circle, or square (no radius). */
  shape?: ThumbnailShape;
  /** cover (default) crops to the square; contain shows the whole picture (logos, app icons). */
  fit?: ImageFit;
  /** Native loading: lazy (default) or eager. */
  loading?: "lazy" | "eager";
  /** On the root span. */
  className?: string;
  /** On the root span. */
  style?: CSSProperties;
}

/** Radius per size for shape="rounded", following Avatar/Single (Square): 4 → 8 → 12 → 16 → 20 → 28. */
const thumbnailRadius: Record<ZenScale, string> = {
  "3xs": "var(--zen-corner-radius-xsmall, 4px)",
  "2xs": "var(--zen-corner-radius-xsmall, 4px)",
  xs: "var(--zen-corner-radius-xsmall, 4px)",
  sm: "var(--zen-corner-radius-small, 8px)",
  md: "var(--zen-corner-radius-base, 12px)",
  lg: "var(--zen-corner-radius-base, 12px)",
  xl: "var(--zen-corner-radius-large, 16px)",
  "2xl": "var(--zen-corner-radius-xlarge, 20px)",
  "3xl": "var(--zen-corner-radius-3-xlarge, 28px)",
};

/**
 * A fixed square picture for list rows, tables and pickers, sized on the Figma Image-Size scale (the same steps as
 * Avatar). Same loading (Skeleton) and error (image icon placeholder) behaviour as Image.
 *
 *   <ListItem title="Pour-over kettle" caption="$64.00" leading={<Thumbnail src={kettle} alt="" />} />
 */
export const Thumbnail = forwardRef<HTMLImageElement, ThumbnailProps>(function Thumbnail(
  { src, alt, size = "md", shape = "rounded", fit = "cover", loading = "lazy", className, style, onLoad, onError, ...imgProps },
  ref,
) {
  const { imgRef, status, handleLoad, handleError } = useImageStatus(src, onLoad, onError);
  const setRef = useMergedRef(imgRef, ref);
  const step = normalizeScale(size) as ZenScale;
  const known = step in scaleTokenSuffix;
  const vars = {
    "--zen-thumbnail-size": known ? `var(--zen-image-size-${scaleTokenSuffix[step]})` : undefined,
    "--zen-image-radius": shape === "circle" ? "var(--zen-corner-radius-rounded, 1000px)" : shape === "square" ? "0" : known ? thumbnailRadius[step] : undefined,
  } as CSSProperties;
  return (
    <span className={["zen-thumbnail", className].filter(Boolean).join(" ")} data-status={status} data-size={known ? step : undefined} data-shape={shape} style={{ ...vars, ...style }}>
      <ImageMedia src={src} alt={alt} loading={loading} fit={fit} status={status} imgRef={setRef} handleLoad={handleLoad} handleError={handleError} imgProps={imgProps} />
    </span>
  );
});
