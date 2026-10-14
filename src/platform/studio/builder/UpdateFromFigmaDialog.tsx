import { useEffect, useState } from "react";
import { Checkbox } from "../../../components/Checkbox";
import { Dialog } from "../../../components/Dialog";
import { Text } from "../../../components/Text";
import type { PageDoc } from "../../../../tools/studio/browser-engine.mjs";
import type { FigmaChange } from "../../../../tools/studio/figma-diff.mjs";
import { applyPulled, pulledChanges } from "./figmaUpdate";

/*
 * Update from Figma (core rebuild M6, plan §6: "lần sau có khác biệt thì hiện diff để chọn"): a page pulled from a frame
 * that is imported again lists what Figma changed since the last pull, one checkbox each. Ticked at first: what changed
 * in Figma only. Unticked: a spot the Studio changed too (ticking it takes Figma's), and every change when this browser
 * has no record of the last pull (two ways: the Studio's own edits show as differences too). Apply is one edit.
 */

export type FigmaUpdate = { pageId: string; title: string; incoming: PageDoc };

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function UpdateFromFigmaDialog({ update, onClose, onApplied }: { update: FigmaUpdate; onClose: () => void; onApplied: (applied: number, skipped: string[]) => void }) {
  const [found, setFound] = useState<{ changes: FigmaChange[]; threeWay: boolean } | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    pulledChanges(update.pageId, update.incoming)
      .then((next) => {
        if (!alive) return;
        setFound(next);
        setPicked(new Set(next.changes.filter((change) => next.threeWay && !change.conflict).map((change) => change.key)));
      })
      .catch((reason: unknown) => { if (alive) setError(message(reason)); });
    return () => { alive = false; };
  }, [update]);

  const toggle = (key: string, on: boolean) => setPicked((current) => {
    const next = new Set(current);
    if (on) next.add(key); else next.delete(key);
    return next;
  });

  const apply = async () => {
    if (!found) return;
    setBusy(true);
    setError(null);
    try {
      const chosen = found.changes.filter((change) => picked.has(change.key));
      const skipped = await applyPulled(update.pageId, update.incoming, chosen);
      onApplied(chosen.length - skipped.length, skipped);
    } catch (reason) {
      setError(message(reason));
      setBusy(false);
    }
  };

  const count = picked.size;
  const description = !found
    ? `Comparing “${update.title}” with the new pull…`
    : !found.changes.length
      ? `“${update.title}” already matches the frame in Figma. The pull is kept as the base for the next one.`
      : found.threeWay
        ? `What changed in Figma since “${update.title}” last matched the frame (its export or its last pull). Changes on layers you also edited in the Studio are not ticked: ticking one takes Figma's.`
        : `This browser has no record of the frame's export or last pull, so every difference from the frame is listed, your own edits too. Tick the ones to take from Figma.`;

  return (
    <Dialog
      open
      icon={false}
      className="studio-figma-update"
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Update from Figma"
      description={description}
      primaryAction={{ label: busy ? "Updating…" : found && !found.changes.length ? "Done" : `Apply ${count} change${count === 1 ? "" : "s"}`, disabled: busy || !found, onClick: () => void apply() }}
      secondaryAction={{ label: "Cancel" }}
    >
      {found && found.changes.length > 0 && (
        <ul className="studio-figma-update__list" aria-label="Changes from Figma">
          {found.changes.map((change) => (
            <li key={change.key} className="studio-figma-update__item" data-change={change.key}>
              <Checkbox
                checked={picked.has(change.key)}
                onCheckedChange={(on) => toggle(change.key, on)}
                label={change.label}
                caption={change.conflict ? "Changed in the Studio too" : undefined}
              />
            </li>
          ))}
        </ul>
      )}
      {error && <Text as="p" textStyle="Body/Small/Regular" tone="negative-base" role="alert">{error}</Text>}
    </Dialog>
  );
}
