import { useId, useRef, useState } from "react";
import { Box, Button, Card, Checkbox, Heading, InlineMessage, Stack, Text, plural, useToast } from "@zen-ds/react";

const handoffChecks = [
  { id: "qa", label: "Design QA passed", caption: "Em Pham signed off yesterday" },
  { id: "specs", label: "Specs exported", caption: "Points history.fig" },
  { id: "contact", label: "Client reviewer confirmed", caption: "Lan Vu, product owner at Phin & Co" },
];

export default function HandOff() {
  const { toast } = useToast();
  const [done, setDone] = useState<string[]>(["qa", "specs"]);
  const [handedOff, setHandedOff] = useState(false);
  const helpId = useId();
  const messageRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const left = handoffChecks.length - done.length;
  const toggle = (id: string, checked: boolean) => setDone((list) => checked ? [...list, id] : list.filter((item) => item !== id));
  // Focus follows the swap, so it never drops to <body>: the message after the hand-off, the button after Undo.
  const handOff = () => {
    setHandedOff(true);
    toast({ type: "positive", title: "Designs handed off" });
    setTimeout(() => messageRef.current?.focus());
  };
  const undo = () => {
    setHandedOff(false);
    setTimeout(() => buttonRef.current?.focus());
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Stack gap="md" alignSelf="stretch">
        <Stack gap="2xs">
          <Heading level={4} textStyle="Heading/Subheading">Sprint 14 hand-off</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Loyalty app · Phin & Co</Text>
        </Stack>
        {handedOff ? (
          <Box ref={messageRef} tabIndex={-1}>
            <InlineMessage theme="positive" title="Handed off to Phin & Co" action={{ label: "Undo", onClick: undo }}>
              Lan Vu can now review the screens and specs.
            </InlineMessage>
          </Box>
        ) : (
          <>
            <Stack gap="sm" role="group" aria-label="Hand-off checklist">
              {handoffChecks.map((check) => (
                <Checkbox key={check.id} label={check.label} caption={check.caption} checked={done.includes(check.id)} onCheckedChange={(checked) => toggle(check.id, checked)} />
              ))}
            </Stack>
            <Stack direction="row" justify="between" align="center" gap="sm">
              <Text id={helpId} textStyle="Body/Small/Regular" tone="base">
                {left ? `Check ${plural(left, "more item")} to hand off.` : "Ready to hand off."}
              </Text>
              <Button ref={buttonRef} level="primary" disabled={left > 0} aria-describedby={helpId} onClick={handOff}>Hand off</Button>
            </Stack>
          </>
        )}
      </Stack>
    </Card></Stack>
  );
}
