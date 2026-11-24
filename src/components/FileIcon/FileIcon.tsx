import type { Ref, SVGAttributes } from "react";
import type { IconSize } from "../Icon";
import { fileIconModel } from "./model";
import type { FileIconFormat } from "./fileIconData";
import "../Icon/icon.css";
import "./fileIcon.css";

export { fileIconFormatOf } from "./model";

export type FileIconProps = Omit<SVGAttributes<SVGSVGElement>, "children"> & {
  /** Figma `icon-media-file` Format. */
  format: FileIconFormat;
  /** Same scale as Icon (Element-Size/Popular); Figma draws it at 20 (base). */
  size?: IconSize | number;
  /** Accessible name; without it the icon is decorative (the file name usually sits next to it). */
  title?: string;
  /** Forwarded to the root `<svg>`. */
  ref?: Ref<SVGSVGElement>;
};

/**
 * Figma `icon-media-file` (Iconography → Special Icons → File): a coloured file shape (Content/Support/…/Light,
 * Figma uses Background/Support/Violet/Solid) with an On-Colors glyph. Identifies content types — never an action icon.
 */
export function FileIcon({ format, size = "base", title, className, style, ref, ...svgProps }: FileIconProps) {
  const icon = fileIconModel(format, size);
  if (!icon) return null;
  return (
    <svg
      {...svgProps}
      ref={ref}
      className={["zen-icon", "zen-file-icon", className].filter(Boolean).join(" ")}
      data-format={format}
      data-tone={icon.tone}
      data-size={icon.size}
      viewBox="0 0 20 20"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ ...style, ...icon.custom }}
    >
      {title ? <title>{title}</title> : null}
      {icon.paths.map((path, index) => (
        <path key={index} className={path.className} d={path.d} fillRule={path.evenodd ? "evenodd" : undefined} clipRule={path.evenodd ? "evenodd" : undefined} />
      ))}
    </svg>
  );
}
