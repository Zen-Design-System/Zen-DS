import { useState, type ReactNode } from "react";
import {
  BadgeStatus, Button, Card, Checkbox, DescriptionList, DockIcon, FormFieldset, Grid, Heading, InputField, List, ListItem, ModalForm, SelectField, Stack, Stepper,
  Text, TextAreaField, plural, useToast, useZen, type DockIconTheme, type IconName,
} from "@zen-ds/react";
import { people, projectProgress, projectStep, projects, type PersonId, type ProjectStatus } from "../../data";

const clientOptions = ["Phin & Co", "Lumen Bank", "Mekong Freight", "Hanoi Book Fair", "Saola Outdoor", "Đìzai Studio"].map((client) => ({ value: client, label: client }));
const leadIds: PersonId[] = ["alex", "chi", "duy", "gia", "finn"];
const memberIds: PersonId[] = ["ava", "bao", "chi", "emi", "em", "finn", "gia", "khoa", "linh"];
const projectSteps = [
  { id: "details", title: "Details", caption: "Name and client" },
  { id: "team", title: "Team", caption: "Lead and members" },
  { id: "review", title: "Review", caption: "Check and create" },
];
type ProjectRow = { id: string; name: string; client: string; icon: IconName; theme: DockIconTheme; status: ProjectStatus; progress?: number };

/** A row with a status at its end. ListItem titles stay on one line, so on a phone the status moves under the caption
 *  and the title wraps instead of being cut (the Contents slot). */
function Row({ title, caption, leading, trailing }: { title: string; caption: string; leading: ReactNode; trailing: ReactNode }) {
  const narrow = useZen()?.breakpoint === "mobile";
  if (!narrow) return <ListItem title={title} caption={caption} leading={leading} trailing={trailing} />;
  return (
    <ListItem title={title} leading={leading}>
      <Stack gap="3xs" align="start">
        <Text as="span" textStyle="Body/Base/Bold">{title}</Text>
        <Text as="span" textStyle="Body/Small/Regular" tone="light">{caption}</Text>
        {trailing}
      </Stack>
    </ListItem>
  );
}

/** Projects; New project opens a ModalForm Big whose Stepper leads the form through three steps. */
export default function NewProject() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProjectRow[]>(() => projects.filter((p) => p.status !== "Completed").slice(0, 3));
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [client, setClient] = useState("Saola Outdoor");
  const [brief, setBrief] = useState("");
  const [lead, setLead] = useState<PersonId>("alex");
  const [team, setTeam] = useState<PersonId[]>(["chi", "emi"]);
  const [error, setError] = useState<string>();
  const last = step === projectSteps.length - 1;
  const start = () => { setStep(0); setName(""); setClient("Saola Outdoor"); setBrief(""); setLead("alex"); setTeam(["chi", "emi"]); setError(undefined); setOpen(true); };
  // Enter or the primary button: the next step, or Create on the last one.
  const next = () => {
    if (step === 0 && !name.trim()) { setError("Name the project."); return; }
    if (!last) return setStep(step + 1);
    setRows((list) => [{ id: `new-${list.length}`, name: name.trim(), client, icon: "icon-layout-alt-01-line", theme: "indigo", status: "Planning" }, ...list]);
    setOpen(false);
    toast({ title: "Project created" });
  };
  const toggle = (id: PersonId, on: boolean) => setTeam((list) => on ? [...list, id] : list.filter((x) => x !== id));
  // The lead is on the team anyway; members are everyone else who is ticked.
  const members = team.filter((id) => id !== lead);
  return (
    <Card theme="default" spacing="md" width="fill">
      <Stack gap="md">
        <Stack direction="row" align="start" justify="between" gap="md" wrap>
          <Heading level={4} textStyle="Heading/Subheading">Projects</Heading>
          <Button level="tertiary" startIcon="icon-plus-line" onClick={start} size="sm">New project</Button>
        </Stack>
        <List aria-label="Projects">
          {rows.map((project) => (
            <Row key={project.id} title={project.name} caption={project.client}
              leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
              trailing={<BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>} />
          ))}
        </List>
      </Stack>
      <ModalForm open={open} onOpenChange={setOpen} layout="big" title="New project"
        description="Set up the basics now; tasks, files and budget come after."
        onSubmit={next}
        primaryAction={{ label: last ? "Create project" : "Continue" }}
        secondaryAction={{ label: "Cancel" }}
        tertiaryAction={step > 0 ? { label: "Back", onClick: () => setStep(step - 1) } : undefined}>
        {/* Earlier steps stay reachable from the Stepper; later ones open through Continue. */}
        <Stepper aria-label="New project steps" steps={projectSteps} current={step} onStepClick={(_, index) => { if (index < step) setStep(index); }} />
        {step === 0 ? (
          <Stack gap="md">
            <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="lg">
              <InputField label="Project name" value={name} onValueChange={(value) => { setName(value); setError(undefined); }} error={error} maxLength={60} autoComplete="off" />
              <SelectField label="Client" options={clientOptions} value={client} onValueChange={setClient} />
            </Grid>
            <TextAreaField label="Brief" labelOptional rows={3} value={brief} onValueChange={setBrief} />
          </Stack>
        ) : step === 1 ? (
          <Stack gap="md">
            <SelectField label="Project lead" options={leadIds.map((id) => ({ value: id, label: people[id].name }))} value={lead} onValueChange={(value) => setLead(value as PersonId)} />
            <FormFieldset legend="Members" kind="checkbox" helpText={`${plural(members.length, "person", "people")} selected`}>
              {/* Three columns of names on a desktop dialog; one on a phone, where three would squeeze each name. */}
              <Grid columns={{ mobile: 1, desktop: 3 }} rowGap="sm" columnGap="lg">
                {memberIds.filter((id) => id !== lead).map((id) => (
                  <Checkbox key={id} label={people[id].name} caption={people[id].role} checked={team.includes(id)} onCheckedChange={(on) => toggle(id, on)} />
                ))}
              </Grid>
            </FormFieldset>
          </Stack>
        ) : (
          <DescriptionList divider items={[
            { term: "Project", description: name },
            { term: "Client", description: client },
            { term: "Lead", description: people[lead].name },
            { term: "Members", description: members.map((id) => people[id].name).join(", ") || "Only the lead" },
            { term: "Brief", description: brief.trim() || "Not written yet" },
            { term: "Status", description: <BadgeStatus status={projectStep.Planning}>Planning</BadgeStatus> },
          ]} />
        )}
      </ModalForm>
    </Card>
  );
}
