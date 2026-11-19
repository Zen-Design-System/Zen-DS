import { useId, type RefObject } from "react";
import { AppShell, BarList, DockIcon, Heading, List, ListItem, Stack, Text, TopNavigation, plural, useToast } from "@zen-ds/react";
import { formatCompactMoney, projectById } from "../../data";

/** "92 h" — hours read in full. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/** Alex's September hours by project (164 h), ranked largest first. */
const septemberByProject = [["lumen-banking", 92], ["zen-ds", 48], ["phin-loyalty", 16], ["saola-brand", 8]].map(([id, value]) => ({ project: projectById(String(id)), value: Number(value) }));

/**
 * A screen pushed from Hours: the compact bar with Back, no bottom bar. The ranking is the screen's one chart: straight on
 * the screen, no Chart Card, its column labels over the rows.
 */
// scrollRef: what scrolls the screen (the bar's divider shows once content runs under it). "window" in your app.
export default function PhoneProjects({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const headingId = useId();
  // Back leads to Hours, which this example does not draw: the toast names where it goes.
  const back = { icon: "icon-chevron-left-line-medium" as const, label: "Back", onClick: () => toast({ title: "Back to Hours", children: "This example shows the one screen." }) };
  return (
    <AppShell topNavigation={<TopNavigation type="compact-alt" title="Hours by project" scrollRef={scrollRef} leading={back} />}>
      <Stack as="section" gap="md" aria-labelledby={headingId}>
        <Stack gap="2xs">
          <Heading level={2} id={headingId} textStyle="Heading/Subheading">September</Heading>
          <Text tone="base" textStyle="Body/Small/Regular">{`${hours(septemberByProject.reduce((sum, p) => sum + p.value, 0))} on ${plural(septemberByProject.length, "project")}`}</Text>
        </Stack>
        <BarList aria-label="Your hours by project, September 2026" headers={{ label: "Project", value: "Hours" }}
          data={septemberByProject.map(({ project, value }) => ({ label: project.name, value }))} format={hours} />
      </Stack>
      {/* What the ranking leaves out: the client projects' budgets, so the hours read against what each can still take. */}
      {/* It closes the phone screen, so the list is open on the Canvas at the body's margin (usage rules §19). */}
      <Stack as="section" gap="xs" aria-labelledby={`${headingId}-budget`}>
        <Heading level={2} id={`${headingId}-budget`} textStyle="Body/Small/Bold" tone="light">Budget left</Heading>
        <List aria-labelledby={`${headingId}-budget`}>
          {septemberByProject.filter(({ project }) => project.spent > 0).map(({ project }) => (
            <ListItem key={project.id} title={project.name} caption={`${project.client} · ${Math.round((project.spent / project.budget) * 100)}% used`}
              leading={<DockIcon size="md" icon={project.icon} theme={project.theme} background="subtle" />}
              trailing={<Text as="span" textStyle="Body/Base/Medium">{formatCompactMoney(project.budget - project.spent)}</Text>} />
          ))}
        </List>
      </Stack>
    </AppShell>
  );
}
