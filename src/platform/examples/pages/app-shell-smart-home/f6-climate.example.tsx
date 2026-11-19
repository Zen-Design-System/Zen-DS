import { useId, useState, type RefObject } from "react";
import {
  AppShell, Card, DockIcon, Icon, IconButton, List, ListBox, MetricCard, Segmented, SliderField, Stack, Text, ToggleButton, ToggleListItem, TopNavigation, useToast,
  type IconName,
} from "@zen-ds/react";

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

const airConditioner: Device = { brand: "Daikin", name: "Air conditioner", room: "Living room" };
type ClimateMode = "cool" | "heat" | "fan" | "dry";
const climateModes: { id: ClimateMode; label: string; doing: string }[] = [
  { id: "cool", label: "Cool", doing: "cooling" },
  { id: "heat", label: "Heat", doing: "heating" },
  { id: "fan", label: "Fan", doing: "fan only" },
  { id: "dry", label: "Dry", doing: "drying" },
];
const TARGET_MIN = 16;
const TARGET_MAX = 30;

/** F6 · Climate (Figma 15991:10285): the Daikin air conditioner in Mai Anh's living room, a device screen of her
 *  smart-home app. Pattern/AppShell/Mobile · Top=Bar · Bottom=None on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function Climate({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [on, setOn] = useState(true);
  const [target, setTarget] = useState(24);
  const [mode, setMode] = useState<ClimateMode>("cool");
  const [fan, setFan] = useState(3);
  const [fanAuto, setFanAuto] = useState(true);
  const [sleep, setSleep] = useState(true);
  const targetId = useId();
  const modeLabel = climateModes.find((item) => item.id === mode);
  const changeTarget = (step: number) => { setTarget((value) => Math.min(TARGET_MAX, Math.max(TARGET_MIN, value + step))); setOn(true); };
  return (
    // Figma Top-Navigation/Mobile Type=Transparent: Back and More on the Canvas, and the Expand-Heading (the brand as
    // Capline over the device's name, its room as Subheading); then the status and the device's sections 32 apart.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label={airConditioner.name} largeTitle={airConditioner.name} largeTitleCapline={airConditioner.brand} largeTitleSubheading={airConditioner.room}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: `Back to ${airConditioner.room}` }) }}
        trailing={[{ icon: "icon-dots-vertical-line", label: `More for ${airConditioner.name}`, onClick: () => toast({ title: airConditioner.name, children: "Rename it, move it to another room or remove it." }) }]} />}
    >
      <Stack gap="xl">
        <DeviceStatus device={airConditioner} on={on} onPowerChange={(next) => { setOn(next); toast({ title: next ? "Air conditioner on" : "Air conditioner off", children: next ? `${modeLabel?.label} · ${target}°` : "Living room" }); }}
          icon="icon-thermometer-02-line" value="26°C" caption={on ? `Inside now · ${modeLabel?.doing}` : "Inside now · off"} />
        {/* The target temperature first: one Display-Extra value between − and + (Button/Icon-Main Small Tertiary). */}
        <Card theme="shadow" as="section" aria-labelledby={targetId}>
          <Stack direction="row" align="center" justify="between" gap="sm">
            <IconButton size="sm" level="tertiary" icon="icon-minus-line" aria-label="Lower the target temperature" disabled={target <= TARGET_MIN} onClick={() => changeTarget(-1)} />
            <Stack gap="none" align="center">
              <Text as="p" textStyle="Display-Extra/2" tabularNumbers aria-live="polite">{target}°</Text>
              <Text id={targetId} textStyle="Body/Small/Regular" tone="base">Target temperature</Text>
            </Stack>
            <IconButton size="sm" level="tertiary" icon="icon-plus-line" aria-label="Raise the target temperature" disabled={target >= TARGET_MAX} onClick={() => changeTarget(1)} />
          </Stack>
        </Card>
        <Segmented fullWidth aria-label="Mode" value={mode} options={climateModes.map(({ id, label }) => ({ id, label }))}
          onValueChange={(value) => { setMode(value as ClimateMode); setOn(true); }} />
        <SliderField label="Fan speed" theme="accent" min={0} max={5} value={fan} formatValue={(value) => (fanAuto ? `Auto · ${value}` : `Speed ${value}`)}
          onValueChange={(value) => { setFan(value); setFanAuto(false); }} />
        <Stack direction="row" gap="sm" fillChildren>
          <MetricCard type="tile" spacing="md" label="Humidity" value="52%" icon="icon-droplets-02-line" iconBackground="subtle" />
          <MetricCard type="tile" spacing="md" label="Air quality" value="Good" icon="icon-salad-leaf-line" iconBackground="subtle" />
        </Stack>
        <ListBox theme="shadow">
          <List aria-label="Schedule">
            <ToggleListItem toggleSize="lg" title="Sleep mode" caption="23:00 – 06:30 · 27°C" checked={sleep} onCheckedChange={setSleep}
              leading={<DockIcon icon="icon-moon-02-line" theme="neutral" background="subtle" />} />
          </List>
        </ListBox>
      </Stack>
    </AppShell>
  );
}
