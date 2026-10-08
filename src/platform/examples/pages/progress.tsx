/* Progress examples (docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio runs its work in Zen; the phone
   example is the loyalty app the studio builds for Phin & Co. */
import { useEffect, useId, useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { FormFieldset } from "../../../components/Form";
import { Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { ProgressBar, ProgressCircle } from "../../../components/Progress";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PlatformPhone } from "../../PlatformPhone";
import { TODAY, daysFromToday, formatDate, formatMoney, formatRange, formatRelative, people, plans, projectById, workspacePlan } from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./progress.css";

export const page: PlatformPage = "progress";

/* ───────────── Storage quota ───────────── */

/** The workspace's plan (Business, 48 seats) comes with 50 GB. */
const planName = plans.find((plan) => plan.id === workspacePlan.plan)!.name;
const PLAN_GB = 50;
/** Everything else in the workspace: many small files. */
const SMALL_FILES_GB = 13.4;
type LargeFile = { id: string; name: string; gb: number; project: string };
const largestFiles: LargeFile[] = [
  { id: "video", name: "Launch film.mov", gb: 18.6, project: "Book Fair 2026 website" },
  { id: "raw", name: "Raw photos.zip", gb: 9.2, project: "Brand refresh" },
  { id: "sessions", name: "Usability sessions.mp4", gb: 6.4, project: "Online banking redesign" },
];
const gb = (n: number) => `${n.toFixed(1)} GB`;

function StorageQuotaExample() {
  const { toast } = useToast();
  const titleId = useId();
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [files, setFiles] = useState(largestFiles);
  const used = SMALL_FILES_GB + files.reduce((sum, file) => sum + file.gb, 0);
  const percent = (used / PLAN_GB) * 100;
  const remove = (file: LargeFile) => {
    const index = files.indexOf(file);
    setFiles((list) => list.filter((f) => f.id !== file.id));
    // The row leaves with its button: focus moves to the Delete button now in its place (or the one above), and to
    // the list heading once the list is empty, never to <body>.
    window.requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button");
      (buttons?.length ? buttons[Math.min(index, buttons.length - 1)] : headingRef.current)?.focus();
    });
    // Undo puts the file back in its old place.
    const restore = () => setFiles((list) => largestFiles.filter((f) => f.id === file.id || list.some((x) => x.id === f.id)));
    toast({ title: "File deleted", children: `${gb(file.gb)} freed`, action: { label: "Undo", onClick: restore } });
  };
  return (
    <Card theme="flat" as="section" aria-labelledby={titleId}>
      {/* Header group → file list: blocks of one surface (md); each block keeps its label close (xs). */}
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Storage</Heading>
          <ProgressBar value={percent} theme="status" scale="quota" label={`${used.toFixed(1)} of ${PLAN_GB} GB`} aria-label="Storage used" />
          <Text textStyle="Body/Small/Regular" tone="base">
            {percent >= 90 ? `${gb(PLAN_GB - used)} left. Uploads stop when storage is full.` : `${gb(PLAN_GB - used)} left on the ${planName} plan.`}
          </Text>
        </Stack>
        <Stack gap="xs">
          <Heading ref={headingRef} tabIndex={-1} className="px-progress-focus-target" level={5} id={listId} textStyle="Body/Small/Bold" tone="light">Largest files</Heading>
          {files.length ? (
            <List ref={listRef} aria-labelledby={listId}>
              {files.map((file) => (
                <ListItem key={file.id} title={file.name} titleLines={2} caption={`${gb(file.gb)} · ${file.project}`}
                  leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
                  trailing={<IconButton appearance="flat" size="md" icon="icon-trash-line" aria-label={`Delete ${file.name}`} onClick={() => remove(file)} />} />
              ))}
            </List>
          ) : <EmptyState headingLevel={6} illustration={false} title="No large files">Every file left is under 1 GB.</EmptyState>}
        </Stack>
      </Stack>
    </Card>
  );
}

