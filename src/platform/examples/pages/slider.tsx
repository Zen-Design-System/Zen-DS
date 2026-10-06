import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Badge, type BadgeTheme } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon } from "../../../components/DockIcon";
import { Form, FormActions } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { NumberField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Slider } from "../../../components/Slider";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { Toggle } from "../../../components/Toggle";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { platformMedia, usePlatformVideo } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { formatMoney, initials, people, projectById, type PersonId } from "../data";
import type { ExampleDef } from "../types";
import "./slider.css";

export const page: PlatformPage = "slider";

// ——— 1. Photo zoom ——————————————————————————————————————————————————————————————————————————————

function PhotoZoomExample() {
  const { toast } = useToast();
  const [zoom, setZoom] = useState(140);
  const formRef = useRef<HTMLFormElement>(null);
  // Reset zoom disables itself: focus moves to the slider instead of falling to the page.
  const reset = () => { formRef.current?.querySelector<HTMLElement>('input[type="range"]')?.focus(); setZoom(100); };
  return (
    <Card theme="flat" className="px-slider-card">
      <Form ref={formRef} onSubmit={() => toast({ type: "positive", title: "Profile photo updated" })} gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Profile photo</Heading>
        {/* The crop follows the thumb while it moves: the slider tunes by eye, the preview shows the result. */}
        <Stack align="center">
          <div className="px-slider-crop" style={{ "--px-slider-zoom": zoom / 100 } as CSSProperties}>
            <img src={people.alex.photo} alt={`${people.alex.name}, zoomed to ${zoom}%`} />
          </div>
        </Stack>
        <Stack direction="row" gap="xs" align="center">
          <Slider aria-label="Zoom" min={100} max={300} step={5} value={zoom} onValueChange={setZoom}
            icon="icon-zoom-in-solid" valueText={(value) => `${value}%`} />
          <Text as="span" textStyle="Body/Base/Medium" className="px-slider-value">{zoom}%</Text>
        </Stack>
        <FormActions>
          <Button level="tertiary" disabled={zoom === 100} onClick={reset}>Reset zoom</Button>
          <Button level="primary" type="submit">Save photo</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

// ——— 2. Budget alert ——————————————————————————————————————————————————————————————————————————————

function BudgetAlertExample() {
  const { toast } = useToast();
  const labelId = useId();
  const project = projectById("lumen-banking");
  const [saved, setSaved] = useState(80);
  const [threshold, setThreshold] = useState(saved);
  const changed = threshold !== saved;
  const alertAt = Math.round((project.budget * threshold) / 100);
  const formRef = useRef<HTMLFormElement>(null);
  // Both actions disable themselves once used: focus goes back to the slider, not to the page.
  const toSlider = () => formRef.current?.querySelector<HTMLElement>('input[type="range"]')?.focus();
  const save = () => { toSlider(); setSaved(threshold); toast({ type: "positive", title: "Budget alert saved" }); };
  const cancel = () => { toSlider(); setThreshold(saved); };
  return (
    <Card theme="flat" className="px-slider-card">
      <Form ref={formRef} onSubmit={save} gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Budget alert</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{project.name} · {project.client}</Text>
        </Stack>
        <Stack gap="xs">
          <Text as="span" id={labelId} textStyle="Body/Small/Bold">Share of the budget</Text>
          {/* The slider gets close by feel, the number field types the exact percentage: both edit one value. */}
          <Stack direction="row" gap="xs" align="center">
            <Slider aria-labelledby={labelId} min={50} max={100} value={threshold} onValueChange={setThreshold}
              icon="icon-bell-01-solid" valueText={(value) => `${value}% of the budget`} />
            <NumberField aria-label="Share of the budget, percent" className="px-slider-number" min={50} max={100}
              value={threshold} onValueChange={(value) => { if (value !== null) setThreshold(value); }} trailing="%" />
          </Stack>
        </Stack>
        <DescriptionList items={[
          { term: "Budget", description: formatMoney(project.budget) },
          { term: "Spent so far", description: `${formatMoney(project.spent)} (${Math.round((project.spent / project.budget) * 100)}%)` },
          { term: "Alert at", description: formatMoney(alertAt) },
        ]} />
        <Text textStyle="Body/Small/Regular" tone="base">You and {people.duy.name} get an email when the spend passes {formatMoney(alertAt)}.</Text>
        {/* Both actions wait for a change. */}
        <FormActions>
          <Button level="tertiary" disabled={!changed} onClick={cancel}>Cancel</Button>
          <Button level="primary" type="submit" disabled={!changed}>Save alert</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

// ——— 3. Team allocation ————————————————————————————————————————————————————————————————————————————

/** Share of a 40-hour week per person on Online banking redesign, next to what their other projects already take. */
type Allocation = { person: PersonId; other: number; share: number };
const savedAllocation: Allocation[] = [
  { person: "alex", other: 40, share: 50 },
  { person: "ava", other: 20, share: 80 },
  { person: "finn", other: 30, share: 60 },
  { person: "khoa", other: 50, share: 60 },
  { person: "hana", other: 70, share: 20 },
];
const WEEK_HOURS = 40;
const loadOf = (row: Allocation): { label: string; theme: BadgeTheme } => {
  const load = row.other + row.share;
  return load > 100 ? { label: "Overbooked", theme: "red" } : load === 100 ? { label: "Full", theme: "green" } : { label: "Available", theme: "neutral" };
};

function TeamAllocationExample() {
  const { toast } = useToast();
  const titleId = useId();
  const project = projectById("lumen-banking");
  const [saved, setSaved] = useState(savedAllocation);
  const [rows, setRows] = useState(savedAllocation);
  const changed = rows.some((row, index) => row.share !== saved[index].share);
  const setShare = (person: PersonId, share: number) => setRows((current) => current.map((row) => (row.person === person ? { ...row, share } : row)));
  const hours = rows.reduce((sum, row) => sum + (row.share * WEEK_HOURS) / 100, 0);
  const formRef = useRef<HTMLFormElement>(null);
  // Both actions disable themselves once used: focus goes back to the first slider, not to the page.
  const toTable = () => formRef.current?.querySelector<HTMLElement>('input[type="range"]')?.focus();
  const overbooked = rows.filter((row) => row.other + row.share > 100).length;
  const columns: TableColumn<Allocation>[] = [
    { id: "person", header: "Person", cell: (row) => {
      const person = people[row.person];
      return <TableMedia bold={false} caption={person.role}
        media={person.photo ? <Avatar size="sm" theme="photo" src={person.photo} alt="" /> : <Avatar size="sm" theme={person.theme} alt="">{initials(person.name)}</Avatar>}>{person.name}</TableMedia>;
    } },
    { id: "other", header: "Other projects", align: "right", width: "132px", cell: (row) => <TableText>{row.other}%</TableText> },
    { id: "share", header: "This project", width: "260px", cell: (row) => (
      // Small is the dense size: 10px rail, the dot floats. Stepped by 10%, the readout beside it keeps the exact value.
      <Stack direction="row" gap="xs" align="center">
        <Slider aria-label={`${people[row.person].name}, share of the week`} size="sm" step={10}
          value={row.share} onValueChange={(share) => setShare(row.person, share)}
          valueText={(share) => `${share}%, ${(share * WEEK_HOURS) / 100} hours a week`} />
        <Text as="span" textStyle="Body/Base/Regular" className="px-slider-value">{row.share}%</Text>
      </Stack>
    ) },
    { id: "hours", header: "Hours per week", align: "right", width: "132px", cell: (row) => <TableText>{(row.share * WEEK_HOURS) / 100}</TableText> },
    { id: "load", header: "Load", width: "128px", cell: (row) => { const load = loadOf(row); return <Badge theme={load.theme} background="subtle">{load.label}</Badge>; } },
  ];
  return (
    // The table is a section of the page, not a widget: it lies on the page under its heading, with no container.
    <Form ref={formRef} onSubmit={() => { toTable(); setSaved(rows); toast({ type: "positive", title: "Allocation saved" }); }} gap="md" aria-labelledby={titleId}>
      <Stack gap="xs">
        <Heading level={4} textStyle="Heading/4" id={titleId}>Team allocation</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">
          {project.name} · {project.client} · {hours} hours a week{overbooked ? ` · ${plural(overbooked, "person", "people")} overbooked` : ""}
        </Text>
      </Stack>
      <Table aria-labelledby={titleId} columns={columns} rows={rows} getRowId={(row) => row.person} />
      {/* Both actions wait for a change; the status says why they turned on. */}
      <FormActions align="between">
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{changed ? "Unsaved changes" : ""}</Text>
        <Button level="tertiary" disabled={!changed} onClick={() => { toTable(); setRows(saved); }}>Cancel</Button>
        <Button level="primary" type="submit" disabled={!changed}>Save allocation</Button>
      </FormActions>
    </Form>
  );
}

// ——— 4. Volume on a video ————————————————————————————————————————————————————————————————————————————————

function VideoVolumeExample() {
  // The film waits for Play (a video with sound doesn't autoplay); Mute keeps the last volume to come back to.
  const video = usePlatformVideo(false);
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);
  const level = muted ? 0 : volume;
  useEffect(() => {
    const element = video.ref.current;
    if (!element) return;
    element.volume = volume / 100;
    element.muted = muted;
  }, [video.ref, volume, muted]);
  const changeVolume = (next: number) => { setMuted(next === 0); if (next > 0) setVolume(next); };
  const toggleMute = () => { if (muted && volume === 0) setVolume(50); setMuted(!muted); };
  return (
    <Stack gap="md">
      {/* The player clips the film to its radius. The film fills it (Left & right × Top & bottom); the control bar is
          pinned along the bottom edge (Left & right / Bottom) and paints above the film because it comes after it. */}
      <Box radius="lg" clip className="px-slider-player">
        <Box position="absolute" constraintX="left-right" constraintY="top-bottom">
          <video ref={video.ref} className="px-slider-player__video" src={platformMedia.canyonLandscape.src} poster={platformMedia.canyonLandscape.poster}
            loop playsInline preload="metadata" aria-label="Saola Outdoor brand film, draft 3" />
        </Box>
        <Stack direction="row" gap="xs" align="center" padding="sm" position="absolute" constraintX="left-right" constraintY="bottom" className="px-slider-player__controls">
          <IconButton appearance="overlay" level="black-overlay" size="sm" aria-label={video.playing ? "Pause" : "Play"}
            icon={video.playing ? "icon-pause-solid" : "icon-play-solid"} onClick={video.toggle} />
          <IconButton appearance="overlay" level="black-overlay" size="sm" aria-label={muted ? "Unmute" : "Mute"}
            icon={level === 0 ? "icon-volume-x-solid" : "icon-volume-max-solid"} onClick={toggleMute} />
          <Slider aria-label="Volume" theme="white" size="md" value={level} onValueChange={changeVolume}
            icon="icon-volume-max-solid" valueText={(value) => (value === 0 ? "Muted" : `${value}%`)} className="px-slider-player__volume" />
        </Stack>
      </Box>
      <Stack gap="xs">
        <Heading level={4} textStyle="Heading/Subheading">Brand film, draft 3</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · shared by {people.emi.name}</Text>
      </Stack>
    </Stack>
  );
}

// ——— 5. Sounds off ————————————————————————————————————————————————————————————————————————————————

function SoundsExample() {
  const labelId = useId();
  const [sounds, setSounds] = useState(false);
  const [volume, setVolume] = useState(60);
  return (
    <Card theme="flat" className="px-slider-card">
      {/* The card header and two settings of one group: md apart; each label sits xs from its control. */}
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Notifications</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Zen for Mac on this computer</Text>
        </Stack>
        <Toggle className="px-slider-fill" size="md" label="Notification sounds" caption="Mentions, replies and reminders play a sound."
          checked={sounds} onCheckedChange={setSounds} />
        <Stack gap="xs">
          <Stack direction="row" justify="between" gap="xs">
            <Text as="span" id={labelId} textStyle="Body/Small/Bold">Volume</Text>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{sounds ? `${volume}%` : "Off"}</Text>
          </Stack>
          {/* Disabled while the master toggle is off; the line under it says why. */}
          <Slider aria-labelledby={labelId} value={volume} onValueChange={setVolume} disabled={!sounds}
            icon="icon-volume-max-solid" valueText={(value) => `${value}%`} />
          {sounds ? null : <Text textStyle="Caption/Regular" tone="light">Turn on notification sounds to set their volume.</Text>}
        </Stack>
      </Stack>
    </Card>
  );
}

// ——— 6. Points at checkout (phone) ——————————————————————————————————————————————————————————————————

/** Phin & Co's loyalty app, which the studio builds: 100 points take $1.00 off, up to the order total. */
const order = [
  { id: "coffee", name: "Iced milk coffee", note: "Large · less ice", emoji: "☕", price: 3.4 },
  { id: "croissant", name: "Butter croissant", note: "Warmed", emoji: "🥐", price: 3 },
];
const subtotal = order.reduce((sum, item) => sum + item.price, 0);
const store = { name: "Phin Lê Lợi", address: "42 Lê Lợi, District 1", ready: "10:40 am" };
const POINTS = 860;
const maxPoints = Math.min(POINTS, Math.floor((subtotal * 100) / 20) * 20);

function PointsCheckoutExample() {
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const pickupId = useId();
  const [step, setStep] = useState<"cart" | "checkout" | "paid">("checkout");
  const [points, setPoints] = useState(320);
  const discount = points / 100;
  const total = subtotal - discount;
  const go = (next: typeof step, focus: string) => screen.go(focus, () => setStep(next));

  if (step === "cart") {
    return (
      // One key per screen: each step opens at the top; the cart is a tab root with a large title.
      <PlatformPhone key="cart" label="Phin cart" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Cart" largeTitle="Cart" scrollRef={screenRef} />}
        footer={<ActionBar position="static" summary={<Text as="span" textStyle="Body/Base/Medium">Subtotal {formatMoney(subtotal, true)}</Text>}
          primaryAction={{ label: "Check out", onClick: () => go("checkout", '.zen-top-nav__action[aria-label="Back"]') }} />}>
        {screen.anchor}
        {/* Rows pad 0 at the sides: the screen margin (lg) insets them, so they line up with the page, as on checkout. */}
        <Box padding="lg">
          <List aria-label="Items in your order">
            {order.map((item) => (
              <ListItem key={item.id} title={item.name} caption={item.note} leading={<DockIcon theme="emoji" emoji={item.emoji} />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(item.price, true)}</Text>} />
            ))}
          </List>
        </Box>
      </PlatformPhone>
    );
  }
  const paid = step === "paid";
  return (
    <PlatformPhone key={step} label="Phin checkout" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title={paid ? "Order placed" : "Checkout"} scrollRef={screenRef}
        leading={paid ? undefined : { icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => go("cart", ".zen-action-bar .zen-button") }} />}
      footer={paid
        ? <ActionBar position="static" primaryAction={{ label: "Start new order", onClick: () => { setPoints(320); go("cart", ".zen-action-bar .zen-button"); } }} />
        : <ActionBar position="static" primaryAction={{ label: total > 0 ? `Pay ${formatMoney(total, true)}` : "Place order", onClick: () => go("paid", ".zen-action-bar .zen-button") }} />}>
      {screen.anchor}
      <Stack gap="lg" paddingX="lg" paddingY="lg">
        {paid ? (
          <InlineMessage theme="positive" title={`Pick up at ${store.name} at ${store.ready}`}>
            {points === 0 ? `You paid ${formatMoney(total, true)}.` : total > 0 ? `You used ${points} points and paid ${formatMoney(total, true)}.` : `Your ${points} points covered the whole order.`}
          </InlineMessage>
        ) : (
          <Stack as="section" gap="xs" aria-labelledby={pickupId}>
            <Heading level={2} id={pickupId} textStyle="Body/Small/Bold" tone="light">Pick up</Heading>
            <List aria-labelledby={pickupId}>
              <ListItem title={store.name} caption={`${store.address} · ready at ${store.ready}`}
                leading={<DockIcon icon="icon-shop-store-line" theme="orange" background="subtle" />} />
            </List>
          </Stack>
        )}
        {paid ? null : (
          <Stack gap="xs">
            <Heading level={2} id={labelId} textStyle="Body/Small/Bold" tone="light">Use Phin points</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">You have {POINTS} points. 100 points take $1.00 off.</Text>
            {/* Stepped by 20 points, capped at the order total; the limits show the range, the row under it the effect. */}
            <Slider aria-labelledby={labelId} theme="accent" size="lg" min={0} max={maxPoints} step={20} showLimits
              value={points} onValueChange={setPoints} icon="icon-coins-solid"
              valueText={(value) => `${value} points, ${formatMoney(value / 100, true)} off`} />
          </Stack>
        )}
        <DescriptionList items={[
          { term: "Subtotal", description: formatMoney(subtotal, true) },
          { term: `Points (${points})`, description: `−${formatMoney(discount, true)}` },
          { term: paid ? "Paid" : "Total", description: formatMoney(total, true), emphasis: true },
        ]} />
      </Stack>
    </PlatformPhone>
  );
}

// ——— Examples ———————————————————————————————————————————————————————————————————————————————————

export const examples: ExampleDef[] = [
  {
    title: "Photo zoom",
    description: "Zoom is tuned by eye, so the crop follows the thumb while it moves; the value beside the slider and Reset zoom make the exact state visible and undoable.",
    render: () => <PhotoZoomExample />,
    code: `const [zoom, setZoom] = useState(140);

<Form onSubmit={savePhoto} gap="md">
  <div className="crop" style={{ "--zoom": zoom / 100 }}><img src={photo} alt="" /></div>
  <Stack direction="row" gap="xs" align="center">
    <Slider aria-label="Zoom" min={100} max={300} step={5} value={zoom} onValueChange={setZoom}
      icon="icon-zoom-in-solid" valueText={(value) => \`\${value}%\`} />
    <Text as="span" textStyle="Body/Base/Medium">{zoom}%</Text>
  </Stack>
  <FormActions>
    <Button level="tertiary" disabled={zoom === 100} onClick={() => setZoom(100)}>Reset zoom</Button>
    <Button level="primary" type="submit">Save photo</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Budget alert",
    description: "A slider alone can't hit an exact number, so a NumberField edits the same value beside it. The summary turns the percentage into money, and Cancel and Save alert wait for a change.",
    render: () => <BudgetAlertExample />,
    code: `const [threshold, setThreshold] = useState(80);

<Form onSubmit={saveAlert} gap="md">
  <Text as="span" id={labelId} textStyle="Body/Small/Bold">Share of the budget</Text>
  <Stack direction="row" gap="xs" align="center">
    <Slider aria-labelledby={labelId} min={50} max={100} value={threshold} onValueChange={setThreshold}
      icon="icon-bell-01-solid" valueText={(value) => \`\${value}% of the budget\`} />
    <NumberField aria-label="Share of the budget, percent" min={50} max={100} trailing="%"
      value={threshold} onValueChange={(value) => value !== null && setThreshold(value)} />
  </Stack>
  <DescriptionList items={[{ term: "Alert at", description: formatMoney(budget * threshold / 100) }]} />
  <FormActions>
    <Button level="tertiary" disabled={threshold === saved} onClick={() => setThreshold(saved)}>Cancel</Button>
    <Button level="primary" type="submit" disabled={threshold === saved}>Save alert</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Team allocation",
    description: "In a dense table the Small slider sets each person's share of the week in steps of 10%. The hours and the load Badge follow the thumb; Cancel and Save allocation wait for a change, and nothing is saved until Save.",
    wide: true,
    render: () => <TeamAllocationExample />,
    code: `const [rows, setRows] = useState(allocation); // { person, other, share }
const setShare = (person, share) => setRows(rows.map((row) => (row.person === person ? { ...row, share } : row)));

const columns: TableColumn<Allocation>[] = [
  { id: "person", header: "Person", cell: (row) => <TableMedia media={<Avatar size="sm" … />} caption={row.role}>{row.name}</TableMedia> },
  { id: "other", header: "Other projects", align: "right", cell: (row) => <TableText>{row.other}%</TableText> },
  { id: "share", header: "This project", cell: (row) => (
    <Stack direction="row" gap="xs" align="center">
      <Slider aria-label={\`\${row.name}, share of the week\`} size="sm" step={10}
        value={row.share} onValueChange={(share) => setShare(row.person, share)}
        valueText={(share) => \`\${share}%, \${share * 0.4} hours a week\`} />
      <Text as="span" textStyle="Body/Base/Regular">{row.share}%</Text> {/* the cells' Body/Base */}
    </Stack>
  ) },
  { id: "hours", header: "Hours per week", align: "right", cell: (row) => <TableText>{row.share * 0.4}</TableText> },
  { id: "load", header: "Load", cell: (row) => <Badge theme={loadOf(row).theme} background="subtle">{loadOf(row).label}</Badge> },
];

{/* No container: the table lies on the page under its heading. */}
<Form onSubmit={saveAllocation} gap="md">
  <Table aria-labelledby={titleId} columns={columns} rows={rows} getRowId={(row) => row.person} />
  <FormActions align="between">
    <Text as="span" role="status" tone="base">{changed ? "Unsaved changes" : ""}</Text>
    <Button level="tertiary" disabled={!changed} onClick={() => setRows(saved)}>Cancel</Button>
    <Button level="primary" type="submit" disabled={!changed}>Save allocation</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Volume on a video",
    description: "White sits on imagery beside the Overlay buttons of a player bar. Mute drops the slider to 0 and keeps the last volume, so Unmute brings it back.",
    render: () => <VideoVolumeExample />,
    code: `const [volume, setVolume] = useState(70);
const [muted, setMuted] = useState(false);
const level = muted ? 0 : volume;
useEffect(() => { videoRef.current.volume = volume / 100; videoRef.current.muted = muted; }, [volume, muted]);

{/* .player { aspect-ratio: 16 / 9 }; the film fills the player, the bar sits on its bottom edge */}
<Box radius="lg" clip className="player">
  <Box position="absolute" constraintX="left-right" constraintY="top-bottom">
    <video ref={videoRef} src={film} loop playsInline />
  </Box>
  <Stack direction="row" gap="xs" align="center" padding="sm" position="absolute" constraintX="left-right" constraintY="bottom">
    <IconButton appearance="overlay" level="black-overlay" size="sm" aria-label={muted ? "Unmute" : "Mute"}
      icon={level === 0 ? "icon-volume-x-solid" : "icon-volume-max-solid"} onClick={toggleMute} />
    <Slider aria-label="Volume" theme="white" size="md" value={level}
      onValueChange={(next) => { setMuted(next === 0); if (next > 0) setVolume(next); }}
      icon="icon-volume-max-solid" valueText={(value) => (value === 0 ? "Muted" : \`\${value}%\`)} />
  </Stack>
</Box>`,
  },
  {
    title: "Sounds turned off",
    description: "A master Toggle disables the dependent slider instead of hiding it: the setting stays in view, keeps its value and says why it can't change.",
    render: () => <SoundsExample />,
    code: `<Toggle size="md" label="Notification sounds" caption="Mentions, replies and reminders play a sound."
  checked={sounds} onCheckedChange={setSounds} /> {/* width: 100% */}
<Text as="span" id={labelId} textStyle="Body/Small/Bold">Volume</Text>
<Text as="span" textStyle="Body/Small/Regular" tone="base">{sounds ? \`\${volume}%\` : "Off"}</Text>
<Slider aria-labelledby={labelId} value={volume} onValueChange={setVolume} disabled={!sounds}
  icon="icon-volume-max-solid" valueText={(value) => \`\${value}%\`} />
{sounds ? null : <Text textStyle="Caption/Regular" tone="light">Turn on notification sounds to set their volume.</Text>}`,
  },
  {
    title: "Points at checkout",
    description: "On a phone the Large slider steps through points 20 at a time between visible limits, capped at the order total. valueText reads the effect (\"320 points, $3.20 off\") to screen readers, and the Pay action in the footer follows it.",
    render: () => <PointsCheckoutExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const [points, setPoints] = useState(320); // 100 points = $1.00
const total = subtotal - points / 100;

// One key per step (cart, checkout, paid), so each opens at the top; the bar follows the scroll.
<PlatformPhone key={step} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title="Checkout" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: toCart }} />}
  footer={<ActionBar position="static" primaryAction={{ label: total > 0 ? \`Pay \${formatMoney(total)}\` : "Place order", onClick: pay }} />}>
<Heading level={2} id={labelId} textStyle="Body/Small/Bold" tone="light">Use Phin points</Heading>
<Slider aria-labelledby={labelId} theme="accent" size="lg" min={0} max={640} step={20} showLimits
  value={points} onValueChange={setPoints} icon="icon-coins-solid"
  valueText={(value) => \`\${value} points, \${formatMoney(value / 100)} off\`} />
<DescriptionList items={[
  { term: "Subtotal", description: formatMoney(subtotal) },
  { term: \`Points (\${points})\`, description: \`−\${formatMoney(points / 100)}\` },
  { term: "Total", description: formatMoney(total), emphasis: true },
]} />
</PlatformPhone>
// Points can cover the whole order: then the action places it without a payment.`,
  },
];
