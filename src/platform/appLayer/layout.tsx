import { useState } from "react";
import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Dialog } from "../../components/Dialog";
import { Icon } from "../../components/Icon";
import { InputField, SelectField, TextAreaField } from "../../components/Input";
import { Box, Container, Grid, Stack, type BoxSurface } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { Heading, Text, plural } from "../../components/Text";
import { useToast } from "../../components/Toast";
import { TopNavigation } from "../../components/TopNavigation";
import { PlatformPhone } from "../PlatformPhone";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./layout.css";

type Kind = "stack" | "grid" | "box" | "container";
const gaps = ["2xs", "xs", "sm", "md", "lg", "xl"] as const;

function Tile({ label }: { label: string }) {
  return <Box surface="pale" radius="md" padding="sm"><Text textStyle="Body/Small/Medium" as="span">{label}</Text></Box>;
}

function LayoutPlayground() {
  const [kind, setKind] = useState<Kind>("stack");
  const [direction, setDirection] = useState<"column" | "row">("row");
  const [gap, setGap] = useState<(typeof gaps)[number]>("md");
  const [justify, setJustify] = useState<"start" | "between">("start");
  const [wrap, setWrap] = useState(true);
  const [columns, setColumns] = useState<"auto" | "2" | "3">("auto");
  const [surface, setSurface] = useState<BoxSurface>("surface");
  const [bordered, setBordered] = useState(true);
  const items = ["Overview", "Members", "Billing", "Security", "Integrations", "Audit log"];
  const preview = kind === "stack" ? (
    <Stack direction={direction} gap={gap} justify={justify} wrap={wrap} className="pal-stage">{items.slice(0, 4).map((item) => <Tile key={item} label={item} />)}</Stack>
  ) : kind === "grid" ? (
    <Grid columns={columns === "auto" ? undefined : Number(columns)} minColumnWidth={160} gap={gap} className="pal-stage">{items.map((item) => <Tile key={item} label={item} />)}</Grid>
  ) : kind === "box" ? (
    <Box surface={surface} border={bordered ? "pale" : "none"} radius="xl" padding="lg" className="pal-stage"><Stack gap="2xs"><Text textStyle="Body/Base/Bold">Storage</Text><Text tone="base">42 GB of 100 GB used</Text></Stack></Box>
  ) : (
    <div className="pal-container-frame"><Container maxWidth="sm"><Box surface="surface" border="pale" radius="lg" padding="md"><Text tone="base">Content column: 640px + the page margin on each side.</Text></Box></Container></div>
  );
  const code = kind === "stack"
    ? `<Stack direction="${direction}" gap="${gap}"${justify === "between" ? ` justify="between"` : ""}${wrap && direction === "row" ? " wrap" : ""}>\n  …\n</Stack>`
    : kind === "grid"
      ? `<Grid${columns === "auto" ? ` minColumnWidth={160}` : ` columns={${columns}}`} gap="${gap}">\n  …\n</Grid>`
      : kind === "box"
        ? `<Box surface="${surface}"${bordered ? ` border="pale"` : ""} radius="xl" padding="lg">\n  …\n</Box>`
        : `<Container maxWidth="sm">\n  …page content…\n</Container>`;
  return (
    <Panel
      title="Layout"
      previewClassName="pal-preview"
      controls={<>
        <PlaygroundFilterChip label="Component" value={kind} onChange={(value) => setKind((String(value) || "stack") as Kind)} options={[option("stack", "Stack"), option("grid", "Grid"), option("box", "Box"), option("container", "Container")]} />
        {kind === "stack" ? <PlaygroundFilterChip label="Direction" value={direction} onChange={(value) => setDirection((String(value) || "row") as "column" | "row")} options={[option("row"), option("column")]} /> : null}
        {kind === "stack" || kind === "grid" ? <PlaygroundFilterChip label="Gap" value={gap} onChange={(value) => setGap((String(value) || "md") as (typeof gaps)[number])} options={gaps.map((id) => option(id))} /> : null}
        {kind === "stack" ? <PlaygroundFilterChip label="Justify" value={justify} onChange={(value) => setJustify((String(value) || "start") as "start" | "between")} options={[option("start"), option("between")]} /> : null}
        {kind === "stack" && direction === "row" ? <PlaygroundToggle label="Wrap" selected={wrap} onChange={setWrap} /> : null}
        {kind === "grid" ? <PlaygroundFilterChip label="Columns" value={columns} onChange={(value) => setColumns((String(value) || "auto") as "auto" | "2" | "3")} options={[option("auto", "auto-fill"), option("2"), option("3")]} /> : null}
        {kind === "box" ? <PlaygroundFilterChip label="Surface" value={surface} onChange={(value) => setSurface((String(value) || "surface") as BoxSurface)} options={["surface", "surface-alt", "subtle", "pale"].map((id) => option(id))} /> : null}
        {kind === "box" ? <PlaygroundToggle label="Border" selected={bordered} onChange={setBordered} /> : null}
      </>}
      code={`import { ${kind === "stack" ? "Stack" : kind === "grid" ? "Grid" : kind === "box" ? "Box" : "Container"} } from "@zen/design-system";\n\n${code}`}
    >
      {preview}
    </Panel>
  );
}

