/**
 * Template: settings form. Copy it into your app and replace the sample data and the save call.
 * Render it inside your app's <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 * Fields bind through useFormState; errors show on blur and on submit; the first invalid field gets focus.
 */
import { useState } from "react";
import {
  AppShell,
  AppShellAccount,
  AppShellAction,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Checkbox,
  Container,
  Form,
  FormActions,
  FormFieldset,
  Grid,
  Heading,
  Icon,
  InlineMessage,
  InputField,
  Menu,
  PageHeader,
  SelectField,
  Sidebar,
  Stack,
  Text,
  TextAreaField,
  Toggle,
  useFormState,
  useToast,
  type MenuEntry,
  type SidebarSection,
} from "@zen/design-system";

/* ── Sample data: replace with your own ─────────────────────────────── */
/** The account menu at the end of the top bar (Figma HR-Platform): replace the handlers with your routes. */
const accountItems: MenuEntry[] = [
  { id: "profile", label: "Profile", icon: "icon-user-circle-line" },
  { id: "preferences", label: "Preferences", icon: "icon-settings-01-line" },
  { type: "separator" },
  { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line" },
];
const sections = (active: string): SidebarSection[] => [
  { label: "Settings", items: [
    { id: "profile", label: "Profile", icon: <Icon name="icon-user-line" />, active: active === "profile" },
    { id: "workspace", label: "Workspace", icon: <Icon name="icon-building-01-line" />, active: active === "workspace" },
    { id: "billing", label: "Billing", icon: <Icon name="icon-credit-card-line" />, active: active === "billing" },
  ] },
];
const timezones = [
  { label: "Asia/Ho Chi Minh (GMT+7)", value: "Asia/Ho_Chi_Minh" },
  { label: "Asia/Singapore (GMT+8)", value: "Asia/Singapore" },
  { label: "Europe/London (GMT+1)", value: "Europe/London" },
];
/** Stand-in for your API call. */
const saveProfile = (values: unknown) => new Promise<void>((resolve) => setTimeout(() => resolve(void values), 600));

export function SettingsFormTemplate() {
  const { toast } = useToast();
  // Instant settings live outside the Form: a Toggle applies at once (Toggle guideline).
  const [digest, setDigest] = useState(true);
  const [page, setPage] = useState("profile");
  const [unseen, setUnseen] = useState(true);
  const form = useFormState({
    initialValues: { name: "Ava Chen", email: "ava@zen.studio", timezone: "Asia/Ho_Chi_Minh", bio: "", releases: true, tips: false },
    validate: (values) => ({
      ...(values.name.trim() ? {} : { name: "Enter your name" }),
      ...(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email) ? {} : { email: "Enter a valid email address, like name@company.com" }),
      ...(values.bio.length > 160 ? { bio: "Keep your bio to 160 characters" } : {}),
    }),
    onSubmit: async (values) => {
      await saveProfile(values);
      toast({ title: "Profile saved" });
    },
  });

  return (
    <AppShell
      sidebar={<Sidebar logo={<Text as="span" textStyle="Heading/4">Acme</Text>} logoCollapsed={<Avatar shape="square" size="xs" theme="indigo" background="subtle" alt="Acme" />} sections={sections(page)} onItemClick={(item) => setPage(item.id)} />}
      header={<Breadcrumbs master={false} items={[{ id: "settings", label: "Settings" }, { id: "profile", label: "Profile" }]} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id === "settings" ? "profile" : item.id); /* your router: navigate(item.href) */ }} />}
      headerActions={<>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot={unseen} onClick={() => { setUnseen(false); toast({ title: unseen ? "Your weekly digest is ready" : "No new notifications" }); }} />
        <Menu align="end" trigger={<AppShellAccount name={form.values.name || "Ava Chen"} />} items={accountItems} onSelect={(item) => toast({ title: item.id === "sign-out" ? "Signed out" : `${item.label} opened` })} />
      </>}
    >
      <Container maxWidth="md">
        <Stack gap="xl" paddingY="lg">
          {/* The page's h1 (Heading/1). Your router also sets document.title to it: "Profile · Acme". */}
          <PageHeader title="Profile" description="How you appear to your team and how we reach you." />

          <Box surface="surface" border="pale" radius="xl" padding="xl">
            <Form form={form}>
              <Stack gap="md">
                {/* A card title is always Heading/Subheading; it is an h2 because the card sits right under the h1. */}
                <Heading level={2} textStyle="Heading/Subheading">Personal details</Heading>
                <Grid columns={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
                  <InputField label="Full name" autoComplete="name" {...form.field("name")} />
                  <InputField label="Email" type="email" autoComplete="email" {...form.field("email")} />
                </Grid>
                <SelectField label="Time zone" options={timezones} {...form.selectField("timezone")} />
                <TextAreaField label="Bio" labelOptional placeholder="e.g. Product designer, loves type" characterLimit maxLength={160} {...form.field("bio")} />
              </Stack>
              <FormFieldset legend="Email me about" kind="checkbox">
                <Checkbox label="Product releases" {...form.checkboxField("releases")} />
                <Checkbox label="Tips and tutorials" {...form.checkboxField("tips")} />
              </FormFieldset>
              {form.submitError ? <InlineMessage theme="negative" title="Couldn’t save your profile">{form.submitError}</InlineMessage> : null}
              <FormActions>
                <Button level="tertiary" onClick={() => form.reset()}>Cancel</Button>
                <Button level="primary" type="submit" disabled={form.isSubmitting}>{form.isSubmitting ? "Saving…" : "Save changes"}</Button>
              </FormActions>
            </Form>
          </Box>

          <Box surface="surface" border="pale" radius="xl" padding="xl">
            <Stack gap="md">
              <Heading level={2} textStyle="Heading/Subheading">Notifications</Heading>
              <Toggle label="Weekly digest" caption="A Monday summary of your projects. Applies right away." checked={digest} onCheckedChange={(on) => { setDigest(on); toast({ id: "digest", type: "neutral", title: on ? "Weekly digest on" : "Weekly digest off" }); }} />
            </Stack>
          </Box>
        </Stack>
      </Container>
    </AppShell>
  );
}
