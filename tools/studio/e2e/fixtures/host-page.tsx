// Zen Studio E2E fixture (tools/studio/e2e/run.mjs). The harness serves this text as a DRAFT of the host example page
// (default src/platform/examples/pages/uploader.tsx; the page id placeholder below is replaced by the host page id) on its own dev server
// only. It is never saved: the disk file and the shared 5173/5180 servers never see it. Every element the rows drive
// carries data-e2e="<id>"; the harness finds its loc in the current text, so edits that move lines never break a row.
// "Seed <n>" changes on every reseed, so the harness can wait until the canvas shows the new text.
// Keep it a valid example page module: { page, examples }.
import { useState } from "react";
import { AlertBanner } from "../../../components/AlertBanner";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { Dialog } from "../../../components/Dialog";
import { EmptyState } from "../../../components/EmptyState";
import { NumberField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Segmented } from "../../../components/Segmented";
import { Heading, Text } from "../../../components/Text";
import type { PlatformPage } from "../../PlatformExamples";
import { people } from "../data";
import { StudioSaveFixture } from "../e2e/StudioSaveFixture";
import type { ExampleDef } from "../types";

export const page: PlatformPage = "__HOST_PAGE__";

const crew = [
  { id: "ava", name: "Ava Tran", role: "Design lead" },
  { id: "bao", name: "Bao Le", role: "Engineer" },
  { id: "chi", name: "Chi Pham", role: "Researcher" },
];
/** A condition that reads no state (I-11: "Set fixed value" is offered for it, never for a state condition). */
const featured = crew.length > 2;

function LayoutFixture() {
  return (
    <Stack data-e2e="stack" gap="md" padding="lg">
      <Heading data-e2e="heading" level={2}>Fixture heading</Heading>
      <Text data-e2e="text">Literal text</Text>
      <Stack data-e2e="row" direction="row" gap="sm">
        <Button data-e2e="btn-a" level="primary">Alpha</Button>
        <Button data-e2e="btn-b" level="secondary">Beta</Button>
        <Button data-e2e="btn-c" level="tertiary">Gamma</Button>
      </Stack>
      <Checkbox data-e2e="check" label="Remember me" />
      <Text data-e2e="seed" tone="light">Seed __SEED__</Text>
    </Stack>
  );
}

function DataFixture() {
  const [size, setSize] = useState<"sm" | "md">("md");
  const [loud, setLoud] = useState(false);
  return (
    <Stack data-e2e="data" gap="md" padding="lg">
      <List data-e2e="crew">
        {crew.map((one) => (
          <ListItem key={one.id} data-e2e="crew-row" title={one.name} caption={one.role} />
        ))}
      </List>
      <List data-e2e="people">
        {[people.ava, people.bao].map((person) => (
          <ListItem key={person.id} data-e2e="people-row" title={person.name} caption={person.role} />
        ))}
      </List>
      <Stack direction="row" gap="sm">
        <Button data-e2e="bound" size={size} onClick={() => setSize(size === "md" ? "sm" : "md")}>Size</Button>
        <Button data-e2e="cond" level={loud ? "primary" : "secondary"} onClick={() => setLoud(!loud)}>Loud</Button>
        <Button data-e2e="cond-const" level={featured ? "primary" : "secondary"}>Featured</Button>
      </Stack>
    </Stack>
  );
}

function SlotFixture() {
  return (
    <Stack gap="md">
      <Card data-e2e="card">
        <Stack data-e2e="card-body" gap="sm">
          <Text data-e2e="card-text">Card content</Text>
        </Stack>
      </Card>
      <Box data-e2e="box" surface="surface" padding="md" radius="md">
        <Text>Boxed</Text>
        <Box data-e2e="float" position="absolute" constraintX="right" constraintY="top" insetRight="sm" insetTop="xs" padding="2xs">
          <Text>Pin</Text>
        </Box>
      </Box>
    </Stack>
  );
}

function OverlayFixture() {
  const [open, setOpen] = useState(false);
  return (
    <Stack data-e2e="overlay" gap="md" padding="lg">
      <Button data-e2e="open" level="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog data-e2e="dialog" open={open} onClose={() => setOpen(false)} title="Fixture dialog" primaryAction={{ label: "Done", onClick: () => setOpen(false) }} />
    </Stack>
  );
}

