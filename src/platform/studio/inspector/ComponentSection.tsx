import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { InputField, SelectField } from "../../../components/Input";
import { parseSrc, subscribeStudioWrites } from "../api";
import { createInstance, detachInstance, goToMain, mainsOf, renameComponent, selectInstances, swapInstance, type MainRef } from "../edit/localComponents";
import type { StudioSelection } from "../types";
import { InspectorSection } from "./Section";

/*
 * Figma UI3's component block at the top of the Design panel, for a page's own components (edit/localComponents.ts):
 * on a main component its name (rename), Create instance and Select all instances; on an instance the component it
 * shows (Swap), Go to main component and Detach (⌥⌘B). Read again after every write, so undo shows at once.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
type Found = { mains: MainRef[]; main: MainRef | null; of: MainRef | null };

function useComponents(selection: NodeSelection): Found | null {
  const [found, setFound] = useState<Found | null>(null);
  useEffect(() => {
    let alive = true;
    const at = parseSrc(selection.src);
    if (!at) { setFound(null); return undefined; }
    const load = () => {
      void mainsOf(at.file).then(async (mains) => {
        if (!alive) return;
        const main = mains.find((entry) => entry.rootLoc === at.loc) ?? null;
        let of: MainRef | null = null;
        if (selection.name === "Use") {
          const id = mains.find((entry) => entry.uses.includes(at.loc))?.id;
          of = mains.find((entry) => entry.id === id) ?? null;
        }
        setFound({ mains, main, of });
      }).catch(() => { if (alive) setFound(null); });
    };
    load();
    const stop = subscribeStudioWrites(() => load());
    return () => { alive = false; stop(); };
  }, [selection.src, selection.name]);
  return found;
}

export function ComponentSection({ selection, disabled }: { selection: NodeSelection; disabled: boolean }) {
  const found = useComponents(selection);
  const [draft, setDraft] = useState<string | null>(null);
  if (!found || (!found.main && !found.of)) return null;
  if (found.main) {
    const main = found.main;
    return (
      <InspectorSection title="Component" className="studio-component-section">
        <InputField
          size="sm"
          aria-label="Component name"
          leading={<Icon name="icon-diamond-line" size="sm" decorative />}
          value={draft ?? main.name}
          disabled={disabled}
          onValueChange={setDraft}
          onBlur={() => { if (draft !== null) void renameComponent(main, draft); setDraft(null); }}
          onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); if (event.key === "Escape") setDraft(null); }}
        />
        <div className="studio-component-section__actions">
          <Button size="sm" level="tertiary" disabled={disabled} onClick={() => void createInstance(main, selection)}>Create instance</Button>
          <Button size="sm" level="tertiary" disabled={!main.uses.length} onClick={() => selectInstances(main, selection)}>{main.uses.length ? `Select ${main.uses.length} instance${main.uses.length > 1 ? "s" : ""}` : "No instances"}</Button>
        </div>
      </InspectorSection>
    );
  }
  const of = found.of!;
  return (
    <InspectorSection title="Instance" className="studio-component-section">
      <SelectField
        size="sm"
        aria-label="Component"
        leading={<Icon name="icon-diamond-line" size="sm" decorative />}
        value={of.id}
        disabled={disabled || found.mains.length < 2}
        options={found.mains.map((main) => ({ value: main.id, label: main.name }))}
        onValueChange={(next) => { const to = found.mains.find((main) => main.id === next); if (to && to.id !== of.id) void swapInstance(selection, to); }}
      />
      <div className="studio-component-section__actions">
        <Button size="sm" level="tertiary" onClick={() => void goToMain(selection)}>Go to main component</Button>
        <Button size="sm" level="tertiary" disabled={disabled} onClick={() => void detachInstance(selection)}>Detach instance</Button>
      </div>
    </InspectorSection>
  );
}
