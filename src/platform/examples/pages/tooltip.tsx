/* Tooltip examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio's own work in Zen: a photo
   review toolbar, an invoice's payment link, the activity feed, saved task views and a client's brand film. On a phone a
   tooltip never opens on touch, so the phone example shows one open from the start with its close X (Figma Close=Yes,
   user 2026-10-07). */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { platformMedia, usePlatformVideo } from "../../PlatformMedia";
import { Tooltip } from "../../../components/Tooltip";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone } from "../../PlatformPhone";
import { Button, IconButton } from "../../../components/Button";
import { InputField } from "../../../components/Input";
import { Card } from "../../../components/Card";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Image } from "../../../components/Image";
import { Link } from "../../../components/Link";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Box, Stack } from "../../../components/Layout";
import { Heading, Text } from "../../../components/Text";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { useToast } from "../../../components/Toast";
import { activity, formatBytes, formatDate, formatMoney, formatRelative, formatTime, initials, invoiceStatusTheme, invoices, people, type Person } from "../data";
import { typographyStyles } from "../../../tokens/typography.generated";
import { keepOnHotUpdate } from "../../hotData";
import "./tooltip.css";

export const page: PlatformPage = "tooltip";

/** Photo when the person has one, initials on their steady theme otherwise. The name sits next to it, so alt is empty. */
const avatarFor = (person: Person) => person.photo ? { theme: "photo" as const, src: person.photo, alt: "" } : { theme: person.theme, children: initials(person.name) };

// ——— 1. Shortcut hints: explicit Tooltips add the shortcut to icon-only toolbar buttons ————————————————————————
const zoomSteps = [25, 50, 75, 100, 150, 200, 300, 400];
const storePhoto = { name: "Phin & Co – Thao Dien store.jpg", ...platformMedia.site[5] };

function PhotoReview() {
  const [zoom, setZoom] = useState(150);
  const { toast } = useToast();
  const step = (by: 1 | -1) => setZoom((current) => zoomSteps[Math.min(zoomSteps.length - 1, Math.max(0, zoomSteps.indexOf(current) + by))]);
  // The shortcuts the tooltips name work while focus is in the viewer.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "+" || event.key === "=") step(1);
    else if (event.key === "-") step(-1);
    else if (event.shiftKey && event.code === "Digit1") setZoom(100);
    else return;
    event.preventDefault();
  };
  return (
    <Card theme="flat" className="px-tooltip-fill" onKeyDown={onKeyDown}>
      <Stack gap="md">
        <Stack direction="row" align="center" justify="between" gap="md" wrap>
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{storePhoto.name}</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">Loyalty app · 4.2 MB</Text>
          </Stack>
          {/* A dense viewer toolbar beside the title: Small buttons, so it fits a narrow card at Comfortable density too. */}
          <Stack direction="row" align="center" gap="xs" role="group" aria-label="Photo view">
            <Tooltip content="Zoom out · −" placement="bottom">
              <IconButton appearance="flat" size="sm" icon="icon-zoom-out-line" aria-label="Zoom out" onClick={() => step(-1)} />
            </Tooltip>
            <Text as="span" textStyle="Body/Small/Regular" tone="base" role="status" className="px-tooltip-zoom">{`${zoom}%`}</Text>
            <Tooltip content="Zoom in · +" placement="bottom">
              <IconButton appearance="flat" size="sm" icon="icon-zoom-in-line" aria-label="Zoom in" onClick={() => step(1)} />
            </Tooltip>
            <Tooltip content="Zoom to fit · ⇧1" placement="bottom">
              <IconButton appearance="flat" size="sm" icon="icon-expand-04-line" aria-label="Zoom to fit" onClick={() => setZoom(100)} />
            </Tooltip>
            {/* No shortcut to add: the IconButton's own tooltip names it. */}
            <IconButton appearance="flat" size="sm" icon="icon-download-01-line" aria-label="Download photo" onClick={() => toast({ title: "Photo downloaded" })} />
          </Stack>
        </Stack>
        <Box className="px-tooltip-viewer">
          <Image src={storePhoto.src} alt={storePhoto.alt} ratio="3:2" radius="none" loading="eager" style={{ width: `${zoom}%` }} />
        </Box>
      </Stack>
    </Card>
  );
}

