import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { AlertBanner } from "../../../components/AlertBanner";
import { Avatar, AvatarStack } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { AreaChart, BarList, ChartCard, chartPalette, DonutChart, GroupedBarChart, HeatmapChart, LineChart, RadialChart, StackBarChart } from "../../../components/Chart";
import { Checkbox } from "../../../components/Checkbox";
import { Chip } from "../../../components/Chip";
import { DockIcon } from "../../../components/DockIcon";
import { Image } from "../../../components/Image";
import { InputField, SelectField } from "../../../components/Input";
import { Grid, Stack } from "../../../components/Layout";
import { MetricCard } from "../../../components/MetricWidget";
import { ProgressBar } from "../../../components/Progress";
import { ZenProvider, type ZenBrand } from "../../../components/Provider";
import { RadioButton } from "../../../components/RadioButton";
import { Segmented } from "../../../components/Segmented";
import { Tabs } from "../../../components/Tabs";
import { Heading, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { Toggle } from "../../../components/Toggle";
import photoAva from "../../../assets/media/avatar-ava.webp";
import photoBao from "../../../assets/media/avatar-bao.webp";
import photoChi from "../../../assets/media/avatar-chi.webp";
import photoCafe from "../../../assets/media/site-cafe.webp";
import photoCoast from "../../../assets/media/feed-coast-road.webp";
import photoRooftops from "../../../assets/media/site-rooftops.webp";
import photoSantorini from "../../../assets/media/site-santorini.webp";
import photoSnow from "../../../assets/media/feed-snow-peaks.webp";
import type { ProjectModes } from "../../../../tools/studio/project-theme.mjs";

/*
 * The theme page's preview (user, 2026-10-17: "Trang này sẽ có các component tương ứng để user thấy được các thay đổi
 * như thế nào", then "Nên làm giao diện sinh động như trang tailwind color app" and "chart nên chia nhiều sector để dễ
 * thấy customize chart sector"): a gallery like uicolors.app's — Cards, Dashboard, Charts, Website, Components — of real
 * Zen components in the project's draft mode. The Primary shows in its tints (Subtle cards, the colour box on the
 * gallery's Canvas/Default; Solid cards with their On-Accent content; marks in Support/Brand steps); the charts split
 * into all seven sectors, so a sector's colour shows
 * the moment it changes. Rendered once per colour mode (Light, Dark, or both side by side).
 */

type Theme = "light" | "dark";
const GALLERY = [
  { id: "cards", label: "Cards" },
  { id: "charts", label: "Charts" },
  { id: "dashboard", label: "Dashboard" },
  { id: "website", label: "Website" },
  { id: "components", label: "Components" },
] as const;
type GalleryId = (typeof GALLERY)[number]["id"];

/** How many columns a gallery row takes, by the width of one colour mode's column (measured: one mode on a desktop, two
 *  side by side, a phone): large ≥ 760px, medium ≥ 480px, else small (one column). Fixed counts: auto-fill tracks
 *  left empty columns at the end of a short row. */
type Size = "lg" | "md" | "sm";
const SizeContext = createContext<Size>("lg");
const useColumns = (large: number, medium: number) => { const size = useContext(SizeContext); return size === "lg" ? large : size === "md" ? medium : 1; };

/** What a preview action does: it says it was pressed (a toast in the draft's modes), so no button is a dead click. */
function usePress() {
  const { toast } = useToast();
  return (label: string) => () => toast({ title: `${label} · preview` });
}

/** The Primary's steps as Support/Brand tokens: marks in one hue, as uicolors' previews draw them. */
const brandStep = (step: "deep" | "rich" | "solid" | "soft" | "subtle") => `var(--zen-color-background-support-brand-${step})`;
const money = (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value}`);
const percent = (value: number) => `${value}%`;

/** Seven series, one per chart sector (Color Chart Sector/Primary … Septenary). */
const SEVEN = [
  { id: "design", label: "Design" }, { id: "build", label: "Build" }, { id: "research", label: "Research" }, { id: "content", label: "Content" },
  { id: "brand", label: "Brand" }, { id: "support", label: "Support" }, { id: "ops", label: "Ops" },
];
const sevenBy = (label: string, values: number[]) => ({ label, values: Object.fromEntries(SEVEN.map((series, index) => [series.id, values[index]])) });
const hours = [sevenBy("Q1", [32, 24, 12, 10, 8, 6, 4]), sevenBy("Q2", [36, 26, 10, 12, 9, 7, 5]), sevenBy("Q3", [41, 28, 14, 11, 10, 8, 5]), sevenBy("Q4", [44, 30, 15, 13, 11, 8, 6])];
const traffic = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((label, index) => sevenBy(label, [40 + index * 4, 30 + index * 2, 22 + index, 18 + index * 2, 14 + index, 10 + index, 6 + index]));
const shares = [
  { id: "retainers", label: "Retainers", value: 28 }, { id: "brand", label: "Brand", value: 19 }, { id: "web", label: "Website", value: 16 },
  { id: "app", label: "Mobile app", value: 13 }, { id: "content", label: "Content", value: 10 }, { id: "research", label: "Research", value: 8 }, { id: "other", label: "Other", value: 6 },
];

/* ── Cards ────────────────────────────────────────────────────────────────────────────────────────────────────── */

const spend = [
  { label: "Jan", values: { home: 1900, food: 1400, travel: 2100 } },
  { label: "Feb", values: { home: 2000, food: 1100, travel: 1300 } },
  { label: "Mar", values: { home: 1100, food: 900, travel: 500 } },
  { label: "Apr", values: { home: 2700, food: 1300, travel: 800 } },
  { label: "May", values: { home: 2000, food: 1500, travel: 2400 } },
  { label: "Jun", values: { home: 900, food: 2100, travel: 300 } },
];
const spendSeries = [
  { id: "home", label: "Home", color: brandStep("deep") },
  { id: "food", label: "Food", color: brandStep("solid") },
  { id: "travel", label: "Travel", color: brandStep("soft") },
];

function CardsGallery() {
  const press = usePress();
  return (
    <Grid columns={useColumns(3, 2)} gap="md">
      <Card theme="subtle" color="brand" spacing="sm">
        <Stack gap="lg">
          <Image src={photoSantorini} alt="White houses above the sea in Santorini" ratio={4 / 3} radius="lg" />
          <Heading level={3} textStyle="Display/4" tone="accent-strongest">Track your trips</Heading>
        </Stack>
      </Card>
      <Card theme="flat" spacing="sm">
        <Stack gap="xs">
          <Text textStyle="Body/Base/Medium">Expenses</Text>
          <Heading level={3} textStyle="Heading/1">$12,543</Heading>
          <StackBarChart aria-label="Expenses per month by category, Jan – Jun 2026" data={spend} series={spendSeries} height={200} animate={false} format={money} />
        </Stack>
      </Card>
      <Card theme="solid" color="accent" spacing="sm">
        <Stack gap="lg">
          <Image src={photoSnow} alt="Snow on the peaks above a valley" ratio={4 / 3} radius="lg" />
          <Heading level={3} textStyle="Display/4">Gain control</Heading>
        </Stack>
      </Card>
      <Card theme="flat" spacing="sm">
        <Stack gap="md">
          <Text textStyle="Body/Base/Medium">Revenue by service</Text>
          <DonutChart aria-label="Revenue by service, 2026" data={shares} value="$148K" label="This year" size="medium" legendPosition="bottom" animate={false} format={percent} />
        </Stack>
      </Card>
      <Card theme="flat" spacing="sm">
        <Stack gap="md">
          <Text textStyle="Body/Base/Medium">Journal</Text>
          {[
            { photo: photoCoast, title: "A week on the coast road", tag: "Travel" },
            { photo: photoCafe, title: "Cafés that open at six", tag: "Food" },
          ].map((post) => (
            <Stack key={post.title} direction="row" gap="sm" align="center">
              <Image src={post.photo} alt="" ratio={1} radius="md" style={{ width: 64, flex: "none" }} />
              <Stack gap="2xs" align="start">
                <Text textStyle="Body/Small/Bold">{post.title}</Text>
                <Badge theme="accent" background="subtle" size="sm">{post.tag}</Badge>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Card>
      <Card theme="subtle" color="brand" spacing="sm">
        <Stack gap="md" align="start">
          <DockIcon icon="icon-star-01-solid" theme="accent" size="lg" />
          <Heading level={3} textStyle="Heading/3" tone="accent-strongest">Go Pro and plan together</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Shared budgets, trip boards and offline maps.</Text>
          <AvatarStack items={[{ src: photoAva, alt: "Ava" }, { src: photoBao, alt: "Bao" }, { src: photoChi, alt: "Chi" }]} />
          <Button level="primary" size="sm" onClick={press("Upgrade")}>Upgrade</Button>
        </Stack>
      </Card>
    </Grid>
  );
}

/* ── Charts: every sector ─────────────────────────────────────────────────────────────────────────────────────── */

/** The seven sectors in a row, named: what each chart below walks in order. */
function SectorKey() {
  return (
    <ol className="studio-theme-preview__sectors" aria-label="Chart sectors 1 to 7">
      {chartPalette.map((colour, index) => (
        <li key={index}>
          <span className="studio-theme-preview__sector" style={{ background: colour }} aria-hidden="true" />
          <Text as="span" textStyle="Caption/Medium" tone="base">{index + 1}</Text>
        </li>
      ))}
    </ol>
  );
}

function ChartsGallery() {
  return (
    <Stack gap="md">
      <Card theme="flat">
        <Stack gap="sm">
          <Text textStyle="Body/Base/Medium">Chart sectors</Text>
          <SectorKey />
        </Stack>
      </Card>
      <Grid columns={useColumns(3, 1)} gap="md">
        <ChartCard title="Revenue by service" description="Seven sectors">
          <DonutChart aria-label="Revenue by service, 2026" data={shares} format={percent} legendPosition="start" animate={false} />
        </ChartCard>
        <ChartCard title="Hours by team" description="Seven series, stacked">
          <StackBarChart aria-label="Hours by team per quarter, 2026" data={hours} series={SEVEN} height={240} animate={false} />
        </ChartCard>
        <ChartCard title="Visits by channel" description="Seven areas, stacked">
          <AreaChart aria-label="Visits by channel per month, Apr – Sep 2026" type="stacked" data={traffic} series={SEVEN} height={240} showLegend animate={false} />
        </ChartCard>
        <ChartCard title="Goals" description="This quarter">
          <RadialChart aria-label="Goals reached this quarter" value="72%" label="On track" animate={false}
            data={[{ id: "revenue", label: "Revenue", value: 82 }, { id: "clients", label: "New clients", value: 64 }, { id: "nps", label: "NPS", value: 71 }, { id: "hours", label: "Billable", value: 58 }]} />
        </ChartCard>
        <ChartCard title="Invoiced and collected" description="Three series">
          <GroupedBarChart aria-label="Invoiced, collected and overdue per month, Apr – Sep 2026" height={220} animate={false} format={money}
            series={[{ id: "invoiced", label: "Invoiced" }, { id: "collected", label: "Collected" }, { id: "overdue", label: "Overdue" }]}
            data={["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((label, index) => ({ label, values: { invoiced: 42800 + index * 4300, collected: 38400 + index * 4100, overdue: 6200 - index * 600 } }))} />
        </ChartCard>
        <ChartCard title="Busy hours" description="In Primary's steps">
          <HeatmapChart aria-label="Bookings per weekday and hour" animate={false} rows={["Mon", "Tue", "Wed", "Thu", "Fri"]} columns={["9", "11", "13", "15", "17"]}
            values={[[2, 5, 7, 4, 1], [3, 6, 8, 5, 2], [1, 4, 9, 6, 3], [2, 7, 6, 8, 2], [4, 5, 3, 2, 1]]} />
        </ChartCard>
      </Grid>
    </Stack>
  );
}

/* ── Dashboard ────────────────────────────────────────────────────────────────────────────────────────────────── */

const revenue = [{ label: "Apr", value: 42800 }, { label: "May", value: 48200 }, { label: "Jun", value: 45100 }, { label: "Jul", value: 53600 }, { label: "Aug", value: 58900 }, { label: "Sep", value: 64300 }];
const clients = [{ label: "Lumen Coffee", value: 18400 }, { label: "Northwind", value: 12900 }, { label: "Halcyon", value: 9800 }, { label: "Bluebird", value: 6200 }];

function DashboardGallery() {
  const press = usePress();
  const three = useColumns(3, 1);
  return (
    <Stack gap="md">
      <Stack direction="row" gap="sm" align="center" justify="between" wrap>
        <Stack gap="2xs">
          <Heading level={3} textStyle="Heading/3">Good morning, Alex</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Here is how September is going.</Text>
        </Stack>
        <Stack direction="row" gap="xs" align="center">
          <Segmented aria-label="Period" size="sm" defaultValue="month" options={[{ id: "week", label: "Week" }, { id: "month", label: "Month" }]} />
          <Button level="primary" size="sm" startIcon="icon-plus-line" onClick={press("New invoice")}>New invoice</Button>
        </Stack>
      </Stack>
      <Grid columns={useColumns(3, 3)} gap="md">
        <MetricCard type="tile" theme="solid" color="accent" label="Invoiced" value="$64.3K" icon="icon-receipt-check-line" />
        <MetricCard type="tile" theme="flat" label="Collected" value="$58.9K" icon="icon-wallet-02-line" />
        <MetricCard type="tile" theme="flat" label="Overdue" value="$3.1K" icon="icon-alarm-clock-line" />
      </Grid>
      <Grid columns={three} gap="md">
        <ChartCard title="Revenue" value="$64.3K" description="Apr – Sep 2026">
          <LineChart aria-label="Revenue per month, Apr – Sep 2026" data={revenue} format={money} height={200} showLegend={false} animate={false} />
        </ChartCard>
        <ChartCard title="Hours by team" description="This year">
          <StackBarChart aria-label="Hours by team per quarter, 2026" data={hours} series={SEVEN} height={200} animate={false} />
        </ChartCard>
        <ChartCard title="Top clients" description="This quarter">
          <BarList aria-label="Revenue by client this quarter" data={clients} format={money} animate={false} />
        </ChartCard>
      </Grid>
      <Card theme="flat">
        <Stack gap="sm">
          <Text textStyle="Body/Base/Medium">Latest invoices</Text>
          {[
            { client: "Lumen Coffee", photo: photoAva, amount: "$4,800", status: <Badge theme="green" background="subtle" size="sm">Paid</Badge> },
            { client: "Northwind", photo: photoBao, amount: "$2,150", status: <Badge theme="yellow" background="subtle" size="sm">Due soon</Badge> },
            { client: "Halcyon", photo: photoChi, amount: "$960", status: <Badge theme="red" background="subtle" size="sm">Overdue</Badge> },
          ].map((row) => (
            <Stack key={row.client} direction="row" gap="sm" align="center">
              <Avatar src={row.photo} alt="" size="sm" />
              <Text textStyle="Body/Small/Medium" width="fill">{row.client}</Text>
              <Text textStyle="Body/Small/Regular" tabularNumbers>{row.amount}</Text>
              {row.status}
            </Stack>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

/* ── Website ──────────────────────────────────────────────────────────────────────────────────────────────────── */

function WebsiteGallery() {
  const press = usePress();
  const two = useColumns(2, 1);
  return (
    <Stack gap="lg">
      <Card theme="subtle" color="brand">
        <Grid columns={two} gap="lg">
          <Stack gap="md" align="start" justify="center">
            <Badge theme="accent" size="sm">New · Shared trips</Badge>
            <Heading level={3} textStyle="Display/3" tone="accent-strongest">Plan every trip in one place</Heading>
            <Text textStyle="Body/Base/Regular" tone="base">Budgets, bookings and the people you travel with, on one calm page.</Text>
            <Stack direction="row" gap="xs" wrap>
              <Button level="primary" onClick={press("Start free")}>Start free</Button>
              <Button level="tertiary" startIcon="icon-play-circle-line" onClick={press("Watch the tour")}>Watch the tour</Button>
            </Stack>
          </Stack>
          <Image src={photoRooftops} alt="Terracotta rooftops of an old town" ratio={4 / 3} radius="xl" />
        </Grid>
      </Card>
      <Grid columns={useColumns(3, 1)} gap="md">
        {[
          { icon: "icon-wallet-02-line" as const, title: "Shared budgets", text: "Split costs as you go." },
          { icon: "icon-map-line" as const, title: "Offline maps", text: "Every booking, no signal needed." },
          { icon: "icon-users-line" as const, title: "Trip boards", text: "Vote on plans together." },
        ].map((feature) => (
          <Card key={feature.title} theme="flat" spacing="sm">
            <Stack gap="sm" align="start">
              <DockIcon icon={feature.icon} theme="accent" background="subtle" />
              <Text textStyle="Body/Base/Bold">{feature.title}</Text>
              <Text textStyle="Body/Small/Regular" tone="base">{feature.text}</Text>
            </Stack>
          </Card>
        ))}
      </Grid>
      <Grid columns={useColumns(2, 2)} gap="md">
        <Card theme="flat">
          <Stack gap="md" align="start">
            <Text textStyle="Body/Base/Medium">Solo</Text>
            <Heading level={3} textStyle="Heading/1">Free</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">One trip at a time, every feature.</Text>
            <Button level="tertiary" onClick={press("Get started")}>Get started</Button>
          </Stack>
        </Card>
        <Card theme="solid" color="accent">
          <Stack gap="md" align="start">
            <Text textStyle="Body/Base/Medium">Together</Text>
            <Heading level={3} textStyle="Heading/1">$6 / month</Heading>
            <Text textStyle="Body/Small/Regular">Unlimited trips for up to six people.</Text>
            <Button appearance="overlay" level="white" onClick={press("Try it for 30 days")}>Try it for 30 days</Button>
          </Stack>
        </Card>
      </Grid>
    </Stack>
  );
}

/* ── Components ───────────────────────────────────────────────────────────────────────────────────────────────── */

/** Twelve steps of a role ramp (Brand or Neutral) in one colour mode, as the Base Colors mode resolves them. */
function Ramp({ role, label, theme }: { role: "brand" | "neutral"; label: string; theme: Theme }) {
  return (
    <div className="studio-theme-preview__ramp">
      <Text as="span" textStyle="Caption/Medium" tone="base">{label}</Text>
      <ol className="studio-theme-preview__steps" aria-label={`${label}, steps 1 to 12`}>
        {Array.from({ length: 12 }, (_, index) => (
          <li key={index} className="studio-theme-preview__step" style={{ background: `var(--zen-${theme}-${role}-${index + 1})` }} title={`${label} ${index + 1}`} />
        ))}
      </ol>
    </div>
  );
}

function ComponentsGallery({ theme }: { theme: Theme }) {
  const press = usePress();
  return (
    <Grid columns={useColumns(2, 1)} gap="md">
      <Card theme="flat" spacing="sm">
        <Stack gap="md">
          <Ramp role="brand" label="Primary" theme={theme} />
          <Ramp role="neutral" label="Neutral" theme={theme} />
        </Stack>
      </Card>
      <Card theme="flat" spacing="sm">
        <Stack gap="md">
          <Stack direction="row" gap="xs" wrap align="center">
            {/* Every level the component theme colours, side by side: the theme page's specimen, not an app's button row. */}
            <Button level="primary" startIcon="icon-plus-line" onClick={press("New invoice")}>New invoice</Button>
            {/* zen-allow-accent: the specimen shows the Accent level next to Primary. */}
            <Button level="accent" onClick={press("Share")}>Share</Button>
            {/* zen-allow-secondary: the specimen shows the Secondary level next to the others. */}
            <Button level="secondary" onClick={press("Export")}>Export</Button>
            <Button level="tertiary" onClick={press("Cancel")}>Cancel</Button>
            {/* zen-allow-secondary: the specimen shows the Secondary icon button. */}
            <IconButton icon="icon-dots-horizontal-line" aria-label="More actions" level="secondary" onClick={press("More actions")} />
          </Stack>
          <Tabs aria-label="Invoices" defaultValue="open" items={[{ id: "open", label: "Open", badge: 4 }, { id: "paid", label: "Paid" }, { id: "draft", label: "Drafts" }]} />
          <Stack direction="row" gap="xs" wrap>
            <Chip selected>All clients</Chip>
            <Chip>Retainers</Chip>
            <Chip>Projects</Chip>
          </Stack>
        </Stack>
      </Card>
      <Card theme="flat" spacing="sm">
        <Stack gap="md">
          <InputField label="Client" defaultValue="Lumen Coffee" />
          <SelectField label="Payment terms" defaultValue="30" options={[{ value: "15", label: "15 days" }, { value: "30", label: "30 days" }, { value: "60", label: "60 days" }]} />
          <Checkbox label="Send a copy to me" defaultChecked />
          <Toggle label="Remind before the due date" defaultChecked />
          <Stack direction="row" gap="md">
            <RadioButton name={`preview-${theme}-tax`} value="incl" label="Tax included" defaultChecked />
            <RadioButton name={`preview-${theme}-tax`} value="excl" label="Tax on top" />
          </Stack>
        </Stack>
      </Card>
      <Card theme="flat" spacing="sm">
        <Stack gap="md">
          <Stack direction="row" gap="xs" wrap>
            <Badge theme="accent">New</Badge>
            <Badge theme="green" background="subtle">Paid</Badge>
            <Badge theme="yellow" background="subtle">Due soon</Badge>
            <Badge theme="red" background="subtle">Overdue</Badge>
            <Badge theme="blue" background="subtle">Sent</Badge>
          </Stack>
          <ProgressBar theme="accent" value={72} label="Collected this month" valueLabel="72%" layout="stacked" />
          <AlertBanner theme="info">Two invoices are due this week.</AlertBanner>
        </Stack>
      </Card>
    </Grid>
  );
}

function Gallery({ id, theme }: { id: GalleryId; theme: Theme }) {
  if (id === "cards") return <CardsGallery />;
  if (id === "charts") return <ChartsGallery />;
  if (id === "dashboard") return <DashboardGallery />;
  if (id === "website") return <WebsiteGallery />;
  return <ComponentsGallery theme={theme} />;
}

/** The gallery in the draft's modes; `themes`: one column per colour mode. The theme page holds the tab (a chart
 *  colour change opens Charts). */
export function ThemePreview({ brand, modes, themes, gallery, onGalleryChange }: { brand: string; modes: ProjectModes; themes: ReadonlyArray<Theme>; gallery: GalleryId; onGalleryChange: (gallery: GalleryId) => void }) {
  const columnsRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>("lg");
  useLayoutEffect(() => {
    const node = columnsRef.current?.firstElementChild;
    if (!node) return;
    const measure = () => { const width = node.getBoundingClientRect().width; setSize(width >= 760 ? "lg" : width >= 480 ? "md" : "sm"); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [themes.length]);
  return (
    <div className="studio-theme-preview">
      <div className="studio-theme-preview__tabs">
        <Tabs aria-label="Preview" variant="subtle" size="sm" value={gallery} onValueChange={(id) => onGalleryChange(id as GalleryId)} items={GALLERY.map((item) => ({ id: item.id, label: item.label }))} />
      </div>
      <div ref={columnsRef} className="studio-theme-preview__columns" data-columns={themes.length}>
        {themes.map((theme) => (
          <ZenProvider key={theme} className="studio-theme-preview__column" brand={brand as ZenBrand} theme={theme} componentTheme={modes.componentTheme} density={modes.density} radius={modes.radius} typography={modes.typography} emphasis={modes.emphasis} contrast="standard" breakpoint="desktop" syncDocument={false}>
            {themes.length > 1 ? <Text as="p" textStyle="Caption/Medium" tone="base">{theme === "light" ? "Light" : "Dark"}</Text> : null}
            <SizeContext value={size}><Gallery id={gallery} theme={theme} /></SizeContext>
          </ZenProvider>
        ))}
      </div>
    </div>
  );
}

export type { GalleryId };
