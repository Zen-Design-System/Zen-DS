import { useState, type RefObject } from "react";
import {
  AppShell, Button, DockIcon, Icon, IconButton, Image, List, ListBox, SliderField, Stack, Text, ToggleButton, ToggleListItem, TopNavigation, useToast,
  type IconName,
} from "@zen-ds/react";
import { photos } from "../../data";

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

/** F4 · Robot vacuum (Figma 15991:10242): the Xiaomi robot vacuum in Mai Anh's living room, a device screen of her
 *  smart-home app. Pattern/AppShell/Mobile · Top=Bar · Bottom=None on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function RobotVacuum({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
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
    // A device screen: brand, name and its state, the power Toggle-Button XLarge with the battery and its warning, the
    // vacuum photo, three mode buttons (the active one Secondary), the suction as a Neutral Slider/Field, the daily
    // schedule as a Toggle row in one Shadow box, and Start cleaning, the one Primary action, at the end.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label="Robot vacuum" largeTitle="Robot vacuum" largeTitleCapline="Xiaomi"
        largeTitleSubheading={cleaning ? "Cleaning · Living room" : "Docked · Living room"}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Living room" }) }}
        trailing={[{ icon: "icon-dots-vertical-line", label: "More for Robot vacuum", onClick: () => toast({ title: "Robot vacuum", children: "Edit the map, rename or remove it." }) }]} />}
    >
      <Stack gap="xl">
        <PowerStatus device="Robot vacuum" on={on} battery="38%" caption="Needs charging soon"
          onPowerChange={(next) => { setOn(next); if (!next) setCleaning(false); }} />
        {/* Figma Device: the vacuum's photo, 350 × 240 with Corner-Radius/3XLarge, cropped about 1.18× in (its own file:
            F1 shows the whole picture). */}
        <Image src={photos.devices.robotVacuumClose.src} alt="" ratio={350 / 240} frame={false} radius="3xl" />
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
            <ToggleListItem title="Daily at 10:00" caption={"Living room, kitchen · 42 m²"} toggleSize="lg" checked={daily} onCheckedChange={setDaily}
              leading={<DockIcon size="md" icon="icon-calendar-line" theme="neutral" background="subtle" />} />
          </List>
        </ListBox>
        <Stack align="stretch">
          <Button size="lg" level="primary" onClick={toggleCleaning}>{cleaning ? "Stop cleaning" : "Start cleaning"}</Button>
        </Stack>
      </Stack>
    </AppShell>
  );
}
