import { announceEditStatus } from "../api";
import { altOf, ASSET_PREFIX, UPLOAD_ACCEPT, uploadPhotos } from "../builder/assets/uploads";
import { studioStore } from "../store";
import type { PlacedPicture } from "./drawModel";

/*
 * Figma's Place image (⇧⌘K, Studio parity F8) on a page you made: the file dialog, then each click on a frame places
 * one picture as a Rectangle with the image fill (drawTool.ts kind "image": a click at the picture's own size, made
 * smaller to fit the frame under the pointer; a drag at the dragged width, its ratio kept). Esc puts the rest away.
 * Pictures dropped on a frame or pasted go in at once (canvas/fileDrop.ts, `pastePictures`). Uploads are this
 * browser's (builder/assets/uploads.ts: PNG, JPEG, WebP, GIF, SVG up to 5 MB); the page writes `zen-asset:<id>`.
 */

let queue: PlacedPicture[] = [];

/** The picture the next click places, or null. */
export const nextPicture = (): PlacedPicture | null => queue[0] ?? null;
/** How many pictures wait for a click (the one under the pointer included). */
export const picturesLeft = () => queue.length;
/** The next picture was placed. */
export const tookPicture = () => { queue = queue.slice(1); };
/** Esc, another tool: the pictures not placed are put away (they stay in Assets › Photos). */
export const dropPictures = () => { queue = []; };
export const setPictures = (pictures: PlacedPicture[]) => { queue = [...pictures]; };

/** A line in the edit status: a refusal, or the neutral hint of what the next click places. */
const say = (kind: "unchanged" | "error", message: string) => announceEditStatus({ kind, message, at: Date.now() });

/** The chosen files of the system's file dialog (none when it is cancelled). */
export function choosePictures(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = UPLOAD_ACCEPT;
    input.multiple = true;
    input.hidden = true;
    input.setAttribute("data-e2e", "place-image-input");
    let done = false;
    const end = (files: File[]) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(files);
    };
    input.addEventListener("change", () => end([...(input.files ?? [])]));
    input.addEventListener("cancel", () => end([]));
    document.body.append(input);
    input.click();
  });
}

/** A picture's own size (an SVG without one: 100 × 100, Figma's click size). */
function sizeOf(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve({ width: probe.naturalWidth || 100, height: probe.naturalHeight || 100 });
    probe.onerror = () => resolve({ width: 100, height: 100 });
    probe.src = url;
  });
}

/** Files as pictures to place: uploaded (what cannot be is said), each with its own size and a name from its file. */
export async function picturesOf(files: readonly File[]): Promise<PlacedPicture[]> {
  const images = files.filter((file) => file.type.startsWith("image/"));
  const { added, refused } = await uploadPhotos(images);
  const skipped = [...refused, ...files.filter((file) => !file.type.startsWith("image/")).map((file) => `${file.name} (not a picture)`)];
  if (skipped.length) say("error", `Not placed: ${skipped.join(", ")}`);
  return Promise.all(added.map(async (upload) => ({
    src: `${ASSET_PREFIX}${upload.id}`,
    label: altOf(upload.name),
    name: upload.name.replace(/\.[a-z0-9]+$/i, "") || "Image",
    ...(await sizeOf(upload.url)),
  })));
}

/** The status line while pictures wait: the one under the pointer, how many more. */
export function placingHint(): string {
  const next = nextPicture();
  if (!next) return "";
  const more = queue.length - 1;
  return `Click to place ${next.name}${more ? ` · ${more} more` : ""} · Esc to stop`;
}

/**
 * ⇧⌘K on a page you made: the file dialog, then the Image tool waits for a click per picture (`arm`: drawTool's
 * armDraw("image")). Cancelled, or nothing to place: back to Move.
 */
export async function placeImages(arm: () => boolean): Promise<void> {
  const files = await choosePictures();
  const pictures = files.length ? await picturesOf(files) : [];
  if (studioStore.getState().tool !== "image") return;
  if (!pictures.length) { studioStore.setState({ tool: "select" }); return; }
  setPictures(pictures);
  if (!arm()) { dropPictures(); return; }
  say("unchanged", placingHint());
}
