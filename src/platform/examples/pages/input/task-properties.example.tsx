import { useState } from "react";
import { Grid, PropertyDate, PropertyField, PropertyPeople, PropertySelect, PropertyStatus, PropertyTags, PropertyText, Stack, type PropertyFieldOption } from "@zen-ds/react";
import { daysFromToday, peopleList } from "../../data";

const priorityOptions: PropertyFieldOption[] = [
  { value: "urgent", label: "Urgent", icon: "icon-flag-03-solid", tone: "negative" },
  { value: "high", label: "High", icon: "icon-flag-03-solid", tone: "negative" },
  { value: "normal", label: "Normal", icon: "icon-flag-03-solid", tone: "warning" },
  { value: "low", label: "Low", icon: "icon-flag-03-solid", tone: "neutral" },
];
const personOptions: PropertyFieldOption[] = peopleList.map((person) => ({ value: person.id, label: person.name, photoSrc: person.photo }));
const labelOptions: PropertyFieldOption[] = [
  { value: "ds", label: "Design System", theme: "blue" },
  { value: "ui", label: "UI Design", theme: "orange" },
  { value: "research", label: "Research", theme: "green" },
  { value: "a11y", label: "Accessibility", theme: "purple" },
];

/** A task's properties in two columns: click a value to change it in place. */
export default function TaskProperties() {
  const [labels, setLabels] = useState(labelOptions);
  const [applied, setApplied] = useState(["ds", "ui"]);
  const create = (name: string) => {
    const id = `label-${labels.length + 1}`;
    setLabels((all) => [...all, { value: id, label: name, theme: "neutral" }]);
    setApplied((list) => [...list, id]);
  };
  return (
    <Stack gap="2xs" align="stretch">
      <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="2xs" columnGap="xl">
        <PropertyField label="Status" icon="icon-loading-02-line"><PropertyStatus defaultValue="to-do" statuses={["to-do", "in-progress", "in-review", "done", "blocked"]} /></PropertyField>
        <PropertyField label="Priority" icon="icon-flag-01-line"><PropertySelect options={priorityOptions} defaultValue="urgent" /></PropertyField>
        <PropertyField label="Start Date" icon="icon-calendar-line"><PropertyDate /></PropertyField>
        <PropertyField label="Assignee" icon="icon-users-plus-line"><PropertyPeople options={personOptions} defaultValue={["alex"]} /></PropertyField>
        <PropertyField label="Due Date" icon="icon-calendar-line"><PropertyDate defaultValue={daysFromToday(7)} /></PropertyField>
        <PropertyField label="Reporter" icon="icon-user-left-line"><PropertyPeople single options={personOptions} defaultValue={["chi"]} /></PropertyField>
      </Grid>
      <PropertyField label="Labels" icon="icon-tag-line"><PropertyTags options={labels} value={applied} onValueChange={setApplied} onCreate={create} /></PropertyField>
      <PropertyField label="Sprint" icon="icon-text-input-line"><PropertyText defaultValue="Sprint 42 · Design QA" /></PropertyField>
    </Stack>
  );
}
