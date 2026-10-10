import { useState, useSyncExternalStore } from "react";
import { Dialog } from "../../../components/Dialog";
import { typographyStyles } from "../../../tokens/typography.generated";
import { announceEditStatus, settleParity } from "../api";
import { refreshDrafts } from "../sourceDrafts";
import { parityStore, type ParityReport } from "./parity";
import "./mainComponent.css";

/*
 * A saved component stylesheet that no longer matches Figma (Main component M3; the user's rule, 2026-10-09: warn, keep
 * the save if the admin says so, log the Figma update). Mounted once with the Studio's other dialogs.
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
      title={report ? `${fileName(report.file)} no longer matches Figma` : ""}
      description={report
        ? report.failures
          ? `${report.failures} check${report.failures === 1 ? "" : "s"} differ in ${variants} variant${variants === 1 ? "" : "s"} (${report.suites} suites, ${report.total ?? 0} checks). Keep the save and log the Figma update in the backlog, or undo the save.`
          : "The Figma check did not finish. Keep the save, or undo it."
        : ""}
      theme="warning"
      icon="icon-alert-triangle-line"
      primaryAction={{ label: "Keep and log for Figma", onClick: () => { void answer("keep"); } }}
      secondaryAction={{ label: "Undo the save", level: "danger-subtle", onClick: () => { void answer("revert"); } }}
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
