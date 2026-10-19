import { useEffect, useState } from "react";
import { canvasApi } from "../canvas/viewport";
import { findBySrc, onSourceUpdate } from "../select/picker";
import { coloursOf, type ColourValue } from "./partInfo";
import { InputField } from "../../../components/Input";
import { BadgeCounter } from "../../../components/Badge";
import { InspectorSection } from "./Section";

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

/** Words Figma keeps whole in a variable's name ("Content/On-Accent"), not split at their dash. */
const COMPOUNDS = ["on-accent", "on-colors", "on-color", "on-brights", "on-bright"];

/** A colour variable in Figma's words: `--zen-color-content-neutral-strongest` → "Content / Neutral / Strongest". */
export function colourVariableName(token: string): string {
  let rest = token.replace(/^--zen-color-/, "").replace(/^--/, "");
  const parts: string[] = [];
  while (rest) {
    const compound = COMPOUNDS.find((word) => rest === word || rest.startsWith(`${word}-`));
    const part = compound ?? rest.split("-")[0];
    parts.push(part);
    rest = rest.slice(part.length).replace(/^-/, "");
  }
  return parts.map((part) => part.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("-")).join(" / ");
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
      {colours.map((used) => {
        // Figma's row: the swatch and the variable's name (the colour's value without one); how many layers in the end.
        const name = used.colour.tokens[0] ? colourVariableName(used.colour.tokens[0]) : used.colour.label;
        const layers = used.count > 1 ? `${used.count} layers` : "1 layer";
        return (
          <div key={used.key} className="studio-inspector__wide-field" data-prop="selection-color" title={`${name} · ${layers}`}>
            <InputField
              size="sm"
              readOnly
              aria-label={`${name}, ${layers}`}
              value={name}
              leading={<span className="studio-selection-color__swatch" style={{ background: used.colour.value }} aria-hidden="true" />}
              trailing={<BadgeCounter value={used.count} size="xs" theme="neutral" background="subtle" />}
            />
          </div>
        );
      })}
    </InspectorSection>
  );
}
