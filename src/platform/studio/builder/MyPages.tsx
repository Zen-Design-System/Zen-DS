import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Dialog, ModalForm } from "../../../components/Dialog";
import { Icon } from "../../../components/Icon";
import { InputField } from "../../../components/Input";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { Text } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { announceEditStatus } from "../api";
import { navigate, openLocalPage } from "../shell/navigation";
import { studioStore, useStudio } from "../store";
import { unzipFiles } from "../../../../tools/studio/zip.mjs";
import { assetIdsOf, putAsset } from "./assets/uploads";
import { loadEngine, zenComponents } from "./engine";
import { openExport } from "./export/exportState";
import { canLinkFolder, linkFolder, reconnectFolder, resyncPages, unlinkFolder } from "./store/mirrors";
import { idFromFileName, trashDaysLeft, type RevisionReason } from "./store/pageModel";
import { deleteForever, duplicatePage, getPage, importPage, listRevisions, renamePage, restorePage, restoreRevision, trashPage, useStorage, useTrash, type PageMeta, type Revision } from "./store/pageStore";

/*
 * My pages in the Pages panel (Studio builder GĐ2 M2, spec docs/research/studio-builder-pages-spec-2026-10-06.md §3 2c):
 * the section's options (Import, Trash, Link folder, Sync), where the pages are kept, and each page's actions (Rename,
 * Duplicate, Export, Version history, Move to Trash). Changing a page needs the Admin role, as editing one does.
 */

const say = (kind: "saved" | "error", message: string) => announceEditStatus({ kind, message, at: Date.now() });
const fail = (error: unknown) => say("error", error instanceof Error ? error.message : String(error));
const when = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const REASON: Record<RevisionReason, string> = {
  edit: "Before edits",
  rename: "Before a rename",
  restore: "Before a restore",
  import: "Before an import",
  folder: "Before a change from the folder",
  conflict: "This browser's version (the folder's won)",
};

