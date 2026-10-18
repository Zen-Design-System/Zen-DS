import { useEffect, useState } from "react";
import { Dialog, ModalForm } from "../../../components/Dialog";
import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { InputField } from "../../../components/Input";
import { Menu } from "../../../components/Menu";
import { plural, Text } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { announceEditStatus } from "../api";
import { studioStore, useStudio } from "../store";
import { MyPageRow } from "./MyPages";
import { RenameField } from "./RenameField";
import { createFolder, deleteFolder, renameFolder, type StudioFolder } from "./store/folderStore";
import { cachedPage, movePage, type PageMeta } from "./store/pageStore";
import { moveEntry, orderedEntries, removeDivider, showEntries, usePageOrder } from "./store/pageOrderStore";
import { activeProjectId } from "../project/activeProject";

/*
 * The Studio space's folders (user, 2026-10-09: "Studio lets people make folders and pages / canvases inside each"):
 * each folder is a row that opens and closes its pages, with New page in it and its options (Rename, Delete); pages in
 * no folder follow under "Not in a folder". The rows share the Pages panel's keys (↑/↓, Home, End: PagesPanel).
 */

const fail = (error: unknown) => announceEditStatus({ kind: "error", message: error instanceof Error ? error.message : String(error), at: Date.now() });

/** New folder: a name, then Create (a folder is renamed in place in the list: RenameField). */
export function FolderDialog({ onClose, onCreated }: { onClose: () => void; onCreated?: (id: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <ModalForm
      open
      onOpenChange={(next) => { if (!next) onClose(); }}
      title="New folder"
      description="Group the pages of one product, flow or client. Kept in this browser."
      onSubmit={() => {
        const value = name.trim();
        if (!value) { setError("Give the folder a name"); return; }
        void createFolder(value, activeProjectId()).then((id) => { onCreated?.(id); onClose(); }, fail);
      }}
      primaryAction={{ label: "Create folder" }}
      secondaryAction={{ label: "Cancel" }}
    >
      <InputField label="Name" size="md" value={name} placeholder="Checkout flows" autoFocus error={Boolean(error)} errorMessage={error ?? undefined} onChange={(event) => { setName(event.target.value); if (error) setError(null); }} />
    </ModalForm>
  );
}

function DeleteFolderDialog({ folder, count, onClose }: { folder: StudioFolder; count: number; onClose: () => void }) {
  return (
    <Dialog
      open
      onOpenChange={(next) => { if (!next) onClose(); }}
      theme="negative"
      title={`Delete “${folder.name}”?`}
      description={count ? `Its ${plural(count, "page")} go to the Trash, where you can restore them for 30 days.` : "The folder is empty."}
      primaryAction={{ label: "Delete folder", level: "danger", onClick: () => {
        const open = studioStore.getState().localPage;
        void deleteFolder(folder.id).then(() => {
          // The page on the canvas went to the Trash with its folder: back to the Studio's folders.
          if (open && !cachedPage(open)) studioStore.setState({ localPage: null, space: "studio", selection: null });
          onClose();
        }, fail);
      } }}
      secondaryAction={{ label: "Cancel" }}
    />
  );
}

/** The row being dragged in the Pages panel (one list or another) and the list it came from. */
let dragging: { id: string; scope: string } | null = null;

/** Figma's divider between groups of pages: a line, dragged as a page is, with Delete in its menu. */
function DividerRow({ scope, id }: { scope: string; id: string }) {
  const admin = useStudio((state) => state.role === "admin");
  return (
    <li className="studio-pages__item studio-pages__divider" data-entry={id} draggable={admin}>
      <div className="studio-pages__divider-line" role="separator" aria-label="Divider" />
      <span className="studio-pages__actions">
        <Menu align="end" aria-label="Divider options" trigger={<IconButton icon="icon-dots-horizontal-line" aria-label="Divider options" appearance="flat" level="primary" size="xs" tabIndex={-1} />}
          items={[{ id: "delete", label: "Delete divider", icon: "icon-trash-line", danger: true, disabled: !admin, onSelect: () => void removeDivider(scope, id).catch(fail) }]} />
      </span>
    </li>
  );
}

/**
 * A list of the Pages panel (a folder's pages, or those in no folder) in the person's order with its dividers
 * (store/pageOrderStore.ts, F4): a row drags to another place, here or in another list (it moves to that folder); the
 * line shows where it lands. `folder`: the folder the list is (null: no folder).
 */
function PageList({ scope, folder, pages, nested = false, tabStop, id, label, labelledBy }: { scope: string; folder: string | null; pages: PageMeta[]; nested?: boolean; tabStop: PageMeta | null; id?: string; label?: string; labelledBy?: string }) {
  usePageOrder();
  const localPage = useStudio((state) => state.localPage);
  const entries = orderedEntries(scope, pages);
  showEntries(scope, entries);
  const rowOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>("[data-entry]") : null);
  const clear = (list: HTMLElement) => list.querySelectorAll<HTMLElement>("[data-drop]").forEach((row) => { delete row.dataset.drop; });
  return (
    <ul
      id={id}
      className="studio-pages__list"
      aria-label={label}
      aria-labelledby={labelledBy}
      onDragStart={(event) => {
        const row = rowOf(event.target);
        if (!row?.dataset.entry) return;
        dragging = { id: row.dataset.entry, scope };
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", row.dataset.entry);
      }}
      onDragOver={(event) => {
        if (!dragging || (dragging.scope !== scope && dragging.id.startsWith("divider:"))) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        clear(event.currentTarget);
        const row = rowOf(event.target);
        if (!row || row.dataset.entry === dragging.id) return;
        const box = row.getBoundingClientRect();
        row.dataset.drop = event.clientY < box.top + box.height / 2 ? "before" : "after";
      }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) clear(event.currentTarget); }}
      onDrop={(event) => {
        const from = dragging;
        dragging = null;
        const row = event.currentTarget.querySelector<HTMLElement>("[data-drop]");
        const side = row?.dataset.drop;
        clear(event.currentTarget);
        if (!from) return;
        event.preventDefault();
        const at = row ? entries.findIndex((entry) => entry.id === row.dataset.entry) : -1;
        const before = at < 0 ? null : side === "before" ? entries[at].id : entries[at + 1]?.id ?? null;
        if (before === from.id) return;
        // From another list: the page moves to this folder first.
        const moved = from.scope === scope ? Promise.resolve() : movePage(from.id, folder);
        void moved.then(() => moveEntry(scope, from.id, before)).catch(fail);
      }}
      onDragEnd={(event) => { dragging = null; clear(event.currentTarget); }}
    >
      {entries.map((entry) => (entry.kind === "divider"
        ? <DividerRow key={entry.id} scope={scope} id={entry.id} />
        : <MyPageRow key={entry.id} item={entry.page} nested={nested} scope={scope} current={entry.id === localPage} tabIndex={entry.page === tabStop ? 0 : -1} />))}
    </ul>
  );
}

