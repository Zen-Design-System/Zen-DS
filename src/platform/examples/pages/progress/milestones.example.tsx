import { useId } from "react";
import { Heading, List, ListBox, ListItem, ProgressCircle, Stack, Text, plural } from "@zen-ds/react";
import { daysFromToday, formatRange, projectById } from "../../data";

/** The Loyalty app from its start to its due date; 50 of its 78 tasks are done, the project's 64%. */
const loyaltyApp = projectById("phin-loyalty");
const milestones = [
  { id: "discovery", title: "Discovery", start: loyaltyApp.start, end: daysFromToday(-49), done: 12, total: 12 },
  { id: "design", title: "Design", start: daysFromToday(-48), end: daysFromToday(-6), done: 18, total: 18 },
  { id: "build", title: "Build", start: daysFromToday(-20), end: daysFromToday(19), done: 18, total: 34 },
  { id: "beta", title: "Member beta", start: daysFromToday(20), end: daysFromToday(28), done: 2, total: 8 },
  { id: "launch", title: "Launch", start: daysFromToday(29), end: loyaltyApp.due, done: 0, total: 6 },
];

/** A Progress-Circle in each list row, where a bar would crowd the text. */
export default function Milestones() {
  const titleId = useId();
  return (
    // A ListBox: the title and project in its Header-Slot, one row per milestone in its Body-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack gap="2xs">
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">Milestones</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{`${loyaltyApp.name} · ${loyaltyApp.client}`}</Text>
      </Stack>}>
      <List aria-labelledby={titleId}>
        {milestones.map((m) => {
          const percent = Math.round((m.done / m.total) * 100);
          return (
            // The circles line up and the percentages right-align down the column ("62%" under "100%"): every label is
            // as wide as "100%".
            <ListItem key={m.id} title={m.title} caption={`${formatRange(m.start, m.end)} · ${m.done} of ${plural(m.total, "task")}`}
              trailing={<ProgressCircle value={percent} aria-label={`${m.title} progress`}
                label={<span style={{ display: "inline-block", minInlineSize: "5ch", textAlign: "end" }}>{`${percent}%`}</span>} />} />
          );
        })}
      </List>
    </ListBox>
  );
}
