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
import { createFolder, deleteFolder, renameFolder, type StudioFolder } from "./store/folderStore";
import { cachedPage, type PageMeta } from "./store/pageStore";

/*
 * The Studio space's folders (user, 2026-10-09: "Studio lets people make folders and pages / canvases inside each"):
 * each folder is a row that opens and closes its pages, with New page in it and its options (Rename, Delete); pages in
 * no folder follow under "Not in a folder". The rows share the Pages panel's keys (↑/↓, Home, End: PagesPanel).
 */

const fail = (error: unknown) => announceEditStatus({ kind: "error", message: error instanceof Error ? error.message : String(error), at: Date.now() });

/** New folder or Rename folder: a name, then Create / Rename. */
export function FolderDialog({ folder, onClose, onCreated }: { folder?: StudioFolder; onClose: () => void; onCreated?: (id: string) => void }) {
  const [name, setName] = useState(folder?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  return (
    <ModalForm
      open
      onOpenChange={(next) => { if (!next) onClose(); }}
      title={folder ? "Rename folder" : "New folder"}
      description={folder ? undefined : "Group the pages of one product, flow or client. Kept in this browser."}
      onSubmit={() => {
        const value = name.trim();
        if (!value) { setError("Give the folder a name"); return; }
        if (folder) void renameFolder(folder.id, value).then(onClose, fail);
        else void createFolder(value).then((id) => { onCreated?.(id); onClose(); }, fail);
      }}
      primaryAction={{ label: folder ? "Rename" : "Create folder" }}
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

/** One folder: the row that opens and closes it, New page in it, its options, then its pages. */
function FolderGroup({ folder, pages, open, onToggle, onNewPage, tabStop, rowTab }: { folder: StudioFolder; pages: PageMeta[]; open: boolean; onToggle: () => void; onNewPage: () => void; tabStop: PageMeta | null; rowTab: boolean }) {
  const admin = useStudio((state) => state.role === "admin");
  const localPage = useStudio((state) => state.localPage);
  const [dialog, setDialog] = useState<null | "rename" | "delete">(null);
  const listId = `studio-folder-${folder.id}`;
  return (
    <li className="studio-folder">
      <div className="studio-pages__item" data-actions="2">
        <button type="button" className="studio-pages__row studio-folder__row" aria-expanded={open} aria-controls={listId} tabIndex={rowTab ? 0 : -1} onClick={onToggle}>
          <Icon name={open ? "icon-chevron-down-line" : "icon-chevron-right-line"} size="sm" decorative />
          <Icon name="icon-folder-line" size="sm" decorative />
          <span className={`studio-pages__name ${typographyStyles["Body/Small/Medium"]}`}>{folder.name}</span>
          <Text as="span" textStyle="Caption/Regular" tone="light" className="studio-folder__count">{pages.length}</Text>
        </button>
        <span className="studio-pages__actions">
          <IconButton icon="icon-plus-line" aria-label={`New page in ${folder.name}`} appearance="flat" level="primary" size="xs" tabIndex={-1} disabled={!admin} onClick={onNewPage} />
          <Menu align="end" aria-label={`${folder.name} options`} trigger={<IconButton icon="icon-dots-horizontal-line" aria-label={`${folder.name} options`} appearance="flat" level="primary" size="xs" tabIndex={-1} />}
            items={[
              { id: "rename", label: "Rename…", icon: "icon-pencil-line", disabled: !admin, onSelect: () => setDialog("rename") },
              { type: "separator" },
              { id: "delete", label: "Delete folder…", icon: "icon-trash-line", danger: true, disabled: !admin, onSelect: () => setDialog("delete") },
            ]} />
        </span>
      </div>
      {open ? (
        pages.length ? (
          <ul id={listId} className="studio-pages__list" aria-label={folder.name}>
            {pages.map((item) => <MyPageRow key={item.id} item={item} nested current={item.id === localPage} tabIndex={item === tabStop ? 0 : -1} />)}
          </ul>
        ) : <Text as="p" id={listId} textStyle="Caption/Regular" tone="base" className="studio-folder__empty">No pages yet</Text>
      ) : null}
      {dialog === "rename" ? <FolderDialog folder={folder} onClose={() => setDialog(null)} /> : null}
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
          <ul className="studio-pages__list" aria-labelledby="studio-pages-loose">
            {loose.map((item) => <MyPageRow key={item.id} item={item} current={item.id === localPage} tabIndex={item === tabStop ? 0 : -1} />)}
          </ul>
        </div>
      ) : null}
    </>
  );
}
