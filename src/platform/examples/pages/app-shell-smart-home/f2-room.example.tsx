import { useState, type RefObject } from "react";
import {
  AppShell, Box, Button, ChipGroup, DockIcon, List, ListBox, MetricCard, Stack, ToggleListItem, TopNavigation, useToast,
  type IconName,
} from "@zen-ds/react";

type RoomDevice = { id: string; name: string; icon: IconName; onCaption: string; offCaption: string };
const livingRoom: RoomDevice[] = [
  { id: "homepod", name: "HomePod mini", icon: "icon-speaker-01-line", onCaption: "Playing · 75%", offCaption: "Off" },
  { id: "ceiling-light", name: "Ceiling light", icon: "icon-lightbulb-line", onCaption: "Warm · 70%", offCaption: "Off" },
  { id: "floor-lamp", name: "Floor lamp", icon: "icon-lightbulb-line", onCaption: "Warm · 40%", offCaption: "Off" },
  { id: "air-conditioner", name: "Air conditioner", icon: "icon-snowflake-01-line", onCaption: "Cool · 24°C", offCaption: "Off" },
  { id: "tv", name: "Samsung TV", icon: "icon-tv-02-line", onCaption: "HDMI 1 · Netflix", offCaption: "Off" },
  { id: "blinds", name: "Blinds", icon: "icon-rows-01-line", onCaption: "Open · 80%", offCaption: "Closed" },
];
const roomScenes = [
  { value: "relax", label: "Relax" },
  { value: "movie", label: "Movie" },
  { value: "reading", label: "Reading" },
  { value: "all-off", label: "All off" },
];
/** What each scene switches on (Relax is the room as Figma shows it: 4 of 6 on). */
const sceneDevices: Record<string, string[]> = {
  relax: ["homepod", "ceiling-light", "air-conditioner", "blinds"],
  movie: ["floor-lamp", "air-conditioner", "tv"],
  reading: ["ceiling-light", "floor-lamp", "air-conditioner", "blinds"],
  "all-off": [],
};
const sceneState = (scene: string) => Object.fromEntries(livingRoom.map((device) => [device.id, sceneDevices[scene].includes(device.id)]));

/** F2 · Room (Figma 15991:10158): Mai Anh's living room, a pushed screen of her smart-home app.
 *  Pattern/AppShell/Mobile · Top=Bar · Bottom=None on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function LivingRoom({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [scene, setScene] = useState("relax");
  const [power, setPower] = useState<Record<string, boolean>>(() => sceneState("relax"));
  const onCount = livingRoom.filter((device) => power[device.id]).length;
  const addDevice = () => toast({ title: "Add a device to Living room", children: "Put it in pairing mode, then pick it from the list." });
  const runScene = (next: string) => {
    const state = sceneState(next);
    setScene(next);
    setPower(state);
    const on = Object.values(state).filter(Boolean).length;
    toast({ title: next === "all-off" ? "Everything in Living room is off" : `${roomScenes.find((item) => item.value === next)?.label} scene on`, children: `${on} of ${livingRoom.length} devices on` });
  };
  return (
    // Bar, no bottom bar (a pushed screen): Back and Add in a Transparent bar, the room and its count, the scenes as
    // Chips, the room's climate as three Small tiles, then every device in one Shadow box (Dock-Icon Accent Subtle while
    // on) and the one Primary action at the end.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label="Living room" largeTitle="Living room" largeTitleSubheading={`${livingRoom.length} devices · ${onCount} on`}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Home" }) }}
        trailing={[{ icon: "icon-plus-line", label: "Add device", onClick: addDevice }]} />}
    >
      <Stack gap="xl">
        {/* Figma's Scenes row pads Spacing/Padding/3XSmall above and below the Chips. */}
        <Box paddingY="3xs">
          <ChipGroup aria-label="Scene" value={scene} onValueChange={runScene} options={roomScenes} />
        </Box>
        <Stack direction="row" gap="sm" fillChildren>
          <MetricCard type="tile" size="sm" theme="shadow" label="Temp" value="24°C" icon="icon-thermometer-02-line" iconBackground="subtle" />
          <MetricCard type="tile" size="sm" theme="shadow" label="Humidity" value="52%" icon="icon-droplets-02-line" iconBackground="subtle" />
          <MetricCard type="tile" size="sm" theme="shadow" label="Air" value="Good" icon="icon-salad-leaf-line" iconBackground="subtle" />
        </Stack>
        <ListBox theme="shadow" as="section" aria-label="Devices in Living room">
          <List aria-label="Devices">
            {livingRoom.map((device) => (
              <ToggleListItem key={device.id} title={device.name} caption={power[device.id] ? device.onCaption : device.offCaption} toggleSize="lg"
                leading={<DockIcon size="md" icon={device.icon} theme={power[device.id] ? "accent" : "neutral"} background="subtle" />}
                checked={power[device.id]} onCheckedChange={(checked) => setPower((current) => ({ ...current, [device.id]: checked }))} />
            ))}
          </List>
        </ListBox>
        <Stack align="stretch">
          <Button size="lg" level="primary" onClick={addDevice}>Add device</Button>
        </Stack>
      </Stack>
    </AppShell>
  );
}
