import { useRef, useState } from "react";
import {
  Accordion, AppShell, AppShellAccount, AppShellAction, AppShellHeader, AppShellPane, Badge, Box, Breadcrumbs, Button, DescriptionList, Divider, EmptyState,
  InlineMessage, Link, Menu, PageHeader, Search, SidebarSubMenu, Stack, Text, Thumbnail, useToast, useZen, type SidebarSection,
} from "@zen-ds/react";
import { daysFromToday, formatDate, leaveBalance, me, people, studio } from "../../data";

/** Sections of the leave policy in the People handbook. */
const leavePolicy = [
  { id: "annual", title: "Annual leave", body: ["Everyone gets 18 days of paid annual leave a year, plus 1 day for every 2 full years at the studio, up to 24 days. Days build up monthly from your start date.", "Request anything longer than 3 days at least 2 weeks ahead so your project lead can plan client cover."] },
  { id: "holidays", title: "Public holidays", body: ["Both offices close on Vietnam's 11 public holidays, including 5 days for Tết. If you work from Singapore or remotely, you follow the holidays of the country you work from; tell People Ops which one applies."] },
  { id: "sick", title: "Sick leave", body: ["Take up to 12 paid sick days a year. Tell your team lead before 10:00 am on the day.", "For more than 2 days in a row, add a doctor's note to your leave request when you are back."] },
  { id: "parental", title: "Parental leave", body: [`Birth parents get 6 months of paid leave and other parents get 4 weeks, to take within the first year. Talk to ${people.minhAnh.name} at least 2 months ahead.`] },
  { id: "carry", title: "Unused days", body: ["Up to 5 unused days carry over into the next year and expire on Mar 31. Any other unused days are paid out with your December salary."] },
];
const policyUpdated = daysFromToday(-16);

/** The People handbook's chapters: the Docs pane's navigation. Leave policy is the page this example draws. */
const handbookChapters: SidebarSection[] = [
  { label: "Welcome", items: [{ id: "how-we-work", label: "How the studio works" }, { id: "first-week", label: "Your first week" }] },
  { label: "Time off", items: [{ id: "leave", label: "Leave policy" }, { id: "holidays-2026", label: "2026 public holidays" }, { id: "remote", label: "Working remotely" }] },
  { label: "Pay and expenses", items: [{ id: "payday", label: "Payday and payslips" }, { id: "expenses", label: "Expenses" }, { id: "equipment", label: "Equipment budget" }] },
  { label: "Working together", items: [{ id: "conduct", label: "Code of conduct" }, { id: "reviews", label: "Feedback and reviews" }] },
];
const annualLeave = leaveBalance["Annual leave"]!;
const sickLeave = leaveBalance["Sick leave"]!;

/** The account button at the end of the header's top row, in its menu. */
function HandbookAccount() {
  const { toast } = useToast();
  return (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
      { id: "leave", label: "Your time off", icon: "icon-calendar-line", onSelect: () => toast({ title: `${annualLeave.left} days of annual leave left`, children: `Of ${annualLeave.perYear} this year.` }) },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
    ]} />
  );
}

/**
 * The People handbook in the Docs pattern (reading): the chapters in the leading pane, the policy in the 720 reading
 * column, "On this page" and the reader's own balance in the trailing pane. Sections sit right under the page h1
 * (headingLevel 2, Large), with Expand all / Collapse all; a link in "On this page" opens its section and focuses it.
 */