function GridFixture() {
  return (
    <Stack gap="md" padding="lg">
      <Grid data-e2e="grid" columns={2} minColumnWidth={200} gap="md" padding="xs">
        <Box surface="pale" padding="sm"><Text>One</Text></Box>
        <Box surface="pale" padding="sm"><Text>Two</Text></Box>
        <Box surface="pale" padding="sm"><Text>Three</Text></Box>
      </Grid>
      <Grid data-e2e="grid-responsive" columns={{ mobile: 1, desktop: "2fr 1fr" }} gap="sm" padding="xs">
        <Box surface="pale" padding="sm"><Text>Main</Text></Box>
        <Box surface="pale" padding="sm"><Text>Aside</Text></Box>
      </Grid>
    </Stack>
  );
}

/** Instances customised as in Figma's instance panel (GĐ4): option names, Reset all overrides, nested groups, switches. */
function InstanceFixture() {
  return (
    <Stack data-e2e="instance" gap="md" padding="lg">
      <Button data-e2e="inst-button" level="accent" size="lg" startIcon="icon-plus-line" onClick={() => undefined}>Save</Button>
      <NumberField data-e2e="inst-number" label="Guests" defaultValue={2} />
      <AlertBanner data-e2e="inst-alert">Heads up</AlertBanner>
      <EmptyState data-e2e="inst-empty" title="Nothing here" illustration={false} />
      <Badge data-e2e="inst-badge" leadingIcon leading="icon-heart-line">New</Badge>
      <List data-e2e="inst-list">
        <ListItem data-e2e="inst-row" title="Ava Tran" selected leading={<Avatar alt="Ava Tran" size="sm" />} />
      </List>
    </Stack>
  );
}

/** A list a same-file const holds (`options={views}`): the Inspector edits the const's fields. */
const views = [
  { value: "list", label: "List" },
  { value: "board", label: "Board" },
];

function ConstFixture() {
  const [view, setView] = useState("list");
  return (
    <Stack data-e2e="const" gap="md" padding="lg">
      <Segmented data-e2e="const-views" aria-label="View" options={views} value={view} onValueChange={setView} />
    </Stack>
  );
}

/** An example's own HTML (GĐ3b M2): a flex column, a heading and a paragraph with a link, a flex row, a 3-column grid, a
 *  tinted note. "New page from this frame" turns them into Stack, Heading, Text, Link, Grid and Box by token. */
function HtmlFixture() {
  return (
    <div data-e2e="html" style={{ display: "flex", flexDirection: "column", gap: "var(--zen-spacing-gap-large)", padding: "var(--zen-spacing-padding-xlarge)" }}>
      <h3>Team</h3>
      <p>Three people work on <a href="#docs">the docs</a> today.</p>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--zen-spacing-gap-small)" }}>
        <Button level="primary">Invite</Button>
        <Button level="tertiary">Cancel</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--zen-spacing-gap-medium)" }}>
        <Badge>One</Badge>
        <Badge>Two</Badge>
        <Badge>Three</Badge>
      </div>
      <div style={{ background: "var(--zen-color-background-neutral-subtle-default)", padding: "var(--zen-spacing-padding-large)" }}>
        <Badge>Note</Badge>
      </div>
    </div>
  );
}

export const examples: ExampleDef[] = [
  { title: "E2E layout", description: "Stacks, buttons, text and a checkbox written as literals.", code: "<LayoutFixture />", render: () => <LayoutFixture /> },
  { title: "E2E data", description: "Rows from a .map over a const and over data.ts, a state-bound and a conditional prop.", code: "<DataFixture />", render: () => <DataFixture /> },
  { title: "E2E slot", description: "A Card whose content slot holds a Stack.", code: "<SlotFixture />", render: () => <SlotFixture /> },
  { title: "E2E overlay", description: "A button that opens a Dialog.", code: "<OverlayFixture />", render: () => <OverlayFixture /> },
  { title: "E2E save", description: "A component from another file, the one file the harness saves.", code: "<StudioSaveFixture />", render: () => <StudioSaveFixture /> },
  { title: "E2E grid", description: "A counted Grid (with a minColumnWidth it ignores) and a Grid per breakpoint.", code: "<GridFixture />", render: () => <GridFixture /> },
  { title: "E2E instance", description: "Zen instances with design props, a field's label, an alert's icon and an empty state.", code: "<InstanceFixture />", render: () => <InstanceFixture /> },
  { title: "E2E html", description: "An example's own HTML: flex and grid boxes, a heading, a paragraph with a link, a tinted note.", code: "<HtmlFixture />", render: () => <HtmlFixture /> },
  { title: "E2E const", description: "A Segmented whose options a same-file const holds.", code: "<ConstFixture />", render: () => <ConstFixture /> },
];
