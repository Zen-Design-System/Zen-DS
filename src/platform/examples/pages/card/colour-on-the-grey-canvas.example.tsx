import { Card, Heading, ProgressBar, Stack, Text, type CardColor } from "@zen-ds/react";
import { formatDue, projects } from "../../data";

/** Each project keeps its own hue (Support/<Color>/Pale on a white page, /Subtle on Canvas/Default): the Card colour
 *  closest to its Dock Icon theme. */
const projectColor: Record<string, CardColor> = { orange: "orange", blue: "blue", teal: "cyan", purple: "purple", indigo: "violet", green: "green" };

/** Colour on the grey canvas: Subtle cards, each in its project's hue. */
export default function GreyCanvasProjects() {
  const open = projects.filter((project) => project.status !== "Completed").slice(0, 3);
  return (
    // On the grey Canvas/Default, colour on a box is Subtle: Pale would fade into the page (user rule 2026-10-17).
    // One column, as a project list: three cards never leave one alone on a second row.
    <Stack gap="md">
      {open.map((project) => (
        <Card key={project.id} as="section" theme="subtle" color={projectColor[project.theme] ?? "neutral"} aria-labelledby={`grey-project-${project.id}`}>
          <Stack gap="xs">
            <Heading level={4} id={`grey-project-${project.id}`} textStyle="Heading/Subheading" truncate={2}>{project.name}</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base" truncate>{`${project.client} · ${formatDue(project.due)}`}</Text>
            <ProgressBar value={project.progress} label aria-label={`${project.name} progress`} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
