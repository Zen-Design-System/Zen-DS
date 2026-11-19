import { useState } from "react";
import { Grid, MetricCard, Segmented, Stack } from "@zen-ds/react";

type TileColor = "neutral" | "accent" | "yellow";
const tileColors: { id: TileColor; label: string }[] = [{ id: "neutral", label: "Neutral" }, { id: "accent", label: "Accent" }, { id: "yellow", label: "Yellow" }];

/** Stat tiles: one Solid stand-out among Flat tiles; its content follows the fill (Inverse, On-Accent, On-Color, On-Bright). */
export default function StandOutTiles() {
  const [color, setColor] = useState<TileColor>("neutral");
  return (
    <Stack gap="md">
      <Segmented aria-label="Stand-out colour" value={color} onValueChange={(id) => setColor(id as TileColor)} options={tileColors} />
      <Grid columns="repeat(auto-fit, minmax(min(100%, 160px), 1fr))" gap="md">
        <MetricCard type="tile" theme="solid" color={color} label="Overdue" value="$12,880" icon="icon-alarm-clock-line"
          trend={{ direction: "negative", label: "+1", subLabel: "invoice" }} />
        <MetricCard type="tile" theme="default" label="Collected" value="$88,300" icon="icon-wallet-02-line"
          trend={{ direction: "negative", label: "8%", subLabel: "vs. August" }} />
        <MetricCard type="tile" theme="default" label="Hours logged" value="1,284 h" icon="icon-clock-line"
          trend={{ direction: "positive", label: "13%", subLabel: "vs. August" }} />
      </Grid>
    </Stack>
  );
}
