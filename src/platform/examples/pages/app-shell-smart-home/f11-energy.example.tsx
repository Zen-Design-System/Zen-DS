import { useState, type RefObject } from "react";
import {
  AppShell, ChartCard, DockIcon, Icon, LineChart, List, Stack, Text, ToggleListItem, TopNavigation, useToast,
  type DockIconTheme, type IconName,
} from "@zen-ds/react";

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

/** F11 · Energy (Figma 15991:10495): what uses the power in Mai Anh's home, a screen of her smart-home app.
 *  Pattern/AppShell/Mobile · Top=Bar · Bottom=None on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function Energy({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [rangeId, setRangeId] = useState<EnergyRange>("week");
  const [plugsOn, setPlugsOn] = useState<Record<string, boolean>>({ washer: true, fridge: true });
  const range = energyRanges.find((item) => item.id === rangeId) ?? energyRanges[1];
  return (
    // Bar + None on Canvas/Default: today's usage as one big kWh number with the change against yesterday, the chart
    // card (Day / Week / Month Segmented, this period against the last as Multi-Line-Chart), then the smart plugs.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label="Energy" topBar largeTitle="Energy" largeTitleCapline="Today"
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
      <Stack as="section" aria-label="Smart plugs">
        <List aria-label="Smart plugs">
          {plugs.map((plug) => (
            <ToggleListItem key={plug.id} title={plug.title} caption={plugsOn[plug.id] ? plug.watts : "Off · 0 W"} toggleSize="lg" checked={plugsOn[plug.id]}
              onCheckedChange={(next) => { setPlugsOn((value) => ({ ...value, [plug.id]: next })); if (!next) toast({ title: `${plug.title} plug off`, children: plug.offNote, action: { label: "Undo", onClick: () => setPlugsOn((value) => ({ ...value, [plug.id]: true })) } }); }}
              leading={<DockIcon size="md" icon={plug.icon} theme={plug.theme} background="subtle" />} />
          ))}
        </List>
      </Stack>
    </AppShell>
  );
}
