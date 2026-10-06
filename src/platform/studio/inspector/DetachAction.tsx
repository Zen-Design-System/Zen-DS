import { useId, useState } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Dialog } from "../../../components/Dialog";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { StudioSelection } from "../types";
import { answerDetachConfirm, detachKeys, detachSelection, shortReason, useDetachConfirm, useDetachRunning, type DetachAvailability } from "./detach";
import { inspectorStatus, undoShortcut } from "./status";

/*
 * The inspector's Detach instance button (Design tab header) and the "Detach only this row?" dialog (mounted once with
 * the Studio's other dialogs). See ./detach for what a detach does.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/**
 * "Detach instance" ("Detach this row…" for a .map row), full width, with a caption under it that says what happens or,
 * while it is blocked for now (connecting, checking, detaching, an instance-level refusal), why — in visible text, never
 * only a tooltip. The Design panel renders it only for a detachable type, as an admin with a writable (or connecting)
 * dev server, and passes the plan it read (useDetachPlan).
 */
export function DetachAction({ selection, availability, connecting, row, compact = false }: {
  selection: NodeSelection;
  availability: DetachAvailability;
  /** Admin, the dev server not answered yet. */
  connecting: boolean;
  /** A row of a .map (the plan's `repeated`, or the rendered fibers' guess while it loads): "Detach this row…". */
  row: boolean;
  /** The header's icon button (Design panel UI3, user 2026-10-06): what it does, or why not yet, in its tooltip; a press
   *  while it is blocked says why in the status line instead of doing nothing. */
  compact?: boolean;
}) {
  const running = useDetachRunning();
  const captionId = useId();
  const blocked = connecting ? "Connecting to the dev server…"
    : running ? "Detaching…"
      : availability.state === "loading" ? "Checking…"
        : availability.state === "refused" ? shortReason(availability.reason)
          : null;
  const label = row ? "Detach this row…" : "Detach instance";
  if (compact) {
    const reason = availability.state === "refused" && !connecting && !running ? availability.reason : blocked;
    return (
      <IconButton
        icon="icon-link-broken-02-line"
        appearance="flat"
        level="primary"
        size="xs"
        aria-label={label}
        tooltip={reason ? `${label}: ${reason}` : `${label} · becomes Box/Stack/Text · ${undoShortcut} to undo`}
        aria-keyshortcuts={detachKeys}
        data-blocked={reason ? "true" : undefined}
        className="studio-inspector__head-action"
        onClick={() => { if (reason) inspectorStatus.set("neutral", reason); else void detachSelection(selection); }}
      />
    );
  }
  return (
    <div className="studio-inspector__detach">
      {/* zen-allow-small-full-width: the inspector header's Detach (approved option B spec, 2026-10-03) spans the 280–720px panel at sm so it never outweighs the node name */}
      <Button
        level="tertiary"
        size="sm"
        startIcon="icon-link-broken-02-line"
        className="studio-inspector__detach-button"
        disabled={blocked !== null}
        aria-keyshortcuts={detachKeys}
        aria-describedby={captionId}
        onClick={() => { void detachSelection(selection); }}
      >
        {label}
      </Button>
      {/* The usual caption always holds its place (hidden while a short reason shows over it), so the header does not
          change height between Checking…, ready and a refusal; a reason is clamped to two lines. */}
      <div className="studio-inspector__detach-caption-box">
        <p aria-hidden={blocked !== null || undefined} data-hidden={blocked !== null || undefined} className={`studio-inspector__detach-caption ${typographyStyles["Body/Small/Regular"]}`} id={blocked === null ? captionId : undefined}>
          {"Becomes Box/Stack/Text in the source · "}<span className="studio-inspector__nowrap">{`${undoShortcut} to undo`}</span>
        </p>
        {blocked !== null ? (
          <p id={captionId} className={`studio-inspector__detach-caption studio-inspector__detach-reason ${typographyStyles["Body/Small/Regular"]}`} title={availability.state === "refused" && !connecting && !running ? availability.reason : undefined}>
            {blocked}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** "Detach only this row?" for an instance rendered by a `.map`: Cancel or Detach row. */
export function DetachDialog() {
  const pending = useDetachConfirm();
  // The question stays readable while the dialog fades out after an answer.
  const [question, setQuestion] = useState(pending);
  if (pending && pending !== question) setQuestion(pending);
  return (
    <Dialog
      open={Boolean(pending)}
      onOpenChange={(open) => { if (!open) answerDetachConfirm(false); }}
      title="Detach only this row?"
      description={question ? `Row ${question.row + 1} of ${question.count} becomes Box/Stack/Text; the other rows stay ${question.component}.` : undefined}
      icon="icon-link-broken-02-line"
      primaryAction={{ label: "Detach row", onClick: () => answerDetachConfirm(true), autoFocus: true }}
      secondaryAction={{ label: "Cancel", onClick: () => answerDetachConfirm(false) }}
    />
  );
}
