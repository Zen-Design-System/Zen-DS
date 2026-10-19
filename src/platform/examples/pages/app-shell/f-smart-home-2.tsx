/* App Shell examples · f-smart-home-2: built from Figma ◇ Master-Layout · Example (15902:109717), section "F · Smart home
   concept (all device types)" (15991:10067): F5 · Light (15991:10243), F6 · Climate (15991:10285), F7 · Camera
   (15991:10327) and F8 · Door lock (15991:10369). Each phone is one Pattern/AppShell/Mobile · Phone · Top=Bar ·
   Bottom=None instance on Canvas/Default: a Transparent Top-Navigation (Back, More, an Expand-Heading with the brand as
   Capline and the room as Subheading), then the device's Content, Layout-Mobile/Section-Gap (32) apart. The house is
   Mai Anh's (F1 "Hi, Mai Anh"): the Philips ceiling light and the Daikin air conditioner in the Living room, as on F1/F2. */
import { useId, useState, type ReactNode } from "react";
import { AppShell } from "../../../../components/AppShell";
import { Avatar } from "../../../../components/Avatar";
import { Badge } from "../../../../components/Badge";
import { IconButton } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { ChipGroup } from "../../../../components/ChipGroup";
import { DockIcon } from "../../../../components/DockIcon";
import { Icon, type IconName } from "../../../../components/Icon";
import { Image } from "../../../../components/Image";
import { Box, Stack } from "../../../../components/Layout";
import { List, ListBox, ListItem, ToggleListItem } from "../../../../components/ListItem";
import { MetricCard } from "../../../../components/MetricWidget";
import { Segmented } from "../../../../components/Segmented";
import { SliderField } from "../../../../components/SliderField";
import { Heading, Text } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { ToggleButton } from "../../../../components/Toggle";
import { TopNavigation } from "../../../../components/TopNavigation";
import { platformMedia } from "../../../PlatformMedia";
import { PlatformPhone } from "../../../PlatformPhone";
import { people } from "../../data";
import type { ExampleDef } from "../../types";

type Device = { brand: string; name: string; room: string };
type Toast = ReturnType<typeof useToast>["toast"];

/** Figma Top-Navigation/Mobile Type=Transparent: Back (Top-Leading) and More (Top-Trailing) on the Canvas, and the
 *  Expand-Heading (Heading-Text H1, Capline and Subheading on): the brand over the device's name, its room under it. */
function DeviceTopNavigation({ device, toast }: { device: Device; toast: Toast }) {
  return (
    <TopNavigation type="transparent" aria-label={device.name} largeTitle={device.name} largeTitleCapline={device.brand} largeTitleSubheading={device.room}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: `Back to ${device.room}` }) }}
      trailing={[{ icon: "icon-dots-vertical-line", label: `More for ${device.name}`, onClick: () => toast({ title: device.name, children: "Rename it, move it to another room or remove it." }) }]} />
  );
}

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

