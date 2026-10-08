import { studioApi } from "../../api";
import { copyUploadsTo } from "../assets/uploads";
import { idFromFileName } from "./pageModel";
import { connectMirror, needsReconnect, run, SETTINGS, syncMirror, type PageMirror } from "./pageStore";

/*
 * The folder that keeps a copy of the builder pages (Studio builder GĐ2 M2, spec
 * docs/research/studio-builder-pages-spec-2026-10-06.md §3 2c):
 *   - on the dev server: the repo's gitignored .zen-studio/pages/ (GET /pages, POST /pages/write, POST /pages/trash;
 *     tools/studio/pages-folder.mjs), the pages' source of truth;
 *   - on a build (no dev server): a folder the person links with File System Access (Chromium), whose handle is kept in
 *     IndexedDB; after a reload the browser asks again, through Reconnect.
 * Without either, pages live in this browser only (Export keeps a copy). Either folder also keeps the uploaded photos in
 * its assets/ (GĐ5 M4; the dev server's since 2026-10-08, so a page opened in another browser there finds them), and the
 * photos uploaded before it was connected are copied in when it connects.
 */

const DEV = import.meta.env.DEV;
const FOLDER_KEY = "folder";
const SUFFIX = ".zen.tsx";

/* File System Access, as far as the Studio uses it (lib.dom lacks the iteration and permission parts). */
type Permission = "granted" | "denied" | "prompt";
type FileHandle = { kind: "file"; name: string; getFile(): Promise<File>; createWritable(): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }> };
type DirHandle = {
  kind: "directory";
  name: string;
  values(): AsyncIterable<FileHandle | DirHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirHandle>;
  removeEntry(name: string): Promise<void>;
  queryPermission(options: { mode: "readwrite" }): Promise<Permission>;
  requestPermission(options: { mode: "readwrite" }): Promise<Permission>;
};
type PickerWindow = Window & { showDirectoryPicker?: (options: { id?: string; mode: "readwrite" }) => Promise<DirHandle> };

/** Whether this browser can link a folder (Chromium's File System Access), and the Studio offers it (no dev server). */
export const canLinkFolder = () => !DEV && typeof (window as PickerWindow).showDirectoryPicker === "function";

function devMirror(dir: string): PageMirror {
  return {
    key: `dev:${dir}`,
    kind: "dev",
    label: dir,
    async list() {
      const result = await studioApi.pages();
      if (!result) throw new Error("The dev server did not list the pages");
      return result.pages;
    },
    write: (id, text) => studioApi.pageWrite("write", id, text),
    trash: (id) => studioApi.pageWrite("trash", id),
    // Uploaded photos in .zen-studio/pages/assets/ (GET /pages/asset, POST /pages/asset-write, /pages/asset-trash).
    writeAsset: async (id, blob) => studioApi.pageAssetWrite("write", id, new Uint8Array(await blob.arrayBuffer())),
    async readAsset(id) {
      const bytes = await studioApi.pageAsset(id);
      const type = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml" }[id.split(".").pop() ?? ""] ?? "application/octet-stream";
      return bytes ? new Blob([bytes as BlobPart], { type }) : null;
    },
    trashAsset: (id) => studioApi.pageAssetWrite("trash", id),
  };
}

