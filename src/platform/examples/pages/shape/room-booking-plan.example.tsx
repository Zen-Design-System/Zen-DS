import { Badge, Box, Shape, Stack, Text } from "@zen-ds/react";

/** The Hanoi studio's meeting rooms on Wednesday, Sep 30 (free or booked at 10:30). */
const rooms = [
  { id: "a", name: "Sen", x: 16, y: 16, w: 120, h: 84, booked: false },
  { id: "b", name: "Mai", x: 144, y: 16, w: 96, h: 84, booked: true },
  { id: "c", name: "Lotus lounge", x: 16, y: 108, w: 224, h: 72, booked: false },
];

/** Each room is a rectangle at its place on the plan, filled by status and labelled for assistive tech. */
export default function RoomBookingPlan() {
  return (
    <Stack gap="sm">
      <Box width={256} height={196} surface="surface-alt" radius="md">
        {rooms.map((room) => (
          <Stack key={room.id} position="absolute" insetLeft={room.x} insetTop={room.y} width={room.w} height={room.h} align="center" justify="center">
            <Shape position="absolute" width="fill" height="fill" fill={room.booked ? "negative-subtle" : "positive-subtle"} stroke={room.booked ? "negative-subtle" : "positive-subtle"} label={`${room.name}, ${room.booked ? "booked" : "free"}`} />
            <Text textStyle="Caption/Medium" tone={room.booked ? "negative-strongest" : "positive-strongest"}>{room.name}</Text>
          </Stack>
        ))}
      </Box>
      <Stack direction="row" gap="2xs">
        <Badge background="subtle" theme="green">Free</Badge>
        <Badge background="subtle" theme="red">Booked</Badge>
      </Stack>
    </Stack>
  );
}