/** One folder: the row that opens and closes it, New page in it, its options, then its pages. */
function FolderGroup({ folder, pages, open, onToggle, onNewPage, tabStop, rowTab }: { folder: StudioFolder; pages: PageMeta[]; open: boolean; onToggle: () => void; onNewPage: () => void; tabStop: PageMeta | null; rowTab: boolean }) {
  const admin = useStudio((state) => state.role === "admin");
  const localPage = useStudio((state) => state.localPage);
  const [dialog, setDialog] = useState<null | "delete">(null);
  // Rename in place (double-click the row, or Rename), as Figma renames a layer.
  const [renaming, setRenaming] = useState(false);
  const listId = `studio-folder-${folder.id}`;
  return (
    <li className="studio-folder">
      <div className="studio-pages__item" data-actions="2">
        {renaming ? (
          <div className="studio-pages__row studio-folder__row" data-renaming="true">
            <Icon name={open ? "icon-chevron-down-line" : "icon-chevron-right-line"} size="sm" decorative />
            <Icon name="icon-folder-line" size="sm" decorative />
            <RenameField value={folder.name} label="Folder name" onCommit={(name) => renameFolder(folder.id, name).catch(fail)} onDone={() => setRenaming(false)} />
          </div>
        ) : (
          // A double-click (two clicks: open and close again) renames it.
          <button type="button" className="studio-pages__row studio-folder__row" aria-expanded={open} aria-controls={listId} tabIndex={rowTab ? 0 : -1} title={admin ? "Double-click to rename" : undefined}
            onClick={onToggle} onDoubleClick={() => { if (admin) setRenaming(true); }}
            onKeyDown={(event) => {
              // Delete / Backspace asks before deleting the folder (its pages go to the Trash).
              if ((event.key === "Delete" || event.key === "Backspace") && admin && !event.repeat) { event.preventDefault(); setDialog("delete"); }
            }}>
            <Icon name={open ? "icon-chevron-down-line" : "icon-chevron-right-line"} size="sm" decorative />
            <Icon name="icon-folder-line" size="sm" decorative />
            <span className={`studio-pages__name ${typographyStyles["Body/Small/Medium"]}`}>{folder.name}</span>
            <Text as="span" textStyle="Caption/Regular" tone="light" className="studio-folder__count">{pages.length}</Text>
          </button>
        )}
        <span className="studio-pages__actions">
          <IconButton icon="icon-plus-line" aria-label={`New page in ${folder.name}`} appearance="flat" level="primary" size="xs" tabIndex={-1} disabled={!admin} onClick={onNewPage} />
          <Menu align="end" aria-label={`${folder.name} options`} trigger={<IconButton icon="icon-dots-horizontal-line" aria-label={`${folder.name} options`} appearance="flat" level="primary" size="xs" tabIndex={-1} />}
            items={[
              { id: "rename", label: "Rename", icon: "icon-pencil-line", disabled: !admin, onSelect: () => setRenaming(true) },
              { type: "separator" },
              { id: "delete", label: "Delete folder…", icon: "icon-trash-line", danger: true, disabled: !admin, onSelect: () => setDialog("delete") },
            ]} />
        </span>
      </div>
      {open ? (
        pages.length ? (
          <PageList id={listId} label={folder.name} scope={folder.id} folder={folder.id} pages={pages} nested tabStop={tabStop} />
        ) : <Text as="p" id={listId} textStyle="Caption/Regular" tone="base" className="studio-folder__empty">No pages yet</Text>
      ) : null}
      {dialog === "delete" ? <DeleteFolderDialog folder={folder} count={pages.length} onClose={() => setDialog(null)} /> : null}
    </li>
  );
}