/* ───────────── Examples ───────────── */

function PageHeaderRowExample() {
  const { toast } = useToast();
  const [invites, setInvites] = useState(0);
  return (
    <Stack gap="lg">
      <Stack direction="row" justify="between" align="center" wrap gap="sm">
        <Stack gap="xs">
          <Heading level={3} textStyle="Heading/3">Team members</Heading>
          <Text tone="base">{plural(12 + invites, "member")} · Design workspace</Text>
        </Stack>
        <Stack direction="row" wrap gap="sm">
          <Button level="tertiary" startIcon={<Icon name="icon-download-01-line" decorative />} onClick={() => toast({ type: "positive", title: `Exported ${plural(12 + invites, "member")} as CSV` })}>Export</Button>
          <Button level="primary" startIcon={<Icon name="icon-plus-line" decorative />} onClick={() => setInvites((count) => count + 1)}>Invite member</Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

function SettingsSectionsExample() {
  const [name, setName] = useState("Zen Studio");
  const [url, setUrl] = useState("zen-studio");
  // Delete asks first (a Negative dialog); a deleted workspace can be restored from the same place.
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);
  return (
    <Stack gap="lg">
      <Box surface="surface" border="pale" radius="xl" padding="lg">
        <Stack gap="md">
          <Stack gap="3xs"><Heading level={3} textStyle="Heading/Subheading">Workspace</Heading><Text textStyle="Body/Small/Regular" tone="base">Shown to everyone you invite.</Text></Stack>
          <InputField label="Workspace name" value={name} onChange={(event) => setName(event.target.value)} />
          <InputField label="URL" value={url} onChange={(event) => setUrl(event.target.value)} helpText={`zen.app/${url || "…"}`} />
        </Stack>
      </Box>
      <Box surface="surface" border="pale" radius="xl" padding="lg">
        <Stack direction="row" justify="between" align="center" wrap gap="sm">
          <Stack gap="3xs"><Heading level={3} textStyle="Heading/Subheading">Delete workspace</Heading><Text textStyle="Body/Small/Regular" tone="base">{deleted ? `“${name}” is deleted. You can restore it for 30 days.` : "Removes all projects for every member."}</Text></Stack>
          {deleted
            ? <Button level="tertiary" onClick={() => setDeleted(false)}>Restore workspace</Button>
            : <Button level="danger-subtle" onClick={() => setConfirming(true)}>Delete workspace</Button>}
        </Stack>
      </Box>
      <Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title={`Delete “${name}”?`} description="Every project goes for every member. You can restore it for 30 days."
        primaryAction={{ label: "Delete workspace", level: "danger", onClick: () => { setDeleted(true); setConfirming(false); } }} secondaryAction={{ label: "Cancel" }} />
    </Stack>
  );
}

const teams = [
  { id: "design", name: "Design", members: 12, lead: "Ava Chen", theme: "blue" as const },
  { id: "eng", name: "Engineering", members: 28, lead: "Bao Nguyen", theme: "green" as const },
  { id: "growth", name: "Growth", members: 7, lead: "Chi Tran", theme: "purple" as const },
  { id: "support", name: "Support", members: 1, lead: "Duy Le", theme: "orange" as const },
  { id: "ops", name: "Operations", members: 5, lead: "Em Pham", theme: "teal" as const },
];

function CardGridExample() {
  const [selected, setSelected] = useState("design");
  return (
    <Grid minColumnWidth={180} gap="sm" as="ul" aria-label="Teams">
      {teams.map((team) => (
        <li key={team.id}>
          <Card theme="border" active={selected === team.id} onClick={() => setSelected(team.id)} aria-label={`${team.name} team`}>
            <Stack gap="sm">
              <Avatar size="small" theme={team.theme} background="subtle" alt="">{team.name.slice(0, 1)}</Avatar>
              <Stack gap="3xs"><Text textStyle="Body/Base/Bold">{team.name}</Text><Text textStyle="Body/Small/Regular" tone="base">{plural(team.members, "member")} · {team.lead}</Text></Stack>
            </Stack>
          </Card>
        </li>
      ))}
    </Grid>
  );
}

function TwoColumnFormExample() {
  const { toast } = useToast();
  const [first, setFirst] = useState("Ava");
  const [last, setLast] = useState("Chen");
  const [role, setRole] = useState("designer");
  const [bio, setBio] = useState("");
  return (
    <Stack gap="lg">
      <Grid columns={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
        <InputField label="First name" value={first} onChange={(event) => setFirst(event.target.value)} />
        <InputField label="Last name" value={last} onChange={(event) => setLast(event.target.value)} />
        <SelectField label="Role" value={role} onChange={(event) => setRole(event.target.value)} options={[{ label: "Designer", value: "designer" }, { label: "Engineer", value: "engineer" }, { label: "Manager", value: "manager" }]} />
        <InputField label="Location" placeholder="e.g. Ho Chi Minh City" />
      </Grid>
      <TextAreaField label="Bio" labelOptional value={bio} onChange={(event) => setBio(event.target.value)} placeholder="A sentence about your work" />
      <Stack direction="row" justify="end" gap="sm"><Button level="tertiary" onClick={() => { setFirst("Ava"); setLast("Chen"); setBio(""); }}>Reset</Button><Button level="primary" onClick={() => toast({ type: "positive", title: "Profile saved" })}>Save profile</Button></Stack>
    </Stack>
  );
}

const tasks = [
  { id: "brief", title: "Write the Q4 brief", caption: "Due today", status: "Urgent" },
  { id: "review", title: "Review icon set", caption: "Due tomorrow", status: "In review" },
  { id: "tokens", title: "Sync design tokens", caption: "Due Friday", status: "Planned" },
];

function MobileScreenExample() {
  const [open, setOpen] = useState("brief");
  // New task opens a sheet; the task lands on top of the week, opened.
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [created, setCreated] = useState<typeof tasks>([]);
  const week = [...created, ...tasks];
  const create = () => { const id = `new-${created.length + 1}`; setCreated((list) => [{ id, title: title.trim(), caption: "Due Friday", status: "Planned" }, ...list]); setOpen(id); setTitle(""); setCreating(false); };
  return (
    <PlatformPhone header={<TopNavigation type="default" title="Tasks" trailing={[{ icon: "icon-plus-line", label: "New task", onClick: () => setCreating(true) }]} />}>
      <Stack gap="md" padding="md">
        <Stack direction="row" justify="between" align="center"><Text textStyle="Body/Base/Bold" as="span">This week</Text><Badge size="small" theme="neutral">{plural(week.length, "task")}</Badge></Stack>
        <Box surface="surface" radius="xl" padding="2xs">
          <List aria-label="Tasks this week">
            {week.map((task) => <ListItem key={task.id} title={task.title} caption={task.caption} trailing={<Badge size="small" theme={task.status === "Urgent" ? "red" : "neutral"} background="subtle">{task.status}</Badge>} selected={open === task.id} onClick={() => setOpen(task.id)} />)}
          </List>
        </Box>
      </Stack>
      <BottomSheet inline open={creating} onOpenChange={setCreating} title="New task" primaryAction={{ label: "Create task", disabled: !title.trim(), onClick: create }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Title" placeholder="What needs doing?" value={title} onValueChange={setTitle} data-autofocus="" />
      </BottomSheet>
    </PlatformPhone>
  );
}

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = {
  layout: {
    label: "Layout",
    eyebrow: "Components / Layout",
    title: "Layout",
    description: "Stack, Grid, Box and Container: page structure with the Figma spacing, padding and radius scales instead of hand-written flex CSS.",
    playground: LayoutPlayground,
  },
};

export const examples: ExampleMap = {
  layout: [
    { title: "Title and actions row", description: "A row Stack with justify=\"between\": the heading block on the left, a Tertiary + Primary pair on the right; it wraps on narrow widths.", render: () => <PageHeaderRowExample />, code: `<Stack direction="row" justify="between" align="center" wrap gap="sm">
  <Stack gap="3xs">
    <Heading level={1}>Team members</Heading>
    <Text tone="base">{plural(count, "member")} · Design workspace</Text>
  </Stack>
  <Stack direction="row" wrap gap="sm">
    <Button level="tertiary" startIcon={<Icon name="icon-download-01-line" decorative />} onClick={exportCsv}>Export</Button>
    <Button level="primary" startIcon={<Icon name="icon-plus-line" decorative />} onClick={invite}>Invite member</Button>
  </Stack>
</Stack>` },
    { title: "Settings sections", description: "Sections are Surface boxes with a Pale border and xl radius; fields inside stack with gap md, sections with gap lg.", render: () => <SettingsSectionsExample />, code: `<Stack gap="lg">
  <Box surface="surface" border="pale" radius="xl" padding="lg">
    <Stack gap="md">
      <Heading level={2} textStyle="Heading/Subheading">Workspace</Heading>
      <InputField label="Workspace name" value={name} onChange={(e) => setName(e.target.value)} />
      <InputField label="URL" value={url} onChange={(e) => setUrl(e.target.value)} helpText={\`zen.app/\${url}\`} />
    </Stack>
  </Box>
  <Box surface="surface" border="pale" radius="xl" padding="lg">
    <Heading level={3} textStyle="Heading/Subheading">Delete workspace</Heading>
    <Button level="danger-subtle" onClick={() => setConfirming(true)}>Delete workspace</Button>
  </Box>
</Stack>
<Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title={\`Delete “\${name}”?\`}
  primaryAction={{ label: "Delete workspace", level: "danger", onClick: remove }} secondaryAction={{ label: "Cancel" }} />` },
    { title: "Responsive card grid", description: "Grid minColumnWidth fits as many 180px columns as the width allows, so the same code reflows from phone to desktop.", render: () => <CardGridExample />, code: `<Grid minColumnWidth={180} gap="sm" as="ul" aria-label="Teams">
  {teams.map((team) => (
    <li key={team.id}>
      <Card theme="border" active={selected === team.id} onClick={() => setSelected(team.id)} aria-label={\`\${team.name} team\`}>…</Card>
    </li>
  ))}
</Grid>` },
    { title: "Two-column form", description: "columns per breakpoint: one column on phones, two from tablet up (follows ZenProvider's breakpoint).", render: () => <TwoColumnFormExample />, code: `<Grid columns={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
  <InputField label="First name" … />
  <InputField label="Last name" … />
  <SelectField label="Role" … />
  <InputField label="Location" placeholder="e.g. Ho Chi Minh City" />
</Grid>
<Button level="primary" onClick={save}>Save profile</Button>` },
    { title: "Mobile screen", description: "A phone screen built from Stack (padding md) and a Surface Box holding a List; no custom CSS.", wide: true, render: () => <MobileScreenExample />, code: `<TopNavigation title="Tasks" trailing={[{ icon: "icon-plus-line", label: "New task", onClick: () => setCreating(true) }]} />
<Stack gap="md" padding="md">
  <Stack direction="row" justify="between" align="center">
    <Text textStyle="Body/Base/Bold" as="span">This week</Text>
    <Badge size="small" theme="neutral">{plural(tasks.length, "task")}</Badge>
  </Stack>
  <Box surface="surface" radius="xl" padding="2xs">
    <List aria-label="Tasks this week">…</List>
  </Box>
</Stack>` },
  ],
};