/** Connects `next`, then copies in the photos uploaded before it (the folder's assets/ gets each one it lacks). */
async function connect(next: PageMirror) {
  await connectMirror(next);
  void copyUploadsTo(next).catch(() => undefined);
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

function folderMirror(handle: DirHandle): PageMirror {
  return {
    key: `folder:${handle.name}`,
    kind: "folder",
    label: handle.name,
    async list() {
      const pages: Array<{ id: string; text: string; mtime: number }> = [];
      for await (const entry of handle.values()) {
        if (entry.kind !== "file" || !entry.name.endsWith(SUFFIX)) continue;
        const id = idFromFileName(entry.name);
        if (!id) continue;
        const file = await entry.getFile();
        if (file.size > 2 * 1024 * 1024) continue;
        pages.push({ id, text: await file.text(), mtime: file.lastModified });
      }
      return pages;
    },
    async write(id, text) {
      const file = await handle.getFileHandle(`${id}${SUFFIX}`, { create: true });
      const out = await file.createWritable();
      await out.write(text);
      await out.close();
    },
    async trash(id) {
      // A copy in the folder's trash/, then the page goes: nothing is deleted outright.
      let file: FileHandle;
      try {
        file = await handle.getFileHandle(`${id}${SUFFIX}`);
      } catch {
        return;
      }
      const text = await (await file.getFile()).text();
      const trash = await handle.getDirectoryHandle("trash", { create: true });
      const copy = await (await trash.getFileHandle(`${id}-${stamp()}${SUFFIX}`, { create: true })).createWritable();
      await copy.write(text);
      await copy.close();
      await handle.removeEntry(`${id}${SUFFIX}`);
    },
    // Uploaded photos (GĐ5 M4) in assets/ beside the pages.
    async writeAsset(id, blob) {
      const assets = await handle.getDirectoryHandle("assets", { create: true });
      const out = await (await assets.getFileHandle(id, { create: true })).createWritable();
      await out.write(blob);
      await out.close();
    },
    async readAsset(id) {
      try {
        return await (await (await handle.getDirectoryHandle("assets")).getFileHandle(id)).getFile();
      } catch {
        return null;
      }
    },
    async trashAsset(id) {
      // A copy in trash/assets/, then the photo goes from assets/ (as a page's trash).
      let file: File;
      try {
        file = await (await (await handle.getDirectoryHandle("assets")).getFileHandle(id)).getFile();
      } catch {
        return;
      }
      const bin = await (await handle.getDirectoryHandle("trash", { create: true })).getDirectoryHandle("assets", { create: true });
      const copy = await (await bin.getFileHandle(`${stamp()}-${id}`, { create: true })).createWritable();
      await copy.write(file);
      await copy.close();
      await (await handle.getDirectoryHandle("assets")).removeEntry(id);
    },
  };
}

const readHandle = () => run<{ key: string; value: DirHandle } | undefined>(SETTINGS, "readonly", (store) => store.get(FOLDER_KEY) as IDBRequest<{ key: string; value: DirHandle } | undefined>).then((row) => row?.value ?? null);

let started = false;
/** Once per Studio session: connects the dev server's folder, or the linked folder (Reconnect when it needs a click). */
export async function startPageMirror(): Promise<void> {
  if (started) return;
  started = true;
  if (DEV) {
    const ping = await studioApi.ping();
    if (!ping?.token) return;
    const listed = await studioApi.pages();
    if (listed) await connect(devMirror(listed.dir));
    return;
  }
  const handle = await readHandle().catch(() => null);
  if (!handle) return;
  const permission = await handle.queryPermission({ mode: "readwrite" }).catch(() => "denied" as Permission);
  if (permission === "granted") await connect(folderMirror(handle));
  else needsReconnect(handle.name);
}

/** Link folder… (a click): pick a folder, keep its handle, sync the pages with it. */
export async function linkFolder(): Promise<boolean> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return false;
  let handle: DirHandle;
  try {
    handle = await picker.call(window, { id: "zen-studio-pages", mode: "readwrite" });
  } catch {
    return false; // cancelled
  }
  await run(SETTINGS, "readwrite", (store) => store.put({ key: FOLDER_KEY, value: handle }));
  await connect(folderMirror(handle));
  return true;
}

/** Reconnect (a click): the browser asks for the linked folder again. */
export async function reconnectFolder(): Promise<boolean> {
  const handle = await readHandle().catch(() => null);
  if (!handle) return false;
  const permission = await handle.requestPermission({ mode: "readwrite" }).catch(() => "denied" as Permission);
  if (permission !== "granted") return false;
  await connect(folderMirror(handle));
  return true;
}

/** Unlink folder: pages stay in this browser; the folder keeps its files. */
export async function unlinkFolder(): Promise<void> {
  await run(SETTINGS, "readwrite", (store) => store.delete(FOLDER_KEY));
  await connectMirror(null);
}

/** Sync again (after an error, or files changed in the folder). */
export const resyncPages = () => syncMirror();
