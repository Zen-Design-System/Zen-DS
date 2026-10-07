import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Avatar } from "../../components/Avatar";
import { Badge, BadgeCounter } from "../../components/Badge";
import { BottomSheet } from "../../components/BottomSheet";
import { Button, IconButton } from "../../components/Button";
import { Chip } from "../../components/Chip";
import { DescriptionList } from "../../components/DescriptionList";
import { Dialog } from "../../components/Dialog";
import { Divider } from "../../components/Divider";
import { DockIcon } from "../../components/DockIcon";
import { EmptyState } from "../../components/EmptyState";
import type { IconName } from "../../components/Icon";
import { Image } from "../../components/Image";
import { InputField, SelectField, TextAreaField } from "../../components/Input";
import { Box, Container, Grid, Stack, type BoxSurface } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { MetricCard } from "../../components/MetricWidget";
import { PageHeader } from "../../components/PageHeader";
import { ProgressBar } from "../../components/Progress";
import { ZenProvider, useZen } from "../../components/Provider";
import { Search } from "../../components/Search";
import { Tag } from "../../components/Tag";
import { Heading, Text, plural } from "../../components/Text";
import { useToast, type ToastOptions } from "../../components/Toast";
import { Toggle } from "../../components/Toggle";
import { TopNavigation } from "../../components/TopNavigation";
import { DemoFieldDialog } from "../PlatformDemoActions";
import { platformMedia } from "../PlatformMedia";
import { avatarOf, mobilePeople } from "../PlatformMobileData";
import { PlatformPhone } from "../PlatformPhone";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./layout.css";

/* ───────────── Playground ───────────── */

type Kind = "stack" | "grid" | "box" | "container";
const gaps = ["2xs", "xs", "sm", "md", "lg", "xl"] as const;
const aligns = ["start", "center", "end", "stretch"] as const;
const justifies = ["start", "center", "end", "between"] as const;
const trackLists = ["auto", "2", "3", "2fr 1fr", "minmax(0, 240px) 1fr"] as const;
const minWidths = ["120", "160", "200"] as const;
const paddings = ["sm", "md", "lg", "xl"] as const;
const radii = ["md", "lg", "xl", "2xl"] as const;
const surfaces: BoxSurface[] = ["surface", "surface-alt", "subtle", "pale"];
const widths = ["sm", "md", "lg"] as const;

const stackItems = [{ title: "Brief" }, { title: "Moodboard", caption: "12 files" }, { title: "Wireframes" }, { title: "Prototype", caption: "v3 · shared" }];
const gridItems = ["Overview", "Members", "Billing", "Security", "Integrations", "Audit log"];

function Tile({ title, caption }: { title: string; caption?: string }) {
  return (
    <Box surface="surface" border="pale" radius="lg" padding="sm">
      <Stack gap="2xs">
        <Text textStyle="Body/Small/Medium" as="span">{title}</Text>
        {caption ? <Text textStyle="Caption/Regular" tone="light" as="span">{caption}</Text> : null}
      </Stack>
    </Box>
  );
}

const trackCode = (value: number | string) => (typeof value === "number" ? String(value) : `"${value}"`);

function LayoutPlayground() {
  const [kind, setKind] = useState<Kind>("stack");
  const [direction, setDirection] = useState<"row" | "column">("row");
  const [gap, setGap] = useState<(typeof gaps)[number]>("md");
  const [align, setAlign] = useState<(typeof aligns)[number]>("center");
  const [justify, setJustify] = useState<(typeof justifies)[number]>("start");
  const [wrap, setWrap] = useState(true);
  const [tracks, setTracks] = useState<(typeof trackLists)[number]>("auto");
  const [minWidth, setMinWidth] = useState<(typeof minWidths)[number]>("160");
  const [phoneColumn, setPhoneColumn] = useState(true);
  const [surface, setSurface] = useState<BoxSurface>("surface");
  const [bordered, setBordered] = useState(true);
  const [padding, setPadding] = useState<(typeof paddings)[number]>("lg");
  const [radius, setRadius] = useState<(typeof radii)[number]>("xl");
  const [width, setWidth] = useState<(typeof widths)[number]>("sm");
  const [gutter, setGutter] = useState(true);

  const row = direction === "row";
  const fixed = tracks === "auto" ? undefined : /^\d+$/.test(tracks) ? Number(tracks) : tracks;
  const columns = fixed === undefined ? undefined : phoneColumn ? { mobile: 1, desktop: fixed } : fixed;
  const columnsCode = fixed === undefined ? `minColumnWidth={${minWidth}}` : phoneColumn ? `columns={{ mobile: 1, desktop: ${trackCode(fixed)} }}` : typeof fixed === "number" ? `columns={${fixed}}` : `columns="${fixed}"`;

  const preview = kind === "stack" ? (
    <Stack direction={direction} gap={gap} align={align} justify={row ? justify : undefined} wrap={row && wrap} className="pal-stage">
      {stackItems.map((item) => <Tile key={item.title} title={item.title} caption={item.caption} />)}
    </Stack>
  ) : kind === "grid" ? (
    <Grid columns={columns} minColumnWidth={Number(minWidth)} gap={gap} className="pal-stage">
      {gridItems.map((item) => <Tile key={item} title={item} />)}
    </Grid>
  ) : kind === "box" ? (
    <Box surface={surface} border={bordered ? "pale" : "none"} radius={radius} padding={padding} className="pal-box">
      <Stack gap="sm">
        <Stack direction="row" justify="between" align="baseline" gap="sm" wrap>
          <Text textStyle="Body/Base/Bold" as="span">Storage</Text>
          <Text textStyle="Body/Small/Regular" tone="base" as="span">68 GB of 100 GB</Text>
        </Stack>
        <ProgressBar value={68} theme="status" scale="quota" aria-label="Storage used" />
        <Text textStyle="Body/Small/Regular" tone="base">Files, recordings and backups for Zen Studio.</Text>
      </Stack>
    </Box>
  ) : (
    <div className="pal-container-frame">
      <Container maxWidth={width} gutter={gutter}>
        <Box surface="surface" border="pale" radius="lg" padding="lg">
          <Stack gap="2xs">
            <Text textStyle="Body/Base/Bold">Release notes</Text>
            <Text tone="base">Zen 0.4 adds track lists to Grid, so a main column can sit next to a narrower aside, and three Container widths for forms, settings and dashboards.</Text>
          </Stack>
        </Box>
      </Container>
    </div>
  );

  const code = kind === "stack"
    ? `<Stack direction="${direction}" gap="${gap}" align="${align}"${row ? ` justify="${justify}"` : ""}${row && wrap ? " wrap" : ""}>\n  <Box surface="surface" border="pale" radius="lg" padding="sm">Brief</Box>\n  …\n</Stack>`
    : kind === "grid"
      ? `<Grid ${columnsCode} gap="${gap}">\n  <Box surface="surface" border="pale" radius="lg" padding="sm">Overview</Box>\n  …\n</Grid>`
      : kind === "box"
        ? `<Box surface="${surface}"${bordered ? ` border="pale"` : ""} radius="${radius}" padding="${padding}">\n  <Text textStyle="Body/Base/Bold" as="span">Storage</Text>\n  <ProgressBar value={68} theme="status" scale="quota" aria-label="Storage used" />\n</Box>`
        : `<Container maxWidth="${width}"${gutter ? "" : " gutter={false}"}>\n  …page content…\n</Container>`;

  return (
    <Panel
      title="Layout"
      previewClassName="pal-preview"
      controls={<>
        <PlaygroundFilterChip label="Component" value={kind} onChange={(value) => setKind((String(value) || "stack") as Kind)} options={[option("stack", "Stack"), option("grid", "Grid"), option("box", "Box"), option("container", "Container")]} />
        {kind === "stack" ? <PlaygroundFilterChip label="Direction" value={direction} onChange={(value) => setDirection((String(value) || "row") as "row" | "column")} options={[option("row"), option("column")]} /> : null}
        {kind === "stack" || kind === "grid" ? <PlaygroundFilterChip label="Gap" value={gap} onChange={(value) => setGap((String(value) || "md") as (typeof gaps)[number])} options={gaps.map((id) => option(id))} /> : null}
        {kind === "stack" ? <PlaygroundFilterChip label="Align" value={align} onChange={(value) => setAlign((String(value) || "center") as (typeof aligns)[number])} options={aligns.map((id) => option(id))} /> : null}
        {kind === "stack" && row ? <PlaygroundFilterChip label="Justify" value={justify} onChange={(value) => setJustify((String(value) || "start") as (typeof justifies)[number])} options={justifies.map((id) => option(id))} /> : null}
        {kind === "stack" && row ? <PlaygroundToggle label="Wrap" selected={wrap} onChange={setWrap} /> : null}
        {kind === "grid" ? <PlaygroundFilterChip label="Columns" value={tracks} onChange={(value) => setTracks((String(value) || "auto") as (typeof trackLists)[number])} options={trackLists.map((id) => option(id, id === "auto" ? "auto-fill" : id === "minmax(0, 240px) 1fr" ? "240px + 1fr" : id))} /> : null}
        {kind === "grid" && tracks === "auto" ? <PlaygroundFilterChip label="Min column" value={minWidth} onChange={(value) => setMinWidth((String(value) || "160") as (typeof minWidths)[number])} options={minWidths.map((id) => option(id, `${id}px`))} /> : null}
        {kind === "grid" && tracks !== "auto" ? <PlaygroundToggle label="One column on phones" selected={phoneColumn} onChange={setPhoneColumn} /> : null}
        {kind === "box" ? <PlaygroundFilterChip label="Surface" value={surface} onChange={(value) => setSurface((String(value) || "surface") as BoxSurface)} options={surfaces.map((id) => option(id))} /> : null}
        {kind === "box" ? <PlaygroundFilterChip label="Padding" value={padding} onChange={(value) => setPadding((String(value) || "lg") as (typeof paddings)[number])} options={paddings.map((id) => option(id))} /> : null}
        {kind === "box" ? <PlaygroundFilterChip label="Radius" value={radius} onChange={(value) => setRadius((String(value) || "xl") as (typeof radii)[number])} options={radii.map((id) => option(id))} /> : null}
        {kind === "box" ? <PlaygroundToggle label="Pale border" selected={bordered} onChange={setBordered} /> : null}
        {kind === "container" ? <PlaygroundFilterChip label="Max width" value={width} onChange={(value) => setWidth((String(value) || "sm") as (typeof widths)[number])} options={[option("sm", "sm · 640"), option("md", "md · 960"), option("lg", "lg · 1280")]} /> : null}
        {kind === "container" ? <PlaygroundToggle label="Page margin" selected={gutter} onChange={setGutter} /> : null}
      </>}
      code={`import { ${kind === "stack" ? "Box, Stack" : kind === "grid" ? "Box, Grid" : kind === "box" ? "Box, ProgressBar, Text" : "Container"} } from "@zen/design-system";\n\n${code}`}
    >
      {preview}
    </Panel>
  );
}

