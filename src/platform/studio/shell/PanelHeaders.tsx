import { tip } from "./ShortcutTip";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu } from "../../../components/Menu";
import { Text } from "../../../components/Text";
import { redoEdit, undoEdit, useStudioServer } from "../api";
import { presentFrame } from "../board/presentFrame";
import { openExport } from "../builder/export/exportState";
import { playStartOf, startPlay } from "../builder/proto/playStart";
import { OpenOnPhone } from "../device/OpenOnPhone";
import { useCanvasPreview } from "../project/activeProject";
import { useStudioDrafts } from "../sourceDrafts";
import { canEdit, studioStore, useStudio } from "../store";
import { toggleSidePanels, type PanelLayout } from "./layout";
import { modKey, presentShortcut } from "./modKey";
import { DraftsControls, DraftsViewerNote } from "./DraftsControls";
import { toggleStudioTheme } from "./modes";
import { pageTitle, setSpace } from "./navigation";
import { ProjectCrumbs } from "./ProjectCrumbs";
import { ReadOnlyChip } from "./ReadOnlyChip";
import { RoleMenu } from "./RoleMenu";
import { openShortcuts } from "./shortcutsOpen";
import "./shell.css";
import { cachedPage, usePage } from "../builder/store/pageStore";
import { signOut, useAuthUser } from "../../auth/pocketbase";

/*
 * Zen Studio's chrome after Figma B4 · Workspace Editor (9nZv4uW2LT21yuHabMTCh1 15916:6196; user, 2026-11-01, replacing
 * the UI3 floating panels of 2026-10-15): one compact top bar across the window — the Zen Studio menu (a square "Z") and
 * the trail Home › project (ProjectCrumbs); the page's name (Body/Base/Bold) and its save state (Badge) centred (the
 * user's call: the centre was empty); the drafts, undo/redo, the role, Present / Play, Open
 * on phone and the primary action (Save all, or Export on a page you made) at the end. B4's centre Segmented (the mode)
 * is left out: it repeated the Inspector's Design · Code · Prototype tabs (user, 2026-11-01: "Tính năng bị trùng"), and
 * the tabs also work while the Inspector is a drawer. The Pages | Layers pane and the Inspector are Border panes under it (studio.css). A pane that is not
 * docked (narrow window, or hidden with ⌘\) opens as a drawer from its button in this bar. Light/dark is in the menu.
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
 * undo/redo/role, which have no room in the bar). */
