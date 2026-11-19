import { useState } from "react";
import { Button, Card, DateField, Form, FormActions, Heading, InputField, Stack, useToast } from "@zen-ds/react";
import { TODAY, formatDate, formatDue } from "../../data";

/** "10/05/2026", the DateField's typed format, → a Date; null while the text is incomplete or not a real day. */
function parseTyped(text: string): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [month, day, year] = [Number(match[1]) - 1, Number(match[2]), Number(match[3])];
  const date = new Date(year, month, day);
  return date.getMonth() === month && date.getDate() === day ? date : null;
}
const weekday = (date: Date) => date.toLocaleString("en-US", { weekday: "long" });
const today = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

/** A DateField takes a typed date or opens the calendar; the help text says what the date means for the task. */
export default function DueDate() {
  const { toast } = useToast();
  const [task, setTask] = useState("Check the points history on small phones");
  const [due, setDue] = useState("10/05/2026");
  const [errors, setErrors] = useState<{ task?: string; due?: string }>({});
  const date = parseTyped(due);
  const create = () => {
    const next = {
      task: task.trim() ? undefined : "Name the task",
      due: !due.trim() ? undefined : !date ? "Enter the date as MM/DD/YYYY, like 10/05/2026" : date < today ? "Pick today or a later date" : undefined,
    };
    // A failed submit: Form moves focus to the first field with an error.
    setErrors(next);
    if (next.task || next.due) return;
    toast({ type: "positive", title: "Task created", children: date ? `${task.trim()} · due ${formatDate(date)}` : task.trim() });
    setTask("");
    setDue("");
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={create} gap="md">
        <Heading level={4} textStyle="Heading/Subheading">New task</Heading>
        <InputField label="Task" value={task} error={errors.task} onValueChange={(next) => { setTask(next); setErrors((e) => ({ ...e, task: undefined })); }} />
        {/* Typed or picked, the help text says what the date means for the task. */}
        <DateField label="Due date" labelOptional today={TODAY} minDate={TODAY} value={due} error={errors.due} onValueChange={(next) => { setDue(next); setErrors((e) => ({ ...e, due: undefined })); }}
          helpText={date ? `${weekday(date)}, ${formatDate(date)} · ${formatDue(date)}` : undefined} />
        <FormActions>
          <Button level="primary" type="submit">Create task</Button>
        </FormActions>
      </Form>
    </Card></Stack>
  );
}
