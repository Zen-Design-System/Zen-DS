import { PropertyDate, PropertyField, PropertyPeople, PropertyStatus, PropertyText, Stack, type PropertyFieldOption } from "@zen-ds/react";
import { daysFromToday, peopleList } from "../../data";

const personOptions: PropertyFieldOption[] = peopleList.map((person) => ({ value: person.id, label: person.name, photoSrc: person.photo }));

/** A project keeps its own words for the workflow through labels; the active phase passes its exact share. */
export default function ProjectProperties() {
  return (
    <Stack gap="2xs" align="stretch">
      <PropertyField label="Phase" icon="icon-loading-02-line">
        <PropertyStatus defaultValue="in-progress" progress={64} statuses={["to-do", "in-progress", "blocked", "done"]}
          labels={{ "to-do": "Planning", "in-progress": "Active", blocked: "On hold", done: "Completed" }} />
      </PropertyField>
      <PropertyField label="Lead" icon="icon-user-circle-line"><PropertyPeople single options={personOptions} defaultValue={["chi"]} /></PropertyField>
      <PropertyField label="Launch" icon="icon-calendar-check-line"><PropertyDate defaultValue={daysFromToday(33)} /></PropertyField>
      <PropertyField label="Client" icon="icon-building-02-line"><PropertyText defaultValue="Phin & Co" /></PropertyField>
    </Stack>
  );
}
