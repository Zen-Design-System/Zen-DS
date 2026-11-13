import { useId } from "react";
import { Button, Card, Form, FormActions, Heading, InlineMessage, InputField, plural, useFormState, useToast } from "@zen-ds/react";

type NewClient = { company: string; contact: string; email: string };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ErrorSummary() {
  const { toast } = useToast();
  const titleId = useId();
  const form = useFormState<NewClient>({
    initialValues: { company: "", contact: "", email: "" },
    validate: ({ company, contact, email }) => ({
      company: company.trim() ? undefined : "Enter the company name",
      contact: contact.trim() ? undefined : "Enter who receives the invoices",
      email: !email.trim() ? "Enter a billing email" : emailPattern.test(email.trim()) ? undefined : "Enter an email like name@company.com",
    }),
    onSubmit: ({ company }, { reset }) => { reset(); toast({ title: "Client added", children: company.trim() }); },
  });
  const count = Object.keys(form.errors).length;
  return (
    <Card theme="default" width="fill" maxWidth={480}>
      {/* Form moves focus to the first invalid field after a failed submit; the summary counts what is left. */}
      <Form form={form} gap="md" aria-labelledby={titleId}>
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">New client</Heading>
        {form.submitCount > 0 && count > 0 ? (
          <InlineMessage theme="negative" title={`Fix ${plural(count, "field")} to add the client`}>
            Each field below says what’s missing.
          </InlineMessage>
        ) : null}
        <InputField label="Company name" autoComplete="organization" {...form.field("company")} />
        <InputField label="Billing contact" autoComplete="name" {...form.field("contact")} />
        <InputField label="Billing email" type="email" autoComplete="email" {...form.field("email")} />
        <FormActions>
          <Button level="primary" type="submit">Add client</Button>
        </FormActions>
      </Form>
    </Card>
  );
}
