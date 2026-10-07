import type { CSSProperties, SVGAttributes } from "react";
import { iconSizes, type IconSize } from "../Icon";
import { fileIconData, type FileIconFormat } from "./fileIconData";
import "../Icon/icon.css";
import "./fileIcon.css";

export type FileIconProps = Omit<SVGAttributes<SVGSVGElement>, "children"> & {
  /** Figma `icon-media-file` Format. */
  format: FileIconFormat;
  /** Same scale as Icon (Element-Size/Popular); Figma draws it at 20 (base). */
  size?: IconSize | number;
  /** Accessible name; without it the icon is decorative (the file name usually sits next to it). */
  title?: string;
};

/**
 * Figma `icon-media-file` (Iconography → Special Icons → File): a coloured file shape (Content/Support/…/Light,
 * Figma uses Background/Support/Violet/Solid) with an On-Colors glyph. Identifies content types — never an action icon.
 */
export function FileIcon({ format, size = "base", title, className, style, ...svgProps }: FileIconProps) {
  const icon = fileIconData[format];
  if (!icon) return null;
  const named = typeof size === "string" && (iconSizes as readonly string[]).includes(size) ? size : undefined;
  const custom: CSSProperties = typeof size === "number" ? { width: size, height: size } : {};
  return (
    <svg
      {...svgProps}
      className={["zen-icon", "zen-file-icon", className].filter(Boolean).join(" ")}
      data-format={format}
      data-tone={icon.tone}
      data-size={named}
      viewBox="0 0 20 20"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ ...style, ...custom }}
    >
      {title ? <title>{title}</title> : null}
      {icon.paths.map((path, index) => (
        <path key={index} className={`zen-file-icon__${path.part}`} d={path.d} fillRule={"evenodd" in path && path.evenodd ? "evenodd" : undefined} clipRule={"evenodd" in path && path.evenodd ? "evenodd" : undefined} />
      ))}
    </svg>
  );
}

/** Best-matching Format for a file name or extension (falls back to Doc). */
export function fileIconFormatOf(nameOrExtension: string): FileIconFormat {
  const ext = (nameOrExtension.includes(".") ? nameOrExtension.split(".").pop() : nameOrExtension)?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (/^(xls|xlsx|csv|numbers|ods)$/.test(ext)) return "sheet";
  if (/^(zip|rar|7z|tar|gz)$/.test(ext)) return "zip";
  if (/^(png|jpe?g|gif|webp|svg|heic|avif)$/.test(ext)) return "photo";
  if (/^(mp4|mov|webm|avi|mkv)$/.test(ext)) return "video";
  if (/^(mp3|flac|aac|ogg|m4a)$/.test(ext)) return "music";
  if (/^(wav|aiff)$/.test(ext)) return "sound";
  if (ext === "fig") return "figma";
  return "doc";
}
