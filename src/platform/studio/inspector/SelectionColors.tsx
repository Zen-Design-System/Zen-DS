import { useEffect, useState } from "react";
import { canvasApi } from "../canvas/viewport";
import { findBySrc, onSourceUpdate } from "../select/picker";
import { coloursOf, type ColourValue } from "./partInfo";
import { ValueCell } from "./PartPanel";
import { InspectorRow, InspectorSection } from "./Section";

/*
 * Figma's Selection colors (F5c of docs/research/studio-figma-design-parity-2026-10-18.md): every colour the selected
 * layers and the layers inside them paint with, once each, named by its variable, with how many layers use it. Read from
 * what the canvas renders (partInfo coloursOf, as a part's colours are). Read-only: a colour changes on its layer (its
 * Fill, Stroke or its component's property), as Zen paints with variables.
 */

const MAX_LAYERS = 400;

type Used = { key: string; colour: ColourValue; count: number };

/** The colours `hosts` and the layers inside them paint with, most used first. */
export function selectionColours(hosts: readonly Element[]): Used[] {
  const byKey = new Map<string, Used>();
  let seen = 0;
  for (const host of hosts) {
    for (const element of [host, ...host.querySelectorAll("*")]) {
      if (++seen > MAX_LAYERS) break;
      if (!element.getClientRects().length) continue;
      for (const { colour } of coloursOf(element)) {
        const key = colour.tokens[0] ?? colour.key;
        const used = byKey.get(key);
        if (used) used.count += 1;
        else byKey.set(key, { key, colour, count: 1 });
      }
    }
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count);
}

/** The rendered elements of `layers` on the canvas (a repeated layer: the instance selected). */
function hostsOf(layers: ReadonlyArray<{ src: string; instance?: number }>): Element[] {
  const world = canvasApi.getWorldElement();
  if (!world) return [];
  return layers.flatMap((layer) => {
    const hits = findBySrc(world, layer.src);
    const hit = hits[layer.instance ?? 0] ?? hits[0];
    return hit ? hit.hosts : [];
  });
}

export function SelectionColors({ layers }: { layers: ReadonlyArray<{ src: string; instance?: number }> }) {
  const [colours, setColours] = useState<Used[]>([]);
  const key = layers.map((layer) => `${layer.src}#${layer.instance ?? 0}`).join("|");
  useEffect(() => {
    let frame = 0;
    const read = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setColours(selectionColours(hostsOf(layers)))); };
    read();
    const stop = onSourceUpdate(read);
    return () => { cancelAnimationFrame(frame); stop(); };
    // `key` stands for the layers: a new array of the same layers reads nothing again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (colours.length < 2) return null;
  return (
    <InspectorSection title="Selection colors">
      {colours.map((used) => (
        <InspectorRow key={used.key} label={used.count > 1 ? `${used.count} layers` : "1 layer"} name="selection-color">
          <ValueCell value={used.colour.label} tokens={used.colour.tokens} swatch={used.colour.value} />
        </InspectorRow>
      ))}
    </InspectorSection>
  );
}
