import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/Button";
import { ModalForm } from "../../../components/Dialog";
import { InputField } from "../../../components/Input";
import { typographyStyles } from "../../../tokens/typography.generated";
import { batchNames, renamableLayers, renameLayers, setBatchRenameOpen, useBatchRenameOpen } from "../edit/rename";
import "./shell.css";

/** How many renamed layers the preview lists before "N more". */
const PREVIEW = 6;

/**
 * Figma's Rename layers (⌘R with several layers selected): "Rename to" with the current name ($&) and numbers counting up
 * ($n) or down ($N), "Match" to replace only part of each name, "Start from" for the numbers, and a preview. One ⌘Z.
 * Three fields make it a form, so it is a ModalForm, not a Dialog (user rule 2026-10-21: a Dialog is for a notice or a
 * quick confirm): Enter or Rename submits.
 */
export function BatchRenameDialog() {
  const open = useBatchRenameOpen();
  const [pattern, setPattern] = useState("$&");
  const [match, setMatch] = useState("");
  const [start, setStart] = useState("1");
  const layers = useMemo(() => (open ? renamableLayers() : []), [open]);
  useEffect(() => { if (open) { setPattern("$&"); setMatch(""); setStart("1"); } }, [open]);
  const names = batchNames(layers.map((layer) => layer.current), pattern, { match, start: Number.parseInt(start, 10) || 1 });
  const add = (token: string) => setPattern((current) => `${current}${token}`);
  const apply = () => { void renameLayers(layers, names).then((done) => { if (done) setBatchRenameOpen(false); }); };
  return (
    <ModalForm
      open={open}
      onOpenChange={setBatchRenameOpen}
      title={`Rename ${layers.length} layers`}
      className="studio-rename"
      primaryAction={{ label: "Rename", disabled: !layers.length }}
      secondaryAction={{ label: "Cancel" }}
      onSubmit={() => { if (layers.length) apply(); }}
    >
      <div className="studio-rename__fields">
        <InputField size="sm" label="Rename to" value={pattern} onValueChange={setPattern} autoFocus />
        <div className="studio-rename__tokens" role="group" aria-label="Add to the name">
          <Button size="sm" level="tertiary" onClick={() => add("$&")}>Current name</Button>
          <Button size="sm" level="tertiary" onClick={() => add("$n")}>Number ↑</Button>
          <Button size="sm" level="tertiary" onClick={() => add("$N")}>Number ↓</Button>
        </div>
        <InputField size="sm" label="Match" placeholder="The whole name" value={match} onValueChange={setMatch} />
        <InputField size="sm" label="Start from" inputMode="numeric" value={start} onValueChange={setStart} />
      </div>
      <ul className={`studio-rename__preview ${typographyStyles["Body/Small/Regular"]}`} aria-label="Preview">
        {layers.slice(0, PREVIEW).map((layer, index) => (
          <li key={`${layer.src}#${layer.instance}`}><span className="studio-rename__from">{layer.current}</span> → {names[index] || layer.current}</li>
        ))}
        {layers.length > PREVIEW ? <li className="studio-rename__from">{`${layers.length - PREVIEW} more`}</li> : null}
      </ul>
    </ModalForm>
  );
}