/** One device screen: Back · More and the heading over the Canvas, then the status and the device's sections 32 apart. */
function DevicePhone({ device, label, status, children }: { device: Device; label: string; status: ReactNode; children: ReactNode }) {
  const { toast } = useToast();
  return (
    <PlatformPhone label={label} canvas="default">
      <AppShell topNavigation={<DeviceTopNavigation device={device} toast={toast} />}>
        <Stack gap="xl">
          {status}
          {children}
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— F5 · Light ————————————————————————————————————————————————————————————————————————————————————————————————
const ceilingLight: Device = { brand: "Philips Hue", name: "Ceiling light", room: "Living room" };
type Warmth = "warm" | "neutral" | "cool";
const warmths: { id: Warmth; label: string }[] = [{ id: "warm", label: "Warm" }, { id: "neutral", label: "Neutral" }, { id: "cool", label: "Cool" }];
const lightScenes: { id: string; label: string; brightness: number; warmth: Warmth }[] = [
  { id: "reading", label: "Reading", brightness: 100, warmth: "neutral" },
  { id: "relax", label: "Relax", brightness: 70, warmth: "warm" },
  { id: "night", label: "Night", brightness: 20, warmth: "warm" },
];

function LightPhone() {
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
    <DevicePhone device={ceilingLight} label="Smart home app · Ceiling light"
      status={<DeviceStatus device={ceilingLight} on={on} onPowerChange={(next) => { setOn(next); toast({ title: next ? "Ceiling light on" : "Ceiling light off", children: next ? `${brightness}% · ${warmthLabel} white` : "Living room" }); }}
        icon="icon-sun-line" value={on ? `${brightness}%` : "Off"} caption={on ? `Brightness · ${warmthLabel} white` : "Turned off from the app"} />}>
      {/* The lamp photo leads (Figma Device, Corner-Radius/3XLarge), then the controls in the order they are used. */}
      <Image src={platformMedia.devices.ceilingLight.src} alt={platformMedia.devices.ceilingLight.alt} ratio={350 / 240} radius="3xl" />
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
    </DevicePhone>
  );
}

// ——— F6 · Climate ——————————————————————————————————————————————————————————————————————————————————————————————
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

function ClimatePhone() {
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
    <DevicePhone device={airConditioner} label="Smart home app · Air conditioner"
      status={<DeviceStatus device={airConditioner} on={on} onPowerChange={(next) => { setOn(next); toast({ title: next ? "Air conditioner on" : "Air conditioner off", children: next ? `${modeLabel?.label} · ${target}°` : "Living room" }); }}
        icon="icon-thermometer-02-line" value="26°C" caption={on ? `Inside now · ${modeLabel?.doing}` : "Inside now · off"} />}>
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
    </DevicePhone>
  );
}

// ——— F7 · Camera ———————————————————————————————————————————————————————————————————————————————————————————————
const frontCamera: Device = { brand: "Arlo", name: "Front camera", room: "Porch" };
const cameraEvents: { id: string; title: string; time: string; type: string; icon: IconName }[] = [
  { id: "person", title: "Person at the door", time: "08:42", type: "Person", icon: "icon-user-line" },
  { id: "package", title: "Package delivered", time: "07:15", type: "Package", icon: "icon-package-line" },
  { id: "motion", title: "Motion in the yard", time: "06:58", type: "Motion", icon: "icon-activity-line" },
];

function CameraPhone() {
  const { toast } = useToast();
  const [on, setOn] = useState(true);
  const [talking, setTalking] = useState(false);
  const [recording, setRecording] = useState(false);
  const eventsId = useId();
  return (
    <DevicePhone device={frontCamera} label="Smart home app · Front camera"
      status={<DeviceStatus device={frontCamera} on={on} onPowerChange={(next) => { setOn(next); setTalking(false); setRecording(false); toast({ title: next ? "Front camera on" : "Privacy mode on", children: next ? "Live view and motion alerts are back." : "The camera stops seeing and recording." }); }}
        value={on ? "Live" : "Off"} caption={on ? "1080p · motion 2 min ago" : "Privacy mode · not recording"} />}>
      {/* The live porch view (Figma Live-View, Corner-Radius/3XLarge) with the LIVE Badge in its padded corner Wrapper. */}
      <Box>
        <Image src={platformMedia.devices.porchCamera.src} alt="Live view of the porch and the front door" ratio={350 / 180} radius="3xl" />
        {on ? (
          <Box position="absolute" padding="sm">
            <Badge size="sm" theme="red">LIVE</Badge>
          </Box>
        ) : null}
      </Box>
      <Stack as="ul" direction="row" gap="sm" fillChildren aria-label="Camera controls">
        <Stack as="li" gap="xs" align="center">
          {/* zen-allow-no-tooltip: each control's visible label sits right under it (Figma Talk · Record · Snapshot). */}
          <IconButton size="lg" level="tertiary" icon={talking ? "icon-microphone-off-line" : "icon-microphone-line"} aria-label="Talk" aria-pressed={talking} tooltip={false} disabled={!on}
            onClick={() => { setTalking((value) => !value); toast({ title: talking ? "Mic off" : "Talking to the porch", children: talking ? undefined : "Your voice plays from the camera's speaker." }); }} />
          <Text as="span" textStyle="Caption/Medium" aria-hidden="true">Talk</Text>
        </Stack>
        <Stack as="li" gap="xs" align="center">
          {/* zen-allow-no-tooltip: the visible label sits right under the button. */}
          <IconButton size="lg" level="tertiary" icon={recording ? "icon-stop-circle-line" : "icon-video-recorder-line"} aria-label={recording ? "Stop recording" : "Record"} tooltip={false} disabled={!on}
            onClick={() => { setRecording((value) => !value); toast({ title: recording ? "Clip saved" : "Recording the porch", children: recording ? "Find it in today's events." : "Tap Stop to save the clip." }); }} />
          <Text as="span" textStyle="Caption/Medium" aria-hidden="true">{recording ? "Stop" : "Record"}</Text>
        </Stack>
        <Stack as="li" gap="xs" align="center">
          {/* zen-allow-no-tooltip: the visible label sits right under the button. */}
          <IconButton size="lg" level="tertiary" icon="icon-camera-line" aria-label="Snapshot" tooltip={false} disabled={!on}
            onClick={() => toast({ title: "Snapshot saved", children: "Front camera · Porch" })} />
          <Text as="span" textStyle="Caption/Medium" aria-hidden="true">Snapshot</Text>
        </Stack>
      </Stack>
      <ListBox theme="shadow" as="section" aria-labelledby={eventsId}
        header={<Heading level={2} id={eventsId} textStyle="Body/Base/Bold">Today</Heading>}>
        <List aria-labelledby={eventsId}>
          {cameraEvents.map((event) => (
            <ListItem key={event.id} title={event.title} titleLines={2} caption={event.time}
              leading={<DockIcon icon={event.icon} theme="neutral" background="subtle" />}
              trailing={<Badge size="sm" theme="neutral" background="subtle">{event.type}</Badge>}
              onClick={() => toast({ title: `${event.title} · ${event.time}`, children: "Playing the clip from the porch." })} />
          ))}
        </List>
      </ListBox>
    </DevicePhone>
  );
}

