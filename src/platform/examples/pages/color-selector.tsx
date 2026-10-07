import { useId, useRef, useState } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import { Badge, type BadgeTheme } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { ChartCard, StackBarChart } from "../../../components/Chart";
import { ColorSelector, type ColorOption } from "../../../components/ColorSelector";
import { Dialog } from "../../../components/Dialog";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { InputField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { projects, type Project } from "../data";
import { keepOnHotUpdate } from "../../hotData";
import "./color-selector.css";

export const page: PlatformPage = "color-selector";

/* Swatches are Support/Solid tokens, so they follow light and dark mode; the value maps back to a hue id. Ordered by hue. */
type Hue = "red" | "orange" | "yellow" | "green" | "teal" | "cyan" | "blue" | "indigo" | "purple" | "pink";
const hueNames: Record<Hue, string> = { red: "Red", orange: "Orange", yellow: "Yellow", green: "Green", teal: "Teal", cyan: "Cyan", blue: "Blue", indigo: "Indigo", purple: "Purple", pink: "Pink" };
const swatch = (hue: Hue): ColorOption => ({ value: `var(--zen-color-background-support-${hue}-solid)`, label: hueNames[hue], contrast: hue === "yellow" ? "dark" : undefined });
const hueOf = (value: string) => (Object.keys(hueNames) as Hue[]).find((hue) => swatch(hue).value === value)!;
// Labels get eight hues: enough to tell labels apart, few enough for one row.
const labelHues: Hue[] = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"];

/* ───────────── 1. Label colour: pick, preview, create ───────────── */

type Label = { id: string; name: string; hue: Hue };
const startLabels: Label[] = [
  { id: "blocked", name: "Blocked", hue: "red" },
  { id: "client", name: "Client review", hue: "purple" },
  { id: "quick", name: "Quick win", hue: "green" },
];

function LabelColourExample() {
  const { toast } = useToast();
  const [labels, setLabels] = useState(startLabels);
  const [name, setName] = useState("Needs copy");
  const [hue, setHue] = useState<Hue>("orange");
  const [error, setError] = useState<string>();
  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Name the label"); return; }
    setLabels([...labels, { id: `${trimmed}-${labels.length}`, name: trimmed, hue }]);
    setName("");
    // The next label starts on a colour nobody uses yet.
    setHue(labelHues.find((item) => item !== hue && !labels.some((label) => label.hue === item)) ?? "blue");
    toast({ type: "positive", title: "Label created" });
  };
  return (
    <Card theme="flat" className="px-color-selector-card">
      {/* Two groups in one card (lg apart): the labels so far, and the form that adds one. */}
      <Stack gap="lg">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Labels</Heading>
          <Stack direction="row" gap="2xs" wrap>
            {labels.map((label) => <Badge key={label.id} theme={label.hue as BadgeTheme} background="subtle">{label.name}</Badge>)}
          </Stack>
        </Stack>
        <Form onSubmit={create} gap="md">
          <InputField label="Name" value={name} error={error} onValueChange={(value) => { setName(value); setError(undefined); }} />
          <FormFieldset legend="Colour">
            <ColorSelector aria-label="Label colour" colors={labelHues.map(swatch)} value={swatch(hue).value} onValueChange={(value) => setHue(hueOf(value))} />
          </FormFieldset>
          <Stack direction="row" gap="xs" align="center">
            <Text as="span" textStyle="Body/Small/Regular" tone="base">Preview</Text>
            <Badge theme={hue as BadgeTheme} background="subtle">{name.trim() || "Label"}</Badge>
          </Stack>
          <FormActions>
            <Button level="primary" type="submit">Create label</Button>
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}

/* ───────────── 2. Calendar colours: a row opens a Dialog with the swatches ───────────── */

type Calendar = { id: string; name: string; caption: string; hue: Hue };
const startCalendars: Calendar[] = [
  { id: "reviews", name: "Design reviews", caption: "Tuesdays and Thursdays", hue: "purple" },
  { id: "clients", name: "Client meetings", caption: "Shared with Client Services", hue: "blue" },
  { id: "leave", name: "Leave and holidays", caption: "Everyone at the studio", hue: "green" },
  { id: "deadlines", name: "Deadlines", caption: "From every active project", hue: "red" },
];

function CalendarColoursExample() {
  const { toast } = useToast();
  const titleId = useId();
  const [calendars, setCalendars] = useState(startCalendars);
  const [editing, setEditing] = useState<Calendar | null>(null);
  const [draft, setDraft] = useState<Hue>("purple");
  const open = (calendar: Calendar) => { setEditing(calendar); setDraft(calendar.hue); };
  const save = () => {
    if (!editing) return;
    setCalendars(calendars.map((calendar) => calendar.id === editing.id ? { ...calendar, hue: draft } : calendar));
    toast({ type: "positive", title: `${editing.name} recoloured` });
    setEditing(null);
  };
  return (
    <>
    {/* A list on the stage is a ListBox (Surface, no border): the title in its Header-Slot, the rows in its Body-Slot.
        The rows are interactive with no padding of their own: the slots' padding (24px desktop, 20px on a phone) puts
        their text level with the heading, and their fill hangs 12px into it. */}
    <ListBox className="px-color-selector-card" as="section" aria-labelledby={titleId}
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Team calendars</Heading>}>
      <List aria-labelledby={titleId}>
        {calendars.map((calendar) => (
          // The colour is named in words in the caption too, so the title keeps the width and never truncates.
          <ListItem key={calendar.id} title={calendar.name} caption={`${calendar.caption} · ${hueNames[calendar.hue]}`} onClick={() => open(calendar)}
            leading={<DockIcon icon="icon-calendar-line" theme={calendar.hue as DockIconTheme} background="solid" />} />
        ))}
      </List>
    </ListBox>
      <Dialog open={Boolean(editing)} onOpenChange={(next) => { if (!next) setEditing(null); }} icon={false}
        title={`${editing?.name ?? ""} colour`} description="Events in this calendar take this colour for everyone at the studio."
        primaryAction={{ label: "Save colour", onClick: save }} secondaryAction={{ label: "Cancel" }}>
        <Stack gap="md">
          <ColorSelector aria-label={`${editing?.name ?? "Calendar"} colour`} colors={labelHues.map(swatch)} value={swatch(draft).value} onValueChange={(value) => setDraft(hueOf(value))} />
          {/* The preview is an event as the calendar will draw it: a List row with no side padding of its own, so its text
              lines up with the swatches. */}
          <List aria-label="Preview">
            <ListItem title="Critique: points history" caption="Tuesday at 2:00 pm · Room Sông Hồng"
              leading={<DockIcon icon="icon-calendar-line" theme={draft as DockIconTheme} background="solid" />} />
          </List>
        </Stack>
      </Dialog>
    </>
  );
}