/* ───────────── Setup checklist ───────────── */

/** Brand refresh for Saola Outdoor: still Planning, kickoff on its start date. */
const brandRefresh = projectById("saola-brand");
const team = brandRefresh.members.map((id) => people[id].name);
const kickoff = formatDate(brandRefresh.start);
const setupSteps = [
  { id: "contacts", label: "Add the client contacts", caption: `Who signs off at ${brandRefresh.client}` },
  { id: "team", label: "Invite the project team", caption: `${team.slice(0, -1).join(", ")} and ${team[team.length - 1]}` },
  { id: "budget", label: "Set the budget", caption: `${formatMoney(brandRefresh.budget)} fixed fee` },
  { id: "brief", label: "Upload the brief", caption: "PDF or Keynote, up to 100 MB" },
  { id: "kickoff", label: "Schedule the kickoff", caption: `${kickoff} in Ho Chi Minh City` },
];

function SetupChecklistExample() {
  const titleId = useId();
  const [done, setDone] = useState(["contacts", "team"]);
  const ready = done.length === setupSteps.length;
  const toggle = (id: string, checked: boolean) => setDone((list) => (checked ? [...list, id] : list.filter((x) => x !== id)));
  return (
    <Card theme="flat" as="section" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">{`Get ${brandRefresh.name} ready`}</Heading>
          {/* The caption doubles as the live status: it changes once every step is done. */}
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{ready ? `Ready for the kickoff on ${kickoff}` : `${brandRefresh.client} · Kickoff on ${kickoff}`}</Text>
        </Stack>
        {/* Neutral while in progress; Status (green) once complete. */}
        <ProgressBar value={(done.length / setupSteps.length) * 100} theme={ready ? "status" : "neutral"} label={`${done.length} of ${setupSteps.length} steps`} aria-label="Project setup" />
        <FormFieldset legend="Setup steps" hideLegend kind="checkbox">
          {setupSteps.map((step) => (
            <Checkbox key={step.id} label={step.label} caption={step.caption} checked={done.includes(step.id)} onCheckedChange={(checked) => toggle(step.id, checked)} />
          ))}
        </FormFieldset>
      </Stack>
    </Card>
  );
}

/* ───────────── Background export ───────────── */

type ExportFile = { id: string; name: string; size: string; at: Date };
const EXPORT_NAME = "q3-time-report.csv";
const earlierExports: ExportFile[] = [
  { id: "aug", name: "aug-time-report.csv", size: "740 KB", at: daysFromToday(-29, 17, 2) },
  { id: "q2", name: "q2-time-report.csv", size: "2.1 MB", at: daysFromToday(-91, 9, 14) },
];

