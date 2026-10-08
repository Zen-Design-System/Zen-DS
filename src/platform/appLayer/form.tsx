import { useState } from "react";
import { Button } from "../../components/Button";
import { Form, FormActions, useFormState, type FormErrors } from "../../components/Form";
import { InlineMessage } from "../../components/InlineMessage";
import { InputField, SelectField } from "../../components/Input";
import { Box, Grid, Stack } from "../../components/Layout";
import { ZenProvider } from "../../components/Provider";
import { TopNavigation } from "../../components/TopNavigation";
import { PlatformPhone } from "../PlatformPhone";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./form.css";

/* ───────────── Shared data ───────────── */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
const emailError = (value: string, empty: string) => (!value.trim() ? empty : emailPattern.test(value.trim()) ? undefined : "Enter a valid email address, like name@company.com");
const countries = [
  { label: "Vietnam", value: "vn" },
  { label: "Singapore", value: "sg" },
  { label: "Japan", value: "jp" },
  { label: "Germany", value: "de" },
  { label: "United States", value: "us" },
];

/* ───────────── Playground ───────────── */

type BillingValues = { company: string; email: string; address: string; city: string; postalCode: string; country: string; taxId: string; purchaseOrder: string };
const billingInitial: BillingValues = { company: "Zen Studio", email: "", address: "", city: "Ho Chi Minh City", postalCode: "", country: "vn", taxId: "", purchaseOrder: "" };

function validateBilling(values: BillingValues): FormErrors<BillingValues> {
  const postal = values.postalCode.trim();
  return {
    company: values.company.trim() ? undefined : "Enter your company name",
    email: emailError(values.email, "Enter a billing email"),
    address: values.address.trim() ? undefined : "Enter the street address",
    city: values.city.trim() ? undefined : "Enter the city",
    postalCode: !postal ? "Enter the postal code" : /^\d{4,6}$/.test(postal) ? undefined : "Use 4–6 digits, like 700000",
    taxId: values.taxId && !/^[A-Z0-9-]{8,15}$/i.test(values.taxId.trim()) ? "Use 8–15 letters or digits, like 0312345678" : undefined,
  };
}