// narrow: the shell is narrower than 1024, where the AppShell leaves the Docs pattern for its narrow layout. Leave it
// out in your app (the breakpoint says so); the docs pass it from the card the example sits in, narrower than the window.
export default function LeavePolicy({ narrow: narrowProp }: { narrow?: boolean }) {
  const { toast } = useToast();
  const breakpoint = useZen()?.breakpoint;
  const [open, setOpen] = useState<string[]>(["annual"]);
  const [query, setQuery] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  // A narrow window has no room for the chapters beside the page, and stacked above it they would push the policy off
  // the first screen: the trail leads back up instead, and the header keeps the studio and the utilities.
  const narrow = narrowProp ?? (breakpoint === "tablet" || breakpoint === "mobile");
  const allOpen = open.length === leavePolicy.length;
  const toggle = (id: string, next: boolean) => setOpen((current) => next ? [...current, id] : current.filter((openId) => openId !== id));
  // "On this page" opens the section and moves focus to it, so the reader lands on what they picked.
  const goTo = (id: string) => {
    setOpen((current) => (current.includes(id) ? current : [...current, id]));
    setTimeout(() => sectionRefs.current[id]?.focus());
  };
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Leave policy." });
  // The header Search filters the handbook's chapters as you type.
  const words = query.trim().toLowerCase();
  const chapters: SidebarSection[] = handbookChapters
    .map((chapter) => ({ ...chapter, items: chapter.items.filter((item) => !words || item.label.toLowerCase().includes(words)).map((item) => ({ ...item, selected: item.id === "leave" })) }))
    .filter((chapter) => chapter.items.length > 0);
  return (
    // Docs on the Canvas: a 720 reading column between two equal Canvas panes (no box). The header keeps its top row
    // (Figma Top-Header only): the handbook's name, its Search and the reader's utilities.
    <AppShell pattern="docs"
      header={(
        <AppShellHeader
          leading={(
            <Stack direction="row" gap="xs" align="center">
              <Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>
              {narrow ? null : <Badge size="sm" theme="neutral" background="subtle" leadingIcon={false}>Handbook</Badge>}
            </Stack>
          )}
          center={narrow ? undefined : <Search placeholder="Search the handbook" aria-label="Search the handbook" value={query} onValueChange={setQuery} />}
          actions={<>
            <AppShellAction icon="icon-message-chat-circle-line" aria-label="Ask People Ops"
              onClick={() => toast({ title: `Message to ${people.minhAnh.name}`, children: "People Ops answers within a working day." })} />
            <HandbookAccount />
          </>}
        />
      )}
      leadingPane={narrow ? undefined : (
        <AppShellPane theme="canvas" aria-label="Handbook chapters">
          {chapters.length ? (
            <SidebarSubMenu sections={chapters} onItemClick={(item) => { if (item.id !== "leave") notHere(item.label); }} />
          ) : (
            <EmptyState size="sm" headingLevel={2} icon="icon-search-medium-line" title="No chapters match"
              secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Try “leave”, “expenses” or “remote”.</EmptyState>
          )}
        </AppShellPane>
      )}
      trailingPane={(
        <AppShellPane theme="canvas" aria-label="On this page">
          <Stack gap="lg">
            <Stack gap="sm">
              <Box paddingX="xs"><Text textStyle="All-Caps/S" tone="light">On this page</Text></Box>
              <Stack as="nav" gap="sm" paddingX="xs" aria-label="On this page">
                {leavePolicy.map((section) => (
                  // zen-allow-link-underline: "On this page" is a list of plain Body/Small rows (as the Docs pattern draws it); the nav landmark says they are links.
                  <Text key={section.id} textStyle="Body/Small/Regular" tone={open.includes(section.id) ? "strongest" : "light"}>
                    <Link as="button" tone="inherit" underline="hover" onClick={() => goTo(section.id)}>{section.title}</Link>
                  </Text>
                ))}
              </Stack>
            </Stack>
            <Divider />
            {/* The reader's own numbers next to the rules they read. */}
            <Stack gap="sm" paddingX="xs">
              <Text textStyle="All-Caps/S" tone="light">Your leave this year</Text>
              <DescriptionList items={[
                { id: "annual", term: "Annual leave", description: `${annualLeave.left} of ${annualLeave.perYear} days left` },
                { id: "sick", term: "Sick leave", description: `${sickLeave.left} of ${sickLeave.perYear} days left` },
              ]} />
              <Box>
                <Button level="tertiary" size="sm" startIcon="icon-calendar-plus-line"
                  onClick={() => toast({ title: "Leave request started", children: "Pick your dates in Time off; your team lead gets the request." })}>Request leave</Button>
              </Box>
            </Stack>
          </Stack>
        </AppShellPane>
      )}
    >
      <Stack gap="xl">
        {/* The trail sits in the PageHeader, which turns it into Back to Time off on a phone. */}
        <PageHeader title="Leave policy"
          breadcrumbs={<Breadcrumbs master={false} items={[{ id: "handbook", label: "Handbook" }, { id: "time-off", label: "Time off" }, { id: "leave", label: "Leave policy" }]}
            onNavigate={(item, event) => { event.preventDefault(); notHere(item.id === "handbook" ? "The handbook's home" : "Time off"); }} />}
          description={`How annual, sick and parental leave work at the studio. Updated ${formatDate(policyUpdated)} by ${people.minhAnh.name}.`}
          actions={<Button level="tertiary" aria-expanded={allOpen} onClick={() => setOpen(allOpen ? [] : leavePolicy.map((section) => section.id))}>{allOpen ? "Collapse all" : "Expand all"}</Button>} />
        <InlineMessage theme="info" title="What changed in this update">
          Unused days now carry over until Mar 31 instead of Jan 31, so a Tết trip no longer costs you the days you saved.
        </InlineMessage>
        <Stack gap="none">
          {leavePolicy.map((section) => (
            // "On this page" focuses the section's Box (tabIndex -1), so the next Tab reaches the section's header.
            <Box key={section.id} ref={(element) => { sectionRefs.current[section.id] = element; }} tabIndex={-1}>
              <Accordion size="lg" headingLevel={2} title={section.title}
                expanded={open.includes(section.id)} onExpandedChange={(next) => toggle(section.id, next)}>
                <Stack gap="sm">{section.body.map((paragraph) => <Text key={paragraph} tone="base">{paragraph}</Text>)}</Stack>
              </Accordion>
            </Box>
          ))}
        </Stack>
      </Stack>
    </AppShell>
  );
}
