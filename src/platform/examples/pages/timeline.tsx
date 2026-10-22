import { useRef, useState } from "react";
import { Card } from "../../../components/Card";
import { Stack } from "../../../components/Layout";
import { Heading, Text } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import {
  TimelineActivity, TimelineGantt, TimelineMilestones,
  type TimelineEntryData, type TimelineGroupData, type TimelineMilestoneData, type TimelineTaskData,
} from "../../../components/Timeline";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { people } from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "timeline";

// ——— Data: Đìzai Studio on Wednesday 30 September 2026 ———————————————————————————————————————————————————————————

const TODAY = "2026-09-30";

const entries: TimelineEntryData[] = [
  { id: "approve", at: "2026-09-30T10:42", actor: "Maya Chen", title: "approved your leave request", description: "Annual leave · Oct 12 – Oct 16", marker: { kind: "avatar", avatarName: "Maya Chen", tone: "positive" } },
  { id: "comment", at: "2026-09-30T09:15", actor: "Linh Tran", title: "commented on Q4 roadmap", attachment: "Can we move the review to Thursday? The client asked for one more day.", marker: { kind: "icon", tone: "accent" } },
  { id: "moved", at: "2026-09-30T08:50", actor: "Alex Duong", title: "moved Public launch to Nov 16", description: "Moved the launch one week after the beta feedback.", marker: { kind: "avatar", avatarName: "Alex Duong", avatarSrc: people.alex.photo } },
  { id: "shared", at: "2026-09-29T17:30", actor: "Zen Studio", title: "shared the design file", description: "Shared with 12 people at Lotus Bank", marker: { kind: "icon", tone: "neutral" } },
  { id: "created", at: "2026-09-29T09:00", actor: "Bao Nguyen", title: "created the project", marker: { kind: "avatar", avatarName: "Bao Nguyen" } },
  { id: "rejected", at: "2026-09-25T14:10", actor: "Finance", title: "rejected the invoice draft", description: "Missing purchase order number", marker: { kind: "icon", tone: "negative" } },
];

const billing: TimelineEntryData[] = [
  { id: "retry", at: "2026-09-30T11:20", actor: "Finance", title: "retried the payment", description: "Paid · $12,000.00 to Saola Outdoor", marker: { kind: "icon", tone: "positive" } },
  { id: "failed", at: "2026-09-30T09:05", actor: "Finance", title: "payment failed for INV-2026-0143", description: "The bank declined the transfer; retry after 11:00", marker: { kind: "icon", tone: "negative" } },
  { id: "pending", at: "2026-09-29T16:40", actor: "Legal", title: "contract review is pending", description: "Due Oct 2 · Lan Vu signs off", marker: { kind: "icon", tone: "warning" } },
  { id: "sent", at: "2026-09-29T10:15", actor: "Alex Duong", title: "sent the contract for review", marker: { kind: "avatar", avatarName: "Alex Duong", avatarSrc: people.alex.photo } },
];

const milestones: TimelineMilestoneData[] = [
  { id: "kickoff", date: "2026-08-03", title: "Kickoff" },
  { id: "research", date: "2026-08-28", title: "Research wrap-up" },
  { id: "signoff", date: "2026-09-25", title: "Design sign-off" },
  { id: "beta", date: "2026-10-23", title: "Beta launch", description: "Invite 40 studio clients" },
  { id: "launch", date: "2026-11-16", title: "Public launch" },
  { id: "retro", date: "2026-12-04", title: "Retrospective" },
];

const groups: TimelineGroupData[] = [
  { id: "research", name: "Research", tasks: [
    { id: "interviews", name: "User interviews", start: "2026-08-31", end: "2026-09-12", color: "violet", assignee: { alt: "Chi Tran" } },
    { id: "audit", name: "Competitor audit", start: "2026-09-07", end: "2026-09-19", color: "violet", assignee: { alt: "Bao Nguyen" } },
  ] },
  { id: "design", name: "Design", tasks: [
    { id: "wireframes", name: "Wireframes", start: "2026-09-14", end: "2026-09-26", assignee: { alt: "Alex Duong", src: people.alex.photo } },
    { id: "ui", name: "UI design", start: "2026-09-21", end: "2026-10-10", assignee: { alt: "Alex Duong", src: people.alex.photo } },
    { id: "signoff", name: "Design sign-off", start: "2026-10-09", kind: "milestone" },
  ] },
  { id: "build", name: "Build", tasks: [
    { id: "frontend", name: "Frontend", start: "2026-09-28", end: "2026-10-17", color: "teal", assignee: { alt: "Linh Tran" } },
    { id: "qa", name: "QA & fixes", start: "2026-10-12", end: "2026-10-24", color: "orange", assignee: { alt: "Minh Vo" } },
    { id: "beta", name: "Beta launch", start: "2026-10-23", kind: "milestone" },
  ] },
];

