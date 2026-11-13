import { useId, useState } from "react";
import {
  AppShell, Avatar, AvatarStack, BottomNavigation, BottomSheet, Button, DescriptionList, Heading, List, ListItem, Stack, Text, TopNavigation, plural, useToast,
  type BottomNavigationItem,
} from "@zen-ds/react";
import { initials, me, people, projectById, studio, tasks, type Person } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarItem = (person: Pick<Person, "name" | "photo" | "theme">) =>
  person.photo ? { src: person.photo, alt: person.name, theme: "photo" as const } : { alt: person.name, theme: person.theme };

/** The studio app's roots on a phone; Profile is this screen. */
const studioRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "time-off", label: "Time off", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** Alex's latest comment, where the Avatar shows next to what they wrote. */
const myComment = { task: tasks.find((task) => task.id === "t5")!, text: "Contrast on the balance card fails at 3.9:1. Can we darken the label?" };
/** The project team as others see it in a stack: Alex first, then the rest of the Lumen Bank team. */
const bankingTeam = projectById("lumen-banking").members.filter((id) => id !== me.id).map((id) => people[id]);

export default function ProfilePhoto() {
  const { toast } = useToast();
  const [photo, setPhoto] = useState<string | undefined>(me.photo);
  const [sheet, setSheet] = useState(false);
  const [root, setRoot] = useState("profile");
  const previewId = useId();
  const detailsId = useId();
  const avatar = (size: "sm" | "md" | "3xl", status = false) => photo
    ? <Avatar size={size} theme="photo" src={photo} alt="" status={status} />
    : <Avatar size={size} theme={me.theme} alt="" status={status}>{initials(me.name)}</Avatar>;
  const meInStack = photo ? { src: photo, alt: me.name, theme: "photo" as const } : { alt: me.name, theme: me.theme };
  const remove = () => {
    setPhoto(undefined);
    toast({ title: "Photo removed", children: "People see your initials instead.", action: { label: "Undo", onClick: () => setPhoto(me.photo) } });
  };
  return (
    // Profile is a tab root on the AppShell's Band-Sheet: the band carries who you are (the photo at 3XLarge, the name,
    // Change photo), and the page rises over it as a white sheet whose groups show the same Avatar where others meet it.
    <>
      <AppShell mobileTop="band-sheet"
        topNavigation={<TopNavigation title="Profile"
          trailing={[{ icon: "icon-settings-01-line", label: "Settings", onClick: () => toast({ title: "Settings", children: "Notifications, privacy and sign-in." }) }]} />}
        hero={(
          <Stack gap="md" align="center" paddingY="sm">
            {avatar("3xl")}
            <Stack gap="2xs" align="center">
              <Heading level={2} textStyle="Heading/2" align="center">{me.name}</Heading>
              <Text tone="base" align="center">{`${me.role} · ${me.location}`}</Text>
            </Stack>
            <Button level="tertiary" startIcon="icon-camera-line" onClick={() => setSheet(true)}>{photo ? "Change photo" : "Add photo"}</Button>
          </Stack>
        )}
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={studioRoots} value={root} onValueChange={setRoot} />}
      >
        {/* The rows have no side padding of their own: the sheet's margin (20) insets them and the kicker above each group. */}
        <Stack as="section" gap="xs" aria-labelledby={previewId}>
          <Heading level={2} id={previewId} textStyle="Body/Small/Bold" tone="light">How others see you</Heading>
          <List aria-labelledby={previewId}>
            <ListItem leading={avatar("md", true)} title={me.name} caption="Online · in chat and on every task" />
            <ListItem leading={avatar("md")} title={`On ${myComment.task.key}`} titleLines={1} caption={myComment.text} />
            <ListItem leading={<AvatarStack size="sm" items={[meInStack, ...bankingTeam.slice(0, 3).map(avatarItem)]} />}
              title={projectById("lumen-banking").name} caption={`You and ${plural(bankingTeam.length, "other")}`} />
          </List>
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={detailsId}>
          <Heading level={2} id={detailsId} textStyle="Body/Small/Bold" tone="light">Details</Heading>
          <DescriptionList divider items={[
            { id: "email", term: "Email", description: me.email },
            { id: "team", term: "Team", description: me.team },
            { id: "office", term: "Office", description: me.location },
            { id: "workspace", term: "Workspace", description: studio.name },
          ]} />
        </Stack>
      </AppShell>
      <BottomSheet inline type="action" open={sheet} onOpenChange={setSheet} title="Profile photo"
        items={photo
          ? [{ id: "library", label: "Choose from library", icon: "icon-image-line" }, { id: "remove", label: "Remove photo", icon: "icon-trash-line", destructive: true }]
          : [{ id: "library", label: "Choose from library", icon: "icon-image-line" }]}
        onSelect={(item) => {
          if (item.id === "remove") remove();
          else { setPhoto(me.photo); toast({ title: "Photo updated", children: "It shows on your tasks, comments and chats." }); }
        }} />
    </>
  );
}
