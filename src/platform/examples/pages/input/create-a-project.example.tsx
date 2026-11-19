import {
  AutocompleteField, Button, Card, DateField, Form, FormActions, Grid, Heading, InputField, NumberField, SelectField, TextAreaField, plural,
  useFormState, useToast,
} from "@zen-ds/react";
import { TODAY, people, peopleList } from "../../data";

/** "10/12/2026" (what DateField shows and types) → a Date, or null. */
const parseDay = (value: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const clientOptions = [
  { value: "phin", label: "Phin & Co" },
  { value: "lumen", label: "Lumen Bank" },
  { value: "mekong", label: "Mekong Freight" },
  { value: "bookfair", label: "Hanoi Book Fair" },
  { value: "saola", label: "Saola Outdoor" },
  { value: "studio", label: "Đìzai Studio (internal)" },
];
const leadOptions = [people.alex, people.duy, people.chi, people.finn, people.gia].map((p) => ({ value: p.id, label: p.name }));
const teamOptions = peopleList.map((p) => ({ id: p.id, label: p.name }));
type ProjectDraft = { name: string; client: string; start: string; due: string; lead: string; sprint: number | null; team: string[]; brief: string };
const blankProject: ProjectDraft = { name: "", client: "", start: "10/12/2026", due: "", lead: "alex", sprint: 2, team: [], brief: "" };

/** Each value gets the field built for it; errors show when a field is left or the form is submitted. */
export default function NewProject() {
  const { toast } = useToast();
  const form = useFormState<ProjectDraft>({
    initialValues: blankProject,
    validate: (v) => {
      const start = parseDay(v.start), due = parseDay(v.due);
      return {
        name: v.name.trim() ? undefined : "Enter a project name",
        client: v.client ? undefined : "Choose a client",
        start: start ? undefined : "Enter a start date, like 10/12/2026",
        due: !due ? "Enter a due date, like 12/18/2026" : start && due <= start ? "Pick a due date after the start date" : undefined,
        team: v.team.length ? undefined : "Add at least one team member",
      };
    },
    onSubmit: (v, { reset }) => {
      toast({ type: "positive", title: "Project created", children: `${v.name.trim()} · ${plural(v.team.length, "member")}` });
      reset();
    },
  });
  return (
    <Card theme="default">
      {/* Fields stack md apart; the grid's columns sit lg apart. */}
      <Form form={form} gap="md">
        <Heading level={4} textStyle="Heading/Subheading">New project</Heading>
        <Grid minColumnWidth={280} rowGap="md" columnGap="lg">
          <InputField label="Project name" placeholder="e.g. Loyalty app" {...form.field("name")} />
          <SelectField label="Client" placeholder="Choose a client" options={clientOptions} {...form.selectField("client")} />
          <SelectField label="Project lead" options={leadOptions} {...form.selectField("lead")} />
          <DateField label="Start date" today={TODAY} {...form.dateField("start")} />
          <DateField label="Due date" today={TODAY} {...form.dateField("due")} />
          <NumberField label="Sprint length (weeks)" min={1} max={4} {...form.numberField("sprint")} />
        </Grid>
        <AutocompleteField label="Team" addLabel="Add member" popoverLabel="Studio members" searchPlaceholder="Search people" options={teamOptions} {...form.autocompleteField("team")} />
        <TextAreaField label="Brief" labelOptional placeholder="What the client needs and by when" rows={3} maxLength={280} characterLimit {...form.field("brief")} />
        <FormActions>
          <Button level="tertiary" onClick={() => form.reset()}>Cancel</Button>
          <Button level="primary" type="submit">Create project</Button>
        </FormActions>
      </Form>
    </Card>
  );
}
