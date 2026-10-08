import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "../../../components/Avatar";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Form, FormActions } from "../../../components/Form";
import { Icon, type IconName } from "../../../components/Icon";
import { Image } from "../../../components/Image";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Metric, MetricCard, type MetricTrendDirection } from "../../../components/MetricWidget";
import { Search } from "../../../components/Search";
import { Segmented } from "../../../components/Segmented";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { platformMedia, type PlatformPhoto } from "../../PlatformMedia";
import { PlatformPhone } from "../../PlatformPhone";
import {
  TODAY, daysFromToday, formatBytes, formatDate, formatDay, formatMoney, formatRange, formatRelative, initials, people, peopleList, plans,
  projectById, studio, studioMonths, studioTeamHours, workspacePlan, type Person, type PersonId, type Team,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./segmented.css";

export const page: PlatformPage = "segmented";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);

/* ───────────── Grid or list view ───────────── */

type BrandFile = { id: string; name: string; bytes: number; owner: PersonId; updated: Date; photo?: PlatformPhoto };
const brandFiles: BrandFile[] = [
  { id: "b1", name: "Moodboard.fig", bytes: 24_600_000, owner: "gia", updated: minutesAgo(13) },
  { id: "b2", name: "Forest creek.jpg", bytes: 3_420_000, owner: "emi", updated: daysFromToday(0, 9, 12), photo: platformMedia.feed[1] },
  { id: "b3", name: "Mountain road.jpg", bytes: 2_910_000, owner: "emi", updated: daysFromToday(-1, 16, 5), photo: platformMedia.feed[3] },
  { id: "b4", name: "Snow peaks.jpg", bytes: 3_080_000, owner: "emi", updated: daysFromToday(-1, 16, 2), photo: platformMedia.feed[4] },
  { id: "b5", name: "Moss study.jpg", bytes: 2_240_000, owner: "gia", updated: daysFromToday(-2, 9, 40), photo: platformMedia.feed[7] },
  { id: "b6", name: "Brand brief.pdf", bytes: 1_240_000, owner: "linh", updated: daysFromToday(-5, 14, 20) },
  { id: "b7", name: "Kickoff deck.key", bytes: 42_700_000, owner: "gia", updated: daysFromToday(-16, 11, 0) },
  { id: "b8", name: "Competitor audit.xlsx", bytes: 860_000, owner: "linh", updated: daysFromToday(-20, 17, 45) },
];
const fileMeta = (file: BrandFile) => `${formatBytes(file.bytes)} · ${people[file.owner].name} · ${formatRelative(file.updated)}`;

function FileViewsExample() {
  const [view, setView] = useState("grid");
  const [query, setQuery] = useState("");
  const shown = brandFiles.filter((file) => file.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Card theme="flat">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Brand refresh files</Heading>
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{`Saola Outdoor · ${plural(shown.length, "file")}`}</Text>
        </Stack>
        <Stack direction="row" justify="between" align="center" gap="xs">
          <Box className="px-segmented-search"><Search placeholder="Search files" value={query} onValueChange={setQuery} /></Box>
          {/* Icon-only segments: each option carries its own name, the icon is decorative. */}
          <Segmented className="px-segmented-hug" aria-label="Layout" value={view} onValueChange={setView} options={[
            { id: "grid", label: null, "aria-label": "Grid view", leading: <Icon name="icon-grid-01-line" decorative /> },
            { id: "list", label: null, "aria-label": "List view", leading: <Icon name="icon-list-line" decorative /> },
          ]} />
        </Stack>
        {!shown.length ? (
          <EmptyState illustration={false} headingLevel={5} title="No files match" secondaryAction={{ label: "Show all files", onClick: () => setQuery("") }}>
            {`No file name in Brand refresh contains “${query.trim()}”.`}
          </EmptyState>
        ) : view === "list" ? (
          <List aria-label="Brand refresh files">
            {shown.map((file) => (
              <ListItem key={file.id} title={file.name} caption={fileMeta(file)} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} />
            ))}
          </List>
        ) : (
          // Four previews a row on a desktop page, two on a phone.
          <Grid as="ul" aria-label="Brand refresh files" minColumnWidth="clamp(104px, 22%, 220px)" gap="md" className="px-segmented-tiles">
            {shown.map((file) => (
              <Stack as="li" key={file.id} gap="xs">
                {file.photo
                  ? <Image src={file.photo.src} alt={file.photo.alt} ratio="4:3" radius="md" />
                  : <Box surface="surface-alt" radius="md" className="px-segmented-preview"><FileIcon format={fileIconFormatOf(file.name)} size="3xl" /></Box>}
                <Stack gap="2xs">
                  <Text textStyle="Body/Small/Bold">{file.name}</Text>
                  <Text textStyle="Body/Small/Regular" tone="base">{`${formatBytes(file.bytes)} · ${formatRelative(file.updated)}`}</Text>
                </Stack>
              </Stack>
            ))}
          </Grid>
        )}
      </Stack>
    </Card>
  );
}

