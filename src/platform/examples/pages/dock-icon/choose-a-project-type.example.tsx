import { useState } from "react";
import {
  Box, Button, Card, DockIcon, Form, FormActions, FormFieldset, Grid, Heading, InputField, ModalForm, Stack, Text, useFormState, useToast,
  type DockIconTheme, type IconName,
} from "@zen-ds/react";

type ProjectType = { id: string; name: string; caption: string; icon: IconName; theme: DockIconTheme };
/** The same colour per kind of work everywhere in Zen: Loyalty app is orange, Book Fair purple, Brand refresh green. */
const projectTypes: ProjectType[] = [
  { id: "mobile", name: "Mobile app", caption: "iOS and Android, from flows to store assets", icon: "icon-mobile-line", theme: "orange" },
  { id: "website", name: "Website", caption: "Marketing sites and web apps", icon: "icon-browser-line", theme: "purple" },
  { id: "brand", name: "Brand identity", caption: "Logo, type, colour and guidelines", icon: "icon-palette-line", theme: "green" },
  { id: "system", name: "Design system", caption: "Tokens, components and docs", icon: "icon-grid-01-line", theme: "indigo" },
  { id: "research", name: "Research study", caption: "Interviews, usability tests and a report", icon: "icon-beaker-02-line", theme: "teal" },
  { id: "workshop", name: "Workshop", caption: "Discovery and co-design sessions", icon: "icon-presentation-chart-line", theme: "pink" },
];

export default function ChooseProjectType() {
  const { toast } = useToast();
  const [typeId, setTypeId] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [naming, setNaming] = useState(false);
  const type = projectTypes.find((t) => t.id === typeId);
  const pick = (id: string) => { setTypeId(id); setMissing(false); };
  // Create project with a type asks for the project's name; a name closes the dialog and a toast confirms it.
  const project = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a project name" }),
    onSubmit: ({ name }, { reset }) => {
      setNaming(false);
      reset();
      toast({ type: "positive", title: `${name.trim()} created` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeNaming = (open: boolean) => { setNaming(open); if (!open) project.reset(); };
  return (
    <>
      {/* Without a pick, Form moves focus to the first type card and announces the group's error. */}
      <Box width="fill"><Form onSubmit={() => (type ? setNaming(true) : setMissing(true))} invalidMessage={() => "Choose a project type to continue"}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">New project for Mekong Freight</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">The kind of work sets the phases, the team template and the budget lines.</Text>
        </Stack>
        <FormFieldset legend="Project type" error={missing ? "Choose a project type to continue" : undefined}>
          <Grid minColumnWidth={280} gap="md">
            {projectTypes.map((t) => (
              <Card key={t.id} theme="border" selected={t.id === typeId} aria-pressed={t.id === typeId} onClick={() => pick(t.id)}>
                <Stack gap="md">
                  {/* Decorative: the name is right under it. */}
                  <DockIcon icon={t.icon} theme={t.theme} size="xl" />
                  <Stack gap="xs">
                    <Text as="span" textStyle="Body/Base/Bold">{t.name}</Text>
                    <Text as="span" textStyle="Body/Small/Regular" tone="base">{t.caption}</Text>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Grid>
        </FormFieldset>
        <FormActions><Button level="primary" type="submit">Create project</Button></FormActions>
      </Form></Box>
      <ModalForm open={naming} onOpenChange={changeNaming} title={type ? `New ${type.name.toLowerCase()} project` : "New project"}
        description="Mekong Freight is the client. You can invite the team next." onSubmit={project.handleSubmit}
        primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" type="text" autoComplete="off" placeholder="Driver app" data-autofocus="" {...project.field("name")} />
      </ModalForm>
    </>
  );
}
