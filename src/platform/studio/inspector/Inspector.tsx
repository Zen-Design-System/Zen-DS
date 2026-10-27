import { useRef } from "react";
import { Icon } from "../../../components/Icon";
import { TabPanel, Tabs } from "../../../components/Tabs";
import { ZoomMenu } from "../canvas/ZoomControls";
import { PrototypePanel } from "../builder/proto/PrototypePanel";
import { typographyStyles } from "../../../tokens/typography.generated";
import { useStudioEditStatus, useStudioServer } from "../api";
import { useStudioDrafts } from "../sourceDrafts";
import { useExtraSelection } from "../select/multiSelection";
import { sameSelectedElement } from "../select/remap";
import { canEdit, studioStore, useStudio } from "../store";
import type { StudioInspectorTab, StudioSelection } from "../types";
import { CodePanel } from "./CodePanel";
import { DesignPanel } from "./DesignPanel";
import "./drafts";
import { FramePanel } from "./FramePanel";
import { LocalPartPanel } from "./LocalPartPanel";
import { FramePresets } from "../builder/FramePresets";
import { ScalePanel } from "../draw/ScalePanel";
import { CommentsPanel } from "../comments/CommentsPanel";
import { PagePanel } from "./PagePanel";
// A part: a Table's Data-Row or Cell has its own panel, any other part is PartPanel's (table/TableCellPanel.tsx).
import { TablePartPanel } from "../table/TableCellPanel";
import { SelectionActions } from "./SelectionActions";
import { editGate } from "../gate";
import { fileName, saveShortcut, undoShortcut, useInspectorStatus } from "./status";
import { useWords } from "../useWords";
import "./inspector.css";
import { VariantPanel } from "../mainComponent/VariantPanel";
import { variantKey } from "../mainComponent/model";

/*
 * The right panel (spec §6): Design | Code for the page, a frame or a JSX element. The two bridge slots (the active
 * playground's controls and code) are hosted inside the matching sections while a playground element is selected.
 */

const tabs = [{ id: "design", label: "Design" }, { id: "code", label: "Code" }];
/** A builder page adds Prototype (GĐ2 M3). */
const builderTabs = [...tabs, { id: "prototype", label: "Prototype" }];

/**
 * Footer line: the last edit / save / undo / redo / error, else what editing does here. Edits on a drafts server read
 * "Unsaved · button.tsx:84 · ⌘S to save"; a Save lists its harness findings and conflicts under the line.
 */
