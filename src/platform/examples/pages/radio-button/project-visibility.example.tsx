import { useId, useState } from "react";
import { Button, Card, Form, FormActions, FormFieldset, Grid, Heading, RadioButton, Stack, Text, useToast } from "@zen-ds/react";
import { projectById } from "../../data";

const loyalty = projectById("phin-loyalty");
const visibilityOptions = [
  { id: "members", label: "Project members", caption: "Chi, Bao, Em and Duy can open it" },
  { id: "studio", label: "Everyone at Đìzai Studio", caption: "All 48 people can find and open it" },
  { id: "guests", label: "Members and Phin & Co guests", caption: "Turn on client guest access in Settings first", disabled: true },
];

/** Radio cards in a row, one option unavailable. */
export default function ProjectVisibility() {
  const { toast } = useToast();
  const name = useId();
  const headingId = useId();
  const [saved, setSaved] = useState("members");
  const [visibility, setVisibility] = useState(saved);
  const save = () => {
    setSaved(visibility);
    toast({ title: "Visibility updated", children: `${visibilityOptions.find((option) => option.id === visibility)?.label} can open ${loyalty.name}` });
  };
  const dirty = visibility !== saved;
  // A settings section on the page: the form is named by its heading; header, options and actions take the Form's gap.
  return (
    <Form onSubmit={save} aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Visibility</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{loyalty.name} · {loyalty.client}. People outside the project find it only if you allow it.</Text>
      </Stack>
      <FormFieldset kind="radio" legend={`Who can open ${loyalty.name}`}>
        {/* Radio cards: flat Surfaces on the Canvas, the radio spans the card and the selected card gets the Active stroke. */}
        <Grid minColumnWidth={280} gap="md">
          {visibilityOptions.map((option) => (
            <Card key={option.id} theme="default" spacing="small" selected={visibility === option.id}>
              <RadioButton name={name} value={option.id} bold label={option.label} caption={option.caption} disabled={option.disabled}
                checked={visibility === option.id} onCheckedChange={(checked) => { if (checked) setVisibility(option.id); }} />
            </Card>
          ))}
        </Grid>
      </FormFieldset>
      {/* Nothing to cancel or save until the choice differs from what is saved. */}
      <FormActions align="between">
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
        <Button level="tertiary" disabled={!dirty} onClick={() => setVisibility(saved)}>Cancel</Button>
        <Button level="primary" type="submit" disabled={!dirty}>Save visibility</Button>
      </FormActions>
    </Form>
  );
}