function FormPlayground() {
  const [validation, setValidation] = useState(true);
  const [columns, setColumns] = useState<"one" | "two">("two");
  const [sticky, setSticky] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [saved, setSaved] = useState(false);
  const form = useFormState<BillingValues>({
    initialValues: billingInitial,
    validate: validation ? validateBilling : undefined,
    onSubmit: async (values, { reset }) => {
      await wait(600);
      reset(values);
      setSaved(true);
    },
  });
  const twoColumns = columns === "two" && !mobile;
  const inset = sticky || mobile;
  // Full-bleed layouts (a sticky bar or a phone screen) pad the fields and the bar alike: xl in the card, lg (20px) on a phone.
  const edge = mobile ? "lg" : "xl";
  const body = (
    <Stack gap="md" padding={inset ? edge : "none"}>
      {saved && !form.isDirty ? <InlineMessage theme="positive" title="Billing details saved" onClose={() => setSaved(false)}>The next invoice goes to {form.values.email}.</InlineMessage> : null}
      <Grid columns={twoColumns ? { mobile: 1, desktop: 2 } : 1} gap="md">
        <InputField label="Company name" autoComplete="organization" {...form.field("company")} />
        <InputField label="Billing email" type="email" autoComplete="email" placeholder="billing@company.com" {...form.field("email")} />
        <InputField label="Street address" autoComplete="street-address" placeholder="12 Nguyen Hue, District 1" {...form.field("address")} />
        <InputField label="City" autoComplete="address-level2" {...form.field("city")} />
        <InputField label="Postal code" autoComplete="postal-code" inputMode="numeric" placeholder="700000" {...form.field("postalCode")} />
        <SelectField label="Country" options={countries} {...form.selectField("country")} />
        <InputField label="Tax ID" labelOptional placeholder="0312345678" helpText="Printed on every invoice." {...form.field("taxId")} />
        <InputField label="Purchase order" labelOptional placeholder="PO-2026-114" {...form.field("purchaseOrder")} />
      </Grid>
    </Stack>
  );
  const actions = (
    <FormActions sticky={sticky} inset={inset ? edge : undefined}>
      <Button level="tertiary" onClick={() => { form.reset(); setSaved(false); }}>Cancel</Button>
      <Button level="primary" type="submit">{form.isSubmitting ? "Saving…" : "Save billing details"}</Button>
    </FormActions>
  );
  const formNode = <Form form={form} gap={inset ? "none" : "lg"} aria-label="Billing details">{body}{actions}</Form>;
  const preview = mobile ? (
    <ZenProvider paint={false} portal={false} breakpoint="mobile" className="pef-stage pef-phone-stage">
      <PlatformPhone className="pef-phone" label="Billing details form" header={<TopNavigation type="compact-alt" title="Billing details" />}>{formNode}</PlatformPhone>
    </ZenProvider>
  ) : (
    <ZenProvider paint={false} portal={false} className="pef-stage">
      <Box surface="surface" border="none" radius="xl" padding={inset ? "none" : "xl"} className="pef-card">
        {sticky ? <div className="pef-scroll">{formNode}</div> : formNode}
      </Box>
    </ZenProvider>
  );
  const grid = twoColumns ? "<Grid columns={{ mobile: 1, desktop: 2 }} gap=\"md\">" : "<Grid columns={1} gap=\"md\">";
  const code = `import { Button, Form, FormActions, Grid, InputField, SelectField, Stack, useFormState } from "@zen/design-system";

const form = useFormState({
  initialValues: { company: "Zen Studio", email: "", address: "", city: "", postalCode: "", country: "vn", taxId: "", purchaseOrder: "" },${validation ? `
  validate: (values) => ({
    email: !values.email ? "Enter a billing email" : isEmail(values.email) ? undefined : "Enter a valid email address, like name@company.com",
    postalCode: /^\\d{4,6}$/.test(values.postalCode) ? undefined : "Use 4–6 digits, like 700000",
    // …one message per invalid field
  }),` : ""}
  onSubmit: async (values, { reset }) => { await saveBilling(values); reset(values); },
});

<Form form={form}${inset ? ` gap="none"` : ""} aria-label="Billing details">
  <Stack gap="md"${inset ? ` padding="${edge}"` : ""}>
    ${grid}
      <InputField label="Company name" autoComplete="organization" {...form.field("company")} />
      <InputField label="Billing email" type="email" {...form.field("email")} />
      …
      <SelectField label="Country" options={countries} {...form.selectField("country")} />
      <InputField label="Tax ID" labelOptional helpText="Printed on every invoice." {...form.field("taxId")} />
    </Grid>
  </Stack>
  <FormActions${sticky ? " sticky" : ""}${inset ? ` inset="${edge}"` : ""}>
    <Button level="tertiary" onClick={() => form.reset()}>Cancel</Button>
    <Button level="primary" type="submit">{form.isSubmitting ? "Saving…" : "Save billing details"}</Button>
  </FormActions>
</Form>`;
  return (
    <Panel
      title="Form"
      previewClassName="pef-preview"
      controls={<>
        <PlaygroundToggle label="Validation" selected={validation} onChange={setValidation} />
        <PlaygroundFilterChip label="Layout" value={columns} onChange={(value) => setColumns((String(value) || "two") as "one" | "two")} options={[option("one", "One column"), option("two", "Two columns")]} />
        <PlaygroundToggle label="Sticky actions" selected={sticky} onChange={setSticky} />
        <PlaygroundToggle label="Mobile" selected={mobile} onChange={setMobile} />
      </>}
      code={code}
    >
      {preview}
    </Panel>
  );
}

/* ───────────── Page ───────────── */

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  form: {
    label: "Form",
    eyebrow: "Components / Form",
    title: "Form",
    description: "Form, FormField, FormFieldset and FormActions with the useFormState hook: fields bind in one spread, errors show on blur and on submit, focus moves to the first invalid field, and the footer stacks on phones.",
    playground: FormPlayground,
  },
});

// The examples of these pages live in src/platform/examples/pages/<page>.tsx (examples/registry.ts).
export const examples: ExampleMap = {};
