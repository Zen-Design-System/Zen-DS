import { Avatar, Heading, Link, List, ListBox, ListItem, Tooltip, useToast } from "@zen-ds/react";
import { activity, formatDate, formatRelative, formatTime, initials, people, type Person } from "../../data";

/** Photo when the person has one, initials on their steady theme otherwise. The name sits next to it, so alt is empty. */
const avatarFor = (person: Person) => person.photo ? { theme: "photo" as const, src: person.photo, alt: "" } : { theme: person.theme, children: initials(person.name) };
/** "Wednesday, Sep 30, 2026 at 9:12 am" */
const fullTime = (d: Date) => `${d.toLocaleString("en-US", { weekday: "long" })}, ${formatDate(d)} at ${formatTime(d)}`;
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The activity feed: each relative time links to its item, and its tooltip gives the full date and time. */
export default function ActivityTimes() {
  const { toast } = useToast();
  return (
    // A ListBox: the title in its Header-Slot, the activity rows in its Body-Slot.
    <ListBox width="fill"
      header={<Heading level={4} textStyle="Heading/Subheading">Activity</Heading>}>
      <List aria-label="Activity">
        {activity.slice(0, 5).map((item) => {
          const person = people[item.actor];
          // Static rows: the time link inside the caption is the action, so the row itself is not a button.
          return (
            <ListItem key={item.id} title={person.name}
              leading={<Avatar size="md" {...avatarFor(person)} />}
              caption={(
                <>
                  {`${sentence(`${item.verb} ${item.object}`)} · `}
                  <Tooltip content={fullTime(item.at)}>
                    {/* A permalink to the item; the demo confirms it instead of leaving the page. */}
                    <Link href={`#activity-${item.id}`} tone="inherit" onClick={(event) => { event.preventDefault(); toast({ title: "Activity opened" }); }}>{formatRelative(item.at)}</Link>
                  </Tooltip>
                </>
              )} />
          );
        })}
      </List>
    </ListBox>
  );
}
