import { useId, useRef, useState } from "react";
import { Button, Card, DescriptionList, Heading, IconButton, InlineMessage, Stack, Text, useToast } from "@zen-ds/react";

type Check = "idle" | "checking" | "failed" | "verified";
const txtValue = "zen-verify=dz-4f9c2a71";

export default function VerifyDomain() {
  const { toast } = useToast();
  const titleId = useId();
  const [check, setCheck] = useState<Check>("idle");
  const [attempts, setAttempts] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  // Whether focus is still in this card: a result that arrives later never pulls focus away from what the person went
  // on to do.
  const focusInside = useRef(false);
  // The button that started a check goes away with it: focus waits on the heading, and lands on Remove domain once the
  // domain is verified; a failed check leaves it on the heading, just above the message and its Check again.
  // The first check fails (the record hasn't reached the DNS yet); checking again finds it.
  const verify = () => {
    setCheck("checking");
    setTimeout(() => heading.current?.focus());
    setTimeout(() => {
      const found = attempts > 0;
      setCheck(found ? "verified" : "failed");
      setAttempts(attempts + 1);
      if (found && focusInside.current) setTimeout(() => action.current?.focus());
    }, 1200);
  };
  // Removing can be undone, so it acts at once and the Toast offers Undo; focus moves to Verify domain.
  const remove = () => {
    setCheck("idle");
    setTimeout(() => action.current?.focus());
    // Undo's toast closes as it runs, so focus goes back to Remove domain once it renders.
    toast({ title: "Domain removed", action: { label: "Undo", onClick: () => { setCheck("verified"); setTimeout(() => action.current?.focus()); } } });
  };
  const copy = () => { void navigator.clipboard?.writeText(txtValue).catch(() => undefined); toast({ id: "dns-copied", title: "Value copied" }); };
  return (
    <Card theme="default" width="fill" maxWidth={480}>
      <Stack as="section" gap="xl" aria-labelledby={titleId}
        onFocus={() => { focusInside.current = true; }} onBlur={() => { focusInside.current = false; }}>
        <Stack gap="xs">
          <Heading ref={heading} level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Email domain</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Send invoices from billing@dizai.studio. Add this record at your DNS provider, then verify.</Text>
        </Stack>
        <DescriptionList items={[
          { term: "Type", description: "TXT" },
          { term: "Host", description: "@" },
          { term: "Value", description: txtValue, action: <IconButton appearance="flat" level="primary" size="sm" icon="icon-copy-line" aria-label="Copy value" onClick={copy} /> },
        ]} divider />
        {/* One message slot next to the records: its theme follows the check. */}
        {check === "checking" ? (
          <InlineMessage theme="info" title="Checking dizai.studio…">This takes a few seconds.</InlineMessage>
        ) : check === "failed" ? (
          <InlineMessage theme="negative" title="No TXT record found yet" action={{ label: "Check again", onClick: verify }}>
            New records can take up to an hour to show up. Check the value, then try again.
          </InlineMessage>
        ) : check === "verified" ? (
          <InlineMessage theme="positive" title="dizai.studio is verified">
            Invoices and client emails now go out from billing@dizai.studio.
          </InlineMessage>
        ) : null}
        {/* The card's one action sits at its bottom-right edge, like a form's. */}
        {check === "idle" || check === "verified" ? (
          <Stack direction="row" justify="end">
            {check === "idle"
              ? <Button ref={action} level="primary" onClick={verify}>Verify domain</Button>
              : <Button ref={action} level="danger-subtle" onClick={remove}>Remove domain</Button>}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