// ——— 2. Copy confirmation: a controlled, Accent tooltip for 1.5 s ——————————————————————————————————————————
function PaymentLink() {
  const invoice = invoices[0];
  const link = `pay.dizai.studio/${invoice.number.slice(-4)}`;
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = () => {
    void navigator.clipboard?.writeText(`https://${link}`).catch(() => undefined);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Card theme="flat" className="px-tooltip-fill">
      <Stack gap="md">
        <Stack gap="xs">
          <Stack direction="row" align="center" gap="2xs">
            <Heading level={4} textStyle="Heading/Subheading">{invoice.number}</Heading>
            <Badge theme={invoiceStatusTheme[invoice.status]} background="subtle">{invoice.status}</Badge>
          </Stack>
          <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${invoice.client} · ${formatMoney(invoice.amount, true)} · Due ${formatDate(invoice.due)}`}</Text>
        </Stack>
        <Stack direction="row" align="end" gap="xs">
          <InputField className="px-tooltip-grow" label="Payment link" value={link} readOnly />
          <Tooltip content={copied ? "Link copied" : "Copy link"} color={copied ? "accent" : "default"} open={copied || undefined}>
            <IconButton level="tertiary" size="md" icon="icon-copy-line" aria-label="Copy link" onClick={copy} />
          </Tooltip>
        </Stack>
        {/* The tooltip is a description, not an announcement: a status line tells screen readers the copy worked. */}
        <VisuallyHidden role="status">{copied ? "Link copied" : ""}</VisuallyHidden>
      </Stack>
    </Card>
  );
}

// ——— 3. Exact time: the relative timestamp links to the item, its tooltip gives the full date ————————————————————
const fullTime = (d: Date) => `${d.toLocaleString("en-US", { weekday: "long" })}, ${formatDate(d)} at ${formatTime(d)}`;
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function ActivityTimes() {
  const { toast } = useToast();
  return (
    // A ListBox: the title in its Header-Slot, the activity rows in its Body-Slot.
    <ListBox className="px-tooltip-fill"
      header={<Heading level={4} textStyle="Heading/Subheading">Activity</Heading>}>
      <List aria-label="Activity">
        {activity.slice(0, 5).map((item) => {
          const person = (people as Record<string, Person>)[item.actor];
          // Static rows: the time link inside the caption is the action, so the row itself is not a button.
          return (
            <ListItem key={item.id} title={person.name}
              leading={<Avatar size="md" {...avatarFor(person)} />}
              caption={(
                <>
                  {`${sentence(`${item.verb} ${item.object}`)} · `}
                  <Tooltip content={fullTime(item.at)}>
                    {/* A permalink to the item; the demo confirms it instead of leaving the page. */}
                    <Link href={`#activity-${item.id}`} tone="inherit" onClick={(event) => { event.preventDefault(); toast({ title: "Activity opened" }); }}>{formatRelative(item.at)}</Link>
                  </Tooltip>
                </>
              )} />
          );
        })}
      </List>
    </ListBox>
  );
}

// ——— 4. Long file names: a cut name gets a tooltip with the whole name, a name that fits gets none ——————————————————
const handoff = [
  { id: "h1", name: "Loyalty app – points history – final review with Phin & Co v3.fig", bytes: 18_400_000, owner: "chi" },
  { id: "h2", name: "Loyalty app – rewards checkout – developer handoff notes.pdf", bytes: 1_120_000, owner: "bao" },
  { id: "h3", name: "Tier badges.svg", bytes: 42_000, owner: "gia" },
  { id: "h4", name: "Rewards API contract.json", bytes: 86_000, owner: "bao" },
];

/** True while the element's text is cut by its ellipsis (re-measured when its width changes). */
function useIsCut<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setCut(el.scrollWidth > el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, cut] as const;
}

