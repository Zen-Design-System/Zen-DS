import { announceEditStatus } from "../api";

/*
 * The Figma check after a component stylesheet is saved (Main component M3, spec §3.6): the dev server runs the
 * component's contract suites in the background and sends each check's progress as a Vite custom event. The status line
 * says it is checking, then that it matches; a check that finds drift is kept here for the dialog (ParityDialog).
 */

export type ParityRow = { suite: string; modes: string[]; variant: Readonly<Record<string, string>>; layer: string; prop: string; figma: string; code: string };
export type ParityReport = {
  id: string;
  file: string;
  suites: number;
  status: "running" | "done";
  total?: number;
  failures?: number;
  /** How many variants (of every suite) the failures are in. */
  variants?: number;
  rows?: ParityRow[];
  more?: number;
  errors?: string[];
  kept: boolean;
  reverted: boolean;
};

const fileName = (file: string) => file.slice(file.lastIndexOf("/") + 1);
let open: ParityReport | null = null;
const dismissed = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => { for (const listener of listeners) listener(); };

/** The check the dialog asks about: done, off Figma, not yet kept, undone or set aside. */
export const parityStore = {
  get: () => open,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  /** Closed without an answer: the save stays, the status line says it is undecided. */
  dismiss(id: string) {
    dismissed.add(id);
    if (open?.id === id) { open = null; emit(); }
    announceEditStatus({ kind: "warning", message: `The save stays off Figma (not logged): run its suite again after a fix`, at: Date.now() });
  },
};

export function receiveParity(report: ParityReport) {
  const name = fileName(report.file);
  if (report.status === "running") {
    announceEditStatus({ kind: "unchanged", message: report.suites ? `Checking ${name} against Figma (${report.suites} suite${report.suites === 1 ? "" : "s"})…` : `${name}: no Figma contract to check`, at: Date.now() });
    return;
  }
  if (report.reverted) announceEditStatus({ kind: "undone", message: `${name}: the save was undone`, at: Date.now() });
  else if (report.kept) announceEditStatus({ kind: "warning", message: `${name} stays off Figma: logged in the backlog`, at: Date.now() });
  else if (!report.suites) announceEditStatus({ kind: "saved", message: `${name} saved (no Figma contract for it)`, at: Date.now() });
  else if (!report.failures && !report.errors?.length) announceEditStatus({ kind: "saved", message: `${name} matches Figma (${report.total ?? 0} checks)`, at: Date.now() });
  const asking = Boolean(report.failures || report.errors?.length) && !report.kept && !report.reverted && !dismissed.has(report.id);
  if (asking) open = report;
  else if (open?.id === report.id) open = null;
  emit();
}

// Every page of the Studio hears the dev server's checks.
import.meta.hot?.on("zen-studio:parity", (data: ParityReport) => receiveParity(data));
