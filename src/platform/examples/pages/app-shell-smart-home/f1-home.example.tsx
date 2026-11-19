import { useState, type RefObject } from "react";
import {
  AppShell, Avatar, BottomNavigation, Box, Card, ChipGroup, Grid, Icon, IconButton, Image, MetricCard, Stack, Text, TopNavigation, useToast,
  type BottomNavigationItem, type IconName,
} from "@zen-ds/react";
import { people, photos, type Photo } from "../../data";

/** Figma Picture: the device's cut-out photo, 129 × 108 with Corner-Radius/Large (Fill), on the card itself (no fill behind
 *  it in Figma, so frame={false}). The kitchen's smart plugs, which no Figma screen shows, keep their glyph on a
 *  Neutral/Pale tile of the same height. */
function DevicePicture({ photo, icon }: { photo?: Photo; icon: IconName }) {
  if (photo) return <Image src={photo.src} alt="" ratio={129 / 108} frame={false} radius="lg" />;
  return (
    <Box surface="pale" radius="lg" height={108}>
      <Stack align="center" justify="center" height="fill">
        <Icon name={icon} size="3xl" tone="light" decorative />
      </Stack>
    </Box>
  );
}

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
type HomeDevice = { id: string; brand: string; name: string; icon: IconName; photo?: Photo; onState: string; offState: string; on: boolean; small?: boolean };
/** Living room is Figma F1's grid; the kitchen's smart plugs (F11) and the bedroom blinds (F10) fill the other chips. */
const homeDevices: Record<string, HomeDevice[]> = {
  living: [
    { id: "ceiling-light", brand: "Philips", name: "Ceiling light", icon: "icon-lightbulb-line", photo: photos.devices.ceilingLight, onState: "70%", offState: "Off", on: true },
    { id: "air-conditioner", brand: "Daikin", name: "Air conditioner", icon: "icon-snowflake-01-line", photo: photos.devices.airConditioner, onState: "Cool · 24°", offState: "Off", on: true },
    { id: "homepod", brand: "Apple", name: "HomePod mini", icon: "icon-speaker-01-line", photo: photos.devices.smartSpeaker, onState: "Playing", offState: "Off", on: true, small: true },
    { id: "vacuum", brand: "Xiaomi", name: "Robot vacuum", icon: "icon-disc-line", photo: photos.devices.robotVacuum, onState: "Cleaning · 38%", offState: "Docked · 38%", on: false, small: true },
  ],
  kitchen: [
    { id: "fridge", brand: "Smart plug", name: "Fridge", icon: "icon-zap-line", onState: "120 W now", offState: "Off", on: true },
    { id: "washer", brand: "Smart plug", name: "Washing machine", icon: "icon-zap-line", onState: "1,240 W now", offState: "Off", on: true, small: true },
  ],
  bedroom: [
    { id: "blinds", brand: "Somfy", name: "Bedroom blinds", icon: "icon-rows-01-line", photo: photos.devices.rollerBlind, onState: "Open · 80%", offState: "Closed", on: true },
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
          <Text textStyle="Caption/Regular" tone="light">{device.brand}</Text>
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

/** F1 · Home (Figma 15991:10116), the root of Mai Anh's smart-home app: the house at a glance, then a room's devices.
 *  Pattern/AppShell/Mobile · Top=Bar · Bottom=Tab-Bar on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function SmartHome({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [room, setRoom] = useState("living");
  const [unseen, setUnseen] = useState(true);
  const [power, setPower] = useState<Record<string, boolean>>(() => Object.fromEntries(allHomeDevices.map((device) => [device.id, device.on])));
  const onCount = HOUSE_ON + allHomeDevices.reduce((sum, device) => sum + (power[device.id] === device.on ? 0 : power[device.id] ? 1 : -1), 0);
  return (
    // Bar + Tab-Bar on Canvas/Default: the account photo and the alerts in a Transparent bar, the greeting, the weather
    // and the house's climate as three Small tiles, a room picker, then the room's devices two-up. The bottom bar casts
    // a shadow, so every box floats too (Shadow cards).
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label="Home" largeTitle="Hi, Mai Anh" largeTitleCapline="Welcome home"
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
  );
}
