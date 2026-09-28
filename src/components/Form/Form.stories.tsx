import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button";
import { Checkbox } from "../Checkbox";
import { InlineMessage } from "../InlineMessage";
import { InputField, SelectField } from "../Input";
import { Box, Grid, Stack } from "../Layout";
import { RadioButton } from "../RadioButton";
import { Slider } from "../Slider";
import { Heading, Text } from "../Text";
import { Toggle } from "../Toggle";
import { Form, FormActions, FormField, FormFieldset } from "./Form";
import { useFormState, type FormErrors } from "./useFormState";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

type ContactValues = { name: string; email: string; team: string; terms: boolean };
const validateContact = (values: ContactValues): FormErrors<ContactValues> => ({
  name: values.name.trim() ? undefined : "Enter your full name",
  email: !values.email.trim() ? "Enter your work email" : isEmail(values.email) ? undefined : "Enter a valid email address, like name@company.com",
  terms: values.terms ? undefined : "Accept the Terms of Service to continue",
});
const teams = [{ label: "Design", value: "design" }, { label: "Engineering", value: "engineering" }, { label: "Product", value: "product" }];

/** Sign-up form: Stack of fields, a consent Checkbox in a FormField, FormActions with the submit button. */
function SignUpForm({ width = 440 }: { width?: number }) {
  const [done, setDone] = useState<string | null>(null);
  const form = useFormState<ContactValues>({
    initialValues: { name: "", email: "", team: "design", terms: false },
    validate: validateContact,
    onSubmit: async (values, { reset }) => { await wait(500); setDone(values.email); reset(); },
  });
  return (
    <Box surface="surface" border="pale" radius="xl" padding="xl" style={{ width, maxWidth: "100%" }}>
      <Form form={form} aria-label="Create an account">
        {done ? <InlineMessage theme="positive" title="Account created" onClose={() => setDone(null)}>We sent a link to {done}.</InlineMessage> : null}
        <Stack gap="md">
          <InputField label="Full name" autoComplete="name" {...form.field("name")} />
          <InputField label="Work email" type="email" placeholder="name@company.com" {...form.field("email")} />
          <SelectField label="Team" options={teams} {...form.selectField("team")} />
          <FormField error={form.fieldError("terms")}>
            <Checkbox label="I agree to the Terms of Service" {...form.checkboxField("terms")} />
          </FormField>
        </Stack>
        <FormActions>
          <Button level="tertiary" onClick={() => form.reset()}>Cancel</Button>
          <Button level="primary" type="submit">{form.isSubmitting ? "Creating account…" : "Create account"}</Button>
        </FormActions>
      </Form>
    </Box>
  );
}

const meta = {
  title: "Components/Form",
  component: Form,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: { description: { component: "Form, FormField, FormFieldset and FormActions with the useFormState hook. Submit empty to see errors, focus on the first invalid field and the live announcement." } },
  },
  render: () => <SignUpForm width={560} />,
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Under 480px the actions stack: full-width Large buttons, Primary on top. */
export const NarrowContainer: Story = { render: () => <SignUpForm width={360} /> };

export const TwoColumns: Story = {
  render: function TwoColumnsStory() {
    const form = useFormState({
      initialValues: { first: "Minh Anh", last: "Nguyen", email: "", city: "Ho Chi Minh City" },
      validate: (values) => ({ email: isEmail(values.email) ? undefined : "Enter a valid email address, like name@company.com" }),
      onSubmit: () => wait(400),
    });
    return (
      <Box surface="surface" border="pale" radius="xl" padding="xl" style={{ maxWidth: 720 }}>
        <Form form={form} aria-label="Profile">
          <Grid columns={{ mobile: 1, desktop: 2 }} gap="md">
            <InputField label="First name" {...form.field("first")} />
            <InputField label="Last name" {...form.field("last")} />
            <InputField label="Email" type="email" {...form.field("email")} />
            <InputField label="City" {...form.field("city")} />
          </Grid>
          <FormActions>
            <Button level="tertiary" onClick={() => form.reset()}>Cancel</Button>
            <Button level="primary" type="submit">Save profile</Button>
          </FormActions>
        </Form>
      </Box>
    );
  },
};

