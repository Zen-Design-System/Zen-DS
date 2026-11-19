import { useState, type RefObject } from "react";
import { ActionBar, AppShell, Checkbox, FormFieldset, Stack, Text, TopNavigation, plural, useToast } from "@zen-ds/react";
import { formatBytes } from "../../data";

// Every project Alex can open in the Zen app, by name: long enough that the large title folds as the list scrolls.
const offlineProjects = [
  { id: "lumen-report", name: "Annual report 2026", client: "Lumen Bank", bytes: 640_000_000 },
  { id: "bookfair-site", name: "Book Fair 2026 website", client: "Hanoi Book Fair", bytes: 2_100_000_000 },
  { id: "saola-brand", name: "Brand refresh", client: "Saola Outdoor", bytes: 1_120_000_000 },
  { id: "lumen-cards", name: "Card controls", client: "Lumen Bank", bytes: 310_000_000 },
  { id: "mekong-driver", name: "Driver app", client: "Mekong Freight", bytes: 520_000_000 },
  { id: "dizai-handbook", name: "Hiring handbook", client: "Đìzai Studio", bytes: 95_000_000 },
  { id: "phin-loyalty", name: "Loyalty app", client: "Phin & Co", bytes: 820_000_000 },
  { id: "phin-menu", name: "Menu boards", client: "Phin & Co", bytes: 1_700_000_000 },
  { id: "lumen-banking", name: "Online banking redesign", client: "Lumen Bank", bytes: 1_460_000_000 },
  { id: "mekong-tracking", name: "Shipment tracking", client: "Mekong Freight", bytes: 240_000_000 },
  { id: "phin-packaging", name: "Store packaging", client: "Phin & Co", bytes: 960_000_000 },
  { id: "dizai-site", name: "Studio website", client: "Đìzai Studio", bytes: 430_000_000 },
  { id: "bookfair-kiosk", name: "Ticketing kiosk", client: "Hanoi Book Fair", bytes: 280_000_000 },
  { id: "saola-trails", name: "Trail map app", client: "Saola Outdoor", bytes: 700_000_000 },
  { id: "zen-ds", name: "Zen design system", client: "Đìzai Studio", bytes: 380_000_000 },
];

/** The Zen app's Downloads screen: a phone list with the mark on the right. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function OfflineProjects({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [picked, setPicked] = useState(["phin-loyalty", "zen-ds"]);
  const bytes = offlineProjects.filter((item) => picked.includes(item.id)).reduce((sum, item) => sum + item.bytes, 0);
  const toggle = (id: string, on: boolean) => setPicked((list) => (on ? [...list, id] : list.filter((item) => item !== id)));
  return (
    // A tab root: the large title folds into the bar as the list runs under it.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Downloads" largeTitle="Downloads" />}
      // The Primary waits for a choice, and the summary says why.
      actionBar={(
        <ActionBar
          summary={<Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{picked.length ? `Uses ${formatBytes(bytes)} · 18.6 GB free on this phone` : "Choose the projects to keep on this phone"}</Text>}
          primaryAction={{ label: picked.length ? `Download ${plural(picked.length, "project")}` : "Download projects", disabled: !picked.length,
            onClick: () => toast({ title: `${plural(picked.length, "project")} saved for offline` }) }} />
      )}
    >
      <Stack gap="md">
        <Text tone="base">Projects you download open without a connection, on a site visit or a flight.</Text>
        <FormFieldset kind="checkbox" legend="Projects">
          {/* The rows fill the width (a Stack stretches them), so the right-hand marks line up and the whole row is the tap target. */}
          <Stack gap="sm">
            {offlineProjects.map((item) => (
              <Checkbox key={item.id} checkSide="right" label={item.name} caption={`${item.client} · ${formatBytes(item.bytes)}`}
                checked={picked.includes(item.id)} onCheckedChange={(on) => toggle(item.id, on)} bold />
            ))}
          </Stack>
        </FormFieldset>
      </Stack>
    </AppShell>
  );
}
