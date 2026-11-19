import { useState } from "react";
import { Button, Card, Checkbox, Form, FormActions, FormFieldset, Grid, Heading, Stack, Text, plural, useToast } from "@zen-ds/react";
import { studio } from "../../data";

type Permission = { id: string; label: string; caption: string; locked?: boolean };
const permissionGroups: Array<{ id: string; legend: string; permissions: Permission[] }> = [
  { id: "projects", legend: "Projects", permissions: [
    { id: "view", label: "View all projects", caption: "Every role can view projects", locked: true },
    { id: "edit", label: "Edit files and tasks", caption: "Change designs, tasks and comments in their projects" },
    { id: "members", label: "Manage project members", caption: "Add people to a project or remove them" },
  ] },
  { id: "clients", legend: "Clients and billing", permissions: [
    { id: "guests", label: "Invite client guests", caption: "Add client contacts to a project as guests" },
    { id: "budgets", label: "See budgets and spend", caption: "Budget, hours and spend of their projects" },
    { id: "invoices", label: "Send invoices", caption: "Only the Finance role sends invoices", locked: true },
  ] },
];
const savedDesigner: Record<string, boolean> = { view: true, edit: true, members: false, guests: false, budgets: true, invoices: false };

/** A settings form saved later, with locked options and their reason. */
export default function RolePermissions() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(savedDesigner);
  const [draft, setDraft] = useState(savedDesigner);
  const dirty = Object.keys(saved).some((id) => draft[id] !== saved[id]);
  const save = () => { setSaved(draft); toast({ title: "Designer role saved" }); };
  return (
    <Card theme="default">
      <Form onSubmit={save}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Designer</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{plural(12, "person", "people")} at {studio.name} have this role. Changes apply the next time they open Zen.</Text>
        </Stack>
        <Grid minColumnWidth={400} gap="lg" align="start">
          {permissionGroups.map((group) => (
            <FormFieldset key={group.id} kind="checkbox" legend={group.legend}>
              {group.permissions.map((permission) => (
                <Checkbox key={permission.id} label={permission.label} caption={permission.caption} disabled={permission.locked}
                  checked={draft[permission.id]} onCheckedChange={(on) => setDraft({ ...draft, [permission.id]: on })} />
              ))}
            </FormFieldset>
          ))}
        </Grid>
        {/* Nothing to cancel or save until the draft differs from what is saved; the status line says so. */}
        <FormActions align="between">
          <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
          <Button level="tertiary" disabled={!dirty} onClick={() => setDraft(saved)}>Cancel</Button>
          <Button level="primary" type="submit" disabled={!dirty}>Save changes</Button>
        </FormActions>
      </Form>
    </Card>
  );
}
