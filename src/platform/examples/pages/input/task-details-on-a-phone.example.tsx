import type { RefObject } from "react";
import { AppShell, Heading, PropertyDate, PropertyField, PropertyPeople, PropertySelect, PropertyStatus, Stack, TopNavigation, type PropertyFieldOption } from "@zen-ds/react";
import { daysFromToday, peopleList } from "../../data";

const priorityOptions: PropertyFieldOption[] = [
  { value: "urgent", label: "Urgent", icon: "icon-flag-03-solid", tone: "negative" },
  { value: "high", label: "High", icon: "icon-flag-03-solid", tone: "negative" },
  { value: "normal", label: "Normal", icon: "icon-flag-03-solid", tone: "warning" },
  { value: "low", label: "Low", icon: "icon-flag-03-solid", tone: "neutral" },
];
const personOptions: PropertyFieldOption[] = peopleList.map((person) => ({ value: person.id, label: person.name, photoSrc: person.photo }));

// scrollRef: what scrolls the screen, so the bar draws its rule once content runs under it. "window" in your app.
export default function PhoneTaskProperties({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  return (
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="PHIN-214" />}>
      <Stack gap="md" align="stretch">
        <Heading level={2} textStyle="Heading/4">Design the points history screen</Heading>
        <Stack gap="2xs" align="stretch">
          <PropertyField label="Status" icon="icon-loading-02-line"><PropertyStatus defaultValue="in-progress" /></PropertyField>
          <PropertyField label="Priority" icon="icon-flag-01-line"><PropertySelect options={priorityOptions} defaultValue="high" /></PropertyField>
          <PropertyField label="Assignee" icon="icon-users-plus-line"><PropertyPeople options={personOptions} defaultValue={["chi"]} /></PropertyField>
          <PropertyField label="Due Date" icon="icon-calendar-line"><PropertyDate defaultValue={daysFromToday(2)} /></PropertyField>
        </Stack>
      </Stack>
    </AppShell>
  );
}