/** Every folder with its pages (filtered by the panel's search), then the pages in no folder. */
export function StudioFolderTree({ folders, pages, searching, onNewPage }: { folders: StudioFolder[]; pages: PageMeta[]; searching: boolean; onNewPage: (folder: string | null) => void }) {
  const localPage = useStudio((state) => state.localPage);
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  // The folder of the page on the canvas opens.
  const currentFolder = pages.find((page) => page.id === localPage)?.folder;
  useEffect(() => { if (currentFolder) setClosed((set) => { if (!set.has(currentFolder)) return set; const next = new Set(set); next.delete(currentFolder); return next; }); }, [currentFolder]);
  const known = new Set(folders.map((folder) => folder.id));
  const loose = pages.filter((page) => !page.folder || !known.has(page.folder));
  // The page on the canvas is the list's one Tab stop, else the first page.
  const tabStop = pages.find((page) => page.id === localPage) ?? pages[0] ?? null;
  const toggle = (id: string) => setClosed((set) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return (
    <>
      <ul className="studio-pages__list studio-folders" aria-labelledby="studio-pages-mine">
        {folders.map((folder, index) => {
          const inFolder = pages.filter((page) => page.folder === folder.id);
          if (searching && !inFolder.length) return null;
          // With no page to stop on, the first folder is the list's Tab stop.
          return <FolderGroup key={folder.id} folder={folder} pages={inFolder} open={searching || !closed.has(folder.id)} onToggle={() => toggle(folder.id)} onNewPage={() => onNewPage(folder.id)} tabStop={tabStop} rowTab={!tabStop && index === 0} />;
        })}
      </ul>
      {loose.length ? (
        <div className="studio-pages__section" data-section="loose">
          <Text as="p" id="studio-pages-loose" textStyle="Caption/Medium" tone="base" className="studio-pages__kicker">Not in a folder</Text>
          <PageList labelledBy="studio-pages-loose" scope={`loose:${activeProjectId() ?? "drafts"}`} folder={null} pages={loose} tabStop={tabStop} />
        </div>
      ) : null}
    </>
  );
}
