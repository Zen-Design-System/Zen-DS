import { useRef, useState, type KeyboardEvent } from "react";
import { Box, Card, Divider, IconButton, InputField, ModalForm, Stack, Text, useFormState, useToast, useZen } from "@zen-ds/react";
import { files, formatBytes } from "../../data";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Ava's usability plan, one line per page, for the file viewer. */
const plan = files.find((file) => file.id === "f2")!;
const planPages = [
  "Why we are testing: transfers are the most-used task in Lumen Bank's app and the one people abandon most.",
  "Who we will talk to: five customers who sent money in the last month, two of them over 60.",
  "Tasks: send money to a saved recipient, add a new recipient, and change a daily limit.",
  "Script for the first transfer: start on the home screen and think aloud while you send $50.",
  "Script for saved recipients: find your landlord and send this month's rent.",
  "Script for transfer limits: raise your daily limit for a one-off payment.",
  "What we will measure: task success, time on task and every moment of hesitation.",
  "Schedule: sessions on Oct 6 and Oct 7, 45 minutes each, in the Hanoi studio.",
  "Consent and recording: participants sign the consent form before the camera starts.",
  "Roles on the day: Ava moderates, Alex takes notes, Hana looks after the client team.",
  "Reporting: findings in Zen by Oct 9, with clips for the three biggest issues.",
  "Appendix: the screener and the consent form.",
];
const zoomLevels = [75, 100, 125, 150];

/** Vertical, decorative dividers between labelled toolbar groups; arrow keys move along the toolbar. */
export default function FileToolbar() {
  const { toast } = useToast();
  // On a phone the zoom group and its divider step aside (people pinch to zoom there), so a divider never wraps onto the
  // end of a line.
  const phone = useZen()?.breakpoint === "mobile";
  const [zoom, setZoom] = useState(100);
  const [pageNo, setPageNo] = useState(3);
  const [sharing, setSharing] = useState(false);
  const zoomOutRef = useRef<HTMLButtonElement>(null);
  const zoomInRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLButtonElement>(null);
  const shareRef = useRef<HTMLButtonElement>(null);
  const minZoom = zoom === zoomLevels[0];
  const maxZoom = zoom === zoomLevels[zoomLevels.length - 1];
  const step = (delta: number) => setZoom((current) => zoomLevels[Math.min(zoomLevels.length - 1, Math.max(0, zoomLevels.indexOf(current) + delta))]);
  // APG toolbar: ← → move between the buttons that are on and shown, Home / End jump to the first and last.
  const arrows = (event: KeyboardEvent<HTMLElement>) => {
    const buttons = [
      { ref: zoomOutRef, on: !phone && !minZoom },
      { ref: zoomInRef, on: !phone && !maxZoom },
      { ref: previousRef, on: pageNo > 1 },
      { ref: nextRef, on: pageNo < planPages.length },
      { ref: downloadRef, on: true },
      { ref: shareRef, on: true },
    ].filter((button) => button.on).map((button) => button.ref);
    const index = buttons.findIndex((ref) => ref.current === event.target);
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: buttons.length - 1 }[event.key];
    if (next === undefined || index < 0) return;
    event.preventDefault();
    buttons[(next + buttons.length) % buttons.length].current?.focus();
  };
  const share = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      return { email: !text ? "Enter an email address" : !emailPattern.test(text) ? "Enter a valid email address, like name@company.com" : undefined };
    },
    onSubmit: ({ email }, { reset }) => {
      setSharing(false);
      reset();
      toast({ type: "positive", title: `Shared with ${email.trim()}` });
    },
  });
  // Cancel, Escape and the scrim close it and clear the field.
  const changeSharing = (open: boolean) => { setSharing(open); if (!open) share.reset(); };
  return (
    <Card theme="default">
      <Stack gap="md">
        <Stack direction="row" gap="xs" role="toolbar" aria-label={plan.name} onKeyDown={arrows} paddingY="2xs" scroll="x">
          {phone ? null : (
            <>
              <Stack direction="row" gap="2xs" width="hug" role="group" aria-label="Zoom">
                <IconButton ref={zoomOutRef} size="sm" icon="icon-zoom-out-line" aria-label="Zoom out" disabled={minZoom} onClick={() => step(-1)} />
                {/* The readouts keep seven digits' width, so the toolbar never jumps. */}
                <Text as="span" textStyle="Body/Small/Medium" align="center" tabularNumbers style={{ minInlineSize: "7ch" }} aria-live="polite">{`${zoom}%`}</Text>
                <IconButton ref={zoomInRef} size="sm" icon="icon-zoom-in-line" aria-label="Zoom in" disabled={maxZoom} onClick={() => step(1)} />
              </Stack>
              <Divider orientation="vertical" decorative />
            </>
          )}
          <Stack direction="row" gap="2xs" width="hug" role="group" aria-label="Pages">
            <IconButton ref={previousRef} size="sm" icon="icon-chevron-left-line" aria-label="Previous page" disabled={pageNo === 1} onClick={() => setPageNo(pageNo - 1)} />
            <Text as="span" textStyle="Body/Small/Medium" align="center" tabularNumbers style={{ minInlineSize: "7ch" }} aria-live="polite">{`${pageNo} of ${planPages.length}`}</Text>
            <IconButton ref={nextRef} size="sm" icon="icon-chevron-right-line" aria-label="Next page" disabled={pageNo === planPages.length} onClick={() => setPageNo(pageNo + 1)} />
          </Stack>
          <Divider orientation="vertical" decorative />
          <Stack direction="row" gap="2xs" width="hug" role="group" aria-label="File">
            <IconButton ref={downloadRef} size="sm" icon="icon-download-01-line" aria-label="Download" onClick={() => toast({ title: "Download started", children: `${plan.name} · ${formatBytes(plan.bytes)}` })} />
            <IconButton ref={shareRef} size="sm" icon="icon-share-01-line" aria-label="Share" onClick={() => setSharing(true)} />
          </Stack>
        </Stack>
        <Divider />
        {/* The page scales with the zoom; its text re-wraps to the card, so it never scrolls sideways. */}
        <Box style={{ zoom: zoom / 100 }}>
          <Stack gap="xs">
            <Text textStyle="Caption/Regular" tone="light">{`Usability plan · page ${pageNo}`}</Text>
            <Text>{planPages[pageNo - 1]}</Text>
          </Stack>
        </Box>
      </Stack>
      <ModalForm open={sharing} onOpenChange={changeSharing} title={`Share “${plan.name}”`} description="They can view and comment on the file."
        onSubmit={share.handleSubmit} primaryAction={{ label: "Share" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@company.com" data-autofocus="" {...share.field("email")} />
      </ModalForm>
    </Card>
  );
}
