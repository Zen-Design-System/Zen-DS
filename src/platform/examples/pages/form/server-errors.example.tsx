import { useId, useRef, useState } from "react";
import { Button, Card, Form, FormActions, Heading, InlineMessage, InputField, Stack, Text, useFormState, useToast } from "@zen-ds/react";

/** A network round trip in the demo. */
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

/** A card's header: its title (Heading/Subheading, h4 under the example's h3) and one supporting line (xs below). */
function CardHeader({ id, title, children }: { id: string; title: string; children: string }) {
  return (
    <Stack gap="xs">
      <Stack direction="row" gap="2xs" align="center" wrap>
        <Heading level={4} id={id} textStyle="Heading/Subheading">{title}</Heading>
      </Stack>
      <Text textStyle="Body/Small/Regular" tone="base">{children}</Text>
    </Stack>
  );
}

const takenAddresses = ["dizaistudio", "studio", "design", "saigon"];

export default function WorkspaceAddress() {
  const { toast } = useToast();
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [address, setAddress] = useState("dizai");
  // The demo's network drops the first request for a free address; the retry goes through.
  const [dropNext, setDropNext] = useState(true);
  const form = useFormState<{ slug: string }>({
    initialValues: { slug: "dizai" },
    validate: ({ slug }) => {
      const value = slug.trim().toLowerCase();
      return { slug: !value ? "Enter an address" : !/^[a-z0-9-]{3,30}$/.test(value) ? "Use 3–30 lowercase letters, numbers or hyphens" : undefined };
    },
    onSubmit: async ({ slug }, { setError, reset }) => {
      const value = slug.trim().toLowerCase();
      if (value === address) { setError("slug", `${value}.zen.app is already your address`); return; }
      await wait(900);
      // The server's own checks come back as a field error: Form moves focus to the field and announces it.
      if (takenAddresses.includes(value)) { setError("slug", `${value}.zen.app is taken. Try another, like ${value}-hcm`); return; }
      // A request that fails keeps every value; the Inline Message below offers Try again.
      if (dropNext) { setDropNext(false); throw new Error("Zen didn't answer in time."); }
      setAddress(value);
      reset({ slug: value });
      setDropNext(true);
      toast({ type: "positive", title: "Address changed" });
    },
  });
  const retry = () => {
    // The message leaves as the retry starts, so focus moves to the button that shows the progress.
    submitRef.current?.focus();
    formRef.current?.requestSubmit();
  };
  const preview = form.values.slug.trim().toLowerCase() || address;
  return (
    <Stack><Card as="section" theme="default" aria-labelledby={titleId} width="fill" maxWidth={720} alignSelf="center">
      <Stack gap="md">
        <CardHeader id={titleId} title="Workspace address">Everyone at Đìzai Studio signs in here. Old links keep working for 30 days.</CardHeader>
        <Form ref={formRef} form={form} gap="md">
          <InputField label="Address" autoComplete="off" helpText={`Opens at ${preview}.zen.app`} {...form.field("slug")} />
          {form.submitError ? (
            <InlineMessage theme="negative" title="Address not changed" action={{ label: "Try again", onClick: retry }}>{form.submitError}</InlineMessage>
          ) : null}
          <FormActions>
            <Button ref={submitRef} level="primary" type="submit">{form.isSubmitting ? "Checking…" : "Change address"}</Button>
          </FormActions>
        </Form>
      </Stack>
    </Card></Stack>
  );
}
