import { useState } from "react";
import { Badge, Button, DescriptionList, Heading, InputField, List, ListItem, ModalForm, PageHeader, Stack, useFormState, useToast } from "@zen-ds/react";

/** Child page (an item under a master page): Back named after the parent, the item's name as h1 Heading/1, same section ladder. */
export default function ChildPage() {
  const { toast } = useToast();
  const [back, setBack] = useState(false);
  // Edit changes the dates; the description and details follow.
  const [dates, setDates] = useState("Oct 14 – Oct 16, 2026");
  const [editing, setEditing] = useState(false);
  const edit = useFormState<{ dates: string }>({
    initialValues: { dates: "" },
    validate: ({ dates: value }) => ({ dates: value.trim() ? undefined : "Enter the dates" }),
    onSubmit: ({ dates: value }, { reset }) => {
      setDates(value.trim());
      setEditing(false);
      reset();
      toast({ type: "positive", title: `Dates changed to ${value.trim()}` });
    },
  });
  return (
    // In the app, the tab title follows each view's h1: <title>Annual leave · Acme</title>.
    <Stack gap="xl" padding="xl" radius="lg" surface="canvas" width="fill" align="stretch">
      <PageHeader back={{ label: back ? "Time off (pressed)" : "Time off", onClick: () => setBack(true) }} title="Annual leave"
        meta={<Badge size="small" theme="green" background="subtle">Approved</Badge>} description={`Ava Chen · 3 days, ${dates}.`}
        actions={<Button level="tertiary" size="sm" onClick={() => setEditing(true)}>Edit</Button>} />
      <Stack as="section" gap="sm" align="stretch">
        <Heading level={2} textStyle="Heading/4">Details</Heading>
        <DescriptionList items={[{ term: "Type", description: "Annual leave" }, { term: "Dates", description: dates }, { term: "Approver", description: "Chi Tran" }]} />
      </Stack>
      <Stack as="section" gap="sm" align="stretch">
        <Heading level={2} textStyle="Heading/4">Activity</Heading>
        <List aria-label="Activity">
          <ListItem title="Chi Tran approved the request" caption="2 hours ago" />
          <ListItem title="Ava Chen submitted the request" caption="Yesterday" />
        </List>
      </Stack>
      <ModalForm open={editing} onOpenChange={(next) => { setEditing(next); if (!next) edit.reset(); }} title="Edit request" description="Chi Tran approves the change again."
        onSubmit={edit.handleSubmit} primaryAction={{ label: "Save" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Dates" autoComplete="off" placeholder={dates} data-autofocus="" {...edit.field("dates")} />
      </ModalForm>
    </Stack>
  );
}
