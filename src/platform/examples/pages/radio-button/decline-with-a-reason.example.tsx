import { useState } from "react";
import { Button, Card, Form, FormActions, FormFieldset, Heading, InlineMessage, RadioButton, Stack, Text, TextAreaField, useFormState } from "@zen-ds/react";
import { daysFromToday, formatRelative, people } from "../../data";

const declineReasons = [
  { id: "wrong", label: "I'm not the right reviewer" },
  { id: "context", label: "It needs more context first" },
  { id: "away", label: "I'm out until Monday" },
  { id: "other", label: "Something else" },
];

/** No default, and "Something else" asks for a note. */
export default function DeclineReview() {
  const bao = people.bao;
  const [declined, setDeclined] = useState(false);
  // No option is safe to assume here, so none is pre-selected and the group is required.
  const form = useFormState({
    initialValues: { reason: "", note: "" },
    validate: ({ reason, note }) => ({
      reason: reason ? undefined : "Choose a reason",
      note: reason === "other" && !note.trim() ? "Tell Bao why in a few words" : undefined,
    }),
    onSubmit: () => setDeclined(true),
  });
  // The whole card is the form: header, reason, note and actions take the Form's gap.
  return (
    <Card theme="default">
      <Form form={form}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Connect the rewards API to checkout</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">PHIN-219 · {bao.name} asked for your review {formatRelative(daysFromToday(0, 10, 17))}</Text>
        </Stack>
        {declined ? (
          <InlineMessage theme="neutral" title="Review declined" action={{ label: "Undo", onClick: () => setDeclined(false) }}>
            Bao sees your reason and can ask someone else.
          </InlineMessage>
        ) : (
          <>
            <FormFieldset kind="radio" legend="Why are you declining?" required error={form.fieldError("reason")}>
              {declineReasons.map((reason) => <RadioButton key={reason.id} label={reason.label} {...form.radioField("reason", reason.id)} />)}
            </FormFieldset>
            {form.values.reason === "other" ? <TextAreaField label="Note for Bao" rows={3} {...form.field("note")} /> : null}
            <FormActions>
              <Button level="primary" type="submit">Decline review</Button>
            </FormActions>
          </>
        )}
      </Form>
    </Card>
  );
}
