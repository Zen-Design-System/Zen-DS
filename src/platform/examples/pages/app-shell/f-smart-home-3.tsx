/* App Shell examples · f-smart-home-3: built from Figma ◇ Master-Layout · Example (15902:109717), section
   "F · Smart home concept (all device types)" (15991:10067): F9 · TV (15991:10411), F10 · Blinds (15991:10453),
   F11 · Energy (15991:10495) and F12 · Scenes (15991:10537). One smart-home app across F1–F12 (Mai Anh's home: Living
   room, Bedroom, Hallway, Porch, Entrance); each phone is one Pattern/AppShell/Mobile · Phone · Top=Bar on Canvas/Default
   with a Transparent Top-Navigation, and the copy, numbers and component variants are the ones the Figma screens hold. */
import { useId, useState } from "react";
import { AppShell } from "../../../../components/AppShell";
import { BottomNavigation, type BottomNavigationItem } from "../../../../components/BottomNavigation";
import { Button, IconButton } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { ChartCard, LineChart } from "../../../../components/Chart";
import { DockIcon, type DockIconTheme } from "../../../../components/DockIcon";
import { Icon, type IconName } from "../../../../components/Icon";
import { Image } from "../../../../components/Image";
import { Box, Grid, Stack } from "../../../../components/Layout";
import { List, ListBox, ToggleListItem } from "../../../../components/ListItem";
import { SliderField } from "../../../../components/SliderField";
import { Heading, Text } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { ToggleButton } from "../../../../components/Toggle";
import { TopNavigation } from "../../../../components/TopNavigation";
import { platformMedia } from "../../../PlatformMedia";
import { PlatformPhone } from "../../../PlatformPhone";
import type { ExampleDef } from "../../types";

// ——— F9 · TV, remote on the phone (Top=Bar · Bottom=None) ———————————————————————————————————————————————————————
const tvInputs = ["HDMI 1", "HDMI 2", "TV"];
const tvApps: { id: string; label: string; icon: IconName }[] = [
  { id: "netflix", label: "Netflix", icon: "icon-film-01-line" },
  { id: "youtube", label: "YouTube", icon: "icon-play-solid" },
  { id: "spotify", label: "Spotify", icon: "icon-music-note-01-line" },
  { id: "live-tv", label: "Live TV", icon: "icon-tv-02-line" },
];

/** Figma VOL / CH: a 56-wide Surface capsule (Corner-Radius/Rounded) with two Large Icon-Flat buttons and its Caption/Bold name. */
function RockerControl({ name, upLabel, downLabel, upIcon, downIcon, disabled, onStep }: { name: string; upLabel: string; downLabel: string; upIcon: IconName; downIcon: IconName; disabled: boolean; onStep: (step: 1 | -1) => void }) {
  return (
    <Box surface="surface" radius="full" width={56}>
      <Stack gap="xs" align="center">
        <IconButton appearance="flat" level="primary" size="lg" icon={upIcon} aria-label={upLabel} disabled={disabled} onClick={() => onStep(1)} />
        <Text as="span" textStyle="Caption/Bold" tone="base" aria-hidden="true">{name}</Text>
        <IconButton appearance="flat" level="primary" size="lg" icon={downIcon} aria-label={downLabel} disabled={disabled} onClick={() => onStep(-1)} />
      </Stack>
    </Box>
  );
}

