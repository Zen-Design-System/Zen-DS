import { useId, useState } from "react";
import { Card, Checkbox, FormFieldset, Heading, ProgressBar, Stack, Text } from "@zen-ds/react";
import { formatDate, formatMoney, people, projectById } from "../../data";

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

/** A neutral bar counts finished steps; the last one turns it to the Status theme. */
export default function SetupChecklist() {
  const titleId = useId();
  const [done, setDone] = useState(["contacts", "team"]);
  const ready = done.length === setupSteps.length;
  const toggle = (id: string, checked: boolean) => setDone((list) => (checked ? [...list, id] : list.filter((x) => x !== id)));
  return (
    <Card theme="default" as="section" aria-labelledby={titleId}>
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
