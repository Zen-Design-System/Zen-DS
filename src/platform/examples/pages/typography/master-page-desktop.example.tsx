import { useState } from "react";
import { Button, Card, Grid, Heading, List, ListItem, PageHeader, Stack, Text, plural, useToast } from "@zen-ds/react";

/** Master page (a sidebar destination): h1 Heading/1 → h2 Heading/4 sections → h3 Heading/Subheading cards. */
export default function MasterPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState(3);
  return (
    // In the app, the tab title follows the h1, then the app name: <title>Workbench · Acme</title> (React 19 puts it in
    // the document head).
    <Stack gap="xl" padding="xl" radius="lg" surface="canvas" width="fill" align="stretch">
      <PageHeader title="Workbench" description="Requests and balances for the Design team."
        actions={<>
          <Button level="tertiary" size="sm" onClick={() => toast({ type: "positive", title: `Exported ${plural(requests, "request")} as CSV` })}>Export</Button>
          <Button level="primary" size="sm" onClick={() => setRequests((count) => count + 1)}>New request</Button>
        </>} />
      <Stack as="section" gap="sm" align="stretch">
        <Heading level={2} textStyle="Heading/4">Time off</Heading>
        <Grid columns="repeat(auto-fit, minmax(180px, 1fr))" gap="md">
          {[["Annual leave", "12", "days remaining"], ["Sick leave", "4", "days remaining"]].map(([title, value, meta]) => (
            <Card key={title} theme="default">
              <Stack gap="2xs">
                <Heading level={3} textStyle="Heading/Subheading">{title}</Heading>
                {/* A value is big, but it is not a heading: Display/4 in a span. */}
                <Text as="span" textStyle="Display/4">{value}</Text>
                <Text as="span" textStyle="Body/Small/Regular" tone="base">{meta}</Text>
              </Stack>
            </Card>
          ))}
        </Grid>
      </Stack>
      <Stack as="section" gap="sm" align="stretch">
        <Heading level={2} textStyle="Heading/4">Recent requests</Heading>
        {/* Rows have no side padding of their own: the page pads them (24px), so they line up with the headings. */}
        <List aria-label="Recent requests">
          {Array.from({ length: Math.min(requests, 4) }, (_, index) => (
            <ListItem key={index} title={index === 0 ? "Annual leave · 3 days" : index === 1 ? "Sick leave · 1 day" : `Remote day · Oct ${index}`} caption={index === 0 ? "Ava Chen · Approved" : "Bao Nguyen · Pending"} />
          ))}
        </List>
      </Stack>
    </Stack>
  );
}
