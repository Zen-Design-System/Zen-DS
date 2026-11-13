import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Avatar, BottomSheet, Box, Button, DockIcon, Form, FormFieldset, InputField, List, ListItem, Stack, Tag, Text, TopNavigation, plural,
  useToast, type DockIconTheme, type IconName,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatRelative, people, peopleList, projectById, type PersonId } from "../../data";

/** People with a photo can be picked for a group. */
const withPhoto = peopleList.filter((person) => person.photo);

type Group = { id: string; name: string; icon: IconName; theme: DockIconTheme; members: number; active: Date };
/** Alex's groups in the Zen app, most recently active first. Project groups keep their project's mark. */
const projectGroup = (projectId: string, members: number, active: Date): Group => {
  const project = projectById(projectId);
  return { id: project.id, name: project.name, icon: project.icon, theme: project.theme, members, active };
};
const studioGroups: Group[] = [
  projectGroup("phin-loyalty", 6, daysFromToday(0, 10, 24)),
  { id: "design", name: "Design team", icon: "icon-pen-tool-01-line", theme: "pink", members: 9, active: daysFromToday(0, 10, 2) },
  projectGroup("lumen-banking", 7, daysFromToday(0, 9, 40)),
  { id: "news", name: "Studio announcements", icon: "icon-bell-01-line", theme: "yellow", members: 48, active: daysFromToday(0, 8, 30) },
  { id: "engineering", name: "Engineering", icon: "icon-code-01-line", theme: "violet", members: 12, active: daysFromToday(-1, 18, 10) },
  projectGroup("zen-ds", 5, daysFromToday(-1, 16, 45)),
  { id: "hanoi", name: "Hanoi office", icon: "icon-building-01-line", theme: "cyan", members: 17, active: daysFromToday(-1, 12, 5) },
  { id: "hcmc", name: "Ho Chi Minh City office", icon: "icon-building-02-line", theme: "cyan", members: 28, active: daysFromToday(-1, 9, 30) },
  { id: "critique", name: "Design critique", icon: "icon-annotation-line", theme: "purple", members: 11, active: daysFromToday(-2, 15, 0) },
  projectGroup("mekong-tracking", 3, daysFromToday(-2, 11, 20)),
  { id: "research", name: "Research guild", icon: "icon-beaker-02-line", theme: "green", members: 6, active: daysFromToday(-5, 17, 30) },
  { id: "lunch", name: "Friday lunch", icon: "icon-coffee-cup-line", theme: "orange", members: 23, active: daysFromToday(-5, 11, 45) },
  projectGroup("saola-brand", 3, daysFromToday(-6, 14, 15)),
  { id: "motion", name: "Motion club", icon: "icon-film-01-line", theme: "plum", members: 5, active: daysFromToday(-8, 16, 0) },
  projectGroup("bookfair-site", 3, daysFromToday(-12, 10, 30)),
];

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function NewGroup({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const formId = useId();
  const [view, setView] = useState<"groups" | "new">("new");
  const [groups, setGroups] = useState(studioGroups);
  const [name, setName] = useState("Loyalty app launch");
  const [members, setMembers] = useState<PersonId[]>(["chi", "bao", "duy", "emi"]);
  const [picking, setPicking] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<{ name?: string; members?: string }>({});
  // Focus follows the screen: each screen focuses its title. A removed tag takes its button with it: focus moves to Add people.
  const titleRef = useRef<HTMLSpanElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const title = (text: string) => <span ref={titleRef} tabIndex={-1}>{text}</span>;
  const toggle = (id: PersonId) => setMembers((list) => list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  const removeMember = (id: PersonId) => {
    toggle(id);
    setTimeout(() => addRef.current?.focus());
  };
  const toGroups = () => {
    setView("groups");
    setName("");
    setMembers([]);
    setError({});
    setTimeout(() => titleRef.current?.focus());
  };
  const openNew = () => {
    setView("new");
    setTimeout(() => titleRef.current?.focus());
  };
  // Close drops the draft only after asking, unless there is nothing to lose.
  const close = () => (name.trim() || members.length ? setDiscarding(true) : toGroups());
  const create = () => {
    const next = { name: name.trim() ? undefined : "Enter a group name", members: members.length >= 2 ? undefined : "Add at least 2 people" };
    setError(next);
    if (next.name || next.members) return;
    setGroups((list) => [{ id: `group-${list.length}`, name: name.trim(), icon: "icon-users-line", theme: "blue", members: members.length + 1, active: TODAY }, ...list]);
    toGroups();
    toast({ type: "positive", title: "Group created" });
  };

  if (view === "groups") {
    return (
      <AppShell key="groups"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Groups" largeTitle={title("Groups")}
          trailing={[{ icon: "icon-users-plus-line", label: "New group", onClick: openNew }]} />}>
        {/* Static rows (nothing opens a group here). */}
        <List aria-label="Groups">
          {groups.map((group) => (
            <ListItem key={group.id} title={group.name} caption={`${plural(group.members, "member")} · ${formatRelative(group.active)}`}
              leading={<DockIcon icon={group.icon} theme={group.theme} background="subtle" />} />
          ))}
        </List>
      </AppShell>
    );
  }
  return (
    <>
      {/* A create screen opens as a modal: Close on the leading edge, the main action in the footer. */}
      <AppShell key="new"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={title("New group")}
          leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }} />}
        actionBar={<ActionBar primaryAction={{ label: "Create group", type: "submit", form: formId }} />}>
        <Form id={formId} onSubmit={create}>
          <InputField label="Group name" size="lg" value={name} error={error.name} onValueChange={(value) => { setName(value); setError((e) => ({ ...e, name: undefined })); }} />
          <FormFieldset legend="Members" error={error.members}>
            {members.length ? (
              <Stack as="ul" direction="row" gap="2xs" wrap aria-label="Members added">
                {members.map((id) => {
                  const person = people[id];
                  return <Stack as="li" key={id} direction="row"><Tag photoSrc={person.photo} remove onRemove={() => removeMember(id)}>{person.name}</Tag></Stack>;
                })}
              </Stack>
            ) : null}
            <Box>
              <Button ref={addRef} level="tertiary" startIcon="icon-user-plus-line" aria-haspopup="dialog" onClick={() => setPicking(true)}>Add people</Button>
            </Box>
          </FormFieldset>
        </Form>
      </AppShell>
      <BottomSheet inline size="max" open={picking} onOpenChange={setPicking} title="Add people" primaryAction={{ label: "Done" }}>
        <List aria-label="Studio members">
          {withPhoto.filter((person) => person.id !== "alex").map((person) => (
            <ListItem key={person.id} selected={members.includes(person.id as PersonId)} onClick={() => { toggle(person.id as PersonId); setError((e) => ({ ...e, members: undefined })); }}
              leading={<Avatar size="md" theme="photo" src={person.photo} alt="" />} title={person.name} caption={person.role} />
          ))}
        </List>
      </BottomSheet>
      <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this group?"
        primaryAction={{ label: "Discard group", level: "danger", onClick: () => { setDiscarding(false); toGroups(); } }}
        secondaryAction={{ label: "Keep editing" }}>
        <Text tone="base">The name and the people you added will be lost.</Text>
      </BottomSheet>
    </>
  );
}
