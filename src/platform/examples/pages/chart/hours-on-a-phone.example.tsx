import { useId, useState, type RefObject } from "react";
import { AppShell, BottomNavigation, Box, DockIcon, Heading, LineChart, List, ListBox, ListItem, Segmented, Stack, Text, TopNavigation, useToast, type BottomNavigationItem, type ChartPoint } from "@zen-ds/react";
import { hoursThisWeek, me, projectById, studio } from "../../data";

/** "164 h" — hours read in full, also on the axis. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/** Alex's logged hours: the last six full weeks, or the last six months (September matches the Metric page, 164 h). */
const myHours: Record<string, ChartPoint[]> = {
  weekly: [["Aug 17", 38], ["Aug 24", 41], ["Aug 31", 36], ["Sep 7", 40], ["Sep 14", 42], ["Sep 21", 39]].map(([label, value]) => ({ label: String(label), value: Number(value) })),
  monthly: [["Apr", 152], ["May", 160], ["Jun", 148], ["Jul", 166], ["Aug", 152], ["Sep", 164]].map(([label, value]) => ({ label: String(label), value: Number(value) })),
};
const myRanges = [{ id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" }];
const septemberByProject = [["lumen-banking", 92], ["zen-ds", 48], ["phin-loyalty", 16], ["saola-brand", 8]].map(([id, value]) => ({ project: projectById(String(id)), value: Number(value) }));

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "hours", label: "Hours", icon: "icon-clock-line", selectedIcon: "icon-clock-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];

/**
 * The Hours root of the studio app: one main chart goes straight on the screen, no Chart Card (the card's padding would
 * cost the plot its width). The bottom bar casts a shadow, so the entry groups are Shadow blocks on the grey Canvas, each
 * a ListBox (20px on a phone) whose kicker lines up with the row text.
 */
// scrollRef: what scrolls the screen, so the large title folds into the bar as the entries run under it. "window" in your app.
export default function PhoneHours({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const chartId = useId();
  const groupId = useId();
  const weekId = useId();
  const [rangeId, setRangeId] = useState("weekly");
  // The other roots are not drawn here: a toast says so and the bar keeps this root.
  const go = (id: string) => {
    if (id !== "hours") toast({ title: `${phoneRoots.find((item) => item.id === id)?.label ?? id} isn't part of this example`, children: "This screen shows the charts." });
  };
  return (
    <AppShell
      topNavigation={<TopNavigation title="Hours" largeTitle="Hours" largeTitleSubheading={`${me.name} · 164 h in September`} scrollRef={scrollRef} />}
      bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="hours" onValueChange={go} />}
    >
      {/* The Body pads the screen's margin and spaces the sections apart. */}
      <Stack as="section" gap="md" aria-labelledby={chartId}>
        <Heading level={2} id={chartId} textStyle="Heading/Subheading">Hours logged</Heading>
        <Segmented options={myRanges} value={rangeId} onValueChange={setRangeId} fullWidth aria-label="Range" />
        <LineChart key={rangeId} aria-label={rangeId === "weekly" ? "Your hours per week, Aug 17 – Sep 27, 2026" : "Your hours per month, Apr – Sep 2026"}
          data={myHours[rangeId]} format={hours} height={220} />
      </Stack>
      <Stack as="section" gap="xs" aria-labelledby={groupId}>
        {/* The kicker lines up with the row text inside the group. */}
        <Box paddingX="lg"><Heading level={2} id={groupId} textStyle="Body/Small/Bold" tone="light">September by project</Heading></Box>
        {/* Rows have no side padding of their own: the ListBox pads them. Shadow: the bottom bar's elevation. */}
        <ListBox theme="shadow">
          <List aria-labelledby={groupId}>
            {septemberByProject.map(({ project, value }) => (
              <ListItem key={project.id} title={project.name} caption={project.client}
                leading={<DockIcon size="md" icon={project.icon} theme={project.theme} background="subtle" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{hours(value)}</Text>} />
            ))}
          </List>
        </ListBox>
      </Stack>
      <Stack as="section" gap="xs" aria-labelledby={weekId}>
        <Box paddingX="lg"><Heading level={2} id={weekId} textStyle="Body/Small/Bold" tone="light">This week</Heading></Box>
        <ListBox theme="shadow">
          <List aria-labelledby={weekId}>
            {/* Day and client: each client has one project here, and the client keeps the caption on one line in the block. */}
            {hoursThisWeek.map((entry) => (
              <ListItem key={entry.id} title={entry.note} caption={`${entry.day} · ${entry.project.client}`}
                leading={<DockIcon size="md" icon={entry.project.icon} theme={entry.project.theme} background="subtle" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{hours(entry.value)}</Text>} />
            ))}
          </List>
        </ListBox>
      </Stack>
    </AppShell>
  );
}
