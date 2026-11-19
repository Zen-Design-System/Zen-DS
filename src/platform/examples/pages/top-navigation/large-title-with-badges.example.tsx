import { AppShell, Badge, DockIcon, List, ListItem, TopNavigation, useToast } from "@zen-ds/react";

const rooms = [
  { id: "lamp", name: "Floor lamp", state: "On · 60%", icon: "icon-lightbulb-line" },
  { id: "heat", name: "Heating", state: "22 °C", icon: "icon-thermometer-warm-line" },
  { id: "tv", name: "TV", state: "Off", icon: "icon-tv-01-line" },
] as const;

/** A smart-home room: Badges under the large title say its state at a glance. */
export default function LargeTitleWithBadges() {
  const { toast } = useToast();
  return (
    <AppShell
      topNavigation={<TopNavigation type="alt" largeTitle="Living room" largeTitleSubheading="6 devices"
        largeTitleBadges={<><Badge theme="green" background="subtle">4 on</Badge><Badge theme="neutral" background="subtle">22 °C inside</Badge></>}
        trailing={[{ icon: "icon-plus-line", label: "Add device", onClick: () => toast({ title: "Add device", children: "Pairing isn't part of this demo." }) }]} />}>
      <List aria-label="Devices">
        {rooms.map((room) => <ListItem key={room.id} title={room.name} caption={room.state} leading={<DockIcon icon={room.icon} theme="neutral" background="subtle" />} />)}
      </List>
    </AppShell>
  );
}
