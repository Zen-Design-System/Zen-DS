import { announceEditStatus, parseSrc, studioApi } from "../api";
import { flipTurn, turnOps } from "../position/positionModel";
import { selectedLayers, type ExtraLayer } from "../select/multiSelection";
import { canEdit } from "../store";
import type { EditOp } from "../types";
import { floatingItems, moveOps, type Attributes, type FloatingItem } from "./alignLayers";
import { unionOf } from "./arrangeModel";
import { setOwnPropsOnLayers } from "./multi";

/*
 * Figma's Flip horizontal (⇧H) and Flip vertical (⇧V) on the selection (plan docs/research/studio-figma-design-parity-
 * 2026-10-18.md F2): each layer mirrored about its centre (its rotation and flip as Session B's position model writes
 * them: flipTurn / turnOps), and several layers floating in one frame also swap places across the box around them, as
 * Figma flips a multi-selection as a whole. One edit, one ⌘Z. Frames (Box, Stack, Grid) and shapes turn and flip.
 */

const TURNABLE = new Set(["Box", "Stack", "Grid", "Shape"]);
const baseName = (name: string) => name.slice(name.lastIndexOf(".") + 1);
const say = (message: string) => announceEditStatus({ kind: "unchanged", message, at: Date.now() });

/** The literal number / string a prop is written as, else undefined. */
const literalNumber = (attributes: Attributes, name: string) => { const attr = attributes.find((candidate) => candidate.name === name && candidate.kind === "expression"); const value = Number(attr?.value); return Number.isFinite(value) ? value : undefined; };
const literalString = (attributes: Attributes, name: string) => attributes.find((candidate) => candidate.name === name && candidate.kind === "string")?.value;

export async function flipLayers(axis: "horizontal" | "vertical"): Promise<boolean> {
  if (!canEdit()) { say("View only"); return false; }
  const layers = selectedLayers();
  if (!layers.length) return false;
  const label = axis === "horizontal" ? "Flip horizontal" : "Flip vertical";
  const refused = layers.find((layer) => !TURNABLE.has(baseName(layer.name)));
  if (refused) { say(`${label} works on frames and shapes: ${refused.name} has no flip`); return false; }
  // Several floating layers of one frame: their places mirror across the box around them too.
  const found = layers.length > 1 ? floatingItems(layers) : null;
  const items = Array.isArray(found) && found.every((item) => item.block === found[0].block) ? found : null;
  const union = items ? unionOf(items.map((item) => item.box)) : null;
  const opsByLoc: Record<string, EditOp[]> = {};
  const targets: ExtraLayer[] = [];
  for (const layer of layers) {
    const at = parseSrc(layer.src);
    const element = at ? await studioApi.element(at.file, at.loc) : null;
    if (!at || !element) { say(`${layer.name} is no longer there — select it again`); return false; }
    const attributes = element.attributes as Attributes;
    const written = new Set(attributes.map((attr) => attr.name));
    const ops = turnOps(flipTurn(literalNumber(attributes, "rotation") ?? 0, literalString(attributes, "flip"), axis))
      .filter((op) => op.op !== "removeProp" || written.has(op.name));
    const item: FloatingItem | undefined = items?.find((candidate) => candidate.target.src === layer.src);
    if (item && union) {
      const move = axis === "horizontal"
        ? { dx: Math.round(2 * union.x + union.width - 2 * item.box.x - item.box.width), dy: 0 }
        : { dx: 0, dy: Math.round(2 * union.y + union.height - 2 * item.box.y - item.box.height) };
      if (move.dx || move.dy) ops.push(...moveOps(item, move, attributes, false));
    }
    if (!ops.length) continue;
    opsByLoc[at.loc] = ops;
    targets.push(layer);
  }
  if (!targets.length) return true;
  return setOwnPropsOnLayers(targets, opsByLoc, label);
}