function BackgroundExportExample() {
  const { toast } = useToast();
  const titleId = useId();
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const exportRef = useRef<HTMLButtonElement>(null);
  const [exports, setExports] = useState(earlierExports);
  const [percent, setPercent] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const running = percent !== null;

  // A demo job: about six seconds of work, then a short save step so the bar never sits at 100% unexplained.
  useEffect(() => {
    if (percent === null) return undefined;
    if (percent < 100) {
      const timer = window.setTimeout(() => setPercent((p) => (p === null ? p : Math.min(100, p + 4))), 250);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      const id = `q3-${Date.now()}`;
      setExports((list) => [{ id, name: EXPORT_NAME, size: "2.3 MB", at: TODAY }, ...list]);
      setPercent(null);
      setAnnouncement("Export ready");
      toast({ type: "positive", title: "Export ready", children: `${EXPORT_NAME} · 2.3 MB`, action: { label: "View", onClick: () => view(id) } });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [percent]);

  const start = () => { setPercent(0); setAnnouncement("Export started"); };
  // Cancel leaves with its row: focus goes back to Export CSV, which is enabled again, not to <body>.
  const cancel = () => { setPercent(null); setAnnouncement("Export cancelled"); window.requestAnimationFrame(() => exportRef.current?.focus()); };
  // View: put focus on the new file's Download button (the rows are Interactive=No: their only action is Download).
  const view = (id: string) => {
    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-export="${id}"] button`)?.focus());
  };
  const secondsLeft = percent === null ? 0 : Math.ceil((100 - percent) / 16);

  return (
    // A ListBox: the title and Export CSV in its Header-Slot; the Exports kicker xs above the export rows in its Body-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack direction="row" gap="sm" justify="between" align="start" wrap>
        <Stack gap="2xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Q3 time report</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${formatRange(daysFromToday(-91), TODAY)} · ${plural(workspacePlan.seats, "person", "people")}`}</Text>
        </Stack>
        <Button ref={exportRef} level="tertiary" startIcon="icon-download-01-line" disabled={running} onClick={start}>Export CSV</Button>
      </Stack>}>
      <Stack gap="xs">
      <Heading level={5} id={listId} textStyle="Body/Small/Bold" tone="light">Exports</Heading>
      <List ref={listRef} aria-labelledby={listId}>
        {running ? (
          <ListItem title={EXPORT_NAME} leading={<FileIcon format="sheet" size="xl" />}
            trailing={<IconButton appearance="flat" size="md" icon="icon-x-line" aria-label="Cancel export" onClick={cancel} />}>
            <Stack gap="2xs">
              <Text as="span" textStyle="Body/Base/Bold" truncate>{EXPORT_NAME}</Text>
              <ProgressBar value={percent} theme="accent" label={`${percent}%`} aria-label={`Exporting ${EXPORT_NAME}`} />
              <Text as="span" textStyle="Body/Small/Regular" tone="light">{percent < 100 ? `About ${plural(secondsLeft, "second")} left` : "Saving the file…"}</Text>
            </Stack>
          </ListItem>
        ) : null}
        {exports.map((file) => (
          <ListItem key={file.id} data-export={file.id} title={file.name} titleLines={2} caption={`${file.size} · ${formatRelative(file.at)}`}
            leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
            trailing={<IconButton appearance="flat" size="md" icon="icon-download-01-line" aria-label={`Download ${file.name}`} onClick={() => toast({ title: "Download started", children: file.name })} />} />
        ))}
      </List>
      </Stack>
      {/* Out of the flow (absolutely positioned), so it adds no gap under the rows. */}
      <VisuallyHidden role="status">{announcement}</VisuallyHidden>
    </ListBox>
  );
}

/* ───────────── Milestones ───────────── */

/** The Loyalty app from its start to its due date; 50 of its 78 tasks are done, the project's 64%. */
const loyaltyApp = projectById("phin-loyalty");
const milestones = [
  { id: "discovery", title: "Discovery", start: loyaltyApp.start, end: daysFromToday(-49), done: 12, total: 12 },
  { id: "design", title: "Design", start: daysFromToday(-48), end: daysFromToday(-6), done: 18, total: 18 },
  { id: "build", title: "Build", start: daysFromToday(-20), end: daysFromToday(19), done: 18, total: 34 },
  { id: "beta", title: "Member beta", start: daysFromToday(20), end: daysFromToday(28), done: 2, total: 8 },
  { id: "launch", title: "Launch", start: daysFromToday(29), end: loyaltyApp.due, done: 0, total: 6 },
];

function MilestonesExample() {
  const titleId = useId();
  return (
    // A ListBox: the title and project in its Header-Slot, one row per milestone in its Body-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack gap="2xs">
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">Milestones</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{`${loyaltyApp.name} · ${loyaltyApp.client}`}</Text>
      </Stack>}>
      <List aria-labelledby={titleId}>
        {milestones.map((m) => {
          const percent = Math.round((m.done / m.total) * 100);
          return (
            <ListItem key={m.id} title={m.title} caption={`${formatRange(m.start, m.end)} · ${m.done} of ${plural(m.total, "task")}`}
              trailing={<ProgressCircle className="px-progress-circle-column" value={percent} label={`${percent}%`} aria-label={`${m.title} progress`} />} />
          );
        })}
      </List>
    </ListBox>
  );
}

