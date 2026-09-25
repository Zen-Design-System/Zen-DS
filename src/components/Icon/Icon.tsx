import type { CSSProperties, SVGAttributes } from "react";
import { getIconData, type IconName } from "../../icons/generated/iconData";
import "./icon.css";

export const iconSizes = ["2xs", "xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl"] as const;
export type IconSize = (typeof iconSizes)[number];

export type IconProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "name"> & {
  name: IconName;
  size?: IconSize | number | string;
  title?: string;
  decorative?: boolean;
};

const sizeValue = (size: IconProps["size"]): CSSProperties["width"] => {
  if (typeof size === "number") return `${size}px`;
  if (!size || (iconSizes as readonly string[]).includes(size)) return undefined;
  return size;
};

export function Icon({
  name,
  size = "base",
  title,
  decorative = !title,
  className,
  style,
  ...svgProps
}: IconProps) {
  const icon = getIconData(name);
  const customSize = sizeValue(size);
  const sizeName = typeof size === "string" && (iconSizes as readonly string[]).includes(size)
    ? size
    : undefined;

  if (!icon) return null;

  return (
    <svg
      {...svgProps}
      className={["zen-icon", className].filter(Boolean).join(" ")}
      data-color-mode={icon.colorMode}
      data-icon={name}
      data-size={sizeName}
      viewBox={icon.viewBox}
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
      <g dangerouslySetInnerHTML={{ __html: icon.content }} />
    </svg>
  );
}
