/*
 * A picture the person attaches to a Zen Agent message (plan docs/research/studio-vibe-agent-2026-10-18.md §9, V1a),
 * scaled down in the browser before it goes: the model reads up to about 1568 px on the long side, and the dev server takes
 * at most ~2 MB per picture. A small JPEG thumbnail is kept for the transcript.
 */

const MAX_SIDE = 1568;
const THUMB_SIDE = 96;
/** Base64 characters the dev server accepts per picture (tools/studio/agent/routes.mjs MAX_IMAGE), with room to spare. */
const MAX_DATA = 2_800_000;

const canvasOf = (bitmap: ImageBitmap, side: number) => {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const base64Of = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(",") + 1);

/** { mediaType, data (base64), thumb (a data URL) } of an image file or blob. */
export async function pictureOf(file: Blob): Promise<{ mediaType: string; data: string; thumb: string }> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = canvasOf(bitmap, MAX_SIDE);
    // A PNG (a screenshot, flat UI) stays PNG while it fits; anything else, or a PNG too large, goes as JPEG.
    let mediaType = file.type === "image/png" ? "image/png" : "image/jpeg";
    let data = base64Of(canvas.toDataURL(mediaType, 0.86));
    if (data.length > MAX_DATA) {
      mediaType = "image/jpeg";
      data = base64Of(canvas.toDataURL(mediaType, 0.8));
    }
    const thumb = canvasOf(bitmap, THUMB_SIDE).toDataURL("image/jpeg", 0.7);
    return { mediaType, data, thumb };
  } finally {
    bitmap.close();
  }
}
