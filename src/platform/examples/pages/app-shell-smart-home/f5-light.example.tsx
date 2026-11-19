import { useState, type RefObject } from "react";
import {
  AppShell, ChipGroup, DockIcon, Icon, Image, List, ListBox, Segmented, SliderField, Stack, Text, ToggleButton, ToggleListItem, TopNavigation, useToast,
  type IconName,
} from "@zen-ds/react";
import { photos } from "../../data";

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

const ceilingLight: Device = { brand: "Philips Hue", name: "Ceiling light", room: "Living room" };
type Warmth = "warm" | "neutral" | "cool";
const warmths: { id: Warmth; label: string }[] = [{ id: "warm", label: "Warm" }, { id: "neutral", label: "Neutral" }, { id: "cool", label: "Cool" }];
const lightScenes: { id: string; label: string; brightness: number; warmth: Warmth }[] = [
  { id: "reading", label: "Reading", brightness: 100, warmth: "neutral" },
  { id: "relax", label: "Relax", brightness: 70, warmth: "warm" },
  { id: "night", label: "Night", brightness: 20, warmth: "warm" },
];

/** F5 · Light (Figma 15991:10243): the Philips ceiling light in Mai Anh's living room, a device screen of her smart-home
 *  app. Pattern/AppShell/Mobile · Top=Bar · Bottom=None on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function CeilingLight({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [on, setOn] = useState(true);
  const [brightness, setBrightness] = useState(70);
  const [warmth, setWarmth] = useState<Warmth>("warm");
  const [scene, setScene] = useState<string | undefined>("relax");
  const [sunset, setSunset] = useState(true);
  const warmthLabel = warmths.find((item) => item.id === warmth)?.label.toLowerCase();
  const applyScene = (id: string) => {
    const item = lightScenes.find((entry) => entry.id === id);
    if (!item) return;
    setScene(item.id); setBrightness(item.brightness); setWarmth(item.warmth); setOn(true);
    toast({ title: `${item.label} scene`, children: `${item.brightness}% · ${item.warmth} white` });
  };
  return (
    // Figma Top-Navigation/Mobile Type=Transparent: Back and More on the Canvas, and the Expand-Heading (the brand as
    // Capline over the device's name, its room as Subheading); then the status and the device's sections 32 apart.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label={ceilingLight.name} largeTitle={ceilingLight.name} largeTitleCapline={ceilingLight.brand} largeTitleSubheading={ceilingLight.room}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: `Back to ${ceilingLight.room}` }) }}
        trailing={[{ icon: "icon-dots-vertical-line", label: `More for ${ceilingLight.name}`, onClick: () => toast({ title: ceilingLight.name, children: "Rename it, move it to another room or remove it." }) }]} />}
    >
      <Stack gap="xl">
        <DeviceStatus device={ceilingLight} on={on} onPowerChange={(next) => { setOn(next); toast({ title: next ? "Ceiling light on" : "Ceiling light off", children: next ? `${brightness}% · ${warmthLabel} white` : "Living room" }); }}
          icon="icon-sun-line" value={on ? `${brightness}%` : "Off"} caption={on ? `Brightness · ${warmthLabel} white` : "Turned off from the app"} />
        {/* The lamp photo leads (Figma Device, Corner-Radius/3XLarge), then the controls in the order they are used. */}
        <Image src={photos.devices.ceilingLight.src} alt={photos.devices.ceilingLight.alt} ratio={350 / 240} frame={false} radius="3xl" />
        <SliderField label="Brightness" theme="accent" min={1} value={brightness} formatValue={(value) => `${value}%`}
          onValueChange={(value) => { setBrightness(value); setScene(undefined); setOn(true); }} />
        <Stack gap="xs">
          <Text textStyle="Body/Base/Medium">Colour temperature</Text>
          <Segmented fullWidth aria-label="Colour temperature" value={warmth} options={warmths}
            onValueChange={(value) => { setWarmth(value as Warmth); setScene(undefined); }} />
        </Stack>
        <ChipGroup aria-label="Scenes" value={scene ?? null} onValueChange={applyScene}
          options={lightScenes.map((item) => ({ value: item.id, label: item.label }))} />
        <ListBox theme="shadow">
          <List aria-label="Schedule">
            <ToggleListItem toggleSize="lg" title="Turn on at sunset" caption="Today at 17:45" checked={sunset} onCheckedChange={setSunset}
              leading={<DockIcon icon="icon-sunset-line" theme="neutral" background="subtle" />} />
          </List>
        </ListBox>
      </Stack>
    </AppShell>
  );
}