/* ───────────── Report period ───────────── */

type PeriodId = "month" | "quarter" | "year";
type Kpi = { value: string; trend: { direction: MetricTrendDirection; label: string } };
// The studio's shared months (the Metric and Chart pages show the same figures): invoiced Oct 2025 – Sep 2026 and
// billable hours per team, Apr – Sep 2026.
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const invoicedIn = (...ids: string[]) => sum(studioMonths.filter((month) => ids.includes(month.id)).map((month) => month.invoiced));
const hoursIn = (...labels: string[]) => sum(studioTeamHours.filter((month) => labels.includes(month.label)).map((month) => month.design + month.engineering + month.delivery + month.clientServices));
/** "+9% vs. August": the change rounded to whole percent, with a real minus sign. */
const change = (now: number, before: number, against: string): Kpi["trend"] => {
  const percent = Math.round((now / before - 1) * 100);
  return { direction: percent >= 0 ? "positive" : "negative", label: `${percent >= 0 ? "+" : "−"}${Math.abs(percent)}% vs. ${against}` };
};
const hoursValue = (hours: number) => `${hours.toLocaleString("en-US")} h`;
const ytdInvoiced = invoicedIn("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep");
const overview: Record<PeriodId, { range: string; hours: Kpi; utilisation: Kpi; invoiced: Kpi }> = {
  month: {
    range: "Sep 1 – Sep 30, 2026",
    hours: { value: hoursValue(hoursIn("Sep")), trend: change(hoursIn("Sep"), hoursIn("Aug"), "August") },
    utilisation: { value: "78%", trend: { direction: "negative", label: "−2 pts vs. August" } },
    invoiced: { value: formatMoney(invoicedIn("sep")), trend: change(invoicedIn("sep"), invoicedIn("aug"), "August") },
  },
  quarter: {
    range: "Jul 1 – Sep 30, 2026",
    hours: { value: hoursValue(hoursIn("Jul", "Aug", "Sep")), trend: change(hoursIn("Jul", "Aug", "Sep"), hoursIn("Apr", "May", "Jun"), "Q2") },
    utilisation: { value: "80%", trend: { direction: "positive", label: "+1 pt vs. Q2" } },
    invoiced: { value: formatMoney(invoicedIn("jul", "aug", "sep")), trend: change(invoicedIn("jul", "aug", "sep"), invoicedIn("apr", "may", "jun"), "Q2") },
  },
  // The months before April are not in the shared hours series; the year matches the Metric page.
  year: {
    range: "Jan 1 – Sep 30, 2026",
    hours: { value: "50,040 h", trend: { direction: "positive", label: "+5% vs. 2025" } },
    utilisation: { value: "77%", trend: { direction: "positive", label: "+3 pts vs. 2025" } },
    invoiced: { value: formatMoney(ytdInvoiced), trend: { direction: "positive", label: "+12% vs. 2025" } },
  },
};

function ReportPeriodExample() {
  const [period, setPeriod] = useState<PeriodId>("month");
  const headingId = useId();
  const data = overview[period];
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/4">Studio overview</Heading>
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{`All projects · ${data.range}`}</Text>
        </Stack>
        {/* One switch drives the whole strip; on a wide page it hugs its labels. */}
        <Segmented aria-label="Report period" value={period} onValueChange={(id) => setPeriod(id as PeriodId)} options={[
          { id: "month", label: "Month" },
          { id: "quarter", label: "Quarter" },
          { id: "year", label: "Year" },
        ]} />
      </Stack>
      <Grid minColumnWidth="clamp(220px, 30%, 100%)" gap="md">
        {/* Flat Surfaces on the stage's Canvas/Default: no border, no shadow (usage rules §16). */}
        <MetricCard theme="flat" label="Billable hours" value={data.hours.value} trend={data.hours.trend} icon="icon-clock-line" iconTheme="blue" />
        <MetricCard theme="flat" label="Utilisation" value={data.utilisation.value} trend={data.utilisation.trend} icon="icon-pie-chart-01-line" iconTheme="violet" />
        <MetricCard theme="flat" label="Invoiced" value={data.invoiced.value} trend={data.invoiced.trend} icon="icon-currency-dollar-circle-line" iconTheme="green" />
      </Grid>
    </Stack>
  );
}

