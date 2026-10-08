import { useId, useRef, useState } from "react";
import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Checkbox } from "../../components/Checkbox";
import { ColorSelector } from "../../components/ColorSelector";
import { ModalForm } from "../../components/Dialog";
import { Form, FormActions, FormField, FormFieldset, useFormState, type FormErrors } from "../../components/Form";
import { Icon } from "../../components/Icon";
import { InlineMessage } from "../../components/InlineMessage";
import { InputConditionItem, InputConditions, InputField, SelectField, TextAreaField } from "../../components/Input";
import { Box, Grid, Stack } from "../../components/Layout";
import { List, ListItem } from "../../components/ListItem";
import { ZenProvider } from "../../components/Provider";
import { RadioButton } from "../../components/RadioButton";
import { Slider } from "../../components/Slider";
import { Heading, Text, plural } from "../../components/Text";
import { useToast } from "../../components/Toast";
import { Toggle } from "../../components/Toggle";
import { TopNavigation } from "../../components/TopNavigation";
import { PlatformPhone } from "../PlatformPhone";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./form.css";

/* ───────────── Shared data ───────────── */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
const money = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(amount) && amount >= 100 ? 0 : 2 });
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

/* ───────────── Example: sign-up ───────────── */

type SignUpValues = { name: string; email: string; password: string; role: string; terms: boolean };
const passwordRules = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One digit (0–9)", test: (value: string) => /\d/.test(value) },
];
const jobRoles = [
  { label: "Design", value: "design" },
  { label: "Engineering", value: "engineering" },
  { label: "Product management", value: "product" },
  { label: "Marketing", value: "marketing" },
  { label: "Something else", value: "other" },
];

function validateSignUp(values: SignUpValues): FormErrors<SignUpValues> {
  return {
    name: values.name.trim() ? undefined : "Enter your full name",
    email: emailError(values.email, "Enter your work email"),
    password: !values.password ? "Create a password" : passwordRules.every((rule) => rule.test(values.password)) ? undefined : "Meet all three password rules",
    terms: values.terms ? undefined : "Accept the Terms of Service to create an account",
  };
}

function SignUpExample() {
  const titleId = useId();
  const { toast } = useToast();
  const form = useFormState<SignUpValues>({
    initialValues: { name: "", email: "", password: "", role: "design", terms: false },
    validate: validateSignUp,
    onSubmit: async (values, { reset }) => {
      await wait(700);
      toast({ type: "positive", title: "Account created", children: `Welcome, ${values.name.trim().split(/\s+/)[0]}. We sent a link to ${values.email.trim()}.` });
      reset();
    },
  });
  const password = form.values.password;
  return (
    <Box surface="surface" border="pale" radius="xl" padding="xl">
      <Form form={form} aria-labelledby={titleId}>
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/3">Create your account</Heading>
          <Text tone="base">Free for teams of up to 5 people.</Text>
        </Stack>
        <Stack gap="md">
          <InputField label="Full name" autoComplete="name" placeholder="Nguyễn Minh Anh" {...form.field("name")} />
          <InputField label="Work email" type="email" autoComplete="email" placeholder="name@company.com" {...form.field("email")} />
          <Stack gap="xs">
            <InputField label="Password" type="password" autoComplete="new-password" {...form.field("password")} />
            <InputConditions>
              {passwordRules.map((rule) => <InputConditionItem key={rule.label} label={rule.label} state={!password ? "default" : rule.test(password) ? "success" : "wrong"} />)}
            </InputConditions>
          </Stack>
          <SelectField label="What do you do?" options={jobRoles} {...form.selectField("role")} />
          <FormField error={form.fieldError("terms")}>
            <Checkbox label="I agree to the Terms of Service and Privacy Policy" {...form.checkboxField("terms")} />
          </FormField>
        </Stack>
        <FormActions>
          <Button level="primary" type="submit">{form.isSubmitting ? "Creating account…" : "Create account"}</Button>
        </FormActions>
      </Form>
    </Box>
  );
}

/* ───────────── Example: settings in two columns ───────────── */

