import { useState } from "react";
import { AppShellAccount, AppShellAction, Breadcrumbs, Button, DashboardHeader, Icon, Menu, Stack, Text, plural, useZen, type MenuItemData } from "@zen-ds/react";
import { people } from "../../data";

const trail = [{ id: "home", label: "Home" }, { id: "time-off", label: "Time off" }, { id: "my-leaves", label: "My leaves" }];

export default function NavigationBar() {
  const [depth, setDepth] = useState(trail.length);
  const [unread, setUnread] = useState(8);
  const [note, setNote] = useState<string | null>(null);
  const alex = people.alex;
  // A phone-width bar has no room for the trail beside the actions: Back to the parent takes its place (as PageHeader's back).
  const narrow = useZen()?.breakpoint === "mobile";
  const parent = depth > 1 ? trail[depth - 2] : undefined;
  // On a phone Help moves into the account menu, so the bar keeps room for Back.
  const help: MenuItemData = { id: "help", label: "Help", icon: "icon-help-circle-line", onSelect: () => setNote("Help opened") };
  return (
    <Stack gap="xs" width="fill">
      <DashboardHeader
        type="navigation"
        leading={narrow && parent
          ? <Button appearance="flat" level="primary" size="sm" startIcon={<Icon name="icon-chevron-left-line-medium" decorative />} onClick={() => setDepth(depth - 1)}>{parent.label}</Button>
          : <Breadcrumbs items={trail.slice(0, depth)} onNavigate={(item, event) => { event.preventDefault(); setDepth(trail.findIndex((crumb) => crumb.id === item.id) + 1); }} />}
        trailing={<>
          <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => { setUnread(0); setNote(unread ? `${plural(unread, "notification")} marked read` : "No new notifications"); }} />
          {narrow ? null : <AppShellAction icon="icon-help-circle-line" aria-label="Help" onClick={help.onSelect} />}
          <Menu align="end" aria-label="Account" trigger={<AppShellAccount name={alex.name} src={alex.photo} />}
            items={[{ id: "profile", label: "Profile", icon: "icon-user-line", onSelect: () => setNote("Profile opened") }, ...(narrow ? [help] : []), { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => setNote("Signed out") }]} />
        </>}
      />
      {depth < trail.length ? <Button level="tertiary" size="sm" onClick={() => setDepth(trail.length)}>Back to My leaves</Button> : null}
      {note ? <Text as="p" textStyle="Body/Small/Regular" tone="light" role="status">{note}</Text> : null}
    </Stack>
  );
}
