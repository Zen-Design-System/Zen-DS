import { useId, useRef, useState, type RefObject } from "react";
import { Button, Card, Dialog, Heading, Icon, Stack, Text, plural, useToast, type IconName } from "@zen-ds/react";
import { daysFromToday, formatDate } from "../../data";

type Check = {
  id: string; tone: "positive" | "warning" | "negative"; icon: IconName; text: string;
  action?: { label: string; ref: RefObject<HTMLButtonElement | null>; onClick: () => void };
};
const ok = "icon-check-circle-line" as const;

export default function SecurityChecks() {
  const { toast } = useToast();
  const [renewed, setRenewed] = useState(false);
  const [guestsRemoved, setGuestsRemoved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const renewRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  // A fixed check loses its button, so focus moves on to the fix still left, or to the card title once none is left
  // (after the next render, once a Dialog has handed focus back).
  const focusNext = (next: RefObject<HTMLElement | null>) => setTimeout(() => next.current?.focus());
  const renew = () => {
    setRenewed(true);
    focusNext(guestsRemoved ? titleRef : removeRef);
    toast({ type: "positive", title: "Certificate renewed" });
  };
  const removeGuests = () => {
    setGuestsRemoved(true);
    setConfirming(false);
    focusNext(renewed ? titleRef : renewRef);
    toast({ title: `${plural(2, "guest")} removed` });
  };
  const checks: Check[] = [
    { id: "two-step", tone: "positive", icon: ok, text: "Two-step sign-in is on for all 48 members" },
    renewed
      ? { id: "certificate", tone: "positive", icon: ok, text: `Single sign-on certificate renewed until ${formatDate(daysFromToday(366))}` }
      : { id: "certificate", tone: "warning", icon: "icon-alert-triangle-line", text: "The single sign-on certificate expires in 5 days",
        action: { label: "Renew certificate", ref: renewRef, onClick: renew } },
    guestsRemoved
      ? { id: "guests", tone: "positive", icon: ok, text: "No inactive client guests" }
      : { id: "guests", tone: "negative", icon: "icon-x-circle-line", text: `${plural(2, "client guest")} haven’t signed in for 90 days`,
        action: { label: "Remove guests", ref: removeRef, onClick: () => setConfirming(true) } },
  ];
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading ref={titleRef} level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Workspace security</Heading>
          <Text textStyle="Caption/Regular" tone="light">Checked today at 6:00 am</Text>
        </Stack>
        <Stack as="ul" gap="md" aria-labelledby={titleId}>
          {checks.map((check) => (
            // The icon takes the text's colour and its own shape, so colour is never the only signal. It sits on the
            // first line of its text: as tall as a Body/Base line, centred in it. The fix sits under its own line,
            // aligned with the words.
            <Stack as="li" key={check.id} direction="row" gap="2xs" align="start">
              <Text as="span" tone={check.tone} style={{ display: "inline-flex", height: "var(--zen-typography-line-height-body-base, 24px)", flex: "none", alignItems: "center" }}>
                <Icon name={check.icon} size="sm" decorative />
              </Text>
              <Stack gap="xs" width="fill">
                <Text as="span" tone={check.tone}>{check.text}</Text>
                {check.action ? <Stack align="start"><Button ref={check.action.ref} level="tertiary" size="sm" onClick={check.action.onClick}>{check.action.label}</Button></Stack> : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Stack>
      <Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title="Remove 2 client guests?"
        description="Quan Ho (Lumen Bank) and Trang Le (Phin & Co) lose access to the projects shared with them. You can invite them again later."
        primaryAction={{ label: "Remove guests", level: "danger", onClick: removeGuests }}
        secondaryAction={{ label: "Cancel", autoFocus: true }} />
    </Card>
  );
}
