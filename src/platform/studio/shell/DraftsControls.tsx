import { useEffect, useId, useRef, useState } from "react";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Dialog } from "../../../components/Dialog";
import { DockIcon } from "../../../components/DockIcon";
import { List, ListItem } from "../../../components/ListItem";
import { plural, Text } from "../../../components/Text";
import { modKey } from "../canvas/ZoomControls";
import { answerDraftsQuestion, confirmDiscard, refreshDrafts, requestSave, studioDrafts, useDraftsQuestion, useFrameDrafts, useStudioDrafts } from "../sourceDrafts";
import type { DraftInfo } from "../types";
import "./shell.css";

/*
 * Toolbar controls of the admin drafts (../sourceDrafts): "Unsaved · N files", which opens the list of drafted files
 * (stale ones flagged) with Discard all, Save all and a Discard per file, and Save all itself (⌘S, StudioApp). Each
 * canvas frame saves or discards its own changes from its frame toolbar (board/FrameChrome). Save all and Discard all
 * name the files listed, never drafts started meanwhile. Viewers get a note instead: the canvas shows the drafts.
 */

const fileName = (file: string) => file.slice(file.lastIndexOf("/") + 1);
const folderOf = (file: string) => (file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : "");

function changeSummary(row: DraftInfo) {
  const { added, removed } = row.changedLines;
  return added || removed ? `+${added} −${removed}` : "Changed";
}

/** One drafted file: name, its changed lines and folder, and (stale) a warning line; Discard for this file alone. */
function DraftRow({ row, disabled }: { row: DraftInfo; disabled: boolean }) {
  const name = fileName(row.file);
  const caption = [changeSummary(row), folderOf(row.file)].filter(Boolean).join(" · ");
  return (
    <ListItem
      className="studio-drafts__row"
      title={<span title={row.file}>{name}</span>}
      caption={(
        <>
          {caption}
          {row.stale ? <Text as="span" textStyle="Body/Small/Regular" tone="warning" className="studio-drafts__stale">Disk changed since · Save merges the edits</Text> : null}
        </>
      )}
      leading={<DockIcon icon="icon-file-code-line" size="sm" theme="neutral" background="subtle" />}
      trailing={<IconButton appearance="flat" level="primary" size="md" icon="icon-x-line" aria-label={`Discard the draft of ${name}`} tooltip="Discard this draft" disabled={disabled} onClick={() => confirmDiscard([row.file])} />}
    />
  );
}

/**
 * Unsaved · Discard · Save for admins (rendered only while drafts exist). `density`: how much room the toolbar has —
 * wide "Unsaved · 2 files", compact "2 unsaved" (Pages panel in a drawer), narrow the count alone (< 1024px).
 */
