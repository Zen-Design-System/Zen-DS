import { useState } from "react";
import { Breadcrumbs, Button, Card, Menu, Stack, plural, useZen, type BreadcrumbItemData } from "@zen-ds/react";

// The folders of the studio’s shared Files.
type Folder = { id: string; name: string; parent: string | null };
const folderTree: Folder[] = [
  { id: "root", name: "Files", parent: null },
  { id: "clients", name: "Clients", parent: "root" },
  { id: "studio", name: "Studio", parent: "root" },
  { id: "lumen", name: "Lumen Bank", parent: "clients" },
  { id: "phin", name: "Phin & Co", parent: "clients" },
  { id: "mekong", name: "Mekong Freight", parent: "clients" },
  { id: "banking", name: "Online banking", parent: "lumen" },
  { id: "research", name: "Research", parent: "banking" },
  { id: "design", name: "Design", parent: "banking" },
  { id: "round-2", name: "Round 2", parent: "research" },
  { id: "loyalty", name: "Loyalty app", parent: "phin" },
];
/** Root first, the folder itself last. */
const pathTo = (id: string): Folder[] => { const f = folderTree.find((x) => x.id === id); return f ? [...(f.parent ? pathTo(f.parent) : []), f] : []; };
const subfolders = (id: string) => folderTree.filter((f) => f.parent === id).sort((a, b) => a.name.localeCompare(b.name));
/** Page trails link each folder’s address. */
const trail = (path: Folder[]): BreadcrumbItemData[] => path.map((f) => ({ id: f.id, label: f.name, href: `/files/${f.id}`, icon: f.parent === null ? "icon-folder-line" : undefined }));

/* Each crumb sets its own look, as Figma's Item instances in the Item-List slot do: the open folder is Medium and keeps
   its Dash (the chevron after it) while it has folders inside, and the Menu after the chevron goes one level down.
   Crumbs go back up. */
export default function NextLevel() {
  const [folderId, setFolderId] = useState("clients");
  const phone = useZen()?.breakpoint === "mobile";
  const path = pathTo(folderId);
  const folders = subfolders(folderId);
  return (
    <Stack><Card theme="default" spacing="md" width="fill" maxWidth={480} alignSelf="center">
      {/* One row: the chevron after the open folder stays beside the menu it points to (phone: the trail collapses). */}
      <Stack direction="row" gap="xs" align="center">
        <Breadcrumbs
          aria-label="Folder path"
          maxItems={phone ? 2 : 3}
          items={trail(path).map((item, index) => (index === path.length - 1 ? { ...item, emphasis: "medium", dash: folders.length > 0 } : item))}
          onNavigate={(item, event) => { event.preventDefault(); setFolderId(item.id); }}
        />
        {folders.length ? (
          <Menu
            aria-label={`Folders in ${path[path.length - 1].name}`}
            trigger={<Button level="tertiary" size="sm" endIcon="icon-chevron-down-line">{plural(folders.length, "folder")}</Button>}
            items={folders.map((f) => ({ id: f.id, label: f.name, icon: "icon-folder-line" }))}
            onSelect={(item) => setFolderId(item.id)}
          />
        ) : null}
      </Stack>
    </Card></Stack>
  );
}
