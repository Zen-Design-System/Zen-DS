import type { RefObject } from "react";
import { AppShell, Card, Heading, ProgressBar, Stack, Text, TopNavigation, type CardColor } from "@zen-ds/react";
import { formatDue, projects } from "../../data";

/** Each project keeps its own hue (Support/<Color>/Pale on a white page, /Subtle on Canvas/Default): the Card colour
 *  closest to its Dock Icon theme. */
const projectColor: Record<string, CardColor> = { orange: "orange", blue: "blue", teal: "cyan", purple: "purple", indigo: "violet", green: "green" };

/** Colour by project: Pale cards in any hue on a white screen. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneProjectColours({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const open = projects.filter((project) => project.status !== "Completed");
  return (
    // A white Canvas/Alt screen: the boxes on it are Pale, each in its project's colour.
    <AppShell canvas="alt" topNavigation={<TopNavigation scrollRef={scrollRef} type="default" title="Projects" largeTitle="Projects" />}>
      <Stack gap="sm">
        {open.map((project) => (
          <Card key={project.id} as="section" theme="pale" color={projectColor[project.theme] ?? "neutral"} spacing="small" aria-labelledby={`project-${project.id}`}>
            <Stack gap="xs">
              <Heading level={2} id={`project-${project.id}`} textStyle="Heading/Subheading" truncate={2}>{project.name}</Heading>
              <Text as="span" textStyle="Body/Small/Regular" tone="base" truncate>{`${project.client} · ${formatDue(project.due)}`}</Text>
              <ProgressBar value={project.progress} label aria-label={`${project.name} progress`} />
            </Stack>
          </Card>
        ))}
      </Stack>
    </AppShell>
  );
}
