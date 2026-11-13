import { DockIcon, Heading, List, ListBox, ListItem } from "@zen-ds/react";

/** The studio's leave types with the emoji they have on the HR pages; Alex's balance for 2026. */
const leaveTypes = [
  { id: "annual", emoji: "🏝️", name: "Annual leave", caption: "7 of 18 days left · resets Jan 1, 2027" },
  { id: "sick", emoji: "🤒", name: "Sick leave", caption: "10 of 12 days left" },
  { id: "family", emoji: "🏡", name: "Family leave", caption: "3 of 3 days left" },
  { id: "unpaid", emoji: "🧳", name: "Unpaid leave", caption: "No limit · talk to your lead first" },
];

export default function LeaveBalance() {
  return (
    <ListBox width="fill" header={<Heading level={4} textStyle="Heading/Subheading">Leave balance</Heading>}>
      <List aria-label="Leave balance">
        {leaveTypes.map((t) => (
          <ListItem key={t.id} title={t.name} caption={t.caption} leading={<DockIcon theme="emoji" emoji={t.emoji} size="md" />} />
        ))}
      </List>
    </ListBox>
  );
}