// ——— F8 · Door lock ————————————————————————————————————————————————————————————————————————————————————————————
const frontDoor: Device = { brand: "Yale", name: "Front door", room: "Entrance" };
/** Mai Anh, whose house it is (F1 "Hi, Mai Anh"); the same photo as on F1. */
const maiAnh = { name: "Mai Anh", photo: people.chi.photo };
type Access = { id: string; title: string; caption: string };

function DoorLockPhone() {
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
    <DevicePhone device={frontDoor} label="Smart home app · Front door"
      status={<DeviceStatus device={frontDoor} on={false} disabled icon={locked ? "icon-lock-01-line" : "icon-lock-unlocked-01-line"} iconTone="light"
        value={locked ? "Locked" : "Unlocked"} caption={locked ? "Auto-locked at 07:41" : autoLock ? "Locks again in 30 seconds" : "Unlocked from the app"} />}>
      {/* One big round button to lock or unlock: a Surface Button/Icon-Main on the Brand stage (Figma Lock-Button). */}
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
        header={<Heading level={2} id={historyId} textStyle="Body/Base/Bold">Recent access</Heading>}>
        <List aria-labelledby={historyId}>
          {history.slice(0, 3).map((entry) => (
            <ListItem key={entry.id} title={entry.title} caption={entry.caption}
              leading={<Avatar size="md" theme="photo" src={maiAnh.photo} alt="" />} />
          ))}
        </List>
      </ListBox>
    </DevicePhone>
  );
}

const shell = "Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None.";
const deviceShellCode = `// Shared by F5–F8: a Transparent bar (Back, More) and the heading over the Canvas, the power status, then the sections.
<PlatformPhone canvas="default">
  <AppShell topNavigation={<TopNavigation type="transparent" aria-label={device.name}
    largeTitle={device.name} largeTitleCapline={device.brand} largeTitleSubheading={device.room}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
    trailing={[{ icon: "icon-dots-vertical-line", label: \`More for \${device.name}\`, onClick: more }]} />}
  >
    <Stack gap="xl">
      <Stack direction="row" gap="md" align="center">
        <ToggleButton size="xl" icon="icon-power-01-line" aria-label={\`\${device.name} power\`} checked={on} onCheckedChange={setOn} />
        <Stack gap="none" align="end" width="fill">
          <Stack direction="row" gap="2xs" align="center">
            <Icon name={icon} size="lg" decorative />
            <Text as="p" textStyle="Display/3">{value}</Text>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">{caption}</Text>
        </Stack>
      </Stack>
      …the device's sections
    </Stack>
  </AppShell>
</PlatformPhone>`;