/* ───────────── Open and resolved ───────────── */

type ReviewComment = { id: string; author: PersonId; text: string; resolved: boolean };
const reviewComments: ReviewComment[] = [
  { id: "c1", author: "ava", text: "Make the points balance bigger. It's what people look for first.", resolved: false },
  { id: "c2", author: "hana", text: "Phin & Co want the expiry date beside each reward.", resolved: false },
  { id: "c3", author: "bao", text: "The API returns 20 rows a page, so load more in twenties.", resolved: false },
  { id: "c4", author: "duy", text: "Add an empty state for new members.", resolved: true },
  { id: "c5", author: "alex", text: "Use Zen list rows for the history.", resolved: true },
];

function OpenResolvedExample() {
  const { toast } = useToast();
  const [comments, setComments] = useState(reviewComments);
  const [view, setView] = useState("open");
  const open = comments.filter((comment) => !comment.resolved).length;
  const resolved = comments.length - open;
  const shown = comments.filter((comment) => comment.resolved === (view === "resolved"));
  const areaRef = useRef<HTMLDivElement>(null);
  const setResolved = (id: string, value: boolean) => setComments((list) => list.map((comment) => comment.id === id ? { ...comment, resolved: value } : comment));
  const toggle = (comment: ReviewComment, index: number) => {
    setResolved(comment.id, !comment.resolved);
    toast({ title: comment.resolved ? "Comment reopened" : "Comment resolved", action: { label: "Undo", onClick: () => setResolved(comment.id, comment.resolved) } });
    // The row leaves this view with its button: focus moves to the next row's action, or the empty state's, never <body>.
    requestAnimationFrame(() => {
      const actions = [...(areaRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
      actions[Math.min(index, actions.length - 1)]?.focus();
    });
  };
  return (
    // A ListBox: title, caption and the view switch in its Header-Slot (stacked 16px), the comments in its Body-Slot.
    <ListBox className="px-segmented-card"
      header={<>
        <Stack gap="2xs">
          <Heading level={4} textStyle="Heading/Subheading">Comments</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Points history screen · Loyalty app</Text>
        </Stack>
        {/* Counters follow the data and disappear at zero. */}
        <Segmented fullWidth aria-label="Comments" value={view} onValueChange={setView} options={[
          { id: "open", label: "Open", badge: open || undefined },
          { id: "resolved", label: "Resolved", badge: resolved || undefined },
        ]} />
      </>}>
      <Box ref={areaRef}>
        {/* The list or its empty state: where focus goes when a row leaves. */}
        {shown.length ? (
          <List aria-label={view === "open" ? "Open comments" : "Resolved comments"}>
            {shown.map((comment, index) => {
              const author = people[comment.author];
              return (
                <ListItem key={comment.id} title={author.name} caption={comment.text} leading={<Avatar size="md" {...avatarOf(author)} />}
                  trailing={<IconButton appearance="flat" icon={comment.resolved ? "icon-reverse-left-line" : "icon-check-line"}
                    aria-label={`${comment.resolved ? "Reopen" : "Resolve"} comment from ${author.name}`} onClick={() => toggle(comment, index)} />} />
              );
            })}
          </List>
        ) : view === "open" ? (
          <EmptyState illustration={false} headingLevel={5} title="No open comments" secondaryAction={{ label: "Show resolved", onClick: () => setView("resolved") }}>
            Every comment on this screen is resolved.
          </EmptyState>
        ) : (
          <EmptyState illustration={false} headingLevel={5} title="No resolved comments yet" secondaryAction={{ label: "Show open", onClick: () => setView("open") }}>
            Comments you resolve move here.
          </EmptyState>
        )}
      </Box>
    </ListBox>
  );
}

/* ───────────── Billing period ───────────── */

type Billing = "monthly" | "yearly";
// The studio's plan, from the shared price list: Business, 48 seats, billed monthly today.
const plan = plans.find((item) => item.id === workspacePlan.plan)!;
const seats = workspacePlan.seats;
const seatPrice: Record<Billing, number> = { monthly: plan.seatMonthly, yearly: plan.seatYearly };
const renewal = daysFromToday(30);

function BillingPeriodExample() {
  const { toast } = useToast();
  const [billing, setBilling] = useState<Billing>(workspacePlan.billing);
  const [period, setPeriod] = useState<Billing>(workspacePlan.billing);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const moved = useRef(false);
  const per = period === "monthly" ? "a month" : "a year";
  const saving = seatPrice.monthly * 12 * seats - seatPrice.yearly * seats;
  // The switch previews the price; the submit commits it. Focus then lands on the line that confirms it.
  useEffect(() => { if (moved.current) statusRef.current?.focus(); moved.current = false; }, [billing]);
  const switchTo = (next: Billing, previous: Billing) => {
    moved.current = true;
    setBilling(next);
    setPeriod(next);
    toast({ type: "positive", title: "Billing period changed", action: { label: "Undo", onClick: () => { setBilling(previous); setPeriod(previous); } } });
  };
  return (
    <Card theme="flat" className="px-segmented-card">
      <Form onSubmit={() => switchTo(period, billing)} gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">{`${plan.name} plan`}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${studio.workspace} · ${plural(seats, "seat")}`}</Text>
        </Stack>
        {/* Primary: the period is the one decision on this card. */}
        <Box className="px-segmented-start">
          <Segmented level="primary" aria-label="Billing period" value={period} onValueChange={(id) => setPeriod(id as Billing)} options={[
            { id: "monthly", label: "Monthly" },
            { id: "yearly", label: "Yearly" },
          ]} />
        </Box>
        <DescriptionList items={[
          { term: "Per seat", description: `${formatMoney(seatPrice[period], true)} ${per}` },
          { term: "Seats", description: String(seats) },
          ...(period === "yearly" ? [{ term: "You save", description: `${formatMoney(saving, true)} a year` }] : []),
          { term: "Total", description: `${formatMoney(seatPrice[period] * seats, true)} ${per}`, emphasis: true },
        ]} />
        <Text ref={statusRef} tabIndex={-1} role="status" textStyle="Body/Small/Regular" tone="base">
          {period === billing ? `Billed ${billing}. Renews ${formatDate(renewal)}.` : `Billed ${period} from ${formatDate(renewal)}.`}
        </Text>
        {/* The actions appear once the preview differs from the plan: Cancel goes back, the submit commits. */}
        {period !== billing ? (
          <FormActions>
            <Button level="tertiary" onClick={() => { setPeriod(billing); statusRef.current?.focus(); }}>Cancel</Button>
            <Button level="primary" type="submit">{`Switch to ${period}`}</Button>
          </FormActions>
        ) : null}
      </Form>
    </Card>
  );
}

/* ───────────── Control bar on a phone ───────────── */

const teams: { name: Team; icon: IconName; theme: DockIconTheme }[] = [
  { name: "Design", icon: "icon-palette-line", theme: "pink" },
  { name: "Engineering", icon: "icon-code-02-line", theme: "blue" },
  { name: "Delivery", icon: "icon-rocket-line", theme: "orange" },
  { name: "Client Services", icon: "icon-briefcase-line", theme: "teal" },
  { name: "Operations", icon: "icon-settings-01-line", theme: "violet" },
];

function PhoneControlBarExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState("people");
  return (
    // The control bar stays pinned and moves up with the large title as the list scrolls under it.
    <PlatformPhone label="Team" headerOverlay screenRef={screenRef} header={
      <TopNavigation type="alt" title="Team" largeTitle="Team" scrollRef={screenRef}
        controlBar={<Segmented fullWidth aria-label="Team view" value={view} onValueChange={setView} options={[
          { id: "people", label: "People" },
          { id: "teams", label: "Teams" },
        ]} />} />
    }>
      {/* Rows pad 0 at the sides: the screen margin (lg, 20px) lines their text up with the control bar. */}
      <Box padding="lg">
        {view === "people" ? (
          <List aria-label="People">
            {peopleList.map((person) => (
              <ListItem key={person.id} title={person.name} caption={`${person.role} · ${person.location}`} leading={<Avatar size="md" {...avatarOf(person)} />} />
            ))}
          </List>
        ) : (
          <List aria-label="Teams">
            {teams.map((team) => {
              const members = peopleList.filter((person) => person.team === team.name);
              return (
                <ListItem key={team.name} title={team.name} caption={`${plural(members.length, "person", "people")} · ${members.map((person) => person.name.split(" ")[0]).join(", ")}`}
                  leading={<DockIcon icon={team.icon} theme={team.theme} background="subtle" size="md" />} />
              );
            })}
          </List>
        )}
      </Box>
    </PlatformPhone>
  );
}

/* ───────────── Periods on a phone ───────────── */

// Alex's logged days, newest first: September so far and all of August (Sep 2 is National Day, no work).
type DayLog = { date: Date; hours: number; projects: string[] };
const day = (offset: number, hours: number, ...projects: string[]): DayLog => ({ date: daysFromToday(offset), hours, projects });
const dayLogs: DayLog[] = [
  day(0, 2, "lumen-banking"), day(-1, 8.5, "lumen-banking", "zen-ds"), day(-2, 8, "lumen-banking", "saola-brand"),
  day(-5, 7.5, "zen-ds", "lumen-banking"), day(-6, 8, "lumen-banking"), day(-7, 9, "lumen-banking", "phin-loyalty"), day(-8, 8, "zen-ds"), day(-9, 7, "lumen-banking", "zen-ds"),
  day(-12, 8, "lumen-banking"), day(-13, 8.5, "lumen-banking", "saola-brand"), day(-14, 6, "zen-ds"), day(-15, 8, "lumen-banking", "zen-ds"), day(-16, 8, "lumen-banking"),
  day(-19, 7.5, "phin-loyalty", "zen-ds"), day(-20, 8, "lumen-banking"), day(-21, 8.5, "lumen-banking", "zen-ds"), day(-22, 8, "lumen-banking"), day(-23, 7, "zen-ds", "bookfair-site"),
  day(-26, 8, "bookfair-site", "lumen-banking"), day(-27, 6.5, "bookfair-site"), day(-29, 8, "bookfair-site", "zen-ds"),
  day(-30, 8, "lumen-banking", "zen-ds"),
  day(-33, 7.5, "lumen-banking"), day(-34, 8, "lumen-banking", "phin-loyalty"), day(-35, 8.5, "lumen-banking"), day(-36, 8, "zen-ds"), day(-37, 8, "lumen-banking", "zen-ds"),
  day(-40, 7, "lumen-banking"), day(-41, 8, "lumen-banking", "phin-loyalty"), day(-42, 8.5, "lumen-banking"), day(-43, 8, "lumen-banking", "zen-ds"), day(-44, 6, "lumen-banking"),
  day(-47, 8, "phin-loyalty", "zen-ds"), day(-48, 7.5, "phin-loyalty"), day(-49, 8, "zen-ds"), day(-50, 8, "phin-loyalty", "bookfair-site"), day(-51, 8.5, "bookfair-site", "zen-ds"),
  day(-54, 7, "zen-ds"), day(-55, 8, "phin-loyalty"), day(-56, 8, "phin-loyalty", "zen-ds"), day(-57, 8.5, "bookfair-site"), day(-58, 8, "zen-ds", "phin-loyalty"),
];
type HoursPeriod = "this-week" | "last-week" | "this-month" | "last-month";
const hourPeriods: { id: HoursPeriod; label: string; from: Date; to: Date }[] = [
  { id: "this-week", label: "This week", from: daysFromToday(-2, 0, 0), to: daysFromToday(4, 23, 59) },
  { id: "last-week", label: "Last week", from: daysFromToday(-9, 0, 0), to: daysFromToday(-3, 23, 59) },
  { id: "this-month", label: "This month", from: daysFromToday(-29, 0, 0), to: daysFromToday(0, 23, 59) },
  { id: "last-month", label: "Last month", from: daysFromToday(-60, 0, 0), to: daysFromToday(-30, 23, 59) },
];
const hoursLabel = (hours: number) => `${hours.toFixed(1)} h`;
const dayTitle = (date: Date) => `${date.toLocaleDateString("en-US", { weekday: "long" })}, ${formatDay(date)}`;

function PhonePeriodsExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [periodId, setPeriodId] = useState<HoursPeriod>("this-month");
  const headingId = useId();
  const period = hourPeriods.find((item) => item.id === periodId)!;
  const days = dayLogs.filter((log) => log.date >= period.from && log.date <= period.to);
  const total = days.reduce((sum, log) => sum + log.hours, 0);
  return (
    <PlatformPhone label="Hours" headerOverlay screenRef={screenRef} header={<TopNavigation type="alt" title="Hours" largeTitle="Hours" scrollRef={screenRef} />}>
      <Stack gap="lg" paddingY="xs">
        {/* Four periods don't fit a phone as equal segments: one row of single-choice chips that scrolls sideways. */}
        <Box className="px-segmented-chips" role="group" aria-label="Period">
          {hourPeriods.map((item) => (
            <Chip key={item.id} variant="normal" level="primary" selected={item.id === periodId} onClick={() => setPeriodId(item.id)}>
              {item.label}
            </Chip>
          ))}
        </Box>
        <Stack gap="xs" paddingX="lg">
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{formatRange(period.from, period.to)}</Text>
          <Metric size="md" label="Logged hours" value={hoursLabel(total)} icon="icon-clock-line" iconTheme="blue" />
        </Stack>
        {/* Rows pad 0 at the sides: the section's screen margin (lg, 20px) lines them up with its kicker. */}
        <Stack as="section" gap="xs" paddingX="lg" aria-labelledby={headingId}>
          <Heading level={2} id={headingId} textStyle="Body/Small/Bold" tone="light">By day</Heading>
          <List aria-labelledby={headingId}>
            {days.map((log) => (
              <ListItem key={log.date.toISOString()} title={dayTitle(log.date)} caption={log.projects.map((id) => projectById(id).name).join(" · ")}
                trailing={<Text as="span" textStyle="Body/Base/Medium" className="px-segmented-hours">{hoursLabel(log.hours)}</Text>} />
            ))}
          </List>
        </Stack>
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Grid or list view",
    description: "Two icon-only segments switch the same files between previews and rows. Each option carries its own aria-label (the icon is decorative), so a screen reader hears “Grid view, pressed”; Tab reaches each segment and Enter or Space picks it.",
    wide: true,
    render: () => <FileViewsExample />,
    code: `const [view, setView] = useState("grid");

<Heading level={4} textStyle="Heading/Subheading">Brand refresh files</Heading>
<Text role="status">{\`Saola Outdoor · \${plural(shown.length, "file")}\`}</Text>
<Stack direction="row" justify="between" align="center" gap="xs">
  <Box className="toolbar-search"><Search placeholder="Search files" value={query} onValueChange={setQuery} /></Box>
  {/* .view-switch { flex: none }: beside a shrinking Search the two icons keep their width. */}
  <Segmented className="view-switch" aria-label="Layout" value={view} onValueChange={setView} options={[
    { id: "grid", label: null, "aria-label": "Grid view", leading: <Icon name="icon-grid-01-line" decorative /> },
    { id: "list", label: null, "aria-label": "List view", leading: <Icon name="icon-list-line" decorative /> },
  ]} />
</Stack>

{view === "list"
  ? <List aria-label="Brand refresh files">{/* ListItem + FileIcon */}</List>
  : <Grid as="ul" aria-label="Brand refresh files" minColumnWidth="clamp(104px, 22%, 220px)">{/* Image previews */}</Grid>}`,
  },
  {
    title: "Report period",
    description: "One Secondary switch changes the period of every metric in the strip. On a wide page it hugs its three labels, and the range line under the title announces the new period.",
    wide: true,
    render: () => <ReportPeriodExample />,
    code: `const [period, setPeriod] = useState("month");

<Heading level={4} textStyle="Heading/4">Studio overview</Heading>
<Text role="status">{\`All projects · \${overview[period].range}\`}</Text>
<Segmented aria-label="Report period" value={period} onValueChange={setPeriod} options={[
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
]} />

<Grid minColumnWidth="clamp(220px, 30%, 100%)" gap="md">
  <MetricCard theme="flat" label="Billable hours" value={data.hours.value} trend={data.hours.trend}
    icon="icon-clock-line" iconTheme="blue" />
  {/* Utilisation, Invoiced */}
</Grid>`,
  },
  {
    title: "Open and resolved",
    description: "Each segment counts its comments, and a counter disappears at zero. In a narrow panel the switch fills the width; resolving the last open comment leaves an empty state with a way to the resolved ones.",
    render: () => <OpenResolvedExample />,
    code: `<ListBox header={<>
  {/* title + caption */}
  <Segmented fullWidth aria-label="Comments" value={view} onValueChange={setView} options={[
    { id: "open", label: "Open", badge: open || undefined },
    { id: "resolved", label: "Resolved", badge: resolved || undefined },
  ]} />
</>}>
  <List aria-label={view === "open" ? "Open comments" : "Resolved comments"}>
    {shown.map((comment) => (
      <ListItem key={comment.id} title={author.name} caption={comment.text}
        leading={<Avatar size="md" {...avatarOf(author)} />}
        trailing={<IconButton appearance="flat" icon="icon-check-line"
          aria-label={\`Resolve comment from \${author.name}\`} onClick={() => toggle(comment)} />} />
    ))}
  </List>
</ListBox>`,
  },
  {
    title: "Billing period",
    description: "Primary gives the switch more weight when it is the card's one decision. It only previews the price; the form's submit, Switch to yearly, commits it and a Toast offers Undo, while Cancel goes back to the current period.",
    render: () => <BillingPeriodExample />,
    code: `const [billing, setBilling] = useState("monthly"); // what the workspace pays today
const [period, setPeriod] = useState("monthly");   // what the switch previews

<Form onSubmit={() => switchTo(period)} gap="md">
  <Segmented level="primary" aria-label="Billing period" value={period} onValueChange={setPeriod} options={[
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly" },
  ]} />
  <DescriptionList items={[
    { term: "Per seat", description: \`\${formatMoney(seatPrice[period], true)} \${per}\` },
    { term: "Total", description: \`\${formatMoney(seatPrice[period] * seats, true)} \${per}\`, emphasis: true },
  ]} />
  {period !== billing ? (
    <FormActions>
      <Button level="tertiary" onClick={() => setPeriod(billing)}>Cancel</Button>
      <Button level="primary" type="submit">{\`Switch to \${period}\`}</Button>
    </FormActions>
  ) : null}
</Form>`,
  },
  {
    title: "Control bar on a phone",
    description: "Under a phone's large title, the switch sits in the Top Navigation control bar and fills it, so People and Teams share the width equally and never slide. It stays pinned while the title folds away.",
    render: () => <PhoneControlBarExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone headerOverlay screenRef={screenRef} header={
  <TopNavigation type="alt" title="Team" largeTitle="Team" scrollRef={screenRef}
    controlBar={<Segmented fullWidth aria-label="Team view" value={view} onValueChange={setView} options={[
      { id: "people", label: "People" },
      { id: "teams", label: "Teams" },
    ]} />} />
}>
  <Box padding="lg">
    {view === "people"
      ? <List aria-label="People">{/* Avatar rows */}</List>
      : <List aria-label="Teams">{/* Dock Icon rows */}</List>}
  </Box>
</PlatformPhone>`,
  },
  {
    title: "Periods on a phone",
    description: "Four periods are wider than a phone, so they are not a Segmented: a row of Normal chips scrolls sideways, and only one is on, so the chips are Primary: the pressed one takes the Selected fill. The total and the logged days follow the choice.",
    render: () => <PhonePeriodsExample />,
    code: `<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Hours" largeTitle="Hours" scrollRef={screenRef} />}>
  <Stack gap="lg" paddingY="xs">
    <div className="chip-row" role="group" aria-label="Period"> {/* flex; nowrap; overflow-x: auto; the screen margin inline */}
      {periods.map((item) => (
        <Chip key={item.id} variant="normal" level="primary"
          selected={item.id === periodId} onClick={() => setPeriodId(item.id)}>
          {item.label}
        </Chip>
      ))}
    </div>
    <Stack gap="xs" paddingX="lg">
      <Text role="status">{formatRange(period.from, period.to)}</Text>
      <Metric size="md" label="Logged hours" value={hoursLabel(total)} icon="icon-clock-line" iconTheme="blue" />
    </Stack>
    {/* Rows pad 0 at the sides: the screen margin (lg, 20px) insets them, in line with the kicker */}
    <Stack as="section" gap="xs" paddingX="lg" aria-labelledby="by-day">
      <Heading level={2} id="by-day" textStyle="Body/Small/Bold" tone="light">By day</Heading>
      <List aria-labelledby="by-day">{/* a row per logged day */}</List>
    </Stack>
  </Stack>
</PlatformPhone>`,
  },
]);
