import { Suspense, use, useId, useMemo, type CSSProperties, type SVGAttributes } from "react";
import type { IconDefinition, IconName } from "../../icons/generated/names";
import { resolveContentTone, type ContentTone } from "../_shared/contentTone";
import { getRegisteredIcon, loadIconBucket, warnUnknownIcon } from "./registry";
import "../_shared/content-tone.css";
import "./icon.css";

export const iconSizes = ["2xs", "xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl"] as const;
export type IconSize = (typeof iconSizes)[number];

export type IconProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "name"> & {
  /**
   * One of the 1,598 Zen icon names (`IconName` autocompletes them), e.g. `icon-home-03-line`, `icon-search-medium-line`.
   * Icons that only come in cuts also take their plain name (`icon-search-line`, `icon-x-line`,
   * `icon-chevron-left-line`, `icon-chevron-right-line`), which draws the Medium cut.
   */
  name: IconName;
  /** A token size (`2xs`…`3xl`, default `base` = 20px) or a px number. */
  size?: IconSize | number | string;
  /**
   * Colour: a Color/Content token by its path, as on Text ("light", "positive-base", "support-blue-light"). Default:
   * the parent's colour (most icons sit in a component that colours them). Icons may use a colour family's Light level.
   */
  tone?: ContentTone;
  /** Accessible name; without it the icon is decorative (aria-hidden). */
  title?: string;
  decorative?: boolean;
};

const sizeValue = (size: IconProps["size"]): CSSProperties["width"] => {
  if (typeof size === "number") return `${size}px`;
  if (!size || (iconSizes as readonly string[]).includes(size)) return undefined;
  return size;
};

/**
 * Zen icon. Icons used by Zen components draw synchronously; any other name loads its bucket on first use (an empty
 * box of the same size shows for that first frame — `preloadIcons()` or `@zen/design-system/icons/all` avoid it).
 */
export function Icon(props: IconProps) {
  const icon = getRegisteredIcon(props.name);
  if (icon) return <IconSvg {...props} icon={icon} />;
  return (
    <Suspense fallback={<IconSvg {...props} icon={undefined} />}>
      <LazyIcon {...props} />
    </Suspense>
  );
}

function LazyIcon(props: IconProps) {
  use(loadIconBucket(props.name));
  const icon = getRegisteredIcon(props.name);
  if (!icon) {
    warnUnknownIcon(props.name);
    return null;
  }
  return <IconSvg {...props} icon={icon} />;
}

function IconSvg({
  name,
  size = "base",
  tone,
  title,
  decorative = !title,
  className,
  style,
  icon,
  ...svgProps
}: IconProps & { icon: IconDefinition | undefined }) {
  // Inline SVGs share one document: make clipPath/mask/gradient ids unique per instance, otherwise the second
  // copy of an icon points at the first copy's <clipPath> (broken when that one is hidden, and invalid HTML).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const content = useMemo(() => {
    if (!icon || !/\sid="/.test(icon.content)) return icon?.content ?? "";
    return icon.content.replace(/\sid="([^"]+)"/g, ` id="$1-${uid}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${uid})`).replace(/(xlink:)?href="#([^"]+)"/g, (_m, xl, id) => `${xl ?? ""}href="#${id}-${uid}"`);
  }, [icon, uid]);
  const customSize = sizeValue(size);
  const sizeName = typeof size === "string" && (iconSizes as readonly string[]).includes(size)
    ? size
    : undefined;

  return (
    <svg
      {...svgProps}
      className={["zen-icon", className].filter(Boolean).join(" ")}
      data-color-mode={icon?.colorMode}
      data-icon={name}
      data-size={sizeName}
      data-tone={tone ? resolveContentTone(tone) : undefined}
      data-loading={icon ? undefined : "true"}
      viewBox={icon?.viewBox}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={!decorative && !title ? svgProps["aria-label"] : undefined}
      focusable="false"
      style={{
        ...style,
        ...(customSize ? { width: customSize, height: customSize } : {}),
      }}
    >
      {title ? <title>{title}</title> : null}
      {icon ? <g dangerouslySetInnerHTML={{ __html: content }} /> : null}
    </svg>
  );
}
