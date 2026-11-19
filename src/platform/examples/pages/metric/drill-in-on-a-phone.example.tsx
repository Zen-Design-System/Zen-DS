import { useId, useRef, useState, type RefObject } from "react";
import {
  AppShell, BottomNavigation, DockIcon, Heading, IconButton, List, ListItem, Metric, MetricCard, Stack, Text, TopNavigation, plural, useToast,
  type BottomNavigationItem, type DockIconTheme, type IconName, type MetricTrendDirection,
} from "@zen-ds/react";
import { formatRange, leaveRequests, me, projectById, studio } from "../../data";

type Trend = { direction: MetricTrendDirection; label: string; subLabel?: string };
/** One line of a breakdown: a project or a leave entry, with its share of the metric. */
type Share = { id: string; title: string; caption: string; icon: IconName; theme: DockIconTheme; value: string };
type MyMetric = { id: string; label: string; value: string; icon: IconName; theme: DockIconTheme; trend?: Trend; period: string; group: string; rows: Share[] };
type MyGroup = { id: string; title: string; metrics: MyMetric[] };

/** A project as a breakdown row (Dock Icon and client from the shared data), with its share. */
const projectShare = (projectId: string, value: string): Share => {
  const project = projectById(projectId);
  return { id: project.id, title: project.name, caption: project.client, icon: project.icon, theme: project.theme, value };
};

