import { useState, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Box, Stack } from "../../../components/Layout";
import { Segmented } from "../../../components/Segmented";
import { Shape } from "../../../components/Shape";
import { Heading, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { keepOnHotUpdate } from "../../hotData";
import type { PlatformPage } from "../../PlatformExamples";
import { PlatformPhone } from "../../PlatformPhone";
import { studio } from "../data";
import santorini from "../../../assets/media/site-santorini.webp";
import type { ExampleDef } from "../types";

export const page: PlatformPage = "shape";

/* Shapes as a Zen Studio designer draws them with R, O, L, ⇧L, Polygon, Star, the Pen and the Pencil: decoration and marks in a free frame
   (a Box with a size: each Shape at its X / Y, px insets), coloured with tokens only. Data stays in the components that
   carry values (charts, progress, rating). */

/** The Hanoi studio's meeting rooms on Wednesday, Sep 30 (free or booked at 10:30). */
const rooms = [
  { id: "a", name: "Sen", x: 16, y: 16, w: 120, h: 84, booked: false },
  { id: "b", name: "Mai", x: 144, y: 16, w: 96, h: 84, booked: true },
  { id: "c", name: "Lotus lounge", x: 16, y: 108, w: 224, h: 72, booked: false },
];

/** The welcome card: copy, an action, and its decoration in a free frame beside them. */
function WelcomeCard() {
  const { toast } = useToast();
  return (
    <Card theme="default">
      <Stack direction="row" gap="lg" align="center" wrap>
        <Stack gap="xs" width="fill" minWidth={200}>
          <Heading level={3} textStyle="Heading/4">Welcome to {studio.name}</Heading>
          <Text tone="base">Your workspace is ready. Invite the team to start.</Text>
          <Button size="sm" onClick={() => toast({ title: "Invite link copied", children: `${studio.domain}/join` })}>Invite people</Button>
        </Stack>
        <Box width={160} height={120}>
          <Shape type="ellipse" position="absolute" insetLeft={24} insetTop={8} width={96} height={96} arcRatio={60} fill="accent-solid" />
          <Shape type="ellipse" position="absolute" insetLeft={88} insetTop={56} width={64} height={64} arcStart={180} arcSweep={50} fill="support-yellow-solid" />
          <Shape type="star" position="absolute" insetLeft={4} insetTop={72} width={40} height={40} fill="support-sky-solid" />
        </Box>
      </Stack>
    </Card>
  );
}

/** A product tour tip: the text, the arrow drawn to the button, the button. */
function TourTip() {
  const { toast } = useToast();
  return (
    <Box width={256} height={150} surface="surface" radius="lg">
      <Box position="absolute" insetLeft={16} insetTop={16}><Text>Scan a receipt to add it</Text></Box>
      <Shape type="arrow" position="absolute" insetLeft={80} insetTop={74} width={76} rotation={-40} strokeWeight={2} stroke="accent-solid" />
      <Box position="absolute" insetLeft={152} insetTop={98}><Button size="sm" startIcon="icon-scan-line" onClick={() => toast({ title: "Camera opened", children: "Point it at the receipt" })}>Scan</Button></Box>
    </Box>
  );
}

/** The Phin & Co tasting table on Saturday, Nov 2: four seats around it, one already taken. */
const seats = [
  { id: "1", x: 80, y: 6, taken: false },
  { id: "2", x: 128, y: 6, taken: true },
  { id: "3", x: 80, y: 110, taken: false },
  { id: "4", x: 128, y: 110, taken: false },
];
type SeatState = "free" | "taken" | "yours";
/** Free seats are filled, taken ones only outlined, yours Accent: the form differs, not only the hue. */
const seatPaint = {
  free: { fill: "positive-subtle", stroke: "none", tone: "positive-strongest" },
  taken: { fill: "none", stroke: "neutral-subtle", tone: "light" },
  yours: { fill: "accent-solid", stroke: "none", tone: "on-accent" },
} as const;

/** A seat map whose marks carry names: each seat is a labelled Shape, the seats are picked with real buttons. */
function SeatPicker() {
  const [mine, setMine] = useState("1");
  const stateOf = (seat: (typeof seats)[number]): SeatState => (seat.taken ? "taken" : seat.id === mine ? "yours" : "free");
  return (
    <Stack gap="md">
      <Box width={240} height={148} surface="surface-alt" radius="md">
        <Shape position="absolute" insetLeft={60} insetTop={44} width={120} height={60} radius="lg" fill="support-brown-subtle" />
        {seats.map((seat) => {
          const state = stateOf(seat);
          return (
            <Stack key={seat.id} position="absolute" insetLeft={seat.x} insetTop={seat.y} width={32} height={32} align="center" justify="center">
              <Shape type="ellipse" position="absolute" width="fill" height="fill" fill={seatPaint[state].fill} stroke={seatPaint[state].stroke} label={`Seat ${seat.id}, ${state === "yours" ? "your seat" : state}`} />
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

/** The three onboarding screens of the Phin & Co app. */
const tour = [
  { title: "Collect stamps", body: "Every drink adds a stamp to your card." },
  { title: "Earn a free drink", body: "Ten stamps make a free drink, any size." },
  { title: "Order ahead", body: "Skip the line at Nguyen Hue and Thao Dien." },
];

/** Each screen's art: shapes at their X / Y in one 240 × 200 free frame, Accent leading, Support colours beside. */
function TourArt({ step }: { step: number }) {
  return (
    <Box width={240} height={200}>
      {step === 0 && <>
        <Shape type="ellipse" position="absolute" insetLeft={40} insetTop={20} width={160} height={160} arcStart={135} arcSweep={75} arcRatio={82} fill="accent-solid" />
        <Shape type="ellipse" position="absolute" insetLeft={64} insetTop={44} width={112} height={112} arcStart={315} arcSweep={50} arcRatio={70} fill="accent-subtle" />
        <Shape type="ellipse" position="absolute" insetLeft={96} insetTop={76} width={48} height={48} fill="support-brown-solid" />
      </>}
      {step === 1 && <>
        <Shape type="star" position="absolute" insetLeft={40} insetTop={20} width={160} height={160} pointCount={12} starRatio={80} fill="accent-subtle" />
        <Shape type="ellipse" position="absolute" insetLeft={84} insetTop={64} width={72} height={72} fill="accent-solid" />
        <Shape type="star" position="absolute" insetLeft={176} insetTop={8} width={40} height={40} fill="support-yellow-solid" />
      </>}
      {step === 2 && <>
        <Shape position="absolute" insetLeft={68} insetTop={20} width={104} height={160} radius="xl" fill="accent-subtle" />
        <Shape type="ellipse" position="absolute" insetLeft={96} insetTop={76} width={48} height={48} fill="accent-solid" />
        <Shape type="arrow" position="absolute" insetLeft={12} insetTop={100} width={48} strokeWeight={3} stroke="support-sky-solid" />
      </>}
    </Box>
  );
}

/** Onboarding on a phone: the art changes per screen, Next / Skip in the footer, Back in the bar. */
function OnboardingPhone() {
  const [step, setStep] = useState(0);
  const { toast } = useToast();
  const last = step === tour.length - 1;
  const finish = () => { toast({ title: "Welcome to Phin & Co", children: "Your stamp card is ready" }); setStep(0); };
  return (
    <PlatformPhone label="Phin & Co onboarding"
      header={<TopNavigation type="compact-alt" title="Welcome"
        leading={step > 0 ? { icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setStep(step - 1) } : undefined} />}
      footer={<ActionBar position="static"
        primaryAction={last ? { label: "Start collecting", onClick: finish } : { label: "Next", onClick: () => setStep(step + 1) }}
        secondaryAction={last ? undefined : { label: "Skip", onClick: () => setStep(tour.length - 1) }} />}>
      <Stack gap="xl" padding="lg" align="center" justify="center" height="fill">
        <TourArt step={step} />
        <Stack gap="xs" align="center">
          <Text role="status" textStyle="Body/Small/Medium" tone="light">{step + 1} of {tour.length}</Text>
          <Heading level={2} textStyle="Heading/2" align="center">{tour[step].title}</Heading>
          <Text tone="base" align="center">{tour[step].body}</Text>
        </Stack>
      </Stack>
    </PlatformPhone>
  );
}

/** One cell of the limits row: the layer's 72 × 72 box outlined, the shape in it, its setting below. */
function Limit({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <Stack gap="xs" align="center">
      <Box width={72} height={72}>
        <Shape position="absolute" insetLeft={0} insetTop={0} width={72} height={72} fill="none" stroke="neutral-subtle" />
        {children}
      </Box>
      <Text textStyle="Caption/Medium" tone="base">{caption}</Text>
    </Stack>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Welcome card art",
    description: "Decoration drawn in a free frame beside the copy: a ring, a half pie and a star at their X / Y, in Accent and Support colours. They are decorative, so they carry no label.",
    code: `<Card theme="default">
  <Stack direction="row" gap="lg" align="center" wrap>
    <Stack gap="xs" width="fill" minWidth={200}>
      <Heading level={3} textStyle="Heading/4">Welcome to ${studio.name}</Heading>
      <Text tone="base">Your workspace is ready. Invite the team to start.</Text>
      <Button size="sm" onClick={() => toast({ title: "Invite link copied" })}>Invite people</Button>
    </Stack>
    <Box width={160} height={120}>
      <Shape type="ellipse" position="absolute" insetLeft={24} insetTop={8} width={96} height={96} arcRatio={60} fill="accent-solid" />
      <Shape type="ellipse" position="absolute" insetLeft={88} insetTop={56} width={64} height={64} arcStart={180} arcSweep={50} fill="support-yellow-solid" />
      <Shape type="star" position="absolute" insetLeft={4} insetTop={72} width={40} height={40} fill="support-sky-solid" />
    </Box>
  </Stack>
</Card>`,
    render: () => <WelcomeCard />,
  },
  {
    title: "A splash mark from arcs",
    description: "Two ring segments (an ellipse arc each: Start, Sweep, Ratio) turned around a full circle make the Phin & Co loyalty app's splash mark. Drag the arc handles in Zen Studio to shape them.",
    code: `<Box width={120} height={120}>
  <Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={120} height={120} arcStart={135} arcSweep={75} arcRatio={82} fill="support-orange-solid" />
  <Shape type="ellipse" position="absolute" insetLeft={18} insetTop={18} width={84} height={84} arcStart={315} arcSweep={50} arcRatio={70} fill="support-orange-rich" />
  <Shape type="ellipse" position="absolute" insetLeft={40} insetTop={40} width={40} height={40} fill="support-brown-solid" />
</Box>`,
    render: () => (
      <Stack direction="row" gap="lg" align="center">
        <Box width={120} height={120}>
          <Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={120} height={120} arcStart={135} arcSweep={75} arcRatio={82} fill="support-orange-solid" />
          <Shape type="ellipse" position="absolute" insetLeft={18} insetTop={18} width={84} height={84} arcStart={315} arcSweep={50} arcRatio={70} fill="support-orange-rich" />
          <Shape type="ellipse" position="absolute" insetLeft={40} insetTop={40} width={40} height={40} fill="support-brown-solid" />
        </Box>
        <Stack gap="2xs">
          <Text textStyle="Body/Base/Bold">Phin & Co</Text>
          <Text tone="base">Loyalty app splash</Text>
        </Stack>
      </Stack>
    ),
  },
  {
    title: "Room booking plan",
    description: "The Hanoi studio's rooms as rectangles at their place on the plan, filled by status (Positive free, Negative booked); each room is labelled for assistive tech and named on the plan.",
    code: `<Box width={256} height={196} surface="surface-alt" radius="md">
  {rooms.map((room) => (
    <Stack key={room.id} position="absolute" insetLeft={room.x} insetTop={room.y} width={room.w} height={room.h} align="center" justify="center">
      <Shape position="absolute" width="fill" height="fill" fill={room.booked ? "negative-subtle" : "positive-subtle"}
        stroke={room.booked ? "negative-subtle" : "positive-subtle"} label={\`\${room.name}, \${room.booked ? "booked" : "free"}\`} />
      <Text textStyle="Caption/Medium" tone={room.booked ? "negative-strongest" : "positive-strongest"}>{room.name}</Text>
    </Stack>
  ))}
</Box>`,
    render: () => (
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
    ),
  },
  {
    title: "Arrow callout in a product tour",
    description: "An Arrow (⇧L) drawn from the tip text to the button it explains; its angle is its rotation and its length its width, as Figma stores a line.",
    code: `<Box width={256} height={150} surface="surface" radius="lg">
  <Box position="absolute" insetLeft={16} insetTop={16}><Text>Scan a receipt to add it</Text></Box>
  <Shape type="arrow" position="absolute" insetLeft={80} insetTop={74} width={76} rotation={-40} strokeWeight={2} stroke="accent-solid" />
  <Box position="absolute" insetLeft={152} insetTop={98}><Button size="sm" startIcon="icon-scan-line" onClick={scan}>Scan</Button></Box>
</Box>`,
    render: () => <TourTip />,
  },
  {
    title: "Promo star on a menu item",
    description: "A Star behind the discount on the Phin & Co menu: decoration on a Subtle fill under Strongest text, so the price stays readable and the star carries no meaning on its own.",
    code: `<Card theme="default">
  <Stack direction="row" gap="md" align="center">
    <Stack width={64} height={64} align="center" justify="center">
      <Shape type="star" position="absolute" pointCount={12} starRatio={80} width="fill" height="fill" fill="support-yellow-subtle" />
      <Text textStyle="Body/Small/Bold">−20%</Text>
    </Stack>
    <Stack gap="2xs">
      <Text textStyle="Body/Base/Bold">Cà phê muối</Text>
      <Text tone="base">$3.00 · $2.40 today</Text>
    </Stack>
  </Stack>
</Card>`,
    render: () => (
      <Card theme="default">
        <Stack direction="row" gap="md" align="center">
          <Stack width={64} height={64} align="center" justify="center">
            <Shape type="star" position="absolute" pointCount={12} starRatio={80} width="fill" height="fill" fill="support-yellow-subtle" />
            <Text textStyle="Body/Small/Bold">−20%</Text>
          </Stack>
          <Stack gap="2xs">
            <Text textStyle="Body/Base/Bold">Cà phê muối</Text>
            <Text tone="base">$3.00 · $2.40 today</Text>
          </Stack>
        </Stack>
      </Card>
    ),
  },
  {
    title: "Hand-drawn underline (Pencil)",
    description: "A Pencil (⇧P) stroke under a headline: a vector whose path is drawn in its own box (viewBox) and stretched to its width, stroked with a token and no fill, as Figma's Pencil draws it.",
    code: `<Stack gap="2xs">
  <Heading level={3} textStyle="Heading/4">Brew the perfect phin</Heading>
  <Shape type="vector" width={220} height={12} d="M 0 8 C 40 2 80 2 120 6 C 150 9 185 10 220 4" viewBox="0 0 220 12" strokeWeight={3} stroke="accent-solid" />
</Stack>`,
    render: () => (
      <Stack gap="2xs">
        <Heading level={3} textStyle="Heading/4">Brew the perfect phin</Heading>
        <Shape type="vector" width={220} height={12} d="M 0 8 C 40 2 80 2 120 6 C 150 9 185 10 220 4" viewBox="0 0 220 12" strokeWeight={3} stroke="accent-solid" />
      </Stack>
    ),
  },
  {
    title: "A ticket stub (Subtract)",
    description: "A boolean group (⌥⇧S): a rounded rectangle minus two circles at its edges. The shapes stay editable inside it; Zen Studio writes their combined outline as its d, which the page draws. The text sits beside it in the frame.",
    code: `<Box width={240} height={96}>
  <Shape type="boolean" operation="subtract" position="absolute" insetLeft={0} insetTop={0} width={240} height={96} d="M 228 0 L 12 0 C 5.373 0 0 5.373 0 12 L 0 36 C 6.627 36 12 41.373 12 48 C 12 54.627 6.627 60 0 60 L 0 84 C 0 90.627 5.373 96 12 96 L 228 96 C 234.627 96 240 90.627 240 84 L 240 60 C 233.373 60 228 54.627 228 48 C 228 41.373 233.373 36 240 36 L 240 12 C 240 5.373 234.627 0 228 0 Z" viewBox="0 0 240 96" fillRule="evenodd" fill="support-orange-subtle">
    <Shape type="rectangle" position="absolute" insetLeft={0} insetTop={0} width={240} height={96} radius="md" />
    <Shape type="ellipse" position="absolute" insetLeft={-12} insetTop={36} width={24} height={24} />
    <Shape type="ellipse" position="absolute" insetLeft={228} insetTop={36} width={24} height={24} />
  </Shape>
  <Box position="absolute" insetLeft={24} insetTop={20}><Stack gap="2xs"><Text textStyle="Body/Small/Bold">Phin & Co tasting</Text><Text tone="base">Sat, Nov 2 · 10:00</Text></Stack></Box>
</Box>`,
    render: () => (
      <Box width={240} height={96}>
        <Shape type="boolean" operation="subtract" position="absolute" insetLeft={0} insetTop={0} width={240} height={96} d="M 228 0 L 12 0 C 5.373 0 0 5.373 0 12 L 0 36 C 6.627 36 12 41.373 12 48 C 12 54.627 6.627 60 0 60 L 0 84 C 0 90.627 5.373 96 12 96 L 228 96 C 234.627 96 240 90.627 240 84 L 240 60 C 233.373 60 228 54.627 228 48 C 228 41.373 233.373 36 240 36 L 240 12 C 240 5.373 234.627 0 228 0 Z" viewBox="0 0 240 96" fillRule="evenodd" fill="support-orange-subtle">
          <Shape type="rectangle" position="absolute" insetLeft={0} insetTop={0} width={240} height={96} radius="md" />
          <Shape type="ellipse" position="absolute" insetLeft={-12} insetTop={36} width={24} height={24} />
          <Shape type="ellipse" position="absolute" insetLeft={228} insetTop={36} width={24} height={24} />
        </Shape>
        <Box position="absolute" insetLeft={24} insetTop={20}><Stack gap="2xs"><Text textStyle="Body/Small/Bold">Phin & Co tasting</Text><Text tone="base">Sat, Nov 2 · 10:00</Text></Stack></Box>
      </Box>
    ),
  },
  {
    title: "A logo mark drawn with the Pen",
    description: "A closed Pen path with a hole (fillRule evenodd): a filled vector at its X / Y in a free frame, beside the studio's name.",
    code: `<Stack direction="row" gap="sm" align="center">
  <Box width={40} height={40}>
    <Shape type="vector" position="absolute" insetLeft={0} insetTop={0} width={40} height={40} d="M 20 0 C 31 0 40 9 40 20 C 40 31 31 40 20 40 C 9 40 0 31 0 20 C 0 9 9 0 20 0 Z M 20 10 L 30 20 L 20 30 L 10 20 Z" viewBox="0 0 40 40" fillRule="evenodd" fill="accent-solid" stroke="none" />
  </Box>
  <Text textStyle="Body/Base/Bold">{studio.name}</Text>
</Stack>`,
    render: () => (
      <Stack direction="row" gap="sm" align="center">
        <Box width={40} height={40}>
          <Shape type="vector" position="absolute" insetLeft={0} insetTop={0} width={40} height={40} d="M 20 0 C 31 0 40 9 40 20 C 40 31 31 40 20 40 C 9 40 0 31 0 20 C 0 9 9 0 20 0 Z M 20 10 L 30 20 L 20 30 L 10 20 Z" viewBox="0 0 40 40" fillRule="evenodd" fill="accent-solid" stroke="none" />
        </Box>
        <Text textStyle="Body/Base/Bold">{studio.name}</Text>
      </Stack>
    ),
  },
  {
    title: "A trip photo in a star (Use as mask)",
    description: "A mask group (⌃⌘M): the Star is the mask and the photo above it shows only inside the star; the star itself draws nothing. The price sits beside it in the frame.",
    code: `<Stack direction="row" gap="md" align="center">
  <Box group mask width={120} height={120} role="img" aria-label="Santorini">
    <Shape type="star" position="absolute" insetLeft={0} insetTop={0} width={120} height={120} pointCount={8} starRatio={78} />
    <Box image={photo} position="absolute" insetLeft={0} insetTop={0} width={120} height={120} />
  </Box>
  <Stack gap="2xs">
    <Text textStyle="Body/Base/Bold">Santorini, 4 nights</Text>
    <Text tone="base">From $1,280</Text>
    <Text tone="base">Oct 12–16</Text>
  </Stack>
</Stack>`,
    render: () => (
      <Stack direction="row" gap="md" align="center">
        <Box group mask width={120} height={120} role="img" aria-label="Santorini">
          <Shape type="star" position="absolute" insetLeft={0} insetTop={0} width={120} height={120} pointCount={8} starRatio={78} />
          <Box image={santorini} position="absolute" insetLeft={0} insetTop={0} width={120} height={120} />
        </Box>
        <Stack gap="2xs">
          <Text textStyle="Body/Base/Bold">Santorini, 4 nights</Text>
          <Text tone="base">From $1,280</Text>
          <Text tone="base">Oct 12–16</Text>
        </Stack>
      </Stack>
    ),
  },
  {
    title: "A seat map with labelled marks",
    description: "Each seat is a Shape with a label (role img: \"Seat 1, your seat\"), so a screen reader hears the map; the number on it is hidden as a duplicate. Seats are picked with Segmented buttons (Tab, then Enter or Space); taken seats are disabled there and drawn as outlines, so the state shows in form and words, not colour alone. The status line announces the choice.",
    code: `const [mine, setMine] = useState("1");
const paint = {
  free: { fill: "positive-subtle", stroke: "none", tone: "positive-strongest" },
  taken: { fill: "none", stroke: "neutral-subtle", tone: "light" },
  yours: { fill: "accent-solid", stroke: "none", tone: "on-accent" },
} as const;

<Stack gap="md">
  <Box width={240} height={148} surface="surface-alt" radius="md">
    <Shape position="absolute" insetLeft={60} insetTop={44} width={120} height={60} radius="lg" fill="support-brown-subtle" />
    {seats.map((seat) => {
      const state = seat.taken ? "taken" : seat.id === mine ? "yours" : "free";
      return (
        <Stack key={seat.id} position="absolute" insetLeft={seat.x} insetTop={seat.y} width={32} height={32} align="center" justify="center">
          <Shape type="ellipse" position="absolute" width="fill" height="fill" fill={paint[state].fill} stroke={paint[state].stroke}
            label={\`Seat \${seat.id}, \${state === "yours" ? "your seat" : state}\`} />
          <Text textStyle="Caption/Medium" tone={paint[state].tone} aria-hidden>{seat.id}</Text>
        </Stack>
      );
    })}
  </Box>
  <Segmented aria-label="Choose a seat" value={mine} onValueChange={setMine}
    options={seats.map((seat) => ({ id: seat.id, label: seat.id, "aria-label": \`Seat \${seat.id}\${seat.taken ? ", taken" : ""}\`, disabled: seat.taken }))} />
  <Text role="status" tone="base">Seat {mine} is yours · Sat, Nov 2 · 10:00</Text>
</Stack>`,
    render: () => <SeatPicker />,
  },
  {
    title: "Arc and star at the edge of their range",
    description: "What the handles draw at their limits, each in its 72 × 72 box (outlined): Sweep 0 % draws nothing but keeps its box, so the layout holds; Ratio 96 % leaves a hairline ring; a 16-tip Star at Ratio 10 % is a thin burst, and at Ratio 0 % its fill has no area left, so only a centred stroke shows the spikes.",
    code: `<Stack direction="row" gap="lg" wrap>
  <Limit caption="Sweep 0 %">
    <Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} arcSweep={0} fill="accent-solid" />
  </Limit>
  <Limit caption="Ratio 96 %">
    <Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} arcRatio={96} fill="accent-solid" />
  </Limit>
  <Limit caption="Star, ratio 10 %">
    <Shape type="star" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} pointCount={16} starRatio={10} fill="support-yellow-solid" />
  </Limit>
  <Limit caption="Star, ratio 0 %">
    <Shape type="star" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} pointCount={16} starRatio={0}
      fill="none" stroke="support-yellow-solid" strokeWeight={2} strokeAlign="center" />
  </Limit>
</Stack>`,
    render: () => (
      <Stack direction="row" gap="lg" wrap>
        <Limit caption="Sweep 0 %">
          <Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} arcSweep={0} fill="accent-solid" />
        </Limit>
        <Limit caption="Ratio 96 %">
          <Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} arcRatio={96} fill="accent-solid" />
        </Limit>
        <Limit caption="Star, ratio 10 %">
          <Shape type="star" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} pointCount={16} starRatio={10} fill="support-yellow-solid" />
        </Limit>
        <Limit caption="Star, ratio 0 %">
          <Shape type="star" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} pointCount={16} starRatio={0} fill="none" stroke="support-yellow-solid" strokeWeight={2} strokeAlign="center" />
        </Limit>
      </Stack>
    ),
  },
  {
    title: "Onboarding art on a phone",
    description: "Three onboarding screens of the Phin & Co app, each with its own art drawn as shapes in a 240 × 200 free frame (Accent leads, a Support colour beside it). Tap Next or Skip in the footer, Back in the bar; Start collecting welcomes you and starts over. The art is decorative, so the words carry the screen.",
    code: `const [step, setStep] = useState(0);
const last = step === tour.length - 1;

<PlatformPhone
  header={<TopNavigation type="compact-alt" title="Welcome"
    leading={step > 0 ? { icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setStep(step - 1) } : undefined} />}
  footer={<ActionBar position="static"
    primaryAction={last ? { label: "Start collecting", onClick: finish } : { label: "Next", onClick: () => setStep(step + 1) }}
    secondaryAction={last ? undefined : { label: "Skip", onClick: () => setStep(tour.length - 1) }} />}>
  <Stack gap="xl" padding="lg" align="center" justify="center" height="fill">
    <Box width={240} height={200}>
      {/* step 1: a ring segment, an inner arc and a centre dot */}
      <Shape type="ellipse" position="absolute" insetLeft={40} insetTop={20} width={160} height={160} arcStart={135} arcSweep={75} arcRatio={82} fill="accent-solid" />
      <Shape type="ellipse" position="absolute" insetLeft={64} insetTop={44} width={112} height={112} arcStart={315} arcSweep={50} arcRatio={70} fill="accent-subtle" />
      <Shape type="ellipse" position="absolute" insetLeft={96} insetTop={76} width={48} height={48} fill="support-brown-solid" />
    </Box>
    <Stack gap="xs" align="center">
      <Text role="status" textStyle="Body/Small/Medium" tone="light">{step + 1} of {tour.length}</Text>
      <Heading level={2} textStyle="Heading/2" align="center">{tour[step].title}</Heading>
      <Text tone="base" align="center">{tour[step].body}</Text>
    </Stack>
  </Stack>
</PlatformPhone>`,
    render: () => <OnboardingPhone />,
  },
]);
