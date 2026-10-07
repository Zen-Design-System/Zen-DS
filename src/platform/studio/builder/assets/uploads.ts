import { useEffect, useSyncExternalStore } from "react";
import { activeMirror, ASSETS, run } from "../store/pageStore";

/*
 * Uploaded photos (Studio builder GĐ5 M4, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3d, the user's Q4:
 * kept in the browser): PNG, JPEG, WebP, GIF or SVG up to 5 MB, kept as blobs in IndexedDB (pageStore.ts "assets") and,
 * when a folder is linked, in its assets/ beside the pages. A page writes `src="zen-asset:<id>"` (a literal: the page
 * stays valid); the renderer and Play show the photo's object URL, the exports carry its file. The id is the file's name
 * and a hash of its bytes (`team-photo-1a2b3c4d.png`): the same file uploaded twice is one photo.
 */

export const ASSET_PREFIX = "zen-asset:";
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const EXTENSION: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };
const TYPE_OF: Record<string, string> = Object.fromEntries(Object.entries(EXTENSION).map(([type, extension]) => [extension, type]));
/** What the file picker offers. */
export const UPLOAD_ACCEPT = Object.keys(EXTENSION).join(",");

type UploadRecord = { id: string; name: string; type: string; size: number; createdAt: number; blob: Blob };
export type Upload = Omit<UploadRecord, "blob"> & { url: string };

const uploads = new Map<string, Upload>();
const listeners = new Set<() => void>();
let version = 0;
const notify = () => { version += 1; listeners.forEach((listener) => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

function remember(record: UploadRecord): Upload {
  const known = uploads.get(record.id);
  if (known) return known;
  const { blob, ...meta } = record;
  const upload = { ...meta, url: URL.createObjectURL(blob) };
  uploads.set(record.id, upload);
  return upload;
}

let loading: Promise<void> | null = null;
/** Reads the uploaded photos once (their object URLs live as long as the Studio). */
export function loadUploads(): Promise<void> {
  loading ??= run<UploadRecord[]>(ASSETS, "readonly", (store) => store.getAll() as IDBRequest<UploadRecord[]>).then((records) => {
    for (const record of records ?? []) if (record?.blob) remember(record);
    notify();
  });
  return loading;
}

/** 8 hex digits of FNV-1a over the bytes (no secure context needed, unlike crypto.subtle). */
function hashOf(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const slug = (name: string) => name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "photo";

/** The id of a photo: its name as a slug, a hash of its bytes, its type's extension. */
export const assetIdFor = (name: string, type: string, bytes: Uint8Array) => `${slug(name)}-${hashOf(bytes)}.${EXTENSION[type] ?? "png"}`;

/** The text a photo gives an Image's alt: its file name in words ("team-photo.png" → "Team photo"). */
export const altOf = (name: string) => { const words = name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim(); return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Photo"; };

/** Keeps a photo under `id` (an upload, an imported package's file, the folder's copy: `toFolder` false). */
export async function putAsset(id: string, blob: Blob, name = id, { toFolder = true }: { toFolder?: boolean } = {}): Promise<Upload> {
  const type = blob.type || TYPE_OF[id.split(".").pop() ?? ""] || "application/octet-stream";
  const record: UploadRecord = { id, name, type, size: blob.size, createdAt: Date.now(), blob: blob.type ? blob : new Blob([blob], { type }) };
  await run(ASSETS, "readwrite", (store) => store.put(record));
  const upload = remember(record);
  notify();
  // A linked folder keeps a copy in its assets/.
  if (toFolder) void activeMirror()?.writeAsset?.(id, record.blob).catch(() => undefined);
  return upload;
}

/** Upload (Assets › Photos): each image under 5 MB is kept; the others are named with the reason. */
export async function uploadPhotos(files: File[]): Promise<{ added: Upload[]; refused: string[] }> {
  await loadUploads();
  const added: Upload[] = [];
  const refused: string[] = [];
  for (const file of files) {
    if (!EXTENSION[file.type]) { refused.push(`${file.name} (not a PNG, JPEG, WebP, GIF or SVG)`); continue; }
    if (file.size > MAX_UPLOAD_BYTES) { refused.push(`${file.name} (over 5 MB)`); continue; }
    const id = assetIdFor(file.name, file.type, new Uint8Array(await file.arrayBuffer()));
    added.push(uploads.get(id) ?? (await putAsset(id, file, file.name)));
  }
  return { added, refused };
}

/** A photo's object URL in this Studio; null until it has loaded, or when this browser does not have it. */
export const assetUrl = (id: string) => uploads.get(id)?.url ?? null;
/** The photo an object URL shows (the exports put its file in the zip), or null. */
export const assetOfUrl = (url: string) => { for (const upload of uploads.values()) if (upload.url === url) return upload; return null; };
/** A photo's file (this browser's copy); null when it does not have it. */
export const assetBlob = (id: string) => run<UploadRecord | undefined>(ASSETS, "readonly", (store) => store.get(id) as IDBRequest<UploadRecord | undefined>).then((record) => record?.blob ?? null);

/** The uploaded photos a page's text names. */
export const assetIdsOf = (text: string) => [...new Set([...text.matchAll(/zen-asset:([\w.-]+)/g)].map((match) => match[1]))];

/**
 * The photos of `ids` this browser lacks, after asking the linked folder for them (its assets/): what a page imported
 * from elsewhere shows as missing.
 */
export async function missingAssets(ids: string[]): Promise<string[]> {
  await loadUploads();
  const missing: string[] = [];
  for (const id of ids) {
    if (uploads.has(id)) continue;
    const blob = await activeMirror()?.readAsset?.(id).catch(() => null);
    if (blob) await putAsset(id, blob, id, { toFolder: false });
    else missing.push(id);
  }
  return missing;
}

/** Every uploaded photo, newest first (they load on first use). */
export function useUploads(): Upload[] {
  useEffect(() => { void loadUploads(); }, []);
  useSyncExternalStore(subscribe, () => version, () => version);
  return [...uploads.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** Changes whenever a photo loads or arrives (the board renders again: its `zen-asset:` sources resolve). */
export function useUploadsVersion(): number {
  useEffect(() => { void loadUploads(); }, []);
  return useSyncExternalStore(subscribe, () => version, () => version);
}
