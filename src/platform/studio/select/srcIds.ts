/*
 * Stable element ids on the canvas of a page made in the Studio (user, 2026-10-13: "Refactor định danh layer để sửa gần
 * như tức thì"). A builder page marks each element with `<file>:@<id>`, its document id (doc.mjs: an edit keeps it),
 * instead of `<file>:<line>:<col>`, which every element below a new line would change: React then keeps every element
 * an edit did not touch (renderPage's render cache) instead of drawing the page again. This table turns an id back into
 * the element's place in the current text, so the rest of the Studio (selection, Inspector, edits) keeps working in
 * "file:line:col". Example and template code stays annotated by place (Vite's plugin).
 */

/** file → element id → "line:col" in the text the canvas shows. */
const places = new Map<string, Map<string, string>>();

const ID_SRC = /^(.*):@([\w-]+)$/;

/** Records where each element of `file` sits now (BuilderBoard, in the render that shows that text). */
export function setPlaces(file: string, placeOf: ReadonlyMap<string, string>) {
  places.set(file, new Map(placeOf));
}

/** "file:@id" → "file:line:col" (as the text the canvas shows has it); anything else as it is. */
export function resolveSrc(raw: string): string {
  const match = ID_SRC.exec(raw);
  if (!match) return raw;
  const place = places.get(match[1])?.get(match[2]);
  return place ? `${match[1]}:${place}` : raw;
}

/** An element's data-zen-src as "file:line:col" (null when it has none). */
export function srcAttr(element: Element | null | undefined): string | null {
  const raw = element?.getAttribute("data-zen-src");
  return raw ? resolveSrc(raw) : null;
}

/** A props object's data-zen-src as "file:line:col" (undefined when it has none). */
export function srcProp(props: Readonly<Record<string, unknown>> | null | undefined): string | undefined {
  const raw = props?.["data-zen-src"];
  return typeof raw === "string" && raw ? resolveSrc(raw) : undefined;
}

// The E2E harness's page helpers find elements by "file:line:col" through it.
if (typeof window !== "undefined") (window as unknown as { __zenResolveSrc?: typeof resolveSrc }).__zenResolveSrc = resolveSrc;
