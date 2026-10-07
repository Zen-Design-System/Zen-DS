/*
 * A frame's picture (Studio builder GĐ5 M3, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3c, the user's
 * Q3: drawn in the browser): its exported markup inside an SVG foreignObject with the export's CSS, onto a canvas, as
 * PNG. An SVG image loads nothing, so the fonts and photos come in as data URLs. Best effort: what it cannot draw (a
 * video, a canvas, a frame, a photo that did not load) is listed for handoff.md.
 */

/** Elements a picture cannot show, by what they are. */
export function undrawable(root: Element): string[] {
  const notes: string[] = [];
  const count = (selector: string, what: string) => {
    const found = root.querySelectorAll(selector).length;
    if (found) notes.push(`${found} ${what}${found === 1 ? "" : "s"}`);
  };
  count("video", "video");
  count("canvas", "canvas drawing");
  count("iframe, object, embed", "embedded frame");
  return notes;
}

/**
 * `element` (an exported copy, its photos already data URLs) drawn at `width` × `height` CSS px with `css`, `scale`×
 * (2: a Retina picture); null when the browser cannot draw it.
 */
export async function drawPng(element: Element, css: string, { width, height, scale = 2 }: { width: number; height: number; scale?: number }): Promise<Blob | null> {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `width:${width}px;height:${height}px;overflow:hidden;`;
  const style = document.createElement("style");
  style.textContent = css;
  wrapper.append(style, element);
  // XML syntax (void elements closed, the XHTML namespace): an SVG image is parsed as XML.
  const xhtml = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}">${xhtml}</foreignObject></svg>`;
  const image = new Image();
  image.width = width;
  image.height = height;
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  try {
    await image.decode();
  } catch {
    return null;
  }
  // The fonts inside an SVG image settle a moment after it decodes.
  await new Promise((resolve) => setTimeout(resolve, 100));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.scale(scale, scale);
  context.drawImage(image, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
