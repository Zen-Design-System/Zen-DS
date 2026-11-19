import { useId, useState, type RefObject } from "react";
import {
  AppShell, BottomNavigation, Button, Card, DockIcon, Grid, Heading, List, Stack, Text, ToggleListItem, TopNavigation, useToast,
  type BottomNavigationItem, type DockIconTheme, type IconName,
} from "@zen-ds/react";

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

/** F12 · Scenes (Figma 15991:10537): one tap for many devices, a root of Mai Anh's smart-home app.
 *  Pattern/AppShell/Mobile · Top=Bar · Bottom=Tab-Bar on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function Scenes({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("scenes");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(automations.map((item) => [item.id, item.on])));
  const automationsId = useId();
  return (
    // Bar + Tab-Bar on Canvas/Default: a root, so the large title holds the screen's one action (New scene); the scenes
    // as a 2 × 2 grid of Shadow cards with their device count and a Run button, then the automations.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" largeTitle="Scenes" largeTitleSubheading="One tap for many devices"
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
                <Text textStyle="Caption/Regular" tone="light">{scene.devices}</Text>
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
        <List aria-labelledby={automationsId}>
          {automations.map((item) => (
            <ToggleListItem key={item.id} title={item.title} caption={item.caption} toggleSize="lg" checked={enabled[item.id]}
              onCheckedChange={(next) => setEnabled((value) => ({ ...value, [item.id]: next }))}
              leading={<DockIcon size="md" icon={item.icon} theme="neutral" background="subtle" />} />
          ))}
        </List>
      </Stack>
    </AppShell>
  );
}