/** `phone`: the count only; Save all stays in its list and on ⌘S (no room in a phone toolbar, E2E S-07). */
export function DraftsControls({ density }: { density: "wide" | "compact" | "narrow" | "phone" }) {
  const { drafts, busy } = useStudioDrafts();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const count = drafts.length;
  const staleCount = drafts.filter((row) => row.stale).length;

  // Non-modal panel, as the Modes panel: focus moves in, Escape or a press outside closes it. A press inside a dialog
  // it opened (Discard asks first) keeps it open.
  useEffect(() => {
    if (!open) return undefined;
    // Fresh stale flags: a disk change made elsewhere otherwise shows with the next 10 s poll.
    void refreshDrafts();
    panelRef.current?.querySelector<HTMLElement>(".studio-drafts__actions button:last-child")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || rootRef.current?.contains(target) || target.closest("[aria-modal='true']")) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest("[aria-modal='true']")) return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  // The list emptied (saved or discarded): the panel has nothing left to show.
  if (open && !count) setOpen(false);

  // Unmounting with focus inside (the last draft was saved or discarded): hand focus to the toolbar's role menu instead
  // of dropping it on <body>. A removed element fires no blur, so `focused` still says where focus was.
  const focused = useRef(false);
  useEffect(() => () => {
    if (!focused.current) return;
    requestAnimationFrame(() => {
      if (!document.activeElement || document.activeElement === document.body) document.querySelector<HTMLElement>(".studio-toolbar .studio-role")?.focus();
    });
  }, []);

  const { outside } = useFrameDrafts();
  const saveAll = async () => {
    await requestSave(null);
    // Every draft written (conflicts stay listed): close and return to the trigger's place.
    if (!studioDrafts.get().drafts.length) setOpen(false);
  };

  const label = density === "narrow" || density === "phone" ? `${count}` : density === "compact" ? `${count} unsaved` : `Unsaved · ${plural(count, "file")}`;
  const description = `${plural(count, "file")} with unsaved drafts${staleCount ? `, ${staleCount} changed on disk` : ""}`;
  const saving = busy === "save" ? "Saving…" : "Save all";
  return (
    <div
      ref={rootRef}
      className="studio-drafts"
      role="group"
      aria-label="Unsaved drafts"
      onFocus={() => { focused.current = true; }}
      onBlur={(event) => { focused.current = event.relatedTarget instanceof Node && Boolean(rootRef.current?.contains(event.relatedTarget)); }}
    >
      <Button
        ref={triggerRef}
        className="studio-drafts__count"
        appearance="flat"
        level="primary"
        size="sm"
        startIcon={<span className="studio-drafts__dot" aria-hidden="true" />}
        endIcon={<Icon name="icon-chevron-down-line" decorative />}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        aria-label={`${description}: show the list`}
        title={description}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </Button>
      {density === "phone" ? null : (
        <Button appearance="main" level="primary" size="sm" aria-keyshortcuts="Meta+S Control+S" disabled={busy !== null} onClick={() => { void saveAll(); }}>
          {saving}
        </Button>
      )}
      {open ? (
        <div ref={panelRef} id={`${id}-panel`} className="studio-drafts__panel" role="dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-note`}>
          <div className="studio-drafts__head">
            <Text as="p" id={`${id}-title`} textStyle="Body/Small/Bold">{`Unsaved drafts · ${plural(count, "file")}`}</Text>
            <Text as="p" id={`${id}-note`} textStyle="Caption/Regular" tone="light">
              {`Everyone on this dev server sees them until you save or discard. A frame saves or discards its own changes from its toolbar; Save all writes every file listed here and runs the harness (${modKey}S).`}
            </Text>
            {outside.changes ? (
              <Text as="p" textStyle="Caption/Regular" tone="light">
                {`${plural(outside.changes, "change")} outside the frames on this page (another page or a shared file): only Save all writes ${outside.changes === 1 ? "it" : "them"}.`}
              </Text>
            ) : null}
          </div>
          <List className="studio-drafts__list" aria-label="Files with drafts" inset="none">
            {drafts.map((row) => <DraftRow key={row.file} row={row} disabled={busy !== null} />)}
          </List>
          <div className="studio-drafts__actions">
            <Button appearance="main" level="danger-subtle" size="sm" disabled={busy !== null} onClick={() => confirmDiscard(null)}>Discard all</Button>
            <Button appearance="main" level="primary" size="sm" disabled={busy !== null} onClick={() => { void saveAll(); }}>{saving}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Viewer: the canvas shows drafts an admin has not saved yet. */
export function DraftsViewerNote({ density }: { density: "wide" | "compact" | "narrow" | "phone" }) {
  const { drafts } = useStudioDrafts();
  if (!drafts.length) return null;
  return (
    <Badge className="studio-drafts__note" size="sm" theme="yellow" background="subtle" aria-label={`Unsaved admin drafts are shown (${plural(drafts.length, "file")})`}>
      {density === "wide" ? "Unsaved admin drafts are shown" : "Drafts shown"}
    </Badge>
  );
}

/** "Discard 2 drafts?", "Discard the changes in “…”?" and "Save over newer disk changes?" (mounted once with the Studio's other dialogs). */
export function DraftsDialog() {
  const asked = useDraftsQuestion();
  // The question stays readable while the dialog fades out after an answer.
  const [shown, setShown] = useState(asked);
  if (asked && asked !== shown) setShown(asked);
  const files = shown ? shown.files : [];
  const frame = shown?.frame;
  const names = files.map(fileName);
  const list = names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(", ");

  if (shown?.kind === "save-stale") {
    const stale = shown.stale.map(fileName);
    return (
      <Dialog
        open={Boolean(asked)}
        onOpenChange={(open) => { if (!open) answerDraftsQuestion(false); }}
        title="Save over newer disk changes?"
        description={`${stale.join(", ")} changed on disk after ${stale.length === 1 ? "its draft" : "their drafts"} started. Save merges ${frame ? `the edits in “${frame.label}”` : "your edits"} into the disk version; a file whose changed lines collide stays a draft.`}
        theme="warning"
        icon="icon-alert-triangle-line"
        primaryAction={{ label: "Save", onClick: () => answerDraftsQuestion(true), autoFocus: true }}
        secondaryAction={{ label: "Cancel", onClick: () => answerDraftsQuestion(false) }}
      />
    );
  }
  return (
    <Dialog
      open={Boolean(asked)}
      onOpenChange={(open) => { if (!open) answerDraftsQuestion(false); }}
      title={frame ? `Discard the changes in “${frame.label}”?` : files.length === 1 ? `Discard the draft of ${names[0]}?` : `Discard ${plural(files.length, "draft")}?`}
      description={frame
        ? "This frame's unsaved edits go back to what is saved on disk; other frames keep theirs. They cannot be brought back."
        : files.length === 1 ? "The file goes back to what is saved on disk. Its unsaved edits cannot be brought back." : `${list} go back to what is saved on disk. Their unsaved edits cannot be brought back.`}
      theme="negative"
      icon="icon-trash-line"
      primaryAction={{ label: "Discard", level: "danger", onClick: () => answerDraftsQuestion(true) }}
      secondaryAction={{ label: "Cancel", onClick: () => answerDraftsQuestion(false), autoFocus: true }}
    />
  );
}
