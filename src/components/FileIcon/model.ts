import { iconSizes, type IconSize } from "../Icon/model";
import { fileIconData, type FileIconFormat, type FileIconPath, type FileIconTone } from "./fileIconData";

/*
 * FileIcon's framework-free part (the web core, src/core): what the `<svg>` and its paths render for a format and size,
 * and the format for a file name. fileIconData.ts holds the shapes. React's FileIcon and the Vue port both draw from it
 * (tools/code-languages/vue-parity.mjs).
 */

/**
 * The format's tone and paths, the `data-size` key for a token size and the width and height for a px number (any other
 * string draws at the stylesheet's size); null for a format the data does not have.
 */
export function fileIconModel(format: FileIconFormat, size: IconSize | number | undefined): {
  tone: FileIconTone;
  size: IconSize | undefined;
  custom: { width: string; height: string } | undefined;
  paths: { className: string; d: string; evenodd: boolean }[];
} | null {
  const icon = fileIconData[format];
  if (!icon) return null;
  return {
    tone: icon.tone,
    size: typeof size === "string" && (iconSizes as readonly string[]).includes(size) ? size : undefined,
    custom: typeof size === "number" ? { width: `${size}px`, height: `${size}px` } : undefined,
    paths: (icon.paths as readonly FileIconPath[]).map((path) => ({ className: `zen-file-icon__${path.part}`, d: path.d, evenodd: Boolean(path.evenodd) })),
  };
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