/* ───────────── Examples ───────────── */

/** Example cards pin their ZenProvider to breakpoint="desktop". These page layouts follow the window, as under an app's
 *  root ZenProvider (breakpoint "auto"), so their columns really change at tablet and phone widths. */
function FollowWindow({ children }: { children: ReactNode }) {
  return <ZenProvider className="pal-page" breakpoint="auto" paint={false} portal={false}>{children}</ZenProvider>;
}

/* ───────────── 1 · Main column and aside (dashboard) ───────────── */

/** A List of interactive rows in a bordered Surface box (docs/guidelines/list-item.md): the rows keep their own
 *  Padding/Small × Padding/XLarge, the box pads sm above and below, so the hover and selected fill (12 inside the row
 *  edge, Corner-Radius/Base) sits 12 from every edge, concentric with the box's 2xl radius. pe-list-card opts the list
 *  out of the stage's own bare-list card. */
function ListBox({ children }: { children: ReactNode }) {
  return <Box surface="surface" border="pale" radius="2xl" paddingY="sm" className="pe-list-card">{children}</Box>;
}

const projectStatusTheme = { "On track": "green", "At risk": "orange", Planned: "neutral" } as const;
type ProjectStatus = keyof typeof projectStatusTheme;
type ProjectRow = { id: string; name: string; caption: string; status: ProjectStatus };
const projectRows: ProjectRow[] = [
  { id: "brand", name: "Brand refresh", caption: "Due Oct 4 · 12 of 18 tasks done", status: "On track" },
  { id: "app", name: "Mobile app 2.0", caption: "Due Oct 18 · 9 of 30 tasks done", status: "At risk" },
  { id: "docs", name: "Docs platform", caption: "Due Nov 1 · 21 of 24 tasks done", status: "On track" },
  { id: "tokens", name: "Design tokens", caption: "Due Nov 8 · 4 of 16 tasks done", status: "Planned" },
  { id: "help", name: "Help center", caption: "Due Nov 20 · 2 of 12 tasks done", status: "Planned" },
  { id: "onboarding", name: "Onboarding flow", caption: "Due Dec 2 · 0 of 9 tasks done", status: "Planned" },
];
const team = [
  { person: mobilePeople.ava, role: "Product designer", online: true },
  { person: mobilePeople.bao, role: "Frontend engineer", online: true },
  { person: mobilePeople.chi, role: "Content lead", online: false },
  { person: mobilePeople.hana, role: "Data analyst", online: false },
];