/* ───────────── 3. Highlight colours: light swatches need the dark check ───────────── */

type Highlight = "yellow" | "green" | "blue" | "pink" | "purple";
const highlights: Highlight[] = ["yellow", "green", "blue", "pink", "purple"];
// Soft fills are light in Light mode, so the check turns dark (contrast="dark") to stay visible.
const highlightSwatch = (hue: Highlight): ColorOption => ({ value: `var(--zen-color-background-support-${hue}-soft)`, label: hueNames[hue], contrast: "dark" });

function HighlightExample() {
  const [value, setValue] = useState<string | undefined>(highlightSwatch("yellow").value);
  const cardRef = useRef<HTMLElement>(null);
  // Clear highlight disables itself: focus moves to the swatches, where a new colour can be picked.
  const clear = () => { cardRef.current?.querySelector<HTMLElement>(".zen-color-selector input")?.focus(); setValue(undefined); };
  return (
    <Card ref={cardRef} theme="flat" className="px-color-selector-card">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Review notes</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Loyalty app · points history, round 2</Text>
        </Stack>
        <Text>
          The history list reads well on small phones.{" "}
          <mark className="px-color-selector-mark" style={value ? { background: value } : undefined}>Expired points need their own row, not a grey total</mark>
          , and the filter should remember the last month someone picked.
        </Text>
        <Stack direction="row" gap="xs" align="center" justify="between" wrap>
          <ColorSelector aria-label="Highlight colour" colors={highlights.map(highlightSwatch)} value={value} onValueChange={setValue} />
          <Button level="tertiary" disabled={!value} onClick={clear}>Clear highlight</Button>
        </Stack>
      </Stack>
    </Card>
  );
}

