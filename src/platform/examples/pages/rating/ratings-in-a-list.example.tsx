import { useState } from "react";
import { Avatar, Chip, Heading, List, ListBox, ListItem, RatingDisplay, Stack, Text, plural } from "@zen-ds/react";
import { initials, type Person } from "../../data";

type Freelancer = { id: string; name: string; theme: Person["theme"]; rate: number; average: number; reviews: number };
const freelancers: Freelancer[] = [
  { id: "nam", name: "Nam Trinh", theme: "blue", rate: 45, average: 4.9, reviews: 38 },
  { id: "thu", name: "Thu Dang", theme: "pink", rate: 40, average: 4.6, reviews: 112 },
  { id: "kai", name: "Kai Yamada", theme: "violet", rate: 60, average: 4.2, reviews: 9 },
  { id: "vy", name: "Vy Lam", theme: "crimson", rate: 35, average: 0, reviews: 0 },
];
const sorts = {
  rating: { label: "Highest rated", compare: (a: Freelancer, b: Freelancer) => b.average - a.average },
  reviews: { label: "Most reviews", compare: (a: Freelancer, b: Freelancer) => b.reviews - a.reviews },
  price: { label: "Lowest rate", compare: (a: Freelancer, b: Freelancer) => a.rate - b.rate },
};
type SortId = keyof typeof sorts;

export default function FreelancerList() {
  const [sortId, setSortId] = useState<SortId>("rating");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const rows = [...freelancers].sort(sorts[sortId].compare);
  const toggle = (id: string) => setShortlist((list) => list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  return (
    <Stack><Stack gap="md" width="fill" maxWidth={440} alignSelf="center">
      <Stack direction="row" justify="between" align="center" gap="sm">
        <Heading level={4} textStyle="Heading/4">Freelance illustrators</Heading>
        <Chip variant="advanced" popoverLabel="Sort by"
          popoverItems={(Object.keys(sorts) as SortId[]).map((id) => ({ id, label: sorts[id].label, selected: id === sortId }))}
          onPopoverSelect={(item) => setSortId(item.id as SortId)}>
          {sorts[sortId].label}
        </Chip>
      </Stack>
      {/* A box made only of List-Items is a ListBox. Its Body-Slot padding keeps the row fill (12px past the row sideways)
          inside the edge. */}
      <ListBox>
        <List aria-label="Freelance illustrators">
          {rows.map((person) => (
            <ListItem key={person.id} selected={shortlist.includes(person.id)} onClick={() => toggle(person.id)}
              // A person without a photo: solid initials on their steady theme.
              leading={<Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>} title={person.name}
              caption={person.reviews ? (
                // XSmall stars, then the average and the review count on the same line (wrapping on a narrow row).
                <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: "var(--zen-spacing-gap-2-xsmall, 4px)" }}>
                  <RatingDisplay value={person.average} size="xs" />
                  {`${person.average.toFixed(1)} · ${plural(person.reviews, "review")}`}
                </span>
              ) : "No reviews yet"}
              trailing={<Text as="span" textStyle="Body/Small/Regular" tone="base">{`$${person.rate}/h`}</Text>} />
          ))}
        </List>
      </ListBox>
      <Text role="status" textStyle="Body/Small/Regular" tone="base">{shortlist.length ? `${plural(shortlist.length, "person", "people")} on your shortlist` : ""}</Text>
    </Stack></Stack>
  );
}
