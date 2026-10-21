/*
 * Which frames a Section holds (Figma's sections, F4): a Section is a Board child beside the frames (dialect
 * boardSections), so what it holds is read from where things are on the board. A frame or a Section belongs to the
 * smallest other Section its middle lies in; moving a Section moves everything whose middle lies in it (frameMove.ts),
 * copying it (⌥-drag, ⌘D, ⌘C ⌘V) copies them (frameEdit.ts copySection), deleting it deletes them (Figma's Delete; ⌘⌫
 * keeps them). Boxes are the board's frame px (offsets in
 * `.studio-builder-board__frames`), so they hold at every zoom. Layers (select/LayersPanel.tsx) nests rows with
 * sectionOf; ⌘A takes the top-level ones (sectionOf null). No imports: `node sections.selftest.mjs` runs it as is.
 */

const FRAMES = ".studio-builder-board__frames";

export type BoardBox = { id: string; x: number; y: number; width: number; height: number };

export const isSectionId = (id: string | null | undefined): id is string => typeof id === "string" && id.startsWith("section:");

/** Every frame and Section on the builder board now, in board order, with its box. */
export function boardBoxes(container: Element | null = document.querySelector(FRAMES)): BoardBox[] {
  if (!container) return [];
  return Array.from(container.children).flatMap((child) => {
    if (!(child instanceof HTMLElement) || !child.dataset.studioFrame) return [];
    return [{ id: child.dataset.studioFrame, x: child.offsetLeft, y: child.offsetTop, width: child.offsetWidth, height: child.offsetHeight }];
  });
}

const middleIn = (box: BoardBox, area: BoardBox) => {
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  return x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;
};

/** The Section `box` belongs to among `boxes`: the smallest other Section its middle lies in, or null. */
export function sectionAround(box: BoardBox, boxes: readonly BoardBox[]): string | null {
  let best: BoardBox | null = null;
  for (const area of boxes) {
    if (!isSectionId(area.id) || area.id === box.id || !middleIn(box, area)) continue;
    // A Section never holds one larger than itself (two of the same size: the one written first holds).
    if (isSectionId(box.id) && area.width * area.height < box.width * box.height) continue;
    if (!best || area.width * area.height < best.width * best.height) best = area;
  }
  return best?.id ?? null;
}

/** The Section a frame (or Section) belongs to on the board now, or null (top level). */
export function sectionOf(frameId: string, boxes: readonly BoardBox[] = boardBoxes()): string | null {
  const box = boxes.find((entry) => entry.id === frameId);
  return box ? sectionAround(box, boxes) : null;
}

/** Each Section's own frames and Sections (one level), in board order. */
export function sectionMembers(boxes: readonly BoardBox[] = boardBoxes()): Map<string, string[]> {
  const members = new Map<string, string[]>(boxes.filter((box) => isSectionId(box.id)).map((box) => [box.id, []]));
  for (const box of boxes) {
    const around = sectionAround(box, boxes);
    if (around) members.get(around)?.push(box.id);
  }
  return members;
}

/** Everything a Section carries when it moves or is deleted: its frames and Sections, and theirs (any depth). */
export function sectionContents(sectionId: string, boxes: readonly BoardBox[] = boardBoxes()): string[] {
  const members = sectionMembers(boxes);
  const out: string[] = [];
  const walk = (id: string) => { for (const member of members.get(id) ?? []) { out.push(member); walk(member); } };
  walk(sectionId);
  return out;
}

/** The box around `boxes` with `padding` on each side (a Section made around the selected frames). */
export function boxAround(boxes: readonly Omit<BoardBox, "id">[], padding: number): Omit<BoardBox, "id"> | null {
  if (!boxes.length) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: Math.round(left - padding), y: Math.round(top - padding), width: Math.round(right - left + padding * 2), height: Math.round(bottom - top + padding * 2) };
}

/** Frames in reading order: rows by their tops (a frame starting above the middle of the row's shortest frame joins it). */
export function readingOrder(boxes: readonly BoardBox[]): BoardBox[] {
  const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: BoardBox[][] = [];
  for (const box of sorted) {
    const row = rows.at(-1);
    const reach = row ? Math.min(...row.map((item) => item.y + item.height / 2)) : -Infinity;
    if (row && box.y < reach) row.push(box);
    else rows.push([box]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x));
}
