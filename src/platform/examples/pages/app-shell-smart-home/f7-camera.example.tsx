import { useId, useState, type RefObject } from "react";
import {
  AppShell, Badge, Box, DockIcon, Heading, Icon, IconButton, Image, List, ListBox, ListItem, Stack, Text, ToggleButton, TopNavigation, useToast,
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

const frontCamera: Device = { brand: "Arlo", name: "Front camera", room: "Porch" };
const cameraEvents: { id: string; title: string; time: string; type: string; icon: IconName }[] = [
  { id: "person", title: "Person at the door", time: "08:42", type: "Person", icon: "icon-user-line" },
  { id: "package", title: "Package delivered", time: "07:15", type: "Package", icon: "icon-package-line" },
  { id: "motion", title: "Motion in the yard", time: "06:58", type: "Motion", icon: "icon-activity-line" },
];

/** F7 · Camera (Figma 15991:10327): the Arlo camera on Mai Anh's porch, a device screen of her smart-home app.
 *  Pattern/AppShell/Mobile · Top=Bar · Bottom=None on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function FrontCamera({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [on, setOn] = useState(true);
  const [talking, setTalking] = useState(false);
  const [recording, setRecording] = useState(false);
  const eventsId = useId();
  return (
    // Figma Top-Navigation/Mobile Type=Transparent: Back and More on the Canvas, and the Expand-Heading (the brand as
    // Capline over the device's name, its room as Subheading); then the status and the device's sections 32 apart.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label={frontCamera.name} largeTitle={frontCamera.name} largeTitleCapline={frontCamera.brand} largeTitleSubheading={frontCamera.room}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: `Back to ${frontCamera.room}` }) }}
        trailing={[{ icon: "icon-dots-vertical-line", label: `More for ${frontCamera.name}`, onClick: () => toast({ title: frontCamera.name, children: "Rename it, move it to another room or remove it." }) }]} />}
    >
      <Stack gap="xl">
        <DeviceStatus device={frontCamera} on={on} onPowerChange={(next) => { setOn(next); setTalking(false); setRecording(false); toast({ title: next ? "Front camera on" : "Privacy mode on", children: next ? "Live view and motion alerts are back." : "The camera stops seeing and recording." }); }}
          value={on ? "Live" : "Off"} caption={on ? "1080p · motion 2 min ago" : "Privacy mode · not recording"} />
        {/* The live porch view (Figma Live-View, Corner-Radius/3XLarge) with the LIVE Badge in its padded corner Wrapper. */}
        <Box>
          <Image src={photos.devices.porchCamera.src} alt="Live view of the porch and the front door" ratio={350 / 180} radius="3xl" />
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
      </Stack>
    </AppShell>
  );
}