function HandoffFile({ file, onOpen }: { file: (typeof handoff)[number]; onOpen: () => void }) {
  const [nameRef, cut] = useIsCut<HTMLAnchorElement>();
  const owner = (people as Record<string, Person>)[file.owner];
  return (
    <ListItem leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} title={file.name}>
      {/* Fills ListItem's Contents slot, so the pair copies the row's own title and caption (gap 2XSmall, caption Light). */}
      <Stack gap="2xs" className="px-tooltip-fill">
        {/* The tooltip anchor takes the row's width, so the link inside ends in an ellipsis. */}
        <Tooltip className="px-tooltip-name" content={file.name} disabled={!cut}>
          <Link ref={nameRef} className={`px-tooltip-name__link ${typographyStyles["Body/Base/Bold"]}`} href={`#file-${file.id}`}
            onClick={(event) => { event.preventDefault(); onOpen(); }}>{file.name}</Link>
        </Tooltip>
        <Text as="span" textStyle="Body/Small/Regular" tone="light">{`${formatBytes(file.bytes)} · ${owner.name}`}</Text>
      </Stack>
    </ListItem>
  );
}

function LongFileNames() {
  const { toast } = useToast();
  return (
    // A ListBox: the title in its Header-Slot, the files (HandoffFile renders a ListItem) in its Body-Slot.
    <ListBox className="px-tooltip-fill"
      header={<Heading level={4} textStyle="Heading/Subheading">Shared with Phin & Co</Heading>}>
      <List aria-label="Shared with Phin & Co">
        {handoff.map((file) => <HandoffFile key={file.id} file={file} onOpen={() => toast({ title: "File opened in a new tab" })} />)}
      </List>
    </ListBox>
  );
}

// ——— 5. Controls on video: Black-Overlay tooltips that follow the control's state ——————————————————————————
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

function BrandFilm() {
  const film = platformMedia.canyonLandscape;
  const player = usePlatformVideo();
  const [time, setTime] = useState({ at: 0, length: 0 });
  const seek = (by: number) => {
    const video = player.ref.current;
    if (video) video.currentTime = Math.min(Math.max(0, video.currentTime + by), video.duration || 0);
  };
  // The tooltip names what a press does now, so it changes with the state: Pause while playing, Play while paused.
  const playLabel = player.playing ? "Pause" : "Play";
  return (
    <Stack gap="md" className="px-tooltip-fill">
      {/* No clip on the frame: the film rounds its own corners, so the tooltips above the controls are never cut off. */}
      <Box>
        <video ref={player.ref} className="px-tooltip-film__video" src={film.src} poster={film.poster} muted loop playsInline preload="metadata"
          aria-label="Saola Outdoor brand film"
          onLoadedMetadata={(event) => setTime({ at: event.currentTarget.currentTime, length: event.currentTarget.duration })}
          onTimeUpdate={(event) => setTime({ at: event.currentTarget.currentTime, length: event.currentTarget.duration })} />
        {/* Center / Bottom, Padding/Small above the film's bottom edge. */}
        <Stack direction="row" gap="xs" position="absolute" constraintX="center" constraintY="bottom" insetBottom="sm" role="group" aria-label="Playback">
          <Tooltip content="Back 5 seconds" color="black-overlay">
            <IconButton appearance="overlay" level="black-overlay" icon="icon-fast-backward-solid" aria-label="Back 5 seconds" onClick={() => seek(-5)} />
          </Tooltip>
          <Tooltip content={playLabel} color="black-overlay">
            <IconButton appearance="overlay" level="black-overlay" icon={player.playing ? "icon-pause-solid" : "icon-play-solid"} aria-label={playLabel} onClick={player.toggle} />
          </Tooltip>
          <Tooltip content="Forward 5 seconds" color="black-overlay">
            <IconButton appearance="overlay" level="black-overlay" icon="icon-fast-forward-solid" aria-label="Forward 5 seconds" onClick={() => seek(5)} />
          </Tooltip>
        </Stack>
      </Box>
      <Stack gap="xs">
        <Heading level={4} textStyle="Heading/Subheading">Saola Outdoor – brand film v2.webm</Heading>
        <Text as="span" textStyle="Body/Small/Regular" tone="base">{`Brand refresh · ${clock(time.at)} / ${clock(time.length)}`}</Text>
      </Stack>
    </Stack>
  );
}

