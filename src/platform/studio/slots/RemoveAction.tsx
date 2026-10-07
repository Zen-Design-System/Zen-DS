import { useId, useMemo, useSyncExternalStore } from "react";
import { Button, IconButton } from "../../../components/Button";
import { typographyStyles } from "../../../tokens/typography.generated";
import { parseSrc } from "../api";
import { inspectorStatus, undoShortcut } from "../inspector/status";
import { selectionInstances } from "../select/picker";
import { canEdit, useStudio } from "../store";
import type { SourceElement, StudioSelection } from "../types";
import { canStructurallyEdit, isTemplateFile, removeKeys, removeSelection, repeatsOf, useSlotRunning, useSlotServer, useStructuralBlock } from "./actions";
import "./slots.css";

/*
 * "Remove" in the Design tab header, under Detach and laid out like it (spec "Client"): full width, with a caption box
 * that keeps its height, so the header does not jump between reading, checking, removing and ready. It removes the
 * selected element from its example or template (Delete / Backspace does the same on the canvas). Its caption says what
 * happens, or, while it is blocked (connecting, reading the source, another edit running, what the server refuses: a
 * `.map` row, what a function returns), why — in visible text, never only a tooltip. Hidden for a Viewer, read-only
 * Studios, parts, and anything that is not example or template content (a playground shows the main component, docs and
 * shared code change in the code).
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

export type RemoveActionProps = {
  selection: NodeSelection;
  /** The element's source: undefined while it is read, null when it is gone. */
  element: SourceElement | null | undefined;
  /** Admin with a writable dev server (the Design panel's `editable`). */
  editable: boolean;
  /** The Design panel header's icon button (UI3, user 2026-10-06): what it removes, or why not yet, in its tooltip; a
   *  press while it is blocked says why in the status line. */
  compact?: boolean;
};

export function RemoveAction({ selection, element, editable, compact = false }: RemoveActionProps) {
  const server = useSlotServer();
  const role = useStudio((state) => state.role);
  const running = useSlotRunning();
  const captionId = useId();
  // The instance count the canvas publishes for the selection (re-rendered when it changes): every render on the canvas.
  const info = useSyncExternalStore(selectionInstances.subscribe, selectionInstances.get, selectionInstances.get);
  const rendered = info.src === selection.src ? info.count : 0;
  // How often it renders (what a removal changes, as the confirmation counts it: a helper used by several examples
  // changes in each), and whether those are the rows of one `.map` list; read from the canvas when the count changes.
  const { count, unit } = useMemo(() => (rendered > 1 ? repeatsOf(selection) : { count: 1, unit: "places" as const }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selection.src, selection.instance, rendered]);
  const connecting = role === "admin" && canEdit() && !server.ready;
  const check = canStructurallyEdit(selection);
  const offered = (editable || connecting) && element !== null && (check.ok || check.kind === "server");
  // What the server would refuse, read from the source around the element (again after each change of its file).
  const block = useStructuralBlock(offered && check.ok ? selection : null, "remove", element?.hash);
  if (!offered) return null;
  const where = isTemplateFile(parseSrc(selection.src)?.file ?? "") ? "this template" : "this example";
  const usual = count > 1 ? `Removes it from all ${count} ${unit}` : `Removes it from ${where}`;
  const blocked = connecting ? "Connecting to the dev server…"
    : running ? running
      : element === undefined ? "Reading the source…"
        : !check.ok ? check.reason
          : block === undefined ? "Checking…"
            : block;
  if (compact) {
    return (
      // zen-allow-destructive: one undoable draft edit (⌘Z), an icon in the inspector header (UI3); not an irreversible delete
      <IconButton
        icon="icon-trash-line"
        appearance="flat"
        level="primary"
        size="xs"
        aria-label="Remove"
        tooltip={blocked ? `Remove: ${blocked}` : `Remove · ${usual} · ${undoShortcut} to undo`}
        aria-keyshortcuts={removeKeys}
        data-blocked={blocked ? "true" : undefined}
        className="studio-inspector__head-action"
        onClick={() => { if (blocked) inspectorStatus.set("neutral", blocked); else void removeSelection(selection); }}
      />
    );
  }
  return (
    <div className="studio-slots__remove">
      {/* zen-allow-destructive: one undoable draft edit (⌘Z), tertiary under Detach in the inspector header (slots spec 2026-10-03); not an irreversible delete */}
      {/* zen-allow-small-full-width: laid out like Detach above it (approved option B spec, 2026-10-03): sm, spanning the 280–720px panel */}
      <Button
        level="tertiary"
        size="sm"
        startIcon="icon-trash-line"
        className="studio-slots__remove-button"
        disabled={blocked !== null}
        aria-keyshortcuts={removeKeys}
        aria-describedby={captionId}
        onClick={() => { void removeSelection(selection); }}
      >
        Remove
      </Button>
      {/* The usual caption always holds its place (hidden while a reason shows over it); a reason is clamped to two lines. */}
      <div className="studio-slots__remove-caption-box">
        <p aria-hidden={blocked !== null || undefined} data-hidden={blocked !== null || undefined} className={`studio-slots__remove-caption ${typographyStyles["Body/Small/Regular"]}`} id={blocked === null ? captionId : undefined}>
          {`${usual} · `}<span className="studio-slots__nowrap">{`${undoShortcut} to undo`}</span>
        </p>
        {blocked !== null ? (
          <p id={captionId} className={`studio-slots__remove-caption studio-slots__remove-reason ${typographyStyles["Body/Small/Regular"]}`} title={blocked}>
            {blocked}
          </p>
        ) : null}
      </div>
    </div>
  );
}
