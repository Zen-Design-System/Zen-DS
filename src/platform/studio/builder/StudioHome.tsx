import { useState } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { useStudio } from "../store";
import { NewPageDialog } from "./NewPageDialog";
import { FolderDialog } from "./StudioFolders";
import { useFolders } from "./store/folderStore";
import { usePages } from "./store/pageStore";

/*
 * The Studio space with no page open (toolbar Document | Studio, user 2026-10-09): the canvas area says what the space
 * holds and offers New page and New folder; the Pages panel lists the folders and their pages.
 */
export function StudioHome() {
  const admin = useStudio((state) => state.role === "admin");
  const pages = usePages();
  const folders = useFolders();
  const [dialog, setDialog] = useState<null | "page" | "folder">(null);
  const empty = !pages.length && !folders.length;
  return (
    <div className="studio-home">
      <EmptyState
        icon="icon-folder-line"
        headingLevel={2}
        title={empty ? "Make your first page" : "Pick a page to open"}
        primaryAction={admin ? { label: "New page", onClick: () => setDialog("page") } : undefined}
        secondaryAction={admin ? { label: "New folder", onClick: () => setDialog("folder") } : undefined}
      >
        {empty
          ? "Studio keeps the pages you design: start blank on a phone, tablet or desktop, or from a template. Folders keep them in groups."
          : "Your folders and pages are in the panel on the left. Open one to edit it on the canvas."}
      </EmptyState>
      <NewPageDialog open={dialog === "page"} onOpenChange={(open) => setDialog(open ? "page" : null)} />
      {dialog === "folder" ? <FolderDialog onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
