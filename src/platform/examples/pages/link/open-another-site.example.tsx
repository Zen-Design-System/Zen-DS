import { useId } from "react";
import { Badge, Card, DescriptionList, Heading, Link, Stack, Text } from "@zen-ds/react";
import { formatDue, people, priorityTheme, projectById, tasks } from "../../data";

const auditTask = tasks.find((task) => task.id === "t5")!;

export default function ExternalLinks() {
  const titleId = useId();
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${auditTask.key} · ${projectById(auditTask.project).name}`}</Text>
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">{auditTask.title}</Heading>
        </Stack>
        {/* Other sites open in a new tab: external adds the icon, rel="noopener noreferrer" and a hidden "(opens in a new tab)". */}
        <Text tone="base">
          Check each screen of the account overview against the{" "}
          <Link href="https://www.w3.org/WAI/WCAG22/quickref/" external underline="always">WCAG 2.2 quick reference</Link> and log
          what fails as a subtask. Lumen Bank's customers bank on small phones, so start with{" "}
          <Link href="https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html" external underline="always">Target Size (Minimum)</Link>.
        </Text>
        <DescriptionList items={[
          { term: "Assignee", description: people[auditTask.assignee].name },
          { term: "Due", description: formatDue(auditTask.due) },
          { term: "Priority", description: <Badge theme={priorityTheme[auditTask.priority]} background="subtle">{auditTask.priority}</Badge> },
        ]} />
      </Stack>
    </Card>
  );
}
