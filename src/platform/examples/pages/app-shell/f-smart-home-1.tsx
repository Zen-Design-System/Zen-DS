/* App Shell examples · f-smart-home-1: built from Figma ◇ Master-Layout · Example (15902:109717), section
   "F · Smart home concept" (15991:10067): F1 · Home (15991:10116), F2 · Room (15991:10158), F3 · Speaker (15991:10200)
   and F4 · Robot vacuum (15991:10242). One house runs through F1–F12: Mai Anh's, whose living room holds the Philips
   ceiling light, the Daikin air conditioner, the Apple HomePod mini and the Xiaomi robot vacuum. Each phone is one
   Pattern/AppShell/Mobile · Top=Bar with a Transparent TopNavigation on Canvas/Default; the copy, numbers and component
   variants are the ones the Figma screens hold. */
import { useState } from "react";
import { AppShell } from "../../../../components/AppShell";
import { Avatar } from "../../../../components/Avatar";
import { BottomNavigation, type BottomNavigationItem } from "../../../../components/BottomNavigation";
import { Button, IconButton } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { ChipGroup } from "../../../../components/ChipGroup";
import { DockIcon } from "../../../../components/DockIcon";
import { Icon, type IconName } from "../../../../components/Icon";
import { Image } from "../../../../components/Image";
import { Box, Grid, Stack } from "../../../../components/Layout";
import { List, ListBox, ToggleListItem } from "../../../../components/ListItem";
import { MetricCard } from "../../../../components/MetricWidget";
import { ProgressBar } from "../../../../components/Progress";
import { SliderField } from "../../../../components/SliderField";
import { Text } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { ToggleButton } from "../../../../components/Toggle";
import { TopNavigation } from "../../../../components/TopNavigation";
import { platformMedia, type PlatformPhoto } from "../../../PlatformMedia";
import { PlatformPhone } from "../../../PlatformPhone";
import { people } from "../../data";
import type { ExampleDef } from "../../types";

// ——— Shared parts ——————————————————————————————————————————————————————————————————————————————————————————————————

/** Figma Picture: the device's cut-out photo, 129 × 108 with Corner-Radius/Large (Fill), on the card itself (no fill behind
 *  it in Figma, so frame={false}). The kitchen's smart plugs,
 *  which no Figma screen shows, keep their glyph on a Neutral/Pale tile of the same height. */
function DevicePicture({ photo, icon }: { photo?: PlatformPhoto; icon: IconName }) {
  if (photo) return <Image src={photo.src} alt="" ratio={129 / 108} frame={false} radius="lg" />;
  return (
    <Box surface="pale" radius="lg" height={108}>
      <Stack align="center" justify="center" height="fill">
        <Icon name={icon} size="3xl" tone="light" decorative />
      </Stack>
    </Box>
  );
}

/** Figma Status (F3, F4): the power Toggle-Button XLarge (an icon in its dot) and the battery as Display/3 with its
 *  zap icon, Gap/Medium apart, the value pinned to the end over its caption. */
function PowerStatus({ device, on, onPowerChange, battery, caption }: { device: string; on: boolean; onPowerChange: (on: boolean) => void; battery: string; caption: string }) {
  return (
    <Stack direction="row" gap="md" align="center">
      <ToggleButton size="xl" icon="icon-power-01-line" checked={on} onCheckedChange={onPowerChange} aria-label={`${device} power`} />
      <Stack gap="none" align="end" width="fill">
        <Stack direction="row" gap="2xs" align="center">
          <Icon name="icon-zap-line" size="xl" decorative />
          <Text as="p" textStyle="Display/3" tabularNumbers>{battery}</Text>
        </Stack>
        <Text textStyle="Body/Small/Regular" tone="base">{caption}</Text>
      </Stack>
    </Stack>
  );
}