/** Downloads the page's text as <id>.zen.tsx, byte for byte. */
export async function exportPage(id: string) {
  const page = await getPage(id);
  if (!page) return;
  const url = URL.createObjectURL(new Blob([page.text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${id}.zen.tsx`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Leaves the page when it is the one on the canvas (it went to the Trash). */
function leaveIfOpen(id: string) {
  const state = studioStore.getState();
  if (state.localPage === id) navigate(state.page, state.collection);
}

/** "My pages" kicker with New page and the section's options, then where the pages are kept. */
export function MyPagesHeader({ onNew }: { onNew: () => void }) {
  const admin = useStudio((state) => state.role === "admin");
  const storage = useStorage();
  const trash = useTrash();
  const [trashOpen, setTrashOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const importFiles = async (files: File[]) => {
    if (!files.length) return;
    const engine = await loadEngine();
    const opened: string[] = [];
    const refused: string[] = [];
    // A handoff package (.zip, GĐ5 M4) brings its design file and the uploaded photos it uses (assets/<id>).
    const entries: Array<{ name: string; text: string; assets: Map<string, Uint8Array> }> = [];
    for (const file of files) {
      if (!/\.zip$/i.test(file.name)) { entries.push({ name: file.name, text: await file.text(), assets: new Map() }); continue; }
      let unpacked: Array<{ path: string; data: Uint8Array }>;
      try {
        unpacked = unzipFiles(new Uint8Array(await file.arrayBuffer()));
      } catch {
        refused.push(`${file.name} (not a zip Zen Studio wrote)`);
        continue;
      }
      const assets = new Map(unpacked.filter((entry) => /^assets\/[\w.-]+$/.test(entry.path)).map((entry) => [entry.path.slice("assets/".length), entry.data]));
      const pages = unpacked.filter((entry) => /^[^/]+\.zen\.tsx$/.test(entry.path));
      if (!pages.length) refused.push(`${file.name} (no .zen.tsx in it)`);
      for (const page of pages) entries.push({ name: page.path, text: new TextDecoder().decode(page.data), assets });
    }
    for (const entry of entries) {
      const errors = engine.validateDialect(entry.text, { components: new Set(zenComponents) });
      if (errors.length) { refused.push(`${entry.name} (line ${errors[0].line}: ${errors[0].message})`); continue; }
      for (const id of assetIdsOf(entry.text)) {
        const data = entry.assets.get(id);
        if (data) await putAsset(id, new Blob([data as Uint8Array<ArrayBuffer>]));
      }
      opened.push(await importPage(entry.text, idFromFileName(entry.name)));
    }
    if (opened.length === 1) openLocalPage(opened[0]);
    if (refused.length) say("error", `Not imported: ${refused.join("; ")}`);
    else say("saved", `Imported ${opened.length} page${opened.length === 1 ? "" : "s"}`);
  };

  const items: MenuEntry[] = [
    { id: "import", label: "Import pages…", icon: "icon-upload-01-line", disabled: !admin, onSelect: () => input.current?.click() },
    { id: "trash", label: trash.length ? `Trash (${trash.length})` : "Trash", icon: "icon-trash-line", onSelect: () => setTrashOpen(true) },
  ];
  if (storage.kind === "mirror") items.push({ type: "separator" }, { id: "sync", label: "Sync with the folder", icon: "icon-refresh-ccw-01-line", onSelect: () => void resyncPages() });
  if (storage.kind === "mirror" && storage.mirror === "folder") items.push({ id: "unlink", label: "Unlink folder", icon: "icon-folder-x-line", caption: "Pages stay in this browser", onSelect: () => void unlinkFolder() });
  else if (storage.kind !== "mirror" && canLinkFolder()) items.push({ type: "separator" }, { id: "link", label: "Link folder…", icon: "icon-folder-line", caption: "Keep a copy of every page in a folder", disabled: !admin, onSelect: () => void linkFolder().catch(fail) });

  return (
    <>
      <div className="studio-pages__kicker-row">
        <Text as="p" id="studio-pages-mine" textStyle="Caption/Medium" tone="base" className="studio-pages__kicker">My pages</Text>
        <IconButton icon="icon-plus-line" aria-label="New page" appearance="flat" level="primary" size="xs" disabled={!admin} onClick={onNew} />
        <Menu align="end" aria-label="My pages options" items={items} trigger={<IconButton icon="icon-dots-horizontal-line" aria-label="My pages options" appearance="flat" level="primary" size="xs" />} />
      </div>
      <StorageLine />
      <input ref={input} type="file" accept=".tsx,.zip" multiple hidden data-e2e="import-pages" onChange={(event) => {
        // Copied first: clearing the input (so the same file can be picked again) empties its live FileList.
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        void importFiles(files).catch(fail);
      }} />
      <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} pages={trash} admin={admin} />
    </>
  );
}

/** Where the pages are kept: this browser, the dev server's folder, a linked folder (or one to reconnect). */
function StorageLine() {
  const storage = useStorage();
  let text: string;
  if (storage.kind === "browser") text = "In this browser · Export to keep a copy";
  else if (storage.kind === "reconnect") text = `Folder “${storage.label}” needs access again`;
  else if (storage.error) text = `Not synced: ${storage.error}`;
  else text = `${storage.syncing ? "Syncing with" : "Kept in"} ${storage.mirror === "dev" ? storage.label : `“${storage.label}”`}`;
  return (
    <div className="studio-pages__storage" data-storage={storage.kind} data-error={storage.kind === "mirror" && storage.error ? "true" : undefined}>
      <Text as="p" textStyle="Caption/Regular" tone={storage.kind === "mirror" && storage.error ? "negative" : "base"} className="studio-pages__storage-text" role="status">{text}</Text>
      {/* zen-allow-compact-button: Studio chrome — a quiet action on the panel's one-line caption, like a row pill. */}
      {storage.kind === "reconnect" ? <Button appearance="flat" level="primary" size="xs" onClick={() => void reconnectFolder().catch(fail)}>Reconnect</Button> : null}
      {/* zen-allow-compact-button: Studio chrome — a quiet action on the panel's one-line caption, like a row pill. */}
      {storage.kind === "mirror" && storage.error ? <Button appearance="flat" level="primary" size="xs" onClick={() => void resyncPages()}>Retry</Button> : null}
    </div>
  );
}

/** One page under My pages: the row (opens it) and its actions. */
export function MyPageRow({ item, current, tabIndex }: { item: PageMeta; current: boolean; tabIndex: number }) {
  const admin = useStudio((state) => state.role === "admin");
  const [dialog, setDialog] = useState<null | "rename" | "history">(null);
  const items: MenuEntry[] = [
    { id: "rename", label: "Rename…", icon: "icon-pencil-line", disabled: !admin, onSelect: () => setDialog("rename") },
    { id: "duplicate", label: "Duplicate", icon: "icon-copy-line", disabled: !admin, onSelect: () => void duplicatePage(item.id).then(openLocalPage, fail) },
    { id: "export-code", label: "Export…", icon: "icon-code-02-line", caption: "React code or the design file", onSelect: () => openExport(item.id) },
    { id: "export", label: "Export file", icon: "icon-download-01-line", caption: `${item.id}.zen.tsx`, onSelect: () => void exportPage(item.id).catch(fail) },
    { id: "history", label: "Version history…", icon: "icon-clock-rewind-line", onSelect: () => setDialog("history") },
    { type: "separator" },
    { id: "trash", label: "Move to Trash", icon: "icon-trash-line", danger: true, disabled: !admin, onSelect: () => { leaveIfOpen(item.id); void trashPage(item.id).catch(fail); } },
  ];
  return (
    <li className="studio-pages__item">
      <button type="button" className="studio-pages__row" aria-current={current ? "page" : undefined} tabIndex={tabIndex} onClick={() => openLocalPage(item.id)}>
        <Icon name="icon-file-code-line" size="sm" decorative />
        <span className={`studio-pages__name ${typographyStyles[current ? "Body/Small/Bold" : "Body/Small/Medium"]}`}>{item.title}</span>
      </button>
      <span className="studio-pages__actions">
        <Menu align="end" aria-label={`${item.title} actions`} items={items} trigger={<IconButton icon="icon-dots-horizontal-line" aria-label={`${item.title} actions`} appearance="flat" level="primary" size="xs" tabIndex={-1} />} />
      </span>
      {dialog === "rename" ? <RenameDialog page={item} onClose={() => setDialog(null)} /> : null}
      {dialog === "history" ? <HistoryDialog page={item} admin={admin} onClose={() => setDialog(null)} /> : null}
    </li>
  );
}

function RenameDialog({ page, onClose }: { page: PageMeta; onClose: () => void }) {
  const [title, setTitle] = useState(page.title);
  const [error, setError] = useState<string | null>(null);
  return (
    <ModalForm
      open
      onOpenChange={(next) => { if (!next) onClose(); }}
      title="Rename page"
      description={`The file stays ${page.id}.zen.tsx.`}
      onSubmit={() => {
        const name = title.trim();
        if (!name) { setError("Give the page a title"); return; }
        void renamePage(page.id, name).then(onClose, fail);
      }}
      primaryAction={{ label: "Rename" }}
      secondaryAction={{ label: "Cancel" }}
    >
      <InputField label="Title" size="md" value={title} autoFocus error={Boolean(error)} errorMessage={error ?? undefined} onChange={(event) => { setTitle(event.target.value); if (error) setError(null); }} />
    </ModalForm>
  );
}

function HistoryDialog({ page, admin, onClose }: { page: PageMeta; admin: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<Revision[] | null>(null);
  useEffect(() => { void listRevisions(page.id).then(setRows); }, [page.id]);
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }} title="Version history" description={`Earlier versions of “${page.title}” kept in this browser (the last 50).`} icon={false} secondaryAction={{ label: "Close" }}>
      {rows === null ? null : rows.length ? (
        <ul className="studio-page-list" aria-label="Versions">
          {rows.map((row) => (
            <li key={row.key} className="studio-page-list__row">
              <span className="studio-page-list__text">
                <Text as="span" textStyle="Body/Small/Medium">{when.format(row.at)}</Text>
                <Text as="span" textStyle="Caption/Regular" tone="base">{REASON[row.reason] ?? row.reason}</Text>
              </span>
              <Button appearance="main" level="tertiary" size="sm" disabled={!admin} onClick={() => void restoreRevision(page.id, row.key).then(onClose, fail)}>Restore</Button>
            </li>
          ))}
        </ul>
      ) : <Text tone="base">No earlier versions yet. One is kept before each burst of edits, a rename or a restore.</Text>}
    </Dialog>
  );
}

function TrashDialog({ open, onOpenChange, pages, admin }: { open: boolean; onOpenChange: (open: boolean) => void; pages: PageMeta[]; admin: boolean }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const now = Date.now();
  return (
    <Dialog open={open} onOpenChange={(next) => { setConfirming(null); onOpenChange(next); }} title="Trash" description="Pages here are deleted for good after 30 days." icon={false} secondaryAction={{ label: "Close" }}>
      {pages.length ? (
        <ul className="studio-page-list" aria-label="Pages in the Trash">
          {pages.map((page) => (
            <li key={page.id} className="studio-page-list__row">
              <span className="studio-page-list__text">
                <Text as="span" textStyle="Body/Small/Medium">{page.title}</Text>
                <Text as="span" textStyle="Caption/Regular" tone="base">{`${trashDaysLeft(page.trashedAt ?? now, now)} days left · ${page.id}.zen.tsx`}</Text>
              </span>
              <Button appearance="main" level="tertiary" size="sm" disabled={!admin} onClick={() => void restorePage(page.id).catch(fail)}>Restore</Button>
              <Button appearance="main" level={confirming === page.id ? "danger" : "danger-subtle"} size="sm" disabled={!admin} onClick={() => {
                if (confirming !== page.id) { setConfirming(page.id); return; }
                setConfirming(null);
                void deleteForever(page.id).catch(fail);
              }}>{confirming === page.id ? "Delete forever" : "Delete"}</Button>
            </li>
          ))}
        </ul>
      ) : <Text tone="base">The Trash is empty.</Text>}
    </Dialog>
  );
}
