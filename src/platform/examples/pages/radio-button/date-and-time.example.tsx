import { useId, useState } from "react";
import { Box, Button, Card, DescriptionList, Form, FormActions, FormFieldset, Grid, Heading, RadioButton, Stack, Text, useToast } from "@zen-ds/react";
import { daysFromToday, formatRange, formatTime } from "../../data";

type TimePrefs = { clock: "12" | "24"; week: "monday" | "sunday" };
const savedPrefs: TimePrefs = { clock: "12", week: "monday" };
const clientReview = daysFromToday(1, 14, 0);

/** Two short groups in a row, with a live preview. */
export default function DateTime() {
  const { toast } = useToast();
  const clockName = useId();
  const weekName = useId();
  const [saved, setSaved] = useState(savedPrefs);
  const [draft, setDraft] = useState(savedPrefs);
  const dirty = draft.clock !== saved.clock || draft.week !== saved.week;
  const pick = (next: Partial<TimePrefs>) => (checked: boolean) => { if (checked) setDraft({ ...draft, ...next }); };
  const time = draft.clock === "12" ? formatTime(clientReview) : `${clientReview.getHours()}:${String(clientReview.getMinutes()).padStart(2, "0")}`;
  const week = draft.week === "monday" ? formatRange(daysFromToday(-2), daysFromToday(4)) : formatRange(daysFromToday(-3), daysFromToday(3));
  const save = () => { setSaved(draft); toast({ title: "Preferences saved" }); };
  return (
    <Card theme="default">
      <Form onSubmit={save}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Date and time</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">How times and weeks show for you across Zen. Teammates keep their own settings.</Text>
        </Stack>
        <Grid minColumnWidth={400} gap="lg" align="start">
          <Stack gap="md" direction="column">
            {/* Two short options: a row (direction="row"), not a column. */}
            <FormFieldset kind="radio" legend="Time format" direction="column">
              <RadioButton name={clockName} value="12" label="12-hour" checked={draft.clock === "12"} onCheckedChange={pick({ clock: "12" })} />
              <RadioButton name={clockName} value="24" label="24-hour" checked={draft.clock === "24"} onCheckedChange={pick({ clock: "24" })} />
            </FormFieldset>
            <FormFieldset kind="radio" legend="Week starts on" direction="column">
              <RadioButton name={weekName} value="monday" label="Monday" checked={draft.week === "monday"} onCheckedChange={pick({ week: "monday" })} />
              <RadioButton name={weekName} value="sunday" label="Sunday" checked={draft.week === "sunday"} onCheckedChange={pick({ week: "sunday" })} />
            </FormFieldset>
          </Stack>
          <Box surface="pale" radius="lg" padding="md" aria-live="polite">
            <DescriptionList items={[{ term: "Client review", description: `Thursday at ${time}` }, { term: "This week", description: week }]} />
          </Box>
        </Grid>
        <FormActions align="between">
          <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{dirty ? "Unsaved changes" : ""}</Text>
          <Button level="tertiary" disabled={!dirty} onClick={() => setDraft(saved)}>Cancel</Button>
          <Button level="primary" type="submit" disabled={!dirty}>Save preferences</Button>
        </FormActions>
      </Form>
    </Card>
  );
}