function DashboardExample() {
  const { toast } = useToast();
  const id = useId();
  const [rows, setRows] = useState(projectRows);
  const [showAll, setShowAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const [used, setUsed] = useState(68);
  const shown = showAll ? rows : rows.slice(0, 4);
  const cleared = used < 68;
  return (
    <Stack gap="xl">
      <PageHeader title="Overview" description="Zen Studio · week of Sep 28"
        actions={<>
          <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: `Exported ${plural(rows.length, "project")} as CSV` })}>Export</Button>
          <Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New project</Button>
        </>} />
      <Grid columns={{ mobile: 1, tablet: 1, desktop: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="lg" align="start">
        <Stack gap="lg">
          <Grid columns={{ mobile: 1, tablet: 3, desktop: 3 }} gap="md">
            <MetricCard theme="border" size="lg" label="Active projects" value={String(rows.length)} icon="icon-folder-line" trend={{ direction: "positive", label: "+2 this month" }} />
            <MetricCard theme="border" size="lg" label="Open tasks" value="48" icon="icon-check-done-line" trend={{ direction: "negative", label: "+6 since Monday" }} />
            <MetricCard theme="border" size="lg" label="Hours logged" value="126.5 h" icon="icon-clock-line" trend={{ direction: "normal", label: "Same as last week" }} />
          </Grid>
          <Stack as="section" gap="sm" aria-labelledby={`${id}-projects`}>
            <Stack direction="row" justify="between" align="center" gap="sm">
              <Heading level={2} id={`${id}-projects`}>Projects</Heading>
              <Button level="tertiary" size="sm" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show fewer" : `View all ${rows.length}`}</Button>
            </Stack>
            <Box surface="surface" border="pale" radius="xl" padding="md">
              <List aria-label="Projects">
                {shown.map((row) => <ListItem key={row.id} title={row.name} caption={row.caption} trailing={<Badge size="small" theme={projectStatusTheme[row.status]} background="subtle">{row.status}</Badge>} />)}
              </List>
            </Box>
          </Stack>
        </Stack>
        <Stack as="aside" gap="lg" aria-label="Team and storage">
          <Stack as="section" gap="sm" aria-labelledby={`${id}-team`}>
            <Heading level={2} id={`${id}-team`}>Team</Heading>
            <Box surface="surface" border="pale" radius="xl" padding="md">
              <List aria-label="Team">
                {team.map(({ person, role, online }) => <ListItem key={person.name} leading={<Avatar size="sm" {...avatarOf(person)} status={online} alt="" />} title={person.name} caption={online ? `${role} · online` : role} />)}
              </List>
            </Box>
          </Stack>
          <Stack as="section" gap="sm" aria-labelledby={`${id}-storage`}>
            <Heading level={2} id={`${id}-storage`}>Storage</Heading>
            <Box surface="surface" border="pale" radius="xl" padding="lg">
              <Stack gap="sm">
                <Stack direction="row" justify="between" align="baseline" gap="sm" wrap>
                  <Text textStyle="Body/Base/Bold" as="span">{used} GB of 100 GB</Text>
                  <Text textStyle="Body/Small/Regular" tone="base" as="span">{100 - used} GB free</Text>
                </Stack>
                <ProgressBar value={used} theme="status" scale="quota" aria-label="Storage used" />
                <Text textStyle="Body/Small/Regular" tone="base" role="status">{cleared ? "Removed 12 GB of exports older than 90 days." : "Exports older than 90 days take 12 GB."}</Text>
                {cleared
                  ? <Button level="tertiary" size="sm" onClick={() => setUsed(68)}>Restore exports</Button>
                  : <Button level="tertiary" size="sm" onClick={() => setUsed(56)}>Clear old exports</Button>}
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Grid>
      <DemoFieldDialog open={creating} onOpenChange={setCreating} title="New project" description="It starts in Planned; you can invite people once it exists."
        field={{ kind: "name", label: "Project name", placeholder: "e.g. Spring campaign" }} submitLabel="Create project" confirm={(name) => `“${name}” created`}
        onSubmit={(name) => { setRows((list) => [{ id: `new-${list.length + 1}`, name, caption: "No due date · 0 tasks", status: "Planned" }, ...list]); }} />
    </Stack>
  );
}

/* ───────────── 2 · List and detail ───────────── */

type RequestStatus = "Pending" | "Approved" | "Declined";
const requestTheme = { Pending: "orange", Approved: "green", Declined: "neutral" } as const;
const leaveRequests = [
  { id: "ava", person: mobilePeople.ava, role: "Product designer", type: "Annual leave", dates: "Oct 6 – Oct 8, 2026", days: 3, balance: 14, note: "Family trip to Da Lat. The hand-over notes are in the Brand refresh folder." },
  { id: "bao", person: mobilePeople.bao, role: "Frontend engineer", type: "Sick leave", dates: "Sep 30, 2026", days: 1, balance: 6, note: "Doctor’s appointment in the morning; online again from 2 pm." },
  { id: "chi", person: mobilePeople.chi, role: "Content lead", type: "Annual leave", dates: "Oct 13 – Oct 17, 2026", days: 5, balance: 9, note: "Wedding in Hue. Duy covers the release notes that week." },
  { id: "duy", person: mobilePeople.duy, role: "QA engineer", type: "Work from home", dates: "Oct 2, 2026", days: 1, balance: 20, note: "Waiting for a furniture delivery; on chat all day." },
  { id: "hana", person: mobilePeople.hana, role: "Data analyst", type: "Annual leave", dates: "Oct 20 – Oct 21, 2026", days: 2, balance: 4, note: "Moving flat." },
];
const initialStatus: Record<string, RequestStatus> = { ava: "Pending", bao: "Pending", chi: "Pending", duy: "Approved", hana: "Declined" };

function ListDetailExample() {
  const phone = useZen()?.breakpoint === "mobile";
  const id = useId();
  const [selected, setSelected] = useState("ava");
  const [status, setStatus] = useState(initialStatus);
  // Phones show one pane at a time: the list, or the detail with a Back button (Material 3 list-detail).
  const [pane, setPane] = useState<"list" | "detail">("list");
  // Swapping panes removes the control that was pressed: focus goes to Back in the detail, and Back returns it to the row.
  const panesRef = useRef<HTMLElement>(null);
  const focusAfterSwap = useRef<string | null>(null);
  useEffect(() => {
    if (!focusAfterSwap.current) return;
    panesRef.current?.querySelector<HTMLElement>(focusAfterSwap.current)?.focus();
    focusAfterSwap.current = null;
  }, [pane]);
  const request = leaveRequests.find((item) => item.id === selected) ?? leaveRequests[0];
  const current = status[request.id];
  const first = request.person.name.split(" ")[0];
  const pending = Object.values(status).filter((value) => value === "Pending").length;
  const decide = (next: RequestStatus) => setStatus((map) => ({ ...map, [request.id]: next }));
  const list = (
    <ListBox>
      <List aria-label="Leave requests">
        {leaveRequests.map((item) => (
          <ListItem key={item.id} data-request={item.id} selected={!phone && item.id === selected} onClick={() => { setSelected(item.id); if (phone) { focusAfterSwap.current = "[data-back]"; setPane("detail"); } }}
            leading={<Avatar size="sm" {...avatarOf(item.person)} alt="" />} title={item.person.name} caption={`${item.type} · ${plural(item.days, "day")}`}
            trailing={<Badge size="small" theme={requestTheme[status[item.id]]} background="subtle">{status[item.id]}</Badge>} />
        ))}
      </List>
    </ListBox>
  );
  const detail = (
    <Stack gap="sm">
      {/* Phones: a full-size (48px) Back with the chevron. */}
      {phone ? <Button level="tertiary" size="lg" data-back="" startIcon="icon-chevron-left-line-medium" onClick={() => { focusAfterSwap.current = `[data-request="${request.id}"] button`; setPane("list"); }}>All requests</Button> : null}
      <Box as="section" surface="surface" border="pale" radius="xl" padding="xl" aria-labelledby={`${id}-detail`}>
        <Stack gap="lg">
          <Stack direction="row" justify="between" align="center" gap="sm" wrap>
            <Stack direction="row" gap="sm" align="center">
              <Avatar size="lg" {...avatarOf(request.person)} alt="" />
              <Stack gap="xs">
                <Heading level={2} id={`${id}-detail`}>{request.person.name}</Heading>
                <Text textStyle="Body/Small/Regular" tone="base">{request.role}</Text>
              </Stack>
            </Stack>
            <Badge theme={requestTheme[current]} background="subtle">{current}</Badge>
          </Stack>
          <DescriptionList divider items={[
            { term: "Type", description: request.type },
            { term: "Dates", description: request.dates },
            { term: "Duration", description: plural(request.days, "day") },
            { term: "Balance after", description: plural(request.balance - request.days, "day") },
          ]} />
          <Stack gap="2xs">
            <Text textStyle="Body/Small/Regular" tone="base">Note from {first}</Text>
            <Text>{request.note}</Text>
          </Stack>
          <Divider decorative />
          {current === "Pending" ? (
            <Stack direction="row" justify="end" gap="sm" wrap>
              <Button level="tertiary" onClick={() => decide("Declined")}>Decline</Button>
              <Button level="primary" onClick={() => decide("Approved")}>Approve {plural(request.days, "day")}</Button>
            </Stack>
          ) : (
            <Stack direction="row" justify="between" align="center" gap="sm" wrap>
              <Text textStyle="Body/Small/Regular" tone="base" role="status">{current} · {first} gets an email</Text>
              <Button level="tertiary" size="sm" onClick={() => decide("Pending")}>Undo</Button>
            </Stack>
          )}
        </Stack>
      </Box>
    </Stack>
  );
  return (
    <Stack gap="xl">
      <PageHeader title="Leave requests" meta={<BadgeCounter value={pending} />} description={pending ? `${plural(pending, "request")} waiting for you` : "You are all caught up"} />
      <Grid ref={panesRef} columns={{ mobile: 1, tablet: "minmax(0, 280px) minmax(0, 1fr)", desktop: "minmax(0, 320px) minmax(0, 1fr)" }} gap="lg" align="start">
        {phone ? (pane === "list" ? list : detail) : <>{list}{detail}</>}
      </Grid>
    </Stack>
  );
}

