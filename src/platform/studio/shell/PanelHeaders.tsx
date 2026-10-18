import { tip } from "./ShortcutTip";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu } from "../../../components/Menu";
import { redoEdit, undoEdit, useStudioServer } from "../api";
import { ZoomMenu } from "../canvas/ZoomControls";
import { useStudioDrafts } from "../sourceDrafts";
import { canEdit, studioStore, useStudio } from "../store";
import { toggleSidePanels, type PanelLayout } from "./layout";
import { modKey } from "./modKey";
import { DraftsControls, DraftsViewerNote } from "./DraftsControls";
import { toggleStudioTheme } from "./modes";
import { setSpace } from "./navigation";
import { ReadOnlyChip } from "./ReadOnlyChip";
import { RoleMenu } from "./RoleMenu";
import { openShortcuts } from "./shortcutsOpen";
import "./shell.css";
import { cachedPage } from "../builder/store/pageStore";
import { signOut, useAuthUser } from "../../auth/pocketbase";

/*
 * Zen Studio's chrome as Figma UI3's floating panels (user, 2026-10-15): no toolbar row. The left panel's header holds
 * the brand menu (with the Document / Studio switch since 2026-10-17: no Segmented over the canvas, the user: "có thể
 * gây nặng bộ nhớ"), the right panel's header the role, undo/redo and the drafts; the
 * zoom sits on the Inspector's tab row. A panel that is not docked (narrow window, or hidden with ⌘\) leaves a small
 * floating bar in its corner that opens it as a drawer. Light/dark is in the brand menu, as Figma's theme.
 */

function classicUrl() {
  const url = new URL(window.location.href);
  // The Studio's own dev entry (studio.html) has no classic UI: the app entry next to it decides by ?ui.
  url.pathname = url.pathname.replace(/studio\.html$/, "");
  url.searchParams.set("ui", "classic");
  return url.toString();
}

/** Writing to the dev server is possible (admin, server up and writable): undo/redo and Save all work. */
function useWritable() {
  const editable = useStudio((state) => canEdit(state));
  const server = useStudioServer();
  return editable && server.ready && server.writable;
}

/** The Zen mark and its menu: Document / Studio, light/dark, shortcuts, panels, classic docs, log out (and, on a phone,
 * undo/redo/role).
 * `compact`: the mark and a chevron only (corner bars, a phone's drawer); else "Zen Studio" beside the mark. */
export function BrandMenu({ layout, compact = false }: { layout: PanelLayout; compact?: boolean }) {
  const { phone } = layout;
  const ui = useStudio((state) => state.panels.ui);
  const chromeTheme = useStudio((state) => state.chromeTheme);
  const undoCount = useStudio((state) => state.undo.length);
  const redoCount = useStudio((state) => state.redo.length);
  const role = useStudio((state) => state.role);
  const writable = useWritable();
  const user = useAuthUser();
  const space = useStudio((state) => state.space);
  const localPage = useStudio((state) => state.localPage);
  const inStudio = Boolean(localPage) || space === "studio";
  return (
    <Menu
      aria-label="Zen Studio"
      items={[
        // A phone has no room for these in the panel headers: they live here instead (E2E S-07).
        ...(phone ? [
          { id: "undo", label: "Undo", shortcut: `${modKey}Z`, disabled: !writable || !undoCount, onSelect: () => { void undoEdit(); } },
          { id: "redo", label: "Redo", shortcut: `⇧${modKey}Z`, disabled: !writable || !redoCount, onSelect: () => { void redoEdit(); } },
          { id: "role", label: role === "admin" ? "Switch to Can view" : "Switch to Can edit", onSelect: () => studioStore.setState({ role: role === "admin" ? "viewer" : "admin" }) },
          { type: "separator" as const, id: "phone-separator" },
        ] : []),
        // Document | Studio, as the theme's toggle: the docs pages or the pages made in the Studio (Studio reopens the page
        // made last, while it is still there).
        { id: "space", label: inStudio ? "Switch to Document" : "Switch to Studio", onSelect: () => setSpace(inStudio ? "document" : "studio", (id) => Boolean(cachedPage(id))) },
        { id: "theme", label: chromeTheme === "dark" ? "Light mode" : "Dark mode", onSelect: toggleStudioTheme },
        { id: "shortcuts", label: "Keyboard shortcuts…", shortcut: "?", onSelect: openShortcuts },
        { id: "panels", label: "Show/Hide UI", shortcut: `${modKey}\\`, onSelect: toggleSidePanels },
        { type: "separator" },
        { id: "classic", label: "Open classic docs", onSelect: () => window.location.assign(classicUrl()) },
        ...(user ? [
          { type: "separator" as const, id: "account-separator" },
          { id: "log-out", label: "Log out", caption: user.email, icon: "icon-log-out-01-line" as const, onSelect: signOut },
        ] : []),
      ]}
      // zen-allow-no-action: the Menu's trigger (Menu wires its click and keys).
      // As Figma UI3's file menu: the mark, the name, a chevron (the mark and the chevron alone where room is short).
      trigger={compact
        ? <Button className="studio-brand" appearance="flat" level="primary" size="sm" aria-label="Zen Studio menu" endIcon={<Icon name="icon-chevron-down-line" decorative />}><Icon name="icon-zen" decorative /></Button>
        : <Button className="studio-brand" appearance="flat" level="primary" size="sm" aria-label="Zen Studio menu" startIcon={<Icon name="icon-zen" decorative />} endIcon={<Icon name="icon-chevron-down-line" decorative />}>Zen Studio</Button>}
    />
  );
}