export function BrandMenu({ layout }: { layout: PanelLayout }) {
  const { phone } = layout;
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
        // A phone has no room for these in the bar: they live here instead (E2E S-07), Export with them.
        ...(phone ? [
          { id: "undo", label: "Undo", shortcut: `${modKey}Z`, disabled: !writable || !undoCount, onSelect: () => { void undoEdit(); } },
          { id: "redo", label: "Redo", shortcut: `⇧${modKey}Z`, disabled: !writable || !redoCount, onSelect: () => { void redoEdit(); } },
          { id: "role", label: role === "admin" ? "Switch to Can view" : "Switch to Can edit", onSelect: () => studioStore.setState({ role: role === "admin" ? "viewer" : "admin" }) },
          ...(localPage ? [{ id: "export", label: "Export…", onSelect: () => openExport(localPage) }] : []),
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
      // B4's brand: a square neutral Avatar "Z" (the name of the page follows it in the bar), and a chevron.
      trigger={(
        <Button
          className="studio-brand"
          appearance="flat"
          level="primary"
          size="sm"
          aria-label="Zen Studio menu"
          endIcon={<Icon name="icon-chevron-down-line" decorative />}
        >
          <Avatar size="xs" shape="square" theme="neutral" background="solid" alt="">Z</Avatar>
        </Button>
      )}
    />
  );
}

/** The Close button of a side pane open as a drawer (Escape and the scrim close it too). */
export function DrawerClose({ label }: { label: string }) {
  return <IconButton className="studio-drawer__close" appearance="flat" level="primary" size="sm" aria-label={label} icon={<Icon name="icon-x-line" />} onClick={() => studioStore.setState({ drawer: null })} />;
}

/** The name of what is open: the page you made, Studio's folders, or the docs page. */
function useOpenTitle() {
  const page = useStudio((state) => state.page);
  const collection = useStudio((state) => state.collection);
  const localPage = useStudio((state) => state.localPage);
  const space = useStudio((state) => state.space);
  const record = usePage(localPage);
  if (localPage) return record?.title ?? cachedPage(localPage)?.title ?? localPage;
  return space === "studio" ? "Studio" : pageTitle(page, collection);
}

/** B4's state Badge beside the name: Saved, or Unsaved while the admin has drafts (a page you made saves at once). */
function SaveState() {
  const role = useStudio((state) => state.role);
  const localPage = useStudio((state) => state.localPage);
  const writable = useWritable();
  const drafts = useStudioDrafts();
  if (!writable || role !== "admin") return null;
  const unsaved = drafts.available && drafts.drafts.length > 0;
  // A page you made saves at once; drafts of source files then speak for themselves (the count · Save all).
  if (unsaved && localPage) return null;
  return unsaved
    ? <Badge size="sm" theme="neutral" background="solid" leadingIcon={false}>Unsaved</Badge>
    : <Badge size="sm" theme="green" background="subtle" leadingIcon={false}>Saved</Badge>;
}

/** The frame Present / Play starts from: the selected one, else (an example page) the first example. */
function startFrame() {
  const selection = studioStore.getState().selection;
  const frameId = selection?.kind === "frame" ? selection.frameId : selection?.frameId;
  return frameId ?? document.querySelector<HTMLElement>('[data-studio-frame^="example:"]')?.dataset.studioFrame ?? null;
}

/** Present (an example page) or Play (a page you made), as B4's play button; ⌥⌘↵ does the same (StudioApp). */
function PresentButton() {
  const localPage = useStudio((state) => state.localPage);
  const label = localPage ? "Play" : "Present";
  const run = () => {
    if (localPage) { startPlay(playStartOf(startFrame() ?? undefined)); return; }
    const frame = startFrame();
    if (frame) presentFrame(frame);
  };
  return <IconButton appearance="main" level="tertiary" size="sm" aria-label={label} aria-keyshortcuts="Alt+Meta+Enter Control+Alt+Enter" tooltip={tip(label, presentShortcut)} icon={<Icon name="icon-play-line" />} onClick={run} />;
}

/** Open on phone for a page you made (Play's QR code, here as B4's Share), from the selected Screen. */
function PhoneShare({ id }: { id: string }) {
  const record = usePage(id);
  const { preview, brand } = useCanvasPreview();
  const selection = useStudio((state) => state.selection);
  const frameId = selection?.kind === "frame" ? selection.frameId : selection?.frameId;
  const start = frameId?.startsWith("screen:") ? frameId.slice("screen:".length) : null;
  return <OpenOnPhone page={id} title={record?.title ?? id} text={record?.text} start={start} modes={preview} brand={brand} />;
}

/** The admin's drafts (count · Save all) or the viewer's note, then Export on a page you made (B4's primary action; the
 * one place it lives since 2026-11-01 — the Page section's Export… repeated it). On a phone Export is in the menu. */
function PrimaryAction({ phone }: { phone: boolean }) {
  const role = useStudio((state) => state.role);
  const localPage = useStudio((state) => state.localPage);
  const writable = useWritable();
  const drafts = useStudioDrafts();
  const drafted = drafts.available && drafts.drafts.length > 0;
  return (
    <>
      {drafted && writable ? <DraftsControls density={phone ? "phone" : "panel"} /> : drafted && role === "viewer" ? <DraftsViewerNote density={phone ? "phone" : "compact"} /> : null}
      {localPage && !phone ? <Button appearance="main" level={drafted && writable ? "tertiary" : "primary"} size="sm" onClick={() => openExport(localPage)}>Export</Button> : null}
    </>
  );
}

/**
 * The top bar across the window (B4): start = menu, pane button (drawer), Home › project; centre = name, state; end = the
 * drafts or read-only chip, undo/redo, role, Present / Play, Open on phone, the primary action, and the Inspector's
 * button while it is a drawer. A document page (no canvas) keeps the menu, the name and the role.
 */
export function TopBar({ layout, docPage }: { layout: PanelLayout; docPage: boolean }) {
  const { phone, leftDocked, rightDocked } = layout;
  const drawer = useStudio((state) => state.drawer);
  const localPage = useStudio((state) => state.localPage);
  const undoCount = useStudio((state) => state.undo.length);
  const redoCount = useStudio((state) => state.redo.length);
  const writable = useWritable();
  const title = useOpenTitle();
  const studioHome = useStudio((state) => !state.localPage && state.space === "studio");
  return (
    <div className="studio-topbar">
      <div className="studio-topbar__start">
        <BrandMenu layout={layout} />
        {leftDocked ? null : <IconButton appearance="flat" level="primary" size="sm" aria-label="Pages and layers" aria-expanded={drawer === "left"} aria-controls="studio-left" icon={<Icon name="icon-layout-left-line" />} onClick={() => studioStore.setState({ drawer: drawer === "left" ? null : "left" })} />}
        {phone ? null : <ProjectCrumbs />}
      </div>
      {/* The name of what is open, centred on the bar (user, 2026-11-01), with its save state. Studio's folders name
          themselves in the trail and the page. */}
      <div className="studio-topbar__center">
        {studioHome ? null : <Text as="span" textStyle="Body/Base/Bold" className="studio-topbar__title" title={title}>{title}</Text>}
        {/* Saved / Unsaved names a page's state: none on Studio's folders or a docs page. */}
        {phone || docPage ? null : <SaveState />}
      </div>
      <div className="studio-topbar__end">
        <ReadOnlyChip />
        {phone ? null : (
          <span className="studio-topbar__group">
            <IconButton appearance="flat" level="primary" size="sm" aria-label="Undo" aria-keyshortcuts="Meta+Z Control+Z" tooltip={tip("Undo", `${modKey}Z`)} disabled={!writable || !undoCount} icon={<Icon name="icon-reverse-left-line" />} onClick={() => { void undoEdit(); }} />
            <IconButton appearance="flat" level="primary" size="sm" aria-label="Redo" aria-keyshortcuts="Shift+Meta+Z Shift+Control+Z" tooltip={tip("Redo", `⇧${modKey}Z`)} disabled={!writable || !redoCount} icon={<Icon name="icon-reverse-right-line" />} onClick={() => { void redoEdit(); }} />
          </span>
        )}
        {phone ? null : <RoleMenu />}
        {docPage ? null : <PresentButton />}
        {localPage && !phone ? <PhoneShare id={localPage} /> : null}
        <PrimaryAction phone={phone} />
        {rightDocked || docPage ? null : <IconButton appearance="flat" level="primary" size="sm" aria-label="Inspector" aria-expanded={drawer === "right"} aria-controls="studio-right" icon={<Icon name="icon-layout-right-line" />} onClick={() => studioStore.setState({ drawer: drawer === "right" ? null : "right" })} />}
      </div>
    </div>
  );
}