type ProfileValues = { name: string; email: string; timeZone: string; bio: string };
const timeZones = [
  { label: "(GMT+7) Ho Chi Minh City", value: "Asia/Ho_Chi_Minh" },
  { label: "(GMT+8) Singapore", value: "Asia/Singapore" },
  { label: "(GMT+9) Tokyo", value: "Asia/Tokyo" },
  { label: "(GMT+2) Berlin", value: "Europe/Berlin" },
  { label: "(GMT−7) San Francisco", value: "America/Los_Angeles" },
];
const notificationSettings = [
  { id: "mentions", label: "Mentions and replies", caption: "When someone @mentions you or replies to you." },
  { id: "digest", label: "Weekly digest", caption: "A Monday summary of your projects." },
  { id: "product", label: "Product updates", caption: "New features, at most once a month." },
] as const;
type NotificationId = (typeof notificationSettings)[number]["id"];

function SettingsExample() {
  const profileTitle = useId();
  const notificationsTitle = useId();
  const { toast } = useToast();
  const profile = useFormState<ProfileValues>({
    initialValues: { name: "Minh Anh Nguyen", email: "minhanh@zen.studio", timeZone: "Asia/Ho_Chi_Minh", bio: "" },
    validate: (values) => ({ name: values.name.trim() ? undefined : "Enter a display name", email: emailError(values.email, "Enter your email") }),
    onSubmit: async (values, { reset }) => {
      await wait(600);
      reset(values);
      toast({ type: "positive", title: "Profile saved" });
    },
  });
  const [notify, setNotify] = useState<Record<NotificationId, boolean>>({ mentions: true, digest: true, product: false });
  const toggle = (id: NotificationId, label: string, selected: boolean) => {
    setNotify((current) => ({ ...current, [id]: selected }));
    // One toast id: flipping several switches replaces the message instead of stacking toasts.
    toast({ id: "notification-settings", type: "neutral", title: `${label} ${selected ? "turned on" : "turned off"}` });
  };
  return (
    <Grid minColumnWidth={400} gap="lg">
      <Box surface="surface" border="pale" radius="xl" padding="xl" className="pef-panel">
        <Form form={profile} aria-labelledby={profileTitle}>
          <Stack gap="xs">
            <Heading level={4} id={profileTitle} textStyle="Heading/Subheading">Profile</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Shown to everyone in your workspace.</Text>
          </Stack>
          <Stack gap="md">
            <InputField label="Display name" autoComplete="name" {...profile.field("name")} />
            <InputField label="Email" type="email" autoComplete="email" {...profile.field("email")} />
            <SelectField label="Time zone" options={timeZones} {...profile.selectField("timeZone")} />
            <TextAreaField label="Bio" labelOptional rows={3} maxLength={160} characterLimit placeholder="Product designer on the Zen design system." {...profile.field("bio")} />
          </Stack>
          <FormActions>
            <Button level="tertiary" disabled={!profile.isDirty} onClick={() => profile.reset()}>Cancel</Button>
            <Button level="primary" type="submit">{profile.isSubmitting ? "Saving…" : "Save changes"}</Button>
          </FormActions>
        </Form>
      </Box>
      <Box surface="surface" border="pale" radius="xl" padding="xl" className="pef-panel" as="section" aria-labelledby={notificationsTitle}>
        <Stack gap="lg">
          <Stack gap="xs">
            <Heading level={4} id={notificationsTitle} textStyle="Heading/Subheading">Notifications</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Switches apply right away; there is nothing to save.</Text>
          </Stack>
          <FormFieldset kind="toggle" legend="Email me about">
            {notificationSettings.map((setting) => (
              <Toggle key={setting.id} label={setting.label} caption={setting.caption} selected={notify[setting.id]} onSelectedChange={(selected) => toggle(setting.id, setting.label, selected)} />
            ))}
          </FormFieldset>
        </Stack>
      </Box>
    </Grid>
  );
}

/* ───────────── Example: invite dialog ───────────── */

type InviteValues = { email: string; role: string; message: string };
const inviteRoles = [
  { label: "Member", value: "member" },
  { label: "Admin", value: "admin" },
  { label: "Guest (view only)", value: "guest" },
];
type Person = { email: string; role: string; joined: boolean };

