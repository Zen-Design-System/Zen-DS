import { useState } from "react";
import { Button, Card, Checkbox, DescriptionList, Form, FormActions, FormFieldset, Heading, InlineMessage, Stack, Text, useFormState } from "@zen-ds/react";
import { daysFromToday, formatRange, people } from "../../data";

const loggedHours = [
  { project: "Loyalty app", client: "Phin & Co", hours: 18 },
  { project: "Online banking redesign", client: "Lumen Bank", hours: 16.5 },
  { project: "Zen design system", client: "Đìzai Studio", hours: 5.5 },
];
const hoursLabel = (hours: number) => `${hours.toFixed(1)} h`;

/** One checkbox that the submit checks. */
export default function ConfirmTimesheet() {
  const [submitted, setSubmitted] = useState(false);
  const form = useFormState({
    initialValues: { confirmed: false },
    validate: ({ confirmed }) => ({ confirmed: confirmed ? undefined : "Confirm your hours to submit the timesheet" }),
    onSubmit: () => setSubmitted(true),
  });
  const total = loggedHours.reduce((sum, row) => sum + row.hours, 0);
  const withdraw = () => { setSubmitted(false); form.reset(); };
  // The whole card is the form: its groups (header, hours, confirmation, actions) take the Form's gap.
  return (
    <Card theme="default">
      <Form form={form}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Timesheet</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{formatRange(daysFromToday(-9), daysFromToday(-3))}</Text>
        </Stack>
        <DescriptionList items={[
          ...loggedHours.map((row) => ({ term: `${row.project} · ${row.client}`, description: hoursLabel(row.hours) })),
          { term: "Total", description: hoursLabel(total), emphasis: true },
        ]} />
        {submitted ? (
          <InlineMessage theme="positive" title="Timesheet submitted" action={{ label: "Withdraw", onClick: withdraw }}>
            {people.duy.name} reviews it by Friday.
          </InlineMessage>
        ) : (
          <>
            <FormFieldset legend="Confirmation" hideLegend error={form.fieldError("confirmed")}>
              <Checkbox label="I confirm these hours are accurate" caption="They are billed to Phin & Co and Lumen Bank in October." {...form.checkboxField("confirmed")} />
            </FormFieldset>
            <FormActions>
              <Button level="primary" type="submit">Submit timesheet</Button>
            </FormActions>
          </>
        )}
      </Form>
    </Card>
  );
}