function TvRemotePhone() {
  const { toast } = useToast();
  const [on, setOn] = useState(true);
  const [volume, setVolume] = useState(18);
  const [channel, setChannel] = useState(7);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [input, setInput] = useState(0);
  const appsId = useId();
  const send = (title: string) => toast({ title, children: "Sent to Living room TV" });
  return (
    <PlatformPhone label="Smart home app" canvas="default">
      {/* Bar + None on Canvas/Default: Back and More over the device heading (brand, name, input), then the power switch
          with what plays, the VOL rocker · round D-pad · CH rocker, the playback row (Tertiary Icon-Main, Play one size
          up) and the apps. */}
      <AppShell
        topNavigation={<TopNavigation type="transparent" aria-label="Living room TV" topBar
          largeTitle="Living room TV" largeTitleCapline="Samsung" largeTitleSubheading={tvInputs[input]}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Living room", children: "6 devices · 4 on" }) }}
          trailing={[{ icon: "icon-dots-vertical-line", label: "More for Living room TV", onClick: () => toast({ title: "Living room TV", children: "Rename, move to another room or remove it." }) }]} />}
      >
        <Stack direction="row" gap="md" align="center">
          <ToggleButton size="xl" icon="icon-power-01-line" aria-label="Power" checked={on}
            onCheckedChange={(next) => { setOn(next); toast({ title: next ? "Living room TV on" : "Living room TV off", children: next ? `${tvInputs[input]} · Netflix` : "Standby until you turn it on." }); }} />
          <Stack gap="none" align="end" width="fill">
            <Text as="p" textStyle="Display/3">{on ? "Netflix" : "Standby"}</Text>
            <Text textStyle="Body/Small/Regular" tone="base" aria-live="polite">{on ? `Volume ${muted ? "muted" : volume} · channel ${channel}` : "Turn it on to use the remote"}</Text>
          </Stack>
        </Stack>
        <Stack direction="row" justify="between" align="center" gap="none">
          <RockerControl name="VOL" upLabel="Volume up" downLabel="Volume down" upIcon="icon-plus-line" downIcon="icon-minus-line" disabled={!on}
            onStep={(step) => { setMuted(false); setVolume((value) => Math.min(100, Math.max(0, value + step))); }} />
          {/* Figma D-Pad: a 200 Surface circle, Large Icon-Flat arrows 16 apart round a Large Primary Select. */}
          <Box surface="surface" radius="full" width={200} height={200}>
            <Stack gap="md" align="center" justify="center" height="fill">
              <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-up-line" aria-label="Up" disabled={!on} onClick={() => send("Up")} />
              <Stack direction="row" gap="none" align="center" justify="center">
                <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-left-line-medium" aria-label="Left" disabled={!on} onClick={() => send("Left")} />
                <Button level="primary" size="lg" disabled={!on} onClick={() => send("Select")}>Select</Button>
                <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-right-line-medium" aria-label="Right" disabled={!on} onClick={() => send("Right")} />
              </Stack>
              <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-down-line" aria-label="Down" disabled={!on} onClick={() => send("Down")} />
            </Stack>
          </Box>
          <RockerControl name="CH" upLabel="Channel up" downLabel="Channel down" upIcon="icon-chevron-up-line" downIcon="icon-chevron-down-line" disabled={!on}
            onStep={(step) => setChannel((value) => Math.max(1, value + step))} />
        </Stack>
        <Stack direction="row" justify="between" align="center" gap="none">
          <IconButton level="tertiary" size="lg" icon={muted ? "icon-volume-x-line" : "icon-volume-min-line"} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted} disabled={!on} onClick={() => setMuted((value) => !value)} />
          <IconButton level="tertiary" size="lg" icon="icon-skip-back-solid" aria-label="Previous" disabled={!on} onClick={() => send("Previous")} />
          <IconButton level="tertiary" size="xl" icon={playing ? "icon-pause-solid" : "icon-play-solid"} aria-label={playing ? "Pause" : "Play"} disabled={!on} onClick={() => setPlaying((value) => !value)} />
          <IconButton level="tertiary" size="lg" icon="icon-skip-forward-solid" aria-label="Next" disabled={!on} onClick={() => send("Next")} />
          <IconButton level="tertiary" size="lg" icon="icon-tv-02-line" aria-label="Change input" disabled={!on}
            onClick={() => { const next = (input + 1) % tvInputs.length; setInput(next); toast({ title: `Input: ${tvInputs[next]}` }); }} />
        </Stack>
        <Card as="section" aria-labelledby={appsId}>
          <Stack gap="md">
            <Heading level={2} id={appsId} textStyle="Body/Base/Bold">Apps</Heading>
            <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-labelledby={appsId}>
              {tvApps.map((app) => (
                <Stack as="li" key={app.id} gap="xs" align="center" width={64}>
                  <DockIcon size="lg" icon={app.icon} theme="neutral" background="subtle" />
                  <Text as="span" textStyle="Caption/Medium">{app.label}</Text>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Card>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— F10 · Blinds, open by percent (Top=Bar · Bottom=None) ———————————————————————————————————————————————————————
function blindsStatus(level: number, sunrise: boolean, sunset: boolean) {
  const state = level === 0 ? "Closed" : level === 100 ? "Fully open" : "Open";
  if (level > 0 && sunset) return `${state} · closes at sunset`;
  if (level === 0 && sunrise) return `${state} · opens at sunrise`;
  return state;
}

function BlindsPhone() {
  const { toast } = useToast();
  const [level, setLevel] = useState(80);
  const [sunrise, setSunrise] = useState(true);
  const [sunset, setSunset] = useState(true);
  const move = (next: number, verb: string) => { setLevel(next); toast({ title: `Bedroom blinds ${verb}`, children: `${next}% open` }); };
  return (
    <PlatformPhone label="Smart home app" canvas="default">
      {/* Bar + None on Canvas/Default: the open level as Display/3 over the window photo, the Accent open-level slider,
          Open / Stop / Close as three equal Tertiary buttons, and the sunrise and sunset automations as switch rows. */}
      <AppShell
        topNavigation={<TopNavigation type="transparent" aria-label="Bedroom blinds" topBar
          largeTitle="Bedroom blinds" largeTitleCapline="Somfy" largeTitleSubheading="Bedroom"
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Bedroom" }) }}
          trailing={[{ icon: "icon-dots-vertical-line", label: "More for Bedroom blinds", onClick: () => toast({ title: "Bedroom blinds", children: "Calibrate, rename or remove them." }) }]} />}
      >
        <Stack gap="none">
          <Text as="p" textStyle="Display/3" tabularNumbers>{level}%</Text>
          <Text textStyle="Body/Small/Regular" tone="base" aria-live="polite">{blindsStatus(level, sunrise, sunset)}</Text>
        </Stack>
        {/* Figma Device: the bedroom window with its roller blind, 350 × 168 with Corner-Radius/3XLarge. */}
        <Image src={platformMedia.devices.rollerBlind.src} alt={platformMedia.devices.rollerBlind.alt} ratio={350 / 168} radius="3xl" />
        <SliderField label="Open level" theme="accent" value={level} onValueChange={setLevel} step={5} formatValue={(value) => `${value}%`} />
        <Stack direction="row" gap="sm" fillChildren>
          <Button level="tertiary" onClick={() => move(100, "opening")}>Open</Button>
          <Button level="tertiary" onClick={() => toast({ title: "Bedroom blinds stopped", children: `Held at ${level}% open` })}>Stop</Button>
          <Button level="tertiary" onClick={() => move(0, "closing")}>Close</Button>
        </Stack>
        <ListBox as="section" theme="shadow" aria-label="Automations">
          <List aria-label="Sunrise and sunset automations">
            <ToggleListItem title="Open at sunrise" caption="06:10 · weekdays" toggleSize="lg" checked={sunrise} onCheckedChange={setSunrise}
              leading={<DockIcon size="md" icon="icon-sunrise-line" theme="neutral" background="subtle" />} />
            <ToggleListItem title="Close at sunset" caption="17:45 · every day" toggleSize="lg" checked={sunset} onCheckedChange={setSunset}
              leading={<DockIcon size="md" icon="icon-sunset-line" theme="neutral" background="subtle" />} />
          </List>
        </ListBox>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— F11 · Energy, what uses the power (Top=Bar · Bottom=None) ———————————————————————————————————————————————————
type EnergyRange = "day" | "week" | "month";
const energyRanges: { id: EnergyRange; label: string; title: string; current: string; previous: string; span: string; labels: string[]; values: number[]; compare: number[] }[] = [
  { id: "day", label: "Day", title: "Today", current: "Today", previous: "Yesterday", span: "every 4 hours, today against yesterday",
    labels: ["00", "04", "08", "12", "16", "20"], values: [0.6, 0.4, 1.3, 1.1, 1.6, 1.2], compare: [0.7, 0.5, 1.5, 1.2, 1.8, 1.4] },
  { id: "week", label: "Week", title: "This week", current: "This week", previous: "Last week", span: "per day, this week against last week",
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], values: [8.6, 7.9, 9.4, 8.8, 7.6, 10.9, 9.8], compare: [9.9, 9.1, 10.6, 10.2, 8.9, 12.4, 11.2] },
  { id: "month", label: "Month", title: "This month", current: "This month", previous: "Last month", span: "per week, this month against last month",
    labels: ["W1", "W2", "W3", "W4"], values: [61.4, 58.2, 64.9, 60.3], compare: [66, 63.1, 69.4, 65.2] },
];
const plugs: { id: string; title: string; watts: string; icon: IconName; theme: DockIconTheme; offNote: string }[] = [
  { id: "washer", title: "Washing machine", watts: "1,240 W now", icon: "icon-droplets-02-line", theme: "accent", offNote: "The cycle pauses until the plug is back on." },
  { id: "fridge", title: "Fridge", watts: "120 W now", icon: "icon-snowflake-01-line", theme: "accent", offNote: "Turn it back on within 2 hours to keep food cold." },
];
const kwh = (value: number) => `${value} kWh`;

function EnergyPhone() {
  const { toast } = useToast();
  const [rangeId, setRangeId] = useState<EnergyRange>("week");
  const [plugsOn, setPlugsOn] = useState<Record<string, boolean>>({ washer: true, fridge: true });
  const range = energyRanges.find((item) => item.id === rangeId) ?? energyRanges[1];
  return (
    <PlatformPhone label="Smart home app" canvas="default">
      {/* Bar + None on Canvas/Default: today's usage as one big kWh number with the change against yesterday, the chart
          card (Day / Week / Month Segmented, this period against the last as Multi-Line-Chart), then the smart plugs. */}
      <AppShell
        topNavigation={<TopNavigation type="transparent" aria-label="Energy" topBar largeTitle="Energy" largeTitleCapline="Today"
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Home" }) }}
          trailing={[{ icon: "icon-dots-vertical-line", label: "More for Energy", onClick: () => toast({ title: "Energy", children: "Set a tariff, a daily budget or export the readings." }) }]} />}
      >
        <Stack gap="none">
          <Stack direction="row" gap="2xs" align="center">
            <Icon name="icon-zap-line" size="xl" decorative />
            <Text as="p" textStyle="Display/3">6.2 kWh</Text>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">12% less than yesterday</Text>
        </Stack>
        <ChartCard theme="shadow" title={range.title} headingLevel={2}
          ranges={energyRanges.map((item) => ({ id: item.id, label: item.label }))} range={rangeId} onRangeChange={(id) => setRangeId(id as EnergyRange)}>
          {/* A new range draws in again, on its latest period. */}
          <LineChart key={rangeId} aria-label={`Energy used ${range.span}`} label={range.current} data={range.labels.map((label, index) => ({ label, value: range.values[index] }))}
            compare={{ label: range.previous, values: range.compare }} legendPosition="top" format={kwh} height={232} />
        </ChartCard>
        <ListBox as="section" theme="shadow" aria-label="Smart plugs">
          <List aria-label="Smart plugs">
            {plugs.map((plug) => (
              <ToggleListItem key={plug.id} title={plug.title} caption={plugsOn[plug.id] ? plug.watts : "Off · 0 W"} toggleSize="lg" checked={plugsOn[plug.id]}
                onCheckedChange={(next) => { setPlugsOn((value) => ({ ...value, [plug.id]: next })); if (!next) toast({ title: `${plug.title} plug off`, children: plug.offNote, action: { label: "Undo", onClick: () => setPlugsOn((value) => ({ ...value, [plug.id]: true })) } }); }}
                leading={<DockIcon size="md" icon={plug.icon} theme={plug.theme} background="subtle" />} />
            ))}
          </List>
        </ListBox>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— F12 · Scenes, one tap for many devices (Top=Bar · Bottom=Tab-Bar) ———————————————————————————————————————————
const homeRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
  { id: "rooms", label: "Rooms", icon: "icon-grid-01-line", selectedIcon: "icon-grid-01-solid" },
  { id: "scenes", label: "Scenes", icon: "icon-stars-01-line", selectedIcon: "icon-stars-01-solid" },
  { id: "settings", label: "Settings", icon: "icon-settings-01-line", selectedIcon: "icon-settings-01-solid" },
];
const scenes: { id: string; title: string; devices: string; does: string; icon: IconName; theme: DockIconTheme; background: "subtle" | "solid" }[] = [
  { id: "morning", title: "Good morning", devices: "5 devices", does: "Lights, curtains, coffee", icon: "icon-sunrise-line", theme: "orange", background: "subtle" },
  { id: "leave", title: "Leave home", devices: "7 devices", does: "Lock, lights off, vacuum", icon: "icon-key-line", theme: "accent", background: "solid" },
  { id: "movie", title: "Movie night", devices: "4 devices", does: "TV, dim lights, curtains", icon: "icon-film-01-line", theme: "violet", background: "subtle" },
  { id: "night", title: "Good night", devices: "6 devices", does: "Lock, lights off, AC 27°", icon: "icon-moon-02-line", theme: "indigo", background: "subtle" },
];
const automations: { id: string; title: string; caption: string; icon: IconName; on: boolean }[] = [
  { id: "leave", title: "When I leave home", caption: "Lock door · lights off · start vacuum", icon: "icon-lock-01-line", on: true },
  { id: "motion", title: "When motion at night", caption: "Hallway light 20% for 2 min", icon: "icon-lightbulb-line", on: true },
  { id: "weekday", title: "Every weekday 10:00", caption: "Vacuum living room", icon: "icon-target-04-line", on: false },
];

function ScenesPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("scenes");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(automations.map((item) => [item.id, item.on])));
  const automationsId = useId();
  return (
    <PlatformPhone label="Smart home app" canvas="default">
      {/* Bar + Tab-Bar on Canvas/Default: a root, so the large title holds the screen's one action (New scene); the
          scenes as a 2 × 2 grid of Shadow cards with their device count and a Run button, then the automations. */}
      <AppShell
        topNavigation={<TopNavigation type="transparent" largeTitle="Scenes" largeTitleSubheading="One tap for many devices"
          largeTitleAction={{ icon: "icon-plus-line", label: "New scene", onClick: () => toast({ title: "New scene", children: "Pick the devices and what each one does." }) }} />}
        bottomNavigation={<BottomNavigation aria-label="Smart home" value={root} onValueChange={setRoot} showLabels items={homeRoots} />}
      >
        <Grid as="ul" columns={2} gap="sm" aria-label="Scenes">
          {scenes.map((scene) => (
            <Card as="li" key={scene.id}>
              <Stack gap="sm" align="stretch">
                <DockIcon size="lg" icon={scene.icon} theme={scene.theme} background={scene.background} />
                <Stack gap="none">
                  <Heading level={2} textStyle="Body/Base/Bold">{scene.title}</Heading>
                  <Text textStyle="Caption/Regular" tone="base">{scene.devices}</Text>
                </Stack>
                <Button level="tertiary" aria-label={`Run ${scene.title}`}
                  onClick={() => toast({ type: "positive", title: `${scene.title} is running`, children: `${scene.does} · ${scene.devices}`, action: { label: "Undo", onClick: () => toast({ title: `${scene.title} undone`, children: "The devices are back as they were." }) } })}>Run</Button>
              </Stack>
            </Card>
          ))}
        </Grid>
        <Stack as="section" gap="md" aria-labelledby={automationsId}>
          <Stack direction="row" justify="between" align="center" gap="xs">
            <Heading level={2} id={automationsId} textStyle="Heading/4">Automations</Heading>
            <Button appearance="flat" level="primary" size="sm" onClick={() => toast({ title: "New automation", children: "Choose a trigger: a time, a sensor or leaving home." })}>New</Button>
          </Stack>
          <ListBox theme="shadow">
            <List aria-labelledby={automationsId}>
              {automations.map((item) => (
                <ToggleListItem key={item.id} title={item.title} caption={item.caption} toggleSize="lg" checked={enabled[item.id]}
                  onCheckedChange={(next) => setEnabled((value) => ({ ...value, [item.id]: next }))}
                  leading={<DockIcon size="md" icon={item.icon} theme="neutral" background="subtle" />} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "F9 · TV — remote on the phone",
    description: "Power and input, the D-pad as a round Surface control with OK in the centre, volume and channel steppers, playback buttons and the apps row as Dock-Icons. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: TV, Media remote.",
    render: () => <TvRemotePhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    topNavigation={<TopNavigation type="transparent" aria-label="Living room TV" topBar
      largeTitle="Living room TV" largeTitleCapline="Samsung" largeTitleSubheading={input}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
      trailing={[{ icon: "icon-dots-vertical-line", label: "More for Living room TV", onClick: openMenu }]} />}
  >
    <Stack direction="row" gap="md" align="center">
      <ToggleButton size="xl" icon="icon-power-01-line" aria-label="Power" checked={on} onCheckedChange={setOn} />
      <Stack gap="none" align="end" width="fill">
        <Text as="p" textStyle="Display/3">Netflix</Text>
        <Text textStyle="Body/Small/Regular" tone="base">Volume 18 · channel 7</Text>
      </Stack>
    </Stack>
    <Stack direction="row" justify="between" align="center" gap="none">
      <Box surface="surface" radius="full" width={56}>
        <Stack gap="xs" align="center">
          <IconButton appearance="flat" level="primary" size="lg" icon="icon-plus-line" aria-label="Volume up" onClick={volumeUp} />
          <Text as="span" textStyle="Caption/Bold" tone="base" aria-hidden="true">VOL</Text>
          <IconButton appearance="flat" level="primary" size="lg" icon="icon-minus-line" aria-label="Volume down" onClick={volumeDown} />
        </Stack>
      </Box>
      <Box surface="surface" radius="full" width={200} height={200}>
        <Stack gap="md" align="center" justify="center" height="fill">
          <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-up-line" aria-label="Up" onClick={up} />
          <Stack direction="row" gap="none" align="center" justify="center">
            <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-left-line-medium" aria-label="Left" onClick={left} />
            <Button level="primary" size="lg" onClick={select}>Select</Button>
            <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-right-line-medium" aria-label="Right" onClick={right} />
          </Stack>
          <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-down-line" aria-label="Down" onClick={down} />
        </Stack>
      </Box>
      …CH: the same capsule with chevron up / down
    </Stack>
    <Stack direction="row" justify="between" align="center" gap="none">
      <IconButton level="tertiary" size="lg" icon="icon-volume-min-line" aria-label="Mute" aria-pressed={muted} onClick={toggleMute} />
      <IconButton level="tertiary" size="lg" icon="icon-skip-back-solid" aria-label="Previous" onClick={previous} />
      <IconButton level="tertiary" size="xl" icon="icon-play-solid" aria-label="Play" onClick={togglePlay} />
      <IconButton level="tertiary" size="lg" icon="icon-skip-forward-solid" aria-label="Next" onClick={next} />
      <IconButton level="tertiary" size="lg" icon="icon-tv-02-line" aria-label="Change input" onClick={nextInput} />
    </Stack>
    <Card as="section" aria-labelledby={appsId}>
      <Stack gap="md">
        <Heading level={2} id={appsId} textStyle="Body/Base/Bold">Apps</Heading>
        <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-labelledby={appsId}>
          <Stack as="li" gap="xs" align="center" width={64}>
            <DockIcon size="lg" icon="icon-film-01-line" theme="neutral" background="subtle" />
            <Text as="span" textStyle="Caption/Medium">Netflix</Text>
          </Stack>
          …YouTube · Spotify · Live TV
        </Stack>
      </Stack>
    </Card>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "F10 · Blinds — open by percent",
    description: "The window photo with the open level as Display/3, an open-level Slider, Open / Stop / Close buttons and the sunrise and sunset automations as Toggle rows. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: Curtains / Blinds, Shades.",
    render: () => <BlindsPhone />,
    code: `<AppShell
  topNavigation={<TopNavigation type="transparent" aria-label="Bedroom blinds" topBar
    largeTitle="Bedroom blinds" largeTitleCapline="Somfy" largeTitleSubheading="Bedroom"
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
    trailing={[{ icon: "icon-dots-vertical-line", label: "More for Bedroom blinds", onClick: openMenu }]} />}
>
  <Stack gap="none">
    <Text as="p" textStyle="Display/3" tabularNumbers>{level}%</Text>
    <Text textStyle="Body/Small/Regular" tone="base">Open · closes at sunset</Text>
  </Stack>
  <Image src={windowPhoto.src} alt={windowPhoto.alt} ratio={350 / 168} radius="3xl" />
  <SliderField label="Open level" theme="accent" value={level} onValueChange={setLevel} step={5} formatValue={(value) => \`\${value}%\`} />
  <Stack direction="row" gap="sm" fillChildren>
    <Button level="tertiary" onClick={() => setLevel(100)}>Open</Button>
    <Button level="tertiary" onClick={stop}>Stop</Button>
    <Button level="tertiary" onClick={() => setLevel(0)}>Close</Button>
  </Stack>
  <ListBox as="section" theme="shadow" aria-label="Automations">
    <List aria-label="Sunrise and sunset automations">
      <ToggleListItem title="Open at sunrise" caption="06:10 · weekdays" toggleSize="lg" checked={sunrise} onCheckedChange={setSunrise}
        leading={<DockIcon size="md" icon="icon-sunrise-line" theme="neutral" background="subtle" />} />
      <ToggleListItem title="Close at sunset" caption="17:45 · every day" toggleSize="lg" checked={sunset} onCheckedChange={setSunset}
        leading={<DockIcon size="md" icon="icon-sunset-line" theme="neutral" background="subtle" />} />
    </List>
  </ListBox>
</AppShell>`,
  },
  {
    title: "F11 · Energy — what uses the power",
    description: "Today's usage as one big kWh number with the change against yesterday, a Day / Week / Month Segmented, this week against last week as a line chart, and smart plugs as Toggle rows with their live watts. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: Energy, Smart plugs.",
    render: () => <EnergyPhone />,
    code: `<AppShell
  topNavigation={<TopNavigation type="transparent" aria-label="Energy" topBar largeTitle="Energy" largeTitleCapline="Today"
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
    trailing={[{ icon: "icon-dots-vertical-line", label: "More for Energy", onClick: openMenu }]} />}
>
  <Stack gap="none">
    <Stack direction="row" gap="2xs" align="center">
      <Icon name="icon-zap-line" size="xl" decorative />
      <Text as="p" textStyle="Display/3">6.2 kWh</Text>
    </Stack>
    <Text textStyle="Body/Small/Regular" tone="base">12% less than yesterday</Text>
  </Stack>
  <ChartCard theme="shadow" title="This week" headingLevel={2} range={range} onRangeChange={setRange}
    ranges={[{ id: "day", label: "Day" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }]}>
    <LineChart key={range} aria-label="Energy used per day, this week against last week" label="This week"
      data={[{ label: "Mon", value: 8.6 }, …, { label: "Sun", value: 9.8 }]}
      compare={{ label: "Last week", values: [9.9, 9.1, 10.6, 10.2, 8.9, 12.4, 11.2] }}
      legendPosition="top" format={(value) => \`\${value} kWh\`} height={232} />
  </ChartCard>
  <ListBox as="section" theme="shadow" aria-label="Smart plugs">
    <List aria-label="Smart plugs">
      <ToggleListItem title="Washing machine" caption="1,240 W now" toggleSize="lg" checked={washer} onCheckedChange={setWasher}
        leading={<DockIcon size="md" icon="icon-droplets-02-line" theme="accent" background="subtle" />} />
      <ToggleListItem title="Fridge" caption="120 W now" toggleSize="lg" checked={fridge} onCheckedChange={setFridge}
        leading={<DockIcon size="md" icon="icon-snowflake-01-line" theme="accent" background="subtle" />} />
    </List>
  </ListBox>
</AppShell>`,
  },
  {
    title: "F12 · Scenes — one tap for many devices",
    description: "Scenes as a grid of cards (Good morning, Leave home, Movie night, Good night) with their device count and a Run button, then automations as List-Items with their trigger and a Toggle-Button. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. Fits: Scenes, Automations.",
    render: () => <ScenesPhone />,
    code: `<AppShell
  topNavigation={<TopNavigation type="transparent" largeTitle="Scenes" largeTitleSubheading="One tap for many devices"
    largeTitleAction={{ icon: "icon-plus-line", label: "New scene", onClick: newScene }} />}
  bottomNavigation={<BottomNavigation aria-label="Smart home" value={root} onValueChange={setRoot} showLabels items={[
    { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
    { id: "rooms", label: "Rooms", icon: "icon-grid-01-line", selectedIcon: "icon-grid-01-solid" },
    { id: "scenes", label: "Scenes", icon: "icon-stars-01-line", selectedIcon: "icon-stars-01-solid" },
    { id: "settings", label: "Settings", icon: "icon-settings-01-line", selectedIcon: "icon-settings-01-solid" },
  ]} />}
>
  <Grid as="ul" columns={2} gap="sm" aria-label="Scenes">
    <Card as="li">
      <Stack gap="sm" align="stretch">
        <DockIcon size="lg" icon="icon-sunrise-line" theme="orange" background="subtle" />
        <Stack gap="none">
          <Heading level={2} textStyle="Body/Base/Bold">Good morning</Heading>
          <Text textStyle="Caption/Regular" tone="base">5 devices</Text>
        </Stack>
        <Button level="tertiary" aria-label="Run Good morning" onClick={runGoodMorning}>Run</Button>
      </Stack>
    </Card>
    …Leave home (accent, solid) · Movie night (violet) · Good night (indigo)
  </Grid>
  <Stack as="section" gap="md" aria-labelledby="automations">
    <Stack direction="row" justify="between" align="center" gap="xs">
      <Heading level={2} id="automations" textStyle="Heading/4">Automations</Heading>
      <Button appearance="flat" level="primary" size="sm" onClick={newAutomation}>New</Button>
    </Stack>
    <ListBox theme="shadow">
      <List aria-labelledby="automations">
        <ToggleListItem title="When I leave home" caption="Lock door · lights off · start vacuum" toggleSize="lg" checked={leaving} onCheckedChange={setLeaving}
          leading={<DockIcon size="md" icon="icon-lock-01-line" theme="neutral" background="subtle" />} />
        …When motion at night · Every weekday 10:00 (off)
      </List>
    </ListBox>
  </Stack>
</AppShell>`,
  },
];