export const Fieldsets: Story = {
  render: function FieldsetsStory() {
    const [digest, setDigest] = useState(true);
    const form = useFormState<{ delivery: "" | "standard" | "express"; topics: string[] }>({
      initialValues: { delivery: "", topics: [] },
      validate: (values) => ({ delivery: values.delivery ? undefined : "Choose a delivery speed", topics: values.topics.length ? undefined : "Choose at least one topic" }),
      onSubmit: () => wait(400),
    });
    const topics = form.values.topics;
    return (
      <Stack gap="xl" style={{ maxWidth: 420 }}>
        <Form form={form} aria-label="Order options">
          <FormFieldset kind="radio" legend="Delivery" required error={form.fieldError("delivery")}>
            <RadioButton label="Standard · Free" caption="3–5 business days" {...form.radioField("delivery", "standard")} />
            <RadioButton label="Express · $9.00" caption="Tomorrow, before noon" {...form.radioField("delivery", "express")} />
          </FormFieldset>
          <FormFieldset kind="checkbox" legend="Email me about" helpText="Pick one or more." error={form.fieldError("topics")}>
            {["Releases", "Events", "Research"].map((topic) => (
              <Checkbox key={topic} name="topics" value={topic} label={topic} checked={topics.includes(topic)}
                onCheckedChange={(checked) => form.setValue("topics", checked ? [...topics, topic] : topics.filter((item) => item !== topic), { touch: true })} />
            ))}
          </FormFieldset>
          <FormActions><Button level="primary" type="submit">Save options</Button></FormActions>
        </Form>
        {/* Toggles apply at once, so their group lives outside the submitted form. */}
        <FormFieldset kind="toggle" legend="Notifications" helpText="Changes apply right away.">
          <Toggle label="Weekly digest" checked={digest} onCheckedChange={setDigest} />
        </FormFieldset>
      </Stack>
    );
  },
};

export const CustomControl: Story = {
  render: function CustomControlStory() {
    const form = useFormState({
      initialValues: { budget: 400 },
      validate: (values) => ({ budget: values.budget >= 500 ? undefined : "Set a budget of at least $500" }),
      onSubmit: () => wait(400),
    });
    return (
      <Form form={form} aria-label="Budget" style={{ maxWidth: 420 }}>
        <FormField label="Monthly budget" helpText={`$${form.values.budget} a month`} error={form.fieldError("budget")}>
          <Slider min={0} max={5000} step={100} value={form.values.budget} onValueChange={(value) => form.setValue("budget", value, { touch: true })} />
        </FormField>
        <FormActions><Button level="primary" type="submit">Save budget</Button></FormActions>
      </Form>
    );
  },
};

export const StickyActions: Story = {
  render: function StickyStory() {
    const form = useFormState({
      initialValues: { company: "Zen Studio", email: "", address: "", city: "", postalCode: "", country: "vn" },
      validate: (values) => ({ email: isEmail(values.email) ? undefined : "Enter a billing email" }),
      onSubmit: () => wait(400),
    });
    return (
      <Box surface="surface" border="pale" radius="xl" style={{ maxWidth: 520, maxHeight: 360, overflow: "auto" }}>
        <Form form={form} gap="none" aria-label="Billing details">
          <Stack gap="md" padding="xl">
            <Heading level={2} textStyle="Heading/Subheading">Billing details</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">The actions stay pinned while the fields scroll.</Text>
            <InputField label="Company name" {...form.field("company")} />
            <InputField label="Billing email" type="email" {...form.field("email")} />
            <InputField label="Street address" {...form.field("address")} />
            <InputField label="City" {...form.field("city")} />
            <InputField label="Postal code" {...form.field("postalCode")} />
          </Stack>
          <FormActions sticky inset="xl">
            <Button level="tertiary" onClick={() => form.reset()}>Cancel</Button>
            <Button level="primary" type="submit">Save billing details</Button>
          </FormActions>
        </Form>
      </Box>
    );
  },
};
