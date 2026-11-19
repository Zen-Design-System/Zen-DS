import { useState } from "react";
import { Avatar, Card, Chip, Heading, List, ListItem, Stack, Text, plural } from "@zen-ds/react";
import { initials, people, type Person, type PersonId } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };

const points = [1, 2, 3, 5, 8, 13];
const votes: { person: PersonId; points: number }[] = [{ person: "bao", points: 5 }, { person: "em", points: 3 }, { person: "chi", points: 5 }];

/** Planning poker for one task: Number-only chips are the scale you vote on, then show the team's votes. */
export default function EstimateInPoints() {
  const [vote, setVote] = useState<number | null>(null);
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Estimate PHIN-223</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Regression test for the Android build</Text>
        </Stack>
        <Stack gap="xs">
          <Text as="span" textStyle="Body/Small/Bold" tone="base">Your vote</Text>
          {/* Pressable numbers: onClick + selected. */}
          <Stack direction="row" gap="xs" wrap role="group" aria-label="Story points">
            {points.map((value) => (
              <Chip key={value} variant="number-only" value={value} selected={value === vote} aria-label={plural(value, "point")} onClick={() => setVote(value)} />
            ))}
          </Stack>
        </Stack>
        <List aria-label="Team votes in points">
          {votes.map((item) => (
            <ListItem key={item.person} title={people[item.person].name} caption={people[item.person].role}
              leading={<Avatar size="md" {...avatarOf(people[item.person])} />}
              trailing={vote === null
                ? <Text as="span" textStyle="Body/Small/Regular" tone="base">Voted</Text>
                // A vote shown back is a count, not a control: no handler, so the chip renders static.
                : <Chip variant="number-only" value={item.points} />} />
          ))}
        </List>
      </Stack>
    </Card></Stack>
  );
}
