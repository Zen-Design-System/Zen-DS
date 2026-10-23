// Zen Studio: a picture from the computer saved in the repo (BACKLOG P2 2026-10-10, "a photo file dropped from the
// desktop on a repo page"). Example and template code read files under src/assets/media, never this browser's uploads
// (IndexedDB), so a picture dropped on a repo page is written there first: as WebP, like the folder's other photos, named
// after the file and its bytes (the same picture twice is one file), with a CREDITS.md row that says where it came from.
// Pure: the dev server (vite-plugin-zen-studio.mjs POST /media) does the disk.
//
//   mediaFileName(name, bytes)        "team-photo-1a2b3c4d.webp"
//   isWebp(bytes)                     a RIFF … WEBP file
//   withCredits(text, file, original, date)   CREDITS.md with the picture's row added once

export const MEDIA_DIR = "src/assets/media";
/** The largest picture the route takes (the browser sends WebP no larger than 1600 px on its long side). */
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

/** 8 hex digits of FNV-1a over the bytes (as the Studio's uploads name theirs). */
function hashOf(bytes) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const slug = (name) => String(name ?? "").replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "photo";

/** The repo file's name: the original name as a slug, a hash of the bytes, `.webp`. */
export const mediaFileName = (name, bytes) => `${slug(name)}-${hashOf(bytes)}.webp`;

/** Whether the bytes are a WebP file (RIFF size WEBP). */
export const isWebp = (bytes) => bytes?.length > 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";

/** A table cell's text without the characters that would break the row. */
const cell = (text) => String(text).replace(/[|\r\n]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * CREDITS.md with a row for `file` (its name in the folder): where it came from — the file a person dropped in Zen Studio,
 * on `date` — and that its licence is still to confirm. Unchanged when the file already has a row.
 */
export function withCredits(text, file, original, date) {
  if (text.split("\n").some((line) => line.startsWith(`| ${file} |`))) return text;
  const row = `| ${file} | Dropped in Zen Studio from "${cell(original)}" (${date}) | Zen Studio user | To confirm before publishing |`;
  return `${text.replace(/\n*$/, "")}\n${row}\n`;
}
