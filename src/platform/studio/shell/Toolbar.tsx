import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu } from "../../../components/Menu";
import { redoEdit, undoEdit, useStudioServer } from "../api";
import { modKey } from "../canvas/ZoomControls";
import { useStudioDrafts } from "../sourceDrafts";
import { canEdit, studioStore, useStudio } from "../store";
import { revealLeftPanel, toggleSidePanels, type PanelLayout } from "./layout";
import { DraftsControls, DraftsViewerNote } from "./DraftsControls";
import { ModesMenu } from "./ModesMenu";
import { toggleStudioTheme } from "./modes";
import { breadcrumbsFor, navigate } from "./navigation";
import { ReadOnlyChip } from "./ReadOnlyChip";
import { RoleMenu } from "./RoleMenu";
import { openShortcuts } from "./ShortcutsDialog";
import "./shell.css";
import { usePage } from "../builder/store/pageStore";

/** Opens a page group in the Pages tab (breadcrumb parents are groups, not pages). */
export function revealSection(section: string) {
  studioStore.setState({ leftTab: "pages" });
  revealLeftPanel();
  requestAnimationFrame(() => document.querySelector(`.studio-pages__section[data-section="${section}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
}

/**
 * The Studio toolbar (spec §2): brand menu · breadcrumb (centred on the window) · modes, chrome theme, undo/redo, the
 * admin drafts (Unsaved list · Save all, or the viewer's "drafts shown" note), role. The tools and the zoom float on the
 * canvas as in Figma (canvas/CanvasChrome: tools bottom-centre, zoom top-right). A side panel that is not docked (narrow window, or hidden with ⌘\) gets a toolbar button that opens
 * it as a drawer.
 */
export function Toolbar({ layout }: { layout: PanelLayout }) {
  const { leftDocked, rightDocked, narrow, phone } = layout;
  const ui = useStudio((state) => state.panels.ui);
  const page = useStudio((state) => state.page);
  const collection = useStudio((state) => state.collection);
  const localPage = useStudio((state) => state.localPage);
  const builderPage = usePage(localPage);
  const chromeTheme = useStudio((state) => state.chromeTheme);
  const drawer = useStudio((state) => state.drawer);
  const editable = useStudio((state) => canEdit(state));
  const undoCount = useStudio((state) => state.undo.length);
  const redoCount = useStudio((state) => state.redo.length);
  const role = useStudio((state) => state.role);
  const server = useStudioServer();
  const writable = editable && server.ready && server.writable;
  const drafts = useStudioDrafts();
  const drafted = drafts.available && drafts.drafts.length > 0;
  const draftsDensity = phone ? "phone" : narrow ? "narrow" : leftDocked ? "wide" : "compact";
  const crumbs = breadcrumbsFor(page, collection, localPage ? { id: localPage, title: builderPage?.title ?? localPage } : null);
  const classicUrl = () => {
    const url = new URL(window.location.href);
    // The Studio's own dev entry (studio.html) has no classic UI: the app entry next to it decides by ?ui.
    url.pathname = url.pathname.replace(/studio\.html$/, "");
    url.searchParams.set("ui", "classic");
    return url.toString();
  };

  return (
    <div className="studio-toolbar__inner">
      <div className="studio-toolbar__start">
        {!leftDocked ? (
          <IconButton appearance="flat" level="primary" size="sm" aria-label="Pages and layers" aria-expanded={drawer === "left"} aria-controls="studio-left" icon={<Icon name="icon-layout-left-line" />} onClick={() => studioStore.setState({ drawer: drawer === "left" ? null : "left" })} />
        ) : null}
        <Menu
          aria-label="Zen Studio"
          items={[
            // A phone toolbar has no room for these: they live here instead (E2E S-07).
            ...(phone ? [
              { id: "undo", label: "Undo", shortcut: `${modKey}Z`, disabled: !writable || !undoCount, onSelect: () => { void undoEdit(); } },
              { id: "redo", label: "Redo", shortcut: `⇧${modKey}Z`, disabled: !writable || !redoCount, onSelect: () => { void redoEdit(); } },
              { id: "theme", label: chromeTheme === "dark" ? "Light mode" : "Dark mode", onSelect: toggleStudioTheme },
              { id: "role", label: role === "admin" ? "View as Viewer" : "Edit as Admin", onSelect: () => studioStore.setState({ role: role === "admin" ? "viewer" : "admin" }) },
              { type: "separator" as const, id: "phone-separator" },
            ] : []),
            { id: "shortcuts", label: "Keyboard shortcuts…", shortcut: "?", onSelect: openShortcuts },
            { id: "panels", label: ui ? "Hide side panels" : "Show side panels", shortcut: `${modKey}\\`, onSelect: toggleSidePanels },
            { type: "separator" },
            { id: "classic", label: "Open classic docs", onSelect: () => window.location.assign(classicUrl()) },
          ]}
          trigger={phone
            // zen-allow-no-action: the Menu's trigger (Menu wires its click and keys, as for the Button below).
            ? <IconButton className="studio-brand" appearance="flat" level="primary" size="sm" aria-label="Zen Studio menu" icon={<Icon name="icon-zen" />} />
            : <Button className="studio-brand" appearance="flat" level="primary" size="sm" startIcon={<Icon name="icon-zen" decorative />} endIcon={<Icon name="icon-chevron-down-line" decorative />}>Zen Studio</Button>}
        />
      </div>

      {phone ? <div className="studio-toolbar__crumbs" /> : <Breadcrumbs
        className="studio-toolbar__crumbs"
        master={false}
        items={(narrow ? crumbs.slice(-1) : crumbs).map((crumb) => ({ id: crumb.id, label: crumb.label }))}
        onNavigate={(item, event) => {
          event.preventDefault();
          const crumb = crumbs.find((entry) => entry.id === item.id);
          if (crumb?.page) navigate(crumb.page);
          else if (crumb?.section) revealSection(crumb.section);
        }}
      />}

      <div className="studio-toolbar__end">
        <ModesMenu compact={phone} />
        {phone ? null : (
          <>
            <IconButton
              appearance="flat"
              level="primary"
              size="sm"
              aria-label={chromeTheme === "dark" ? "Light mode" : "Dark mode"}
              icon={<Icon name={chromeTheme === "dark" ? "icon-sun-line" : "icon-moon-01-line"} />}
              onClick={toggleStudioTheme}
            />
            <IconButton className="studio-toolbar__group-start" appearance="flat" level="primary" size="sm" aria-label="Undo" aria-keyshortcuts="Meta+Z Control+Z" tooltip={`Undo (${modKey}Z)`} disabled={!writable || !undoCount} icon={<Icon name="icon-reverse-left-line" />} onClick={() => { void undoEdit(); }} />
            <IconButton appearance="flat" level="primary" size="sm" aria-label="Redo" aria-keyshortcuts="Shift+Meta+Z Shift+Control+Z" tooltip={`Redo (⇧${modKey}Z)`} disabled={!writable || !redoCount} icon={<Icon name="icon-reverse-right-line" />} onClick={() => { void redoEdit(); }} />
          </>
        )}
        {drafted && writable ? (
          <DraftsControls density={draftsDensity} />
        ) : drafted && role === "viewer" ? <DraftsViewerNote density={draftsDensity} /> : null}
        <ReadOnlyChip />
        {phone ? null : <RoleMenu />}
        {!rightDocked ? (
          <IconButton appearance="flat" level="primary" size="sm" aria-label="Inspector" aria-expanded={drawer === "right"} aria-controls="studio-right" icon={<Icon name="icon-layout-right-line" />} onClick={() => studioStore.setState({ drawer: drawer === "right" ? null : "right" })} />
        ) : null}
      </div>
    </div>
  );
}