/** Alex's approved leave in October, from the studio's shared leave requests. */
const myLeave = leaveRequests.find((request) => request.person === me.id && request.status === "Approved")!;
/** Alex's numbers in the studio app, this month and this year. Each metric opens the rows it adds up. */
const myGroups: MyGroup[] = [
  {
    id: "month", title: "September", metrics: [
      {
        id: "hours", label: "Hours logged", value: "164 h", icon: "icon-clock-line", theme: "blue", trend: { direction: "positive", label: "12 h", subLabel: "vs. August" },
        period: "September", group: "By project",
        rows: [projectShare("lumen-banking", "92 h"), projectShare("zen-ds", "48 h"), projectShare("phin-loyalty", "16 h"), projectShare("saola-brand", "8 h")],
      },
      {
        id: "tasks", label: "Tasks done", value: "12", icon: "icon-check-done-line", theme: "orange", trend: { direction: "negative", label: "2", subLabel: "vs. August" },
        period: "September", group: "By project",
        rows: [projectShare("zen-ds", plural(6, "task")), projectShare("lumen-banking", plural(5, "task")), projectShare("phin-loyalty", plural(1, "task"))],
      },
      {
        id: "reviews", label: "Reviews given", value: "9", icon: "icon-annotation-check-line", theme: "purple", trend: { direction: "positive", label: "3", subLabel: "vs. August" },
        period: "September", group: "By project",
        rows: [projectShare("zen-ds", plural(5, "review")), projectShare("lumen-banking", plural(3, "review")), projectShare("phin-loyalty", plural(1, "review"))],
      },
    ],
  },
  {
    id: "year", title: "This year", metrics: [
      {
        id: "leave", label: "Leave left", value: plural(9, "day"), icon: "icon-plane-line", theme: "cyan",
        period: "2026", group: "Annual leave",
        rows: [
          { id: "allowance", title: "Allowance", caption: "Jan 1 – Dec 31, 2026", icon: "icon-calendar-line", theme: "cyan", value: plural(15, "day") },
          { id: "taken", title: "Taken", caption: "Jun 2 – Jun 4, 2026", icon: "icon-calendar-check-line", theme: "cyan", value: plural(3, "day") },
          { id: "booked", title: "Booked", caption: formatRange(myLeave.from, myLeave.to), icon: "icon-plane-line", theme: "cyan", value: plural(myLeave.days, "day") },
        ],
      },
      {
        id: "learning", label: "Learning budget left", value: "$620", icon: "icon-graduation-hat-line", theme: "green",
        period: "2026", group: "Learning budget",
        rows: [
          { id: "budget", title: "Allowance", caption: "Jan 1 – Dec 31, 2026", icon: "icon-wallet-02-line", theme: "green", value: "$1,200" },
          { id: "course", title: "Inclusive design course", caption: "Mar 14, 2026", icon: "icon-graduation-hat-line", theme: "green", value: "$380" },
          { id: "conference", title: "UX Vietnam conference", caption: "Aug 22, 2026", icon: "icon-ticket-01-line", theme: "green", value: "$200" },
        ],
      },
      {
        id: "expenses", label: "Expenses claimed", value: "$1,446.39", icon: "icon-receipt-line", theme: "pink",
        period: "2026", group: "Claims",
        rows: [
          { id: "figma", title: "Figma seats for October", caption: "Sep 1, 2026", icon: "icon-receipt-line", theme: "pink", value: "$1,080.00" },
          { id: "taxi", title: "Taxi to Lumen Bank", caption: "Aug 19, 2026", icon: "icon-receipt-line", theme: "pink", value: "$14.40" },
          { id: "books", title: "Accessibility handbook", caption: "May 6, 2026", icon: "icon-receipt-line", theme: "pink", value: "$351.99" },
        ],
      },
    ],
  },
];
const myMetrics = myGroups.flatMap((group) => group.metrics);
const openLabel = (metric: MyMetric) => `Open ${metric.label.toLowerCase()}`;

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "numbers", label: "Numbers", icon: "icon-pie-chart-01-line", selectedIcon: "icon-pie-chart-01-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneDrillIn({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const groupId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  // Focus follows the screen: the pushed screen focuses its title, Back returns to the chevron that opened it.
  const titleRef = useRef<HTMLSpanElement>(null);
  const chevronRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const open = myMetrics.find((metric) => metric.id === openId);
  const openMetric = (metric: MyMetric) => {
    setOpenId(metric.id);
    setTimeout(() => titleRef.current?.focus());
  };
  const backFrom = (metric: MyMetric) => {
    setOpenId(null);
    setTimeout(() => chevronRefs.current[metric.id]?.focus());
  };

  if (!open) {
    return (
      // The Numbers root of the studio app: one key per screen, so the bar measures its fold again. The bottom bar casts
      // a shadow, so the cards on the grey Canvas take the same Shadow elevation.
      <AppShell key="root"
        topNavigation={<TopNavigation title="Numbers" largeTitle="Numbers" largeTitleSubheading={`${me.name} · ${me.role}`} scrollRef={scrollRef} />}
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="numbers"
          onValueChange={(id) => { if (id !== "numbers") toast({ title: `${phoneRoots.find((item) => item.id === id)?.label ?? id} isn't part of this example`, children: "This screen shows the metrics." }); }} />}
      >
        {myGroups.map((group) => (
          <Stack as="section" key={group.id} gap="xs" aria-labelledby={`${groupId}-${group.id}`}>
            <Heading level={2} id={`${groupId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading>
            <Stack as="ul" gap="md">
              {group.metrics.map((metric) => (
                <li key={metric.id}>
                  <MetricCard theme="shadow" variant="title-highlight" size="md" label={metric.label} value={metric.value} trend={metric.trend} icon={metric.icon} iconTheme={metric.theme}
                    action={<IconButton ref={(button) => { chevronRefs.current[metric.id] = button; }} appearance="main" level="tertiary" size="xs" icon="icon-chevron-right-line"
                      aria-label={openLabel(metric)} onClick={() => openMetric(metric)} />} />
                </li>
              ))}
            </Stack>
          </Stack>
        ))}
      </AppShell>
    );
  }
  return (
    // The pushed screen: the compact bar with Back and the metric's name, no bottom bar.
    <AppShell key={open.id}
      topNavigation={<TopNavigation type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{open.label}</span>} scrollRef={scrollRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => backFrom(open) }} />}
    >
      {/* Rows pad 0 at the sides: the Body's margin insets them, so they line up with the metric. */}
      <Metric size="lg" icon={false} label={open.period} value={open.value} trend={open.trend} />
      <Stack as="section" gap="xs" aria-labelledby={groupId}>
        <Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">{open.group}</Heading>
        <List aria-labelledby={groupId}>
          {open.rows.map((share) => (
            <ListItem key={share.id} title={share.title} caption={share.caption} leading={<DockIcon size="md" icon={share.icon} theme={share.theme} background="subtle" />}
              trailing={<Text as="span" textStyle="Body/Base/Medium">{share.value}</Text>} />
          ))}
        </List>
      </Stack>
    </AppShell>
  );
}
