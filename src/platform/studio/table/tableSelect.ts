import { deepPartAt, partChain, partForElement, type PartHit } from "../select/parts";
import { fiberOf, hitOf, srcOf, type FiberHit } from "../select/picker";
import { TABLE_PARTS, tableFiberOf } from "./tableCells";

/*
 * Figma's clicks through a Table (user, 2026-10-10: "giống Figma 100%"): Table › Data-Row › Cell (Table/Cell/Default) ›
 * its Content (the element a column's `cell` writes, else the component the Table draws: Text-Cell, Badge-Cell…) › the
 * text. A double-click goes one level in, Escape one level out, and with a row or a cell selected a click selects the
 * row or cell under the pointer (the same level). Rows and cells are parts of the Table (select/parts.ts names them).
 */

/** The Table's own root node(s): the hit is a Table when one of its DOM nodes is (or wraps) a `.zen-table`. */
export function isTableHit(hit: FiberHit | null | undefined): hit is FiberHit {
  return Boolean(hit?.fiber && hit.name === "Table" && hit.hosts.some((host) => host.matches(".zen-table") || host.querySelector(":scope > .zen-table")));
}

/** The Table that draws `element` is `owner` (not a Table nested in one of its cells). */
const ownTable = (owner: FiberHit, element: Element) => {
  const root = element.closest(".zen-table");
  return Boolean(root && owner.hosts.some((host) => host === root || host.contains(root)) && tableFiberOf(element) && owner.hosts.some((host) => host.contains(element)));
};

/** The Data-Row (a body <tr>) or Cell (a <td>) part of the Table `owner` that holds `element`, or null. */
export function tablePart(owner: FiberHit, element: Element | null, name: typeof TABLE_PARTS.row | typeof TABLE_PARTS.cell): PartHit | null {
  const node = element?.closest(name === TABLE_PARTS.row ? "tr.zen-table__row" : "td.zen-table__cell:not(.zen-table__select)") ?? null;
  if (!node || !ownTable(owner, node)) return null;
  return partForElement(owner, node, name);
}

/** The outermost element an example writes inside a cell, under the pointer (a column `cell`'s TableText…), or null. */
function contentIn(cell: Element, target: Element, ownerSrc: string): FiberHit | null {
  let outer: FiberHit | null = null;
  for (let fiber = fiberOf(target), guard = 0; fiber && guard < 400; fiber = fiber.return, guard++) {
    if (fiber.stateNode === cell) break;
    const src = srcOf(fiber);
    if (!src || src === ownerSrc) continue;
    const hit = hitOf(fiber);
    if (hit?.hosts.some((host) => cell.contains(host))) outer = hit;
  }
  return outer;
}

/** The part a Table's cell content is when the Table draws it itself (a column without `cell`): the outermost component in the cell. */
function drawnContent(cell: PartHit, target: Element): PartHit | null {
  const inside = partChain(cell.owner, target).filter((candidate) => candidate.isComponent && candidate.element !== cell.element && cell.element.contains(candidate.element));
  return inside[inside.length - 1] ?? null;
}

/** `edit`: the selection is the content the Table draws in a cell: a double-click edits its text in place. */
export type TableStep = { part: PartHit } | { hit: FiberHit } | { edit: true };

/**
 * Figma's double-click in a Table: the selected Table → the Data-Row under the pointer → the Cell → its Content. Null
 * when the selection is none of these, or the pointer is outside it.
 */
export function tableDrill(selected: FiberHit | null, part: PartHit | null, target: Element | null): TableStep | null {
  if (!target) return null;
  if (!part) {
    if (!isTableHit(selected)) return null;
    const row = tablePart(selected, target, TABLE_PARTS.row);
    return row ? { part: row } : null;
  }
  if (!part.element.contains(target)) return null;
  if (part.name === TABLE_PARTS.row) {
    const cell = tablePart(part.owner, target, TABLE_PARTS.cell);
    return cell ? { part: cell } : null;
  }
  if (part.name === TABLE_PARTS.cell) {
    const written = contentIn(part.element, target, part.owner.src);
    if (written) return { hit: written };
    const drawn = drawnContent(part, target);
    return drawn ? { part: drawn } : null;
  }
  // The content the Table draws in a cell (Text-Cell, Badge…): its text is the next level, as a text layer in Figma.
  const cell = part.element.closest("td.zen-table__cell:not(.zen-table__select)");
  return cell && part.name !== TABLE_PARTS.headerCell && ownTable(part.owner, cell) ? { edit: true } : null;
}

/**
 * Figma's ⌘-click (the deepest layer) on a cell the Table draws itself (a column without `cell`): the content there
 * (Text-Cell, Badge…), as a part of the Table, in one click. Null anywhere else (a column's `cell` writes layers of
 * its own, which the deep click already reaches).
 */
export function tableDeep(hit: FiberHit | null, target: Element | null): PartHit | null {
  if (!target || !isTableHit(hit)) return null;
  const cell = target.closest("td.zen-table__cell:not(.zen-table__select)");
  if (!cell || !ownTable(hit, cell)) return null;
  const part = deepPartAt(hit, target);
  return part && cell.contains(part.element) && part.element !== cell ? part : tablePart(hit, cell, TABLE_PARTS.cell);
}

/**
 * A press with a Table's row or cell selected: the row or cell under the pointer in the same Table (Figma keeps the
 * level), or null (elsewhere: the usual click).
 */
export function tablePress(part: PartHit | null, target: Element | null): PartHit | null {
  if (!part || !target || (part.name !== TABLE_PARTS.row && part.name !== TABLE_PARTS.cell)) return null;
  return tablePart(part.owner, target, part.name);
}

/**
 * Escape one level out of a Table's content: the content the Table draws (a part inside a cell) or the element a column's
 * `cell` writes (its outermost, `selected`) → its Cell; a Cell → its Data-Row. Null for anything else (a Data-Row goes
 * to the Table as any part goes to its owner).
 */
export function tableUp(selected: FiberHit | null, part: PartHit | null): { part: PartHit } | null {
  if (part) {
    if (part.name === TABLE_PARTS.row) return null;
    const name = part.name === TABLE_PARTS.cell ? TABLE_PARTS.row : TABLE_PARTS.cell;
    const up = tablePart(part.owner, part.name === TABLE_PARTS.cell ? part.element : part.element.parentElement, name);
    return up ? { part: up } : null;
  }
  const host = selected?.hosts[0];
  const cell = host?.closest("td.zen-table__cell:not(.zen-table__select)");
  if (!selected || !host || !cell) return null;
  const tableFiber = tableFiberOf(cell);
  const owner = tableFiber ? hitOf(tableFiber) : null;
  if (!owner || !isTableHit(owner)) return null;
  // Only the cell's outermost written element: an Avatar inside its TableMedia goes to the TableMedia as usual.
  if (contentIn(cell, host, owner.src)?.hosts[0] !== host) return null;
  const up = tablePart(owner, cell, TABLE_PARTS.cell);
  return up ? { part: up } : null;
}