function InviteDialogExample() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>([
    { email: "ava.chen@zen.studio", role: "admin", joined: true },
    { email: "bao.nguyen@zen.studio", role: "member", joined: false },
  ]);
  const invite = useFormState<InviteValues>({
    initialValues: { email: "", role: "member", message: "" },
    validate: (values) => {
      const email = values.email.trim().toLowerCase();
      return { email: emailError(email, "Enter an email address") ?? (people.some((person) => person.email === email) ? `${email} is already in this workspace` : undefined) };
    },
    onSubmit: async (values, { reset }) => {
      await wait(700);
      const email = values.email.trim().toLowerCase();
      setPeople((list) => [...list, { email, role: values.role, joined: false }]);
      setOpen(false);
      reset();
      toast({ type: "positive", title: `Invite sent to ${email}` });
    },
  });
  const onOpenChange = (next: boolean) => { setOpen(next); if (!next) invite.reset(); };
  return (
    <Stack gap="md">
      <Stack direction="row" justify="between" align="center" wrap gap="sm">
        <Stack gap="2xs">
          <Text textStyle="Body/Base/Bold">Design workspace</Text>
          <Text textStyle="Body/Small/Regular" tone="base">{plural(people.length, "person", "people")}</Text>
        </Stack>
        <Button level="primary" startIcon={<Icon name="icon-user-plus-line" decorative />} onClick={() => setOpen(true)}>Invite people</Button>
      </Stack>
      <List aria-label="People in Design workspace">
        {people.map((person) => (
          <ListItem key={person.email} title={person.email} caption={inviteRoles.find((role) => role.value === person.role)?.label}
            leading={<Avatar size="small" theme={person.joined ? "blue" : "green"} background="subtle" alt="">{person.email.slice(0, 2).toUpperCase()}</Avatar>}
            trailing={<Badge size="small" theme={person.joined ? "green" : "neutral"} background="subtle">{person.joined ? "Joined" : "Invited"}</Badge>} />
        ))}
      </List>
      <ModalForm open={open} onOpenChange={onOpenChange} title="Invite to Design workspace" description="They get an email with a link to join." onSubmit={invite.handleSubmit}
        primaryAction={{ label: invite.isSubmitting ? "Sending invite…" : "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@company.com" {...invite.field("email")} />
        <SelectField label="Role" options={inviteRoles} helpText="Admins can invite people and manage billing." {...invite.selectField("role")} />
        <TextAreaField label="Personal message" labelOptional rows={3} maxLength={200} characterLimit placeholder="Join us to review the Q4 roadmap." {...invite.field("message")} />
      </ModalForm>
    </Stack>
  );
}

/* ───────────── Example: mobile checkout ───────────── */

type CheckoutValues = { email: string; name: string; address: string; city: string; postalCode: string; country: string; delivery: "" | "standard" | "express" };
const bagTotal = 77.4;

function CheckoutExample() {
  const [placed, setPlaced] = useState<string | null>(null);
  const checkout = useFormState<CheckoutValues>({
    initialValues: { email: "", name: "", address: "", city: "Ho Chi Minh City", postalCode: "", country: "vn", delivery: "" },
    validate: (values) => ({
      email: emailError(values.email, "Enter your email for the receipt"),
      name: values.name.trim() ? undefined : "Enter the recipient's name",
      address: values.address.trim() ? undefined : "Enter the street address",
      city: values.city.trim() ? undefined : "Enter the city",
      postalCode: /^\d{4,6}$/.test(values.postalCode.trim()) ? undefined : values.postalCode.trim() ? "Use 4–6 digits, like 700000" : "Enter the postal code",
      delivery: values.delivery ? undefined : "Choose a delivery speed",
    }),
    onSubmit: async (values, { reset }) => {
      await wait(900);
      setPlaced(values.email.trim());
      reset();
    },
  });
  const delivery = checkout.values.delivery === "express" ? 9 : 0;
  const total = money(bagTotal + delivery);
  return (
    <ZenProvider paint={false} portal={false} breakpoint="mobile" className="pef-phone-stage">
      <PlatformPhone className="pef-phone" label="Checkout" header={<TopNavigation type="compact-alt" title="Checkout" />}>
        {placed ? (
          <Stack gap="md" padding="lg">
            <InlineMessage theme="positive" title="Order placed">Order #4821 arrives Thursday, 2 Oct. The receipt is on its way to {placed}.</InlineMessage>
            <Button level="tertiary" size="lg" onClick={() => setPlaced(null)}>Start a new order</Button>
          </Stack>
        ) : (
          <Form form={checkout} gap="none" aria-label="Checkout">
            <Stack gap="xl" padding="lg">
              <Stack gap="md">
                <Heading level={2} textStyle="Heading/4">Contact</Heading>
                <InputField label="Email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" helpText="For the receipt and delivery updates." {...checkout.field("email")} />
              </Stack>
              <Stack gap="md">
                <Heading level={2} textStyle="Heading/4">Shipping address</Heading>
                <InputField label="Full name" autoComplete="shipping name" {...checkout.field("name")} />
                <InputField label="Street address" autoComplete="shipping street-address" placeholder="12 Nguyen Hue, District 1" {...checkout.field("address")} />
                <Grid columns={2} gap="sm">
                  <InputField label="City" autoComplete="shipping address-level2" {...checkout.field("city")} />
                  <InputField label="Postal code" autoComplete="shipping postal-code" inputMode="numeric" placeholder="700000" {...checkout.field("postalCode")} />
                </Grid>
                <SelectField label="Country" options={countries} {...checkout.selectField("country")} />
              </Stack>
              <FormFieldset kind="radio" legend="Delivery" required error={checkout.fieldError("delivery")}>
                <RadioButton label="Standard · Free" caption="3–5 business days" {...checkout.radioField("delivery", "standard")} />
                <RadioButton label="Express · $9.00" caption="Tomorrow, before noon" {...checkout.radioField("delivery", "express")} />
              </FormFieldset>
              <dl className="pef-summary" aria-label="Order summary">
                {[["Bag (3 items)", money(bagTotal)], ["Delivery", delivery ? money(delivery) : "Free"], ["Total", total]].map(([term, value]) => (
                  <Stack key={term} direction="row" justify="between">
                    <Text as="dt" tone={term === "Total" ? "strongest" : "base"} textStyle={term === "Total" ? "Body/Base/Bold" : "Body/Base/Regular"}>{term}</Text>
                    <Text as="dd" textStyle={term === "Total" ? "Body/Base/Bold" : "Body/Base/Regular"}>{value}</Text>
                  </Stack>
                ))}
              </dl>
            </Stack>
            <FormActions sticky inset="lg">
              <Button level="primary" type="submit" startIcon={<Icon name="icon-lock-01-line" decorative />}>{checkout.isSubmitting ? "Paying…" : `Pay ${total}`}</Button>
            </FormActions>
          </Form>
        )}
      </PlatformPhone>
    </ZenProvider>
  );
}

/* ───────────── Example: server error ───────────── */

type WorkspaceValues = { name: string; url: string };
const takenUrls = ["acme", "design", "zen", "studio"];

function ServerErrorExample() {
  const formRef = useRef<HTMLFormElement>(null);
  const attempts = useRef(0);
  const [created, setCreated] = useState<string | null>(null);
  const workspace = useFormState<WorkspaceValues>({
    initialValues: { name: "Acme", url: "acme" },
    validate: (values) => ({
      name: values.name.trim() ? undefined : "Enter a workspace name",
      url: !values.url ? "Enter a URL for your workspace" : /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(values.url) ? undefined : "Use 3–30 lowercase letters, digits or hyphens",
    }),
    onSubmit: async (values, { setError }) => {
      await wait(900);
      if (takenUrls.includes(values.url)) {
        setError("url", `zen.app/${values.url} is taken. Try ${values.url}-team or ${values.url}-hq.`);
        return;
      }
      attempts.current += 1;
      // The first free URL times out once, to show the retry path.
      if (attempts.current === 1) throw new Error("The server didn't answer in time. Nothing was created and your details are still here.");
      setCreated(values.url);
    },
  });
  if (created) {
    return (
      <Box surface="surface" border="pale" radius="xl" padding="xl">
        <Stack gap="md">
          <InlineMessage theme="positive" title="Workspace created">zen.app/{created} is ready. Invite your team next.</InlineMessage>
          <Button level="tertiary" onClick={() => { attempts.current = 0; workspace.reset(); setCreated(null); }}>Create another workspace</Button>
        </Stack>
      </Box>
    );
  }
  return (
    <Box surface="surface" border="pale" radius="xl" padding="xl">
      <Form ref={formRef} form={workspace} aria-label="Create a workspace">
        <Stack gap="md">
          <InputField label="Workspace name" autoComplete="organization" {...workspace.field("name")} />
          <InputField label="Workspace URL" autoCapitalize="none" spellCheck={false} helpText={`Your address: zen.app/${workspace.values.url || "…"}`} {...workspace.field("url")} />
        </Stack>
        {workspace.submitError ? (
          <InlineMessage theme="negative" title="We couldn't create your workspace" action={{ label: "Try again", onClick: () => formRef.current?.requestSubmit() }}>{workspace.submitError}</InlineMessage>
        ) : null}
        <FormActions>
          <Button level="primary" type="submit">{workspace.isSubmitting ? "Creating workspace…" : "Create workspace"}</Button>
        </FormActions>
      </Form>
    </Box>
  );
}

/* ───────────── Example: custom controls (FormField) ───────────── */

type ProjectValues = { name: string; budget: number; colour: string; alerts: string[] };
const projectColours = [["blue", "Blue"], ["green", "Green"], ["orange", "Orange"], ["purple", "Purple"], ["red", "Red"]].map(([hue, label]) => ({ value: `var(--zen-color-background-support-${hue}-solid)`, label }));
const alertOptions = [
  { id: "budget", label: "Spending passes 80% of the budget" },
  { id: "overdue", label: "A task is overdue" },
  { id: "summary", label: "Weekly summary" },
];

function CustomControlsExample() {
  const { toast } = useToast();
  const project = useFormState<ProjectValues>({
    initialValues: { name: "Website refresh", budget: 400, colour: "", alerts: ["budget"] },
    validate: (values) => ({
      name: values.name.trim() ? undefined : "Enter a project name",
      budget: values.budget >= 500 ? undefined : "Set a budget of at least $500",
      colour: values.colour ? undefined : "Choose a colour for the project",
      alerts: values.alerts.length ? undefined : "Choose at least one alert",
    }),
    onSubmit: async (values, { reset }) => {
      await wait(600);
      toast({ type: "positive", title: `${values.name.trim()} created`, children: `Budget ${money(values.budget)} a month · ${plural(values.alerts.length, "alert")}` });
      reset();
    },
  });
  const { alerts, budget } = project.values;
  return (
    <Box surface="surface" border="pale" radius="xl" padding="xl">
      <Form form={project} aria-label="New project">
        <Stack gap="md">
          <InputField label="Project name" {...project.field("name")} />
          <FormField label="Monthly budget" helpText={`${money(budget)} a month`} error={project.fieldError("budget")}>
            <Slider min={0} max={5000} step={100} value={budget} valueText={(value) => `${money(value)} a month`} onChange={(value) => project.setValue("budget", value, { touch: true })} />
          </FormField>
          <FormField label="Project colour" error={project.fieldError("colour")}>
            <ColorSelector aria-label="Project colour" colors={projectColours} value={project.values.colour} onChange={(value) => project.setValue("colour", value, { touch: true })} />
          </FormField>
          <FormFieldset kind="checkbox" legend="Email me when" error={project.fieldError("alerts")}>
            {alertOptions.map((alert) => (
              <Checkbox key={alert.id} name="alerts" value={alert.id} label={alert.label} checked={alerts.includes(alert.id)}
                onChange={(checked) => project.setValue("alerts", checked ? [...alerts, alert.id] : alerts.filter((id) => id !== alert.id), { touch: true })} />
            ))}
          </FormFieldset>
        </Stack>
        <FormActions>
          <Button level="tertiary" onClick={() => project.reset()}>Reset</Button>
          <Button level="primary" type="submit">{project.isSubmitting ? "Creating project…" : "Create project"}</Button>
        </FormActions>
      </Form>
    </Box>
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

export const examples: ExampleMap = keepOnHotUpdate(import.meta.hot, "examples", {
  form: [
    { title: "Sign-up with inline validation", description: "Errors appear when you leave a field and on submit, and clear as you fix them. Submit it empty: focus jumps to the first invalid field. A valid submit shows a success toast.", render: () => <SignUpExample />, code: `const form = useFormState({
  initialValues: { name: "", email: "", password: "", role: "design", terms: false },
  validate: (values) => ({
    name: values.name.trim() ? undefined : "Enter your full name",
    email: isEmail(values.email) ? undefined : "Enter a valid email address, like name@company.com",
    password: rules.every((rule) => rule.test(values.password)) ? undefined : "Meet all three password rules",
    terms: values.terms ? undefined : "Accept the Terms of Service to create an account",
  }),
  onSubmit: async (values, { reset }) => {
    await createAccount(values);
    toast({ type: "positive", title: "Account created" });
    reset();
  },
});

<Form form={form} aria-labelledby={titleId}>
  <Heading level={4} id={titleId} textStyle="Heading/3">Create your account</Heading>
  <Stack gap="md">
    <InputField label="Full name" autoComplete="name" {...form.field("name")} />
    <InputField label="Work email" type="email" autoComplete="email" {...form.field("email")} />
    <InputField label="Password" type="password" autoComplete="new-password" {...form.field("password")} />
    <InputConditions>{rules.map((rule) => <InputConditionItem key={rule.label} label={rule.label} state={…} />)}</InputConditions>
    <SelectField label="What do you do?" options={jobRoles} {...form.selectField("role")} />
    <FormField error={form.fieldError("terms")}>
      <Checkbox label="I agree to the Terms of Service and Privacy Policy" {...form.checkboxField("terms")} />
    </FormField>
  </Stack>
  <FormActions>
    <Button level="primary" type="submit">{form.isSubmitting ? "Creating account…" : "Create account"}</Button>
  </FormActions>
</Form>` },
    { title: "Invite dialog", description: "ModalForm takes form.handleSubmit: Enter or Send invite submits, a bad email keeps the dialog open with focus on the field, and a valid one closes it, adds the person and shows a toast.", render: () => <InviteDialogExample />, code: `const invite = useFormState({
  initialValues: { email: "", role: "member", message: "" },
  validate: (values) => ({ email: isEmail(values.email) ? undefined : "Enter a valid email address, like name@company.com" }),
  onSubmit: async (values, { reset }) => {
    await sendInvite(values);
    setOpen(false);
    reset();
    toast({ type: "positive", title: \`Invite sent to \${values.email}\` });
  },
});

<ModalForm open={open} onOpenChange={setOpen} title="Invite to Design workspace" description="They get an email with a link to join."
  onSubmit={invite.handleSubmit}
  primaryAction={{ label: invite.isSubmitting ? "Sending invite…" : "Send invite" }} secondaryAction={{ label: "Cancel" }}>
  <InputField label="Email address" type="email" {...invite.field("email")} />
  <SelectField label="Role" options={roles} helpText="Admins can invite people and manage billing." {...invite.selectField("role")} />
  <TextAreaField label="Personal message" labelOptional maxLength={200} characterLimit {...invite.field("message")} />
</ModalForm>` },
    { title: "Settings in two columns", description: "A Grid holds two panels: the profile Form saves with its own actions, while the notification Toggles sit outside it in a FormFieldset and apply at once (Toggles never wait for a Save).", wide: true, render: () => <SettingsExample />, code: `<Grid minColumnWidth={400} gap="lg">
  <Box surface="surface" border="pale" radius="xl" padding="xl">
    <Form form={profile} aria-labelledby={profileTitle}>
      <Heading level={4} id={profileTitle} textStyle="Heading/Subheading">Profile</Heading>
      <Stack gap="md">
        <InputField label="Display name" {...profile.field("name")} />
        <InputField label="Email" type="email" {...profile.field("email")} />
        <SelectField label="Time zone" options={timeZones} {...profile.selectField("timeZone")} />
        <TextAreaField label="Bio" labelOptional maxLength={160} characterLimit {...profile.field("bio")} />
      </Stack>
      <FormActions>
        <Button level="tertiary" disabled={!profile.isDirty} onClick={() => profile.reset()}>Cancel</Button>
        <Button level="primary" type="submit">Save changes</Button>
      </FormActions>
    </Form>
  </Box>
  <Box surface="surface" border="pale" radius="xl" padding="xl" as="section" aria-labelledby={notificationsTitle}>
    {/* Instant settings: outside the Form, no Save button */}
    <FormFieldset kind="toggle" legend="Email me about">
      <Toggle label="Mentions and replies" caption="When someone @mentions you or replies to you." selected={notify.mentions} onSelectedChange={…} />
      <Toggle label="Weekly digest" caption="A Monday summary of your projects." selected={notify.digest} onSelectedChange={…} />
      <Toggle label="Product updates" caption="New features, at most once a month." selected={notify.product} onSelectedChange={…} />
    </FormFieldset>
  </Box>
</Grid>` },
    { title: "Server error and retry", description: "The server rejects the taken URL acme: setError puts the message on the field and focus moves there. The next free URL times out once, so a Negative InlineMessage offers Try again; the retry succeeds.", render: () => <ServerErrorExample />, code: `const workspace = useFormState({
  initialValues: { name: "Acme", url: "acme" },
  validate,
  onSubmit: async (values, { setError }) => {
    const result = await createWorkspace(values);
    if (result.error === "url-taken") return setError("url", \`zen.app/\${values.url} is taken. Try \${values.url}-team.\`);
    // A thrown Error fills workspace.submitError
  },
});

<Form ref={formRef} form={workspace} aria-label="Create a workspace">
  <Stack gap="md">
    <InputField label="Workspace name" {...workspace.field("name")} />
    <InputField label="Workspace URL" helpText={\`Your address: zen.app/\${workspace.values.url}\`} {...workspace.field("url")} />
  </Stack>
  {workspace.submitError ? (
    <InlineMessage theme="negative" title="We couldn't create your workspace" action={{ label: "Try again", onClick: () => formRef.current?.requestSubmit() }}>
      {workspace.submitError}
    </InlineMessage>
  ) : null}
  <FormActions>
    <Button level="primary" type="submit">{workspace.isSubmitting ? "Creating workspace…" : "Create workspace"}</Button>
  </FormActions>
</Form>` },
    { title: "Custom controls with FormField", description: "Slider and ColorSelector have no label or error of their own: FormField adds them, names the Slider through aria-labelledby and marks the field invalid, so a failed submit lands on it. A checkbox group shares one FormFieldset error.", render: () => <CustomControlsExample />, code: `<Form form={project} aria-label="New project">
  <Stack gap="md">
    <InputField label="Project name" {...project.field("name")} />
    <FormField label="Monthly budget" helpText={\`\${money(budget)} a month\`} error={project.fieldError("budget")}>
      <Slider min={0} max={5000} step={100} value={budget} onChange={(value) => project.setValue("budget", value, { touch: true })} />
    </FormField>
    <FormField label="Project colour" error={project.fieldError("colour")}>
      <ColorSelector aria-label="Project colour" colors={colours} value={project.values.colour} onChange={(value) => project.setValue("colour", value, { touch: true })} />
    </FormField>
    <FormFieldset kind="checkbox" legend="Email me when" error={project.fieldError("alerts")}>
      {alertOptions.map((alert) => (
        <Checkbox key={alert.id} name="alerts" value={alert.id} label={alert.label} checked={alerts.includes(alert.id)} onChange={(checked) => toggleAlert(alert.id, checked)} />
      ))}
    </FormFieldset>
  </Stack>
  <FormActions>
    <Button level="tertiary" onClick={() => project.reset()}>Reset</Button>
    <Button level="primary" type="submit">Create project</Button>
  </FormActions>
</Form>` },
    { title: "Mobile checkout", description: "On a phone the pay button sits in a sticky FormActions: a full-width Large button pinned above the home indicator while the form scrolls. The delivery radios are a FormFieldset kind=\"radio\" (a radiogroup with one error).", wide: true, render: () => <CheckoutExample />, code: `<ZenProvider typography="mobile" breakpoint="mobile">
  <Form form={checkout} gap="none" aria-label="Checkout">
    <Stack gap="xl" padding="lg">
      <InputField label="Email" type="email" autoComplete="email" helpText="For the receipt and delivery updates." {...checkout.field("email")} />
      <InputField label="Full name" autoComplete="shipping name" {...checkout.field("name")} />
      <InputField label="Street address" autoComplete="shipping street-address" {...checkout.field("address")} />
      <Grid columns={2} gap="sm">
        <InputField label="City" {...checkout.field("city")} />
        <InputField label="Postal code" inputMode="numeric" {...checkout.field("postalCode")} />
      </Grid>
      <FormFieldset kind="radio" legend="Delivery" required error={checkout.fieldError("delivery")}>
        <RadioButton label="Standard · Free" caption="3–5 business days" {...checkout.radioField("delivery", "standard")} />
        <RadioButton label="Express · $9.00" caption="Tomorrow, before noon" {...checkout.radioField("delivery", "express")} />
      </FormFieldset>
    </Stack>
    <FormActions sticky inset="lg">
      <Button level="primary" type="submit">{checkout.isSubmitting ? "Paying…" : \`Pay \${total}\`}</Button>
    </FormActions>
  </Form>
</ZenProvider>` },
  ],
});