function StatusLine() {
  const edit = useStudioEditStatus();
  const local = useInspectorStatus();
  const role = useStudio((state) => state.role);
  const localPage = useStudio((state) => state.localPage);
  const server = useStudioServer();
  const drafts = useStudioDrafts();
  // A page made in the Studio: the line speaks design words (no file:line, no code; plan criterion 7).
  const say = useWords();
  const editable = canEdit() && role === "admin" && server.writable;
  const drafting = server.drafts || drafts.available;
  let tone: "neutral" | "positive" | "negative" | "warning" = "neutral";
  let text: string;
  let details: string[] = [];
  // The inspector's own line wins a tie: it is set right after an edit's outcome, to explain it.
  if (edit && (!local || edit.at > local.at)) {
    tone = edit.kind === "error" ? "negative" : edit.kind === "warning" ? "warning" : edit.kind === "saved" ? "positive" : "neutral";
    const where = edit.file ? `${fileName(edit.file)}:${edit.line ?? ""}` : "";
    text = edit.kind === "draft" && edit.file ? `Unsaved · ${where} · ${saveShortcut} to save`
      : edit.kind === "saved" && edit.file && edit.line ? `Saved · ${where} · ${undoShortcut} to undo`
        : edit.draft ? `${edit.message} · Unsaved · ${saveShortcut} to save`
          : edit.message;
    // Any edit that missed the example's snippet says so (prop, text and style edits too; detach, wrap and slot ops
    // word it in their own line), so the Code tab's copy is not trusted silently.
    const snippet = edit.snippet && !edit.snippet.synced ? `Example code not updated${edit.snippet.reason ? `: ${edit.snippet.reason}` : ""}` : null;
    details = [...(edit.details ?? []), ...(snippet ? [snippet] : [])];
  } else if (local) {
    tone = local.tone;
    text = local.text;
  } else {
    const shown = drafts.drafts.length ? " · others' unsaved changes are shown" : "";
    // Not editable: the gate's reason (gate.ts; the toolbar's Read-only chip explains it and offers the fix).
    const gate = editGate({ role, localPage }, server, { dev: import.meta.env.DEV, hostname: window.location.hostname });
    text = editable ? (localPage ? "Changes save at once" : drafting ? `Changes stay unsaved: ${saveShortcut} to save` : "Changes save to the source file at once")
      : gate.ok ? "Connecting to the Studio server…" : `${gate.short}${role === "viewer" ? shown : ""}`;
  }
  text = say(text);
  details = details.map(say);
  const icon = tone === "positive" ? "icon-check-line" : tone === "negative" ? "icon-alert-circle-line" : tone === "warning" ? "icon-alert-triangle-line" : editable ? "icon-edit-02-line" : "icon-eye-line";
  return (
    <div className={`studio-inspector__status ${typographyStyles["Body/Small/Regular"]}`} data-tone={tone} data-details={details.length ? "true" : undefined} role="status" aria-live="polite">
      <Icon name={icon} size={16} />
      <span className="studio-inspector__status-text" title={text}>{text}</span>
      {details.length ? (
        <ul className="studio-inspector__status-details">
          {details.map((line, index) => <li key={index} title={line}>{line}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * A key per selected element: a write that moves the element (same element, new line) keeps the Design panel mounted,
 * with its drafts; picking another element remounts it.
 */
function useSelectionIdentity(selection: StudioSelection | null) {
  const ref = useRef<{ selection: StudioSelection | null; id: number }>({ selection: null, id: 0 });
  if (ref.current.selection !== selection) {
    if (!sameSelectedElement(ref.current.selection, selection)) ref.current.id += 1;
    ref.current.selection = selection;
  }
  return ref.current.id;
}

/** The right panel. Hosts the two bridge slots (playground controls, playground code) while a playground node is selected. */
export function Inspector({ controlsSlot, codeSlot }: { controlsSlot: HTMLElement; codeSlot: HTMLElement }) {
  const selection = useStudio((state) => state.selection);
  const localPage = useStudio((state) => Boolean(state.localPage));
  const chosen = useStudio((state) => state.inspectorTab);
  const tab = chosen === "prototype" && !localPage ? "design" : chosen;
  // Several layers selected (Shift+click): what they share (wrap in a container) instead of one layer's properties.
  const several = useExtraSelection().length > 0;
  const identity = useSelectionIdentity(selection);
  // The Frame tool on a page you made: Figma's frame presets (builder/FramePresets.tsx, Session C's F4).
  const presetsPage = useStudio((state) => (state.tool === "frame" ? state.localPage : null));
  // The Scale tool (K) on a page you made: Figma's Scale section (draw/ScalePanel.tsx, Session C).
  const scalePage = useStudio((state) => (state.tool === "scale" ? state.localPage : null));
  // The Comment tool (C) on a page you made: Figma's comments list (comments/CommentsPanel.tsx).
  const commentPage = useStudio((state) => (state.tool === "comment" ? state.localPage : null));
  return (
    <div className="studio-inspector">
      <div className="studio-inspector__tabs">
        <Tabs
          items={localPage ? builderTabs : tabs}
          value={tab}
          size="sm"
          variant="subtle"
          idPrefix="studio-inspector"
          aria-label="Inspector views"
          onValueChange={(id) => studioStore.setState({ inspectorTab: id as StudioInspectorTab })}
        />
        {/* The zoom on the tab row, as Figma UI3's. */}
        <ZoomMenu size="xs" />
      </div>
      {/* The tabs not shown keep an empty hidden panel: a tab's aria-controls must name an element that exists (axe
          aria-valid-attr-value; UX review 2026-10-27 §5). */}
      {(localPage ? builderTabs : tabs).filter((item) => item.id !== tab).map((item) => <TabPanel key={item.id} idPrefix="studio-inspector" id={item.id} hidden>{null}</TabPanel>)}
      <TabPanel idPrefix="studio-inspector" id={tab} className="studio-inspector__body">
        {commentPage ? <CommentsPanel localPage={commentPage} />
          : tab === "prototype" ? <PrototypePanel />
          // The Code tab holds a layer's code properties (DesignPanel's code view; §3a), the Design tab only Figma's.
          : tab === "code" ? <CodePanel selection={selection} codeSlot={codeSlot} properties={selection?.kind === "node" && !selection.part ? <DesignPanel key={identity} view="code" selection={selection} controlsSlot={controlsSlot} /> : null} />
          : presetsPage ? <FramePresets localPage={presetsPage} />
          : scalePage ? <ScalePanel />
          : several && selection?.kind === "node" && !selection.part ? <SelectionActions />
          // A layer inside an instance of a page's own component (F7b): its overrides.
          : selection?.kind === "node" && selection.part && selection.name === "Use" ? <LocalPartPanel key={identity} selection={selection} />
          : selection?.kind === "node" && selection.part ? <TablePartPanel key={identity} selection={selection} controlsSlot={controlsSlot} />
          : selection?.kind === "node" ? <DesignPanel key={identity} selection={selection} controlsSlot={controlsSlot} />
          : selection?.kind === "variant" ? <VariantPanel key={variantKey(selection)} selection={selection} />
            : selection?.kind === "frame" ? <FramePanel key={selection.frameId} frameId={selection.frameId} controlsSlot={controlsSlot} />
              : <PagePanel />}
      </TabPanel>
      <StatusLine />
    </div>
  );
}