/* ───────────── 3 · Annotated settings sections ───────────── */

function SettingsSection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <Grid as="section" columns={{ mobile: 1, tablet: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} gap="lg" align="start" aria-labelledby={id}>
      <Stack gap="2xs">
        <Heading level={2} id={id}>{title}</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{description}</Text>
      </Stack>
      <Box surface="surface" border="pale" radius="xl" padding="lg">{children}</Box>
    </Grid>
  );
}

function SettingsExample() {
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState({ name: "Zen Studio", url: "zen-studio" });
  const [name, setName] = useState(saved.name);
  const [url, setUrl] = useState(saved.url);
  const [savedNote, setSavedNote] = useState(false);
  const [left, setLeft] = useState({ name: false, url: false });
  const [summary, setSummary] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [updates, setUpdates] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);
  // Phones keep the Large switch (a full-size touch target); denser layouts use the Small default.
  const toggleSize = useZen()?.breakpoint === "mobile" ? "lg" : "sm";
  const dirty = name !== saved.name || url !== saved.url;
  // Both fields are required: the error shows once a field is left empty, and Save waits for it.
  const nameError = left.name && !name.trim() ? "Enter a workspace name" : undefined;
  const urlError = left.url && !url ? "Enter a URL, like zen-studio" : undefined;
  const invalid = !name.trim() || !url;
  // The line beside the buttons says why Save is off, what is unsaved, or that it saved.
  const status = invalid ? "Fix the fields above to save" : dirty ? "Unsaved changes" : savedNote ? "Changes saved" : "No changes to save yet";
  // Cancel and Save leave nothing to press (Cancel goes, Save turns off), so focus goes back to the first field.
  const finish = () => { setLeft({ name: false, url: false }); requestAnimationFrame(() => nameRef.current?.focus()); };
  return (
    <Stack gap="xl">
      <PageHeader title="Workspace settings" description="Zen Studio · Team plan" />
      <SettingsSection id={`${id}-general`} title="General" description="The name and address everyone you invite sees.">
        <Stack gap="md">
          <InputField ref={nameRef} label="Workspace name" value={name} error={nameError} onBlur={() => setLeft((state) => ({ ...state, name: true }))}
            onValueChange={(value) => { setName(value); setSavedNote(false); }} />
          <InputField label="Workspace URL" value={url} error={urlError} onBlur={() => setLeft((state) => ({ ...state, url: true }))}
            onValueChange={(value) => { setUrl(value.toLowerCase().replace(/\s+/g, "-")); setSavedNote(false); }} helpText={`zen.app/${url || "…"}`} />
          <Stack direction="row" justify="between" align="center" gap="sm" wrap>
            <Text textStyle="Body/Small/Regular" tone="base" role="status">{status}</Text>
            <Stack direction="row" gap="sm">
              {dirty ? <Button level="tertiary" onClick={() => { setName(saved.name); setUrl(saved.url); finish(); }}>Cancel</Button> : null}
              <Button level="primary" disabled={!dirty || invalid} onClick={() => { setSaved({ name: name.trim(), url }); setName(name.trim()); setSavedNote(true); finish(); }}>Save changes</Button>
            </Stack>
          </Stack>
        </Stack>
      </SettingsSection>
      <Divider decorative />
      <SettingsSection id={`${id}-email`} title="Email" description="What we send you. Changes save straight away.">
        <Stack gap="md" className="pal-toggles">
          <Toggle label="Weekly summary" caption="Every Monday at 9:00 am" size={toggleSize} checked={summary} onCheckedChange={setSummary} />
          <Toggle label="Mentions and replies" caption="As they happen" size={toggleSize} checked={mentions} onCheckedChange={setMentions} />
          <Toggle label="Product updates" caption="About once a month" size={toggleSize} checked={updates} onCheckedChange={setUpdates} />
        </Stack>
      </SettingsSection>
      <Divider decorative />
      <SettingsSection id={`${id}-delete`} title="Delete workspace" description="Removes every project for every member.">
        <Stack direction="row" justify="between" align="center" gap="sm" wrap>
          <Text textStyle="Body/Small/Regular" tone="base" role="status">{deleted ? `“${saved.name}” is deleted. You can restore it for 30 days.` : `${plural(6, "project")} and 12 members`}</Text>
          {deleted
            ? <Button level="tertiary" onClick={() => setDeleted(false)}>Restore workspace</Button>
            : <Button level="danger-subtle" onClick={() => setConfirming(true)}>Delete workspace</Button>}
        </Stack>
      </SettingsSection>
      {/* A destructive confirmation opens on the safe choice, Cancel (as in the Settings template). */}
      <Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title={`Delete “${saved.name}”?`} description="Every project goes for every member. You can restore it for 30 days."
        primaryAction={{ label: "Delete workspace", level: "danger", onClick: () => { setDeleted(true); setConfirming(false); } }} secondaryAction={{ label: "Cancel", autoFocus: true }} />
    </Stack>
  );
}

/* ───────────── 4 · Toolbar and auto-fill gallery ───────────── */

const photoCategories = ["Landscapes", "Mountains", "Forests", "Travel"] as const;
const photos = [
  { id: "field", title: "Sunset field", category: "Landscapes", by: "Ava Chen", photo: platformMedia.feed[0] },
  { id: "creek", title: "Forest creek", category: "Forests", by: "Bao Nguyen", photo: platformMedia.feed[1] },
  { id: "balloon", title: "Balloon over the palms", category: "Travel", by: "Chi Tran", photo: platformMedia.feed[2] },
  { id: "pass", title: "Mountain pass", category: "Mountains", by: "Duy Le", photo: platformMedia.feed[3] },
  { id: "peaks", title: "Snow peaks", category: "Mountains", by: "Emi Sato", photo: platformMedia.feed[4] },
  { id: "desert", title: "Desert hills", category: "Landscapes", by: "Finn Walsh", photo: platformMedia.feed[5] },
];

