/**
 * Template: settings (a workspace owner's account and workspace). Copy it into your app and replace the sample data and
 * the calls. Render it inside your app's <ZenProvider>. Uses only @zen-ds/react components, no custom CSS.
 *
 * - Annotated sections: each title and its one-line description on the left, the settings in a Card on the right
 *   (stacked on phones).
 * - Profile: photo (FileUpload + Avatar preview), full name, email and time zone in a Form validated by useFormState.
 *   The Save bar (an ActionBar in the AppShell footer) stays disabled until something changes and says why.
 * - Notifications: Toggles outside the Form; each one saves at once and confirms in a Toast.
 * - Sign-in and security: the password row opens Change password (a ModalForm with live rules); the 2-step verification
 *   row opens its setup ModalForm, or a Dialog to turn it off.
 * - Danger zone: Delete workspace opens a negative Dialog that asks for the workspace name.
 */
import { useId, useRef, useState, type ReactNode } from "react";
import {
  ActionBar,
  AppShell,
  AppShellAccount,
  AppShellAction,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Container,
  DescriptionList,
  Dialog,
  DockIcon,
  FileUpload,
  Form,
  FormFieldset,
  Grid,
  Heading,
  Icon,
  IconButton,
  InputConditionItem,
  InputConditions,
  InputField,
  InputLeadingTrailing,
  List, ListBox,
  ListItem,
  Menu,
  ModalForm,
  PageHeader,
  SelectField,
  SidePanel,
  Sidebar,
  Stack,
  Text,
  Toggle,
  useFormState,
  useToast,
  useZen,
  type IconName,
  type SidebarSection,
  type UploaderFile,
} from "@zen-ds/react";

/* ── Sample data: replace with your own ─────────────────────────────── */
const workspace = { name: "Đìzai Studio", initial: "Đ", domain: "dizai.studio" };

/** The signed-in owner's saved profile. Only the owner can delete the workspace. */
type Profile = { photo: UploaderFile | null; name: string; email: string; timezone: string };
const savedProfile: Profile = { photo: null, name: "Khoa Dang", email: "khoa.dang@dizai.studio", timezone: "Asia/Ho_Chi_Minh" };
/** How the Save bar names each field. */
const fieldNames: Record<keyof Profile, string> = { photo: "photo", name: "name", email: "email", timezone: "time zone" };

/** Offsets as of Sep 30, 2026 (daylight saving time north of the equator). */
const timeZones = [
  { value: "America/Los_Angeles", label: "(GMT−7) Los Angeles" },
  { value: "America/New_York", label: "(GMT−4) New York" },
  { value: "Europe/London", label: "(GMT+1) London" },
  { value: "Europe/Berlin", label: "(GMT+2) Berlin" },
  { value: "Asia/Ho_Chi_Minh", label: "(GMT+7) Ho Chi Minh City" },
  { value: "Asia/Singapore", label: "(GMT+8) Singapore" },
  { value: "Asia/Tokyo", label: "(GMT+9) Tokyo" },
  { value: "Australia/Sydney", label: "(GMT+10) Sydney" },
];

type EmailSetting = "mentions" | "projects" | "digest" | "news";
const emailSettings: Array<{ id: EmailSetting; label: string; caption: string }> = [
  { id: "mentions", label: "Mentions and replies", caption: "When someone mentions you or replies to your comment" },
  { id: "projects", label: "Project activity", caption: "New files, comments and status changes in projects you follow" },
  { id: "digest", label: "Weekly digest", caption: "A summary of your projects every Monday morning" },
  { id: "news", label: "Product news", caption: "New features and tips, about once a month" },
];

