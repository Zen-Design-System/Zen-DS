import { useId, type RefObject } from "react";
import { AppShell, BarList, ChartCard, GaugeChart, Heading, Stack, TopNavigation } from "@zen-ds/react";

/** The studio's quarter on a phone: the Utilisation and Top clients widgets, one a row under a section heading. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function StudioWidgets({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const headingId = useId();
  return (
    // Phone screens are Canvas/Default: the widgets stay flat, the bar takes the canvas (alt). The section heading (h2,
    // Heading/4) sits between the large title (h1) and the widgets' card titles (h3, Heading/Subheading), never smaller.
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Studio" largeTitle="Studio" />}>
      <Stack as="section" gap="md" aria-labelledby={headingId}>
        <Heading level={2} id={headingId} textStyle="Heading/4">This quarter</Heading>
        <ChartCard title="Utilisation" metricLabel="Billable share of logged hours, September" value="5,900 of 7,564 h">
          <GaugeChart aria-label="Billable share of logged hours against the 85% target, September 2026" value={5900} max={7564} target={6429} actualLabel="Billable" />
        </ChartCard>
        <ChartCard title="Top clients" metricLabel="Revenue in Q3 2026" value="$296,800">
          <BarList aria-label="Revenue by client, Q3 2026" headers={{ label: "Client", value: "Revenue" }} format={(value) => `$${value.toLocaleString("en-US")}`}
            data={[
              { label: "Lumen Bank", value: 89000 }, { label: "Phin & Co", value: 68300 }, { label: "Mekong Freight", value: 53400 },
              { label: "Hanoi Book Fair", value: 50500 }, { label: "Other clients", value: 35600 },
            ]} />
        </ChartCard>
      </Stack>
    </AppShell>
  );
}
