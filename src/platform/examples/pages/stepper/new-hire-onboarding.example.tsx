import { useRef, useState } from "react";
import {
  Avatar, Button, Card, Checkbox, DescriptionList, Form, FormActions, FormFieldset, Grid, Heading, List, ListItem, SelectField, Stack, Stepper, Text, TextAreaField,
  plural, useToast, type StepperStep,
} from "@zen-ds/react";
import { daysFromToday, formatDate, formatDay, formatTime, initials, people, type PersonId } from "../../data";

// Tam Dang joins Alex's design team on Monday. People Ops finished the first two steps; the design lead does the rest.
const newHire = { name: "Tam Dang", role: "Product Designer", email: "tam@dizai.studio", start: daysFromToday(5, 9, 0) };
const startsAt = `${formatDay(newHire.start)} at ${formatTime(newHire.start)}`;
const accountOptions = [
  { id: "zen", label: "Zen workspace", caption: "Projects, tasks and time tracking" },
  { id: "figma", label: "Figma", caption: "Editor seat on the Đìzai Studio team" },
  { id: "slack", label: "Slack", caption: "#design and #studio-hcmc" },
  { id: "google", label: "Google Workspace", caption: newHire.email },
];
const buddyIds: PersonId[] = ["chi", "ava", "emi", "gia"];
const buddyOptions = buddyIds.map((id) => ({ label: people[id].name, value: id }));
const welcomeDraft = "Welcome to the design team, Tam. We start at 9:00 am at the Ho Chi Minh City office, and the whole team has lunch together at noon.";
const onboardingCopy = [
  `${people.minhAnh.name} in People Ops finished this step on Sep 24.`,
  "People Ops ordered it, and it arrives at the office before the first day.",
  `Each account sends an invite to ${newHire.email}.`,
  "A teammate who has lunch with Tam on day one and answers questions in the first month.",
  `Tam gets it on ${startsAt}, from you.`,
];

/** Onboarding a new hire: a vertical stepper beside the step, its captions a summary of the answers. */
export default function NewHireOnboarding() {
  const { toast } = useToast();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [current, setCurrent] = useState(2);
  const [accounts, setAccounts] = useState(["zen", "google"]);
  const [buddy, setBuddy] = useState("");
  const [message, setMessage] = useState(welcomeDraft);
  const [error, setError] = useState<string>();
  // Long titles with captions sit beside the content, vertical. The captions carry the answers, so the stepper
  // doubles as a summary of what has been set up.
  const steps: StepperStep[] = [
    { id: "contract", title: "Contract and paperwork", caption: "Signed Sep 21" },
    { id: "equipment", title: "Laptop and equipment", caption: "Arrives Oct 2" },
    { id: "accounts", title: "Accounts and access", caption: plural(accounts.length, "account") },
    { id: "buddy", title: "Onboarding buddy", caption: buddy ? people[buddy as PersonId].name : "Optional" },
    { id: "welcome", title: "Welcome message", caption: `Sends ${startsAt}` },
  ];
  const scheduled = current === steps.length;

  // A new step puts focus on its heading; the current step's own button does the same without a change.
  const go = (index: number) => {
    setCurrent(index);
    setTimeout(() => headingRef.current?.focus());
  };
  const next = () => {
    if (current === 2 && !accounts.length) { setError("Choose at least one account"); return; }
    if (current === steps.length - 1) {
      toast({ title: "Welcome message scheduled", children: `${newHire.name} gets it on ${startsAt}`,
        action: { label: "Undo", onClick: () => go(steps.length - 1) } });
    }
    go(current + 1);
  };
  const toggleAccount = (id: string, checked: boolean) => {
    setError(undefined);
    setAccounts((list) => (checked ? [...list, id] : list.filter((x) => x !== id)));
  };

  return (
    <Card theme="default" as="section" aria-label={`Onboarding for ${newHire.name}`}>
      {/* Steps beside the content while the card has room for both columns (640px); on a narrow card they stack. */}
      <Grid columns="minmax(0, 16rem) minmax(0, 40rem)" stackBelow={640} gap="lg" align="start">
        <Stack gap="md">
          <List aria-label="New hire">
            <ListItem leading={<Avatar theme="crimson" alt="">{initials(newHire.name)}</Avatar>} title={newHire.name} caption={`${newHire.role} · Starts ${formatDay(newHire.start)}`} />
          </List>
          <Stepper aria-label="Onboarding" orientation="vertical" steps={steps} current={current}
            onStepClick={scheduled ? undefined : (_, index) => go(index)} />
        </Stack>
        {scheduled ? (
          <Stack gap="md">
            <Stack gap="xs">
              <Heading ref={headingRef} tabIndex={-1} level={4} textStyle="Heading/Subheading">Tam is ready for Monday</Heading>
              <Text textStyle="Body/Base/Regular" tone="base">
                {`${plural(accounts.length, "invite")} sent${buddy ? `, ${people[buddy as PersonId].name} is the buddy,` : ""} and the welcome message goes out on ${startsAt}.`}
              </Text>
            </Stack>
            <Stack direction="row" justify="end">
              <Button level="tertiary" startIcon="icon-edit-01-line" onClick={() => go(steps.length - 1)}>Edit message</Button>
            </Stack>
          </Stack>
        ) : (
          <Form onSubmit={next}>
            <Stack gap="md">
              <Stack gap="xs">
                <Heading ref={headingRef} tabIndex={-1} level={4} textStyle="Heading/Subheading">{steps[current].title}</Heading>
                <Text textStyle="Body/Base/Regular" tone="base">{onboardingCopy[current]}</Text>
              </Stack>
              {current === 0 ? (
                <DescriptionList divider items={[
                  { term: "Contract", description: "Signed Sep 21, 2026" },
                  { term: "Tax and bank forms", description: "Received Sep 24, 2026" },
                  { term: "Start date", description: formatDate(newHire.start) },
                ]} />
              ) : current === 1 ? (
                <DescriptionList divider items={[
                  { term: "Laptop", description: "MacBook Pro 14-inch" },
                  { term: "Display", description: "Dell 27-inch monitor" },
                  { term: "Delivery", description: "Oct 2, 2026 to the Ho Chi Minh City office" },
                ]} />
              ) : current === 2 ? (
                <FormFieldset legend="Accounts" hideLegend kind="checkbox" error={error}>
                  {accountOptions.map((account) => (
                    <Checkbox key={account.id} label={account.label} caption={account.caption} checked={accounts.includes(account.id)}
                      onCheckedChange={(checked) => toggleAccount(account.id, checked)} />
                  ))}
                </FormFieldset>
              ) : current === 3 ? (
                <SelectField label="Buddy" labelOptional placeholder="Choose a teammate" options={buddyOptions} value={buddy} onValueChange={setBuddy} />
              ) : (
                <TextAreaField label="Message" value={message} onValueChange={setMessage} />
              )}
            </Stack>
            <FormActions>
              {current ? <Button level="tertiary" onClick={() => go(current - 1)}>Back</Button> : null}
              <Button level="primary" type="submit">{current === steps.length - 1 ? "Schedule message" : "Continue"}</Button>
            </FormActions>
          </Form>
        )}
      </Grid>
    </Card>
  );
}
