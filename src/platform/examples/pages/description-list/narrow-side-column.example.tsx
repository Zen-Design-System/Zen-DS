import { useId, useRef, useState } from "react";
import { BadgeStatus, Box, Button, Card, DescriptionList, Grid, Heading, Stack, Text, useToast } from "@zen-ds/react";
import { TODAY, daysFromToday, formatDate, formatRelative, people, taskStep, type TaskStatus } from "../../data";

/** A task page whose Details card, a narrow side column, stacks its Description List rows by itself. */
export default function TaskPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<TaskStatus>("In progress");
  const [finished, setFinished] = useState<Date | null>(null);
  const titleId = useId();
  const detailsId = useId();
  // The pressed button goes away, so focus moves to the one that takes its place (Reopen task ↔ Mark as done).
  const reopenRef = useRef<HTMLButtonElement>(null);
  const markDoneRef = useRef<HTMLButtonElement>(null);
  const done = status === "Done";
  const reopen = () => { setStatus("In progress"); setFinished(null); };
  const markDone = () => {
    setStatus("Done");
    setFinished(TODAY);
    setTimeout(() => reopenRef.current?.focus());
    toast({ type: "positive", title: "Task marked as done", action: { label: "Undo", onClick: reopen } });
  };
  return (
    <Box>
      <Grid columns={{ mobile: 1, desktop: "minmax(0, 3fr) minmax(0, 1fr)" }} gap="lg" align="start" stackBelow={640}>
        <Stack as="article" gap="md" align="start" aria-labelledby={titleId}>
          <Stack gap="xs">
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">Run five usability sessions on transfers</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">LUM-088 · Online banking redesign</Text>
          </Stack>
          <Text>
            Five moderated sessions with Lumen Bank customers who send money at least once a week. Each session covers a
            first transfer to a new payee, a repeat transfer and changing the daily limit, so we can see where the new
            confirmation step slows people down.
          </Text>
          <Text>Recordings and notes go into the test script folder the same day; findings are due with the round 2 report.</Text>
          {done ? (
            <Button ref={reopenRef} level="tertiary" onClick={() => { reopen(); setTimeout(() => markDoneRef.current?.focus()); }}>Reopen task</Button>
          ) : (
            <Button ref={markDoneRef} level="primary" onClick={markDone}>Mark as done</Button>
          )}
        </Stack>
        {/* About 260px wide on a desktop page: the list inside is under the 280px stackBelow, so each term sits above its value. */}
        <Card as="section" theme="default" spacing="md" aria-labelledby={detailsId}>
          <Stack gap="md">
            <Heading level={4} id={detailsId} textStyle="Heading/Subheading">Details</Heading>
            <DescriptionList items={[
              { id: "status", term: "Status", description: <BadgeStatus status={taskStep[status]}>{status}</BadgeStatus> },
              { id: "assignee", term: "Assignee", description: people.ava.name },
              { id: "reporter", term: "Reporter", description: people.alex.name },
              { id: "project", term: "Project", description: "Online banking redesign · Lumen Bank" },
              // A Done task shows when it finished, not when it was due.
              finished ? { id: "when", term: "Finished", description: formatRelative(finished) } : { id: "when", term: "Due", description: formatDate(daysFromToday(3)) },
              { id: "script", term: "Test script", description: "lumen-transfers_usability-script_round-2_v3-final.pdf" },
              { id: "labels", term: "Labels", description: "None" },
            ]} />
          </Stack>
        </Card>
      </Grid>
    </Box>
  );
}