const passwordRules = [
  { label: "At least 10 characters", test: (value: string) => value.length >= 10 },
  { label: "An uppercase and a lowercase letter", test: (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
  { label: "A number", test: (value: string) => /\d/.test(value) },
];
/** The key your server generates for the authenticator app. */
const setupKey = "JBSW Y3DP EHPK 3PXP";

type Notice = { id: string; title: string; caption: string; icon: IconName };
const notices: Notice[] = [
  { id: "sign-in", title: "New sign-in from Chrome on Windows", caption: "Hanoi, Vietnam · 9:12 am", icon: "icon-monitor-01-line" },
  { id: "joined", title: "Quynh Nhu Le joined the workspace", caption: "Yesterday at 4:12 pm", icon: "icon-user-check-line" },
  { id: "seats", title: "Your plan is almost full", caption: "51 of 60 seats in use · Monday at 9:00 am", icon: "icon-users-line" },
];

const nav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "reports", label: "Reports", icon: "icon-bar-chart-01-line" },
  ] },
  { label: "Admin", items: [
    { id: "members", label: "Team members", icon: "icon-users-line" },
    { id: "billing", label: "Billing", icon: "icon-credit-card-line" },
    { id: "security", label: "Security", icon: "icon-shield-tick-line" },
    { id: "settings", label: "Settings", icon: "icon-settings-01-line" },
  ] },
];

/* ── Your API calls (stand-ins) ─────────────────────────────────────── */
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** Resolves false when another member already uses the email (in this demo: Linh, Alex and Bao). */
const takenEmails = ["linh.hoang@dizai.studio", "alex.duong@dizai.studio", "bao.nguyen@dizai.studio"];
const saveProfile = async (profile: Profile) => { await wait(800); return !takenEmails.includes(profile.email); };
/** Resolves false when the current password is wrong (in this demo: shorter than 8 characters). */
const changePassword = async (current: string, _next: string) => { await wait(900); return current.length >= 8; };
const turnOnTwoStep = (_code: string) => wait(800);
const deleteWorkspace = () => wait(1200);

/* ── Helpers ─────────────────────────────────────────────────────────── */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** Avatar text: two initials ("Khoa Dang" → "KD"). */
const initials = (name: string) => { const parts = name.trim().split(/\s+/); return `${parts[0][0] ?? ""}${parts.length > 1 ? parts.at(-1)![0] : ""}`.toUpperCase(); };
const listOf = (items: string[]) => (items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);
const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
/** "Đìzai Studio" and "dizai studio" match: people shouldn't need a Vietnamese keyboard to confirm. */
const plain = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").trim().toLowerCase();

/** Annotated layout: the section's title and description on the left, its settings on the right (stacked on phones). */
function SettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <Grid as="section" aria-labelledby={titleId} columns={{ mobile: 1, tablet: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} rowGap="md" columnGap="xl" align="start">
      <Stack gap="2xs">
        <Heading level={2} textStyle="Heading/4" id={titleId}>{title}</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{description}</Text>
      </Stack>
      {children}
    </Grid>
  );
}