/* ───────────── Mobile: loyalty stamps ───────────── */

const STAMPS_FOR_REWARD = 10;
type Visit = { id: string; title: string; at: Date; change: string };
// Newest first: 8 stamps since the last free drink, then the visits that filled the card before it.
const recentVisits: Visit[] = [
  { id: "v12", title: "Phin sữa đá · Nguyen Hue", at: daysFromToday(-1, 8, 12), change: "+1 stamp" },
  { id: "v11", title: "Bạc xỉu · Thao Dien", at: daysFromToday(-3, 7, 48), change: "+1 stamp" },
  { id: "v10", title: "Cold brew · Nguyen Hue", at: daysFromToday(-6, 15, 30), change: "+1 stamp" },
  { id: "v9", title: "Cà phê muối · Ben Thanh", at: daysFromToday(-8, 9, 5), change: "+1 stamp" },
  { id: "v8", title: "Phin sữa đá · Nguyen Hue", at: daysFromToday(-10, 8, 20), change: "+1 stamp" },
  { id: "v7", title: "Trà đào cam sả · Thao Dien", at: daysFromToday(-13, 16, 10), change: "+1 stamp" },
  { id: "v6", title: "Bạc xỉu · Nguyen Hue", at: daysFromToday(-15, 8, 5), change: "+1 stamp" },
  { id: "v5", title: "Cà phê dừa · Ben Thanh", at: daysFromToday(-17, 14, 40), change: "+1 stamp" },
  { id: "r1", title: "Free drink redeemed · Nguyen Hue", at: daysFromToday(-20, 8, 30), change: `−${STAMPS_FOR_REWARD} stamps` },
  { id: "v3", title: "Phin sữa đá · Nguyen Hue", at: daysFromToday(-22, 8, 15), change: "+1 stamp" },
  { id: "v2", title: "Cold brew · Thao Dien", at: daysFromToday(-24, 15, 0), change: "+1 stamp" },
  { id: "v1", title: "Bạc xỉu · Nguyen Hue", at: daysFromToday(-27, 7, 55), change: "+1 stamp" },
];

