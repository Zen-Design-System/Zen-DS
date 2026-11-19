import { useState } from "react";
import { Box, Button, Card, Heading, SelectField, Stack, Text, useToast } from "@zen-ds/react";
import { people, projectById } from "../../data";

/** Where the Book Fair site can be published: the client's event domains run long. */
const bookfairDomains = [
  { value: "bookfair-2026.dizai.studio", label: "bookfair-2026.dizai.studio", caption: "Studio preview" },
  { value: "hanoibookfair.vn", label: "hanoibookfair.vn", caption: "Main site" },
  { value: "www.hanoi-international-book-fair-2026.org.vn", label: "www.hanoi-international-book-fair-2026.org.vn", caption: "Event site" },
  { value: "exhibitors.hanoi-international-book-fair-2026.org.vn", label: "exhibitors.hanoi-international-book-fair-2026.org.vn", caption: "Exhibitor portal" },
  { value: "tickets.hanoi-international-book-fair-2026.org.vn", label: "tickets.hanoi-international-book-fair-2026.org.vn", caption: "Ticket sales" },
];

/** Long domains in a Select: its option list hugs the longest one instead of cutting each with "…". */
export default function PublishDomain() {
  const project = projectById("bookfair-site");
  const [domain, setDomain] = useState("hanoibookfair.vn");
  const { toast } = useToast();
  return (
    <Card theme="default" width="fill">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">{project.name}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${project.client} · led by ${people[project.lead].name}`}</Text>
        </Stack>
        {/* On a narrow card Publish wraps under the field, which keeps 200px for the domain. */}
        <Stack direction="row" align="end" gap="xs" wrap>
          {/* popoverWidth="hug": the list grows past the field to the longest domain, so none ends in "…". */}
          <Box width="fill" minWidth={200}>
            <SelectField label="Publish to" options={bookfairDomains} value={domain} onValueChange={setDomain} popoverWidth="hug" />
          </Box>
          <Button onClick={() => toast({ title: `Publishing to ${domain}` })}>Publish</Button>
        </Stack>
      </Stack>
    </Card>
  );
}