export function SettingsFormTemplate() {
  const { toast } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const formId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(savedProfile);
  const [savedOnce, setSavedOnce] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState<Record<EmailSetting, boolean>>({ mentions: true, projects: false, digest: true, news: false });
  const [passwordChanged, setPasswordChanged] = useState("Jun 2, 2026");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordShown, setPasswordShown] = useState(false);
  const [twoStep, setTwoStep] = useState(false);
  const [twoStepOpen, setTwoStepOpen] = useState(false);
  const [turnOffOpen, setTurnOffOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unread, setUnread] = useState(notices.length);

  const notInDemo = (label: string) => toast({ title: `${label} isn't part of this demo` });

  /* ── Profile: saved with the Save bar ── */
  const profile = useFormState({
    initialValues: savedProfile,
    validate: (values) => ({
      name: values.name.trim() ? undefined : "Enter your full name",
      email: !values.email.trim() ? "Enter your email address"
        : EMAIL.test(values.email.trim()) ? undefined : `Enter an email address like name@${workspace.domain}`,
    }),
    onSubmit: async (values, { setError, reset }) => {
      const next = { ...values, name: values.name.trim(), email: values.email.trim().toLowerCase() };
      if (!(await saveProfile(next))) return setError("email", "Another member already uses this email");
      const emailChanged = next.email !== saved.email;
      setSaved(next);
      setSavedOnce(true);
      reset(next);
      toast({ title: "Profile saved", children: emailChanged ? `Confirm ${next.email} from the link we sent` : undefined });
    },
  });
  const photo = profile.values.photo;
  const addPhoto = ([file]: File[]) => {
    if (!["image/jpeg", "image/png"].includes(file.type)) return profile.setError("photo", "Choose a JPG or PNG file");
    if (file.size > 2 * 1024 * 1024) return profile.setError("photo", "Choose a photo up to 2 MB");
    profile.setValue("photo", { id: `${file.name}-${file.lastModified}`, name: file.name, size: fileSize(file.size), state: "uploaded", previewUrl: URL.createObjectURL(file) });
  };
  // The Save bar says what stops the save, what is unsaved, or why Save is off.
  const changed = (Object.keys(fieldNames) as Array<keyof Profile>).filter((key) => profile.values[key] !== saved[key]);
  // A rejected photo keeps the old one, so it never blocks the save.
  const invalid = (["name", "email"] as const).filter((key) => profile.fieldError(key));
  const status = invalid.length ? `Fix your ${listOf(invalid.map((key) => fieldNames[key]))} to save`
    : changed.length ? `Unsaved changes to your ${listOf(changed.map((key) => fieldNames[key]))}`
      : savedOnce ? "All changes saved" : "No changes to save yet";

  /* ── Notifications: each Toggle saves at once ── */
  const switchEmail = (setting: (typeof emailSettings)[number], on: boolean) => {
    setEmailPrefs((current) => ({ ...current, [setting.id]: on }));
    toast({ id: "email-settings", title: `${setting.label} turned ${on ? "on" : "off"}` });
  };

  /* ── Sign-in and security ── */
  const passwordForm = useFormState({
    initialValues: { current: "", next: "" },
    validate: (values) => ({
      current: values.current ? undefined : "Enter your current password",
      next: !values.next ? "Enter a new password"
        : !passwordRules.every((rule) => rule.test(values.next)) ? "Meet every rule below"
          : values.next === values.current ? "Choose a password you don't use now" : undefined,
    }),
    onSubmit: async (values, { setError }) => {
      if (!(await changePassword(values.current, values.next))) return setError("current", "This doesn't match your current password");
      setPasswordOpen(false);
      setPasswordChanged("just now");
      toast({ title: "Password changed" });
    },
  });
  const openPassword = () => { passwordForm.reset(); setPasswordShown(false); setPasswordOpen(true); };

  const codeForm = useFormState({
    initialValues: { code: "" },
    validate: (values) => ({ code: /^\d{6}$/.test(values.code.replace(/\s/g, "")) ? undefined : "Enter the 6-digit code from your app" }),
    onSubmit: async (values) => {
      await turnOnTwoStep(values.code.replace(/\s/g, ""));
      setTwoStep(true);
      setTwoStepOpen(false);
      toast({ title: "2-step verification turned on" });
    },
  });
  const openTwoStep = () => {
    if (twoStep) return setTurnOffOpen(true);
    codeForm.reset();
    setTwoStepOpen(true);
  };
  const copySetupKey = () => {
    void navigator.clipboard?.writeText(setupKey.replace(/\s/g, "")).catch(() => undefined);
    toast({ title: "Setup key copied" });
  };

  /* ── Danger zone ── */
  const openDelete = () => { setTypedName(""); setDeleteOpen(true); };
  const confirmDelete = async () => {
    setDeleting(true);
    await deleteWorkspace();
    setDeleting(false);
    setDeleteOpen(false);
    // Your app signs everyone out here and opens the workspace picker.
    toast({ title: "Workspace deleted", children: `${workspace.name} is gone for every member` });
  };

  return (
    <AppShell
      sidebar={(
        <Sidebar
          // The workspace mark and name head the Sidebar (brand grows with density; the logo slot is for a logo image).
          brand={<Stack direction="row" gap="xs" align="center"><Avatar size="sm" shape="square" theme="violet" alt="">{workspace.initial}</Avatar><Text as="span" textStyle="Body/Base/Bold">{workspace.name}</Text></Stack>}
          sections={nav}
          selectedId="settings"
          // Your router goes here: navigate(`/${item.id}`).
          onItemClick={(item) => { if (item.id !== "settings") notInDemo(item.label); }}
        />
      )}
      header={<Breadcrumbs master={false} items={[{ id: "admin", label: "Admin" }, { id: "settings", label: "Settings" }]} onNavigate={(item, event) => { event.preventDefault(); if (item.id !== "settings") notInDemo(String(item.label)); }} />}
      headerActions={<>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} aria-expanded={inboxOpen} onClick={() => { setUnread(0); setInboxOpen((open) => !open); }} />
        <Menu align="end" trigger={<AppShellAccount name={saved.name} src={saved.photo?.previewUrl} theme="neutral" />} items={[
          { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => nameRef.current?.focus() },
          { type: "separator" },
          { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => notInDemo("Signing out") },
        ]} />
      </>}
      aside={inboxOpen ? (
        <SidePanel type="standard" title="Notifications" open onOpenChange={setInboxOpen}>
          <List aria-label="Notifications">
            {notices.map((notice) => (
              <ListItem key={notice.id} title={notice.title} caption={notice.caption} leading={<DockIcon icon={notice.icon} background="subtle" size="md" />} />
            ))}
          </List>
        </SidePanel>
      ) : undefined}
      footer={(
        <ActionBar position="static" direction="horizontal" aria-label="Profile changes"
          summary={<Text as="span" textStyle="Body/Small/Regular" tone="base" role="status">{status}</Text>}
          secondaryAction={{ label: "Discard", disabled: !profile.isDirty || profile.isSubmitting, onClick: () => profile.reset() }}
          primaryAction={{ label: profile.isSubmitting ? "Saving…" : "Save changes", type: "submit", form: formId, disabled: !profile.isDirty || profile.isSubmitting }} />
      )}
    >
      <Container maxWidth="md">
        <Stack gap="xl" paddingY="lg">
          <PageHeader title="Settings" description={`Your account and the ${workspace.name} workspace.`} />

          <SettingsSection title="Profile" description="How you appear to the studio in projects, comments and mentions.">
            <Card>
              <Form form={profile} id={formId}>
                <Stack direction="row" gap="lg" align="center">
                  <Avatar size="2xl" theme={photo ? "photo" : "neutral"} background="subtle" src={photo?.previewUrl} alt="">{initials(profile.values.name.trim() || saved.name)}</Avatar>
                  <FileUpload label="Profile photo" type="button" buttonLabel="Upload photo" accept="image/jpeg,image/png" helpText="JPG or PNG, up to 2 MB"
                    thumbnail="none" files={photo ? [photo] : []} onFilesAdd={addPhoto} error={profile.fieldError("photo")}
                    onRemove={() => profile.setValue("photo", null)} />
                </Stack>
                <Stack gap="md">
                  <InputField ref={nameRef} label="Full name" autoComplete="name" {...profile.field("name")} />
                  <InputField label="Email" type="email" autoComplete="email"
                    helpText={profile.values.email.trim().toLowerCase() !== saved.email ? "We'll email a link to confirm it" : undefined} {...profile.field("email")} />
                  <SelectField label="Time zone" options={timeZones} {...profile.selectField("timezone")} />
                </Stack>
              </Form>
            </Card>
          </SettingsSection>

          <SettingsSection title="Notifications" description="What we email you about. Changes save right away.">
            <Card>
              <FormFieldset legend="Email me about" kind="toggle">
                {emailSettings.map((setting) => (
                  <Toggle key={setting.id} size={phone ? "lg" : "md"} label={setting.label} caption={setting.caption}
                    checked={emailPrefs[setting.id]} onCheckedChange={(on) => switchEmail(setting, on)} />
                ))}
              </FormFieldset>
            </Card>
          </SettingsSection>

          <SettingsSection title="Sign-in and security" description="Your password and the second step that protects your account.">
            <ListBox theme="shadow">
              <List aria-label="Sign-in methods">
                <ListItem title="Password" caption={`Last changed ${passwordChanged}`} onClick={openPassword}
                  leading={<DockIcon icon="icon-lock-01-line" background="subtle" size="md" />}
                  trailing={<Icon name="icon-chevron-right-line" decorative />} />
                {/* The status Badge sits after the title (Contents slot), so the title keeps its width on phones. */}
                <ListItem title="2-step verification" onClick={openTwoStep}
                  leading={<DockIcon icon="icon-passcode-line" background="subtle" size="md" />}
                  trailing={<Icon name="icon-chevron-right-line" decorative />}>
                  <Stack direction="row" gap="xs" align="center" wrap>
                    <Text as="span" textStyle="Body/Base/Bold">2-step verification</Text>
                    <Badge size="sm" theme={twoStep ? "green" : "neutral"} background="subtle">{twoStep ? "On" : "Off"}</Badge>
                  </Stack>
                  <Text as="span" textStyle="Body/Small/Regular" tone="light">{twoStep ? "Codes come from your authenticator app" : "Add a code from your phone to each sign-in"}</Text>
                </ListItem>
              </List>
            </ListBox>
          </SettingsSection>

          <SettingsSection title="Danger zone" description="Actions here can't be undone.">
            <Card>
              <Stack gap="md" align="start">
                <Text>Deleting {workspace.name} removes its projects, files and comments for everyone, and every member loses access.</Text>
                <Button level="danger-subtle" startIcon="icon-trash-line" onClick={openDelete}>Delete workspace</Button>
              </Stack>
            </Card>
          </SettingsSection>
        </Stack>
      </Container>

      <ModalForm open={passwordOpen} onOpenChange={setPasswordOpen} title="Change password" onSubmit={passwordForm.handleSubmit}
        description="Other devices where you're signed in will sign out."
        primaryAction={{ label: passwordForm.isSubmitting ? "Changing…" : "Change password", disabled: passwordForm.isSubmitting }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Current password" type="password" autoComplete="current-password" data-autofocus="" {...passwordForm.field("current")} />
        <InputField label="New password" type={passwordShown ? "text" : "password"} autoComplete="new-password" {...passwordForm.field("next")}
          trailing={<InputLeadingTrailing icon={passwordShown ? "icon-eye-off-line" : "icon-eye-line"} aria-label={passwordShown ? "Hide password" : "Show password"} onClick={() => setPasswordShown((shown) => !shown)} />} />
        <InputConditions>
          {passwordRules.map((rule) => (
            <InputConditionItem key={rule.label} label={rule.label} state={!passwordForm.values.next ? "default" : rule.test(passwordForm.values.next) ? "success" : "wrong"} />
          ))}
        </InputConditions>
      </ModalForm>

      <ModalForm open={twoStepOpen} onOpenChange={setTwoStepOpen} title="Turn on 2-step verification" onSubmit={codeForm.handleSubmit}
        description={`Add ${workspace.name} to your authenticator app with this key, then enter the code the app shows.`}
        primaryAction={{ label: codeForm.isSubmitting ? "Turning on…" : "Turn on", disabled: codeForm.isSubmitting }} secondaryAction={{ label: "Cancel" }}>
        <DescriptionList layout="stacked" items={[{
          term: "Setup key",
          description: <Text as="span" textStyle="Body/Code/Regular">{setupKey}</Text>,
          action: <IconButton appearance="flat" level="primary" size="sm" aria-label="Copy setup key" icon="icon-copy-line" onClick={copySetupKey} />,
        }]} />
        <InputField label="6-digit code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" data-autofocus="" {...codeForm.field("code")} />
      </ModalForm>

      <Dialog open={turnOffOpen} onOpenChange={setTurnOffOpen} theme="warning" title="Turn off 2-step verification?"
        description="Signing in will only need your password, so a leaked password is enough to get in."
        primaryAction={{ label: "Turn off", onClick: () => { setTwoStep(false); setTurnOffOpen(false); toast({ title: "2-step verification turned off" }); } }}
        secondaryAction={{ label: "Cancel", autoFocus: true }} />

      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!deleting) setDeleteOpen(open); }} dismissible={!deleting} theme="negative"
        title={`Delete ${workspace.name}?`}
        description="Its projects, files and comments are deleted for everyone, and every member loses access. You can't undo this."
        primaryAction={{ label: deleting ? "Deleting…" : "Delete workspace", level: "danger", disabled: deleting || plain(typedName) !== plain(workspace.name), onClick: confirmDelete }}
        secondaryAction={{ label: "Cancel", autoFocus: true, disabled: deleting }}>
        <InputField label={`Type “${workspace.name}” to confirm`} autoComplete="off" value={typedName} onValueChange={setTypedName} readOnly={deleting} />
      </Dialog>
    </AppShell>
  );
}
