import { useState } from "react";
import { PropertyDate, PropertyField, PropertyPeople, PropertyStatus, Stack, Toggle, type PropertyFieldOption } from "@zen-ds/react";
import { daysFromToday, peopleList } from "../../data";

const personOptions: PropertyFieldOption[] = peopleList.map((person) => ({ value: person.id, label: person.name, photoSrc: person.photo }));

/** Viewers see the same rows with readOnly: no hover, no picker, no remove buttons. */
export default function ViewerProperties() {
  const [canEdit, setCanEdit] = useState(false);
  return (
    <Stack gap="md" align="stretch">
      <Toggle size="md" label="Can edit this task" caption="Viewers see the same rows without hover, pickers or remove buttons." checked={canEdit} onCheckedChange={setCanEdit} />
      <Stack gap="2xs" align="stretch">
        <PropertyField label="Status" icon="icon-loading-02-line"><PropertyStatus readOnly={!canEdit} defaultValue="in-review" /></PropertyField>
        <PropertyField label="Assignee" icon="icon-users-plus-line"><PropertyPeople readOnly={!canEdit} options={personOptions} defaultValue={["bao", "chi"]} /></PropertyField>
        <PropertyField label="Due Date" icon="icon-calendar-line"><PropertyDate readOnly={!canEdit} defaultValue={daysFromToday(3)} /></PropertyField>
      </Stack>
    </Stack>
  );
}
