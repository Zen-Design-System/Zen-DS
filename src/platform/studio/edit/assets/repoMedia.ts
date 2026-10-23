import { studioApi } from "../../api";
import { altOf, ASSET_PREFIX, assetBlob, uploadOf } from "../../builder/assets/uploads";
import { MEDIA_PREFIX, registerRepoPicture } from "../../builder/library/media";

/*
 * A picture from the computer on a repo page (BACKLOG P2 2026-10-10, "a photo file dropped from the desktop on a repo
 * page"): example and template code cannot read this browser's uploads, so the picture is saved in the repo first —
 * src/assets/media/<name>-<hash>.webp through the dev server (tools/studio/repo-media.mjs, POST /media) — and is then a
 * library picture (`zen-media:<key>`), which the edit writes as the file (`new URL(…, import.meta.url).href`). Photos
 * only, as WebP no larger than 1600 px on their long side, like the folder's own.
 */

/** What a repo page takes from the computer. */
export const REPO_PICTURE_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIDE = 1600;

/** The picture as WebP no larger than MAX_SIDE on its long side: its bytes (a WebP that fits is sent as it is). */
async function webpOf(blob: Blob): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (blob.type === "image/webp" && scale === 1) return new Uint8Array(await blob.arrayBuffer());
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!out || out.type !== "image/webp") throw new Error("This browser cannot write WebP");
    return new Uint8Array(await out.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

export type RepoPicture = { value: string; key: string; file: string; label: string };

/** Saves a picture in the repo through the dev server: its library value and file, or why not. */
export async function saveRepoPicture(blob: Blob, name: string): Promise<RepoPicture | { error: string }> {
  if (!REPO_PICTURE_TYPES.includes(blob.type)) return { error: "Example code takes photos: PNG, JPEG or WebP" };
  let bytes: Uint8Array;
  try {
    bytes = await webpOf(blob);
  } catch {
    return { error: `${name} could not be read as a picture` };
  }
  try {
    const saved = await studioApi.saveMedia(name, bytes);
    registerRepoPicture(saved.key, saved.file, `/${saved.file}`);
    return { value: `${MEDIA_PREFIX}${saved.key}`, key: saved.key, file: saved.file, label: altOf(name) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The picture was not saved" };
  }
}

/** A picture value for code in `file`: an upload (`zen-asset:`) on a repo page is saved in the repo first. */
export async function repoValueFor(file: string, value: string): Promise<string | { error: string }> {
  if (file.startsWith("local:") || !value.startsWith(ASSET_PREFIX)) return value;
  const id = value.slice(ASSET_PREFIX.length);
  const blob = await assetBlob(id).catch(() => null);
  if (!blob) return { error: "This upload is no longer in this browser" };
  const saved = await saveRepoPicture(blob, uploadOf(id)?.name ?? id);
  return "error" in saved ? saved : saved.value;
}