// ——— Examples ————————————————————————————————————————————————————————————————————————————————————————————————————

function RoadmapExample() {
  const [open, setOpen] = useState<TimelineTaskData | null>(null);
  return (
    <Stack gap="md">
      <TimelineGantt groups={groups} start="2026-08-31" today={TODAY} aria-label="Lotus banking redesign" onTaskClick={(task) => setOpen(task)} />
      <Text tone="light" aria-live="polite">{open ? `${open.name}${open.kind === "milestone" ? " (milestone)" : ""}` : "Select a bar to open its task."}</Text>
    </Stack>
  );
}

function PhoneActivityExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  return (
    <PlatformPhone label="Activity" screenRef={screenRef} header={<TopNavigation type="compact-alt" title="Activity" scrollRef={screenRef} />}>
      <Stack gap="lg" padding="md">
        <TimelineActivity entries={entries} today={TODAY} />
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Record activity",
    description: "Newest first, grouped by day: an Avatar when a person acted, an Icon when the system did; the tone carries the status (approved, rejected). Each day's last item has no connector.",
    render: () => <TimelineActivity entries={entries} today={TODAY} />,
    code: `<TimelineActivity entries={entries} />
// entries: { id, at, actor, title, description?, attachment?, marker?: { kind: "avatar" | "icon" | "dot", tone } }[]`,
  },
  {
    title: "Pending and failed steps",
    description: "Tone is the status, so the reader scans the log for what needs action: Warning for a step still pending, Negative for one that failed, Positive once it succeeded.",
    render: () => <TimelineActivity entries={billing} today={TODAY} />,
    code: `<TimelineActivity entries={[
  { id: "retry", at: "2026-09-30T11:20", actor: "Finance", title: "retried the payment", marker: { kind: "icon", tone: "positive" } },
  { id: "failed", at: "2026-09-30T09:05", actor: "Finance", title: "payment failed for INV-2026-0143", marker: { kind: "icon", tone: "negative" } },
  { id: "pending", at: "2026-09-29T16:40", actor: "Legal", title: "contract review is pending", marker: { kind: "icon", tone: "warning" } },
]} />`,
  },
  {
    title: "Compact log",
    description: "Size Small with Dot markers suits a dense audit log in a side panel; long details wrap.",
    render: () => <Card theme="default"><Stack gap="md"><Heading level={3} textStyle="Heading/Subheading">Audit log</Heading><TimelineActivity size="sm" entries={entries.map((entry) => ({ ...entry, attachment: undefined, marker: { kind: "dot", tone: entry.marker?.tone ?? "neutral" } }))} today={TODAY} /></Stack></Card>,
    code: `<TimelineActivity size="sm" entries={entries.map((entry) => ({ ...entry, marker: { kind: "dot", tone: entry.marker?.tone } }))} />`,
  },
  {
    title: "Project phases",
    description: "Milestones before today are Done, the next one is Current (announced as the current step, with its detail), the rest Upcoming.",
    wide: true,
    render: () => <TimelineMilestones milestones={milestones} today={TODAY} />,
    code: `<TimelineMilestones milestones={milestones} />`,
  },
  {
    title: "Roadmap",
    description: "Groups collapse their tasks; bars keep their real dates and today's line crosses the weeks. Pressing a bar opens its task; the group rows are disclosure buttons.",
    wide: true,
    render: () => <RoadmapExample />,
    code: `<TimelineGantt groups={groups} start="2026-08-31" aria-label="Lotus banking redesign" onTaskClick={(task) => open(task)} />`,
  },
  {
    title: "On a phone",
    description: "The activity feed is the same on a phone; the Gantt keeps a 128px task column and scrolls three weeks at a time, opening at today.",
    render: () => <PhoneActivityExample />,
    code: `<PlatformPhone header={<TopNavigation type="compact-alt" title="Activity" />}>
  <TimelineActivity entries={entries} />
</PlatformPhone>`,
  },
  {
    title: "Roadmap on a phone",
    description: "Three weeks visible, the task column stays while the track scrolls; milestone titles live in the task column only, and a long task runs past the edge instead of being squeezed.",
    render: () => <TimelineGantt device="mobile" groups={groups} start="2026-08-31" today={TODAY} aria-label="Lotus banking redesign" />,
    code: `<TimelineGantt device="mobile" groups={groups} start="2026-08-31" aria-label="Lotus banking redesign" />`,
  },
]);