/** The Close button of a side panel open as a drawer (Escape and the scrim close it too). */
export function DrawerClose({ label }: { label: string }) {
  return <IconButton className="studio-drawer__close" appearance="flat" level="primary" size="sm" aria-label={label} icon={<Icon name="icon-x-line" />} onClick={() => studioStore.setState({ drawer: null })} />;
}

/** The left panel's header: the brand menu, which holds Document / Studio (and Close while it is a drawer with no tab
 * row; with one, Close ends the tab row). */
export function LeftHeader({ layout, drawer }: { layout: PanelLayout; drawer: boolean }) {
  return (
    <div className="studio-panel-head">
      <BrandMenu layout={layout} compact={layout.phone} />
      {drawer ? <DrawerClose label="Close pages and layers" /> : null}
    </div>
  );
}

/** The admin's drafts (count · Save all) or the viewer's "drafts shown" note, and the read-only chip. */
function Drafts({ density }: { density: "wide" | "compact" | "panel" | "narrow" | "phone" }) {
  const role = useStudio((state) => state.role);
  const writable = useWritable();
  const drafts = useStudioDrafts();
  const drafted = drafts.available && drafts.drafts.length > 0;
  return (
    <>
      {drafted && writable ? <DraftsControls density={density} /> : drafted && role === "viewer" ? <DraftsViewerNote density={density === "wide" ? "wide" : "compact"} /> : null}
      <ReadOnlyChip />
    </>
  );
}

/** The right panel's header (the whole floating bar on a document page): role, undo/redo, then the drafts. */
export function RightHeader({ layout, drawer }: { layout: PanelLayout; drawer: boolean }) {
  const { phone } = layout;
  const undoCount = useStudio((state) => state.undo.length);
  const redoCount = useStudio((state) => state.redo.length);
  const writable = useWritable();
  return (
    <div className="studio-panel-head">
      {phone ? null : (
        <>
          <RoleMenu />
          <span className="studio-panel-head__group">
            <IconButton appearance="flat" level="primary" size="sm" aria-label="Undo" aria-keyshortcuts="Meta+Z Control+Z" tooltip={tip("Undo", `${modKey}Z`)} disabled={!writable || !undoCount} icon={<Icon name="icon-reverse-left-line" />} onClick={() => { void undoEdit(); }} />
            <IconButton appearance="flat" level="primary" size="sm" aria-label="Redo" aria-keyshortcuts="Shift+Meta+Z Shift+Control+Z" tooltip={tip("Redo", `⇧${modKey}Z`)} disabled={!writable || !redoCount} icon={<Icon name="icon-reverse-right-line" />} onClick={() => { void redoEdit(); }} />
          </span>
        </>
      )}
      <span className="studio-panel-head__end">
        <Drafts density={phone ? "phone" : "panel"} />
        {drawer ? <DrawerClose label="Close inspector" /> : null}
      </span>
    </div>
  );
}

/** Pages | Layers hidden or narrow: the brand menu and the button that opens the panel as a drawer, top-left. */
export function CollapsedLeftBar({ layout }: { layout: PanelLayout }) {
  const drawer = useStudio((state) => state.drawer);
  return (
    <div className="studio-bar studio-bar--left">
      <BrandMenu layout={layout} compact />
      <IconButton appearance="flat" level="primary" size="sm" aria-label="Pages and layers" aria-expanded={drawer === "left"} aria-controls="studio-left" icon={<Icon name="icon-layout-left-line" />} onClick={() => studioStore.setState({ drawer: drawer === "left" ? null : "left" })} />
    </div>
  );
}

/** The Inspector hidden or narrow: the drafts, the zoom and the button that opens the Inspector, top-right. */
export function CollapsedRightBar({ layout }: { layout: PanelLayout }) {
  const drawer = useStudio((state) => state.drawer);
  return (
    <div className="studio-bar studio-bar--right">
      <Drafts density={layout.phone ? "phone" : "narrow"} />
      <ZoomMenu size="xs" />
      <IconButton appearance="flat" level="primary" size="sm" aria-label="Inspector" aria-expanded={drawer === "right"} aria-controls="studio-right" icon={<Icon name="icon-layout-right-line" />} onClick={() => studioStore.setState({ drawer: drawer === "right" ? null : "right" })} />
    </div>
  );
}
