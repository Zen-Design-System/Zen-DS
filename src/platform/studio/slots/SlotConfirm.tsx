import { useState } from "react";
import { Dialog } from "../../../components/Dialog";
import { answerSlotConfirm, useSlotConfirm, useSlotServer, type SlotConfirmQuestion } from "./actions";
import { undoShortcut } from "../inspector/status";

/*
 * "Add to all 14 rows?": a slot edit inside a `.map` callback (or a helper rendered several times, in one example or in
 * several) changes every render of the element, so the Studio asks first (spec "Source ops", guards); "Clear Content in
 * all 14 rows?" and "Reset Content in all 14 rows?" for a slot's More actions. Mounted once with
 * the Studio's other dialogs, like DetachDialog; it also keeps the dev server's state for the slot keys (⌫, ⌘D), which
 * run outside React.
 */

const titles: Record<SlotConfirmQuestion["verb"], (count: number, unit: string, name: string) => string> = {
  add: (count, unit) => `Add to all ${count} ${unit}?`,
  remove: (count, unit) => `Remove from all ${count} ${unit}?`,
  duplicate: (count, unit) => `Duplicate in all ${count} ${unit}?`,
  move: (count, unit) => `Move in all ${count} ${unit}?`,
  clear: (count, unit, name) => `Clear ${name} in all ${count} ${unit}?`,
  reset: (count, unit, name) => `Reset ${name} in all ${count} ${unit}?`,
  swap: (count, unit, name) => `Swap ${name} in all ${count} ${unit}?`,
};

const actions: Record<SlotConfirmQuestion["verb"], string> = {
  add: "Add to all", remove: "Remove from all", duplicate: "Duplicate in all", move: "Move in all", clear: "Clear in all", reset: "Reset in all", swap: "Swap in all",
};

const outcomes: Record<SlotConfirmQuestion["verb"], (question: SlotConfirmQuestion) => string> = {
  add: ({ name, where }) => `${name} goes into ${where ?? "the slot"}`,
  remove: ({ name }) => `${name} is removed`,
  duplicate: ({ name }) => `${name} is duplicated`,
  move: ({ name }) => `${name} moves`,
  clear: ({ name, where }) => `${where ?? name} is emptied`,
  reset: ({ name, where }) => `${where ?? name} goes back to the saved file`,
  swap: ({ name }) => `${name} is swapped`,
};

function descriptionOf(question: SlotConfirmQuestion): string {
  const shared = question.unit === "rows" ? "every row of the list comes from the same code" : "the same code renders in each place";
  return `${outcomes[question.verb](question)} in all ${question.count} ${question.unit} at once: ${shared}. ${undoShortcut} undoes it.`;
}

/** The confirmation for a slot edit that changes every render of the element: Cancel or go ahead. */
export function SlotConfirm() {
  const pending = useSlotConfirm();
  useSlotServer();
  // The question stays readable while the dialog fades out after an answer.
  const [question, setQuestion] = useState(pending);
  if (pending && pending !== question) setQuestion(pending);
  // Remove and Clear take layers away: a negative dialog whose safe answer (Cancel) holds the focus.
  const remove = question?.verb === "remove" || question?.verb === "clear";
  return (
    <Dialog
      open={Boolean(pending)}
      onOpenChange={(open) => { if (!open) answerSlotConfirm(false); }}
      title={question ? titles[question.verb](question.count, question.unit, question.name) : ""}
      description={question ? descriptionOf(question) : undefined}
      theme={remove ? "negative" : "default"}
      icon={remove ? "icon-trash-line" : question?.verb === "reset" ? "icon-reverse-left-line" : "icon-repeat-01-line"}
      primaryAction={{ label: question ? actions[question.verb] : "Continue", level: remove ? "danger" : undefined, onClick: () => answerSlotConfirm(true), autoFocus: !remove }}
      secondaryAction={{ label: "Cancel", onClick: () => answerSlotConfirm(false), autoFocus: remove }}
    />
  );
}
