import { useState } from "react";
import { Badge, Heading, List, ListItem, Stack, Text, VisuallyHidden } from "@zen-ds/react";

type Row = [name: string, preview: string, time: string];
const rows: Row[] = [["Ava Chen", "Did you get the brand files?", "2 min"], ["Design team", "Chi: Standup moved to 10:30", "12 min"], ["Bao Nguyen", "Thanks, merged!", "1 h"]];

/** Emphasis inside one level: every row title stays Body/Base/Bold (Figma ListItem Title); unread is a Badge plus a
 *  visually hidden “Unread”, with the caption in a heavier weight and the strongest tone — never a bigger size. */
export default function InboxEmphasis() {
  const [read, setRead] = useState<string[]>(["Bao Nguyen"]);
  // Opening a conversation selects its row and marks it read, as in an inbox.
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Stack gap="xl" padding="xl" radius="lg" surface="canvas" width="fill" align="stretch">
      <Heading level={2} textStyle="Heading/4">Inbox</Heading>
      <List aria-label="Inbox">
        {rows.map(([name, preview, time]) => {
          const unread = !read.includes(name);
          // The state is also said in text (WCAG 1.3.1, G117), inside the row button so its name carries it.
          return (
            <ListItem key={name} selected={open === name} onClick={() => { setOpen(name); setRead((all) => (all.includes(name) ? all : [...all, name])); }}
              title={<>{unread ? <VisuallyHidden>Unread</VisuallyHidden> : null}{name}</>}
              caption={unread ? <Text as="span" textStyle="Body/Small/Medium" tone="strongest">{preview}</Text> : preview}
              // Time over the New badge, so the subject keeps the width in a narrow inbox.
              trailing={(
                <Stack gap="2xs" align="end">
                  <Text as="span" textStyle="Caption/Regular" tone="light" wrap={false}>{time}</Text>
                  {unread ? <Badge size="xsmall" theme="blue" background="subtle">New</Badge> : null}
                </Stack>
              )} />
          );
        })}
      </List>
    </Stack>
  );
}
