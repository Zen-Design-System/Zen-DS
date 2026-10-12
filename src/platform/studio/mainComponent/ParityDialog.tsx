import { useState, useSyncExternalStore } from "react";
import { Dialog } from "../../../components/Dialog";
import { typographyStyles } from "../../../tokens/typography.generated";
import { announceEditStatus, settleParity } from "../api";
import { refreshDrafts } from "../sourceDrafts";
import { downloadText } from "../builder/export/ExportDialog";
import { parityStore, type ParityReport } from "./parity";
import "./mainComponent.css";

/*
 * A saved component stylesheet that no longer matches Figma (Main component M3; the user's rule, 2026-10-09: warn, keep
 * the save if the admin says so, log the Figma update). Its token changes also come as the re-binding Figma needs (core
 * rebuild Q5(2), tools/studio/rebind.mjs): Download for Figma saves it for the Zen plugin's Import from Studio, also when
 * the save draws as Figma does but Figma still binds the variables the code left. Mounted once with the other dialogs.
 */

const SHOWN = 8;
const fileName = (file: string) => file.slice(file.lastIndexOf("/") + 1);
const variantText = (variant: Readonly<Record<string, string>>) => Object.entries(variant).map(([key, value]) => `${key}=${value}`).join(", ");

export function ParityDialog() {
  const asked = useSyncExternalStore(parityStore.subscribe, parityStore.get, parityStore.get);
  // The question stays readable while the dialog fades out after an answer.
  const [shown, setShown] = useState<ParityReport | null>(asked);
  const [busy, setBusy] = useState(false);
  if (asked && asked !== shown) setShown(asked);
  const report = shown;
  const rows = report?.rows ?? [];
  const variants = report?.variants ?? new Set(rows.map((row) => `${row.suite}|${variantText(row.variant)}`)).size;
  const rebind = report?.rebind ?? null;
  const offFigma = Boolean(report?.failures || report?.errors?.length);
  const downloadRebind = () => {
    if (!rebind) return;
    downloadText(`${rebind.component.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-rebind.figma.json`, `${JSON.stringify(rebind, null, 2)}\n`);
    announceEditStatus({ kind: "saved", message: `Re-binding for Figma downloaded (${rebind.changes.length} layer field${rebind.changes.length === 1 ? "" : "s"}): in the Zen plugin, Import › Import from Studio`, at: Date.now() });
  };
  const rebindLine = rebind ? `${rebind.changes.length} layer field${rebind.changes.length === 1 ? "" : "s"} of ${rebind.component} in Figma still bind the variables the code left; Download for Figma gives the Zen plugin the update.` : "";
  const answer = async (action: "keep" | "revert") => {
    if (!report || busy) return;
    setBusy(true);
    const result = await settleParity(report.id, action);
    setBusy(false);
    if (!result.ok) announceEditStatus({ kind: "error", message: result.error, at: Date.now() });
    else if (action === "revert") void refreshDrafts();
  };
  return (
    <Dialog
      open={Boolean(asked)}
      onOpenChange={(open) => { if (!open && report) parityStore.dismiss(report.id); }}
      title={report ? (offFigma ? `${fileName(report.file)} no longer matches Figma` : `Update Figma's ${rebind?.component ?? "component"}`) : ""}
      description={report
        ? !offFigma
          ? `${fileName(report.file)} is saved and draws as Figma does. ${rebindLine}`
          : report.failures
            ? `${report.failures} check${report.failures === 1 ? "" : "s"} differ in ${variants} variant${variants === 1 ? "" : "s"} (${report.suites} suites, ${report.total ?? 0} checks). Keep the save and log the Figma update in the backlog, or undo the save.${rebind ? ` ${rebindLine}` : ""}`
            : `The Figma check did not finish. Keep the save, or undo it.${rebind ? ` ${rebindLine}` : ""}`
        : ""}
      theme={offFigma ? "warning" : undefined}
      icon={offFigma ? "icon-alert-triangle-line" : "ic-figma-line"}
      primaryAction={offFigma ? { label: "Keep and log for Figma", onClick: () => { void answer("keep"); } } : { label: "Download for Figma", onClick: () => { downloadRebind(); if (report) parityStore.settle(report.id); } }}
      secondaryAction={offFigma ? { label: "Undo the save", level: "danger-subtle", onClick: () => { void answer("revert"); } } : { label: "Not now", onClick: () => { if (report) parityStore.dismiss(report.id); } }}
      tertiaryAction={offFigma && rebind ? { label: "Download for Figma", onClick: downloadRebind } : undefined}
    >
      {rows.length || report?.errors?.length ? (
        <ul className={`studio-mc__drift ${typographyStyles["Body/Small/Regular"]}`}>
          {rows.slice(0, SHOWN).map((row) => (
            <li key={`${row.suite}|${variantText(row.variant)}|${row.layer}|${row.prop}`}>
              <span className="studio-mc__drift-where">{row.suite} · {variantText(row.variant)} · {row.layer}.{row.prop}</span>
              <span>Figma {row.figma} · code {row.code}</span>
            </li>
          ))}
          {rows.length > SHOWN || report?.more ? <li>…and {Math.max(0, rows.length - SHOWN) + (report?.more ?? 0)} more</li> : null}
          {report?.errors?.map((error) => <li key={error}>Not checked: {error}</li>)}
        </ul>
      ) : null}
    </Dialog>
  );
}
