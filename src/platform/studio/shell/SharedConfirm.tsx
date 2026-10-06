import { useState } from "react";
import { Dialog } from "../../../components/Dialog";
import { fileName, undoShortcut } from "../inspector/status";
import { answerShared, useSharedQuestion, type SharedQuestion } from "../sharedConfirm";

/*
 * "Change shared code?" (plan WP-B2): a structural edit in code that examples share asks first, naming the files that
 * use it, like Figma's "Edit main component". Mounted once with the Studio's other dialogs (SlotConfirm, DetachDialog).
 */

function descriptionOf({ file, uses, users }: SharedQuestion): string {
  const names = users.map(fileName);
  const more = uses > names.length ? ` and ${uses - names.length} more` : "";
  const where = uses === 0 ? "It is shared demo code" : `It is used in ${uses === 1 ? "1 file" : `${uses} files`} (${names.join(", ")}${more})`;
  return `${fileName(file)} is not this example's own code. ${where}, so this change shows everywhere it is used. ${undoShortcut} undoes it.`;
}

export function SharedConfirm() {
  const pending = useSharedQuestion();
  // The question stays readable while the dialog fades out after an answer.
  const [question, setQuestion] = useState(pending);
  if (pending && pending !== question) setQuestion(pending);
  return (
    <Dialog
      open={Boolean(pending)}
      onOpenChange={(open) => { if (!open) answerShared(false); }}
      title="Change shared code?"
      description={question ? descriptionOf(question) : undefined}
      theme="warning"
      icon="icon-alert-triangle-line"
      primaryAction={{ label: "Change everywhere", onClick: () => answerShared(true), autoFocus: true }}
      secondaryAction={{ label: "Cancel", onClick: () => answerShared(false) }}
    />
  );
}