export const examples: ExampleDef[] = [
  {
    title: "F5 · Light — brightness, warmth, scenes",
    description: `The lamp photo leads, brightness as a large value and Slider, colour temperature as a Segmented (Warm, Neutral, Cool), quick scenes as Chips and a schedule row. ${shell} Fits: Lights, Smart bulbs.`,
    render: () => <LightPhone />,
    code: `${deviceShellCode}

// Ceiling light · Philips Hue · Living room: icon="icon-sun-line" value="70%" caption="Brightness · warm white"
<Image src={lampPhoto} alt="Round ceiling light glowing warm white" ratio={350 / 240} radius="3xl" />
<SliderField label="Brightness" theme="accent" min={1} value={brightness} onValueChange={setBrightness} formatValue={(value) => \`\${value}%\`} />
<Stack gap="xs">
  <Text textStyle="Body/Base/Medium">Colour temperature</Text>
  <Segmented fullWidth aria-label="Colour temperature" value={warmth} onValueChange={setWarmth}
    options={[{ id: "warm", label: "Warm" }, { id: "neutral", label: "Neutral" }, { id: "cool", label: "Cool" }]} />
</Stack>
<ChipGroup aria-label="Scenes" value={scene} onValueChange={applyScene}
  options={[{ value: "reading", label: "Reading" }, { value: "relax", label: "Relax" }, { value: "night", label: "Night" }]} />
<ListBox theme="shadow">
  <List aria-label="Schedule">
    <ToggleListItem toggleSize="lg" title="Turn on at sunset" caption="Today at 17:45" checked={sunset} onCheckedChange={setSunset}
      leading={<DockIcon icon="icon-sunset-line" theme="neutral" background="subtle" />} />
  </List>
</ListBox>`,
  },
  {
    title: "F6 · Climate — target temperature first",
    description: `Current and target temperature as one Display-Extra value with − and + IconButtons, a Segmented for the mode (Cool, Heat, Fan, Dry), fan speed as a Slider, humidity and air quality as two Metric tiles, and the schedule. ${shell} Fits: Air conditioner, Thermostat.`,
    render: () => <ClimatePhone />,
    code: `${deviceShellCode}

// Air conditioner · Daikin · Living room: icon="icon-thermometer-02-line" value="26°C" caption="Inside now · cooling"
<Card theme="shadow" as="section" aria-labelledby="target">
  <Stack direction="row" align="center" justify="between" gap="sm">
    <IconButton size="sm" level="tertiary" icon="icon-minus-line" aria-label="Lower the target temperature" onClick={() => changeTarget(-1)} />
    <Stack gap="none" align="center">
      <Text as="p" textStyle="Display-Extra/2" aria-live="polite">{target}°</Text>
      <Text id="target" textStyle="Body/Small/Regular" tone="base">Target temperature</Text>
    </Stack>
    <IconButton size="sm" level="tertiary" icon="icon-plus-line" aria-label="Raise the target temperature" onClick={() => changeTarget(1)} />
  </Stack>
</Card>
<Segmented fullWidth aria-label="Mode" value={mode} onValueChange={setMode}
  options={[{ id: "cool", label: "Cool" }, { id: "heat", label: "Heat" }, { id: "fan", label: "Fan" }, { id: "dry", label: "Dry" }]} />
<SliderField label="Fan speed" theme="accent" min={0} max={5} value={fan} onValueChange={setFan} formatValue={(value) => \`Auto · \${value}\`} />
<Stack direction="row" gap="sm" fillChildren>
  <MetricCard type="tile" spacing="md" label="Humidity" value="52%" icon="icon-droplets-02-line" iconBackground="subtle" />
  <MetricCard type="tile" spacing="md" label="Air quality" value="Good" icon="icon-salad-leaf-line" iconBackground="subtle" />
</Stack>
<ListBox theme="shadow">
  <List aria-label="Schedule">
    <ToggleListItem toggleSize="lg" title="Sleep mode" caption="23:00 – 06:30 · 27°C" checked={sleep} onCheckedChange={setSleep}
      leading={<DockIcon icon="icon-moon-02-line" theme="neutral" background="subtle" />} />
  </List>
</ListBox>`,
  },
  {
    title: "F7 · Camera — live view and events",
    description: `A live porch view with a LIVE Badge, the camera's controls (talk, record, snapshot) as Surface IconButtons, then today's events as rows with time and a type Badge. ${shell} Fits: Security camera, Doorbell.`,
    render: () => <CameraPhone />,
    code: `${deviceShellCode}

// Front camera · Arlo · Porch: value="Live" caption="1080p · motion 2 min ago"
<Box>
  <Image src={liveFrame} alt="Live view of the porch and the front door" ratio={350 / 180} radius="3xl" />
  <Box position="absolute" padding="sm"><Badge size="sm" theme="red">LIVE</Badge></Box>
</Box>
<Stack as="ul" direction="row" gap="sm" fillChildren aria-label="Camera controls">
  <Stack as="li" gap="xs" align="center">
    {/* zen-allow-no-tooltip: the visible label sits right under the button. */}
    <IconButton size="lg" level="tertiary" icon="icon-microphone-line" aria-label="Talk" aria-pressed={talking} tooltip={false} onClick={toggleTalk} />
    <Text as="span" textStyle="Caption/Medium" aria-hidden="true">Talk</Text>
  </Stack>
  …Record (icon-video-recorder-line) · Snapshot (icon-camera-line)
</Stack>
<ListBox theme="shadow" as="section" aria-labelledby="today" header={<Heading level={2} id="today" textStyle="Body/Base/Bold">Today</Heading>}>
  <List aria-labelledby="today">
    <ListItem title="Person at the door" titleLines={2} caption="08:42" onClick={playClip}
      leading={<DockIcon icon="icon-user-line" theme="neutral" background="subtle" />}
      trailing={<Badge size="sm" theme="neutral" background="subtle">Person</Badge>} />
    …Package delivered · 07:15 · Package, Motion in the yard · 06:58 · Motion
  </List>
</ListBox>`,
  },
  {
    title: "F8 · Door lock — one big lock button",
    description: `The lock state in Heading/1 and one big round Accent button to lock or unlock, auto-lock and guest codes as Toggle rows, and the recent access history with people's photos. ${shell} Fits: Smart lock, Access.`,
    render: () => <DoorLockPhone />,
    code: `${deviceShellCode}

// Front door · Yale · Entrance: the power switch is disabled (a lock is never switched off);
// icon="icon-lock-01-line" (tone light) value="Locked" caption="Auto-locked at 07:41"
<Card theme="subtle" color="brand">
  <Stack gap="sm" align="center" justify="center" paddingY="3xl">
    {/* zen-allow-no-tooltip: "Tap to unlock" sits right under the button. */}
    <IconButton size="xl" level="surface" icon="icon-lock-01-line" aria-label="Unlock the front door" tooltip={false} onClick={toggleLock} />
    <Text textStyle="Body/Base/Medium" tone="accent-base" aria-hidden="true">Tap to unlock</Text>
  </Stack>
</Card>
<ListBox theme="shadow">
  <List aria-label="Lock settings">
    <ToggleListItem toggleSize="lg" title="Auto-lock" caption="After 30 seconds" checked={autoLock} onCheckedChange={setAutoLock}
      leading={<DockIcon icon="icon-clock-line" theme="neutral" background="subtle" />} />
    <ToggleListItem toggleSize="lg" title="Guest code" caption="Valid until Sunday" checked={guestCode} onCheckedChange={setGuestCode}
      leading={<DockIcon icon="icon-key-line" theme="neutral" background="subtle" />} />
  </List>
</ListBox>
<ListBox theme="shadow" as="section" aria-labelledby="access" header={<Heading level={2} id="access" textStyle="Body/Base/Bold">Recent access</Heading>}>
  <List aria-labelledby="access">
    <ListItem title="Mai Anh unlocked" caption="Today 08:12 · Face ID" leading={<Avatar size="md" theme="photo" src={maiAnh.photo} alt="" />} />
  </List>
</ListBox>`,
  },
];
