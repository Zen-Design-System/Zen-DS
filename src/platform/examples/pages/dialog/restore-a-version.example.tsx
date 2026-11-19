import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Dialog, Heading, List, ListItem, Stack, Text, useToast, useZen } from "@zen-ds/react";
import { TODAY, daysFromToday, files, formatRelative, initials, people, type Person, type PersonId } from "../../data";

type Version = { number: number; author: PersonId; at: Date; note?: string };
const contractFile = files.find((file) => file.id === "f3")!;
const contractVersions: Version[] = [
  { number: 4, author: "bao", at: contractFile.updated, note: "Adds the points expiry field" },
  { number: 3, author: "finn", at: daysFromToday(-5, 16, 5), note: "Renames reward tiers" },
  { number: 2, author: "bao", at: daysFromToday(-9, 11, 20) },
  { number: 1, author: "bao", at: daysFromToday(-16, 9, 0) },
];

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };
/** A timestamp inside a sentence: "yesterday at 4:05 pm", "Friday at 4:05 pm", "Sep 14 at 9:00 am". */
const since = (d: Date) => formatRelative(d).replace(/^(Just now|Yesterday)/, (word) => word.toLowerCase());

/** A row with a Badge or a button at its end. ListItem titles stay on one line, so on a phone the Badge or button moves
 *  under the caption and the title wraps instead of being cut (the Contents slot). */
function Row({ title, caption, leading, trailing }: { title: string; caption: string; leading: ReactNode; trailing: ReactNode }) {
  const narrow = useZen()?.breakpoint === "mobile";
  if (!narrow) return <ListItem title={title} caption={caption} leading={leading} trailing={trailing} />;
  return (
    <ListItem title={title} leading={leading}>
      <Stack gap="3xs" align="start">
        <Text as="span" textStyle="Body/Base/Bold">{title}</Text>
        <Text as="span" textStyle="Body/Small/Regular" tone="light">{caption}</Text>
        {trailing}
      </Stack>
    </ListItem>
  );
}

/** A file's version history; Restore asks in a Dialog whose three actions stack full width. */
export default function RestoreVersion() {
  const { toast } = useToast();
  const [versions, setVersions] = useState(contractVersions);
  const [picked, setPicked] = useState<Version | null>(null);
  const [open, setOpen] = useState(false);
  const current = versions[0];
  const ask = (version: Version) => { setPicked(version); setOpen(true); };
  const restore = () => {
    if (!picked) return;
    setVersions((list) => [{ number: list[0].number + 1, author: "alex", at: TODAY, note: `Restored from version ${picked.number}` }, ...list]);
    setOpen(false);
    toast({ title: `Version ${picked.number} restored` });
  };
  const saveCopy = () => { setOpen(false); toast({ title: "Copy saved" }); };
  return (
    <Card theme="default" spacing="md" width="fill">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">{contractFile.name}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Loyalty app · version history</Text>
        </Stack>
        <List aria-label="Versions">
          {versions.map((version) => (
            <Row key={version.number} title={version.note ?? `Version ${version.number}`}
              caption={`${version.note ? `Version ${version.number} · ` : ""}${people[version.author].name} · ${formatRelative(version.at)}`}
              leading={<Avatar size="md" {...avatarOf(people[version.author])} />}
              trailing={version === current
                ? <Badge theme="neutral" background="subtle">Current</Badge>
                : <Button level="tertiary" size="md" aria-label={`Restore version ${version.number}`} onClick={() => ask(version)}>Restore</Button>} />
          ))}
        </List>
      </Stack>
      <Dialog open={open} onOpenChange={setOpen} icon="icon-clock-line" title={`Restore version ${picked?.number ?? ""}?`}
        description={picked ? `${people[picked.author].name} saved it ${since(picked.at)}. Restoring keeps version ${current.number} in the history; a copy leaves the file as it is.` : undefined}
        actionsDirection="vertical"
        primaryAction={{ label: `Restore version ${picked?.number ?? ""}`, onClick: restore }}
        secondaryAction={{ label: "Save as new file", onClick: saveCopy }}
        tertiaryAction={{ label: "Cancel" }} />
    </Card>
  );
}
