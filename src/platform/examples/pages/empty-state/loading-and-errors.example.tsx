import { useRef, useState } from "react";
import {
  EmptyState, Heading, IconButton, InlineMessage, InputField, List, ListBox, ListItem, ModalForm, SkeletonShape, SkeletonText, Stack, Text, VisuallyHidden,
  useFormState, useToast,
} from "@zen-ds/react";
import { projectById } from "../../data";

type Phase = "loading" | "failed" | "loaded";
const saola = projectById("saola-brand");
const skeletonRows = [1, 2, 3];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/* A placeholder in a text slot stays on the text's line, as wide as the text it stands for (in characters). */
const line = (width: string) => <SkeletonText lines={1} style={{ display: "inline-flex", width, maxWidth: "100%", verticalAlign: "middle" }} />;

export default function ClientUploads() {
  const { toast } = useToast();
  const refreshRef = useRef<HTMLButtonElement>(null);
  // The uploads came back empty. Each load is numbered: the demo's first refresh fails once, so the failed state can be
  // seen; every other load comes back empty after 1.2 s. A load that a newer one replaced never lands.
  const [load, setLoad] = useState<{ attempt: number; phase: Phase }>({ attempt: 0, phase: "loaded" });
  const [asking, setAsking] = useState(false);
  const refresh = () => {
    const attempt = load.attempt + 1;
    setLoad({ attempt, phase: "loading" });
    setTimeout(() => setLoad((current) => (current.attempt === attempt ? { attempt, phase: attempt === 1 ? "failed" : "loaded" } : current)), 1200);
  };
  // Try again goes with the Inline Message, so focus waits on Refresh while the uploads load.
  const retry = () => {
    refresh();
    setTimeout(() => refreshRef.current?.focus());
  };
  // Request files: one email field, checked on submit; Cancel, Escape and the scrim close it and clear what was typed.
  const request = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      setAsking(false);
      reset();
      toast({ type: "positive", title: `Request sent to ${email.trim()}` });
    },
  });
  const changeAsking = (open: boolean) => { setAsking(open); if (!open) request.reset(); };
  const { phase } = load;
  return (
    <>
    {/* A ListBox: title and Refresh in its Header-Slot; the Skeleton rows, the Inline Message or the Empty State in its
        Body-Slot, in place of the uploads. */}
    <ListBox width="fill"
      header={<Stack direction="row" align="start" justify="between" gap="xs">
        <Stack gap="2xs">
          <Heading level={4} textStyle="Heading/Subheading">Client uploads</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${saola.name} · ${saola.client}`}</Text>
        </Stack>
        <IconButton ref={refreshRef} icon="icon-refresh-cw-01-line" aria-label="Refresh uploads" onClick={refresh} />
      </Stack>}>
      <VisuallyHidden role="status">{phase === "loading" ? "Loading uploads…" : ""}</VisuallyHidden>
      {phase === "loading" ? (
        // Loading keeps the shape of the rows that will come: Skeleton, never an Empty State.
        <List aria-hidden="true">
          {skeletonRows.map((row) => (
            <ListItem key={row} leading={<SkeletonShape shape="square" size="md" />} title={line("18ch")} caption={line("11ch")} />
          ))}
        </List>
      ) : phase === "failed" ? (
        // A failed load is an error to fix, not "nothing here": Inline Message with the retry.
        <InlineMessage theme="negative" title="Uploads couldn't load" action={{ label: "Try again", onClick: retry }}>
          The file server didn't answer in time.
        </InlineMessage>
      ) : (
        <EmptyState size="sm" headingLevel={5} icon="icon-upload-cloud-line" title="No uploads yet"
          primaryAction={{ label: "Request files", onClick: () => setAsking(true) }}>
          {`Files ${saola.client} shares for ${saola.name} show up here.`}
        </EmptyState>
      )}
    </ListBox>
    <ModalForm open={asking} onOpenChange={changeAsking} title="Request files" description={`${saola.client} gets an email with a link to upload.`}
      onSubmit={request.handleSubmit} primaryAction={{ label: "Send request" }} secondaryAction={{ label: "Cancel" }}>
      <InputField label="Client email" type="email" autoComplete="off" placeholder="an@saola.vn" data-autofocus="" {...request.field("email")} />
    </ModalForm>
    </>
  );
}