// ——— F1 · Home (Top=Bar · Bottom=Tab-Bar) ——————————————————————————————————————————————————————————————————————————
const homeRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
  { id: "rooms", label: "Rooms", icon: "icon-grid-01-line", selectedIcon: "icon-grid-01-solid" },
  { id: "scenes", label: "Scenes", icon: "icon-stars-01-line", selectedIcon: "icon-stars-01-solid" },
  { id: "settings", label: "Settings", icon: "icon-settings-01-line", selectedIcon: "icon-settings-01-solid" },
];
const homeRooms = [
  { value: "living", label: "Living room" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bedroom", label: "Bedroom" },
];
/** `small`: the state in Caption/Regular, as Figma sets it for the longer states (HomePod mini, Robot vacuum). */
type HomeDevice = { id: string; brand: string; name: string; icon: IconName; photo?: PlatformPhoto; onState: string; offState: string; on: boolean; small?: boolean };
/** Living room is Figma F1's grid; the kitchen's smart plugs (F11) and the bedroom blinds (F10) fill the other chips. */
const homeDevices: Record<string, HomeDevice[]> = {
  living: [
    { id: "ceiling-light", brand: "Philips", name: "Ceiling light", icon: "icon-lightbulb-line", photo: platformMedia.devices.ceilingLight, onState: "70%", offState: "Off", on: true },
    { id: "air-conditioner", brand: "Daikin", name: "Air conditioner", icon: "icon-snowflake-01-line", photo: platformMedia.devices.airConditioner, onState: "Cool · 24°", offState: "Off", on: true },
    { id: "homepod", brand: "Apple", name: "HomePod mini", icon: "icon-speaker-01-line", photo: platformMedia.devices.smartSpeaker, onState: "Playing", offState: "Off", on: true, small: true },
    { id: "vacuum", brand: "Xiaomi", name: "Robot vacuum", icon: "icon-disc-line", photo: platformMedia.devices.robotVacuum, onState: "Cleaning · 38%", offState: "Docked · 38%", on: false, small: true },
  ],
  kitchen: [
    { id: "fridge", brand: "Smart plug", name: "Fridge", icon: "icon-zap-line", onState: "120 W now", offState: "Off", on: true },
    { id: "washer", brand: "Smart plug", name: "Washing machine", icon: "icon-zap-line", onState: "1,240 W now", offState: "Off", on: true, small: true },
  ],
  bedroom: [
    { id: "blinds", brand: "Somfy", name: "Bedroom blinds", icon: "icon-rows-01-line", photo: platformMedia.devices.rollerBlind, onState: "Open · 80%", offState: "Closed", on: true },
  ],
};
const allHomeDevices = Object.values(homeDevices).flat();
/** The house count in Figma's weather line; each switched device moves it by one. */
const HOUSE_ON = 4;

/** Figma device card: a Shadow Card (Spacing=Medium) with brand, name, the product photo, the state and a power button
 *  (Button/Icon-Main XSmall: Secondary while on, Tertiary while off). */
function DeviceCard({ device, on, onToggle }: { device: HomeDevice; on: boolean; onToggle: () => void }) {
  return (
    <Card theme="shadow" aria-label={`${device.brand} ${device.name}`}>
      <Stack gap="sm">
        <Stack gap="none">
          <Text textStyle="Caption/Regular" tone="base">{device.brand}</Text>
          <Text textStyle="Body/Base/Bold" truncate>{device.name}</Text>
        </Stack>
        <DevicePicture photo={device.photo} icon={device.icon} />
        <Stack direction="row" justify="between" align="center" gap="xs">
          <Text textStyle={device.small ? "Caption/Regular" : "Body/Small/Regular"} tone={on ? "strongest" : "base"} truncate>{on ? device.onState : device.offState}</Text>
          {/* zen-allow-secondary: a pressed toggle — Figma's power button is Button/Icon-Main Secondary while the device is on. */}
          <IconButton size="xs" level={on ? "secondary" : "tertiary"} icon="icon-power-01-line" aria-label={`${device.name} power`} aria-pressed={on} onClick={onToggle} />
        </Stack>
      </Stack>
    </Card>
  );
}

function SmartHomePhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [room, setRoom] = useState("living");
  const [unseen, setUnseen] = useState(true);
  const [power, setPower] = useState<Record<string, boolean>>(() => Object.fromEntries(allHomeDevices.map((device) => [device.id, device.on])));
  const onCount = HOUSE_ON + allHomeDevices.reduce((sum, device) => sum + (power[device.id] === device.on ? 0 : power[device.id] ? 1 : -1), 0);
  return (
    <PlatformPhone label="Smart home app" canvas="default">
      {/* Bar + Tab-Bar on Canvas/Default: the account photo and the alerts in a Transparent bar, the greeting, the
          weather and the house's climate as three Small tiles, a room picker, then the room's devices two-up. The
          bottom bar casts a shadow, so every box floats too (Shadow cards). */}
      <AppShell
        topNavigation={<TopNavigation type="transparent" aria-label="Home" largeTitle="Hi, Mai Anh" largeTitleCapline="Welcome home"
          leading={<Avatar size="md" theme="photo" src={people.chi.photo} alt="Mai Anh" />}
          trailing={[
            { icon: "icon-bell-01-line", label: unseen ? "Notifications, 1 new" : "Notifications", dot: unseen, onClick: () => { setUnseen(false); toast({ title: "Package delivered", children: "Front camera · Porch · 07:15" }); } },
            { icon: "icon-plus-line", label: "Add device", onClick: () => toast({ title: "Add a device", children: "Put it in pairing mode, then pick it from the list." }) },
          ]} />}
        bottomNavigation={<BottomNavigation aria-label="Smart home" value={root} onValueChange={setRoot} showLabels items={homeRoots} />}
      >
        <Stack gap="xl">
          <Stack direction="row" gap="xs" align="center">
            <Icon name="icon-cloud-sun-02-line" size="base" decorative />
            <Text textStyle="Body/Small/Regular" tone="base">23°C outside · light rain · {onCount} {onCount === 1 ? "device" : "devices"} on</Text>
          </Stack>
          <Stack direction="row" gap="sm" fillChildren>
            <MetricCard type="tile" size="sm" theme="shadow" label="Inside" value="24°C" icon="icon-thermometer-02-line" iconBackground="subtle" />
            <MetricCard type="tile" size="sm" theme="shadow" label="Humidity" value="52%" icon="icon-droplets-02-line" iconBackground="subtle" />
            <MetricCard type="tile" size="sm" theme="shadow" label="kWh today" value="6.2" icon="icon-zap-line" iconBackground="subtle" />
          </Stack>
          {/* Figma's Rooms row pads Spacing/Padding/3XSmall above and below the Chips. */}
          <Box paddingY="3xs">
            <ChipGroup aria-label="Room" value={room} onValueChange={setRoom} options={homeRooms} />
          </Box>
          <Grid columns={2} gap="sm">
            {homeDevices[room].map((device) => (
              <DeviceCard key={device.id} device={device} on={power[device.id]}
                onToggle={() => setPower((current) => ({ ...current, [device.id]: !current[device.id] }))} />
            ))}
          </Grid>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— F2 · Room (Top=Bar · Bottom=None) ———————————————————————————————————————————————————————————————————————————————
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

function RoomPhone() {
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
    <PlatformPhone label="Smart home app" canvas="default">
      {/* Bar, no bottom bar (a pushed screen): Back and Add in a Transparent bar, the room and its count, the scenes as
          Chips, the room's climate as three Small tiles, then every device in one Shadow box (Dock-Icon Accent Subtle
          while on) and the one Primary action at the end. */}
      <AppShell
        topNavigation={<TopNavigation type="transparent" aria-label="Living room" largeTitle="Living room" largeTitleSubheading={`${livingRoom.length} devices · ${onCount} on`}
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
    </PlatformPhone>
  );
}

// ——— F3 · Speaker (Top=Bar · Bottom=None) ———————————————————————————————————————————————————————————————————————————
const playlist = [
  { title: "Sunday Morning", artist: "Maroon 5", elapsed: "2:14", length: "4:06", progress: 54 },
  { title: "She Will Be Loved", artist: "Maroon 5", elapsed: "0:00", length: "4:17", progress: 0 },
  { title: "This Love", artist: "Maroon 5", elapsed: "0:00", length: "3:26", progress: 0 },
];

function SpeakerPhone() {
  const { toast } = useToast();
  const [on, setOn] = useState(true);
  const [volume, setVolume] = useState(75);
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [liked, setLiked] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const song = playlist[track];
  const skip = (step: number) => { setTrack((current) => (current + step + playlist.length) % playlist.length); setLiked(false); setPlaying(on); };
  return (
    <PlatformPhone label="Smart home app" canvas="default">
      {/* A device screen: Back and More in a Transparent bar, brand, name and room, the power Toggle-Button XLarge with
          the battery, the product photo, the volume as an Accent Slider/Field, then now playing in one Shadow card. */}
      <AppShell
        topNavigation={<TopNavigation type="transparent" aria-label="HomePod mini" largeTitle="HomePod mini" largeTitleCapline="Apple" largeTitleSubheading="Living room"
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Living room" }) }}
          trailing={[{ icon: "icon-dots-vertical-line", label: "More for HomePod mini", onClick: () => toast({ title: "HomePod mini", children: "Rename, move to another room or remove it." }) }]} />}
      >
        <Stack gap="xl">
          <PowerStatus device="HomePod mini" on={on} battery="98%" caption="Battery"
            onPowerChange={(next) => { setOn(next); setPlaying(next); toast({ title: next ? "HomePod mini is on" : "HomePod mini is off" }); }} />
          {/* Figma Device: the speaker's photo, 350 × 240 with Corner-Radius/3XLarge. */}
          <Image src={platformMedia.devices.smartSpeaker.src} alt="" ratio={350 / 240} frame={false} radius="3xl" />
          <SliderField label="Volume" theme="accent" value={volume} onValueChange={setVolume} formatValue={(value) => `${value}%`} />
          <Card theme="shadow" as="section" aria-label="Now playing">
            <Stack gap="md">
              <Stack direction="row" gap="sm" align="center">
                <DockIcon size="lg" icon="icon-music-note-01-line" theme="neutral" background="subtle" />
                <Stack gap="none" width="fill">
                  <Text textStyle="Body/Base/Bold" truncate>{song.title}</Text>
                  <Text textStyle="Body/Small/Regular" tone="base">{song.artist} · {playing ? song.elapsed : "Paused"} / {song.length}</Text>
                </Stack>
                <IconButton appearance="flat" level="primary" icon={liked ? "icon-heart-solid" : "icon-heart-line"} aria-label={`Like ${song.title}`} aria-pressed={liked} onClick={() => setLiked((value) => !value)} />
              </Stack>
              <ProgressBar value={song.progress} aria-label={`${song.title}, ${song.elapsed} of ${song.length}`} />
              <Stack direction="row" justify="between" align="center" gap="xs">
                <IconButton appearance="flat" level="primary" icon="icon-shuffle-line" aria-label="Shuffle" aria-pressed={shuffle}
                  onClick={() => { setShuffle((value) => !value); toast({ title: shuffle ? "Shuffle off" : "Shuffle on" }); }} />
                <IconButton size="lg" level="tertiary" icon="icon-skip-back-solid" aria-label="Previous track" onClick={() => skip(-1)} />
                <IconButton size="xl" level="primary" icon={playing ? "icon-pause-solid" : "icon-play-solid"} aria-label={playing ? "Pause" : "Play"}
                  onClick={() => { if (!on) { toast({ title: "HomePod mini is off", children: "Turn it on to play." }); return; } setPlaying((value) => !value); }} />
                <IconButton size="lg" level="tertiary" icon="icon-skip-forward-solid" aria-label="Next track" onClick={() => skip(1)} />
                <IconButton appearance="flat" level="primary" icon="icon-repeat-01-line" aria-label="Repeat" aria-pressed={repeat}
                  onClick={() => { setRepeat((value) => !value); toast({ title: repeat ? "Repeat off" : "Repeat on" }); }} />
              </Stack>
            </Stack>
          </Card>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— F4 · Robot vacuum (Top=Bar · Bottom=None) ———————————————————————————————————————————————————————————————————————
function RobotVacuumPhone() {
  const { toast } = useToast();
  const [on, setOn] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [quiet, setQuiet] = useState(true);
  const [suction, setSuction] = useState(70);
  const [daily, setDaily] = useState(true);
  const modes: { id: string; icon: IconName; label: string; pressed?: boolean; onClick: () => void }[] = [
    { id: "wifi", icon: "icon-wifi-line", label: "Connected", onClick: () => toast({ title: "Connected to home Wi-Fi", children: "Strong signal in Living room" }) },
    { id: "schedule", icon: "icon-alarm-clock-line", label: "Schedule", onClick: () => toast({ title: daily ? "Cleans daily at 10:00" : "The daily clean is off", children: "Living room, kitchen · 42 m²" }) },
    { id: "quiet", icon: "icon-moon-02-line", label: "Quiet", pressed: quiet, onClick: () => setQuiet((value) => !value) },
  ];
  const toggleCleaning = () => {
    const next = !cleaning;
    setCleaning(next);
    if (next) setOn(true);
    toast(next
      ? { title: "Cleaning Living room and kitchen", children: `Suction ${suction}%${quiet ? " · Quiet" : ""} · 42 m²` }
      : { title: "Going back to the dock", children: "It charges while docked." });
  };
  return (
    <PlatformPhone label="Smart home app" canvas="default">
      {/* A device screen: brand, name and its state, the power Toggle-Button XLarge with the battery and its warning, the
          vacuum photo, three mode buttons (the active one Secondary), the suction as a Neutral Slider/Field, the daily
          schedule as a Toggle row in one Shadow box, and Start cleaning, the one Primary action, at the end. */}
      <AppShell
        topNavigation={<TopNavigation type="transparent" aria-label="Robot vacuum" largeTitle="Robot vacuum" largeTitleCapline="Xiaomi"
          largeTitleSubheading={cleaning ? "Cleaning · Living room" : "Docked · Living room"}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Living room" }) }}
          trailing={[{ icon: "icon-dots-vertical-line", label: "More for Robot vacuum", onClick: () => toast({ title: "Robot vacuum", children: "Edit the map, rename or remove it." }) }]} />}
      >
        <Stack gap="xl">
          <PowerStatus device="Robot vacuum" on={on} battery="38%" caption="Needs charging soon"
            onPowerChange={(next) => { setOn(next); if (!next) setCleaning(false); }} />
          {/* Figma Device: the vacuum's photo, 350 × 240 with Corner-Radius/3XLarge, cropped about 1.18× in (its own file:
              F1 shows the whole picture). */}
          <Image src={platformMedia.devices.robotVacuumClose.src} alt="" ratio={350 / 240} frame={false} radius="3xl" />
          <Stack as="ul" direction="row" gap="sm" fillChildren aria-label="Modes">
            {modes.map((mode) => (
              <Stack as="li" key={mode.id} gap="xs" align="center">
                {/* zen-allow-no-tooltip: the mode's visible label sits right under the button (Figma Modes). */}
                {/* zen-allow-secondary: a pressed toggle — Figma's active mode (Quiet) is Button/Icon-Main Secondary. */}
                <IconButton size="lg" level={mode.pressed ? "secondary" : "tertiary"} icon={mode.icon} aria-label={mode.label} tooltip={false}
                  aria-pressed={mode.pressed} onClick={mode.onClick} />
                <Text as="span" textStyle="Caption/Medium" aria-hidden="true">{mode.label}</Text>
              </Stack>
            ))}
          </Stack>
          <SliderField label="Suction power" value={suction} onValueChange={setSuction} formatValue={(value) => `${value}%`} />
          <ListBox theme="shadow" as="section" aria-label="Schedule">
            <List aria-label="Schedule">
              <ToggleListItem title="Daily at 10:00" caption={"Living room, kitchen · 42\u00a0m²"} toggleSize="lg" checked={daily} onCheckedChange={setDaily}
                leading={<DockIcon size="md" icon="icon-calendar-line" theme="neutral" background="subtle" />} />
            </List>
          </ListBox>
          <Stack align="stretch">
            <Button size="lg" level="primary" onClick={toggleCleaning}>{cleaning ? "Stop cleaning" : "Start cleaning"}</Button>
          </Stack>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "F1 · Home — rooms and devices at a glance",
    description: "Greeting, weather and the house's state, then a room picker and the devices as a two-column grid of Shadow cards: name, brand, a product photo and a power button that stands out while the device is on. Default bottom navigation: Home, Rooms, Scenes, Settings. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. Fits: Smart home, IoT, Building apps.",
    render: () => <SmartHomePhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    topNavigation={<TopNavigation type="transparent" aria-label="Home" largeTitle="Hi, Mai Anh" largeTitleCapline="Welcome home"
      leading={<Avatar size="md" theme="photo" src={maiAnh.photo} alt="Mai Anh" />}
      trailing={[
        { icon: "icon-bell-01-line", label: "Notifications, 1 new", dot: true, onClick: openNotifications },
        { icon: "icon-plus-line", label: "Add device", onClick: addDevice },
      ]} />}
    bottomNavigation={<BottomNavigation aria-label="Smart home" value={root} onValueChange={setRoot} showLabels items={[
      { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
      { id: "rooms", label: "Rooms", icon: "icon-grid-01-line", selectedIcon: "icon-grid-01-solid" },
      { id: "scenes", label: "Scenes", icon: "icon-stars-01-line", selectedIcon: "icon-stars-01-solid" },
      { id: "settings", label: "Settings", icon: "icon-settings-01-line", selectedIcon: "icon-settings-01-solid" },
    ]} />}
  >
    <Stack gap="xl">
      <Stack direction="row" gap="xs" align="center">
        <Icon name="icon-cloud-sun-02-line" size="base" decorative />
        <Text textStyle="Body/Small/Regular" tone="base">23°C outside · light rain · {onCount} devices on</Text>
      </Stack>
      <Stack direction="row" gap="sm" fillChildren>
        <MetricCard type="tile" size="sm" theme="shadow" label="Inside" value="24°C" icon="icon-thermometer-02-line" iconBackground="subtle" />
        <MetricCard type="tile" size="sm" theme="shadow" label="Humidity" value="52%" icon="icon-droplets-02-line" iconBackground="subtle" />
        <MetricCard type="tile" size="sm" theme="shadow" label="kWh today" value="6.2" icon="icon-zap-line" iconBackground="subtle" />
      </Stack>
      <Box paddingY="3xs">
        <ChipGroup aria-label="Room" value={room} onValueChange={setRoom} options={[
          { value: "living", label: "Living room" }, { value: "kitchen", label: "Kitchen" }, { value: "bedroom", label: "Bedroom" },
        ]} />
      </Box>
      <Grid columns={2} gap="sm">
        <Card theme="shadow" aria-label="Philips Ceiling light">
          <Stack gap="sm">
            <Stack gap="none">
              <Text textStyle="Caption/Regular" tone="base">Philips</Text>
              <Text textStyle="Body/Base/Bold" truncate>Ceiling light</Text>
            </Stack>
            <Image src={ceilingLight.photo} alt="" ratio={129 / 108} frame={false} radius="lg" />
            <Stack direction="row" justify="between" align="center" gap="xs">
              <Text textStyle="Body/Small/Regular" truncate>70%</Text>
              {/* zen-allow-secondary: a pressed toggle, Secondary while the device is on. */}
              <IconButton size="xs" level="secondary" icon="icon-power-01-line" aria-label="Ceiling light power" aria-pressed onClick={togglePower} />
            </Stack>
          </Stack>
        </Card>
        …Daikin Air conditioner · Apple HomePod mini · Xiaomi Robot vacuum (level="tertiary" while off)
      </Grid>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "F2 · Room — scenes and every device in one list",
    description: "Back and the room name with its device count, quick scene Chips, the room's climate as three small Shadow tiles, then every device in one Shadow box: Dock-Icon (Accent Subtle when on), state and a Toggle-Button. One Primary action adds a device. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: Smart home, Room control.",
    render: () => <RoomPhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    topNavigation={<TopNavigation type="transparent" aria-label="Living room" largeTitle="Living room" largeTitleSubheading={\`6 devices · \${onCount} on\`}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
      trailing={[{ icon: "icon-plus-line", label: "Add device", onClick: addDevice }]} />}
  >
    <Stack gap="xl">
      <Box paddingY="3xs">
        <ChipGroup aria-label="Scene" value={scene} onValueChange={runScene} options={[
          { value: "relax", label: "Relax" }, { value: "movie", label: "Movie" },
          { value: "reading", label: "Reading" }, { value: "all-off", label: "All off" },
        ]} />
      </Box>
      <Stack direction="row" gap="sm" fillChildren>
        <MetricCard type="tile" size="sm" theme="shadow" label="Temp" value="24°C" icon="icon-thermometer-02-line" iconBackground="subtle" />
        <MetricCard type="tile" size="sm" theme="shadow" label="Humidity" value="52%" icon="icon-droplets-02-line" iconBackground="subtle" />
        <MetricCard type="tile" size="sm" theme="shadow" label="Air" value="Good" icon="icon-salad-leaf-line" iconBackground="subtle" />
      </Stack>
      <ListBox theme="shadow" as="section" aria-label="Devices in Living room">
        <List aria-label="Devices">
          <ToggleListItem title="HomePod mini" caption="Playing · 75%" toggleSize="lg" checked={power.homepod} onCheckedChange={setHomepod}
            leading={<DockIcon size="md" icon="icon-speaker-01-line" theme="accent" background="subtle" />} />
          <ToggleListItem title="Floor lamp" caption="Off" toggleSize="lg" checked={power.floorLamp} onCheckedChange={setFloorLamp}
            leading={<DockIcon size="md" icon="icon-lightbulb-line" theme="neutral" background="subtle" />} />
          …Ceiling light · Air conditioner · Samsung TV · Blinds
        </List>
      </ListBox>
      <Stack align="stretch">
        <Button size="lg" level="primary" onClick={addDevice}>Add device</Button>
      </Stack>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "F3 · Speaker — volume, now playing",
    description: "Brand caption and device name, the power Toggle-Button with the battery as a Display value, a large product photo, a volume Slider, the current track and playback controls. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: Speakers, Media.",
    render: () => <SpeakerPhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    topNavigation={<TopNavigation type="transparent" aria-label="HomePod mini" largeTitle="HomePod mini" largeTitleCapline="Apple" largeTitleSubheading="Living room"
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
      trailing={[{ icon: "icon-dots-vertical-line", label: "More for HomePod mini", onClick: more }]} />}
  >
    <Stack gap="xl">
      <Stack direction="row" gap="md" align="center">
        <ToggleButton size="xl" icon="icon-power-01-line" checked={on} onCheckedChange={setOn} aria-label="HomePod mini power" />
        <Stack gap="none" align="end" width="fill">
          <Stack direction="row" gap="2xs" align="center">
            <Icon name="icon-zap-line" size="xl" decorative />
            <Text as="p" textStyle="Display/3" tabularNumbers>98%</Text>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">Battery</Text>
        </Stack>
      </Stack>
      <Image src={homepod.photo} alt="" ratio={350 / 240} frame={false} radius="3xl" />
      <SliderField label="Volume" theme="accent" value={volume} onValueChange={setVolume} formatValue={(value) => \`\${value}%\`} />
      <Card theme="shadow" as="section" aria-label="Now playing">
        <Stack gap="md">
          <Stack direction="row" gap="sm" align="center">
            <DockIcon size="lg" icon="icon-music-note-01-line" theme="neutral" background="subtle" />
            <Stack gap="none" width="fill">
              <Text textStyle="Body/Base/Bold" truncate>Sunday Morning</Text>
              <Text textStyle="Body/Small/Regular" tone="base">Maroon 5 · 2:14 / 4:06</Text>
            </Stack>
            <IconButton appearance="flat" level="primary" icon="icon-heart-line" aria-label="Like Sunday Morning" aria-pressed={liked} onClick={toggleLike} />
          </Stack>
          <ProgressBar value={54} aria-label="Sunday Morning, 2:14 of 4:06" />
          <Stack direction="row" justify="between" align="center" gap="xs">
            <IconButton appearance="flat" level="primary" icon="icon-shuffle-line" aria-label="Shuffle" aria-pressed={shuffle} onClick={toggleShuffle} />
            <IconButton size="lg" level="tertiary" icon="icon-skip-back-solid" aria-label="Previous track" onClick={previous} />
            <IconButton size="xl" level="primary" icon="icon-pause-solid" aria-label="Pause" onClick={pause} />
            <IconButton size="lg" level="tertiary" icon="icon-skip-forward-solid" aria-label="Next track" onClick={next} />
            <IconButton appearance="flat" level="primary" icon="icon-repeat-01-line" aria-label="Repeat" aria-pressed={repeat} onClick={toggleRepeat} />
          </Stack>
        </Stack>
      </Card>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "F4 · Robot vacuum — power, modes, map",
    description: "Battery and its warning, the vacuum photo, three mode buttons (Wi-Fi, schedule, quiet) as IconButtons with the active one standing out, a suction Slider, the daily schedule as a Toggle row and Start cleaning. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: Robot vacuum, Appliances.",
    render: () => <RobotVacuumPhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    topNavigation={<TopNavigation type="transparent" aria-label="Robot vacuum" largeTitle="Robot vacuum" largeTitleCapline="Xiaomi"
      largeTitleSubheading={cleaning ? "Cleaning · Living room" : "Docked · Living room"}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
      trailing={[{ icon: "icon-dots-vertical-line", label: "More for Robot vacuum", onClick: more }]} />}
  >
    <Stack gap="xl">
      <Stack direction="row" gap="md" align="center">
        <ToggleButton size="xl" icon="icon-power-01-line" checked={on} onCheckedChange={setOn} aria-label="Robot vacuum power" />
        <Stack gap="none" align="end" width="fill">
          <Stack direction="row" gap="2xs" align="center">
            <Icon name="icon-zap-line" size="xl" decorative />
            <Text as="p" textStyle="Display/3" tabularNumbers>38%</Text>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">Needs charging soon</Text>
        </Stack>
      </Stack>
      <Image src={vacuum.photo} alt="" ratio={350 / 240} frame={false} radius="3xl" />
      <Stack as="ul" direction="row" gap="sm" fillChildren aria-label="Modes">
        <Stack as="li" gap="xs" align="center">
          {/* zen-allow-no-tooltip: the mode's visible label sits right under the button. */}
          <IconButton size="lg" level="tertiary" icon="icon-wifi-line" aria-label="Connected" tooltip={false} onClick={showWifi} />
          <Text as="span" textStyle="Caption/Medium" aria-hidden="true">Connected</Text>
        </Stack>
        …Schedule (icon-alarm-clock-line) · Quiet (icon-moon-02-line: level="secondary" and aria-pressed while on)
      </Stack>
      <SliderField label="Suction power" value={suction} onValueChange={setSuction} formatValue={(value) => \`\${value}%\`} />
      <ListBox theme="shadow" as="section" aria-label="Schedule">
        <List aria-label="Schedule">
          <ToggleListItem title="Daily at 10:00" caption="Living room, kitchen · 42 m²" toggleSize="lg" checked={daily} onCheckedChange={setDaily}
            leading={<DockIcon size="md" icon="icon-calendar-line" theme="neutral" background="subtle" />} />
        </List>
      </ListBox>
      <Stack align="stretch">
        <Button size="lg" level="primary" onClick={startCleaning}>Start cleaning</Button>
      </Stack>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
];
