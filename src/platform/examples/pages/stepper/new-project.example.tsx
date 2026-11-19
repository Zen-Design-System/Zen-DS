import { useRef, useState } from "react";
import {
  Box, Button, Card, Checkbox, DescriptionList, Form, FormActions, FormFieldset, Grid, Heading, InputField, InputLeadingTrailing, SelectField, Stack, Stepper, Text,
  useZen, type StepperOrientation, type StepperStep,
} from "@zen-ds/react";
import { formatMoney, people, projects, type PersonId } from "../../data";

const clientOptions = [...new Set(projects.map((project) => project.client))]
  .filter((client) => client !== "Đìzai Studio")
  .map((client) => ({ label: client, value: client }));
const serviceOptions = ["Brand identity", "Product design", "Website", "Design system"].map((service) => ({ label: service, value: service }));
const teamOptions: PersonId[] = ["gia", "emi", "linh", "chi", "bao"];

const projectSteps: StepperStep[] = [
  { id: "client", title: "Client" },
  { id: "scope", title: "Scope" },
  { id: "team", title: "Team", caption: "Optional" },
  { id: "review", title: "Review" },
];
const stepHeadings = ["Who is the project for?", "What will the studio deliver?", "Who is on the team?", "Review the project"];

type ProjectDraft = { client: string; name: string; service: string; budget: string; team: PersonId[] };
const emptyDraft: ProjectDraft = { client: "Saola Outdoor", name: "", service: "Brand identity", budget: "", team: [] };
const budgetOf = (text: string) => Number(text.replace(/[$,\s]/g, ""));

/** A four-step form under a horizontal stepper: Continue checks only this step's fields. */
// orientation: horizontal while every step gets 104px, vertical in a narrower column (a card on a phone) instead of
// squeezing the titles. Unset, it follows the breakpoint: vertical on a phone.
export default function NewProject({ orientation }: { orientation?: StepperOrientation }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [current, setCurrent] = useState(0);
  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState<{ name?: string; budget?: string }>({});
  const created = current === projectSteps.length;
  const phone = useZen()?.breakpoint === "mobile";

  // A new step puts focus on its heading, so keyboard and screen-reader users start at the top of it; the current
  // step's own button does the same without a change.
  const go = (index: number) => {
    setCurrent(index);
    setTimeout(() => headingRef.current?.focus());
  };
  const edit = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  // Continue checks only the fields of this step; Form then focuses the first field with an error.
  const next = () => {
    const found = current === 0 && !draft.name.trim() ? { name: "Enter a project name" }
      : current === 1 && !(budgetOf(draft.budget) > 0) ? { budget: "Enter the budget in US dollars" } : {};
    setErrors(found);
    if (!found.name && !found.budget) go(current + 1);
  };
  const startAgain = () => { setDraft(emptyDraft); setErrors({}); go(0); };
  const teamNames = draft.team.map((id) => people[id].name).join(", ");

  return (
    <Card theme="default" as="section" aria-label="New project">
      <Stack gap="lg">
        {/* Passed steps are buttons that go back to edit; steps ahead stay inert. */}
        <Stepper aria-label="New project" orientation={orientation ?? (phone ? "vertical" : "horizontal")} steps={projectSteps} current={current}
          onStepClick={created ? undefined : (_, index) => { if (index <= current) go(index); }} />
        {/* The step content keeps a readable column (up to 640px, centred) under the full-width stepper. */}
        <Box width="fill" maxWidth={640} alignSelf="center">
          {created ? (
            <Stack gap="md">
              <Stack gap="xs">
                <Heading ref={headingRef} tabIndex={-1} level={4} textStyle="Heading/Subheading">Project created</Heading>
                <Text textStyle="Body/Base/Regular" tone="base">{`${draft.name} for ${draft.client} is now in Projects, with a ${formatMoney(budgetOf(draft.budget))} budget.`}</Text>
              </Stack>
              {/* A lone card action that is not a form sits on the right, like FormActions. */}
              <Stack direction="row" justify="end">
                <Button level="tertiary" startIcon="icon-plus-line" onClick={startAgain}>New project</Button>
              </Stack>
            </Stack>
          ) : (
            <Form onSubmit={next}>
              <Stack gap="md">
                <Heading ref={headingRef} tabIndex={-1} level={4} textStyle="Heading/Subheading">{stepHeadings[current]}</Heading>
                {current === 0 ? (
                  <Grid minColumnWidth={240} columnGap="lg" rowGap="md">
                    <SelectField label="Client" options={clientOptions} value={draft.client} onValueChange={(value) => edit("client", value)} />
                    <InputField label="Project name" placeholder="Brand refresh" value={draft.name} error={errors.name} onValueChange={(value) => edit("name", value)} />
                  </Grid>
                ) : current === 1 ? (
                  <Grid minColumnWidth={240} columnGap="lg" rowGap="md">
                    <SelectField label="Service" options={serviceOptions} value={draft.service} onValueChange={(value) => edit("service", value)} />
                    <InputField label="Budget" leading={<InputLeadingTrailing label="$" interactive={false} />} inputMode="numeric" placeholder="36,000" helpText="Fixed fee in US dollars"
                      value={draft.budget} error={errors.budget} onValueChange={(value) => edit("budget", value)} />
                  </Grid>
                ) : current === 2 ? (
                  <FormFieldset legend="Team" hideLegend kind="checkbox">
                    {teamOptions.map((id) => (
                      <Checkbox key={id} label={people[id].name} caption={people[id].role} checked={draft.team.includes(id)}
                        onCheckedChange={(checked) => edit("team", checked ? [...draft.team, id] : draft.team.filter((x) => x !== id))} />
                    ))}
                  </FormFieldset>
                ) : (
                  <DescriptionList divider items={[
                    { term: "Client", description: draft.client },
                    { term: "Project name", description: draft.name },
                    { term: "Service", description: draft.service },
                    { term: "Budget", description: formatMoney(budgetOf(draft.budget)) },
                    { term: "Team", description: teamNames || "Add people later" },
                  ]} />
                )}
              </Stack>
              {/* Tertiary then Primary together on the right; stacked full width under 480px. */}
              <FormActions>
                {current ? <Button level="tertiary" onClick={() => go(current - 1)}>Back</Button> : null}
                <Button level="primary" type="submit">{current === projectSteps.length - 1 ? "Create project" : "Continue"}</Button>
              </FormActions>
            </Form>
          )}
        </Box>
      </Stack>
    </Card>
  );
}
