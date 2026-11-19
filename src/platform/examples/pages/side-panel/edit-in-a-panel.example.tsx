import { useId, useRef, useState } from "react";
import {
  BadgeStatus, Card, DateField, DescriptionList, Dialog, Form, Heading, InputField, SelectField, SidePanel, Stack, Text, TextAreaField, useFormState, useToast,
} from "@zen-ds/react";
import { TODAY, formatDate, people, projectById, projectProgress, projectStep, type PersonId, type ProjectStatus } from "../../data";

type ProjectValues = { name: string; status: ProjectStatus; lead: PersonId; due: string; brief: string };
const loyalty = projectById("phin-loyalty");
const asDay = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
/** "11/02/2026" (the DateField's typed format) → a Date, or null while it is incomplete or not a real day. */
const parseDay = (text: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return d && d.getDate() === Number(m?.[2]) ? d : null;
};
const projectStatuses: ProjectStatus[] = ["Planning", "Active", "On hold", "Completed"];
const leadIds: PersonId[] = ["chi", "alex", "duy", "gia"];
const savedProject: ProjectValues = {
  name: loyalty.name, status: loyalty.status, lead: loyalty.lead, due: asDay(loyalty.due),
  brief: "Points, rewards and checkout for the Phin & Co coffee app on iOS and Android.",
};

/** A project card whose Edit project action opens a form in a Modal Side Panel that asks before it drops changes. */
export default function EditProject() {
  const { toast } = useToast();
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [project, setProject] = useState(savedProject);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const form = useFormState<ProjectValues>({
    initialValues: savedProject,
    validate: (values) => ({
      name: values.name.trim() ? undefined : "Name the project",
      due: parseDay(values.due) ? undefined : "Enter the due date, like 11/02/2026",
    }),
    onSubmit: async (values) => {
      // The save takes a moment, as a request to your server would.
      await new Promise((resolve) => setTimeout(resolve, 700));
      setProject({ ...values, name: values.name.trim() });
      setOpen(false);
      toast({ type: "positive", title: "Project saved" });
    },
  });
  const edit = () => { form.reset(project); setOpen(true); };
  // Close, Cancel, Escape and the scrim all come here: with edits, ask first.
  const requestClose = () => { if (form.isSubmitting) return; if (form.isDirty) setConfirming(true); else setOpen(false); };
  const discard = () => { setConfirming(false); setOpen(false); };
  const due = parseDay(project.due) ?? loyalty.due;
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}
      subAction={{ label: "Edit project", icon: "icon-edit-02-line", onClick: edit }}>
      <Stack gap="md">
        <Stack gap="xs">
          <Stack direction="row" gap="2xs" align="center" wrap>
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">{project.name}</Heading>
            <BadgeStatus status={projectStep[project.status]} progress={projectProgress(project)}>{project.status}</BadgeStatus>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">{project.brief || "Phin & Co"}</Text>
        </Stack>
        <DescriptionList items={[
          { id: "client", term: "Client", description: "Phin & Co" },
          { id: "lead", term: "Lead", description: people[project.lead].name },
          { id: "due", term: "Due", description: formatDate(due) },
        ]} />
      </Stack>
      <SidePanel type="modal" open={open} onOpenChange={(next) => (next ? setOpen(true) : requestClose())} title="Edit project" description="Loyalty app · Phin & Co"
        // The footer sits outside the form, so Save changes submits it: errors then get focus and are announced.
        primaryAction={{ label: form.isSubmitting ? "Saving…" : "Save changes", disabled: form.isSubmitting, onClick: () => formRef.current?.requestSubmit() }}
        secondaryAction={{ label: "Cancel", onClick: requestClose }}>
        <Form ref={formRef} form={form} gap="md" aria-label="Edit project">
          <InputField label="Project name" maxLength={60} {...form.field("name")} />
          <SelectField label="Status" options={projectStatuses.map((value) => ({ value, label: value }))} {...form.selectField("status")} />
          <SelectField label="Project lead" options={leadIds.map((id) => ({ value: id, label: people[id].name }))} {...form.selectField("lead")} />
          <DateField label="Due date" today={TODAY} {...form.dateField("due")} />
          <TextAreaField label="Brief" labelOptional rows={4} maxLength={200} characterLimit {...form.field("brief")} />
        </Form>
      </SidePanel>
      {/* The one Dialog a panel may open: it guards edits that would be lost. */}
      <Dialog open={confirming} onOpenChange={setConfirming} theme="warning" title="Discard changes?"
        description="Your edits to Loyalty app are lost."
        primaryAction={{ label: "Discard changes", level: "danger", onClick: discard }}
        secondaryAction={{ label: "Keep editing", autoFocus: true }} />
    </Card>
  );
}