/* ───────────── 4. Chart series colours: the chart answers every pick ───────────── */

const seriesHues: Hue[] = ["orange", "blue", "teal", "purple", "pink"];
const clientSeries = [
  { id: "phin", label: "Phin & Co" },
  { id: "lumen", label: "Lumen Bank" },
  { id: "mekong", label: "Mekong Freight" },
];
const weeklyHours = [
  { label: "Aug 31", values: { phin: 96, lumen: 120, mekong: 40 } },
  { label: "Sep 7", values: { phin: 104, lumen: 132, mekong: 36 } },
  { label: "Sep 14", values: { phin: 88, lumen: 140, mekong: 24 } },
  { label: "Sep 21", values: { phin: 112, lumen: 128, mekong: 8 } },
];

function ChartSeriesExample() {
  const [colours, setColours] = useState<Record<string, Hue>>({ phin: "orange", lumen: "blue", mekong: "blue" });
  const shared = clientSeries.filter((series, index) => clientSeries.some((other, j) => j !== index && colours[other.id] === colours[series.id]));
  return (
    <Stack gap="md" className="px-color-selector-card">
      <ChartCard title="Hours by client" headingLevel={4} theme="flat">
        <StackBarChart aria-label="Hours by client, last four weeks" height={200} format={(value) => `${value} h`}
          series={clientSeries.map((series) => ({ ...series, color: swatch(colours[series.id]).value }))} data={weeklyHours} />
      </ChartCard>
      <Card theme="flat">
        <Stack gap="md">
          {shared.length ? (
            <InlineMessage theme="warning" title="Two clients share a colour">
              {`${shared.map((series) => series.label).join(" and ")} look the same in the chart. Pick another colour for one of them.`}
            </InlineMessage>
          ) : null}
          {clientSeries.map((series) => (
            <Stack key={series.id} gap="xs">
              <Text as="span" textStyle="Body/Small/Bold" tone="base">{series.label}</Text>
              <ColorSelector aria-label={`${series.label} colour`} colors={seriesHues.map(swatch)} value={swatch(colours[series.id]).value}
                onValueChange={(value) => setColours({ ...colours, [series.id]: hueOf(value) })} />
            </Stack>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

/* ───────────── 5. On a phone: a project's colour from its settings screen ───────────── */

const projectHues: Hue[] = ["orange", "yellow", "green", "teal", "blue", "indigo", "purple", "pink"];
type PhoneProject = Pick<Project, "id" | "name" | "client" | "icon"> & { theme: Hue; members: number };
// Every studio project, the shared six and eight smaller ones, by name.
const phoneProjects: PhoneProject[] = ([
  ...projects.map((project): PhoneProject => ({ id: project.id, name: project.name, client: project.client, icon: project.icon, theme: project.theme as Hue, members: project.members.length })),
  { id: "lumen-account-opening", name: "Account opening", client: "Lumen Bank", icon: "icon-briefcase-line", theme: "teal", members: 3 },
  { id: "lumen-card-controls", name: "Card controls", client: "Lumen Bank", icon: "icon-shield-line", theme: "indigo", members: 4 },
  { id: "mekong-driver-app", name: "Driver app", client: "Mekong Freight", icon: "icon-car-01-line", theme: "orange", members: 4 },
  { id: "phin-gift-cards", name: "Gift cards", client: "Phin & Co", icon: "icon-gift-01-line", theme: "pink", members: 2 },
  { id: "saola-online-shop", name: "Online shop", client: "Saola Outdoor", icon: "icon-shopping-cart-line", theme: "purple", members: 5 },
  { id: "phin-store-locator", name: "Store locator", client: "Phin & Co", icon: "icon-map-line", theme: "yellow", members: 3 },
  { id: "studio-website", name: "Studio website", client: "Đìzai Studio", icon: "icon-globe-01-line", theme: "blue", members: 3 },
  { id: "bookfair-ticketing", name: "Ticket sales", client: "Hanoi Book Fair", icon: "icon-shopping-bag-01-line", theme: "green", members: 2 },
] satisfies PhoneProject[]).sort((a, b) => a.name.localeCompare(b.name));

function PhoneProjectColourExample() {
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const [themes, setThemes] = useState<Record<string, Hue>>(() => Object.fromEntries(phoneProjects.map((project) => [project.id, project.theme])));
  const [openId, setOpenId] = useState<string | null>("saola-brand");
  const opened = phoneProjects.find((project) => project.id === openId);
  const openProject = (project: PhoneProject) => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(project.id));
  // Back lands on the row of the project that was open, so the reader sees its new icon.
  const back = () => screen.go(`[data-project="${openId}"] .zen-list-item__wrapper`, () => setOpenId(null));

  if (!opened) {
    return (
      // One key per screen: each screen opens at the top and the large title folds again.
      <PlatformPhone key="root" label="Projects" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Projects" largeTitle="Projects" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* Rows pad 0 at the sides: the screen's margin (lg) insets them, and sm above and below keeps the first and last fills clear. */}
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Projects">
            {phoneProjects.map((project) => (
              <ListItem key={project.id} data-project={project.id} title={project.name} caption={project.client} onClick={() => openProject(project)}
                leading={<DockIcon icon={project.icon} theme={themes[project.id] as DockIconTheme} background="subtle" />} />
            ))}
          </List>
        </Box>
      </PlatformPhone>
    );
  }
  const hue = themes[opened.id];
  return (
    <PlatformPhone key={opened.id} label="Project colour" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title={opened.name} scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}>
      {screen.anchor}
      <Stack gap="lg" padding="lg">
        <Stack gap="xs" align="center">
          <DockIcon size="xl" icon={opened.icon} theme={hue as DockIconTheme} background="subtle" />
          <Text tone="base" align="center">{`${opened.client} · ${plural(opened.members, "member")}`}</Text>
        </Stack>
        {/* A phone setting applies at once, so there is no Save and Back has nothing to lose. */}
        <FormFieldset legend="Colour" helpText="Shows on the project's icon, its timeline bar and its calendar events.">
          <ColorSelector aria-label={`${opened.name} colour`} colors={projectHues.map(swatch)} value={swatch(hue).value}
            onValueChange={(value) => setThemes({ ...themes, [opened.id]: hueOf(value) })} />
        </FormFieldset>
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Label colour",
    description: "Eight swatches ordered by hue, each a Support/Solid token and each announced by its colour name. Tab reaches the group and the arrow keys move and pick; the preview shows the label as it will look before it is created.",
    render: () => <LabelColourExample />,
    code: `const swatch = (hue) => ({ value: \`var(--zen-color-background-support-\${hue}-solid)\`, label: names[hue], contrast: hue === "yellow" ? "dark" : undefined });
const hueOf = (value) => hues.find((hue) => swatch(hue).value === value);

<Form onSubmit={create} gap="md">
  <InputField label="Name" value={name} error={error} onValueChange={setName} />
  <FormFieldset legend="Colour">
    <ColorSelector aria-label="Label colour" colors={hues.map(swatch)} value={swatch(hue).value}
      onValueChange={(value) => setHue(hueOf(value))} />
  </FormFieldset>
  <Stack direction="row" gap="xs" align="center">
    <Text as="span" textStyle="Body/Small/Regular" tone="base">Preview</Text>
    <Badge theme={hue} background="subtle">{name || "Label"}</Badge>
  </Stack>
  <FormActions><Button level="primary" type="submit">Create label</Button></FormActions>
</Form>`,
  },
  {
    title: "Calendar colours",
    description: "Each calendar row opens a Dialog with the swatches and a preview event; nothing changes until Save, and Cancel keeps the old colour. The row's caption names its colour in words as well.",
    render: () => <CalendarColoursExample />,
    code: `<ListBox as="section" aria-labelledby={titleId}
  header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Team calendars</Heading>}>
  <List aria-labelledby={titleId}>
    <ListItem title={calendar.name} caption={\`\${calendar.caption} · \${names[calendar.hue]}\`} onClick={() => open(calendar)}
      leading={<DockIcon icon="icon-calendar-line" theme={calendar.hue} background="solid" />} />
  </List>
</ListBox>

<Dialog open={Boolean(editing)} onOpenChange={(next) => !next && setEditing(null)} icon={false}
  title={\`\${editing?.name} colour\`} description="Events in this calendar take this colour for everyone at the studio."
  primaryAction={{ label: "Save colour", onClick: save }} secondaryAction={{ label: "Cancel" }}>
  <ColorSelector aria-label={\`\${editing?.name} colour\`} colors={hues.map(swatch)} value={swatch(draft).value}
    onValueChange={(value) => setDraft(hueOf(value))} />
  <List aria-label="Preview">
    <ListItem title="Critique: points history" caption="Tuesday at 2:00 pm"
      leading={<DockIcon icon="icon-calendar-line" theme={draft} background="solid" />} />
  </List>
</Dialog>`,
  },
  {
    title: "Light swatches",
    description: "Highlights use the light Support/Soft fills, so every swatch sets contrast=\"dark\" and its check stays visible. With no value no swatch is checked, which is how Clear highlight takes the colour off.",
    render: () => <HighlightExample />,
    code: `const swatch = (hue) => ({ value: \`var(--zen-color-background-support-\${hue}-soft)\`, label: names[hue], contrast: "dark" });

<Text>… <mark style={value ? { background: value } : undefined}>Expired points need their own row</mark> …</Text>
<ColorSelector aria-label="Highlight colour" colors={["yellow", "green", "blue", "pink", "purple"].map(swatch)}
  value={value} onValueChange={setValue} />
<Button level="tertiary" disabled={!value} onClick={() => setValue(undefined)}>Clear highlight</Button>`,
  },
  {
    title: "Chart series colours",
    description: "One selector per series, named after it, recolours the chart as soon as a swatch is picked. When two series end up with the same colour, a warning says which ones before the chart becomes hard to read.",
    render: () => <ChartSeriesExample />,
    code: `<StackBarChart aria-label="Hours by client, last four weeks" data={weeks}
  series={clients.map((c) => ({ ...c, color: swatch(colours[c.id]).value }))} />

{shared.length ? (
  <InlineMessage theme="warning" title="Two clients share a colour">
    {shared.map((c) => c.label).join(" and ")} look the same in the chart. Pick another colour for one of them.
  </InlineMessage>
) : null}
{clients.map((c) => (
  <Stack key={c.id} gap="xs">
    <Text as="span" textStyle="Body/Small/Bold" tone="base">{c.label}</Text>
    <ColorSelector aria-label={\`\${c.label} colour\`} colors={hues.map(swatch)} value={swatch(colours[c.id]).value}
      onValueChange={(value) => setColours({ ...colours, [c.id]: hueOf(value) })} />
  </Stack>
))}`,
  },
  {
    title: "Project colour",
    description: "A project's settings screen previews the colour on its Dock Icon; eight swatches fit one row and stay 32px for the thumb. The pick applies at once, like the phone's other settings, so Back returns to a list that already shows it.",
    render: () => <PhoneProjectColourExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// One key per screen, so the settings screen opens at the top and the Projects root folds its large title again.
// The root's clickable rows sit in the screen margin: <Box paddingX="lg" paddingY="xs"><List>…</List></Box>.
<PlatformPhone key={project.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title={project.name} scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}>
  <DockIcon size="xl" icon={project.icon} theme={hue} background="subtle" />
  <FormFieldset legend="Colour" helpText="Shows on the project's icon, its timeline bar and its calendar events.">
    <ColorSelector aria-label={\`\${project.name} colour\`} colors={hues.map(swatch)} value={swatch(hue).value}
      onValueChange={(value) => setHue(project.id, hueOf(value))} />
  </FormFieldset>
</PlatformPhone>`,
  },
]);
