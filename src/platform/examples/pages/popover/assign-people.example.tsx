import { useState } from "react";
import { AvatarStack, Card, Chip, Heading, Stack, Text, type PopoverItemData } from "@zen-ds/react";
import { daysFromToday, formatDate, formatRange, leaveRequests, people, type Person } from "../../data";

/** The Loyalty app team. Everyone here has a photo, which the Avatar item theme draws at its own size. */
const loyaltyTeam: Person[] = [people.chi, people.bao, people.duy, people.alex, people.ava, people.emi, people.finn];
/** A Loyalty app task due on Oct 13, while Alex is on approved leave (Oct 12 – Oct 14 in the studio's leave requests). */
const task = { key: "PHIN-231", title: "Motion pass on the tier upgrade", due: daysFromToday(13) };
/** Approved leave that covers the day (compared by calendar day): that person can't take the task. */
const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const onLeave = (personId: string, day: Date) => leaveRequests.find((leave) =>
  leave.person === personId && leave.status === "Approved" && dayOf(leave.from) <= dayOf(day) && dayOf(day) <= dayOf(leave.to));
const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** A searchable multi-select of people with photos, in a Chip's Popover; someone on leave stays listed, disabled. */
export default function AssignPeople() {
  const [assigned, setAssigned] = useState<string[]>(["emi", "chi"]);
  const items: PopoverItemData[] = loyaltyTeam.map((person) => {
    const leave = onLeave(person.id, task.due);
    return {
      id: person.id, label: person.name, theme: "avatar-small", photoSrc: person.photo, selected: assigned.includes(person.id),
      // Someone who can't take the task stays in the list, disabled, with the reason as the caption.
      ...(leave ? { disabled: true, caption: `On leave ${formatRange(leave.from, leave.to)}` } : { caption: person.role }),
    };
  });
  const team = loyaltyTeam.filter((person) => assigned.includes(person.id));
  return (
    <Card theme="default" width="fill">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">{task.title}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${task.key} · Due ${formatDate(task.due)}`}</Text>
        </Stack>
        <Stack direction="row" align="center" gap="xs" wrap>
          <Chip variant="advanced" dropdown leading="icon-users-line" popoverMultiple popoverSearch
            popoverSearchPlaceholder="Search people" popoverLabel="Loyalty app team" popoverItems={items}
            onPopoverSelect={(item) => setAssigned((current) => toggleIn(current, item.id))}>
            Assignees
          </Chip>
          {team.length
            ? <AvatarStack size="sm" items={team.map((person) => ({ src: person.photo, alt: person.name }))} />
            : <Text as="span" textStyle="Body/Small/Regular" tone="base">Unassigned</Text>}
        </Stack>
      </Stack>
    </Card>
  );
}