function GalleryExample() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>(["pass"]);
  const shown = photos.filter((item) => (!query.trim() || item.title.toLowerCase().includes(query.trim().toLowerCase()))
    && (!picked.length || picked.includes(item.category)) && (!savedOnly || saved.includes(item.id)));
  // Clearing removes the empty state and its button, so focus goes back to the search field.
  const clear = () => { setQuery(""); setPicked([]); setSavedOnly(false); searchRef.current?.focus(); };
  return (
    <Stack gap="md">
      <Grid columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }} gap="sm" align="center">
        <Search ref={searchRef} aria-label="Search photos" placeholder="Search photos" value={query} onValueChange={setQuery} />
        <Stack direction="row" gap="xs" wrap>
          <Chip variant="advanced" dropdown selectionMode="multiple" selected={picked.length > 0} selectionCount={picked.length} popoverMultiple
            popoverItems={photoCategories.map((category) => ({ id: category, label: category, selected: picked.includes(category) }))}
            onPopoverSelect={(item) => setPicked((list) => (list.includes(item.id) ? list.filter((value) => value !== item.id) : [...list, item.id]))} onClearSelection={() => setPicked([])}>
            {picked.length === 1 ? picked[0] : "Category"}
          </Chip>
          <Chip variant="normal" selected={savedOnly} aria-pressed={savedOnly} onClick={() => setSavedOnly((value) => !value)}>Saved</Chip>
        </Stack>
      </Grid>
      <Text textStyle="Body/Small/Regular" tone="base" aria-live="polite">{plural(shown.length, "photo")}</Text>
      {shown.length ? (
        <Grid as="ul" minColumnWidth={280} gap="md" aria-label="Photos">
          {shown.map((item) => {
            const isSaved = saved.includes(item.id);
            return (
              <Box as="li" key={item.id} surface="surface" border="pale" radius="xl" padding="2xs">
                <Stack gap="2xs">
                  <Image src={item.photo.src} alt={item.photo.alt} ratio="3:2" radius="lg" loading="eager" />
                  <Stack direction="row" justify="between" align="center" gap="xs" paddingX="sm" paddingY="xs">
                    <Stack gap="2xs">
                      <Text textStyle="Body/Base/Bold" as="span" truncate>{item.title}</Text>
                      <Text textStyle="Body/Small/Regular" tone="base" as="span">{item.category} · {item.by}</Text>
                    </Stack>
                    <IconButton appearance="flat" level="primary" size="sm" aria-label={`Save ${item.title}`} aria-pressed={isSaved} icon={isSaved ? "icon-bookmark-solid" : "icon-bookmark-line"}
                      onClick={() => setSaved((list) => (isSaved ? list.filter((value) => value !== item.id) : [...list, item.id]))} />
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Grid>
      ) : (
        <Box surface="surface" border="pale" radius="xl" padding="lg">
          <EmptyState headingLevel={2} illustration={false} icon="icon-search-medium-line" title="No photos match" secondaryAction={{ label: "Clear filters", onClick: clear }}>Try another name, category or the full library.</EmptyState>
        </Box>
      )}
    </Stack>
  );
}

/* ───────────── 5 · Readable width (Container) ───────────── */

const owners = [{ label: "Ava Chen", value: "ava" }, { label: "Bao Nguyen", value: "bao" }, { label: "Chi Tran", value: "chi" }];
const teams = [{ label: "Design", value: "design" }, { label: "Engineering", value: "engineering" }, { label: "Growth", value: "growth" }];

function ReadableWidthExample() {
  const { toast } = useToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [owner, setOwner] = useState("ava");
  const [team, setTeam] = useState("design");
  const [summary, setSummary] = useState("");
  const [isPrivate, setPrivate] = useState(false);
  const [error, setError] = useState<string>();
  const toggleSize = useZen()?.breakpoint === "mobile" ? "lg" : "sm";
  const suggested = name.trim().replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
  // The name is required: its error shows when the field is left empty or on Create, and focus goes back to it.
  const submit = (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    if (!name.trim()) { setError("Enter a project name"); nameRef.current?.focus(); return; }
    toast({ type: "positive", title: `“${name.trim()}” created`, children: `Tasks start at ${key || suggested || "PRJ"}-1` });
    setName(""); setKey(""); setSummary(""); setPrivate(false);
  };
  return (
    <Container maxWidth="sm">
      <Stack gap="lg">
        <PageHeader title="New project" description="Projects group tasks, files and people. You can change all of this later." />
        <Box as="form" surface="surface" border="pale" radius="xl" padding="lg" onSubmit={submit}>
          <Stack gap="lg" className="pal-toggles">
            <Grid columns={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
              <InputField ref={nameRef} label="Project name" placeholder="e.g. Spring campaign" value={name} error={error} onBlur={() => { if (!name.trim()) setError("Enter a project name"); }} onValueChange={(value) => { setName(value); setError(undefined); }} />
              <InputField label="Key" labelOptional placeholder={suggested || "e.g. SPR"} value={key} onValueChange={(value) => setKey(value.toUpperCase().slice(0, 4))} helpText="Starts every task ID" />
              <SelectField label="Owner" value={owner} onValueChange={setOwner} options={owners} />
              <SelectField label="Team" value={team} onValueChange={setTeam} options={teams} />
            </Grid>
            <TextAreaField label="Summary" labelOptional placeholder="What should this project deliver?" value={summary} onValueChange={setSummary} />
            <Toggle label="Private project" caption="Only people you invite can see it" size={toggleSize} checked={isPrivate} onCheckedChange={setPrivate} />
            <Stack direction="row" justify="end" align="center" gap="sm" wrap>
              <Button level="primary" type="submit">Create project</Button>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}

/* ───────────── 6 · Equal-height cards, aligned actions ───────────── */

const integrationList: { id: string; name: string; icon: IconName; about: string }[] = [
  { id: "calendar", name: "Calendar", icon: "icon-calendar-check-solid", about: "Adds due dates and design reviews to the team calendar." },
  { id: "chat", name: "Team chat", icon: "icon-message-chat-circle-solid", about: "Posts in the project channel when a task is done, reopened or reassigned, so nobody has to ask for a status update." },
  { id: "mail", name: "Email digest", icon: "icon-mail-01-solid", about: "A Monday summary of what changed last week." },
  { id: "storage", name: "Cloud storage", icon: "icon-hard-drive-solid", about: "Links files from your drive to tasks and keeps versions in sync." },
  { id: "payments", name: "Payments", icon: "icon-credit-card-solid", about: "Turns approved hours into invoices and marks each one paid when the money arrives." },
  { id: "analytics", name: "Analytics", icon: "icon-bar-chart-05-solid", about: "Sends project events to your analytics workspace." },
];

function EqualHeightExample() {
  const [connected, setConnected] = useState(["calendar", "chat"]);
  const toggle = (itemId: string) => setConnected((list) => (list.includes(itemId) ? list.filter((value) => value !== itemId) : [...list, itemId]));
  return (
    <Stack gap="md">
      <Text textStyle="Body/Small/Regular" tone="base" aria-live="polite">{connected.length} of {plural(integrationList.length, "integration")} connected</Text>
      <Grid as="ul" columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md" aria-label="Integrations">
        {integrationList.map((item) => {
          const on = connected.includes(item.id);
          return (
            <Box as="li" key={item.id} surface="surface" border="pale" radius="xl" padding="lg">
              <Stack gap="lg" justify="between" style={{ height: "100%" }}>
                <Stack gap="sm">
                  <DockIcon icon={item.icon} theme="neutral" background="subtle" />
                  <Stack gap="xs">
                    <Heading level={2} textStyle="Heading/Subheading">{item.name}</Heading>
                    <Text textStyle="Body/Small/Regular" tone="base">{item.about}</Text>
                  </Stack>
                </Stack>
                <Stack direction="row" justify="between" align="center" gap="sm">
                  {on ? <Badge size="small" theme="green" background="subtle">Connected</Badge> : <Text textStyle="Body/Small/Regular" tone="light" as="span">Not connected</Text>}
                  <Button level="tertiary" size="sm" aria-label={`${on ? "Disconnect" : "Connect"} ${item.name}`} onClick={() => toggle(item.id)}>{on ? "Disconnect" : "Connect"}</Button>
                </Stack>
              </Stack>
            </Box>
          );
        })}
      </Grid>
    </Stack>
  );
}

/* ───────────── 7 · Wrapping cluster ───────────── */

function ClusterExample() {
  const tagsRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [skills, setSkills] = useState(["Product design", "Design systems", "Figma", "Prototyping", "User research", "Accessibility", "Motion"]);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string>();
  const add = (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    if (skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) { setNote(`“${value}” is already on your profile`); return; }
    setSkills((list) => [...list, value]);
    setDraft("");
    setNote(`Added “${value}”`);
  };
  // A removed tag takes its button with it: focus moves to the next tag's remove button (the last one, or the field).
  const remove = (skill: string) => {
    const index = skills.indexOf(skill);
    setSkills((list) => list.filter((value) => value !== skill));
    setNote(`Removed “${skill}”`);
    requestAnimationFrame(() => {
      const buttons = tagsRef.current?.querySelectorAll<HTMLButtonElement>("button");
      (buttons?.[index] ?? buttons?.[index - 1] ?? inputRef.current)?.focus();
    });
  };
  return (
    <Box surface="surface" border="pale" radius="xl" padding="lg">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={2} textStyle="Heading/Subheading">Skills</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{plural(skills.length, "skill")} on your profile, used to suggest projects.</Text>
        </Stack>
        <Stack ref={tagsRef} as="ul" direction="row" gap="xs" wrap aria-label="Skills">
          {skills.map((skill) => <li key={skill}><Tag remove removeLabel={`Remove ${skill}`} onRemove={() => remove(skill)}>{skill}</Tag></li>)}
        </Stack>
        <Grid as="form" columns="minmax(0, 1fr) auto" gap="xs" align="end" onSubmit={add}>
          <InputField ref={inputRef} label="Add a skill" placeholder="e.g. Illustration" value={draft} onValueChange={(value) => { setDraft(value); setNote(undefined); }} />
          <Button level="tertiary" type="submit" startIcon="icon-plus-line" disabled={!draft.trim()}>Add</Button>
        </Grid>
        {note ? <Text textStyle="Body/Small/Regular" tone="base" role="status">{note}</Text> : null}
      </Stack>
    </Box>
  );
}

/* ───────────── 8 · Centred content (cover) ───────────── */

/** toast() whose one action (Undo) also closes the toast once it ran. */
function useActionToast() {
  const { toast, dismiss } = useToast();
  return useCallback((options: ToastOptions & { action: { label: string; onClick: () => void } }) => {
    const id = toast({ ...options, action: { ...options.action, onClick: () => { options.action.onClick(); dismiss(id); } } });
  }, [toast, dismiss]);
}

const invoiceClients = [
  { client: "Northwind Traders", amount: "$4,280.00" },
  { client: "Lumen Coffee", amount: "$1,150.00" },
  { client: "Orbit Health", amount: "$9,600.00" },
];

function CoverExample() {
  const actionToast = useActionToast();
  const id = useId();
  const boxRef = useRef<HTMLElement>(null);
  const [invoices, setInvoices] = useState<number[]>([]);
  /** Once the panel re-renders, focus the n-th match of `selector` (or the last one, or the first button left). */
  const focusIn = (selector: string, index = 0) => requestAnimationFrame(() => {
    const nodes = boxRef.current?.querySelectorAll<HTMLElement>(selector);
    (nodes?.[index] ?? nodes?.[(nodes?.length ?? 0) - 1] ?? boxRef.current?.querySelector<HTMLElement>("button"))?.focus();
  });
  // The next client without an invoice; the button that made it may go (the empty state, or New invoice at three).
  const create = () => {
    const next = invoiceClients.findIndex((_, index) => !invoices.includes(index));
    if (next < 0) return;
    setInvoices((list) => [...list, next]);
    focusIn("[data-new-invoice]", 0);
  };
  // Delete acts at once and offers Undo, which puts the invoice back in its place; focus moves to the next row.
  const remove = (index: number) => {
    const position = invoices.indexOf(index);
    setInvoices((list) => list.filter((value) => value !== index));
    actionToast({ title: `INV-${1042 + index} deleted`, children: invoiceClients[index].client,
      action: { label: "Undo", onClick: () => { setInvoices((list) => { const next = list.filter((value) => value !== index); next.splice(position, 0, index); return next; }); focusIn("[data-delete]", position); } } });
    focusIn("[data-delete]", position);
  };
  return (
    <Box ref={boxRef} as="section" surface="surface" border="pale" radius="xl" padding="lg" aria-labelledby={`${id}-title`}>
      <Stack gap="md" style={{ minHeight: "20rem" }}>
        <Stack direction="row" justify="between" align="center" gap="sm" wrap>
          <Heading level={2} id={`${id}-title`}>Invoices</Heading>
          {invoices.length && invoices.length < invoiceClients.length ? <Button level="tertiary" size="sm" data-new-invoice="" startIcon="icon-plus-line" onClick={create}>New invoice</Button> : null}
        </Stack>
        <Stack justify={invoices.length ? "start" : "center"} style={{ flex: 1 }}>
          {invoices.length ? (
            <List aria-label="Invoices">
              {invoices.map((index) => (
                <ListItem key={index} title={invoiceClients[index].client} caption={`INV-${1042 + index} · due Oct 31`}
                  trailing={<Stack direction="row" gap="xs" align="center"><Text textStyle="Body/Base/Medium" as="span">{invoiceClients[index].amount}</Text>
                    <IconButton appearance="flat" level="primary" icon="icon-trash-line" data-delete="" aria-label={`Delete invoice for ${invoiceClients[index].client}`} onClick={() => remove(index)} /></Stack>} />
              ))}
            </List>
          ) : (
            <EmptyState illustration={false} icon="icon-receipt-line" title="No invoices yet" primaryAction={{ label: "Create invoice", onClick: create }}>Bill a client for approved hours. Paid invoices stay here.</EmptyState>
          )}
        </Stack>
        <Text textStyle="Caption/Regular" tone="light">Synced with Payments 2 minutes ago</Text>
      </Stack>
    </Box>
  );
}

/* ───────────── 9 · Mobile screen ───────────── */

// Zen Studio's design tasks this week (today is Wednesday): a real week is longer than one screen, so the list runs
// under the bar and the large title folds away.
const phoneTasks = [
  { id: "brief", title: "Write the Q4 brief", caption: "Due today", status: "Urgent" },
  { id: "review", title: "Review the icon set", caption: "Due today", status: "In review" },
  { id: "focus", title: "Fix the checkout focus order", caption: "Due today", status: "Urgent" },
  { id: "pricing", title: "Update the pricing page copy", caption: "Due tomorrow", status: "In review" },
  { id: "tokens", title: "Sync design tokens", caption: "Due tomorrow", status: "Planned" },
  { id: "survey", title: "Draft the onboarding survey", caption: "Due tomorrow", status: "Planned" },
  { id: "prototype", title: "Review Chi's prototype", caption: "Due Friday", status: "In review" },
  { id: "demo", title: "Prepare the sprint demo", caption: "Due Friday", status: "Planned" },
  { id: "sessions", title: "Book the usability sessions", caption: "Due Friday", status: "Planned" },
  { id: "guidelines", title: "Export the brand guidelines", caption: "Due Friday", status: "Planned" },
  { id: "library", title: "Clean up the Figma library", caption: "Due Friday", status: "Planned" },
  { id: "notes", title: "Write the 2.4 release notes", caption: "Due Friday", status: "Planned" },
  { id: "research", title: "Plan next week's research", caption: "Due Friday", status: "Planned" },
  { id: "moodboards", title: "Archive the old moodboards", caption: "Due Friday", status: "Planned" },
];

function MobileScreenExample() {
  const id = useId();
  // The header floats over the screen and follows its scroll: the large title folds into the bar title.
  const screenRef = useRef<HTMLDivElement>(null);
  // New task opens a sheet; the task lands on top of the list, scrolled into view.
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [created, setCreated] = useState<typeof phoneTasks>([]);
  const week = [...created, ...phoneTasks];
  const today = week.filter((task) => task.caption === "Due today").length;
  const inReview = week.filter((task) => task.status === "In review").length;
  const create = () => {
    setCreated((list) => [{ id: `new-${list.length + 1}`, title: title.trim(), caption: "Due today", status: "Planned" }, ...list]);
    setTitle("");
    setCreating(false);
    screenRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <Stack align="center">
    <PlatformPhone canvas="canvas" label="Tasks" headerOverlay screenRef={screenRef}
      header={<TopNavigation title="Tasks" largeTitle="Tasks" scrollRef={screenRef} trailing={[{ icon: "icon-plus-line", label: "New task", onClick: () => setCreating(true) }]} />}>
      {/* lg (20px) side padding: the blocks line up with the large title. */}
      <Stack gap="lg" paddingX="lg" paddingY="sm">
        <Grid columns={2} gap="sm">
          <MetricCard theme="border" size="lg" label="Due today" value={String(today)} icon="icon-calendar-line" />
          <MetricCard theme="border" size="lg" label="In review" value={String(inReview)} icon="icon-check-done-line" />
        </Grid>
        <Stack as="section" gap="xs" aria-labelledby={`${id}-week`}>
          <Stack direction="row" justify="between" align="center">
            <Heading level={2} id={`${id}-week`} textStyle="Body/Small/Bold" tone="light">This week</Heading>
            <Text textStyle="Body/Small/Regular" tone="base" as="span">{plural(week.length, "task")}</Text>
          </Stack>
          <Box surface="surface" border="pale" radius="xl" padding="md">
            <List aria-label="Tasks this week">
              {week.map((task) => (
                <ListItem key={task.id} title={task.title} caption={task.caption}
                  trailing={<Badge size="small" theme={task.status === "Urgent" ? "red" : task.status === "In review" ? "blue" : "neutral"} background="subtle">{task.status}</Badge>} />
              ))}
            </List>
          </Box>
        </Stack>
      </Stack>
      <BottomSheet inline open={creating} onOpenChange={setCreating} title="New task" primaryAction={{ label: "Create task", disabled: !title.trim(), onClick: create }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Title" placeholder="What needs doing?" value={title} onValueChange={setTitle} data-autofocus="" />
      </BottomSheet>
    </PlatformPhone>
    </Stack>
  );
}

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  layout: {
    label: "Layout",
    eyebrow: "Components / Layout",
    title: "Layout",
    description: "Stack, Grid, Box and Container: page structure with the Figma spacing, padding and radius scales instead of hand-written flex CSS.",
    playground: LayoutPlayground,
  },
});

export const examples: ExampleMap = keepOnHotUpdate(import.meta.hot, "examples", {
  layout: [
    { title: "Main column and aside", screen: true, wide: true, description: "A two-thirds main column next to a one-third aside (Material 3 supporting pane, Polaris two-column): Grid columns={{ mobile: 1, desktop: \"minmax(0, 2fr) minmax(0, 1fr)\" }} with align=\"start\". On phones the aside moves under the main column. Sections are a row Stack (heading + action, justify=\"between\") over their panel.", render: () => <FollowWindow><DashboardExample /></FollowWindow>, code: `<Stack gap="xl">
  <PageHeader title="Overview" description="Zen Studio · week of Sep 28" actions={…} />
  <Grid columns={{ mobile: 1, tablet: 1, desktop: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="lg" align="start">
    <Stack gap="lg">
      <Grid columns={{ mobile: 1, tablet: 3, desktop: 3 }} gap="md">
        <MetricCard theme="border" size="lg" label="Active projects" value="6" icon="icon-folder-line" trend={{ direction: "positive", label: "+2 this month" }} />
        …
      </Grid>
      <Stack as="section" gap="sm" aria-labelledby="projects">
        <Stack direction="row" justify="between" align="center" gap="sm">
          <Heading level={2} id="projects">Projects</Heading>
          <Button level="tertiary" size="sm" onClick={() => setShowAll(!showAll)}>View all 6</Button>
        </Stack>
        <Box surface="surface" border="pale" radius="xl" padding="md">
          <List aria-label="Projects">…</List>
        </Box>
      </Stack>
    </Stack>
    <Stack as="aside" gap="lg" aria-label="Team and storage">
      …Team and Storage sections…
    </Stack>
  </Grid>
</Stack>` },
    { title: "List and detail", screen: true, wide: true, description: "Material 3’s list-detail layout: a fixed-width list track next to a flexible detail track (Grid columns=\"minmax(0, 320px) minmax(0, 1fr)\", 280px on tablets). Phones show one pane at a time: picking a request opens its detail, and a chevron Back button returns to the list.", render: () => <FollowWindow><ListDetailExample /></FollowWindow>, code: `const phone = useZen()?.breakpoint === "mobile";

<Stack gap="xl">
  <PageHeader title="Leave requests" meta={<BadgeCounter value={pending} />} description={\`\${plural(pending, "request")} waiting for you\`} />
  <Grid columns={{ mobile: 1, tablet: "minmax(0, 280px) minmax(0, 1fr)", desktop: "minmax(0, 320px) minmax(0, 1fr)" }} gap="lg" align="start">
    {phone ? (pane === "list" ? list : detail) : <>{list}{detail}</>}
  </Grid>
</Stack>

// list: interactive rows keep their own padding; sm above and below puts the selected fill 12 inside the 2xl box
<Box surface="surface" border="pale" radius="2xl" paddingY="sm">
  <List aria-label="Leave requests">
    <ListItem selected={!phone && item.id === selected} onClick={() => { setSelected(item.id); setPane("detail"); }} … />
  </List>
</Box>

// detail: on phones a full-size Back; swapping panes moves focus to Back, and Back returns it to the row
{phone ? <Button level="tertiary" size="lg" startIcon="icon-chevron-left-line-medium" onClick={() => setPane("list")}>All requests</Button> : null}
<Box as="section" surface="surface" border="pale" radius="xl" padding="xl" aria-labelledby="detail">
  <Stack gap="lg">…Avatar + Heading level={2}, DescriptionList, note, Decline / Approve…</Stack>
</Box>` },
    { title: "Annotated settings", screen: true, wide: true, description: "Polaris’ annotated layout for settings: each section is a Grid with the title and a one-line description in a narrow left column and the controls in a Surface box on the right; Dividers separate sections. On phones the description sits above its box.", render: () => <FollowWindow><SettingsExample /></FollowWindow>, code: `<Stack gap="xl">
  <PageHeader title="Workspace settings" description="Zen Studio · Team plan" />
  <Grid as="section" columns={{ mobile: 1, tablet: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} gap="lg" align="start" aria-labelledby="general">
    <Stack gap="2xs">
      <Heading level={2} id="general">General</Heading>
      <Text textStyle="Body/Small/Regular" tone="base">The name and address everyone you invite sees.</Text>
    </Stack>
    <Box surface="surface" border="pale" radius="xl" padding="lg">
      <Stack gap="md">
        <InputField label="Workspace name" value={name} error={nameError} onBlur={leaveName} onValueChange={setName} />
        <InputField label="Workspace URL" value={url} error={urlError} onBlur={leaveUrl} onValueChange={setUrl} helpText={\`zen.app/\${url}\`} />
        {/* The status says why Save is off ("No changes to save yet"), what is unsaved, or that it saved. */}
        <Stack direction="row" justify="between" align="center" gap="sm" wrap>
          <Text textStyle="Body/Small/Regular" tone="base" role="status">{status}</Text>
          <Button level="primary" disabled={!dirty || invalid} onClick={save}>Save changes</Button>
        </Stack>
      </Stack>
    </Box>
  </Grid>
  <Divider decorative />
  …Email (Toggles) and Delete workspace (danger-subtle Button → Dialog) sections…
</Stack>` },
    { title: "Toolbar and auto-fill gallery", wide: true, description: "The toolbar gives Search a 320px track and lets the filter chips wrap in the rest. The gallery is Grid minColumnWidth={280}: as many columns as fit (three here, one on phones) with no breakpoints, and each tile’s 2xs padding plus the Image’s lg radius equals the Box’s xl radius.", render: () => <FollowWindow><GalleryExample /></FollowWindow>, code: `<Grid columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }} gap="sm" align="center">
  <Search aria-label="Search photos" placeholder="Search photos" value={query} onValueChange={setQuery} />
  <Stack direction="row" gap="xs" wrap>
    <Chip variant="advanced" dropdown selectionMode="multiple" …>Category</Chip>
    <Chip variant="normal" selected={savedOnly} aria-pressed={savedOnly} onClick={() => setSavedOnly(!savedOnly)}>Saved</Chip>
  </Stack>
</Grid>
<Grid as="ul" minColumnWidth={280} gap="md" aria-label="Photos">
  {shown.map((item) => (
    <Box as="li" key={item.id} surface="surface" border="pale" radius="xl" padding="2xs">
      <Stack gap="2xs">
        <Image src={item.src} alt={item.alt} ratio="3:2" radius="lg" />
        <Stack direction="row" justify="between" align="center" gap="xs" paddingX="sm" paddingY="xs">
          <Stack gap="2xs">…title, category · author…</Stack>
          <IconButton appearance="flat" level="primary" size="sm" aria-label={\`Save \${item.title}\`} aria-pressed={saved} icon="icon-bookmark-line" onClick={toggleSave} />
        </Stack>
      </Stack>
    </Box>
  ))}
</Grid>` },
    { title: "Readable width", screen: true, wide: true, description: "Container maxWidth=\"sm\" keeps a form at 640px and centres it, however wide the window, with the page margin outside. Short fields pair up in a two-column Grid from tablet up and stack on phones.", render: () => <FollowWindow><ReadableWidthExample /></FollowWindow>, code: `<Container maxWidth="sm">
  <Stack gap="lg">
    <PageHeader title="New project" description="Projects group tasks, files and people." />
    <Box as="form" surface="surface" border="pale" radius="xl" padding="lg" onSubmit={submit}>
      <Stack gap="lg">
        <Grid columns={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
          <InputField label="Project name" placeholder="e.g. Spring campaign" value={name} error={error} onValueChange={setName} />
          <InputField label="Key" labelOptional placeholder="e.g. SPR" value={key} onValueChange={setKey} helpText="Starts every task ID" />
          <SelectField label="Owner" value={owner} onValueChange={setOwner} options={owners} />
          <SelectField label="Team" value={team} onValueChange={setTeam} options={teams} />
        </Grid>
        <TextAreaField label="Summary" labelOptional value={summary} onValueChange={setSummary} />
        <Toggle label="Private project" caption="Only people you invite can see it" checked={isPrivate} onCheckedChange={setPrivate} />
        <Stack direction="row" justify="end"><Button level="primary" type="submit">Create project</Button></Stack>
      </Stack>
    </Box>
  </Stack>
</Container>` },
    { title: "Equal-height cards", wide: true, description: "Grid cells stretch to the tallest card in their row, and each card is a column Stack with justify=\"between\", so the status and action row sits at the bottom of every card however long its description. Three columns on desktop, two on tablets, one on phones.", render: () => <FollowWindow><EqualHeightExample /></FollowWindow>, code: `<Grid as="ul" columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md" aria-label="Integrations">
  {integrations.map((item) => (
    <Box as="li" key={item.id} surface="surface" border="pale" radius="xl" padding="lg">
      <Stack gap="lg" justify="between" style={{ height: "100%" }}>
        <Stack gap="sm">
          <DockIcon icon={item.icon} theme="neutral" background="subtle" />
          <Heading level={2} textStyle="Heading/Subheading">{item.name}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{item.about}</Text>
        </Stack>
        <Stack direction="row" justify="between" align="center" gap="sm">
          {on ? <Badge size="small" theme="green" background="subtle">Connected</Badge> : <Text textStyle="Body/Small/Regular" tone="light" as="span">Not connected</Text>}
          <Button level="tertiary" size="sm" aria-label={\`Connect \${item.name}\`} onClick={() => toggle(item.id)}>Connect</Button>
        </Stack>
      </Stack>
    </Box>
  ))}
</Grid>` },
    { title: "Wrapping cluster", description: "A row Stack with wrap flows Tags onto as many lines as they need, with the same gap across and down. Below it, a Grid with columns=\"minmax(0, 1fr) auto\" lets the field take the width while the button keeps its own.", render: () => <ClusterExample />, code: `<Stack as="ul" direction="row" gap="xs" wrap aria-label="Skills">
  {skills.map((skill) => (
    <li key={skill}><Tag remove removeLabel={\`Remove \${skill}\`} onRemove={() => remove(skill)}>{skill}</Tag></li>
  ))}
</Stack>
<Grid as="form" columns="minmax(0, 1fr) auto" gap="xs" align="end" onSubmit={add}>
  <InputField label="Add a skill" placeholder="e.g. Illustration" value={draft} onValueChange={setDraft} />
  <Button level="tertiary" type="submit" startIcon="icon-plus-line" disabled={!draft.trim()}>Add</Button>
</Grid>` },
    { title: "Centred in a panel", description: "The Every Layout cover: the header stays at the top, the footnote at the bottom, and the middle Stack grows and centres its content, so the empty state sits in the optical middle. With invoices the list starts at the top instead.", render: () => <CoverExample />, code: `<Box as="section" surface="surface" border="pale" radius="xl" padding="lg">
  <Stack gap="md" style={{ minHeight: "20rem" }}>
    <Heading level={2}>Invoices</Heading>
    <Stack justify={invoices.length ? "start" : "center"} style={{ flex: 1 }}>
      {invoices.length ? <List aria-label="Invoices">…</List> : (
        <EmptyState illustration={false} icon="icon-receipt-line" title="No invoices yet" primaryAction={{ label: "Create invoice", onClick: create }}>
          Bill a client for approved hours. Paid invoices stay here.
        </EmptyState>
      )}
    </Stack>
    <Text textStyle="Caption/Regular" tone="light">Synced with Payments 2 minutes ago</Text>
  </Stack>
</Box>` },
    { title: "Mobile screen", wide: true, description: "A phone screen from the same parts: a Stack with lg side padding (level with the large title) and lg between sections, a fixed two-column Grid for the summary cards, and a list box (md padding around the static rows, xl radius). The group header is a Body/Small/Bold kicker under the large title, which folds into the bar as the week's tasks scroll.", render: () => <MobileScreenExample />, code: `<PlatformPhone headerOverlay screenRef={screenRef} header={
  <TopNavigation title="Tasks" largeTitle="Tasks" scrollRef={screenRef} trailing={[{ icon: "icon-plus-line", label: "New task", onClick: () => setCreating(true) }]} />
}>
<Stack gap="lg" paddingX="lg" paddingY="sm">
  <Grid columns={2} gap="sm">
    <MetricCard theme="border" size="lg" label="Due today" value={String(today)} icon="icon-calendar-line" />
    <MetricCard theme="border" size="lg" label="In review" value={String(inReview)} icon="icon-check-done-line" />
  </Grid>
  <Stack as="section" gap="xs" aria-labelledby="week">
    <Stack direction="row" justify="between" align="center">
      <Heading level={2} id="week" textStyle="Body/Small/Bold" tone="light">This week</Heading>
      <Text textStyle="Body/Small/Regular" tone="base" as="span">{plural(tasks.length, "task")}</Text>
    </Stack>
    <Box surface="surface" border="pale" radius="xl" padding="md">
      <List aria-label="Tasks this week">…</List>
    </Box>
  </Stack>
</Stack>
</PlatformPhone>` },
  ],
});
