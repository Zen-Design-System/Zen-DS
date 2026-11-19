import { useState } from "react";
import { Box, Segmented, Shape, Stack, Text } from "@zen-ds/react";

/** The Phin & Co tasting table on Saturday, Nov 2: four seats around it, one already taken. */
const seats = [
  { id: "1", x: 80, y: 6, taken: false },
  { id: "2", x: 128, y: 6, taken: true },
  { id: "3", x: 80, y: 110, taken: false },
  { id: "4", x: 128, y: 110, taken: false },
];
type Seat = (typeof seats)[number];
type SeatState = "free" | "taken" | "yours";
/** Free seats are filled, taken ones only outlined, yours Accent: the form differs, not only the hue. */
const seatPaint = {
  free: { fill: "positive-subtle", stroke: "none", tone: "positive-strongest" },
  taken: { fill: "none", stroke: "neutral-subtle", tone: "light" },
  yours: { fill: "accent-solid", stroke: "none", tone: "on-accent" },
} as const;

/** A seat map whose marks carry names: each seat is a labelled Shape, the seats are picked with real buttons. */
export default function SeatPicker() {
  const [mine, setMine] = useState("1");
  const stateOf = (seat: Seat): SeatState => (seat.taken ? "taken" : seat.id === mine ? "yours" : "free");
  return (
    <Stack gap="md">
      <Box width={240} height={148} surface="surface-alt" radius="md">
        <Shape position="absolute" insetLeft={60} insetTop={44} width={120} height={60} radius="lg" fill="support-brown-subtle" />
        {seats.map((seat) => {
          const state = stateOf(seat);
          return (
            <Stack key={seat.id} position="absolute" insetLeft={seat.x} insetTop={seat.y} width={32} height={32} align="center" justify="center">
              <Shape type="ellipse" position="absolute" width="fill" height="fill" fill={seatPaint[state].fill} stroke={seatPaint[state].stroke} label={`Seat ${seat.id}, ${state === "yours" ? "your seat" : state}`} />
              {/* The number repeats the Shape's label, so it is hidden from assistive tech. */}
              <Text textStyle="Caption/Medium" tone={seatPaint[state].tone} aria-hidden>{seat.id}</Text>
            </Stack>
          );
        })}
      </Box>
      <Segmented aria-label="Choose a seat" value={mine} onValueChange={setMine}
        options={seats.map((seat) => ({ id: seat.id, label: seat.id, "aria-label": `Seat ${seat.id}${seat.taken ? ", taken" : ""}`, disabled: seat.taken }))} />
      <Text role="status" tone="base">Seat {mine} is yours · Sat, Nov 2 · 10:00</Text>
    </Stack>
  );
}
