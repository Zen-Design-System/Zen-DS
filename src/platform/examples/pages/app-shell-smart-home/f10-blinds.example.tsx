import { useState, type RefObject } from "react";
import { AppShell, Button, DockIcon, Image, List, SliderField, Stack, Text, ToggleListItem, TopNavigation, useToast } from "@zen-ds/react";
import { photos } from "../../data";

function blindsStatus(level: number, sunrise: boolean, sunset: boolean) {
  const state = level === 0 ? "Closed" : level === 100 ? "Fully open" : "Open";
  if (level > 0 && sunset) return `${state} · closes at sunset`;
  if (level === 0 && sunrise) return `${state} · opens at sunrise`;
  return state;
}

/** F10 · Blinds (Figma 15991:10453): the Somfy roller blind in Mai Anh's bedroom, opened by percent, a device screen of
 *  her smart-home app. Pattern/AppShell/Mobile · Top=Bar · Bottom=None on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function Blinds({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [level, setLevel] = useState(80);
  const [sunrise, setSunrise] = useState(true);
  const [sunset, setSunset] = useState(true);
  const move = (next: number, verb: string) => { setLevel(next); toast({ title: `Bedroom blinds ${verb}`, children: `${next}% open` }); };
  return (
    // Bar + None on Canvas/Default: the open level as Display/3 over the window photo, the Accent open-level slider,
    // Open / Stop / Close as three equal Tertiary buttons, and the sunrise and sunset automations as switch rows.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label="Bedroom blinds" topBar
        largeTitle="Bedroom blinds" largeTitleCapline="Somfy" largeTitleSubheading="Bedroom"
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Bedroom" }) }}
        trailing={[{ icon: "icon-dots-vertical-line", label: "More for Bedroom blinds", onClick: () => toast({ title: "Bedroom blinds", children: "Calibrate, rename or remove them." }) }]} />}
    >
      <Stack gap="none">
        <Text as="p" textStyle="Display/3" tabularNumbers>{level}%</Text>
        <Text textStyle="Body/Small/Regular" tone="base" aria-live="polite">{blindsStatus(level, sunrise, sunset)}</Text>
      </Stack>
      {/* Figma Device: the bedroom window with its roller blind, 350 × 168 with Corner-Radius/3XLarge. */}
      <Image src={photos.devices.rollerBlind.src} alt={photos.devices.rollerBlind.alt} ratio={350 / 168} radius="3xl" />
      <SliderField label="Open level" theme="accent" value={level} onValueChange={setLevel} step={5} formatValue={(value) => `${value}%`} />
      <Stack direction="row" gap="sm" fillChildren>
        <Button level="tertiary" onClick={() => move(100, "opening")}>Open</Button>
        <Button level="tertiary" onClick={() => toast({ title: "Bedroom blinds stopped", children: `Held at ${level}% open` })}>Stop</Button>
        <Button level="tertiary" onClick={() => move(0, "closing")}>Close</Button>
      </Stack>
      <Stack as="section" aria-label="Automations">
        <List aria-label="Sunrise and sunset automations">
          <ToggleListItem title="Open at sunrise" caption="06:10 · weekdays" toggleSize="lg" checked={sunrise} onCheckedChange={setSunrise}
            leading={<DockIcon size="md" icon="icon-sunrise-line" theme="neutral" background="subtle" />} />
          <ToggleListItem title="Close at sunset" caption="17:45 · every day" toggleSize="lg" checked={sunset} onCheckedChange={setSunset}
            leading={<DockIcon size="md" icon="icon-sunset-line" theme="neutral" background="subtle" />} />
        </List>
      </Stack>
    </AppShell>
  );
}
