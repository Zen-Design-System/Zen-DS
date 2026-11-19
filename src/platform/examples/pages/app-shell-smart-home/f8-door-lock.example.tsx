import { useId, useState, type RefObject } from "react";
import {
  AppShell, Avatar, Card, DockIcon, Heading, Icon, IconButton, List, ListBox, ListItem, Stack, Text, ToggleButton, ToggleListItem, TopNavigation, useToast,
  type IconName,
} from "@zen-ds/react";
import { people } from "../../data";

type Device = { brand: string; name: string; room: string };

/** Figma Status: the power Toggle-Button XLarge, then the state as Display/3 with its line under it, aligned to the end. */
function DeviceStatus({ device, on, onPowerChange, disabled, icon, iconTone, value, caption }: {
  device: Device; on: boolean; onPowerChange?: (on: boolean) => void; disabled?: boolean;
  icon?: IconName; iconTone?: "light"; value: string; caption: string;
}) {
  return (
    <Stack direction="row" gap="md" align="center">
      <ToggleButton size="xl" icon="icon-power-01-line" aria-label={`${device.name} power`} checked={on} onCheckedChange={onPowerChange} disabled={disabled} />
      <Stack gap="none" align="end" width="fill">
        <Stack direction="row" gap="2xs" align="center">
          {icon ? <Icon name={icon} size="lg" tone={iconTone} decorative /> : null}
          <Text as="p" textStyle="Display/3" tabularNumbers>{value}</Text>
        </Stack>
        <Text textStyle="Body/Small/Regular" tone="base">{caption}</Text>
      </Stack>
    </Stack>
  );
}

const frontDoor: Device = { brand: "Yale", name: "Front door", room: "Entrance" };
/** Mai Anh, whose house it is (F1 "Hi, Mai Anh"); the same photo as on F1. */
const maiAnh = { name: "Mai Anh", photo: people.chi.photo };
type Access = { id: string; title: string; caption: string };

/** F8 · Door lock (Figma 15991:10369): the Yale lock on Mai Anh's front door, a device screen of her smart-home app.
 *  Pattern/AppShell/Mobile · Top=Bar · Bottom=None on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function DoorLock({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [locked, setLocked] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [guestCode, setGuestCode] = useState(false);
  const [history, setHistory] = useState<Access[]>([{ id: "face-id", title: "Mai Anh unlocked", caption: "Today 08:12 · Face ID" }]);
  const historyId = useId();
  const toggleLock = () => {
    const next = !locked;
    setLocked(next);
    setHistory((list) => [{ id: `app-${list.length}`, title: `${maiAnh.name} ${next ? "locked" : "unlocked"}`, caption: "Just now · App" }, ...list]);
    toast({ title: next ? "Front door locked" : "Front door unlocked", children: next ? "Entrance" : autoLock ? "It locks again after 30 seconds." : "It stays unlocked until you lock it." });
  };
  return (
    // Figma Top-Navigation/Mobile Type=Transparent: Back and More on the Canvas, and the Expand-Heading (the brand as
    // Capline over the device's name, its room as Subheading); then the status and the device's sections 32 apart.
    // zen-allow-mixed-boxes: the Brand Subtle stage under the lock button is Figma F8's Lock-Button, not a third box family.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label={frontDoor.name} largeTitle={frontDoor.name} largeTitleCapline={frontDoor.brand} largeTitleSubheading={frontDoor.room}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: `Back to ${frontDoor.room}` }) }}
        trailing={[{ icon: "icon-dots-vertical-line", label: `More for ${frontDoor.name}`, onClick: () => toast({ title: frontDoor.name, children: "Rename it, move it to another room or remove it." }) }]} />}
    >
      <Stack gap="xl">
        {/* The power switch is disabled: a lock is never switched off. */}
        <DeviceStatus device={frontDoor} on={false} disabled icon={locked ? "icon-lock-01-line" : "icon-lock-unlocked-01-line"} iconTone="light"
          value={locked ? "Locked" : "Unlocked"} caption={locked ? "Auto-locked at 07:41" : autoLock ? "Locks again in 30 seconds" : "Unlocked from the app"} />
        {/* One big round button to lock or unlock: a Surface Button/Icon-Main on the Brand stage (Figma Lock-Button). */}
        {/* zen-allow-mixed-elevation: the Brand stage is flat in Figma F8 (Lock-Button) beside the Shadow lists. */}
        <Card theme="subtle" color="brand">
          <Stack gap="sm" align="center" justify="center" paddingY="3xl">
            {/* zen-allow-no-tooltip: "Tap to unlock" sits right under the button. */}
            <IconButton size="xl" level="surface" icon={locked ? "icon-lock-01-line" : "icon-lock-unlocked-01-line"} aria-label={locked ? "Unlock the front door" : "Lock the front door"} tooltip={false} onClick={toggleLock} />
            <Text textStyle="Body/Base/Medium" tone="accent-base" aria-hidden="true">{locked ? "Tap to unlock" : "Tap to lock"}</Text>
          </Stack>
        </Card>
        <ListBox theme="shadow">
          <List aria-label="Lock settings">
            <ToggleListItem toggleSize="lg" title="Auto-lock" caption="After 30 seconds" checked={autoLock} onCheckedChange={setAutoLock}
              leading={<DockIcon icon="icon-clock-line" theme="neutral" background="subtle" />} />
            <ToggleListItem toggleSize="lg" title="Guest code" caption="Valid until Sunday" checked={guestCode}
              onCheckedChange={(next) => { setGuestCode(next); toast({ title: next ? "Guest code on" : "Guest code off", children: next ? "Code 4826 · valid until Sunday" : "Guests can no longer open the door." }); }}
              leading={<DockIcon icon="icon-key-line" theme="neutral" background="subtle" />} />
          </List>
        </ListBox>
        <ListBox theme="shadow" as="section" aria-labelledby={historyId}
          header={<Heading level={2} id={historyId} textStyle="Heading/Subheading">Recent access</Heading>}>
          <List aria-labelledby={historyId}>
            {history.slice(0, 3).map((entry) => (
              <ListItem key={entry.id} title={entry.title} caption={entry.caption}
                leading={<Avatar size="md" theme="photo" src={maiAnh.photo} alt="" />} />
            ))}
          </List>
        </ListBox>
      </Stack>
    </AppShell>
  );
}