function LoyaltyStampsExample() {
  const cardTitleId = useId();
  const visitsId = useId();
  const screenRef = useRef<HTMLDivElement>(null);
  const [stamps, setStamps] = useState(8);
  const [visits, setVisits] = useState(recentVisits);
  const full = stamps >= STAMPS_FOR_REWARD;
  const scan = () => {
    setStamps((n) => Math.min(STAMPS_FOR_REWARD, n + 1));
    setVisits((list) => [{ id: `v${Date.now()}`, title: "Phin sữa đá · Nguyen Hue", at: TODAY, change: "+1 stamp" }, ...list]);
  };
  const redeem = () => {
    setStamps(0);
    setVisits((list) => [{ id: `r${Date.now()}`, title: "Free drink redeemed · Nguyen Hue", at: TODAY, change: `−${STAMPS_FOR_REWARD} stamps` }, ...list]);
  };
  return (
    // The header floats over the screen (headerOverlay) so the large title folds as the visits scroll under it.
    <PlatformPhone label="Phin & Co rewards" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Rewards" largeTitle="Rewards" scrollRef={screenRef} />}
      footer={<ActionBar position="static" primaryAction={full
        ? { label: "Redeem free drink", onClick: redeem }
        : { label: "Scan receipt", startIcon: "icon-scan-line", onClick: scan }} />}>
      {/* Body padding lg (20) = the bar's margin; the reward card and the visits are sections of the screen (lg). */}
      <Stack gap="lg" padding="lg">
        <Card theme="flat" as="section" aria-labelledby={cardTitleId}>
          <Stack gap="md">
            <Stack gap="xs">
              <Heading level={2} id={cardTitleId} textStyle="Heading/Subheading">Free drink</Heading>
              <Text textStyle="Body/Small/Regular" tone="base">Any drink, any size</Text>
            </Stack>
            {/* Accent while collecting; Status (green) once the reward is ready. */}
            <ProgressBar value={(stamps / STAMPS_FOR_REWARD) * 100} theme={full ? "status" : "accent"} label={`${stamps} of ${STAMPS_FOR_REWARD} stamps`} aria-label="Stamps collected" />
            <Text role="status" textStyle="Body/Small/Regular" tone="base">
              {full ? "Your free drink is ready. Show this screen at the counter." : `${plural(STAMPS_FOR_REWARD - stamps, "more stamp")} for a free drink.`}
            </Text>
          </Stack>
        </Card>
        <Stack gap="xs">
          <Heading level={2} id={visitsId} textStyle="Body/Small/Bold" tone="light">Recent visits</Heading>
          <List aria-labelledby={visitsId}>
            {visits.map((visit) => (
              <ListItem key={visit.id} title={visit.title} caption={formatRelative(visit.at)}
                leading={<DockIcon icon={visit.change.startsWith("+") ? "icon-coffee-cup-line" : "icon-gift-01-line"} theme="orange" background="subtle" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{visit.change}</Text>} />
            ))}
          </List>
        </Stack>
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Storage quota",
    description: "Workspace storage uses the Status theme on the quota scale: green while there is room, Warning from 75% and Negative from 90%. Deleting a large file frees space at once, and Undo puts it back.",
    render: () => <StorageQuotaExample />,
    code: `const used = smallFilesGb + files.reduce((sum, file) => sum + file.gb, 0);

<ProgressBar value={(used / 50) * 100} theme="status" scale="quota"
  label={\`\${used.toFixed(1)} of 50 GB\`} aria-label="Storage used" />
<List aria-labelledby={listId}>
  {files.map((file) => (
    <ListItem key={file.id} title={file.name} titleLines={2} caption={\`\${gb(file.gb)} · \${file.project}\`}
      leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
      trailing={<IconButton appearance="flat" size="md" icon="icon-trash-line"
        aria-label={\`Delete \${file.name}\`} onClick={() => remove(file)} />} />
  ))}
</List>

// remove(): delete, then offer Undo
toast({ title: "File deleted", children: \`\${gb(file.gb)} freed\`, action: { label: "Undo", onClick: restore } });`,
  },
  {
    title: "Background export",
    description: "A long export runs as a row in the list with an Accent bar, the time left and Cancel, so people keep working. At 100% the caption says what is still happening; a toast with View announces the file.",
    render: () => <BackgroundExportExample />,
    code: `<ListBox as="section" aria-labelledby={titleId}
  header={<Stack direction="row" gap="sm" justify="between" align="start" wrap>
    <Stack gap="2xs">
      <Heading level={4} id={titleId} textStyle="Heading/Subheading">Q3 time report</Heading>
      <Text textStyle="Body/Small/Regular" tone="base">{\`\${formatRange(quarterStart, TODAY)} · \${plural(seats, "person", "people")}\`}</Text>
    </Stack>
    <Button level="tertiary" startIcon="icon-download-01-line" disabled={running} onClick={start}>Export CSV</Button>
  </Stack>}>
  {/* Kicker → rows xs */}
  <Stack gap="xs">
  <Heading level={5} id={listId} textStyle="Body/Small/Bold" tone="light">Exports</Heading>
  <List aria-labelledby={listId}>
    {running ? (
      <ListItem title={name} leading={<FileIcon format="sheet" size="xl" />}
        trailing={<IconButton appearance="flat" size="md" icon="icon-x-line" aria-label="Cancel export" onClick={cancel} />}>
        <Text as="span" textStyle="Body/Base/Bold" truncate>{name}</Text>
        <ProgressBar value={percent} theme="accent" label={\`\${percent}%\`} aria-label={\`Exporting \${name}\`} />
        <Text as="span" textStyle="Body/Small/Regular" tone="light">
          {percent < 100 ? \`About \${plural(secondsLeft, "second")} left\` : "Saving the file…"}
        </Text>
      </ListItem>
    ) : null}
    {/* then a ListItem per earlier export, its Download button trailing */}
  </List>
  </Stack>
</ListBox>

// when the job finishes
toast({ type: "positive", title: "Export ready", children: \`\${name} · 2.3 MB\`, action: { label: "View", onClick: () => view(id) } });`,
  },
  {
    title: "Setup checklist",
    description: "A neutral bar counts finished steps in the unit people think in (“2 of 5 steps”). Ticking the last step turns it to the Status theme, and the caption says the project is ready.",
    render: () => <SetupChecklistExample />,
    code: `const ready = done.length === steps.length;

<Text role="status" textStyle="Body/Small/Regular" tone="base">
  {ready ? "Ready for the kickoff on Oct 12, 2026" : "Saola Outdoor · Kickoff on Oct 12, 2026"}
</Text>
<ProgressBar value={(done.length / steps.length) * 100} theme={ready ? "status" : "neutral"}
  label={\`\${done.length} of \${steps.length} steps\`} aria-label="Project setup" />
<FormFieldset legend="Setup steps" hideLegend kind="checkbox">
  {steps.map((step) => (
    <Checkbox key={step.id} label={step.label} caption={step.caption}
      checked={done.includes(step.id)} onCheckedChange={(checked) => toggle(step.id, checked)} />
  ))}
</FormFieldset>`,
  },
  {
    title: "Milestones",
    description: "Progress-Circle fits a list row where a bar would crowd the text: one theme for every row, the percentage as its label, and a Done check at 100%. The caption gives the count behind it.",
    render: () => <MilestonesExample />,
    code: `<ListBox as="section" aria-labelledby={titleId}
  header={<Stack gap="2xs">
    <Heading level={4} id={titleId} textStyle="Heading/Subheading">Milestones</Heading>
    <Text textStyle="Body/Small/Regular" tone="base">{\`\${project.name} · \${project.client}\`}</Text>
  </Stack>}>
  <List aria-labelledby={titleId}>
    {milestones.map((m) => {
      const percent = Math.round((m.done / m.total) * 100);
      return (
        <ListItem key={m.id} title={m.title}
          caption={\`\${formatRange(m.start, m.end)} · \${m.done} of \${plural(m.total, "task")}\`}
          trailing={<ProgressCircle className="circle-column" value={percent} label={\`\${percent}%\`}
            aria-label={\`\${m.title} progress\`} />} />
      );
    })}
  </List>
</ListBox>

/* The circles line up and the percentages right-align down the column */
.circle-column { min-inline-size: 7ch; justify-content: space-between; }`,
  },
  {
    title: "Loyalty stamps",
    description: "On a phone the bar shows progress towards a reward: Accent while collecting, Status once it is ready. Scan receipt adds a stamp and a visit; at 10 the footer offers Redeem free drink, which starts a new card.",
    render: () => <LoyaltyStampsExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Rewards" largeTitle="Rewards" scrollRef={screenRef} />}
  footer={<ActionBar position="static" primaryAction={full
    ? { label: "Redeem free drink", onClick: redeem }
    : { label: "Scan receipt", startIcon: "icon-scan-line", onClick: scan }} />}>
  <ProgressBar value={(stamps / 10) * 100} theme={full ? "status" : "accent"}
    label={\`\${stamps} of 10 stamps\`} aria-label="Stamps collected" />
  <Text role="status" textStyle="Body/Small/Regular" tone="base">
    {full ? "Your free drink is ready. Show this screen at the counter." : \`\${plural(10 - stamps, "more stamp")} for a free drink.\`}
  </Text>
  <List aria-labelledby={visitsId}>{/* recent visits, newest first */}</List>
</PlatformPhone>`
  },
]);