/** A phone: the new Scan receipt action carries a tip open from the start; its X closes it, and Show tip brings it back. */
function ScanTipPhone() {
  const [tip, setTip] = useState(true);
  const { toast } = useToast();
  return (
    <PlatformPhone label="Expenses" header={<TopNavigation title="Expenses" />}>
      <Box paddingX="lg" paddingY="md">
        <Stack gap="lg">
          <Stack gap="2xs">
            <Text textStyle="Body/Small/Regular" tone="base">This month</Text>
            <Heading level={2} textStyle="Heading/2">{formatMoney(1284.5)}</Heading>
          </Stack>
          <Stack direction="row" gap="sm" align="center" wrap>
            <Tooltip content="New: snap a receipt and the amount fills itself in" placement="bottom" closable open={tip} onOpenChange={setTip}>
              <Button level="primary" startIcon="icon-camera-line" onClick={() => toast({ title: "Camera opened" })}>Scan receipt</Button>
            </Tooltip>
            {tip ? null : <Button level="tertiary" onClick={() => setTip(true)}>Show tip</Button>}
          </Stack>
        </Stack>
      </Box>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Shortcut hints",
    description: "An explicit Tooltip adds the keyboard shortcut to an icon-only button's name; Download keeps the IconButton's own name tooltip. Tooltips open after 1 s of hover, at once on keyboard focus, and the next button along opens without waiting.",
    code: `const [zoom, setZoom] = useState(150);

<Tooltip content="Zoom out · −" placement="bottom">
  <IconButton appearance="flat" size="sm" icon="icon-zoom-out-line" aria-label="Zoom out" onClick={() => step(-1)} />
</Tooltip>
<Text as="span" textStyle="Body/Small/Regular" tone="base" role="status">{\`\${zoom}%\`}</Text>
<Tooltip content="Zoom in · +" placement="bottom">
  <IconButton appearance="flat" size="sm" icon="icon-zoom-in-line" aria-label="Zoom in" onClick={() => step(1)} />
</Tooltip>
<Tooltip content="Zoom to fit · ⇧1" placement="bottom">
  <IconButton appearance="flat" size="sm" icon="icon-expand-04-line" aria-label="Zoom to fit" onClick={() => setZoom(100)} />
</Tooltip>
{/* No shortcut to add: the IconButton's own tooltip names it. */}
<IconButton appearance="flat" size="sm" icon="icon-download-01-line" aria-label="Download photo" onClick={download} />`,
    render: () => <PhotoReview />,
  },
  {
    title: "Copy confirmation",
    description: "After Copy link the tooltip is held open for 1.5 s in Accent and says what happened, then goes back to hover and focus. A hidden status line announces the same words to screen readers.",
    code: `const [copied, setCopied] = useState(false);
const copy = () => {
  navigator.clipboard.writeText(\`https://\${link}\`);
  setCopied(true);
  window.setTimeout(() => setCopied(false), 1500);
};

<InputField label="Payment link" value={link} readOnly />
<Tooltip content={copied ? "Link copied" : "Copy link"} color={copied ? "accent" : "default"} open={copied || undefined}>
  <IconButton level="tertiary" size="md" icon="icon-copy-line" aria-label="Copy link" onClick={copy} />
</Tooltip>
<VisuallyHidden role="status">{copied ? "Link copied" : ""}</VisuallyHidden>`,
    render: () => <PaymentLink />,
  },
  {
    title: "Exact time",
    description: "Activity shows relative times that stay short; the tooltip on each time gives the full date and time. The time is a permalink, so keyboard users reach it, and it opens the item it belongs to.",
    code: `const fullTime = (d) => \`\${d.toLocaleString("en-US", { weekday: "long" })}, \${formatDate(d)} at \${formatTime(d)}\`;

<ListItem title={person.name}
  leading={<Avatar size="md" {...avatarFor(person)} />}
  caption={(
    <>
      {\`\${sentence(\`\${item.verb} \${item.object}\`)} · \`}
      <Tooltip content={fullTime(item.at)}>
        {/* A permalink to the item; the demo confirms it instead of leaving the page. */}
        <Link href={\`#activity-\${item.id}\`} tone="inherit" onClick={(event) => { event.preventDefault(); toast({ title: "Activity opened" }); }}>
          {formatRelative(item.at)}
        </Link>
      </Tooltip>
    </>
  )} />`,
    render: () => <ActivityTimes />,
  },
  {
    title: "Long file names",
    description: "A file name that doesn't fit ends in an ellipsis, and only then gets a tooltip with the whole name, on hover and on keyboard focus. Short names get no tooltip, because it would only repeat them.",
    code: `const [nameRef, cut] = useIsCut(); // el.scrollWidth > el.clientWidth, re-measured on resize

<ListItem leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />} title={file.name}>
  <Stack gap="2xs">
    {/* .file-name { max-width: 100% } · .file-name a { overflow: hidden; text-overflow: ellipsis; white-space: nowrap } */}
    <Tooltip className="file-name" content={file.name} disabled={!cut}>
      <Link ref={nameRef} className={typographyStyles["Body/Base/Bold"]} href={file.url}>{file.name}</Link>
    </Tooltip>
    <Text as="span" textStyle="Body/Small/Regular" tone="light">{\`\${formatBytes(file.bytes)} · \${owner.name}\`}</Text>
  </Stack>
</ListItem>`,
    render: () => <LongFileNames />,
  },
  {
    title: "Controls on video",
    description: "Over moving footage the controls and their tooltips use Black-Overlay, so the text reads on any frame. The play button's tooltip follows its state: it names what a press does now, Pause while the film plays and Play once it is paused.",
    code: `const player = usePlatformVideo();
const playLabel = player.playing ? "Pause" : "Play";

<Box>
  {/* The film rounds its own corners (no clip), so the tooltips are never cut off */}
  <video ref={player.ref} src={film.src} poster={film.poster} muted loop playsInline aria-label="Saola Outdoor brand film" />
  <Stack direction="row" gap="xs" position="absolute" constraintX="center" constraintY="bottom" insetBottom="sm" role="group" aria-label="Playback">
    <Tooltip content="Back 5 seconds" color="black-overlay">
      <IconButton appearance="overlay" level="black-overlay" icon="icon-fast-backward-solid" aria-label="Back 5 seconds" onClick={() => seek(-5)} />
    </Tooltip>
    <Tooltip content={playLabel} color="black-overlay">
      <IconButton appearance="overlay" level="black-overlay" icon={player.playing ? "icon-pause-solid" : "icon-play-solid"}
        aria-label={playLabel} onClick={player.toggle} />
    </Tooltip>
    <Tooltip content="Forward 5 seconds" color="black-overlay">
      <IconButton appearance="overlay" level="black-overlay" icon="icon-fast-forward-solid" aria-label="Forward 5 seconds" onClick={() => seek(5)} />
    </Tooltip>
  </Stack>
</Box>`,
    render: () => <BrandFilm />,
  },
  {
    title: "A tip on a phone",
    description: "A tooltip never opens on touch, so on a phone a tip for a new action is open from the start and carries its own close X (closable). It stays until it is closed — a tap elsewhere or on the button does not hide it — and Show tip brings it back.",
    render: () => <ScanTipPhone />,
    code: `const [tip, setTip] = useState(true);

<Tooltip content="New: snap a receipt and the amount fills itself in" placement="bottom"
  closable open={tip} onOpenChange={setTip}>
  <Button level="primary" startIcon="icon-camera-line" onClick={openCamera}>Scan receipt</Button>
</Tooltip>
{tip ? null : <Button level="tertiary" onClick={() => setTip(true)}>Show tip</Button>}`,
  },
]);
